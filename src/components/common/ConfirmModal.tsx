import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, CheckCircle2, AlertCircle, Info, ChevronDown, ChevronUp } from "lucide-react";

export type ConfirmModalVariant = "warning" | "danger" | "success" | "info";

export interface ChangeItem {
  label: string;
  oldValue?: string;
  newValue?: string;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  description?: string;
  changes?: ChangeItem[];
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmModalVariant;
  isLoading?: boolean;
  showCancel?: boolean;
  showConfirm?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}

const variantConfig: Record<
  ConfirmModalVariant,
  {
    icon: typeof AlertTriangle;
    titleColor: string;
    iconBgLight: string;
    iconBgDark: string;
    iconColorLight: string;
    iconColorDark: string;
    borderLight: string;
    borderDark: string;
    bgLight: string;
    bgDark: string;
    confirmBtnClass: string;
  }
> = {
  warning: {
    icon: AlertTriangle,
    titleColor: "text-amber-800 dark:text-amber-300",
    iconBgLight: "bg-amber-100",
    iconBgDark: "dark:bg-amber-950/80",
    iconColorLight: "text-amber-600",
    iconColorDark: "dark:text-amber-400",
    borderLight: "border-amber-200",
    borderDark: "dark:border-amber-800/60",
    bgLight: "bg-gradient-to-br from-amber-50/90 via-white to-white",
    bgDark: "dark:bg-gradient-to-br dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900",
    confirmBtnClass: "bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600",
  },
  danger: {
    icon: AlertCircle,
    titleColor: "text-rose-900 dark:text-rose-200",
    iconBgLight: "bg-rose-100",
    iconBgDark: "dark:bg-rose-950/80",
    iconColorLight: "text-rose-600",
    iconColorDark: "dark:text-rose-400",
    borderLight: "border-rose-200",
    borderDark: "dark:border-rose-800/60",
    bgLight: "bg-gradient-to-br from-rose-50/90 via-white to-white",
    bgDark: "dark:bg-gradient-to-br dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-900",
    confirmBtnClass: "bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700",
  },
  success: {
    icon: CheckCircle2,
    titleColor: "text-emerald-900 dark:text-emerald-200",
    iconBgLight: "bg-emerald-100",
    iconBgDark: "dark:bg-emerald-950/80",
    iconColorLight: "text-emerald-600",
    iconColorDark: "dark:text-emerald-400",
    borderLight: "border-emerald-200",
    borderDark: "dark:border-emerald-800/60",
    bgLight: "bg-gradient-to-br from-emerald-50/90 via-white to-white",
    bgDark: "dark:bg-gradient-to-br dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900",
    confirmBtnClass: "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700",
  },
  info: {
    icon: Info,
    titleColor: "text-blue-900 dark:text-blue-200",
    iconBgLight: "bg-blue-100",
    iconBgDark: "dark:bg-blue-950/80",
    iconColorLight: "text-blue-600",
    iconColorDark: "dark:text-blue-400",
    borderLight: "border-blue-200",
    borderDark: "dark:border-blue-800/60",
    bgLight: "bg-gradient-to-br from-blue-50/90 via-white to-white",
    bgDark: "dark:bg-gradient-to-br dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900",
    confirmBtnClass: "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700",
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  changes,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
  isLoading = false,
  showCancel = true,
  showConfirm = true,
  closeOnBackdropClick = false,
  closeOnEscape = true,
}: ConfirmModalProps) {
  const [expandedChanges, setExpandedChanges] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeOnEscape, isLoading, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const config = variantConfig[variant] || variantConfig.warning;
  const Icon = config.icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={closeOnBackdropClick && !isLoading ? onClose : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${config.borderLight} ${config.borderDark} ${config.bgLight} ${config.bgDark} animate-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="p-5 pb-3 flex items-start gap-3.5 relative">
          {/* Animated Icon Container */}
          <div className={`relative flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${config.iconBgLight} ${config.iconBgDark} ${config.iconColorLight} ${config.iconColorDark}`}>
            <Icon className="w-6 h-6 stroke-[2.2]" />
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h3 className={`text-base font-bold leading-tight ${config.titleColor}`}>
              {title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-5 pb-5 pt-1 space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
          {description && (
            <p className="leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
              {description}
            </p>
          )}

          {children}

          {/* Changes Box */}
          {changes && changes.length > 0 && (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <span>Detected Changes ({changes.length})</span>
                <button
                  type="button"
                  onClick={() => setExpandedChanges(!expandedChanges)}
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {expandedChanges ? "Collapse" : "View Changes"}
                  {expandedChanges ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {expandedChanges && (
                <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                  {changes.map((c, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px]">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{c.label}</div>
                      <div className="grid grid-cols-2 gap-2 mt-1 font-mono text-[10px]">
                        {c.oldValue && (
                          <div>
                            <span className="text-slate-400">Before: </span>
                            <span className="text-rose-600 dark:text-rose-400">{c.oldValue}</span>
                          </div>
                        )}
                        {c.newValue && (
                          <div>
                            <span className="text-slate-400">After: </span>
                            <span className="text-emerald-600 dark:text-emerald-400">{c.newValue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {(showCancel || showConfirm) && (
            <div className="flex items-center gap-2 pt-2">
              {showCancel && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {cancelText}
                </button>
              )}

              {showConfirm && onConfirm && (
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${config.confirmBtnClass}`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    confirmText
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
