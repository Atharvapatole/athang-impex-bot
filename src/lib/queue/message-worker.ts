import { prisma } from "../prisma";
import { decryptCredential } from "../crypto";
import { KnowledgeRetriever } from "../kb/retriever";
import { PromptBuilder } from "../kb/prompt-builder";
import { FallbackEngine } from "../ai/fallback-engine";
import { LeadExtractor } from "../leads/lead-extractor";
import { WhatsAppClient } from "../channels/whatsapp";
import { TelegramClient } from "../channels/telegram";
import { InboundMessageEvent } from "../types";

export class MessageWorker {
  private workerId: string;

  constructor(workerId: string = `worker-${process.pid}`) {
    this.workerId = workerId;
  }

  /**
   * Processes a single queued message job with database locking and error handling.
   */
  async processJob(jobId: string): Promise<boolean> {
    // 1. Atomically lock job
    const job = await prisma.messageJob.findUnique({
      where: { id: jobId },
      include: { business: true },
    });

    if (!job || job.status === "COMPLETED") {
      return false;
    }

    // Lock job
    await prisma.messageJob.update({
      where: { id: jobId },
      data: {
        status: "PROCESSING",
        lockedAt: new Date(),
        lockedBy: this.workerId,
      },
    });

    try {
      const event: InboundMessageEvent = JSON.parse(job.eventPayload);
      const business = job.business;

      // 2. Find or create Contact
      let contact = await prisma.contact.findFirst({
        where: {
          businessId: business.id,
          channelType: event.channelType,
          identifier: event.senderIdentifier,
        },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            businessId: business.id,
            channelType: event.channelType,
            identifier: event.senderIdentifier,
            displayName: event.senderName || event.senderIdentifier,
          },
        });
      }

