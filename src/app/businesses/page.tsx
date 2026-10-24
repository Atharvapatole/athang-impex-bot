"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  Languages,
  HelpCircle,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Boxes,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface BusinessData {
  id?: string;
  name: string;
  slug: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  productsServices: string;
  businessHours: string;
  supportedLanguages: string;
  faq: string;
  timezone: string;
  isActive: boolean;
  systemInstructions: string;
  whenYouDontKnow: string;
  welcomeMessage: string;
  safeFailureMessage: string;
  humanHandoffMessage: string;
  closingMessage: string;
  versionNote?: string;
  _count?: {
    channels: number;
    kbSources: number;
    conversations: number;
    leads: number;
  };
}

const DEFAULT_ATHANG_PROFILE: BusinessData = {
  name: "ATHANG IMPEX",
  slug: "athang-impex",
  description: "Merchant exporter of premium dehydrated agricultural products from India.",
  website: "https://athangimpex.in",
  email: "info@athangimpex.in",
  phone: "+91 9923407176",
  address: "Navi Mumbai / Nashik, Maharashtra, India",
  productsServices:
    "1. Dehydrated Onion Powder (Premium grade, 80-100 mesh, moisture < 6%, free flowing, pungency preserved)\n2. Dehydrated Onion Flakes / Minced (Commercial & A-grade, moisture < 5%, uniform size)\n3. Pure Ginger Powder (High gingerol aroma, fiber < 5%, moisture < 8%)\n4. Tomato Powder (100% spray-dried/dehydrated natural tomato, rich red color, lycopene preserved)",
  businessHours: "Monday - Saturday: 09:00 - 18:00 IST (UTC+5:30) | AI Sales Representative: 24/7 Active",
  supportedLanguages: "English, Hindi, Marathi (Multi-lingual export buyer support)",
  faq: "Q: What is the Minimum Order Quantity (MOQ)?\nA: Minimum 1 FCL (20ft container) or LCL air cargo for commercial test batches.\n\nQ: What packaging sizes are available?\nA: 20kg / 25kg multi-wall paper bags with inner poly liner, or custom export cartons.\n\nQ: What are the payment terms?\nA: Standard export terms: 30% advance T/T, balance against B/L copy, or 100% Confirmed Irrevocable L/C at sight.",
  timezone: "Asia/Kolkata",
  isActive: true,
  systemInstructions: `You are the official AI export sales representative for ATHANG IMPEX, a merchant exporter based in India.
Key Products:
1. Dehydrated Onion Powder (Premium grade, 80-100 mesh, moisture < 6%, free flowing, pungency preserved).
2. Dehydrated Onion Flakes / Minced (Commercial and A-grade, moisture < 5%, uniform size).
3. Ginger Powder (High gingerol aroma, fiber < 5%, moisture < 8%).
4. Tomato Powder (100% spray-dried/dehydrated natural tomato, rich red color, lycopene preserved).`,
  whenYouDontKnow: `For custom chemical parameters, spot CFR/CIF container freight rates, or custom packaging not detailed in the knowledge base, state: "For tailored commercial quotations, minimum order quantities, and custom lab specifications, our export manager will assist you directly. Please share your destination port and required tonnage, or contact us at info@athangimpex.in or +91 9923407176."`,
  welcomeMessage:
    "Welcome to ATHANG IMPEX! We are merchant exporters of premium Dehydrated Onion Powder, Onion Flakes, Ginger Powder, and Tomato Powder from India. How can we assist your business today?",
  safeFailureMessage:
    "Sorry, I'm temporarily unable to process your message. Please contact our export team directly at info@athangimpex.in or WhatsApp +91 9923407176 for immediate assistance.",
  humanHandoffMessage:
    "Your export enquiry has been transferred to our export sales team. An agent will be with you shortly.",
  closingMessage: "Thank you for contacting ATHANG IMPEX. Have a great day!",
  versionNote: "",
};

