"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  MessageSquare,
  Search,
  Filter,
  Send,
  UserCheck,
  Bot,
  User,
  Shield,
  Clock,
  BookOpen,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [replyError, setReplyError] = useState("");

  const loadConversations = () => {
    let url = `/api/conversations?`;
    if (searchQuery) url += `q=${encodeURIComponent(searchQuery)}&`;
    if (selectedStatus) url += `status=${encodeURIComponent(selectedStatus)}&`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.conversations) {
          setConversations(d.conversations);
          if (!selectedConvId && d.conversations.length > 0) {
            setSelectedConvId(d.conversations[0].id);
          }
        }
      })
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    loadConversations();
  }, [searchQuery, selectedStatus]);

  const loadActiveConversation = () => {
    if (!selectedConvId) return;
    fetch(`/api/conversations/${selectedConvId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.conversation) setActiveConv(d.conversation);
      });
  };

  useEffect(() => {
    loadActiveConversation();
  }, [selectedConvId]);

  const handleToggleTakeover = async () => {
    if (!activeConv) return;
    const nextState = !activeConv.isHumanTakeover;
    try {
      await fetch(`/api/conversations/${activeConv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHumanTakeover: nextState }),
      });
      loadActiveConversation();
      loadConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!activeConv) return;
    try {
      await fetch(`/api/conversations/${activeConv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      loadActiveConversation();
      loadConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendManualReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConv) return;
    setSendingReply(true);
    setReplyError("");

    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReplyText("");
      loadActiveConversation();
      loadConversations();
    } catch (err: any) {
      setReplyError(err.message || "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Conversations & Human Takeover Inbox
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time multi-channel customer communications with AI provider diagnostics and agent takeover mode.
          </p>
        </div>

        <div className="flex-1 flex border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          {/* Left Column: Conversations List */}
          <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
            {/* Search and filters */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search chats, contacts, messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 text-[11px]">
                <span className="text-slate-400">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs"
                >
                  <option value="">All</option>
                  <option value="OPEN">Open</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="ESCALATED">Escalated</option>
                </select>
              </div>
            </div>

            {/* Conversation Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {conversations.map((c) => {
                const isSelected = c.id === selectedConvId;
                const lastMsg = c.messages?.[0];

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConvId(c.id)}
                    className={`w-full text-left p-3.5 transition-colors flex flex-col space-y-1.5 ${
                      isSelected
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-l-2 border-emerald-500"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {c.contact?.displayName || c.channelIdentifier}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {c.channelType === "WHATSAPP" ? "WA" : "TG"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(c.lastMessageAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {lastMsg ? lastMsg.content : "No messages"}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {c.business?.name}
                      </span>
                      {c.isHumanTakeover ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                          Human Takeover
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          AI Auto
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Chat Thread & Inspector */}
          {activeConv ? (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                      {activeConv.contact?.displayName || activeConv.channelIdentifier}
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-800">
                      {activeConv.channelIdentifier}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Business: <span className="text-slate-300 font-semibold">{activeConv.business?.name}</span> &bull; Channel: {activeConv.channelType}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleToggleTakeover}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activeConv.isHumanTakeover
                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <UserCheck size={14} />
                    <span>{activeConv.isHumanTakeover ? "Resume AI Replies" : "Take Over (Human Mode)"}</span>
                  </button>

                  <select
                    value={activeConv.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium"
                  >
                    <option value="OPEN">Open</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="ESCALATED">Escalated</option>
                  </select>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {activeConv.messages?.map((msg: any) => {
                  const isCustomer = msg.senderType === "CUSTOMER";
                  const isAi = msg.senderType === "AI";
                  const isAgent = msg.senderType === "AGENT";

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? "items-start" : "items-end"}`}
                    >
                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mb-1 px-1">
                        {isCustomer ? (
                          <>
                            <User size={12} />
                            <span>Customer</span>
                          </>
                        ) : isAi ? (
                          <>
                            <Bot size={12} className="text-emerald-500" />
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              AI ({msg.aiProviderUsed || "Auto"} - {msg.modelUsed || "Default"})
                            </span>
                            {msg.latencyMs && <span>&bull; {msg.latencyMs}ms</span>}
                          </>
                        ) : (
                          <>
                            <UserCheck size={12} className="text-sky-500" />
                            <span className="font-semibold text-sky-500">Human Agent</span>
                          </>
                        )}
                        <span>&bull; {new Date(msg.createdAt).toLocaleTimeString()}</span>
                      </div>

                      <div
                        className={`max-w-xl p-3.5 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed shadow-sm ${
                          isCustomer
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-sm"
                            : isAi
                            ? "bg-emerald-600 text-white rounded-tr-sm"
                            : "bg-sky-600 text-white rounded-tr-sm"
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Display source grounding references if present */}
                      {msg.sourceReferences && msg.sourceReferences !== "[]" && (
                        <div className="mt-1 px-1 flex items-center space-x-1 text-[10px] text-slate-400">
                          <BookOpen size={10} className="text-emerald-500" />
                          <span>Grounded in approved business knowledge base</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reply Input Bar */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                {replyError && (
                  <div className="mb-2 p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                    <AlertCircle size={14} />
                    <span>{replyError}</span>
                  </div>
                )}

                <form onSubmit={handleSendManualReply} className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      activeConv.isHumanTakeover
                        ? "Type a manual reply to the customer (Human Takeover mode active)..."
                        : "Type a reply (sending here will automatically activate Human Takeover)..."
                    }
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Send size={13} />
                    <span>{sendingReply ? "Sending..." : "Send"}</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Select a conversation from the left to view messages and manage replies.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
