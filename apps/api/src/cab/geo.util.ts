const EARTH_RADIUS_KM = 6371;
const AVERAGE_SPEED_KMPH = 25; // used only to estimate ride duration for the per-minute fare component

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Straight-line ("as the crow flies") distance in km — no paid routing API is wired in yet. */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function estimateDurationMin(distanceKm: number): number {
  return (distanceKm / AVERAGE_SPEED_KMPH) * 60;
}

export function calculateFare(params: {
  distanceKm: number;
  baseFare: number;
  perKmFare: number;
  perMinuteFare: number;
  minFare: number;
}): number {
  const durationMin = estimateDurationMin(params.distanceKm);
  const fare = params.baseFare + params.perKmFare * params.distanceKm + params.perMinuteFare * durationMin;
  return Math.round(Math.max(fare, params.minFare) * 100) / 100;
}

export interface ServiceZone {
  id: string;
  name: string;
  centerLat: number | null;
  centerLng: number | null;
  serviceRadiusKm: number;
}

/** True if the point falls inside the service circle of at least one active, geo-configured zone. */
export function isPointInAnyZone(lat: number, lng: number, zones: ServiceZone[]): boolean {
  return zones.some((z) => {
    if (z.centerLat == null || z.centerLng == null) return false;
    return haversineDistanceKm(lat, lng, z.centerLat, z.centerLng) <= z.serviceRadiusKm;
  });
}
