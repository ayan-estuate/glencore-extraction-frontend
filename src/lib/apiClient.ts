import axios, { AxiosInstance } from "axios";
import { saveAs } from "file-saver";
import { API_CONFIG } from "../config/api.config";
import { keysToCamel, keysToSnake } from "./caseConvert";
// useAppStore.ts itself imports from this file (apiWhoAmI etc.), making
// this a circular import. Safe here specifically because this binding is
// only ever called from inside the interceptor callback below — by the
// time that runs (on a real HTTP response), both modules have long
// finished initializing. Never reference useAppStore at this file's
// top/module level, only inside a function body.
import { useAppStore } from "../stores/useAppStore";
import {
  ExtractionResponse,
  ExtractionOptions,
  JobAccepted,
  JobStatusView,
  JobSummary,
  ServiceHealth,
  SystemInfo,
  SystemVersion,
  ApiKeyTestResponse,
  ErrorResponse,
  ObligationUpdateRequest,
  ObligationSummaryView,
  ObligationData,
  TenantView,
  CreateTenantRequest,
  UpdateTenantRequest,
  ApiKeyView,
  IssueApiKeyRequest,
  ApiKeyIssuedResponse,
  WhoAmIResponse,
  RecoveryRequestedResponse,
  RecoveryConfirmedResponse,
  LlmProvider,
  LlmProviderCreate,
  LlmProviderUpdate,
  JobProgress,
  LlmConnectionTest,
  LlmConnectionTestResult,
  SmtpConfigView,
  SmtpConfigSave,
} from "../types/api";

// Create Axios client with proxy or direct base URL
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    Accept: "application/json",
  },
});

// Dynamic API Key injection on every outgoing request. Deliberately does NOT
// fall back to API_CONFIG.DEFAULT_API_KEY when unset — that silent fallback
// used to make an unauthenticated session look authenticated (the Dashboard
// would render normally with a key nobody actually entered), which is
// exactly the confusion RequireAuth/the login gate exists to fix. An empty
// return here is what tells RequireAuth to redirect to /login.
export function getActiveApiKey(): string {
  return localStorage.getItem("doc_extract_api_key") || "";
}

export function setActiveApiKey(key: string): void {
  localStorage.setItem("doc_extract_api_key", key);
}

