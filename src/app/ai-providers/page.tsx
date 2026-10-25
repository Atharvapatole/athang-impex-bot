"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Bot,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Lock,
  Eye,
  EyeOff,
  Sliders,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Check,
  ExternalLink,
  Layers,
} from "lucide-react";

interface AIProviderItem {
  id?: string;
  provider: "GROQ" | "MISTRAL" | "GEMINI" | "OPENROUTER";
  modelId: string;
  priority: number;
  isEnabled: boolean;
  timeoutMs: number;
  maxTokens: number;
  temperature: number;
  status: string;
  maskedKey?: string;
  apiKey?: string;
  businessName?: string;
  lastTestedAt?: string | null;
  lastSuccessAt?: string | null;
  lastError?: string | null;
  hasValidKey?: boolean;
}

const PROVIDER_METADATA: Record<
  string,
  {
    name: string;
    description: string;
    badge: string;
    badgeColor: string;
    curatedModels: string[];
    keyPlaceholder: string;
    docsUrl: string;
    docsLabel: string;
    notes?: string;
  }
> = {
  GROQ: {
    name: "Groq (Llama 3.3 Engine)",
    description: "Ultra low-latency LPU inference. Primary engine for instant WhatsApp and Telegram replies.",
    badge: "Tier 1: Primary Engine",
    badgeColor: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
    curatedModels: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ],
    keyPlaceholder: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
    docsLabel: "Get Groq API Key (console.groq.com)",
  },
  MISTRAL: {
    name: "Mistral AI",
    description: "Enterprise European AI model. Automatic failover tier if Groq rate limits or encounters exceptions.",
    badge: "Tier 2: First Failover",
    badgeColor: "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    curatedModels: [
      "mistral-large-latest",
      "mistral-small-latest",
      "open-mistral-7b",
      "codestral-latest",
    ],
    keyPlaceholder: "Enter Mistral API Key...",
    docsUrl: "https://admin.mistral.ai/organization/api-keys",
    docsLabel: "Get Organization API Key (admin.mistral.ai)",
    notes: "Compatible with keys generated from Mistral Admin Panel. Ensure the key is assigned to an active Workspace with 'Studio' product access.",
  },
  GEMINI: {
    name: "Google Gemini",
    description: "Google frontier AI engine. Secondary failover tier ensuring high reliability and grounded reasoning.",
    badge: "Tier 3: Secondary Failover",
    badgeColor: "bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800",
    curatedModels: [
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-2.0-flash-exp",
    ],
    keyPlaceholder: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    docsLabel: "Get Gemini API Key (aistudio.google.com)",
  },
  OPENROUTER: {
    name: "OpenRouter (Open-Source Fallback)",
    description: "High-availability multi-model gateway. Final failover tier routing to free open-source models (Llama, Mistral, Gemma).",
    badge: "Tier 4: Open-Source Gateway",
    badgeColor: "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800",
    curatedModels: [
      "openrouter/free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "meta-llama/llama-3.2-3b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
      "google/gemma-2-9b-it:free",
      "deepseek/deepseek-chat",
      "openrouter/auto",
    ],
    keyPlaceholder: "sk-or-v1-...",
    docsUrl: "https://openrouter.ai/keys",
    docsLabel: "Get OpenRouter API Key (openrouter.ai)",
    notes: "Select 'openrouter/free' or any model ending in ':free' for 100% free open-source usage without credit requirements.",
  },
};

const DEFAULT_CONFIGS: AIProviderItem[] = [
  {
    provider: "GROQ",
    modelId: "llama-3.3-70b-versatile",
    priority: 1,
    isEnabled: true,
    timeoutMs: 15000,
    maxTokens: 1024,
    temperature: 0.3,
    status: "NOT_CONFIGURED",
    maskedKey: "Not configured",
  },
  {
    provider: "MISTRAL",
    modelId: "mistral-large-latest",
    priority: 2,
    isEnabled: true,
    timeoutMs: 15000,
    maxTokens: 1024,
    temperature: 0.3,
    status: "NOT_CONFIGURED",
    maskedKey: "Not configured",
  },
  {
    provider: "GEMINI",
    modelId: "gemini-1.5-flash",
    priority: 3,
    isEnabled: true,
    timeoutMs: 15000,
    maxTokens: 1024,
    temperature: 0.3,
    status: "NOT_CONFIGURED",
    maskedKey: "Not configured",
  },
  {
    provider: "OPENROUTER",
    modelId: "openrouter/free",
    priority: 4,
    isEnabled: true,
    timeoutMs: 15000,
    maxTokens: 1024,
    temperature: 0.3,
    status: "NOT_CONFIGURED",
    maskedKey: "Not configured",
  },
];

