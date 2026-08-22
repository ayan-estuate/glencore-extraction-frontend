import React, { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { useSnackbarStore, SnackbarSeverity } from "../../stores/useSnackbarStore";

const toneMap: Record<
  SnackbarSeverity,
  {
    icon: typeof CheckCircle2;
    accentLight: string;
    accentDark: string;
    borderLight: string;
    borderDark: string;
    bgLight: string;
    bgDark: string;
    title: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    accentLight: "#059669",
    accentDark: "#10b981",
    borderLight: "#a7f3d0",
    borderDark: "rgba(16, 185, 129, 0.4)",
    bgLight: "linear-gradient(135deg, rgba(236, 253, 245, 0.98), rgba(255, 255, 255, 0.98))",
    bgDark: "linear-gradient(135deg, rgba(6, 78, 59, 0.85), rgba(15, 23, 42, 0.96))",
    title: "Success",
  },
  error: {
    icon: AlertTriangle,
    accentLight: "#e11d48",
    accentDark: "#f43f5e",
    borderLight: "#fecdd3",
    borderDark: "rgba(244, 63, 94, 0.4)",
    bgLight: "linear-gradient(135deg, rgba(255, 241, 242, 0.98), rgba(255, 255, 255, 0.98))",
    bgDark: "linear-gradient(135deg, rgba(136, 19, 55, 0.85), rgba(15, 23, 42, 0.96))",
    title: "Error",
  },
  warning: {
    icon: AlertCircle,
    accentLight: "#d97706",
    accentDark: "#fbbf24",
    borderLight: "#fde68a",
    borderDark: "rgba(251, 191, 36, 0.4)",
    bgLight: "linear-gradient(135deg, rgba(254, 252, 232, 0.98), rgba(255, 255, 255, 0.98))",
    bgDark: "linear-gradient(135deg, rgba(120, 53, 15, 0.85), rgba(15, 23, 42, 0.96))",
    title: "Warning",
  },
  info: {
    icon: Info,
    accentLight: "#2563eb",
    accentDark: "#60a5fa",
    borderLight: "#bfdbfe",
    borderDark: "rgba(96, 165, 250, 0.4)",
    bgLight: "linear-gradient(135deg, rgba(239, 246, 255, 0.98), rgba(255, 255, 255, 0.98))",
    bgDark: "linear-gradient(135deg, rgba(30, 58, 138, 0.85), rgba(15, 23, 42, 0.96))",
    title: "Info",
  },
};

export function SnackbarProvider({ children }: { children?: ReactNode }) {
  const { snackbars, hideSnackbar } = useSnackbarStore();

  return (
    <>
      {children}

      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[9999] flex flex-col gap-3 w-full max-w-[calc(100vw-32px)] sm:max-w-[420px] pointer-events-none"
      >
        {snackbars.map((item) => {
          const tone = toneMap[item.severity] || toneMap.info;
          const Icon = tone.icon;
          const duration = item.duration ?? 4000;

          return (
            <div
              key={item.id}
              className="pointer-events-auto overflow-hidden rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-3"
              style={{
                borderColor: "var(--snackbar-border, " + tone.borderLight + ")",
                background: "var(--snackbar-bg, " + tone.bgLight + ")",
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
              }}
            >
              {/* Dark mode CSS custom variables trick */}
              <style>{`
                .dark [data-snackbar-id="${item.id}"] {
                  --snackbar-border: ${tone.borderDark};
                  --snackbar-bg: ${tone.bgDark};
                  --snackbar-accent: ${tone.accentDark};
                }
                [data-snackbar-id="${item.id}"] {
                  --snackbar-border: ${tone.borderLight};
                  --snackbar-bg: ${tone.bgLight};
                  --snackbar-accent: ${tone.accentLight};
                }
              `}</style>

              <div
                data-snackbar-id={item.id}
                className="flex items-start gap-3 p-3.5 sm:p-4"
              >
                {/* Icon Container */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors"
                  style={{
                    backgroundColor: `var(--snackbar-accent, ${tone.accentLight})1A`,
                    color: `var(--snackbar-accent, ${tone.accentLight})`,
                  }}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <p
                    className="text-xs font-bold tracking-tight"
                    style={{ color: `var(--snackbar-accent, ${tone.accentLight})` }}
                  >
                    {item.title || tone.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                    {item.message}
                  </p>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => hideSnackbar(item.id)}
                  aria-label="Dismiss notification"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Shrinking progress timer bar */}
              {duration > 0 && (
                <div
                  className="h-1 w-full"
                  style={{
                    backgroundColor: `var(--snackbar-accent, ${tone.accentLight})20`,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: "100%",
                      backgroundColor: `var(--snackbar-accent, ${tone.accentLight})`,
                      transformOrigin: "left center",
                      animation: `snackbar-shrink ${duration}ms linear forwards`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
