import { useState, useEffect, useMemo, useCallback } from "react";
import { useAppStore } from "../stores/useAppStore";
import { formatDate } from "../lib/utils";

export interface ComplianceNotification {
  id: string;
  category: "obligation" | "job";
  title: string;
  description: string;
  time: string;
  timestamp: number;
  type: "alert" | "warning" | "success" | "info";
  targetUrl: string;
  isRead: boolean;
  jobId?: string;
  docId?: string;
  obligationId?: string;
  meta?: {
    status?: string;
    section?: string;
    owner?: string;
    dueDate?: string;
  };
}

export type NotificationCategory = "all" | "obligations" | "jobs";

const READ_NOTIFICATIONS_STORAGE_KEY = "compliance_notifications_read_v1";

function getStoredReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (e) {
    console.debug("Failed loading read notification IDs:", e);
  }
  return new Set<string>();
}

function saveStoredReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.debug("Failed saving read notification IDs:", e);
  }
}

export function formatTimeAgo(dateString?: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = Date.now();
  const diffMs = now - date.getTime();

  if (diffMs < 0) {
    const futureDays = Math.ceil(-diffMs / (1000 * 60 * 60 * 24));
    if (futureDays === 0) return "due today";
    if (futureDays === 1) return "due tomorrow";
    return `in ${futureDays}d`;
  }

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function useComplianceNotifications() {
  const { documents, jobs, fetchJobs, notificationPreferences } = useAppStore();
  const [readIds, setReadIds] = useState<Set<string>>(() => getStoredReadIds());
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory>("all");

  // Periodically or on initial mount, ensure jobs are loaded
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const rawNotifications = useMemo(() => {
    const list: ComplianceNotification[] = [];
    const now = new Date();
    const nowTime = now.getTime();
    const prefs = notificationPreferences;
    const windowDays = prefs?.dueSoonWindowDays ?? 14;

    // 1. Scan documents for overdue and upcoming obligations
    documents.forEach((doc) => {
      const docId = doc.jobId || doc.id || doc.documentId;
      const docTitle = doc.documentTitle || doc.fileName || doc.documentId || "Document";

      doc.obligations.forEach((ob) => {
        // Completed status milestone
        if (ob.obligationStatus === "COMPLETED") {
          if (prefs?.notifyObligationCompleted) {
            list.push({
              id: `completed-${docId}-${ob.obligationId}`,
              category: "obligation",
              title: "Obligation Fulfilled",
              description: `"${ob.obligationTitle}" in ${docTitle}${ob.section ? ` (§${ob.section})` : ""} was verified as Completed.`,
              time: "Fulfilled",
              timestamp: nowTime - 3600000,
              type: "success",
              targetUrl: `/library/${docId}`,
              isRead: false,
              docId,
              obligationId: ob.obligationId,
              meta: {
                status: "COMPLETED",
                section: ob.section,
                owner: ob.obligationOwner,
                dueDate: ob.dueDate,
              },
            });
          }
          return;
        }

        if (ob.dueDate && ob.dueDate.toLowerCase() !== "ongoing") {
          const dueDate = new Date(ob.dueDate);
          if (!isNaN(dueDate.getTime())) {
            const diffDays = Math.ceil((dueDate.getTime() - nowTime) / (1000 * 60 * 60 * 24));

            if (diffDays < 0 && prefs?.notifyOverdueObligations !== false) {
              // Overdue
              const daysOverdue = Math.abs(diffDays);
              list.push({
                id: `overdue-${docId}-${ob.obligationId}`,
                category: "obligation",
                title: "Overdue Obligation",
                description: `"${ob.obligationTitle}" in ${docTitle}${ob.section ? ` (§${ob.section})` : ""} is overdue by ${daysOverdue}d (due ${formatDate(ob.dueDate)}). Action required.`,
                time: `Overdue ${daysOverdue}d`,
                timestamp: dueDate.getTime(),
                type: "alert",
                targetUrl: `/library/${docId}`,
                isRead: false,
                docId,
                obligationId: ob.obligationId,
                meta: {
                  status: ob.obligationStatus,
                  section: ob.section,
                  owner: ob.obligationOwner,
                  dueDate: ob.dueDate,
                },
              });
            } else if (diffDays >= 0 && diffDays <= windowDays && prefs?.notifyDueSoonObligations !== false) {
              // Due soon (within window days)
              list.push({
                id: `due-soon-${docId}-${ob.obligationId}`,
                category: "obligation",
                title: diffDays === 0 ? "Obligation Due Today" : "Obligation Due Soon",
                description: `"${ob.obligationTitle}" in ${docTitle}${ob.section ? ` (§${ob.section})` : ""} is due ${diffDays === 0 ? "today" : `in ${diffDays} day${diffDays === 1 ? "" : "s"}`}.`,
                time: diffDays === 0 ? "Due today" : `In ${diffDays}d`,
                timestamp: dueDate.getTime(),
                type: "warning",
                targetUrl: `/library/${docId}`,
                isRead: false,
                docId,
                obligationId: ob.obligationId,
                meta: {
                  status: ob.obligationStatus,
                  section: ob.section,
                  owner: ob.obligationOwner,
                  dueDate: ob.dueDate,
                },
              });
            }
          }
        }
      });
    });

    // 2. Scan jobs for status updates
    jobs.forEach((job) => {
      const jobTime = job.completedAt || job.createdAt;
      const parsedTime = jobTime ? new Date(jobTime).getTime() : nowTime;
      const filename = job.originalFilename || "Document";

      if (job.status === "FAILED" || job.status === "DEAD_LETTER") {
        if (prefs?.notifyJobFailed !== false) {
          list.push({
            id: `job-failed-${job.jobId}`,
            category: "job",
            title: job.status === "DEAD_LETTER" ? "Job Retries Exhausted (Dead Letter)" : "Extraction Pipeline Failed",
            description: `Extraction failed for ${filename}. ${job.errorMessage || job.errorCode || "PDF/LLM processing fault"}`,
            time: formatTimeAgo(jobTime),
            timestamp: parsedTime,
            type: "alert",
            targetUrl: "/upload",
            isRead: false,
            jobId: job.jobId,
            meta: {
              status: job.status,
            },
          });
        }
      } else if (job.status === "PARTIAL") {
        if (prefs?.notifyJobPartial !== false) {
          list.push({
            id: `job-partial-${job.jobId}`,
            category: "job",
            title: "Partial Extraction (Review Required)",
            description: `${filename} finished with partial segment recovery. Some clauses may require human adjudication.`,
            time: formatTimeAgo(jobTime),
            timestamp: parsedTime,
            type: "warning",
            targetUrl: `/library/${job.jobId}`,
            isRead: false,
            jobId: job.jobId,
            meta: {
              status: job.status,
            },
          });
        }
      } else if (job.status === "RUNNING" || job.status === "QUEUED") {
        list.push({
          id: `job-progress-${job.jobId}`,
          category: "job",
          title: job.status === "RUNNING" ? "Extraction Processing" : "Extraction Queued",
          description: `${filename} is currently ${job.status.toLowerCase()} in backend extraction pipeline.`,
          time: formatTimeAgo(jobTime),
          timestamp: parsedTime,
          type: "info",
          targetUrl: "/upload",
          isRead: false,
          jobId: job.jobId,
          meta: {
            status: job.status,
          },
        });
      } else if (job.status === "COMPLETED") {
        if (prefs?.notifyJobCompleted) {
          const matchingDoc = documents.find((d) => d.jobId === job.jobId || d.id === job.jobId);
          const obligationCount = matchingDoc?.obligations.length;
          const countText = obligationCount !== undefined ? ` (${obligationCount} obligations)` : "";

          list.push({
            id: `job-completed-${job.jobId}`,
            category: "job",
            title: "Extraction Completed",
            description: `${filename} extraction completed successfully${countText}.`,
            time: formatTimeAgo(jobTime),
            timestamp: parsedTime,
            type: "success",
            targetUrl: `/library/${job.jobId}`,
            isRead: false,
            jobId: job.jobId,
            meta: {
              status: job.status,
            },
          });
        }
      }
    });

    // Sort notifications:
    // 1. Alerts first, then Warnings, then Info/Success
    // 2. Secondary sort: by timestamp descending
    const typePriority: Record<ComplianceNotification["type"], number> = {
      alert: 0,
      warning: 1,
      info: 2,
      success: 3,
    };

    return list.sort((a, b) => {
      const pDiff = typePriority[a.type] - typePriority[b.type];
      if (pDiff !== 0) return pDiff;
      return b.timestamp - a.timestamp;
    });
  }, [documents, jobs, notificationPreferences]);

  // Merge read state
  const notifications = useMemo(() => {
    return rawNotifications.map((n) => ({
      ...n,
      isRead: readIds.has(n.id),
    }));
  }, [rawNotifications, readIds]);

  const filteredNotifications = useMemo(() => {
    if (categoryFilter === "all") return notifications;
    if (categoryFilter === "obligations") return notifications.filter((n) => n.category === "obligation");
    if (categoryFilter === "jobs") return notifications.filter((n) => n.category === "job");
    return notifications;
  }, [notifications, categoryFilter]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const countsByCategory = useMemo(() => {
    return {
      all: notifications.length,
      obligations: notifications.filter((n) => n.category === "obligation").length,
      jobs: notifications.filter((n) => n.category === "job").length,
      unreadAll: notifications.filter((n) => !n.isRead).length,
      unreadObligations: notifications.filter((n) => n.category === "obligation" && !n.isRead).length,
      unreadJobs: notifications.filter((n) => n.category === "job" && !n.isRead).length,
    };
  }, [notifications]);

  const markAllAsRead = useCallback(() => {
    const newSet = new Set(readIds);
    rawNotifications.forEach((n) => newSet.add(n.id));
    setReadIds(newSet);
    saveStoredReadIds(newSet);
  }, [rawNotifications, readIds]);

  const markAsRead = useCallback(
    (id: string) => {
      const newSet = new Set(readIds);
      newSet.add(id);
      setReadIds(newSet);
      saveStoredReadIds(newSet);
    },
    [readIds]
  );

  const clearAll = useCallback(() => {
    const newSet = new Set(readIds);
    rawNotifications.forEach((n) => newSet.add(n.id));
    setReadIds(newSet);
    saveStoredReadIds(newSet);
  }, [rawNotifications, readIds]);

  return {
    notifications: filteredNotifications,
    allNotifications: notifications,
    unreadCount,
    countsByCategory,
    categoryFilter,
    setCategoryFilter,
    markAllAsRead,
    markAsRead,
    clearAll,
    refresh: fetchJobs,
  };
}
