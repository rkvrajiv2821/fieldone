"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { X, Loader2, Package, FileText, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/ImageUpload";

const schema = z.object({
  name:        z.string().min(1, "Product name is required").max(200),
  description: z.string().optional().or(z.literal("")),
  price:       z.number({ invalid_type_error: "Enter a valid price" }).min(0),
  isActive:    z.boolean(),
});
type FormInput = z.infer<typeof schema>;

export function EditProductModal({ product, onClose, onUpdated }: {
  product: any;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [mounted,   setMounted]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [image,     setImage]     = useState(product.image || "");

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const { register, handleSubmit, formState: { errors }, setValue, watch } =
    useForm<FormInput>({
      resolver: zodResolver(schema),
      defaultValues: {
        name:        product.name,
        description: product.description || "",
        price:       Number(product.price),
        isActive:    product.isActive,
      },
    });

  const onSubmit: SubmitHandler<FormInput> = async (data) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...data, image: image || null }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update product");
      toast.success(`${data.name} updated!`);
      onUpdated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "32rem", maxHeight: "calc(100vh - 2rem)", display: "flex", flexDirection: "column" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>Edit Product</h2>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>{product.name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

            <div className="flex justify-center">
              <ImageUpload value={image} onChange={setImage} label="Product Image" size="md" />
            </div>

            <div>
              <label className="form-label">Product Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register("name")}
                  className={cn("form-input pl-10", errors.name && "border-red-400")} />
              </div>
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>

            <div>
              <label className="form-label">Description</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea {...register("description")} rows={3}
                  className="form-input pl-10 resize-none" />
              </div>
            </div>

            <div>
              <label className="form-label">Price (₹) <span className="text-red-500">*</span></label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register("price", { valueAsNumber: true })}
                  type="number" step="0.01"
                  className={cn("form-input pl-10", errors.price && "border-red-400")} />
              </div>
              {errors.price && <p className="form-error">{errors.price.message}</p>}
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-700">Active Status</p>
                <p className="text-xs text-gray-400">Inactive products are hidden from managers</p>
              </div>
              <button type="button"
                onClick={() => setValue("isActive", !watch("isActive"))}
                style={{
                  position: "relative",
                  width: "3rem",
                  height: "1.5rem",
                  borderRadius: "9999px",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  background: watch("isActive") ? "#10b981" : "#d1d5db",
                  flexShrink: 0,
                }}>
                <span style={{
                  position: "absolute",
                  top: "3px",
                  left: watch("isActive") ? "calc(100% - 21px)" : "3px",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  transition: "left 0.2s",
                  display: "block",
                }} />
              </button>
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
      </div>
    </div>,
    document.body
  );
}