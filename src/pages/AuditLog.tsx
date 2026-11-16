import React, { useState, useEffect } from 'react';
import { COPY } from '../copy/en';
import { AuditLogEntry } from '../types';
import { getStoredAuditLogs } from '../lib/loans';
import {
  History,
  Search,
  ShieldCheck,
  User,
  Eye,
  FileCode,
  X,
} from 'lucide-react';

export const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [inspectEntry, setInspectEntry] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    setLogs(getStoredAuditLogs());
  }, []);

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase();
    const actor = log.actor_name?.toLowerCase() || '';
    const action = log.action.toLowerCase();
    const entityId = log.entity_id.toLowerCase();
    const matchesSearch = actor.includes(q) || action.includes(q) || entityId.includes(q);
    const matchesEntity = entityFilter === 'all' || log.entity === entityFilter;
    return matchesSearch && matchesEntity;
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">{COPY.nav.auditLog}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Immutable audit trail capturing every evaluation, weight version, parameter input, and approval decision.
        </p>
      </div>

      {/* Compliance Guarantee Banner */}
      <div className="p-4 rounded-xl bg-orange-soft border-2 border-orange-border text-navy flex items-start gap-3 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-orange shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-bold text-navy uppercase tracking-wider block">
            Regulatory Compliance & Immutability Guarantee
          </span>
          <p className="text-slate-600 leading-relaxed font-sans">
            Protected by PostgreSQL triggers and Row Level Security (RLS). Every state transition (evaluation draft &rarr; score calculation &rarr; equipment financing &rarr; approver decision) is recorded in an append-only ledger. Updates and deletions are structurally blocked.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card-warm p-4 bg-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by actor, action (e.g. approve), or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pl-9 text-xs"
            />
          </div>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="input-base text-xs max-w-[180px]"
          >
            <option value="all">All Entities</option>
            <option value="evaluations">Evaluations</option>
            <option value="loan_applications">Loan Applications</option>
            <option value="approvals">Approvals</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono font-bold">
          Showing {filtered.length} of {logs.length} audit trail records
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card-warm bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-[#FAF8F5] text-navy font-bold border-b border-orange-border/70">
              <tr>
                <th className="py-3 px-4 text-left">Timestamp</th>
                <th className="py-3 px-4 text-left">Actor</th>
                <th className="py-3 px-3 text-left">Action</th>
                <th className="py-3 px-3 text-left">Entity</th>
                <th className="py-3 px-4 text-left">Entity ID</th>
                <th className="py-3 px-4 text-left">Details Payload</th>
                <th className="py-3 px-3 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <span>No audit log records found.</span>
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => {
                  let actionBadge = 'bg-slate-100 text-slate-700';
                  if (entry.action.includes('create')) actionBadge = 'bg-blue-100 text-blue-800';
                  if (entry.action.includes('submit')) actionBadge = 'bg-purple-100 text-purple-800';
                  if (entry.action.includes('approve')) actionBadge = 'bg-emerald-100 text-emerald-800';
                  if (entry.action.includes('reject')) actionBadge = 'bg-red-100 text-red-800';

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => setInspectEntry(entry)}
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(entry.at).toLocaleString()}
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-navy">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{entry.actor_name || 'System / Batch'}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${actionBadge}`}>
                          {entry.action}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {entry.entity}
                      </td>

                      {/* Entity ID */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                        {entry.entity_id}
                      </td>

                      {/* Details Payload Preview */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[10px] max-w-xs truncate">
                        {JSON.stringify(entry.details)}
                      </td>

                      {/* Inspect */}
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectEntry(entry);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-navy hover:bg-slate-100"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal */}
      {inspectEntry && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-orange uppercase tracking-wider">
                  Audit Record #{inspectEntry.id}
                </span>
                <h3 className="text-base font-bold text-navy mt-0.5">
                  Action: {inspectEntry.action}
                </h3>
              </div>
              <button
                onClick={() => setInspectEntry(null)}
                className="p-1 rounded text-slate-400 hover:text-navy"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="font-mono text-slate-700">{new Date(inspectEntry.at).toISOString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Actor:</span>
                  <span className="font-bold text-navy">{inspectEntry.actor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Entity / ID:</span>
                  <span className="font-mono text-slate-700">{inspectEntry.entity} / {inspectEntry.entity_id}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-navy" />
                  Structured Details Payload (JSON):
                </span>
                <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed">
                  {JSON.stringify(inspectEntry.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setInspectEntry(null)}
                className="btn-outline text-xs py-1.5 px-4"
              >
                Close Audit Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
