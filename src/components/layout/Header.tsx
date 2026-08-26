"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CheckCheck, X } from "lucide-react";
import { Role, NotificationType } from "@prisma/client";
import { cn, formatTimeAgo } from "@/lib/utils";
import { createPortal } from "react-dom";

interface HeaderUser { id: string; name: string; email: string; role: Role; }
type Notification = {
  id: string; title: string; message: string;
  type: NotificationType; isRead: boolean; createdAt: Date;
};

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard":            { title: "Dashboard",     subtitle: "Overview of your leads and follow-ups" },
  "/super-admin":          { title: "Overview",      subtitle: "System-wide performance metrics" },
  "/super-admin/managers": { title: "Managers",      subtitle: "Manage admin accounts" },
  "/super-admin/blocked-numbers": { title: "Blocked Numbers", subtitle: "Phone numbers blocked from new customers" },
  "/leads":                { title: "Customer",      subtitle: "Manage and track all your customers" },
  "/follow-ups":           { title: "Follow-ups",    subtitle: "Schedule and track customer follow-ups" },
  "/clients":              { title: "Customer History", subtitle: "Full timeline for every customer" },
  "/reports":              { title: "Reports",       subtitle: "Analytics and performance reports" },
  "/notifications":        { title: "Notifications", subtitle: "Your alerts and reminders" },
  "/products":             { title: "Products",       subtitle: "Manage your product catalogue" },
  "/settings":             { title: "Settings",      subtitle: "Account and system preferences" },
};

const TYPE_EMOJI: Record<string, string> = {
  FOLLOW_UP_DUE: "📅", FOLLOW_UP_OVERDUE: "⚠️",
  LEAD_ASSIGNED: "📋", LEAD_CONVERTED: "🎉", SYSTEM: "ℹ️",
};

export function Header({ user }: { user: HeaderUser }) {
  const pathname  = usePathname();
  const bellRef   = useRef<HTMLButtonElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropPos,      setDropPos]      = useState({ top: 0, right: 0 });
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const pageInfo = Object.entries(pageTitles).find(([key]) =>
    pathname === key || (key !== "/" && pathname.startsWith(key))
  )?.[1] || { title: "GZFieldOne", subtitle: "" };

  const fetchNotifications = async () => {
    try {
      const res  = await fetch("/api/notifications?limit=8");
      const data = await res.json();
      if (data.success) { setNotifications(data.data); setUnreadCount(data.unreadCount); }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const i = setInterval(fetchNotifications, 30000);
    return () => clearInterval(i);
  }, [pathname]);

  const openDropdown = () => {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setShowDropdown(true);
  };

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between pl-16 lg:pl-6 pr-4 md:pr-6 shrink-0 shadow-sm">
      {/* Left: Page title */}
      <div className="min-w-0">
        <h1 className="text-sm md:text-base font-semibold text-gray-900 truncate">{pageInfo.title}</h1>
        {pageInfo.subtitle && (
          <p className="text-xs text-gray-500 mt-0.5 hidden sm:block truncate">{pageInfo.subtitle}</p>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn(
          "px-2 py-1 rounded-full text-[11px] font-semibold hidden sm:inline-flex",
          user.role === Role.SUPER_ADMIN ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
        )}>
          {user.role === Role.SUPER_ADMIN ? "Super Admin" : "Manager"}
        </span>
        <button ref={bellRef} onClick={showDropdown ? () => setShowDropdown(false) : openDropdown}
          className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification dropdown */}
      {showDropdown && mounted && createPortal(
        <>
          <div onClick={() => setShowDropdown(false)} style={{ position: "fixed", inset: 0, zIndex: 99990 }} />
          <div style={{
            position: "fixed",
            top: dropPos.top,
            right: Math.max(8, dropPos.right),
            zIndex: 99999,
            width: "min(22rem, calc(100vw - 16px))",
            background: "#fff",
            borderRadius: "0.875rem",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            border: "1px solid #f3f4f6",
            overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1rem", borderBottom: "1px solid #f3f4f6" }}>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-600" />
                <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-blue-500 text-white rounded-full font-bold">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <CheckCheck className="w-3.5 h-3.5" /> All read
                  </button>
                )}
                <button onClick={() => setShowDropdown(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div style={{ maxHeight: "22rem", overflowY: "auto" }}>
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No notifications yet</p>
                </div>
              ) : notifications.map((n) => (
                <div key={n.id} onClick={() => !n.isRead && markRead(n.id)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-0",
                    n.isRead ? "hover:bg-gray-50" : "bg-blue-50/50 hover:bg-blue-50"
                  )}>
                  <span className="text-base shrink-0 mt-0.5">{TYPE_EMOJI[n.type] || "ℹ️"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs leading-snug", n.isRead ? "text-gray-600" : "font-semibold text-gray-900")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-gray-300 mt-1">{formatTimeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0 mt-2" />}
                </div>
              ))}
            </div>
            <div style={{ padding: "0.625rem 1rem", borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
              <Link href="/notifications" onClick={() => setShowDropdown(false)}
                className="block text-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                View all notifications →
              </Link>
            </div>
          </div>
        </>,
        document.body
      )}
    </header>
  );
}