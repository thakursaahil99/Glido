import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AuditLogService } from "../audit/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateRestaurantOwnerDto,
  UpdatePartnerRestaurantDto,
  UpsertMenuCategoryDto,
  UpsertMenuItemDto,
  UpsertRestaurantDto,
} from "./dto/restaurants.dto";

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService, private auditLog: AuditLogService) {}

  // --- Public ---
  async list(params: { cityId?: string; search?: string; isVegOnly?: boolean; page: number; pageSize: number }) {
    const { cityId, search, page, pageSize } = params;
    const where: any = { status: "APPROVED" };
    if (cityId) where.cityId = cityId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { cuisineTags: { contains: search } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.restaurant.findMany({
        where,
        orderBy: [{ ratingAvg: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.restaurant.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async detail(id: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id, status: "APPROVED" },
      include: {
        menuCategories: { orderBy: { sortOrder: "asc" } },
        menuItems: {
          where: { isAvailable: true },
          include: { addons: true },
          orderBy: { sortOrder: "asc" },
        },
        city: true,
      },
    });
    if (!restaurant) throw new NotFoundException("Restaurant not found.");
    return restaurant;
  }

  // --- Admin ---
  adminList(params: { status?: string; page: number; pageSize: number }) {
    const { status, page, pageSize } = params;
    const where: any = status ? { status } : {};
    return Promise.all([
      this.prisma.restaurant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.restaurant.count({ where }),
    ]).then(([items, total]) => ({ items, total, page, pageSize }));
  }

  async adminDetail(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        menuCategories: { orderBy: { sortOrder: "asc" } },
        menuItems: { include: { addons: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!restaurant) throw new NotFoundException("Restaurant not found.");
    return restaurant;
  }

  create(dto: UpsertRestaurantDto) {
    return this.prisma.restaurant.create({ data: dto });
  }

  async update(id: string, dto: UpsertRestaurantDto | UpdatePartnerRestaurantDto) {
    await this.ensureExists(id);
    return this.prisma.restaurant.update({ where: { id }, data: dto });
  }

  async updateStatus(id: string, status: string, actorId?: string, ip?: string) {
    const before = await this.ensureExists(id);
    const updated = await this.prisma.restaurant.update({ where: { id }, data: { status: status as any } });
    if (actorId) {
      await this.auditLog.record({
        adminUserId: actorId,
        action: "RESTAURANT_STATUS_CHANGED",
        entity: "Restaurant",
        entityId: id,
        before: { status: before.status },
        after: { status: updated.status },
        ip,
      });
    }
    return updated;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.restaurant.delete({ where: { id } });
    return { message: "Restaurant deleted." };
  }

  /** Creates a RESTAURANT_OWNER login for a restaurant that doesn't have a partner account yet. */
  async createOwnerAccount(id: string, dto: CreateRestaurantOwnerDto) {
    const restaurant = await this.ensureExists(id);
    if (restaurant.ownerUserId) {
      throw new BadRequestException("This restaurant already has a partner account.");
    }
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("A user with this email already exists.");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const owner = await this.prisma.user.create({
      data: { name: dto.name, email, passwordHash, role: "RESTAURANT_OWNER" },
    });
    await this.prisma.restaurant.update({ where: { id }, data: { ownerUserId: owner.id } });
    return { message: "Partner account created.", email: owner.email };
  }

  /** Resolves the restaurant owned by this user, or throws — used by every /partner endpoint. */
  async findByOwner(ownerUserId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { ownerUserId },
      include: {
        menuCategories: { orderBy: { sortOrder: "asc" } },
        menuItems: { include: { addons: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!restaurant) throw new NotFoundException("No restaurant is linked to this account.");
    return restaurant;
  }

  private async ensureExists(id: string) {
    const r = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!r) throw new NotFoundException("Restaurant not found.");
    return r;
  }

  // --- Menu categories ---
  async createCategory(restaurantId: string, dto: UpsertMenuCategoryDto) {
    await this.ensureExists(restaurantId);
    return this.prisma.menuCategory.create({ data: { ...dto, restaurantId } });
  }

  async updateCategory(restaurantId: string, categoryId: string, dto: UpsertMenuCategoryDto) {
    const cat = await this.prisma.menuCategory.findFirst({ where: { id: categoryId, restaurantId } });
    if (!cat) throw new NotFoundException("Category not found.");
    return this.prisma.menuCategory.update({ where: { id: categoryId }, data: dto });
  }

  async deleteCategory(restaurantId: string, categoryId: string) {
    const cat = await this.prisma.menuCategory.findFirst({ where: { id: categoryId, restaurantId } });
    if (!cat) throw new NotFoundException("Category not found.");
    await this.prisma.menuCategory.delete({ where: { id: categoryId } });
    return { message: "Category deleted." };
  }

  // --- Menu items ---
  async createItem(restaurantId: string, dto: UpsertMenuItemDto) {
    await this.ensureExists(restaurantId);
    const { addons, ...rest } = dto;
    return this.prisma.menuItem.create({
      data: {
        ...rest,
        restaurantId,
        addons: addons?.length ? { create: addons } : undefined,
      },
      include: { addons: true },
    });
  }

  async updateItem(restaurantId: string, itemId: string, dto: UpsertMenuItemDto) {
    const item = await this.prisma.menuItem.findFirst({ where: { id: itemId, restaurantId } });
    if (!item) throw new NotFoundException("Menu item not found.");
    const { addons, ...rest } = dto;
    if (addons) {
      await this.prisma.menuItemAddon.deleteMany({ where: { menuItemId: itemId } });
    }
    return this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...rest,
        addons: addons?.length ? { create: addons } : undefined,
      },
      include: { addons: true },
    });
  }

  async deleteItem(restaurantId: string, itemId: string) {
    const item = await this.prisma.menuItem.findFirst({ where: { id: itemId, restaurantId } });
    if (!item) throw new NotFoundException("Menu item not found.");
    await this.prisma.menuItem.delete({ where: { id: itemId } });
    return { message: "Menu item deleted." };
  }
}
