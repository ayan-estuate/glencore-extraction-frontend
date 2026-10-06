export type ObligationStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED";

export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED"
  | "DEAD_LETTER";

export interface ObligationData {
  obligationId: string;
  obligationTitle: string;
  obligationStatus: ObligationStatus;
  obligationDescription: string;
  dueDate: string;
  section: string;
  obligationOwner: string;
  obligationClass: string;
  sourcePage: number | null;
  sourceChunkId: string | null;
}

export interface DocumentData {
  documentId: string;
  documentTitle: string;
  documentDescription: string;
  entity: string;
  obligations: ObligationData[];
}

export interface ExtractionMetadata {
  pages: number;
  model: string;
  provider: string;
}

export interface ExtractionResponse {
  status: "SUCCESS" | "FAILED";
  /** Provider type and model the job actually ran on (resolved at submission). */
  provider?: string | null;
  model?: string | null;
  /** Not sent by this backend's JobResultView; kept optional for forward-compat. */
  processingTime?: number;
  /** Not sent by this backend's JobResultView; kept optional for forward-compat. */
  metadata?: ExtractionMetadata;
  data: DocumentData;
  warnings?: string[];
}

export interface JobAccepted {
  jobId: string;
  status: JobStatus;
  statusUrl: string;
}

export interface JobStatusView {
  jobId: string;
  status: JobStatus;
  errorCode: string | null;
  errorMessage: string | null;
  resultAvailable: boolean;
}

export interface JobSummary {
  jobId: string;
  tenantId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  pageCount: number | null;
  status: JobStatus;
  instruction?: string | null;
  language?: string;
  requestedProvider?: string | null;
  requestedModel?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  resultAvailable: boolean;
}

export type SegmentStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "ABANDONED";

/** One page-range slice of a document and how its extraction is going (real server state). */
export interface SegmentProgress {
  ordinal: number;
  pageFrom: number;
  pageTo: number;
  status: SegmentStatus;
  attempts: number;
  maxAttempts: number;
  errorCode: string | null;
  errorMessage: string | null;
}

/** GET /api/v1/document/jobs/{id}/progress */
export interface JobProgress {
  jobId: string;
  status: JobStatus;
  provider: string | null;
  model: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  warnings: string[];
  segments: SegmentProgress[];
}

export interface ErrorResponse {
  status: "FAILED";
  errorCode:
    | "PDF_PROCESSING_FAILED"
    | "LLM_PROVIDER_ERROR"
    | "FILE_TOO_LARGE"
    | "INVALID_REQUEST_PARAMETERS"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "RATE_LIMITED"
    | string;
  message: string;
  details?: string;
  timestamp?: string;
}

export type LogLevel = "INFO" | "WARN" | "ERROR";

