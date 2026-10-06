import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  DollarSign,
  Gauge,
  Globe2,
  Key,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useAppStore } from "../../stores/useAppStore";
import { useSnackbar } from "../../hooks/useSnackbar";
import { ApiKeyRole, ApiKeyView, TenantView } from "../../types/api";
import { formatDate } from "../../lib/utils";
import { ConfirmModal } from "../../components/common/ConfirmModal";

type PrivacyListField = "knownOrganisations" | "knownPeople" | "knownSites";

/**
 * Tenant Administration — moved out of SettingsPage.tsx (formerly its
 * "tenants" sub-tab) into its own guarded route (see RequireAdmin) so it's
 * structurally separate from the regular tenant-user workflow, not just a
 * tab a business user could stumble into.
 */
export function AdminTenantsPage() {
  const {
    adminApiKey,
    adminRole,
    adminKeyLabel,
    tenants,
    isLoadingTenants,
    fetchTenantsAdmin,
    createTenant,
    updateTenantAdmin,
    apiKeysByTenant,
    isLoadingApiKeys,
    fetchApiKeysForTenant,
    issueApiKeyForTenant,
    revokeApiKeyForTenant,
  } = useAppStore();
  const { success, error: errorSnackbar } = useSnackbar();

  // "Acting as" prefix reused across every confirm dialog on this page, so
  // an action always reads as "key X is about to do Y to tenant Z" instead
  // of leaving the acting identity implicit.
  const actingAs = adminKeyLabel ? `Acting as "${adminKeyLabel}" (${adminRole}).` : `Acting as ${adminRole}.`;

  const [newTenantId, setNewTenantId] = useState("");
  const [newTenantName, setNewTenantName] = useState("");
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);
  const [selectedAdminTenantId, setSelectedAdminTenantId] = useState<string | null>(null);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyRoles, setNewKeyRoles] = useState<ApiKeyRole[]>(["EXTRACT"]);
  const [isIssuingKey, setIsIssuingKey] = useState(false);
  const [justIssuedKey, setJustIssuedKey] = useState<string | null>(null);
  const [isIssueConfirmOpen, setIsIssueConfirmOpen] = useState(false);
  const [pendingRevokeKey, setPendingRevokeKey] = useState<ApiKeyView | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Tenant policy (rate limit / budget / privacy) draft state — budget is edited in
  // USD and converted to/from the backend's integer micro-currency units on save.
  const [policyDraft, setPolicyDraft] = useState({
    requestsPerMinute: "",
    maxConcurrentSubmissions: "",
    perJobCeilingUsd: "",
    perTenantMonthlyCeilingUsd: "",
  });
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [privacyDraft, setPrivacyDraft] = useState<{
    knownOrganisations: string[];
    knownPeople: string[];
    knownSites: string[];
  }>({ knownOrganisations: [], knownPeople: [], knownSites: [] });
  const [orgInput, setOrgInput] = useState("");
  const [personInput, setPersonInput] = useState("");
  const [siteInput, setSiteInput] = useState("");

  useEffect(() => {
    if (adminApiKey && adminRole) fetchTenantsAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminApiKey, adminRole]);

  useEffect(() => {
    const tenant = tenants.find((t) => t.id === selectedAdminTenantId);
    if (!tenant) return;
    setPolicyDraft({
      requestsPerMinute: tenant.rateLimit.requestsPerMinute?.toString() ?? "",
      maxConcurrentSubmissions: tenant.rateLimit.maxConcurrentSubmissions?.toString() ?? "",
      perJobCeilingUsd:
        tenant.budget.perJobCeilingMicros != null
          ? (tenant.budget.perJobCeilingMicros / 1_000_000).toString()
          : "",
      perTenantMonthlyCeilingUsd:
        tenant.budget.perTenantMonthlyCeilingMicros != null
          ? (tenant.budget.perTenantMonthlyCeilingMicros / 1_000_000).toString()
          : "",
    });
    setPrivacyDraft({
      knownOrganisations: [...tenant.privacy.knownOrganisations],
      knownPeople: [...tenant.privacy.knownPeople],
      knownSites: [...tenant.privacy.knownSites],
    });
  }, [selectedAdminTenantId, tenants]);

  const handleCreateTenant = async () => {
    if (!newTenantId.trim() || !newTenantName.trim()) {
      errorSnackbar("Tenant ID and Display Name are both required", "Validation Error");
      return;
    }
    if (adminRole !== "PLATFORM_ADMIN") {
      errorSnackbar("Only a PLATFORM_ADMIN key can create tenants", "Insufficient Role");
      return;
    }
    setIsCreatingTenant(true);
    try {
      const tenant = await createTenant({ tenantId: newTenantId.trim(), displayName: newTenantName.trim() });
      success(`Tenant "${tenant.id}" created`, "Tenant Created");
      setNewTenantId("");
      setNewTenantName("");
      setSelectedAdminTenantId(tenant.id);
    } catch (err: any) {
      errorSnackbar(err.response?.data?.message || err.message || "Failed to create tenant", "Create Failed");
    } finally {
      setIsCreatingTenant(false);
    }
  };

  const handleToggleTenantStatus = async (tenant: TenantView) => {
    try {
      await updateTenantAdmin(tenant.id, { status: tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" });
      success(`Tenant "${tenant.id}" is now ${tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"}`, "Tenant Updated");
    } catch (err: any) {
      errorSnackbar(err.response?.data?.message || err.message || "Failed to update tenant", "Update Failed");
    }
  };

  const handleSelectTenantForKeys = (tenantId: string) => {
    setSelectedAdminTenantId(tenantId);
    setJustIssuedKey(null);
    fetchApiKeysForTenant(tenantId);
  };

  const handleIssueApiKey = () => {
    if (!selectedAdminTenantId) return;
    if (!newKeyLabel.trim()) {
      errorSnackbar("Enter a label for the new key", "Validation Error");
      return;
    }
    // Confirm first — this previously fired immediately on click with no
    // confirmation step at all, for an action that mints a live credential
    // (and, for a PLATFORM_ADMIN-role key, one with cross-tenant reach).
    setIsIssueConfirmOpen(true);
  };

  const confirmIssueApiKey = async () => {
    if (!selectedAdminTenantId) return;
    setIsIssuingKey(true);
    try {
      const issued = await issueApiKeyForTenant(selectedAdminTenantId, {
        label: newKeyLabel.trim(),
        roles: newKeyRoles,
      });
      setJustIssuedKey(issued.plaintextKey);
      setNewKeyLabel("");
      setIsIssueConfirmOpen(false);
      success(`Key "${issued.label}" issued for tenant "${selectedAdminTenantId}"`, "API Key Issued");
    } catch (err: any) {
      errorSnackbar(err.response?.data?.message || err.message || "Failed to issue API key", "Issue Failed");
    } finally {
      setIsIssuingKey(false);
    }
  };

  const handleRevokeApiKey = (key: ApiKeyView) => {
    // Same reasoning as issue — revoking is destructive/irreversible and
    // previously had no confirmation step, just a bare trash-icon button.
    setPendingRevokeKey(key);
  };

  const confirmRevokeApiKey = async () => {
    if (!selectedAdminTenantId || !pendingRevokeKey) return;
    setIsRevoking(true);
    try {
      await revokeApiKeyForTenant(selectedAdminTenantId, pendingRevokeKey.id);
      success("API key revoked", "Key Revoked");
      setPendingRevokeKey(null);
    } catch (err: any) {
      errorSnackbar(err.response?.data?.message || err.message || "Failed to revoke key", "Revoke Failed");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!selectedAdminTenantId) return;
    setIsSavingPolicy(true);
    try {
      await updateTenantAdmin(selectedAdminTenantId, {
        rateLimit: {
          requestsPerMinute: policyDraft.requestsPerMinute.trim()
            ? Number(policyDraft.requestsPerMinute)
            : null,
          maxConcurrentSubmissions: policyDraft.maxConcurrentSubmissions.trim()
            ? Number(policyDraft.maxConcurrentSubmissions)
            : null,
        },
        budget: {
          perJobCeilingMicros: policyDraft.perJobCeilingUsd.trim()
            ? Math.round(Number(policyDraft.perJobCeilingUsd) * 1_000_000)
            : null,
          perTenantMonthlyCeilingMicros: policyDraft.perTenantMonthlyCeilingUsd.trim()
            ? Math.round(Number(policyDraft.perTenantMonthlyCeilingUsd) * 1_000_000)
            : null,
        },
        privacy: privacyDraft,
      });
      success(`Rate limit, budget, and privacy policy saved for tenant "${selectedAdminTenantId}"`, "Policy Saved");
    } catch (err: any) {
      errorSnackbar(err.response?.data?.message || err.message || "Failed to save tenant policy", "Save Failed");
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const addPrivacyEntry = (field: PrivacyListField, value: string, clear: () => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setPrivacyDraft((prev) =>
      prev[field].includes(trimmed) ? prev : { ...prev, [field]: [...prev[field], trimmed] }
    );
    clear();
  };

  const removePrivacyEntry = (field: PrivacyListField, value: string) => {
    setPrivacyDraft((prev) => ({ ...prev, [field]: prev[field].filter((v) => v !== value) }));
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Tenant Administration
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Verified as <strong>{adminRole}</strong>
          {adminRole === "TENANT_ADMIN" ? " — scoped to your own tenant only." : " — cross-tenant access."}
        </p>
      </div>

      {/* Create Tenant — PLATFORM_ADMIN only; a TENANT_ADMIN has exactly one
          tenant (its own) and can't create new ones (backend 403s it). */}
      {adminRole === "PLATFORM_ADMIN" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Create Tenant</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Tenant ID</label>
              <input
                type="text"
                value={newTenantId}
                onChange={(e) => setNewTenantId(e.target.value)}
                placeholder="e.g. acme-mining"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-5 space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Display Name</label>
              <input
                type="text"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                placeholder="e.g. Acme Mining Co"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                onClick={handleCreateTenant}
                disabled={isCreatingTenant}
                className="w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isCreatingTenant ? "Creating..." : "Create"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenant List */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500" />
            {adminRole === "TENANT_ADMIN" ? "Your Tenant" : `Tenants (${tenants.length})`}
          </h3>
          <button
            onClick={() => fetchTenantsAdmin()}
            disabled={isLoadingTenants}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTenants ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>

        {tenants.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            {isLoadingTenants ? "Loading tenants…" : "No tenants yet — create one above."}
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">{tenant.id}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        tenant.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      }`}
                    >
                      {tenant.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{tenant.displayName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleTenantStatus(tenant)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {tenant.status === "ACTIVE" ? "Suspend" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleSelectTenantForKeys(tenant.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer flex items-center gap-1 ${
                      selectedAdminTenantId === tenant.id
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Key className="w-3 h-3" />
                    <span>Manage</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rate Limit, Budget & Privacy Policy for selected tenant */}
      {selectedAdminTenantId && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-500" />
            Rate Limit, Budget & Privacy Policy for "{selectedAdminTenantId}"
          </h3>

          {/* Rate Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                Requests / Minute
              </label>
              <input
                type="number"
                min="0"
                value={policyDraft.requestsPerMinute}
                onChange={(e) => setPolicyDraft((p) => ({ ...p, requestsPerMinute: e.target.value }))}
                placeholder="Unlimited"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                Max Concurrent Submissions
              </label>
              <input
                type="number"
                min="0"
                value={policyDraft.maxConcurrentSubmissions}
                onChange={(e) => setPolicyDraft((p) => ({ ...p, maxConcurrentSubmissions: e.target.value }))}
                placeholder="Unlimited"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                Per-Job Ceiling (USD)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={policyDraft.perJobCeilingUsd}
                onChange={(e) => setPolicyDraft((p) => ({ ...p, perJobCeilingUsd: e.target.value }))}
                placeholder="Unlimited"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                Per-Tenant Monthly Ceiling (USD)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={policyDraft.perTenantMonthlyCeilingUsd}
                onChange={(e) =>
                  setPolicyDraft((p) => ({ ...p, perTenantMonthlyCeilingUsd: e.target.value }))
                }
                placeholder="Unlimited"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Privacy — known entities exempt from egress masking */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-slate-400" />
              Privacy Gazetteer (known organisations / people / sites)
            </label>
            {(
              [
                ["knownOrganisations", orgInput, setOrgInput, "Organisation name"],
                ["knownPeople", personInput, setPersonInput, "Person name"],
                ["knownSites", siteInput, setSiteInput, "Site name"],
              ] as [PrivacyListField, string, React.Dispatch<React.SetStateAction<string>>, string][]
            ).map(([field, value, setValue, placeholder]) => (
              <div key={field} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPrivacyEntry(field, value, () => setValue(""));
                      }
                    }}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => addPrivacyEntry(field, value, () => setValue(""))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {privacyDraft[field].map((entry) => (
                    <span
                      key={entry}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] border border-slate-200 dark:border-slate-700"
                    >
                      {entry}
                      <button
                        onClick={() => removePrivacyEntry(field, entry)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSavePolicy}
            disabled={isSavingPolicy}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSavingPolicy ? "Saving..." : "Save Policy"}</span>
          </button>
        </div>
      )}

      {/* API Keys for selected tenant */}
      {selectedAdminTenantId && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            API Keys for "{selectedAdminTenantId}"
          </h3>

          {/* Issue new key */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="sm:col-span-5 space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Label</label>
              <input
                type="text"
                value={newKeyLabel}
                onChange={(e) => setNewKeyLabel(e.target.value)}
                placeholder="e.g. &quot;Priya Shah – finance team uploads&quot;"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-400">
                Identifies this key in the audit log — name the person or system, not just an environment.
              </p>
            </div>
            <div className="sm:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Roles</label>
              <div className="flex items-center gap-3 h-9">
                {(
                  // A TENANT_ADMIN can never issue a PLATFORM_ADMIN-role key
                  // (the backend 403s it) — hide the option entirely rather
                  // than offer a checkbox that will always fail.
                  adminRole === "PLATFORM_ADMIN"
                    ? (["EXTRACT", "TENANT_ADMIN", "PLATFORM_ADMIN"] as ApiKeyRole[])
                    : (["EXTRACT", "TENANT_ADMIN"] as ApiKeyRole[])
                ).map((role) => (
                  <label key={role} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newKeyRoles.includes(role)}
                      onChange={(e) =>
                        setNewKeyRoles((prev) =>
                          e.target.checked ? [...prev, role] : prev.filter((r) => r !== role)
                        )
                      }
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-3">
              <button
                onClick={handleIssueApiKey}
                disabled={isIssuingKey}
                className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isIssuingKey ? "Issuing..." : "Issue Key"}</span>
              </button>
            </div>
          </div>

          {justIssuedKey && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1.5">
              <p className="font-bold text-emerald-800 dark:text-emerald-300">
                Key issued — shown once, copy it now (only a hash is stored server-side):
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 font-mono text-[11px] break-all">
                  {justIssuedKey}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(justIssuedKey);
                    success("Copied to clipboard", "Copied");
                  }}
                  className="p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 cursor-pointer shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                </button>
              </div>
            </div>
          )}

          {/* Existing keys */}
          <div className="space-y-2">
            {isLoadingApiKeys ? (
              <p className="text-xs text-slate-400 py-2">Loading keys…</p>
            ) : (apiKeysByTenant[selectedAdminTenantId] || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No API keys issued yet for this tenant.</p>
            ) : (
              (apiKeysByTenant[selectedAdminTenantId] || []).map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{key.label}</span>
                      <span className="text-[10px] font-mono text-slate-400">{key.roles.join(", ")}</span>
                      {key.revokedAt && (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">REVOKED</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">Created {formatDate(key.createdAt)}</span>
                  </div>
                  {!key.revokedAt && (
                    <button
                      onClick={() => handleRevokeApiKey(key)}
                      title="Revoke key"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {!adminApiKey && (
        <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Admin session lost — this shouldn't normally be reachable here (RequireAdmin should have redirected).</span>
        </div>
      )}

      <ConfirmModal
        isOpen={isIssueConfirmOpen}
        onClose={() => setIsIssueConfirmOpen(false)}
        onConfirm={confirmIssueApiKey}
        isLoading={isIssuingKey}
        variant={newKeyRoles.includes("PLATFORM_ADMIN") ? "danger" : "warning"}
        title="Issue new API key?"
        confirmText="Issue Key"
        description={
          `${actingAs} About to issue a new ${newKeyRoles.join("/")} key labeled "${newKeyLabel}" ` +
          `for tenant "${selectedAdminTenantId}".` +
          (newKeyRoles.includes("PLATFORM_ADMIN")
            ? " This key will have cross-tenant PLATFORM_ADMIN access — treat it as highly privileged."
            : "")
        }
      />

      <ConfirmModal
        isOpen={pendingRevokeKey !== null}
        onClose={() => setPendingRevokeKey(null)}
        onConfirm={confirmRevokeApiKey}
        isLoading={isRevoking}
        variant="danger"
        title="Revoke API key?"
        confirmText="Revoke Key"
        description={
          pendingRevokeKey
            ? `${actingAs} About to revoke "${pendingRevokeKey.label}" (${pendingRevokeKey.roles.join(", ")}) ` +
              `for tenant "${selectedAdminTenantId}". This cannot be undone — anything still using that key ` +
              `will immediately start failing authentication.`
            : ""
        }
      />
    </div>
  );
}
