import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertGroceryCategoryDto, UpsertGroceryProductDto } from "./dto/grocery-catalog.dto";

@Injectable()
export class GroceryCatalogService {
  constructor(private prisma: PrismaService) {}

  // --- Public ---
  listActiveCategories() {
    return this.prisma.groceryCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async listProducts(params: { categoryId?: string; search?: string; page: number; pageSize: number }) {
    const { categoryId, search, page, pageSize } = params;
    const where: any = { isAvailable: true, category: { isActive: true } };
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.groceryProduct.findMany({
        where,
        include: { category: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.groceryProduct.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async productDetail(id: string) {
    const product = await this.prisma.groceryProduct.findFirst({
      where: { id, isAvailable: true },
      include: { category: true },
    });
    if (!product) throw new NotFoundException("Product not found.");
    return product;
  }

  // --- Admin: categories ---
  listAllCategories() {
    return this.prisma.groceryCategory.findMany({ orderBy: { sortOrder: "asc" } });
  }

  createCategory(dto: UpsertGroceryCategoryDto) {
    return this.prisma.groceryCategory.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpsertGroceryCategoryDto) {
    const existing = await this.prisma.groceryCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Category not found.");
    return this.prisma.groceryCategory.update({ where: { id }, data: dto });
  }

  async removeCategory(id: string) {
    const existing = await this.prisma.groceryCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Category not found.");
    await this.prisma.groceryCategory.delete({ where: { id } });
    return { message: "Category deleted." };
  }

  // --- Admin: products ---
  adminListProducts(params: { categoryId?: string; page: number; pageSize: number }) {
    const { categoryId, page, pageSize } = params;
    const where = categoryId ? { categoryId } : {};
    return Promise.all([
      this.prisma.groceryProduct.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.groceryProduct.count({ where }),
    ]).then(([items, total]) => ({ items, total, page, pageSize }));
  }

  createProduct(dto: UpsertGroceryProductDto) {
    return this.prisma.groceryProduct.create({ data: dto as any });
  }

  async updateProduct(id: string, dto: UpsertGroceryProductDto) {
    const existing = await this.prisma.groceryProduct.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Product not found.");
    return this.prisma.groceryProduct.update({ where: { id }, data: dto as any });
  }

  async removeProduct(id: string) {
    const existing = await this.prisma.groceryProduct.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Product not found.");
    await this.prisma.groceryProduct.delete({ where: { id } });
    return { message: "Product deleted." };
  }
}
