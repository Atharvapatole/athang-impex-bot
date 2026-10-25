export type Role = "OWNER" | "ADMIN" | "SUPPORT_AGENT";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export type ChannelType = "WHATSAPP" | "TELEGRAM";

export type AIProvider = "GROQ" | "MISTRAL" | "GEMINI" | "OPENROUTER";

export interface AIProviderConfigData {
  provider: AIProvider;
  apiKey: string;
  modelId: string;
  priority: number;
  isEnabled: boolean;
  timeoutMs: number;
  maxTokens: number;
  temperature: number;
}

export interface InboundMessageEvent {
  businessId: string;
  channelType: ChannelType;
  channelMessageId: string;
  senderIdentifier: string;
  senderName?: string;
  text: string;
  rawPayload: any;
}

export interface GroundedPromptOptions {
  businessName: string;
  systemInstructions: string;
  whenYouDontKnow: string;
  knowledgeChunks: Array<{
    id: string;
    content: string;
    sourceName: string;
    pageNumber?: number | null;
  }>;
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  currentMessage: string;
}

export interface AIResponseResult {
  text: string;
  provider: AIProvider;
  modelId: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ExtractedLeadData {
  buyerName?: string;
  company?: string;
  country?: string;
  destinationPort?: string;
  productOfInterest?: string;
  quantityAndUnit?: string;
  requiredSpecs?: string;
  packagingPreference?: string;
  purchaseTimeline?: string;
  emailOrPhone?: string;
  orderReference?: string;
  supportTopic?: string;
  supportIssue?: string;
}
