import { JobProgress, JobStatus, LogEvent, SegmentProgress } from "../types/api";

/**
 * Turns real backend progress snapshots into log lines. Nothing here is invented:
 * every line describes a change the server actually reported (job status, a segment
 * starting, failing, being given up on, or succeeding), with the server's own error text.
 */

export const TERMINAL_STATUSES: JobStatus[] = ["COMPLETED", "PARTIAL", "FAILED", "DEAD_LETTER"];
export const isTerminal = (s: JobStatus | string | undefined | null): boolean =>
  !!s && (TERMINAL_STATUSES as string[]).includes(s);

const entry = (level: LogEvent["level"], message: string): LogEvent => ({
  timestamp: new Date().toISOString(),
  level,
  message,
});

const label = (s: SegmentProgress, total: number) =>
  `Segment ${s.ordinal + 1}/${total} (pages ${s.pageFrom}-${s.pageTo})`;

function segmentLines(prev: SegmentProgress | undefined, next: SegmentProgress, total: number): LogEvent[] {
  const changed = !prev || prev.status !== next.status || prev.attempts !== next.attempts;
  if (!changed) return [];
  const name = label(next, total);
  const tries = `attempt ${next.attempts}/${next.maxAttempts}`;
  switch (next.status) {
    case "RUNNING":
      return [entry("INFO", `${name}: sent to the model, ${tries}`)];
    case "FAILED":
      return [
        entry(
          "WARN",
          `${name}: ${tries} failed${next.errorMessage ? `: ${next.errorMessage}` : ""}. It will be retried.`
        ),
      ];
    case "ABANDONED":
      return [
        entry(
          "ERROR",
          `${name}: gave up after ${next.attempts}/${next.maxAttempts} attempts${
            next.errorMessage ? `: ${next.errorMessage}` : ""
          }`
        ),
      ];
    case "SUCCEEDED":
      return [entry("INFO", `${name}: done`)];
    default:
      return [];
  }
}

/** Log lines for everything that changed between two progress snapshots. */
export function diffProgress(prev: JobProgress | null, next: JobProgress): LogEvent[] {
  const lines: LogEvent[] = [];

  if (!prev) {
    lines.push(entry("INFO", `Job ${next.jobId.slice(0, 8)} is ${next.status}`));
  } else if (prev.status !== next.status) {
    lines.push(entry("INFO", `Job status: ${prev.status} → ${next.status}`));
  }

  if (next.segments.length > 0 && (!prev || prev.segments.length === 0)) {
    const pages = next.segments[next.segments.length - 1].pageTo;
    lines.push(
      entry("INFO", `Document split into ${next.segments.length} segment(s) covering ${pages} page(s)`)
    );
  }

  const prevByOrdinal = new Map((prev?.segments ?? []).map((s) => [s.ordinal, s]));
  for (const seg of next.segments) {
    lines.push(...segmentLines(prevByOrdinal.get(seg.ordinal), seg, next.segments.length));
  }

  if (isTerminal(next.status) && (!prev || prev.status !== next.status)) {
    const ok = next.segments.filter((s) => s.status === "SUCCEEDED").length;
    const total = next.segments.length;
    if (next.status === "COMPLETED") {
      lines.push(entry("INFO", `Job completed: ${ok}/${total} segments succeeded`));
    } else if (next.status === "PARTIAL") {
      lines.push(
        entry("WARN", `Job finished PARTIAL: only ${ok}/${total} segments succeeded. The result is incomplete.`)
      );
    } else {
      lines.push(
        entry(
          "ERROR",
          `Job ${next.status}${next.errorCode ? ` (${next.errorCode})` : ""}${
            next.errorMessage ? `: ${next.errorMessage}` : ""
          }`
        )
      );
    }
  }
  return lines;
}

export interface StepView {
  step: 1 | 2 | 3 | 4 | 5;
  title: string;
  detail?: string;
  status: "idle" | "loading" | "complete" | "error";
}

/** The progress bar's state, derived from the job's real status and segment counts. */
export function stepFor(status: JobStatus | "SUBMITTING", progress: JobProgress | null): StepView {
  const total = progress?.segments.length ?? 0;
  const done = progress?.segments.filter((s) => s.status === "SUCCEEDED").length ?? 0;
  switch (status) {
    case "SUBMITTING":
      return { step: 1, title: "Uploading document", detail: "Sending the file to the server", status: "loading" };
    case "QUEUED":
      return { step: 1, title: "Queued", detail: "Waiting for a worker to pick the job up", status: "loading" };
    case "RUNNING":
      return {
        step: 2,
        title: "Processing with the LLM",
        detail: total > 0 ? `${done} of ${total} segments done` : "Reading the document",
        status: "loading",
      };
    case "COMPLETED":
      return { step: 4, title: "Extraction complete", detail: `${done}/${total} segments succeeded`, status: "complete" };
    case "PARTIAL":
      return {
        step: 2,
        title: "Extraction incomplete",
        detail: `Only ${done} of ${total} segments succeeded`,
        status: "error",
      };
    default:
      return {
        step: 2,
        title: "Extraction failed",
        detail: progress?.errorMessage ?? undefined,
        status: "error",
      };
  }
}
