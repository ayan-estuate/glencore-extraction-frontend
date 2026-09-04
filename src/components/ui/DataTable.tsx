import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  RotateCcw,
  SlidersHorizontal,
  Check,
} from "lucide-react";

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => any;
  cell?: (info: { row: T; value: any; index: number }) => React.ReactNode;
  sortable?: boolean;
  sortFn?: (a: T, b: T, direction: "asc" | "desc") => number;
  filterable?: boolean;
  filterType?: "select" | "text";
  filterOptions?: { label: string; value: string }[];
  draggable?: boolean; // defaults to true
  align?: "left" | "center" | "right";
  width?: string;
  minWidth?: string;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  rowKey: (row: T) => string;
  title?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  initialSortColumn?: string;
  initialSortDirection?: "asc" | "desc";
  pageSize?: number;
  pageSizeOptions?: number[];
  showPagination?: boolean;
  onRowClick?: (row: T) => void;
  renderExpandedRow?: (row: T) => React.ReactNode;
  actions?: React.ReactNode;
  emptyStateMessage?: string;
  emptyStateDescription?: string;
  emptyStateIcon?: React.ReactNode;
  tableKey?: string; // for persisting column order & visibility
  className?: string;
}

export function DataTable<T>({
  data,
  columns: propColumns,
  rowKey,
  title,
  searchPlaceholder = "Search records...",
  searchable = true,
  initialSortColumn,
  initialSortDirection = "asc",
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  showPagination = true,
  onRowClick,
  renderExpandedRow,
  actions,
  emptyStateMessage = "No records found",
  emptyStateDescription = "No items match your current search or filter criteria.",
  emptyStateIcon,
  tableKey,
  className = "",
}: DataTableProps<T>) {
  // Search query
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleRowExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Per-column filter values
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Filter popover visibility & dynamic screen positioning
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [filterCoords, setFilterCoords] = useState<{
    top?: number;
    bottom?: number;
    right: number;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateFilterCoords = useCallback(() => {
    if (!filterButtonRef.current) return;
    const rect = filterButtonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUp = spaceBelow < 340 && spaceAbove > spaceBelow;

    const top = shouldOpenUp ? undefined : rect.bottom + 8;
    const bottom = shouldOpenUp ? Math.max(8, window.innerHeight - rect.top + 8) : undefined;
    const right = Math.max(16, window.innerWidth - rect.right);
    const maxHeight = Math.min(500, Math.max(260, (shouldOpenUp ? spaceAbove : spaceBelow) - 32));

    setFilterCoords({ top, bottom, right, maxHeight });
  }, []);

  useEffect(() => {
    if (!isFilterModalOpen) return;
    updateFilterCoords();

    const handleScrollOrResize = () => {
      updateFilterCoords();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFilterModalOpen(false);
      }
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterModalOpen, updateFilterCoords]);

  // Sorting state
  const [sortColumnId, setSortColumnId] = useState<string | null>(initialSortColumn || null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(initialSortDirection);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Column order & drag state
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (tableKey) {
      try {
        const saved = localStorage.getItem(`dt_order_${tableKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return propColumns.map((c) => c.id);
  });

  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Synchronize column order if columns prop changes
  useEffect(() => {
    setColumnOrder((prev) => {
      const validPrev = prev.filter((id) => propColumns.some((c) => c.id === id));
      const missing = propColumns.filter((c) => !validPrev.includes(c.id)).map((c) => c.id);
      return [...validPrev, ...missing];
    });
  }, [propColumns]);

  // Save order when changed
  const handleReorderColumns = (newOrder: string[]) => {
    setColumnOrder(newOrder);
    if (tableKey) {
      try {
        localStorage.setItem(`dt_order_${tableKey}`, JSON.stringify(newOrder));
      } catch {}
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColId(colId);
    e.dataTransfer.setData("text/plain", colId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (draggedColId && draggedColId !== targetColId) {
      setDragOverColId(targetColId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetColId) {
      setDraggedColId(null);
      setDragOverColId(null);
      return;
    }

    const currentIdx = columnOrder.indexOf(draggedColId);
    const targetIdx = columnOrder.indexOf(targetColId);

    if (currentIdx !== -1 && targetIdx !== -1) {
      const newOrder = [...columnOrder];
      newOrder.splice(currentIdx, 1);
      newOrder.splice(targetIdx, 0, draggedColId);
      handleReorderColumns(newOrder);
    }

    setDraggedColId(null);
    setDragOverColId(null);
  };

  const handleDragEnd = () => {
    setDraggedColId(null);
    setDragOverColId(null);
  };

  // Ordered columns map
  const orderedColumns = useMemo(() => {
    const colMap = new Map(propColumns.map((c) => [c.id, c]));
    return columnOrder.map((id) => colMap.get(id)).filter(Boolean) as ColumnDef<T>[];
  }, [propColumns, columnOrder]);

  // Extract cell value helper
  const getCellValue = (row: T, col: ColumnDef<T>) => {
    if (col.accessorFn) return col.accessorFn(row);
    if (col.accessorKey) return row[col.accessorKey];
    return undefined;
  };

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    return Object.values(columnFilters).filter((v) => v !== "" && v !== "ALL").length;
  }, [columnFilters]);

  // Sorting toggle
  const handleSort = (colId: string) => {
    if (sortColumnId === colId) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumnId(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumnId(colId);
      setSortDirection("asc");
    }
  };

  // Filter and search
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Global search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesGlobal = propColumns.some((col) => {
          const val = getCellValue(row, col);
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(query);
        });
        if (!matchesGlobal) return false;
      }

      // Column filters
      for (const [colId, filterVal] of Object.entries(columnFilters)) {
        if (!filterVal || filterVal === "ALL") continue;
        const col = propColumns.find((c) => c.id === colId);
        if (!col) continue;

        const cellVal = getCellValue(row, col);
        if (cellVal === null || cellVal === undefined) return false;

        if (col.filterType === "select") {
          if (String(cellVal).toUpperCase() !== String(filterVal).toUpperCase()) {
            return false;
          }
        } else {
          // text filter
          if (!String(cellVal).toLowerCase().includes(filterVal.toLowerCase().trim())) {
            return false;
          }
        }
      }

      return true;
    });
  }, [data, propColumns, searchQuery, columnFilters]);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortColumnId) return filteredData;

    const col = propColumns.find((c) => c.id === sortColumnId);
    if (!col) return filteredData;

    return [...filteredData].sort((a, b) => {
      if (col.sortFn) {
        return col.sortFn(a, b, sortDirection);
      }

      const valA = getCellValue(a, col);
      const valB = getCellValue(b, col);

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortColumnId, sortDirection, propColumns]);

  // Paginated data
  const totalRecords = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, showPagination]);

  const clearAllFilters = () => {
    setColumnFilters({});
    setSearchQuery("");
  };

  return (
    <div
      className={`w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col ${className}`}
    >
      {/* Top Toolbar Bar */}
      <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200/70 dark:border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Top Left: Search Bar */}
        <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-md">
          {searchable && (
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {title && (
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden md:block whitespace-nowrap">
              {title}
            </span>
          )}
        </div>

        {/* Top Right: Filter Modal Button & Actions */}
        <div className="flex items-center gap-2 justify-end shrink-0">
          {/* Active Filter Chips / Clear Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer mr-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear filters</span>
            </button>
          )}

          {/* Filter Popover Trigger Button */}
          <button
            ref={filterButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              if (!isFilterModalOpen) updateFilterCoords();
              setIsFilterModalOpen((prev) => !prev);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border shadow-2xs ${
              activeFiltersCount > 0
                ? "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-blue-500" />
            <span>Filter</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-mono text-[10px]">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Custom Actions (e.g. Refresh, Export, Add) */}
          {actions}
        </div>
      </div>

      {/* Table Content Area */}
      <div className="overflow-x-auto w-full flex-1 min-h-[160px]">
        <table className="w-full text-left border-collapse">
          {/* Draggable Header Row */}
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase font-mono bg-slate-50/50 dark:bg-slate-800/30 select-none">
              {orderedColumns.map((col) => {
                const isSorted = sortColumnId === col.id;
                const isSortable = col.sortable !== false;
                const isDraggable = col.draggable !== false;
                const isBeingDragged = draggedColId === col.id;
                const isDragOver = dragOverColId === col.id;

                return (
                  <th
                    key={col.id}
                    draggable={isDraggable}
                    onDragStart={(e) => handleDragStart(e, col.id)}
                    onDragOver={(e) => handleDragOver(e, col.id)}
                    onDrop={(e) => handleDrop(e, col.id)}
                    onDragEnd={handleDragEnd}
                    style={{ width: col.width, minWidth: col.minWidth }}
                    className={`py-3 px-3.5 transition-colors relative group ${
                      col.align === "center"
                        ? "text-center"
                        : col.align === "right"
                        ? "text-right"
                        : "text-left"
                    } ${isBeingDragged ? "opacity-30" : ""} ${
                      isDragOver ? "bg-blue-50 dark:bg-blue-950/50 border-r-2 border-blue-500" : ""
                    } ${col.headerClassName || ""}`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        isSortable ? "cursor-pointer hover:text-slate-900 dark:hover:text-slate-100" : ""
                      }`}
                      onClick={() => isSortable && handleSort(col.id)}
                    >
                      {/* Drag Grip Handle */}
                      {isDraggable && (
                        <span
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0"
                          title="Drag to reorder column"
                        >
                          <GripVertical className="w-3 h-3" />
                        </span>
                      )}

                      <span>{col.header}</span>

                      {/* Sort Icon */}
                      {isSortable && (
                        <span className="shrink-0">
                          {isSorted ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={orderedColumns.length} className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                    {emptyStateIcon ? (
                      emptyStateIcon
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <Search className="w-5 h-5" />
                      </div>
                    )}
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {emptyStateMessage}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {emptyStateDescription}
                    </p>
                    {(searchQuery || activeFiltersCount > 0) && (
                      <button
                        onClick={clearAllFilters}
                        className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Reset search and filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const key = rowKey(row);
                const isExpanded = expandedKeys.has(key);
                return (
                  <React.Fragment key={key}>
                    <tr
                      onClick={() => {
                        if (renderExpandedRow) toggleRowExpanded(key);
                        if (onRowClick) onRowClick(row);
                      }}
                      className={`transition-colors group ${
                        onRowClick || renderExpandedRow
                          ? "cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          : ""
                      } ${isExpanded ? "bg-slate-50/90 dark:bg-slate-800/60" : ""}`}
                    >
                      {orderedColumns.map((col) => {
                        const value = getCellValue(row, col);
                        return (
                          <td
                            key={col.id}
                            className={`py-3 px-3.5 ${
                              col.align === "center"
                                ? "text-center"
                                : col.align === "right"
                                ? "text-right"
                                : "text-left"
                            } ${col.className || ""}`}
                          >
                            {col.cell
                              ? col.cell({ row, value, index: (currentPage - 1) * pageSize + index })
                              : value !== null && value !== undefined
                              ? String(value)
                              : "-"}
                          </td>
                        );
                      })}
                    </tr>
                    {renderExpandedRow && isExpanded && (
                      <tr className="bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800/80">
                        <td colSpan={orderedColumns.length} className="p-0">
                          {renderExpandedRow(row)}
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

      {/* Bottom Pagination Bar */}
      {showPagination && totalRecords > 0 && (
        <div className="p-3 bg-slate-50/60 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Records Indicator & Page Size */}
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
            <span>
              Showing{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {Math.min(totalRecords, (currentPage - 1) * pageSize + 1)}
              </strong>{" "}
              to{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {Math.min(totalRecords, currentPage * pageSize)}
              </strong>{" "}
              of <strong className="text-slate-800 dark:text-slate-200">{totalRecords}</strong> entries
            </span>

            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] focus:outline-none cursor-pointer"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Page Navigation Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2.5 py-0.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Right Corner Filter Popover (Positioned below the Filter button at right) */}
      {isFilterModalOpen &&
        mounted &&
        typeof window !== "undefined" &&
        window.document?.body &&
        filterCoords &&
        createPortal(
          <>
            {/* Transparent Backdrop to dismiss on click outside */}
            <div
              className="fixed inset-0 z-[99998] bg-transparent"
              onClick={() => setIsFilterModalOpen(false)}
            />

            <div
              style={{
                position: "fixed",
                top: filterCoords.top !== undefined ? `${filterCoords.top}px` : undefined,
                bottom: filterCoords.bottom !== undefined ? `${filterCoords.bottom}px` : undefined,
                right: `${filterCoords.right}px`,
                width: "360px",
                maxWidth: "calc(100vw - 32px)",
                maxHeight: `${filterCoords.maxHeight}px`,
                zIndex: 99999,
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Popover Header */}
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/60 shrink-0">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-blue-500" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Filter Columns
                  </h3>
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold">
                      {activeFiltersCount} active
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Popover Filter Fields */}
              <div className="p-3.5 overflow-y-auto space-y-3.5 text-xs flex-1">
                {propColumns.filter((c) => c.filterable !== false).length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">
                    No configurable column filters for this table.
                  </p>
                ) : (
                  propColumns
                    .filter((c) => c.filterable !== false)
                    .map((col) => {
                      const currentFilterVal = columnFilters[col.id] || "";

                      if (col.filterType === "select" && col.filterOptions) {
                        return (
                          <div key={col.id} className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                              {col.header}
                            </label>
                            <select
                              value={currentFilterVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                setColumnFilters((prev) => {
                                  const next = { ...prev };
                                  if (val === "" || val === "ALL") {
                                    delete next[col.id];
                                  } else {
                                    next[col.id] = val;
                                  }
                                  return next;
                                });
                                setCurrentPage(1);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              <option value="ALL">All {col.header}</option>
                              {col.filterOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      // Default text filter
                      return (
                        <div key={col.id} className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                            {col.header}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder={`Filter by ${col.header}...`}
                              value={currentFilterVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                setColumnFilters((prev) => {
                                  const next = { ...prev };
                                  if (!val.trim()) {
                                    delete next[col.id];
                                  } else {
                                    next[col.id] = val;
                                  }
                                  return next;
                                });
                                setCurrentPage(1);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {currentFilterVal && (
                              <button
                                onClick={() => {
                                  setColumnFilters((prev) => {
                                    const next = { ...prev };
                                    delete next[col.id];
                                    return next;
                                  });
                                }}
                                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Popover Footer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <button
                  onClick={() => {
                    setColumnFilters({});
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>

                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Done</span>
                </button>
              </div>
            </div>
          </>,
          window.document.body
        )}
    </div>
  );
}