apiClient.interceptors.request.use((config) => {
  // Tenant-admin calls (tenant CRUD, API key issuance) pass their own admin key
  // explicitly via config.headers — don't clobber it with the regular working key.
  if (!config.headers[API_CONFIG.API_KEY_HEADER]) {
    const key = getActiveApiKey();
    if (key) {
      config.headers[API_CONFIG.API_KEY_HEADER] = key;
    }
  }
  // The backend is Pydantic/FastAPI (snake_case wire format); this app is written in
  // camelCase throughout. FormData bodies (file uploads) carry their own explicit,
  // already-snake_case field names via .append() and must be left untouched.
  if (config.data && typeof config.data === "object" && config.data.constructor === Object) {
    config.data = keysToSnake(config.data);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (typeof response.data === "object") {
      response.data = keysToCamel(response.data);
    }
    // Any successful response proves the backend is reachable — clear a
    // previously-set unreachable flag so the banner doesn't linger once
    // connectivity is restored.
    useAppStore.getState().setBackendUnreachable(false);
    return response;
  },
  (error) => {
    // error.response being undefined means no HTTP response ever came
    // back — connection refused, DNS failure, timeout, or a CORS block
    // (the browser deliberately hides the real reason for a CORS failure
    // from JS, surfacing it as a bare network error — indistinguishable
    // here from "the server is actually down", which is fine: both mean
    // the same thing to a user, "can't reach the backend right now"). A
    // real HTTP error status (404, 500, a validation 400) DOES have
    // error.response — that's a reachable backend giving a real answer,
    // not a connectivity problem, so it's deliberately not treated as
    // "unreachable" here.
    if (!error.response) {
      useAppStore.getState().setBackendUnreachable(true);
    }
    return Promise.reject(error);
  }
);

// Normalized Error Factory
export function normalizeError(error: unknown): ErrorResponse {
  if (axios.isAxiosError(error)) {
    const serverError = error.response?.data as any;
    if (serverError && (serverError.message || serverError.errorCode)) {
      return {
        status: "FAILED",
        errorCode: serverError.errorCode || `HTTP_${error.response?.status}`,
        message: serverError.message || "Request failed on server",
        details: serverError.details || `HTTP ${error.response?.status}: ${error.config?.url || ""}`,
        timestamp: new Date().toISOString(),
      };
    }
    return {
      status: "FAILED",
      errorCode: error.code || `HTTP_${error.response?.status || "ERROR"}`,
      message: error.message || "Failed to communicate with Document Extraction Service",
      details: `HTTP ${error.response?.status || "0"}: ${error.config?.url || ""}`,
      timestamp: new Date().toISOString(),
    };
  }

  if (error instanceof Error) {
    return {
      status: "FAILED",
      errorCode: "CLIENT_ERROR",
      message: error.message,
      details: error.stack || "",
      timestamp: new Date().toISOString(),
    };
  }

  return {
    status: "FAILED",
    errorCode: "UNKNOWN_ERROR",
    message: "An unexpected error occurred",
    details: String(error),
    timestamp: new Date().toISOString(),
  };
}

// ── Health & Diagnostics ──────────────────────────────────────────────────────────

export async function apiGetHealth(): Promise<ServiceHealth> {
  const res = await apiClient.get<ServiceHealth>(API_CONFIG.ENDPOINTS.HEALTH);
  return res.data;
}

export async function apiGetInfo(): Promise<SystemInfo> {
  const res = await apiClient.get<SystemInfo>(API_CONFIG.ENDPOINTS.INFO);
  return res.data;
}

export async function apiGetVersion(): Promise<SystemVersion> {
  const res = await apiClient.get<SystemVersion>(API_CONFIG.ENDPOINTS.VERSION);
  return res.data;
}

/**
 * Introspects a candidate API key via GET /api/v1/tenants/me — real roles
 * and tenant, not guessed. Works for EXTRACT, TENANT_ADMIN, or PLATFORM_ADMIN
 * keys alike; the caller decides what to do with the roles it gets back.
 */
export async function apiWhoAmI(candidateKey: string): Promise<WhoAmIResponse> {
  const res = await apiClient.get<WhoAmIResponse>(API_CONFIG.ENDPOINTS.WHOAMI, {
    headers: { [API_CONFIG.API_KEY_HEADER]: candidateKey.trim() },
  });
  return res.data;
}

/**
 * Break-glass recovery for the one root PLATFORM_ADMIN credential — both
 * calls are unauthenticated by design (see recovery_router.py). The
 * request call always resolves to the same generic message regardless of
 * outcome; it never reveals whether recovery is configured or a token was
 * actually created.
 */
export async function apiRequestRecovery(): Promise<RecoveryRequestedResponse> {
  const res = await apiClient.post<RecoveryRequestedResponse>(API_CONFIG.ENDPOINTS.RECOVERY_REQUEST);
  return res.data;
}

export async function apiConfirmRecovery(token: string): Promise<RecoveryConfirmedResponse> {
  const res = await apiClient.post<RecoveryConfirmedResponse>(API_CONFIG.ENDPOINTS.RECOVERY_CONFIRM, {
    token,
  });
  return res.data;
}

/**
 * Validate a candidate API key by asking the backend who it actually is.
 */
export async function apiTestTenantKey(candidateKey: string): Promise<ApiKeyTestResponse> {
  const startedAt = performance.now();
  try {
    const who = await apiWhoAmI(candidateKey);
    return {
      valid: true,
      tenantId: who.tenantId,
      clientName: who.label,
      roles: who.roles,
      latencyMs: Math.round(performance.now() - startedAt),
      message: `Key is authorized for tenant "${who.tenantId}" with role(s): ${who.roles.join(", ")}.`,
    };
  } catch (err: any) {
    const status = err.response?.status;
    const msg =
      status === 401
        ? "Unauthorized: this API key is invalid, expired, or revoked."
        : err.message || "Failed to reach backend service.";
    return {
      valid: false,
      message: msg,
    };
  }
}

// ── Async Job Pipeline ─────────────────────────────────────────────────────────────

/**
 * Enqueue PDF document for asynchronous processing.
 * Returns 202 Accepted with jobId.
 */
export async function apiSubmitJob(
  file: File,
  options?: ExtractionOptions
): Promise<JobAccepted> {
  const formData = new FormData();
  formData.append("file", file);

  if (options?.instruction) formData.append("instruction", options.instruction);
  if (options?.responseSchema) formData.append("response_schema", options.responseSchema);
  if (options?.llmProviderId) formData.append("llm_provider_id", options.llmProviderId);
  if (options?.model) formData.append("model", options.model);
  if (options?.language) formData.append("language", options.language);
  if (options?.promptVersion) formData.append("prompt_version", options.promptVersion);

  const res = await apiClient.post<JobAccepted>(API_CONFIG.ENDPOINTS.JOBS, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
}

/**
 * Poll job status.
 */
export async function apiGetJobStatus(jobId: string): Promise<JobStatusView> {
  const res = await apiClient.get<JobStatusView>(API_CONFIG.ENDPOINTS.JOB_STATUS(jobId));
  let data = res.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {}
  }
  return data;
}

/**
 * Fetch extraction result JSON for a completed job.
 * Handles both stringified and parsed JSON payloads, and normalizes into ExtractionResponse.
 */
export async function apiGetJobResult(jobId: string): Promise<ExtractionResponse> {
  const res = await apiClient.get(API_CONFIG.ENDPOINTS.JOB_RESULT(jobId));
  let data = res.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.error("Failed parsing job result JSON:", e);
    }
  }

  // If backend returned { data: { documentId, obligations, ... } }
  if (data && data.data && Array.isArray(data.data.obligations)) {
    return data as ExtractionResponse;
  }

  // If backend returned raw DocumentData directly
  if (data && Array.isArray(data.obligations)) {
    return {
      status: "SUCCESS",
      processingTime: data.processingTime,
      metadata: data.metadata,
      data: data,
    };
  }

  return data as ExtractionResponse;
}

