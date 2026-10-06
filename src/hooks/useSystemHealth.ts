import { useEffect, useState } from "react";
import { apiGetHealth } from "../lib/apiClient";

export type SystemHealth = "checking" | "healthy" | "degraded" | "down";

/** The backend's real /health status, re-checked every 30 seconds. */
export function useSystemHealth(): SystemHealth {
  const [health, setHealth] = useState<SystemHealth>("checking");

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const h = await apiGetHealth();
        if (!cancelled) setHealth(h.status === "UP" ? "healthy" : h.status === "DEGRADED" ? "degraded" : "down");
      } catch {
        if (!cancelled) setHealth("down");
      }
    };
    check();
    const t = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return health;
}
