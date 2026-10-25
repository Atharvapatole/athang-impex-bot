import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { decryptCredential, encryptCredential, maskSecret } from "@/lib/crypto";
import { TelegramClient } from "@/lib/channels/telegram";
import { getTelegramWebhookUrl } from "@/lib/urls";
import { isMissingColumnError, autoHealBusinessSchema } from "@/lib/db-heal";
import { ensureAdministratorBootstrap } from "@/lib/bootstrap";

async function getAthangTelegramChannel() {
  let business: any = null;
  try {
    business = await prisma.business.findUnique({
      where: { slug: "athang-impex" },
    });
  } catch (err: any) {
    if (isMissingColumnError(err)) {
      await autoHealBusinessSchema();
      business = await prisma.business.findUnique({
        where: { slug: "athang-impex" },
      });
    } else {
      throw err;
    }
  }

  if (!business) {
    business = await prisma.business.findFirst();
  }

  if (!business) {
    await ensureAdministratorBootstrap();
    business = (await prisma.business.findFirst({
      where: { slug: "athang-impex" },
    })) || (await prisma.business.findFirst());
  }

  if (!business) {
    throw new Error("ATHANG IMPEX business profile not found in database");
  }

  let channel = await prisma.channelIntegration.findFirst({
    where: {
      businessId: business.id,
      channelType: "TELEGRAM",
    },
  });

  if (!channel) {
    channel = await prisma.channelIntegration.create({
      data: {
        businessId: business.id,
        channelType: "TELEGRAM",
        name: "ATHANG Export Bot",
        isEnabled: true,
        webhookSecretToken: "athang_telegram_secret_" + Math.random().toString(36).slice(2, 10),
        credentialsEncrypted: encryptCredential(JSON.stringify({ botToken: "" })),
        status: "NOT_CONFIGURED",
      },
    });
  }

  return { channel, business };
}

