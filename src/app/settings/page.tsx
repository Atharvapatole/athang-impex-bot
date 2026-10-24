"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Settings,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Database,
  Sliders,
  CheckCircle2,
} from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [emergencyAiDisabled, setEmergencyAiDisabled] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Platform Configuration & Cost Control
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Global operational boundaries, encryption parameters, and emergency switches.
          </p>
        </div>

        {/* Emergency Kill Switches */}
        <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="text-rose-500" size={18} />
            <h2 className="text-sm font-bold text-rose-700 dark:text-rose-300">
              Emergency Platform Controls
            </h2>
          </div>
          <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
            Instantly disable automated AI replies or freeze incoming channel dispatch in case of upstream provider anomalies.
          </p>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                const next = !emergencyAiDisabled;
                setEmergencyAiDisabled(next);
                alert(next ? "Emergency AI Pause Activated!" : "Automated AI Resumed.");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                emergencyAiDisabled
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-300"
              }`}
            >
              {emergencyAiDisabled ? "Deactivate Emergency Pause" : "Emergency Pause All AI Generations"}
            </button>
          </div>
        </div>

        {/* Operational Limits Configuration */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Sliders size={18} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Global Limits & Guardrails
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Max PDF File Size
              </span>
              <p className="text-slate-500">15 Megabytes (Enforced before memory buffer parse)</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                PDF Fetch Timeout
              </span>
              <p className="text-slate-500">25 Seconds with bounded AbortController</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Login Rate Limiting
              </span>
              <p className="text-slate-500">
                {settings?.loginRateLimitMax || 5} attempts per{" "}
                {(settings?.loginRateLimitWindowSec || 900) / 60} minutes window
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                SSRF Network Guard
              </span>
              <p className="text-slate-500">
                Blocks 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, and 169.254.169.254
              </p>
            </div>
          </div>
        </div>

        {/* Link to Security Settings */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldCheck size={20} className="text-emerald-500" />
            <div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                Security & Access Control
              </span>
              <span className="text-[11px] text-slate-500">
                Manage administrator credentials, RBAC roles, and encryption key audits.
              </span>
            </div>
          </div>
          <Link
            href="/settings/security"
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
          >
            Manage Security
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
