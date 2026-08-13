export const API_CONFIG = {
  // Use empty string to leverage Vite proxy, or environment override / localhost fallback
  BASE_URL: (import.meta as any).env?.VITE_API_BASE_URL || "",
  DEFAULT_API_KEY: "local-test-key-glencore-2026",
  API_KEY_HEADER: "X-API-Key",
  HEADERS: {
    API_KEY: "X-API-Key",
  },
  TIMEOUT: 180000, // 3 minutes for async extraction / polling
  POLL_INTERVAL_MS: 1500, // Poll job status every 1.5 seconds

  ENDPOINTS: {
    JOBS: "/api/v1/document/jobs",
    JOB_STATUS: (id: string) => `/api/v1/document/jobs/${id}`,
    JOB_RESULT: (id: string) => `/api/v1/document/jobs/${id}/result`,
    JOB_EXPORT: (id: string, format: string = "DOCX") => `/api/v1/document/jobs/${id}/export?format=${format}`,
    EXTRACT: "/api/v1/document/extract",
    EXPORT_FILE: "/api/v1/document/export",
    KEYS_TEST: "/api/v1/keys/test",
    HEALTH: "/health",
    INFO: "/info",
    VERSION: "/version",
    NOTIFICATIONS_SETTINGS: "/api/v1/notifications/settings",
    TENANT_NOTIFICATIONS_SETTINGS: (tenantId: string) => `/api/v1/notifications/settings/${encodeURIComponent(tenantId)}`,
    NOTIFICATIONS_TEST: "/api/v1/notifications/test",
    TENANTS: "/api/v1/tenants",
    OBLIGATIONS: "/api/v1/obligations",
    UPDATE_OBLIGATION: (jobId: string, obligationId: string) =>
      `/api/v1/document/jobs/${encodeURIComponent(jobId)}/obligations/${encodeURIComponent(obligationId)}`,
  },

  DEFAULT_OPTIONS: {
    temperature: 0.1,
    provider: "GEMINI",
    model: "gemini-3.5-flash",
    language: "source",
  },

  PROVIDERS: [
    {
      id: "GEMINI",
      name: "Google Gemini",
      defaultModel: "gemini-3.5-flash",
      models: [
        { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash (Primary Default)" },
        { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview" },
        { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite (Fast GA Fallback)" },
        { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview (Deep Reasoning)" },
      ],
    },
    {
      id: "CLAUDE",
      name: "Anthropic Claude (SDK Engine)",
      defaultModel: "claude-opus-5",
      models: [
        { id: "claude-opus-5", name: "Claude Opus 5 (Frontier Legal Reasoner)" },
        { id: "claude-sonnet-5", name: "Claude Sonnet 5 (High Recall Balanced)" },
        { id: "claude-haiku-4-5", name: "Claude Haiku 4.5 (High Speed Classifier)" },
        { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet (GA Baseline)" },
      ],
    },
    {
      id: "OPENAI",
      name: "OpenAI GPT-4o",
      defaultModel: "gpt-4o-mini",
      models: [
        { id: "gpt-4o", name: "GPT-4o (Omni Reasoning)" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini (High Efficiency)" },
      ],
    },
    {
      id: "OLLAMA",
      name: "Ollama (On-Premises / Air-Gapped)",
      defaultModel: "qwen3:1.7b",
      models: [
        { id: "qwen3:1.7b", name: "Qwen 3 1.7B (Local Model)" },
      ],
    },
  ],

  LANGUAGES: [
    { code: "source", name: "Source Document Language (Auto-Detect)" },
    { code: "en", name: "English (eng)" },
    { code: "it", name: "Italian / Italiano (ita)" },
    { code: "es", name: "Spanish / Español" },
    { code: "fr", name: "French / Français" },
    { code: "de", name: "German / Deutsch" },
  ],
} as const;

export const DEFAULT_TENANT_EMAIL_SETTINGS = {
  glencore: {
    tenantId: "glencore",
    enabled: true,
    from: "compliance-alerts@glencore.internal",
    subjectPrefix: "[Obligation Extraction - Glencore]",
    resultBaseUrl: "http://localhost:5173/library/",
    notifyOn: ["PARTIAL", "FAILED", "DEAD_LETTER"] as ("PARTIAL" | "FAILED" | "DEAD_LETTER" | "COMPLETED")[],
    includeDocumentName: false,
    includeErrorDetail: true,
    maxErrorDetailChars: 300,
    recipients: ["ehs-alerts@glencore.com", "compliance-ops@glencore.com"],
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUsername: "qode.ai.noreply@gmail.com",
    smtpPasswordConfigured: false,
  },
  default: {
    tenantId: "default",
    enabled: false,
    from: "no-reply@compliance.internal",
    subjectPrefix: "[Obligation Extraction]",
    resultBaseUrl: "http://localhost:5173/library/",
    notifyOn: ["PARTIAL", "FAILED", "DEAD_LETTER"] as ("PARTIAL" | "FAILED" | "DEAD_LETTER" | "COMPLETED")[],
    includeDocumentName: false,
    includeErrorDetail: true,
    maxErrorDetailChars: 300,
    recipients: ["ops@example.com"],
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUsername: "qode.ai.noreply@gmail.com",
    smtpPasswordConfigured: false,
  },
};

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  notifyOverdueObligations: true,
  notifyDueSoonObligations: true,
  notifyObligationCompleted: true,
  notifyJobFailed: true,
  notifyJobPartial: true,
  notifyJobCompleted: false, // Off by default to avoid alert noise on high-volume runs
  dueSoonWindowDays: 14,
};

