"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X, Loader2, User, Mail, Phone,
  Building2, FileText, MapPin, CalendarClock, LocateFixed,
} from "lucide-react";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import { createLeadSchema, type CreateLeadInput } from "@/lib/validations";
import { cn, getMinDatetimeLocal, restrictToDigits } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DuplicateConfirmDialog, type DuplicateMatch } from "./DuplicateConfirmDialog";

const CONTACT_METHODS = ["Call", "WhatsApp", "Email", "Meeting", "Video Call"];
const PRIORITIES = [
  { value: "HIGH",   label: "High",   color: "border-red-400 bg-red-50 text-red-700" },
  { value: "MEDIUM", label: "Medium", color: "border-amber-400 bg-amber-50 text-amber-700" },
  { value: "LOW",    label: "Low",    color: "border-emerald-400 bg-emerald-50 text-emerald-700" },
] as const;

type Manager    = { id: string; name: string; email: string };
type CurrentUser = { id: string; role: Role; canViewAllLeads: boolean };

export function CreateLeadModal({ managers, currentUser, onClose, onCreated }: {
  managers: Manager[];
  currentUser: CurrentUser;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted,   setMounted]   = useState(false);

  // Optional first follow-up
  const [addFollowUp,      setAddFollowUp]      = useState(false);
  const [fuScheduledAt,    setFuScheduledAt]     = useState("");
  const [fuPriority,       setFuPriority]        = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [fuContactMethod,  setFuContactMethod]   = useState("Call");
  const [fuNotes,          setFuNotes]           = useState("");
  const [fuPurpose,        setFuPurpose]         = useState("");
  const [fuError,          setFuError]           = useState("");
  const [purposes,         setPurposes]          = useState<{ id: string; name: string }[]>([]);
  const [staffTypes,       setStaffTypes]        = useState<{ id: string; name: string }[]>([]);
  const [sources,          setSources]           = useState<{ id: string; name: string }[]>([]);

  const [locLoading, setLocLoading] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    data: CreateLeadInput;
    duplicates: DuplicateMatch[];
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    fetch("/api/follow-up-purposes")
      .then((r) => r.json())
      .then((d) => setPurposes(d.data || []))
      .catch(() => {});
    fetch("/api/sources")
      .then((r) => r.json())
      .then((d) => setSources(d.data || []))
      .catch(() => {});
    fetch("/api/staff-types")
      .then((r) => r.json())
      .then((d) => setStaffTypes(d.data || []))
      .catch(() => {});
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handlePurposeChange = (name: string) => {
    setFuPurpose(name);
    if (name.trim().toLowerCase() === "payment collection") setFuPriority("HIGH");
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

  const { register, handleSubmit, formState: { errors }, setValue, watch } =
    useForm<CreateLeadInput>({
      resolver: zodResolver(createLeadSchema),
      defaultValues: {
        assignedToId: currentUser.role === Role.MANAGER ? currentUser.id : "",
        ownerPhoto:   "",
        managerPhoto: "",
        companyImage: "",
        address:      "",
      },
    });

  const isSuperAdmin = currentUser.role === Role.SUPER_ADMIN || currentUser.canViewAllLeads;

  const handleStaffTypeChange = (name: string) => {
    setValue("staffType", name, { shouldValidate: true });
  };

  const handleSourceChange = (name: string) => {
    setValue("source", name, { shouldValidate: true });
  };

  // 10-digit-only phone fields
  const phoneField        = register("phone");
  const managerPhoneField = register("managerPhone");
  const whatsappField     = register("whatsappNumber");

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`
          );
          if (!res.ok) throw new Error("Failed to resolve address");
          const data = await res.json();
          setValue("address", data.display_name || `${latitude}, ${longitude}`, { shouldValidate: true });
          toast.success("Location added");
        } catch {
          toast.error("Could not resolve address for your location");
        } finally {
          setLocLoading(false);
        }
      },
      (error) => {
        setLocLoading(false);
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied"
            : "Could not get your current location";
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const createCustomer = async (data: CreateLeadInput, confirmDuplicate: boolean) => {
    try {
      const res = await fetch("/api/leads", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...data, confirmDuplicate }),
      });
      const result = await res.json();

      if (res.status === 409 && result.duplicateFound) {
        setDuplicateInfo({ data, duplicates: result.duplicates || [] });
        return;
      }
      if (!res.ok) throw new Error(result.error || "Failed to create lead");
      toast.success(`New customer ${data.name} created!`);

      if (addFollowUp && fuScheduledAt) {
        const fuRes = await fetch("/api/follow-ups", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId:        result.data.id,
            scheduledAt:   fuScheduledAt,
            priority:      fuPriority,
            contactMethod: fuContactMethod,
            purpose:       fuPurpose,
            notes:         fuNotes,
          }),
        });
        if (fuRes.ok) {
          toast.success("First follow-up scheduled!");
        } else {
          const fuResult = await fuRes.json();
          toast.error(fuResult.error || "Customer created, but follow-up scheduling failed");
        }
      }

      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onSubmit: SubmitHandler<CreateLeadInput> = async (data) => {
    if (addFollowUp && !fuScheduledAt) {
      setFuError("Please select a date and time");
      return;
    }

    setIsLoading(true);
    await createCustomer(data, false);
    setIsLoading(false);
  };

  const handleConfirmDuplicate = async () => {
    if (!duplicateInfo) return;
    const { data } = duplicateInfo;
    setDuplicateInfo(null);
    setIsLoading(true);
    await createCustomer(data, true);
    setIsLoading(false);
  };

  if (!mounted) return null;

  return (
    <>
    {createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)" }} />

      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "38rem", maxHeight: "calc(100vh - 2rem)", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>Add New Customer</h2>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>Enter customer information</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">

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

            {/* ── Owner details ── */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Owner Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Owner Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input {...register("name")} placeholder="Business owner name" autoComplete="off"
                      className={cn("form-input pl-10", errors.name && "border-red-400")} />
                  </div>
                  {errors.name && <p className="form-error">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="form-label">Owner Phone Number <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input {...phoneField} onChange={(e) => { restrictToDigits(e); phoneField.onChange(e); }}
                      type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" autoComplete="off"
                      className={cn("form-input pl-10", errors.phone && "border-red-400")} />
                  </div>
                  {errors.phone && <p className="form-error">{errors.phone.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="form-label">Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input {...register("managerName")} placeholder="Staff name" autoComplete="off"
                      className={cn("form-input pl-10", errors.managerName && "border-red-400")} />
                  </div>
                  {errors.managerName && <p className="form-error">{errors.managerName.message}</p>}
                </div>
                <div>
                  <label className="form-label">Phone Number <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input {...managerPhoneField} onChange={(e) => { restrictToDigits(e); managerPhoneField.onChange(e); }}
                      type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" autoComplete="off"
                      className={cn("form-input pl-10", errors.managerPhone && "border-red-400")} />
                  </div>
                  {errors.managerPhone && <p className="form-error">{errors.managerPhone.message}</p>}
                </div>
              </div>

              <div className="mt-3">
                <label className="form-label">Staff Type <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={staffTypes}
                  value={watch("staffType") || ""}
                  onChange={handleStaffTypeChange}
                  onCreateOption={handleCreateStaffType}
                  placeholder="Select or add a staff type..."
                />
                {errors.staffType && <p className="form-error">{errors.staffType.message}</p>}
              </div>
            </div>

            {/* ── Lead info ── */}
            <div>
              <div>
                <label className="form-label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register("email")} type="email" placeholder="amit@company.com" autoComplete="off"
                    className={cn("form-input pl-10", errors.email && "border-red-400")} />
                </div>
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="form-label">Company</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input {...register("company")} placeholder="TechCorp Pvt Ltd" autoComplete="off"
                      className="form-input pl-10" />
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

              <div className="mt-3">
                <label className="form-label">WhatsApp Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...whatsappField} onChange={(e) => { restrictToDigits(e); whatsappField.onChange(e); }}
                    type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" autoComplete="off"
                    className={cn("form-input pl-10", errors.whatsappNumber && "border-red-400")} />
                </div>
                {errors.whatsappNumber && <p className="form-error">{errors.whatsappNumber.message}</p>}
              </div>

              {isSuperAdmin && (
                <div className="mt-3">
                  <label className="form-label">Assign To <span className="text-red-500">*</span></label>
                  <select {...register("assignedToId")}
                    className={cn("form-input bg-white", errors.assignedToId && "border-red-400")}>
                    <option value="">Select manager</option>
                    {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  {errors.assignedToId && <p className="form-error">{errors.assignedToId.message}</p>}
                </div>
              )}
            </div>

            {/* Address */}
            <div>
              <div className="flex items-center justify-between">
                <label className="form-label">Address / Location</label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locLoading}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60 mb-1.5"
                >
                  {locLoading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Locating...</>
                    : <><LocateFixed className="w-3.5 h-3.5" /> Use current location</>
                  }
                </button>
              </div>
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
                <textarea {...register("notes")} rows={3} placeholder="Any additional notes..."
                  className="form-input pl-10 resize-none" />
              </div>
            </div>

            {/* First follow-up (optional) */}
            <div className="border border-gray-200 rounded-xl p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addFollowUp}
                  onChange={(e) => { setAddFollowUp(e.target.checked); setFuError(""); }}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700">Schedule first follow-up</span>
                <span className="text-xs text-gray-400">(optional)</span>
              </label>

              {addFollowUp && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="form-label">Date & Time <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="datetime-local"
                        value={fuScheduledAt}
                        min={getMinDatetimeLocal()}
                        onChange={(e) => { setFuScheduledAt(e.target.value); setFuError(""); }}
                        className={cn("form-input pl-10", fuError && "border-red-400")}
                      />
                    </div>
                    {fuError && <p className="form-error">{fuError}</p>}
                  </div>

                  <div>
                    <label className="form-label">Contact Method</label>
                    <div className="flex flex-wrap gap-2">
                      {CONTACT_METHODS.map((m) => (
                        <button key={m} type="button" onClick={() => setFuContactMethod(m)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all",
                            fuContactMethod === m
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 text-gray-600 hover:border-gray-300"
                          )}>
                          {(m === "Call" || m === "WhatsApp") && <Phone className="w-3.5 h-3.5" />}
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Follow-up Purpose</label>
                    <SearchableSelect
                      options={purposes}
                      value={fuPurpose}
                      onChange={handlePurposeChange}
                      onCreateOption={handleCreatePurpose}
                      placeholder="Select or add a purpose..."
                    />
                  </div>

                  <div>
                    <label className="form-label">Priority</label>
                    <div className="grid grid-cols-3 gap-2">
                      {PRIORITIES.map((p) => (
                        <button key={p.value} type="button" onClick={() => setFuPriority(p.value)}
                          className={cn(
                            "py-2 text-sm font-semibold rounded-lg border-2 transition-all",
                            fuPriority === p.value
                              ? p.color
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          )}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Follow-up Notes</label>
                    <textarea value={fuNotes} onChange={(e) => setFuNotes(e.target.value)} rows={2}
                      placeholder="What needs to be discussed..."
                      className="form-input resize-none" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isLoading}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Customer"}
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