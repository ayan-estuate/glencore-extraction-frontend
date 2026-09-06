import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useDocuments } from "../../hooks/useDocuments";

export function ObligationsByStatusCard() {
  const { stats } = useDocuments();

  const total = stats.totalObligations;
  const openCount = stats.openObligations;
  const inProgressCount = stats.inProgressObligations;
  const completedCount = stats.completedObligations;

  const data = [
    {
      name: "Open",
      value: openCount,
      percentage: total > 0 ? `${((openCount / total) * 100).toFixed(1)}%` : "0%",
      color: "#3b82f6", // Blue
    },
    {
      name: "In Progress",
      value: inProgressCount,
      percentage: total > 0 ? `${((inProgressCount / total) * 100).toFixed(1)}%` : "0%",
      color: "#f59e0b", // Amber
    },
    {
      name: "Completed",
      value: completedCount,
      percentage: total > 0 ? `${((completedCount / total) * 100).toFixed(1)}%` : "0%",
      color: "#10b981", // Emerald
    },
  ];

  // If no obligations, provide placeholder slice so donut doesn't collapse
  const chartData = total > 0 ? data.filter((d) => d.value > 0) : [{ name: "No Data", value: 1, color: "#cbd5e1", percentage: "0%" }];

  return (
    <div className="h-full p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between gap-4">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Obligations by Status
        </h3>

        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {total} Total
        </span>
      </div>

      {/* Donut Chart + Legend Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 my-auto py-2">
        {/* Recharts Donut Chart with Center Text */}
        <div className="relative h-48 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={78}
                paddingAngle={total > 0 ? 3 : 0}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              {total > 0 && (
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>

          {/* Donut Center Overlay Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">Total</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
              {total}
            </span>
          </div>
        </div>

        {/* Legend Breakdown List */}
        <div className="space-y-3 font-sans text-xs">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
              </div>
              <div className="font-mono text-slate-900 dark:text-slate-100 font-bold">
                {item.value} <span className="text-slate-400 text-[11px] font-normal">({item.percentage})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
