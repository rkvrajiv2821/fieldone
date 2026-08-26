"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Eye, EyeOff, Loader2, User, Mail, Phone, Lock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { createManagerSchema, type CreateManagerInput } from "@/lib/validations";
import { cn } from "@/lib/utils";

export function CreateManagerModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (manager: any) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const { register, handleSubmit, formState: { errors }, watch, setValue } =
    useForm<CreateManagerInput>({
      resolver: zodResolver(createManagerSchema),
      defaultValues: { canViewAllLeads: false },
    });

  const canViewAllLeads = watch("canViewAllLeads");

  const onSubmit: SubmitHandler<CreateManagerInput> = async (data) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create manager");
      toast.success(`Manager ${data.name} created successfully!`);
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
    <div
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw", height: "100vh",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        boxSizing: "border-box",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          top: 0, left: 0,
          width: "100%", height: "100%",
          backgroundColor: "rgba(0,0,0,0.55)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: "#fff",
          borderRadius: "1rem",
          boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
          width: "100%",
          maxWidth: "32rem",
          maxHeight: "calc(100vh - 2rem)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #f3f4f6",
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>
              Add New Manager
            </h2>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
              Create a manager account
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          <input type="text"     style={{ display: "none" }} readOnly tabIndex={-1} />
          <input type="email"    style={{ display: "none" }} readOnly tabIndex={-1} />
          <input type="password" style={{ display: "none" }} readOnly tabIndex={-1} />

          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
            <div>
              <label className="form-label">Full name <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register("name")} placeholder="Arun Kumar" autoComplete="off"
                  className={cn("form-input pl-10", errors.name && "border-red-400")} />
              </div>
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>

            <div>
              <label className="form-label">Email address <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register("email")} type="email" placeholder="arun@company.com"
                  autoComplete="new-email"
                  className={cn("form-input pl-10", errors.email && "border-red-400")} />
              </div>
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div>
              <label className="form-label">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register("password")} type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters" autoComplete="new-password"
                  className={cn("form-input pl-10 pr-10", errors.password && "border-red-400")} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register("phone")} placeholder="+91 98765 43210" autoComplete="off"
                    className="form-input pl-10" />
                </div>
              </div>
              <div>
                <label className="form-label">WhatsApp</label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register("whatsappNumber")} placeholder="+919876543210" autoComplete="off"
                    className="form-input pl-10" />
                </div>
              </div>
            </div>

            <div
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border-2 transition-colors cursor-pointer select-none",
                canViewAllLeads ? "border-purple-300 bg-purple-50" : "border-gray-200 bg-gray-50"
              )}
              onClick={() => setValue("canViewAllLeads", !canViewAllLeads)}
            >
              <div className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                canViewAllLeads ? "bg-purple-600 border-purple-600" : "border-gray-300 bg-white"
              )}>
                {canViewAllLeads && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className={cn("text-sm font-semibold", canViewAllLeads ? "text-purple-800" : "text-gray-700")}>
                  Allow viewing all leads
                </p>
                <p className={cn("text-xs mt-0.5", canViewAllLeads ? "text-purple-600" : "text-gray-400")}>
                  Manager can see leads assigned to other managers
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isLoading}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                  : "Create Manager"
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