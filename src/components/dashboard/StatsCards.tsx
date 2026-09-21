import React from "react";
import { FileText, ClipboardCheck, CheckCircle2, Clock, ShieldCheck, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useDocuments } from "../../hooks/useDocuments";

export function StatsCards() {
  const { stats, allDocuments } = useDocuments();
  const hasObligations = stats.totalObligations > 0;

  const cards = [
    {
      title: "Documents Processed",
      value: stats.totalDocs.toString(),
      subtext: `${stats.totalJobs} jobs in database`,
      isPositive: true,
      icon: FileText,
      iconColor: "text-red-500 bg-red-50 dark:bg-red-950/50 border-red-100 dark:border-red-900/50",
      strokeColor: "#f43f5e",
      sparkline: "M0 20 Q15 5, 30 15 T60 10 T90 5 T120 18 T150 2",
    },
    {
      title: "Obligations Extracted",
      value: stats.totalObligations.toLocaleString(),
      subtext: `${allDocuments.length} regulatory permits`,
      isPositive: true,
      icon: ClipboardCheck,
      iconColor: "text-purple-600 bg-purple-50 dark:bg-purple-950/50 border-purple-100 dark:border-purple-900/50",
      strokeColor: "#a855f7",
      sparkline: "M0 22 Q15 12, 30 18 T60 8 T90 14 T120 4 T150 12",
    },
    {
      title: "Open Obligations",
      value: stats.openObligations.toLocaleString(),
      subtext: `${stats.overdueObligations} past due date`,
      isPositive: stats.openObligations === 0,
      icon: CheckCircle2,
      iconColor: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/50",
      strokeColor: "#10b981",
      sparkline: "M0 5 Q15 18, 30 12 T60 22 T90 10 T120 15 T150 8",
    },
    {
      title: "In Progress",
      value: stats.inProgressObligations.toLocaleString(),
      subtext: `${stats.completedObligations} completed`,
      isPositive: true,
      icon: Clock,
      iconColor: "text-amber-500 bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-900/50",
      strokeColor: "#f59e0b",
      sparkline: "M0 18 Q15 8, 30 15 T60 5 T90 12 T120 2 T150 16",
    },
    {
      title: "Compliance Score",
      value: hasObligations ? `${stats.complianceScore}%` : "—",
      subtext: hasObligations ? "Based on active register" : "Awaiting extractions",
      isPositive: hasObligations && stats.complianceScore >= 80,
      icon: ShieldCheck,
      iconColor: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900/50",
      isProgressBar: true,
      progress: hasObligations ? stats.complianceScore : 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            {/* Header: Icon + Title */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {c.title}
              </span>
              <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${c.iconColor}`}>
                <Icon className="w-4.5 h-4.5 stroke-[2.2]" />
              </div>
            </div>

            {/* Metric Big Value */}
            <div className="text-2xl font-extrabold font-sans text-slate-900 dark:text-slate-100 tracking-tight">
              {c.value}
            </div>

            {/* Subtitle Change Indicator + Sparkline / Progress */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span>{c.subtext}</span>
              </div>

              {/* Sparkline Wave or Progress Bar */}
              {c.isProgressBar ? (
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
              ) : (
                <svg className="w-full h-6 overflow-visible" viewBox="0 0 150 25" fill="none">
                  <path
                    d={c.sparkline}
                    stroke={c.strokeColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
