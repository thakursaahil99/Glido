"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { ApiError, resolveMediaUrl, uploadImage } from "@/lib/api";
import { useToast } from "@/lib/toast-context";

export function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const { show } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      show("Please choose an image file.", "error");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      onChange(url);
      show("Image uploaded", "success");
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not upload image.", "error");
    } finally {
      setUploading(false);
    }
  }

  const preview = resolveMediaUrl(value);

  return (
    <div>
      {label && <label className="block text-xs font-medium mb-1">{label}</label>}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex items-center gap-3 border-2 border-dashed rounded-xl p-3 cursor-pointer transition-colors ${
          dragOver ? "border-[var(--glido-primary)] bg-[var(--glido-primary-light)]" : "border-[var(--glido-border)] hover:border-[var(--glido-primary)]"
        }`}
      >
        <div className="h-16 w-16 shrink-0 rounded-lg bg-gray-100 dark:bg-[var(--glido-surface-alt)] overflow-hidden flex items-center justify-center">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : uploading ? (
            <Loader2 size={22} className="text-[var(--glido-muted)] animate-spin" />
          ) : (
            <ImagePlus size={22} className="text-gray-300" />
          )}
        </div>
        <div className="text-xs text-[var(--glido-muted)]">
          {uploading ? (
            "Uploading..."
          ) : (
            <>
              <span className="text-[var(--glido-primary)] font-medium">Click to upload</span> or drag an image here
              <br />
              JPG, PNG, WEBP or GIF, up to 5MB
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
