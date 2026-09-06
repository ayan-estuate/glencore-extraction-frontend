import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StatsCards } from "../components/dashboard/StatsCards";
import { LiveExtractionPipelineCard } from "../components/dashboard/LiveExtractionPipelineCard";
import { ObligationsByStatusCard } from "../components/dashboard/ObligationsByStatusCard";
import { RecentExtractionsTable } from "../components/dashboard/RecentExtractionsTable";
import { UpcomingObligationsCard } from "../components/dashboard/UpcomingObligationsCard";
import { ComplianceOverviewTrend } from "../components/dashboard/ComplianceOverviewTrend";
import { StoredDocument } from "../types/api";
import { NavTab } from "../components/layout/Sidebar";
import { useDocuments } from "../hooks/useDocuments";

export interface DashboardPageProps {
  onNavigateTab?: (tab: NavTab) => void;
  onSelectDocument?: (doc: StoredDocument) => void;
}

export function DashboardPage({ onNavigateTab, onSelectDocument }: DashboardPageProps) {
  const navigate = useNavigate();
  const { allDocuments, fetchJobs } = useDocuments();

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleNavTab = (tab: NavTab) => {
    if (onNavigateTab) onNavigateTab(tab);
    navigate(`/${tab}`);
  };

  const handleSelectDoc = (doc: StoredDocument) => {
    if (onSelectDocument) onSelectDocument(doc);
    navigate(`/library/${doc.id || doc.jobId}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-8">
      {/* 1. Top 5 Summary Metrics Cards */}
      <StatsCards />

      {/* 2. Middle Grid: Live Extraction Pipeline (Left) & Obligations By Status Donut Chart (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <div className="xl:col-span-7 flex flex-col">
          <LiveExtractionPipelineCard onViewLogs={() => handleNavTab("upload")} />
        </div>
        <div className="xl:col-span-5 flex flex-col">
          <ObligationsByStatusCard />
        </div>
      </div>

      {/* 3. Middle-Lower Grid: Recent Extractions Table (Left) & Upcoming Obligations List (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <div className="xl:col-span-7 flex flex-col">
          <RecentExtractionsTable
            documents={allDocuments}
            onViewDetail={handleSelectDoc}
            onViewAll={() => handleNavTab("library")}
          />
        </div>
        <div className="xl:col-span-5 flex flex-col">
          <UpcomingObligationsCard onViewAll={() => handleNavTab("obligations")} />
        </div>
      </div>

      {/* 4. Bottom Grid: Compliance Overview Stats & Score Trend Line Chart & Donut Gauge */}
      <ComplianceOverviewTrend />
    </div>
  );
}
