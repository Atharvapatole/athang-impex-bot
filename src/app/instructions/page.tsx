"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FileText,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  History,
  Sparkles,
} from "lucide-react";

export default function InstructionsPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [selectedBiz, setSelectedBiz] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [formData, setFormData] = useState({
    systemInstructions: "",
    whenYouDontKnow: "",
    welcomeMessage: "",
    safeFailureMessage: "",
    humanHandoffMessage: "",
    closingMessage: "",
    versionNote: "",
  });

  useEffect(() => {
    fetch("/api/businesses")
      .then((r) => r.json())
      .then((d) => {
        if (d.businesses && d.businesses.length > 0) {
          setBusinesses(d.businesses);
          setSelectedBusinessId(d.businesses[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedBusinessId) return;
    fetch(`/api/businesses/${selectedBusinessId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.business) {
          setSelectedBiz(d.business);
          setFormData({
            systemInstructions: d.business.systemInstructions || "",
            whenYouDontKnow: d.business.whenYouDontKnow || "",
            welcomeMessage: d.business.welcomeMessage || "",
            safeFailureMessage: d.business.safeFailureMessage || "",
            humanHandoffMessage: d.business.humanHandoffMessage || "",
            closingMessage: d.business.closingMessage || "",
            versionNote: "",
          });
        }
      });

    // Fetch version history
    fetch(`/api/businesses/${selectedBusinessId}/instructions`)
      .then((r) => r.json())
      .then((d) => {
        if (d.versions) setVersions(d.versions);
      });
  }, [selectedBusinessId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/businesses/${selectedBusinessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Refresh versions
      fetch(`/api/businesses/${selectedBusinessId}/instructions`)
        .then((r) => r.json())
        .then((d) => {
          if (d.versions) setVersions(d.versions);
        });
    } catch (err: any) {
      alert(err.message || "Failed to save instructions");
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async (versionId: string) => {
    if (!confirm("Revert active instructions to this earlier version snapshot?")) return;
    try {
      const res = await fetch(`/api/businesses/${selectedBusinessId}/instructions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      const data = await res.json();
      if (data.success && data.business) {
        setSelectedBiz(data.business);
        setFormData({
          systemInstructions: data.business.systemInstructions || "",
          whenYouDontKnow: data.business.whenYouDontKnow || "",
          welcomeMessage: data.business.welcomeMessage || "",
          safeFailureMessage: data.business.safeFailureMessage || "",
          humanHandoffMessage: data.business.humanHandoffMessage || "",
          closingMessage: data.business.closingMessage || "",
          versionNote: "",
        });
        alert("Instructions restored to selected version!");
      }
    } catch (err) {
      alert("Failed to revert version");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Business Instructions & Policy Editor
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure strict grounding instructions, missing-information policies, and version history.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Scope: ATHANG IMPEX
            </span>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 size={16} />
            <span>Instructions version saved and applied to real-time AI replies!</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor Form */}
          <form onSubmit={handleSave} className="lg:col-span-2 space-y-5">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  System Instructions (Core Prompt)
                </label>
                <textarea
                  rows={8}
                  required
                  value={formData.systemInstructions}
                  onChange={(e) => setFormData({ ...formData, systemInstructions: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  &ldquo;When You Don&apos;t Know&rdquo; Policy
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.whenYouDontKnow}
                  onChange={(e) => setFormData({ ...formData, whenYouDontKnow: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Welcome Message
                  </label>
                  <textarea
                    rows={2}
                    value={formData.welcomeMessage}
                    onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Safe Failure Message
                  </label>
                  <textarea
                    rows={2}
                    value={formData.safeFailureMessage}
                    onChange={(e) => setFormData({ ...formData, safeFailureMessage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Human Handoff Message
                  </label>
                  <textarea
                    rows={2}
                    value={formData.humanHandoffMessage}
                    onChange={(e) => setFormData({ ...formData, humanHandoffMessage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Version Audit Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Updated MOQ and onion specifications"
                    value={formData.versionNote}
                    onChange={(e) => setFormData({ ...formData, versionNote: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{saving ? "Saving..." : "Save Active Instructions"}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Version History Sidebar */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <History size={16} className="text-emerald-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Version History & Revert
              </h2>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {versions.length === 0 ? (
                <p className="text-xs text-slate-400">No version snapshots recorded yet.</p>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{new Date(v.createdAt).toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => handleRevert(v.id)}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 font-semibold"
                      >
                        <RotateCcw size={11} />
                        <span>Restore</span>
                      </button>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {v.versionNote || "Standard update"}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{v.systemInstructions}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
