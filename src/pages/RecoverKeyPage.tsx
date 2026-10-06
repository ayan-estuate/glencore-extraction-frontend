import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Mail, ArrowLeft } from "lucide-react";
import { apiRequestRecovery } from "../lib/apiClient";
import appLogo from "../assets/logos/logo-glencore.svg";

/**
 * Break-glass recovery for the one root PLATFORM_ADMIN credential — not a
 * general self-service "forgot my key" for every tenant's users. Takes no
 * input: there's nothing to identify beyond "I have access to the one
 * registered recovery inbox," so this is a single blind trigger, not a form.
 * Always shows the same generic confirmation regardless of outcome — it
 * never reveals whether recovery is actually configured for this
 * deployment (mirrors the backend's own request endpoint, which does the
 * same for the same reason).
 */
export function RecoverKeyPage() {
  const [hasRequested, setHasRequested] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const navigate = useNavigate();

  const handleRequest = async () => {
    setIsRequesting(true);
    try {
      await apiRequestRecovery();
    } catch {
      // Still show the generic confirmation — a network/server error here
      // shouldn't tell an unauthenticated caller anything more than a
      // successful request would. If it's a real outage, the admin inbox
      // just won't get a link, same observable outcome as "not configured."
    } finally {
      setIsRequesting(false);
      setHasRequested(true);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={appLogo} alt="Glencore" className="h-8 w-auto object-contain mb-4" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Platform Admin Recovery
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
            Break-glass recovery for the root PLATFORM_ADMIN credential only — not for regular
            tenant keys.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
          {!hasRequested ? (
            <>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  If recovery is configured for this deployment, a reset link will be sent to the
                  one registered recovery address. Opening it issues a brand-new PLATFORM_ADMIN
                  key and revokes every existing one.
                </p>
              </div>
              <button
                onClick={handleRequest}
                disabled={isRequesting}
                className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Mail className="w-4 h-4" />
                {isRequesting ? "Requesting..." : "Send Recovery Link"}
              </button>
            </>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                If platform-admin recovery is configured for this deployment, a reset link has
                been sent to the registered address. It expires in 30 minutes and works once.
              </p>
            </div>
          )}

          <button
            onClick={() => navigate("/login")}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
