"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  ShieldCheck,
  Lock,
  Key,
  Users,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";

export default function SecuritySettingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/security")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", msg: "New passwords do not match" });
      return;
    }

    setChangingPassword(true);
    setPasswordStatus(null);

    try {
      const res = await fetch("/api/settings/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      setPasswordStatus({ type: "success", msg: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordStatus({ type: "error", msg: err.message || "Failed to update password" });
    } finally {
      setChangingPassword(false);
    }
  };

  const overview = data?.securityOverview;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Security & Cryptographic Controls
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Master credential encryption status, administrator account access, and password management.
          </p>
        </div>

        {/* Security Posture Overview */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <ShieldCheck size={18} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Platform Security Architecture Status
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Master Key Encryption
              </span>
              <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                {overview?.masterKeyStatus || "CONFIGURED_ACTIVE"}
              </p>
              <p className="text-[11px] text-slate-400">{overview?.encryptionCipher}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Password Hashing Algorithm
              </span>
              <p className="text-slate-600 dark:text-slate-300 font-mono">
                {overview?.hashAlgorithm || "bcrypt (12 rounds)"}
              </p>
              <p className="text-[11px] text-slate-400">Slow key-stretching with individual salts</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Session Cookie Flags
              </span>
              <p className="text-slate-600 dark:text-slate-300 font-mono">
                {overview?.cookieFlags || "HttpOnly, SameSite=Lax, Secure"}
              </p>
              <p className="text-[11px] text-slate-400">Guards against XSS session token theft</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                SSRF Anti-Rebinding Guard
              </span>
              <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                {overview?.ssrfProtection || "Active"}
              </p>
              <p className="text-[11px] text-slate-400">DNS validated on every PDF ingestion request</p>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Lock size={18} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Update Administrator Password
            </h2>
          </div>

          {passwordStatus && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                passwordStatus.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400"
              }`}
            >
              {passwordStatus.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{passwordStatus.msg}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password (Minimum 8 characters)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition-colors disabled:opacity-50"
            >
              <Save size={13} />
              <span>{changingPassword ? "Updating..." : "Update Password"}</span>
            </button>
          </form>
        </div>

        {/* Authorized Administrators Table */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Users size={18} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Authorized Administrators & RBAC Roles
            </h2>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5">Name</th>
                  <th className="py-2.5">Email</th>
                  <th className="py-2.5">Role</th>
                  <th className="py-2.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {data?.administrators?.map((a: any) => (
                  <tr key={a.id}>
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">{a.name}</td>
                    <td className="py-3 font-mono text-slate-600 dark:text-slate-300">{a.email}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {a.role}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</td>
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
