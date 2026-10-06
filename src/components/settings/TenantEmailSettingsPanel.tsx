import React, { useCallback, useEffect, useState } from "react";
import {
  Mail,
  Send,
  Lock,
  Users,
  Plus,
  Trash2,
  Info,
  Server,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Check,
  ExternalLink,
} from "lucide-react";
import { useAppStore } from "../../stores/useAppStore";
import { useSnackbar } from "../../hooks/useSnackbar";
import {
  apiDeleteSmtpConfig,
  apiGetSmtpConfig,
  apiSaveSmtpConfig,
  apiSendSmtpTestEmail,
  normalizeError,
} from "../../lib/apiClient";
import { effectiveTenantId } from "../../lib/tenantScope";
import { NotificationTriggerState, SmtpConfigView } from "../../types/api";

const TRIGGERS: { state: NotificationTriggerState; label: string; hint: string }[] = [
  { state: "FAILED", label: "Failed", hint: "A job ended in an unrecoverable error" },
  { state: "PARTIAL", label: "Partial", hint: "Some segments could not be processed" },
  { state: "DEAD_LETTER", label: "Dead letter", hint: "A job exhausted all retries" },
  { state: "COMPLETED", label: "Completed", hint: "A job finished successfully" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public mail services that refuse to send anything without a login.
const LOGIN_REQUIRED_HOSTS = ["gmail.com", "googlemail.com", "office365.com", "outlook.com", "sendgrid.net", "amazonaws.com", "mailgun.org"];
const requiresLogin = (host: string) => LOGIN_REQUIRED_HOSTS.some((h) => host.trim().toLowerCase().endsWith(h));

const inputCls =
  "w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
const cardCls =
  "p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4";

export function TenantEmailSettingsPanel() {
  const {
    activeTenantId,
    setActiveTenantId,
    adminApiKey,
    adminRole,
    adminScopeTenantId,
    apiKeyIdentity,
    tenants,
    isLoadingTenants,
    fetchTenantsAdmin,
    saveTenantNotificationPolicy,
  } = useAppStore();
  const { success, error: errorSnackbar, info } = useSnackbar();

  // A TENANT_ADMIN can only manage its own tenant.
  const tenantId = effectiveTenantId({
    adminRole,
    adminScopeTenantId,
    activeTenantId,
    tenants,
    identityTenantId: apiKeyIdentity?.tenantId,
  });
  const activeTenant = tenants.find((t) => t.id === tenantId);

  // --- Notification policy (stored on the tenant) ---
  const [recipients, setRecipients] = useState<string[]>([]);
  const [notifyOn, setNotifyOn] = useState<NotificationTriggerState[]>([]);
  const [includeDocumentName, setIncludeDocumentName] = useState(false);
  const [includeErrorDetail, setIncludeErrorDetail] = useState(true);
  const [newRecipient, setNewRecipient] = useState("");
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // --- SMTP (stored per tenant; password encrypted server-side, never returned) ---
  const [smtp, setSmtp] = useState<SmtpConfigView | null>(null);
  const [smtpLoaded, setSmtpLoaded] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [useStarttls, setUseStarttls] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fromAddress, setFromAddress] = useState("");
  const [subjectPrefix, setSubjectPrefix] = useState("[Obligation Extraction]");
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);

  // --- Test email ---
  const [testRecipient, setTestRecipient] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const hasAdmin = !!adminApiKey && !!adminRole;

  useEffect(() => {
    if (hasAdmin) fetchTenantsAdmin().catch(() => undefined);
  }, [hasAdmin, fetchTenantsAdmin]);

  useEffect(() => {
    if (activeTenant) {
      setRecipients(activeTenant.notification.recipients);
      setNotifyOn(activeTenant.notification.notifyOn as NotificationTriggerState[]);
      setIncludeDocumentName(activeTenant.notification.includeDocumentName);
      setIncludeErrorDetail(activeTenant.notification.includeErrorDetail);
    }
  }, [activeTenant]);

  const loadSmtp = useCallback(async () => {
    if (!hasAdmin || !tenantId) return;
    setSmtpLoaded(false);
    try {
      const cfg = await apiGetSmtpConfig(adminApiKey, tenantId);
      setSmtp(cfg);
      setEnabled(cfg?.enabled ?? true);
      setHost(cfg?.host ?? "");
      setPort(cfg?.port ?? 587);
      setUseStarttls(cfg?.useStarttls ?? true);
      setUsername(cfg?.username ?? "");
      setFromAddress(cfg?.fromAddress ?? "");
      setSubjectPrefix(cfg?.subjectPrefix ?? "[Obligation Extraction]");
      setPassword("");
    } catch (err: unknown) {
      setSmtp(null);
      errorSnackbar(normalizeError(err).message, "Could not load SMTP settings");
    } finally {
      setSmtpLoaded(true);
    }
  }, [hasAdmin, adminApiKey, tenantId, errorSnackbar]);

  useEffect(() => {
    loadSmtp();
  }, [loadSmtp]);

  const addRecipient = () => {
    const email = newRecipient.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      errorSnackbar("Please enter a valid email address", "Invalid Email");
      return;
    }
    if (recipients.includes(email)) {
      info("Recipient is already added", "Duplicate Recipient");
      return;
    }
    setRecipients([...recipients, email]);
    setNewRecipient("");
  };

  const toggleTrigger = (state: NotificationTriggerState) =>
    setNotifyOn((cur) => (cur.includes(state) ? cur.filter((s) => s !== state) : [...cur, state]));

  const savePolicy = async () => {
    setIsSavingPolicy(true);
    try {
      await saveTenantNotificationPolicy(tenantId, { recipients, notifyOn, includeDocumentName, includeErrorDetail });
      success(`Notification policy saved for tenant "${tenantId}"`, "Saved");
    } catch (err: unknown) {
      errorSnackbar(normalizeError(err).message, "Save Failed");
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const saveSmtp = async () => {
    if (!host.trim() || !fromAddress.trim()) {
      errorSnackbar("SMTP host and a from address are required.", "Incomplete settings");
      return;
    }
    if (requiresLogin(host) && !username.trim()) {
      errorSnackbar(
        `${host.trim()} requires a login. Enter the account's username (usually the full email address) and password.`,
        "Username required"
      );
      return;
    }
    if (username.trim() && !password && !smtp?.passwordSet) {
      errorSnackbar("A password is required when a username is set.", "Incomplete settings");
      return;
    }
    setIsSavingSmtp(true);
    try {
      const saved = await apiSaveSmtpConfig(adminApiKey, tenantId, {
        enabled,
        host: host.trim(),
        port: Number(port),
        username: username.trim() || null,
        password: password || null,
        useStarttls,
        fromAddress: fromAddress.trim(),
        subjectPrefix: subjectPrefix.trim(),
      });
      setSmtp(saved);
      setPassword("");
      success(`SMTP settings saved for tenant "${tenantId}"`, "Saved");
    } catch (err: unknown) {
      errorSnackbar(normalizeError(err).message, "Save Failed");
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const removeSmtp = async () => {
    if (!window.confirm(`Remove the saved SMTP settings (including the password) for tenant "${tenantId}"?`)) return;
    try {
      await apiDeleteSmtpConfig(adminApiKey, tenantId);
      success("SMTP settings removed", "Removed");
      await loadSmtp();
    } catch (err: unknown) {
      errorSnackbar(normalizeError(err).message, "Could not remove SMTP settings");
    }
  };

  const sendTest = async () => {
    const to = testRecipient.trim();
    if (!EMAIL_RE.test(to)) {
      errorSnackbar("Enter the address to send the test email to.", "Invalid Email");
      return;
    }
    setIsSendingTest(true);
    try {
      await apiSendSmtpTestEmail(adminApiKey, tenantId, to);
      success(`The SMTP server accepted the message for ${to}.`, "Test email sent");
    } catch (err: unknown) {
      errorSnackbar(normalizeError(err).message, "Test email failed");
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!hasAdmin) {
    return (
      <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          Email settings need a verified <strong>TENANT_ADMIN</strong> or <strong>PLATFORM_ADMIN</strong> key. Sign in
          with one (Settings &rarr; API Credentials).
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header + tenant scope */}
      <div className={`${cardCls} md:flex-row md:items-center justify-between !space-y-0 flex flex-col gap-4`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Email &amp; Notifications</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Outbound mail server and who is alerted when this tenant's jobs finish. Everything here is saved on the
              server.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tenant:</span>
          {adminRole === "PLATFORM_ADMIN" ? (
            <select
              value={tenantId}
              onChange={(e) => setActiveTenantId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id} ({t.displayName})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{tenantId}</span>
          )}
          <button
            onClick={() => {
              fetchTenantsAdmin().catch(() => undefined);
              loadSmtp();
            }}
            disabled={isLoadingTenants}
            title="Reload from server"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTenants ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* SMTP server */}
      <div className={cardCls}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-blue-500" />
              SMTP Server for "{tenantId}"
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Used for this tenant's job notifications. The password is encrypted before it is stored and is never shown
              again.
            </p>
          </div>
          {!smtpLoaded ? (
            <span className="text-[10px] text-slate-400">Loading...</span>
          ) : smtp ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3 h-3" /> Saved{smtp.enabled ? "" : " (disabled)"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-3 h-3" /> Not configured: no emails are sent
            </span>
          )}
        </div>

        <label className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-blue-500" /> Send job notifications for this tenant
          </span>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">SMTP Host</label>
            <input className={inputCls} value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Port</label>
            <input
              className={inputCls}
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder="587"
            />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Username{" "}
              <span className="font-normal text-slate-400">
                {requiresLogin(host) ? "(required for this server)" : "(leave empty for a relay without login)"}
              </span>
            </label>
            <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Key className="w-3 h-3 text-slate-400" /> Password / App Password
              </label>
              {smtp?.passwordSet && !password && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Saved on server, leave blank to keep
                </span>
              )}
            </div>
            <div className="relative">
              <input
                className={`${inputCls} pr-9`}
                type={showPassword ? "text" : "password"}
                value={password}
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder={smtp?.passwordSet ? "••••••••••••••••" : ""}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">From Address</label>
            <input className={inputCls} value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Encryption</label>
            <select
              className={inputCls}
              value={useStarttls ? "starttls" : "none"}
              onChange={(e) => setUseStarttls(e.target.value === "starttls")}
            >
              <option value="starttls">STARTTLS (587)</option>
              <option value="none">None</option>
            </select>
          </div>
          <div className="space-y-1 sm:col-span-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Subject Prefix</label>
            <input className={inputCls} value={subjectPrefix} onChange={(e) => setSubjectPrefix(e.target.value)} />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900 text-[11px] text-blue-900 dark:text-blue-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Info className="w-3.5 h-3.5 shrink-0" /> Gmail
          </div>
          <p className="opacity-90 leading-relaxed">
            <code>smtp.gmail.com:587</code> needs 2-Step Verification and a 16-character <strong>App Password</strong>;
            the normal account password is rejected.{" "}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline"
            >
              Create one <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <input
              className={`${inputCls} w-64`}
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="send a test email to..."
            />
            <button
              onClick={sendTest}
              disabled={isSendingTest || !smtp}
              title={smtp ? "Sends a real email using the SAVED settings" : "Save the settings first"}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50"
            >
              {isSendingTest ? "Sending..." : "Send test"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {smtp && (
              <button
                onClick={removeSmtp}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
              >
                Remove
              </button>
            )}
            <button
              onClick={saveSmtp}
              disabled={isSavingSmtp}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> {isSavingSmtp ? "Saving..." : "Save SMTP settings"}
            </button>
          </div>
        </div>
      </div>

      {/* Recipients + triggers + privacy */}
      <div className={cardCls}>
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-blue-500" /> Who is notified, and when
        </h4>

        <div className="flex gap-2">
          <input
            className={inputCls}
            value={newRecipient}
            onChange={(e) => setNewRecipient(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRecipient()}
            placeholder="recipient@company.com"
          />
          <button
            onClick={addRecipient}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        {recipients.length === 0 ? (
          <p className="text-[11px] text-slate-500">No recipients: nobody is emailed.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {recipients.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300"
              >
                {r}
                <button
                  onClick={() => setRecipients(recipients.filter((x) => x !== r))}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  aria-label={`Remove ${r}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {TRIGGERS.map((t) => (
            <label
              key={t.state}
              className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 cursor-pointer"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={notifyOn.includes(t.state)}
                onChange={() => toggleTrigger(t.state)}
              />
              <span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-200 block">{t.label}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-blue-500" /> Privacy
          </div>
          <label className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={includeDocumentName}
              onChange={(e) => setIncludeDocumentName(e.target.checked)}
            />
            <span>
              <strong className="text-xs text-slate-900 dark:text-slate-200">Include the document file name.</strong>{" "}
              Off by default: file names can reveal the operator and site to mail relays.
            </span>
          </label>
          <label className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={includeErrorDetail}
              onChange={(e) => setIncludeErrorDetail(e.target.checked)}
            />
            <span>
              <strong className="text-xs text-slate-900 dark:text-slate-200">Include the error detail.</strong> The
              platform's diagnostic text next to the error code. Never document text.
            </span>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            onClick={savePolicy}
            disabled={isSavingPolicy}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" /> {isSavingPolicy ? "Saving..." : "Save notification policy"}
          </button>
        </div>
      </div>
    </div>
  );
}
