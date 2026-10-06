import { useCallback } from "react";
import { apiSubmitJob, normalizeError } from "../lib/apiClient";
import { pollNow } from "../lib/jobTracker";
import { stepFor } from "../lib/jobProgressLog";
import { ExtractionOptions, LogEvent } from "../types/api";
import { useJobTrackerStore } from "../stores/useJobTrackerStore";
import { useSnackbarStore } from "../stores/useSnackbarStore";
import type { StepProgressInfo } from "./useLogStream";

const line = (level: LogEvent["level"], message: string): LogEvent => ({
  timestamp: new Date().toISOString(),
  level,
  message,
});

/**
 * Starts an extraction and exposes the state of the job the Upload page is showing.
 *
 * The job itself lives in the global tracker (stores/useJobTrackerStore.ts), which is
 * polled in the background by lib/jobTracker.ts for the life of the app. This hook only
 * submits the file and reads that state, so leaving the page and coming back shows the
 * same job, its real status and its full log.
 */
export function useExtraction() {
  const job = useJobTrackerStore((s) => (s.activeJobId ? s.jobs[s.activeJobId] ?? null : null));
  const add = useJobTrackerStore((s) => s.add);
  const rekey = useJobTrackerStore((s) => s.rekey);
  const patch = useJobTrackerStore((s) => s.patch);
  const appendLogs = useJobTrackerStore((s) => s.appendLogs);
  const setActive = useJobTrackerStore((s) => s.setActive);

  const extractDocument = useCallback(
    async (file: File, options?: ExtractionOptions) => {
      const tempId = `submitting-${Date.now()}`;
      add({
        jobId: tempId,
        fileName: file.name,
        fileSize: file.size,
        model: options?.model,
        submittedAt: new Date().toISOString(),
        status: "SUBMITTING",
        progress: null,
        logs: [
          line("INFO", `Uploading "${file.name}" (${(file.size / 1024).toFixed(1)} KB)${options?.model ? ` for model ${options.model}` : ""}`),
        ],
        finished: false,
        error: null,
        document: null,
      });
      setActive(tempId);

      try {
        const accepted = await apiSubmitJob(file, options);
        rekey(tempId, accepted.jobId);
        patch(accepted.jobId, { status: accepted.status });
        appendLogs(accepted.jobId, [
          line(
            "INFO",
            accepted.status === "COMPLETED"
              ? `Identical document already processed recently; reusing job ${accepted.jobId.slice(0, 8)}`
              : `Job ${accepted.jobId.slice(0, 8)} accepted by the server`
          ),
        ]);
        void pollNow();
      } catch (err: unknown) {
        const normalized = normalizeError(err);
        appendLogs(tempId, [line("ERROR", `Upload failed [${normalized.errorCode}]: ${normalized.message}`)]);
        patch(tempId, { status: "FAILED", finished: true, error: normalized });
        useSnackbarStore.getState().error(normalized.message, `Extraction Error (${normalized.errorCode})`);
      }
    },
    [add, rekey, patch, appendLogs, setActive]
  );

  const stepInfo: StepProgressInfo = job
    ? stepFor(job.status, job.progress)
    : { step: 1, title: "Upload & Document Storage", status: "idle" };

  const isExtracting = !!job && !job.finished;

  return {
    extractDocument,
    isExtracting,
    activeJobId: job?.jobId ?? null,
    currentStatus: job && job.status !== "SUBMITTING" ? job.status : null,
    error: job?.error ?? null,
    lastStoredDocument: job?.finished ? job.document : null,
    logStream: {
      logs: job?.logs ?? [],
      isStreaming: isExtracting,
      stepInfo,
      /** Hides this job from the page. It keeps being tracked in the background if unfinished. */
      clearLogs: () => setActive(null),
    },
  };
}
