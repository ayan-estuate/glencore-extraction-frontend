import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { StoredDocument } from "../../types/api";
import { exportBulkToJson, exportBulkToExcel } from "../../lib/export";
import { FileSpreadsheet, FileJson, Download, CheckSquare } from "lucide-react";

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocuments: StoredDocument[];
}

export function ExportDialog({ isOpen, onClose, selectedDocuments }: ExportDialogProps) {
  const [format, setFormat] = useState<"excel" | "json">("excel");

  const handleExport = () => {
    if (format === "excel") {
      exportBulkToExcel(selectedDocuments);
    } else {
      exportBulkToJson(selectedDocuments);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Document Export"
      description={`Exporting ${selectedDocuments.length} compliance documents from your library.`}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleExport} leftIcon={<Download className="w-4 h-4" />}>
            Export {selectedDocuments.length} Documents
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
          Select Export Format
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormat("excel")}
            className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
              format === "excel"
                ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Excel Workbook (.xlsx)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Multi-sheet workbook containing all documents and consolidated obligations.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFormat("json")}
            className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
              format === "json"
                ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <FileJson className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">JSON Payload (.json)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Structured array containing full API metadata and typed response fields.
              </p>
            </div>
          </button>
        </div>

        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-blue-500" />
            Selected Documents Included:
          </div>
          <ul className="list-disc pl-5 text-[11px] text-slate-500 dark:text-slate-400 max-h-24 overflow-y-auto space-y-0.5">
            {selectedDocuments.map((d) => (
              <li key={d.id} className="truncate">
                <span className="font-mono text-slate-700 dark:text-slate-300">{d.documentId}</span> — {d.documentTitle}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
