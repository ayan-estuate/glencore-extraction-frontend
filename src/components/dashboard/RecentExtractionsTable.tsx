import React, { useState, useMemo } from "react";
import {
  FileText,
  Sparkles,
  Cpu,
  Layers,
  Box,
  Eye,
  ArrowRight,
  Clock,
  AlertCircle,
  Loader2,
  Terminal,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { StoredDocument, JobSummary, JobStatus } from "../../types/api";
import { useAppStore } from "../../stores/useAppStore";
import { formatDate } from "../../lib/utils";
import { JobDetailsModal } from "../common/JobDetailsModal";
import { DataTable, ColumnDef } from "../ui/DataTable";

interface RecentExtractionsTableProps {
  documents: StoredDocument[];
  onViewDetail: (doc: StoredDocument) => void;
  onViewAll: () => void;
}

interface RecentExtractionRow {
  id: string;
  jobId?: string;
  title: string;
  filename: string;
  meta: string;
  provider: string;
  providerRaw: string;
  modelRaw?: string;
  obligationsCount: number | string;
  status: JobStatus | string;
  job?: JobSummary;
  matchingDoc?: StoredDocument;
}

function getProviderInfo(providerStr?: string, modelStr?: string) {
  const p = (providerStr || "GEMINI").toUpperCase();
  if (p.includes("CLAUDE")) {
    return {
      name: modelStr ? modelStr.replace("claude-", "Claude ") : "Claude Opus 5",
      icon: Layers,
      color: "text-amber-500",
    };
  }
  if (p.includes("OPENAI") || p.includes("GPT")) {
    return {
      name: modelStr || "GPT-4o Mini",
      icon: Cpu,
      color: "text-emerald-500",
    };
  }
  if (p.includes("OLLAMA") || p.includes("LLAMA")) {
    return {
      name: modelStr || "Ollama Qwen 3",
      icon: Box,
      color: "text-purple-500",
    };
  }
  return {
    name: modelStr ? modelStr.replace("gemini-", "Gemini ") : "Gemini 3.5 Flash",
    icon: Sparkles,
    color: "text-blue-500",
  };
}

function getStatusBadge(status: JobStatus | string) {
  const s = (status || "COMPLETED").toUpperCase();
  if (s === "COMPLETED" || s === "SUCCESS") {
    return {
      label: "Completed",
      icon: CheckCircle2,
      className:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50",
    };
  }
  if (s === "PARTIAL") {
    return {
      label: "Partial",
      icon: AlertTriangle,
      className:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50",
    };
  }
  if (s === "RUNNING" || s === "PROCESSING") {
    return {
      label: "Running",
      icon: Loader2,
      className:
        "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 animate-pulse",
    };
  }
  if (s === "QUEUED" || s === "PENDING") {
    return {
      label: "Queued",
      icon: Clock,
      className:
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50",
    };
  }
  return {
    label: s === "DEAD_LETTER" ? "Dead Letter" : "Failed",
    icon: XCircle,
    className:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50",
  };
}

export function RecentExtractionsTable({
  documents,
  onViewDetail,
  onViewAll,
}: RecentExtractionsTableProps) {
  const { jobs, loadJobResult } = useAppStore();
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);
  const [inspectedJob, setInspectedJob] = useState<JobSummary | null>(null);

  // Build rows from backend jobs or fallback documents
  const rows: RecentExtractionRow[] = useMemo(() => {
    const list: RecentExtractionRow[] = [];
    if (jobs && jobs.length > 0) {
      jobs.forEach((job) => {
        const matchingDoc = documents.find((d) => d.jobId === job.jobId || d.id === job.jobId);
        const providerInfo = getProviderInfo(job.requestedProvider, job.requestedModel || undefined);
        const durationStr =
          job.completedAt && job.createdAt
            ? ` • ${((new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()) / 1000).toFixed(1)}s`
            : "";

        list.push({
          id: job.jobId,
          jobId: job.jobId,
          title: matchingDoc ? matchingDoc.documentTitle : (job.originalFilename || "Compliance Document"),
          filename: job.originalFilename || "document.pdf",
          meta: `${formatDate(job.createdAt)}${durationStr}${job.pageCount ? ` • ${job.pageCount}p` : ""}`,
          provider: providerInfo.name,
          providerRaw: job.requestedProvider || "GEMINI",
          modelRaw: job.requestedModel || undefined,
          obligationsCount: matchingDoc ? matchingDoc.obligations.length : (job.status === "COMPLETED" ? "Ready" : "-"),
          status: job.status,
          job,
          matchingDoc,
        });
      });
    } else if (documents && documents.length > 0) {
      documents.forEach((doc) => {
        const providerInfo = getProviderInfo(doc.llmProvider, doc.llmModel);
        list.push({
          id: doc.id,
          jobId: doc.jobId,
          title: doc.documentTitle || doc.documentId,
          filename: doc.fileName || `${doc.documentId}.pdf`,
          meta: formatDate(doc.extractedAt),
          provider: providerInfo.name,
          providerRaw: doc.llmProvider || "GEMINI",
          modelRaw: doc.llmModel,
          obligationsCount: doc.obligations.length,
          status: "COMPLETED",
          matchingDoc: doc,
        });
      });
    }
    return list;
  }, [jobs, documents]);

  const handleRowClick = async (row: RecentExtractionRow) => {
    if (row.matchingDoc) {
      onViewDetail(row.matchingDoc);
      return;
    }
    if (row.jobId && (row.status === "COMPLETED" || row.status === "PARTIAL")) {
      setLoadingJobId(row.jobId);
      try {
        const loaded = await loadJobResult(row.jobId);
        if (loaded) {
          onViewDetail(loaded);
          return;
        }
      } finally {
        setLoadingJobId(null);
      }
    }
    // If failed, queued, or running, open the telemetry modal!
    if (row.job) {
      setInspectedJob(row.job);
    }
  };

  const columns: ColumnDef<RecentExtractionRow>[] = [
    {
      id: "title",
      header: "Document / Job",
      accessorKey: "title",
      sortable: true,
      filterable: true,
      minWidth: "220px",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              row.status === "FAILED" || row.status === "DEAD_LETTER"
                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-900/40"
                : row.status === "PARTIAL"
                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-900/40"
                : "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border-blue-100 dark:border-blue-900/40"
            }`}
          >
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors max-w-xs">
              {row.title}
            </h4>
            <span className="text-[10px] text-slate-400 font-mono block">
              {row.meta}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "provider",
      header: "Engine / Model",
      accessorKey: "provider",
      sortable: true,
      filterable: true,
      minWidth: "150px",
      cell: ({ row }) => {
        const providerInfo = getProviderInfo(row.providerRaw, row.modelRaw);
        const ProviderIcon = providerInfo.icon;
        return (
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium text-[11px] font-mono">
            <ProviderIcon className={`w-3.5 h-3.5 shrink-0 ${providerInfo.color}`} />
            <span className="truncate max-w-[140px]">{row.provider}</span>
          </div>
        );
      },
    },
    {
      id: "obligationsCount",
      header: "Obligations",
      accessorKey: "obligationsCount",
      sortable: true,
      align: "center",
      minWidth: "100px",
      cell: ({ value }) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
          {value}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { label: "COMPLETED", value: "COMPLETED" },
        { label: "PARTIAL", value: "PARTIAL" },
        { label: "FAILED", value: "FAILED" },
        { label: "RUNNING", value: "RUNNING" },
        { label: "QUEUED", value: "QUEUED" },
      ],
      align: "center",
      minWidth: "120px",
      cell: ({ row }) => {
        const statusBadge = getStatusBadge(row.status);
        const StatusIcon = statusBadge.icon;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge.className}`}
          >
            <StatusIcon className="w-2.5 h-2.5" />
            {statusBadge.label}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      draggable: false,
      align: "right",
      minWidth: "90px",
      cell: ({ row }) => {
        const isLoadingThis = loadingJobId === row.id;
        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {row.job && (
              <button
                onClick={() => setInspectedJob(row.job || null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="View Telemetry Diagnostics"
              >
                <Terminal className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => handleRowClick(row)}
              disabled={isLoadingThis}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="View Document Details"
            >
              {isLoadingThis ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable<RecentExtractionRow>
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        tableKey="dashboard_recent_extractions_table"
        title="Recent Extractions & Execution Ledger"
        searchPlaceholder="Search recent extractions..."
        pageSize={5}
        pageSizeOptions={[5, 10, 15, 25]}
        onRowClick={handleRowClick}
        actions={
          <button
            onClick={onViewAll}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>View All in Library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
        emptyStateIcon={<FileText className="w-8 h-8 text-slate-400" />}
        emptyStateMessage="No recent extractions recorded"
        emptyStateDescription="Upload an environmental permit or regulatory document to view parsed obligations and extraction telemetry."
      />

      {/* Telemetry Inspection Modal */}
      {inspectedJob && (
        <JobDetailsModal
          job={inspectedJob}
          onClose={() => setInspectedJob(null)}
        />
      )}
    </>
  );
}
