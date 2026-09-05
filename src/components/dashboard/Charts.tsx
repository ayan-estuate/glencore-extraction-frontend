import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { StoredDocument } from "../../types/api";

export interface ChartsProps {
  documents: StoredDocument[];
}

export function Charts({ documents }: ChartsProps) {
  // 1. Calculate Status Breakdown
  let openCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;

  documents.forEach((d) => {
    d.obligations.forEach((o) => {
      if (o.obligationStatus === "OPEN") openCount++;
      else if (o.obligationStatus === "IN_PROGRESS") inProgressCount++;
      else if (o.obligationStatus === "COMPLETED") completedCount++;
    });
  });

  const pieData = [
    { name: "Open", value: openCount, color: "#10b981" }, // emerald-500
    { name: "In Progress", value: inProgressCount, color: "#f59e0b" }, // amber-500
    { name: "Completed", value: completedCount, color: "#64748b" }, // slate-500
  ];

  // 2. Calculate Due Date Horizon Breakdown
  let ongoing = 0;
  let Q3_2026 = 0;
  let Q4_2026 = 0;
  let Year_2027 = 0;

  documents.forEach((d) => {
    d.obligations.forEach((o) => {
      const dateStr = (o.dueDate || "").toLowerCase();
      if (dateStr === "ongoing") {
        ongoing++;
      } else if (dateStr.includes("2026-07") || dateStr.includes("2026-08") || dateStr.includes("2026-09")) {
        Q3_2026++;
      } else if (dateStr.includes("2026-10") || dateStr.includes("2026-11") || dateStr.includes("2026-12")) {
        Q4_2026++;
      } else {
        Year_2027++;
      }
    });
  });

  const barData = [
    { name: "Ongoing", count: ongoing },
    { name: "Q3 2026", count: Q3_2026 },
    { name: "Q4 2026", count: Q4_2026 },
    { name: "2027+", count: Year_2027 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Donut Chart: Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Obligations by Status</CardTitle>
          <CardDescription>Proportional breakdown of open, in-progress, and completed obligations.</CardDescription>
        </CardHeader>
        <CardContent className="h-64 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bar Chart: Due Date Horizon */}
      <Card>
        <CardHeader>
          <CardTitle>Obligations Timeline Horizon</CardTitle>
          <CardDescription>Distribution of obligation due dates across operational quarters.</CardDescription>
        </CardHeader>
        <CardContent className="h-64 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
