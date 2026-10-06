import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ListChecks } from "lucide-react";
import { useAppStore } from "../stores/useAppStore";
import { JobStatusBadge } from "../components/jobs/JobStatusBadge";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { formatBytes } from "../lib/utils";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "QUEUED", label: "Queued" },
  { value: "RUNNING", label: "Running" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PARTIAL", label: "Partial" },
  { value: "FAILED", label: "Failed" },
  { value: "DEAD_LETTER", label: "Gave up" },
];

/** Every extraction job the server has for this tenant, newest first, live while any are running. */
export function JobsPage() {
  const navigate = useNavigate();
  const jobs = useAppStore((s) => s.jobs);
  const isLoading = useAppStore((s) => s.isLoadingJobs);
  const fetchJobs = useAppStore((s) => s.fetchJobs);
  const [status, setStatus] = useState("ALL");

  useEffect(() => {
    fetchJobs(true);
  }, [fetchJobs]);

  const hasActive = jobs.some((j) => j.status === "QUEUED" || j.status === "RUNNING");
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(() => fetchJobs(true), 3000);
    return () => clearInterval(t);
  }, [hasActive, fetchJobs]);

  const rows = useMemo(
    () =>
      [...jobs]
        .filter((j) => status === "ALL" || j.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [jobs, status]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">Extraction Jobs</div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <ListChecks className="w-6 h-6 text-slate-500" />
            Extraction Jobs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Every document sent for extraction and where it stands. Click a job for its log and result.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} />
          <Button variant="outline" onClick={() => fetchJobs(true)} isLoading={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {jobs.length === 0 ? "No extraction jobs yet. Upload a document to start one." : "No jobs match this filter."}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2.5 font-semibold">Document</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold hidden sm:table-cell">Pages</th>
                <th className="px-4 py-2.5 font-semibold hidden md:table-cell">Model</th>
                <th className="px-4 py-2.5 font-semibold">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((j) => (
                <tr
                  key={j.jobId}
                  onClick={() => navigate(`/jobs/${j.jobId}`)}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{j.originalFilename}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{formatBytes(j.sizeBytes)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <JobStatusBadge status={j.status} />
                    {j.errorMessage && (
                      <div className="text-[10px] text-red-600 dark:text-red-400 mt-1 max-w-[260px] truncate" title={j.errorMessage}>
                        {j.errorMessage}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-500 font-mono">{j.pageCount ?? "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-500 font-mono truncate max-w-[160px]">
                    {j.requestedModel ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(j.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
