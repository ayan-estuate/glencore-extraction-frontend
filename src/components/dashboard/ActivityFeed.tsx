import React from "react";
import { StoredDocument } from "../../types/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { FileText, ArrowRight, Sparkles, Building2 } from "lucide-react";
import { formatDate } from "../../lib/utils";

export interface ActivityFeedProps {
  documents: StoredDocument[];
  onViewDetail: (doc: StoredDocument) => void;
}

export function ActivityFeed({ documents, onViewDetail }: ActivityFeedProps) {
  const recentDocs = documents.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Extraction Runs</span>
          <span className="text-xs font-mono font-normal text-slate-500">
            Last {recentDocs.length} extractions
          </span>
        </CardTitle>
        <CardDescription>
          Audit log of recent PDF compliance processing runs and extracted obligations.
        </CardDescription>
      </CardHeader>

      <CardContent className="divide-y divide-slate-100 dark:divide-slate-800 p-0">
        {recentDocs.length > 0 ? (
          recentDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onViewDetail(doc)}
              className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>

                <div className="flex flex-col truncate space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      {doc.documentId}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      • {formatDate(doc.extractedAt)}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {doc.documentTitle}
                  </h4>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 truncate max-w-[180px]">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {doc.entity}
                    </span>
                    <span>•</span>
                    <span className="font-mono">{doc.obligations.length} Obligations</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="blue" size="sm" className="hidden sm:inline-flex">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {doc.rawResponse?.metadata?.provider || "GEMINI"}
                </Badge>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">
            No document activity recorded yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
