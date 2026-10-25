import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isDynamicServerError } from "@/lib/auth";
import { decryptCredential } from "@/lib/crypto";
import { GroqAdapter } from "@/lib/ai/groq";
import { MistralAdapter } from "@/lib/ai/mistral";
import { GeminiAdapter } from "@/lib/ai/gemini";
import { OpenRouterAdapter } from "@/lib/ai/openrouter";

export async function POST(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN"]);
  } catch (authErr: any) {
    if (isDynamicServerError(authErr)) {
      throw authErr;
    }
    const isForbidden = authErr?.message === "FORBIDDEN";
    return NextResponse.json(
      { success: false, error: isForbidden ? "Forbidden" : "Unauthorized" },
      { status: isForbidden ? 403 : 401 }
    );
  }

  try {
    const { configId, provider, apiKey, modelId } = await req.json();

    let resolvedKey = apiKey;
    let resolvedModel = modelId;
    let resolvedProvider = provider;
    let configRecord: any = null;

    if (configId) {
      configRecord = await prisma.aIProviderConfig.findUnique({
        where: { id: configId },
      });
      if (configRecord) {
        resolvedProvider = resolvedProvider || configRecord.provider;
        resolvedModel = resolvedModel || configRecord.modelId;
        if (!resolvedKey || resolvedKey.includes("••••")) {
          resolvedKey = decryptCredential(configRecord.apiKeyEncrypted);
        }
      }
    }

    // Fallback: look up by provider and target business
    if (!configRecord && resolvedProvider) {
      const targetBiz =
        (await prisma.business.findFirst({ where: { slug: "athang-impex" } })) ||
        (await prisma.business.findFirst());
      if (targetBiz) {
        configRecord = await prisma.aIProviderConfig.findFirst({
          where: { businessId: targetBiz.id, provider: resolvedProvider },
        });
        if (configRecord) {
          resolvedModel = resolvedModel || configRecord.modelId;
          if (!resolvedKey || resolvedKey.includes("••••")) {
            resolvedKey = decryptCredential(configRecord.apiKeyEncrypted);
          }
        }
      }
    }

    const cleanKey = (resolvedKey || "").trim().replace(/^Bearer\s+/i, "");

    if (!cleanKey || cleanKey.includes("placeholder")) {
      const guidance: Record<string, string> = {
        MISTRAL: "Enter your Mistral API key from https://admin.mistral.ai/organization/api-keys to test.",
        GROQ: "Enter your Groq API key from https://console.groq.com/keys to test.",
        GEMINI: "Enter your Google Gemini API key from https://aistudio.google.com/app/apikey to test.",
        OPENROUTER: "Enter your OpenRouter API key from https://openrouter.ai/keys to test.",
      };
      return NextResponse.json({
        success: false,
        error: `Cannot test connection with placeholder key. ${guidance[resolvedProvider] || "Please enter a valid API key."}`,
      });
    }

    let adapter: any;
    const opts = { apiKey: cleanKey, modelId: resolvedModel };

    if (resolvedProvider === "GROQ") {
      adapter = new GroqAdapter(opts);
    } else if (resolvedProvider === "MISTRAL") {
      adapter = new MistralAdapter(opts);
    } else if (resolvedProvider === "GEMINI") {
      adapter = new GeminiAdapter(opts);
    } else if (resolvedProvider === "OPENROUTER") {
      adapter = new OpenRouterAdapter(opts);
    } else {
      return NextResponse.json({ success: false, error: "Unsupported provider" }, { status: 400 });
    }

    const testResult = await adapter.testConnection();

    if (configRecord) {
      try {
        await prisma.aIProviderConfig.update({
          where: { id: configRecord.id },
          data: {
            lastTestedAt: new Date(),
            status: testResult.success ? "CONNECTION_TESTED" : "ERROR",
            lastError: testResult.success ? null : (testResult.error || "Connection failed").slice(0, 500),
          },
        });
      } catch (dbErr: any) {
        console.warn("[AI Provider Test DB Update]", dbErr?.message || dbErr);
      }
    }

    return NextResponse.json(testResult);
  } catch (err: any) {
    if (isDynamicServerError(err)) {
      throw err;
    }
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