export default function AiProvidersPage() {
  const [configs, setConfigs] = useState<AIProviderItem[]>(DEFAULT_CONFIGS);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [customModelMode, setCustomModelMode] = useState<Record<string, boolean>>({});
  const [dynamicModels, setDynamicModels] = useState<Record<string, string[]>>({});
  const [fetchingModels, setFetchingModels] = useState<Record<string, boolean>>({});
  const [statusNotes, setStatusNotes] = useState<
    Record<string, { type: "success" | "error" | "info"; msg: string }>
  >({});

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-providers");
      const data = await res.json();
      if (data.configs && data.configs.length > 0) {
        // Merge with defaults to ensure all 4 tiers are present in priority order
        const loadedMap = new Map<string, AIProviderItem>();
        for (const item of data.configs) {
          loadedMap.set(item.provider, item);
        }

        const merged = DEFAULT_CONFIGS.map((def) => {
          const loaded = loadedMap.get(def.provider);
          return loaded ? { ...def, ...loaded } : def;
        });

        setConfigs(merged);
      }
    } catch {
      // Keep DEFAULT_CONFIGS so page is never blank
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleFieldChange = (providerKey: string, field: keyof AIProviderItem, value: any) => {
    setConfigs((prev) =>
      prev.map((c) => (c.provider === providerKey ? { ...c, [field]: value } : c))
    );
  };

  const loadDynamicModels = async (provider: string) => {
    setFetchingModels((prev) => ({ ...prev, [provider]: true }));
    try {
      const res = await fetch(`/api/ai-providers/models?provider=${provider}`);
      const data = await res.json();
      if (provider === "OPENROUTER" && data.freeModels) {
        const freeIds = data.freeModels.map((m: any) => m.id);
        const notableIds = (data.notableModels || []).map((m: any) => m.id);
        const combined = Array.from(new Set(["openrouter/free", ...freeIds, ...notableIds]));
        setDynamicModels((prev) => ({ ...prev, [provider]: combined }));
        setStatusNotes((prev) => ({
          ...prev,
          [provider]: {
            type: "info",
            msg: `Loaded ${freeIds.length} verified free models from OpenRouter live catalog.`,
          },
        }));
      }
    } catch {
      // fallback silently
    } finally {
      setFetchingModels((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleSave = async (config: AIProviderItem) => {
    const key = config.provider;
    setSavingId(key);
    setStatusNotes((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });

    try {
      const res = await fetch("/api/ai-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: config.id,
          provider: config.provider,
          modelId: config.modelId,
          apiKey: config.apiKey,
          priority: config.priority,
          isEnabled: config.isEnabled,
          timeoutMs: config.timeoutMs,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save provider settings");

      setStatusNotes((prev) => ({
        ...prev,
        [key]: {
          type: "success",
          msg: "Provider settings and encrypted credentials saved successfully!",
        },
      }));

      // Reload configs to refresh masked key and status from server
      await loadConfigs();

      setTimeout(() => {
        setStatusNotes((prev) => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
      }, 5000);
    } catch (err: any) {
      setStatusNotes((prev) => ({
        ...prev,
        [key]: { type: "error", msg: err.message || "Failed to save configuration" },
      }));
    } finally {
      setSavingId(null);
    }
  };

  const handleTest = async (config: AIProviderItem) => {
    const key = config.provider;
    setTestingId(key);
    setStatusNotes((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });

    try {
      const res = await fetch("/api/ai-providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configId: config.id,
          provider: config.provider,
          modelId: config.modelId,
          apiKey: config.apiKey,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStatusNotes((prev) => ({
          ...prev,
          [key]: {
            type: "success",
            msg: `Connected successfully! Latency: ${data.latencyMs}ms. Model '${data.model || config.modelId}' verified with live API handshake.`,
          },
        }));
        await loadConfigs();
      } else {
        setStatusNotes((prev) => ({
          ...prev,
          [key]: {
            type: "error",
            msg: data.error || "Connection test failed. Check your API key and model ID.",
          },
        }));
      }
    } catch (err: any) {
      setStatusNotes((prev) => ({
        ...prev,
        [key]: { type: "error", msg: err.message || "Network error during connection test" },
      }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
              <span>Settings</span>
              <span>/</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                AI Fallback Engine
              </span>
            </div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Bot size={22} />
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Multi-Provider AI Fallback Engine
              </h1>
            </div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure the 4-tier high-availability fallback chain: Groq &rarr; Mistral AI &rarr; Google Gemini &rarr; OpenRouter with AES-256-GCM encryption at rest.
            </p>
          </div>

          <button
            type="button"
            onClick={loadConfigs}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Fallback Pipeline Visual Card */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <div className="flex items-center space-x-2">
            <Zap size={16} className="text-amber-500" />
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Deterministic High-Availability Fallback Chain (4 Tiers)
            </h2>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Every inbound enquiry on WhatsApp or Telegram is evaluated sequentially through the pipeline below. If a tier encounters rate limits, timeouts, or quota exceptions, the engine automatically fails over to the next enabled provider before falling back to the business export desk message.
          </p>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* Tier 1 */}
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Groq</div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono">Primary (Llama 3.3)</div>
              </div>
            </div>

            {/* Tier 2 */}
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Mistral AI</div>
                <div className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">Failover 1 (Admin Key)</div>
              </div>
            </div>

            {/* Tier 3 */}
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Google Gemini</div>
                <div className="text-[10px] text-blue-700 dark:text-blue-300 font-mono">Failover 2 (Flash/Pro)</div>
              </div>
            </div>

            {/* Tier 4 */}
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                4
              </span>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">OpenRouter</div>
                <div className="text-[10px] text-purple-700 dark:text-purple-300 font-mono">Failover 3 (Open-Source)</div>
              </div>
            </div>

            {/* Safe Fallback */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center space-x-2">
              <ShieldCheck size={20} className="text-slate-500 shrink-0" />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Safe Fallback</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Direct Export Desk Reply</div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Provider Configuration Cards */}
        <div className="space-y-6">
          {configs.map((config) => {
            const meta = PROVIDER_METADATA[config.provider] || {
              name: config.provider,
              description: "AI Provider Engine",
              badge: `Tier ${config.priority}`,
              badgeColor: "bg-slate-100 text-slate-700",
              curatedModels: [config.modelId],
              keyPlaceholder: "Enter API Key",
              docsUrl: "#",
              docsLabel: "API Documentation",
            };

            const isKeyVisible = !!showKey[config.provider];
            const isCustom = !!customModelMode[config.provider];
            const note = statusNotes[config.provider];
            const isSaving = savingId === config.provider;
            const isTesting = testingId === config.provider;
            const modelOptions = dynamicModels[config.provider] || meta.curatedModels;

            return (
              <div
                key={config.provider}
                className={`p-6 rounded-2xl border transition-all shadow-sm space-y-5 bg-white dark:bg-slate-900 ${
                  config.isEnabled
                    ? "border-slate-200 dark:border-slate-800"
                    : "border-slate-200 dark:border-slate-800/50 opacity-75"
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
                      #{config.priority}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          {meta.name}
                        </h2>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.badgeColor}`}
                        >
                          {meta.badge}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            config.status === "CONNECTION_TESTED"
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                              : config.status === "CONFIGURED"
                              ? "bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300"
                              : config.status === "ERROR"
                              ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {config.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {meta.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Enable Toggle */}
                  <div className="flex items-center space-x-2.5 self-end sm:self-auto">
                    <label className="flex items-center space-x-2 cursor-pointer mr-2">
                      <input
                        type="checkbox"
                        checked={config.isEnabled}
                        onChange={(e) =>
                          handleFieldChange(config.provider, "isEnabled", e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600 relative"></div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {config.isEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleTest(config)}
                      disabled={isTesting || isSaving}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={isTesting ? "animate-spin text-emerald-600" : ""} />
                      <span>{isTesting ? "Testing Ping..." : "Test Connection"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSave(config)}
                      disabled={isSaving || isTesting}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save size={13} />
                          <span>Save Settings</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Status Notification Banner */}
                {note && (
                  <div
                    className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
                      note.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"
                        : note.type === "info"
                        ? "bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300"
                        : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="shrink-0">
                        {note.type === "success" ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <AlertCircle size={16} />
                        )}
                      </span>
                      <span>{note.msg}</span>
                    </div>
                  </div>
                )}

                {/* Last Error Display if present and not currently showing another note */}
                {!note && config.status === "ERROR" && config.lastError && (
                  <div className="p-3 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-start space-x-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-semibold">Last Recorded Diagnostic Error:</div>
                      <div className="font-mono text-[11px] break-all">{config.lastError}</div>
                    </div>
                  </div>
                )}

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* API Key Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        API Key (AES-256-GCM Encrypted)
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Stored: {config.maskedKey || "Not configured"}
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type={isKeyVisible ? "text" : "password"}
                        value={config.apiKey || ""}
                        onChange={(e) =>
                          handleFieldChange(config.provider, "apiKey", e.target.value)
                        }
                        placeholder={
                          config.maskedKey && config.maskedKey !== "Not configured"
                            ? "•••••••••••••••• (leave empty to keep current key)"
                            : meta.keyPlaceholder
                        }
                        className="w-full pl-3.5 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowKey((prev) => ({
                            ...prev,
                            [config.provider]: !prev[config.provider],
                          }))
                        }
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title={isKeyVisible ? "Hide key" : "Show key"}
                      >
                        {isKeyVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Encrypted with master key before persistence.</span>
                      <a
                        href={meta.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                      >
                        <span>{meta.docsLabel}</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>

                    {meta.notes && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        {meta.notes}
                      </p>
                    )}
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Model Identifier
                      </label>
                      <div className="flex items-center space-x-3">
                        {config.provider === "OPENROUTER" && (
                          <button
                            type="button"
                            onClick={() => loadDynamicModels("OPENROUTER")}
                            disabled={fetchingModels["OPENROUTER"]}
                            className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1"
                          >
                            <RefreshCw size={10} className={fetchingModels["OPENROUTER"] ? "animate-spin" : ""} />
                            <span>Load Live Free Catalog</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setCustomModelMode((prev) => ({
                              ...prev,
                              [config.provider]: !prev[config.provider],
                            }))
                          }
                          className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          {isCustom ? "Select from list" : "Enter custom model ID"}
                        </button>
                      </div>
                    </div>

                    {isCustom ? (
                      <input
                        type="text"
                        value={config.modelId}
                        onChange={(e) =>
                          handleFieldChange(config.provider, "modelId", e.target.value)
                        }
                        placeholder="e.g. mistral-small-latest"
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    ) : (
                      <select
                        value={config.modelId}
                        onChange={(e) =>
                          handleFieldChange(config.provider, "modelId", e.target.value)
                        }
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        {modelOptions.map((m) => (
                          <option key={m} value={m}>
                            {m} {m.includes(":free") || m === "openrouter/free" ? "(Free)" : ""}
                          </option>
                        ))}
                      </select>
                    )}

                    <p className="text-[10px] text-slate-400">
                      {config.provider === "OPENROUTER"
                        ? "OpenRouter routes automatically to open-source models (Meta Llama, Mistral, Google Gemma)."
                        : "Recommended default for accuracy, high token throughput, and fast inquiry resolution."}
                    </p>
                  </div>
                </div>

                {/* Hyperparameters & Performance Tuning */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Execution Timeout (ms)
                    </label>
                    <input
                      type="number"
                      min={1000}
                      max={60000}
                      step={1000}
                      value={config.timeoutMs}
                      onChange={(e) =>
                        handleFieldChange(
                          config.provider,
                          "timeoutMs",
                          parseInt(e.target.value, 10) || 15000
                        )
                      }
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Fails over after timeout</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Max Output Tokens
                    </label>
                    <input
                      type="number"
                      min={128}
                      max={4096}
                      step={64}
                      value={config.maxTokens}
                      onChange={(e) =>
                        handleFieldChange(
                          config.provider,
                          "maxTokens",
                          parseInt(e.target.value, 10) || 1024
                        )
                      }
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Response token length limit</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Temperature: {config.temperature}
                      </label>
                      <span className="text-[10px] text-slate-400">0.0 (Factual) - 1.0</span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      value={config.temperature}
                      onChange={(e) =>
                        handleFieldChange(
                          config.provider,
                          "temperature",
                          parseFloat(e.target.value) || 0.3
                        )
                      }
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
