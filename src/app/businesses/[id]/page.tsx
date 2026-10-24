"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Building2,
  FileText,
  BookOpen,
  Share2,
  Save,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Clock,
  Sparkles,
} from "lucide-react";

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "instructions">("profile");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    email: "",
    phone: "",
    timezone: "UTC",
    isActive: true,
    systemInstructions: "",
    whenYouDontKnow: "",
    welcomeMessage: "",
    safeFailureMessage: "",
    humanHandoffMessage: "",
    closingMessage: "",
    versionNote: "",
  });

  useEffect(() => {
    fetch(`/api/businesses/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.business) {
          setBusiness(data.business);
          setFormData({
            name: data.business.name || "",
            description: data.business.description || "",
            website: data.business.website || "",
            email: data.business.email || "",
            phone: data.business.phone || "",
            timezone: data.business.timezone || "UTC",
            isActive: data.business.isActive ?? true,
            systemInstructions: data.business.systemInstructions || "",
            whenYouDontKnow: data.business.whenYouDontKnow || "",
            welcomeMessage: data.business.welcomeMessage || "",
            safeFailureMessage: data.business.safeFailureMessage || "",
            humanHandoffMessage: data.business.humanHandoffMessage || "",
            closingMessage: data.business.closingMessage || "",
            versionNote: "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/businesses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to update business");
        setSaving(false);
        return;
      }

      setBusiness(data.business);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-xs text-slate-500">Loading business configuration...</div>
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-xs text-rose-500">Business not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/businesses"
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {business.name}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {business.slug}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage business profile, system prompts, knowledge grounding, and communication channels.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href={`/channels?businessId=${business.id}`}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              <Share2 size={13} />
              <span>Channels ({business.channels?.length || 0})</span>
            </Link>
            <Link
              href={`/knowledge-base?businessId=${business.id}`}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              <BookOpen size={13} />
              <span>Knowledge Base ({business.kbSources?.length || 0})</span>
            </Link>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="border-b border-slate-200 dark:border-slate-800 flex space-x-4">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === "profile"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Building2 size={14} />
            <span>Profile & Settings</span>
          </button>
          <button
            onClick={() => setActiveTab("instructions")}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === "instructions"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <FileText size={14} />
            <span>AI Instructions & Policies</span>
          </button>
        </div>

        {saveSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle size={15} />
            <span>Changes successfully saved and applied to runtime engine!</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {activeTab === "profile" && (
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description & Export Focus
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Official Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / WhatsApp Helpline
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="isActive" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Business enabled and serving automated messages
                </label>
              </div>
            </div>
          )}

          {activeTab === "instructions" && (
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Primary System Instructions *
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Defines the AI assistant persona, product portfolio details, and lead-qualification questions.
                </p>
                <textarea
                  rows={6}
                  required
                  value={formData.systemInstructions}
                  onChange={(e) => setFormData({ ...formData, systemInstructions: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  "When You Don&apos;t Know" Instructions *
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Strict grounding boundary: What the model must say when the requested information is absent from the knowledge base.
                </p>
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
                    Version Change Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Updated onion powder mesh size and lead collection policy"
                    value={formData.versionNote}
                    onChange={(e) => setFormData({ ...formData, versionNote: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-900/20 disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? "Saving Changes..." : "Save Business Settings"}</span>
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
