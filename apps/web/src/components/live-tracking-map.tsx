"use client";

import { useEffect, useRef } from "react";
import type { LatLngExpression, Map as LeafletMap, Marker, Polyline } from "leaflet";
import { LocateFixed } from "lucide-react";
import "leaflet/dist/leaflet.css";

export interface TrackPoint {
  lat: number;
  lng: number;
}

const STORE_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9M3 9h18M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3M5 12v8h14v-8"/></svg>';
const HOME_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7M5 10v10h14V10"/></svg>';
const SCOOTER_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17" r="2.5"/><circle cx="18.5" cy="17" r="2.5"/><path d="M8 17h7.5l2-6H14M14 5h2.5l1 6M8 17l2-6h4"/></svg>';

function pinHtml(svg: string, color: string) {
  return `<div style="width:34px;height:34px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">${svg}</div>`;
}

function riderHtml(heading: number | null) {
  // The arrow wedge points the way the rider is moving; the bubble itself stays upright.
  const arrow =
    heading == null
      ? ""
      : `<div style="position:absolute;inset:-9px;transform:rotate(${heading}deg);pointer-events:none"><div style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:9px solid var(--glido-food)"></div></div>`;
  return `<div style="position:relative;width:40px;height:40px">
    <span class="glido-rider-pulse"></span>
    ${arrow}
    <div style="position:absolute;inset:0;border-radius:50%;background:var(--glido-food);border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">${SCOOTER_SVG}</div>
  </div>`;
}

const valid = (p: TrackPoint | null | undefined): p is TrackPoint =>
  p != null && Number.isFinite(p.lat) && Number.isFinite(p.lng);

/**
 * Leaflet + free OpenStreetMap tiles for live order tracking. Unlike MapView, the
 * map and markers are created once and then mutated in place, so a new rider fix
 * glides the scooter to its new spot instead of redrawing the whole map.
 */
export function LiveTrackingMap({
  restaurant,
  drop,
  rider,
  riderHeading = null,
  pickedUp,
  height = "300px",
  className = "",
}: {
  restaurant: TrackPoint | null;
  drop: TrackPoint | null;
  rider: TrackPoint | null;
  riderHeading?: number | null;
  /** After pickup the route is rider → customer; before, rider → restaurant → customer. */
  pickedUp: boolean;
  height?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const restaurantMarker = useRef<Marker | null>(null);
  const dropMarker = useRef<Marker | null>(null);
  const riderMarker = useRef<Marker | null>(null);
  const activeLine = useRef<Polyline | null>(null);
  const pendingLine = useRef<Polyline | null>(null);
  const animFrame = useRef<number | null>(null);
  const fittedFor = useRef<string>("");
  const userMoved = useRef(false);

  const fitAll = () => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const pts = [restaurant, drop, rider].filter(valid).map((p) => [p.lat, p.lng] as [number, number]);
    if (pts.length === 0) return;
    if (pts.length === 1) map.setView(pts[0], 15);
    else map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 16 });
    userMoved.current = false;
  };

  // Everything is driven from one effect so markers, route and camera always agree.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = leafletRef.current ?? (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;

      if (!mapRef.current) {
        const first = [rider, drop, restaurant].find(valid) ?? { lat: 20.5937, lng: 78.9629 };
        const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView([first.lat, first.lng], 14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);
        // Dragging is always the user; once they've panned away, stop auto-following
        // the rider until they hit the re-centre button.
        map.on("dragstart", () => {
          userMoved.current = true;
        });
        mapRef.current = map;
      }
      const map = mapRef.current;

      const placeStatic = (ref: React.MutableRefObject<Marker | null>, p: TrackPoint | null, html: string) => {
        if (!valid(p)) {
          ref.current?.remove();
          ref.current = null;
          return;
        }
        if (!ref.current) {
          const icon = L.divIcon({ className: "", html, iconSize: [34, 34], iconAnchor: [17, 17] });
          ref.current = L.marker([p.lat, p.lng], { icon, keyboard: false }).addTo(map);
        } else {
          ref.current.setLatLng([p.lat, p.lng]);
        }
      };
      placeStatic(restaurantMarker, restaurant, pinHtml(STORE_SVG, "#1F2937"));
      placeStatic(dropMarker, drop, pinHtml(HOME_SVG, "#0EA36C"));

      // Rider: glide from the last drawn spot to the new fix over ~1s.
      if (!valid(rider)) {
        riderMarker.current?.remove();
        riderMarker.current = null;
      } else {
        const icon = L.divIcon({ className: "", html: riderHtml(riderHeading), iconSize: [40, 40], iconAnchor: [20, 20] });
        if (!riderMarker.current) {
          riderMarker.current = L.marker([rider.lat, rider.lng], { icon, zIndexOffset: 1000, keyboard: false }).addTo(map);
        } else {
          riderMarker.current.setIcon(icon);
          const from = riderMarker.current.getLatLng();
          const to = rider;
          if (animFrame.current) cancelAnimationFrame(animFrame.current);
          const start = performance.now();
          const DURATION = 1000;
          const step = (now: number) => {
            const t = Math.min(1, (now - start) / DURATION);
            const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
            riderMarker.current?.setLatLng([from.lat + (to.lat - from.lat) * ease, from.lng + (to.lng - from.lng) * ease]);
            if (t < 1) animFrame.current = requestAnimationFrame(step);
          };
          animFrame.current = requestAnimationFrame(step);
          // Keep the rider in view unless the user is deliberately looking elsewhere.
          if (!userMoved.current && !map.getBounds().pad(-0.1).contains([to.lat, to.lng])) {
            map.panTo([to.lat, to.lng], { animate: true });
          }
        }
      }

      // Route: the leg the rider is on now is solid; the leg still to come is dashed.
      activeLine.current?.remove();
      pendingLine.current?.remove();
      activeLine.current = pendingLine.current = null;
      const line = (pts: TrackPoint[], dashed: boolean) =>
        L.polyline(pts.map((p) => [p.lat, p.lng] as LatLngExpression), {
          color: dashed ? "#9CA3AF" : "#ff4b26",
          weight: dashed ? 3 : 4,
          opacity: 0.9,
          dashArray: dashed ? "2 8" : "8 8",
          lineCap: "round",
        }).addTo(map);
      if (pickedUp) {
        const from = valid(rider) ? rider : restaurant;
        if (valid(from) && valid(drop)) activeLine.current = line([from, drop], false);
      } else {
        if (valid(rider) && valid(restaurant)) activeLine.current = line([rider, restaurant], false);
        if (valid(restaurant) && valid(drop)) pendingLine.current = line([restaurant, drop], true);
      }

      // Re-frame whenever a point appears or disappears (e.g. a rider gets assigned),
      // but not on every GPS tick — that would fight the user's own panning.
      const signature = [restaurant, drop, rider].map((p) => (valid(p) ? "1" : "0")).join("");
      if (signature !== fittedFor.current) {
        fittedFor.current = signature;
        fitAll();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.lat, restaurant?.lng, drop?.lat, drop?.lng, rider?.lat, rider?.lng, riderHeading, pickedUp]);

  useEffect(() => {
    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // `isolate` keeps Leaflet's high z-index panes from painting over page overlays.
  return (
    <div className={`relative isolate ${className}`} style={{ height, width: "100%" }}>
      <div ref={containerRef} className="absolute inset-0" />
      <button
        type="button"
        onClick={fitAll}
        aria-label="Re-centre map"
        className="absolute bottom-3 right-3 z-[1000] h-9 w-9 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-50"
      >
        <LocateFixed size={18} />
      </button>
    </div>
  );
}
