export const ORDER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const RESTAURANT_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;
export type RestaurantStatus = (typeof RESTAURANT_STATUSES)[number];

export const USER_ROLES = ["CUSTOMER", "ADMIN", "RESTAURANT_OWNER", "DELIVERY_PARTNER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PAYMENT_METHODS = ["COD", "ONLINE", "WALLET"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const COUPON_TYPES = ["PERCENT", "FLAT"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

// --- RBAC: admin roles, permissions, and role → default-permission map ---
// Enforced by apps/api/src/common/guards/permissions.guard.ts and rendered by
// the admin panel's staff management screen (apps/web/src/app/admin/staff).

export const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "OPERATIONS_MANAGER",
  "FOOD_MANAGER",
  "GROCERY_MANAGER",
  "CAB_MANAGER",
  "FINANCE_MANAGER",
  "SUPPORT_MANAGER",
  "MARKETING_MANAGER",
  "DELIVERY_MANAGER",
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  OPERATIONS_MANAGER: "Operations Manager",
  FOOD_MANAGER: "Food Manager",
  GROCERY_MANAGER: "Grocery Manager",
  CAB_MANAGER: "Cab Manager",
  FINANCE_MANAGER: "Finance Manager",
  SUPPORT_MANAGER: "Support Manager",
  MARKETING_MANAGER: "Marketing Manager",
  DELIVERY_MANAGER: "Delivery Manager",
};

// Every permission key the platform enforces (or reserves for Grocery/Cab,
// which are not built yet — see reservedForModule below). SUPER_ADMIN is
// exempt from all of these checks (see the guard).
export const PERMISSIONS = [
  "view_dashboard",
  "view_reports",
  "manage_users",
  "manage_restaurants",
  "manage_orders",
  "manage_coupons",
  "manage_banners",
  "manage_settings",
  "manage_payments_refunds",
  "manage_staff",
  "manage_grocery",
  "manage_rides",
  "manage_drivers",
  "manage_support",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  view_dashboard: "View dashboard",
  view_reports: "View reports & analytics",
  manage_users: "Manage customers (view/block/unblock)",
  manage_restaurants: "Manage restaurants & menus (incl. approval)",
  manage_orders: "Manage orders & order status",
  manage_coupons: "Manage coupons & offers",
  manage_banners: "Manage homepage banners (CMS)",
  manage_settings: "Manage cities & platform settings",
  manage_payments_refunds: "View payments & issue refunds",
  manage_staff: "Manage admin employees & their permissions",
  manage_grocery: "Manage grocery stores & products",
  manage_rides: "Manage cab rides & fares",
  manage_drivers: "Manage cab drivers & delivery partners",
  manage_support: "Reply to customer support chats",
};

/** Permissions a newly-created employee of this role starts with — editable per employee afterwards. */
export const DEFAULT_PERMISSIONS_BY_ADMIN_ROLE: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: [...PERMISSIONS], // bypasses checks anyway; listed here just for display
  OPERATIONS_MANAGER: ["view_dashboard", "view_reports", "manage_users", "manage_orders", "manage_restaurants", "manage_settings"],
  FOOD_MANAGER: ["view_dashboard", "manage_restaurants", "manage_orders"],
  GROCERY_MANAGER: ["view_dashboard", "manage_grocery"],
  CAB_MANAGER: ["view_dashboard", "manage_rides"],
  FINANCE_MANAGER: ["view_dashboard", "view_reports", "manage_payments_refunds"],
  SUPPORT_MANAGER: ["view_dashboard", "manage_users", "manage_orders", "manage_support"],
  MARKETING_MANAGER: ["view_dashboard", "manage_coupons", "manage_banners"],
  DELIVERY_MANAGER: ["view_dashboard", "manage_drivers"],
};

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export const BRAND = {
  name: "Glido",
  tagline: "Food, groceries and rides — glide through your day.",
  // Shares its brand orange with the sibling glideinbir.vercel.app project.
  colors: {
    primary: "#FF6A00",
    primaryDark: "#C94F00",
    primaryLight: "#FFF1E6",
    accent: "#F99C00",
    success: "#0EA36C",
    danger: "#E40014",
    ink: "#101418",
    surface: "#FFFFFF",
    muted: "#5B6470",
    border: "#E5E7EB",
    bg: "#F7F7F8",
  },
} as const;
