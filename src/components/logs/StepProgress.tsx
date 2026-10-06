import React from "react";
import { Check, Loader2, Sparkles, FileText, ShieldCheck, X } from "lucide-react";
import { StepProgressInfo } from "../../hooks/useLogStream";
import { cn } from "../../lib/utils";

export interface StepProgressProps {
  stepInfo: StepProgressInfo;
}

export function StepProgress({ stepInfo }: StepProgressProps) {
  const steps = [
    { num: 1, title: "PDF Text Extraction", icon: FileText },
    { num: 2, title: "LLM Provider Processing", icon: Sparkles },
    { num: 3, title: "Validation & Structuring", icon: ShieldCheck },
    { num: 4, title: "Complete", icon: Check },
  ];

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 p-4 rounded-t-xl text-slate-100">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {steps.map((s) => {
          const Icon = s.icon;
          const failed = stepInfo.status === "error";
          const isDone = stepInfo.status === "complete" || stepInfo.step > s.num;
          const isFailedStep = failed && stepInfo.step === s.num;
          const isCurrent = !failed && stepInfo.step === s.num && stepInfo.status !== "complete";

          return (
            <div
              key={s.num}
              className={cn(
                "flex items-center gap-2.5 p-2.5 rounded-lg border transition-all",
                isFailedStep
                  ? "bg-red-950/50 border-red-700/70 text-red-200"
                  : isDone
                  ? "bg-blue-950/40 border-blue-800/60 text-blue-300"
                  : isCurrent
                  ? "bg-blue-900/60 border-blue-600 text-white shadow-xs"
                  : "bg-slate-950/40 border-slate-800 text-slate-500"
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center shrink-0 font-mono text-xs font-bold",
                  isFailedStep
                    ? "bg-red-600 text-white"
                    : isDone
                    ? "bg-blue-600 text-white"
                    : isCurrent
                    ? "bg-blue-500 text-white"
                    : "bg-slate-800 text-slate-500"
                )}
              >
                {isFailedStep ? (
                  <X className="w-4 h-4" />
                ) : isDone ? (
                  <Check className="w-4 h-4" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  s.num
                )}
              </div>

              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold truncate leading-tight">{s.title}</span>
                <span className="text-[10px] text-slate-400 font-mono truncate">
                  {isFailedStep ? "Failed" : isDone ? "Complete" : isCurrent ? "Processing..." : "Pending"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
