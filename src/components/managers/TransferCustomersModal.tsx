"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, ArrowRightLeft, ShieldAlert, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Counts = { customers: number; converted: number; openFollowUps: number; completedFollowUps: number };
type Customer = { id: string; name: string; company?: string | null; phone: string; status: string; openFollowUps: number };
export type TransferResult = {
  from: { id: string; name: string }; to: { id: string; name: string };
  customers: number; converted: number; openFollowUps: number; remainingCustomers: number;
  selected: boolean; deactivated: boolean;
};

const STATUS_LABEL: Record<string, string> = { LEAD: "New Customer", FOLLOW_UP: "Follow-up", CLIENT: "Customer" };

export function TransferCustomersModal({ manager, managers, deactivateMode, onClose, onTransferred, onDeactivateOnly }: {
  manager: { id: string; name: string };
  managers: { id: string; name: string; email: string; isActive: boolean }[];
  deactivateMode: boolean;
  onClose: () => void;
  onTransferred: (result: TransferResult) => void;
  onDeactivateOnly: () => void;
}) {
  const [mode, setMode]             = useState<"all" | "choose">("all");
  const [counts, setCounts]         = useState<Counts | null>(null);
  const [customers, setCustomers]   = useState<Customer[] | null>(null);
  const [picked, setPicked]         = useState<Set<string>>(new Set());
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toId, setToId]             = useState("");
  const [deactivate, setDeactivate] = useState(deactivateMode);
  const [isLoading, setIsLoading]   = useState(false);
  const [mounted, setMounted]       = useState(false);

  const targets = managers.filter((m) => m.isActive && m.id !== manager.id);
  const target  = targets.find((m) => m.id === toId);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    fetch(`/api/managers/${manager.id}/transfer`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setCounts(d.data); else toast.error(d.error || "Could not load counts"); })
      .catch(() => toast.error("Could not load counts"));
  }, [manager.id]);

  // Load the customer list the first time "Choose customers" is opened
  useEffect(() => {
    if (mode !== "choose" || customers) return;
    fetch(`/api/managers/${manager.id}/customers`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setCustomers(d.data); else toast.error(d.error || "Could not load customers"); })
      .catch(() => toast.error("Could not load customers"));
  }, [mode, customers, manager.id]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (customers ?? []).filter((c) =>
      (!statusFilter || c.status === statusFilter) &&
      (!q || c.name?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.phone.includes(q))
    );
  }, [customers, search, statusFilter]);

  const allVisiblePicked = visible.length > 0 && visible.every((c) => picked.has(c.id));
  const pickedCustomers  = (customers ?? []).filter((c) => picked.has(c.id));
  const pickedFollowUps  = pickedCustomers.reduce((n, c) => n + c.openFollowUps, 0);
  const movingAll        = mode === "all" || (customers != null && picked.size === customers.length);
  const moveCount        = mode === "all" ? (counts?.customers ?? 0) : picked.size;

  function toggle(id: string) {
    setPicked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAllVisible() {
    setPicked((prev) => {
      const n = new Set(prev);
      if (allVisiblePicked) visible.forEach((c) => n.delete(c.id)); else visible.forEach((c) => n.add(c.id));
      return n;
    });
  }

  async function submit() {
    if (!toId) return toast.error("Choose a manager to transfer to");
    if (mode === "choose" && picked.size === 0) return toast.error("Select at least one customer");
    setIsLoading(true);
    try {
      const res  = await fetch(`/api/managers/${manager.id}/transfer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toManagerId: toId,
          deactivate: deactivate && movingAll,
          ...(mode === "choose" && { leadIds: Array.from(picked) }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.data.customers} customer${data.data.customers === 1 ? "" : "s"} moved from ${manager.name} to ${data.data.to.name}`);
      onTransferred(data.data);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div onClick={isLoading ? undefined : onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "36rem", maxHeight: "calc(100dvh - 2rem)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>Transfer customers</h2>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>From {manager.name}</p>
          </div>
          <button type="button" onClick={onClose} disabled={isLoading}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4" style={{ overflowY: "auto", flex: 1 }}>
          {/* Mode */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg">
            {([["all", "All customers"], ["choose", "Choose customers"]] as const).map(([m, label]) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={cn("py-2 text-sm font-semibold rounded-md transition-colors",
                  mode === m ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                {label}
              </button>
            ))}
          </div>

          {/* What will move */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Customers",       value: counts?.customers },
              { label: "Converted",       value: counts?.converted },
              { label: "Open follow-ups", value: counts?.openFollowUps },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-xl py-3">
                <p className="text-xl font-bold text-gray-900">{counts ? s.value : "…"}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {mode === "all" ? (
            <p className="text-xs text-gray-500">
              Every customer (new, follow-up and converted) and all pending/overdue follow-ups move to the new manager.
              Customer details and history are not changed. Completed follow-ups stay with {manager.name} as a record of who did the work.
            </p>
          ) : (
            <div>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, company or phone"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2">
                  <option value="">All statuses</option>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <label className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={allVisiblePicked} onChange={toggleAllVisible} disabled={!visible.length} />
                  Select all {search || statusFilter ? "shown" : ""} ({visible.length})
                  <span className="ml-auto text-xs text-blue-600 font-semibold">{picked.size} selected</span>
                </label>
                <div style={{ maxHeight: "16rem", overflowY: "auto" }}>
                  {customers === null ? (
                    <p className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading customers…</p>
                  ) : visible.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">No customers match</p>
                  ) : visible.map((c) => (
                    <label key={c.id} className="flex items-start gap-2.5 px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-blue-50/40 cursor-pointer">
                      <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} className="mt-1" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-gray-900 truncate">{c.company || c.name}</span>
                        <span className="block text-xs text-gray-500 truncate">{c.company ? `${c.name} · ` : ""}{c.phone}</span>
                      </span>
                      <span className="text-xs text-gray-500 shrink-0">{STATUS_LABEL[c.status] ?? c.status}{c.openFollowUps > 0 && ` · ${c.openFollowUps} open`}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Selected customers move with their pending/overdue follow-ups. Details and history are not changed. Customers you don't select stay with {manager.name}.
              </p>
            </div>
          )}

          <div>
            <label className="form-label">Transfer to</label>
            <select value={toId} onChange={(e) => setToId(e.target.value)} className="form-input">
              <option value="">Select a manager…</option>
              {targets.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
            </select>
            {targets.length === 0 && <p className="form-error">No other active managers. Activate or create one first.</p>}
          </div>

          <label className={cn("flex items-start gap-2.5 text-sm cursor-pointer", movingAll ? "text-gray-700" : "text-gray-300")}>
            <input type="checkbox" checked={deactivate && movingAll} disabled={!movingAll} onChange={(e) => setDeactivate(e.target.checked)} className="mt-0.5" />
            <span>
              Deactivate {manager.name} after the transfer (they will no longer be able to log in)
              {!movingAll && " — only available when every customer is being moved"}
            </span>
          </label>

          {target && moveCount > 0 && (
            <div className="flex gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                {moveCount} customer{moveCount === 1 ? "" : "s"}
                {mode === "choose" ? ` (${pickedFollowUps} open follow-up${pickedFollowUps === 1 ? "" : "s"})` : ""} will be moved to {target.name}. {target.name} will be notified.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-gray-100" style={{ flexShrink: 0 }}>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={isLoading}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={isLoading || !toId || !counts || (mode === "choose" && picked.size === 0)}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Transferring...</>
                : <><ArrowRightLeft className="w-4 h-4" /> {mode === "choose" ? `Transfer ${picked.size} selected` : "Transfer all"}</>}
            </button>
          </div>
          {deactivateMode && (
            <button type="button" onClick={() => { onDeactivateOnly(); onClose(); }} disabled={isLoading}
              className="w-full mt-3 text-xs text-gray-400 hover:text-red-600 underline">
              Deactivate without transferring
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
