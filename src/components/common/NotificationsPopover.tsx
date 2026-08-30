import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  ShieldAlert,
  CheckCheck,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Settings,
} from "lucide-react";
import {
  useComplianceNotifications,
  ComplianceNotification,
  NotificationCategory,
} from "../../hooks/useComplianceNotifications";

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsPopover({ isOpen, onClose }: NotificationsPopoverProps) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    countsByCategory,
    categoryFilter,
    setCategoryFilter,
    markAllAsRead,
    markAsRead,
    clearAll,
  } = useComplianceNotifications();

  if (!isOpen) return null;

  const handleItemClick = (item: ComplianceNotification) => {
    markAsRead(item.id);
    onClose();
    if (item.targetUrl) {
      navigate(item.targetUrl);
    }
  };

  const handleOpenSettings = () => {
    onClose();
    navigate("/settings");
  };

  return (
    <>
      {/* Universal Backdrop for click-outside dismissal */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/10 dark:bg-slate-950/30 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Popover Container */}
      <div
        className="fixed inset-x-3 top-16 sm:inset-auto sm:right-6 sm:top-16 lg:absolute lg:right-0 lg:top-full lg:mt-2.5 z-50 w-auto sm:w-[420px] max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Compliance & Job Notifications
              </h3>
              {unreadCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-mono text-[10px] font-bold">
                  {unreadCount} New
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] font-medium">
                  0 Unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleOpenSettings}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Notification Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                categoryFilter === "all"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <span>All</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700/60">
                {countsByCategory.all}
              </span>
            </button>

            <button
              onClick={() => setCategoryFilter("obligations")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                categoryFilter === "obligations"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Obligations</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700/60">
                {countsByCategory.obligations}
              </span>
            </button>

            <button
              onClick={() => setCategoryFilter("jobs")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                categoryFilter === "jobs"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Cpu className="w-3 h-3 text-blue-500" />
              <span>Pipeline Jobs</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700/60">
                {countsByCategory.jobs}
              </span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-84 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
          {notifications.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCheck className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                All caught up
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                {categoryFilter === "obligations"
                  ? "No active overdue obligations or imminent deadlines."
                  : categoryFilter === "jobs"
                  ? "No pending jobs or pipeline extraction alerts."
                  : "No active compliance alerts or pending extraction failures."}
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 group ${
                  n.isRead
                    ? "opacity-70 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    : "bg-slate-50/80 dark:bg-slate-800/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                }`}
              >
                {/* Status Icon */}
                <div className="mt-0.5 shrink-0">
                  {n.type === "alert" ? (
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  ) : n.type === "warning" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : n.type === "info" ? (
                    <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      )}
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        {n.title}
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {n.time}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                    {n.description}
                  </p>

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-medium ${
                        n.category === "obligation"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50"
                          : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50"
                      }`}
                    >
                      {n.category === "obligation" ? "Obligation" : "Pipeline"}
                    </span>

                    {n.meta?.section && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        §{n.meta.section}
                      </span>
                    )}

                    {n.meta?.status && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {n.meta.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="mt-1 text-slate-300 dark:text-slate-600 group-hover:text-rose-500 dark:group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:underline cursor-pointer"
              >
                Clear list
              </button>
            )}
          </div>

          <button
            onClick={handleOpenSettings}
            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Settings</span>
          </button>
        </div>
      </div>
    </>
  );
}
