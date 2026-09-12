"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, Search } from "lucide-react";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import type { City, Ride, RideType, WalletSummary } from "@/lib/types";
import { MapView, type MapMarker } from "@/components/map-view";

const DEFAULT_CENTER = { lat: 18.945, lng: 72.822 }; // Marine Drive, Mumbai — used if geolocation is unavailable/denied

interface Point {
  lat: number;
  lng: number;
  address: string;
}

export default function CabPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { show } = useToast();

  const [pickup, setPickup] = useState<Point | null>(null);
  const [drop, setDrop] = useState<Point | null>(null);
  const [settingMode, setSettingMode] = useState<"pickup" | "drop">("pickup");
  const [locating, setLocating] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ address: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [rideTypes, setRideTypes] = useState<RideType[] | null>(null);
  const [zones, setZones] = useState<City[]>([]);
  const [estimates, setEstimates] = useState<Record<string, { distanceKm: number; durationMin: number; estimatedFare: number }>>({});
  const [estimating, setEstimating] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [selectedRideTypeId, setSelectedRideTypeId] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "WALLET">("COD");
  const [wallet, setWallet] = useState<WalletSummary | null>(null);

  useEffect(() => {
    api.get<RideType[]>("/cab/ride-types").then((types) => {
      setRideTypes(types);
      if (types.length) setSelectedRideTypeId(types[0].id);
    });
    api.get<City[]>("/cities").then((cs) => setZones(cs.filter((c) => c.isActive && c.centerLat != null)));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get<WalletSummary>("/wallet/me").then(setWallet).catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setPickup({ ...DEFAULT_CENTER, address: "Marine Drive, Mumbai" });
      setLocating(false);
      setSettingMode("drop");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const address = await reverseGeocode(lat, lng);
        setPickup({ lat, lng, address });
        setLocating(false);
        setSettingMode("drop");
      },
      async () => {
        setPickup({ ...DEFAULT_CENTER, address: "Marine Drive, Mumbai" });
        setLocating(false);
        setSettingMode("drop");
      },
      { timeout: 6000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await api.get<{ address: string }>(`/geocode/reverse?lat=${lat}&lng=${lng}`);
      return res.address;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  async function onMapClick(lat: number, lng: number) {
    const address = await reverseGeocode(lat, lng);
    if (settingMode === "pickup") setPickup({ lat, lng, address });
    else setDrop({ lat, lng, address });
  }

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      api
        .get<{ address: string; lat: number; lng: number }[]>(`/geocode/search?q=${encodeURIComponent(searchQuery)}`)
        .then((results) => setSearchResults(results))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setShowResults(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function selectSearchResult(result: { address: string; lat: number; lng: number }) {
    if (settingMode === "pickup") {
      setPickup(result);
      setSettingMode("drop");
    } else {
      setDrop(result);
    }
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  }

  useEffect(() => {
    if (!pickup || !drop || !rideTypes || rideTypes.length === 0) return;
    setEstimating(true);
    setZoneError(null);
    let firstError: string | null = null;
    Promise.all(
      rideTypes.map((rt) =>
        api
          .post<{ distanceKm: number; durationMin: number; estimatedFare: number }>("/cab/rides/estimate", {
            rideTypeId: rt.id,
            pickupLat: pickup.lat,
            pickupLng: pickup.lng,
            dropLat: drop.lat,
            dropLng: drop.lng,
          })
          .then((res) => [rt.id, res] as const)
          .catch((e) => {
            if (!firstError) firstError = e instanceof ApiError ? e.message : "Could not estimate fare.";
            return null;
          }),
      ),
    ).then((results) => {
      const map: typeof estimates = {};
      results.forEach((r) => {
        if (r) map[r[0]] = r[1];
      });
      setEstimates(map);
      if (Object.keys(map).length === 0 && firstError) setZoneError(firstError);
      setEstimating(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, rideTypes]);

  async function bookRide() {
    if (!user) {
      router.push("/login?redirect=/cab");
      return;
    }
    if (!pickup || !drop || !selectedRideTypeId) return;
    setBooking(true);
    try {
      const ride = await api.post<Ride>("/cab/rides", {
        rideTypeId: selectedRideTypeId,
        pickupAddress: pickup.address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropAddress: drop.address,
        dropLat: drop.lat,
        dropLng: drop.lng,
        paymentMethod,
      });
      show(ride.status === "DRIVER_ASSIGNED" ? "Driver assigned!" : "Looking for a nearby driver...", "success");
      router.push(`/cab/ride/${ride.id}`);
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not book your ride.", "error");
    } finally {
      setBooking(false);
    }
  }

  const markers: MapMarker[] = [
    ...(pickup ? [{ lat: pickup.lat, lng: pickup.lng, kind: "pickup" as const, color: "#0EA36C" }] : []),
    ...(drop ? [{ lat: drop.lat, lng: drop.lng, kind: "drop" as const, color: "#E40014" }] : []),
  ];
  const circles = zones.map((z) => ({ lat: z.centerLat!, lng: z.centerLng!, radiusMeters: z.serviceRadiusKm * 1000 }));
  const center = drop ?? pickup ?? DEFAULT_CENTER;

  return (
    <div className="pb-28">
      <div className="relative">
        <MapView
          center={center}
          zoom={14}
          markers={markers}
          circles={circles}
          polyline={pickup && drop ? [pickup, drop] : undefined}
          onClick={onMapClick}
          height="42vh"
        />
        <div className="absolute top-3 left-3 right-3 md:left-auto md:right-4 md:w-80 card-glido p-2 text-xs text-[var(--glido-muted)] shadow-lg">
          {locating
            ? "Finding your location..."
            : `Search below or tap the map to set your ${settingMode === "pickup" ? "pickup" : "drop"} point`}
        </div>
      </div>

      <div className="container-glido py-5 max-w-lg">
        <h1 className="text-xl font-bold mb-4">Book a ride</h1>

        <div className="space-y-2 mb-5">
          <button
            onClick={() => setSettingMode("pickup")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left ${
              settingMode === "pickup" ? "border-[var(--glido-primary)] bg-[var(--glido-primary-light)]" : "border-[var(--glido-border)] bg-white"
            }`}
          >
            <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ background: "#0EA36C" }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--glido-muted)]">Pickup</p>
              <p className="text-sm font-medium truncate">{pickup ? pickup.address : "Setting your location..."}</p>
            </div>
          </button>
          <button
            onClick={() => setSettingMode("drop")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left ${
              settingMode === "drop" ? "border-[var(--glido-primary)] bg-[var(--glido-primary-light)]" : "border-[var(--glido-border)] bg-white"
            }`}
          >
            <span className="h-3.5 w-3.5 shrink-0 rotate-45" style={{ background: "#E40014" }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--glido-muted)]">Drop</p>
              <p className="text-sm font-medium truncate">{drop ? drop.address : "Search or tap the map to set your destination"}</p>
            </div>
          </button>
        </div>

        <div ref={searchBoxRef} className="relative mb-5">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--glido-muted)]" />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder={`Search ${settingMode === "pickup" ? "pickup" : "drop"} location...`}
              className="input-glido pl-9"
            />
          </div>
          {showResults && searchQuery.trim().length >= 3 && (
            <div className="absolute z-10 mt-1 w-full card-glido max-h-64 overflow-y-auto p-1">
              {searching && <p className="px-3 py-2 text-sm text-[var(--glido-muted)]">Searching...</p>}
              {!searching && searchResults.length === 0 && (
                <p className="px-3 py-2 text-sm text-[var(--glido-muted)]">No results found.</p>
              )}
              {!searching &&
                searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => selectSearchResult(r)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 truncate"
                  >
                    {r.address}
                  </button>
                ))}
            </div>
          )}
        </div>

        {pickup && drop && zoneError && (
          <div className="card-glido p-4 mb-4 border-l-4 border-l-[var(--glido-danger)] text-sm">
            <p className="font-semibold text-[var(--glido-danger)]">Not serviceable yet</p>
            <p className="text-[var(--glido-muted)] mt-1">{zoneError}</p>
          </div>
        )}

        {pickup && drop && !zoneError && (
          <>
            <h2 className="font-semibold mb-3">Choose a ride</h2>
            {rideTypes === null && <div className="h-24 skeleton mb-4" />}
            <div className="space-y-2 mb-5">
              {rideTypes?.map((rt) => {
                const est = estimates[rt.id];
                const selected = selectedRideTypeId === rt.id;
                return (
                  <button
                    key={rt.id}
                    onClick={() => setSelectedRideTypeId(rt.id)}
                    disabled={!est}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left disabled:opacity-50 ${
                      selected ? "border-[var(--glido-primary)] bg-[var(--glido-primary-light)]" : "border-[var(--glido-border)] bg-white"
                    }`}
                  >
                    <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      {resolveMediaUrl(rt.imageUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={resolveMediaUrl(rt.imageUrl)} alt={rt.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Car size={22} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{rt.name}</p>
                      <p className="text-xs text-[var(--glido-muted)]">
                        {rt.capacity} seats {est ? `· ${est.durationMin} min` : estimating ? "· calculating..." : ""}
                      </p>
                    </div>
                    <p className="font-bold text-sm shrink-0">{est ? `₹${est.estimatedFare.toFixed(0)}` : "—"}</p>
                  </button>
                );
              })}
            </div>

            {user && (
              <div className="flex gap-2 mb-4">
                <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium cursor-pointer has-[:checked]:border-[var(--glido-primary)] has-[:checked]:bg-[var(--glido-primary-light)] border-[var(--glido-border)]">
                  <input type="radio" className="hidden" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
                  Cash to driver
                </label>
                <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium cursor-pointer has-[:checked]:border-[var(--glido-primary)] has-[:checked]:bg-[var(--glido-primary-light)] border-[var(--glido-border)]">
                  <input type="radio" className="hidden" checked={paymentMethod === "WALLET"} onChange={() => setPaymentMethod("WALLET")} />
                  Wallet · ₹{(wallet?.balance ?? 0).toFixed(0)}
                </label>
              </div>
            )}
            {user && paymentMethod === "WALLET" && selectedRideTypeId && estimates[selectedRideTypeId] && (wallet?.balance ?? 0) < estimates[selectedRideTypeId].estimatedFare && (
              <p className="text-xs text-[var(--glido-danger)] mb-3">
                Insufficient wallet balance. <Link href="/wallet" className="underline font-medium">Add money</Link> or pay cash.
              </p>
            )}

            <button
              onClick={bookRide}
              disabled={
                booking ||
                !selectedRideTypeId ||
                !estimates[selectedRideTypeId ?? ""] ||
                (paymentMethod === "WALLET" && (wallet?.balance ?? 0) < (estimates[selectedRideTypeId ?? ""]?.estimatedFare ?? 0))
              }
              className="btn-primary w-full"
            >
              {booking
                ? "Booking..."
                : authLoading
                  ? "Loading..."
                  : !user
                    ? "Log in to book"
                    : paymentMethod === "WALLET"
                      ? "Book ride · Pay from wallet"
                      : "Book ride · Pay cash to driver"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
