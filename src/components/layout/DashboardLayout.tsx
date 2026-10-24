"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Share2,
  Bot,
  BookOpen,
  FileText,
  MessageSquare,
  Users,
  Target,
  BarChart3,
  ScrollText,
  Settings,
  ShieldCheck,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Business Profile", href: "/businesses", icon: Building2 },
  { label: "Channels", href: "/channels", icon: Share2 },
  { label: "AI Providers", href: "/ai-providers", icon: Bot },
  { label: "Knowledge Base", href: "/knowledge-base", icon: BookOpen },
  { label: "Instructions", href: "/instructions", icon: FileText },
  { label: "Conversations", href: "/conversations", icon: MessageSquare },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Leads", href: "/leads", icon: Target },
  { label: "Usage & Metrics", href: "/usage", icon: BarChart3 },
  { label: "Logs & Health", href: "/logs", icon: ScrollText },
  { label: "Platform Settings", href: "/settings", icon: Settings },
  { label: "Security", href: "/settings/security", icon: ShieldCheck },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string }>({
    name: "Platform Owner",
    email: "admin@platform.local",
    role: "OWNER",
  });

  useEffect(() => {
    // Fetch current user or use default owner without login redirect
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {
        // Direct access fallback
      });
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <span className="font-semibold text-sm tracking-tight">ATHANG IMPEX</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? "block" : "hidden"
        } md:block w-full md:w-64 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 flex flex-col shrink-0 md:sticky md:top-0 md:h-screen z-20`}
      >
        {/* Brand */}
        <div className="hidden md:flex items-center space-x-3 px-6 py-5 border-b border-slate-200 dark:border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white leading-tight">
              ATHANG IMPEX
            </h1>
            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              AI Chatbot Management
            </p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold border-l-2 border-emerald-500 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon size={16} className={isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                {currentUser?.name?.charAt(0) || "A"}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">
                  {currentUser?.name || "Platform Owner"}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
                  Direct Access &bull; {currentUser?.role || "OWNER"}
                </div>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0"
              title="Toggle theme"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
