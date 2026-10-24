import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { decryptCredential } from "@/lib/crypto";
import { TelegramClient } from "@/lib/channels/telegram";
import { WhatsAppClient } from "@/lib/channels/whatsapp";

export async function POST(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN"]);
    const { channelId } = await req.json();

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    const channel = await prisma.channelIntegration.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    let creds: any = {};
    try {
      creds = JSON.parse(decryptCredential(channel.credentialsEncrypted));
    } catch {}

    let testResult: { success: boolean; data?: any; error?: string };

    if (channel.channelType === "TELEGRAM") {
      if (!creds.botToken || creds.botToken.includes("placeholder")) {
        return NextResponse.json({
          success: false,
          error: "A valid Telegram bot token is required to test the connection",
        });
      }
      const tg = new TelegramClient(creds.botToken);
      testResult = await tg.testConnection();
    } else if (channel.channelType === "WHATSAPP") {
      if (!creds.accessToken || !channel.phoneNumberId || creds.accessToken.includes("placeholder")) {
        return NextResponse.json({
          success: false,
          error: "Phone Number ID and valid Meta Access Token are required to test connection",
        });
      }
      const wa = new WhatsAppClient(channel.phoneNumberId, creds.accessToken);
      testResult = await wa.testConnection();
    } else {
      return NextResponse.json({ error: "Unsupported channel type" }, { status: 400 });
    }

    // Update status in database
    await prisma.channelIntegration.update({
      where: { id: channel.id },
      data: {
        lastTestedAt: new Date(),
        status: testResult.success ? "CONNECTION_TESTED" : "ERROR",
        lastError: testResult.success ? null : testResult.error,
      },
    });

    return NextResponse.json(testResult);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
