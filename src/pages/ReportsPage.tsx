import React, { useState } from "react";
import { FileSpreadsheet, Download, FileText, CheckCircle2, ShieldCheck, Printer, Code } from "lucide-react";
import { useAppStore } from "../stores/useAppStore";
import { exportDocumentToPdf, exportDocumentToExcel, exportDocumentToDocx, exportDocumentToJson } from "../lib/export";

export function ReportsPage() {
  const { documents } = useAppStore();
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const primaryDoc = documents[0];

  const handleExport = (type: "pdf" | "excel" | "docx" | "json") => {
    if (!primaryDoc) return;
    try {
      if (type === "pdf") exportDocumentToPdf(primaryDoc);
      else if (type === "excel") exportDocumentToExcel(primaryDoc);
      else if (type === "docx") exportDocumentToDocx(primaryDoc);
      else if (type === "json") exportDocumentToJson(primaryDoc);

      setDownloadSuccess(`Exported compliance report as .${type.toUpperCase()}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (e) {
      console.error("Export error:", e);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Title */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-rose-500" />
          Compliance Auditing & Reports Export
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Generate official statutory compliance reports in executive PDF, Excel matrix, Word memo, or raw structured JSON formats.
        </p>
      </div>

      {downloadSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Report Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Executive PDF Report Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 border border-red-200/60 dark:border-red-900/50 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Executive PDF Audit Report</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Formatted PDF document ready for EPA/Environment Agency submission.</p>
            </div>
          </div>
          <button
            onClick={() => handleExport("pdf")}
            className="w-full py-2.5 rounded-xl bg-[#e11d48] hover:bg-rose-600 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-rose-950/20"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Download PDF</span>
          </button>
        </div>

        {/* Excel Matrix Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">XLSX Obligations Spreadsheet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Multi-tab Excel sheet with metadata, owner matrices, and due dates.</p>
            </div>
          </div>
          <button
            onClick={() => handleExport("excel")}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-emerald-950/20"
          >
            <Download className="w-4 h-4" />
            <span>Export XLSX Spreadsheet</span>
          </button>
        </div>

        {/* Word Document Memo Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Word (.DOCX) Compliance Memorandum</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Editable Word doc for internal legal review and EHS committee notes.</p>
            </div>
          </div>
          <button
            onClick={() => handleExport("docx")}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-blue-950/20"
          >
            <Download className="w-4 h-4" />
            <span>Export DOCX Document</span>
          </button>
        </div>

        {/* JSON API Payload Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/50 flex items-center justify-center shrink-0">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Raw Structured JSON Export</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Standard compliance schema payload for ERP & webhook integration.</p>
            </div>
          </div>
          <button
            onClick={() => handleExport("json")}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-purple-950/20"
          >
            <Download className="w-4 h-4" />
            <span>Download Structured JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}
