import React from "react";
import { cn } from "../../lib/utils";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200 dark:bg-slate-800", className)}
      {...props}
    />
  );
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  headline: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  headline,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 my-4",
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-4 shadow-2xs">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{headline}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-5 leading-relaxed">
        {description}
      </p>
      <div className="flex items-center gap-3">
        {secondaryAction && (
          <Button variant="outline" size="sm" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
        {primaryAction && (
          <Button variant="primary" size="sm" onClick={primaryAction.onClick} leftIcon={primaryAction.icon}>
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

export interface ErrorPanelProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorPanel({
  title = "Extraction Error",
  message,
  details,
  onRetry,
  className,
}: ErrorPanelProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div
      className={cn(
        "p-4 rounded-xl border border-red-200 bg-red-50/80 dark:bg-red-950/30 dark:border-red-900/50 text-red-900 dark:text-red-200 shadow-xs",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-xs">
          <h4 className="font-semibold text-sm text-red-900 dark:text-red-200">{title}</h4>
          <p className="mt-1 text-red-700 dark:text-red-300 leading-relaxed">{message}</p>

          {details && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-[11px] font-medium text-red-700 dark:text-red-300 underline hover:text-red-900 focus:outline-none cursor-pointer"
              >
                {showDetails ? "Hide technical stack trace" : "Show technical details"}
              </button>

              {showDetails && (
                <pre className="mt-2 p-3 bg-red-900/10 dark:bg-red-950/80 border border-red-200 dark:border-red-900/60 rounded-md text-[10px] font-mono whitespace-pre-wrap break-all overflow-x-auto text-red-800 dark:text-red-300 max-h-40">
                  {details}
                </pre>
              )}
            </div>
          )}
        </div>

        {onRetry && (
          <Button
            variant="danger"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
