"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";

type Manager = { id: string; name: string; email: string };
type CurrentUser = { id: string; role: Role; canViewAllLeads: boolean };

export function ImportLeadsModal({ managers, currentUser, onClose, onImported }: {
  managers: Manager[];
  currentUser: CurrentUser;
  onClose: () => void;
  onImported: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [rows, setRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [assignTo, setAssignTo] = useState(
    currentUser.role === Role.MANAGER ? currentUser.id : ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const errs: string[] = [];
        const valid: any[] = [];

        result.data.forEach((row: any, i) => {
          if (!row.name) errs.push(`Row ${i + 2}: name is required`);
          else if (!row.phone) errs.push(`Row ${i + 2}: phone is required`);
          else valid.push(row);
        });

        setRows(valid);
        setErrors(errs);
        setStep("preview");
      },
      error: () => toast.error("Failed to parse CSV file"),
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!assignTo && currentUser.role === Role.SUPER_ADMIN) {
      toast.error("Please select a manager to assign leads");
      return;
    }

    setIsLoading(true);
    try {
      const payload = rows.map((r) => ({ ...r, assignedToId: assignTo || currentUser.id }));
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success(`${result.count} leads imported successfully!`);
      setStep("done");
      setTimeout(() => { onImported(); }, 1000);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div onClick={onClose} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.55)" }} />

      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "42rem", maxHeight: "calc(100vh - 2rem)", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>Import Leads</h2>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>Upload a CSV file to bulk import</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }} className="p-6">
          {step === "upload" && (
            <div className="space-y-4">
              {/* Download sample */}
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-blue-700 font-medium">Download the sample CSV to get started</p>
                </div>
                <button
                  onClick={() => window.open("/api/leads/sample-csv", "_blank")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-10 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-700">Drop your CSV file here</p>
                <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                <p className="text-xs text-gray-300 mt-2">Supported: .csv files</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>

              {/* Required columns */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Required columns</p>
                <div className="flex flex-wrap gap-2">
                  {["name *", "phone *", "email", "whatsapp_number", "company", "source", "notes"].map((col) => (
                    <span key={col} className={cn(
                      "px-2 py-0.5 rounded text-xs font-mono",
                      col.includes("*") ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
                    )}>
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-emerald-700">{rows.length}</p>
                    <p className="text-xs text-emerald-600">Valid rows</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-red-600">{errors.length}</p>
                    <p className="text-xs text-red-500">Skipped rows</p>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 max-h-24 overflow-y-auto">
                  {errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">{e}</p>
                  ))}
                </div>
              )}

              {/* Assign to manager (super admin) */}
              {(currentUser.role === Role.SUPER_ADMIN || currentUser.canViewAllLeads) && (
                <div>
                  <label className="form-label">Assign all leads to</label>
                  <select
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    className="form-input bg-white"
                  >
                    <option value="">Select manager</option>
                    {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}

              {/* Preview table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-48">
                  <table className="crm-table text-xs">
                    <thead>
                      <tr>
                        <th>Name</th><th>Phone</th><th>Email</th><th>Company</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 10).map((r, i) => (
                        <tr key={i}>
                          <td>{r.name}</td>
                          <td>{r.phone}</td>
                          <td>{r.email || "—"}</td>
                          <td>{r.company || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 10 && (
                  <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
                    + {rows.length - 10} more rows
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep("upload")}
                  className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  Back
                </button>
                <button onClick={handleImport} disabled={isLoading || rows.length === 0}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                    : `Import ${rows.length} Leads`
                  }
                </button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Import Complete!</h3>
              <p className="text-gray-500 text-sm mt-1">{rows.length} leads have been added.</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}