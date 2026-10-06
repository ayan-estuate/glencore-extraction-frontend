import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, FileText, Home, Lock, Shield, Sparkles, Trash2 } from "lucide-react";
import { useExtraction } from "../hooks/useExtraction";
import { ExtractionOptions } from "../types/api";
import { FileUpload } from "../components/upload/FileUpload";
import { UploadForm } from "../components/upload/UploadForm";
import { JobStatusBadge } from "../components/jobs/JobStatusBadge";
import { API_CONFIG } from "../config/api.config";
import { useSnackbar } from "../hooks/useSnackbar";
import { useJobTrackerStore, TrackedJob } from "../stores/useJobTrackerStore";
import { formatBytes } from "../lib/utils";

const timeOf = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

function progressText(job: TrackedJob): string {
  const segs = job.progress?.segments ?? [];
  if (segs.length === 0) return "—";
  const done = segs.filter((s) => s.status === "SUCCEEDED").length;
  const failed = segs.filter((s) => s.status === "ABANDONED").length;
  return `${done}/${segs.length} segments${failed > 0 ? `, ${failed} failed` : ""}`;
}

export function UploadPage() {
  const navigate = useNavigate();
  const { info } = useSnackbar();
  const { extractDocument } = useExtraction();
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [options, setOptions] = useState<ExtractionOptions>({
    language: API_CONFIG.DEFAULT_OPTIONS.language,
  });

  const jobs = useJobTrackerStore((s) => s.jobs);
  const order = useJobTrackerStore((s) => s.order);
  const clearFinished = useJobTrackerStore((s) => s.clearFinished);
  const queue = order.map((id) => jobs[id]).filter((j): j is TrackedJob => !!j);
  const hasFinished = queue.some((j) => j.finished);

  const addFiles = useCallback((added: File[]) => {
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}:${f.lastModified}`));
      return [...prev, ...added.filter((f) => !seen.has(`${f.name}:${f.size}:${f.lastModified}`))];
    });
  }, []);

  // Each file is its own job. Only the upload itself is awaited here (one after another);
  // processing continues in the background and is followed from the queue below.
  const handleStartExtraction = async () => {
    if (files.length === 0 || isSubmitting) return;
    const batch = files;
    setIsSubmitting(true);
    setFiles([]);
    info(
      batch.length === 1 ? `Uploading ${batch[0].name}...` : `Uploading ${batch.length} documents as separate jobs...`,
      "Extraction Started"
    );
    try {
      for (const file of batch) {
        await extractDocument(file, options);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
        <span className="font-medium text-slate-700 dark:text-slate-300">Upload & Extract</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/70 dark:border-blue-800/70 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs shrink-0">
            <FileText className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              PDF Compliance Document Extraction Engine
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Upload regulatory and environmental permits, licences, or agreements to automatically parse statutory
              obligations using AI.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-200/80 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold font-mono tracking-wider shadow-2xs">
            <Shield className="w-3.5 h-3.5" />
            <span>HIGH ACCURACY</span>
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold font-mono tracking-wider shadow-2xs">
            <Lock className="w-3.5 h-3.5" />
            <span>SECURE UPLOAD</span>
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-purple-200/80 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-bold font-mono tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI POWERED</span>
          </div>
        </div>
      </div>

      <FileUpload
        files={files}
        onFilesAdded={addFiles}
        onRemove={(i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
        disabled={isSubmitting}
      />

      <UploadForm
        options={options}
        setOptions={setOptions}
        onExtract={handleStartExtraction}
        isExtracting={isSubmitting}
        disabled={files.length === 0 || isSubmitting}
        fileCount={files.length}
      />

      {/* One row per extraction job, each independent of the others. */}
      {queue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Your extractions <span className="text-slate-400 font-normal">({queue.length})</span>
            </h2>
            {hasFinished && (
              <button
                onClick={clearFinished}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 cursor-pointer"
                title="Remove finished jobs from this list. They stay in the Document Library."
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear finished
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-4 py-2.5 font-semibold">File</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold hidden sm:table-cell">Progress</th>
                  <th className="px-4 py-2.5 font-semibold hidden md:table-cell">Model</th>
                  <th className="px-4 py-2.5 font-semibold">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {queue.map((job) => (
                  <tr
                    key={job.jobId}
                    onClick={() => navigate(`/jobs/${job.jobId}`)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{job.fileName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {job.fileSize > 0 ? formatBytes(job.fileSize) : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-500 font-mono">{progressText(job)}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500 font-mono truncate max-w-[160px]">
                      {job.model ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{timeOf(job.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400">Click a row to see that job's log and result.</p>
        </div>
      )}
    </div>
  );
}
