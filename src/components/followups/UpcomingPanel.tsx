"use client";

import { useState, useEffect } from "react";
import { CalendarClock, Plus, Phone, Clock } from "lucide-react";
import { Role } from "@prisma/client";
import { cn, formatTime, formatDate, priorityConfig } from "@/lib/utils";

export function UpcomingPanel({ currentUser, onSchedule, refreshKey }: {
  currentUser: { id: string; role: Role; canViewAllLeads: boolean };
  onSchedule: () => void;
  refreshKey?: number;
}) {
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [todayFollowUps, setTodayFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"today" | "upcoming">("today");

  useEffect(() => {
    async function load() {
      try {
        // Today's follow-ups — any status, scheduled today
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

        const [todayRes, upcomingRes] = await Promise.all([
          fetch(`/api/follow-ups?startDate=${startOfDay}&endDate=${endOfDay}&limit=20`),
          fetch("/api/follow-ups?upcoming=true&limit=15"),
        ]);
        const [todayData, upcomingData] = await Promise.all([todayRes.json(), upcomingRes.json()]);

        // Filter today client-side (reliable)
        const todayList = (upcomingData.data || []).filter((fu: any) => {
          const d = new Date(fu.scheduledAt);
          return d.toDateString() === today.toDateString();
        });

        setTodayFollowUps(todayList);
        setUpcoming(upcomingData.data || []);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [refreshKey]);

  // Group upcoming by date (exclude today)
  const today = new Date();
  const futureFollowUps = upcoming.filter(
    (fu) => new Date(fu.scheduledAt).toDateString() !== today.toDateString()
  );

  const grouped = futureFollowUps.reduce((acc: Record<string, any[]>, fu) => {
    const date = formatDate(fu.scheduledAt);
    if (!acc[date]) acc[date] = [];
    acc[date].push(fu);
    return acc;
  }, {});

  const renderItem = (fu: any) => {
    const priority = priorityConfig[fu.priority as "HIGH" | "MEDIUM" | "LOW"];
    return (
      <div key={fu.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-start gap-2.5">
          <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", priority.dot)} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{fu.lead.name}</p>
            {fu.lead.company && (
              <p className="text-xs text-gray-400 truncate">{fu.lead.company}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {formatTime(fu.scheduledAt)}
              </span>
              {fu.contactMethod && (
                <span className="text-xs text-blue-600 font-medium">{fu.contactMethod}</span>
              )}
            </div>
          </div>
          <a
            href={`tel:${fu.lead.phone}`}
            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shrink-0"
            title={`Call ${fu.lead.phone}`}
          >
            <Phone className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="crm-card p-0 overflow-hidden sticky top-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Follow-up Schedule</h3>
        </div>
        <button
          onClick={onSchedule}
          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
          title="Schedule new"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab("today")}
          className={cn(
            "flex-1 py-2.5 text-xs font-semibold transition-colors relative",
            activeTab === "today"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Today
          {todayFollowUps.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full font-bold">
              {todayFollowUps.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("upcoming")}
          className={cn(
            "flex-1 py-2.5 text-xs font-semibold transition-colors",
            activeTab === "upcoming"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Upcoming
          {futureFollowUps.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded-full font-bold">
              {futureFollowUps.length}
            </span>
          )}
        </button>
      </div>

      <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : activeTab === "today" ? (
          todayFollowUps.length === 0 ? (
            <div className="py-10 text-center">
              <CalendarClock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No follow-ups today</p>
              <button onClick={onSchedule}
                className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium">
                + Schedule one
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              <div className="px-4 py-2 bg-blue-50">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  Today — {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              {todayFollowUps.map(renderItem)}
            </div>
          )
        ) : (
          futureFollowUps.length === 0 ? (
            <div className="py-10 text-center">
              <CalendarClock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No upcoming follow-ups</p>
              <button onClick={onSchedule}
                className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium">
                + Schedule one
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {Object.entries(grouped).map(([date, items]) => (
                <div key={date}>
                  <div className="px-4 py-2 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{date}</p>
                  </div>
                  {items.map(renderItem)}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}