import { AIAdapterOptions, AIProviderAdapter, NormalizedAIError, PromptMessage } from "./types";
import { AIResponseResult } from "../types";

export class GroqAdapter implements AIProviderAdapter {
  provider: "GROQ" = "GROQ";
  private apiKey: string;
  private modelId: string;
  private timeoutMs: number;
  private maxTokens: number;
  private temperature: number;

  constructor(options: AIAdapterOptions) {
    this.apiKey = (options.apiKey || "").trim().replace(/^Bearer\s+/i, "");
    this.modelId = (options.modelId || "").trim() || "llama-3.3-70b-versatile";
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
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
        throw this.normalizeError(res.status, errorText, model);
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const text = choice?.message?.content?.trim() || "";
      const usage = data.usage;

      return {
        text,
        provider: "GROQ",
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
          message: `Groq request timed out after ${timeout}ms for model '${model}'`,
          provider: "GROQ",
        } as NormalizedAIError;
      }
      if (err.category) throw err;
      throw this.normalizeError(500, err.message || "Unknown Groq error", model);
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
          error: "Valid Groq API key is required. Generate one at https://console.groq.com/keys",
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
        error: err.message || "Groq connection test failed",
      };
    }
  }

  private normalizeError(status: number, responseBody: string, model: string): NormalizedAIError {
    let category: NormalizedAIError["category"] = "UNKNOWN";
    let isRetryable = false;
    let detailMsg = responseBody;

    try {
      const parsed = JSON.parse(responseBody);
      detailMsg = parsed.error?.message || parsed.message || responseBody;
    } catch {}

    if (status === 401) {
      category = "AUTH_ERROR";
      isRetryable = false;
      detailMsg = `Invalid API Key (${detailMsg}). Check your key at https://console.groq.com/keys`;
    } else if (status === 400 || status === 404 || detailMsg.toLowerCase().includes("model_not_found") || detailMsg.toLowerCase().includes("decommissioned")) {
      category = "INVALID_MODEL";
      isRetryable = false;
      detailMsg = `Model '${model}' error (${detailMsg}). Recommended model: 'llama-3.3-70b-versatile'.`;
    } else if (status === 429) {
      category = "RATE_LIMIT";
      isRetryable = true;
      detailMsg = `Rate limit or token quota exceeded on Groq (${detailMsg}). Failing over to Mistral AI.`;
    } else if (status >= 500) {
      category = "SERVER_ERROR";
      isRetryable = true;
      detailMsg = `Groq server error [${status}]: ${detailMsg}`;
    }

    return {
      category,
      isRetryable,
      statusCode: status,
      message: `Groq [${status}]: ${detailMsg}`,
      provider: "GROQ",
    };
  }
}
