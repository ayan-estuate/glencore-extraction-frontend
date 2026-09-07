import React, { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Users,
  Plus,
  Trash2,
  Lock,
  ExternalLink,
  Sliders,
  Sparkles,
  Info,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  Server,
  Key,
  RefreshCw,
} from "lucide-react";
import { useAppStore } from "../../stores/useAppStore";
import { useSnackbar } from "../../hooks/useSnackbar";
import { NotificationTriggerState, TenantEmailSettings } from "../../types/api";
import { DEFAULT_TENANT_EMAIL_SETTINGS } from "../../config/api.config";

export function TenantEmailSettingsPanel() {
  const {
    activeTenantId,
    setActiveTenantId,
    availableTenants,
    backendNotificationSettings,
    isLoadingSettings,
    tenantEmailSettings,
    fetchTenants,
    fetchNotificationSettings,
    saveTenantEmailSettings,
    sendTestNotification,
    notificationPreferences,
    updateNotificationPreferences,
  } = useAppStore();

  const { success, error: errorSnackbar, info } = useSnackbar();

  // Current tenant settings with fallback
  const currentSettings: TenantEmailSettings =
    tenantEmailSettings[activeTenantId] ||
    tenantEmailSettings["default"] || {
      ...DEFAULT_TENANT_EMAIL_SETTINGS.default,
      tenantId: activeTenantId,
    };

  // Local draft state
  const [enabled, setEnabled] = useState(currentSettings.enabled);
  const [fromAddress, setFromAddress] = useState(currentSettings.from);
  const [subjectPrefix, setSubjectPrefix] = useState(currentSettings.subjectPrefix);
  const [resultBaseUrl, setResultBaseUrl] = useState(currentSettings.resultBaseUrl);
  const [notifyOn, setNotifyOn] = useState<NotificationTriggerState[]>(currentSettings.notifyOn);
  const [includeDocumentName, setIncludeDocumentName] = useState(currentSettings.includeDocumentName);
  const [includeErrorDetail, setIncludeErrorDetail] = useState(currentSettings.includeErrorDetail);
  const [maxErrorDetailChars, setMaxErrorDetailChars] = useState(currentSettings.maxErrorDetailChars);
  const [recipients, setRecipients] = useState<string[]>(currentSettings.recipients || []);

  // SMTP Server & Auth state
  const [smtpHost, setSmtpHost] = useState(currentSettings.smtpHost || "smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(currentSettings.smtpPort || 587);
  const [smtpUsername, setSmtpUsername] = useState(currentSettings.smtpUsername || "qode.ai.noreply@gmail.com");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [smtpPasswordConfigured, setSmtpPasswordConfigured] = useState(currentSettings.smtpPasswordConfigured || false);

  // Recipient input
  const [newRecipient, setNewRecipient] = useState("");

  // Email Preview state
  const [previewState, setPreviewState] = useState<NotificationTriggerState>("FAILED");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initial fetch on mount
  useEffect(() => {
    fetchTenants();
    fetchNotificationSettings();
  }, [fetchTenants, fetchNotificationSettings]);

  // Sync draft when backend settings or activeTenantId loads/updates
  useEffect(() => {
    if (backendNotificationSettings) {
      setEnabled(backendNotificationSettings.enabled);
      setFromAddress(backendNotificationSettings.from || "");
      setSubjectPrefix(backendNotificationSettings.subjectPrefix || "");
      setResultBaseUrl(backendNotificationSettings.resultBaseUrl || "");
      if (backendNotificationSettings.notifyOn) {
        setNotifyOn(backendNotificationSettings.notifyOn as NotificationTriggerState[]);
      }
      setIncludeDocumentName(backendNotificationSettings.includeDocumentName);
      setIncludeErrorDetail(backendNotificationSettings.includeErrorDetail);
      setMaxErrorDetailChars(backendNotificationSettings.maxErrorDetailChars || 300);
      const tenantRecs = backendNotificationSettings.tenantRecipients?.[activeTenantId] || [];
      setRecipients(tenantRecs);
      if (backendNotificationSettings.smtpHost) setSmtpHost(backendNotificationSettings.smtpHost);
      if (backendNotificationSettings.smtpPort) setSmtpPort(backendNotificationSettings.smtpPort);
      if (backendNotificationSettings.smtpUsername) setSmtpUsername(backendNotificationSettings.smtpUsername);
      if (backendNotificationSettings.smtpPasswordConfigured !== undefined) {
        setSmtpPasswordConfigured(backendNotificationSettings.smtpPasswordConfigured);
      }
    }
  }, [backendNotificationSettings, activeTenantId]);

  // Sync draft when tenant selection changes
  const handleTenantChange = (newTenant: string) => {
    setActiveTenantId(newTenant);
    const tenantRecs = backendNotificationSettings?.tenantRecipients?.[newTenant] ||
      tenantEmailSettings[newTenant]?.recipients || [];
    setRecipients(tenantRecs);
  };

  const handleAddRecipient = () => {
    const trimmed = newRecipient.trim().toLowerCase();
    if (!trimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      errorSnackbar("Please enter a valid email address", "Invalid Email");
      return;
    }
    if (recipients.includes(trimmed)) {
      info("Recipient is already added", "Duplicate Recipient");
      return;
    }
    setRecipients([...recipients, trimmed]);
    setNewRecipient("");
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleToggleTrigger = (state: NotificationTriggerState) => {
    if (notifyOn.includes(state)) {
      setNotifyOn(notifyOn.filter((s) => s !== state));
    } else {
      setNotifyOn([...notifyOn, state]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const resp = await saveTenantEmailSettings(activeTenantId, {
        enabled,
        recipients,
        notifyOn,
        includeDocumentName,
        includeErrorDetail,
        maxErrorDetailChars,
        subjectPrefix: subjectPrefix.trim(),
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort),
        smtpUsername: smtpUsername.trim(),
        smtpPassword: smtpPassword.trim() ? smtpPassword.trim() : undefined,
      });
      if (resp.smtpPasswordConfigured) {
        setSmtpPasswordConfigured(true);
        setSmtpPassword("");
      }
      success(`Outbound notification settings saved to backend for tenant: ${activeTenantId}`, "Settings Persisted");
    } catch (err: any) {
      errorSnackbar(err.message || "Failed to persist settings to backend", "Save Failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (backendNotificationSettings) {
      setEnabled(backendNotificationSettings.enabled);
      setFromAddress(backendNotificationSettings.from);
      setSubjectPrefix(backendNotificationSettings.subjectPrefix);
      setResultBaseUrl(backendNotificationSettings.resultBaseUrl);
      setNotifyOn(backendNotificationSettings.notifyOn as NotificationTriggerState[]);
      setIncludeDocumentName(backendNotificationSettings.includeDocumentName);
      setIncludeErrorDetail(backendNotificationSettings.includeErrorDetail);
      setMaxErrorDetailChars(backendNotificationSettings.maxErrorDetailChars);
      setRecipients(backendNotificationSettings.tenantRecipients?.[activeTenantId] || []);
      setSmtpHost(backendNotificationSettings.smtpHost || "smtp.gmail.com");
      setSmtpPort(backendNotificationSettings.smtpPort || 587);
      setSmtpUsername(backendNotificationSettings.smtpUsername || "qode.ai.noreply@gmail.com");
      setSmtpPassword("");
      setSmtpPasswordConfigured(backendNotificationSettings.smtpPasswordConfigured || false);
      info("Reset email settings to backend values", "Reset Completed");
    } else {
      const defaultForTenant = DEFAULT_TENANT_EMAIL_SETTINGS[activeTenantId as keyof typeof DEFAULT_TENANT_EMAIL_SETTINGS] || DEFAULT_TENANT_EMAIL_SETTINGS.default;
      setEnabled(defaultForTenant.enabled);
      setFromAddress(defaultForTenant.from);
      setSubjectPrefix(defaultForTenant.subjectPrefix);
      setResultBaseUrl(defaultForTenant.resultBaseUrl);
      setNotifyOn(defaultForTenant.notifyOn);
      setIncludeDocumentName(defaultForTenant.includeDocumentName);
      setIncludeErrorDetail(defaultForTenant.includeErrorDetail);
      setMaxErrorDetailChars(defaultForTenant.maxErrorDetailChars);
      setRecipients(defaultForTenant.recipients);
      setSmtpHost(defaultForTenant.smtpHost || "smtp.gmail.com");
      setSmtpPort(defaultForTenant.smtpPort || 587);
      setSmtpUsername(defaultForTenant.smtpUsername || "qode.ai.noreply@gmail.com");
      setSmtpPassword("");
      setSmtpPasswordConfigured(defaultForTenant.smtpPasswordConfigured || false);
      info("Reset email settings to platform defaults", "Reset Defaults");
    }
  };

  const handleApplyPreset = (preset: "strict" | "dev" | "audit") => {
    if (preset === "strict") {
      setNotifyOn(["FAILED", "PARTIAL", "DEAD_LETTER"]);
      setIncludeDocumentName(false);
      setIncludeErrorDetail(true);
      setMaxErrorDetailChars(300);
      info("Applied Production Strict Preset (No filenames, failure triggers only)", "Preset Applied");
    } else if (preset === "dev") {
      setNotifyOn(["FAILED", "PARTIAL", "DEAD_LETTER", "COMPLETED"]);
      setIncludeDocumentName(true);
      setIncludeErrorDetail(true);
      setMaxErrorDetailChars(500);
      info("Applied Dev / Low-Volume Preset (All triggers + Document names)", "Preset Applied");
    } else if (preset === "audit") {
      setNotifyOn(["FAILED", "DEAD_LETTER"]);
      setIncludeDocumentName(false);
      setIncludeErrorDetail(false);
      setMaxErrorDetailChars(100);
      info("Applied High Security Preset (Sanitized payloads only)", "Preset Applied");
    }
  };

  const handleSendTestEmail = async () => {
    if (recipients.length === 0) {
      errorSnackbar("Add at least one recipient email before sending a test notification", "No Recipients");
      return;
    }
    if (!smtpPasswordConfigured && !smtpPassword.trim()) {
      errorSnackbar(
        "SMTP Password / Gmail App Password is required to send real emails via smtp.gmail.com. Please enter your 16-character App Password below in SMTP Server Settings.",
        "SMTP Password Missing"
      );
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await sendTestNotification({
        tenantId: activeTenantId,
        testEmail: recipients[0],
        recipients: recipients,
        status: previewState,
        documentName: includeDocumentName ? "Glencore_MtIsa_Permit_2026.pdf" : undefined,
        errorCode: previewState === "FAILED" ? "TEST_ALERT" : undefined,
        errorMessage: "Real test notification dispatched from compliance administration console.",
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort),
        smtpUsername: smtpUsername.trim(),
        smtpPassword: smtpPassword.trim() || undefined,
      });

      if (res.status === "DELIVERED" || res.status === "DISPATCHED") {
        setSmtpPasswordConfigured(true);
        success(
          res.message || `Real test email successfully sent via SMTP to ${res.recipients?.join(", ")}`,
          "Email Sent Over SMTP"
        );
      } else if (res.status === "CONFIG_REQUIRED") {
        errorSnackbar(res.message, "Configuration Required");
      } else {
        errorSnackbar(res.message || `Failed to send: ${res.status}`, "SMTP Delivery Error");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to dispatch test notification";
      errorSnackbar(msg, "Test Dispatch Error");
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Scope Selector */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900 flex items-center justify-center shrink-0 mt-0.5">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Tenant Email Notification Overrides
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Backend app.notifications
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure per-tenant terminal state dispatching, recipients, and privacy masking switches.
            </p>
          </div>
        </div>

        {/* Tenant Switcher */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
            Active Tenant:
          </span>
          <select
            value={activeTenantId}
            onChange={(e) => handleTenantChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            {availableTenants.map((t) => (
              <option key={t} value={t}>
                {t === "glencore" ? "glencore (Glencore EHS Compliance)" : t === "default" ? "default (Shared Platform)" : t}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              fetchTenants();
              fetchNotificationSettings();
            }}
            disabled={isLoadingSettings}
            title="Reload backend settings"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSettings ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Settings Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Master Enable Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 text-blue-500" />
                  Outbound Notifications for Tenant "{activeTenantId}"
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Controls whether worker threads dispatch SMTP notifications upon reaching terminal job states.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Quick Presets */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-semibold text-slate-500">Security Presets:</span>
              <button
                onClick={() => handleApplyPreset("strict")}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Production Strict
              </button>
              <button
                onClick={() => handleApplyPreset("dev")}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Dev / Low-Volume
              </button>
              <button
                onClick={() => handleApplyPreset("audit")}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                High Sanitization
              </button>
            </div>
          </div>

          {/* Recipients Management Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  Tenant Recipient Addresses ({recipients.length})
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Configured strictly per tenant. Request-supplied recipient addresses are rejected to avoid open relay vulnerability.
                </p>
              </div>
            </div>

            {/* Recipient Add Row */}
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="e.g. compliance-team@glencore.com"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddRecipient();
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddRecipient}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Recipient</span>
              </button>
            </div>

            {/* Recipients Chips List */}
            <div className="space-y-2">
              {recipients.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>No recipient addresses configured. The extraction service will not send email for this tenant.</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {recipients.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs border border-slate-200 dark:border-slate-700"
                    >
                      <span>{email}</span>
                      <button
                        onClick={() => handleRemoveRecipient(email)}
                        className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trigger States (notify-on) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                Terminal State Trigger Selection (notify-on)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose which job outcomes dispatch email. COMPLETED is omitted by default to avoid alert noise on high-volume runs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* FAILED */}
              <label
                onClick={() => handleToggleTrigger("FAILED")}
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  notifyOn.includes("FAILED")
                    ? "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900"
                    : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={notifyOn.includes("FAILED")}
                  onChange={() => {}}
                  className="mt-0.5"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400">FAILED</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-rose-100 dark:bg-rose-950 text-rose-600">
                      Terminal Error
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Triggered when PDF parsing fails or LLM inference hits fatal fault.
                  </p>
                </div>
              </label>

              {/* PARTIAL */}
              <label
                onClick={() => handleToggleTrigger("PARTIAL")}
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  notifyOn.includes("PARTIAL")
                    ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900"
                    : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={notifyOn.includes("PARTIAL")}
                  onChange={() => {}}
                  className="mt-0.5"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">PARTIAL</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-600">
                      Needs Review
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Triggered when extraction is incomplete or segment count did not fully match.
                  </p>
                </div>
              </label>

              {/* DEAD_LETTER */}
              <label
                onClick={() => handleToggleTrigger("DEAD_LETTER")}
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  notifyOn.includes("DEAD_LETTER")
                    ? "bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900"
                    : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={notifyOn.includes("DEAD_LETTER")}
                  onChange={() => {}}
                  className="mt-0.5"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-400">DEAD_LETTER</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-purple-100 dark:bg-purple-950 text-purple-600">
                      Exhausted
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Triggered when maximum queue worker lease retries are exceeded.
                  </p>
                </div>
              </label>

              {/* COMPLETED */}
              <label
                onClick={() => handleToggleTrigger("COMPLETED")}
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  notifyOn.includes("COMPLETED")
                    ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900"
                    : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={notifyOn.includes("COMPLETED")}
                  onChange={() => {}}
                  className="mt-0.5"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">COMPLETED</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                      Success
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Sends email on every successful job. Recommended only for low-volume tenants.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Privacy & Masking Controls */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-blue-500" />
                Data Privacy & Outbound Channel Safeguards
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Email crosses unencrypted public hops. Backend policy strictly forbids emailing extracted obligations or confidential PII.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* Include Doc Name Toggle */}
              <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                      Include Document Filename
                    </span>
                    <span className="text-[10px] font-mono text-rose-500 bg-rose-50 dark:bg-rose-950/60 px-1 rounded">
                      Privacy Sensitive
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Off by default. Permit filenames (e.g. <code>Glencore_MtIsa_Permit_2026.pdf</code>) reveal the operator and mining site to email relays. Enable only if recipients are pre-authorized.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={includeDocumentName}
                  onChange={(e) => setIncludeDocumentName(e.target.checked)}
                  className="mt-1"
                />
              </div>

              {/* Include Error Detail */}
              <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                    Include Platform Error Detail
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Sends the platform's diagnostic error text alongside the error code. The message carries internal diagnostic reasons and no document source text.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={includeErrorDetail}
                  onChange={(e) => setIncludeErrorDetail(e.target.checked)}
                  className="mt-1"
                />
              </div>

              {/* Max error detail chars slider */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                    Max Error Detail Truncation Limit
                  </span>
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {maxErrorDetailChars} characters
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="600"
                  step="50"
                  value={maxErrorDetailChars}
                  onChange={(e) => setMaxErrorDetailChars(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Envelope & Result URL */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
              Envelope Sender & Result Deep-Link Settings
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Envelope From Address
                </label>
                <input
                  type="text"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  placeholder="no-reply@compliance.domain"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Subject Prefix
                </label>
                <input
                  type="text"
                  value={subjectPrefix}
                  onChange={(e) => setSubjectPrefix(e.target.value)}
                  placeholder="[Obligation Extraction]"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Result Link Base URL (Portal Deep Link)
                </label>
                <input
                  type="text"
                  value={resultBaseUrl}
                  onChange={(e) => setResultBaseUrl(e.target.value)}
                  placeholder="http://localhost:5173/library/"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 block">
                  Configured URL prevents host-header poisoning. Left blank, the mail will carry no deep link.
                </span>
              </div>
            </div>
          </div>

          {/* SMTP Server & Relay Configuration Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-blue-500" />
                  SMTP Server & Relay Authentication
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Credentials for outbound email delivery over SMTP (STARTTLS).
                </p>
              </div>
              {smtpPasswordConfigured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Password Configured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  Password Required
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Port
                </label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  placeholder="587"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  SMTP Username / Auth Account
                </label>
                <input
                  type="text"
                  value={smtpUsername}
                  onChange={(e) => {
                    setSmtpUsername(e.target.value);
                    if (!fromAddress) setFromAddress(e.target.value);
                  }}
                  placeholder="e.g. qode.ai.noreply@gmail.com"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3 h-3 text-slate-400" />
                    SMTP Password / App Password
                  </label>
                  {smtpPasswordConfigured && !smtpPassword && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Active on server &mdash; enter here to override
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder={
                      smtpPasswordConfigured
                        ? "•••••••••••••••• (saved on server, leave blank to keep)"
                        : "Enter 16-char Gmail App Password"
                    }
                    className="w-full px-3 py-1.5 pr-9 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Gmail App Password Guidance Info Box */}
            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900 text-[11px] text-blue-900 dark:text-blue-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Gmail SMTP Relay Delivery</span>
              </div>
              <p className="opacity-90 leading-relaxed">
                Google SMTP (<code>smtp.gmail.com:587</code>) requires 2-Step Verification and a dedicated 16-character <strong>App Password</strong>. Standard account passwords will fail authentication.
              </p>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline mt-0.5"
              >
                Generate Google App Password <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Live Email Preview & Test Dispatcher (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Email Preview Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Live Outbound Email Preview
                </h4>
              </div>

              {/* Trigger preview selector */}
              <div className="flex items-center gap-1">
                {(["FAILED", "PARTIAL", "COMPLETED"] as NotificationTriggerState[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => setPreviewState(st)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                      previewState === st
                        ? st === "FAILED"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : st === "PARTIAL"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Shell Mock */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 overflow-hidden font-sans text-xs">
              {/* Email Headers */}
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">From:</strong>{" "}
                  {fromAddress || "no-reply@compliance.internal"}
                </div>
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">To:</strong>{" "}
                  {recipients.length > 0 ? recipients.join(", ") : "<No recipients configured>"}
                </div>
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">Subject:</strong>{" "}
                  <span className="text-slate-900 dark:text-slate-100 font-semibold">
                    {subjectPrefix} Extraction {previewState} — Job 9a3e201b
                  </span>
                </div>
              </div>

              {/* Email Content Body */}
              <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
                {/* Status Callout Banner */}
                <div
                  className={`p-3 rounded-lg border ${
                    previewState === "FAILED"
                      ? "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200"
                      : previewState === "PARTIAL"
                      ? "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200"
                      : "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    {previewState === "FAILED" ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                    ) : previewState === "PARTIAL" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>
                      {previewState === "FAILED"
                        ? "Extraction Pipeline Failed"
                        : previewState === "PARTIAL"
                        ? "Extraction Partially Completed — Review Required"
                        : "Extraction Successfully Completed"}
                    </span>
                  </div>
                  <p className="text-[11px] mt-1 opacity-90">
                    {previewState === "FAILED"
                      ? "The automated parser encountered an unrecoverable failure while analyzing regulatory permit obligations."
                      : previewState === "PARTIAL"
                      ? "18 of 22 obligation segments were recovered. 4 segments require legal auditor adjudication."
                      : "26 statutory obligations extracted and added to compliance matrix."}
                  </p>
                </div>

                {/* Telemetry Block */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Job UUID:</span>
                    <span className="text-slate-800 dark:text-slate-200">9a3e201b-c439-4d2a-9e1a-8c67d8a9e012</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tenant:</span>
                    <span className="text-slate-800 dark:text-slate-200">{activeTenantId}</span>
                  </div>

                  {includeDocumentName && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Document:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">Glencore_MtIsa_Permit_2026.pdf</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-slate-400">Timestamp:</span>
                    <span className="text-slate-800 dark:text-slate-200">2026-09-11 14:40:00 UTC</span>
                  </div>
                </div>

                {/* Error Detail Snippet */}
                {includeErrorDetail && previewState === "FAILED" && (
                  <div className="p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/40 text-[11px] font-mono text-rose-700 dark:text-rose-300">
                    <strong>Error Diagnostic:</strong>{" "}
                    {"LLM_PROVIDER_TIMEOUT: Upstream model reasoning exceeded lease window (lease=900s).".slice(
                      0,
                      maxErrorDetailChars
                    )}
                  </div>
                )}

                {/* Link Button */}
                {resultBaseUrl && (
                  <div className="pt-2 text-center">
                    <span className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors">
                      View Job in Compliance Platform &rarr;
                    </span>
                  </div>
                )}

                {/* Security Footnote */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 leading-tight">
                  <div className="flex items-center gap-1 text-slate-500 font-semibold mb-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>Security & Masking Assurance:</span>
                  </div>
                  This automated message carries no raw permit text, extracted legal obligations, or entity names. Results are accessible solely through authenticated API / UI session.
                </div>
              </div>
            </div>

            {/* Test Email Dispatcher */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                onClick={handleSendTestEmail}
                disabled={isSendingTest}
                className="w-full px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
              >
                {isSendingTest ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    Dispatching SMTP Alert via Backend...
                  </span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Real Test Email ({previewState})</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Defaults</span>
                </button>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{isSaving ? "Saving..." : "Save Tenant Overrides"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
