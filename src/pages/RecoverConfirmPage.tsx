import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ShieldCheck, Copy, Check, AlertCircle, ArrowLeft } from "lucide-react";
import { apiConfirmRecovery } from "../lib/apiClient";
import appLogo from "../assets/logos/logo-glencore.svg";

/**
 * Deliberately does NOT call the confirm endpoint automatically on page
 * load — email clients and security scanners routinely "click" links to
 * pre-check them for malware, which would silently burn a single-use
 * recovery token before the real admin ever opens the email. Requires an
 * explicit button press, so only a human actually consumes the token.
 */
export function RecoverConfirmPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleConfirm = async () => {
    if (!token) return;
    setIsConfirming(true);
    setError(null);
    try {
      const result = await apiConfirmRecovery(token);
      setIssuedKey(result.plaintextKey);
    } catch (err: any) {
      const status = err?.response?.status;
      setError(
        status === 404
          ? "This recovery link is invalid, expired, or has already been used. Request a new one."
          : "Couldn't reach the server to confirm recovery. Check the backend is running and try again."
      );
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCopy = () => {
    if (!issuedKey) return;
    navigator.clipboard.writeText(issuedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src={appLogo} alt="Glencore" className="h-8 w-auto object-contain mb-4" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Confirm Platform Admin Recovery
          </h1>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
          {!token ? (
            <div className="flex items-start gap-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                No recovery token in this link. Request a new one from{" "}
                <Link to="/recover" className="font-semibold hover:underline">
                  the recovery page
                </Link>
                .
              </span>
            </div>
          ) : issuedKey ? (
            <>
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                New PLATFORM_ADMIN key issued
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Every previous PLATFORM_ADMIN key has been revoked. This is shown once — store it
                now.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 font-mono text-[11px] break-all text-slate-900 dark:text-slate-100">
                  {issuedKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold cursor-pointer transition-colors"
              >
                Continue to Sign In
              </button>
            </>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Confirming will issue a brand-new PLATFORM_ADMIN key and revoke every existing
                one. This cannot be undone, and the link works only once.
              </p>
              <button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                {isConfirming ? "Confirming..." : "Confirm & Issue New Key"}
              </button>
            </>
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
