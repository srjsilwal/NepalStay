"use client";
import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastContext";
import { compressImageWithInfo } from "@/lib/image-compressor";

interface Props {
  onUpload: (url: string) => void;
  onError?: (error: string) => void;
  maxImages?: number;
  currentImageCount?: number;
}

export default function HotelImageUploader({ 
  onUpload, 
  onError, 
  maxImages = 10, 
  currentImageCount = 0 
}: Props) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    
    if (!files.length) return;
    
    if (currentImageCount + files.length > maxImages) {
      const err = `Can only upload ${maxImages - currentImageCount} more image(s)`;
      toastError(err);
      onError?.(err);
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        const { blob, originalSize, compressedSize } = await compressImageWithInfo(file, 4);
        const compressedFile = new File([blob], file.name, { type: "image/jpeg" });

        const formData = new FormData();
        formData.append("files", compressedFile);

        const res = await fetch("/api/uploadthing", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.url) {
          onUpload(data.url);
          const originalMB = (originalSize / 1024 / 1024).toFixed(2);
          const compressedMB = (compressedSize / 1024 / 1024).toFixed(2);
          toastSuccess(
            `Uploaded (${originalMB}MB → ${compressedMB}MB)`
          );
        } else {
          throw new Error(data.error || "Upload failed");
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Upload failed";
      toastError(errMsg);
      onError?.(errMsg);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 border-2 border-dashed border-purple-200 rounded-xl cursor-pointer hover:bg-purple-100 transition-colors disabled:opacity-50">
      {uploading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
          <span className="text-sm font-medium text-purple-700">Compressing...</span>
        </>
      ) : (
        <>
          <Upload className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">Add Photos</span>
        </>
      )}
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
      />
    </label>
  );
}
