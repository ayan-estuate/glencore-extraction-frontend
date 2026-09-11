import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { useDocuments } from "../../hooks/useDocuments";

export function ComplianceOverviewTrend() {
  const { stats, allDocuments } = useDocuments();

  const uniqueEntities = useMemo(() => {
    const set = new Set<string>();
    allDocuments.forEach((d) => {
      if (d.entity && d.entity.trim()) set.add(d.entity.trim());
    });
    return set.size || allDocuments.length;
  }, [allDocuments]);

  // Dynamically compute cumulative compliance score trend across documents chronologically
  const lineData = useMemo(() => {
    const sorted = [...allDocuments]
      .filter((d) => Boolean(d.extractedAt))
      .sort((a, b) => new Date(a.extractedAt).getTime() - new Date(b.extractedAt).getTime());

    if (sorted.length === 0) {
      return [];
    }

    const now = new Date();
    let runningTotal = 0;
    let runningOverdue = 0;

    const points: {
      date: string;
      score: number;
      docName: string;
      total: number;
      overdue: number;
      compliant: number;
    }[] = [];

    sorted.forEach((doc, idx) => {
      const docObligations = doc.obligations || [];
      const docTotal = docObligations.length;
      let docOverdue = 0;

      docObligations.forEach((ob) => {
        if (ob.obligationStatus !== "COMPLETED" && ob.dueDate && ob.dueDate.toLowerCase() !== "ongoing") {
          const due = new Date(ob.dueDate);
          if (!isNaN(due.getTime()) && due < now) {
            docOverdue++;
          }
        }
      });

      runningTotal += docTotal;
      runningOverdue += docOverdue;

      // Real compliance adherence rate: non-overdue / on-track obligations
      const score = runningTotal > 0
        ? Math.round(((runningTotal - runningOverdue) / runningTotal) * 100)
        : 100;

      const d = new Date(doc.extractedAt);
      const dateStr = !isNaN(d.getTime())
        ? `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : `Doc ${idx + 1}`;

      // Distinguish multiple documents on the same date with short document/permit identifier
      const permitTag = doc.documentId ? doc.documentId.split("/")[0] : `P${idx + 1}`;
      const dateLabel = sorted.length > 1 ? `${dateStr} (${permitTag})` : dateStr;

      points.push({
        date: dateLabel,
        score,
        docName: doc.documentTitle || doc.documentId || `Document ${idx + 1}`,
        total: runningTotal,
        overdue: runningOverdue,
        compliant: Math.max(0, runningTotal - runningOverdue),
      });
    });

    return points;
  }, [allDocuments]);

  const scoreFraction = Math.max(0, Math.min(1, stats.complianceScore / 100));

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          Compliance Overview & Score Trend
        </h3>
        <span className="text-[11px] font-mono text-slate-400">
          Telemetry synced with backend
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: 4 Metric Stats (3 cols) */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-4 border-r border-slate-100 dark:border-slate-800/80 pr-0 lg:pr-4">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block font-sans">Entities / Permits</span>
            <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100 block">
              {uniqueEntities}
            </span>
            <span className="text-[10px] text-slate-400 font-sans">Active licenses</span>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-400 block font-sans">Documents</span>
            <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100 block">
              {stats.totalDocs}
            </span>
            <span className="text-[10px] text-slate-400 font-sans">Total processed</span>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-400 block font-sans">Obligations</span>
            <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100 block">
              {stats.totalObligations}
            </span>
            <span className="text-[10px] text-slate-400 font-sans">Extracted clauses</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-red-500 block font-sans">Overdue</span>
            <span className="text-xl font-extrabold font-mono text-red-600 dark:text-red-400 block">
              {stats.overdueObligations}
            </span>
            <span className="text-[10px] text-red-500 font-sans font-medium">Require attention</span>
          </div>
        </div>

        {/* Middle: Compliance Score Trend Area Chart (6 cols) */}
        <div className="lg:col-span-6 h-44 w-full flex items-center justify-center">
          {lineData.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No trend history recorded</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Extract compliance documents to plot real-time score progression.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="complianceScoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  dy={4}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 backdrop-blur-xs border border-slate-700/80 p-3 rounded-xl shadow-2xl text-xs text-white space-y-1.5 min-w-[200px]">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-slate-200 truncate max-w-[160px]">{data.docName}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{data.date}</span>
                        </div>
                        <div className="flex items-baseline gap-2 pt-0.5">
                          <span className="text-xl font-black font-mono text-blue-400">{data.score}%</span>
                          <span className="text-[11px] font-medium text-slate-300">Compliance Rate</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                          <span>{data.compliant} / {data.total} compliant</span>
                          <span className={data.overdue > 0 ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
                            {data.overdue} overdue
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#complianceScoreGradient)"
                  dot={{ fill: "#2563eb", r: 4, strokeWidth: 2, stroke: "#ffffff" }}
                  activeDot={{ r: 6, stroke: "#2563eb", strokeWidth: 2, fill: "#ffffff" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right: Half-Gauge Score Donut (3 cols) */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center text-center pl-0 lg:pl-4 border-l-0 lg:border-l border-slate-100 dark:border-slate-800/80">
          <div className="relative w-44 h-24 flex items-center justify-center pt-2">
            <svg viewBox="0 0 120 65" className="w-full h-full overflow-visible">
              {/* Background Track Arc */}
              <path
                d="M 15 55 A 45 45 0 0 1 105 55"
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="10"
                strokeLinecap="round"
              />
              {/* Progress Arc */}
              <path
                d="M 15 55 A 45 45 0 0 1 105 55"
                fill="none"
                stroke="#2563eb"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="141.37"
                strokeDashoffset={141.37 * (1 - scoreFraction)}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            <div className="absolute bottom-0 flex flex-col items-center">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 leading-none">
                {stats.complianceScore}%
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Overall Score</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Real-time Compliance Metric</span>
          </div>
        </div>
      </div>
    </div>
  );
}
