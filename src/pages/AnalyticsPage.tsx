import React, { useState, useMemo, useEffect } from "react";
import {
  Home,
  ChevronRight,
  BarChart3,
  Calendar,
  FileText,
  ShieldCheck,
  TrendingUp,
  Clock,
  Info,
  Zap,
  Filter,
  Search,
  ArrowUpDown,
  Sparkles,
  MoreVertical,
  ChevronDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileSpreadsheet,
  Printer,
  Code,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useDocuments } from "../hooks/useDocuments";
import { useAppStore } from "../stores/useAppStore";
import {
  exportDocumentToPdf,
  exportDocumentToExcel,
  exportDocumentToDocx,
  exportDocumentToJson,
  exportBulkToExcel,
  exportBulkToJson,
} from "../lib/export";
import { apiExportJob } from "../lib/apiClient";
import { formatBytes } from "../lib/utils";

interface ProviderBenchmarkRow {
  id: string;
  provider: string;
  model: string;
  totalRuns: number;
  completed: number;
  failed: number;
  successRate: number;
  avgDurationSec: number | null;
  minDurationSec: number | null;
  maxDurationSec: number | null;
  totalPages: number;
  totalBytes: number;
  lastRunDate: string;
  lastRunTime: string;
}

export function AnalyticsPage() {
  const { allDocuments, jobs, fetchJobs, isLoadingJobs } = useDocuments();
  const { activeTenantId, fetchObligations } = useAppStore();

  const [timeRange, setTimeRange] = useState<"6_MONTHS" | "12_MONTHS" | "YTD">("6_MONTHS");
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>("ALL");
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [benchmarkSearch, setBenchmarkSearch] = useState("");
  const [activeBenchmarkMenu, setActiveBenchmarkMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
    fetchObligations();
  }, [fetchJobs, fetchObligations]);

  useEffect(() => {
    const handleGlobalClick = () => setActiveBenchmarkMenu(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const selectedDoc = allDocuments.find((d) => d.id === selectedDocId) || allDocuments[0];

  const handleExport = async (type: "pdf" | "excel" | "docx" | "json") => {
    if (allDocuments.length === 0) return;
    try {
      if (selectedDocId === "ALL" && (type === "excel" || type === "json")) {
        if (type === "excel") exportBulkToExcel(allDocuments);
        else exportBulkToJson(allDocuments);
        setDownloadSuccess(`Exported ${allDocuments.length} documents as bulk ${type.toUpperCase()}`);
      } else if (selectedDoc) {
        if (selectedDoc.jobId && type !== "json") {
          try {
            const backendFormat = type === "excel" ? "XLSX" : type.toUpperCase();
            await apiExportJob(selectedDoc.jobId, backendFormat);
            setDownloadSuccess(`Downloaded ${selectedDoc.documentId} as .${type.toUpperCase()} from server`);
            setTimeout(() => setDownloadSuccess(null), 4000);
            return;
          } catch (e) {
            console.warn("Backend direct export failed, falling back to client:", e);
          }
        }

        if (type === "pdf") exportDocumentToPdf(selectedDoc);
        else if (type === "excel") exportDocumentToExcel(selectedDoc);
        else if (type === "docx") exportDocumentToDocx(selectedDoc);
        else if (type === "json") exportDocumentToJson(selectedDoc);

        setDownloadSuccess(`Exported ${selectedDoc.documentId} as .${type.toUpperCase()}`);
      }
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (e) {
      console.error("Export error:", e);
    }
  };

  // Real KPI: Total Documents Count
  const totalDocumentsCount = allDocuments.length;

  // Real KPI: Total Obligations Count across all documents
  const totalObligationsCount = useMemo(() => {
    return allDocuments.reduce((sum, doc) => sum + (doc.obligations?.length || 0), 0);
  }, [allDocuments]);

  // Real KPI: Success Rate from actual jobs
  const overallSuccessRate = useMemo(() => {
    if (jobs.length === 0) return 0;
    const completed = jobs.filter((j) => j.status === "COMPLETED" || j.status === "SUCCESS").length;
    return Math.round((completed / jobs.length) * 100);
  }, [jobs]);

  // Real KPI: Average Pipeline Latency from completed jobs
  const overallAvgLatency = useMemo(() => {
    const validDurations: number[] = [];
    jobs.forEach((j) => {
      if (j.completedAt && j.createdAt) {
        const ms = new Date(j.completedAt).getTime() - new Date(j.createdAt).getTime();
        if (ms > 0 && ms < 3600000) validDurations.push(ms / 1000);
      }
    });
    if (validDurations.length === 0) return 0;
    return Number((validDurations.reduce((a, b) => a + b, 0) / validDurations.length).toFixed(1));
  }, [jobs]);

  // Real Monthly Extraction Volume: Dynamically computed from documents & jobs creation dates
  const monthlyData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const months: { month: string; year: number; monthIdx: number; count: number }[] = [];

    const numMonths = timeRange === "12_MONTHS" ? 12 : timeRange === "YTD" ? now.getMonth() + 1 : 6;

    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: monthNames[d.getMonth()],
        year: d.getFullYear(),
        monthIdx: d.getMonth(),
        count: 0,
      });
    }

    allDocuments.forEach((doc) => {
      if (doc.extractedAt) {
        const d = new Date(doc.extractedAt);
        if (!isNaN(d.getTime())) {
          const m = months.find((entry) => entry.monthIdx === d.getMonth() && entry.year === d.getFullYear());
          if (m) m.count++;
        }
      }
    });

    jobs.forEach((job) => {
      const alreadyCounted = allDocuments.some((d) => d.jobId === job.jobId || d.id === job.jobId);
      if (!alreadyCounted && job.createdAt) {
        const d = new Date(job.createdAt);
        if (!isNaN(d.getTime())) {
          const m = months.find((entry) => entry.monthIdx === d.getMonth() && entry.year === d.getFullYear());
          if (m) m.count++;
        }
      }
    });

    return months.map(({ month, count }) => ({ month, count }));
  }, [allDocuments, jobs, timeRange]);

  const maxMonthlyCount = useMemo(() => {
    const maxVal = Math.max(0, ...monthlyData.map((d) => d.count));
    return maxVal < 5 ? 5 : Math.ceil(maxVal * 1.2);
  }, [monthlyData]);

  // Real Obligations Distribution by Status
  const obligationsDistribution = useMemo(() => {
    let openCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;

    allDocuments.forEach((doc) => {
      doc.obligations?.forEach((ob) => {
        if (ob.obligationStatus === "COMPLETED") completedCount++;
        else if (ob.obligationStatus === "IN_PROGRESS") inProgressCount++;
        else openCount++;
      });
    });

    const total = openCount + inProgressCount + completedCount;

    return {
      total,
      openCount,
      inProgressCount,
      completedCount,
      openPercent: total > 0 ? Math.round((openCount / total) * 100) : 0,
      inProgressPercent: total > 0 ? Math.round((inProgressCount / total) * 100) : 0,
      completedPercent: total > 0 ? Math.round((completedCount / total) * 100) : 0,
      chartData:
        total > 0
          ? [
              { name: "Open", value: openCount, color: "#2563EB" },
              { name: "In Progress", value: inProgressCount, color: "#F59E0B" },
              { name: "Done", value: completedCount, color: "#10B981" },
            ].filter((d) => d.value > 0)
          : [{ name: "No Obligations", value: 1, color: "#E2E8F0" }],
    };
  }, [allDocuments]);

  // Real Provider Benchmark Rows computed dynamically from jobs & documents
  const benchmarkRows: ProviderBenchmarkRow[] = useMemo(() => {
    const map = new Map<
      string,
      {
        provider: string;
        model: string;
        total: number;
        completed: number;
        failed: number;
        durations: number[];
        pages: number;
        bytes: number;
        lastRunIso: string | null;
      }
    >();

    jobs.forEach((job) => {
      const provider = (job.requestedProvider || "GEMINI").toUpperCase();
      const model = job.requestedModel || "default";
      const key = `${provider}::${model}`;

      if (!map.has(key)) {
        map.set(key, {
          provider,
          model,
          total: 0,
          completed: 0,
          failed: 0,
          durations: [],
          pages: 0,
          bytes: 0,
          lastRunIso: null,
        });
      }

      const item = map.get(key)!;
      item.total += 1;

      if (job.status === "COMPLETED" || job.status === "SUCCESS") {
        item.completed += 1;
      } else if (job.status === "FAILED" || job.status === "DEAD_LETTER") {
        item.failed += 1;
      }

      if (job.pageCount) item.pages += job.pageCount;
      if (job.sizeBytes) item.bytes += job.sizeBytes;

      if (job.completedAt && job.createdAt) {
        const diffMs = new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime();
        if (diffMs > 0 && diffMs < 3600000) {
          item.durations.push(diffMs / 1000);
        }
      }

      if (job.createdAt) {
        if (!item.lastRunIso || new Date(job.createdAt) > new Date(item.lastRunIso)) {
          item.lastRunIso = job.createdAt;
        }
      }
    });

    allDocuments.forEach((doc) => {
      const existsInJobs = jobs.some((j) => j.jobId === doc.jobId || j.jobId === doc.id);
      if (!existsInJobs) {
        const provider = (doc.llmProvider || "GEMINI").toUpperCase();
        const model = doc.llmModel || "default";
        const key = `${provider}::${model}`;

        if (!map.has(key)) {
          map.set(key, {
            provider,
            model,
            total: 0,
            completed: 0,
            failed: 0,
            durations: [],
            pages: 0,
            bytes: 0,
            lastRunIso: null,
          });
        }

        const item = map.get(key)!;
        item.total += 1;
        item.completed += 1;
        if (doc.fileSize) item.bytes += doc.fileSize;
        if (doc.rawResponse?.processingTime) {
          item.durations.push(doc.rawResponse.processingTime / 1000);
        }
        if (doc.extractedAt) {
          if (!item.lastRunIso || new Date(doc.extractedAt) > new Date(item.lastRunIso)) {
            item.lastRunIso = doc.extractedAt;
          }
        }
      }
    });

    return Array.from(map.entries()).map(([key, data]) => {
      const avgDuration =
        data.durations.length > 0
          ? Number((data.durations.reduce((a, b) => a + b, 0) / data.durations.length).toFixed(2))
          : null;
      const minDuration = data.durations.length > 0 ? Number(Math.min(...data.durations).toFixed(2)) : null;
      const maxDuration = data.durations.length > 0 ? Number(Math.max(...data.durations).toFixed(2)) : null;
      const successRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

      let lastRunDate = "—";
      let lastRunTime = "";
      if (data.lastRunIso) {
        const d = new Date(data.lastRunIso);
        if (!isNaN(d.getTime())) {
          const day = String(d.getDate()).padStart(2, "0");
          const month = d.toLocaleDateString("en-US", { month: "short" });
          const year = d.getFullYear();
          lastRunDate = `${day} ${month} ${year}`;
          lastRunTime = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        }
      }

      return {
        id: key,
        provider: data.provider,
        model: data.model,
        totalRuns: data.total,
        completed: data.completed,
        failed: data.failed,
        successRate,
        avgDurationSec: avgDuration,
        minDurationSec: minDuration,
        maxDurationSec: maxDuration,
        totalPages: data.pages,
        totalBytes: data.bytes,
        lastRunDate,
        lastRunTime,
      };
    });
  }, [jobs, allDocuments]);

  const filteredBenchmarks = useMemo(() => {
    return benchmarkRows.filter((r) => {
      if (!benchmarkSearch.trim()) return true;
      const q = benchmarkSearch.toLowerCase();
      return r.provider.toLowerCase().includes(q) || r.model.toLowerCase().includes(q);
    });
  }, [benchmarkRows, benchmarkSearch]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
        <span className="font-medium text-slate-700 dark:text-slate-300">Analytics & Reports</span>
      </div>

      {/* Main Header with Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/70 dark:border-blue-800/70 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs shrink-0">
            <BarChart3 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Compliance Analytics & Intelligence
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Audit AI model throughput, pipeline latency, and generate statutory compliance reporting packages.
            </p>
          </div>
        </div>

        {/* Header Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe selector */}
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="pl-3.5 pr-8 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 appearance-none cursor-pointer focus:outline-none shadow-2xs"
            >
              <option value="6_MONTHS">Last 6 Months</option>
              <option value="12_MONTHS">Last 12 Months</option>
              <option value="YTD">Year to Date</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Reports & Exports Button */}
          <button
            onClick={() => setIsReportsModalOpen(true)}
            className="px-4 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Reports & Exports</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Documents in Library */}
        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-4.5 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 shadow-2xs border border-blue-100/80 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                Documents in Library
              </span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-sans leading-tight block mt-0.5">
                {totalDocumentsCount}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Tenant: <strong className="text-slate-700 dark:text-slate-300">{activeTenantId}</strong></span>
            </div>
            <svg className="w-16 h-7 overflow-visible" viewBox="0 0 64 28">
              <path
                d="M0 24 Q 16 22, 28 14 T 64 4"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Obligations Parsed */}
        <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4.5 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 shadow-2xs border border-emerald-100/80 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                Obligations Parsed
              </span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-sans leading-tight block mt-0.5">
                {totalObligationsCount}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>{obligationsDistribution.openCount} open • {obligationsDistribution.completedCount} done</span>
            </div>
            <svg className="w-16 h-7 overflow-visible" viewBox="0 0 64 28">
              <path
                d="M0 22 L 14 18 L 26 22 L 40 10 L 52 14 L 64 4"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Job Success Rate */}
        <div className="bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-2xl p-4.5 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 shadow-2xs border border-purple-100/80 dark:border-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-end gap-1">
                Job Success Rate
              </span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-sans leading-tight flex items-center justify-end gap-1 mt-0.5">
                {overallSuccessRate}%
                <Info className="w-3.5 h-3.5 text-slate-400 stroke-[2.2]" />
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>{jobs.filter((j) => j.status === "COMPLETED" || j.status === "SUCCESS").length} of {jobs.length} jobs completed</span>
            </div>
            <svg className="w-16 h-7 overflow-visible" viewBox="0 0 64 28">
              <path
                d="M0 18 L 12 24 L 24 14 L 38 20 L 50 8 L 64 12"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 4: Average Pipeline Latency */}
        <div className="bg-amber-50/30 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-4.5 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 shadow-2xs border border-amber-100/80 dark:border-amber-900/60 flex items-center justify-center text-amber-500 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                Average Pipeline Latency
              </span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-sans leading-tight block mt-0.5">
                {overallAvgLatency > 0 ? `${overallAvgLatency}s` : "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>{jobs.length} measured jobs</span>
            </div>
            <svg className="w-16 h-7 overflow-visible" viewBox="0 0 64 28">
              <path
                d="M0 16 L 14 22 L 28 18 L 42 24 L 54 8 L 64 14"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Middle Analytical Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Chart: Monthly Document Extraction Volume (~60% = col-span-7) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Monthly Document Extraction Volume
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Total documents processed through the AI extraction pipeline.
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 self-start sm:self-auto">
              {timeRange === "6_MONTHS" ? "Past 6 Months" : timeRange === "12_MONTHS" ? "Past 12 Months" : "Year to Date"}
            </span>
          </div>

          {/* Bar Chart Area */}
          <div className="h-64 w-full relative pt-2">
            <div className="text-[10px] font-semibold text-slate-400 -rotate-90 origin-center select-none absolute -left-5 top-1/2 -translate-y-1/2">
              Documents
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }}
                />
                <YAxis
                  domain={[0, maxMonthlyCount]}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9", opacity: 0.5 }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                    fontSize: "12px",
                    fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  barSize={40}
                  label={{ position: "top", fill: "#1E293B", fontSize: 11, fontWeight: 700 }}
                >
                  {monthlyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === monthlyData.length - 1 ? "#2563EB" : "#93C5FD"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Donut: Obligations Register Distribution (~40% = col-span-5) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Obligations Register Distribution
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Breakdown of obligations by status.
                </p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800 shrink-0">
              {obligationsDistribution.total} Total
            </span>
          </div>

          {/* Donut & Legend Container */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 my-auto">
            {/* Donut SVG Ring */}
            <div className="relative w-44 h-44 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={obligationsDistribution.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={78}
                    strokeWidth={0}
                    dataKey="value"
                  >
                    {obligationsDistribution.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] text-slate-400 font-medium">Total</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-sans tracking-tight">
                  {obligationsDistribution.total}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Obligations</span>
              </div>
            </div>

            {/* Legend List */}
            <div className="space-y-3.5 flex-1 w-full pl-0 sm:pl-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Open</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {obligationsDistribution.openCount}
                  </span>
                  <span className="text-[11px] text-slate-400 w-10 text-right">{obligationsDistribution.openPercent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">In Progress</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {obligationsDistribution.inProgressCount}
                  </span>
                  <span className="text-[11px] text-slate-400 w-10 text-right">{obligationsDistribution.inProgressPercent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Done</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {obligationsDistribution.completedCount}
                  </span>
                  <span className="text-[11px] text-slate-400 w-10 text-right">{obligationsDistribution.completedPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Benchmarks Table Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Real AI Engine Execution & Throughput Benchmarks
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Performance metrics across configured AI models.
              </p>
            </div>
          </div>

          <button
            onClick={() => setBenchmarkSearch("")}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
        </div>

        {/* Filter input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={benchmarkSearch}
            onChange={(e) => setBenchmarkSearch(e.target.value)}
            placeholder="Filter benchmarks..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        {/* Benchmarks Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none font-mono">
                <th className="py-3 px-3">
                  <span className="flex items-center gap-1">
                    AI ENGINE <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
                <th className="py-3 px-3 text-center">
                  <span className="flex items-center justify-center gap-1">
                    EXECUTIONS <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
                <th className="py-3 px-3 text-center">
                  <span className="flex items-center justify-center gap-1">
                    SUCCESS RATE <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
                <th className="py-3 px-3 text-center">
                  <span className="flex items-center justify-center gap-1">
                    AVG LATENCY <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
                <th className="py-3 px-3 text-center">
                  <span className="flex items-center justify-center gap-1">
                    MIN / MAX <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
                <th className="py-3 px-3 text-right">PAGES / SIZE</th>
                <th className="py-3 px-3 text-right">LAST RUN</th>
                <th className="py-3 pr-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-mono">
              {filteredBenchmarks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                    No AI engine benchmarks recorded yet. Submit extraction jobs to track telemetry.
                  </td>
                </tr>
              ) : (
                filteredBenchmarks.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                            {row.provider}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {row.model}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {row.totalRuns}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          row.successRate >= 90
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800"
                            : row.successRate >= 60
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800"
                            : "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60"
                        }`}
                      >
                        {row.successRate}%
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                      {row.avgDurationSec !== null ? `${row.avgDurationSec}s` : "—"}
                    </td>

                    <td className="py-3.5 px-3 text-center text-[11px] text-slate-500">
                      {row.minDurationSec !== null && row.maxDurationSec !== null
                        ? `${row.minDurationSec}s - ${row.maxDurationSec}s`
                        : "—"}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        {row.totalPages ? `${row.totalPages}p` : "—"}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        {row.totalBytes > 0 ? formatBytes(row.totalBytes) : "—"}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <span className="font-medium text-slate-800 dark:text-slate-200 block">
                        {row.lastRunDate}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        {row.lastRunTime}
                      </span>
                    </td>

                    <td className="py-3 pr-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() =>
                          setActiveBenchmarkMenu(activeBenchmarkMenu === row.id ? null : row.id)
                        }
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeBenchmarkMenu === row.id && (
                        <div className="absolute right-3 top-10 z-30 w-44 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-left text-xs">
                          <button
                            onClick={() => {
                              setActiveBenchmarkMenu(null);
                              setIsReportsModalOpen(true);
                            }}
                            className="w-full px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer font-sans"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span>Generate Report</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 pt-2">
          <div>
            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredBenchmarks.length > 0 ? 1 : 0}</span> to{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {filteredBenchmarks.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {filteredBenchmarks.length}
            </span>{" "}
            entries
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <div className="relative">
                <select className="pl-2.5 pr-7 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none appearance-none cursor-pointer">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 disabled:opacity-40 cursor-default">
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 disabled:opacity-40 cursor-default">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                1
              </button>
              <button className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 disabled:opacity-40 cursor-default">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 disabled:opacity-40 cursor-default">
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reports & Exports Modal */}
      {isReportsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Statutory Compliance Reporting Packages
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Generate multi-format compliance packages for audits and regulators.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReportsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Document Target Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Scope:
                </label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">📦 Bulk All Documents ({allDocuments.length} records)</option>
                  {allDocuments.map((d) => (
                    <option key={d.id} value={d.id}>
                      📄 {d.documentId} — {d.documentTitle || d.entity}
                    </option>
                  ))}
                </select>
              </div>

              {downloadSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{downloadSuccess}</span>
                </div>
              )}

              {/* 4 Export Buttons Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => handleExport("pdf")}
                  className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 text-left cursor-pointer transition-colors space-y-1"
                >
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                    <Printer className="w-4 h-4" />
                    <span>Executive PDF Report</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Formatted submission package.</p>
                </button>

                <button
                  onClick={() => handleExport("excel")}
                  className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 text-left cursor-pointer transition-colors space-y-1"
                >
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>XLSX Spreadsheet</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Multi-tab clause workbook.</p>
                </button>

                <button
                  onClick={() => handleExport("docx")}
                  className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/60 text-left cursor-pointer transition-colors space-y-1"
                >
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-xs">
                    <FileText className="w-4 h-4" />
                    <span>Word (.DOCX) Memo</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Editable committee notes.</p>
                </button>

                <button
                  onClick={() => handleExport("json")}
                  className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/60 text-left cursor-pointer transition-colors space-y-1"
                >
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-xs">
                    <Code className="w-4 h-4" />
                    <span>Structured JSON</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Raw ERP schema payload.</p>
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end">
              <button
                onClick={() => setIsReportsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
