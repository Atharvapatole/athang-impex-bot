"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  ScrollText,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
} from "lucide-react";

export default function LogsPage() {
  const [data, setData] = useState<any>(null);
  const [healthLive, setHealthLive] = useState<any>(null);
  const [healthReady, setHealthReady] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/logs").then((r) => r.json()),
      fetch("/api/health/live").then((r) => r.json()),
      fetch("/api/health/ready").then((r) => r.json()),
    ])
      .then(([logsData, liveData, readyData]) => {
        setData(logsData);
        setHealthLive(liveData);
        setHealthReady(readyData);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              System Logs & Queue Monitor
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live background message processing jobs, database worker locks, and health status.
            </p>
          </div>

          <button
            onClick={loadData}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
          >
            <RefreshCw size={13} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {/* Health Endpoints Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-start space-x-3">
            <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
            <div className="text-xs space-y-1">
              <span className="font-bold text-slate-900 dark:text-white">
                Liveness Status: /api/health/live
              </span>
              <p className="text-slate-500 font-mono">
                Status: {healthLive?.status || "Live"} &bull; Node Process Uptime:{" "}
                {healthLive?.uptime ? `${Math.round(healthLive.uptime)}s` : "Active"}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-start space-x-3">
            <Server className="text-sky-500 shrink-0 mt-0.5" size={18} />
            <div className="text-xs space-y-1">
              <span className="font-bold text-slate-900 dark:text-white">
                Readiness Status: /api/health/ready
              </span>
              <p className="text-slate-500 font-mono">
                Database: {healthReady?.database || "Connected"} &bull; Queue Backlog:{" "}
                {healthReady?.queueBacklog ?? 0} jobs pending
              </p>
            </div>
          </div>
        </div>

        {/* Message Processing Queue Table */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Layers size={16} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Durable Job Queue (Recent 100 Events)
            </h2>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-500 font-semibold">
                  <th className="p-3.5">Idempotency Key</th>
                  <th className="p-3.5">Channel</th>
                  <th className="p-3.5">Business</th>
                  <th className="p-3.5">Attempts</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Enqueued At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {data?.jobs?.map((j: any) => (
                  <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="p-3.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {j.idempotencyKey}
                    </td>
                    <td className="p-3.5 font-semibold">{j.channelType}</td>
                    <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      {j.business?.name}
                    </td>
                    <td className="p-3.5">{j.attempts} / {j.maxAttempts}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          j.status === "COMPLETED"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : j.status === "PROCESSING"
                            ? "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300"
                            : j.status === "QUEUED"
                            ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                            : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                      {new Date(j.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
