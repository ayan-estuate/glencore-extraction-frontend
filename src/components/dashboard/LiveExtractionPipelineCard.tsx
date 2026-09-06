import React from "react";
import {
  UploadCloud,
  FileText,
  Sparkles,
  ShieldCheck,
  ListOrdered,
  Check,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useDocuments } from "../../hooks/useDocuments";
import { formatBytes, formatDate } from "../../lib/utils";

interface LiveExtractionPipelineCardProps {
  onViewLogs?: () => void;
}

export function LiveExtractionPipelineCard({ onViewLogs }: LiveExtractionPipelineCardProps) {
  const { jobs, allDocuments } = useDocuments();

  // Find currently running job or most recent job
  const activeJob = jobs.find((j) => j.status === "RUNNING" || j.status === "QUEUED");
  const latestJob = activeJob || jobs[0];
  const matchingDoc = latestJob ? allDocuments.find((d) => d.jobId === latestJob.jobId || d.id === latestJob.jobId) : allDocuments[0];

  const isLive = activeJob !== undefined;
  const status = latestJob ? latestJob.status : "IDLE";

  const steps = [
    {
      id: 1,
      title: "Document Upload",
      status: latestJob ? "Completed" : "Pending",
      icon: UploadCloud,
      state: latestJob ? "completed" : "pending",
    },
    {
      id: 2,
      title: "Queue & Spool",
      status: latestJob
        ? status === "QUEUED"
          ? "Queued"
          : "Completed"
        : "Pending",
      icon: FileText,
      state: latestJob
        ? status === "QUEUED"
          ? "active"
          : "completed"
        : "pending",
    },
    {
      id: 3,
      title: "AI Processing",
      status: latestJob
        ? status === "RUNNING"
          ? "In Progress"
          : status === "COMPLETED" || status === "PARTIAL"
          ? "Completed"
          : "Pending"
        : "Pending",
      icon: Sparkles,
      state: latestJob
        ? status === "RUNNING"
          ? "active"
          : status === "COMPLETED" || status === "PARTIAL"
          ? "completed"
          : "pending"
        : "pending",
    },
    {
      id: 4,
      title: "Validation",
      status: latestJob
        ? status === "COMPLETED" || status === "PARTIAL"
          ? "Validated"
          : "Pending"
        : "Pending",
      icon: ShieldCheck,
      state: latestJob && (status === "COMPLETED" || status === "PARTIAL") ? "completed" : "pending",
    },
    {
      id: 5,
      title: "Obligations Saved",
      status: latestJob
        ? status === "COMPLETED"
          ? `${matchingDoc?.obligations?.length || "Ledger"} Ready`
          : status === "FAILED"
          ? "Failed"
          : "Pending"
        : "Pending",
      icon: ListOrdered,
      state: latestJob && status === "COMPLETED" ? "completed" : latestJob && status === "FAILED" ? "error" : "pending",
    },
  ];

  const lastCompletedOrActiveIndex = steps.reduce((acc, step, idx) => {
    if (step.state === "completed" || step.state === "active") {
      return idx;
    }
    return acc;
  }, 0);

  const progressPercent = latestJob ? (lastCompletedOrActiveIndex / (steps.length - 1)) * 100 : 0;

  return (
    <div className="h-full p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>Extraction Pipeline Activity</span>
        </h3>
        {isLive ? (
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-900/50">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            Live Processing
          </span>
        ) : (
          <span className="text-[11px] font-mono text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
            {latestJob ? `Latest: ${latestJob.status}` : "Engine Ready"}
          </span>
        )}
      </div>

      {/* 5-Step Pipeline Stepper */}
      <div className="relative flex items-start justify-between gap-2 overflow-x-auto pb-2 scrollbar-none px-2">
        {/* Connector Line */}
        <div className="absolute top-6 left-12 right-12 h-1 bg-slate-200 dark:bg-slate-800 -z-0 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500 ease-in-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {steps.map((step) => {
          const isCompleted = step.state === "completed";
          const isActive = step.state === "active";
          const Icon = isCompleted ? Check : step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center text-center min-w-[90px] sm:min-w-[100px]">
              <div className="h-12 w-full flex items-center justify-center shrink-0">
                <div className="w-11 h-11 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shrink-0 shadow-2xs">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-500 shadow-xs"
                        : isActive
                        ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500 shadow-md shadow-blue-500/25 animate-pulse"
                        : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500"
                    }`}
                  >
                    <Icon className={isCompleted ? "w-4 h-4 stroke-[2.5]" : "w-4 h-4"} />
                  </div>
                </div>
              </div>

              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-1 block leading-tight min-h-[28px] flex items-center justify-center">
                {step.title}
              </span>
              <span
                className={`text-[10px] font-medium mt-0.5 ${
                  isCompleted
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : isActive
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-400"
                }`}
              >
                {step.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Processing Item Sub-Banner */}
      {latestJob ? (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {latestJob.originalFilename || matchingDoc?.fileName || `Job ${latestJob.jobId}`}
              </h4>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                {latestJob.pageCount ? `${latestJob.pageCount} pages • ` : ""}
                {latestJob.sizeBytes ? formatBytes(latestJob.sizeBytes) : ""} • Status: {latestJob.status}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="whitespace-nowrap">
                <span className="text-[9px] text-slate-400 block font-mono uppercase tracking-wider">Provider</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1 text-[11px]">
                  <Sparkles className="w-3 h-3 text-blue-500 shrink-0" />
                  {latestJob.requestedProvider || "GEMINI"}
                </span>
              </div>

              <div className="whitespace-nowrap">
                <span className="text-[9px] text-slate-400 block font-mono uppercase tracking-wider">Started</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-200 text-[11px]">
                  {formatDate(latestJob.createdAt)}
                </span>
              </div>

              {matchingDoc?.obligations && (
                <div className="whitespace-nowrap">
                  <span className="text-[9px] text-slate-400 block font-mono uppercase tracking-wider">Extracted</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                    {matchingDoc.obligations.length} Obligations
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={onViewLogs}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500/50 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs whitespace-nowrap shrink-0 ml-auto"
            >
              <span>{isLive ? "View Live Status" : "Upload New"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No documents extracted yet. Upload your first PDF permit to see real pipeline telemetry.
          </p>
          <button
            onClick={onViewLogs}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Upload Document</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
