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
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

export default function WhatsAppConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [webhookVerifyToken, setWebhookVerifyToken] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveNote, setSaveNote] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showTokens, setShowTokens] = useState(false);

  const loadConfig = () => {
    setLoading(true);
    fetch("/api/channels/whatsapp")
      .then((r) => r.json())
      .then((d) => {
        if (d.config) {
          setConfig(d.config);
          setPhoneNumberId(d.config.phoneNumberId || "");
          setWabaId(d.config.wabaId || "");
          setWebhookVerifyToken(d.config.webhookVerifyToken || "athang_whatsapp_verify_token_2026");
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
    setSaveNote(null);

    try {
      const res = await fetch("/api/channels/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId,
          wabaId,
          webhookVerifyToken,
          accessToken: accessToken ? accessToken.trim() : undefined,
          appSecret: appSecret ? appSecret.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSaveNote({
        type: "success",
        msg: "WhatsApp configuration saved and encrypted with AES-256-GCM.",
      });
      setAccessToken("");
      setAppSecret("");
      loadConfig();
    } catch (err: any) {
      setSaveNote({
        type: "error",
        msg: err.message || "Failed to save configuration",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/channels/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          phoneNumberId,
          accessToken: accessToken ? accessToken.trim() : undefined,
        }),
      });

      const data = await res.json();
      setTestResult(data);
      loadConfig();
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || "Network error testing Meta connection",
      });
    } finally {
      setTesting(false);
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
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
              <Link href="/channels" className="hover:underline">Channels</Link>
              <span>/</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">WhatsApp Cloud API</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Official WhatsApp Cloud API Integration
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Connect ATHANG IMPEX directly to Meta WhatsApp Cloud API for automated export enquiries.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/channels/telegram"
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg"
            >
              <span>Switch to Telegram</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Live Status Banner */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              WA
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
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {status === "CONNECTED"
                  ? "Meta Graph API credentials verified. Live messaging active."
                  : status === "PENDING_VERIFICATION"
                  ? "Credentials saved. Click 'Test Connection' or configure Meta Webhook."
                  : status === "CONNECTION_FAILED"
                  ? `Last Error: ${config?.lastError || "Invalid credentials"}`
                  : "Enter your Meta credentials below to connect WhatsApp."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !phoneNumberId}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={13} className={testing ? "animate-spin" : ""} />
            <span>{testing ? "Testing Meta API..." : "Test Connection"}</span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {saveNote && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 ${
              saveNote.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400"
            }`}
          >
            {saveNote.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{saveNote.msg}</span>
          </div>
        )}

        {testResult && (
          <div
            className={`p-4 rounded-xl text-xs space-y-1 ${
              testResult.success
                ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400"
            }`}
          >
            <div className="flex items-center space-x-2 font-bold text-sm">
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.success ? "Meta Connection Test Succeeded!" : "Meta Connection Test Failed"}</span>
            </div>
            {testResult.success && testResult.data ? (
              <p className="text-[11px] font-mono">
                Verified Business Name: <strong>{testResult.data.verifiedName}</strong> &bull; Phone: <strong>{testResult.data.displayPhoneNumber}</strong> &bull; Quality: <strong>{testResult.data.qualityRating}</strong>
              </p>
            ) : (
              <p className="text-[11px] font-mono">{testResult.error}</p>
            )}
          </div>
        )}

        {/* Main Configuration Form */}
        <form onSubmit={handleSave} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Meta WhatsApp Cloud API Credentials
            </h2>
            <span className="text-[11px] text-slate-400 flex items-center space-x-1">
              <Lock size={12} className="text-emerald-500" />
              <span>Encrypted with AES-256-GCM</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Field 1: Phone Number ID */}
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                1. Phone Number ID *
              </label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                From Meta Developer Portal &rarr; WhatsApp &rarr; API Setup.
              </p>
              <input
                type="text"
                required
                placeholder="e.g. 109876543210987"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs"
              />
            </div>

            {/* Field 2: Verify Token */}
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                2. Verify Token *
              </label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                The verification string you configure in Meta Webhook handshake.
              </p>
              <input
                type="text"
                required
                placeholder="athang_whatsapp_verify_token_2026"
                value={webhookVerifyToken}
                onChange={(e) => setWebhookVerifyToken(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Field 3: Access Token */}
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                3. Access Token (Permanent System User Token) *
              </label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Current stored: <span className="font-mono text-slate-700 dark:text-slate-300">{config?.maskedAccessToken}</span>
              </p>
              <input
                type="password"
                placeholder="Paste new Meta access token to update..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs"
              />
            </div>

            {/* Field 4: App Secret */}
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                4. App Secret (for HMAC-SHA256 signature verification)
              </label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Current stored: <span className="font-mono text-slate-700 dark:text-slate-300">{config?.maskedAppSecret}</span>
              </p>
              <input
                type="password"
                placeholder="Paste Meta App Secret to update..."
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs"
              />
            </div>
          </div>

          {/* Field 5: Webhook URL */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                5. Webhook Callback URL
              </span>
              <button
                type="button"
                onClick={copyWebhookUrl}
                className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? "Copied!" : "Copy Webhook URL"}</span>
              </button>
            </div>
            <code className="block p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 select-all break-all">
              {config?.webhookUrl || "https://athangimpexbot.vercel.app/api/webhooks/whatsapp"}
            </code>
            <p className="text-[11px] text-slate-500">
              Paste this URL in Meta Developer Portal &rarr; WhatsApp &rarr; Configuration &rarr; Webhook, with Verify Token: <strong className="font-mono text-slate-700 dark:text-slate-300">{webhookVerifyToken}</strong>. Subscribe to the <strong className="font-mono">messages</strong> webhook field.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !phoneNumberId}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              <RefreshCw size={13} className={testing ? "animate-spin" : ""} />
              <span>Test Connection</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? "Saving..." : "Save Configuration"}</span>
            </button>
          </div>
        </form>

        {/* Setup Guide Card */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 text-xs">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>Meta WhatsApp Cloud API Production Setup Guide</span>
          </h3>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-400">
            <li>Log into <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 underline">Meta Developer Portal</a> and open your Business App.</li>
            <li>Go to <strong>WhatsApp &rarr; API Setup</strong> to copy your <strong>Phone Number ID</strong> and generate an Access Token.</li>
            <li>In <strong>WhatsApp &rarr; Configuration</strong>, click <strong>Edit Webhook</strong>, paste the Webhook Callback URL (<code className="text-emerald-600 dark:text-emerald-400">https://athangimpexbot.vercel.app/api/webhooks/whatsapp</code>) and your Verify Token.</li>
            <li>Under <strong>Webhook fields</strong>, click <strong>Manage</strong> and check <strong>messages</strong>.</li>
            <li>Click <strong>Test Connection</strong> above to confirm Meta Graph API connectivity.</li>
          </ol>
        </div>
      </div>
    </DashboardLayout>
  );
}
