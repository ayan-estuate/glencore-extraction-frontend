import React from "react";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { ObligationStatus, StoredDocument } from "../../types/api";
import { ObligationTable } from "../documents/ObligationTable";
import { ExportButtons } from "../exports/ExportButtons";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useAppStore } from "../../stores/useAppStore";
import { useSnackbar } from "../../hooks/useSnackbar";

// The backend uses the literal "missing" (and apiClient a "default" placeholder) for values it
// could not find. Never display those as data.
const hasValue = (v?: string | null) =>
  !!v && v.trim() !== "" && v.trim().toLowerCase() !== "missing" && v !== "default";

interface ExtractionResultProps {
  document: StoredDocument;
  onOpenInLibrary: () => void;
}

/** The outcome of one finished extraction: honest banner, document summary, obligations. */
export function ExtractionResult({ document, onOpenInLibrary }: ExtractionResultProps) {
  const updateObligationStatus = useAppStore((s) => s.updateObligationStatus);
  const { info } = useSnackbar();
  const complete = document.status === "COMPLETED";
  const count = document.obligations.length;

  const handleStatusChange = (docId: string, obId: string, status: ObligationStatus) => {
    updateObligationStatus(docId, obId, status);
    info(`Obligation status updated to ${status}`, "Status Updated");
  };

  return (
    <div className="space-y-6">
      {complete ? (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold">Extraction Complete</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                {count > 0
                  ? `Successfully parsed ${count} compliance obligations. Document saved to library.`
                  : "Processing finished, but no obligations were found in this document."}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onOpenInLibrary} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Open in Library
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">Extraction Incomplete</h3>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Some parts of the document could not be processed. {count} obligation(s) were found. See the
              processing details above for why.
            </p>
          </div>
        </div>
      )}

      {(complete || count > 0) && (
        <>
          <Card>
            <CardHeader className="py-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {hasValue(document.documentId) && (
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {document.documentId}
                      </span>
                    )}
                    <Badge variant="emerald" size="sm">
                      {count} Obligations
                    </Badge>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {hasValue(document.documentTitle) ? document.documentTitle : document.fileName}
                  </h2>
                </div>
                <ExportButtons document={document} size="md" dropdownPosition="down" />
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                {hasValue(document.entity) && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400">
                      Entity: <strong className="text-slate-900 dark:text-slate-200 font-medium">{document.entity}</strong>
                    </span>
                  </div>
                )}
                {!!document.rawResponse?.processingTime && (
                  <div className="flex items-center gap-2 font-mono">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400">
                      Processing Time:{" "}
                      <strong className="text-slate-900 dark:text-slate-200">{document.rawResponse.processingTime} ms</strong>
                    </span>
                  </div>
                )}
                {hasValue(document.rawResponse?.model) && (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400">
                      Model:{" "}
                      <strong className="text-slate-900 dark:text-slate-200 font-mono">{document.rawResponse?.model}</strong>
                    </span>
                  </div>
                )}
              </div>
              {hasValue(document.documentDescription) && (
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{document.documentDescription}</p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Extracted Obligations List
            </h3>
            <ObligationTable
              obligations={document.obligations}
              docId={document.id}
              onStatusChange={(dId, obId, st) => handleStatusChange(dId, obId, st)}
            />
          </div>
        </>
      )}
    </div>
  );
}
