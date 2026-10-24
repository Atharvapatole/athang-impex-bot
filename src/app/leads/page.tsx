"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Target,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  Building2,
  Globe,
  Package,
} from "lucide-react";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/businesses")
      .then((r) => r.json())
      .then((d) => {
        if (d.businesses) setBusinesses(d.businesses);
      });
  }, []);

  const loadLeads = () => {
    setLoading(true);
    let url = `/api/leads?`;
    if (selectedBusinessId) url += `businessId=${selectedBusinessId}&`;
    if (selectedStatus) url += `status=${selectedStatus}&`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.leads) setLeads(d.leads);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLeads();
  }, [selectedBusinessId, selectedStatus]);

  const handleStatusChange = async (leadId: string, status: string) => {
    try {
      await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, status }),
      });
      loadLeads();
    } catch (e) {
      alert("Failed to update status");
    }
  };

  const handleExportCsv = () => {
    const url = selectedBusinessId ? `/api/leads/export?businessId=${selectedBusinessId}` : "/api/leads/export";
    window.location.href = url;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Captured Enquiries & Leads
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Qualified international buyers, RFQs, and product enquiries for ATHANG IMPEX.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Scope: ATHANG IMPEX
            </span>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="CONTACTED">Contacted</option>
              <option value="CLOSED">Closed</option>
            </select>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Leads Cards */}
        <div className="grid grid-cols-1 gap-4">
          {leads.map((lead) => {
            const isAthang = lead.business?.name?.includes("ATHANG");

            return (
              <div
                key={lead.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {lead.buyerName || lead.company || lead.emailOrPhone || "Inquiry"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {lead.business?.name}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className="px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs font-semibold"
                    >
                      <option value="NEW">NEW</option>
                      <option value="QUALIFIED">QUALIFIED</option>
                      <option value="CONTACTED">CONTACTED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                </div>

                {isAthang ? (
                  /* ATHANG IMPEX Export Lead Fields */
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Product of Interest</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {lead.productOfInterest || "Unspecified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Target Quantity</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {lead.quantityAndUnit || "Unspecified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Destination Port / Country</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {lead.destinationPort || lead.country || "Unspecified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Packaging Preference</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {lead.packagingPreference || "Standard Export Bags"}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* BENZWELL Support Lead Fields */
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Support Topic</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {lead.supportTopic || "General Support"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Order Reference</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {lead.orderReference || "None"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Contact Info</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {lead.emailOrPhone || "Via Chat"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <span>Contact: {lead.emailOrPhone || "Direct Channel Message"}</span>
                  <span>Captured on {new Date(lead.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
