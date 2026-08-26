// src/lib/cloudinary.ts
// Unsigned upload to Cloudinary using Upload Preset

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
}

export async function uploadToCloudinary(
  file: File,
  folder = "marketing_crm"
): Promise<CloudinaryUploadResult> {
  const cloudName   = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env");
  }

  const formData = new FormData();
  formData.append("file",           file);
  formData.append("upload_preset",  uploadPreset);
  formData.append("folder",         folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Cloudinary upload failed");
  }

  return res.json();
}