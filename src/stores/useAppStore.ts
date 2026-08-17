import { create } from "zustand";
import {
  StoredDocument,
  ObligationStatus,
  JobSummary,
  TenantEmailSettings,
  NotificationPreferences,
  NotificationSettingsResponse,
  UpdateTenantSettingsRequest,
  TestNotificationRequest,
  TestNotificationResponse,
  ObligationSummaryView,
} from "../types/api";
import {
  apiListJobs,
  apiGetJobResult,
  apiDeleteJob,
  getActiveApiKey,
  setActiveApiKey as persistApiKey,
  apiGetNotificationSettings,
  apiUpdateTenantNotificationSettings,
  apiSendTestNotification,
  apiGetTenants,
  apiGetObligations,
  apiUpdateObligationStatus,
} from "../lib/apiClient";
import {
  DEFAULT_TENANT_EMAIL_SETTINGS,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "../config/api.config";

interface AppState {
  documents: StoredDocument[];
  jobs: JobSummary[];
  activeJob: JobSummary | null;
  selectedJobForModal: JobSummary | null;
  isLoadingJobs: boolean;
  selectedDocumentIds: string[];
  theme: "light" | "dark";
  apiKey: string;
  activeTenantId: string;
  availableTenants: string[];

  // Tenant Email & Outbound Notification Overrides
  backendNotificationSettings: NotificationSettingsResponse | null;
  isLoadingSettings: boolean;
  tenantEmailSettings: Record<string, TenantEmailSettings>;
  notificationPreferences: NotificationPreferences;

  // Real database obligations matrix
  serverObligations: ObligationSummaryView[];

  // Filter states
  searchQuery: string;
  selectedStatusFilter: ObligationStatus | "ALL";
  dateRangeFilter: "ALL" | "30_DAYS" | "90_DAYS" | "THIS_YEAR";

  // Actions
  fetchJobs: (force?: boolean) => Promise<void>;
  loadJobResult: (jobId: string) => Promise<StoredDocument | null>;
  addDocument: (doc: StoredDocument) => void;
  removeDocument: (id: string, jobId?: string) => Promise<void>;
  updateObligationStatus: (docId: string, obligationId: string, status: ObligationStatus) => Promise<void>;
  setActiveJob: (job: JobSummary | null) => void;
  setSelectedJobForModal: (job: JobSummary | null) => void;
  setApiKey: (key: string) => void;
  setActiveTenantId: (tenantId: string) => void;

  fetchTenants: () => Promise<string[]>;
  fetchNotificationSettings: () => Promise<NotificationSettingsResponse | null>;
  fetchObligations: () => Promise<ObligationSummaryView[]>;
  saveTenantEmailSettings: (tenantId: string, settings: UpdateTenantSettingsRequest) => Promise<NotificationSettingsResponse>;
  sendTestNotification: (req: TestNotificationRequest) => Promise<TestNotificationResponse>;

  updateTenantEmailSettings: (tenantId: string, settings: Partial<TenantEmailSettings>) => void;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;

  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: ObligationStatus | "ALL") => void;
  setDateRangeFilter: (range: "ALL" | "30_DAYS" | "90_DAYS" | "THIS_YEAR") => void;

  toggleSelectDocument: (id: string) => void;
  selectAllDocuments: () => void;
  clearSelection: () => void;

  toggleTheme: () => void;
}

const STORAGE_KEY = "doc_extract_library_v2";
const TENANT_EMAIL_SETTINGS_KEY = "doc_extract_tenant_email_v1";
const NOTIFICATION_PREFS_KEY = "doc_extract_notification_prefs_v1";
const ACTIVE_TENANT_KEY = "doc_extract_active_tenant_v1";

let inFlightFetchJobs: Promise<void> | null = null;
let lastJobsFetchTime = 0;

function loadInitialDocs(): StoredDocument[] {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Failed loading local storage docs:", e);
  }
  return [];
}

function saveDocs(docs: StoredDocument[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.error("Failed saving docs to local storage:", e);
  }
}

function loadInitialEmailSettings(): Record<string, TenantEmailSettings> {
  try {
    const local = localStorage.getItem(TENANT_EMAIL_SETTINGS_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (e) {
    console.debug("Failed loading tenant email settings:", e);
  }
  return DEFAULT_TENANT_EMAIL_SETTINGS;
}

function loadInitialNotificationPrefs(): NotificationPreferences {
  try {
    const local = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && typeof parsed === "object") return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed };
    }
  } catch (e) {
    console.debug("Failed loading notification preferences:", e);
  }
  return DEFAULT_NOTIFICATION_PREFERENCES;
}

