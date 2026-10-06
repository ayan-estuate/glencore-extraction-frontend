import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { useDocuments } from "../hooks/useDocuments";

// The backend uses the literal "missing" for values it could not find. Never show it as data.
const hasValue = (v?: string | null) => !!v && v.trim() !== "" && v.trim().toLowerCase() !== "missing";

/** The organisations named in extracted documents, with the documents and obligations tied to each. */
export function EntitiesPage() {
  const { allDocuments, fetchJobs } = useDocuments();

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const entities = useMemo(() => {
    const byName = new Map<string, { name: string; docs: typeof allDocuments; obligations: number; latest: string }>();
    for (const d of allDocuments) {
      if (!hasValue(d.entity)) continue;
      const key = d.entity.trim().toLowerCase();
      const cur = byName.get(key) ?? { name: d.entity.trim(), docs: [], obligations: 0, latest: "" };
      cur.docs = [...cur.docs, d];
      cur.obligations += d.obligations.length;
      if (d.extractedAt > cur.latest) cur.latest = d.extractedAt;
      byName.set(key, cur);
    }
    return [...byName.values()].sort((a, b) => b.obligations - a.obligations);
  }, [allDocuments]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <div className="text-xs text-slate-500 mb-1">Entities & Metadata</div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
          <Users className="w-6 h-6 text-slate-500" />
          Entities & Metadata
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Organisations found in your extracted documents, and the obligations tied to each.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        {entities.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No entities yet. They appear here once documents have been extracted.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2.5 font-semibold">Entity</th>
                <th className="px-4 py-2.5 font-semibold">Documents</th>
                <th className="px-4 py-2.5 font-semibold">Obligations</th>
                <th className="px-4 py-2.5 font-semibold hidden md:table-cell">Last extracted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {entities.map((e) => (
                <tr key={e.name} className="align-top">
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{e.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {e.docs.map((d) => (
                        <Link
                          key={d.id}
                          to={`/library/${d.id}`}
                          className="text-blue-600 hover:underline truncate max-w-[320px]"
                        >
                          {hasValue(d.documentTitle) ? d.documentTitle : d.fileName ?? d.id}
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">{e.obligations}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-500 whitespace-nowrap">
                    {e.latest ? new Date(e.latest).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
