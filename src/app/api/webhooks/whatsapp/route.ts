import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWhatsAppSignature, decryptCredential } from "@/lib/crypto";
import { MessageWorker } from "@/lib/queue/message-worker";
import { InboundMessageEvent } from "@/lib/types";

// GET /api/webhooks/whatsapp - Meta Subscription Verification Handshake
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge) {
    // Check ATHANG IMPEX WhatsApp integration verify token
    const channel = await prisma.channelIntegration.findFirst({
      where: {
        channelType: "WHATSAPP",
        business: { slug: "athang-impex" },
      },
    });

    if (channel && channel.webhookVerifyToken && channel.webhookVerifyToken === token) {
      // Mark channel status as WEBHOOK_VERIFIED
      await prisma.channelIntegration.update({
        where: { id: channel.id },
        data: {
          status: "WEBHOOK_VERIFIED",
          lastError: null,
        },
      });

      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }

  return NextResponse.json(
    { error: "Verification token mismatch or invalid subscription parameters" },
    { status: 403 }
  );
}

// POST /api/webhooks/whatsapp - Inbound WhatsApp Events
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Always find ATHANG IMPEX WhatsApp integration
    const channel = await prisma.channelIntegration.findFirst({
      where: {
        channelType: "WHATSAPP",
        business: { slug: "athang-impex" },
        isEnabled: true,
      },
      include: { business: true },
    });

    if (!channel) {
      return NextResponse.json({ error: "WhatsApp channel not configured for ATHANG IMPEX" }, { status: 404 });
    }

    // Signature verification if appSecret is configured
    if (channel.credentialsEncrypted) {
      try {
        const creds = JSON.parse(decryptCredential(channel.credentialsEncrypted));
        if (creds.appSecret && signature) {
          const isValid = verifyWhatsAppSignature(rawBody, signature, creds.appSecret);
          if (!isValid) {
            return NextResponse.json({ error: "Invalid X-Hub-Signature-256 HMAC signature" }, { status: 401 });
          }
        }
      } catch (e) {
        // Fallback gracefully if decryption soft-fails
      }
    }

    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const messages = change?.messages;

    if (!messages || messages.length === 0) {
      // Acknowledgment or status update (sent/delivered/read receipt)
      return NextResponse.json({ status: "acknowledged_status_receipt" }, { status: 200 });
    }

    const message = messages[0];
    const messageId = message.id;
    const fromPhone = message.from;
    const messageType = message.type;
    const text = messageType === "text" ? message.text?.body : `[Received ${messageType} message]`;
    const contactProfile = change?.contacts?.[0]?.profile?.name;

    // Idempotency: Reject duplicate events immediately
    const existingJob = await prisma.messageJob.findUnique({
      where: { idempotencyKey: messageId },
    });

    if (existingJob) {
      return NextResponse.json({ status: "duplicate_event_ignored" }, { status: 200 });
    }

    const eventData: InboundMessageEvent = {
      businessId: channel.businessId,
      channelType: "WHATSAPP",
      channelMessageId: messageId,
      senderIdentifier: fromPhone,
      senderName: contactProfile || fromPhone,
      text: text || "",
      rawPayload: payload,
    };

    // Update channel inbound timestamp & status
    await prisma.channelIntegration.update({
      where: { id: channel.id },
      data: {
        lastInboundAt: new Date(),
        status: "RECEIVING_MESSAGES",
      },
    });

    // Enqueue job in durable queue
    const job = await prisma.messageJob.create({
      data: {
        businessId: channel.businessId,
        channelType: "WHATSAPP",
        eventPayload: JSON.stringify(eventData),
        idempotencyKey: messageId,
        status: "QUEUED",
      },
    });

    // Execute message worker inline (Vercel serverless friendly: finishes AI reply before function terminates)
    const worker = new MessageWorker();
    try {
      await worker.processJob(job.id);
    } catch (workerErr) {
      console.error("[WhatsApp Serverless Inline Worker Error]", workerErr);
    }

    return NextResponse.json({ status: "processed", jobId: job.id }, { status: 200 });
  } catch (err: any) {
    console.error("[WhatsApp Webhook Error]", err);
    return NextResponse.json({ error: "Webhook ingestion error" }, { status: 500 });
  }
}
