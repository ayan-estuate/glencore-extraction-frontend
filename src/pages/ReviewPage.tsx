import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ClipboardCheck } from "lucide-react";
import { useAppStore } from "../stores/useAppStore";
import { JobStatusBadge } from "../components/jobs/JobStatusBadge";

const NEEDS_ATTENTION = ["PARTIAL", "FAILED", "DEAD_LETTER"];

/** Extractions that did not finish cleanly and need a person to look at them. */
export function ReviewPage() {
  const jobs = useAppStore((s) => s.jobs);
  const fetchJobs = useAppStore((s) => s.fetchJobs);

  useEffect(() => {
    fetchJobs(true);
  }, [fetchJobs]);

  const flagged = jobs
    .filter((j) => NEEDS_ATTENTION.includes(j.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <div className="text-xs text-slate-500 mb-1">Review & Validation</div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
          <ClipboardCheck className="w-6 h-6 text-slate-500" />
          Review & Validation
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Extractions that did not finish cleanly. Partial results are incomplete and failed ones produced nothing.
        </p>
      </div>

      {flagged.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-8 flex items-center gap-3 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          Nothing needs review. Every extraction finished cleanly or is still running.
        </div>
      ) : (
        <div className="space-y-3">
          {flagged.map((j) => (
            <div
              key={j.jobId}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-start gap-3 min-w-0">
                <AlertTriangle
                  className={`w-5 h-5 shrink-0 mt-0.5 ${j.status === "PARTIAL" ? "text-amber-500" : "text-red-500"}`}
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {j.originalFilename}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {new Date(j.createdAt).toLocaleString()}
                    {j.requestedModel ? ` · ${j.requestedModel}` : ""}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">
                    {j.errorMessage ??
                      (j.status === "PARTIAL"
                        ? "Only part of the document could be processed. Open the job to see which parts failed and why."
                        : "The extraction did not complete.")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <JobStatusBadge status={j.status} />
                <Link
                  to={`/jobs/${j.jobId}`}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Open job
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
