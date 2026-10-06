import React from "react";
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  ListChecks,
  Table2,
  Users,
  ClipboardCheck,
  BarChart3,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAppStore } from "../../stores/useAppStore";
import { useJobTrackerStore, selectUnfinishedCount } from "../../stores/useJobTrackerStore";

export type NavTab =
  | "dashboard"
  | "upload"
  | "library"
  | "jobs"
  | "obligations"
  | "entities"
  | "review"
  | "analytics"
  | "settings";

export interface SidebarProps {
  activeTab?: NavTab;
  setActiveTab?: (tab: NavTab) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: NavTab | "admin";
  label: string;
  icon: React.ElementType;
  to: string;
}

interface NavSection {
  heading?: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  { items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" }] },
  {
    heading: "Document Intelligence",
    items: [
      { id: "upload", label: "Upload & Extract", icon: UploadCloud, to: "/upload" },
      { id: "library", label: "Document Library", icon: FileText, to: "/library" },
      { id: "jobs", label: "Extraction Jobs", icon: ListChecks, to: "/jobs" },
    ],
  },
  {
    heading: "Compliance",
    items: [
      { id: "obligations", label: "Obligations Matrix", icon: Table2, to: "/obligations" },
      { id: "entities", label: "Entities & Metadata", icon: Users, to: "/entities" },
      { id: "review", label: "Review & Validation", icon: ClipboardCheck, to: "/review" },
    ],
  },
  { heading: "Insights", items: [{ id: "analytics", label: "Analytics & Reports", icon: BarChart3, to: "/analytics" }] },
];

export function Sidebar({ activeTab, setActiveTab, isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const adminRole = useAppStore((state) => state.adminRole);
  const runningJobs = useJobTrackerStore(selectUnfinishedCount);

  const path = location.pathname.toLowerCase();
  const currentTab: NavTab | "admin" = React.useMemo(() => {
    if (activeTab) return activeTab;
    if (path.startsWith("/admin")) return "admin";
    if (path.startsWith("/upload")) return "upload";
    if (path.startsWith("/jobs")) return "jobs";
    if (path.startsWith("/library")) return "library";
    if (path.startsWith("/obligations")) return "obligations";
    if (path.startsWith("/entities")) return "entities";
    if (path.startsWith("/review")) return "review";
    if (path.startsWith("/analytics") || path.startsWith("/reports")) return "analytics";
    if (path.startsWith("/settings")) return "settings";
    return "dashboard";
  }, [activeTab, path]);

  const go = (item: NavItem) => {
    if (setActiveTab && item.id !== "admin") setActiveTab(item.id);
    navigate(item.to);
    if (onCloseMobile) onCloseMobile();
  };

  const adminItems: NavItem[] = [
    { id: "settings", label: "Settings & Health", icon: Settings, to: "/settings" },
    ...(adminRole ? [{ id: "admin" as const, label: "Admin Console", icon: ShieldCheck, to: "/admin/tenants" }] : []),
  ];
  const sections: NavSection[] = [...SECTIONS, { heading: "Administration", items: adminItems }];

  return (
    <>
      {isMobileOpen && (
        <div onClick={onCloseMobile} className="fixed inset-0 top-16 bg-slate-950/60 z-40 lg:hidden animate-in fade-in duration-200" />
      )}

      <aside
        className={cn(
          "w-[230px] bg-[#f5f7fa] dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 select-none font-sans",
          "fixed top-16 left-0 h-[calc(100vh-4rem)] z-40 transition-transform duration-200 lg:sticky lg:translate-x-0",
          isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-none">
          {sections.map((section, i) => (
            <div key={section.heading ?? `s${i}`} className={cn(i > 0 && "mt-5")}>
              {section.heading && (
                <div className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  {section.heading}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item)}
                    className={cn(
                      "w-full flex items-center gap-3.5 pl-6 pr-4 h-10 text-sm text-left transition-colors cursor-pointer relative",
                      isActive
                        ? "bg-[#fde9ec] dark:bg-rose-950/40 text-[#d0021b] dark:text-rose-300 font-semibold"
                        : "text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                    )}
                  >
                    {isActive && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#d0021b]" />}
                    <Icon className={cn("w-[18px] h-[18px] shrink-0", isActive ? "text-[#d0021b] dark:text-rose-300" : "text-slate-600 dark:text-slate-400")} />
                    <span className="truncate flex-1">{item.label}</span>
                    {item.id === "jobs" && runningJobs > 0 && (
                      <span
                        title={`${runningJobs} extraction${runningJobs > 1 ? "s" : ""} in progress`}
                        className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse"
                      >
                        {runningJobs}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

      </aside>
    </>
  );
}
