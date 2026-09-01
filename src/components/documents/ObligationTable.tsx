import React from "react";
import { ObligationData, ObligationStatus } from "../../types/api";
import { DataTable, ColumnDef } from "../ui/DataTable";
import { Badge } from "../ui/Badge";
import { BookOpen, Calendar, Clock, User, ShieldCheck, ChevronDown, ChevronRight } from "lucide-react";
import { formatDate, getStatusBadgeVariant, cn } from "../../lib/utils";

export interface ObligationTableProps {
  obligations: ObligationData[];
  docId: string;
  onStatusChange?: (docId: string, obligationId: string, status: ObligationStatus) => void;
}

export function ObligationTable({ obligations, docId, onStatusChange }: ObligationTableProps) {
  const columns: ColumnDef<ObligationData>[] = [
    {
      id: "obligationId",
      header: "Obligation ID",
      accessorKey: "obligationId",
      sortable: true,
      filterable: true,
      minWidth: "150px",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200">
            {row.obligationId}
          </span>
        </div>
      ),
    },
    {
      id: "obligationTitle",
      header: "Obligation Clause Title",
      accessorKey: "obligationTitle",
      sortable: true,
      filterable: true,
      minWidth: "200px",
      cell: ({ value }) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block max-w-sm">
          {value}
        </span>
      ),
    },
    {
      id: "obligationStatus",
      header: "Status",
      accessorKey: "obligationStatus",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { label: "OPEN", value: "OPEN" },
        { label: "IN PROGRESS", value: "IN_PROGRESS" },
        { label: "COMPLETED", value: "COMPLETED" },
      ],
      minWidth: "140px",
      cell: ({ row }) => {
        if (onStatusChange) {
          return (
            <select
              value={row.obligationStatus}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onStatusChange(docId, row.obligationId, e.target.value as ObligationStatus)}
              className={cn(
                "text-[10px] font-semibold uppercase rounded-md px-2 py-1 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500",
                row.obligationStatus === "OPEN" &&
                  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
                row.obligationStatus === "IN_PROGRESS" &&
                  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
                row.obligationStatus === "COMPLETED" &&
                  "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              )}
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          );
        }

        return (
          <Badge variant={getStatusBadgeVariant(row.obligationStatus)}>
            {row.obligationStatus.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      id: "section",
      header: "Section",
      accessorKey: "section",
      sortable: true,
      filterable: true,
      minWidth: "110px",
      cell: ({ value }) => (
        <span className="font-mono text-slate-600 dark:text-slate-400">
          {value || "§ N/A"}
        </span>
      ),
    },
    {
      id: "dueDate",
      header: "Due Date",
      accessorKey: "dueDate",
      sortable: true,
      filterable: true,
      minWidth: "130px",
      cell: ({ value }) => (
        <span className="font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
          {formatDate(value)}
        </span>
      ),
    },
    {
      id: "obligationOwner",
      header: "Responsible Owner",
      accessorKey: "obligationOwner",
      sortable: true,
      filterable: true,
      minWidth: "160px",
      cell: ({ value }) => (
        <span className="text-slate-600 dark:text-slate-400 truncate block max-w-[160px]">
          {value || "Unassigned"}
        </span>
      ),
    },
  ];

  const renderExpandedRow = (obligation: ObligationData) => (
    <div className="p-4 bg-slate-50/90 dark:bg-slate-950/70 border-t border-slate-200/60 dark:border-slate-800/60 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
          Extracted Statutory Clause Text & Conditions
        </span>
        <span className="text-[11px] font-mono text-slate-400">
          Section {obligation.section || "N/A"}
        </span>
      </div>

      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
        {obligation.obligationDescription || "No detailed clause narrative extracted."}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs pt-1 font-mono">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Due: <strong>{obligation.dueDate || "Ongoing"}</strong></span>
        </div>

        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Owner: <strong>{obligation.obligationOwner || "Unassigned"}</strong></span>
        </div>

        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Status: <strong>{obligation.obligationStatus}</strong></span>
        </div>
      </div>
    </div>
  );

  return (
    <DataTable<ObligationData>
      data={obligations}
      columns={columns}
      rowKey={(ob) => ob.obligationId}
      tableKey={`doc_obs_${docId}`}
      searchPlaceholder="Search obligations by ID, title, section, or owner..."
      emptyStateMessage="No Obligations Found"
      emptyStateDescription="No statutory obligations match your active query or filter criteria."
      emptyStateIcon={<ShieldCheck className="w-8 h-8 text-slate-400" />}
      renderExpandedRow={renderExpandedRow}
      pageSize={10}
      showPagination={true}
    />
  );
}
