import { useCallback, useEffect, useState } from "react";
import { apiListLlmProviders, normalizeError } from "../lib/apiClient";
import { LlmProvider } from "../types/api";

/**
 * The LLM providers configured for the caller's tenant (Settings > LLM Providers).
 * Any authenticated key can list them; only admin keys can change them.
 */
export function useLlmProviders() {
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setProviders(await apiListLlmProviders());
      setError(null);
    } catch (err: unknown) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { providers, isLoading, error, refresh };
}
