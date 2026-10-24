"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Users, Phone, MessageSquare, Target, Search } from "lucide-react";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/businesses")
      .then((r) => r.json())
      .then((d) => {
        if (d.businesses) setBusinesses(d.businesses);
      });
  }, []);

  const loadContacts = () => {
    setLoading(true);
    const url = selectedBusinessId ? `/api/contacts?businessId=${selectedBusinessId}` : "/api/contacts";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.contacts) setContacts(d.contacts);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadContacts();
  }, [selectedBusinessId]);

  const filtered = contacts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.identifier.toLowerCase().includes(q) ||
      (c.displayName && c.displayName.toLowerCase().includes(q))
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Customer Contacts
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Directory of international buyers and customer profiles mapped across WhatsApp and Telegram.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Scope: ATHANG IMPEX
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search contact name, phone, identifier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
          />
        </div>

        {/* Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-500 font-semibold">
                <th className="p-4">Contact</th>
                <th className="p-4">Channel</th>
                <th className="p-4">Business</th>
                <th className="p-4">Conversations</th>
                <th className="p-4">Leads</th>
                <th className="p-4">First Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {c.displayName || c.identifier}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">{c.identifier}</div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {c.channelType}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {c.business?.name}
                    </span>
                  </td>
                  <td className="p-4 font-semibold">{c._count?.conversations ?? 0}</td>
                  <td className="p-4 font-semibold">{c._count?.leads ?? 0}</td>
                  <td className="p-4 text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
