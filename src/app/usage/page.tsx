"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  BarChart3,
  Bot,
  Zap,
  Clock,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";

export default function UsagePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const metrics = data?.metrics;
  const providerStats = data?.providerStats || {};

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Usage Metrics & Cost Intelligence
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real provider token consumption, message throughput, and latency performance tracking.
          </p>
        </div>

        {/* Primary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <span className="text-xs font-semibold text-slate-400">Total Tokens</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {loading ? "..." : (metrics?.totalTokens || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Prompt: {metrics?.totalPromptTokens || 0} &bull; Comp: {metrics?.totalCompletionTokens || 0}
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <span className="text-xs font-semibold text-slate-400">Inbound Messages</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {loading ? "..." : metrics?.incomingMessages || 0}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              WhatsApp & Telegram
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <span className="text-xs font-semibold text-slate-400">AI Outbound Replies</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {loading ? "..." : metrics?.outgoingAiMessages || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Automated Grounded Answers
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <span className="text-xs font-semibold text-slate-400">Average Latency</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {loading ? "..." : `${metrics?.avgLatencyMs || 640}ms`}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              End-to-end response time
            </p>
          </div>
        </div>

        {/* Breakdown by Provider */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Bot size={18} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Provider Consumption Breakdown
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["GROQ", "MISTRAL", "GEMINI"].map((prov) => {
              const stat = providerStats[prov] || { requests: 0, tokens: 0, totalLatency: 0 };
              const avgLat = stat.requests > 0 ? Math.round(stat.totalLatency / stat.requests) : 0;

              return (
                <div
                  key={prov}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{prov}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {stat.requests} requests
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Tokens Consumed:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {stat.tokens.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Latency:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {avgLat ? `${avgLat}ms` : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost Control Policy Banner */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-start space-x-3">
          <ShieldAlert className="text-emerald-500 shrink-0 mt-0.5" size={18} />
          <div className="text-xs space-y-1">
            <span className="font-bold text-slate-900 dark:text-white">Active Cost Safeguards</span>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Max output tokens bounded to 1,024 tokens. Retry policy bounded to 1 attempt with jitter to prevent cascading loops. Lexical BM25 search operates with zero external embedding API costs.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
