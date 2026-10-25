import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTelegramSecretToken } from "@/lib/crypto";
import { MessageWorker } from "@/lib/queue/message-worker";
import { InboundMessageEvent } from "@/lib/types";

// POST /api/webhooks/telegram - Inbound Telegram Updates for ATHANG IMPEX
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Always match ATHANG IMPEX Telegram channel
    let channel = await prisma.channelIntegration.findFirst({
      where: {
        business: { slug: "athang-impex" },
        channelType: "TELEGRAM",
        isEnabled: true,
      },
      include: { business: true },
    });

    if (!channel) {
      channel = await prisma.channelIntegration.findFirst({
        where: {
          channelType: "TELEGRAM",
          isEnabled: true,
        },
        include: { business: true },
      });
    }

    if (!channel) {
      return NextResponse.json({ error: "Telegram integration not configured for ATHANG IMPEX" }, { status: 404 });
    }

    // Verify secret token if configured
    if (channel.webhookSecretToken && secretHeader) {
      const isValid = verifyTelegramSecretToken(secretHeader, channel.webhookSecretToken);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid Telegram secret token header" }, { status: 401 });
      }
    }

    const updateId = payload.update_id;
    const message = payload.message || payload.edited_message;
    if (!message || !message.text) {
      return NextResponse.json({ status: "ignored_non_text_event" }, { status: 200 });
    }

    const chatId = message.chat?.id?.toString();
    const senderName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ");
    const text = message.text;
    const idempotencyKey = `tg_${updateId}`;

    // Duplicate event prevention
    const existingJob = await prisma.messageJob.findUnique({
      where: { idempotencyKey },
    });

    if (existingJob) {
      return NextResponse.json({ status: "duplicate_update_ignored" }, { status: 200 });
    }

    const eventData: InboundMessageEvent = {
      businessId: channel.businessId,
      channelType: "TELEGRAM",
      channelMessageId: message.message_id?.toString() || updateId.toString(),
      senderIdentifier: chatId,
      senderName: senderName || message.from?.username || chatId,
      text: text,
      rawPayload: payload,
    };

    // Update channel status & last inbound
    await prisma.channelIntegration.update({
      where: { id: channel.id },
      data: {
        lastInboundAt: new Date(),
        status: "RECEIVING_MESSAGES",
      },
    });

    // Enqueue
    const job = await prisma.messageJob.create({
      data: {
        businessId: channel.businessId,
        channelType: "TELEGRAM",
        eventPayload: JSON.stringify(eventData),
        idempotencyKey,
        status: "QUEUED",
      },
    });

    // Execute message worker inline (Vercel serverless friendly: finishes AI reply before function terminates)
    const worker = new MessageWorker();
    try {
      await worker.processJob(job.id);
    } catch (workerErr) {
      console.error("[Telegram Serverless Inline Worker Error]", workerErr);
    }

    return NextResponse.json({ status: "processed", jobId: job.id }, { status: 200 });
  } catch (err: any) {
    console.error("[Telegram Webhook Error]", err);
    return NextResponse.json({ error: "Telegram webhook ingestion failed" }, { status: 500 });
  }
}
