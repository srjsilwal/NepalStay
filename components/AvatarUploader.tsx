"use client";
import { useState } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { UploadButton } from "@/lib/uploadthing-components";

interface Props {
  currentAvatar?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  onUpload?: (url: string) => void;
}

const SIZE = { sm: "w-16 h-16", md: "w-24 h-24", lg: "w-28 h-28" };

export default function AvatarUploader({ currentAvatar, name, size = "md", onUpload }: Props) {
  const { update } = useSession();
  const [preview, setPreview] = useState<string | null>(currentAvatar ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const initials = name
    ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar display */}
      <div className={`${SIZE[size]} rounded-full overflow-hidden border-4 border-white shadow-md bg-amber-100 flex items-center justify-center relative`}>
        {preview ? (
          <Image src={preview} alt="Avatar" fill className="object-cover" />
        ) : (
          <span className="text-amber-700 font-bold text-xl">{initials}</span>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Upload button — using UploadButton component */}
      <UploadButton
        endpoint="userAvatar"
        onUploadBegin={() => { setUploading(true); setError(""); }}
        onClientUploadComplete={async (res) => {
          setUploading(false);
          const url = res[0]?.url;
          if (url) {
            setPreview(url);
            onUpload?.(url);
            await update();
          }
        }}
        onUploadError={(err) => {
          setUploading(false);
          setError(err.message || "Upload failed. Please try again.");
        }}
        appearance={{
          button: "bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors",
          allowedContent: "hidden",
        }}
        content={{ button: <span className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" />Change Photo</span> }}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
