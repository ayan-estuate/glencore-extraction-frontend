import React from "react";
import { LogEvent } from "../../types/api";
import { cn } from "../../lib/utils";

export interface LogLineProps {
  key?: number | string;
  log: LogEvent;
}

export function LogLine({ log }: LogLineProps) {
  const getLevelBadge = () => {
    switch (log.level) {
      case "INFO":
        return "bg-blue-900/60 text-blue-300 border-blue-700/50";
      case "WARN":
        return "bg-amber-950/80 text-amber-300 border-amber-700/50";
      case "ERROR":
        return "bg-red-950/90 text-red-300 border-red-700/50";
    }
  };

  const getMessageColor = () => {
    switch (log.level) {
      case "INFO":
        return "text-slate-300";
      case "WARN":
        return "text-amber-200 font-medium";
      case "ERROR":
        return "text-red-200 font-semibold";
    }
  };

  return (
    <div className="flex items-start gap-2.5 py-1 px-2 hover:bg-slate-800/40 font-mono text-[11px] leading-relaxed rounded transition-colors group">
      {/* Timestamp */}
      <span className="text-slate-500 shrink-0 select-none">
        {log.timestamp ? log.timestamp.substring(11, 23) : "12:00:00.000"}
      </span>

      {/* Level Badge */}
      <span
        className={cn(
          "px-1.5 py-0.2 rounded border text-[9px] font-bold tracking-wider shrink-0 uppercase",
          getLevelBadge()
        )}
      >
        {log.level}
      </span>

      {/* Message */}
      <span className={cn("break-all flex-1", getMessageColor())}>{log.message}</span>
    </div>
  );
}
