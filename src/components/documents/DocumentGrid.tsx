import React, { useState, useMemo } from "react";
import { StoredDocument } from "../../types/api";
import { DocumentCard } from "./DocumentCard";
import { Button } from "../ui/Button";
import { ExportDialog } from "../exports/ExportDialog";
import { EmptyState } from "../ui/EmptyState";
import { DataTable, ColumnDef } from "../ui/DataTable";
import {
  LayoutGrid,
  List,
  FolderKanban,
  Download,
  CheckSquare,
  Square,
  FileCheck,
  Building2,
  Calendar,
  Eye,
  Trash2,
  Sparkles,
  FileText,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { formatDate, formatBytes } from "../../lib/utils";
import { ExportButtons } from "../exports/ExportButtons";

export interface DocumentGridProps {
  documents: StoredDocument[];
  onViewDetail: (doc: StoredDocument) => void;
  onDelete?: (id: string) => void;
  onUploadRedirect?: () => void;
}

export function DocumentGrid({
  documents,
  onViewDetail,
  onDelete,
  onUploadRedirect,
}: DocumentGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === documents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(documents.map((d) => d.id));
    }
  };

  const selectedDocs = useMemo(
    () => documents.filter((d) => selectedIds.includes(d.id)),
    [documents, selectedIds]
  );

  // Dynamic filter options for Entity and LLM Provider
  const entityOptions = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.entity && d.entity.trim()) set.add(d.entity.trim());
    });
    return Array.from(set).map((e) => ({ label: e, value: e }));
  }, [documents]);

  const providerOptions = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.llmProvider && d.llmProvider.trim()) set.add(d.llmProvider.trim().toUpperCase());
    });
    return Array.from(set).map((p) => ({ label: p, value: p }));
  }, [documents]);

  const columns: ColumnDef<StoredDocument>[] = [
    {
      id: "select",
      header: "",
      draggable: false,
      align: "center",
      minWidth: "45px",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
          <button
            onClick={() => toggleSelect(row.id)}
            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer p-1"
          >
            {selectedIds.includes(row.id) ? (
              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      ),
    },
    {
      id: "documentId",
      header: "Document / Permit ID",
      accessorKey: "documentId",
      sortable: true,
      filterable: true,
      minWidth: "160px",
      cell: ({ row }) => (
        <div>
          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 block truncate max-w-[150px]">
            {row.documentId}
          </span>
          <span className="text-[10px] text-slate-400 truncate block max-w-[150px]">
            {row.entity || "Unspecified Entity"}
          </span>
        </div>
      ),
    },
    {
      id: "documentTitle",
      header: "Title & Regulatory Scope",
      accessorKey: "documentTitle",
      sortable: true,
      filterable: true,
      minWidth: "260px",
      cell: ({ row }) => (
        <div className="max-w-md">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">
            {row.documentTitle || "Statutory Document"}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
            {row.documentDescription || row.fileName}
          </p>
        </div>
      ),
    },
    {
      id: "entity",
      header: "Regulated Entity",
      accessorKey: "entity",
      sortable: true,
      filterable: true,
      filterType: entityOptions.length > 0 ? "select" : "text",
      filterOptions: entityOptions,
      minWidth: "150px",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-xs">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate max-w-[140px]">{row.entity || "—"}</span>
        </div>
      ),
    },
    {
      id: "obligations",
      header: "Obligations",
      accessorFn: (row) => row.obligations?.length || 0,
      sortable: true,
      align: "center",
      minWidth: "120px",
      cell: ({ row }) => {
        const total = row.obligations?.length || 0;
        const open = row.obligations?.filter((o) => o.obligationStatus === "OPEN").length || 0;
        const completed = row.obligations?.filter((o) => o.obligationStatus === "COMPLETED").length || 0;
        return (
          <div className="flex flex-col items-center">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
              {total} {total === 1 ? "clause" : "clauses"}
            </span>
            {total > 0 && (
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                {completed} done • {open} open
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "llmProvider",
      header: "AI Engine",
      accessorKey: "llmProvider",
      sortable: true,
      filterable: true,
      filterType: providerOptions.length > 0 ? "select" : "text",
      filterOptions: providerOptions,
      minWidth: "130px",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-blue-500 shrink-0" />
          <span className="font-semibold">{row.llmProvider || "GEMINI"}</span>
        </div>
      ),
    },
    {
      id: "extractedAt",
      header: "Extracted At",
      accessorKey: "extractedAt",
      sortable: true,
      filterable: true,
      minWidth: "130px",
      cell: ({ row }) => (
        <div className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
          <span>{formatDate(row.extractedAt)}</span>
          {row.fileSize ? (
            <span className="text-[10px] text-slate-400 block">{formatBytes(row.fileSize)}</span>
          ) : null}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      draggable: false,
      align: "right",
      minWidth: "140px",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onViewDetail(row)}
            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
            title="View Compliance Obligations"
          >
            <Eye className="w-4 h-4" />
          </button>

          <ExportButtons document={row} size="sm" />

          {onDelete && (
            <button
              onClick={() => onDelete(row.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Delete Document"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const renderExpandedRow = (doc: StoredDocument) => (
    <div className="p-4 bg-slate-50/90 dark:bg-slate-950/70 border-t border-slate-200/60 dark:border-slate-800/60 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
          Document Narrative Summary
        </span>
        <button
          onClick={() => onViewDetail(doc)}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Open Full Clause Matrix</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
        {doc.documentDescription || "No detailed summary provided for this document."}
      </p>

      {doc.obligations && doc.obligations.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Sample Extracted Clauses ({doc.obligations.length} total)
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {doc.obligations.slice(0, 4).map((ob, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-[11px] space-y-1"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{ob.obligationId}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      ob.obligationStatus === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : ob.obligationStatus === "IN_PROGRESS"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                    }`}
                  >
                    {ob.obligationStatus}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 truncate">{ob.obligationTitle}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
        <span>File: <strong className="text-slate-700 dark:text-slate-300">{doc.fileName}</strong></span>
        <span>Size: <strong className="text-slate-700 dark:text-slate-300">{formatBytes(doc.fileSize)}</strong></span>
        <span>Engine: <strong className="text-slate-700 dark:text-slate-300">{doc.llmProvider} ({doc.llmModel})</strong></span>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-4">
      {/* Top Header & Bulk Export Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
          >
            {selectedIds.length > 0 && selectedIds.length === documents.length ? (
              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>Select All ({documents.length})</span>
          </button>

          {selectedIds.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsExportOpen(true)}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export Selected ({selectedIds.length})
            </Button>
          )}
        </div>

        {/* View Mode Toggle: Grid Cards vs Interactive Table */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === "list"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            title="Interactive Table View"
          >
            <List className="w-3.5 h-3.5" />
            <span>Table View</span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === "grid"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            title="Cards Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards Grid</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      {documents.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onViewDetail={onViewDetail}
                onDelete={onDelete}
                isSelected={selectedIds.includes(doc.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        ) : (
          <DataTable<StoredDocument>
            data={documents}
            columns={columns}
            rowKey={(doc) => doc.id}
            tableKey="document_library_table"
            searchPlaceholder="Search documents by ID, title, entity, description..."
            pageSize={10}
            pageSizeOptions={[10, 20, 50, 100]}
            renderExpandedRow={renderExpandedRow}
            onRowClick={(doc) => onViewDetail(doc)}
            emptyStateIcon={<FolderKanban className="w-8 h-8 text-slate-400" />}
            emptyStateMessage="No Documents Found"
            emptyStateDescription="No documents match your query or filter criteria."
          />
        )
      ) : (
        <EmptyState
          icon={<FolderKanban className="w-6 h-6" />}
          headline="No Documents Found"
          description="Your library is currently empty or no extracted compliance documents match the selected filters."
          primaryAction={
            onUploadRedirect
              ? {
                  label: "Upload PDF Document",
                  onClick: onUploadRedirect,
                }
              : undefined
          }
        />
      )}

      {/* Bulk Export Dialog */}
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        selectedDocuments={selectedDocs}
      />
    </div>
  );
}