/**
 * List all extraction jobs for current tenant.
 */
export async function apiListJobs(): Promise<JobSummary[]> {
  const res = await apiClient.get<JobSummary[]>(API_CONFIG.ENDPOINTS.JOBS);
  let data = res.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.error("Failed parsing jobs list JSON:", e);
    }
  }
  return Array.isArray(data) ? data : [];
}

/**
 * Delete a job for the current tenant.
 */
export async function apiDeleteJob(jobId: string): Promise<void> {
  await apiClient.delete(API_CONFIG.ENDPOINTS.JOB_STATUS(jobId));
}

/**
 * Export a completed job result as DOCX, XLSX, or PDF directly from the backend.
 */
export async function apiExportJob(jobId: string, format: string, filename?: string): Promise<Blob> {
  const res = await apiClient.get(API_CONFIG.ENDPOINTS.JOB_EXPORT(jobId, format), {
    responseType: "blob",
  });
  const ext = format.toLowerCase() === "xlsx" ? "xlsx" : format.toLowerCase() === "docx" ? "docx" : "pdf";
  saveAs(res.data, filename || `compliance-export-${jobId.slice(0, 8)}.${ext}`);
  return res.data;
}

// ── Tenant Administration (TENANT_ADMIN or PLATFORM_ADMIN key required — pass it
// ── explicitly, never the regular working key; see the interceptor note above) ─────

