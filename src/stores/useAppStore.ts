import { create } from "zustand";
import {
  StoredDocument,
  ObligationStatus,
  JobSummary,
  NotificationPreferences,
  ObligationSummaryView,
  TenantView,
  CreateTenantRequest,
  UpdateTenantRequest,
  ApiKeyView,
  IssueApiKeyRequest,
  ApiKeyIssuedResponse,
  ApiKeyRole,
} from "../types/api";
import {
  apiListJobs,
  apiGetJobResult,
  apiDeleteJob,
  getActiveApiKey,
  setActiveApiKey as persistApiKey,
  apiGetObligations,
  apiUpdateObligationStatus,
  apiCreateTenant,
  apiGetTenant,
  apiListTenants,
  apiUpdateTenant,
  apiListApiKeys,
  apiIssueApiKey,
  apiRevokeApiKey,
  apiWhoAmI,
} from "../lib/apiClient";
import {
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
  /** True once any request fails to reach the backend at all (network
   *  error/CORS block/timeout — no HTTP response came back, as opposed to
   *  the backend responding with an error status). Set/cleared by
   *  apiClient.ts's global response interceptor, not by individual call
   *  sites — this is what BackendStatusBanner reads to show a persistent,
   *  unmissable indicator instead of the previous behavior of many call
   *  sites just doing console.warn and leaving the UI looking like nothing
   *  happened. */
  backendUnreachable: boolean;
  apiKey: string;
  /** Resolved via apiWhoAmI whenever `apiKey` changes — display identity
   *  (label/tenant/roles). Null until resolved, or if the key is invalid/
   *  unreachable — pair with `apiKeyVerified` (not this being non-null) to
   *  tell "still checking" apart from "checked, invalid": this field alone
   *  can't distinguish those two states, both leave it null. Exists so the
   *  UI can always show "who is this session acting as" instead of leaving
   *  that implicit. */
  apiKeyIdentity: { label: string; tenantId: string; roles: ApiKeyRole[] } | null;
  /** Tri-state, set alongside apiKeyIdentity: null = not checked yet (either
   *  no key stored, or the boot-time/setApiKey resolution hasn't returned),
   *  true = apiWhoAmI succeeded, false = it was tried and failed (invalid or
   *  unreachable key). RequireAuth's redirect-to-/login logic needs this
   *  three-way distinction — apiKeyIdentity being null doesn't tell it
   *  whether a check is still in flight or has already failed. */
  apiKeyVerified: boolean | null;
  /** A key with an admin role (TENANT_ADMIN or PLATFORM_ADMIN), distinct from the
   *  regular working `apiKey` — required by every tenant-administration route. Kept
   *  in sessionStorage, not localStorage (cleared when the tab closes) — a real
   *  mitigation, not a real fix; see clearAdminSession's comment. Its role is
   *  verified against the backend (via apiWhoAmI), never assumed from user input. */
  adminApiKey: string;
  /** Set once adminApiKey is verified — null until then. PLATFORM_ADMIN is
   *  cross-tenant; TENANT_ADMIN is scoped to adminScopeTenantId only. */
  adminRole: "TENANT_ADMIN" | "PLATFORM_ADMIN" | null;
  /** The admin key's own label, resolved alongside adminRole — shown in the
   *  UI and in confirm dialogs so an action reads as "key X is about to do Y"
   *  instead of leaving the acting identity implicit. */
  adminKeyLabel: string | null;
  /** The tenant a TENANT_ADMIN key is scoped to; always null for PLATFORM_ADMIN
   *  (which isn't scoped to any single tenant). */
  adminScopeTenantId: string | null;
  activeTenantId: string;

  // Tenant Administration (admin-key-gated; see apiClient.ts's tenant admin functions)
  tenants: TenantView[];
  isLoadingTenants: boolean;
  apiKeysByTenant: Record<string, ApiKeyView[]>;
  isLoadingApiKeys: boolean;

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
  /** Verifies the key via apiWhoAmI before accepting it — throws if the key is
   *  invalid or has neither admin role, so the caller can show a clear error
   *  instead of silently storing a key that will just 403 on first use. */
  setAdminApiKey: (key: string) => Promise<void>;
  clearAdminSession: () => void;
  /** Full sign-out: clears both identity slots (regular + admin) and their
   *  resolved state. Used by the login gate's redirect logic and Settings'
   *  "Sign out" — callers still handle navigation to /login themselves,
   *  this only clears store state. */
  logout: () => void;
  setActiveTenantId: (tenantId: string) => void;
  setBackendUnreachable: (unreachable: boolean) => void;

  fetchObligations: () => Promise<ObligationSummaryView[]>;

  // Tenant Administration (all require adminApiKey to be set)
  fetchTenantsAdmin: () => Promise<TenantView[]>;
  createTenant: (req: CreateTenantRequest) => Promise<TenantView>;
  updateTenantAdmin: (tenantId: string, req: UpdateTenantRequest) => Promise<TenantView>;
  fetchApiKeysForTenant: (tenantId: string) => Promise<ApiKeyView[]>;
  issueApiKeyForTenant: (tenantId: string, req: IssueApiKeyRequest) => Promise<ApiKeyIssuedResponse>;
  revokeApiKeyForTenant: (tenantId: string, keyId: string) => Promise<void>;
  /** Persists just the 4 backend-real notification fields via PATCH /tenants/{id}. */
  saveTenantNotificationPolicy: (
    tenantId: string,
    policy: { recipients: string[]; notifyOn: string[]; includeDocumentName: boolean; includeErrorDetail: boolean }
  ) => Promise<TenantView>;

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
const NOTIFICATION_PREFS_KEY = "doc_extract_notification_prefs_v1";
const ACTIVE_TENANT_KEY = "doc_extract_active_tenant_v1";
const ADMIN_API_KEY_STORAGE_KEY = "doc_extract_admin_api_key";

// sessionStorage, not localStorage — a privileged credential (can act as ANY
// tenant, for PLATFORM_ADMIN) shouldn't outlive the browser tab it was typed
// into. This narrows exposure; it doesn't eliminate it (nothing short of a
// server-set httpOnly cookie protects against XSS) — the real fix is a
// proper session, deferred pending Glencore IT's identity-provider choice
// (see README's tenancy section).
function getStoredAdminKey(): string {
  try {
    return sessionStorage.getItem(ADMIN_API_KEY_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function persistAdminKey(key: string): void {
  try {
    sessionStorage.setItem(ADMIN_API_KEY_STORAGE_KEY, key);
  } catch {
    // Private-window/blocked storage: the key still works for this page
    // load via in-memory state, it just won't survive a reload.
  }
}

function clearStoredAdminKey(): void {
  try {
    sessionStorage.removeItem(ADMIN_API_KEY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

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
  backendUnreachable: false,
  apiKey: getActiveApiKey(),
  apiKeyIdentity: null,
  apiKeyVerified: null,
  adminApiKey: getStoredAdminKey(),
  adminRole: null,
  adminKeyLabel: null,
  adminScopeTenantId: null,
  activeTenantId: localStorage.getItem(ACTIVE_TENANT_KEY) || "",
  tenants: [],
  isLoadingTenants: false,
  apiKeysByTenant: {},
  isLoadingApiKeys: false,
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
                  documentDescription: docData.documentDescription,
                  fileName: job.originalFilename || "document.pdf",
                  fileSize: job.sizeBytes,
                  fileType: job.contentType || "application/pdf",
                  extractedAt: job.completedAt || job.createdAt || new Date().toISOString(),
                  llmProvider: job.requestedProvider || resp.provider || undefined,
                  llmModel: job.requestedModel || resp.model || undefined,
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
          documentDescription: docData.documentDescription,
          fileName: job?.originalFilename || "document.pdf",
          fileSize: job?.sizeBytes,
          fileType: job?.contentType || "application/pdf",
          extractedAt: job?.completedAt || job?.createdAt || new Date().toISOString(),
          llmProvider: job?.requestedProvider || resp.provider || undefined,
          llmModel: job?.requestedModel || resp.model || undefined,
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

  setBackendUnreachable: (unreachable) => {
    set((state) => (state.backendUnreachable === unreachable ? state : { backendUnreachable: unreachable }));
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

  fetchTenantsAdmin: async () => {
    const { adminApiKey: adminKey, adminRole, adminScopeTenantId } = get();
    if (!adminKey) return [];
    set({ isLoadingTenants: true });
    try {
      // A TENANT_ADMIN can't call "list all tenants" (backend 403s it) — it
      // has exactly one tenant it can act on, so fetch just that one.
      const tenants =
        adminRole === "TENANT_ADMIN" && adminScopeTenantId
          ? [await apiGetTenant(adminKey, adminScopeTenantId)]
          : await apiListTenants(adminKey);
      // A remembered tenant that doesn't exist on this server (stale browser state, or a
      // database that was reset) must not stay selected: fall back to a real one.
      const { activeTenantId, apiKeyIdentity } = get();
      if (tenants.length > 0 && !tenants.some((t) => t.id === activeTenantId)) {
        const fallback =
          tenants.find((t) => t.id === apiKeyIdentity?.tenantId)?.id ?? tenants[0].id;
        localStorage.setItem(ACTIVE_TENANT_KEY, fallback);
        set({ tenants, activeTenantId: fallback });
      } else {
        set({ tenants });
      }
      return tenants;
    } catch (err) {
      console.warn("Failed fetching tenants (admin):", err);
      return [];
    } finally {
      set({ isLoadingTenants: false });
    }
  },

  createTenant: async (req) => {
    const adminKey = get().adminApiKey;
    const tenant = await apiCreateTenant(adminKey, req);
    set((state) => ({ tenants: [...state.tenants, tenant] }));
    return tenant;
  },

  updateTenantAdmin: async (tenantId, req) => {
    const adminKey = get().adminApiKey;
    const tenant = await apiUpdateTenant(adminKey, tenantId, req);
    set((state) => ({
      tenants: state.tenants.map((t) => (t.id === tenantId ? tenant : t)),
    }));
    return tenant;
  },

  fetchApiKeysForTenant: async (tenantId) => {
    const adminKey = get().adminApiKey;
    set({ isLoadingApiKeys: true });
    try {
      const keys = await apiListApiKeys(adminKey, tenantId);
      set((state) => ({ apiKeysByTenant: { ...state.apiKeysByTenant, [tenantId]: keys } }));
      return keys;
    } finally {
      set({ isLoadingApiKeys: false });
    }
  },

  issueApiKeyForTenant: async (tenantId, req) => {
    const adminKey = get().adminApiKey;
    const issued = await apiIssueApiKey(adminKey, tenantId, req);
    await get().fetchApiKeysForTenant(tenantId);
    return issued;
  },

  revokeApiKeyForTenant: async (tenantId, keyId) => {
    const adminKey = get().adminApiKey;
    await apiRevokeApiKey(adminKey, tenantId, keyId);
    await get().fetchApiKeysForTenant(tenantId);
  },

  saveTenantNotificationPolicy: async (tenantId, policy) => {
    return get().updateTenantAdmin(tenantId, { notification: policy as any });
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
    set({ apiKey: key, apiKeyIdentity: null, apiKeyVerified: key.trim() ? null : false });
    // Refresh jobs when API key (tenant) changes
    get().fetchJobs();
    get().fetchObligations();
    // Identity resolution — not just best-effort display anymore:
    // apiKeyVerified also drives RequireAuth's redirect-to-/login logic, so
    // this result matters even though it's not awaited by the caller (the
    // store updates asynchronously once it resolves, same as before).
    if (key.trim()) {
      apiWhoAmI(key.trim())
        .then((who) => {
          if (get().apiKey === key) {
            set({
              apiKeyIdentity: { label: who.label, tenantId: who.tenantId, roles: who.roles },
              apiKeyVerified: true,
              // Until an admin picks a tenant explicitly, act as the key's own tenant.
              activeTenantId: get().activeTenantId || who.tenantId,
            });
          }
        })
        .catch(() => {
          // Invalid/unreachable — apiKeyIdentity stays null, apiKeyVerified
          // flips to false so RequireAuth knows this was tried and failed
          // (not just "not checked yet").
          if (get().apiKey === key) {
            set({ apiKeyVerified: false });
          }
        });
    }
  },

  setAdminApiKey: async (key) => {
    const trimmed = key.trim();
    if (!trimmed) {
      get().clearAdminSession();
      return;
    }
    const who = await apiWhoAmI(trimmed); // lets the caller catch+toast on failure
    if (!who.roles.includes("PLATFORM_ADMIN") && !who.roles.includes("TENANT_ADMIN")) {
      throw new Error(
        `This key has role(s) ${who.roles.join(", ") || "(none)"} — neither TENANT_ADMIN nor PLATFORM_ADMIN.`
      );
    }
    persistAdminKey(trimmed);
    set({
      adminApiKey: trimmed,
      adminRole: who.roles.includes("PLATFORM_ADMIN") ? "PLATFORM_ADMIN" : "TENANT_ADMIN",
      adminKeyLabel: who.label,
      adminScopeTenantId: who.roles.includes("PLATFORM_ADMIN") ? null : who.tenantId,
    });
    get().fetchTenantsAdmin();
  },

  clearAdminSession: () => {
    clearStoredAdminKey();
    set({
      adminApiKey: "",
      adminRole: null,
      adminKeyLabel: null,
      adminScopeTenantId: null,
      tenants: [],
      apiKeysByTenant: {},
    });
  },

  logout: () => {
    persistApiKey("");
    set({ apiKey: "", apiKeyIdentity: null, apiKeyVerified: false });
    get().clearAdminSession();
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

// A key persisted from an earlier page load in this same tab (sessionStorage
// survives a reload, just not a tab close) still needs its role re-verified —
// state was never durably stored for `adminRole`/`adminScopeTenantId`
// themselves, and the key could have been revoked/expired since. If it's no
// longer valid, setAdminApiKey's own failure path leaves adminApiKey as the
// stale string but adminRole/adminScopeTenantId as null, which every
// tenant-admin UI already treats as "not authenticated."
const persistedAdminKey = getStoredAdminKey();
if (persistedAdminKey) {
  useAppStore.getState().setAdminApiKey(persistedAdminKey).catch((err) => {
    console.warn("Stored admin key is no longer valid:", err);
  });
}

// Same idea for the regular tenant key: a key persisted from an earlier page
// load has no resolved apiKeyIdentity/apiKeyVerified yet (never durably
// stored), so RequireAuth would otherwise treat a real returning session as
// unauthenticated until the key is re-entered. Resolve it once at boot —
// see setApiKey's comment; apiKeyVerified now gates routing, not just the
// "acting as" banner, so this result matters even though it's not awaited
// here (nothing can await module-level code; RequireAuth's loading state
// covers the gap until this resolves).
const persistedApiKey = getActiveApiKey();
if (persistedApiKey) {
  apiWhoAmI(persistedApiKey)
    .then((who) => {
      if (useAppStore.getState().apiKey === persistedApiKey) {
        useAppStore.setState((state) => ({
          apiKeyIdentity: { label: who.label, tenantId: who.tenantId, roles: who.roles },
          apiKeyVerified: true,
          activeTenantId: state.activeTenantId || who.tenantId,
        }));
      }
    })
    .catch(() => {
      // Invalid/unreachable — apiKeyIdentity stays null, apiKeyVerified
      // flips to false so RequireAuth redirects to /login instead of
      // hanging in a perpetual "still checking" loading state.
      if (useAppStore.getState().apiKey === persistedApiKey) {
        useAppStore.setState({ apiKeyVerified: false });
      }
    });
} else {
  // Nothing stored at all — there's no async check in flight, so
  // apiKeyVerified must become false immediately, not stay at its initial
  // null (which RequireAuth reads as "still checking, show a spinner").
  useAppStore.setState({ apiKeyVerified: false });
}
