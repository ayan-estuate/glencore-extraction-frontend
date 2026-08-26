import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  FileText,
  AlertTriangle,
  X,
  ArrowUp,
  CheckCircle2,
} from "lucide-react";
import { formatBytes, cn } from "../../lib/utils";

export interface FileUploadProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (aligned with backend spring.servlet.multipart & app.storage)

export function FileUpload({ file, onFileSelect, disabled = false }: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, fileRejections, open } =
    useDropzone({
      onDrop,
      accept: {
        "application/pdf": [".pdf"],
      },
      maxSize: MAX_FILE_SIZE,
      multiple: false,
      disabled,
      noClick: Boolean(file),
    } as any);

  const rejectionError = fileRejections[0]?.errors[0];

  return (
    <div className="w-full space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "w-full rounded-3xl border-2 border-dashed transition-all duration-200 p-8 sm:p-12 text-center flex flex-col items-center justify-center relative shadow-2xs",
          isDragActive
            ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 scale-[0.99]"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600",
          isDragReject && "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <input {...getInputProps()} />

        {!file ? (
          <>
            {/* Center Circular Icon with Document + Upward Arrow */}
            <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center mb-4 shadow-2xs transition-transform hover:scale-105">
              <div className="relative flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-blue-600 dark:text-blue-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div className="absolute inset-0 m-auto mt-2 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xs">
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Main Headings */}
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Drag & drop your compliance PDF document
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg leading-relaxed">
              Upload environmental permits, licences, agreements, or statutory notices.
            </p>

            <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-1">
              Maximum file size: <strong className="font-bold text-slate-800 dark:text-slate-200">100 MB</strong>
            </span>

            {/* Big Blue Browse Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              className="mt-5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Browse PDF Files</span>
            </button>

            {/* Helper Text */}
            <span className="text-[11px] text-slate-400 mt-2.5 block">
              or drag and drop files here
            </span>
          </>
        ) : (
          /* Staged File View */
          <div className="w-full max-w-xl p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between gap-4 my-2">
            <div className="flex items-center gap-3.5 min-w-0 text-left">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {file.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  <span>{formatBytes(file.size)}</span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 font-sans">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Staged & Ready
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs transition-colors"
              >
                Change File
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onFileSelect(null);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Supported Formats Pill Bar */}
        <div className="w-full pt-8 mt-8 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1 select-none">
            Supported formats:
          </span>

          <span className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-2xs">
            <span className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold text-[10px] font-mono">
              PDF
            </span>
            <span>(Recommended)</span>
          </span>

          <span className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
            Regulatory Permits
          </span>

          <span className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
            Environmental Approvals
          </span>

          <span className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
            Licences & Agreements
          </span>

          <span className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
            Statutory Notices
          </span>
        </div>
      </div>

      {rejectionError && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {rejectionError.code === "file-too-large"
              ? "File exceeds the 100MB maximum backend limit. Please upload a PDF under 100MB."
              : rejectionError.code === "file-invalid-type"
              ? "Only PDF documents are accepted by the backend extraction pipeline."
              : rejectionError.message}
          </span>
        </div>
      )}
    </div>
  );
}
