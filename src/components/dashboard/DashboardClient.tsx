"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp, UserCheck, CalendarClock, AlertCircle,
  ArrowUpRight, ArrowDownRight, Clock, Phone,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Role } from "@prisma/client";
import { cn, formatTime, formatDate, statusConfig } from "@/lib/utils";
import Link from "next/link";

type CurrentUser = { id: string; name: string; role: Role; canViewAllLeads: boolean };

const PIE_COLORS = ["#3B82F6", "#F59E0B", "#10B981"];
const SOURCE_COLORS = ["#6366F1", "#EC4899", "#14B8A6", "#F97316", "#8B5CF6", "#06B6D4"];

function StatCard({ label, value, sub, icon: Icon, color, border, change }: any) {
  const isPositive = change >= 0;
  return (
    <div className={cn("crm-card border", border)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", color)}>
          <Icon className="w-5 h-5" />
        </div>
        {change !== undefined && (
          <span className={cn(
            "flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
            isPositive ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
          )}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function DashboardClient({ currentUser }: { currentUser: CurrentUser }) {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="animate-in">
        <div className="mb-6">
          <div className="h-8 w-64 skeleton mb-2" />
          <div className="h-4 w-48 skeleton" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="crm-card h-32 skeleton" />)}
        </div>
      </div>
    );
  }

  const s = data?.stats || {};
  const changes = s.changes || {};
  const isSuperAdmin = currentUser.role === Role.SUPER_ADMIN || currentUser.canViewAllLeads;

  const statCards = [
    { label: "Total Leads",       value: s.totalLeads || 0,       icon: TrendingUp,   color: "bg-blue-50 text-blue-600",     border: "border-blue-100",    change: changes.leads,    sub: "All time" },
    { label: "Pending Follow-ups", value: s.pendingFollowUps || 0, icon: CalendarClock, color: "bg-amber-50 text-amber-600",   border: "border-amber-100",   change: changes.followUps, sub: `${s.todayFollowUps || 0} today` },
    { label: "Converted Customers", value: s.convertedCustomers || 0, icon: UserCheck,    color: "bg-emerald-50 text-emerald-600", border: "border-emerald-100", change: changes.clients,  sub: "Pipeline customers" },
    { label: "Overdue Follow-ups", value: s.overdueCount || 0, icon: AlertCircle, color: "bg-red-50 text-red-600", border: "border-red-100", sub: "Needs attention" },
  ];

  const leadsByStatus = (data?.charts?.leadsByStatus || []).map((d: any) => ({
    ...d,
    name: d.name === "LEAD" ? "New Customer" : d.name === "FOLLOW_UP" ? "Follow-up" : "Customer",
  }));

  return (
    <div className="animate-in">
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="page-title">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},&nbsp;
          {currentUser.name.split(" ")[0]}! 👋
        </h2>
        <p className="page-subtitle">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Overdue alert */}
      {s.overdueCount > 0 && (
        <Link href="/follow-ups?status=OVERDUE">
          <div className="flex items-center gap-3 p-3.5 mb-5 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors cursor-pointer">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              You have <strong>{s.overdueCount}</strong> overdue follow-up{s.overdueCount > 1 ? "s" : ""}. Take action now →
            </p>
          </div>
        </Link>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Monthly leads area chart */}
        <div className="lg:col-span-2 crm-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Leads Over Time</h3>
            <span className="text-xs text-gray-400">Last 6 months</span>
          </div>
          {data?.charts?.monthlyLeads?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.charts.monthlyLeads}>
                <defs>
                  <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                <Area type="monotone" dataKey="newCustomers" stroke="#3B82F6" strokeWidth={2} fill="url(#leadGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>

        {/* Pipeline donut */}
        <div className="crm-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Pipeline</h3>
          </div>
          {leadsByStatus.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={leadsByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {leadsByStatus.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {leadsByStatus.map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-xs text-gray-600">{d.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Source bar chart + tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Lead sources bar */}
        <div className="crm-card">
          <h3 className="font-semibold text-gray-900 mb-4">Leads by Source</h3>
          {data?.charts?.leadsBySource?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.charts.leadsBySource} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} width={70} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.charts.leadsBySource.map((_: any, i: number) => (
                    <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>

        {/* Recent leads */}
        <div className="crm-card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Leads</h3>
            <Link href="/leads" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(data?.recentLeads || []).length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No leads this month</p>
            ) : (data?.recentLeads || []).map((lead: any) => (
              <div key={lead.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {lead.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
                  <p className="text-xs text-gray-400 truncate">{lead.company || lead.email || "—"}</p>
                </div>
                <span className={cn("status-badge text-xs shrink-0", statusConfig[lead.status as keyof typeof statusConfig]?.color)}>
                  {statusConfig[lead.status as keyof typeof statusConfig]?.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's follow-ups */}
        <div className="crm-card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Today&apos;s Follow-ups</h3>
            <Link href="/follow-ups" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50 max-h-[360px] overflow-y-auto">
            {(data?.upcomingFollowUps || []).length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No follow-ups today 🎉</p>
            ) : (data?.upcomingFollowUps || []).map((fu: any) => {
              const isOverdue = fu.status === "OVERDUE";
              return (
                <div key={fu.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    isOverdue ? "bg-red-100" : "bg-amber-100"
                  )}>
                    {isOverdue
                      ? <AlertCircle className="w-4 h-4 text-red-600" />
                      : <Clock className="w-4 h-4 text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{fu.lead.name}</p>
                    <p className={cn("text-xs", isOverdue ? "text-red-500 font-medium" : "text-gray-400")}>
                      {isOverdue ? "Overdue — " : ""}{formatTime(fu.scheduledAt)}
                    </p>
                    {isSuperAdmin && (
                      <p className="text-xs text-gray-400 truncate">→ {fu.assignedTo?.name}</p>
                    )}
                  </div>
                  <a href={`tel:${fu.lead.phone}`}
                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shrink-0">
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}