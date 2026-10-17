import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

interface SocketUser {
  id: string;
  role: string;
}

export interface RiderLocationFrame {
  lat: number;
  lng: number;
  heading?: number;
}

type RiderLocationHandler = (userId: string, frame: RiderLocationFrame) => Promise<unknown>;

/**
 * Rooms: `order:<orderId>` (customer tracking one order — the id itself is an
 * unguessable cuid, so this is deliberately left ID-gated rather than
 * ownership-checked, matching a "trackable order" pattern), `admin:orders` /
 * `admin:support` (staff-only), and `user:<userId>` (that user's own feed).
 *
 * Every connection must present a valid access token (same JWT the REST API
 * uses) via the Socket.IO handshake `auth.token`; unauthenticated sockets are
 * disconnected immediately. `user:subscribe` and the admin rooms use the
 * identity/role from that verified token, never a client-supplied value —
 * previously any client could pass an arbitrary userId or just ask to join
 * the admin room with no proof of identity at all.
 *
 * Live rider tracking: a DELIVERY_PARTNER socket streams `rider:location` frames;
 * each one is fanned out as `order:location` to the rooms of the orders that rider
 * is carrying (see TrackingService). The same frames can also arrive over REST
 * (PATCH /delivery-partner/me/location) when no socket is available.
 */
@Injectable()
@WebSocketGateway({
  cors: { origin: process.env.WEB_ORIGIN?.split(",") ?? "http://localhost:3000", credentials: true },
  namespace: "/realtime",
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private riderLocationHandler: RiderLocationHandler | null = null;

  constructor(private jwt: JwtService) {}

  /** TrackingService registers itself here instead of being injected, which would
   *  make RealtimeModule depend on the tracking/geocode modules that depend on it. */
  onRiderLocation(handler: RiderLocationHandler) {
    this.riderLocationHandler = handler;
  }

  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth as { token?: string } | undefined)?.token ??
      (client.handshake.query.token as string | undefined);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwt.verify<{ sub: string; role: string }>(token);
      (client.data as { user?: SocketUser }).user = { id: payload.sub, role: payload.role };
    } catch {
      client.disconnect(true);
    }
  }

  private userOf(client: Socket): SocketUser | undefined {
    return (client.data as { user?: SocketUser }).user;
  }

  @SubscribeMessage("order:subscribe")
  onSubscribeOrder(client: Socket, orderId: string) {
    if (!this.userOf(client)) return;
    client.join(`order:${orderId}`);
  }

  @SubscribeMessage("admin:subscribe")
  onSubscribeAdmin(client: Socket) {
    if (this.userOf(client)?.role !== "ADMIN") return;
    client.join("admin:orders");
  }

  @SubscribeMessage("user:subscribe")
  onSubscribeUser(client: Socket) {
    const user = this.userOf(client);
    if (!user) return;
    // Always the caller's own verified id — a client-supplied userId would let
    // anyone read anyone else's notifications/support messages.
    client.join(`user:${user.id}`);
  }

  @SubscribeMessage("admin:support:subscribe")
  onSubscribeAdminSupport(client: Socket) {
    if (this.userOf(client)?.role !== "ADMIN") return;
    client.join("admin:support");
  }

  @SubscribeMessage("rider:location")
  async onRiderLocationFrame(client: Socket, frame: RiderLocationFrame) {
    const user = this.userOf(client);
    if (user?.role !== "DELIVERY_PARTNER" || !this.riderLocationHandler) return { ok: false };
    const lat = Number(frame?.lat);
    const lng = Number(frame?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { ok: false };
    const heading = Number(frame?.heading);
    try {
      await this.riderLocationHandler(user.id, {
        lat,
        lng,
        heading: Number.isFinite(heading) && heading >= 0 && heading <= 360 ? heading : undefined,
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  emitRiderLocation(orderId: string, payload: unknown) {
    // `server` can be absent when the app is booted without a listening HTTP server
    // (serverless) — a GPS fix must still be saved even if nobody can be pushed to.
    if (!this.server) return;
    this.server.to(`order:${orderId}`).emit("order:location", payload);
    this.server.to("admin:orders").emit("order:location", payload);
  }

  emitOrderUpdate(orderId: string, payload: unknown) {
    this.server.to(`order:${orderId}`).emit("order:update", payload);
    this.server.to("admin:orders").emit("order:update", payload);
  }

  emitNewOrder(payload: unknown) {
    this.server.to("admin:orders").emit("order:new", payload);
  }

  emitNotification(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit("notification:new", payload);
  }

  emitSupportMessage(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit("support:message", payload);
    this.server.to("admin:support").emit("support:message", payload);
  }
}
