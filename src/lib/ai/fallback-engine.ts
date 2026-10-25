import { prisma } from "../prisma";
import { decryptCredential } from "../crypto";
import { GroqAdapter } from "./groq";
import { MistralAdapter } from "./mistral";
import { GeminiAdapter } from "./gemini";
import { OpenRouterAdapter } from "./openrouter";
import { AIProviderAdapter, NormalizedAIError, PromptMessage } from "./types";
import { AIProvider, AIResponseResult } from "../types";

export interface FallbackExecutionResult {
  response: AIResponseResult;
  isSafeFailure: boolean;
  attempts: Array<{
    provider: AIProvider;
    modelId: string;
    success: boolean;
    error?: string;
    latencyMs: number;
  }>;
}

export class FallbackEngine {
  /**
   * Executes AI generation across the configured fallback chain for a business.
   * Priority: Groq (1) -> Mistral (2) -> Gemini (3) -> OpenRouter (4).
   */
  static async generateWithFallback(
    businessId: string,
    messages: PromptMessage[],
    customSafeFailureMessage?: string
  ): Promise<FallbackExecutionResult> {
    const attempts: FallbackExecutionResult["attempts"] = [];

    // 1. Fetch business and enabled AI configs
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        aiConfigs: {
          where: { isEnabled: true },
          orderBy: { priority: "asc" },
        },
      },
    });

    if (!business) {
      throw new Error(`Business not found for ID: ${businessId}`);
    }

    let configs = business.aiConfigs;

    // If no business-specific configs, look for global default configs (businessId is null)
    if (configs.length === 0) {
      configs = await prisma.aIProviderConfig.findMany({
        where: { businessId: null, isEnabled: true },
        orderBy: { priority: "asc" },
      });
    }

    // 2. Iterate through configured providers
    for (const config of configs) {
      const adapter = this.createAdapter(config);
      if (!adapter) continue;

      const attemptStart = Date.now();
      let lastError: string | undefined;

      // Attempt with bounded retry
      for (let retry = 0; retry <= 1; retry++) {
        try {
          if (retry > 0) {
            // Brief backoff with jitter (300-600ms)
            await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 300));
          }

          const result = await adapter.generateResponse(messages, {
            modelId: config.modelId,
            timeoutMs: config.timeoutMs,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
          });

          // Successful response!
          attempts.push({
            provider: config.provider as AIProvider,
            modelId: config.modelId,
            success: true,
            latencyMs: Date.now() - attemptStart,
          });

          // Update provider success timestamp
          await prisma.aIProviderConfig.update({
            where: { id: config.id },
            data: {
              lastSuccessAt: new Date(),
              lastError: null,
              status: "CONNECTION_TESTED",
            },
          });

          // Record token usage if available
          if (result.promptTokens || result.completionTokens) {
            await prisma.usageRecord.create({
              data: {
                businessId,
                provider: result.provider,
                modelId: result.modelId,
                promptTokens: result.promptTokens || 0,
                completionTokens: result.completionTokens || 0,
                totalTokens: result.totalTokens || 0,
                isSuccessful: true,
                latencyMs: result.latencyMs,
              },
            });
          }

          return {
            response: result,
            isSafeFailure: false,
            attempts,
          };
        } catch (err: any) {
          lastError = err.message || "Unknown error";
          const isRetryable = err.isRetryable === true;

          // If permanent auth or invalid model, do not retry this provider
          if (!isRetryable) {
            break;
          }
        }
      }

      // Provider failed all retries
      attempts.push({
        provider: config.provider as AIProvider,
        modelId: config.modelId,
        success: false,
        error: lastError,
        latencyMs: Date.now() - attemptStart,
      });

      // Update provider failure status
      await prisma.aIProviderConfig.update({
        where: { id: config.id },
        data: {
          lastError: (lastError || "Unknown error").slice(0, 500),
          status: "ERROR",
        },
      });
    }

    // 3. If all providers failed, construct Safe Failure response
    const fallbackMessage =
      customSafeFailureMessage ||
      business.safeFailureMessage ||
      "Sorry, I am temporarily unable to process your message. Please reach out directly to our team for assistance.";

    return {
      response: {
        text: fallbackMessage,
        provider: "GROQ", // Sentinel
        modelId: "safe-failure-fallback",
        latencyMs: 0,
      },
      isSafeFailure: true,
      attempts,
    };
  }

  private static createAdapter(config: any): AIProviderAdapter | null {
    try {
      const apiKey = decryptCredential(config.apiKeyEncrypted);
      if (!apiKey || apiKey === "placeholder" || apiKey.trim().length === 0) return null;

      const options = {
        apiKey,
        modelId: config.modelId,
        timeoutMs: config.timeoutMs,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      };

      switch (config.provider) {
        case "GROQ":
          return new GroqAdapter(options);
        case "MISTRAL":
          return new MistralAdapter(options);
        case "GEMINI":
          return new GeminiAdapter(options);
        case "OPENROUTER":
          return new OpenRouterAdapter(options);
        default:
          return null;
      }
    } catch {
      return null;
    }
  }
}
