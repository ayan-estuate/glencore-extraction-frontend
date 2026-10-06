import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Settings,
  ShieldCheck,
  Server,
  Sparkles,
  Moon,
  Sun,
  Boxes,
  CheckCircle2,
  RefreshCw,
  Clock,
  FileText,
  Sliders,
  Database,
  Mail,
  Lock,
  Bell,
  BookOpen,
  Home,
  ChevronRight,
  Link2,
  Sprout,
  ShieldAlert,
  Info,
  Cpu,
} from "lucide-react";
import { useAppStore } from "../stores/useAppStore";
import { useSnackbar } from "../hooks/useSnackbar";
import { apiGetHealth, apiGetInfo, apiGetVersion } from "../lib/apiClient";
import { API_CONFIG } from "../config/api.config";
import { ServiceHealth, SystemInfo, SystemVersion } from "../types/api";
import { formatDate } from "../lib/utils";
import { TenantEmailSettingsPanel } from "../components/settings/TenantEmailSettingsPanel";
import { LlmProvidersPanel } from "../components/settings/LlmProvidersPanel";

// Tenant Administration lives at /admin/tenants (a guarded route, see
// RequireAdmin), not a Settings sub-tab — see Card 2 below for the entry point.
type SettingsSubTab = "security" | "llm" | "email" | "preferences" | "health";

