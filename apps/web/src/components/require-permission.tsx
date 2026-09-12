"use client";

import { Lock } from "lucide-react";
import type { Permission } from "@glido/shared";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import { EmptyState } from "./empty-state";

export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!hasPermission(user, permission)) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access to this"
        description="Ask a Super Admin to grant you the required permission from Admin → Staff."
      />
    );
  }

  return <>{children}</>;
}
