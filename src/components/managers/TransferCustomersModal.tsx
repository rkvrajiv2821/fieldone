"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, ArrowRightLeft, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type Counts = { customers: number; converted: number; openFollowUps: number; completedFollowUps: number };
export type TransferResult = {
  from: { id: string; name: string }; to: { id: string; name: string };
  customers: number; openFollowUps: number; deactivated: boolean;
};

export function TransferCustomersModal({ manager, managers, deactivateMode, onClose, onTransferred, onDeactivateOnly }: {
  manager: { id: string; name: string };
  managers: { id: string; name: string; email: string; isActive: boolean }[];
  deactivateMode: boolean;
  onClose: () => void;
  onTransferred: (result: TransferResult) => void;
  onDeactivateOnly: () => void;
}) {
  const [counts, setCounts]         = useState<Counts | null>(null);
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

  async function submit() {
    if (!toId) return toast.error("Choose a manager to transfer to");
    setIsLoading(true);
    try {
      const res  = await fetch(`/api/managers/${manager.id}/transfer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toManagerId: toId, deactivate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.data.customers} customers moved from ${manager.name} to ${data.data.to.name}`);
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
      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "30rem", maxHeight: "calc(100dvh - 2rem)", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>Transfer customers</h2>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>From {manager.name}</p>
          </div>
          <button type="button" onClick={onClose} disabled={isLoading}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* What will move */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Customers",     value: counts?.customers },
              { label: "Converted",     value: counts?.converted },
              { label: "Open follow-ups", value: counts?.openFollowUps },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-xl py-3">
                <p className="text-xl font-bold text-gray-900">{counts ? s.value : "…"}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            All customers (new, follow-up and converted) and all pending/overdue follow-ups move to the new manager.
            Customer details and history are not changed. Completed follow-ups stay with {manager.name} as a record of who did the work.
          </p>

          <div>
            <label className="form-label">Transfer to</label>
            <select value={toId} onChange={(e) => setToId(e.target.value)} className="form-input">
              <option value="">Select a manager…</option>
              {targets.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
            </select>
            {targets.length === 0 && <p className="form-error">No other active managers. Activate or create one first.</p>}
          </div>

          <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={deactivate} onChange={(e) => setDeactivate(e.target.checked)} className="mt-0.5" />
            <span>Deactivate {manager.name} after the transfer (they will no longer be able to log in)</span>
          </label>

          {target && (
            <div className="flex gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                {counts?.customers ?? 0} customers will be moved to {target.name}. {target.name} will be notified.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={isLoading}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={isLoading || !toId || !counts}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Transferring...</> : <><ArrowRightLeft className="w-4 h-4" /> Transfer</>}
            </button>
          </div>

          {deactivateMode && (
            <button type="button" onClick={() => { onDeactivateOnly(); onClose(); }} disabled={isLoading}
              className="w-full text-xs text-gray-400 hover:text-red-600 underline">
              Deactivate without transferring
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
