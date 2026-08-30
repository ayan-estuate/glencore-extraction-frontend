import React, { useEffect, useState } from "react";
import { Search, X, FileText, ArrowRight, Sparkles, Building2, ShieldCheck, CornerDownLeft } from "lucide-react";
import { useAppStore } from "../../stores/useAppStore";
import { StoredDocument } from "../../types/api";

import { NavTab } from "../layout/Sidebar";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument: (doc: StoredDocument) => void;
  onNavigateTab: (tab: NavTab) => void;
}

export function CommandPalette({ isOpen, onClose, onSelectDocument, onNavigateTab }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const { documents } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open via document listener if needed
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredDocs = documents.filter(
    (d) =>
      d.documentTitle.toLowerCase().includes(query.toLowerCase()) ||
      d.documentId.toLowerCase().includes(query.toLowerCase()) ||
      d.entity.toLowerCase().includes(query.toLowerCase()) ||
      d.obligations.some((o) => o.obligationTitle.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search documents, permits, obligations, or actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions Shortcuts */}
        {!query && (
          <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-400 font-medium shrink-0">Quick Navigate:</span>
            <button
              onClick={() => {
                onNavigateTab("upload");
                onClose();
              }}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-red-500/50 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-medium cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-red-500 shrink-0" />
              Upload & Extract PDF
            </button>
            <button
              onClick={() => {
                onNavigateTab("library");
                onClose();
              }}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500/50 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-medium cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              Document Library
            </button>
            <button
              onClick={() => {
                onNavigateTab("obligations");
                onClose();
              }}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-medium cursor-pointer shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              Obligations Matrix
            </button>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => {
                  onSelectDocument(doc);
                  onClose();
                }}
                className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-100 dark:border-red-900/50 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                        {doc.documentId}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {doc.entity}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-red-600 transition-colors">
                      {doc.documentTitle}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {doc.obligations.length} Obligations extracted
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-red-600 font-medium shrink-0">
                  <span>Open</span>
                  <CornerDownLeft className="w-3.5 h-3.5" />
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              No documents or obligations matching "{query}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
          <span>Search Compliance OS</span>
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                ESC
              </kbd>{" "}
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
