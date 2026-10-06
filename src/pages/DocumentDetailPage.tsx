import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { StoredDocument, ObligationStatus } from "../types/api";
import { ObligationTable } from "../components/documents/ObligationTable";
import { ExportButtons } from "../components/exports/ExportButtons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Sparkles,
  Trash2,
  Clock,
  ShieldCheck,
  History,
  CheckCircle2,
  FileCheck,
  Loader2,
  AlertTriangle,
  Terminal,
} from "lucide-react";
import { formatDate, formatBytes } from "../lib/utils";
import { useAppStore } from "../stores/useAppStore";
import { useSnackbar } from "../hooks/useSnackbar";
import { JobDetailsModal } from "../components/common/JobDetailsModal";

export interface DocumentDetailPageProps {
  document?: StoredDocument;
  onBack?: () => void;
  onDeleteDocument?: (id: string) => void;
}

export function DocumentDetailPage({ document: propDoc, onBack, onDeleteDocument }: DocumentDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { documents, jobs, loadJobResult, removeDocument, updateObligationStatus } = useAppStore();
  const { info, success, error: errorSnackbar } = useSnackbar();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Look up doc from props, or find by id/jobId in store
  const document = useMemo(() => {
    if (propDoc) return propDoc;
    return documents.find((d) => d.id === id || d.jobId === id);
  }, [propDoc, documents, id]);

  const matchingJob = useMemo(() => {
    const targetId = document?.jobId || id;
    return jobs.find((j) => j.jobId === targetId);
  }, [jobs, document, id]);


  // If not in store but an id is in the URL, fetch it dynamically from backend!
  useEffect(() => {
    if (!document && id) {
      setIsLoading(true);
      loadJobResult(id)
        .catch((err) => {
          console.error("Failed to load document result:", err);
          errorSnackbar("Could not load document result from server", "Document Not Found");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [document, id, loadJobResult]);

  const handleStatusChange = (docId: string, obId: string, status: ObligationStatus) => {
    updateObligationStatus(docId, obId, status);
    info(`Obligation ${obId} status updated to ${status}`, "Status Updated");
  };

  const handleBack = () => {
    if (onBack) onBack();
    navigate("/library");
  };

  const handleDelete = () => {
    if (!document) return;
    if (onDeleteDocument) {
      onDeleteDocument(document.id);
    } else {
      removeDocument(document.id, document.jobId);
      success("Document removed from library", "Document Deleted");
    }
    setIsDeleteModalOpen(false);
    navigate("/library");
  };

  if (isLoading) {
    return (
      <div className="p-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-xl mx-auto my-12">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Loading Document Obligations</h3>
        <p className="text-xs text-slate-500">Retrieving extracted compliance metadata from backend repository...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Document Not Found</h3>
        <p className="text-xs text-slate-500">
          The requested document or job ID <code className="font-mono text-rose-500">{id}</code> could not be found in active memory or database storage.
        </p>
        <Button variant="outline" size="sm" onClick={handleBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Return to Document Library
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="text-xs font-semibold text-slate-600 dark:text-slate-300"
        >
          Back to Document Library
        </Button>

        <div className="flex items-center gap-2">
          {(matchingJob || document.jobId) && (
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsJobModalOpen(true)}
              leftIcon={<Terminal className="w-4 h-4 text-blue-500" />}
            >
              Job Telemetry
            </Button>
          )}

          <ExportButtons document={document} size="md" dropdownPosition="down" />

          <Button
            variant="danger"
            size="md"
            onClick={() => setIsDeleteModalOpen(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete Document
          </Button>
        </div>
      </div>

      {/* Backend Extraction Warnings Banner */}
      {document.rawResponse?.warnings && document.rawResponse.warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>AI Verification & Extraction Notices ({document.rawResponse.warnings.length})</span>
          </div>
          <ul className="space-y-1 list-disc list-inside text-xs text-amber-700 dark:text-amber-300">
            {document.rawResponse.warnings.map((w, idx) => (
              <li key={idx} className="font-mono text-[11px] leading-relaxed">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary Header Card */}
      <Card>
        <CardHeader className="py-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {document.documentId}
                </span>
                <Badge variant="blue" size="md">
                  {document.obligations.length} Extracted Obligations
                </Badge>
              </div>

              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {document.documentTitle}
              </h1>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Entity: <strong>{document.entity}</strong></span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {/* Metadata Pills Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Extracted Date</span>
              <span className="text-slate-900 dark:text-slate-200 font-semibold">{formatDate(document.extractedAt)}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase">LLM Model / Provider</span>
              <span className="text-slate-900 dark:text-slate-200 font-semibold">{document.rawResponse?.metadata?.model || "GEMINI"}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Processing Time</span>
              <span className="text-slate-900 dark:text-slate-200 font-semibold">{document.rawResponse?.processingTime || 0} ms</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Page Count</span>
              <span className="text-slate-900 dark:text-slate-200 font-semibold">{document.rawResponse?.metadata?.pages || "N/A"} Pages</span>
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Summary & Scope</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              {document.documentDescription}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Obligations Data Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Compliance Obligations Table
          </h2>
        </div>

        <ObligationTable
          obligations={document.obligations}
          docId={document.id}
          onStatusChange={(dId, obId, st) => handleStatusChange(dId, obId, st)}
        />
      </div>

      {/* Activity Timeline Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Document Activity Timeline
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 text-xs">
          <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-4 font-mono">
            <div className="relative">
              <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Document Extracted via Apache PDFBox & LLM</span>
                <span className="text-[10px] text-slate-400">{formatDate(document.extractedAt)}</span>
              </div>
              <p className="text-slate-500 font-sans text-[11px] mt-0.5">
                Successfully extracted {document.obligations.length} statutory obligations.
              </p>
            </div>

            <div className="relative">
              <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Compliance Audit Initialized</span>
                <span className="text-[10px] text-slate-400">Active</span>
              </div>
              <p className="text-slate-500 font-sans text-[11px] mt-0.5">
                Obligation statuses assigned to responsible entity owners.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Document & Records"
        variant="danger"
        confirmText="Delete Permanently"
        cancelText="Keep Document"
        description={`Are you sure you want to permanently delete document ${document.documentId} (${document.documentTitle})?`}
      >
        <div className="p-2.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-[11px] text-rose-800 dark:text-rose-300">
          This will delete all <strong>{document.obligations.length} obligations</strong> and remove all associated compliance metadata from persistent storage.
        </div>
      </ConfirmModal>

      {/* Job Telemetry Modal */}
      {isJobModalOpen && (
        <JobDetailsModal
          job={
            matchingJob || {
              jobId: document.jobId || document.id,
              tenantId: "default",
              originalFilename: document.fileName || document.documentTitle,
              contentType: "application/pdf",
              sizeBytes: document.fileSize || 0,
              pageCount: document.rawResponse?.metadata?.pages || null,
              status: document.status || "COMPLETED",
              instruction: null,
              language: "source",
              requestedProvider: document.llmProvider || document.rawResponse?.provider || null,
              requestedModel: document.llmModel || document.rawResponse?.model || null,
              createdAt: document.extractedAt,
              completedAt: document.extractedAt,
              resultAvailable: true,
            }
          }
          onClose={() => setIsJobModalOpen(false)}
        />
      )}
    </div>
  );
}
