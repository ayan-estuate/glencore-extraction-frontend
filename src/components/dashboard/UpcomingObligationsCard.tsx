import React, { useMemo } from "react";
import { ArrowRight, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useAppStore } from "../../stores/useAppStore";

interface UpcomingObligationsCardProps {
  onViewAll?: () => void;
}

export function UpcomingObligationsCard({ onViewAll }: UpcomingObligationsCardProps) {
  const { documents, serverObligations } = useAppStore();

  const now = new Date();
  const nowTime = now.getTime();

  // Combine server obligations and document obligations without duplicates
  const pendingObligations = useMemo(() => {
    const list: {
      id: string;
      title: string;
      dueDate?: string;
      section?: string;
      documentId: string;
    }[] = [];
    const seen = new Set<string>();

    if (serverObligations && serverObligations.length > 0) {
      serverObligations.forEach((so) => {
        if (so.obligationStatus !== "COMPLETED") {
          const key = `${so.jobId || so.documentId}-${so.obligationId}`;
          seen.add(key);
          list.push({
            id: key,
            title: so.obligationTitle,
            dueDate: so.dueDate,
            section: so.section,
            documentId: so.documentId || "PERMIT",
          });
        }
      });
    }

    documents.forEach((doc) => {
      doc.obligations.forEach((ob) => {
        if (ob.obligationStatus !== "COMPLETED") {
          const key = `${doc.id}-${ob.obligationId}`;
          const keyJob = `${doc.jobId}-${ob.obligationId}`;
          if (!seen.has(key) && !seen.has(keyJob)) {
            seen.add(key);
            list.push({
              id: key,
              title: ob.obligationTitle,
              dueDate: ob.dueDate,
              section: ob.section,
              documentId: doc.documentId || "PERMIT",
            });
          }
        }
      });
    });

    return list;
  }, [documents, serverObligations]);

  // Gather pending obligations across all documents
  const items = pendingObligations
    .map((ob) => {
      let day = "—";
      let month = "DUE";
      let dueChip = ob.dueDate || "Ongoing";
      let urgency: "red" | "amber" | "emerald" = "amber";
      let sortScore = 999999;

      if (ob.dueDate && ob.dueDate.toLowerCase() !== "ongoing") {
        const parsed = new Date(ob.dueDate);
        if (!isNaN(parsed.getTime())) {
          day = String(parsed.getDate()).padStart(2, "0");
          month = parsed.toLocaleString("en-US", { month: "short" }).toUpperCase();
          const diffDays = Math.ceil((parsed.getTime() - nowTime) / (1000 * 60 * 60 * 24));
          sortScore = diffDays;

          if (diffDays < 0) {
            dueChip = `Overdue by ${Math.abs(diffDays)}d`;
            urgency = "red";
          } else if (diffDays === 0) {
            dueChip = "Due today";
            urgency = "red";
          } else if (diffDays <= 7) {
            dueChip = `Due in ${diffDays}d`;
            urgency = "red";
          } else if (diffDays <= 30) {
            dueChip = `Due in ${diffDays}d`;
            urgency = "amber";
          } else {
            dueChip = `Due in ${diffDays}d`;
            urgency = "emerald";
          }
        }
      }

      return {
        id: ob.id,
        day,
        month,
        title: ob.title,
        reference: `${ob.documentId} • ${ob.section ? `§ ${ob.section}` : "§ General"}`,
        dueChip,
        urgency,
        sortScore,
      };
    })
    .sort((a, b) => a.sortScore - b.sortScore)
    .slice(0, 4);

  return (
    <div className="h-full p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Upcoming Obligations
        </h3>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          View all
        </button>
      </div>

      {/* List Items or Empty State */}
      {items.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No pending obligations
          </p>
          <p className="text-[11px] text-slate-400 max-w-xs">
            All statutory obligations are either completed or no permits have been parsed yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={onViewAll}
              className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Date Box */}
                <div className="w-11 h-11 rounded-xl bg-slate-200/60 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 flex flex-col items-center justify-center text-center shrink-0">
                  <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-slate-100 leading-none">
                    {item.day}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide leading-none mt-1">
                    {item.month}
                  </span>
                </div>

                {/* Title & Section Reference */}
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block truncate mt-0.5">
                    {item.reference}
                  </span>
                </div>
              </div>

              {/* Urgency Chip */}
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono whitespace-nowrap shrink-0 ${
                  item.urgency === "red"
                    ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200/60 dark:border-red-900/50"
                    : item.urgency === "amber"
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/50"
                }`}
              >
                {item.dueChip}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
