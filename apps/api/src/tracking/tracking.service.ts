import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import type { OrderStatus } from "@prisma/client";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { GeocodeService } from "../geocode/geocode.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { UpdateRiderLocationDto } from "./dto/tracking.dto";
import { estimateDelivery, hasCoords, type LatLng } from "./tracking.util";

/** Statuses during which a rider's position is broadcast to (and visible on) an order. */
const RIDER_LIVE_STATUSES: OrderStatus[] = ["ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];

/** A failed geocode isn't retried for this long, so an address Nominatim can't resolve
 *  doesn't cost one outbound lookup per tracking poll. */
const GEOCODE_RETRY_MS = 10 * 60_000;

export interface RiderLocationEvent {
  orderId: string;
  lat: number;
  lng: number;
  heading: number | null;
  at: string;
  etaMinutes: number | null;
  remainingKm: number | null;
}

@Injectable()
export class TrackingService implements OnModuleInit {
  private geocodeMisses = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private geocode: GeocodeService,
  ) {}

  onModuleInit() {
    // Riders on a persistent connection stream their position over the socket instead
    // of REST; the gateway hands those frames here once it has verified the role.
    this.realtime.onRiderLocation((userId, dto) => this.updateRiderLocation(userId, dto));
  }

  /**
   * Stores the rider's latest GPS fix and pushes it to every order they're actively
   * carrying, so customer/restaurant/admin maps move without polling. Works the same
   * whether the fix arrived over REST (serverless deployments) or the socket.
   */
  async updateRiderLocation(userId: string, dto: UpdateRiderLocationDto) {
    const partner = await this.prisma.deliveryPartner.findUnique({ where: { userId } });
    if (!partner) throw new NotFoundException("No delivery partner profile is linked to this account.");

    const at = new Date();
    const heading = dto.heading ?? null;
    await this.prisma.deliveryPartner.update({
      where: { id: partner.id },
      data: { currentLat: dto.lat, currentLng: dto.lng, heading, lastLocationAt: at },
    });

    const orders = await this.prisma.order.findMany({
      where: {
        deliveryPartnerId: partner.id,
        status: { in: RIDER_LIVE_STATUSES },
        deliveryAcceptanceStatus: { notIn: ["PENDING", "REJECTED"] },
      },
      select: {
        id: true,
        status: true,
        restaurant: { select: { lat: true, lng: true } },
        address: { select: { lat: true, lng: true } },
      },
    });

    const rider = { lat: dto.lat, lng: dto.lng };
    for (const order of orders) {
      const eta = estimateDelivery({
        status: order.status,
        restaurant: hasCoords(order.restaurant) ? order.restaurant : null,
        drop: hasCoords(order.address) ? order.address : null,
        rider,
      });
      const event: RiderLocationEvent = {
        orderId: order.id,
        lat: dto.lat,
        lng: dto.lng,
        heading,
        at: at.toISOString(),
        etaMinutes: eta?.etaMinutes ?? null,
        remainingKm: eta?.remainingKm ?? null,
      };
      this.realtime.emitRiderLocation(order.id, event);
    }

    return { ok: true, activeOrders: orders.length, at: at.toISOString() };
  }

  /**
   * Everything a live-tracking map needs for one food order, in one small payload:
   * pickup + drop points, the rider's latest fix, and an ETA. Visible to the customer
   * who placed it, the restaurant that's cooking it, the rider carrying it, and staff
   * with order access.
   */
  async getOrderTracking(orderId: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        userId: true,
        deliveryAcceptanceStatus: true,
        updatedAt: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            addressLine: true,
            lat: true,
            lng: true,
            ownerUserId: true,
            city: { select: { name: true, centerLat: true, centerLng: true } },
          },
        },
        address: {
          select: {
            id: true,
            label: true,
            line1: true,
            line2: true,
            pincode: true,
            lat: true,
            lng: true,
            city: { select: { name: true } },
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            userId: true,
            name: true,
            phone: true,
            photoUrl: true,
            vehicleType: true,
            vehicleNumber: true,
            ratingAvg: true,
            currentLat: true,
            currentLng: true,
            heading: true,
            lastLocationAt: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException("Order not found.");
    this.assertCanTrack(order, user);

    const restaurantPoint = await this.resolveRestaurantPoint(order.restaurant);
    const dropPoint = await this.resolveDropPoint(order.address);

    const partner = order.deliveryPartner;
    const riderVisible =
      partner != null &&
      RIDER_LIVE_STATUSES.includes(order.status) &&
      order.deliveryAcceptanceStatus !== "PENDING" &&
      order.deliveryAcceptanceStatus !== "REJECTED";
    const riderPoint = riderVisible && hasCoords({ lat: partner.currentLat, lng: partner.currentLng })
      ? { lat: partner.currentLat as number, lng: partner.currentLng as number }
      : null;

    const eta = estimateDelivery({ status: order.status, restaurant: restaurantPoint, drop: dropPoint, rider: riderPoint });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      restaurant: { name: order.restaurant.name, addressLine: order.restaurant.addressLine, ...(restaurantPoint ?? { lat: null, lng: null }) },
      drop: {
        label: order.address.label,
        line1: order.address.line1,
        line2: order.address.line2,
        ...(dropPoint ?? { lat: null, lng: null }),
      },
      rider: riderVisible
        ? {
            name: partner.name,
            phone: partner.phone,
            photoUrl: partner.photoUrl,
            vehicleType: partner.vehicleType,
            vehicleNumber: partner.vehicleNumber,
            ratingAvg: partner.ratingAvg,
            lat: riderPoint?.lat ?? null,
            lng: riderPoint?.lng ?? null,
            heading: partner.heading,
            lastLocationAt: partner.lastLocationAt,
          }
        : null,
      etaMinutes: eta?.etaMinutes ?? null,
      remainingKm: eta?.remainingKm ?? null,
      updatedAt: order.updatedAt,
    };
  }

  private assertCanTrack(
    order: { userId: string; restaurant: { ownerUserId: string | null }; deliveryPartner: { userId: string | null } | null },
    user: AuthUser,
  ) {
    if (order.userId === user.id) return;
    if (user.role === "RESTAURANT_OWNER" && order.restaurant.ownerUserId === user.id) return;
    if (user.role === "DELIVERY_PARTNER" && order.deliveryPartner?.userId === user.id) return;
    if (user.role === "ADMIN" && (user.adminRole === "SUPER_ADMIN" || user.permissions?.includes("manage_orders"))) return;
    // Same response as a missing order so tracking can't be used to probe which ids exist.
    throw new NotFoundException("Order not found.");
  }

  /** Restaurants created without a map pin get one from their address line (saved, so
   *  this runs once), falling back to the city centre so the map still has an anchor. */
  private async resolveRestaurantPoint(r: {
    id: string;
    addressLine: string | null;
    lat: number | null;
    lng: number | null;
    city: { name: string; centerLat: number | null; centerLng: number | null } | null;
  }): Promise<LatLng | null> {
    if (hasCoords(r)) return r;
    const query = [r.addressLine, r.city?.name].filter(Boolean).join(", ");
    const found = query ? await this.geocodeOnce(`restaurant:${r.id}`, query) : null;
    if (found) {
      await this.prisma.restaurant.update({ where: { id: r.id }, data: found }).catch(() => undefined);
      return found;
    }
    const center = { lat: r.city?.centerLat ?? null, lng: r.city?.centerLng ?? null };
    return hasCoords(center) ? center : null;
  }

  /** Customer addresses typed in by hand have no coordinates; geocode them once and
   *  remember the result on the address row. Unresolvable addresses just get no drop pin. */
  private async resolveDropPoint(a: {
    id: string;
    line1: string;
    line2: string | null;
    pincode: string | null;
    lat: number | null;
    lng: number | null;
    city: { name: string } | null;
  }): Promise<LatLng | null> {
    if (hasCoords(a)) return a;
    const full = [a.line1, a.line2, a.city?.name, a.pincode].filter(Boolean).join(", ");
    let found = await this.geocodeOnce(`address:${a.id}`, full);
    // Free-text street lines often confuse Nominatim; the pincode + city alone still
    // lands within a couple of km, which is good enough to draw the route.
    if (!found && a.pincode) found = await this.geocodeOnce(`address-pin:${a.id}`, [a.pincode, a.city?.name, "India"].filter(Boolean).join(", "));
    if (!found) return null;
    await this.prisma.address.update({ where: { id: a.id }, data: found }).catch(() => undefined);
    return found;
  }

  private async geocodeOnce(key: string, query: string): Promise<LatLng | null> {
    const missedAt = this.geocodeMisses.get(key);
    if (missedAt && Date.now() - missedAt < GEOCODE_RETRY_MS) return null;
    const found = await this.geocode.firstMatch(query);
    if (!found) this.geocodeMisses.set(key, Date.now());
    return found;
  }
}