      // 3. Find or create Conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          businessId: business.id,
          contactId: contact.id,
          channelType: event.channelType,
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 6,
          },
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            businessId: business.id,
            contactId: contact.id,
            channelType: event.channelType,
            channelIdentifier: event.senderIdentifier,
            status: "OPEN",
            isHumanTakeover: false,
          },
          include: {
            messages: true,
          },
        });
      }

      // 4. Record Customer Inbound Message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: "CUSTOMER",
          content: event.text,
          channelMessageId: event.channelMessageId,
          state: "RECEIVED",
        },
      });

      // Update conversation last message timestamp
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      // 5. Human Takeover Check: If enabled, do not send automated AI reply
      if (conversation.isHumanTakeover) {
        await prisma.messageJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            lastError: "Human takeover active: automated reply bypassed",
          },
        });
        return true;
      }

      // 6. Knowledge Retrieval
      const retrievedChunks = await KnowledgeRetriever.retrieveChunks(business.id, event.text, 4);

      // 7. Format conversation history
      const history = (conversation.messages || [])
        .reverse()
        .map((m) => ({
          role: (m.senderType === "CUSTOMER" ? "user" : "assistant") as "user" | "assistant",
          content: m.content,
        }));

      // 8. Grounded Prompt Assembly
      const promptMessages = PromptBuilder.buildPromptMessages({
        businessName: business.name,
        systemInstructions: business.systemInstructions,
        whenYouDontKnow: business.whenYouDontKnow,
        retrievedChunks,
        conversationHistory: history,
        currentMessage: event.text,
      });

      // 9. AI Generation with Fallback Engine (Groq -> Mistral -> Gemini -> Safe Failure)
      const aiResult = await FallbackEngine.generateWithFallback(
        business.id,
        promptMessages,
        business.safeFailureMessage
      );

      // 10. Send Outbound Message via Channel Client
      let sendSuccess = false;
      let sendError: string | undefined;

      if (event.channelType === "TELEGRAM") {
        const channel = await prisma.channelIntegration.findFirst({
          where: { businessId: business.id, channelType: "TELEGRAM", isEnabled: true },
        });

        if (channel && channel.credentialsEncrypted) {
          try {
            const creds = JSON.parse(decryptCredential(channel.credentialsEncrypted));
            if (creds.botToken) {
              const tg = new TelegramClient(creds.botToken);
              const sendRes = await tg.sendTextMessage(event.senderIdentifier, aiResult.response.text);
              sendSuccess = sendRes.success;
              sendError = sendRes.error;
            }
          } catch (e: any) {
            sendError = e.message;
          }
        }
      } else if (event.channelType === "WHATSAPP") {
        const channel = await prisma.channelIntegration.findFirst({
          where: { businessId: business.id, channelType: "WHATSAPP", isEnabled: true },
        });

        if (channel && channel.credentialsEncrypted) {
          try {
            const creds = JSON.parse(decryptCredential(channel.credentialsEncrypted));
            if (creds.accessToken && channel.phoneNumberId) {
              const wa = new WhatsAppClient(channel.phoneNumberId, creds.accessToken);
              const sendRes = await wa.sendTextMessage(event.senderIdentifier, aiResult.response.text);
              sendSuccess = sendRes.success;
              sendError = sendRes.error;
            }
          } catch (e: any) {
            sendError = e.message;
          }
        }
      }

      // 11. Record Outbound AI Message in Database
      const sourceRefs = retrievedChunks.map((c) => ({
        id: c.id,
        sourceName: c.sourceName,
        page: c.pageNumber,
      }));

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: "AI",
          content: aiResult.response.text,
          state: sendSuccess ? "SENT" : (sendError ? "FAILED" : "SENT"),
          aiProviderUsed: aiResult.isSafeFailure ? "SAFE_FAILURE" : aiResult.response.provider,
          modelUsed: aiResult.response.modelId,
          latencyMs: aiResult.response.latencyMs,
          sourceReferences: JSON.stringify(sourceRefs),
          errorDetails: sendError || null,
        },
      });

      // 12. Lead Capture
      const leadData = LeadExtractor.extractLeadDetails(business.slug, event.text);
      const hasSignificantLeadData =
        leadData.productOfInterest ||
        leadData.quantityAndUnit ||
        leadData.destinationPort ||
        leadData.orderReference ||
        leadData.supportTopic ||
        leadData.emailOrPhone;

      if (hasSignificantLeadData) {
        // Upsert lead
        const existingLead = await prisma.lead.findFirst({
          where: { businessId: business.id, contactId: contact.id },
        });

        if (existingLead) {
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              productOfInterest: leadData.productOfInterest || existingLead.productOfInterest,
              quantityAndUnit: leadData.quantityAndUnit || existingLead.quantityAndUnit,
              destinationPort: leadData.destinationPort || existingLead.destinationPort,
              packagingPreference: leadData.packagingPreference || existingLead.packagingPreference,
              purchaseTimeline: leadData.purchaseTimeline || existingLead.purchaseTimeline,
              emailOrPhone: leadData.emailOrPhone || existingLead.emailOrPhone,
              orderReference: leadData.orderReference || existingLead.orderReference,
              supportTopic: leadData.supportTopic || existingLead.supportTopic,
              supportIssue: leadData.supportIssue || existingLead.supportIssue,
            },
          });
        } else {
          await prisma.lead.create({
            data: {
              businessId: business.id,
              contactId: contact.id,
              conversationId: conversation.id,
              buyerName: contact.displayName || null,
              emailOrPhone: leadData.emailOrPhone || contact.identifier,
              productOfInterest: leadData.productOfInterest,
              quantityAndUnit: leadData.quantityAndUnit,
              destinationPort: leadData.destinationPort,
              packagingPreference: leadData.packagingPreference,
              purchaseTimeline: leadData.purchaseTimeline,
              orderReference: leadData.orderReference,
              supportTopic: leadData.supportTopic,
              supportIssue: leadData.supportIssue,
              status: "NEW",
            },
          });
        }
      }

      // 13. Complete Job
      await prisma.messageJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          lastError: null,
        },
      });

      return true;
    } catch (err: any) {
      // Retry handling with exponential backoff & jitter
      const nextAttempt = job.attempts + 1;
      const isFailed = nextAttempt >= job.maxAttempts;
      const backoffSec = Math.pow(2, nextAttempt) + Math.random() * 2;
      const nextRetry = new Date(Date.now() + backoffSec * 1000);

      await prisma.messageJob.update({
        where: { id: jobId },
        data: {
          status: isFailed ? "FAILED" : "QUEUED",
          attempts: nextAttempt,
          nextRetryAt: nextRetry,
          lastError: (err.message || "Unknown error").slice(0, 500),
          lockedAt: null,
          lockedBy: null,
        },
      });

      return false;
    }
  }

  /**
   * Run one iteration of polling for queued jobs.
   */
  async processNextPendingJobs(batchSize: number = 5): Promise<number> {
    const jobs = await prisma.messageJob.findMany({
      where: {
        status: "QUEUED",
        nextRetryAt: { lte: new Date() },
      },
      take: batchSize,
      orderBy: { createdAt: "asc" },
    });

    let processed = 0;
    for (const job of jobs) {
      const ok = await this.processJob(job.id);
      if (ok) processed++;
    }

    return processed;
  }
}
