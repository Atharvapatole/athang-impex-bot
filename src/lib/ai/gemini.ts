import { AIAdapterOptions, AIProviderAdapter, NormalizedAIError, PromptMessage } from "./types";
import { AIResponseResult } from "../types";

export class GeminiAdapter implements AIProviderAdapter {
  provider: "GEMINI" = "GEMINI";
  private apiKey: string;
  private modelId: string;
  private timeoutMs: number;
  private maxTokens: number;
  private temperature: number;

  constructor(options: AIAdapterOptions) {
    this.apiKey = options.apiKey;
    this.modelId = options.modelId || "gemini-1.5-flash";
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

    // Extract system instructions and format user/assistant messages for Gemini
    let systemInstructionText = "";
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemInstructionText += (systemInstructionText ? "\n\n" : "") + msg.content;
      } else {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "ping" }] });
    }

    const payload: any = {
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    };

    if (systemInstructionText) {
      payload.systemInstruction = {
        parts: [{ text: systemInstructionText }],
      };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        const errorText = await res.text();
        throw this.normalizeError(res.status, errorText);
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text?.trim() || "";
      const usageMetadata = data.usageMetadata;

      return {
        text,
        provider: "GEMINI",
        modelId: model,
        latencyMs,
        promptTokens: usageMetadata?.promptTokenCount,
        completionTokens: usageMetadata?.candidatesTokenCount,
        totalTokens: usageMetadata?.totalTokenCount,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw {
          category: "TIMEOUT",
          isRetryable: true,
          message: `Gemini request timed out after ${timeout}ms`,
          provider: "GEMINI",
        } as NormalizedAIError;
      }
      if (err.category) throw err;
      throw this.normalizeError(500, err.message || "Unknown Gemini error");
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
        error: err.message || "Gemini connection test failed",
      };
    }
  }

  private normalizeError(status: number, responseBody: string): NormalizedAIError {
    let category: NormalizedAIError["category"] = "UNKNOWN";
    let isRetryable = false;

    if (status === 400 && responseBody.includes("API_KEY_INVALID")) {
      category = "AUTH_ERROR";
      isRetryable = false;
    } else if (status === 401 || status === 403) {
      category = "AUTH_ERROR";
      isRetryable = false;
    } else if (status === 404 || responseBody.includes("models/")) {
      category = "INVALID_MODEL";
      isRetryable = false;
    } else if (status === 429 || responseBody.includes("RESOURCE_EXHAUSTED")) {
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
      message: `Gemini [${status}]: ${responseBody.slice(0, 300)}`,
      provider: "GEMINI",
    };
  }
}
