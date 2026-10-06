import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "../../stores/useAppStore";

/**
 * Gates the whole app (wraps the route tree in App.tsx, except /login
 * itself). Previously nothing checked `apiKey` at all — getActiveApiKey()
 * silently fell back to a baked-in placeholder key, so every page rendered
 * normally with no indication that nothing real was authenticated.
 *
 * `apiKeyVerified` is a tri-state specifically so this can tell "still
 * checking a persisted key at boot" (null) apart from "checked, no good"
 * (false) — apiKey alone can't make that distinction, and redirecting
 * during the brief verification window would bounce a real returning
 * session to /login before it had a chance to resolve.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const apiKey = useAppStore((s) => s.apiKey);
  const apiKeyVerified = useAppStore((s) => s.apiKeyVerified);
  const location = useLocation();

  if (apiKey && apiKeyVerified === null) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Verifying session...
        </div>
      </div>
    );
  }

  if (!apiKey || apiKeyVerified === false) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
