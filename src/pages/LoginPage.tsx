import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { KeyRound, ShieldCheck, Loader2 } from "lucide-react";
import { useAppStore } from "../stores/useAppStore";
import { apiWhoAmI } from "../lib/apiClient";
import appLogo from "../assets/logos/logo-glencore.svg";

/**
 * The single place a key is entered. Previously this was split across two
 * independent cards in Settings (a regular key and a separate admin key),
 * with nothing keeping them in sync — confusing, and easy to end up with
 * one fresh key and one stale one. One key here, resolved once via
 * apiWhoAmI, feeds both of useAppStore's existing identity slots and
 * routes based on whatever roles come back — the backend already lets a
 * single key carry multiple roles at once (e.g. EXTRACT + PLATFORM_ADMIN),
 * so this isn't a new capability, just no longer artificially split in two
 * on the frontend.
 */
export function LoginPage() {
  const [keyInput, setKeyInput] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setApiKey = useAppStore((s) => s.setApiKey);
  const setAdminApiKey = useAppStore((s) => s.setAdminApiKey);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key) {
      setError("Enter an API key.");
      return;
    }
    setIsSigningIn(true);
    setError(null);
    try {
      const who = await apiWhoAmI(key);
      const isAdmin = who.roles.includes("TENANT_ADMIN") || who.roles.includes("PLATFORM_ADMIN");
      const isExtract = who.roles.includes("EXTRACT");

      // Feed both of the store's existing identity slots from this one
      // verified key — each setter re-verifies internally (a second/third
      // whoami round trip), which is a little redundant but keeps this
      // reusing the same tested paths Settings and RequireAdmin already
      // depend on, rather than duplicating their logic here.
      setApiKey(key);
      if (isAdmin) {
        await setAdminApiKey(key);
      }

      const from = (location.state as { from?: Location })?.from?.pathname;
      if (from && from !== "/login") {
        navigate(from, { replace: true });
      } else if (isExtract) {
        navigate("/dashboard", { replace: true });
      } else {
        // Admin-only key (no EXTRACT role) — the regular extraction routes
        // would just 401 for it, so land directly on the one place it can
        // actually do something.
        navigate("/admin/tenants", { replace: true });
      }
    } catch (err: any) {
      const status = err?.response?.status;
      setError(
        status === 401 || status === 403
          ? "That key isn't valid — check it was copied correctly, or ask a PLATFORM_ADMIN to issue a new one."
          : "Couldn't reach the server to verify that key. Check the backend is running and try again."
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={appLogo} alt="Glencore" className="h-8 w-auto object-contain mb-4" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">DocExtract Intelligence</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sign in with your API key</p>
        </div>

        <form
          onSubmit={handleSignIn}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">API Key</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                autoFocus
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Paste your API key"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Any role works — EXTRACT, TENANT_ADMIN, or PLATFORM_ADMIN (or a key with several). You'll land
              on the right place automatically.
            </p>
          </div>

          {error && (
            <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400 mt-5">
          Don't have a key? Ask a PLATFORM_ADMIN to issue one for your tenant.
        </p>
        <p className="text-center text-[11px] text-slate-400 mt-1.5">
          <Link to="/recover" className="hover:underline hover:text-slate-500">
            Forgot your platform admin key?
          </Link>
        </p>
      </div>
    </div>
  );
}
