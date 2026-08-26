"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ShieldCheck, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn, getInitials } from "@/lib/utils";

type Permission = "VIEW_ONLY" | "CREATE" | "EDIT" | "FULL_ACCESS";

const PERMISSIONS: { value: Permission; label: string; desc: string; color: string }[] = [
  { value: "VIEW_ONLY",   label: "View Only",   desc: "Can see products",               color: "border-gray-300 bg-gray-50 text-gray-700" },
  { value: "CREATE",      label: "Create",      desc: "Can add new products",            color: "border-blue-400 bg-blue-50 text-blue-700" },
  { value: "EDIT",        label: "Edit",        desc: "Can modify existing products",    color: "border-amber-400 bg-amber-50 text-amber-700" },
  { value: "FULL_ACCESS", label: "Full Access", desc: "Create, edit and manage products", color: "border-purple-400 bg-purple-50 text-purple-700" },
];

export function ManagePermissionsModal({ product, managers, onClose }: {
  product: any;
  managers: { id: string; name: string; email: string }[];
  onClose: () => void;
}) {
  const [mounted,     setMounted]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Load current permissions
  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/products/permissions?productId=${product.id}`);
        const data = await res.json();
        const map: Record<string, Permission> = {};
        (data.data || []).forEach((p: any) => { map[p.managerId] = p.permission; });
        setPermissions(map);
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [product.id]);

  const setPermission = async (managerId: string, permission: Permission | null) => {
    setSaving(managerId);
    try {
      if (permission === null) {
        // Remove permission
        await fetch(`/api/products/permissions?productId=${product.id}&managerId=${managerId}`, {
          method: "DELETE",
        });
        setPermissions((prev) => { const n = { ...prev }; delete n[managerId]; return n; });
        toast.success("Permission removed");
      } else {
        const res = await fetch("/api/products/permissions", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ productId: product.id, managerId, permission }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPermissions((prev) => ({ ...prev, [managerId]: permission }));
        toast.success("Permission updated");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "36rem", maxHeight: "calc(100vh - 2rem)", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>
                Manage Permissions
              </h2>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission legend */}
        <div className="px-6 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Permission Levels</p>
          <div className="grid grid-cols-2 gap-2">
            {PERMISSIONS.map((p) => (
              <div key={p.value} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium", p.color)}>
                <span className="font-bold">{p.label}</span>
                <span className="text-xs opacity-75">— {p.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Managers list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0.75rem 1.5rem 1.5rem" }}>
          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300 mx-auto" />
            </div>
          ) : managers.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No managers found</p>
          ) : (
            <div className="space-y-3">
              {managers.map((mgr) => {
                const current = permissions[mgr.id] || null;
                const isSaving = saving === mgr.id;
                return (
                  <div key={mgr.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    {/* Manager info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {getInitials(mgr.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{mgr.name}</p>
                        <p className="text-xs text-gray-400">{mgr.email}</p>
                      </div>
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin text-blue-500 ml-auto" />}
                    </div>

                    {/* Permission selector */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* No access option */}
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => setPermission(mgr.id, null)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-all",
                          current === null
                            ? "border-gray-400 bg-gray-100 text-gray-700"
                            : "border-gray-200 text-gray-400 hover:border-gray-300"
                        )}>
                        {current === null && <Check className="w-3 h-3 shrink-0" />}
                        No Access
                      </button>

                      {PERMISSIONS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          disabled={isSaving}
                          onClick={() => setPermission(mgr.id, p.value)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-all",
                            current === p.value
                              ? p.color + " border-2"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          )}>
                          {current === p.value && <Check className="w-3 h-3 shrink-0" />}
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #f3f4f6" }}>
          <button onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}