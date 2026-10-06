import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "../../stores/useAppStore";
import { useAdminInactivityTimeout } from "../../hooks/useAdminInactivityTimeout";

/**
 * Gates the /admin route tree. `adminApiKey` alone isn't enough — a stale
 * key persisted from an earlier tab session might no longer be valid; only
 * a verified `adminRole` (set by useAppStore's setAdminApiKey after a real
 * apiWhoAmI() round trip) counts as authenticated here.
 *
 * Also mounts the admin-session inactivity timeout for as long as any
 * admin route is active — scoped here, not app-wide, so it only ever runs
 * while there's something privileged to protect.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const adminApiKey = useAppStore((s) => s.adminApiKey);
  const adminRole = useAppStore((s) => s.adminRole);
  const location = useLocation();

  useAdminInactivityTimeout(!!(adminApiKey && adminRole));

  if (!adminApiKey || !adminRole) {
    return <Navigate to="/settings" state={{ from: location, needsAdminKey: true }} replace />;
  }

  return <>{children}</>;
}
