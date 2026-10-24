import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { decryptCredential, encryptCredential, maskSecret } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    const whereClause: any = {};
    if (businessId) whereClause.businessId = businessId;

    const channels = await prisma.channelIntegration.findMany({
      where: whereClause,
      include: {
        business: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const sanitized = channels.map((c) => {
      let maskedKey = "••••••••";
      try {
        const plainJson = decryptCredential(c.credentialsEncrypted);
        const parsed = JSON.parse(plainJson);
        const raw = parsed.botToken || parsed.accessToken;
        maskedKey = maskSecret(raw);
      } catch {}

      return {
        id: c.id,
        businessId: c.businessId,
        businessName: c.business?.name,
        channelType: c.channelType,
        name: c.name,
        isEnabled: c.isEnabled,
        phoneNumberId: c.phoneNumberId,
        wabaId: c.wabaId,
        webhookVerifyToken: c.webhookVerifyToken,
        botUsername: c.botUsername,
        webhookSecretToken: c.webhookSecretToken,
        status: c.status,
        lastTestedAt: c.lastTestedAt,
        lastInboundAt: c.lastInboundAt,
        lastOutboundAt: c.lastOutboundAt,
        lastError: c.lastError,
        maskedCredential: maskedKey,
      };
    });

    return NextResponse.json({ channels: sanitized });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN"]);
    const body = await req.json();

    const {
      id,
      businessId,
      channelType,
      name,
      isEnabled,
      phoneNumberId,
      wabaId,
      webhookVerifyToken,
      botUsername,
      webhookSecretToken,
      credentials, // e.g. { accessToken, appSecret } or { botToken }
    } = body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (phoneNumberId !== undefined) updateData.phoneNumberId = phoneNumberId;
    if (wabaId !== undefined) updateData.wabaId = wabaId;
    if (webhookVerifyToken !== undefined) updateData.webhookVerifyToken = webhookVerifyToken;
    if (botUsername !== undefined) updateData.botUsername = botUsername;
    if (webhookSecretToken !== undefined) updateData.webhookSecretToken = webhookSecretToken;

    if (credentials && typeof credentials === "object") {
      updateData.credentialsEncrypted = encryptCredential(JSON.stringify(credentials));
      updateData.status = "CONFIGURED";
    }

    let channel;
    if (id) {
      channel = await prisma.channelIntegration.update({
        where: { id },
        data: updateData,
      });
    } else {
      if (!businessId || !channelType || !name) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      channel = await prisma.channelIntegration.create({
        data: {
          businessId,
          channelType,
          name,
          isEnabled: isEnabled ?? true,
          phoneNumberId,
          wabaId,
          webhookVerifyToken,
          botUsername,
          webhookSecretToken,
          credentialsEncrypted: credentials ? encryptCredential(JSON.stringify(credentials)) : encryptCredential("{}"),
          status: credentials ? "CONFIGURED" : "NOT_CONFIGURED",
        },
      });
    }

    return NextResponse.json({ success: true, channelId: channel.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
