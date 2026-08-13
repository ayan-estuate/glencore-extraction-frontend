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
  processingTime: number;
  metadata: ExtractionMetadata;
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
  temperature?: number;
  model?: string;
  provider?: "GEMINI" | "OPENAI" | "CLAUDE" | "OLLAMA" | string;
  language?: string;
  wait?: boolean;
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

export interface TenantEmailSettings {
  tenantId: string;
  enabled: boolean;
  from: string;
  subjectPrefix: string;
  resultBaseUrl: string;
  notifyOn: NotificationTriggerState[];
  includeDocumentName: boolean;
  includeErrorDetail: boolean;
  maxErrorDetailChars: number;
  recipients: string[];
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpPasswordConfigured?: boolean;
}

export interface NotificationPreferences {
  notifyOverdueObligations: boolean;
  notifyDueSoonObligations: boolean;
  notifyObligationCompleted: boolean;
  notifyJobFailed: boolean;
  notifyJobPartial: boolean;
  notifyJobCompleted: boolean;
  dueSoonWindowDays: number;
}

export interface NotificationSettingsResponse {
  enabled: boolean;
  from: string;
  subjectPrefix: string;
  resultBaseUrl: string;
  notifyOn: NotificationTriggerState[];
  includeDocumentName: boolean;
  includeErrorDetail: boolean;
  maxErrorDetailChars: number;
  tenantRecipients: Record<string, string[]>;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPasswordConfigured?: boolean;
}

export interface UpdateTenantSettingsRequest {
  enabled?: boolean;
  recipients?: string[];
  notifyOn?: NotificationTriggerState[];
  includeDocumentName?: boolean;
  includeErrorDetail?: boolean;
  maxErrorDetailChars?: number;
  subjectPrefix?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
}

export interface TestNotificationRequest {
  tenantId?: string;
  testEmail?: string;
  recipients?: string[];
  status?: string;
  documentName?: string;
  errorCode?: string;
  errorMessage?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
}

export interface TestNotificationResponse {
  status: string;
  message: string;
  tenantId: string;
  recipients: string[];
}

export interface ObligationUpdateRequest {
  status?: ObligationStatus | string;
  owner?: string;
  dueDate?: string;
  notes?: string;
}

export interface ObligationSummaryView {
  obligationId: string;
  obligationTitle: string;
  obligationDescription: string;
  obligationStatus: ObligationStatus | string;
  dueDate: string;
  section: string;
  obligationOwner: string;
  obligationClass?: string;
  sourcePage?: number;
  jobId: string;
  documentId: string;
  documentTitle: string;
  entity: string;
}

