import { useCallback } from "react";
import { apiSubmitJob, normalizeError } from "../lib/apiClient";
import { pollNow } from "../lib/jobTracker";
import { ExtractionOptions, LogEvent } from "../types/api";
import { useJobTrackerStore } from "../stores/useJobTrackerStore";
import { useSnackbarStore } from "../stores/useSnackbarStore";

const line = (level: LogEvent["level"], message: string): LogEvent => ({
  timestamp: new Date().toISOString(),
  level,
  message,
});

/**
 * Submits a file as its own extraction job.
 *
 * Every file is an independent job: it gets its own entry in the global tracker
 * (stores/useJobTrackerStore.ts), which lib/jobTracker.ts keeps up to date from the
 * server for the life of the app. Nothing here follows the job; the Upload page lists
 * all of them and each has its own page (/jobs/:id).
 *
 * Resolves with the id the job is tracked under: the server's job id once accepted, or
 * a local id for an upload that failed (that entry carries the error).
 */
export function useExtraction() {
  const add = useJobTrackerStore((s) => s.add);
  const rekey = useJobTrackerStore((s) => s.rekey);
  const patch = useJobTrackerStore((s) => s.patch);
  const appendLogs = useJobTrackerStore((s) => s.appendLogs);

  const extractDocument = useCallback(
    async (file: File, options?: ExtractionOptions): Promise<string> => {
      const tempId = `submitting-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      add({
        jobId: tempId,
        fileName: file.name,
        fileSize: file.size,
        model: options?.model,
        submittedAt: new Date().toISOString(),
        status: "SUBMITTING",
        progress: null,
        logs: [
          line(
            "INFO",
            `Uploading "${file.name}" (${(file.size / 1024).toFixed(1)} KB)${
              options?.model ? ` for model ${options.model}` : ""
            }`
          ),
        ],
        finished: false,
        error: null,
        document: null,
      });

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
        return accepted.jobId;
      } catch (err: unknown) {
        const normalized = normalizeError(err);
        appendLogs(tempId, [line("ERROR", `Upload failed [${normalized.errorCode}]: ${normalized.message}`)]);
        patch(tempId, { status: "FAILED", finished: true, error: normalized });
        useSnackbarStore.getState().error(normalized.message, `Upload failed: ${file.name}`);
        return tempId;
      }
    },
    [add, rekey, patch, appendLogs]
  );

  return { extractDocument };
}
