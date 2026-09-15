import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { RideStatus } from "@prisma/client";
import { AuditLogService } from "../audit/audit-log.service";
import { CitiesService } from "../cities/cities.service";
import { CouponsService } from "../coupons/coupons.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { WalletService } from "../wallet/wallet.service";
import { CreateRideDto, EstimateRideDto } from "./dto/rides.dto";
import { calculateFare, estimateDurationMin, haversineDistanceKm, isPointInAnyZone } from "./geo.util";

const ALLOWED_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  REQUESTED: ["CANCELLED"],
  DRIVER_ASSIGNED: ["DRIVER_ARRIVED", "CANCELLED"],
  DRIVER_ARRIVED: ["ONGOING", "CANCELLED"],
  ONGOING: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const STATUS_LABEL: Record<RideStatus, string> = {
  REQUESTED: "requested",
  DRIVER_ASSIGNED: "assigned a driver",
  DRIVER_ARRIVED: "arrived at your pickup point",
  ONGOING: "on the way",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

function genRideNumber() {
  return `GLR${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
}

@Injectable()
export class RidesService {
  constructor(
    private prisma: PrismaService,
    private coupons: CouponsService,
    private cities: CitiesService,
    private realtime: RealtimeGateway,
    private auditLog: AuditLogService,
    private notifications: NotificationsService,
    private wallet: WalletService,
  ) {}

  /** No-op if no zone has been geo-configured yet (nothing to restrict against). */
  private async assertPickupServiceable(lat: number, lng: number) {
    const zones = await this.cities.listActiveZones();
    if (zones.length === 0) return;
    if (!isPointInAnyZone(lat, lng, zones)) {
      throw new BadRequestException("Glido Cab isn't available at this pickup location yet.");
    }
  }

  async estimate(dto: EstimateRideDto) {
    await this.assertPickupServiceable(dto.pickupLat, dto.pickupLng);

    const rideType = await this.prisma.rideType.findFirst({ where: { id: dto.rideTypeId, isActive: true } });
    if (!rideType) throw new NotFoundException("Ride type not found.");

    const distanceKm = haversineDistanceKm(dto.pickupLat, dto.pickupLng, dto.dropLat, dto.dropLng);
    const durationMin = estimateDurationMin(distanceKm);
    const fare = calculateFare({
      distanceKm,
      baseFare: rideType.baseFare,
      perKmFare: rideType.perKmFare,
      perMinuteFare: rideType.perMinuteFare,
      minFare: rideType.minFare,
    });

    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMin: Math.round(durationMin),
      estimatedFare: fare,
    };
  }

  async create(userId: string, dto: CreateRideDto) {
    await this.assertPickupServiceable(dto.pickupLat, dto.pickupLng);

    const rideType = await this.prisma.rideType.findFirst({ where: { id: dto.rideTypeId, isActive: true } });
    if (!rideType) throw new NotFoundException("Ride type not found.");

    const distanceKm = haversineDistanceKm(dto.pickupLat, dto.pickupLng, dto.dropLat, dto.dropLng);
    if (distanceKm < 0.1) {
      throw new BadRequestException("Pickup and drop locations are too close together.");
    }
    const fare = calculateFare({
      distanceKm,
      baseFare: rideType.baseFare,
      perKmFare: rideType.perKmFare,
      perMinuteFare: rideType.perMinuteFare,
      minFare: rideType.minFare,
    });

    let discountAmount = 0;
    let couponId: string | undefined;
    if (dto.couponCode) {
      const result = await this.coupons.computeDiscount({ code: dto.couponCode, userId, subtotal: fare });
      discountAmount = result.discount;
      couponId = result.coupon.id;
    }
    const estimatedFare = Math.max(0, Math.round((fare - discountAmount) * 100) / 100);
    const paymentMethod = dto.paymentMethod ?? "COD";

    if (paymentMethod === "WALLET") {
      await this.wallet.debit(userId, estimatedFare, "Ride payment");
    }

    const ride = await this.prisma.ride.create({
      data: {
        rideNumber: genRideNumber(),
        userId,
        rideTypeId: dto.rideTypeId,
        pickupAddress: dto.pickupAddress,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropAddress: dto.dropAddress,
        dropLat: dto.dropLat,
        dropLng: dto.dropLng,
        distanceKm: Math.round(distanceKm * 100) / 100,
        estimatedFare,
        couponId,
        paymentMethod,
        paymentStatus: paymentMethod === "WALLET" ? "PAID" : "PENDING",
        statusHistory: { create: { status: "REQUESTED", note: "Ride requested." } },
      },
    });

    if (couponId) await this.coupons.recordUsage(couponId);

    const assigned = await this.tryAssignDriver(ride.id, dto.rideTypeId, dto.pickupLat, dto.pickupLng);

    this.realtime.emitNewOrder({ rideId: ride.id, status: assigned ? "DRIVER_ASSIGNED" : "REQUESTED", kind: "ride" });

    this.notifications.notify(
      userId,
      `Ride #${ride.rideNumber}`,
      assigned
        ? `A driver has been ${STATUS_LABEL.DRIVER_ASSIGNED} for your ride.`
        : "Your ride has been requested. Looking for a nearby driver.",
      "ORDER",
    );

    return this.findOneForUser(userId, ride.id);
  }

  private async tryAssignDriver(rideId: string, rideTypeId: string, pickupLat: number, pickupLng: number) {
    const candidates = await this.prisma.driver.findMany({
      where: { rideTypeId, status: "APPROVED", isOnline: true, isAvailable: true },
    });
    if (candidates.length === 0) return false;

    let nearest = candidates[0];
    let nearestDist = Infinity;
    for (const d of candidates) {
      if (d.currentLat == null || d.currentLng == null) continue;
      const dist = haversineDistanceKm(pickupLat, pickupLng, d.currentLat, d.currentLng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = d;
      }
    }

    await this.prisma.$transaction([
      this.prisma.ride.update({
        where: { id: rideId },
        data: { driverId: nearest.id, status: "DRIVER_ASSIGNED", statusHistory: { create: { status: "DRIVER_ASSIGNED", note: `Assigned to ${nearest.name}` } } },
      }),
      this.prisma.driver.update({ where: { id: nearest.id }, data: { isAvailable: false } }),
    ]);
    return true;
  }

  async findMineList(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.ride.findMany({
        where: { userId },
        include: { rideType: true, driver: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.ride.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOneForUser(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: { id: rideId, userId },
      include: {
        rideType: true,
        driver: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
        review: true,
      },
    });
    if (!ride) throw new NotFoundException("Ride not found.");
    return ride;
  }

  async createReview(userId: string, rideId: string, rating: number, comment?: string) {
    const ride = await this.prisma.ride.findFirst({ where: { id: rideId, userId } });
    if (!ride) throw new NotFoundException("Ride not found.");
    if (ride.status !== "COMPLETED") {
      throw new BadRequestException("You can only rate a ride after it is completed.");
    }
    if (!ride.driverId) throw new BadRequestException("This ride has no driver to rate.");
    const existing = await this.prisma.rideReview.findUnique({ where: { rideId } });
    if (existing) throw new BadRequestException("You have already rated this ride.");

    const review = await this.prisma.rideReview.create({
      data: { userId, driverId: ride.driverId, rideId, rating, comment },
    });

    const agg = await this.prisma.rideReview.aggregate({
      where: { driverId: ride.driverId },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.driver.update({
      where: { id: ride.driverId },
      data: { ratingAvg: agg._avg.rating ?? rating, ratingCount: agg._count },
    });

    return review;
  }

  async cancel(userId: string, rideId: string, reason?: string) {
    const ride = await this.prisma.ride.findFirst({ where: { id: rideId, userId } });
    if (!ride) throw new NotFoundException("Ride not found.");
    if (!["REQUESTED", "DRIVER_ASSIGNED"].includes(ride.status)) {
      throw new ForbiddenException("This ride can no longer be cancelled.");
    }
    if (ride.driverId) {
      await this.prisma.driver.update({ where: { id: ride.driverId }, data: { isAvailable: true } });
    }
    return this.applyStatusChange(rideId, "CANCELLED", reason ?? "Cancelled by customer.");
  }

  // --- Admin ---
  async adminList(params: { status?: string; page: number; pageSize: number }) {
    const { status, page, pageSize } = params;
    const where = status ? { status: status as RideStatus } : {};
    const [items, total] = await Promise.all([
      this.prisma.ride.findMany({
        where,
        include: { user: true, driver: true, rideType: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.ride.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async adminDetail(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        user: true,
        driver: true,
        rideType: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
      },
    });
    if (!ride) throw new NotFoundException("Ride not found.");
    return ride;
  }

  async adminUpdateStatus(rideId: string, status: RideStatus, note?: string, actorId?: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException("Ride not found.");

    if ((status === "CANCELLED" || status === "COMPLETED") && ride.driverId) {
      await this.prisma.driver.update({ where: { id: ride.driverId }, data: { isAvailable: true } });
    }

    const extra: Record<string, unknown> = {};
    if (status === "ONGOING") extra.startedAt = new Date();
    if (status === "COMPLETED") {
      extra.completedAt = new Date();
      extra.finalFare = ride.estimatedFare;
      extra.paymentStatus = "PAID";
    }

    return this.applyStatusChange(rideId, status, note, actorId, extra);
  }

  private async applyStatusChange(
    rideId: string,
    status: RideStatus,
    note?: string,
    actorId?: string,
    extra: Record<string, unknown> = {},
  ) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException("Ride not found.");

    const allowed = ALLOWED_TRANSITIONS[ride.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot move ride from ${ride.status} to ${status}.`);
    }

    if (status === "CANCELLED" && ride.paymentMethod === "WALLET" && ride.paymentStatus === "PAID") {
      extra.paymentStatus = "REFUNDED";
    }

    const updated = await this.prisma.ride.update({
      where: { id: rideId },
      data: { status, ...extra, statusHistory: { create: { status, note } } },
    });

    if (status === "CANCELLED" && ride.paymentMethod === "WALLET" && ride.paymentStatus === "PAID") {
      await this.wallet.credit(ride.userId, ride.estimatedFare, "Refund for cancelled ride", rideId);
    }

    if (actorId) {
      await this.auditLog.record({
        adminUserId: actorId,
        action: "RIDE_STATUS_CHANGED",
        entity: "Ride",
        entityId: rideId,
        before: { status: ride.status },
        after: { status: updated.status, note },
      });
    }

    this.realtime.emitOrderUpdate(rideId, { rideId, status: updated.status, kind: "ride" });

    this.notifications.notify(
      ride.userId,
      `Ride #${ride.rideNumber}`,
      `Your ride is ${STATUS_LABEL[status]}.`,
      "ORDER",
    );

    return updated;
  }
}
