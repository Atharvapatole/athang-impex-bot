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
} from "lucide-react";

interface AIProviderItem {
  id?: string;
  provider: "GROQ" | "MISTRAL" | "GEMINI";
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
  lastError?: string | null;
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
      "llama-3.1-70b-versatile",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ],
    keyPlaceholder: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
  },
  MISTRAL: {
    name: "Mistral AI",
    description: "Enterprise-grade European AI model. Automatic failover tier if Groq rate limits or fails.",
    badge: "Tier 2: First Failover",
    badgeColor: "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    curatedModels: [
      "mistral-large-latest",
      "mistral-medium-latest",
      "mistral-small-latest",
      "open-mistral-7b",
      "codestral-latest",
    ],
    keyPlaceholder: "...",
    docsUrl: "https://console.mistral.ai/api-keys",
  },
  GEMINI: {
    name: "Google Gemini",
    description: "Google frontier AI engine. Final failover tier ensuring maximum uptime and grounded replies.",
    badge: "Tier 3: Final LLM Failover",
    badgeColor: "bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800",
    curatedModels: [
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-2.0-flash-exp",
    ],
    keyPlaceholder: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/app/apikey",
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
];

export default function AiProvidersPage() {
  const [configs, setConfigs] = useState<AIProviderItem[]>(DEFAULT_CONFIGS);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [customModelMode, setCustomModelMode] = useState<Record<string, boolean>>({});
  const [statusNotes, setStatusNotes] = useState<
    Record<string, { type: "success" | "error" | "info"; msg: string }>
  >({});

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-providers");
      const data = await res.json();
      if (data.configs && data.configs.length > 0) {
        // Merge with defaults to ensure all 3 tiers are present in priority order
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
      }, 4000);
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
            msg: `Live connection successful! Latency: ${data.latencyMs}ms. Provider model: ${data.modelId}`,
          },
        }));
        await loadConfigs();
      } else {
        setStatusNotes((prev) => ({
          ...prev,
          [key]: {
            type: "error",
            msg: data.error || "Connection test failed. Check API key and model ID.",
          },
        }));
      }
    } catch (err: any) {
      setStatusNotes((prev) => ({
        ...prev,
        [key]: { type: "error", msg: err.message || "Failed to execute connection test" },
      }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                AI Provider Fallback Engine
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                ATHANG IMPEX Engine
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure the 3-tier fallback chain: Groq &rarr; Mistral AI &rarr; Google Gemini with AES-256-GCM encryption at rest.
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
              Deterministic High-Availability Fallback Chain
            </h2>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Every inbound customer query on WhatsApp or Telegram is evaluated sequentially through the pipeline below. If a tier encounters rate limits, timeouts, or network exceptions, the engine seamlessly fails over to the next tier within milliseconds before resorting to the business safe failure message.
          </p>

          <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="w-full flex-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center">
                1
              </span>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Groq</div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono">Primary (Llama 3.3 70B)</div>
              </div>
            </div>

            <ArrowRight size={16} className="text-slate-400 rotate-90 md:rotate-0 flex-shrink-0" />

            <div className="w-full flex-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-[11px] flex items-center justify-center">
                2
              </span>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Mistral AI</div>
                <div className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">Failover 1 (Mistral Large)</div>
              </div>
            </div>

            <ArrowRight size={16} className="text-slate-400 rotate-90 md:rotate-0 flex-shrink-0" />

            <div className="w-full flex-1 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">
                3
              </span>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Google Gemini</div>
                <div className="text-[10px] text-blue-700 dark:text-blue-300 font-mono">Failover 2 (Gemini 1.5 Flash)</div>
              </div>
            </div>

            <ArrowRight size={16} className="text-slate-400 rotate-90 md:rotate-0 flex-shrink-0" />

            <div className="w-full flex-1 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center space-x-2">
              <ShieldCheck size={20} className="text-slate-500" />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Safe Fallback</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Direct Export Desk WhatsApp</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Provider Configuration Cards */}
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
            };

            const isKeyVisible = !!showKey[config.provider];
            const isCustom = !!customModelMode[config.provider];
            const note = statusNotes[config.provider];
            const isSaving = savingId === config.provider;
            const isTesting = testingId === config.provider;

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
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base">
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
                          <span>Save</span>
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
                        : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {note.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span>{note.msg}</span>
                    </div>
                  </div>
                )}

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* API Key Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        API Key (AES-256 Encrypted)
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Active: {config.maskedKey || "Not configured"}
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
                      >
                        {isKeyVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Plaintext is encrypted immediately before database persistence.</span>
                      <a
                        href={meta.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Get Key &rarr;
                      </a>
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Model Identifier
                      </label>
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

                    {isCustom ? (
                      <input
                        type="text"
                        value={config.modelId}
                        onChange={(e) =>
                          handleFieldChange(config.provider, "modelId", e.target.value)
                        }
                        placeholder="e.g. llama-3.3-70b-versatile"
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
                        {meta.curatedModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    )}

                    <p className="text-[10px] text-slate-400">
                      Recommended default for high reasoning accuracy and fast reply generation.
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
