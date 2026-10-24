import { AIAdapterOptions, AIProviderAdapter, NormalizedAIError, PromptMessage } from "./types";
import { AIResponseResult } from "../types";

export class MistralAdapter implements AIProviderAdapter {
  provider: "MISTRAL" = "MISTRAL";
  private apiKey: string;
  private modelId: string;
  private timeoutMs: number;
  private maxTokens: number;
  private temperature: number;

  constructor(options: AIAdapterOptions) {
    this.apiKey = options.apiKey;
    this.modelId = options.modelId || "mistral-large-latest";
    this.timeoutMs = options.timeoutMs || 15000;
    this.maxTokens = options.maxTokens || 1024;
    this.temperature = options.temperature ?? 0.3;
  }

  async generateResponse(
    messages: PromptMessage[],
    overrideOptions?: Partial<AIAdapterOptions>
  ): Promise<AIResponseResult> {
    const startTime = Date.now();
    const timeout = overrideOptions?.timeoutMs || this.timeoutMs;
    const model = overrideOptions?.modelId || this.modelId;
    const maxTokens = overrideOptions?.maxTokens || this.maxTokens;
    const temperature = overrideOptions?.temperature ?? this.temperature;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        const errorText = await res.text();
        throw this.normalizeError(res.status, errorText);
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const text = choice?.message?.content?.trim() || "";
      const usage = data.usage;

      return {
        text,
        provider: "MISTRAL",
        modelId: model,
        latencyMs,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw {
          category: "TIMEOUT",
          isRetryable: true,
          message: `Mistral request timed out after ${timeout}ms`,
          provider: "MISTRAL",
        } as NormalizedAIError;
      }
      if (err.category) throw err;
      throw this.normalizeError(500, err.message || "Unknown Mistral error");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.generateResponse(
        [{ role: "user", content: "ping" }],
        { maxTokens: 5, timeoutMs: 8000 }
      );
      return { success: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: err.message || "Mistral connection test failed",
      };
    }
  }

  private normalizeError(status: number, responseBody: string): NormalizedAIError {
    let category: NormalizedAIError["category"] = "UNKNOWN";
    let isRetryable = false;

    if (status === 401 || status === 403) {
      category = "AUTH_ERROR";
      isRetryable = false;
    } else if (status === 404 || responseBody.includes("model_not_found")) {
      category = "INVALID_MODEL";
      isRetryable = false;
    } else if (status === 429) {
      category = "RATE_LIMIT";
      isRetryable = true;
    } else if (status >= 500) {
      category = "SERVER_ERROR";
      isRetryable = true;
    }

    return {
      category,
      isRetryable,
      statusCode: status,
      message: `Mistral [${status}]: ${responseBody.slice(0, 300)}`,
      provider: "MISTRAL",
    };
  }
}
