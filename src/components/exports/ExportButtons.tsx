import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { FileJson, FileText, FileSpreadsheet, Download, ChevronDown, Loader2 } from "lucide-react";
import { StoredDocument } from "../../types/api";
import {
  exportDocumentToJson,
  exportDocumentToExcel,
  exportDocumentToPdf,
  exportDocumentToDocx,
} from "../../lib/export";
import { apiExportJob } from "../../lib/apiClient";
import { Button } from "../ui/Button";
import { useSnackbar } from "../../hooks/useSnackbar";

export interface ExportButtonsProps {
  document: StoredDocument;
  size?: "sm" | "md";
  compact?: boolean;
  label?: string;
  dropdownPosition?: "up" | "down";
  className?: string;
}

export function ExportButtons({
  document: doc,
  size = "sm",
  compact = false,
  label = "Export",
  dropdownPosition,
  className = "",
}: ExportButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  } | null>(null);

  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { success, error } = useSnackbar();

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 224; // w-56 is 14rem = 224px
    const menuHeight = 220;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let shouldOpenUp = false;
    if (dropdownPosition === "up") {
      shouldOpenUp = true;
    } else if (dropdownPosition === "down") {
      shouldOpenUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    } else {
      shouldOpenUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    }

    const top = shouldOpenUp ? undefined : rect.bottom + 6;
    const bottom = shouldOpenUp ? Math.max(8, window.innerHeight - rect.top + 6) : undefined;

    // Horizontal positioning: align right edge with button right edge if possible
    let left: number | undefined;
    let right: number | undefined;

    if (rect.right - menuWidth >= 8) {
      right = Math.max(8, window.innerWidth - rect.right);
    } else {
      left = Math.max(8, rect.left);
    }

    setMenuCoords({ top, bottom, left, right });
  }, [dropdownPosition]);

  // Recalculate position whenever opened, scrolled, or resized
  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      updateMenuPosition();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, updateMenuPosition]);

  const handleExport = async (type: "pdf" | "excel" | "docx" | "json") => {
    setIsOpen(false);
    setIsExporting(true);
    try {
      // If document was created via an async backend job, try backend direct export first
      if (doc.jobId && type !== "json") {
        try {
          const backendFormat = type === "excel" ? "XLSX" : type.toUpperCase();
          await apiExportJob(doc.jobId, backendFormat);
          success(
            `Downloaded ${doc.documentId || "Document"} as ${type.toUpperCase()}`,
            "Server Export Complete"
          );
          return;
        } catch (serverErr) {
          console.warn("Backend direct export unavailable, generating client-side export:", serverErr);
        }
      }

      // Client-side fallback exporter
      if (type === "pdf") exportDocumentToPdf(doc);
      else if (type === "excel") exportDocumentToExcel(doc);
      else if (type === "docx") exportDocumentToDocx(doc);
      else if (type === "json") exportDocumentToJson(doc);

      success(
        `Downloaded ${doc.documentId || "Document"} as ${type.toUpperCase()}`,
        "Export Successful"
      );
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : "Export failed";
      error(errMessage, "Export Error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className={`relative inline-block text-left ${className}`} ref={buttonRef}>
        <Button
          variant="outline"
          size={size}
          disabled={isExporting}
          onClick={(e) => {
            e.stopPropagation();
            if (!isOpen) updateMenuPosition();
            setIsOpen((prev) => !prev);
          }}
          leftIcon={
            isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
            ) : (
              <Download
                className={
                  size === "sm"
                    ? "w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
                    : "w-4 h-4 text-blue-600 dark:text-blue-400"
                }
              />
            )
          }
          rightIcon={
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          }
          className={`font-semibold ${compact ? "px-2.5 h-7 text-xs" : ""}`}
        >
          {isExporting ? "Exporting..." : label}
        </Button>
      </div>

      {/* Render dropdown through React Portal to completely escape table overflow clipping */}
      {isOpen &&
        mounted &&
        typeof window !== "undefined" &&
        window.document?.body &&
        menuCoords &&
        createPortal(
          <>
            {/* Transparent full-screen backdrop to safely dismiss when clicking anywhere outside */}
            <div
              className="fixed inset-0 z-[99998] bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            />

            <div
              ref={menuRef}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                top: menuCoords.top !== undefined ? `${menuCoords.top}px` : undefined,
                bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
                left: menuCoords.left !== undefined ? `${menuCoords.left}px` : undefined,
                right: menuCoords.right !== undefined ? `${menuCoords.right}px` : undefined,
                zIndex: 99999,
              }}
              className="w-56 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 animate-in fade-in zoom-in-95 duration-100 select-none"
            >
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
                Export Options
              </div>

              <button
                onClick={() => handleExport("pdf")}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-md bg-red-50 dark:bg-red-950/60 border border-red-200/60 dark:border-red-900/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">PDF Document</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Formatted PDF summary</div>
                </div>
              </button>

              <button
                onClick={() => handleExport("excel")}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Excel Workbook</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Structured XLSX spreadsheet</div>
                </div>
              </button>

              <button
                onClick={() => handleExport("docx")}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Word Document</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Editable DOCX report</div>
                </div>
              </button>

              <button
                onClick={() => handleExport("json")}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-900/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileJson className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">JSON Payload</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Raw structured data</div>
                </div>
              </button>
            </div>
          </>,
          window.document.body
        )}
    </>
  );
}
