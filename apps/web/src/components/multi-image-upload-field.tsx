"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { ApiError, resolveMediaUrl, uploadImage } from "@/lib/api";
import { useToast } from "@/lib/toast-context";

/**
 * Manages a gallery of image URLs (e.g. a product's extra photos beyond its cover image).
 * Each thumbnail uploads independently via the same /uploads/image endpoint as
 * ImageUploadField; removing one just drops it from the array, no server call needed.
 */
export function MultiImageUploadField({
  label,
  values,
  onChange,
  max = 6,
}: {
  label?: string;
  values: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const { show } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      show("Please choose an image file.", "error");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      onChange([...values, url]);
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not upload image.", "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div>
      {label && <label className="block text-xs font-medium mb-1">{label}</label>}
      <div className="flex flex-wrap gap-3">
        {values.map((url, i) => (
          <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100 shrink-0 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveMediaUrl(url)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
              aria-label="Remove image"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {values.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-20 w-20 shrink-0 rounded-lg border-2 border-dashed border-[var(--glido-border)] hover:border-[var(--glido-primary)] flex flex-col items-center justify-center text-[var(--glido-muted)] disabled:opacity-60"
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
            <span className="text-[10px] mt-1">{uploading ? "Uploading" : "Add photo"}</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <p className="text-[11px] text-[var(--glido-muted)] mt-1.5">
        {values.length}/{max} photos. The first one is used as the cover image.
      </p>
    </div>
  );
}
