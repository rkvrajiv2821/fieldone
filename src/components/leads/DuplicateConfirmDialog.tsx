"use client";

import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

export type DuplicateMatch = { name: string; company?: string | null; matchedFields: string[] };

export function DuplicateConfirmDialog({ duplicates, isLoading, onCancel, onConfirm }: {
  duplicates: DuplicateMatch[];
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "26rem", padding: "1.5rem" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="font-bold text-gray-900">
            {duplicates.length > 1 ? "Possible Duplicate Customers" : "Possible Duplicate Customer"}
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          {duplicates.length} existing customer{duplicates.length > 1 ? "s" : ""} share{duplicates.length > 1 ? "" : "s"} this contact info:
        </p>
        <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
          {duplicates.map((d, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-semibold text-gray-900">{d.name}</p>
              {d.company && <p className="text-xs text-gray-500">{d.company}</p>}
              {d.matchedFields.length > 0 && (
                <p className="text-xs text-amber-700 mt-1">Matched: {d.matchedFields.join(", ")}</p>
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600 mb-4">Do you still want to continue?</p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={isLoading}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Yes, Continue"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
