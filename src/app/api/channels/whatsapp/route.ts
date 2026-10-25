import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { decryptCredential, encryptCredential, maskSecret } from "@/lib/crypto";
import { WhatsAppClient } from "@/lib/channels/whatsapp";
import { getWhatsAppWebhookUrl } from "@/lib/urls";
import { isMissingColumnError, autoHealBusinessSchema } from "@/lib/db-heal";
import { ensureAdministratorBootstrap } from "@/lib/bootstrap";

// Helper to get or create ATHANG IMPEX WhatsApp integration with schema resilience
async function getAthangWhatsAppChannel() {
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
      channelType: "WHATSAPP",
    },
  });

  if (!channel) {
    channel = await prisma.channelIntegration.create({
      data: {
        businessId: business.id,
        channelType: "WHATSAPP",
        name: "ATHANG Official WhatsApp",
        isEnabled: true,
        webhookVerifyToken: "athang_whatsapp_verify_token_2026",
        credentialsEncrypted: encryptCredential(JSON.stringify({ accessToken: "", appSecret: "" })),
        status: "NOT_CONFIGURED",
      },
    });
  }

  return { channel, business };
}

// GET - Retrieve WhatsApp Configuration with masked secrets
export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
    const { channel } = await getAthangWhatsAppChannel();

    let maskedAccessToken = "";
    let maskedAppSecret = "";
    let hasAccessToken = false;
    let hasAppSecret = false;

    if (channel.credentialsEncrypted) {
      try {
        const plainJson = decryptCredential(channel.credentialsEncrypted);
        const creds = JSON.parse(plainJson);
        if (creds.accessToken) {
          hasAccessToken = true;
          maskedAccessToken = maskSecret(creds.accessToken);
        }
        if (creds.appSecret) {
          hasAppSecret = true;
          maskedAppSecret = maskSecret(creds.appSecret);
        }
      } catch {}
    }

    // Authoritative webhook URL using APP_BASE_URL (or Vercel / environment policy)
    const webhookUrl = getWhatsAppWebhookUrl(req);

    // Map database status to standard presentation statuses:
    // NOT_CONFIGURED, PENDING_VERIFICATION, CONNECTED, CONNECTION_FAILED
    let displayStatus = "NOT_CONFIGURED";
    if (channel.status === "CONNECTED" || channel.status === "CONNECTION_TESTED") {
      displayStatus = "CONNECTED";
    } else if (channel.status === "ERROR" || channel.status === "CONNECTION_FAILED") {
      displayStatus = "CONNECTION_FAILED";
    } else if (hasAccessToken && channel.phoneNumberId) {
      displayStatus = channel.status === "WEBHOOK_VERIFIED" || channel.status === "RECEIVING_MESSAGES"
        ? "CONNECTED"
        : "PENDING_VERIFICATION";
    }

    return NextResponse.json({
      config: {
        phoneNumberId: channel.phoneNumberId || "",
        wabaId: channel.wabaId || "",
        webhookVerifyToken: channel.webhookVerifyToken || "athang_whatsapp_verify_token_2026",
        webhookUrl,
        hasAccessToken,
        hasAppSecret,
        maskedAccessToken: maskedAccessToken || "Not Configured",
        maskedAppSecret: maskedAppSecret || "Not Configured",
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

// POST - Update Configuration or Execute Live Connection Test
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["OWNER", "ADMIN"]);
    const body = await req.json();
    const { channel } = await getAthangWhatsAppChannel();

    // Action 1: Live Connection Test
    if (body.action === "test") {
      // Decrypt credentials
      let creds: any = {};
      if (channel.credentialsEncrypted) {
        try {
          creds = JSON.parse(decryptCredential(channel.credentialsEncrypted));
        } catch {}
      }

      const rawToken =
        body.accessToken && !body.accessToken.includes("••••")
          ? body.accessToken.trim()
          : creds.accessToken;
      const accessToken = (rawToken || "").replace(/^Bearer\s+/i, "");

      const rawPhoneId = body.phoneNumberId ? body.phoneNumberId.trim() : channel.phoneNumberId;
      const phoneNumberId = (rawPhoneId || "").replace(/[^\d]/g, "");

      if (!phoneNumberId) {
        return NextResponse.json(
          {
            success: false,
            error: "A numeric Phone Number ID is required to test Meta Cloud API connection",
          },
          { status: 400 }
        );
      }

      if (!accessToken || accessToken.includes("placeholder")) {
        return NextResponse.json(
          {
            success: false,
            error: "Valid Meta Access Token is required to test connection",
          },
          { status: 400 }
        );
      }

      const wa = new WhatsAppClient(phoneNumberId, accessToken);
      const testResult = await wa.testConnection();

      // Safely record test result in database
      try {
        await prisma.channelIntegration.update({
          where: { id: channel.id },
          data: {
            phoneNumberId,
            status: testResult.success ? "CONNECTED" : "CONNECTION_FAILED",
            lastTestedAt: new Date(),
            lastError: testResult.success ? null : testResult.error,
          },
        });
      } catch (dbErr: any) {
        console.warn("[WhatsApp Test DB Update]", dbErr?.message || dbErr);
      }

      if (testResult.success) {
        return NextResponse.json({
          success: true,
          status: "CONNECTED",
          data: testResult.data,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            status: "CONNECTION_FAILED",
            error: testResult.error,
          },
          { status: 400 }
        );
      }
    }

    // Action 2: Save Configuration
    const { phoneNumberId, wabaId, webhookVerifyToken, accessToken, appSecret } = body;

    // Load existing credentials to preserve values when not overridden
    let existingCreds: any = { accessToken: "", appSecret: "" };
    if (channel.credentialsEncrypted) {
      try {
        existingCreds = JSON.parse(decryptCredential(channel.credentialsEncrypted));
      } catch {}
    }

    const cleanNewToken = accessToken && !accessToken.includes("••••")
      ? accessToken.trim().replace(/^Bearer\s+/i, "")
      : existingCreds.accessToken;

    const cleanNewSecret = appSecret && !appSecret.includes("••••")
      ? appSecret.trim()
      : existingCreds.appSecret;

    const updatedCreds = {
      accessToken: cleanNewToken,
      appSecret: cleanNewSecret,
    };

    const cleanPhoneId = phoneNumberId !== undefined
      ? phoneNumberId.trim().replace(/[^\d]/g, "")
      : channel.phoneNumberId;

    const cleanWabaId = wabaId !== undefined ? wabaId.trim() : channel.wabaId;
    const cleanVerify = webhookVerifyToken !== undefined
      ? webhookVerifyToken.trim()
      : (channel.webhookVerifyToken || "athang_whatsapp_verify_token_2026");

    const hasCreds = !!(updatedCreds.accessToken && cleanPhoneId);

    await prisma.channelIntegration.update({
      where: { id: channel.id },
      data: {
        phoneNumberId: cleanPhoneId || null,
        wabaId: cleanWabaId || null,
        webhookVerifyToken: cleanVerify,
        credentialsEncrypted: encryptCredential(JSON.stringify(updatedCreds)),
        status: hasCreds ? "PENDING_VERIFICATION" : "NOT_CONFIGURED",
        isEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "WhatsApp configuration saved and encrypted with AES-256-GCM",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
