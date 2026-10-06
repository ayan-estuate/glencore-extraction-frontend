import React, { useRef, useEffect, useState } from "react";
import { LogEvent } from "../../types/api";
import { StepProgressInfo } from "../../hooks/useLogStream";
import { LogLine } from "./LogLine";
import { StepProgress } from "./StepProgress";
import { Terminal, Copy, Check, ChevronDown, ChevronUp, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";

export interface LogPanelProps {
  logs: LogEvent[];
  isStreaming: boolean;
  stepInfo: StepProgressInfo;
  onClear?: () => void;
  defaultExpanded?: boolean;
}

export function LogPanel({
  logs,
  isStreaming,
  stepInfo,
  onClear,
  defaultExpanded = true,
}: LogPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (logs.length === 0 && !isStreaming) {
    return null;
  }

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg transition-all duration-200">
      {/* Top Header Step Progress */}
      <StepProgress stepInfo={stepInfo} />

      {/* Terminal Bar Controls */}
      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-mono font-semibold text-slate-200">
            Job Log
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
            {logs.length} events
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-[11px] text-blue-400 font-mono animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Updating
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLogs}
            className="text-slate-400 hover:text-white h-7 text-xs gap-1.5 px-2"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy Logs"}
          </Button>

          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-slate-400 hover:text-white h-7 text-xs px-2"
              title="Clear logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white h-7 text-xs px-2"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Logs Area */}
      {isExpanded && (
        <div
          ref={logsContainerRef}
          className="p-3 max-h-80 overflow-y-auto space-y-0.5 font-mono bg-slate-950/90 text-slate-300 divide-y divide-slate-900/40"
        >
          {logs.map((log, index) => (
            <LogLine key={index} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