export const useAppStore = create<AppState>((set, get) => ({
  documents: loadInitialDocs(),
  jobs: [],
  activeJob: null,
  selectedJobForModal: null,
  isLoadingJobs: false,
  selectedDocumentIds: [],
  theme: (localStorage.getItem("doc_extract_theme") as "light" | "dark") || "light",
  apiKey: getActiveApiKey(),
  activeTenantId: localStorage.getItem(ACTIVE_TENANT_KEY) || "glencore",
  availableTenants: ["glencore", "default"],
  backendNotificationSettings: null,
  isLoadingSettings: false,
  tenantEmailSettings: loadInitialEmailSettings(),
  notificationPreferences: loadInitialNotificationPrefs(),
  serverObligations: [],

  searchQuery: "",
  selectedStatusFilter: "ALL",
  dateRangeFilter: "ALL",


  fetchJobs: async (force = false) => {
    // If an identical request is in flight, reuse it to prevent duplicate concurrent network calls
    if (inFlightFetchJobs) {
      return inFlightFetchJobs;
    }

    const now = Date.now();
    // Cache for 3 seconds unless forced or store has zero jobs
    if (!force && now - lastJobsFetchTime < 3000 && get().jobs.length > 0) {
      return;
    }

    inFlightFetchJobs = (async () => {
      set({ isLoadingJobs: true });
      try {
        const jobs = await apiListJobs();
        set({ jobs });
        lastJobsFetchTime = Date.now();

        // Automatically populate documents for any job that has completed extraction results
        const jobsWithResult = jobs.filter(
          (j) => j.resultAvailable || j.status === "COMPLETED" || j.status === "PARTIAL"
        );
        const currentDocs = get().documents;

        for (const job of jobsWithResult) {
          const alreadyLoaded = currentDocs.some(
            (d) => d.jobId === job.jobId || d.id === job.jobId
          );
          if (!alreadyLoaded) {
            try {
              const resp = await apiGetJobResult(job.jobId);
              const docData = resp?.data || (resp as any);
              if (docData && Array.isArray(docData.obligations)) {
                const newDoc: StoredDocument = {
                  id: job.jobId,
                  jobId: job.jobId,
                  documentId: docData.documentId || `DOC-${job.jobId.slice(0, 8)}`,
                  documentTitle: docData.documentTitle || job.originalFilename || "Compliance Document",
                  entity: docData.entity || "Unspecified Entity",
                  documentDescription: docData.documentDescription || "Statutory compliance extraction",
                  fileName: job.originalFilename || "document.pdf",
                  fileSize: job.sizeBytes,
                  fileType: job.contentType || "application/pdf",
                  extractedAt: job.completedAt || job.createdAt || new Date().toISOString(),
                  llmProvider: job.requestedProvider || resp.metadata?.provider || "GEMINI",
                  llmModel: job.requestedModel || resp.metadata?.model || "default",
                  obligations: docData.obligations || [],
                  status: job.status,
                  rawResponse: resp,
                };
                get().addDocument(newDoc);
              }
            } catch (err) {
              console.debug(`Could not load result for job ${job.jobId}:`, err);
            }
          }
        }
        try {
          await get().fetchObligations();
        } catch (ignored) {}
      } catch (err) {
        console.warn("Failed fetching jobs from backend:", err);
      } finally {
        set({ isLoadingJobs: false });
        inFlightFetchJobs = null;
      }
    })();

    return inFlightFetchJobs;
  },

  loadJobResult: async (jobId: string) => {
    try {
      const resp = await apiGetJobResult(jobId);
      const docData = resp?.data || (resp as any);
      if (docData && Array.isArray(docData.obligations)) {
        const job = get().jobs.find((j) => j.jobId === jobId);
        const storedDoc: StoredDocument = {
          id: jobId,
          jobId,
          documentId: docData.documentId || `DOC-${jobId.slice(0, 8)}`,
          documentTitle: docData.documentTitle || job?.originalFilename || "Compliance Document",
          entity: docData.entity || "Unspecified Entity",
          documentDescription: docData.documentDescription || "Statutory compliance extraction",
          fileName: job?.originalFilename || "document.pdf",
          fileSize: job?.sizeBytes,
          fileType: job?.contentType || "application/pdf",
          extractedAt: job?.completedAt || job?.createdAt || new Date().toISOString(),
          llmProvider: job?.requestedProvider || resp.metadata?.provider || "GEMINI",
          llmModel: job?.requestedModel || resp.metadata?.model || "default",
          obligations: docData.obligations || [],
          status: job?.status || "COMPLETED",
          rawResponse: resp,
        };
        get().addDocument(storedDoc);
        return storedDoc;
      }
    } catch (err) {
      console.error("Failed loading job result:", err);
    }
    return null;
  },

  setActiveJob: (activeJob) => set({ activeJob }),

  setSelectedJobForModal: (selectedJobForModal) => set({ selectedJobForModal }),

  setActiveTenantId: (tenantId) => {
    localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
    set({ activeTenantId: tenantId });
  },

  fetchTenants: async () => {
    try {
      const tenants = await apiGetTenants();
      if (tenants && tenants.length > 0) {
        set({ availableTenants: tenants });
        const current = get().activeTenantId;
        if (!tenants.includes(current)) {
          set({ activeTenantId: tenants[0] });
        }
      }
      return tenants;
    } catch (err) {
      console.warn("Failed fetching tenants from backend:", err);
      return [];
    }
  },

  fetchNotificationSettings: async () => {
    set({ isLoadingSettings: true });
    try {
      const settings = await apiGetNotificationSettings();
      set({ backendNotificationSettings: settings });

      if (settings && settings.tenantRecipients) {
        set((state) => {
          const merged = { ...state.tenantEmailSettings };
          Object.entries(settings.tenantRecipients).forEach(([tId, recs]) => {
            merged[tId] = {
              tenantId: tId,
              enabled: settings.enabled,
              from: settings.from,
              subjectPrefix: settings.subjectPrefix,
              resultBaseUrl: settings.resultBaseUrl,
              notifyOn: (settings.notifyOn as any[]) || ["FAILED", "PARTIAL", "DEAD_LETTER"],
              includeDocumentName: settings.includeDocumentName,
              includeErrorDetail: settings.includeErrorDetail,
              maxErrorDetailChars: settings.maxErrorDetailChars,
              recipients: recs || [],
            };
          });
          return { tenantEmailSettings: merged };
        });
      }
      return settings;
    } catch (err) {
      console.warn("Failed fetching notification settings from backend:", err);
      return null;
    } finally {
      set({ isLoadingSettings: false });
    }
  },

  fetchObligations: async () => {
    try {
      const obs = await apiGetObligations();
      set({ serverObligations: obs });
      return obs;
    } catch (err) {
      console.warn("Failed fetching obligations from backend:", err);
      return [];
    }
  },

  saveTenantEmailSettings: async (tenantId, updateReq) => {
    set({ isLoadingSettings: true });
    try {
      const resp = await apiUpdateTenantNotificationSettings(tenantId, updateReq);
      set({ backendNotificationSettings: resp });

      set((state) => {
        const existing = state.tenantEmailSettings[tenantId] || {
          ...DEFAULT_TENANT_EMAIL_SETTINGS.default,
          tenantId,
        };
        const updatedTenant: TenantEmailSettings = {
          ...existing,
          enabled: resp.enabled,
          from: resp.from,
          subjectPrefix: resp.subjectPrefix,
          resultBaseUrl: resp.resultBaseUrl,
          notifyOn: (resp.notifyOn as any[]) || existing.notifyOn,
          includeDocumentName: resp.includeDocumentName,
          includeErrorDetail: resp.includeErrorDetail,
          maxErrorDetailChars: resp.maxErrorDetailChars,
          recipients: resp.tenantRecipients?.[tenantId] || updateReq.recipients || existing.recipients || [],
          smtpHost: resp.smtpHost || updateReq.smtpHost || existing.smtpHost,
          smtpPort: resp.smtpPort || updateReq.smtpPort || existing.smtpPort,
          smtpUsername: resp.smtpUsername || updateReq.smtpUsername || existing.smtpUsername,
          smtpPasswordConfigured: resp.smtpPasswordConfigured ?? existing.smtpPasswordConfigured,
        };
        return {
          tenantEmailSettings: {
            ...state.tenantEmailSettings,
            [tenantId]: updatedTenant,
          },
        };
      });

      return resp;
    } finally {
      set({ isLoadingSettings: false });
    }
  },

  sendTestNotification: async (req) => {
    return await apiSendTestNotification(req);
  },

  updateTenantEmailSettings: (tenantId, settings) => {
    set((state) => {
      const existing = state.tenantEmailSettings[tenantId] || {
        ...DEFAULT_TENANT_EMAIL_SETTINGS.default,
        tenantId,
      };
      const updatedTenant = { ...existing, ...settings };
      const updatedAll = {
        ...state.tenantEmailSettings,
        [tenantId]: updatedTenant,
      };
      try {
        localStorage.setItem(TENANT_EMAIL_SETTINGS_KEY, JSON.stringify(updatedAll));
      } catch (e) {
        console.debug("Failed persisting tenant email settings:", e);
      }
      return { tenantEmailSettings: updatedAll };
    });
  },

  updateNotificationPreferences: (prefs) => {
    set((state) => {
      const updated = { ...state.notificationPreferences, ...prefs };
      try {
        localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.debug("Failed persisting notification prefs:", e);
      }
      return { notificationPreferences: updated };
    });
  },

  setApiKey: (key) => {
    persistApiKey(key);
    set({ apiKey: key });
    // Refresh jobs when API key (tenant) changes
    get().fetchJobs();
    get().fetchTenants();
    get().fetchNotificationSettings();
    get().fetchObligations();
  },

  addDocument: (doc) => {
    set((state) => {
      // Deduplicate by jobId, id, or documentId
      const filtered = state.documents.filter(
        (d) =>
          d.id !== doc.id &&
          d.jobId !== doc.jobId &&
          (doc.jobId ? true : d.documentId !== doc.documentId)
      );
      const updated = [doc, ...filtered];
      saveDocs(updated);
      return { documents: updated };
    });
  },

  removeDocument: async (id: string, jobId?: string) => {
    const targetJobId = jobId || id;
    try {
      if (targetJobId && targetJobId.length > 20) {
        // UUID format
        await apiDeleteJob(targetJobId);
      }
    } catch (err) {
      console.warn("Error deleting job from backend:", err);
    }

    set((state) => {
      const updated = state.documents.filter(
        (d) => d.id !== id && d.jobId !== targetJobId && d.documentId !== id
      );
      const updatedJobs = state.jobs.filter((j) => j.jobId !== targetJobId);
      saveDocs(updated);
      return {
        documents: updated,
        jobs: updatedJobs,
        selectedDocumentIds: state.selectedDocumentIds.filter((selId) => selId !== id),
      };
    });
  },

  updateObligationStatus: async (docId, obligationId, newStatus) => {
    // 1. Optimistically update local documents
    set((state) => {
      const updated = state.documents.map((doc) => {
        if (doc.id === docId || doc.jobId === docId || doc.documentId === docId) {
          const updatedObs = doc.obligations.map((ob) =>
            ob.obligationId === obligationId ? { ...ob, obligationStatus: newStatus } : ob
          );
          return { ...doc, obligations: updatedObs };
        }
        return doc;
      });

      const updatedServer = state.serverObligations.map((ob) => {
        if (ob.obligationId === obligationId && (ob.jobId === docId || ob.documentId === docId)) {
          return { ...ob, obligationStatus: newStatus };
        }
        return ob;
      });

      saveDocs(updated);
      return { documents: updated, serverObligations: updatedServer };
    });

    // 2. Persist to real backend REST endpoint
    const currentDoc = get().documents.find(
      (d) => d.id === docId || d.jobId === docId || d.documentId === docId
    );
    const targetJobId = currentDoc?.jobId || (docId.length > 20 ? docId : null);

    if (targetJobId) {
      try {
        await apiUpdateObligationStatus(targetJobId, obligationId, { status: newStatus });
      } catch (err) {
        console.error(`Failed persisting obligation ${obligationId} status to backend:`, err);
      }
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatusFilter: (selectedStatusFilter) => set({ selectedStatusFilter }),
  setDateRangeFilter: (dateRangeFilter) => set({ dateRangeFilter }),

  toggleSelectDocument: (id) => {
    set((state) => {
      const exists = state.selectedDocumentIds.includes(id);
      return {
        selectedDocumentIds: exists
          ? state.selectedDocumentIds.filter((item) => item !== id)
          : [...state.selectedDocumentIds, id],
      };
    });
  },

  selectAllDocuments: () => {
    set((state) => ({
      selectedDocumentIds: state.documents.map((d) => d.id),
    }));
  },

  clearSelection: () => set({ selectedDocumentIds: [] }),

  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === "light" ? "dark" : "light";
      localStorage.setItem("doc_extract_theme", newTheme);
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return { theme: newTheme };
    });
  },
}));
