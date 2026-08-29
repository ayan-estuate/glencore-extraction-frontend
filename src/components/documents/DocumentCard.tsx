import React from "react";
import { StoredDocument } from "../../types/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ExportButtons } from "../exports/ExportButtons";
import { FileText, Building2, Calendar, ShieldAlert, ArrowRight, CheckSquare, Square, Trash2 } from "lucide-react";
import { formatDate, formatBytes } from "../../lib/utils";

export interface DocumentCardProps {
  key?: string;
  document: StoredDocument;
  onViewDetail: (doc: StoredDocument) => void;
  onDelete?: (id: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function DocumentCard({
  document,
  onViewDetail,
  onDelete,
  isSelected = false,
  onToggleSelect,
}: DocumentCardProps) {
  const openCount = document.obligations.filter((o) => o.obligationStatus === "OPEN").length;
  const inProgressCount = document.obligations.filter((o) => o.obligationStatus === "IN_PROGRESS").length;
  const completedCount = document.obligations.filter((o) => o.obligationStatus === "COMPLETED").length;

  return (
    <Card className={`relative flex flex-col justify-between h-full group transition-all duration-200 hover:shadow-md ${
      isSelected ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/20 dark:bg-blue-950/10" : ""
    }`}>
      {/* Header with Selection & ID Badge */}
      <CardHeader className="p-3.5 pb-2.5 flex flex-row items-center justify-between gap-2 border-b border-slate-100/80 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          {onToggleSelect && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(document.id);
              }}
              className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer shrink-0"
              title="Select for bulk action"
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
          )}

          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 truncate">
            {document.documentId}
          </span>
        </div>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(document.id);
            }}
            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
            title="Delete document"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
          </button>
        )}
      </CardHeader>

      {/* Main Content */}
      <CardContent className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
        {/* Top Section */}
        <div className="space-y-1.5">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug min-h-[2.5rem] flex items-start group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {document.documentTitle}
          </CardTitle>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium h-5 truncate">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{document.entity || "Entity Unspecified"}</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed min-h-[2.25rem] flex items-start pt-1">
            {document.documentDescription}
          </p>
        </div>

        {/* Bottom Meta Section pinned to bottom of CardContent */}
        <div className="mt-auto space-y-2.5 pt-2">
          {/* Obligations Summary Breakdown Box */}
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-y-1 gap-x-1.5 text-xs font-mono min-h-[2.5rem]">
            <div className="flex items-center gap-1.5 shrink-0">
              <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap">
                {document.obligations.length} Obligations
              </span>
            </div>

            <div className="flex items-center gap-1 text-[9px] font-bold flex-wrap">
              {openCount > 0 && <Badge variant="emerald" size="sm" className="px-1.5 py-0.5 text-[9px] font-bold leading-none">{openCount} OPEN</Badge>}
              {inProgressCount > 0 && <Badge variant="amber" size="sm" className="px-1.5 py-0.5 text-[9px] font-bold leading-none">{inProgressCount} PROG</Badge>}
              {completedCount > 0 && <Badge variant="slate" size="sm" className="px-1.5 py-0.5 text-[9px] font-bold leading-none">{completedCount} DONE</Badge>}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono h-4 shrink-0 px-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {formatDate(document.extractedAt)}
            </span>
            {document.fileSize && <span>{formatBytes(document.fileSize)}</span>}
          </div>
        </div>
      </CardContent>

      {/* Footer Actions */}
      <CardFooter className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
        <ExportButtons document={document} size="sm" compact />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetail(document)}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer gap-1 px-2.5 h-7 shrink-0"
        >
          Details
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}
