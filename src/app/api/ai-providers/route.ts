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

    let targetBiz = null;
    if (businessId) {
      targetBiz = await prisma.business.findUnique({ where: { id: businessId } });
    }
    if (!targetBiz) {
      targetBiz =
        (await prisma.business.findFirst({ where: { slug: "athang-impex" } })) ||
        (await prisma.business.findFirst());
    }

    const whereClause: any = {};
    if (targetBiz) {
      whereClause.businessId = targetBiz.id;
    }

    let configs = await prisma.aIProviderConfig.findMany({
      where: whereClause,
      orderBy: { priority: "asc" },
      include: { business: { select: { name: true, slug: true } } },
    });

    // Auto-seed or backfill canonical 4-tier AI fallback chain if any are missing
    if (targetBiz) {
      const canonicalTiers = [
        { provider: "GROQ", modelId: "llama-3.3-70b-versatile", priority: 1 },
        { provider: "MISTRAL", modelId: "mistral-large-latest", priority: 2 },
        { provider: "GEMINI", modelId: "gemini-1.5-flash", priority: 3 },
        { provider: "OPENROUTER", modelId: "openrouter/free", priority: 4 },
      ];

      let changed = false;
      for (const tier of canonicalTiers) {
        const existing = configs.find((c) => c.provider === tier.provider);
        if (!existing) {
          await prisma.aIProviderConfig.create({
            data: {
              businessId: targetBiz.id,
              provider: tier.provider,
              modelId: tier.modelId,
              priority: tier.priority,
              isEnabled: true,
              timeoutMs: 15000,
              maxTokens: 1024,
              temperature: 0.3,
              apiKeyEncrypted: encryptCredential("placeholder"),
              status: "NOT_CONFIGURED",
            },
          });
          changed = true;
        }
      }

      if (changed) {
        configs = await prisma.aIProviderConfig.findMany({
          where: whereClause,
          orderBy: { priority: "asc" },
          include: { business: { select: { name: true, slug: true } } },
        });
      }
    }

    // Mask API keys for safe transmission to frontend
    const sanitized = configs.map((c) => {
      let maskedKey = "••••••••";
      let hasValidKey = false;
      try {
        const plain = decryptCredential(c.apiKeyEncrypted);
        if (plain && !plain.includes("placeholder")) {
          hasValidKey = true;
          maskedKey = maskSecret(plain);
        } else {
          maskedKey = "Not configured";
        }
      } catch {
        maskedKey = "Not configured";
      }

      return {
        id: c.id,
        businessId: c.businessId,
        businessName: c.business?.name || "ATHANG IMPEX",
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
        hasValidKey,
        maskedKey,
      };
    });

    return NextResponse.json({ configs: sanitized, businessId: targetBiz?.id });
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
      const cleanKey = apiKey.trim().replace(/^Bearer\s+/i, "");
      updateData.apiKeyEncrypted = encryptCredential(cleanKey);
      updateData.status = "CONFIGURED";
      updateData.lastError = null;
    }

    let config;
    let resolvedBizId = businessId;
    if (!resolvedBizId) {
      const targetBiz =
        (await prisma.business.findFirst({ where: { slug: "athang-impex" } })) ||
        (await prisma.business.findFirst());
      resolvedBizId = targetBiz?.id || null;
    }

    if (id) {
      config = await prisma.aIProviderConfig.update({
        where: { id },
        data: updateData,
      });
    } else if (resolvedBizId && provider) {
      const existing = await prisma.aIProviderConfig.findFirst({
        where: { businessId: resolvedBizId, provider },
      });
      if (existing) {
        config = await prisma.aIProviderConfig.update({
          where: { id: existing.id },
          data: updateData,
        });
      }
    }

    if (!config) {
      const initialKey =
        apiKey && !apiKey.includes("••••")
          ? apiKey.trim().replace(/^Bearer\s+/i, "")
          : "placeholder";

      config = await prisma.aIProviderConfig.create({
        data: {
          businessId: resolvedBizId,
          provider,
          modelId,
          priority: priority ?? 1,
          isEnabled: isEnabled ?? true,
          timeoutMs: timeoutMs ?? 15000,
          maxTokens: maxTokens ?? 1024,
          temperature: temperature ?? 0.3,
          apiKeyEncrypted: encryptCredential(initialKey),
          status: initialKey !== "placeholder" ? "CONFIGURED" : "NOT_CONFIGURED",
        },
      });
    }

    return NextResponse.json({ success: true, configId: config.id, provider: config.provider });
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
