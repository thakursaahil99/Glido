"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingBasket, X } from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";
import type { GroceryProduct } from "@/lib/types";

/** Product detail view: image gallery + description + Add to Cart, opened by tapping a product's photo. */
export function ProductDetailModal({
  product,
  quantity,
  onAdd,
  onChangeQuantity,
  onClose,
}: {
  product: GroceryProduct;
  quantity: number;
  onAdd: () => void;
  onChangeQuantity: (quantity: number) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const gallery = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const current = resolveMediaUrl(gallery[index]);
  const discountPct = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;

  function prev() {
    setIndex((i) => (i - 1 + gallery.length) % gallery.length);
  }
  function next() {
    setIndex((i) => (i + 1) % gallery.length);
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4" onClick={onClose}>
      <div
        className="card-glido w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-b-[1.1rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-square bg-gray-50">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt={`${product.name} photo ${index + 1}`} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <ShoppingBasket size={40} className="text-gray-300" />
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"
          >
            <X size={18} />
          </button>
          {discountPct > 0 && (
            <span className="absolute top-3 left-3 badge bg-[var(--glido-success)] text-white">{discountPct}% off</span>
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
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {gallery.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    aria-label={`Show photo ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/60"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-5">
          <h3 className="font-bold text-lg">{product.name}</h3>
          <p className="text-sm text-[var(--glido-muted)] mt-0.5">
            {product.brand ? `${product.brand} · ` : ""}
            {product.unit}
          </p>

          <div className="flex items-center gap-2 mt-3">
            <span className="text-xl font-bold">₹{product.price}</span>
            {product.mrp > product.price && <span className="text-sm text-[var(--glido-muted)] line-through">₹{product.mrp}</span>}
          </div>

          {product.description && <p className="text-sm text-[var(--glido-muted)] mt-3 leading-relaxed">{product.description}</p>}

          <div className="mt-5">
            {product.stockQty === 0 ? (
              <p className="text-sm text-[var(--glido-danger)] font-medium text-center py-3">Out of stock</p>
            ) : quantity === 0 ? (
              <button onClick={onAdd} className="btn-primary w-full">
                Add to cart
              </button>
            ) : (
              <div className="flex items-center justify-between bg-[var(--glido-primary)] rounded-xl text-white">
                <button onClick={() => onChangeQuantity(quantity - 1)} className="px-5 py-3 font-bold text-lg">
                  −
                </button>
                <span className="font-semibold">{quantity} in cart</span>
                <button
                  disabled={quantity >= product.stockQty}
                  onClick={() => onChangeQuantity(quantity + 1)}
                  className="px-5 py-3 font-bold text-lg disabled:opacity-50"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
