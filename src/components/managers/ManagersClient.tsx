"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, UserCheck, UserX, Key, Edit2,
  TrendingUp, Users, ShieldCheck, ShieldOff, MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, getInitials, cn } from "@/lib/utils";
import { CreateManagerModal } from "./CreateManagerModal";
import { EditManagerModal } from "./EditManagerModal";
import { ResetPasswordModal } from "./ResetPasswordModal";

type Manager = {
  id: string; name: string; email: string;
  phone?: string | null; whatsappNumber?: string | null;
  isActive: boolean; canViewAllLeads: boolean;
  createdAt: Date; convertedCustomers: number;
  pendingFollowUps: number; _count: { leads: number };
};

// ── Portal-based action menu ──────────────────────────────────────────────────
function ActionMenu({ manager, onEdit, onResetPassword, onToggleActive, onToggleLeads, loadingId }: {
  manager: Manager;
  onEdit: () => void;
  onResetPassword: () => void;
  onToggleActive: () => void;
  onToggleLeads: () => void;
  loadingId: string | null;
}) {
  const [open, setOpen]       = useState(false);
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const btnRef                = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const openMenu = () => {
    if (btnRef.current) {
      const rect  = btnRef.current.getBoundingClientRect();
      const menuW = 208;
      // flip left if too close to right edge
      const left  = rect.right - menuW < 8
        ? rect.left
        : rect.right - menuW;
      setPos({ top: rect.bottom + 4, left: Math.max(8, left) });
    }
    setOpen(true);
  };

  const items = [
    { label: "Edit details",   icon: <Edit2      className="w-4 h-4 text-gray-400" />, onClick: () => { onEdit();           setOpen(false); }, cls: "text-gray-700 hover:bg-gray-50" },
    { label: manager.canViewAllLeads ? "Restrict to own leads" : "Allow all leads",
      icon: manager.canViewAllLeads ? <ShieldOff className="w-4 h-4 text-gray-400" /> : <ShieldCheck className="w-4 h-4 text-gray-400" />,
      onClick: () => { onToggleLeads(); setOpen(false); }, cls: "text-gray-700 hover:bg-gray-50" },
    { label: "Reset password", icon: <Key        className="w-4 h-4 text-gray-400" />, onClick: () => { onResetPassword(); setOpen(false); }, cls: "text-gray-700 hover:bg-gray-50" },
    null,
    { label: manager.isActive ? "Deactivate" : "Activate",
      icon: manager.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />,
      onClick: () => { onToggleActive(); setOpen(false); },
      cls: manager.isActive ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50" },
  ];

  return (
    <>
      <button ref={btnRef} onClick={openMenu}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && mounted && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99990 }} />
          <div style={{
            position: "fixed",
            top:  pos.top,
            left: pos.left,
            zIndex: 99999,
            width: "13rem",
            background: "#fff",
            borderRadius: "0.75rem",
            boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
            border: "1px solid #f3f4f6",
            padding: "0.375rem 0",
            overflow: "hidden",
          }}>
            {items.map((item, i) =>
              item === null
                ? <div key={i} style={{ height: 1, background: "#f3f4f6", margin: "0.25rem 0" }} />
                : (
                  <button key={i} onClick={item.onClick}
                    disabled={loadingId === manager.id}
                    className={cn("flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors disabled:opacity-50", item.cls)}>
                    {item.icon}{item.label}
                  </button>
                )
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ManagersClient({ initialManagers }: { initialManagers: Manager[] }) {
  const [managers,     setManagers]     = useState<Manager[]>(initialManagers);
  const [search,       setSearch]       = useState("");
  const [showCreate,   setShowCreate]   = useState(false);
  const [editManager,  setEditManager]  = useState<Manager | null>(null);
  const [resetManager, setResetManager] = useState<Manager | null>(null);
  const [loadingId,    setLoadingId]    = useState<string | null>(null);

  const filtered = managers.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = managers.filter((m) => m.isActive).length;
  const totalLeads  = managers.reduce((acc, m) => acc + m._count.leads, 0);

  async function toggleActive(manager: Manager) {
    setLoadingId(manager.id);
    try {
      const res  = await fetch(`/api/managers/${manager.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !manager.isActive }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setManagers((prev) => prev.map((m) => m.id === manager.id ? { ...m, isActive: !m.isActive } : m));
      toast.success(`${manager.name} ${!manager.isActive ? "activated" : "deactivated"}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingId(null); }
  }

  async function toggleViewAllLeads(manager: Manager) {
    setLoadingId(manager.id);
    try {
      const res  = await fetch(`/api/managers/${manager.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ canViewAllLeads: !manager.canViewAllLeads }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setManagers((prev) => prev.map((m) => m.id === manager.id ? { ...m, canViewAllLeads: !m.canViewAllLeads } : m));
      toast.success(`Lead visibility updated for ${manager.name}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingId(null); }
  }

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="page-title">Managers</h2>
          <p className="page-subtitle">Create and manage all manager accounts</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Manager</span>
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Managers",      value: managers.length, icon: Users,     color: "bg-blue-50 text-blue-600" },
          { label: "Active Managers",     value: activeCount,     icon: UserCheck, color: "bg-emerald-50 text-emerald-600" },
          { label: "Total Leads Managed", value: totalLeads,      icon: TrendingUp, color: "bg-purple-50 text-purple-600" },
        ].map((stat) => (
          <div key={stat.label} className="crm-card flex items-center gap-4">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="crm-card p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search managers..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <span className="text-sm text-gray-400 ml-auto">{filtered.length} managers</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No managers found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search ? "Try a different search term" : "Click 'Add Manager' to create one"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Manager</th>
                  <th className="hide-mobile">Contact</th>
                  <th>Leads</th>
                  <th className="hide-mobile">Customers</th>
                  <th className="hide-tablet">Pending</th>
                  <th className="hide-tablet">Permissions</th>
                  <th>Status</th>
                  <th className="hide-tablet">Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((manager) => (
                  <tr key={manager.id} className={cn(!manager.isActive && "opacity-60")}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          manager.isActive ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600")}>
                          {getInitials(manager.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{manager.name}</p>
                          <p className="text-xs text-gray-400">{manager.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hide-mobile">
                      <p className="text-gray-700">{manager.phone || "—"}</p>
                      {manager.whatsappNumber && <p className="text-xs text-green-600">WA: {manager.whatsappNumber}</p>}
                    </td>
                    <td><span className="font-semibold text-gray-900">{manager._count.leads}</span></td>
                    <td className="hide-mobile"><span className="font-semibold text-emerald-600">{manager.convertedCustomers}</span></td>
                    <td className="hide-tablet">
                      <span className={cn("font-semibold", manager.pendingFollowUps > 0 ? "text-amber-600" : "text-gray-400")}>
                        {manager.pendingFollowUps}
                      </span>
                    </td>
                    <td className="hide-tablet">
                      <span className={cn("status-badge", manager.canViewAllLeads
                        ? "text-purple-700 bg-purple-50 border-purple-200"
                        : "text-gray-500 bg-gray-50 border-gray-200")}>
                        {manager.canViewAllLeads ? "All leads" : "Own leads"}
                      </span>
                    </td>
                    <td>
                      <span className={cn("status-badge", manager.isActive
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : "text-red-600 bg-red-50 border-red-200")}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", manager.isActive ? "bg-emerald-500" : "bg-red-400")} />
                        {manager.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="hide-tablet text-gray-500 text-xs">{formatDate(manager.createdAt)}</td>
                    <td>
                      <ActionMenu
                        manager={manager}
                        loadingId={loadingId}
                        onEdit={() => setEditManager(manager)}
                        onResetPassword={() => setResetManager(manager)}
                        onToggleActive={() => toggleActive(manager)}
                        onToggleLeads={() => toggleViewAllLeads(manager)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateManagerModal
          onClose={() => setShowCreate(false)}
          onCreated={(m) => setManagers((prev) => [m as any, ...prev])}
        />
      )}
      {editManager && (
        <EditManagerModal
          manager={editManager}
          onClose={() => setEditManager(null)}
          onUpdated={(u) => setManagers((prev) => prev.map((m) => m.id === u.id ? { ...m, ...u } : m))}
        />
      )}
      {resetManager && (
        <ResetPasswordModal manager={resetManager} onClose={() => setResetManager(null)} />
      )}
    </div>
  );
}