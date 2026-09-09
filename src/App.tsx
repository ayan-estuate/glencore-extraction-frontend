import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { DashboardPage } from "./pages/DashboardPage";
import { UploadPage } from "./pages/UploadPage";
import { LibraryPage } from "./pages/LibraryPage";
import { DocumentDetailPage } from "./pages/DocumentDetailPage";
import { ObligationsPage } from "./pages/ObligationsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SnackbarProvider } from "./components/common/SnackbarProvider";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

export function AppContent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
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
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/library/:id" element={<DocumentDetailPage />} />
            <Route path="/obligations" element={<ObligationsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/reports" element={<Navigate to="/analytics" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
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
