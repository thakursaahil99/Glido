import type { Permission } from "@glido/shared";
import type { User } from "./types";

export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  if (user.adminRole === "SUPER_ADMIN") return true;
  return (user.permissions ?? []).includes(permission);
}
