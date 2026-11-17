"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, RefreshCw, CalendarClock, CheckCircle2,
  Clock, AlertCircle, Filter, Search, X,
} from "lucide-react";
import { toast } from "sonner";
import { Role, FollowUpStatus } from "@prisma/client";
import { cn, priorityConfig } from "@/lib/utils";
import { ScheduleFollowUpModal } from "./ScheduleFollowUpModal";
import { FollowUpCard } from "./FollowUpCard";
import { UpcomingPanel } from "./UpcomingPanel";

type FollowUp = {
  id: string;
  scheduledAt: Date;
  notes?: string | null;
  status: FollowUpStatus;
  priority: "HIGH" | "MEDIUM" | "LOW";
  contactMethod?: string | null;
  purpose?: string | null;
  completedAt?: Date | null;
  completionNote?: string | null;
  liveLocation?: string | null;
  lead: { id: string; name: string; email?: string | null; company?: string | null; phone: string; status: string };
  assignedTo: { id: string; name: string };
};

type CurrentUser = { id: string; role: Role; canViewAllLeads: boolean };

const STATUS_TABS = [
  { label: "All",       value: "ALL",                    icon: Filter },
  { label: "Pending",   value: FollowUpStatus.PENDING,   icon: Clock },
  { label: "Overdue",   value: FollowUpStatus.OVERDUE,   icon: AlertCircle },
  { label: "Completed", value: FollowUpStatus.COMPLETED, icon: CheckCircle2 },
];

const PRIORITY_OPTIONS = [
  { label: "All Priorities", value: "" },
  { label: "High",           value: "HIGH" },
  { label: "Medium",         value: "MEDIUM" },
  { label: "Low",            value: "LOW" },
];

const DATE_OPTIONS = [
  { label: "All Dates",  value: "" },
  { label: "Today",      value: "today" },
  { label: "Tomorrow",   value: "tomorrow" },
  { label: "This Week",  value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "Overdue",    value: "overdue" },
];

function getDateRange(filter: string): { start?: string; end?: string } {
  const now = new Date();
  const startOfDay  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay    = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  if (filter === "today") return { start: startOfDay.toISOString(), end: endOfDay.toISOString() };
  if (filter === "tomorrow") {
    const t = new Date(startOfDay); t.setDate(t.getDate() + 1);
    const te = new Date(endOfDay);  te.setDate(te.getDate() + 1);
    return { start: t.toISOString(), end: te.toISOString() };
  }
  if (filter === "this_week") {
    const end = new Date(startOfDay); end.setDate(end.getDate() + 7);
    return { start: startOfDay.toISOString(), end: end.toISOString() };
  }
  if (filter === "this_month") {
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start: startOfDay.toISOString(), end: end.toISOString() };
  }
  if (filter === "overdue") {
    return { end: startOfDay.toISOString() };
  }
  return {};
}

