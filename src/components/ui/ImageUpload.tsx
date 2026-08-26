"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, User } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ImageUploadProps {
  value?: string;           // current image URL
  onChange: (url: string) => void;
  onClear?: () => void;
  label?: string;
  size?: "sm" | "md";       // sm = 64px, md = 80px
  disabled?: boolean;
}

export function ImageUpload({
  value, onChange, onClear, label = "Photo",
  size = "md", disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  const dim = size === "sm" ? 64 : 80;

  const handleFile = async (file: File) => {
    // Validate
    if (!file.type.startsWith("image/")) {
      setError("Only image files allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Max file size is 5MB");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file);
      onChange(result.secure_url);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-medium text-gray-500">{label}</p>

      {/* Avatar preview / upload trigger */}
      <div
        className={cn(
          "relative rounded-full border-2 border-dashed transition-all overflow-hidden cursor-pointer group",
          value ? "border-blue-300" : "border-gray-300 hover:border-blue-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{ width: dim, height: dim }}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt={label}
              width={dim}
              height={dim}
              className="object-cover w-full h-full"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
          </>
        ) : uploading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 hover:bg-blue-50 transition-colors">
            <User className="w-5 h-5 text-gray-300" />
            <span className="text-[9px] text-gray-400 mt-0.5">Upload</span>
          </div>
        )}
      </div>

      {/* Clear button */}
      {value && !disabled && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear?.(); onChange(""); }}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          <X className="w-3 h-3" /> Remove
        </button>
      )}

      {/* Upload button when no image */}
      {!value && !uploading && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
        >
          Choose photo
        </button>
      )}

      {/* Error */}
      {error && <p className="text-xs text-red-500 text-center max-w-[100px]">{error}</p>}

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ""; // reset so same file can be re-selected
        }}
      />
    </div>
  );
}