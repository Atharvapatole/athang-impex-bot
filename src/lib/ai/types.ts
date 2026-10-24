import { AIProvider, AIResponseResult } from "../types";

export type AIErrorCategory =
  | "AUTH_ERROR"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "SERVER_ERROR"
  | "INVALID_MODEL"
  | "UNKNOWN";

export interface NormalizedAIError {
  category: AIErrorCategory;
  isRetryable: boolean;
  message: string;
  statusCode?: number;
  provider: AIProvider;
}

export interface AIAdapterOptions {
  apiKey: string;
  modelId: string;
  timeoutMs?: number;
  maxTokens?: number;
  temperature?: number;
}

export interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProviderAdapter {
  provider: AIProvider;
  generateResponse(messages: PromptMessage[], options?: Partial<AIAdapterOptions>): Promise<AIResponseResult>;
  testConnection(): Promise<{ success: boolean; latencyMs: number; error?: string }>;
}
