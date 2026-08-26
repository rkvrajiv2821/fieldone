"use client";

import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";

export function DeleteProductDialog({ product, onClose, onConfirm }: {
  product: any;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "22rem", padding: "1.5rem" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Delete Product?</h3>
            <p className="text-sm text-gray-500">This cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5 bg-gray-50 rounded-lg px-3 py-2">
          <strong>{product.name}</strong> will be permanently deleted along with all manager permissions.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}