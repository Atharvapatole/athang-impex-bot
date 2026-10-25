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
    this.apiKey = (options.apiKey || "").trim().replace(/^Bearer\s+/i, "");
    this.modelId = (options.modelId || "").trim() || "mistral-large-latest";
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
    const model = (overrideOptions?.modelId || this.modelId).trim();
    const maxTokens = overrideOptions?.maxTokens || this.maxTokens;
    const temperature = overrideOptions?.temperature ?? this.temperature;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
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
        throw this.normalizeError(res.status, errorText, model);
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
          message: `Mistral request timed out after ${timeout}ms for model '${model}'`,
          provider: "MISTRAL",
        } as NormalizedAIError;
      }
      if (err.category) throw err;
      throw this.normalizeError(500, err.message || "Unknown Mistral error", model);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; error?: string; model?: string }> {
    const start = Date.now();
    try {
      if (!this.apiKey || this.apiKey.includes("placeholder")) {
        return {
          success: false,
          latencyMs: 0,
          error: "Valid Mistral API key is required. Generate one at https://admin.mistral.ai/organization/api-keys",
        };
      }

      await this.generateResponse(
        [{ role: "user", content: "ping" }],
        { maxTokens: 5, timeoutMs: 10000 }
      );
      return { success: true, latencyMs: Date.now() - start, model: this.modelId };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: err.message || "Mistral connection test failed",
      };
    }
  }

  private normalizeError(status: number, responseBody: string, model: string): NormalizedAIError {
    let category: NormalizedAIError["category"] = "UNKNOWN";
    let isRetryable = false;
    let detailMsg = responseBody;

    try {
      const parsed = JSON.parse(responseBody);
      detailMsg = parsed.message || parsed.detail || parsed.error?.message || responseBody;
    } catch {}

    if (status === 401) {
      category = "AUTH_ERROR";
      isRetryable = false;
      detailMsg = `Invalid API Key (${detailMsg}). If generated from https://admin.mistral.ai/organization/api-keys, verify that the key has 'Studio' access and is assigned to an active Workspace with valid billing.`;
    } else if (status === 403) {
      category = "AUTH_ERROR";
      isRetryable = false;
      detailMsg = `Insufficient permissions for model '${model}' (${detailMsg}). Ensure your Mistral organization workspace has access to this model, or try 'mistral-small-latest' or 'open-mistral-7b'.`;
    } else if (status === 404 || detailMsg.toLowerCase().includes("model") || detailMsg.toLowerCase().includes("not_found")) {
      category = "INVALID_MODEL";
      isRetryable = false;
      detailMsg = `Model '${model}' not found or not accessible (${detailMsg}). Try selecting 'mistral-small-latest' or 'open-mistral-7b'.`;
    } else if (status === 429) {
      category = "RATE_LIMIT";
      isRetryable = true;
      detailMsg = `Quota or rate limit exceeded in your Mistral organization account (${detailMsg}). Check limits at https://admin.mistral.ai.`;
    } else if (status >= 500) {
      category = "SERVER_ERROR";
      isRetryable = true;
      detailMsg = `Mistral server error [${status}]: ${detailMsg}`;
    }

    return {
      category,
      isRetryable,
      statusCode: status,
      message: `Mistral [${status}]: ${detailMsg}`,
      provider: "MISTRAL",
    };
  }
}
