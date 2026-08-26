"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, Download, RefreshCw, TrendingUp, UserCheck,
  CalendarClock, Target, Filter,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ManagerComparisonTable } from "./ManagerComparisonTable";

type CurrentUser = { id: string; name: string; role: Role; canViewAllLeads: boolean };

const PIE_COLORS    = ["#3B82F6", "#F59E0B", "#10B981"];
const SOURCE_COLORS = ["#6366F1", "#EC4899", "#14B8A6", "#F97316", "#8B5CF6", "#06B6D4"];
const PRIORITY_COLORS: Record<string, string> = { HIGH: "#EF4444", MEDIUM: "#F59E0B", LOW: "#10B981" };

const DATE_PRESETS = [
  { label: "Last 7 days",   value: "7d" },
  { label: "Last 30 days",  value: "30d" },
  { label: "Last 3 months", value: "3m" },
  { label: "Last 6 months", value: "6m" },
  { label: "This year",     value: "1y" },
  { label: "Custom",        value: "custom" },
];

function getPresetDates(preset: string): { start: string; end: string } {
  const now  = new Date();
  const end  = now.toISOString().split("T")[0];
  const from = new Date();
  if (preset === "7d")     from.setDate(now.getDate() - 7);
  else if (preset === "30d") from.setDate(now.getDate() - 30);
  else if (preset === "3m")  from.setMonth(now.getMonth() - 3);
  else if (preset === "6m")  from.setMonth(now.getMonth() - 6);
  else if (preset === "1y")  from.setFullYear(now.getFullYear() - 1);
  return { start: from.toISOString().split("T")[0], end };
}

