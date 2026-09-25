"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Car, Home, MapPin, Search, ShieldCheck, Briefcase } from "lucide-react";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import type { Address, City, Ride, RideType, WalletSummary } from "@/lib/types";
import { MapView, type MapMarker } from "@/components/map-view";
import { PhoneRequiredField } from "@/components/phone-required-field";

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
  const [searchOpen, setSearchOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [rideTypes, setRideTypes] = useState<RideType[] | null>(null);
  const [zones, setZones] = useState<City[]>([]);
  const [estimates, setEstimates] = useState<Record<string, { distanceKm: number; durationMin: number; estimatedFare: number }>>({});
  const [estimating, setEstimating] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [selectedRideTypeId, setSelectedRideTypeId] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "WALLET">("COD");
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState<number | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    api.get<RideType[]>("/cab/ride-types").then((types) => {
      setRideTypes(types);
      if (types.length) setSelectedRideTypeId(types[0].id);
    });
    api.get<City[]>("/cities").then((cs) => setZones(cs.filter((c) => c.isActive && c.centerLat != null && c.centerLng != null)));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get<WalletSummary>("/wallet/me").then(setWallet).catch(() => undefined);
    api.get<Address[]>("/users/me/addresses").then(setSavedAddresses).catch(() => undefined);
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

  function openField(mode: "pickup" | "drop") {
    setSettingMode(mode);
    setSearchOpen(true);
    setSearchQuery("");
    setSearchResults([]);
  }

  function selectSearchResult(result: { address: string; lat: number; lng: number }) {
    if (settingMode === "pickup") {
      setPickup(result);
      setSettingMode("drop");
      if (!drop) {
        setSearchQuery("");
        setSearchResults([]);
        return; // stay open, auto-advance to searching for the drop point
      }
    } else {
      setDrop(result);
    }
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  }

  const [selectingSaved, setSelectingSaved] = useState(false);
  async function selectSavedAddress(addr: Address) {
    setSelectingSaved(true);
    try {
      const query = [addr.line1, addr.line2, addr.pincode].filter(Boolean).join(", ");
      const results = await api.get<{ address: string; lat: number; lng: number }[]>(
        `/geocode/search?q=${encodeURIComponent(query)}`,
      );
      if (results.length > 0) {
        selectSearchResult(results[0]);
      } else {
        show(`Could not locate "${addr.label}" on the map. Try searching manually.`, "error");
      }
    } catch {
      show("Could not locate that address. Try searching manually.", "error");
    } finally {
      setSelectingSaved(false);
    }
  }

  async function applyCoupon(subtotal: number) {
    if (!couponCode) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const res = await api.post<{ valid: boolean; discount: number }>("/coupons/validate", {
        code: couponCode,
        subtotal,
      });
      setCouponDiscount(res.discount);
      show(`Coupon applied — ₹${res.discount} off`, "success");
    } catch (e) {
      setCouponDiscount(null);
      setCouponError(e instanceof ApiError ? e.message : "Invalid coupon.");
    } finally {
      setApplyingCoupon(false);
    }
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
        couponCode: couponDiscount != null ? couponCode : undefined,
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
  const readyToShowRides = pickup && drop && !searchOpen;

  return (
    <div className="relative h-[calc(100vh-7.5rem)] min-h-[420px] overflow-hidden">
      {/* Map fills the whole viewport behind everything — Uber/InDrive style */}
      <MapView center={center} zoom={14} markers={markers} circles={circles} polyline={pickup && drop ? [pickup, drop] : undefined} onClick={onMapClick} height="100%" className="!rounded-none" />

      {/* Back button, floating over the map */}
      <button
        onClick={() => router.push("/")}
        aria-label="Back"
        className="absolute top-3 left-3 z-20 h-10 w-10 rounded-full bg-white dark:bg-[var(--glido-surface)] shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[var(--glido-surface-alt)]"
      >
        <ArrowLeft size={18} className="text-[var(--glido-ink)]" />
      </button>

      {/* Bottom sheet — always visible, floating above the map. The Book button lives outside
          the scrollable area below so it's always reachable, even when the ride list is long. */}
      <div ref={sheetRef} className="absolute bottom-0 inset-x-0 z-20 bg-white dark:bg-[var(--glido-surface)] rounded-t-3xl shadow-2xl max-h-[85%] flex flex-col">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-[var(--glido-border)] shrink-0" />

        <div className="p-4 overflow-y-auto">
          {searchOpen ? (
            <>
              <div className="relative mb-2">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--glido-muted)]" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${settingMode === "pickup" ? "pickup" : "drop"} location...`}
                  className="input-glido pl-9"
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--glido-muted)]"
                >
                  Cancel
                </button>
              </div>
              {searchQuery.trim().length === 0 && savedAddresses.length > 0 && (
                <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                  {savedAddresses.map((addr) => {
                    const Icon = addr.label.toLowerCase() === "home" ? Home : addr.label.toLowerCase() === "work" ? Briefcase : MapPin;
                    return (
                      <button
                        key={addr.id}
                        disabled={selectingSaved}
                        onClick={() => selectSavedAddress(addr)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--glido-border)] text-xs font-semibold hover:border-[var(--glido-cab)] disabled:opacity-50"
                      >
                        <Icon size={12} className="text-[var(--glido-cab)]" />
                        {addr.label}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="min-h-[120px]">
                {searchQuery.trim().length >= 3 && searching && <p className="px-1 py-2 text-sm text-[var(--glido-muted)]">Searching...</p>}
                {searchQuery.trim().length >= 3 && !searching && searchResults.length === 0 && (
                  <p className="px-1 py-2 text-sm text-[var(--glido-muted)]">No results found.</p>
                )}
                {searchQuery.trim().length < 3 && <p className="px-1 py-2 text-sm text-[var(--glido-muted)]">Type at least 3 characters, or tap the map.</p>}
                {!searching &&
                  searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => selectSearchResult(r)}
                      className="w-full text-left px-1 py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-[var(--glido-surface-alt)] flex items-start gap-2"
                    >
                      <span className="mt-0.5 text-[var(--glido-muted)]">
                        <Search size={13} />
                      </span>
                      <span className="truncate">{r.address}</span>
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-lg font-bold mb-3">{readyToShowRides ? "Choose a ride" : "Where are you headed?"}</h1>

              <div className="relative mb-1">
                <div className="absolute left-[9px] top-6 bottom-6 w-px bg-[var(--glido-border)]" />
                <button onClick={() => openField("pickup")} className="w-full flex items-center gap-3 py-2 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-[var(--glido-surface-alt)]">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0 ml-1" style={{ background: "#0EA36C" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-[var(--glido-muted)]">Pickup</p>
                    <p className="text-sm font-medium truncate">{locating ? "Finding your location..." : pickup ? pickup.address : "Set pickup point"}</p>
                  </div>
                </button>
                <button onClick={() => openField("drop")} className="w-full flex items-center gap-3 py-2 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-[var(--glido-surface-alt)]">
                  <span className="h-2.5 w-2.5 shrink-0 rotate-45 ml-1" style={{ background: "#E40014" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-[var(--glido-muted)]">Drop</p>
                    <p className="text-sm font-medium truncate">{drop ? drop.address : "Where to?"}</p>
                  </div>
                </button>
              </div>

              {pickup && !drop && (
                <p className="text-xs text-[var(--glido-muted)] mt-2 mb-1">Tap &quot;Where to?&quot; above to search a destination, or tap the map.</p>
              )}

              {pickup && drop && zoneError && (
                <div className="mt-3 p-3 rounded-xl border-l-4 border-l-[var(--glido-danger)] bg-[var(--glido-danger-light)] text-sm">
                  <p className="font-semibold text-[var(--glido-danger)]">Not serviceable yet</p>
                  <p className="text-[var(--glido-muted)] mt-1">{zoneError}</p>
                </div>
              )}

              {readyToShowRides && !zoneError && (
                <div className="mt-4">
                  <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold" style={{ color: "var(--glido-success)" }}>
                    <ShieldCheck size={13} />
                    Standard rates active — no surge pricing
                  </div>
                  {rideTypes === null && <div className="h-24 skeleton mb-4" />}
                  <div className="space-y-2 mb-4">
                    {rideTypes?.map((rt, i) => {
                      const est = estimates[rt.id];
                      const selected = selectedRideTypeId === rt.id;
                      return (
                        <button
                          key={rt.id}
                          onClick={() => {
                            setSelectedRideTypeId(rt.id);
                            setCouponDiscount(null);
                          }}
                          disabled={!est}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-left disabled:opacity-50 transition-all ${
                            selected ? "shadow-md" : "border border-[var(--glido-border)] bg-white dark:bg-[var(--glido-surface)]"
                          }`}
                          style={selected ? { background: "var(--glido-cab-light)", boxShadow: "0 0 0 2px var(--glido-cab)" } : undefined}
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

                  {user && (
                    <div className="mb-4">
                      <div className="flex gap-2">
                        <input
                          className="input-glido"
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponDiscount(null);
                            setCouponError(null);
                          }}
                        />
                        <button
                          type="button"
                          disabled={applyingCoupon || !couponCode || !selectedRideTypeId || !estimates[selectedRideTypeId ?? ""]}
                          onClick={() => applyCoupon(estimates[selectedRideTypeId ?? ""]?.estimatedFare ?? 0)}
                          className="btn-secondary shrink-0 disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                      {couponError && <p className="text-xs text-[var(--glido-danger)] mt-1.5">{couponError}</p>}
                      {couponDiscount != null && (
                        <p className="text-xs mt-1.5 font-semibold" style={{ color: "var(--glido-success)" }}>
                          ₹{couponDiscount} discount will be applied
                        </p>
                      )}
                    </div>
                  )}

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
                    <p className="text-xs text-[var(--glido-danger)] mb-1">
                      Insufficient wallet balance. <Link href="/wallet" className="underline font-medium">Add money</Link> or pay cash.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky footer — the Book button is never scrolled out of reach */}
        {readyToShowRides && !zoneError && (
          <div className="shrink-0 border-t border-[var(--glido-border)] p-4">
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
                          ? `Book ${rideTypes?.find((rt) => rt.id === selectedRideTypeId)?.name ?? "ride"} · Pay from wallet`
                          : `Book ${rideTypes?.find((rt) => rt.id === selectedRideTypeId)?.name ?? "ride"} · Pay cash`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
