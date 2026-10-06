export const API_CONFIG = {
  // Use empty string to leverage Vite proxy, or environment override / localhost fallback
  BASE_URL: (import.meta as any).env?.VITE_API_BASE_URL || "",
  DEFAULT_API_KEY: "local-test-key-glencore-2026",
  API_KEY_HEADER: "X-API-Key",
  HEADERS: {
    API_KEY: "X-API-Key",
  },
  TIMEOUT: 180000, // Per-HTTP-request timeout (upload, one status poll, etc.) — NOT
  // the overall job-polling budget, which is useExtraction.ts's own maxTimeoutMs.
  POLL_INTERVAL_MS: 1500, // Poll job status every 1.5 seconds

  ENDPOINTS: {
    JOBS: "/api/v1/document/jobs",
    JOB_STATUS: (id: string) => `/api/v1/document/jobs/${id}`,
    JOB_PROGRESS: (id: string) => `/api/v1/document/jobs/${id}/progress`,
    JOB_RESULT: (id: string) => `/api/v1/document/jobs/${id}/result`,
    JOB_EXPORT: (id: string, format: string = "DOCX") => `/api/v1/document/jobs/${id}/export?format=${format}`,
    HEALTH: "/health",
    INFO: "/info",
    VERSION: "/version",
    // Works with any authenticated key (EXTRACT, TENANT_ADMIN, PLATFORM_ADMIN) —
    // returns the calling credential's own tenant/roles. Not gated like the routes below.
    WHOAMI: "/api/v1/tenants/me",
    // Tenant administration — every route below requires an X-API-Key issued with
    // TENANT_ADMIN (scoped to its own tenant) or PLATFORM_ADMIN (cross-tenant) — see
    // contexts/tenancy/interfaces/api/router.py; pass it explicitly, never the
    // regular working key (apiClient.ts's adminHeaders()).
    TENANTS: "/api/v1/tenants",
    TENANT_DETAIL: (tenantId: string) => `/api/v1/tenants/${encodeURIComponent(tenantId)}`,
    TENANT_API_KEYS: (tenantId: string) => `/api/v1/tenants/${encodeURIComponent(tenantId)}/api-keys`,
    TENANT_API_KEY_DETAIL: (tenantId: string, keyId: string) =>
      `/api/v1/tenants/${encodeURIComponent(tenantId)}/api-keys/${encodeURIComponent(keyId)}`,
    OBLIGATIONS: "/api/v1/obligations",
    UPDATE_OBLIGATION: (jobId: string, obligationId: string) =>
      `/api/v1/document/jobs/${encodeURIComponent(jobId)}/obligations/${encodeURIComponent(obligationId)}`,
    // Break-glass recovery for the one root PLATFORM_ADMIN credential —
    // both unauthenticated by design, see recovery_router.py.
    RECOVERY_REQUEST: "/api/v1/recovery/request",
    RECOVERY_CONFIRM: "/api/v1/recovery/confirm",
    // Per-tenant LLM providers (keys stored encrypted server-side, never returned).
    // LLM_PROVIDERS: the working key's own tenant (any role) — feeds the upload form.
    // TENANT_LLM_PROVIDERS*: admin management, same two-tier scoping as the routes above.
    LLM_PROVIDERS: "/api/v1/llm-providers",
    TENANT_LLM_PROVIDERS: (tenantId: string) =>
      `/api/v1/tenants/${encodeURIComponent(tenantId)}/llm-providers`,
    TENANT_LLM_PROVIDER: (tenantId: string, id: string) =>
      `/api/v1/tenants/${encodeURIComponent(tenantId)}/llm-providers/${encodeURIComponent(id)}`,
    // Per-tenant outbound mail (SMTP) settings; the password is encrypted server-side.
    TENANT_SMTP: (tenantId: string) => `/api/v1/tenants/${encodeURIComponent(tenantId)}/smtp`,
    TENANT_SMTP_TEST: (tenantId: string) => `/api/v1/tenants/${encodeURIComponent(tenantId)}/smtp/test`,
  },

  DEFAULT_OPTIONS: {
    language: "source",
  },

  // Providers and models are not hardcoded here: each tenant configures its own
  // in Settings > LLM Providers, and the upload form offers exactly those.

  LANGUAGES: [
    { code: "source", name: "Source Document Language (Auto-Detect)" },
    { code: "en", name: "English (eng)" },
    { code: "it", name: "Italian / Italiano (ita)" },
    { code: "es", name: "Spanish / Español" },
    { code: "fr", name: "French / Français" },
    { code: "de", name: "German / Deutsch" },
  ],
} as const;

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  notifyOverdueObligations: true,
  notifyDueSoonObligations: true,
  notifyObligationCompleted: true,
  notifyJobFailed: true,
  notifyJobPartial: true,
  notifyJobCompleted: false, // Off by default to avoid alert noise on high-volume runs
  dueSoonWindowDays: 14,
};

