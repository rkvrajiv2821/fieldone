"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

export function DeleteLeadDialog({ lead, onClose, onConfirm }: {
  lead: { name: string; company?: string | null };
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div onClick={onClose} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.55)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "24rem", padding: "1.5rem" }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">Delete Lead</h3>
            <p className="text-sm text-gray-500 mt-1">
              Are you sure you want to delete <strong>{lead.name}</strong>
              {lead.company ? ` from ${lead.company}` : ""}? This will also delete all follow-ups. This cannot be undone.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
            Delete Lead
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}