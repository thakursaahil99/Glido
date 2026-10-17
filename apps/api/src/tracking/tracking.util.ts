import { haversineDistanceKm } from "../cab/geo.util";

// Straight-line distance undercounts real road distance in a city grid; 1.35 is a
// common rule-of-thumb detour factor. 18 km/h is a typical urban two-wheeler average
// including signals — both tuned for a believable ETA, not turn-by-turn accuracy.
const ROAD_DETOUR_FACTOR = 1.35;
const RIDER_SPEED_KMPH = 18;
const HANDOFF_MINUTES = 2; // parking, pickup at the counter / walking to the door
// Beyond this the inputs are wrong (a stale GPS fix from another city, a mis-geocoded
// address), not a long delivery — better to show no ETA than "arriving in 4 days".
const MAX_PLAUSIBLE_KM = 60;
const PREP_MINUTES_REMAINING: Partial<Record<string, number>> = {
  PENDING: 15,
  ACCEPTED: 12,
  PREPARING: 8,
};

export interface LatLng {
  lat: number;
  lng: number;
}

export function hasCoords(p: { lat?: number | null; lng?: number | null } | null | undefined): p is LatLng {
  return p != null && Number.isFinite(p.lat) && Number.isFinite(p.lng);
}

function travelMinutes(from: LatLng, to: LatLng) {
  const km = haversineDistanceKm(from.lat, from.lng, to.lat, to.lng) * ROAD_DETOUR_FACTOR;
  return { km, minutes: (km / RIDER_SPEED_KMPH) * 60 };
}

/**
 * Remaining delivery time for a food order, from whatever coordinates are known.
 * Before pickup the rider still has to reach the restaurant and the food may still
 * be cooking, so the leg to the restaurant and the prep time overlap — whichever is
 * longer wins. Returns null once the order is no longer in flight or when there
 * isn't enough location data to say anything honest.
 */
export function estimateDelivery(params: {
  status: string;
  restaurant: LatLng | null;
  drop: LatLng | null;
  rider: LatLng | null;
}): { etaMinutes: number; remainingKm: number } | null {
  const { status, restaurant, drop, rider } = params;
  if (!drop) return null;

  if (status === "OUT_FOR_DELIVERY") {
    const from = rider ?? restaurant;
    if (!from) return null;
    const leg = travelMinutes(from, drop);
    if (leg.km > MAX_PLAUSIBLE_KM) return null;
    return { etaMinutes: Math.max(1, Math.round(leg.minutes + HANDOFF_MINUTES)), remainingKm: round1(leg.km) };
  }

  if (["PENDING", "ACCEPTED", "PREPARING", "READY"].includes(status)) {
    if (!restaurant) return null;
    const toCustomer = travelMinutes(restaurant, drop);
    const prep = PREP_MINUTES_REMAINING[status] ?? 0;
    const toRestaurant = rider ? travelMinutes(rider, restaurant) : { km: 0, minutes: 0 };
    const beforePickup = Math.max(prep, toRestaurant.minutes);
    if (toRestaurant.km + toCustomer.km > MAX_PLAUSIBLE_KM) return null;
    return {
      etaMinutes: Math.max(1, Math.round(beforePickup + toCustomer.minutes + HANDOFF_MINUTES * 2)),
      remainingKm: round1(toRestaurant.km + toCustomer.km),
    };
  }

  return null;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
