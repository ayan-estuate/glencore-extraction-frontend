import React from "react";
import { WifiOff } from "lucide-react";
import { useAppStore } from "../../stores/useAppStore";
import { API_CONFIG } from "../../config/api.config";

/**
 * A persistent, impossible-to-miss banner — not a toast — because "the
 * backend is unreachable" isn't a one-off event to acknowledge and dismiss,
 * it's an ongoing condition that stays true until connectivity is actually
 * restored. Before this existed, most call sites (e.g. useAppStore's
 * fetchJobs) only did console.warn on a network failure, so the UI gave
 * zero visible indication anything was wrong — it just looked like nothing
 * was happening. Driven by useAppStore's backendUnreachable flag, set by
 * apiClient.ts's global response interceptor, not by any individual call
 * site, so this covers every request in the app uniformly.
 *
 * Mounted at the top of App.tsx, outside the authenticated layout — the
 * backend being unreachable matters just as much on /login (where it would
 * otherwise look like a sign-in attempt just silently did nothing).
 */
export function BackendStatusBanner() {
  const backendUnreachable = useAppStore((s) => s.backendUnreachable);

  if (!backendUnreachable) return null;

  const backendUrl = API_CONFIG.BASE_URL || "the backend (via the dev proxy)";

  return (
    <div className="sticky top-0 z-50 w-full bg-rose-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold shadow-md">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>
        Can't reach the backend ({backendUrl}) — check it's running, or that
        VITE_API_BASE_URL/CORS settings are correct.
      </span>
    </div>
  );
}
