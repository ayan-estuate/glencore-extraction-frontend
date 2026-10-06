import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { DashboardPage } from "./pages/DashboardPage";
import { UploadPage } from "./pages/UploadPage";
import { LibraryPage } from "./pages/LibraryPage";
import { DocumentDetailPage } from "./pages/DocumentDetailPage";
import { ObligationsPage } from "./pages/ObligationsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AdminTenantsPage } from "./pages/admin/AdminTenantsPage";
import { LoginPage } from "./pages/LoginPage";
import { RecoverKeyPage } from "./pages/RecoverKeyPage";
import { RecoverConfirmPage } from "./pages/RecoverConfirmPage";
import { RequireAdmin } from "./components/auth/RequireAdmin";
import { RequireAuth } from "./components/auth/RequireAuth";
import { SnackbarProvider } from "./components/common/SnackbarProvider";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { BackendStatusBanner } from "./components/common/BackendStatusBanner";
import { startJobTracker } from "./lib/jobTracker";

/**
 * The app chrome (Sidebar + Header) plus the auth gate, as a layout route —
 * everything except /login renders through here via <Outlet/>. Previously
 * Sidebar/Header rendered unconditionally around a single flat <Routes>
 * block; pulled into its own layout specifically so /login can render
 * standalone, without the app chrome, while every other route stays gated.
 */
/** Starts the background job poller once the user is signed in; renders nothing. */
function JobTrackerRunner() {
  useEffect(() => {
    startJobTracker();
  }, []);
  return null;
}

function ProtectedLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <RequireAuth>
      <JobTrackerRunner />
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070c18] text-slate-900 dark:text-slate-100 flex font-sans antialiased selection:bg-rose-500 selection:text-white">
        {/* Sidebar (Desktop Sticky + Mobile Drawer) */}
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Right Content Section */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header Bar */}
          <Header
            onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />

          {/* Dynamic Main Body Page View */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}

export function AppContent() {
  return (
    <>
      {/* Above the route tree, not inside ProtectedLayout — a backend
          outage matters on /login too (it would otherwise look like a
          sign-in attempt silently did nothing). */}
      <BackendStatusBanner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recover" element={<RecoverKeyPage />} />
        <Route path="/recover-confirm" element={<RecoverConfirmPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/:id" element={<DocumentDetailPage />} />
          <Route path="/obligations" element={<ObligationsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<Navigate to="/analytics" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/admin/tenants"
            element={
              <RequireAdmin>
                <AdminTenantsPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SnackbarProvider>
          <AppContent />
        </SnackbarProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