const SETTINGS_TABS = [
  {
    id: "security" as const,
    name: "API Credentials",
    description: "Connect & authenticate",
    icon: Link2,
  },
  {
    id: "llm" as const,
    name: "LLM Providers",
    description: "Keys and models",
    icon: Cpu,
  },
  {
    id: "email" as const,
    name: "Email & Notifications",
    description: "Alerts and updates",
    icon: Mail,
  },
  {
    id: "preferences" as const,
    name: "Inference & UI",
    description: "Model and interface settings",
    icon: Sliders,
  },
  {
    id: "health" as const,
    name: "System Health & Ledger",
    description: "Monitor and audit",
    icon: Database,
  },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>("security");
  const {
    theme,
    toggleTheme,
    apiKey,
    apiKeyIdentity,
    adminApiKey,
    adminRole,
    adminKeyLabel,
    adminScopeTenantId,
    logout,
    jobs,
    fetchJobs,
    notificationPreferences,
    updateNotificationPreferences,
    activeTenantId,
  } = useAppStore();
  const { success, error: errorSnackbar, info } = useSnackbar();

  // Redirected here by RequireAdmin (visiting /admin/* without a verified
  // admin role on the current session) — the current key just doesn't carry
  // an admin role; signing in with a different key is the only fix now that
  // key entry only happens on /login, not here.
  // Deep link from elsewhere (e.g. the upload form's "no LLM provider" notice).
  useEffect(() => {
    const tab = (location.state as { tab?: SettingsSubTab } | null)?.tab;
    if (tab && SETTINGS_TABS.some((t) => t.id === tab)) setActiveSubTab(tab);
  }, [location.state]);

  useEffect(() => {
    if ((location.state as { needsAdminKey?: boolean } | null)?.needsAdminKey) {
      setActiveSubTab("security");
      info(
        "Your current key has no admin role — sign out and sign in with a TENANT_ADMIN or PLATFORM_ADMIN key to open the Admin Console",
        "Admin Access Required"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Health state
  const [healthData, setHealthData] = useState<ServiceHealth | null>(null);
  const [infoData, setInfoData] = useState<SystemInfo | null>(null);
  const [versionData, setVersionData] = useState<SystemVersion | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"UP" | "DOWN" | "CHECKING">("CHECKING");

  const loadHealthData = async () => {
    setIsLoadingHealth(true);
    try {
      const [health, sysInfo, sysVer] = await Promise.allSettled([
        apiGetHealth(),
        apiGetInfo(),
        apiGetVersion(),
      ]);

      if (health.status === "fulfilled") {
        setHealthData(health.value);
        setBackendStatus(health.value.status === "UP" ? "UP" : "DOWN");
      } else {
        setBackendStatus("DOWN");
      }

      if (sysInfo.status === "fulfilled") {
        setInfoData(sysInfo.value);
      }
      if (sysVer.status === "fulfilled") {
        setVersionData(sysVer.value);
      }

      await fetchJobs();
    } catch {
      setBackendStatus("DOWN");
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "health") {
      loadHealthData();
    }
  }, [activeSubTab]);

  const handleSignOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleSavePreferences = () => {
    success("Default extraction preferences saved locally", "Settings Saved");
  };

  const handleThemeToggle = () => {
    toggleTheme();
    info(`Switched interface theme to ${theme === "dark" ? "Light" : "Dark"} Mode`, "Theme Changed");
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
        <span className="font-medium text-slate-700 dark:text-slate-300">Settings & Health</span>
      </div>

      {/* Main Header with Gradient Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100/90 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-800/70 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs shrink-0">
            <Settings className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Settings & Platform Infrastructure
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure backend client credentials, LLM sampling parameters, and inspect live service telemetry.
            </p>
          </div>
        </div>

        {/* Right Gradient Card Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-2xl p-4 shadow-sm flex items-center gap-4 min-w-[300px] border border-blue-500/20">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner">
            <Boxes className="w-6 h-6 text-white/95" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white">Powering compliant insights</div>
            <div className="text-[11px] text-blue-100/90 font-medium mt-0.5">Secure. Scalable. AI-ready.</div>
          </div>
        </div>
      </div>

      {/* Horizontal Segmented Tabs Navigation */}
      <div className="p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`p-3.5 text-left transition-all duration-150 flex items-center gap-3.5 cursor-pointer ${
                isActive
                  ? "bg-blue-50/90 dark:bg-blue-950/60 rounded-xl border border-blue-200/70 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 shadow-2xs"
                  : "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isActive
                    ? "bg-blue-100 dark:bg-blue-900/80 text-blue-600 dark:text-blue-300"
                    : "bg-slate-100/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div
                  className={`text-xs font-bold truncate ${
                    isActive
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {tab.name}
                </div>
                <div
                  className={`text-[11px] truncate ${
                    isActive
                      ? "text-blue-600/80 dark:text-blue-400/80 font-medium"
                      : "text-slate-400 font-medium"
                  }`}
                >
                  {tab.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Security & API Credentials */}
      {activeSubTab === "security" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Current session — key entry only happens on /login now; this is
              read-only identity + sign-out, so there's exactly one place to
              type a key in instead of two independent, easily-desynced ones. */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Current Session</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Requests authenticate via the{" "}
                  <code className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-mono text-[11px]">
                    {API_CONFIG.API_KEY_HEADER}
                  </code>{" "}
                  header, resolved from the key you signed in with. To switch keys, sign out and sign back in.
                </p>
              </div>
            </div>

            {apiKeyIdentity ? (
              <div className="rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-sans">Label</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{apiKeyIdentity.label}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-sans">Tenant</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{apiKeyIdentity.tenantId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-sans">Roles</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {apiKeyIdentity.roles.join(", ")}
                    </span>
                  </div>
                </div>
                {adminRole && (
                  <div className="flex items-center gap-2 text-[11px] text-purple-700 dark:text-purple-300 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Admin Console unlocked — <strong>{adminRole}</strong>
                      {adminRole === "TENANT_ADMIN" && adminScopeTenantId
                        ? ` for tenant "${adminScopeTenantId}"`
                        : ""}
                      {adminKeyLabel ? ` ("${adminKeyLabel}")` : ""}
                    </span>
                    <button
                      onClick={() => navigate("/admin/tenants")}
                      className="ml-auto font-semibold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      Open Admin Console →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Verifying session...
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => window.open("/docs", "_blank")}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>View Documentation</span>
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:text-slate-300 text-xs font-semibold cursor-pointer shrink-0 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>

          {/* Card 3: Egress Data Masking & Tenant Privacy Engine */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Egress Data Masking & Tenant Privacy Engine
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Backend claude-privacy module prevents company names, personnel, and sensitive sites from leaving the premises unmasked.
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto shrink-0">
                <Lock className="w-3 h-3" />
                MASKED_CLOUD Tier
              </span>
            </div>

            {/* 3 Privacy Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
              <div className="p-4 rounded-2xl bg-[#F4F8FE] dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-2xs border border-blue-100/80 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                    Detector Engine
                  </span>
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
                    regex+gazetteer+legal-v1
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    Regex + Legal Form Detector
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F2FBF7] dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-2xs border border-emerald-100/80 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Sprout className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                    Pre-Call Harvester
                  </span>
                  <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                    Active (Local Harvest)
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    Harvests site/operator names before LLM call
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FEF4F4] dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-2xs border border-rose-100/80 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                    Security Posture
                  </span>
                  <span className="font-bold text-xs text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
                    Fail-Closed
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    Blocks request if unmasked entity is detected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LLM providers, keys and models (stored per tenant, encrypted) */}
      {activeSubTab === "llm" && <LlmProvidersPanel />}

      {/* Tab 2: Outbound Email & Tenant Notification Settings */}
      {activeSubTab === "email" && <TenantEmailSettingsPanel />}

      {/* Tab 3: Preferences & Appearance */}
      {activeSubTab === "preferences" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Appearance Settings */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Interface Theme</h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Dark / Light Canvas</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Switch between daylight and executive dark mode</span>
              </div>
              <button
                onClick={handleThemeToggle}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                <span>{theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
              </button>
            </div>
          </div>

          {/* AI Parameters */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Default Extraction Presets</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Default Output Language
                </label>
                <select
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  {API_CONFIG.LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                LLM providers, API keys and models are managed on the LLM Providers tab; users pick one
                per extraction on the upload form. There's no per-request temperature or sampling control.
              </span>
            </div>

            <div className="pt-1">
              <button
                onClick={handleSavePreferences}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-blue-950/20 transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>

          {/* Card: In-App Notification Center Preferences */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-rose-500" />
                In-App Compliance Alert & Notification Triggers
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose which obligations and job pipeline updates trigger top bell notifications and alerts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences?.notifyOverdueObligations !== false}
                  onChange={(e) => updateNotificationPreferences({ notifyOverdueObligations: e.target.checked })}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Overdue Obligations (Alert)</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Notify when an obligation's due date has lapsed without completion.</span>
                </div>
              </label>

              <label className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences?.notifyDueSoonObligations !== false}
                  onChange={(e) => updateNotificationPreferences({ notifyDueSoonObligations: e.target.checked })}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Upcoming Deadlines (Warning)</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Notify on obligations due within {notificationPreferences?.dueSoonWindowDays ?? 14} days.</span>
                </div>
              </label>

              <label className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences?.notifyObligationCompleted !== false}
                  onChange={(e) => updateNotificationPreferences({ notifyObligationCompleted: e.target.checked })}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Fulfilled Obligations (Success)</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Notify when an obligation status is marked as Completed.</span>
                </div>
              </label>

              <label className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences?.notifyJobFailed !== false}
                  onChange={(e) => updateNotificationPreferences({ notifyJobFailed: e.target.checked })}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Extraction Failures (Alert)</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Alert immediately on PDF processing or LLM inference terminal errors.</span>
                </div>
              </label>

              <label className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences?.notifyJobPartial !== false}
                  onChange={(e) => updateNotificationPreferences({ notifyJobPartial: e.target.checked })}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Partial Extractions (Warning)</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Alert when some segments require legal auditor adjudication.</span>
                </div>
              </label>

              <label className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(notificationPreferences?.notifyJobCompleted)}
                  onChange={(e) => updateNotificationPreferences({ notifyJobCompleted: e.target.checked })}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Job Completed (Success)</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Alert on every successful extraction (disabled by default to prevent alert fatigue).</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: System Health & Audit Ledger */}
      {activeSubTab === "health" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Infrastructure Health Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Spring Boot Service */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-blue-500" />
                  FastAPI Backend
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    backendStatus === "UP"
                      ? "bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse"
                      : "bg-rose-500"
                  }`}
                />
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs text-slate-500">Status</span>
                <span className={`text-xs font-bold font-mono ${backendStatus === "UP" ? "text-emerald-600" : "text-rose-600"}`}>
                  {backendStatus}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-[11px] text-slate-400">
                <span>Target Host</span>
                <span className="font-mono">localhost:8080</span>
              </div>
            </div>

            {/* PostgreSQL Database */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-500" />
                  PostgreSQL Persistence
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs text-slate-500">Ledger Status</span>
                <span className={`text-xs font-bold font-mono ${backendStatus === "UP" ? "text-emerald-600" : "text-rose-600"}`}>
                  {backendStatus === "UP" ? "CONNECTED" : "UNREACHABLE"}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-[11px] text-slate-400">
                <span>Verified via</span>
                <span className="font-mono">GET /health (live SELECT 1)</span>
              </div>
            </div>

            {/* Application Version */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Service Version
                </span>
                <button
                  onClick={loadHealthData}
                  disabled={isLoadingHealth}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Refresh status"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? "animate-spin text-blue-500" : ""}`} />
                </button>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs text-slate-500">API Build</span>
                <span className="text-xs font-bold font-mono text-purple-600">
                  {versionData?.version || "—"}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-[11px] text-slate-400">
                <span>Platform Framework</span>
                <span className="font-mono">{versionData?.builtWith || "—"}</span>
              </div>
            </div>
          </div>

          {/* Real Backend Jobs Audit Ledger Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Persistent Extraction Job Ledger (PostgreSQL)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Direct ledger queries from <code className="font-mono text-slate-600 dark:text-slate-300">GET /api/v1/document/jobs</code> for tenant.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {jobs.length} recorded jobs
              </span>
            </div>

            {jobs.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <FileText className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No execution jobs in database
                </p>
                <p className="text-[11px] text-slate-400">
                  Submit extraction requests to populate persistent ledger rows.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 font-mono text-[11px] text-slate-400 uppercase">
                      <th className="pb-3 pl-2">Job UUID</th>
                      <th className="pb-3">Source Document</th>
                      <th className="pb-3">Provider</th>
                      <th className="pb-3 text-center">Execution Time</th>
                      <th className="pb-3 text-center">Created At</th>
                      <th className="pb-3 pr-2 text-right">Ledger Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {jobs.map((job) => (
                      <tr key={job.jobId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 pl-2 font-bold text-blue-600 dark:text-blue-400 truncate max-w-[120px]">
                          {job.jobId.slice(0, 13)}...
                        </td>
                        <td className="py-3 font-sans font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                          {job.originalFilename || job.jobId}
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          {job.requestedProvider || "—"}
                        </td>
                        <td className="py-3 text-center text-slate-500">
                          {job.completedAt && job.createdAt
                            ? `${((new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()) / 1000).toFixed(2)}s`
                            : "—"}
                        </td>
                        <td className="py-3 text-center text-slate-400 text-[11px]">
                          {formatDate(job.createdAt)}
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              job.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50"
                                : job.status === "RUNNING"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50"
                                : job.status === "QUEUED"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50"
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
