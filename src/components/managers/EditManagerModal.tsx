"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, User, Phone, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";

const editSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional().or(z.literal("")),
  whatsappNumber: z.string().optional().or(z.literal("")),
});
type EditInput = z.infer<typeof editSchema>;

export function EditManagerModal({ manager, onClose, onUpdated }: {
  manager: any;
  onClose: () => void;
  onUpdated: (updated: any) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<EditInput>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: manager.name,
      phone: manager.phone || "",
      whatsappNumber: manager.whatsappNumber || "",
    },
  });

  const onSubmit: SubmitHandler<EditInput> = async (data) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/managers/${manager.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success("Manager updated successfully");
      onUpdated(result.data);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div style={{
      position: "fixed", top: 0, left: 0,
      width: "100vw", height: "100vh", zIndex: 99999,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem", boxSizing: "border-box",
    }}>
      <div onClick={onClose} style={{
        position: "absolute", top: 0, left: 0,
        width: "100%", height: "100%",
        backgroundColor: "rgba(0,0,0,0.55)",
      }} />
      <div style={{
        position: "relative", zIndex: 1, background: "#fff",
        borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
        width: "100%", maxWidth: "28rem",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>Edit Manager</h2>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>{manager.email}</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div>
            <label className="form-label">Full name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...register("name")} autoComplete="off"
                className={cn("form-input pl-10", errors.name && "border-red-400")} />
            </div>
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register("phone")} autoComplete="off" placeholder="+91 98765 43210" className="form-input pl-10" />
              </div>
            </div>
            <div>
              <label className="form-label">WhatsApp</label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register("whatsappNumber")} autoComplete="off" placeholder="+919876543210" className="form-input pl-10" />
              </div>
            </div>
          </div>
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
    </div>,
    document.body
  );
}