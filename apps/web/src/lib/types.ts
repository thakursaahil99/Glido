import type { AdminRole, OrderStatus, PaymentMethod, PaymentStatus, Permission, UserRole } from "@glido/shared";

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  adminRole?: AdminRole | null;
  permissions?: Permission[];
  referralCode?: string;
  loyaltyPoints?: number;
}

export interface ReferralSummary {
  referralCode: string;
  referredCount: number;
  totalEarned: number;
}

export interface SupportMessage {
  id: string;
  userId: string;
  senderRole: "CUSTOMER" | "ADMIN";
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  name: string | null;
  email: string | null;
  adminRole: AdminRole;
  permissions: Permission[];
  status: "ACTIVE" | "BLOCKED" | "SUSPENDED";
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string | null } | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  beforeJson?: string | null;
  afterJson?: string | null;
  createdAt: string;
  admin: { name: string | null; email: string | null };
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string | null;
  cityId?: string | null;
  pincode?: string | null;
  isDefault: boolean;
  instructions?: string | null;
}

export interface City {
  id: string;
  name: string;
  state?: string | null;
  centerLat?: number | null;
  centerLng?: number | null;
  serviceRadiusKm: number;
  isActive: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string | null;
  cuisineTags?: string | null;
  imageUrl?: string | null;
  cityId?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  isOpen: boolean;
  avgDeliveryTimeMin: number;
  deliveryFee: number;
  packagingFee: number;
  minOrderAmount: number;
  ratingAvg: number;
  ratingCount: number;
  menuCategories?: MenuCategory[];
  menuItems?: MenuItem[];
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuItemAddon {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isVeg: boolean;
  isAvailable: boolean;
  addons: MenuItemAddon[];
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  addonsJson?: string | null;
  subtotal: number;
}

export interface OrderStatusHistoryEntry {
  id: string;
  status: OrderStatus;
  note?: string | null;
  changedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  packagingFee: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryInstructions?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  restaurant?: Restaurant;
  address?: Address;
  items: OrderItem[];
  statusHistory?: OrderStatusHistoryEntry[];
  review?: { id: string; rating: number; comment?: string | null } | null;
  deliveryPartner?: DeliveryPartner | null;
}

export interface PlatformSettings {
  taxRatePercent: number;
  groceryDeliveryFee: number;
  groceryFreeDeliveryThreshold: number;
}

export interface WalletSummary {
  balance: number;
}

export interface WalletTransaction {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  reason: string;
  referenceId?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: "ORDER" | "PROMOTION" | "SYSTEM";
  isRead: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  link?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  type: "PERCENT" | "FLAT";
  value: number;
  maxDiscount?: number | null;
  minOrderAmount: number;
  usageLimit?: number | null;
  perUserLimit: number;
  usedCount: number;
  isActive: boolean;
}

// --- Grocery ---

export interface GroceryCategory {
  id: string;
  name: string;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface GroceryProduct {
  id: string;
  categoryId: string | null;
  category?: GroceryCategory;
  name: string;
  description?: string | null;
  brand?: string | null;
  imageUrl?: string | null;
  unit: string;
  mrp: number;
  price: number;
  stockQty: number;
  isAvailable: boolean;
}

export interface GroceryOrderItem {
  id: string;
  productId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  subtotal: number;
}

export interface GroceryOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryInstructions?: string | null;
  createdAt: string;
  address?: Address;
  user?: { name: string | null; email: string | null };
  items: GroceryOrderItem[];
  statusHistory?: OrderStatusHistoryEntry[];
  deliveryPartner?: DeliveryPartner | null;
}

// --- Cab ---

export type RideStatus = "REQUESTED" | "DRIVER_ASSIGNED" | "DRIVER_ARRIVED" | "ONGOING" | "COMPLETED" | "CANCELLED";

export interface RideType {
  id: string;
  name: string;
  imageUrl?: string | null;
  baseFare: number;
  perKmFare: number;
  perMinuteFare: number;
  minFare: number;
  cancellationFee: number;
  capacity: number;
  isActive: boolean;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string | null;
  vehicleNumber: string;
  vehicleModel?: string | null;
  rideTypeId: string;
  rideType?: RideType;
  city?: City;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  isOnline: boolean;
  isAvailable: boolean;
  currentLat?: number | null;
  currentLng?: number | null;
  ratingAvg: number;
  ratingCount: number;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string | null;
  vehicleType: string;
  vehicleNumber?: string | null;
  city?: City;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  isOnline: boolean;
  isAvailable: boolean;
  currentLat?: number | null;
  currentLng?: number | null;
  ratingAvg: number;
  ratingCount: number;
}

export interface RideStatusHistoryEntry {
  id: string;
  status: RideStatus;
  note?: string | null;
  changedAt: string;
}

export interface Ride {
  id: string;
  rideNumber: string;
  status: RideStatus;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropAddress: string;
  dropLat: number;
  dropLng: number;
  distanceKm: number;
  estimatedFare: number;
  finalFare?: number | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  requestedAt: string;
  rideType?: RideType;
  driver?: Driver | null;
  user?: { name: string | null; email: string | null };
  statusHistory?: RideStatusHistoryEntry[];
}
