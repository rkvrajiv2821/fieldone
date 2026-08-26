"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, History, Building2, Phone, Mail, CalendarClock, Ban } from "lucide-react";
import { toast } from "sonner";
import { Role, LeadStatus } from "@prisma/client";
import { cn, formatDate, statusConfig } from "@/lib/utils";
import { CustomerHistoryModal } from "./CustomerHistoryModal";

type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  company?: string | null;
  status: LeadStatus;
  isBlocked?: boolean;
  createdAt: Date;
  assignedTo: { id: string; name: string };
  _count: { followUps: number };
};

const STATUS_TABS: { label: string; value: LeadStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "New Customer", value: "LEAD" },
  { label: "Follow-up", value: "FOLLOW_UP" },
  { label: "Customer", value: "CLIENT" },
];

export function CustomerHistoryClient({ currentUser, managers }: {
  currentUser: { id: string; role: Role; canViewAllLeads: boolean };
  managers: { id: string; name: string; email: string }[];
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "ALL">("ALL");
  const [managerFilter, setManagerFilter] = useState("");
  const [historyId, setHistoryId] = useState<string | null>(null);

  const isSuperAdmin = currentUser.role === Role.SUPER_ADMIN || currentUser.canViewAllLeads;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: "20",
        ...(search && { search }),
        ...(statusFilter !== "ALL" && { status: statusFilter }),
        ...(managerFilter && { managerId: managerFilter }),
      });
      const res  = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCustomers(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, managerFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [search, statusFilter, managerFilter]);

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="page-title">Customer History</h2>
          <p className="page-subtitle">{total} customers — full timeline for each</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              "px-4 py-1.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap",
              statusFilter === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="crm-card p-0 overflow-hidden">
        {/* Filters */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Search name, email, phone, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {isSuperAdmin && (
            <select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Managers</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <button onClick={fetchCustomers}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="ml-auto text-sm text-gray-400">{total} customers</span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-6 h-6 text-gray-300 animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <History className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No customers found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search ? "Try a different search" : "Customers you add will show up here"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="hide-mobile">Contact</th>
                  <th className="hide-mobile">Company</th>
                  <th>Status</th>
                  <th className="hide-tablet">Follow-ups</th>
                  {isSuperAdmin && <th className="hide-mobile">Manager</th>}
                  <th className="hide-tablet">Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{c.name}</p>
                          {c.email && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />{c.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="hide-mobile">
                      <p className="flex items-center gap-1 text-gray-700 text-sm">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />{c.phone}
                      </p>
                    </td>

                    <td className="hide-mobile">
                      {c.company ? (
                        <p className="flex items-center gap-1 text-gray-700">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />{c.company}
                        </p>
                      ) : "—"}
                    </td>

                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn("status-badge", statusConfig[c.status]?.color)}>
                          {statusConfig[c.status]?.label}
                        </span>
                        {c.isBlocked && (
                          <span className="status-badge text-red-700 bg-red-50 border-red-200">
                            <Ban className="w-3 h-3" /> Blocked
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="hide-tablet">
                      <span className={cn(
                        "font-semibold text-sm",
                        c._count.followUps > 0 ? "text-blue-600" : "text-gray-400"
                      )}>
                        {c._count.followUps}
                      </span>
                    </td>

                    {isSuperAdmin && (
                      <td className="hide-mobile text-gray-600 text-sm">{c.assignedTo.name}</td>
                    )}

                    <td className="hide-tablet">
                      <p className="flex items-center gap-1 text-gray-500 text-xs">
                        <CalendarClock className="w-3 h-3" />{formatDate(c.createdAt)}
                      </p>
                    </td>

                    <td>
                      <button
                        onClick={() => setHistoryId(c.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
                        title="View history"
                      >
                        <History className="w-3.5 h-3.5" /> View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
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

      {historyId && (
        <CustomerHistoryModal leadId={historyId} onClose={() => setHistoryId(null)} />
      )}
    </div>
  );
}
