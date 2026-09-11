import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDocuments } from "../hooks/useDocuments";
import { useAppStore } from "../stores/useAppStore";
import { StoredDocument, JobSummary, JobStatus } from "../types/api";
import {
  Home,
  ChevronRight,
  Folder,
  FileText,
  Layers,
  RefreshCw,
  Plus,
  Search,
  ChevronDown,
  Filter,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  MoreVertical,
  Download,
  Eye,
  Trash2,
  Terminal,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
} from "lucide-react";
import { useSnackbar } from "../hooks/useSnackbar";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { JobDetailsModal } from "../components/common/JobDetailsModal";
import { formatDate, formatBytes } from "../lib/utils";
import { apiExportJob } from "../lib/apiClient";
import { useNavigate } from "react-router-dom";
import { FilterPopover, FilterSelectField } from "../components/common/FilterPopover";

export interface LibraryPageProps {
  onSelectDocument?: (doc: StoredDocument) => void;
  onNavigateToUpload?: () => void;
}

type LibraryViewMode = "documents" | "ledger";

function formatDocumentDateTime(dateString?: string): { date: string; time: string } {
  if (!dateString) return { date: "—", time: "" };
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return { date: dateString, time: "" };
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const year = d.getFullYear();
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return { date: `${day} ${month} ${year}`, time };
  } catch {
    return { date: dateString, time: "" };
  }
}

function getJobStatusBadge(status: JobStatus | string) {
  const s = (status || "COMPLETED").toUpperCase();
  if (s === "COMPLETED" || s === "SUCCESS") {
    return {
      label: "Processed",
      icon: CheckCircle2,
      className:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800",
    };
  }
  if (s === "PARTIAL") {
    return {
      label: "Partial",
      icon: AlertTriangle,
      className:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800",
    };
  }
  if (s === "RUNNING" || s === "PROCESSING") {
    return {
      label: "Running",
      icon: Loader2,
      className:
        "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 animate-pulse",
    };
  }
  if (s === "QUEUED" || s === "PENDING") {
    return {
      label: "Queued",
      icon: Clock,
      className:
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700",
    };
  }
  return {
    label: s === "DEAD_LETTER" ? "Dead Letter" : "Failed",
    icon: XCircle,
    className:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800",
  };
}

