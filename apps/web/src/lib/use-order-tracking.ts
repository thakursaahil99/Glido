"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { OrderTracking, RiderLocationEvent } from "@/lib/types";

const TRACKABLE = new Set(["PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"]);
// With a live socket, polling is just a safety net for missed frames. Without one
// (e.g. the serverless API, which can't hold WebSockets), it's the only update path,
// so it runs at roughly the rate the rider app reports GPS fixes.
const POLL_MS_SOCKET_UP = 20_000;
const POLL_MS_SOCKET_DOWN = 4_000;

/**
 * Live position of the rider on one food order: Socket.IO `order:location` pushes
 * when available, REST polling of /orders/:id/tracking otherwise. Stops polling on
 * its own once the order is delivered or cancelled.
 */
export function useOrderTracking(orderId: string | undefined, enabled = true) {
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [socketLive, setSocketLive] = useState(false);
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);
  const statusRef = useRef<string | null>(null);
  const riderKnownRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!orderId) return;
    try {
      const t = await api.get<OrderTracking>(`/orders/${orderId}/tracking`);
      statusRef.current = t.status;
      riderKnownRef.current = t.rider != null;
      setTracking(t);
      setLastUpdateAt(Date.now());
    } catch {
      // Keep showing the last known position; the next poll or push will retry.
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId || !enabled) return;
    refresh();

    const socket = getSocket();
    // Rooms don't survive a reconnect, so re-join every time the socket comes back.
    const join = () => {
      socket.emit("order:subscribe", orderId);
      setSocketLive(true);
    };
    const onDisconnect = () => setSocketLive(false);
    const onLocation = (e: RiderLocationEvent) => {
      if (e.orderId !== orderId) return;
      // First fix for a rider we didn't know about yet — fetch their details too.
      if (!riderKnownRef.current) {
        refresh();
        return;
      }
      setTracking((prev) => {
        if (!prev?.rider) return prev;
        return {
          ...prev,
          rider: { ...prev.rider, lat: e.lat, lng: e.lng, heading: e.heading, lastLocationAt: e.at },
          etaMinutes: e.etaMinutes ?? prev.etaMinutes,
          remainingKm: e.remainingKm ?? prev.remainingKm,
        };
      });
      setLastUpdateAt(Date.now());
    };
    const onOrderUpdate = (p: { orderId: string }) => {
      if (p.orderId === orderId) refresh();
    };

    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("disconnect", onDisconnect);
    socket.on("order:location", onLocation);
    socket.on("order:update", onOrderUpdate);

    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(async () => {
        if (statusRef.current && !TRACKABLE.has(statusRef.current)) return;
        if (document.visibilityState === "visible") await refresh();
        schedule();
      }, socket.connected ? POLL_MS_SOCKET_UP : POLL_MS_SOCKET_DOWN);
    };
    schedule();

    return () => {
      clearTimeout(timer);
      socket.off("connect", join);
      socket.off("disconnect", onDisconnect);
      socket.off("order:location", onLocation);
      socket.off("order:update", onOrderUpdate);
    };
  }, [orderId, enabled, refresh]);

  return { tracking, socketLive, lastUpdateAt, refresh };
}

export function isTrackable(status: string | undefined) {
  return status != null && TRACKABLE.has(status);
}
