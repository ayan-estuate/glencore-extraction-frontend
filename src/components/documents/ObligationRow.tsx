import React, { useState } from "react";
import { ObligationData, ObligationStatus } from "../../types/api";
import { Badge } from "../ui/Badge";
import { ChevronDown, ChevronRight, Calendar, User, BookOpen, Clock } from "lucide-react";
import { formatDate, getStatusBadgeVariant, cn } from "../../lib/utils";

export interface ObligationRowProps {
  key?: string;
  obligation: ObligationData;
  docId: string;
  onStatusChange?: (docId: string, obligationId: string, status: ObligationStatus) => void;
}

export function ObligationRow({ obligation, docId, onStatusChange }: ObligationRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "border-b border-slate-200 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer select-none text-xs",
          isExpanded && "bg-slate-50/90 dark:bg-slate-800/60"
        )}
      >
        {/* Toggle Icon & Obligation ID */}
        <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span className="text-slate-400">
            {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
            {obligation.obligationId}
          </span>
        </td>

        {/* Title */}
        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
          {obligation.obligationTitle}
        </td>

        {/* Status Badge & Inline Quick Change */}
        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
          {onStatusChange ? (
            <select
              value={obligation.obligationStatus}
              onChange={(e) => onStatusChange(docId, obligation.obligationId, e.target.value as ObligationStatus)}
              className={cn(
                "text-[10px] font-semibold uppercase rounded-md px-2 py-1 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500",
                obligation.obligationStatus === "OPEN" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
                obligation.obligationStatus === "IN_PROGRESS" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
                obligation.obligationStatus === "COMPLETED" && "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              )}
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          ) : (
            <Badge variant={getStatusBadgeVariant(obligation.obligationStatus)}>
              {obligation.obligationStatus.replace("_", " ")}
            </Badge>
          )}
        </td>

        {/* Section */}
        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
          {obligation.section || "N/A"}
        </td>

        {/* Due Date */}
        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
          {formatDate(obligation.dueDate)}
        </td>

        {/* Owner */}
        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
          {obligation.obligationOwner || "Unassigned"}
        </td>
      </tr>

      {/* Expanded Detail Panel */}
      {isExpanded && (
        <tr className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
          <td colSpan={6} className="p-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
                  Obligation Legal Text & Conditions
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Section {obligation.section}
                </span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80">
                {obligation.obligationDescription || "No detailed clause description extracted."}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs pt-1">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Owner: <strong className="text-slate-900 dark:text-slate-200 font-medium">{obligation.obligationOwner}</strong></span>
                </div>

                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Due Date: <strong className="text-slate-900 dark:text-slate-200 font-medium">{formatDate(obligation.dueDate)}</strong></span>
                </div>

                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Status: <strong className="text-slate-900 dark:text-slate-200 font-medium">{obligation.obligationStatus}</strong></span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
