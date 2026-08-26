"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Eye, EyeOff, Loader2, Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";

const schema = z.object({
  newPassword: z.string().min(8, "Minimum 8 characters")
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "Must contain a letter and number"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type ResetInput = z.infer<typeof schema>;

export function ResetPasswordModal({ manager, onClose }: {
  manager: any;
  onClose: () => void;
}) {
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetInput>({
    resolver: zodResolver(schema),
  });

  const onSubmit: SubmitHandler<ResetInput> = async (data) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/managers/${manager.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: data.newPassword }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success(`Password reset for ${manager.name}`);
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
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>Reset Password</h2>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>For {manager.name}</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="flex gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              The manager will need to use this new password to log in. Share it securely.
            </p>
          </div>
          <div>
            <label className="form-label">New password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...register("newPassword")} type={show ? "text" : "password"}
                placeholder="Min 8 characters" autoComplete="new-password"
                className={cn("form-input pl-10 pr-10", errors.newPassword && "border-red-400")} />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="form-error">{errors.newPassword.message}</p>}
          </div>
          <div>
            <label className="form-label">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...register("confirmPassword")} type={show ? "text" : "password"}
                placeholder="Repeat password" autoComplete="new-password"
                className={cn("form-input pl-10", errors.confirmPassword && "border-red-400")} />
            </div>
            {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}