"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, CalendarClock, FileText, Phone } from "lucide-react";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import { createFollowUpSchema, type CreateFollowUpInput } from "@/lib/validations";
import { cn, toDatetimeLocal, getMinDatetimeLocal } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

const CONTACT_METHODS = ["Call", "WhatsApp", "Email", "Meeting", "Video Call"];
const PRIORITIES = [
  { value: "HIGH",   label: "High",   color: "border-red-400 bg-red-50 text-red-700" },
  { value: "MEDIUM", label: "Medium", color: "border-amber-400 bg-amber-50 text-amber-700" },
  { value: "LOW",    label: "Low",    color: "border-emerald-400 bg-emerald-50 text-emerald-700" },
] as const;

export function ScheduleFollowUpModal({ leads, currentUser, editData, onClose, onCreated }: {
  leads: any[];
  currentUser: { id: string; role: Role; canViewAllLeads: boolean };
  editData?: any;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted,   setMounted]   = useState(false);
  const isEditing = !!editData;

  const [purposes, setPurposes] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    fetch("/api/follow-up-purposes")
      .then((r) => r.json())
      .then((d) => setPurposes(d.data || []))
      .catch(() => {});
    return () => { document.body.style.overflow = ""; };
  }, []);

  const { register, handleSubmit, formState: { errors }, watch, setValue } =
    useForm<CreateFollowUpInput>({
      resolver: zodResolver(createFollowUpSchema),
      defaultValues: {
        leadId:        editData?.lead?.id   || "",
        notes:         editData?.notes      || "",
        priority:      (editData?.priority  ?? "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
        contactMethod: editData?.contactMethod || "Call",
        purpose:       editData?.purpose    || "",
        // scheduledAt set below via setValue so the input shows correctly
      },
    });

  const handlePurposeChange = (name: string) => {
    setValue("purpose", name, { shouldValidate: true });
    if (name.trim().toLowerCase() === "payment collection") {
      setValue("priority", "HIGH", { shouldValidate: true });
    }
  };

  const handleCreatePurpose = async (name: string) => {
    const res = await fetch("/api/follow-up-purposes", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name }),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error || "Failed to add purpose");
      return;
    }
    setPurposes((prev) =>
      prev.some((p) => p.id === result.data.id)
        ? prev
        : [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  // Set scheduledAt AFTER mount so the datetime-local input renders with the value
  useEffect(() => {
    if (editData?.scheduledAt) {
      setValue("scheduledAt", new Date(editData.scheduledAt));
    }
  }, [editData, setValue]);

  const selectedPriority = watch("priority");

  const onSubmit: SubmitHandler<CreateFollowUpInput> = async (data) => {
    setIsLoading(true);
    try {
      const url    = isEditing ? `/api/follow-ups/${editData.id}` : "/api/follow-ups";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save follow-up");
      toast.success(isEditing ? "Follow-up updated!" : "Follow-up scheduled!");
      onCreated();
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

      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "32rem", maxHeight: "calc(100vh - 2rem)", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>
              {isEditing ? "Edit Follow-up" : "Schedule Follow-up"}
            </h2>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
              {isEditing ? `Editing ${editData.lead.name}'s follow-up` : "Set date, time and details"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

            {/* Lead select (create only) */}
            {!isEditing && (
              <div>
                <label className="form-label">New Customer <span className="text-red-500">*</span></label>
                <select {...register("leadId")}
                  className={cn("form-input bg-white", errors.leadId && "border-red-400")}>
                  <option value="">Select a new customer...</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}{l.company ? ` — ${l.company}` : ""}
                    </option>
                  ))}
                </select>
                {errors.leadId && <p className="form-error">{errors.leadId.message}</p>}
              </div>
            )}

            {/* Date & Time — use value + onChange to fully control the input */}
            <div>
              <label className="form-label">Date & Time <span className="text-red-500">*</span></label>
              <div className="relative">
                <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="datetime-local"
                  value={toDatetimeLocal(watch("scheduledAt"))}
                  min={getMinDatetimeLocal()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setValue("scheduledAt", val ? new Date(val) : (undefined as any), {
                      shouldValidate: true,
                    });
                  }}
                  className={cn("form-input pl-10", errors.scheduledAt && "border-red-400")}
                />
              </div>
              {errors.scheduledAt && <p className="form-error">{errors.scheduledAt.message}</p>}
              {!errors.scheduledAt && (
                <p className="text-xs text-gray-400 mt-1">Must be a future date and time</p>
              )}
            </div>

            {/* Contact method */}
            <div>
              <label className="form-label">Contact Method</label>
              <div className="flex flex-wrap gap-2">
                {CONTACT_METHODS.map((m) => (
                  <button key={m} type="button" onClick={() => setValue("contactMethod", m)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all",
                      watch("contactMethod") === m
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    )}>
                    {(m === "Call" || m === "WhatsApp") && <Phone className="w-3.5 h-3.5" />}
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="form-label">Follow-up Purpose</label>
              <SearchableSelect
                options={purposes}
                value={watch("purpose") || ""}
                onChange={handlePurposeChange}
                onCreateOption={handleCreatePurpose}
                placeholder="Select or add a purpose..."
              />
            </div>

            {/* Priority */}
            <div>
              <label className="form-label">Priority</label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => (
                  <button key={p.value} type="button" onClick={() => setValue("priority", p.value)}
                    className={cn(
                      "py-2 text-sm font-semibold rounded-lg border-2 transition-all",
                      selectedPriority === p.value
                        ? p.color
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    )}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="form-label">Notes</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea {...register("notes")} rows={3}
                  placeholder="What needs to be discussed..."
                  className="form-input pl-10 resize-none" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isLoading}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  : isEditing ? "Update Follow-up" : "Schedule Follow-up"
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}