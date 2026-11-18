import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { COPY } from '../copy/en';
import { Evaluation } from '../types';
import { getStoredEvaluations } from '../lib/evaluations';
import { formatKz, maskNationalId } from '../lib/money';
import { DEFAULT_SEGMENTS } from '../data/seedData';
import {
  ClipboardList,
  Search,
  Plus,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
} from 'lucide-react';
import { ScoreGauge } from '../components/ScoreGauge';
import { Modal } from '../components/Modal';

export const Evaluations: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [inspectEval, setInspectEval] = useState<Evaluation | null>(null);

  useEffect(() => {
    setEvaluations(getStoredEvaluations());
  }, []);

  const filtered = evaluations.filter((e) => {
    const custName = e.customer?.full_name?.toLowerCase() || '';
    const msisdn = e.customer?.msisdn?.toLowerCase() || '';
    const q = search.toLowerCase();
    const matchesSearch = custName.includes(q) || msisdn.includes(q) || e.id.toLowerCase().includes(q);
    const matchesSegment = selectedSegment === 'all' || e.segment_code === selectedSegment;
    return matchesSearch && matchesSegment;
  });

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">{COPY.nav.evaluations}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            History of customer credit evaluations, segment assignments, proxy scores, and credit limits.
          </p>
        </div>
        <Link
          to="/approver/instant-check"
          className="btn-primary text-xs flex items-center gap-1.5 py-2.5 px-4 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Credit Evaluation</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card-warm p-4 bg-white border-2 border-orange flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, phone, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pl-9 text-xs"
            />
          </div>

          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="input-base text-xs max-w-[200px]"
          >
            <option value="all">All Segments (S1–S10)</option>
            {DEFAULT_SEGMENTS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code}: {s.name.split(',')[0]}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono font-bold">
          Showing {filtered.length} of {evaluations.length} records
        </div>
      </div>

      {/* Evaluations Table */}
      <div className="card-warm bg-white border-2 border-orange overflow-hidden shadow-xs w-full">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-slate-200 text-xs min-w-[700px]">
            <thead className="bg-[#FAF8F5] text-navy font-bold border-b border-orange-border/70">
              <tr>
                <th className="py-3 px-4 text-left">Customer</th>
                <th className="py-3 px-3 text-left">Segment</th>
                <th className="py-3 px-3 text-center">Score</th>
                <th className="py-3 px-3 text-left">Score Band</th>
                <th className="py-3 px-3 text-left">Confidence</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-3 text-center">Wallet Data</th>
                <th className="py-3 px-3 text-left">Date</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <span>No evaluations match your search criteria.</span>
                  </td>
                </tr>
              ) : (
                filtered.map((ev) => {
                  const seg = DEFAULT_SEGMENTS.find((s) => s.code === ev.segment_code);
                  const res = ev.results;

                  return (
                    <tr
                      key={ev.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => setInspectEval(ev)}
                    >
                      {/* Customer Name & Phone */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-navy">{ev.customer?.full_name}</div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{ev.customer?.msisdn}</span>
                          <span>&bull;</span>
                          <span>{ev.customer?.national_id_masked || maskNationalId('000000000AA00')}</span>
                        </div>
                      </td>

                      {/* Segment */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-xs font-mono"
                          style={{ backgroundColor: seg?.color || '#1F3A5F' }}
                        >
                          {ev.segment_code}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        <span className="font-mono text-sm font-extrabold text-navy">
                          {res?.score ?? '—'}
                        </span>
                      </td>

                      {/* Score Band */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {res?.band_label ?? 'Scored'}
                        </span>
                      </td>

                      {/* Confidence */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`font-semibold capitalize text-[11px] flex items-center gap-1 ${res?.confidence === 'high'
                            ? 'text-emerald-700'
                            : res?.confidence === 'medium'
                              ? 'text-amber-700'
                              : 'text-red-700'
                            }`}
                        >
                          {res?.confidence === 'high' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {res?.confidence === 'medium' && <AlertTriangle className="w-3.5 h-3.5" />}
                          {res?.confidence === 'low' && <XCircle className="w-3.5 h-3.5" />}
                          {res?.confidence || 'medium'}
                        </span>
                      </td>

                      {/* Credit Limit */}
                      <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-bold text-navy">
                        {res?.limit_kz ? formatKz(res.limit_kz) : '—'}
                      </td>

                      {/* Wallet Channel Status */}
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${ev.wallet_available
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                          {ev.wallet_available ? 'Active' : 'Off'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-500 text-[11px] font-mono">
                        {new Date(ev.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectEval(ev);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-navy hover:bg-slate-100 transition-colors"
                          title="Inspect details"
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

      {/* Inspect Modal Drawer */}
      <Modal
        isOpen={!!inspectEval}
        onClose={() => setInspectEval(null)}
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-orange/40 p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150"
      >
        {inspectEval && (
          <div>
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-orange uppercase tracking-wider">
                  Evaluation Audit Inspection
                </span>
                <h3 className="text-lg font-bold text-navy mt-0.5">
                  {inspectEval.customer?.full_name} ({inspectEval.customer?.msisdn})
                </h3>
                <span className="text-xs text-slate-400 font-mono">ID: {inspectEval.id}</span>
              </div>
              <button
                onClick={() => setInspectEval(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score & Limit Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                <ScoreGauge
                  score={inspectEval.results?.score || 600}
                  bandLabel={inspectEval.results?.band_label}
                  size={180}
                />
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-orange-soft/40 border border-orange/30">
                  <span className="text-xs font-bold text-orange-dark uppercase">Approved Credit Limit</span>
                  <div className="text-xl font-extrabold font-mono text-navy mt-0.5">
                    {formatKz(inspectEval.results?.limit_kz || 0)}
                  </div>
                  <span className="text-[11px] text-slate-600 block mt-1">
                    Cap: {inspectEval.results?.limit_cap_applied}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Segment:</span>
                    <span className="font-bold font-mono text-navy">{inspectEval.segment_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data Confidence:</span>
                    <span className="font-bold text-emerald-700 capitalize">
                      {inspectEval.results?.confidence}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Asset Bonus:</span>
                    <span className="font-bold text-navy">+{inspectEval.results?.asset_bonus} pts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reassurance Banner */}
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Missing parameters or channels were never counted as a penalty.</span>
            </div>

            {/* Positive Drivers */}
            {inspectEval.results?.reasons && inspectEval.results.reasons.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-navy uppercase tracking-wider">
                  Positive Credit Drivers
                </h5>
                <ul className="space-y-1 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {inspectEval.results.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">&check;</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setInspectEval(null)}
                className="btn-outline text-xs py-2 px-5"
              >
                Close Inspection
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
