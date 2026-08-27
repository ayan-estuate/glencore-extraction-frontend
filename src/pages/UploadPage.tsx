import React, { useState, useEffect } from "react";
import { useExtraction } from "../hooks/useExtraction";
import { ExtractionOptions, StoredDocument, ObligationStatus } from "../types/api";
import { FileUpload } from "../components/upload/FileUpload";
import { UploadForm } from "../components/upload/UploadForm";
import { LogPanel } from "../components/logs/LogPanel";
import { ObligationTable } from "../components/documents/ObligationTable";
import { ExportButtons } from "../components/exports/ExportButtons";
import { ErrorPanel } from "../components/ui/Skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  FileText,
  Building2,
  CheckCircle2,
  BookmarkCheck,
  ArrowRight,
  Sparkles,
  Clock,
  ShieldCheck,
  Home,
  ChevronRight,
  Shield,
  Lock,
} from "lucide-react";
import { API_CONFIG } from "../config/api.config";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../stores/useAppStore";
import { useSnackbar } from "../hooks/useSnackbar";

export interface UploadPageProps {
  onNavigateToLibrary?: () => void;
  onSelectDocument?: (doc: StoredDocument) => void;
}

export function UploadPage({ onNavigateToLibrary, onSelectDocument }: UploadPageProps) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<ExtractionOptions>({
    temperature: API_CONFIG.DEFAULT_OPTIONS.temperature,
    provider: API_CONFIG.DEFAULT_OPTIONS.provider,
    language: API_CONFIG.DEFAULT_OPTIONS.language,
  });

  const handleToLibrary = () => {
    if (onNavigateToLibrary) onNavigateToLibrary();
    navigate("/library");
  };

  const handleSelectDoc = (doc: StoredDocument) => {
    if (onSelectDocument) onSelectDocument(doc);
    navigate(`/library/${doc.id || doc.jobId}`);
  };

  const { extractDocument, isExtracting, error, lastStoredDocument, logStream } = useExtraction();
  const updateObligationStatus = useAppStore((state) => state.updateObligationStatus);
  const { success, error: errorSnackbar, info } = useSnackbar();

  const handleStartExtraction = () => {
    if (!file) return;
    info(`Starting compliance parsing for ${file.name}...`, "Extraction Initiated");
    extractDocument(file, options);
  };

  useEffect(() => {
    if (error) {
      errorSnackbar(error.message, `Extraction Error (${error.errorCode})`);
    }
  }, [error]);

  useEffect(() => {
    if (lastStoredDocument && !isExtracting) {
      success(
        `Parsed ${lastStoredDocument.obligations.length} statutory obligations from ${lastStoredDocument.documentId}`,
        "Extraction Complete"
      );
    }
  }, [lastStoredDocument, isExtracting]);

  const handleStatusChange = (docId: string, obId: string, status: ObligationStatus) => {
    updateObligationStatus(docId, obId, status);
    info(`Obligation status updated to ${status}`, "Status Updated");
  };


  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
        <span className="font-medium text-slate-700 dark:text-slate-300">Upload & Extract</span>
      </div>

      {/* Main Header with Actions / Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/70 dark:border-blue-800/70 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs shrink-0">
            <FileText className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              PDF Compliance Document Extraction Engine
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Upload regulatory and environmental permits, licences, or agreements to automatically parse statutory obligations using AI.
            </p>
          </div>
        </div>

        {/* 3 Badges */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-200/80 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold font-mono tracking-wider shadow-2xs">
            <Shield className="w-3.5 h-3.5" />
            <span>HIGH ACCURACY</span>
          </div>

          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold font-mono tracking-wider shadow-2xs">
            <Lock className="w-3.5 h-3.5" />
            <span>SECURE UPLOAD</span>
          </div>

          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-purple-200/80 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-bold font-mono tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI POWERED</span>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <FileUpload file={file} onFileSelect={setFile} disabled={isExtracting} />

      {/* Accordion & Action Button */}
      <UploadForm
        options={options}
        setOptions={setOptions}
        onExtract={handleStartExtraction}
        isExtracting={isExtracting}
        disabled={!file || isExtracting}
      />

      {/* Real-Time SSE Log Streaming Panel */}
      {(logStream.logs.length > 0 || isExtracting) && (
        <LogPanel
          logs={logStream.logs}
          isStreaming={isExtracting || logStream.isStreaming}
          stepInfo={logStream.stepInfo}
          onClear={logStream.clearLogs}
        />
      )}

      {/* Error Panel */}
      {error && (
        <ErrorPanel
          title={`Extraction Failed (${error.errorCode})`}
          message={error.message}
          details={error.details}
          onRetry={handleStartExtraction}
        />
      )}

      {/* Inline Extraction Results (Shown upon completion) */}
      {lastStoredDocument && !isExtracting && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold">Extraction Complete</h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Successfully parsed {lastStoredDocument.obligations.length} compliance obligations. Document saved to library.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToLibrary}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Go to Library
            </Button>
          </div>

          {/* Document Header Card */}
          <Card>
            <CardHeader className="py-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {lastStoredDocument.documentId}
                    </span>
                    <Badge variant="emerald" size="sm">
                      {lastStoredDocument.obligations.length} Obligations
                    </Badge>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {lastStoredDocument.documentTitle}
                  </h2>
                </div>

                <ExportButtons document={lastStoredDocument} size="md" dropdownPosition="down" />
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Entity: <strong className="text-slate-900 dark:text-slate-200 font-medium">{lastStoredDocument.entity}</strong></span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Processing Time: <strong className="text-slate-900 dark:text-slate-200">{lastStoredDocument.rawResponse?.processingTime || 0} ms</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Model: <strong className="text-slate-900 dark:text-slate-200 font-mono">{lastStoredDocument.rawResponse?.metadata?.model || options.provider}</strong></span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {lastStoredDocument.documentDescription}
              </p>
            </CardContent>
          </Card>

          {/* Extracted Obligations Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Extracted Obligations List
            </h3>
            <ObligationTable
              obligations={lastStoredDocument.obligations}
              docId={lastStoredDocument.id}
              onStatusChange={(dId, obId, st) => handleStatusChange(dId, obId, st)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
