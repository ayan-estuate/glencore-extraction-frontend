import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, FileText, Home, Loader2 } from "lucide-react";
import { useJobTrackerStore } from "../stores/useJobTrackerStore";
import { adoptJob } from "../lib/jobTracker";
import { stepFor } from "../lib/jobProgressLog";
import { LogPanel } from "../components/logs/LogPanel";
import { JobSegmentsPanel } from "../components/common/JobSegmentsPanel";
import { JobStatusBadge } from "../components/jobs/JobStatusBadge";
import { ExtractionResult } from "../components/jobs/ExtractionResult";
import { ErrorPanel } from "../components/ui/Skeleton";
import { formatBytes } from "../lib/utils";

/**
 * One extraction job on its own: status, live log, per-segment details and, once it
 * finishes, its result. Reads only this job's state, so jobs never interfere with each other,
 * and the page is a real URL that still works after a reload.
 */
export function JobPage() {
  const { jobId = "" } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const job = useJobTrackerStore((s) => s.jobs[jobId]);
  const [lookup, setLookup] = useState<"loading" | "missing" | "done">(job ? "done" : "loading");

  useEffect(() => {
    if (job) {
      setLookup("done");
      return;
    }
    let cancelled = false;
    setLookup("loading");
    adoptJob(jobId).then((found) => {
      if (!cancelled) setLookup(found ? "done" : "missing");
    });
    return () => {
      cancelled = true;
    };
  }, [jobId, job]);

  const back = (
    <Link to="/upload" className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline">
      <ArrowLeft className="w-3.5 h-3.5" />
      Back to uploads
    </Link>
  );

  if (!job) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        {back}
        {lookup === "loading" ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <ErrorPanel
            title="Job not found"
            message="The server has no job with this id (it may have been deleted)."
          />
        )}
      </div>
    );
  }

  const isServerJob = !job.jobId.startsWith("submitting-");
  const step = stepFor(job.status, job.progress);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
        <Link to="/upload" className="hover:underline">
          Upload & Extract
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
        <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{job.fileName}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/70 dark:border-blue-800/70 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{job.fileName}</h1>
            <div className="text-[11px] text-slate-500 font-mono flex flex-wrap items-center gap-x-3">
              {job.fileSize > 0 && <span>{formatBytes(job.fileSize)}</span>}
              {isServerJob && <span>Job {job.jobId.slice(0, 8)}</span>}
              {job.model && <span>{job.model}</span>}
              <span>Uploaded {new Date(job.submittedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <JobStatusBadge status={job.status} />
          {back}
        </div>
      </div>

      <LogPanel logs={job.logs} isStreaming={!job.finished} stepInfo={step} />

      {isServerJob && <JobSegmentsPanel jobId={job.jobId} />}

      {job.finished && job.error && job.status !== "PARTIAL" && (
        <ErrorPanel
          title={`Extraction Failed (${job.error.errorCode})`}
          message={job.error.message}
          details={job.error.details}
        />
      )}

      {job.finished && job.document && (
        <ExtractionResult document={job.document} onOpenInLibrary={() => navigate(`/library/${job.jobId}`)} />
      )}
    </div>
  );
}