function adminHeaders(adminKey: string) {
  return { headers: { [API_CONFIG.API_KEY_HEADER]: adminKey } };
}

export async function apiCreateTenant(
  adminKey: string,
  payload: CreateTenantRequest
): Promise<TenantView> {
  const res = await apiClient.post<TenantView>(API_CONFIG.ENDPOINTS.TENANTS, payload, adminHeaders(adminKey));
  return res.data;
}

export async function apiListTenants(adminKey: string): Promise<TenantView[]> {
  const res = await apiClient.get<TenantView[]>(API_CONFIG.ENDPOINTS.TENANTS, adminHeaders(adminKey));
  return Array.isArray(res.data) ? res.data : [];
}

export async function apiGetTenant(adminKey: string, tenantId: string): Promise<TenantView> {
  const res = await apiClient.get<TenantView>(API_CONFIG.ENDPOINTS.TENANT_DETAIL(tenantId), adminHeaders(adminKey));
  return res.data;
}

export async function apiUpdateTenant(
  adminKey: string,
  tenantId: string,
  payload: UpdateTenantRequest
): Promise<TenantView> {
  const res = await apiClient.patch<TenantView>(
    API_CONFIG.ENDPOINTS.TENANT_DETAIL(tenantId),
    payload,
    adminHeaders(adminKey)
  );
  return res.data;
}

export async function apiListApiKeys(adminKey: string, tenantId: string): Promise<ApiKeyView[]> {
  const res = await apiClient.get<ApiKeyView[]>(
    API_CONFIG.ENDPOINTS.TENANT_API_KEYS(tenantId),
    adminHeaders(adminKey)
  );
  return Array.isArray(res.data) ? res.data : [];
}

export async function apiIssueApiKey(
  adminKey: string,
  tenantId: string,
  payload: IssueApiKeyRequest
): Promise<ApiKeyIssuedResponse> {
  const res = await apiClient.post<ApiKeyIssuedResponse>(
    API_CONFIG.ENDPOINTS.TENANT_API_KEYS(tenantId),
    payload,
    adminHeaders(adminKey)
  );
  return res.data;
}

export async function apiRevokeApiKey(adminKey: string, tenantId: string, keyId: string): Promise<void> {
  await apiClient.delete(API_CONFIG.ENDPOINTS.TENANT_API_KEY_DETAIL(tenantId, keyId), adminHeaders(adminKey));
}

// ── Obligations Management & Status Persistence ────────────────────────────────────

/** The backend nests obligation fields under `obligation`; flatten to the shape the
 *  rest of this app (matrix table, filters, etc.) already consumes. */
export async function apiGetObligations(): Promise<ObligationSummaryView[]> {
  const res = await apiClient.get<any[]>(API_CONFIG.ENDPOINTS.OBLIGATIONS);
  const rows = Array.isArray(res.data) ? res.data : [];
  return rows.map((row) => ({
    ...row.obligation,
    jobId: row.jobId,
    documentId: row.documentId,
    documentTitle: row.documentTitle,
    entity: row.entity,
  }));
}

export async function apiUpdateObligationStatus(
  jobId: string,
  obligationId: string,
  payload: ObligationUpdateRequest
): Promise<ObligationData> {
  const res = await apiClient.patch<ObligationData>(
    API_CONFIG.ENDPOINTS.UPDATE_OBLIGATION(jobId, obligationId),
    payload
  );
  return res.data;
}

/**
 * LLM providers configured for the caller's tenant. Keys are never returned,
 * only a masked last-4.
 */
export async function apiListLlmProviders(): Promise<LlmProvider[]> {
  const res = await apiClient.get<LlmProvider[]>(API_CONFIG.ENDPOINTS.LLM_PROVIDERS);
  return res.data;
}

