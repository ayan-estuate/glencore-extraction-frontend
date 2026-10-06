import { TenantView } from "../types/api";

/**
 * The tenant an admin screen should act on. A TENANT_ADMIN is fixed to its own
 * tenant. For a PLATFORM_ADMIN it is the remembered selection only if that tenant
 * really exists on the server (a stale id left in the browser, or a database that
 * was reset, must never reach the API); otherwise the admin key's own tenant, then
 * the first tenant the server returned.
 */
export function effectiveTenantId(opts: {
  adminRole: "TENANT_ADMIN" | "PLATFORM_ADMIN" | null;
  adminScopeTenantId: string | null;
  activeTenantId: string;
  tenants: Pick<TenantView, "id">[];
  identityTenantId?: string | null;
}): string {
  const { adminRole, adminScopeTenantId, activeTenantId, tenants, identityTenantId } = opts;
  if (adminRole === "TENANT_ADMIN" && adminScopeTenantId) return adminScopeTenantId;
  const exists = (id: string | null | undefined) => !!id && tenants.some((t) => t.id === id);
  if (exists(activeTenantId)) return activeTenantId;
  if (exists(identityTenantId)) return identityTenantId as string;
  return tenants[0]?.id ?? identityTenantId ?? "";
}
