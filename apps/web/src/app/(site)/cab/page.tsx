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
import { PhoneRequiredField } from "@/components/phone-required-field";
import { TriServiceSwitcher } from "@/components/tri-service-switcher";

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

  function openField(mode: "pickup" | "drop") {
    setSettingMode(mode);
    setShowResults(true);
    setSearchQuery("");
  }

  return (
    <div className="pb-10 bg-[var(--glido-bg)] min-h-screen">
      <div className="relative h-[34vh] md:h-[42vh]">
        <MapView
          center={center}
          zoom={14}
          markers={markers}
          circles={circles}
          polyline={pickup && drop ? [pickup, drop] : undefined}
          onClick={onMapClick}
          height="100%"
          className="!rounded-none"
        />
      </div>

      <div className="container-glido max-w-lg -mt-10 relative z-10">
        <TriServiceSwitcher className="shadow-xl mb-3" />

        <div ref={searchBoxRef} className="card-glido p-4 shadow-xl">
          <h1 className="text-lg font-bold mb-3">Where are you headed?</h1>

          <div className="relative">
            {/* connecting line between the pickup/drop dots */}
            <div className="absolute left-[9px] top-6 bottom-6 w-px bg-[var(--glido-border)]" />

            <button
              onClick={() => openField("pickup")}
              className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-left ${
                settingMode === "pickup" && showResults ? "bg-[var(--glido-primary-light)]" : ""
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full shrink-0 ml-1" style={{ background: "#0EA36C" }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-[var(--glido-muted)]">Pickup</p>
                <p className="text-sm font-medium truncate">{locating ? "Finding your location..." : pickup ? pickup.address : "Set pickup point"}</p>
              </div>
            </button>

            <button
              onClick={() => openField("drop")}
              className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-left ${
                settingMode === "drop" && showResults ? "bg-[var(--glido-primary-light)]" : ""
              }`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rotate-45 ml-1" style={{ background: "#E40014" }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-[var(--glido-muted)]">Drop</p>
                <p className="text-sm font-medium truncate">{drop ? drop.address : "Where to?"}</p>
              </div>
            </button>
          </div>

          {showResults && (
            <div className="mt-3 pt-3 border-t border-[var(--glido-border)]">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--glido-muted)]" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${settingMode === "pickup" ? "pickup" : "drop"} location...`}
                  className="input-glido pl-9"
                />
              </div>
              <div className="max-h-56 overflow-y-auto mt-1 -mx-1">
                {searchQuery.trim().length >= 3 && searching && (
                  <p className="px-3 py-2 text-sm text-[var(--glido-muted)]">Searching...</p>
                )}
                {searchQuery.trim().length >= 3 && !searching && searchResults.length === 0 && (
                  <p className="px-3 py-2 text-sm text-[var(--glido-muted)]">No results found.</p>
                )}
                {!searching &&
                  searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => selectSearchResult(r)}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-gray-50 flex items-start gap-2"
                    >
                      <span className="mt-0.5 text-[var(--glido-muted)]">
                        <Search size={13} />
                      </span>
                      <span className="truncate">{r.address}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {pickup && drop && zoneError && (
          <div className="card-glido p-4 mt-4 border-l-4 border-l-[var(--glido-danger)] text-sm">
            <p className="font-semibold text-[var(--glido-danger)]">Not serviceable yet</p>
            <p className="text-[var(--glido-muted)] mt-1">{zoneError}</p>
          </div>
        )}

        {pickup && drop && !zoneError && (
          <div className="mt-5">
            <h2 className="font-semibold mb-3">Choose a ride</h2>
            {rideTypes === null && <div className="h-24 skeleton mb-4" />}
            <div className="space-y-2 mb-5">
              {rideTypes?.map((rt, i) => {
                const est = estimates[rt.id];
                const selected = selectedRideTypeId === rt.id;
                return (
                  <button
                    key={rt.id}
                    onClick={() => setSelectedRideTypeId(rt.id)}
                    disabled={!est}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left disabled:opacity-50 transition-all ${
                      selected ? "shadow-md ring-2" : "border border-[var(--glido-border)] bg-white"
                    }`}
                    style={selected ? { background: "var(--glido-cab-light)", boxShadow: `0 0 0 2px var(--glido-cab)` } : undefined}
                  >
                    <div
                      className="h-14 w-14 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                      style={{ background: selected ? "var(--glido-cab)" : "var(--glido-bg)" }}
                    >
                      {resolveMediaUrl(rt.imageUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={resolveMediaUrl(rt.imageUrl)} alt={rt.name} className="h-full w-full object-cover" />
                      ) : (
                        <Car size={24} className={selected ? "text-white" : "text-[var(--glido-muted)]"} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm">{rt.name}</p>
                        {i === 0 && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "var(--glido-accent-light)", color: "var(--glido-accent)" }}>
                            Fastest
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--glido-muted)]">
                        {rt.capacity} seats {est ? `· ${est.durationMin} min away` : estimating ? "· calculating..." : ""}
                      </p>
                    </div>
                    <p className="font-bold text-base shrink-0" style={{ color: selected ? "var(--glido-cab-dark)" : "var(--glido-ink)" }}>
                      {est ? `₹${est.estimatedFare.toFixed(0)}` : "—"}
                    </p>
                  </button>
                );
              })}
            </div>

            {user && <PhoneRequiredField />}

            {user && (
              <div className="flex gap-2 mb-4">
                <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium cursor-pointer has-[:checked]:border-[var(--glido-cab)] has-[:checked]:bg-[var(--glido-cab-light)] border-[var(--glido-border)]">
                  <input type="radio" className="hidden" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
                  Cash to driver
                </label>
                <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium cursor-pointer has-[:checked]:border-[var(--glido-cab)] has-[:checked]:bg-[var(--glido-cab-light)] border-[var(--glido-border)]">
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
                !user?.phone ||
                !selectedRideTypeId ||
                !estimates[selectedRideTypeId ?? ""] ||
                (paymentMethod === "WALLET" && (wallet?.balance ?? 0) < (estimates[selectedRideTypeId ?? ""]?.estimatedFare ?? 0))
              }
              className="w-full rounded-full py-3.5 font-bold text-white shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--glido-cab)", boxShadow: "0 8px 20px -4px rgba(62,82,255,0.4)" }}
            >
              {booking
                ? "Booking..."
                : authLoading
                  ? "Loading..."
                  : !user
                    ? "Log in to book"
                    : !user.phone
                      ? "Add phone number to continue"
                      : !selectedRideTypeId || !estimates[selectedRideTypeId]
                        ? "Calculating fare..."
                        : paymentMethod === "WALLET"
                          ? "Book ride · Pay from wallet"
                          : "Book ride · Pay cash to driver"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
