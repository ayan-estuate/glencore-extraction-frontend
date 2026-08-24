import { useState, useCallback } from "react";
import { LogEvent } from "../types/api";

export interface StepProgressInfo {
  step: 1 | 2 | 3 | 4 | 5;
  title: string;
  detail?: string;
  status: "idle" | "loading" | "complete" | "error";
}

export function useLogStream() {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [stepInfo, setStepInfo] = useState<StepProgressInfo>({
    step: 1,
    title: "Upload & Document Storage",
    status: "idle",
  });

  const clearLogs = useCallback(() => {
    setLogs([]);
    setStepInfo({
      step: 1,
      title: "Upload & Document Storage",
      status: "idle",
    });
  }, []);

  const addLog = useCallback((logOrMessage: LogEvent | string, level: "INFO" | "WARN" | "ERROR" = "INFO") => {
    const entry: LogEvent =
      typeof logOrMessage === "string"
        ? { timestamp: new Date().toISOString(), level, message: logOrMessage }
        : logOrMessage;

    setLogs((prev) => [...prev, entry]);
  }, []);

  const setProgress = useCallback((step: 1 | 2 | 3 | 4 | 5, title: string, detail?: string, status: "idle" | "loading" | "complete" | "error" = "loading") => {
    setStepInfo({ step, title, detail, status });
  }, []);

  const startStream = useCallback(() => {
    clearLogs();
    setIsStreaming(true);
  }, [clearLogs]);

  const stopStream = useCallback(() => {
    setIsStreaming(false);
  }, []);

  return {
    logs,
    isStreaming,
    stepInfo,
    startStream,
    stopStream,
    clearLogs,
    addLog,
    setProgress,
  };
}
