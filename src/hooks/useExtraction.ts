import { useState, useCallback, useRef } from "react";
import {
  apiSubmitJob,
  apiGetJobStatus,
  apiGetJobResult,
  normalizeError,
} from "../lib/apiClient";
import {
  ExtractionOptions,
  ExtractionResponse,
  ErrorResponse,
  StoredDocument,
  JobStatus,
} from "../types/api";
import { useAppStore } from "../stores/useAppStore";
import { useLogStream } from "./useLogStream";

export function useExtraction() {
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [lastResponse, setLastResponse] = useState<ExtractionResponse | null>(null);
  const [lastStoredDocument, setLastStoredDocument] = useState<StoredDocument | null>(null);

  const { addDocument, fetchJobs, setActiveJob } = useAppStore();
  const logStream = useLogStream();
  const abortPollingRef = useRef<boolean>(false);

  const extractDocument = useCallback(
    async (file: File, options?: ExtractionOptions) => {
      setIsExtracting(true);
      setError(null);
      setLastResponse(null);
      setLastStoredDocument(null);
      setActiveJobId(null);
      setCurrentStatus(null);
      abortPollingRef.current = false;

      logStream.startStream();
      logStream.setProgress(1, "Uploading & Spooling Document", "Streaming to backend blob store...", "loading");
      logStream.addLog(`Selected document: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`);

      try {
        logStream.addLog(`Target LLM Provider: ${options?.provider || "GEMINI"} (model: ${options?.model || "auto"})`);
        logStream.addLog("Submitting document to /api/v1/document/jobs (Async Queue)...");

        const accepted = await apiSubmitJob(file, options);
        const jobId = accepted.jobId;
        setActiveJobId(jobId);
        setCurrentStatus(accepted.status);

        logStream.addLog(`Job successfully enqueued. Job ID: ${jobId}`, "INFO");

        if (accepted.status === "COMPLETED") {
          // Reused identical document within 7-day window!
          logStream.addLog("Identical document matched within retention window (SHA-256 reuse match). Fetching cached result...", "INFO");
          logStream.setProgress(4, "Reusing Completed Result", "Result ready instantly from ledger cache", "loading");
        } else {
          logStream.setProgress(2, "Enqueued in Postgres Queue", `Status: ${accepted.status}. Waiting for worker claim...`, "loading");
        }

        // Begin polling loop
        const startTime = Date.now();
        const maxTimeoutMs = 180000; // 3 minutes
        let isComplete = false;

        while (!isComplete && !abortPollingRef.current) {
          if (Date.now() - startTime > maxTimeoutMs) {
            throw new Error("Job polling timed out after 3 minutes. Worker may be busy or processing large document.");
          }

          const statusView = await apiGetJobStatus(jobId);
          setCurrentStatus(statusView.status);

          if (statusView.status === "RUNNING") {
            logStream.setProgress(
              3,
              "AI Extraction in Progress",
              "Worker processing document segments & querying LLM provider...",
              "loading"
            );
            logStream.addLog(`Worker active on job ${jobId.slice(0, 8)}... (attempts in progress)`);
          } else if (statusView.status === "COMPLETED" || (statusView.status as string) === "PARTIAL") {
            logStream.setProgress(4, "Retrieving Extracted Obligations", "Job finished in database. Downloading structured result...", "loading");
            logStream.addLog(`Extraction finished with status: ${statusView.status}. Fetching result...`);

            const result = await apiGetJobResult(jobId);
            setLastResponse(result);

            const storedDoc: StoredDocument = {
              ...result.data,
              id: jobId,
              jobId: jobId,
              extractedAt: new Date().toISOString(),
              rawResponse: result,
              fileName: file.name,
              fileSize: file.size,
              status: statusView.status,
            };

            setLastStoredDocument(storedDoc);
            addDocument(storedDoc);

            logStream.setProgress(
              5,
              "Extraction Complete & Validated",
              `Successfully extracted ${result.data?.obligations?.length || 0} statutory obligations`,
              "complete"
            );
            logStream.addLog(
              `Completed in ${result.processingTime || Math.round((Date.now() - startTime))}ms. Parsed ${result.data?.obligations?.length || 0} obligations.`,
              "INFO"
            );

            isComplete = true;
            break;
          } else if (statusView.status === "FAILED" || statusView.status === "DEAD_LETTER") {
            const errorMsg = statusView.errorMessage || "Extraction job failed on server worker";
            throw new Error(`Extraction failed (${statusView.errorCode || statusView.status}): ${errorMsg}`);
          }

          // Wait 1.5 seconds between polls
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        // Refresh jobs in background
        fetchJobs();
      } catch (err: unknown) {
        const normalized = normalizeError(err);
        setError(normalized);
        logStream.setProgress(1, "Extraction Failed", normalized.message, "error");
        logStream.addLog(`ERROR [${normalized.errorCode}]: ${normalized.message}`, "ERROR");
      } finally {
        setIsExtracting(false);
        logStream.stopStream();
      }
    },
    [addDocument, fetchJobs, logStream]
  );

  const cancelExtraction = useCallback(() => {
    abortPollingRef.current = true;
    setIsExtracting(false);
    logStream.stopStream();
    logStream.addLog("Extraction polling cancelled by user.", "WARN");
  }, [logStream]);

  return {
    extractDocument,
    cancelExtraction,
    isExtracting,
    activeJobId,
    currentStatus,
    error,
    lastResponse,
    lastStoredDocument,
    logStream,
  };
}
