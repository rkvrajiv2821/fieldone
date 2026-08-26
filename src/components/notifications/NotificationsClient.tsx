"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, BellOff, CheckCheck, Trash2, RefreshCw,
  CalendarClock, TrendingUp, UserCheck, Info,
} from "lucide-react";
import { toast } from "sonner";
import { Role, NotificationType } from "@prisma/client";
import { cn, formatTimeAgo } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  readAt?: Date | null;
  refId?: string | null;
  refType?: string | null;
  createdAt: Date;
};

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  FOLLOW_UP_DUE:     { icon: <CalendarClock className="w-4 h-4" />, color: "text-amber-600",   bg: "bg-amber-50" },
  FOLLOW_UP_OVERDUE: { icon: <CalendarClock className="w-4 h-4" />, color: "text-red-600",     bg: "bg-red-50" },
  LEAD_ASSIGNED:     { icon: <TrendingUp    className="w-4 h-4" />, color: "text-blue-600",    bg: "bg-blue-50" },
  LEAD_CONVERTED:    { icon: <UserCheck     className="w-4 h-4" />, color: "text-emerald-600", bg: "bg-emerald-50" },
  SYSTEM:            { icon: <Info          className="w-4 h-4" />, color: "text-gray-600",    bg: "bg-gray-50" },
};

const FILTER_TABS = [
  { label: "All",       value: "all" },
  { label: "Unread",    value: "unread" },
  { label: "Follow-up", value: "FOLLOW_UP_DUE" },
  { label: "Leads",     value: "LEAD_ASSIGNED" },
  { label: "Customers", value: "LEAD_CONVERTED" },
];

// Safe fetch wrapper — never throws on non-JSON responses
async function safeFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(`Server error (${res.status}). Please try again.`);
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

export function NotificationsClient({ currentUser }: {
  currentUser: { id: string; name: string; role: Role };
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(activeFilter === "unread" && { unread: "true" }),
      });

      const data = await safeFetch(`/api/notifications?${params}`);

      // Client-side type filter
      let filtered: Notification[] = data.data;
      if (activeFilter !== "all" && activeFilter !== "unread") {
        filtered = filtered.filter((n) => n.type === activeFilter);
      }

      setNotifications(filtered);
      setTotal(data.total);
      setUnreadCount(data.unreadCount);
      setTotalPages(data.totalPages);
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => { setPage(1); }, [activeFilter]);

  // Poll every 30s
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    try {
      await safeFetch(`/api/notifications/${id}`, { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await safeFetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((t) => t - 1);
      toast.success("Notification deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const markAllRead = async () => {
    try {
      await safeFetch("/api/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Group by date label
  const grouped = notifications.reduce((acc: Record<string, Notification[]>, n) => {
    const d         = new Date(n.createdAt);
    const today     = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let key: string;
    if (d.toDateString() === today.toDateString())         key = "Today";
    else if (d.toDateString() === yesterday.toDateString()) key = "Yesterday";
    else key = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  return (
    <div className="animate-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="page-title">Notifications</h2>
          <p className="page-subtitle">
            {unreadCount > 0
              ? <span className="text-blue-600 font-semibold">{unreadCount} unread</span>
              : "All caught up!"}
            {" · "}{total} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchNotifications}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Unread banner */}
      {unreadCount > 0 && (
        <div className="flex items-center gap-3 p-4 mb-5 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">
              You have {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">Click a notification to mark it as read</p>
          </div>
          <button onClick={markAllRead}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors">
            Mark all read →
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
              activeFilter === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
            {tab.value === "unread" && unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-500 text-white rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="crm-card text-center py-10 border-red-100">
          <p className="text-red-500 font-medium mb-2">Failed to load notifications</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <button onClick={fetchNotifications}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg mx-auto transition-colors">
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        </div>
      )}

      {/* Loading */}
      {!error && loading && (
        <div className="py-16 text-center">
          <RefreshCw className="w-6 h-6 text-gray-300 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading notifications...</p>
        </div>
      )}

      {/* Empty state */}
      {!error && !loading && notifications.length === 0 && (
        <div className="crm-card text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BellOff className="w-8 h-8 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-600">No notifications</p>
          <p className="text-sm text-gray-400 mt-1">
            {activeFilter === "unread" ? "You're all caught up!" : "Nothing here yet"}
          </p>
        </div>
      )}

      {/* Notification list */}
      {!error && !loading && notifications.length > 0 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="space-y-2">
                {items.map((n) => {
                  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.SYSTEM;
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markRead(n.id)}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-xl border transition-all group",
                        n.isRead
                          ? "bg-white border-gray-100 hover:bg-gray-50 cursor-default"
                          : "bg-blue-50/40 border-blue-100 hover:bg-blue-50 cursor-pointer"
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                        config.bg, config.color
                      )}>
                        {config.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm leading-snug",
                            n.isRead ? "font-medium text-gray-700" : "font-bold text-gray-900"
                          )}>
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1.5">{formatTimeAgo(n.createdAt)}</p>
                      </div>

                      {/* Delete on hover */}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              Previous
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}