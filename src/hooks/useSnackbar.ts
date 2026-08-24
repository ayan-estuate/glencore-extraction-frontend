import { useSnackbarStore, SnackbarSeverity } from "../stores/useSnackbarStore";

export function useSnackbar() {
  const { showSnackbar, hideSnackbar, success, error, warning, info } = useSnackbarStore();

  return {
    showSnackbar,
    hideSnackbar,
    success,
    error,
    warning,
    info,
    // Convenience alias method
    toast: (message: string, tone: SnackbarSeverity = "info", title?: string, duration?: number) => {
      return showSnackbar({ message, severity: tone, title, duration });
    },
  };
}