// GET - Retrieve Telegram configuration with masked token
export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
    const { channel } = await getAthangTelegramChannel();

    let maskedBotToken = "";
    let hasBotToken = false;

    if (channel.credentialsEncrypted) {
      try {
        const plainJson = decryptCredential(channel.credentialsEncrypted);
        const creds = JSON.parse(plainJson);
        if (creds.botToken) {
          hasBotToken = true;
          maskedBotToken = maskSecret(creds.botToken);
        }
      } catch {}
    }

    // Authoritative webhook URL using APP_BASE_URL (or Vercel / environment policy)
    const webhookUrl = getTelegramWebhookUrl(req);

    let displayStatus = "NOT_CONFIGURED";
    if (channel.status === "CONNECTED" || channel.status === "CONNECTION_TESTED") {
      displayStatus = "CONNECTED";
    } else if (channel.status === "ERROR" || channel.status === "CONNECTION_FAILED") {
      displayStatus = "CONNECTION_FAILED";
    } else if (hasBotToken) {
      displayStatus = channel.status === "RECEIVING_MESSAGES" || channel.status === "WEBHOOK_VERIFIED"
        ? "CONNECTED"
        : "PENDING_VERIFICATION";
    }

    return NextResponse.json({
      config: {
        botUsername: channel.botUsername || "",
        webhookSecretToken: channel.webhookSecretToken || "",
        webhookUrl,
        hasBotToken,
        maskedBotToken: maskedBotToken || "Not Configured",
        status: displayStatus,
        rawStatus: channel.status,
        lastTestedAt: channel.lastTestedAt,
        lastInboundAt: channel.lastInboundAt,
        lastError: channel.lastError,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Actions: save, test, set_webhook, verify_webhook, disconnect
export async function POST(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN"]);
    const body = await req.json();
    const { channel } = await getAthangTelegramChannel();

    let currentCreds: any = { botToken: "" };
    if (channel.credentialsEncrypted) {
      try {
        currentCreds = JSON.parse(decryptCredential(channel.credentialsEncrypted));
      } catch {}
    }

    const resolvedToken = body.botToken && !body.botToken.includes("••••")
      ? body.botToken.trim()
      : currentCreds.botToken;

    // 1. Action: Test Connection (calls getMe)
    if (body.action === "test") {
      if (!resolvedToken || resolvedToken.includes("placeholder")) {
        return NextResponse.json({
          success: false,
          error: "Valid Telegram Bot Token is required to test connection",
        }, { status: 400 });
      }

      const client = new TelegramClient(resolvedToken);
      const testResult = await client.testConnection();

      if (testResult.success) {
        const username = testResult.botInfo?.username || channel.botUsername;
        try {
          await prisma.channelIntegration.update({
            where: { id: channel.id },
            data: {
              botUsername: username,
              status: "CONNECTED",
              lastTestedAt: new Date(),
              lastError: null,
            },
          });
        } catch (dbErr: any) {
          console.warn("[Telegram Test DB Update]", dbErr?.message || dbErr);
        }

        return NextResponse.json({
          success: true,
          status: "CONNECTED",
          botInfo: testResult.botInfo,
        });
      } else {
        try {
          await prisma.channelIntegration.update({
            where: { id: channel.id },
            data: {
              status: "CONNECTION_FAILED",
              lastTestedAt: new Date(),
              lastError: testResult.error,
            },
          });
        } catch (dbErr: any) {
          console.warn("[Telegram Test DB Update]", dbErr?.message || dbErr);
        }

        return NextResponse.json({
          success: false,
          status: "CONNECTION_FAILED",
          error: testResult.error,
        }, { status: 400 });
      }
    }

    // 2. Action: Set Webhook (calls setWebhook with secret_token)
    if (body.action === "set_webhook") {
      if (!resolvedToken) {
        return NextResponse.json({ success: false, error: "Bot token not configured" }, { status: 400 });
      }
      const webhookUrl = body.webhookUrl || getTelegramWebhookUrl(req);
      const secretToken = body.webhookSecretToken || channel.webhookSecretToken;

      const client = new TelegramClient(resolvedToken);
      const res = await client.setWebhook(webhookUrl, secretToken);

      if (res.success) {
        await prisma.channelIntegration.update({
          where: { id: channel.id },
          data: {
            status: "WEBHOOK_VERIFIED",
            lastError: null,
          },
        });
        return NextResponse.json({ success: true, description: res.description });
      } else {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
    }

    // 3. Action: Verify Webhook Info (calls getWebhookInfo)
    if (body.action === "verify_webhook") {
      if (!resolvedToken) {
        return NextResponse.json({ success: false, error: "Bot token not configured" }, { status: 400 });
      }
      const client = new TelegramClient(resolvedToken);
      const res = await client.getWebhookInfo();
      return NextResponse.json(res);
    }

    // 4. Action: Disconnect (calls deleteWebhook)
    if (body.action === "disconnect") {
      if (!resolvedToken) {
        return NextResponse.json({ success: false, error: "Bot token not configured" }, { status: 400 });
      }
      const client = new TelegramClient(resolvedToken);
      const res = await client.deleteWebhook();
      if (res.success) {
        await prisma.channelIntegration.update({
          where: { id: channel.id },
          data: {
            status: "NOT_CONFIGURED",
            lastError: null,
          },
        });
      }
      return NextResponse.json(res);
    }

    // 5. Default Action: Save Configuration
    const { botToken, webhookSecretToken, botUsername } = body;
    const updatedToken = botToken && !botToken.includes("••••") ? botToken.trim() : currentCreds.botToken;

    await prisma.channelIntegration.update({
      where: { id: channel.id },
      data: {
        botUsername: botUsername !== undefined ? botUsername.trim() : channel.botUsername,
        webhookSecretToken: webhookSecretToken !== undefined ? webhookSecretToken.trim() : channel.webhookSecretToken,
        credentialsEncrypted: encryptCredential(JSON.stringify({ botToken: updatedToken })),
        status: updatedToken ? "PENDING_VERIFICATION" : "NOT_CONFIGURED",
        isEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Telegram configuration saved and encrypted with AES-256-GCM",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