export interface LogEvent {
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface StoredDocument extends DocumentData {
  id: string;
  jobId?: string;
  extractedAt: string;
  rawResponse?: ExtractionResponse;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  llmProvider?: string;
  llmModel?: string;
  status?: JobStatus;
}

export interface ExtractionOptions {
  instruction?: string;
  responseSchema?: string;
  /** Id of one of the tenant's configured LLM providers (Settings > LLM Providers).
   *  Omitted = the backend uses the tenant's first provider. */
  llmProviderId?: string;
  /** One of that provider's configured model ids. Omitted = its first model. */
  model?: string;
  language?: string;
  promptVersion?: string;
}

export interface ServiceHealth {
  status: "UP" | "DOWN" | "DEGRADED";
  components?: {
    llmIntegration?: string;
    pdfParser?: string;
    [key: string]: string | undefined;
  };
}

export interface SystemVersion {
  version: string;
  builtWith: string;
}

export interface SystemInfo {
  name: string;
  description: string;
}

export interface ApiKeyTestResponse {
  valid: boolean;
  provider?: string;
  message?: string;
  tenantId?: string;
  clientName?: string;
  roles?: string[];
  latencyMs?: number;
}

export type NotificationTriggerState = "PARTIAL" | "FAILED" | "DEAD_LETTER" | "COMPLETED";

export interface NotificationPreferences {
  notifyOverdueObligations: boolean;
  notifyDueSoonObligations: boolean;
  notifyObligationCompleted: boolean;
  notifyJobFailed: boolean;
  notifyJobPartial: boolean;
  notifyJobCompleted: boolean;
  dueSoonWindowDays: number;
}

// ── Tenant Administration (requires an X-API-Key issued with an admin role) ────────
// Mirrors contexts/tenancy/interfaces/api/schemas.py exactly (field-for-field, after
// the apiClient snake_case<->camelCase boundary conversion). Two-tier admin model:
// TENANT_ADMIN is scoped to the tenant that issued its key only; PLATFORM_ADMIN is
// cross-tenant (create tenants, list/manage any tenant) — see require_tenant_admin/
// require_platform_admin in the backend's api/deps.py. A TENANT_ADMIN key can never
// issue a PLATFORM_ADMIN-role key (the backend rejects it with 403).

export interface RateLimitPolicy {
  requestsPerMinute: number | null;
  maxConcurrentSubmissions: number | null;
}

export interface BudgetPolicy {
  perJobCeilingMicros: number | null;
  perTenantMonthlyCeilingMicros: number | null;
}

export interface TenantNotificationPolicy {
  recipients: string[];
  notifyOn: NotificationTriggerState[];
  includeDocumentName: boolean;
  includeErrorDetail: boolean;
}

export interface TenantPrivacyPolicy {
  knownOrganisations: string[];
  knownPeople: string[];
  knownSites: string[];
}

export type TenantStatus = "ACTIVE" | "SUSPENDED";

export interface TenantView {
  id: string;
  displayName: string;
  status: TenantStatus;
  rateLimit: RateLimitPolicy;
  budget: BudgetPolicy;
  notification: TenantNotificationPolicy;
  privacy: TenantPrivacyPolicy;
  createdAt: string;
  version: number;
}

export interface CreateTenantRequest {
  tenantId: string;
  displayName: string;
}

export interface UpdateTenantRequest {
  displayName?: string;
  status?: TenantStatus;
  rateLimit?: RateLimitPolicy;
  budget?: BudgetPolicy;
  notification?: TenantNotificationPolicy;
  privacy?: TenantPrivacyPolicy;
}

export type ApiKeyRole = "EXTRACT" | "TENANT_ADMIN" | "PLATFORM_ADMIN";

export interface IssueApiKeyRequest {
  label: string;
  roles?: ApiKeyRole[];
  expiresAt?: string;
}

export interface ApiKeyIssuedResponse {
  id: string;
  label: string;
  roles: string[];
  /** Shown exactly once, at issuance — the backend only ever stores a hash. */
  plaintextKey: string;
}

export interface ApiKeyView {
  id: string;
  label: string;
  roles: string[];
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

/** Identity/role introspection for the calling credential — GET /api/v1/tenants/me.
 *  Works with any authenticated key (EXTRACT, TENANT_ADMIN, or PLATFORM_ADMIN). */
export interface WhoAmIResponse {
  clientId: string;
  tenantId: string;
  label: string;
  roles: ApiKeyRole[];
  expiresAt: string | null;
}

/** Break-glass recovery for the one root PLATFORM_ADMIN credential — both
 *  endpoints are unauthenticated by design, see recovery_router.py. */
export interface RecoveryRequestedResponse {
  message: string;
}

export interface RecoveryConfirmedResponse {
  id: string;
  label: string;
  roles: ApiKeyRole[];
  plaintextKey: string;
}

export interface ObligationUpdateRequest {
  status?: ObligationStatus | string;
  owner?: string;
  dueDate?: string;
  notes?: string;
}

/** Flattened client-side view: the backend's ObligationSummaryView actually nests the
 *  obligation fields under an `obligation` key ({jobId, documentId, documentTitle, entity,
 *  obligation: {...}}); apiGetObligations() flattens it to this shape at the API boundary. */
export interface ObligationSummaryView {
  obligationId: string;
  obligationTitle: string;
  obligationDescription: string;
  obligationStatus: ObligationStatus | string;
  dueDate: string;
  section: string;
  obligationOwner: string;
  obligationClass?: string;
  sourcePage?: number | null;
  sourceChunkId?: string | null;
  jobId: string;
  documentId: string;
  documentTitle: string;
  entity: string;
}

export type LlmProviderType = "ANTHROPIC" | "OPENAI_COMPATIBLE";

export interface LlmModelSpec {
  id: string;
  /** Integer USD micros per million tokens. */
  inputMicrosPerMillion: number;
  outputMicrosPerMillion: number;
}

/** A tenant's stored LLM provider. The API key itself is never returned. */
export interface LlmProvider {
  id: string;
  providerType: LlmProviderType;
  label: string;
  baseUrl: string | null;
  apiKeyLast4: string;
  models: LlmModelSpec[];
  createdAt: string;
}

/** A model a provider offers, with its current published price when one could be found. */
export interface DiscoveredLlmModel {
  id: string;
  inputMicrosPerMillion: number | null;
  outputMicrosPerMillion: number | null;
}

export interface LlmConnectionTest {
  providerType: LlmProviderType;
  baseUrl?: string | null;
  /** The key to test; omit it and pass providerId to test a saved provider's key. */
  apiKey?: string;
  providerId?: string;
}

export interface LlmConnectionTestResult {
  ok: boolean;
  models: DiscoveredLlmModel[];
}

export interface LlmModelInput {
  id: string;
  /** Optional for models with known published pricing; required otherwise. */
  inputMicrosPerMillion?: number;
  outputMicrosPerMillion?: number;
}

export interface LlmProviderCreate {
  providerType: LlmProviderType;
  label: string;
  baseUrl?: string | null;
  apiKey: string;
  models: LlmModelInput[];
}

export interface LlmProviderUpdate {
  label?: string;
  baseUrl?: string | null;
  /** Omit to keep the stored key. */
  apiKey?: string;
  models?: LlmModelInput[];
}

/** A tenant's stored SMTP settings. The password is never returned, only whether one is set. */
export interface SmtpConfigView {
  tenantId: string;
  enabled: boolean;
  host: string;
  port: number;
  username: string | null;
  passwordSet: boolean;
  useStarttls: boolean;
  fromAddress: string;
  subjectPrefix: string;
  updatedAt: string;
}

export interface SmtpConfigSave {
  enabled: boolean;
  host: string;
  port: number;
  username: string | null;
  /** null = keep the stored password. */
  password: string | null;
  useStarttls: boolean;
  fromAddress: string;
  subjectPrefix: string;
}