export default function BusinessProfilePage() {
  const [formData, setFormData] = useState<BusinessData>(DEFAULT_ATHANG_PROFILE);
  const [initialData, setInitialData] = useState<BusinessData>(DEFAULT_ATHANG_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "products" | "ai">("profile");

  const loadProfile = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/businesses");
      const data = await res.json();
      if (data.businesses && data.businesses.length > 0) {
        const biz = data.businesses[0];
        const loaded: BusinessData = {
          id: biz.id,
          name: biz.name || DEFAULT_ATHANG_PROFILE.name,
          slug: biz.slug || DEFAULT_ATHANG_PROFILE.slug,
          description: biz.description || DEFAULT_ATHANG_PROFILE.description,
          website: biz.website || DEFAULT_ATHANG_PROFILE.website,
          email: biz.email || DEFAULT_ATHANG_PROFILE.email,
          phone: biz.phone || DEFAULT_ATHANG_PROFILE.phone,
          address: biz.address || DEFAULT_ATHANG_PROFILE.address,
          productsServices: biz.productsServices || DEFAULT_ATHANG_PROFILE.productsServices,
          businessHours: biz.businessHours || DEFAULT_ATHANG_PROFILE.businessHours,
          supportedLanguages: biz.supportedLanguages || DEFAULT_ATHANG_PROFILE.supportedLanguages,
          faq: biz.faq || DEFAULT_ATHANG_PROFILE.faq,
          timezone: biz.timezone || DEFAULT_ATHANG_PROFILE.timezone,
          isActive: biz.isActive ?? true,
          systemInstructions: biz.systemInstructions || DEFAULT_ATHANG_PROFILE.systemInstructions,
          whenYouDontKnow: biz.whenYouDontKnow || DEFAULT_ATHANG_PROFILE.whenYouDontKnow,
          welcomeMessage: biz.welcomeMessage || DEFAULT_ATHANG_PROFILE.welcomeMessage,
          safeFailureMessage: biz.safeFailureMessage || DEFAULT_ATHANG_PROFILE.safeFailureMessage,
          humanHandoffMessage: biz.humanHandoffMessage || DEFAULT_ATHANG_PROFILE.humanHandoffMessage,
          closingMessage: biz.closingMessage || DEFAULT_ATHANG_PROFILE.closingMessage,
          versionNote: "",
          _count: biz._count,
        };
        setFormData(loaded);
        setInitialData(loaded);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load business profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleFieldChange = (field: keyof BusinessData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFormData(initialData);
    setErrorMessage("");
    setSaveSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage("Business name is required.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/businesses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to update business profile");
      }

      setSaveSuccess(true);
      if (result.business) {
        setFormData((prev) => ({
          ...prev,
          ...result.business,
          versionNote: "",
        }));
        setInitialData((prev) => ({
          ...prev,
          ...result.business,
          versionNote: "",
        }));
      }
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save profile changes");
    } finally {
      setSaving(false);
    }
  };

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  return (
    <DashboardLayout>
      <form onSubmit={handleSave} className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Business Profile — ATHANG IMPEX
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Primary Business
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure company information, products, operational hours, and AI assistant directives for ATHANG IMPEX.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {isDirty && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse hidden sm:inline">
                ● Unsaved changes
              </span>
            )}
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty || saving}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>Business profile and AI assistant instructions saved successfully!</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Persisted</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle size={16} className="text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Stats Banner */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-slate-900 dark:text-white">{formData.name}</span>
                <span className="font-mono text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {formData.slug}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Merchant Exporter • Dehydrated Agricultural Products • India
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center w-full sm:w-auto sm:border-l sm:border-slate-200 sm:dark:border-slate-800 sm:pl-6">
            <div className="px-2">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {formData._count?.channels ?? 2}
              </div>
              <div className="text-[10px] text-slate-400">Channels</div>
            </div>
            <div className="px-2">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {formData._count?.kbSources ?? 0}
              </div>
              <div className="text-[10px] text-slate-400">PDFs</div>
            </div>
            <div className="px-2">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {formData._count?.conversations ?? 0}
              </div>
              <div className="text-[10px] text-slate-400">Chats</div>
            </div>
            <div className="px-2">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {formData._count?.leads ?? 0}
              </div>
              <div className="text-[10px] text-slate-400">Leads</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-800 flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-xs md:text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === "profile"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Building2 size={16} />
            <span>Company & Contact Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`pb-3 text-xs md:text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === "products"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Boxes size={16} />
            <span>Products, Operations & FAQs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`pb-3 text-xs md:text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === "ai"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles size={16} />
            <span>AI Assistant Directives & Tone</span>
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <RefreshCw size={24} className="animate-spin text-emerald-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading ATHANG IMPEX business profile...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: Company Profile */}
            {activeTab === "profile" && (
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Core Business Information
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Official business registration details used in chat introductions and buyer handoffs.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      placeholder="e.g. ATHANG IMPEX"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Slug Identifier
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={formData.slug}
                      className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400 font-mono cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Unique single-business tenant key.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Business Overview / Tagline
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    placeholder="Brief description of enterprise export scope"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <Globe size={13} className="text-slate-400" />
                        <span>Official Website</span>
                      </div>
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleFieldChange("website", e.target.value)}
                      placeholder="https://athangimpex.in"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <Mail size={13} className="text-slate-400" />
                        <span>Official Export Email</span>
                      </div>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                      placeholder="info@athangimpex.in"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <Phone size={13} className="text-slate-400" />
                        <span>Contact / WhatsApp Phone</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleFieldChange("phone", e.target.value)}
                      placeholder="+91 9923407176"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <MapPin size={13} className="text-slate-400" />
                        <span>Registered Office / Export Hub Address</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleFieldChange("address", e.target.value)}
                      placeholder="e.g. Navi Mumbai / Nashik, Maharashtra, India"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <Clock size={13} className="text-slate-400" />
                        <span>Primary Operational Timezone</span>
                      </div>
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => handleFieldChange("timezone", e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST - UTC+4:00)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="America/New_York">America/New_York (EST/EDT)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Products, Operations & FAQs */}
            {activeTab === "products" && (
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Export Products, Operations & FAQs
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    These parameters are automatically injected into the AI context for immediate, grounded replies to prospective buyers.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <Boxes size={14} className="text-slate-400" />
                      <span>Products & Key Export Specifications</span>
                    </div>
                  </label>
                  <textarea
                    rows={4}
                    value={formData.productsServices}
                    onChange={(e) => handleFieldChange("productsServices", e.target.value)}
                    placeholder="List key product grades, mesh sizes, moisture parameters, packaging..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Format line by line or numbered list for optimal AI comprehension.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <Clock size={13} className="text-slate-400" />
                        <span>Business Operating Hours</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={formData.businessHours}
                      onChange={(e) => handleFieldChange("businessHours", e.target.value)}
                      placeholder="e.g. Mon - Sat: 09:00 - 18:00 IST | 24/7 AI Bot"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <Languages size={13} className="text-slate-400" />
                        <span>Supported Languages</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={formData.supportedLanguages}
                      onChange={(e) => handleFieldChange("supportedLanguages", e.target.value)}
                      placeholder="e.g. English, Hindi, Marathi, Arabic"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <HelpCircle size={14} className="text-slate-400" />
                      <span>Frequently Asked Questions (FAQs & Answers)</span>
                    </div>
                  </label>
                  <textarea
                    rows={6}
                    value={formData.faq}
                    onChange={(e) => handleFieldChange("faq", e.target.value)}
                    placeholder="Q: What is MOQ?&#10;A: 1 FCL 20ft container...&#10;&#10;Q: Payment terms?&#10;A: 30% advance, balance against B/L..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Standard commercial queries (MOQ, lead times, packaging bags, payment terms, Incoterms).
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: AI Assistant Directives */}
            {activeTab === "ai" && (
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    AI Assistant Directives & Tone
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Controls how the AI assistant represents ATHANG IMPEX, qualifies export leads, and handles unknown queries.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <Sparkles size={14} className="text-emerald-500" />
                      <span>Primary System Instructions (AI Persona & Identity)</span>
                    </div>
                  </label>
                  <textarea
                    rows={6}
                    value={formData.systemInstructions}
                    onChange={(e) => handleFieldChange("systemInstructions", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <ShieldCheck size={14} className="text-amber-500" />
                      <span>Policy When Missing Information or Spot Freight Rates</span>
                    </div>
                  </label>
                  <textarea
                    rows={3}
                    value={formData.whenYouDontKnow}
                    onChange={(e) => handleFieldChange("whenYouDontKnow", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Strict instruction preventing hallucinations regarding custom CIF quotes or spot pricing.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Welcome Greeting Message
                    </label>
                    <textarea
                      rows={2}
                      value={formData.welcomeMessage}
                      onChange={(e) => handleFieldChange("welcomeMessage", e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Safe Fallback Message (Provider Outage)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.safeFailureMessage}
                      onChange={(e) => handleFieldChange("safeFailureMessage", e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Human Handoff Message
                    </label>
                    <textarea
                      rows={2}
                      value={formData.humanHandoffMessage}
                      onChange={(e) => handleFieldChange("humanHandoffMessage", e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Closing Farewell Message
                    </label>
                    <textarea
                      rows={2}
                      value={formData.closingMessage}
                      onChange={(e) => handleFieldChange("closingMessage", e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Version Change Log / Audit Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.versionNote || ""}
                    onChange={(e) => handleFieldChange("versionNote", e.target.value)}
                    placeholder="e.g. Updated dehydrated onion powder specifications and MOQ"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Recorded in version history whenever instructions or messages are modified.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Bottom Sticky Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400">
            All configurations apply directly to ATHANG IMPEX WhatsApp and Telegram integrations.
          </p>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty || saving}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
