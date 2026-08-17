import { create } from "zustand";

export type SnackbarSeverity = "success" | "error" | "warning" | "info";

export interface SnackbarItem {
  id: string;
  severity: SnackbarSeverity;
  title?: string;
  message: string;
  duration?: number;
}

interface SnackbarStore {
  snackbars: SnackbarItem[];
  showSnackbar: (input: {
    message: string;
    severity?: SnackbarSeverity;
    title?: string;
    duration?: number;
  }) => string;
  hideSnackbar: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => string;
  error: (message: string, title?: string, duration?: number) => string;
  warning: (message: string, title?: string, duration?: number) => string;
  info: (message: string, title?: string, duration?: number) => string;
}

export const useSnackbarStore = create<SnackbarStore>((set) => ({
  snackbars: [],

  showSnackbar: ({ message, severity = "info", title, duration = 4000 }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newSnackbar: SnackbarItem = { id, severity, title, message, duration };

    set((state) => ({
      // Keep up to 5 snackbars at a time
      snackbars: [...state.snackbars.slice(-4), newSnackbar],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          snackbars: state.snackbars.filter((item) => item.id !== id),
        }));
      }, duration);
    }

    return id;
  },

  hideSnackbar: (id: string) => {
    set((state) => ({
      snackbars: state.snackbars.filter((item) => item.id !== id),
    }));
  },

  success: (message, title, duration) => {
    return useSnackbarStore.getState().showSnackbar({
      message,
      title,
      severity: "success",
      duration,
    });
  },

  error: (message, title, duration) => {
    return useSnackbarStore.getState().showSnackbar({
      message,
      title,
      severity: "error",
      duration,
    });
  },

  warning: (message, title, duration) => {
    return useSnackbarStore.getState().showSnackbar({
      message,
      title,
      severity: "warning",
      duration,
    });
  },

  info: (message, title, duration) => {
    return useSnackbarStore.getState().showSnackbar({
      message,
      title,
      severity: "info",
      duration,
    });
  },
}));
