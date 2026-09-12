"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingBasket, X } from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";

export function ProductGalleryModal({
  name,
  images,
  onClose,
}: {
  name: string;
  images: string[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const gallery = images.length > 0 ? images : [];
  const current = resolveMediaUrl(gallery[index]);

  function prev() {
    setIndex((i) => (i - 1 + gallery.length) % gallery.length);
  }
  function next() {
    setIndex((i) => (i + 1) % gallery.length);
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="card-glido w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glido-border)]">
          <h3 className="font-semibold text-sm truncate pr-2">{name}</h3>
          <button onClick={onClose} className="text-[var(--glido-muted)] hover:text-[var(--glido-ink)] shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="relative aspect-square bg-gray-50">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt={`${name} photo ${index + 1}`} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <ShoppingBasket size={40} className="text-gray-300" />
            </div>
          )}
          {gallery.length > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={next}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
        {gallery.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3">
            {gallery.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-[var(--glido-primary)]" : "w-1.5 bg-[var(--glido-border)]"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
