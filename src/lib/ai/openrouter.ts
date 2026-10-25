import { AIAdapterOptions, AIProviderAdapter, NormalizedAIError, PromptMessage } from "./types";
import { AIResponseResult } from "../types";

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  isFree: boolean;
  contextLength?: number;
  description?: string;
}

export class OpenRouterAdapter implements AIProviderAdapter {
  provider: "OPENROUTER" = "OPENROUTER";
  private apiKey: string;
  private modelId: string;
  private timeoutMs: number;
  private maxTokens: number;
  private temperature: number;

  constructor(options: AIAdapterOptions) {
    this.apiKey = (options.apiKey || "").trim().replace(/^Bearer\s+/i, "");
    this.modelId = (options.modelId || "").trim() || "openrouter/free";
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
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": process.env.APP_BASE_URL || "https://athangimpexbot.vercel.app",
          "X-Title": "ATHANG IMPEX AI Chatbot",
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
        provider: "OPENROUTER",
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
          message: `OpenRouter request timed out after ${timeout}ms for model '${model}'`,
          provider: "OPENROUTER",
        } as NormalizedAIError;
      }
      if (err.category) throw err;
      throw this.normalizeError(500, err.message || "Unknown OpenRouter error", model);
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
          error: "Valid OpenRouter API key is required. Enter key starting with 'sk-or-v1-'.",
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
        error: err.message || "OpenRouter connection test failed",
      };
    }
  }

  /**
   * Fetches real-time model catalog from OpenRouter public API,
   * categorizing free vs paid models.
   */
  static async getAvailableModels(): Promise<OpenRouterModelInfo[]> {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 3600 },
      });
      if (!res.ok) return [];

      const json = await res.json();
      const list: any[] = json.data || [];

      return list.map((m) => {
        const isPromptFree = m.pricing?.prompt === "0" || m.pricing?.prompt === 0;
        const isCompletionFree = m.pricing?.completion === "0" || m.pricing?.completion === 0;
        const isFree = m.id.endsWith(":free") || (isPromptFree && isCompletionFree);

        return {
          id: m.id,
          name: m.name || m.id,
          isFree,
          contextLength: m.context_length,
          description: m.description,
        };
      });
    } catch {
      return [];
    }
  }

  private normalizeError(status: number, responseBody: string, model: string): NormalizedAIError {
    let category: NormalizedAIError["category"] = "UNKNOWN";
    let isRetryable = false;
    let detailMsg = responseBody;

    try {
      const parsed = JSON.parse(responseBody);
      detailMsg = parsed.error?.message || parsed.message || parsed.detail || responseBody;
    } catch {}

    if (status === 401) {
      category = "AUTH_ERROR";
      isRetryable = false;
      detailMsg = `Invalid API Key (${detailMsg}). Verify your key at https://openrouter.ai/keys`;
    } else if (status === 402 || detailMsg.toLowerCase().includes("credit")) {
      category = "AUTH_ERROR";
      isRetryable = false;
      detailMsg = `Insufficient credits for model '${model}'. Choose a free model (e.g. 'openrouter/free' or a ':free' variant) or add credits at https://openrouter.ai/credits`;
    } else if (status === 404 || detailMsg.toLowerCase().includes("not found") || detailMsg.toLowerCase().includes("no available provider")) {
      category = "INVALID_MODEL";
      isRetryable = false;
      detailMsg = `Model '${model}' is unavailable on OpenRouter (${detailMsg}). Try selecting 'openrouter/free' or another available model.`;
    } else if (status === 429) {
      category = "RATE_LIMIT";
      isRetryable = true;
      detailMsg = `Rate limit reached on OpenRouter (${detailMsg}). Retrying / failing over.`;
    } else if (status >= 500) {
      category = "SERVER_ERROR";
      isRetryable = true;
      detailMsg = `OpenRouter server error [${status}]: ${detailMsg}`;
    }

    return {
      category,
      isRetryable,
      statusCode: status,
      message: `OpenRouter [${status}]: ${detailMsg}`,
      provider: "OPENROUTER",
    };
  }
}
