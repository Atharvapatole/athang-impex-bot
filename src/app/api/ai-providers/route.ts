import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isDynamicServerError } from "@/lib/auth";
import { decryptCredential, encryptCredential, maskSecret } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
  } catch (authErr: any) {
    if (isDynamicServerError(authErr)) {
      throw authErr;
    }
    const isForbidden = authErr?.message === "FORBIDDEN";
    return NextResponse.json(
      { error: isForbidden ? "Forbidden" : "Unauthorized" },
      { status: isForbidden ? 403 : 401 }
    );
  }

  try {
    const businessId = req.nextUrl.searchParams.get("businessId");

    const whereClause: any = {};
    if (businessId) {
      whereClause.businessId = businessId;
    }

    const configs = await prisma.aIProviderConfig.findMany({
      where: whereClause,
      orderBy: { priority: "asc" },
      include: { business: { select: { name: true, slug: true } } },
    });

    // Mask API keys for safe transmission to frontend
    const sanitized = configs.map((c) => {
      let maskedKey = "••••••••";
      try {
        const plain = decryptCredential(c.apiKeyEncrypted);
        maskedKey = maskSecret(plain);
      } catch {}

      return {
        id: c.id,
        businessId: c.businessId,
        businessName: c.business?.name || "Global Default",
        provider: c.provider,
        modelId: c.modelId,
        priority: c.priority,
        isEnabled: c.isEnabled,
        timeoutMs: c.timeoutMs,
        maxTokens: c.maxTokens,
        temperature: c.temperature,
        status: c.status,
        lastTestedAt: c.lastTestedAt,
        lastSuccessAt: c.lastSuccessAt,
        lastError: c.lastError,
        maskedKey,
      };
    });

    return NextResponse.json({ configs: sanitized });
  } catch (err: any) {
    if (isDynamicServerError(err)) {
      throw err;
    }
    return NextResponse.json(
      { error: err?.message || "Failed to fetch AI provider configurations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN"]);
  } catch (authErr: any) {
    if (isDynamicServerError(authErr)) {
      throw authErr;
    }
    const isForbidden = authErr?.message === "FORBIDDEN";
    return NextResponse.json(
      { error: isForbidden ? "Forbidden" : "Unauthorized" },
      { status: isForbidden ? 403 : 401 }
    );
  }

  try {
    const body = await req.json();

    const {
      id,
      businessId,
      provider,
      apiKey,
      modelId,
      priority,
      isEnabled,
      timeoutMs,
      maxTokens,
      temperature,
    } = body;

    if (!id && (!provider || !modelId)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updateData: any = {};
    if (modelId) updateData.modelId = modelId;
    if (priority !== undefined) updateData.priority = priority;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (timeoutMs !== undefined) updateData.timeoutMs = timeoutMs;
    if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
    if (temperature !== undefined) updateData.temperature = temperature;

    if (apiKey && apiKey.trim().length > 0 && !apiKey.includes("••••")) {
      updateData.apiKeyEncrypted = encryptCredential(apiKey.trim());
      updateData.status = "CONFIGURED";
    }

    let config;
    if (id) {
      config = await prisma.aIProviderConfig.update({
        where: { id },
        data: updateData,
      });
    } else {
      config = await prisma.aIProviderConfig.create({
        data: {
          businessId: businessId || null,
          provider,
          modelId,
          priority: priority ?? 1,
          isEnabled: isEnabled ?? true,
          timeoutMs: timeoutMs ?? 15000,
          maxTokens: maxTokens ?? 1024,
          temperature: temperature ?? 0.3,
          apiKeyEncrypted: apiKey ? encryptCredential(apiKey.trim()) : encryptCredential("placeholder"),
          status: apiKey ? "CONFIGURED" : "NOT_CONFIGURED",
        },
      });
    }

    return NextResponse.json({ success: true, configId: config.id });
  } catch (err: any) {
    if (isDynamicServerError(err)) {
      throw err;
    }
    return NextResponse.json(
      { error: err?.message || "Failed to update AI provider configuration" },
      { status: 500 }
    );
  }
}
