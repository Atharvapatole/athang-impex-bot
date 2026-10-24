import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { decryptCredential } from "@/lib/crypto";
import { GroqAdapter } from "@/lib/ai/groq";
import { MistralAdapter } from "@/lib/ai/mistral";
import { GeminiAdapter } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN"]);
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

    if (!resolvedKey || resolvedKey.includes("placeholder")) {
      return NextResponse.json({
        success: false,
        error: "Cannot test connection with placeholder key. Please enter a valid API key.",
      });
    }

    let adapter: any;
    const opts = { apiKey: resolvedKey, modelId: resolvedModel };

    if (resolvedProvider === "GROQ") {
      adapter = new GroqAdapter(opts);
    } else if (resolvedProvider === "MISTRAL") {
      adapter = new MistralAdapter(opts);
    } else if (resolvedProvider === "GEMINI") {
      adapter = new GeminiAdapter(opts);
    } else {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    const testResult = await adapter.testConnection();

    if (configRecord) {
      await prisma.aIProviderConfig.update({
        where: { id: configRecord.id },
        data: {
          lastTestedAt: new Date(),
          status: testResult.success ? "CONNECTION_TESTED" : "ERROR",
          lastError: testResult.success ? null : testResult.error,
        },
      });
    }

    return NextResponse.json(testResult);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
