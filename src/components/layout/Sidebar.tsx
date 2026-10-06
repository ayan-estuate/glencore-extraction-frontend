import React, { useState } from "react";
import {
  LayoutDashboard,
  UploadCloud,
  FolderKanban,
  ShieldCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAppStore } from "../../stores/useAppStore";
import { useJobTrackerStore, selectUnfinishedCount } from "../../stores/useJobTrackerStore";
import appLogo from "../../assets/logos/logo-glencore.svg";

export type NavTab =
  | "dashboard"
  | "upload"
  | "library"
  | "obligations"
  | "analytics"
  | "settings";

export interface SidebarProps {
  activeTab?: NavTab;
  setActiveTab?: (tab: NavTab) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTenantId = useAppStore((state) => state.activeTenantId);
  const adminRole = useAppStore((state) => state.adminRole);
  const clearAdminSession = useAppStore((state) => state.clearAdminSession);
  const isAdminRoute = location.pathname.startsWith("/admin");

  const handleSignOutAdmin = () => {
    clearAdminSession();
    if (isAdminRoute) navigate("/dashboard");
  };

  const currentTab: NavTab = React.useMemo(() => {
    if (activeTab) return activeTab;
    const path = location.pathname.toLowerCase();
    if (path.startsWith("/upload") || path.startsWith("/jobs")) return "upload";
    if (path.startsWith("/library")) return "library";
    if (path.startsWith("/obligations")) return "obligations";
    if (path.startsWith("/analytics") || path.startsWith("/reports")) return "analytics";
    if (path.startsWith("/settings")) return "settings";
    return "dashboard";
  }, [activeTab, location.pathname]);

  const handleSelectTab = (tab: NavTab) => {
    if (setActiveTab) {
      setActiveTab(tab);
    }
    navigate(`/${tab}`);
    if (collapsed) {
      setCollapsed(false);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const runningJobs = useJobTrackerStore(selectUnfinishedCount);

  const mainNavItems = [
    { id: "dashboard" as NavTab, label: "Dashboard", icon: LayoutDashboard },
    { id: "upload" as NavTab, label: "Upload & Extract", icon: UploadCloud },
    { id: "library" as NavTab, label: "Document Library", icon: FolderKanban },
    { id: "obligations" as NavTab, label: "Obligations Matrix", icon: ShieldCheck },
    { id: "analytics" as NavTab, label: "Analytics & Reports", icon: BarChart3 },
    { id: "settings" as NavTab, label: "Settings & Health", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
        />
      )}

      <aside
        className={cn(
          "h-screen bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 select-none font-sans z-50",
          // Mobile vs Desktop styling
          "fixed top-0 left-0 lg:sticky lg:top-0",
          isMobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {/* Top Section: Brand + Navigation Items */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Brand Header */}
          <div
            className={cn(
              "h-16 px-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center transition-all shrink-0",
              collapsed && !isMobileOpen ? "justify-center" : "justify-between"
            )}
          >
            {!collapsed || isMobileOpen ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSelectTab("dashboard")}
                  className="flex items-center gap-2.5 overflow-hidden text-left cursor-pointer group focus:outline-none min-w-0"
                  title="Glencore - DocExtract AI"
                >
                  {/* Glencore SVG Brand Logo */}
                  <img
                    src={appLogo}
                    alt="Glencore Logo"
                    className="h-6 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="flex flex-col truncate border-l border-slate-200 dark:border-slate-800 pl-2.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 tracking-tight leading-tight group-hover:text-[#C8102E] transition-colors">
                      DocExtract AI
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                      Intelligent Compliance
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-2xs group relative cursor-pointer transition-all ring-1 ring-slate-200/80 dark:ring-slate-700/80 hover:ring-[#C8102E]/60 p-1.5 bg-white dark:bg-slate-800"
                title="Expand sidebar"
              >
                <img
                  src={appLogo}
                  alt="Glencore"
                  className="w-full h-auto object-contain transition-transform duration-200 group-hover:scale-110 group-hover:opacity-20"
                />
                <ChevronRight className="w-5 h-5 absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity text-slate-800 dark:text-slate-100 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Main Scrollable Navigation */}
          <div className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scrollbar-none">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  title={collapsed && !isMobileOpen ? item.label : undefined}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group relative",
                    collapsed && !isMobileOpen && "justify-center px-0",
                    isActive
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/60"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      isActive
                        ? "text-slate-900 dark:text-slate-100"
                        : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                    )}
                  />
                  {(!collapsed || isMobileOpen) && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}
                  {item.id === "upload" && runningJobs > 0 && (
                    <span
                      title={`${runningJobs} extraction${runningJobs > 1 ? "s" : ""} in progress`}
                      className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse"
                    >
                      {runningJobs}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Administration — rendered only once adminRole is verified, as its
                own separate block rather than folded into mainNavItems, so a
                regular tenant user's nav never even shows this exists. */}
            {adminRole && (
              <div className="pt-2 mt-2 border-t border-slate-200/70 dark:border-slate-800">
                {(!collapsed || isMobileOpen) && (
                  <span className="px-3 text-[9px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                    Administration
                  </span>
                )}
                <button
                  onClick={() => {
                    navigate("/admin/tenants");
                    if (onCloseMobile) onCloseMobile();
                  }}
                  title={collapsed && !isMobileOpen ? "Admin Console" : undefined}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group relative",
                    collapsed && !isMobileOpen && "justify-center px-0",
                    isAdminRoute
                      ? "bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50/60 dark:hover:bg-purple-950/30"
                  )}
                >
                  <ShieldAlert
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      isAdminRoute ? "text-purple-600 dark:text-purple-400" : "text-slate-400 group-hover:text-purple-600"
                    )}
                  />
                  {(!collapsed || isMobileOpen) && (
                    <span className="truncate flex-1 text-left">Admin Console</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Minimal Footer: Active Tenant & Status */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
          {!collapsed || isMobileOpen ? (
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-semibold leading-none">
                    Tenant
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                    {activeTenantId || "—"}
                  </span>
                </div>
              </div>

              {adminRole ? (
                <button
                  type="button"
                  onClick={handleSignOutAdmin}
                  className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-bold shrink-0 cursor-pointer hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  title={`Elevated privileges loaded: ${adminRole}. Click to sign out of admin.`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>{adminRole}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Online</span>
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex items-center justify-center py-1"
              title={`Active Tenant: ${activeTenantId || "—"}`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
