import axios, { AxiosInstance } from "axios";
import { saveAs } from "file-saver";
import { API_CONFIG } from "../config/api.config";
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
  NotificationSettingsResponse,
  UpdateTenantSettingsRequest,
  TestNotificationRequest,
  TestNotificationResponse,
  ObligationUpdateRequest,
  ObligationSummaryView,
  ObligationData,
} from "../types/api";

// Create Axios client with proxy or direct base URL
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    Accept: "application/json",
  },
});

// Dynamic API Key injection on every outgoing request
export function getActiveApiKey(): string {
  return localStorage.getItem("doc_extract_api_key") || API_CONFIG.DEFAULT_API_KEY;
}

export function setActiveApiKey(key: string): void {
  localStorage.setItem("doc_extract_api_key", key);
}

apiClient.interceptors.request.use((config) => {
  const key = getActiveApiKey();
  if (key) {
    config.headers[API_CONFIG.API_KEY_HEADER] = key;
  }
  return config;
});

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
 * Validate active client tenant API Key against the backend security filter.
 */
export async function apiTestTenantKey(candidateKey: string): Promise<ApiKeyTestResponse> {
  try {
    const res = await apiClient.get(API_CONFIG.ENDPOINTS.JOBS, {
      headers: {
        [API_CONFIG.API_KEY_HEADER]: candidateKey.trim(),
      },
    });
    return {
      valid: true,
      provider: "BACKEND_CLIENT",
      tenantId: "glencore",
      clientName: "Glencore EHS Environmental Client",
      message: `API Key is authorized. Successfully authenticated with extraction backend (${Array.isArray(res.data) ? res.data.length : 0} jobs found).`,
      roles: ["EXTRACT", "READ", "WRITE", "ADMIN"],
    };
  } catch (err: any) {
    const status = err.response?.status;
    const msg = status === 401
      ? "Unauthorized: Invalid API Key. Rejected by backend ApiKeyAuthFilter."
      : status === 403
      ? "Forbidden: This API Key does not have permissions for this tenant."
      : (err.message || "Failed to reach backend service.");
    return {
      valid: false,
      provider: "BACKEND_CLIENT",
      message: msg,
    };
  }
}

/**
 * Validate LLM Provider key (Gemini, Claude, OpenAI, Ollama) via backend tester.
 */
export async function apiTestKey(provider: string, apiKey: string): Promise<ApiKeyTestResponse> {
  const formData = new FormData();
  const provKey = provider.toUpperCase();
  formData.append("provider", provKey);
  formData.append("apiKey", apiKey);
  const res = await apiClient.post<any>(API_CONFIG.ENDPOINTS.KEYS_TEST, formData);
  const data = res.data;
  const pResult = data?.providers?.[provKey] || data?.providers?.[provider] || (data?.providers ? Object.values(data.providers)[0] : null);
  return {
    valid: pResult ? Boolean(pResult.valid) : data?.status === "SUCCESS",
    provider: provKey,
    message: pResult?.message || (data?.status === "SUCCESS" ? "API key is valid" : "Validation failed"),
    latencyMs: pResult?.latencyMs,
  };
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
  if (options?.responseSchema) formData.append("responseSchema", options.responseSchema);
  if (options?.temperature !== undefined) formData.append("temperature", options.temperature.toString());
  if (options?.model) formData.append("model", options.model);
  if (options?.provider) formData.append("provider", options.provider);
  if (options?.language) formData.append("language", options.language);

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
      processingTime: data.processingTime || 0,
      metadata: data.metadata || {
        pages: data.pageCount || 0,
        model: "default",
        provider: "default",
      },
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

/**
 * Export arbitrary extraction JSON file via server-side Exporter.
 */
export async function apiExportJsonFile(fileBlob: Blob, format: string, filename?: string): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", fileBlob, "extracted-data.json");
  formData.append("format", format);

  const res = await apiClient.post(API_CONFIG.ENDPOINTS.EXPORT_FILE, formData, {
    responseType: "blob",
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  const ext = format.toLowerCase() === "xlsx" ? "xlsx" : format.toLowerCase() === "docx" ? "docx" : "pdf";
  saveAs(res.data, filename || `export-result.${ext}`);
  return res.data;
}

/**
 * Synchronous extraction endpoint (wait=true).
 */
export async function apiPostExtractDocument(
  file: File,
  options?: ExtractionOptions,
  signal?: AbortSignal
): Promise<ExtractionResponse> {
  const formData = new FormData();
  formData.append("file", file);

  if (options?.instruction) formData.append("instruction", options.instruction);
  if (options?.responseSchema) formData.append("responseSchema", options.responseSchema);
  if (options?.temperature !== undefined) formData.append("temperature", options.temperature.toString());
  if (options?.model) formData.append("model", options.model);
  if (options?.provider) formData.append("provider", options.provider);
  if (options?.language) formData.append("language", options.language);
  formData.append("wait", "true");

  const res = await apiClient.post<ExtractionResponse>(API_CONFIG.ENDPOINTS.EXTRACT, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    signal,
  });
  return res.data;
}

// ── Outbound Notification Settings & Tenant Management ─────────────────────────────

export async function apiGetNotificationSettings(): Promise<NotificationSettingsResponse> {
  const res = await apiClient.get<NotificationSettingsResponse>(API_CONFIG.ENDPOINTS.NOTIFICATIONS_SETTINGS);
  return res.data;
}

export async function apiUpdateTenantNotificationSettings(
  tenantId: string,
  payload: UpdateTenantSettingsRequest
): Promise<NotificationSettingsResponse> {
  const res = await apiClient.put<NotificationSettingsResponse>(
    API_CONFIG.ENDPOINTS.TENANT_NOTIFICATIONS_SETTINGS(tenantId),
    payload
  );
  return res.data;
}

export async function apiSendTestNotification(
  payload: TestNotificationRequest
): Promise<TestNotificationResponse> {
  const res = await apiClient.post<TestNotificationResponse>(
    API_CONFIG.ENDPOINTS.NOTIFICATIONS_TEST,
    payload
  );
  return res.data;
}

export async function apiGetTenants(): Promise<string[]> {
  const res = await apiClient.get<string[]>(API_CONFIG.ENDPOINTS.TENANTS);
  return Array.isArray(res.data) ? res.data : [];
}

// ── Obligations Management & Status Persistence ────────────────────────────────────

export async function apiGetObligations(): Promise<ObligationSummaryView[]> {
  const res = await apiClient.get<ObligationSummaryView[]>(API_CONFIG.ENDPOINTS.OBLIGATIONS);
  return Array.isArray(res.data) ? res.data : [];
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
