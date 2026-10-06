import { create } from "zustand";
import { ErrorResponse, JobProgress, JobStatus, LogEvent, StoredDocument } from "../types/api";

/**
 * Extraction jobs the user has started, tracked for the whole life of the app, not
 * just while the Upload page is open. The poller in lib/jobTracker.ts keeps every
 * unfinished job up to date from the server, so navigating away, switching tabs or
 * reloading never loses a job's status or its log.
 */

export interface TrackedJob {
  jobId: string;
  fileName: string;
  fileSize: number;
  model?: string;
  submittedAt: string;
  status: JobStatus | "SUBMITTING";
  /** Latest real progress snapshot from the server (null until the first poll). */
  progress: JobProgress | null;
  logs: LogEvent[];
  /** True once the job reached a final state and its result was handled. */
  finished: boolean;
  error: ErrorResponse | null;
  document: StoredDocument | null;
}

interface JobTrackerState {
  jobs: Record<string, TrackedJob>;
  /** Newest first. */
  order: string[];
  /** The job the Upload page shows. */
  activeJobId: string | null;

  add: (job: TrackedJob) => void;
  rekey: (oldId: string, newId: string) => void;
  patch: (jobId: string, patch: Partial<TrackedJob>) => void;
  appendLogs: (jobId: string, lines: LogEvent[]) => void;
  setActive: (jobId: string | null) => void;
  /** Remove finished jobs from this browser's queue (the jobs themselves stay on the server). */
  clearFinished: () => void;
}

const STORAGE_KEY = "doc_extract_tracked_jobs_v1";
const MAX_TRACKED = 12;
const MAX_LOG_LINES = 400;

interface Persisted {
  jobs: Record<string, TrackedJob>;
  order: string[];
  activeJobId: string | null;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Persisted;
      if (parsed && typeof parsed === "object" && parsed.jobs && Array.isArray(parsed.order)) {
        // A job that was still being submitted when the page closed never got an id: drop it.
        const jobs: Record<string, TrackedJob> = {};
        const order: string[] = [];
        for (const id of parsed.order) {
          const j = parsed.jobs[id];
          if (j && j.status !== "SUBMITTING") {
            jobs[id] = j;
            order.push(id);
          }
        }
        return { jobs, order, activeJobId: parsed.activeJobId && jobs[parsed.activeJobId] ? parsed.activeJobId : null };
      }
    }
  } catch (e) {
    console.debug("Failed loading tracked jobs:", e);
  }
  return { jobs: {}, order: [], activeJobId: null };
}

function persist(state: Persisted) {
  try {
    // Keep the newest few; finished jobs' results already live in the document library.
    const order = state.order.slice(0, MAX_TRACKED);
    const jobs: Record<string, TrackedJob> = {};
    for (const id of order) jobs[id] = state.jobs[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ jobs, order, activeJobId: state.activeJobId }));
  } catch (e) {
    console.debug("Failed persisting tracked jobs:", e);
  }
}

export const useJobTrackerStore = create<JobTrackerState>((set, get) => {
  const commit = (next: Partial<Persisted>) => {
    set(next);
    const s = get();
    persist({ jobs: s.jobs, order: s.order, activeJobId: s.activeJobId });
  };

  return {
    ...load(),

    add: (job) => {
      const s = get();
      commit({
        jobs: { ...s.jobs, [job.jobId]: job },
        order: [job.jobId, ...s.order.filter((id) => id !== job.jobId)],
      });
    },

    rekey: (oldId, newId) => {
      const s = get();
      const job = s.jobs[oldId];
      if (!job) return;
      const { [oldId]: _removed, ...rest } = s.jobs;
      commit({
        jobs: { ...rest, [newId]: { ...job, jobId: newId } },
        order: s.order.map((id) => (id === oldId ? newId : id)),
        activeJobId: s.activeJobId === oldId ? newId : s.activeJobId,
      });
    },

    patch: (jobId, patch) => {
      const s = get();
      const job = s.jobs[jobId];
      if (!job) return;
      commit({ jobs: { ...s.jobs, [jobId]: { ...job, ...patch } } });
    },

    appendLogs: (jobId, lines) => {
      if (lines.length === 0) return;
      const s = get();
      const job = s.jobs[jobId];
      if (!job) return;
      commit({
        jobs: { ...s.jobs, [jobId]: { ...job, logs: [...job.logs, ...lines].slice(-MAX_LOG_LINES) } },
      });
    },

    setActive: (jobId) => commit({ activeJobId: jobId }),

    clearFinished: () => {
      const s = get();
      const order = s.order.filter((id) => !s.jobs[id]?.finished);
      const jobs: Record<string, TrackedJob> = {};
      for (const id of order) jobs[id] = s.jobs[id];
      commit({ jobs, order, activeJobId: s.activeJobId && jobs[s.activeJobId] ? s.activeJobId : null });
    },
  };
});

/** Jobs that are still queued or running. */
export const selectUnfinishedCount = (s: JobTrackerState): number =>
  s.order.reduce((n, id) => n + (s.jobs[id] && !s.jobs[id].finished ? 1 : 0), 0);
