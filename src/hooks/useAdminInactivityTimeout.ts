import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../stores/useAppStore";

const TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll"] as const;

/**
 * Auto-clears the admin session after a period of inactivity, while any
 * admin route is mounted (`enabled`). Meant to bound exposure on an
 * unattended shared machine — a mitigation, not a security control with
 * real teeth (see useAppStore's adminApiKey doc comment). 20 minutes is
 * deliberately generous; this isn't trying to be a strict session timeout.
 */
export function useAdminInactivityTimeout(enabled: boolean): void {
  const clearAdminSession = useAppStore((s) => s.clearAdminSession);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        clearAdminSession();
        navigate("/dashboard");
      }, TIMEOUT_MS);
    };

    reset();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [enabled, clearAdminSession, navigate]);
}
