import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, HelpCircle, UploadCloud, Menu } from "lucide-react";
import { CommandPalette } from "../common/CommandPalette";
import { NotificationsPopover } from "../common/NotificationsPopover";
import { useComplianceNotifications } from "../../hooks/useComplianceNotifications";
import { StoredDocument } from "../../types/api";
import { NavTab } from "./Sidebar";
import appLogo from "../../assets/logos/logo-glencore.svg";

export interface HeaderProps {
  onNavigateTab?: (tab: NavTab) => void;
  onSelectDocument?: (doc: StoredDocument) => void;
  onToggleMobileMenu?: () => void;
}

export function Header({ onNavigateTab, onSelectDocument, onToggleMobileMenu }: HeaderProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { unreadCount } = useComplianceNotifications();
  const navigate = useNavigate();

  const handleNavigateTab = (tab: NavTab) => {
    if (onNavigateTab) onNavigateTab(tab);
    navigate(`/${tab}`);
  };

  const handleSelectDocument = (doc: StoredDocument) => {
    if (onSelectDocument) onSelectDocument(doc);
    navigate(`/library/${doc.id || doc.jobId}`);
  };

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center gap-3 sm:gap-4 sticky top-0 z-20 transition-colors justify-between">
        {/* Left Section: Mobile Menu Toggle & Extended Search Bar */}
        <div className="flex items-center gap-3 flex-1 max-w-3xl min-w-0">
          {onToggleMobileMenu && (
            <div className="flex items-center gap-2 lg:hidden shrink-0">
              <button
                type="button"
                onClick={onToggleMobileMenu}
                className="w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer shrink-0"
                title="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => handleNavigateTab("dashboard")}
                className="flex items-center cursor-pointer ml-1"
                title="Glencore - DocExtract AI Dashboard"
              >
                <img
                  src={appLogo}
                  alt="Glencore Logo"
                  className="h-5 w-auto object-contain shrink-0"
                />
              </button>
            </div>
          )}

          {/* Extended Search Bar Button */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2.5 px-3.5 h-10 w-full rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer shadow-2xs"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="flex-1 text-left truncate font-medium">Search documents, obligations, or compliance entities...</span>
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-400 font-semibold shadow-2xs">
                ⌘K
              </kbd>
            </div>
          </button>
        </div>

        {/* Right Section: Utility Tools, Profile & Action Button */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title={
                unreadCount > 0
                  ? `${unreadCount} unread compliance notification${unreadCount === 1 ? "" : "s"}`
                  : "Compliance Notifications"
              }
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-in zoom-in-50 duration-150">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <NotificationsPopover
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />
          </div>

          {/* Help Button */}
          <button
            className="hidden md:flex w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 items-center justify-center transition-colors cursor-pointer"
            title="Help & Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Primary Action Button */}
          <button
            onClick={() => handleNavigateTab("upload")}
            className="flex items-center gap-2 h-9 px-3.5 rounded-lg bg-[#e11d48] hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0 ml-1"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden md:inline">Extract New Document</span>
            <span className="md:hidden">Extract</span>
          </button>
        </div>
      </header>

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectDocument={handleSelectDocument}
        onNavigateTab={handleNavigateTab}
      />
    </>
  );
}

