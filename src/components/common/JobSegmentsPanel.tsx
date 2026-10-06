import React, { useEffect, useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import { apiGetJobProgress } from "../../lib/apiClient";
import { isTerminal } from "../../lib/jobProgressLog";
import { JobProgress, SegmentProgress } from "../../types/api";

const STATUS_STYLE: Record<SegmentProgress["status"], string> = {
  PENDING: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  RUNNING: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  SUCCEEDED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  FAILED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ABANDONED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const STATUS_TEXT: Record<SegmentProgress["status"], string> = {
  PENDING: "Waiting",
  RUNNING: "Running",
  SUCCEEDED: "Done",
  FAILED: "Failed, will retry",
  ABANDONED: "Gave up",
};

/**
 * What actually happened to each part of a document: status, attempts, and the real error
 * for any part that failed. Read from the server, so it is accurate whenever it is opened,
 * even for a job started in an earlier session; refreshed while the job is still running.
 */
export function JobSegmentsPanel({ jobId }: { jobId: string }) {
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const p = await apiGetJobProgress(jobId);
        if (cancelled) return;
        setProgress(p);
        setError(null);
        if (!isTerminal(p.status)) timer = setTimeout(load, 3000);
      } catch {
        if (!cancelled) setError("Could not load processing details from the server.");
      }
    };
    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <Layers className="w-3.5 h-3.5 text-slate-400" />
        Processing details
        {progress && !isTerminal(progress.status) && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
      </h4>
      {error && <p className="text-[11px] text-slate-500">{error}</p>}
      {!error && !progress && <p className="text-[11px] text-slate-500">Loading...</p>}
      {progress && progress.segments.length === 0 && (
        <p className="text-[11px] text-slate-500">The document has not been split into segments yet.</p>
      )}
      {progress && progress.segments.length > 0 && (
        <div className="space-y-1.5">
          {progress.segments.map((s) => (
            <div key={s.ordinal} className="flex flex-wrap items-start gap-2 text-[11px]">
              <span className="font-mono text-slate-500 w-28 shrink-0">
                Pages {s.pageFrom}-{s.pageTo}
              </span>
              <span className={`px-1.5 py-0.5 rounded font-semibold ${STATUS_STYLE[s.status]}`}>
                {STATUS_TEXT[s.status]}
              </span>
              <span className="font-mono text-slate-400">
                attempt {s.attempts}/{s.maxAttempts}
              </span>
              {s.errorMessage && (
                <span className="text-red-600 dark:text-red-400 break-words min-w-0 flex-1">{s.errorMessage}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {progress?.warnings.map((w, i) => (
        <p key={i} className="text-[11px] text-amber-700 dark:text-amber-400">
          {w}
        </p>
      ))}
    </div>
  );
}
