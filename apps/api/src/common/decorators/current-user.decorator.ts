import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AdminRole, Permission } from "@glido/shared";

export interface AuthUser {
  id: string;
  role: "CUSTOMER" | "ADMIN" | "RESTAURANT_OWNER" | "DELIVERY_PARTNER";
  email?: string | null;
  phone?: string | null;
  adminRole?: AdminRole | null;
  permissions?: Permission[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
