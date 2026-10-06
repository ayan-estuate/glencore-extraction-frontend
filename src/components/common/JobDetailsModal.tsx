import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Download,
  ExternalLink,
  Sparkles,
  Cpu,
  Layers,
  Box,
  Trash2,
  Loader2,
  Terminal,
  ShieldCheck,
} from "lucide-react";
import { JobSummary, JobStatus } from "../../types/api";
import { useAppStore } from "../../stores/useAppStore";
import { formatBytes, formatDate } from "../../lib/utils";
import { apiExportJob } from "../../lib/apiClient";
import { useSnackbar } from "../../hooks/useSnackbar";
import { JobSegmentsPanel } from "./JobSegmentsPanel";

interface JobDetailsModalProps {
  job: JobSummary | null;
  onClose: () => void;
}

function getStatusBadge(status: JobStatus | string) {
  const s = (status || "COMPLETED").toUpperCase();
  if (s === "COMPLETED") {
    return {
      label: "Completed",
      icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    };
  }
  if (s === "PARTIAL") {
    return {
      label: "Partial (Needs Review)",
      icon: AlertTriangle,
      className: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    };
  }
  if (s === "RUNNING") {
    return {
      label: "Running",
      icon: Loader2,
      className: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800 animate-pulse",
    };
  }
  if (s === "QUEUED") {
    return {
      label: "Queued",
      icon: Clock,
      className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    };
  }
  if (s === "DEAD_LETTER") {
    return {
      label: "Dead Letter (Exhausted)",
      icon: XCircle,
      className: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    };
  }
  return {
    label: "Failed",
    icon: XCircle,
    className: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  };
}

export function JobDetailsModal({ job, onClose }: JobDetailsModalProps) {
  const navigate = useNavigate();
  const { removeDocument, loadJobResult } = useAppStore();
  const { success, error: errorSnackbar } = useSnackbar();

  const [copiedKey, setCopiedKey] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isOpeningDoc, setIsOpeningDoc] = useState(false);

  if (!job) return null;

  const statusBadge = getStatusBadge(job.status);
  const StatusIcon = statusBadge.icon;

  const durationSec =
    job.completedAt && job.createdAt
      ? ((new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()) / 1000).toFixed(1)
      : job.startedAt && job.createdAt
      ? ((new Date(job.startedAt).getTime() - new Date(job.createdAt).getTime()) / 1000).toFixed(1)
      : null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(job.jobId);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    success("Job ID copied to clipboard", "Copied");
  };

  const handleCopyDiagnostics = () => {
    navigator.clipboard.writeText(JSON.stringify(job, null, 2));
    success("Complete job telemetry JSON copied to clipboard", "Copied");
  };

  const handleExport = async (format: "DOCX" | "XLSX" | "PDF") => {
    setIsExporting(true);
    try {
      await apiExportJob(job.jobId, format, `${job.originalFilename || "document"}.${format.toLowerCase()}`);
      success(`Exported job as ${format}`, "Export Complete");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      errorSnackbar(msg, "Export Failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenObligations = async () => {
    setIsOpeningDoc(true);
    try {
      await loadJobResult(job.jobId);
      onClose();
      navigate(`/library/${job.jobId}`);
    } catch {
      navigate(`/library/${job.jobId}`);
    } finally {
      setIsOpeningDoc(false);
    }
  };

  const handleDelete = async () => {
    await removeDocument(job.jobId, job.jobId);
    success("Job removed from tenant ledger", "Job Deleted");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-950/60">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-md">
                  {job.originalFilename || `Extraction Job ${job.jobId.slice(0, 8)}`}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadge.className}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusBadge.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  ID: <span className="text-slate-700 dark:text-slate-300">{job.jobId}</span>
                </span>
                <button
                  onClick={handleCopyId}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                  title="Copy UUID"
                >
                  {copiedKey ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Tenant: {job.tenantId || "default"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Error Banner if Failed */}
          {(job.status === "FAILED" || job.status === "DEAD_LETTER" || job.errorCode) && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold">
                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Extraction Error Diagnostic: {job.errorCode || "PROCESSING_FAILED"}</span>
              </div>
              <p className="text-rose-700 dark:text-rose-300 leading-relaxed font-mono text-[11px] bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-lg border border-rose-200/50 dark:border-rose-900/40 whitespace-pre-wrap break-all">
                {job.errorMessage || "The backend worker encountered an unrecoverable processing error while extracting statutory obligations from this PDF."}
              </p>
            </div>
          )}

          {/* Partial Warning Banner */}
          {job.status === "PARTIAL" && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Partial Extraction Result</span>
              </div>
              <p className="text-amber-700 dark:text-amber-300 leading-relaxed text-[11px]">
                Some document segments were recovered while others timed out or required manual adjudication. Extracted obligations are viewable in the library.
              </p>
            </div>
          )}

          {/* Grid of Telemetry Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">File Size</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono mt-0.5 block">
                {job.sizeBytes ? formatBytes(job.sizeBytes) : "N/A"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Pages</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono mt-0.5 block">
                {job.pageCount ? `${job.pageCount} pages` : "Pending OCR"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Processing Duration</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono mt-0.5 block">
                {durationSec ? `${durationSec}s` : "In flight"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Result In Store</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                {job.resultAvailable ? "Available" : "Not Ready"}
              </span>
            </div>
          </div>

          {/* Model & Pipeline Config */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              Pipeline & Engine Configuration
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Provider</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {job.requestedProvider || "—"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Model</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs font-mono">
                  {job.requestedModel || "—"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">OCR / Language</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {job.language || "source"}
                </span>
              </div>
            </div>

            {job.instruction && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">User Extraction Prompt</span>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5 italic">
                  "{job.instruction}"
                </p>
              </div>
            )}
          </div>

          <JobSegmentsPanel jobId={job.jobId} />

          {/* Timestamp Audit Trail */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Durable Execution Timeline
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Enqueued At</span>
                <span className="text-slate-700 dark:text-slate-300">{formatDate(job.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Worker Started</span>
                <span className="text-slate-700 dark:text-slate-300">{formatDate(job.startedAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Finished At</span>
                <span className="text-slate-700 dark:text-slate-300">{formatDate(job.completedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyDiagnostics}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy Telemetry JSON</span>
            </button>

            <button
              onClick={handleDelete}
              className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {job.resultAvailable || job.status === "COMPLETED" || job.status === "PARTIAL" ? (
              <>
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5">
                  <button
                    onClick={() => handleExport("DOCX")}
                    disabled={isExporting}
                    className="px-2 py-1 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
                    title="Export as Microsoft Word"
                  >
                    DOCX
                  </button>
                  <button
                    onClick={() => handleExport("XLSX")}
                    disabled={isExporting}
                    className="px-2 py-1 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
                    title="Export as Microsoft Excel"
                  >
                    XLSX
                  </button>
                  <button
                    onClick={() => handleExport("PDF")}
                    disabled={isExporting}
                    className="px-2 py-1 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
                    title="Export as PDF"
                  >
                    PDF
                  </button>
                </div>

                <button
                  onClick={handleOpenObligations}
                  disabled={isOpeningDoc}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {isOpeningDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>Open Obligations</span>
                </button>
              </>
            ) : null}

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
