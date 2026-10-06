import React from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";

const STYLES: Record<string, { label: string; className: string; icon: React.ElementType; spin?: boolean }> = {
  SUBMITTING: { label: "Uploading", className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700", icon: Loader2, spin: true },
  QUEUED: { label: "Queued", className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700", icon: Clock },
  RUNNING: { label: "Running", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800", icon: Loader2, spin: true },
  COMPLETED: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800", icon: CheckCircle2 },
  PARTIAL: { label: "Partial", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800", icon: AlertTriangle },
  FAILED: { label: "Failed", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800", icon: XCircle },
  DEAD_LETTER: { label: "Gave up", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800", icon: XCircle },
};

export function JobStatusBadge({ status }: { status: string }) {
  const s = STYLES[status] ?? STYLES.QUEUED;
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold",
        s.className
      )}
    >
      <Icon className={cn("w-3 h-3", s.spin && "animate-spin")} />
      {s.label}
    </span>
  );
}
