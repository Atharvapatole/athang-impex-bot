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
  Sliders,
  Sparkles,
} from "lucide-react";

export default function AiProvidersPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [statusNotes, setStatusNotes] = useState<Record<string, { type: "success" | "error"; msg: string }>>({});

  const loadConfigs = () => {
    setLoading(true);
    fetch("/api/ai-providers")
      .then((r) => r.json())
      .then((d) => {
        if (d.configs) setConfigs(d.configs);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleUpdate = async (config: any) => {
    setSavingId(config.id);
    try {
      const res = await fetch("/api/ai-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusNotes((prev) => ({
        ...prev,
        [config.id]: { type: "success", msg: "Configuration successfully saved and encrypted" },
      }));
      setTimeout(() => {
        setStatusNotes((prev) => {
          const c = { ...prev };
          delete c[config.id];
          return c;
        });
      }, 3000);
      loadConfigs();
    } catch (err: any) {
      setStatusNotes((prev) => ({
        ...prev,
        [config.id]: { type: "error", msg: err.message },
      }));
    } finally {
      setSavingId(null);
    }
  };

  const handleTest = async (config: any) => {
    setTestingId(config.id);
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
          [config.id]: {
            type: "success",
            msg: `Connection successful! Latency: ${data.latencyMs}ms`,
          },
        }));
      } else {
        setStatusNotes((prev) => ({
          ...prev,
          [config.id]: { type: "error", msg: data.error || "Connection test failed" },
        }));
      }
      loadConfigs();
    } catch (err: any) {
      setStatusNotes((prev) => ({
        ...prev,
        [config.id]: { type: "error", msg: err.message },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleFieldChange = (id: string, field: string, val: any) => {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: val } : c))
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            AI Provider Fallback Engine
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Deterministic 3-tier fallback chain: Groq &rarr; Mistral &rarr; Google Gemini with AES-256-GCM credential encryption.
          </p>
        </div>

        <div className="space-y-5">
          {configs.map((config) => {
            const note = statusNotes[config.id];

            return (
              <div
                key={config.id}
                className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                      #{config.priority}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          {config.provider}
                        </h2>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {config.businessName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            config.status === "CONNECTION_TESTED"
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                              : config.status === "CONFIGURED"
                              ? "bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300"
                              : "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {config.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Active Key: <span className="font-mono">{config.maskedKey}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleTest(config)}
                      disabled={testingId === config.id}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={testingId === config.id ? "animate-spin" : ""} />
                      <span>{testingId === config.id ? "Pinging..." : "Test Ping"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate(config)}
                      disabled={savingId === config.id}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <Save size={13} />
                      <span>{savingId === config.id ? "Saving..." : "Save"}</span>
                    </button>
                  </div>
                </div>

                {note && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                      note.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {note.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{note.msg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      API Key (Leave blank to keep current)
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="Update API Key..."
                        value={config.apiKey || ""}
                        onChange={(e) => handleFieldChange(config.id, "apiKey", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Model Identifier
                    </label>
                    <input
                      type="text"
                      value={config.modelId || ""}
                      onChange={(e) => handleFieldChange(config.id, "modelId", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Priority Order
                    </label>
                    <select
                      value={config.priority}
                      onChange={(e) => handleFieldChange(config.id, "priority", parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value={1}>1 (First Priority - Groq)</option>
                      <option value={2}>2 (Second Priority - Mistral)</option>
                      <option value={3}>3 (Third Priority - Gemini)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={config.timeoutMs}
                      onChange={(e) => handleFieldChange(config.id, "timeoutMs", parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Max Output Tokens
                    </label>
                    <input
                      type="number"
                      value={config.maxTokens}
                      onChange={(e) => handleFieldChange(config.id, "maxTokens", parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Temperature
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={config.temperature}
                      onChange={(e) => handleFieldChange(config.id, "temperature", parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex items-center pt-5 space-x-2">
                    <input
                      type="checkbox"
                      id={`enabled-${config.id}`}
                      checked={config.isEnabled}
                      onChange={(e) => handleFieldChange(config.id, "isEnabled", e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor={`enabled-${config.id}`} className="font-semibold text-slate-700 dark:text-slate-300">
                      Enable in Fallback
                    </label>
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