export function LibraryPage({ onSelectDocument, onNavigateToUpload }: LibraryPageProps) {
  const navigate = useNavigate();
  const { allDocuments, isLoadingJobs, fetchJobs, removeDocument } = useDocuments();
  const { jobs, loadJobResult } = useAppStore();
  const { success, error: errorSnackbar } = useSnackbar();

  const [viewMode, setViewMode] = useState<LibraryViewMode>("documents");
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Filter Popover State
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (entityFilter !== "ALL") count++;
    if (typeFilter !== "ALL") count++;
    if (statusFilter !== "ALL") count++;
    return count;
  }, [entityFilter, typeFilter, statusFilter]);

  const handleResetFilters = () => {
    setEntityFilter("ALL");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Menu Popovers
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<StoredDocument | null>(null);
  const [inspectedJob, setInspectedJob] = useState<JobSummary | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<string>("extractedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Click outside to close row menu
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveRowMenu(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const handleSelectDoc = (doc: StoredDocument) => {
    if (onSelectDocument) onSelectDocument(doc);
    navigate(`/library/${doc.id || doc.jobId}`);
  };

  const handleUploadRedirect = () => {
    if (onNavigateToUpload) onNavigateToUpload();
    navigate("/upload");
  };

  const confirmDelete = () => {
    if (!docToDelete) return;
    removeDocument(docToDelete.id, docToDelete.jobId);
    success(
      `Deleted ${docToDelete.documentTitle || docToDelete.documentId}`,
      "Document Deleted"
    );
    setDocToDelete(null);
  };

  const handleExportDoc = async (doc: StoredDocument, format: "DOCX" | "XLSX" | "PDF") => {
    const jobId = doc.jobId || doc.id;
    setExportingId(jobId);
    try {
      await apiExportJob(jobId, format, `${doc.documentId || "document"}.${format.toLowerCase()}`);
      success(`Exported ${doc.documentId || "document"} as ${format}`, "Export Successful");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      errorSnackbar(msg, "Export Failed");
    } finally {
      setExportingId(null);
    }
  };

  const handleExportJob = async (job: JobSummary, format: "DOCX" | "XLSX" | "PDF") => {
    setExportingId(job.jobId);
    try {
      await apiExportJob(job.jobId, format, `${job.originalFilename || "document"}.${format.toLowerCase()}`);
      success(`Exported job as ${format}`, "Export Successful");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      errorSnackbar(msg, "Export Failed");
    } finally {
      setExportingId(null);
    }
  };

  const handleOpenJobResult = async (job: JobSummary) => {
    try {
      const loaded = await loadJobResult(job.jobId);
      if (loaded) {
        navigate(`/library/${job.jobId}`);
        return;
      }
    } catch {}
    navigate(`/library/${job.jobId}`);
  };

  // Unique entities for filter dropdown
  const entityOptions = useMemo(() => {
    const set = new Set<string>();
    allDocuments.forEach((d) => {
      if (d.entity && d.entity.trim()) set.add(d.entity.trim());
    });
    return Array.from(set);
  }, [allDocuments]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter((doc) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          doc.documentId?.toLowerCase().includes(q) ||
          doc.documentTitle?.toLowerCase().includes(q) ||
          doc.entity?.toLowerCase().includes(q) ||
          doc.documentDescription?.toLowerCase().includes(q) ||
          doc.fileName?.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (entityFilter !== "ALL" && doc.entity !== entityFilter) {
        return false;
      }

      if (statusFilter !== "ALL") {
        const s = (doc.status || "COMPLETED").toUpperCase();
        if (statusFilter === "COMPLETED" && s !== "COMPLETED" && s !== "SUCCESS") return false;
        if (statusFilter !== "COMPLETED" && s !== statusFilter) return false;
      }

      return true;
    });
  }, [allDocuments, searchQuery, entityFilter, statusFilter]);

  // Sorted documents
  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((a, b) => {
      let valA: any = a[sortField as keyof StoredDocument] || "";
      let valB: any = b[sortField as keyof StoredDocument] || "";

      if (sortField === "obligations") {
        valA = a.obligations?.length || 0;
        valB = b.obligations?.length || 0;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredDocuments, sortField, sortDirection]);

  // Paginated documents
  const totalPages = Math.max(1, Math.ceil(sortedDocuments.length / pageSize));
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDocuments.slice(start, start + pageSize);
  }, [sortedDocuments, currentPage, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedDocs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedDocs.map((d) => d.id));
    }
  };

  // Filtered jobs for Ledger view
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          j.jobId.toLowerCase().includes(q) ||
          j.originalFilename?.toLowerCase().includes(q) ||
          j.requestedProvider?.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (statusFilter !== "ALL") {
        const s = (j.status || "COMPLETED").toUpperCase();
        if (statusFilter === "COMPLETED" && s !== "COMPLETED" && s !== "SUCCESS") return false;
        if (statusFilter !== "COMPLETED" && s !== statusFilter) return false;
      }

      return true;
    });
  }, [jobs, searchQuery, statusFilter]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
        <span className="font-medium text-slate-700 dark:text-slate-300">Document Library</span>
      </div>

      {/* Main Header with 2 Metric Stat Cards */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/70 dark:border-blue-800/70 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs shrink-0">
            <Folder className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Document Library & Job Ledger
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Browse extracted statutory compliance records or inspect asynchronous backend worker jobs and telemetry.
            </p>
          </div>
        </div>

        {/* Right Side Metric Cards */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Card 1: Parsed Documents */}
          <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-2xl p-3.5 flex items-center gap-3.5 min-w-[210px] shadow-2xs">
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 shadow-2xs border border-blue-100/60 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Parsed Documents
              </span>
              <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 leading-tight block">
                {allDocuments.length}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Total processed files
              </span>
            </div>
          </div>

          {/* Card 2: Job Ledger */}
          <div className="bg-purple-50/50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 rounded-2xl p-3.5 flex items-center gap-3.5 min-w-[210px] shadow-2xs">
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 shadow-2xs border border-purple-100/60 dark:border-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Job Ledger
              </span>
              <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400 leading-tight block">
                {jobs.length}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Background jobs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Nav View Switcher Pill & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Toggle Pill */}
        <div className="p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 inline-flex items-center gap-1 shadow-2xs">
          <button
            onClick={() => setViewMode("documents")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === "documents"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs border border-slate-200/40 dark:border-slate-700/40"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Parsed Documents ({allDocuments.length})</span>
          </button>

          <button
            onClick={() => setViewMode("ledger")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === "ledger"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs border border-slate-200/40 dark:border-slate-700/40"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Job Ledger ({jobs.length})</span>
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchJobs(true)}
            disabled={isLoadingJobs}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            title="Refresh jobs and documents from backend"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingJobs ? "animate-spin text-blue-600" : "text-slate-500"}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={handleUploadRedirect}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Document</span>
          </button>
        </div>
      </div>

      {/* Search & Action Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input (kept outside for fast lookup) */}
        <div className="flex-1 min-w-[280px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search documents by ID, title, entity, description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        {/* Right Action Controls: Clear filters, Filter button */}
        <div className="flex items-center gap-2.5">
          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer mr-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear filters</span>
            </button>
          )}

          {/* Filter Popover Trigger Button */}
          <button
            ref={filterButtonRef}
            onClick={() => setIsFilterPopoverOpen((prev) => !prev)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-2xs ${
              activeFiltersCount > 0
                ? "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-blue-500" />
            <span>Filter</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-mono text-[10px] font-bold leading-none">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Popover Anchored to Filter Button at Right */}
      <FilterPopover
        isOpen={isFilterPopoverOpen}
        onClose={() => setIsFilterPopoverOpen(false)}
        triggerRef={filterButtonRef}
        title="Filter Documents"
        activeCount={activeFiltersCount}
        onReset={handleResetFilters}
      >
        <FilterSelectField
          label="Regulated Entity"
          value={entityFilter}
          onChange={(val) => {
            setEntityFilter(val);
            setCurrentPage(1);
          }}
          options={[
            { value: "ALL", label: "All Entities" },
            ...entityOptions.map((e) => ({ value: e, label: e })),
          ]}
          icon={Building2}
        />

        <FilterSelectField
          label="Document Type"
          value={typeFilter}
          onChange={(val) => {
            setTypeFilter(val);
            setCurrentPage(1);
          }}
          options={[
            { value: "ALL", label: "All Types" },
            { value: "ENVIRONMENTAL_AUTHORITY", label: "Mining Activities (EA)" },
            { value: "CONSOLIDATED_PERMIT", label: "Consolidated Permit" },
            { value: "VARIATION_NOTICE", label: "Variation Notice" },
          ]}
          icon={FileText}
        />

        <FilterSelectField
          label="Processing Status"
          value={statusFilter}
          onChange={(val) => {
            setStatusFilter(val);
            setCurrentPage(1);
          }}
          options={[
            { value: "ALL", label: "All Status" },
            { value: "COMPLETED", label: "Processed" },
            { value: "PARTIAL", label: "Partial" },
            { value: "RUNNING", label: "Running" },
            { value: "QUEUED", label: "Queued" },
            { value: "FAILED", label: "Failed" },
          ]}
          icon={CheckCircle2}
        />
      </FilterPopover>

      {/* Main View: Mode 1 (Parsed Documents) */}
      {viewMode === "documents" ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  <th className="py-3.5 pl-4 pr-2 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={paginatedDocs.length > 0 && selectedIds.length === paginatedDocs.length}
                      onChange={toggleSelectAll}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th
                    className="py-3.5 px-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200"
                    onClick={() => handleSort("documentId")}
                  >
                    <span className="flex items-center gap-1">
                      DOCUMENT / PERMIT ID <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </span>
                  </th>
                  <th
                    className="py-3.5 px-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200"
                    onClick={() => handleSort("documentTitle")}
                  >
                    <span className="flex items-center gap-1">
                      TITLE & REGULATORY SCOPE <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </span>
                  </th>
                  <th
                    className="py-3.5 px-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200"
                    onClick={() => handleSort("entity")}
                  >
                    <span className="flex items-center gap-1">
                      REGULATED ENTITY <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </span>
                  </th>
                  <th
                    className="py-3.5 px-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200"
                    onClick={() => handleSort("obligations")}
                  >
                    <span className="flex items-center gap-1">
                      OBLIGATIONS <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </span>
                  </th>
                  <th
                    className="py-3.5 px-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200"
                    onClick={() => handleSort("extractedAt")}
                  >
                    <span className="flex items-center gap-1">
                      ADDED ON <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </span>
                  </th>
                  <th
                    className="py-3.5 px-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200"
                    onClick={() => handleSort("status")}
                  >
                    <span className="flex items-center gap-1">
                      STATUS <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </span>
                  </th>
                  <th className="py-3.5 pr-4 pl-2 w-12 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
                {paginatedDocs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No compliance documents match the specified search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedDocs.map((doc, idx) => {
                    const isSelected = selectedIds.includes(doc.id);
                    const { date, time } = formatDocumentDateTime(doc.extractedAt);
                    const iconThemes = [
                      { bg: "bg-blue-50 dark:bg-blue-950/60 border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400" },
                      { bg: "bg-purple-50 dark:bg-purple-950/60 border-purple-100 dark:border-purple-900/60 text-purple-600 dark:text-purple-400" },
                      { bg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400" },
                    ];
                    const iconTheme = iconThemes[idx % iconThemes.length];
                    const totalClauses = doc.obligations?.length || 0;
                    const completedClauses = doc.obligations?.filter((o) => o.obligationStatus === "COMPLETED").length || 0;
                    const openClauses = doc.obligations?.filter((o) => o.obligationStatus === "OPEN").length || 0;

                    return (
                      <tr
                        key={doc.id}
                        className={`group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-4 pl-4 pr-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(doc.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Document / Permit ID */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconTheme.bg}`}>
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <button
                                onClick={() => handleSelectDoc(doc)}
                                className="font-bold text-blue-600 dark:text-blue-400 hover:underline block text-left cursor-pointer"
                              >
                                {doc.documentId || `DOC-${doc.id.slice(0, 8)}`}
                              </button>
                              <span className="text-[11px] font-mono text-slate-400 block truncate max-w-[150px] uppercase">
                                {doc.entity || "—"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Title & Regulatory Scope */}
                        <td className="py-4 px-3 max-w-sm">
                          <div
                            onClick={() => handleSelectDoc(doc)}
                            className="cursor-pointer group-hover:text-blue-600 transition-colors"
                          >
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                              {doc.documentTitle || doc.fileName || "Compliance Document"}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {doc.documentDescription || doc.fileName || "—"}
                            </p>
                          </div>
                        </td>

                        {/* Regulated Entity */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="font-mono text-xs font-semibold truncate max-w-[180px]">
                              {doc.entity || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Obligations */}
                        <td className="py-4 px-3">
                          <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800">
                              {totalClauses} clauses
                            </span>
                            <span className="block text-[11px] text-slate-400 font-mono mt-0.5">
                              {completedClauses} done • {openClauses} open
                            </span>
                          </div>
                        </td>

                        {/* Added On */}
                        <td className="py-4 px-3 whitespace-nowrap">
                          <div>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                              {date}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono block">
                              {time}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Processed</span>
                          </span>
                        </td>

                        {/* Actions 3-dots Menu */}
                        <td className="py-4 pr-4 pl-2 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setActiveRowMenu(activeRowMenu === doc.id ? null : doc.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            title="Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Popover Dropdown */}
                          {activeRowMenu === doc.id && (
                            <div className="absolute right-4 top-12 z-30 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-left text-xs animate-in fade-in zoom-in-95 duration-100">
                              <button
                                onClick={() => {
                                  setActiveRowMenu(null);
                                  handleSelectDoc(doc);
                                }}
                                className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-500" />
                                <span>View Obligations</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveRowMenu(null);
                                  handleExportDoc(doc, "DOCX");
                                }}
                                className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Export as DOCX</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveRowMenu(null);
                                  handleExportDoc(doc, "XLSX");
                                }}
                                className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Export as XLSX</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveRowMenu(null);
                                  handleExportDoc(doc, "PDF");
                                }}
                                className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-rose-500" />
                                <span>Export as PDF</span>
                              </button>
                              <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                              <button
                                onClick={() => {
                                  setActiveRowMenu(null);
                                  setDocToDelete(doc);
                                }}
                                className="w-full px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Document</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{paginatedDocs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {Math.min(currentPage * pageSize, sortedDocuments.length)}
              </span>{" "}
              of <span className="font-semibold text-slate-700 dark:text-slate-300">{sortedDocuments.length}</span> entries
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <div className="relative">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="pl-2.5 pr-7 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 cursor-pointer"
                  title="First page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {currentPage}
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 cursor-pointer"
                  title="Last page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Mode 2: Job Ledger Table View */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  <th className="py-3.5 pl-4 pr-3">JOB / DOCUMENT</th>
                  <th className="py-3.5 px-3">AI ENGINE & MODEL</th>
                  <th className="py-3.5 px-3 text-center">PAGES / SIZE</th>
                  <th className="py-3.5 px-3 text-center">CREATED AT</th>
                  <th className="py-3.5 px-3 text-center">STATUS</th>
                  <th className="py-3.5 pr-4 pl-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs font-mono">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                      No asynchronous extraction jobs found in database.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => {
                    const badge = getJobStatusBadge(job.status);
                    const BadgeIcon = badge.icon;
                    const isExportingThis = exportingId === job.jobId;

                    return (
                      <tr
                        key={job.jobId}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-4 pl-4 pr-3 max-w-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                              <Layers className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-sans font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                                {job.originalFilename || `Job ${job.jobId.slice(0, 8)}`}
                              </h4>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {job.jobId}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-3">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {job.requestedProvider || "GEMINI"}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {job.requestedModel || "default"}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-3 text-center text-slate-600 dark:text-slate-300">
                          {job.pageCount ? `${job.pageCount}p` : "-"}
                          {job.sizeBytes ? ` • ${formatBytes(job.sizeBytes)}` : ""}
                        </td>

                        <td className="py-4 px-3 text-center text-slate-500 text-[11px]">
                          {formatDate(job.createdAt)}
                        </td>

                        <td className="py-4 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.className}`}
                          >
                            <BadgeIcon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>
                        </td>

                        <td className="py-4 pr-4 pl-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setInspectedJob(job)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="View Telemetry & Diagnostics"
                            >
                              <Terminal className="w-4 h-4" />
                            </button>

                            {(job.status === "COMPLETED" || job.status === "PARTIAL" || job.resultAvailable) && (
                              <>
                                <button
                                  onClick={() => handleExportJob(job, "DOCX")}
                                  disabled={isExportingThis}
                                  className="px-2 py-1 rounded text-[10px] font-semibold font-mono border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                                  title="Export DOCX"
                                >
                                  DOCX
                                </button>
                                <button
                                  onClick={() => handleOpenJobResult(job)}
                                  className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                                  title="Open Obligations Table"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => removeDocument(job.jobId, job.jobId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Job"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(docToDelete)}
        title="Delete Document"
        message={`Are you sure you want to remove "${docToDelete?.documentTitle || docToDelete?.documentId}" from the compliance register?`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDocToDelete(null)}
      />

      {/* Job Telemetry Modal */}
      {inspectedJob && (
        <JobDetailsModal
          job={inspectedJob}
          onClose={() => setInspectedJob(null)}
        />
      )}
    </div>
  );
}
