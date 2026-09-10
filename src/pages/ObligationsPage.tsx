import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Calendar,
  Building2,
  User,
  ExternalLink,
  RefreshCw,
  BookOpen,
  Download,
  Home,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  FileText,
  TrendingUp,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { useDocuments } from "../hooks/useDocuments";
import { useAppStore } from "../stores/useAppStore";
import { ObligationData, ObligationStatus } from "../types/api";
import { useSnackbar } from "../hooks/useSnackbar";
import { formatDate } from "../lib/utils";
import { FilterPopover, FilterSelectField } from "../components/common/FilterPopover";

interface ObligationRow extends ObligationData {
  docId: string;
  documentId: string;
  documentTitle: string;
  entity?: string;
}

export function ObligationsPage() {
  const { documents, updateObligationStatus, fetchJobs, isLoadingJobs } = useDocuments();
  const { serverObligations, fetchObligations } = useAppStore();
  const { info, error, success } = useSnackbar();

  // Filters & Scope
  const [selectedDocumentScope, setSelectedDocumentScope] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPermitFilter, setSelectedPermitFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<string>("ALL");

  // Filter Popover State
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting
  const [sortField, setSortField] = useState<string>("obligationId");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Expanded Row & Menu
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
    fetchObligations();
  }, [fetchJobs, fetchObligations]);

  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const handleStatusChange = async (docId: string, obId: string, status: ObligationStatus) => {
    try {
      await updateObligationStatus(docId, obId, status);
      info(`Obligation ${obId} status updated to ${status}`, "Status Updated");
    } catch (err: any) {
      error(`Failed to update obligation status: ${err.message}`, "Update Error");
    }
  };

  const handleCopyClause = (ob: ObligationRow) => {
    navigator.clipboard.writeText(`${ob.obligationTitle}\n\n${ob.obligationDescription}`);
    setCopiedId(ob.obligationId);
    success(`Copied clause ${ob.obligationId} to clipboard`, "Clause Copied");
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Combine real database obligations with any local documents without duplicates
  const allObligations: ObligationRow[] = useMemo(() => {
    const list: ObligationRow[] = [];
    const seen = new Set<string>();

    if (serverObligations && serverObligations.length > 0) {
      serverObligations.forEach((so) => {
        const key = `${so.jobId || so.documentId}-${so.obligationId}`;
        seen.add(key);
        list.push({
          obligationId: so.obligationId,
          obligationTitle: so.obligationTitle,
          obligationStatus: (so.obligationStatus as ObligationStatus) || "OPEN",
          obligationDescription: so.obligationDescription,
          dueDate: so.dueDate,
          section: so.section,
          obligationOwner: so.obligationOwner,
          docId: so.jobId || so.documentId,
          documentId: so.documentId || so.jobId,
          documentTitle: so.documentTitle || "Compliance Document",
          entity: so.entity,
        });
      });
    }

    documents.forEach((doc) => {
      doc.obligations?.forEach((ob) => {
        const key = `${doc.id}-${ob.obligationId}`;
        const keyJob = `${doc.jobId}-${ob.obligationId}`;
        if (!seen.has(key) && !seen.has(keyJob)) {
          seen.add(key);
          list.push({
            ...ob,
            docId: doc.jobId || doc.id,
            documentId: doc.documentId || doc.id,
            documentTitle: doc.documentTitle || doc.fileName || "Compliance Document",
            entity: doc.entity,
          });
        }
      });
    });

    return list;
  }, [documents, serverObligations]);

  // Unique permit list for dropdowns
  const permitOptions = useMemo(() => {
    const set = new Set<string>();
    allObligations.forEach((o) => {
      if (o.documentId) set.add(o.documentId);
    });
    return Array.from(set);
  }, [allObligations]);

  // Filtered by Document Scope selector in Header
  const scopedObligations = useMemo(() => {
    if (selectedDocumentScope === "ALL") return allObligations;
    return allObligations.filter((o) => o.documentId === selectedDocumentScope || o.docId === selectedDocumentScope);
  }, [allObligations, selectedDocumentScope]);

  // Unique owners list for filter dropdown
  const ownerOptions = useMemo(() => {
    const set = new Set<string>();
    scopedObligations.forEach((o) => {
      if (o.obligationOwner && o.obligationOwner.trim()) {
        set.add(o.obligationOwner.trim());
      }
    });
    return Array.from(set).sort();
  }, [scopedObligations]);

  // Number of active filters applied in the filter popover
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedPermitFilter !== "ALL") count++;
    if (selectedStatusFilter !== "ALL") count++;
    if (selectedOwnerFilter !== "ALL") count++;
    return count;
  }, [selectedPermitFilter, selectedStatusFilter, selectedOwnerFilter]);

  // Executive KPI Counts (computed dynamically from scoped obligations)
  const totalCount = scopedObligations.length;
  const openCount = scopedObligations.filter((o) => o.obligationStatus === "OPEN").length;
  const inProgressCount = scopedObligations.filter((o) => o.obligationStatus === "IN_PROGRESS").length;
  const completedCount = scopedObligations.filter((o) => o.obligationStatus === "COMPLETED").length;

  const openPercent = totalCount > 0 ? Math.round((openCount / totalCount) * 100) : 0;
  const inProgressPercent = totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0;
  const completedPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered by Search, Permit, Status, and Owner
  const filteredObligations = useMemo(() => {
    return scopedObligations.filter((ob) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          ob.obligationId?.toLowerCase().includes(q) ||
          ob.obligationTitle?.toLowerCase().includes(q) ||
          ob.obligationDescription?.toLowerCase().includes(q) ||
          ob.section?.toLowerCase().includes(q) ||
          ob.documentId?.toLowerCase().includes(q) ||
          ob.entity?.toLowerCase().includes(q) ||
          ob.obligationOwner?.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (selectedPermitFilter !== "ALL" && ob.documentId !== selectedPermitFilter) {
        return false;
      }

      if (selectedStatusFilter !== "ALL" && ob.obligationStatus !== selectedStatusFilter) {
        return false;
      }

      if (selectedOwnerFilter !== "ALL" && ob.obligationOwner !== selectedOwnerFilter) {
        return false;
      }

      return true;
    });
  }, [scopedObligations, searchQuery, selectedPermitFilter, selectedStatusFilter, selectedOwnerFilter]);

  // Sorted obligations
  const sortedObligations = useMemo(() => {
    return [...filteredObligations].sort((a, b) => {
      let valA: any = (a as any)[sortField] || "";
      let valB: any = (b as any)[sortField] || "";

      if (sortField === "obligationId") {
        // Natural numeric alphanumeric sort
        return sortDirection === "asc"
          ? String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: "base" })
          : String(valB).localeCompare(String(valA), undefined, { numeric: true, sensitivity: "base" });
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredObligations, sortField, sortDirection]);

  // Paginated obligations
  const totalPages = Math.max(1, Math.ceil(sortedObligations.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedObligations.slice(start, start + pageSize);
  }, [sortedObligations, currentPage, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleSelectRow = (key: string) => {
    setSelectedIds((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedRows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedRows.map((r) => `${r.docId}-${r.obligationId}`));
    }
  };

  const handleExportCsv = () => {
    if (sortedObligations.length === 0) return;
    const headers = [
      "Clause ID",
      "Section",
      "Clause Title",
      "Description",
      "Document ID",
      "Entity",
      "Responsible Owner",
      "Due Date",
      "Status",
    ];
    const rows = sortedObligations.map((o) => [
      JSON.stringify(o.obligationId || ""),
      JSON.stringify(o.section || ""),
      JSON.stringify(o.obligationTitle || ""),
      JSON.stringify(o.obligationDescription || ""),
      JSON.stringify(o.documentId || ""),
      JSON.stringify(o.entity || ""),
      JSON.stringify(o.obligationOwner || ""),
      JSON.stringify(o.dueDate || ""),
      JSON.stringify(o.obligationStatus || ""),
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `compliance_matrix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    info(`Exported ${sortedObligations.length} obligations to CSV`, "Export Generated");
  };

  const handleResetFilters = () => {
    setSelectedPermitFilter("ALL");
    setSelectedStatusFilter("ALL");
    setSelectedOwnerFilter("ALL");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* 1. Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
        <span className="font-medium text-slate-700 dark:text-slate-300">Obligations Matrix</span>
      </div>

      {/* 2. Main Header with Scope Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/70 dark:border-blue-800/70 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs shrink-0">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Compliance Obligations Matrix
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Audit, track, and manage all parsed statutory conditions across permits and regulatory licenses.
            </p>
          </div>
        </div>

        {/* Scope Selector: All Documents Dropdown */}
        <div className="relative self-start lg:self-auto">
          <div className="flex items-center gap-2 pl-3.5 pr-8 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedDocumentScope}
              onChange={(e) => {
                setSelectedDocumentScope(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent focus:outline-none appearance-none cursor-pointer pr-2 font-semibold text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="ALL">All Documents</option>
              {permitOptions.map((p) => (
                <option key={p} value={p}>
                  Permit {p}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. Top 4 KPI Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Obligations */}
        <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                Total Obligations
              </span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-sans leading-tight block mt-0.5">
                {totalCount}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>
              {permitOptions.length > 0 ? `${permitOptions.length} active permits` : "Across library"}
            </span>
          </div>
        </div>

        {/* Card 2: Open */}
        <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Open</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-sans leading-tight block">
              {openCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              {openPercent}% of total
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#2563EB] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${openPercent}%` }}
            />
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">In Progress</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-sans leading-tight block">
              {inProgressCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              {inProgressPercent}% of total
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#F59E0B] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${inProgressPercent}%` }}
            />
          </div>
        </div>

        {/* Card 4: Completed */}
        <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Completed</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-sans leading-tight block">
              {completedCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              {completedPercent}% of total
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#10B981] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${completedPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Filter & Action Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input (kept outside for fast lookup) */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search obligations by clause ID, description, section, or permit..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        {/* Right Action Controls: Clear filters, Filter button, Export, Sync */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Clear when filters are active */}
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

          {/* Export CSV Button (kept outside) */}
          <button
            onClick={handleExportCsv}
            disabled={sortedObligations.length === 0}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Export CSV</span>
          </button>

          {/* Sync Telemetry Button (kept outside) */}
          <button
            onClick={() => {
              fetchJobs(true);
              fetchObligations();
            }}
            disabled={isLoadingJobs}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Refresh database obligations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingJobs ? "animate-spin text-blue-600" : "text-slate-500"}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Filter Popover Anchored to Filter Button at Right */}
      <FilterPopover
        isOpen={isFilterPopoverOpen}
        onClose={() => setIsFilterPopoverOpen(false)}
        triggerRef={filterButtonRef}
        title="Filter Obligations"
        activeCount={activeFiltersCount}
        onReset={handleResetFilters}
      >
        <FilterSelectField
          label="Permit / Document"
          value={selectedPermitFilter}
          onChange={(val) => {
            setSelectedPermitFilter(val);
            setCurrentPage(1);
          }}
          options={[
            { value: "ALL", label: "All Permits" },
            ...permitOptions.map((p) => ({ value: p, label: `Permit ${p}` })),
          ]}
          icon={FileText}
        />

        <FilterSelectField
          label="Obligation Status"
          value={selectedStatusFilter}
          onChange={(val) => {
            setSelectedStatusFilter(val);
            setCurrentPage(1);
          }}
          options={[
            { value: "ALL", label: "All Status" },
            { value: "OPEN", label: "Open" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
          ]}
          icon={CheckCircle2}
        />

        <FilterSelectField
          label="Responsible Owner"
          value={selectedOwnerFilter}
          onChange={(val) => {
            setSelectedOwnerFilter(val);
            setCurrentPage(1);
          }}
          options={[
            { value: "ALL", label: "All Owners" },
            ...ownerOptions.map((o) => ({ value: o, label: o })),
          ]}
          icon={User}
        />
      </FilterPopover>

      {/* 5. Main Obligations Matrix Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none font-mono">
                {/* Select All Checkbox */}
                <th className="py-3.5 pl-4 pr-2 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedRows.length > 0 && selectedIds.length === paginatedRows.length}
                    onChange={toggleSelectAll}
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>

                {/* Clause ID & Section */}
                <th
                  className="py-3.5 px-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 whitespace-nowrap"
                  onClick={() => handleSort("obligationId")}
                >
                  <span className="flex items-center gap-1">
                    CLAUSE ID & SECTION <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>

                {/* Obligation Clause & Text */}
                <th
                  className="py-3.5 px-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 min-w-[280px]"
                  onClick={() => handleSort("obligationTitle")}
                >
                  <span className="flex items-center gap-1">
                    OBLIGATION CLAUSE & TEXT <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>

                {/* Document / Permit */}
                <th
                  className="py-3.5 px-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 whitespace-nowrap"
                  onClick={() => handleSort("documentId")}
                >
                  <span className="flex items-center gap-1">
                    DOCUMENT / PERMIT <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>

                {/* Responsible Owner */}
                <th
                  className="py-3.5 px-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 whitespace-nowrap"
                  onClick={() => handleSort("obligationOwner")}
                >
                  <span className="flex items-center gap-1">
                    RESPONSIBLE OWNER <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>

                {/* Due Date */}
                <th
                  className="py-3.5 px-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 whitespace-nowrap"
                  onClick={() => handleSort("dueDate")}
                >
                  <span className="flex items-center gap-1">
                    DUE DATE <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>

                {/* Status */}
                <th
                  className="py-3.5 px-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 text-center whitespace-nowrap"
                  onClick={() => handleSort("obligationStatus")}
                >
                  <span className="flex items-center justify-center gap-1">
                    STATUS <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>

                {/* Actions Column */}
                <th className="py-3.5 pr-4 pl-2 w-10 text-right"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShieldCheck className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No obligations match your criteria
                      </span>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Try adjusting your search query, permit filter, or upload new documents in Upload & Extract.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((ob) => {
                  const rowKey = `${ob.docId}-${ob.obligationId}`;
                  const isSelected = selectedIds.includes(rowKey);
                  const isExpanded = expandedRowId === rowKey;
                  const isCopied = copiedId === ob.obligationId;

                  return (
                    <React.Fragment key={rowKey}>
                      <tr
                        onClick={() => setExpandedRowId(isExpanded ? null : rowKey)}
                        className={`group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                          isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-4 pl-4 pr-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(rowKey)}
                            className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Clause ID & Section */}
                        <td className="py-4 px-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold font-mono text-xs border border-blue-200/50 w-fit">
                              {ob.obligationId}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-1 font-normal block truncate max-w-[160px]">
                              {ob.section
                                ? ob.section.startsWith("§") || ob.section.toLowerCase().startsWith("schedule")
                                  ? ob.section
                                  : `Schedule ${ob.section}`
                                : "§ General"}
                            </span>
                          </div>
                        </td>

                        {/* Obligation Clause & Text */}
                        <td className="py-4 px-3 max-w-md">
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs group-hover:text-blue-600 transition-colors">
                              {ob.obligationTitle || "Statutory Condition"}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-sans">
                              {ob.obligationDescription}
                            </p>
                          </div>
                        </td>

                        {/* Document / Permit */}
                        <td className="py-4 px-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 font-mono block">
                              {ob.documentId}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-sans block truncate max-w-[170px]">
                              {ob.entity || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Responsible Owner */}
                        <td className="py-4 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium text-xs">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[140px] capitalize">
                              {ob.obligationOwner || "missing"}
                            </span>
                          </div>
                        </td>

                        {/* Due Date */}
                        <td className="py-4 px-3 whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-300">
                          {ob.dueDate ? (ob.dueDate.toLowerCase() === "ongoing" || ob.dueDate.toLowerCase() === "upon occurrence" ? ob.dueDate : formatDate(ob.dueDate)) : "Ongoing"}
                        </td>

                        {/* Status Dropdown Pill */}
                        <td className="py-4 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block">
                            <select
                              value={ob.obligationStatus}
                              onChange={(e) =>
                                handleStatusChange(ob.docId, ob.obligationId, e.target.value as ObligationStatus)
                              }
                              className={`pl-3 pr-7 py-1 rounded-full text-xs font-semibold focus:outline-none appearance-none cursor-pointer border shadow-2xs transition-colors ${
                                ob.obligationStatus === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/70"
                                  : ob.obligationStatus === "IN_PROGRESS"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/70"
                                  : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/70"
                              }`}
                            >
                              <option value="OPEN" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                Open
                              </option>
                              <option value="IN_PROGRESS" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                In Progress
                              </option>
                              <option value="COMPLETED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                Completed
                              </option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2 pointer-events-none opacity-60" />
                          </div>
                        </td>

                        {/* Row Actions Menu */}
                        <td className="py-4 pr-4 pl-2 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === rowKey ? null : rowKey)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === rowKey && (
                            <div className="absolute right-4 top-11 z-30 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-left text-xs animate-in fade-in zoom-in-95 duration-100">
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setExpandedRowId(isExpanded ? null : rowKey);
                                }}
                                className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 cursor-pointer"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                                <span>{isExpanded ? "Collapse Details" : "View Full Narrative"}</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleCopyClause(ob);
                                }}
                                className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 cursor-pointer"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                                <span>{isCopied ? "Copied!" : "Copy Clause"}</span>
                              </button>

                              <div className="border-t border-slate-100 dark:border-slate-700 my-1" />

                              <Link
                                to={`/library/${ob.docId}`}
                                className="w-full px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                                <span>Open Source Document</span>
                              </Link>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Statutory Clause Narrative */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0 bg-slate-50/70 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800">
                            <div className="p-5 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  Full Extracted Statutory Clause Narrative (Clause {ob.obligationId})
                                </span>
                                <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                                  <span>{ob.section ? `Section ${ob.section}` : "Section: General"}</span>
                                  <Link
                                    to={`/library/${ob.docId}`}
                                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-sans font-semibold"
                                  >
                                    <span>View Source Permit</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                </div>
                              </div>

                              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-serif whitespace-pre-wrap shadow-2xs">
                                {ob.obligationDescription}
                              </div>

                              <div className="flex flex-wrap items-center gap-5 text-xs text-slate-500 pt-1">
                                <span className="flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                  Regulated Entity: <strong className="text-slate-800 dark:text-slate-200">{ob.entity || "Unspecified"}</strong>
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  Due Date: <strong className="text-slate-800 dark:text-slate-200">{ob.dueDate || "Ongoing"}</strong>
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  Responsible Owner: <strong className="text-slate-800 dark:text-slate-200 capitalize">{ob.obligationOwner || "Unassigned"}</strong>
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Footer Pagination Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{paginatedRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {Math.min(currentPage * pageSize, sortedObligations.length)}
            </span>{" "}
            of <span className="font-semibold text-slate-700 dark:text-slate-300">{sortedObligations.length}</span> entries
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

            {/* Pagination buttons */}
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

              {/* Numbered Page Buttons */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  p = currentPage - 2 + i;
                  if (p > totalPages) p = totalPages - (4 - i);
                }
                const isActive = p === currentPage;
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center cursor-pointer transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

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
    </div>
  );
}