function StatCard({ label, value, icon: Icon, color, border, sub }: any) {
  return (
    <div className={cn("crm-card border", border)}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function ReportsClient({ currentUser, managers }: { currentUser: CurrentUser; managers: any[] }) {
  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [exporting, setExporting] = useState(false);

  const isSuper = currentUser.role === Role.SUPER_ADMIN;

  // Filters
  const [reportType,    setReportType]    = useState<"summary" | "manager_comparison">("summary");
  const [managerId,     setManagerId]     = useState(isSuper ? "" : currentUser.id);
  const [datePreset,    setDatePreset]    = useState("30d");
  const [customStart,   setCustomStart]   = useState("");
  const [customEnd,     setCustomEnd]     = useState("");

  const getDateRange = () => {
    if (datePreset === "custom") return { startDate: customStart, endDate: customEnd };
    const { start, end } = getPresetDates(datePreset);
    return { startDate: start, endDate: end };
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({
        type: reportType,
        ...(managerId  && { managerId }),
        ...(startDate  && { startDate }),
        ...(endDate    && { endDate }),
      });
      const res  = await fetch(`/api/reports?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json.data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [reportType, managerId, datePreset, customStart, customEnd]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── Export PDF ────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const s   = data?.stats || {};
      const { startDate, endDate } = getDateRange();

      doc.setFontSize(20);
      doc.setTextColor(30, 64, 175);
      doc.text("GZFieldOne — Report", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 28);
      doc.text(`Period: ${startDate} to ${endDate}`, 14, 34);
      if (managerId) {
        const mgr = managers.find((m) => m.id === managerId);
        if (mgr) doc.text(`Manager: ${mgr.name}`, 14, 40);
      }

      doc.setFontSize(14);
      doc.setTextColor(30);
      doc.text("Summary", 14, 52);

      autoTable(doc, {
        startY: 56,
        head: [["Metric", "Value"]],
        body: [
          ["Total Customers",        String(s.totalLeads || 0)],
          ["Active Leads",       String(s.activeLeads || 0)],
          ["Converted Customers",  String(s.convertedCustomers || 0)],
          ["Conversion Rate",    `${s.conversionRate || 0}%`],
          ["Pending Follow-ups", String(s.pendingFollowUps || 0)],
          ["Completed Follow-ups", String(s.completedFollowUps || 0)],
          ["Overdue Follow-ups", String(s.overdueFollowUps || 0)],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 64, 175] },
      });

      if (reportType === "manager_comparison" && data?.managers) {
        const finalY = (doc as any).lastAutoTable?.finalY || 140;
        doc.setFontSize(14);
        doc.text("Manager Comparison", 14, finalY + 12);
        autoTable(doc, {
          startY: finalY + 16,
          head: [["Manager", "New Customers", "Customers", "Conv. Rate", "Pending", "Overdue"]],
          body: data.managers.map((m: any) => [
            m.managerName,
            m.totalLeads,
            m.convertedCustomers,
            `${m.conversionRate}%`,
            m.pendingFollowUps,
            m.overdueFollowUps,
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [30, 64, 175] },
        });
      }

      doc.save(`crm-report-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (e: any) {
      toast.error("Export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Export Excel ──────────────────────────────────────────────────────────
  const exportExcel = async () => {
    setExporting(true);
    try {
      const { utils, writeFile } = await import("xlsx");
      const s   = data?.stats || {};
      const wb  = utils.book_new();

      // Summary sheet
      const summaryData = [
        ["GZFieldOne Report"],
        ["Generated", new Date().toLocaleString("en-IN")],
        [],
        ["Metric", "Value"],
        ["Total Customers",          s.totalLeads || 0],
        ["Active Leads",         s.activeLeads || 0],
        ["Converted Customers",    s.convertedCustomers || 0],
        ["Conversion Rate",      `${s.conversionRate || 0}%`],
        ["Pending Follow-ups",   s.pendingFollowUps || 0],
        ["Completed Follow-ups", s.completedFollowUps || 0],
        ["Overdue Follow-ups",   s.overdueFollowUps || 0],
      ];
      utils.book_append_sheet(wb, utils.aoa_to_sheet(summaryData), "Summary");

      // Monthly data sheet
      if (data?.charts?.monthlyData?.length) {
        const monthlySheet = [
          ["Month", "Total Customers", "Converted", "Conversion Rate %"],
          ...data.charts.monthlyData.map((m: any) => [m.month, m.leads, m.converted, m.rate]),
        ];
        utils.book_append_sheet(wb, utils.aoa_to_sheet(monthlySheet), "Monthly Data");
      }

      // Manager comparison sheet
      if (reportType === "manager_comparison" && data?.managers) {
        const mgrSheet = [
          ["Manager", "Email", "Total Customers", "Converted", "Conv. Rate %", "Pending", "Completed", "Overdue"],
          ...data.managers.map((m: any) => [
            m.managerName, m.managerEmail, m.totalLeads, m.convertedCustomers,
            m.conversionRate, m.pendingFollowUps, m.completedFollowUps, m.overdueFollowUps,
          ]),
        ];
        utils.book_append_sheet(wb, utils.aoa_to_sheet(mgrSheet), "Managers");
      }

      writeFile(wb, `crm-report-${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Excel exported successfully!");
    } catch (e: any) {
      toast.error("Export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  const s = data?.stats || {};

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="page-title">Reports</h2>
          <p className="page-subtitle">Analytics and performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} disabled={exporting || !data}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50">
            <Download className="w-4 h-4 text-emerald-600" /> Excel
          </button>
          <button onClick={exportPDF} disabled={exporting || !data}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50">
            <Download className="w-4 h-4 text-red-500" /> PDF
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="crm-card p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />

          {/* Report type */}
          {isSuper && (
            <div className="flex items-center bg-gray-100 p-1 rounded-lg">
              {(["summary", "manager_comparison"] as const).map((t) => (
                <button key={t} onClick={() => setReportType(t)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                    reportType === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}>
                  {t === "summary" ? "Summary" : "Manager Comparison"}
                </button>
              ))}
            </div>
          )}

          {/* Manager filter */}
          {isSuper && reportType === "summary" && (
            <select value={managerId} onChange={(e) => setManagerId(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Managers</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}

          {/* Date preset */}
          <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {DATE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          {/* Custom date range */}
          {datePreset === "custom" && (
            <>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-gray-400 text-sm">to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </>
          )}

          <button onClick={fetchReport} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 ml-auto">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="crm-card h-28 skeleton" />)}
        </div>
      ) : !data ? null : (
        <>
          {/* ── Summary view ── */}
          {reportType === "summary" && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Customers"       value={s.totalLeads || 0}            icon={TrendingUp}    color="bg-blue-50 text-blue-600"     border="border-blue-100" />
                <StatCard label="Converted Customers" value={s.convertedCustomers || 0}      icon={UserCheck}     color="bg-emerald-50 text-emerald-600" border="border-emerald-100" sub={`${s.conversionRate || 0}% rate`} />
                <StatCard label="Pending Follow-ups" value={s.pendingFollowUps || 0} icon={Target} color="bg-purple-50 text-purple-600" border="border-purple-100" sub="Awaiting action" />
                <StatCard label="Follow-up Rate"    value={`${s.completedFollowUps || 0} done`} icon={CalendarClock} color="bg-amber-50 text-amber-600" border="border-amber-100" sub={`${s.overdueFollowUps || 0} overdue`} />
              </div>

              {/* Conversion funnel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                  { label: "New Customers",      value: s.totalLeads || 0,       pct: 100,                                                                           color: "bg-blue-500" },
                  { label: "Follow-ups", value: (s.totalLeads || 0) - (s.activeLeads || 0) + (s.convertedCustomers || 0), pct: s.totalLeads ? Math.round(((s.totalLeads - (s.activeLeads || 0)) / s.totalLeads) * 100) : 0, color: "bg-amber-500" },
                  { label: "Customers",    value: s.convertedCustomers || 0, pct: s.conversionRate || 0,                                                          color: "bg-emerald-500" },
                ].map((stage, i) => (
                  <div key={i} className="crm-card text-center">
                    <div className="text-3xl font-bold text-gray-900">{stage.value}</div>
                    <div className="text-sm text-gray-500 mt-1">{stage.label}</div>
                    <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", stage.color)}
                        style={{ width: `${stage.pct}%` }} />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{stage.pct}% of total</div>
                  </div>
                ))}
              </div>

              {/* Charts row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                {/* Monthly leads + conversions */}
                <div className="crm-card">
                  <h3 className="font-semibold text-gray-900 mb-4">Monthly Customers & Conversions</h3>
                  {data?.charts?.monthlyData?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={data.charts.monthlyData}>
                        <defs>
                          <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="newCustomers"     name="Total Customers"  stroke="#3B82F6" strokeWidth={2} fill="url(#leadsGrad)" />
                        <Area type="monotone" dataKey="converted" name="Converted"    stroke="#10B981" strokeWidth={2} fill="url(#convGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">No data</div>}
                </div>

                {/* Lead sources */}
                <div className="crm-card">
                  <h3 className="font-semibold text-gray-900 mb-4">Customers by Source</h3>
                  {data?.charts?.leadsBySource?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={data.charts.leadsBySource}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Bar dataKey="value" name="New Customers" radius={[4, 4, 0, 0]}>
                          {data.charts.leadsBySource.map((_: any, i: number) => (
                            <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">No data</div>}
                </div>
              </div>

              {/* Charts row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Pipeline donut */}
                <div className="crm-card">
                  <h3 className="font-semibold text-gray-900 mb-4">Pipeline Breakdown</h3>
                  {data?.charts?.leadsByStatus?.length > 0 ? (
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-full sm:w-[45%] shrink-0">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={data.charts.leadsByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                              {data.charts.leadsByStatus.map((_: any, i: number) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 w-full space-y-3">
                        {data.charts.leadsByStatus.map((d: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i] }} />
                              <span className="text-sm text-gray-600">{d.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-gray-900">{d.value}</span>
                              <span className="text-xs text-gray-400 ml-1">
                                ({s.totalLeads ? Math.round((d.value / s.totalLeads) * 100) : 0}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data</div>}
                </div>

                {/* Follow-up priority breakdown */}
                <div className="crm-card">
                  <h3 className="font-semibold text-gray-900 mb-4">Follow-ups by Priority</h3>
                  {data?.charts?.followUpsByPriority?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={data.charts.followUpsByPriority}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Bar dataKey="value" name="Follow-ups" radius={[4, 4, 0, 0]}>
                          {data.charts.followUpsByPriority.map((d: any) => (
                            <Cell key={d.name} fill={PRIORITY_COLORS[d.name] || "#6B7280"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data</div>}
                </div>
              </div>
            </>
          )}

          {/* ── Manager comparison view ── */}
          {reportType === "manager_comparison" && data?.managers && (
            <ManagerComparisonTable managers={data.managers} />
          )}
        </>
      )}
    </div>
  );
}