/** Admin: list a tenant's providers (TENANT_ADMIN for its own tenant, PLATFORM_ADMIN for any). */
export async function apiListTenantLlmProviders(adminKey: string, tenantId: string): Promise<LlmProvider[]> {
  const res = await apiClient.get<LlmProvider[]>(
    API_CONFIG.ENDPOINTS.TENANT_LLM_PROVIDERS(tenantId),
    adminHeaders(adminKey)
  );
  return res.data;
}

export async function apiAddLlmProvider(
  adminKey: string,
  tenantId: string,
  body: LlmProviderCreate
): Promise<LlmProvider> {
  const res = await apiClient.post<LlmProvider>(
    API_CONFIG.ENDPOINTS.TENANT_LLM_PROVIDERS(tenantId),
    body,
    adminHeaders(adminKey)
  );
  return res.data;
}

export async function apiUpdateLlmProvider(
  adminKey: string,
  tenantId: string,
  id: string,
  body: LlmProviderUpdate
): Promise<LlmProvider> {
  const res = await apiClient.put<LlmProvider>(
    API_CONFIG.ENDPOINTS.TENANT_LLM_PROVIDER(tenantId, id),
    body,
    adminHeaders(adminKey)
  );
  return res.data;
}

export async function apiDeleteLlmProvider(adminKey: string, tenantId: string, id: string): Promise<void> {
  await apiClient.delete(API_CONFIG.ENDPOINTS.TENANT_LLM_PROVIDER(tenantId, id), adminHeaders(adminKey));
}

/** The tenant's saved SMTP settings, or null if none are saved yet. */
export async function apiGetSmtpConfig(adminKey: string, tenantId: string): Promise<SmtpConfigView | null> {
  const res = await apiClient.get<SmtpConfigView | null>(
    API_CONFIG.ENDPOINTS.TENANT_SMTP(tenantId),
    adminHeaders(adminKey)
  );
  return res.data ?? null;
}

export async function apiSaveSmtpConfig(
  adminKey: string,
  tenantId: string,
  body: SmtpConfigSave
): Promise<SmtpConfigView> {
  const res = await apiClient.put<SmtpConfigView>(
    API_CONFIG.ENDPOINTS.TENANT_SMTP(tenantId),
    body,
    adminHeaders(adminKey)
  );
  return res.data;
}

export async function apiDeleteSmtpConfig(adminKey: string, tenantId: string): Promise<void> {
  await apiClient.delete(API_CONFIG.ENDPOINTS.TENANT_SMTP(tenantId), adminHeaders(adminKey));
}

/** Sends a real email with the SAVED settings; rejects with the SMTP server's reason on failure. */
export async function apiSendSmtpTestEmail(adminKey: string, tenantId: string, recipient: string): Promise<void> {
  await apiClient.post(API_CONFIG.ENDPOINTS.TENANT_SMTP_TEST(tenantId), { recipient }, adminHeaders(adminKey));
}

/**
 * Calls the provider's own model-listing endpoint with this URL and key. Resolves only if the
 * provider accepted them, with the models the key can use (and their current price when known);
 * rejects with the provider's real reason otherwise. Nothing is saved.
 */
export async function apiTestLlmConnection(
  adminKey: string,
  tenantId: string,
  body: LlmConnectionTest
): Promise<LlmConnectionTestResult> {
  const res = await apiClient.post<LlmConnectionTestResult>(
    `${API_CONFIG.ENDPOINTS.TENANT_LLM_PROVIDERS(tenantId)}/test`,
    body,
    adminHeaders(adminKey)
  );
  return res.data;
}

/** Real, current progress of a job: its status plus how each segment of the document is doing. */
export async function apiGetJobProgress(jobId: string): Promise<JobProgress> {
  const res = await apiClient.get<JobProgress>(API_CONFIG.ENDPOINTS.JOB_PROGRESS(jobId));
  return res.data;
}
