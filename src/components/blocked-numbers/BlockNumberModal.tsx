"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Search, FileText, Ban, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { normalizePhone } from "@/lib/phone";

type Customer = { id: string; name: string; phone: string; company?: string | null };

export function BlockNumberModal({ customers, blockedPhones, onClose, onCreated }: {
  customers: Customer[];
  blockedPhones: Set<string>;
  onClose: () => void;
  onCreated: (blocked: any) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [query, setQuery]         = useState("");
  const [open, setOpen]           = useState(false);
  const [selected, setSelected]   = useState<Customer | null>(null);
  const [reason, setReason]       = useState("");
  const [error, setError]         = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableCustomers = customers.filter((c) => !blockedPhones.has(normalizePhone(c.phone)));

  const q = query.trim().toLowerCase();
  const filtered = (q
    ? availableCustomers.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.company?.toLowerCase().includes(q)
      )
    : availableCustomers
  ).slice(0, 50);

  const handleSelect = (customer: Customer) => {
    setSelected(customer);
    setError("");
    setOpen(false);
    setQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setError("Select a customer to block");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/blocked-numbers", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone: selected.phone, reason }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to block number");
      toast.success(`${selected.name} (${selected.phone}) is now blocked`);
      onCreated(result.data);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)" }} />

      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "26rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>Block a Number</h2>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>Choose a customer to block their phone number</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="form-label">Customer <span className="text-red-500">*</span></label>

            {selected ? (
              <div className="flex items-center justify-between gap-3 p-3 border-2 border-red-200 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {selected.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{selected.name}</p>
                    <p className="text-xs text-gray-500">{selected.phone}{selected.company ? ` — ${selected.company}` : ""}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setSelected(null)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700 shrink-0">
                  Change
                </button>
              </div>
            ) : (
              <div ref={containerRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder="Search customer by name or phone..."
                    autoComplete="off"
                    className={cn("form-input pl-10", error && "border-red-400")}
                  />
                </div>

                {open && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <div className="max-h-56 overflow-y-auto py-1">
                      {filtered.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-gray-400 text-center">No customers found</p>
                      ) : (
                        filtered.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelect(c)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50"
                          >
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                              <p className="text-xs text-gray-400 truncate">
                                {c.phone}{c.company ? ` — ${c.company}` : ""}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {error && <p className="form-error">{error}</p>}
          </div>

          <div>
            <label className="form-label">Reason (optional)</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                placeholder="Why is this number being blocked..."
                className="form-input pl-10 resize-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Blocking...</> : <><Ban className="w-4 h-4" /> Block Number</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
