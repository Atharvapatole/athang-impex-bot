"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  Settings,
  Check,
  ShieldCheck,
  Lock,
} from "lucide-react";

export default function ChannelsOverviewPage() {
  const [waConfig, setWaConfig] = useState<any>(null);
  const [tgConfig, setTgConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/channels/whatsapp").then((r) => r.json()),
      fetch("/api/channels/telegram").then((r) => r.json()),
    ])
      .then(([wa, tg]) => {
        if (wa.config) setWaConfig(wa.config);
        if (tg.config) setTgConfig(tg.config);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Messaging Channels &mdash; ATHANG IMPEX
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage official WhatsApp Cloud API and Telegram Bot integrations for international export inquiries.
          </p>
        </div>

        {/* 2-Card Grid for WhatsApp and Telegram */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* WhatsApp Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                    WA
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Meta WhatsApp Cloud API
                    </h2>
                    <p className="text-xs text-slate-400">Official Meta Graph API v21.0</p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    waConfig?.status === "CONNECTED"
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                      : waConfig?.status === "PENDING_VERIFICATION"
                      ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                      : waConfig?.status === "CONNECTION_FAILED"
                      ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {waConfig?.status === "CONNECTED"
                    ? "Connected"
                    : waConfig?.status === "PENDING_VERIFICATION"
                    ? "Pending Verification"
                    : waConfig?.status === "CONNECTION_FAILED"
                    ? "Connection Failed"
                    : "Not Configured"}
                </span>
              </div>

              <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone Number ID:</span>
                  <span className="font-mono font-semibold">{waConfig?.phoneNumberId || "Not Configured"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Access Token:</span>
                  <span className="font-mono text-slate-500">{waConfig?.maskedAccessToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">App Secret:</span>
                  <span className="font-mono text-slate-500">{waConfig?.maskedAppSecret}</span>
                </div>
              </div>

              {/* Webhook snippet */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Webhook Callback URL:</span>
                  <button
                    onClick={() => copyToClipboard(waConfig?.webhookUrl || "", "wa")}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                  >
                    {copiedKey === "wa" ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedKey === "wa" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <code className="block text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate">
                  {waConfig?.webhookUrl || "https://athangimpexbot.vercel.app/api/webhooks/whatsapp"}
                </code>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Link
                href="/channels/whatsapp"
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                <Settings size={14} />
                <span>Configure WhatsApp</span>
              </Link>
            </div>
          </div>

          {/* Telegram Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white font-bold text-sm">
                    TG
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Official Telegram Bot
                    </h2>
                    <p className="text-xs text-slate-400">Telegram Bot API</p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    tgConfig?.status === "CONNECTED"
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                      : tgConfig?.status === "PENDING_VERIFICATION"
                      ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                      : tgConfig?.status === "CONNECTION_FAILED"
                      ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {tgConfig?.status === "CONNECTED"
                    ? "Connected"
                    : tgConfig?.status === "PENDING_VERIFICATION"
                    ? "Pending Verification"
                    : tgConfig?.status === "CONNECTION_FAILED"
                    ? "Connection Failed"
                    : "Not Configured"}
                </span>
              </div>

              <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bot Username:</span>
                  <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                    {tgConfig?.botUsername ? `@${tgConfig.botUsername}` : "Not Connected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bot Token:</span>
                  <span className="font-mono text-slate-500">{tgConfig?.maskedBotToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Secret Token:</span>
                  <span className="font-mono text-slate-500">{tgConfig?.webhookSecretToken || "Configured"}</span>
                </div>
              </div>

              {/* Webhook snippet */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Webhook Callback URL:</span>
                  <button
                    onClick={() => copyToClipboard(tgConfig?.webhookUrl || "", "tg")}
                    className="text-sky-600 dark:text-sky-400 hover:underline flex items-center space-x-1"
                  >
                    {copiedKey === "tg" ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedKey === "tg" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <code className="block text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate">
                  {tgConfig?.webhookUrl || "https://athangimpexbot.vercel.app/api/webhooks/telegram"}
                </code>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Link
                href="/channels/telegram"
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                <Settings size={14} />
                <span>Configure Telegram</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
