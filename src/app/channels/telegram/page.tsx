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
  Save,
  Lock,
  ArrowRight,
  ShieldCheck,
  Check,
  Send,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function TelegramConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [webhookSecretToken, setWebhookSecretToken] = useState("");

  // Action status
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [verifyingWebhook, setVerifyingWebhook] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const loadConfig = () => {
    setLoading(true);
    fetch("/api/channels/telegram")
      .then((r) => r.json())
      .then((d) => {
        if (d.config) {
          setConfig(d.config);
          setBotUsername(d.config.botUsername || "");
          setWebhookSecretToken(d.config.webhookSecretToken || "");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      const res = await fetch("/api/channels/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          botToken: botToken ? botToken.trim() : undefined,
          webhookSecretToken: webhookSecretToken ? webhookSecretToken.trim() : undefined,
          botUsername: botUsername ? botUsername.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({
        type: "success",
        msg: "Telegram bot configuration saved and encrypted with AES-256-GCM.",
      });
      setBotToken("");
      loadConfig();
    } catch (err: any) {
      setNotification({ type: "error", msg: err.message || "Failed to save configuration" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setDiagnosticInfo(null);

    try {
      const res = await fetch("/api/channels/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          botToken: botToken ? botToken.trim() : undefined,
        }),
      });

      const data = await res.json();
      setDiagnosticInfo({ action: "test", ...data });
      loadConfig();
    } catch (err: any) {
      setDiagnosticInfo({ action: "test", success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSetWebhook = async () => {
    setSettingWebhook(true);
    setDiagnosticInfo(null);

    try {
      const res = await fetch("/api/channels/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_webhook",
          botToken: botToken ? botToken.trim() : undefined,
          webhookSecretToken,
          webhookUrl: config?.webhookUrl,
        }),
      });

      const data = await res.json();
      setDiagnosticInfo({ action: "set_webhook", ...data });
      loadConfig();
    } catch (err: any) {
      setDiagnosticInfo({ action: "set_webhook", success: false, error: err.message });
    } finally {
      setSettingWebhook(false);
    }
  };

  const handleVerifyWebhook = async () => {
    setVerifyingWebhook(true);
    setDiagnosticInfo(null);

    try {
      const res = await fetch("/api/channels/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_webhook",
          botToken: botToken ? botToken.trim() : undefined,
        }),
      });

      const data = await res.json();
      setDiagnosticInfo({ action: "verify_webhook", ...data });
    } catch (err: any) {
      setDiagnosticInfo({ action: "verify_webhook", success: false, error: err.message });
    } finally {
      setVerifyingWebhook(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect this Telegram bot and delete its registered webhook?")) return;
    setDisconnecting(true);
    setDiagnosticInfo(null);

    try {
      const res = await fetch("/api/channels/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disconnect",
          botToken: botToken ? botToken.trim() : undefined,
        }),
      });

      const data = await res.json();
      setDiagnosticInfo({ action: "disconnect", ...data });
      loadConfig();
    } catch (err: any) {
      setDiagnosticInfo({ action: "disconnect", success: false, error: err.message });
    } finally {
      setDisconnecting(false);
    }
  };

  const copyWebhookUrl = () => {
    if (!config?.webhookUrl) return;
    navigator.clipboard.writeText(config.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const status = config?.status || "NOT_CONFIGURED";

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
              <Link href="/channels" className="hover:underline">Channels</Link>
              <span>/</span>
              <span className="text-sky-500 font-medium">Telegram Bot API</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Official Telegram Bot Integration
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Connect ATHANG IMPEX to an official Telegram bot created via @BotFather.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/channels/whatsapp"
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg"
            >
              <span>Switch to WhatsApp</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Live Status Banner */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              TG
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">Connection Status:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    status === "CONNECTED"
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      : status === "PENDING_VERIFICATION"
                      ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      : status === "CONNECTION_FAILED"
                      ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {status === "CONNECTED"
                    ? "Connected"
                    : status === "PENDING_VERIFICATION"
                    ? "Pending Verification"
                    : status === "CONNECTION_FAILED"
                    ? "Connection Failed"
                    : "Not Configured"}
                </span>
                {config?.botUsername && (
                  <span className="font-mono text-xs text-sky-600 dark:text-sky-400 font-bold">
                    @{config.botUsername}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {status === "CONNECTED"
                  ? "Bot token verified with Telegram getMe API. Automated customer replies active."
                  : status === "PENDING_VERIFICATION"
                  ? "Bot token saved. Click 'Test Connection' or 'Set Webhook'."
                  : status === "CONNECTION_FAILED"
                  ? `Last Error: ${config?.lastError || "Invalid Bot Token"}`
                  : "Enter your Bot Token from @BotFather below."}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || (!config?.hasBotToken && !botToken)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={testing ? "animate-spin" : ""} />
              <span>Test Connection</span>
            </button>
            <button
              type="button"
              onClick={handleSetWebhook}
              disabled={settingWebhook || (!config?.hasBotToken && !botToken)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Send size={13} className={settingWebhook ? "animate-spin" : ""} />
              <span>Set Webhook</span>
            </button>
          </div>
        </div>

        {/* Notifications & Diagnostic Information */}
        {notification && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 ${
              notification.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400"
            }`}
          >
            {notification.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{notification.msg}</span>
          </div>
        )}

        {diagnosticInfo && (
          <div
            className={`p-4 rounded-xl text-xs space-y-1.5 ${
              diagnosticInfo.success
                ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400"
            }`}
          >
            <div className="flex items-center space-x-2 font-bold text-sm">
              {diagnosticInfo.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>
                {diagnosticInfo.action === "test"
                  ? diagnosticInfo.success ? `Connected as @${diagnosticInfo.botInfo?.username} (${diagnosticInfo.botInfo?.first_name})` : "Telegram Authentication Failed"
                  : diagnosticInfo.action === "set_webhook"
                  ? diagnosticInfo.success ? "Webhook Registered Successfully with Telegram!" : "Set Webhook Failed"
                  : diagnosticInfo.action === "verify_webhook"
                  ? "Telegram Webhook Diagnostics (getWebhookInfo)"
                  : "Webhook Disconnected"}
              </span>
            </div>
            {diagnosticInfo.info && (
              <pre className="p-2.5 rounded bg-black/10 dark:bg-black/30 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(diagnosticInfo.info, null, 2)}
              </pre>
            )}
            {diagnosticInfo.error && <p className="font-mono text-[11px]">{diagnosticInfo.error}</p>}
          </div>
        )}

        {/* Telegram Form */}
        <form onSubmit={handleSave} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Telegram Bot Credentials & Security
            </h2>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center space-x-1 transition-colors"
              >
                {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showToken ? "Hide Token" : "Show Token"}</span>
              </button>
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <Lock size={12} className="text-emerald-500" />
                <span>Encrypted with AES-256-GCM</span>
              </span>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Field 1: Bot Token */}
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                1. Telegram Bot Token *
              </label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Current stored: <span className="font-mono text-slate-700 dark:text-slate-300">{config?.maskedBotToken || "Not Configured"}</span>
              </p>
              <input
                type={showToken ? "text" : "password"}
                placeholder="Paste token from @BotFather (e.g. 123456789:ABCdefGHIjklMNOpqrs)..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Field 2: Webhook URL */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  2. Telegram Webhook Callback URL
                </span>
                <button
                  type="button"
                  onClick={copyWebhookUrl}
                  className="inline-flex items-center space-x-1 text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? "Copied!" : "Copy Webhook URL"}</span>
                </button>
              </div>
              <code className="block p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 select-all break-all">
                {config?.webhookUrl || "https://athangimpexbot.vercel.app/api/webhooks/telegram"}
              </code>
              <p className="text-[11px] text-slate-500">
                This URL receives inbound messages from Telegram. Click the <strong>Set Webhook</strong> button above to automatically register it with Telegram&apos;s API.
              </p>
            </div>

            {/* Field 3: Webhook Secret Token */}
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                3. Webhook Secret Token (x-telegram-bot-api-secret-token)
              </label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Sent by Telegram on every webhook request to verify authenticity.
              </p>
              <input
                type="text"
                value={webhookSecretToken}
                onChange={(e) => setWebhookSecretToken(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs"
              />
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleVerifyWebhook}
                disabled={verifyingWebhook || (!config?.hasBotToken && !botToken)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {verifyingWebhook ? "Checking..." : "Verify Webhook (getWebhookInfo)"}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting || (!config?.hasBotToken && !botToken)}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center space-x-1"
              >
                <Trash2 size={13} />
                <span>Disconnect Bot</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? "Saving..." : "Save Configuration"}</span>
            </button>
          </div>
        </form>

        {/* Telegram Setup Guide */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 text-xs">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <ShieldCheck size={16} className="text-sky-500" />
            <span>Telegram Bot Setup Guide with @BotFather</span>
          </h3>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-400">
            <li>Open Telegram and start a chat with <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-500 underline font-semibold">@BotFather</a>.</li>
            <li>Send <code>/newbot</code>, choose a display name (e.g., <em>ATHANG IMPEX Export Assistant</em>) and a username ending in <code>bot</code>.</li>
            <li>Copy the HTTP API token generated by BotFather and paste it in the <strong>Telegram Bot Token</strong> field above.</li>
            <li>Click <strong>Save Configuration</strong>, then click <strong>Set Webhook</strong> to register your webhook with Telegram.</li>
            <li>Send a test message to your bot on Telegram &mdash; it will automatically retrieve ATHANG IMPEX knowledge and respond!</li>
          </ol>
        </div>
      </div>
    </DashboardLayout>
  );
}
