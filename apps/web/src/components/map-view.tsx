"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Layer } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  lat: number;
  lng: number;
  /** "pickup"/"drop" render as clean dot/square glyphs (Uber-style); "driver" and "pin" use a small inline SVG. Defaults to "pin". */
  kind?: "pickup" | "drop" | "driver" | "pin";
  color?: string;
}

const CAR_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M5 17a2 2 0 1 1 0-4h14a2 2 0 1 1 0 4M5 13l1.5-5h11L19 13M9 17v0M15 17v0"/></svg>';
const PIN_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg>';

function markerHtml(m: MapMarker): string {
  const color = m.color ?? "#FF6A00";
  const kind = m.kind ?? "pin";
  if (kind === "pickup") {
    return `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`;
  }
  if (kind === "drop") {
    return `<div style="width:16px;height:16px;background:${color};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);transform:rotate(45deg)"></div>`;
  }
  const svg = kind === "driver" ? CAR_SVG : PIN_SVG;
  return `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid white;">${svg}</div>`;
}

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface MapCircle {
  lat: number;
  lng: number;
  radiusMeters: number;
  color?: string;
}

/** Free OpenStreetMap tiles + clean SVG/shape div-icons — no API key, no billing. */
export function MapView({
  center,
  zoom = 14,
  markers = [],
  polyline,
  circles,
  onClick,
  height = "260px",
  className = "",
}: {
  center: MapPoint;
  zoom?: number;
  markers?: MapMarker[];
  polyline?: MapPoint[];
  circles?: MapCircle[];
  onClick?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<Layer[]>([]);
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        const map = L.map(containerRef.current, { zoomControl: true }).setView([center.lat, center.lng], zoom);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);
        map.on("click", (e) => onClickRef.current?.(e.latlng.lat, e.latlng.lng));
        mapRef.current = map;
      } else {
        mapRef.current.setView([center.lat, center.lng], zoom);
      }

      const map = mapRef.current;
      layersRef.current.forEach((layer) => map.removeLayer(layer));
      layersRef.current = [];

      // Skip anything with a non-finite lat/lng instead of letting Leaflet throw and
      // silently break the whole map (and everything after it) for the rest of the page.
      for (const m of markers) {
        if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) continue;
        const size = m.kind === "pickup" || m.kind === "drop" ? 24 : 28;
        const icon = L.divIcon({
          className: "",
          html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">${markerHtml(m)}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
        layersRef.current.push(marker);
      }

      if (polyline && polyline.length > 1 && polyline.every((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))) {
        const line = L.polyline(
          polyline.map((p) => [p.lat, p.lng]),
          { color: "#FF6A00", weight: 4, dashArray: "1 8", lineCap: "round" },
        ).addTo(map);
        layersRef.current.push(line);
      }

      for (const c of circles ?? []) {
        if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng) || !Number.isFinite(c.radiusMeters)) continue;
        const circle = L.circle([c.lat, c.lng], {
          radius: c.radiusMeters,
          color: c.color ?? "#0EA36C",
          fillColor: c.color ?? "#0EA36C",
          fillOpacity: 0.08,
          weight: 2,
        }).addTo(map);
        layersRef.current.push(circle);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, zoom, JSON.stringify(markers), JSON.stringify(polyline), JSON.stringify(circles)]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // `isolate` is load-bearing: Leaflet's internal panes use z-index up to 700
  // (markers/popups), which — without this — escape into the page's ambient
  // stacking context and paint over absolutely-positioned siblings like the
  // cab page's bottom sheet, even though those siblings have their own z-index.
  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className={`relative isolate rounded-xl overflow-hidden ${className}`}
    />
  );
}
