import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Filter, X, RotateCcw, Check, ChevronDown } from "lucide-react";

export interface FilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  title?: string;
  activeCount?: number;
  onReset?: () => void;
  children: React.ReactNode;
}

export function FilterPopover({
  isOpen,
  onClose,
  triggerRef,
  title = "Filter",
  activeCount = 0,
  onReset,
  children,
}: FilterPopoverProps) {
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    right: number;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUp = spaceBelow < 340 && spaceAbove > spaceBelow;

    const top = shouldOpenUp ? undefined : rect.bottom + 8;
    const bottom = shouldOpenUp ? Math.max(8, window.innerHeight - rect.top + 8) : undefined;
    // Align to the right edge of the trigger button, with at least 16px viewport gutter
    const right = Math.max(16, window.innerWidth - rect.right);
    const maxHeight = Math.min(520, Math.max(260, (shouldOpenUp ? spaceAbove : spaceBelow) - 32));

    setCoords({ top, bottom, right, maxHeight });
  }, [triggerRef]);

  useEffect(() => {
    if (!isOpen) return;
    updateCoords();

    const handleScrollOrResize = () => updateCoords();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, updateCoords, onClose]);

  if (!isOpen || !mounted || typeof window === "undefined" || !coords) {
    return null;
  }

  return createPortal(
    <>
      {/* Universal transparent backdrop to dismiss on outside click */}
      <div
        className="fixed inset-0 z-[99998] bg-transparent"
        onClick={onClose}
      />

      {/* Popover Card positioned dynamically below trigger at right */}
      <div
        style={{
          position: "fixed",
          top: coords.top !== undefined ? `${coords.top}px` : undefined,
          bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
          right: `${coords.right}px`,
          width: "360px",
          maxWidth: "calc(100vw - 32px)",
          maxHeight: `${coords.maxHeight}px`,
          zIndex: 99999,
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Popover Header */}
        <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-blue-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold">
                {activeCount} active
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Popover Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
          {children}
        </div>

        {/* Popover Footer */}
        <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          {onReset ? (
            <button
              onClick={onReset}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors ml-auto"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply & Close</span>
          </button>
        </div>
      </div>
    </>,
    window.document.body
  );
}

export interface FilterSelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  icon?: React.ElementType;
}

export function FilterSelectField({
  label,
  value,
  onChange,
  options,
  icon: Icon,
}: FilterSelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        <span>{label}</span>
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs appearance-none"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
      </div>
    </div>
  );
}