export function FollowUpsClient({ currentUser, managers, leads }: {
  currentUser: CurrentUser;
  managers: any[];
  leads: any[];
}) {
  const [followUps, setFollowUps]   = useState<FollowUp[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);

  const [statusFilter,   setStatusFilter]   = useState<FollowUpStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [dateFilter,     setDateFilter]     = useState("");
  const [managerFilter,  setManagerFilter]  = useState("");
  const [search,         setSearch]         = useState("");
  const [showSchedule,   setShowSchedule]   = useState(false);
  const [editFollowUp,   setEditFollowUp]   = useState<FollowUp | null>(null);
  const [panelRefreshKey, setPanelRefreshKey] = useState(0);

  const refreshPanel = () => setPanelRefreshKey((k) => k + 1);

  const isSuperAdmin = currentUser.role === Role.SUPER_ADMIN || currentUser.canViewAllLeads;

  const activeFiltersCount = [priorityFilter, dateFilter, managerFilter, search].filter(Boolean).length;

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(statusFilter !== "ALL" && { status: statusFilter }),
        ...(managerFilter && { managerId: managerFilter }),
      });

      const res = await fetch(`/api/follow-ups?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Client-side filters: search, priority, date
      let filtered: FollowUp[] = data.data;

      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter((f) =>
          f.lead.name.toLowerCase().includes(s) ||
          f.lead.company?.toLowerCase().includes(s) ||
          f.lead.phone.includes(s)
        );
      }

      if (priorityFilter) {
        filtered = filtered.filter((f) => f.priority === priorityFilter);
      }

      if (dateFilter) {
        const { start, end } = getDateRange(dateFilter);
        filtered = filtered.filter((f) => {
          const d = new Date(f.scheduledAt);
          if (start && d < new Date(start)) return false;
          if (end   && d > new Date(end))   return false;
          return true;
        });
      }

      setFollowUps(filtered);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, managerFilter, search, priorityFilter, dateFilter]);

  useEffect(() => { fetchFollowUps(); }, [fetchFollowUps]);
  useEffect(() => { setPage(1); }, [statusFilter, managerFilter, search, priorityFilter, dateFilter]);

  const [counts, setCounts] = useState({ pending: 0, overdue: 0, completed: 0 });
  useEffect(() => {
    async function loadCounts() {
      try {
        const [p, o, c] = await Promise.all([
          fetch("/api/follow-ups?status=PENDING&limit=1").then((r) => r.json()),
          fetch("/api/follow-ups?status=OVERDUE&limit=1").then((r) => r.json()),
          fetch("/api/follow-ups?status=COMPLETED&limit=1").then((r) => r.json()),
        ]);
        setCounts({ pending: p.total, overdue: o.total, completed: c.total });
      } catch {}
    }
    loadCounts();
  }, [followUps]);

  const handleStatusChange = async (id: string, status: FollowUpStatus, completionNote?: string, liveLocation?: string) => {
    try {
      const res = await fetch(`/api/follow-ups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(completionNote && { completionNote }), ...(liveLocation && { liveLocation }) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(status === FollowUpStatus.COMPLETED ? "Marked as completed!" : "Status updated");
      fetchFollowUps();
      refreshPanel();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/follow-ups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Follow-up deleted");
      fetchFollowUps();
      refreshPanel();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const clearAllFilters = () => {
    setPriorityFilter("");
    setDateFilter("");
    setManagerFilter("");
    setSearch("");
  };

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="page-title">Follow-ups</h2>
          <p className="page-subtitle">Schedule and track all new customer follow-ups</p>
        </div>
        <button
          onClick={() => setShowSchedule(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Schedule Follow-up
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Pending",   value: counts.pending,   icon: Clock,        color: "bg-amber-50 text-amber-600",   border: "border-amber-100",   onClick: () => setStatusFilter(FollowUpStatus.PENDING) },
          { label: "Overdue",   value: counts.overdue,   icon: AlertCircle,  color: "bg-red-50 text-red-600",       border: "border-red-100",     onClick: () => setStatusFilter(FollowUpStatus.OVERDUE) },
          { label: "Completed", value: counts.completed, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600", border: "border-emerald-100", onClick: () => setStatusFilter(FollowUpStatus.COMPLETED) },
        ].map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className={cn("crm-card flex items-center gap-4 border text-left hover:shadow-md transition-shadow cursor-pointer", s.border)}
          >
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main list */}
        <div className="xl:col-span-2">
          {/* Status tabs */}
          <div className="flex items-center gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value as any)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all",
                  statusFilter === tab.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.value === FollowUpStatus.OVERDUE && counts.overdue > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full font-bold">
                    {counts.overdue}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Filter bar ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 space-y-2.5">
            {/* Row 1: search + refresh */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  placeholder="Search new customer name, company, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button onClick={fetchFollowUps}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Row 2: date + priority + manager filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Date filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={cn(
                  "px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors",
                  dateFilter ? "border-blue-400 text-blue-700 bg-blue-50" : "border-gray-200 text-gray-600"
                )}
              >
                {DATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              {/* Priority filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={cn(
                  "px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors",
                  priorityFilter ? "border-blue-400 text-blue-700 bg-blue-50" : "border-gray-200 text-gray-600"
                )}
              >
                {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              {/* Manager filter (super admin only) */}
              {isSuperAdmin && (
                <select
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                  className={cn(
                    "px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors",
                    managerFilter ? "border-blue-400 text-blue-700 bg-blue-50" : "border-gray-200 text-gray-600"
                  )}
                >
                  <option value="">All Managers</option>
                  {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}

              {/* Clear filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                >
                  <X className="w-3 h-3" /> Clear {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""}
                </button>
              )}

              <span className="ml-auto text-sm text-gray-400">{followUps.length} results</span>
            </div>

            {/* Active filter chips */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {dateFilter && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
                    {DATE_OPTIONS.find(o => o.value === dateFilter)?.label}
                    <button onClick={() => setDateFilter("")} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {priorityFilter && (
                  <span className={cn("flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium border", priorityConfig[priorityFilter as "HIGH"|"MEDIUM"|"LOW"].color)}>
                    {priorityFilter.charAt(0) + priorityFilter.slice(1).toLowerCase()} priority
                    <button onClick={() => setPriorityFilter("")} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {managerFilter && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                    {managers.find(m => m.id === managerFilter)?.name}
                    <button onClick={() => setManagerFilter("")} className="hover:text-purple-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {search && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full font-medium">
                    &ldquo;{search}&rdquo;
                    <button onClick={() => setSearch("")} className="hover:text-gray-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Cards list */}
          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-6 h-6 text-gray-300 animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading follow-ups...</p>
            </div>
          ) : followUps.length === 0 ? (
            <div className="crm-card text-center py-12">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CalendarClock className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No follow-ups found</p>
              <p className="text-gray-400 text-sm mt-1">
                {activeFiltersCount > 0 ? "Try clearing some filters" : "Click 'Schedule Follow-up' to create one"}
              </p>
              {activeFiltersCount > 0 && (
                <button onClick={clearAllFilters}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {followUps.map((fu) => (
                <FollowUpCard
                  key={fu.id}
                  followUp={fu}
                  isSuperAdmin={isSuperAdmin}
                  onStatusChange={handleStatusChange}
                  onEdit={() => setEditFollowUp(fu)}
                  onDelete={() => handleDelete(fu.id)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
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

        {/* Upcoming sidebar */}
        <div className="xl:col-span-1">
          <UpcomingPanel currentUser={currentUser} onSchedule={() => setShowSchedule(true)} refreshKey={panelRefreshKey} />
        </div>
      </div>

      {/* Modals */}
      {showSchedule && (
        <ScheduleFollowUpModal
          leads={leads}
          currentUser={currentUser}
          onClose={() => setShowSchedule(false)}
          onCreated={() => { fetchFollowUps(); refreshPanel(); setShowSchedule(false); }}
        />
      )}
      {editFollowUp && (
        <ScheduleFollowUpModal
          leads={leads}
          currentUser={currentUser}
          editData={editFollowUp}
          onClose={() => setEditFollowUp(null)}
          onCreated={() => { fetchFollowUps(); refreshPanel(); setEditFollowUp(null); }}
        />
      )}
    </div>
  );
}