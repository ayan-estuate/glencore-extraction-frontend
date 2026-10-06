import axios from "axios";
import { apiGetJobProgress, apiGetJobResult } from "./apiClient";
import { diffProgress, isTerminal } from "./jobProgressLog";
import { useJobTrackerStore, TrackedJob } from "../stores/useJobTrackerStore";
import { useAppStore } from "../stores/useAppStore";
import { useSnackbarStore } from "../stores/useSnackbarStore";
import { ErrorResponse, JobProgress, LogEvent, StoredDocument } from "../types/api";

/**
 * Background poller for every unfinished job. Started once for the whole app, so
 * progress keeps flowing (and logs keep being recorded) while the user is on any page.
 * Everything it records comes from the server's real job/segment state.
 */

const POLL_MS = 2000;
const SYNC_EVERY_TICKS = 5; // re-read the server's job list every ~10 s
let timer: ReturnType<typeof setInterval> | null = null;
let ticking = false;
let tickCount = 0;

const warn = (message: string): LogEvent => ({ timestamp: new Date().toISOString(), level: "WARN", message });

function failureFor(progress: JobProgress): ErrorResponse {
  return {
    status: "FAILED",
    errorCode: progress.errorCode ?? progress.status,
    message: progress.errorMessage ?? `The job ended with status ${progress.status}.`,
    details: progress.segments
      .filter((s) => s.errorMessage)
      .map((s) => `Pages ${s.pageFrom}-${s.pageTo}: ${s.errorMessage}`)
      .join("\n") || undefined,
  };
}

/** The stored document and/or error for a job that reached a final state. */
async function resolveOutcome(
  job: Pick<TrackedJob, "jobId" | "fileName" | "fileSize">,
  progress: JobProgress
): Promise<{ document: StoredDocument | null; error: ErrorResponse | null }> {
  let document: StoredDocument | null = null;
  let error: ErrorResponse | null = null;

  if (progress.status === "COMPLETED" || progress.status === "PARTIAL") {
    try {
      const result = await apiGetJobResult(job.jobId);
      document = {
        ...result.data,
        id: job.jobId,
        jobId: job.jobId,
        extractedAt: new Date().toISOString(),
        rawResponse: result,
        fileName: job.fileName,
        fileSize: job.fileSize,
        llmProvider: result.provider ?? undefined,
        llmModel: result.model ?? undefined,
        status: progress.status,
      };
      // A PARTIAL job that produced nothing has no document worth keeping.
      if (progress.status === "COMPLETED" || document.obligations.length > 0) {
        useAppStore.getState().addDocument(document);
      }
    } catch {
      if (progress.status === "COMPLETED") {
        error = {
          status: "FAILED",
          errorCode: "RESULT_UNAVAILABLE",
          message: "The job completed but its result could not be downloaded. Open it from the Document Library.",
        };
      }
    }
    if (progress.status === "PARTIAL") error = failureFor(progress);
  } else {
    error = failureFor(progress);
  }
  return { document, error };
}

/** Handles a job that just reached a final state: fetch its result, notify, settle it. */
async function finalize(job: TrackedJob, progress: JobProgress): Promise<void> {
  const snack = useSnackbarStore.getState();
  const { document, error } = await resolveOutcome(job, progress);

  useJobTrackerStore.getState().patch(job.jobId, { finished: true, document, error });
  useAppStore.getState().fetchJobs(true).catch(() => undefined);

  const name = job.fileName;
  if (progress.status === "COMPLETED") {
    const n = document?.obligations.length ?? 0;
    snack.success(
      n > 0 ? `${n} obligations extracted from ${name}` : `${name} was processed, but no obligations were found.`,
      "Extraction Complete"
    );
  } else if (progress.status === "PARTIAL") {
    snack.warning(`${name}: only part of the document could be processed. See the job log.`, "Extraction Incomplete");
  } else {
    snack.error(`${name}: ${error?.message ?? progress.status}`, "Extraction Failed");
  }
}

/**
 * Make a job known to this browser (e.g. its page was opened from a link, or storage was cleared):
 * read its real state from the server and start tracking it. A job that already finished is settled
 * immediately, without notifications. Resolves false if the server has no such job.
 */
