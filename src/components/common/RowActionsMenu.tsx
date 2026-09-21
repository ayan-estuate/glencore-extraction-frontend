import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface RowActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  width?: number;
  children: React.ReactNode;
}

/**
 * Portal-rendered dropdown anchored to a trigger element (e.g. a row's
 * three-dot button). Rendering into document.body avoids clipping by
 * ancestor `overflow-hidden`/`overflow-x-auto` containers such as
 * scrollable tables.
 */
export function RowActionsMenu({ isOpen, onClose, anchorEl, width = 192, children }: RowActionsMenuProps) {
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUp = spaceBelow < 220 && spaceAbove > spaceBelow;

    const top = shouldOpenUp ? undefined : rect.bottom + 6;
    const bottom = shouldOpenUp ? Math.max(8, window.innerHeight - rect.top + 6) : undefined;
    const left = Math.min(
      Math.max(8, rect.right - width),
      window.innerWidth - width - 8
    );

    setCoords({ top, bottom, left });
  }, [anchorEl, width]);

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

  if (!isOpen || !mounted || !anchorEl || !coords || typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[99998]" onClick={onClose} />
      <div
        style={{
          position: "fixed",
          top: coords.top !== undefined ? `${coords.top}px` : undefined,
          bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
          left: `${coords.left}px`,
          width: `${width}px`,
          zIndex: 99999,
        }}
        className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-left text-xs animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    window.document.body
  );
}
