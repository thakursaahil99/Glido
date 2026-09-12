import Link from "next/link";
import { Clock, UtensilsCrossed } from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";
import type { Restaurant } from "@/lib/types";

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const image = resolveMediaUrl(restaurant.imageUrl);
  return (
    <Link href={`/food/${restaurant.id}`} className="card-glido overflow-hidden group block">
      <div className="aspect-[16/10] bg-gray-100 overflow-hidden relative">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={restaurant.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <UtensilsCrossed size={32} className="text-gray-300" />
          </div>
        )}
        <span className="absolute bottom-2 right-2 badge bg-white/95 text-[var(--glido-ink)] shadow-sm">
          ★ {restaurant.ratingAvg ? restaurant.ratingAvg.toFixed(1) : "New"}
        </span>
        {!restaurant.isOpen && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">Closed now</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-[var(--glido-ink)] leading-tight">{restaurant.name}</h3>
        {restaurant.cuisineTags && (
          <p className="mt-1 text-xs text-[var(--glido-muted)] truncate">{restaurant.cuisineTags}</p>
        )}
        <div className="mt-3 flex items-center gap-3 text-xs text-[var(--glido-muted)]">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> {restaurant.avgDeliveryTimeMin} min
          </span>
          <span>·</span>
          <span>{restaurant.deliveryFee === 0 ? "Free delivery" : `₹${restaurant.deliveryFee} delivery`}</span>
        </div>
      </div>
    </Link>
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className="card-glido overflow-hidden">
      <div className="aspect-[16/10] skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-3/4 skeleton" />
        <div className="h-3 w-1/2 skeleton" />
        <div className="h-3 w-2/3 skeleton" />
      </div>
    </div>
  );
}