export async function adoptJob(jobId: string): Promise<boolean> {
  const tracker = useJobTrackerStore.getState();
  if (tracker.jobs[jobId]) return true;
  let progress: JobProgress;
  try {
    progress = await apiGetJobProgress(jobId);
  } catch {
    return false;
  }
  const app = useAppStore.getState();
  if (!app.jobs.some((j) => j.jobId === jobId)) await app.fetchJobs(true).catch(() => undefined);
  const summary = useAppStore.getState().jobs.find((j) => j.jobId === jobId);
  const base = {
    jobId,
    fileName: summary?.originalFilename ?? `Job ${jobId.slice(0, 8)}`,
    fileSize: summary?.sizeBytes ?? 0,
  };
  const terminal = isTerminal(progress.status);
  const outcome = terminal ? await resolveOutcome(base, progress) : { document: null, error: null };
  tracker.add({
    ...base,
    model: progress.model ?? undefined,
    submittedAt: progress.createdAt,
    status: progress.status,
    progress,
    // A snapshot of what the server says now. Earlier live log lines are only kept in the
    // browser that started the job.
    logs: diffProgress(null, progress),
    finished: terminal,
    error: outcome.error,
    document: outcome.document,
  });
  return true;
}

async function pollJob(job: TrackedJob): Promise<void> {
  const tracker = useJobTrackerStore.getState();
  let progress: JobProgress;
  try {
    progress = await apiGetJobProgress(job.jobId);
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      tracker.appendLogs(job.jobId, [warn("The server no longer has this job.")]);
      tracker.patch(job.jobId, {
        finished: true,
        status: "FAILED",
        error: { status: "FAILED", errorCode: "NOT_FOUND", message: "The server no longer has this job." },
      });
      return;
    }
    // Network or server hiccup: keep the job, say so once, try again next tick.
    const last = job.logs[job.logs.length - 1];
    if (!last || !last.message.startsWith("Lost contact")) {
      tracker.appendLogs(job.jobId, [warn("Lost contact with the server. Retrying...")]);
    }
    return;
  }

  const fresh = useJobTrackerStore.getState().jobs[job.jobId];
  if (!fresh) return;
  tracker.appendLogs(job.jobId, diffProgress(fresh.progress, progress));
  tracker.patch(job.jobId, { status: progress.status, progress, model: progress.model ?? fresh.model });

  if (isTerminal(progress.status)) {
    await finalize(useJobTrackerStore.getState().jobs[job.jobId], progress);
  }
}

/** Adopt jobs the server says are running but this browser isn't tracking (e.g. storage was cleared). */
async function adoptServerJobs(): Promise<void> {
  const app = useAppStore.getState();
  if (!app.apiKey || app.apiKeyVerified === false) return;
  await app.fetchJobs().catch(() => undefined);
  const tracker = useJobTrackerStore.getState();
  for (const j of useAppStore.getState().jobs) {
    if ((j.status === "QUEUED" || j.status === "RUNNING") && !tracker.jobs[j.jobId]) {
      tracker.add({
        jobId: j.jobId,
        fileName: j.originalFilename,
        fileSize: j.sizeBytes,
        model: j.requestedModel ?? undefined,
        submittedAt: j.createdAt,
        status: j.status,
        progress: null,
        logs: [],
        finished: false,
        error: null,
        document: null,
      });
    }
  }
}

export async function pollNow(): Promise<void> {
  if (ticking) return;
  ticking = true;
  try {
    tickCount += 1;
    if (tickCount % SYNC_EVERY_TICKS === 1) await adoptServerJobs();
    const { jobs, order } = useJobTrackerStore.getState();
    const unfinished = order.map((id) => jobs[id]).filter((j) => j && !j.finished && j.status !== "SUBMITTING");
    await Promise.all(unfinished.map((j) => pollJob(j)));
  } finally {
    ticking = false;
  }
}

/** Start the background poller (idempotent). Call once when the app mounts. */
export function startJobTracker(): void {
  if (timer) return;
  void pollNow();
  timer = setInterval(() => void pollNow(), POLL_MS);
}
