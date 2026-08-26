"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Upload, Download, Filter, RefreshCw, Pencil, Trash2, TrendingUp, Building2, Ban } from "lucide-react";
import { toast } from "sonner";
import { Role, LeadStatus } from "@prisma/client";
import { cn, formatDate, statusConfig } from "@/lib/utils";
import Image from "next/image";
import { CreateLeadModal } from "./CreateLeadModal";
import { EditLeadModal } from "./EditLeadModal";
import { ImportLeadsModal } from "./ImportLeadsModal";
import { DeleteLeadDialog } from "./DeleteLeadDialog";

type Lead = {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  company?: string | null;
  source?: string | null;
  status: LeadStatus;
  ownerName?: string | null;
  ownerPhoto?: string | null;
  managerName?: string | null;
  managerPhoto?: string | null;
  companyImage?: string | null;
  address?: string | null;
  isBlocked?: boolean;
  assignedTo: { id: string; name: string; email: string };
  createdAt: Date;
  _count: { followUps: number };
};

type User = { id: string; role: Role; canViewAllLeads: boolean };
type Manager = { id: string; name: string; email: string };

const STATUS_TABS: { label: string; value: LeadStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "New Customer", value: "LEAD" },
  { label: "Follow-up", value: "FOLLOW_UP" },
  { label: "Customer", value: "CLIENT" },
];

export function LeadsClient({ currentUser, managers }: { currentUser: User; managers: Manager[] }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "ALL">("ALL");
  const [managerFilter, setManagerFilter] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search && { search }),
        ...(statusFilter !== "ALL" && { status: statusFilter }),
        ...(managerFilter && { managerId: managerFilter }),
      });
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLeads(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, managerFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Debounce search
  useEffect(() => { setPage(1); }, [search, statusFilter, managerFilter]);

  const handleDeleteConfirm = async () => {
    if (!deleteLead) return;
    try {
      const res = await fetch(`/api/leads/${deleteLead.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete customer");
      toast.success(`${deleteLead.name} deleted`);
      setDeleteLead(null);
      fetchLeads();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const isSuperAdmin = currentUser.role === Role.SUPER_ADMIN;

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="page-title">Customer</h2>
          <p className="page-subtitle">{total} total customers in the system</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open("/api/leads/sample-csv", "_blank")}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" /> Sample CSV
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add New Customer
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              "px-4 py-1.5 text-sm font-semibold rounded-lg transition-all",
              statusFilter === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="crm-card p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, email, phone, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {(isSuperAdmin || currentUser.canViewAllLeads) && (
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
            >
              <option value="">All Managers</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={fetchLeads}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <span className="text-sm text-gray-400 ml-auto">{total} customers</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-6 h-6 text-gray-300 animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading customers...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No customers found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search ? "Try a different search" : "Click 'Add New Customer' to create your first one"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th className="hide-mobile">Company</th>
                  <th className="hide-tablet">Address</th>
                  <th className="hide-tablet">Source</th>
                  <th>Status</th>
                  {(isSuperAdmin || currentUser.canViewAllLeads) && <th className="hide-mobile">Assigned To</th>}
                  <th className="hide-tablet">Follow-ups</th>
                  <th className="hide-tablet">Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {/* Owner photo */}
                        {lead.ownerPhoto ? (
                          <Image src={lead.ownerPhoto} alt={lead.ownerName || lead.name}
                            width={32} height={32}
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                            {lead.name.slice(0,2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{lead.name}</p>
                          {lead.ownerName && <p className="text-xs text-gray-400">Owner: {lead.ownerName}</p>}
                          {lead.email && !lead.ownerName && <p className="text-xs text-gray-400">{lead.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="text-gray-700">{lead.phone}</td>
                    <td className="hide-mobile">
                      <div className="flex items-center gap-2">
                        {lead.companyImage ? (
                          <Image src={lead.companyImage} alt={lead.company || "Company"}
                            width={28} height={28}
                            className="w-7 h-7 rounded-lg object-cover shrink-0 border border-gray-100" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                        )}
                        <span className="text-gray-700 text-sm">{lead.company || "—"}</span>
                      </div>
                    </td>
                    <td className="hide-tablet">
                      {lead.address
                        ? <span className="text-xs text-gray-500 line-clamp-1">{lead.address}</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="hide-tablet">
                      {lead.source ? (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                          {lead.source}
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn("status-badge", statusConfig[lead.status]?.color)}>
                          {statusConfig[lead.status]?.label}
                        </span>
                        {lead.isBlocked && (
                          <span className="status-badge text-red-700 bg-red-50 border-red-200">
                            <Ban className="w-3 h-3" /> Blocked
                          </span>
                        )}
                      </div>
                    </td>
                    {(isSuperAdmin || currentUser.canViewAllLeads) && (
                      <td className="hide-mobile">
                        <p className="text-gray-700 text-sm">{lead.assignedTo.name}</p>
                      </td>
                    )}
                    <td className="hide-tablet">
                      <span className={cn(
                        "font-semibold text-sm",
                        lead._count.followUps > 0 ? "text-blue-600" : "text-gray-400"
                      )}>
                        {lead._count.followUps}
                      </span>
                    </td>
                    <td className="hide-tablet text-gray-500 text-xs">{formatDate(lead.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditLead(lead)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit customer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteLead(lead)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateLeadModal
          managers={managers}
          currentUser={currentUser}
          onClose={() => setShowCreate(false)}
          onCreated={() => { fetchLeads(); setShowCreate(false); }}
        />
      )}
      {editLead && (
        <EditLeadModal
          lead={editLead}
          managers={managers}
          currentUser={currentUser}
          onClose={() => setEditLead(null)}
          onUpdated={() => { fetchLeads(); setEditLead(null); }}
        />
      )}
      {showImport && (
        <ImportLeadsModal
          managers={managers}
          currentUser={currentUser}
          onClose={() => setShowImport(false)}
          onImported={() => { fetchLeads(); setShowImport(false); }}
        />
      )}
      {deleteLead && (
        <DeleteLeadDialog
          lead={deleteLead}
          onClose={() => setDeleteLead(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}