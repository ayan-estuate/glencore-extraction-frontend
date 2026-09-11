import { useMemo } from "react";
import { useAppStore } from "../stores/useAppStore";
import { StoredDocument } from "../types/api";

export function useDocuments() {
  const {
    documents,
    jobs,
    isLoadingJobs,
    fetchJobs,
    loadJobResult,
    selectedDocumentIds,
    searchQuery,
    selectedStatusFilter,
    dateRangeFilter,
    addDocument,
    removeDocument,
    updateObligationStatus,
    setSearchQuery,
    setStatusFilter,
    setDateRangeFilter,
    toggleSelectDocument,
    selectAllDocuments,
    clearSelection,
  } = useAppStore();

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Search Query (Doc ID, Title, Entity, Description)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          doc.documentId?.toLowerCase().includes(query) ||
          doc.documentTitle?.toLowerCase().includes(query) ||
          doc.entity?.toLowerCase().includes(query) ||
          doc.documentDescription?.toLowerCase().includes(query) ||
          doc.fileName?.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      // 2. Status Filter
      if (selectedStatusFilter !== "ALL") {
        const hasMatchingObligation = doc.obligations.some(
          (ob) => ob.obligationStatus === selectedStatusFilter
        );
        if (!hasMatchingObligation) return false;
      }

      // 3. Date Range Filter
      if (dateRangeFilter !== "ALL") {
        const docDate = new Date(doc.extractedAt).getTime();
        const now = Date.now();
        const days = dateRangeFilter === "30_DAYS" ? 30 : dateRangeFilter === "90_DAYS" ? 90 : 365;
        const diffDays = (now - docDate) / (1000 * 60 * 60 * 24);
        if (diffDays > days) return false;
      }

      return true;
    });
  }, [documents, searchQuery, selectedStatusFilter, dateRangeFilter]);

  const stats = useMemo(() => {
    const totalDocs = documents.length;
    let totalObligations = 0;
    let openObligations = 0;
    let inProgressObligations = 0;
    let completedObligations = 0;
    let overdueObligations = 0;

    const now = new Date();

    documents.forEach((doc) => {
      doc.obligations.forEach((ob) => {
        totalObligations++;
        if (ob.obligationStatus === "OPEN") {
          openObligations++;
        } else if (ob.obligationStatus === "IN_PROGRESS") {
          inProgressObligations++;
        } else if (ob.obligationStatus === "COMPLETED") {
          completedObligations++;
        }

        // Check overdue for any active (non-completed) obligation with past due date
        if (ob.obligationStatus !== "COMPLETED" && ob.dueDate && ob.dueDate.toLowerCase() !== "ongoing") {
          const due = new Date(ob.dueDate);
          if (!isNaN(due.getTime()) && due < now) {
            overdueObligations++;
          }
        }
      });
    });

    // Score calculation:
    // Regulatory compliance score represents adherence rate (obligations in good standing / not overdue)
    const compliantObligations = Math.max(0, totalObligations - overdueObligations);
    const complianceScore =
      totalObligations > 0
        ? Math.round((compliantObligations / totalObligations) * 100)
        : 100;

    return {
      totalDocs,
      totalJobs: jobs.length,
      totalObligations,
      openObligations,
      inProgressObligations,
      completedObligations,
      overdueObligations,
      complianceScore,
    };
  }, [documents, jobs]);

  return {
    documents: filteredDocuments,
    allDocuments: documents,
    jobs,
    isLoadingJobs,
    fetchJobs,
    loadJobResult,
    stats,
    selectedDocumentIds,
    searchQuery,
    selectedStatusFilter,
    dateRangeFilter,
    addDocument,
    removeDocument,
    updateObligationStatus,
    setSearchQuery,
    setStatusFilter,
    setDateRangeFilter,
    toggleSelectDocument,
    selectAllDocuments,
    clearSelection,
  };
}
