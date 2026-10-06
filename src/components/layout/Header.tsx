import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, HelpCircle, Menu, ChevronDown, LogOut, Settings } from "lucide-react";
import { CommandPalette } from "../common/CommandPalette";
import { NotificationsPopover } from "../common/NotificationsPopover";
import { useComplianceNotifications } from "../../hooks/useComplianceNotifications";
import { useSystemHealth, SystemHealth } from "../../hooks/useSystemHealth";
import { useAppStore } from "../../stores/useAppStore";
import { StoredDocument } from "../../types/api";
import { NavTab } from "./Sidebar";
import appLogo from "../../assets/logos/logo-glencore.svg";

const HEALTH_PILL: Record<SystemHealth, { label: string; dot: string }> = {
  checking: { label: "Checking...", dot: "bg-slate-400" },
  healthy: { label: "System Healthy", dot: "bg-emerald-500" },
  degraded: { label: "System Degraded", dot: "bg-amber-500" },
  down: { label: "Backend Unreachable", dot: "bg-red-500" },
};

/** Who the signed-in key acts as: a readable name for the avatar and menu, from the real key identity. */
function useCurrentUser() {
  const identity = useAppStore((s) => s.apiKeyIdentity);
  if (!identity) return { name: "Signed in", initials: "··", subtitle: "" };
  const roles = identity.roles as string[];
  const name = roles.includes("PLATFORM_ADMIN")
    ? "Platform Admin"
    : roles.includes("TENANT_ADMIN")
    ? "Tenant Admin"
    : identity.label || "User";
  const initials =
    name
      .split(/[\s_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "U";
  return { name, initials, subtitle: `${identity.label} · ${identity.tenantId}` };
}

function UserMenu() {
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 pl-1.5 pr-2 h-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title={user.subtitle}
      >
        <span className="w-9 h-9 rounded-full bg-[#2f6bd9] text-white text-xs font-bold flex items-center justify-center">
          {user.initials}
        </span>
        <span className="hidden md:block text-sm font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">
          {user.name}
        </span>
        <ChevronDown className="hidden md:block w-4 h-4 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</div>
            <div className="text-[11px] text-slate-500 font-mono truncate">{user.subtitle}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            Settings
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
              navigate("/login", { replace: true });
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer border-t border-slate-100 dark:border-slate-800"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export interface HeaderProps {
  onNavigateTab?: (tab: NavTab) => void;
  onSelectDocument?: (doc: StoredDocument) => void;
  onToggleMobileMenu?: () => void;
}

export function Header({ onNavigateTab, onSelectDocument, onToggleMobileMenu }: HeaderProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { unreadCount } = useComplianceNotifications();
  const health = useSystemHealth();
  const navigate = useNavigate();

  const handleNavigateTab = (tab: NavTab) => {
    if (onNavigateTab) onNavigateTab(tab);
    navigate(`/${tab}`);
  };

  const handleSelectDocument = (doc: StoredDocument) => {
    if (onSelectDocument) onSelectDocument(doc);
    navigate(`/library/${doc.id || doc.jobId}`);
  };

  const pill = HEALTH_PILL[health];

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 flex items-center gap-4 sticky top-0 z-30 transition-colors">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0 lg:w-[calc(230px-1.5rem)]">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              title="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleNavigateTab("dashboard")}
            className="flex items-center gap-3 cursor-pointer min-w-0 text-left"
            title="Dashboard"
          >
            <img src={appLogo} alt="Glencore" className="h-6 w-auto object-contain shrink-0" />
            <span className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <span className="hidden sm:flex flex-col leading-tight min-w-0">
              <span className="text-[17px] font-bold text-[#1b2540] dark:text-slate-100 tracking-tight truncate">
                DocExtr Intelligence
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Compliance Insights from Documents
              </span>
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="flex-1 flex justify-center min-w-0">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2.5 px-3.5 h-10 w-full max-w-[540px] rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300/80 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 hover:border-slate-400 transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="flex-1 text-left truncate">Search documents, obligations, entities, or keywords...</span>
            <kbd className="hidden sm:inline px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-500 shrink-0">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right: health, notifications, help, user */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className="hidden sm:flex items-center gap-2 h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/60"
            title="Live status of the backend service"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${pill.dot}`} />
            {pill.label}
          </div>

          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title={
                unreadCount > 0
                  ? `${unreadCount} unread compliance notification${unreadCount === 1 ? "" : "s"}`
                  : "Compliance Notifications"
              }
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#e0001b] text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <NotificationsPopover isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
          </div>

          <button
            className="hidden md:flex w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 items-center justify-center transition-colors cursor-pointer"
            title="Help & Documentation"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          <UserMenu />
        </div>
      </header>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectDocument={handleSelectDocument}
        onNavigateTab={handleNavigateTab}
      />
    </>
  );
}
