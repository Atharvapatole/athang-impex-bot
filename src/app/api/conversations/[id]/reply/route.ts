import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { decryptCredential } from "@/lib/crypto";
import { WhatsAppClient } from "@/lib/channels/whatsapp";
import { TelegramClient } from "@/lib/channels/telegram";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
    const { text } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Reply text is required" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: {
        business: true,
        contact: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    let sendSuccess = false;
    let sendError: string | undefined;

    // Dispatch message to channel
    if (conversation.channelType === "TELEGRAM") {
      const channel = await prisma.channelIntegration.findFirst({
        where: { businessId: conversation.businessId, channelType: "TELEGRAM", isEnabled: true },
      });

      if (channel && channel.credentialsEncrypted) {
        try {
          const creds = JSON.parse(decryptCredential(channel.credentialsEncrypted));
          if (creds.botToken) {
            const tg = new TelegramClient(creds.botToken);
            const res = await tg.sendTextMessage(conversation.channelIdentifier, text.trim());
            sendSuccess = res.success;
            sendError = res.error;
          }
        } catch (e: any) {
          sendError = e.message;
        }
      }
    } else if (conversation.channelType === "WHATSAPP") {
      const channel = await prisma.channelIntegration.findFirst({
        where: { businessId: conversation.businessId, channelType: "WHATSAPP", isEnabled: true },
      });

      if (channel && channel.credentialsEncrypted) {
        try {
          const creds = JSON.parse(decryptCredential(channel.credentialsEncrypted));
          if (creds.accessToken && channel.phoneNumberId) {
            const wa = new WhatsAppClient(channel.phoneNumberId, creds.accessToken);
            const res = await wa.sendTextMessage(conversation.channelIdentifier, text.trim());
            sendSuccess = res.success;
            sendError = res.error;
          }
        } catch (e: any) {
          sendError = e.message;
        }
      }
    }

    // Never claim success if channel reported failure
    if (!sendSuccess && sendError) {
      return NextResponse.json(
        { error: `Channel dispatch error: ${sendError}` },
        { status: 502 }
      );
    }

    // Record agent message in database
    const msg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: "AGENT",
        content: text.trim(),
        state: sendSuccess ? "SENT" : "FAILED",
        aiProviderUsed: "MANUAL",
        errorDetails: sendError || null,
      },
    });

    // Update conversation lastMessageAt and set human takeover to true
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        isHumanTakeover: true,
      },
    });

    return NextResponse.json({ success: true, message: msg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
