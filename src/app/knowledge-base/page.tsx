"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  BookOpen,
  Plus,
  Trash2,
  Search,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

export default function KnowledgeBasePage() {
  const [sources, setSources] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Ingestion form state
  const [pdfUrl, setPdfUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [ingestBusinessId, setIngestBusinessId] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Search simulator state
  const [testQuery, setTestQuery] = useState("What is the particle size and mesh of onion powder?");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/businesses").then((r) => r.json()),
      fetch(selectedBusinessId ? `/api/knowledge-base?businessId=${selectedBusinessId}` : "/api/knowledge-base").then((r) => r.json()),
    ])
      .then(([bizData, kbData]) => {
        if (bizData.businesses) {
          setBusinesses(bizData.businesses);
          if (!ingestBusinessId && bizData.businesses.length > 0) {
            setIngestBusinessId(bizData.businesses[0].id);
          }
        }
        if (kbData.sources) setSources(kbData.sources);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [selectedBusinessId]);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngesting(true);
    setIngestStatus(null);

    try {
      const res = await fetch("/api/knowledge-base/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: ingestBusinessId,
          pdfUrl,
          sourceName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setIngestStatus({
        type: "success",
        msg: `Successfully extracted and indexed ${data.data?.chunkCount} chunks (${data.data?.pageCount} pages)!`,
      });
      setPdfUrl("");
      setSourceName("");
      loadData();
    } catch (err: any) {
      setIngestStatus({
        type: "error",
        msg: err.message || "Failed to ingest PDF",
      });
    } finally {
      setIngesting(false);
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (!confirm("Are you sure you want to remove this PDF source and all indexed chunks?")) return;
    try {
      await fetch(`/api/knowledge-base?sourceId=${sourceId}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      alert("Failed to delete source");
    }
  };

  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBizId = selectedBusinessId || businesses[0]?.id;
    if (!targetBizId) return;

    setSearching(true);
    try {
      const res = await fetch("/api/knowledge-base/test-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: targetBizId, query: testQuery }),
      });
      const data = await res.json();
      if (data.results) setSearchResults(data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Knowledge Base Management
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Ingest hosted product PDFs with SSRF protection, text extraction, and lexical indexing.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Scope: ATHANG IMPEX
            </span>
          </div>
        </div>

        {/* PDF Ingestion Card */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Plus className="text-emerald-500" size={18} />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Ingest Hosted PDF Document
            </h2>
          </div>

          {ingestStatus && (
            <div
              className={`mt-4 p-3 rounded-lg text-xs flex items-center space-x-2 ${
                ingestStatus.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400"
              }`}
            >
              {ingestStatus.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{ingestStatus.msg}</span>
            </div>
          )}

          <form onSubmit={handleIngest} className="mt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Business
                </label>
                <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
                  ATHANG IMPEX
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hosted PDF URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/catalog.pdf"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Label / Source Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Export Catalog 2026"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 gap-3">
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                <ShieldAlert size={14} className="text-emerald-500 shrink-0" />
                <span>
                  Protected by SSRF guard: Localhost, private IPs (RFC 1918), and cloud metadata are blocked.
                </span>
              </div>

              <button
                type="submit"
                disabled={ingesting}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition-colors disabled:opacity-50"
              >
                {ingesting ? (
                  <span>Processing & Indexing...</span>
                ) : (
                  <>
                    <BookOpen size={14} />
                    <span>Fetch and Process PDF</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Ingested Sources */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Ingested Sources & Indexed Chunks
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {sources.map((s) => (
              <div
                key={s.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{s.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {s.business?.name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {s.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono truncate max-w-xl">{s.sourceUrl}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {s._count?.chunks || s.chunkCount} chunks &bull; {s.pageCount} pages &bull;{" "}
                    {(s.fileSizeBytes / 1024).toFixed(0)} KB &bull; Last synced:{" "}
                    {s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleDateString() : "Never"}
                  </p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    title="Delete source and chunks"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Retrieval Simulator Box */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Search className="text-emerald-500" size={18} />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Grounding & Retrieval Simulator
            </h2>
          </div>

          <form onSubmit={handleTestSearch} className="flex gap-2 text-xs">
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Ask a question to test retrieval matching..."
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {searching ? "Searching..." : "Simulate Search"}
            </button>
          </form>

          {searchResults && (
            <div className="mt-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-400">
                Retrieved Chunks ({searchResults.length} matched):
              </h3>
              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-500">No matching chunks found above relevance threshold.</p>
              ) : (
                searchResults.map((r, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {r.sourceName} {r.pageNumber ? `(Page ${r.pageNumber})` : ""}
                      </span>
                      <span className="font-mono">Relevance Score: {r.score.toFixed(1)}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{r.content}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
