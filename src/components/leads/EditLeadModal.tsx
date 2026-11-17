"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X, Loader2, Mail, Phone,
  Building2, FileText,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import { updateLeadSchema, type UpdateLeadInput } from "@/lib/validations";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DuplicateConfirmDialog, type DuplicateMatch } from "./DuplicateConfirmDialog";
import { cn, statusConfig, restrictToDigits } from "@/lib/utils";

export function EditLeadModal({ lead, managers, currentUser, onClose, onUpdated }: {
  lead: any;
  managers: any[];
  currentUser: any;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [staffTypes, setStaffTypes] = useState<{ id: string; name: string }[]>([]);
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const [duplicateInfo, setDuplicateInfo] = useState<{ data: UpdateLeadInput; duplicates: DuplicateMatch[] } | null>(null);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    fetch("/api/staff-types")
      .then((r) => r.json())
      .then((d) => setStaffTypes(d.data || []))
      .catch(() => {});
    fetch("/api/sources")
      .then((r) => r.json())
      .then((d) => setSources(d.data || []))
      .catch(() => {});
    return () => { document.body.style.overflow = ""; };
  }, []);

  const { register, handleSubmit, formState: { errors }, watch, setValue } =
    useForm<UpdateLeadInput>({
      resolver: zodResolver(updateLeadSchema),
      defaultValues: {
        name:          lead.name,
        email:         lead.email         || "",
        phone:         lead.phone,
        whatsappNumber: lead.whatsappNumber || "",
        company:       lead.company        || "",
        source:        lead.source         || "",
        notes:         lead.notes          || "",
        assignedToId:  lead.assignedTo.id,
        ownerPhoto:    lead.ownerPhoto   || "",
        managerName:   lead.managerName  || "",
        managerPhone:  lead.managerPhone || "",
        managerPhoto:  lead.managerPhoto || "",
        staffType:     lead.staffType    || undefined,
        gstNumber:     lead.gstNumber    || "",
        companyImage:  lead.companyImage || "",
        address:       lead.address      || "",
      },
    });

  const isSuperAdmin = currentUser.role === Role.SUPER_ADMIN || currentUser.canViewAllLeads;
  const status = statusConfig[lead.status as keyof typeof statusConfig];

  const handleStaffTypeChange = (name: string) => {
    setValue("staffType", name, { shouldValidate: true });
  };

  const handleCreateStaffType = async (name: string) => {
    const res = await fetch("/api/staff-types", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name }),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error || "Failed to add staff type");
      return;
    }
    setStaffTypes((prev) =>
      prev.some((s) => s.id === result.data.id)
        ? prev
        : [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const handleSourceChange = (name: string) => {
    setValue("source", name, { shouldValidate: true });
  };

  const handleCreateSource = async (name: string) => {
    const res = await fetch("/api/sources", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name }),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error || "Failed to add source");
      return;
    }
    setSources((prev) =>
      prev.some((s) => s.id === result.data.id)
        ? prev
        : [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  // 10-digit-only phone fields
  const phoneField        = register("phone");
  const managerPhoneField = register("managerPhone");
  const whatsappField     = register("whatsappNumber");

  const saveCustomer = async (data: UpdateLeadInput, confirmDuplicate: boolean) => {
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...data, confirmDuplicate }),
      });
      const result = await res.json();

      if (res.status === 409 && result.duplicateFound) {
        setDuplicateInfo({ data, duplicates: result.duplicates || [] });
        return;
      }
      if (!res.ok) throw new Error(result.error);
      toast.success("Customer updated successfully");
      onUpdated();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onSubmit: SubmitHandler<UpdateLeadInput> = async (data) => {
    setIsLoading(true);
    await saveCustomer(data, false);
    setIsLoading(false);
  };

  const handleConfirmDuplicate = async () => {
    if (!duplicateInfo) return;
    const { data } = duplicateInfo;
    setDuplicateInfo(null);
    setIsLoading(true);
    await saveCustomer(data, true);
    setIsLoading(false);
  };

  if (!mounted) return null;

  return (
    <>
    {createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)" }} />

      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "36rem", maxHeight: "calc(100vh - 2rem)", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>Edit Customer</h2>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>{lead.name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

            {/* ── Status (read-only — set automatically by follow-up activity) ── */}
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</p>
                <span className={cn("status-badge", status?.color)}>{status?.label}</span>
              </div>
              <p className="text-xs text-gray-400 text-right max-w-[12rem]">
                Updates automatically as follow-ups are scheduled and completed
              </p>
            </div>

            {/* ── Photo uploads ── */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-4">Photos</p>
              <div className="flex flex-wrap items-start justify-center gap-4">
                <ImageUpload
                  value={watch("ownerPhoto") || ""}
                  onChange={(url) => setValue("ownerPhoto", url)}
                  label="Owner Photo"
                  size="md"
                />
                <ImageUpload
                  value={watch("managerPhoto") || ""}
                  onChange={(url) => setValue("managerPhoto", url)}
                  label="Manager Photo"
                  size="md"
                />
                <ImageUpload
                  value={watch("companyImage") || ""}
                  onChange={(url) => setValue("companyImage", url)}
                  label="Company Logo"
                  size="md"
                />
              </div>
            </div>

            {/* ── Owner + Manager details ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Owner Name <span className="text-red-500">*</span></label>
                <input {...register("name")} autoComplete="off" placeholder="Business owner name"
                  className={cn("form-input", errors.name && "border-red-400")} />
                {errors.name && <p className="form-error">{errors.name.message}</p>}
              </div>
              <div>
                <label className="form-label">Owner Phone Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...phoneField} onChange={(e) => { restrictToDigits(e); phoneField.onChange(e); }}
                    type="tel" inputMode="numeric" maxLength={10} autoComplete="off"
                    className={cn("form-input pl-10", errors.phone && "border-red-400")} />
                </div>
                {errors.phone && <p className="form-error">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Name</label>
                <input {...register("managerName")} autoComplete="off" placeholder="Staff name"
                  className={cn("form-input", errors.managerName && "border-red-400")} />
                {errors.managerName && <p className="form-error">{errors.managerName.message}</p>}
              </div>
              <div>
                <label className="form-label">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...managerPhoneField} onChange={(e) => { restrictToDigits(e); managerPhoneField.onChange(e); }}
                    type="tel" inputMode="numeric" maxLength={10} autoComplete="off"
                    className={cn("form-input pl-10", errors.managerPhone && "border-red-400")} />
                </div>
                {errors.managerPhone && <p className="form-error">{errors.managerPhone.message}</p>}
              </div>
            </div>

            <div>
              <label className="form-label">Staff Type</label>
              <SearchableSelect
                options={staffTypes}
                value={watch("staffType") || ""}
                onChange={handleStaffTypeChange}
                onCreateOption={handleCreateStaffType}
                placeholder="Select or add a staff type..."
              />
              {errors.staffType && <p className="form-error">{errors.staffType.message}</p>}
            </div>

            <div>
              <label className="form-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register("email")} type="email" autoComplete="off"
                  className={cn("form-input pl-10", errors.email && "border-red-400")} />
              </div>
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div>
              <label className="form-label">GST Number</label>
              <input {...register("gstNumber")} autoComplete="off"
                className={cn("form-input", errors.gstNumber && "border-red-400")} />
              {errors.gstNumber && <p className="form-error">{errors.gstNumber.message}</p>}
            </div>

            {/* Company + Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Company</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register("company")} autoComplete="off" className="form-input pl-10" />
                </div>
              </div>
              <div>
                <label className="form-label">Source</label>
                <SearchableSelect
                  options={sources}
                  value={watch("source") || ""}
                  onChange={handleSourceChange}
                  onCreateOption={handleCreateSource}
                  placeholder="Select or add a source..."
                />
              </div>
            </div>

            {/* WhatsApp Number */}
            <div>
              <label className="form-label">WhatsApp Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...whatsappField} onChange={(e) => { restrictToDigits(e); whatsappField.onChange(e); }}
                  type="tel" inputMode="numeric" maxLength={10} autoComplete="off"
                  className={cn("form-input pl-10", errors.whatsappNumber && "border-red-400")} />
              </div>
              {errors.whatsappNumber && <p className="form-error">{errors.whatsappNumber.message}</p>}
            </div>

            {/* Assign To (super admin only) */}
            {isSuperAdmin && (
              <div>
                <label className="form-label">Assigned To <span className="text-red-500">*</span></label>
                <select {...register("assignedToId")}
                  className={cn("form-input bg-white", errors.assignedToId && "border-red-400")}>
                  {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {errors.assignedToId && <p className="form-error">{errors.assignedToId.message}</p>}
              </div>
            )}

            {/* Address */}
            <div>
              <label className="form-label">Address / Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea {...register("address")} rows={2}
                  placeholder="Full address or location..."
                  className="form-input pl-10 resize-none" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="form-label">Notes</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea {...register("notes")} rows={3} className="form-input pl-10 resize-none" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isLoading}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
    )}

    {duplicateInfo && (
      <DuplicateConfirmDialog
        duplicates={duplicateInfo.duplicates}
        isLoading={isLoading}
        onCancel={() => setDuplicateInfo(null)}
        onConfirm={handleConfirmDuplicate}
      />
    )}
    </>
  );
}