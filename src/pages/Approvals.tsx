import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoanApplication } from '../types';
import { getStoredApplications, processApprovalDecision } from '../lib/loans';
import { useSyncDatabase } from '../lib/syncClient';
import { useAuth } from '../context/AuthContext';
import { formatKz } from '../lib/money';
import { StatusChip } from '../components/StatusChip';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Check,
  X,
  ShieldCheck,
  ArrowRight,
  Filter,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type ApprovalTab = 'submitted' | 'approved' | 'rejected' | 'all';

export const Approvals: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<LoanApplication[]>([]);

  // Tab State
  const initialTabParam = searchParams.get('tab') || searchParams.get('status');
  const [activeTab, setActiveTab] = useState<ApprovalTab>(() => {
    if (initialTabParam === 'approved') return 'approved';
    if (initialTabParam === 'rejected') return 'rejected';
    if (initialTabParam === 'all') return 'all';
    return 'submitted';
  });

  const [search, setSearch] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);

  // Pagination (6 to 8 rows per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 7;

  // Decision Modal State
  const [decisionModalOpen, setDecisionModalOpen] = useState<boolean>(false);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected'>('approved');
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string>('');

  useEffect(() => {
    refreshData();
  }, []);

  // Live real-time cross-port sync
  useSyncDatabase(() => {
    refreshData();
  });

  const refreshData = () => {
    const apps = getStoredApplications();
    setApplications(apps);
    // If a selected app is open, update its reference
    if (selectedApp) {
      const updated = apps.find((a) => a.id === selectedApp.id);
      if (updated) setSelectedApp(updated);
    }
  };

  const handleSelectTab = (tab: ApprovalTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setCurrentPage(1);
  };

  // Metrics
  const submittedApps = applications.filter((a) => a.status === 'submitted');
  const approvedApps = applications.filter((a) => a.status === 'approved' || a.status === 'purchased');
  const rejectedApps = applications.filter((a) => a.status === 'rejected');

  // Filtered applications
  const filteredApps = applications.filter((app) => {
    const custName = app.evaluation?.customer?.full_name?.toLowerCase() || '';
    const q = search.toLowerCase();
    const matchesSearch =
      custName.includes(q) ||
      app.id.toLowerCase().includes(q) ||
      (app.equipment?.name && app.equipment.name.toLowerCase().includes(q));

    if (activeTab === 'submitted') return matchesSearch && app.status === 'submitted';
    if (activeTab === 'approved') return matchesSearch && (app.status === 'approved' || app.status === 'purchased');
    if (activeTab === 'rejected') return matchesSearch && app.status === 'rejected';
    return matchesSearch;
  });

  // Paged items
  const totalPages = Math.max(1, Math.ceil(filteredApps.length / rowsPerPage));
  const pagedApps = filteredApps.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleOpenReview = (app: LoanApplication) => {
    setSelectedApp(app);
  };

  const handleOpenDecision = (type: 'approved' | 'rejected') => {
    if (!selectedApp) return;
    setDecisionType(type);
    if (type === 'approved') {
      setDecisionReason(
        `Approved: acceptable proxy score (${selectedApp.evaluation?.results?.score || 650}) and affordable ${selectedApp.emi_share_pct}% monthly debt burden.`
      );
    } else {
      setDecisionReason('Declined: exceeds credit risk tolerance or policy affordability threshold.');
    }
    setDecisionModalOpen(true);
    setActionSuccess('');
  };

  const handleExecuteDecision = () => {
    if (!selectedApp) return;
    if (decisionType === 'rejected' && !decisionReason.trim()) {
      alert('A decision reason is mandatory for rejection.');
      return;
    }

    const recipient = selectedApp.evaluation?.customer?.email || 'bhargownarravula777@gmail.com';
    processApprovalDecision(
      selectedApp.id,
      decisionType,
      decisionReason,
      currentUser.full_name || 'Dra. Maria Mendes (Approver)',
      recipient
    );

    refreshData();
    setActionSuccess(`Application ${selectedApp.id.slice(-6).toUpperCase()} marked as ${decisionType.toUpperCase()}! Decision email delivered.`);
    setTimeout(() => {
      setDecisionModalOpen(false);
      setActionSuccess('');
    }, 1200);
  };

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full pb-8">
      {/* Page Header */}
      <PageHeader
        title="Applications Queue"
        helperText="Review proxy scores and make credit decisions."
        icon={CheckCircle2}
        badgeText={`Approver: ${currentUser.full_name}`}
      />

      {/* VIEW 1: APPLICATIONS QUEUE TABLE */}
      {!selectedApp && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Filter Pills & Search */}
          <div className="bg-card p-4 rounded-2xl border-2 border-orange shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => handleSelectTab('submitted')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'submitted'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-orange-600'
                  }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Submitted ({submittedApps.length})</span>
              </button>

              <button
                onClick={() => handleSelectTab('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'approved'
                  ? 'bg-green-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-green-700'
                  }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approved ({approvedApps.length})</span>
              </button>

              <button
                onClick={() => handleSelectTab('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'rejected'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-red-700'
                  }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Rejected ({rejectedApps.length})</span>
              </button>

              <button
                onClick={() => handleSelectTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'all'
                  ? 'bg-ink text-white shadow-xs'
                  : 'text-slate-600 hover:text-ink'
                  }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>All ({applications.length})</span>
              </button>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search applicant or equipment..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange focus:bg-white"
              />
            </div>
          </div>

          {/* Compact Table (6-8 rows per page) */}
          <div className="bg-card rounded-2xl border-2 border-orange shadow-xs overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-24">Ref</th>
                    <th className="py-3 px-4 w-52">Subscriber</th>
                    <th className="py-3 px-4 w-28">Segment</th>
                    <th className="py-3 px-4">Equipment</th>
                    <th className="py-3 px-4 w-36">Monthly EMI</th>
                    <th className="py-3 px-4 w-28">Score</th>
                    <th className="py-3 px-4 w-28">Status</th>
                    <th className="py-3 px-4 text-right w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedApps.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No applications matching selected filter.
                      </td>
                    </tr>
                  ) : (
                    pagedApps.map((app) => (
                      <tr
                        key={app.id}
                        onClick={() => handleOpenReview(app)}
                        className="hover:bg-peach/30 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-600">
                          {app.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-ink block">
                            {app.evaluation?.customer?.full_name || 'Subscriber'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {app.evaluation?.customer?.msisdn}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-orange-600">
                          {app.evaluation?.segment_code}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-700 block">
                            {app.equipment?.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatKz(app.price_kz)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-ink block">
                            {formatKz(app.monthly_emi_kz)}/mo
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {app.term_months}m ({app.emi_share_pct}%)
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-black text-ink block text-xs">
                            {app.evaluation?.results?.score || '—'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {app.evaluation?.results?.band_label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusChip status={app.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenReview(app);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-orange-600 hover:text-white rounded-lg text-[11px] font-bold text-slate-700 transition-all inline-flex items-center gap-1"
                          >
                            <span>Review</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (Paging 6 to 8 rows) */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Showing {Math.min(filteredApps.length, (currentPage - 1) * rowsPerPage + 1)} to{' '}
                {Math.min(filteredApps.length, currentPage * rowsPerPage)} of {filteredApps.length} applications
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono font-bold text-slate-700">
                  {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: REVIEW PAGE (When a row is clicked) */}
      {selectedApp && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Back button bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedApp(null)}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Queue</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-500">
                App ID: {selectedApp.id}
              </span>
              <StatusChip status={selectedApp.status} />
            </div>
          </div>

          {/* 1. AUTO-WRITTEN SUMMARY (4 Short Lines at top) */}
          <div className="p-4 bg-gradient-to-r from-peach/80 via-orange-50 to-white rounded-2xl border-2 border-orange-300 shadow-sm space-y-1.5">
            <span className="text-[10px] font-black uppercase text-orange-800 tracking-wider block">
              Auto-Generated Executive Summary
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange mt-1.5 shrink-0" />
                <div>
                  <strong className="text-ink">Applicant: </strong>
                  <span className="text-slate-700">
                    {selectedApp.evaluation?.customer?.full_name} ({selectedApp.evaluation?.customer?.msisdn})
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange mt-1.5 shrink-0" />
                <div>
                  <strong className="text-ink">Segment: </strong>
                  <span className="text-slate-700">
                    {selectedApp.evaluation?.segment_code} • {selectedApp.evaluation?.wallet_available ? 'Wallet Active' : 'Cash Telecom'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange mt-1.5 shrink-0" />
                <div>
                  <strong className="text-ink">Evaluation: </strong>
                  <span className="text-slate-700 font-bold">
                    Score {selectedApp.evaluation?.results?.score || 650} ({selectedApp.evaluation?.results?.band_label || 'Acceptable'})
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange mt-1.5 shrink-0" />
                <div>
                  <strong className="text-ink">Financing: </strong>
                  <span className="text-slate-700">
                    {selectedApp.equipment?.name} ({formatKz(selectedApp.price_kz)}) • {formatKz(selectedApp.monthly_emi_kz)}/mo ({selectedApp.emi_share_pct}% share)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Review Content Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left: Points Bars */}
            <div className="bg-card rounded-2xl p-5 border border-orange-100 shadow-md space-y-3">
              <span className="text-xs font-black text-ink uppercase tracking-wider block">
                Block Breakdown
              </span>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-slate-600">Personal (P)</span>
                    <span className="font-mono font-bold text-ink">
                      {Math.round(selectedApp.evaluation?.results?.block_points?.P?.earnedPoints || 10)} pts
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-slate-600 rounded-full w-4/5" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-teal font-medium">Telecom (T)</span>
                    <span className="font-mono font-bold text-ink">
                      {Math.round(selectedApp.evaluation?.results?.block_points?.T?.earnedPoints || 30)} pts
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-teal rounded-full w-3/4" />
                  </div>
                </div>

                {selectedApp.evaluation?.results?.block_points?.W && selectedApp.evaluation.results.block_points.W.rawPoints > 0 && (
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-purple-700 font-medium">Wallet (W)</span>
                      <span className="font-mono font-bold text-ink">
                        {Math.round(selectedApp.evaluation.results.block_points.W.earnedPoints)} pts
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full w-2/3" />
                    </div>
                  </div>
                )}

                {selectedApp.evaluation?.results?.block_points?.B && selectedApp.evaluation.results.block_points.B.rawPoints > 0 && (
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-blue-700 font-medium">Bank (B)</span>
                      <span className="font-mono font-bold text-ink">
                        {Math.round(selectedApp.evaluation.results.block_points.B.earnedPoints)} pts
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-blue-700 rounded-full w-4/5" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Middle: Key Values with Source Chips */}
            <div className="bg-card rounded-2xl p-5 border border-orange-100 shadow-md space-y-2.5">
              <span className="text-xs font-black text-ink uppercase tracking-wider block">
                Verified Key Signals
              </span>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-600">SIM Tenure</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-100 text-orange-800">
                    From Unitel
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-600">Top-Up History</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-100 text-orange-800">
                    From Unitel
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-600">Wallet Turnover</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800">
                    From Unitel Money
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-600">Identity Verification</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-100 text-green-800">
                    Civil Match
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Policy Flags & Decision Actions */}
            <div className="bg-card rounded-2xl p-5 border border-orange-100 shadow-md flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-black text-ink uppercase tracking-wider block mb-2">
                  Policy Overlay
                </span>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-ink">
                    <ShieldCheck className="w-4 h-4 text-orange" />
                    <span>BNA Underwriting Checks Passed</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    No SIM-swap hold detected. 30% debt cap validated.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              {selectedApp.status === 'submitted' ? (
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenDecision('rejected')}
                    className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleOpenDecision('approved')}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 text-center text-xs text-slate-600 border border-slate-200 font-medium">
                  Decision finalized as <strong className="uppercase">{selectedApp.status}</strong>.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DECISION CONFIRMATION MODAL */}
      <Modal
        isOpen={decisionModalOpen && !!selectedApp}
        onClose={() => setDecisionModalOpen(false)}
        className="bg-white rounded-2xl max-w-lg md:max-w-xl w-full p-6 sm:p-7 shadow-2xl border-2 border-orange/40 space-y-5"
      >
        {selectedApp && (
          <>
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black font-heading text-ink">
                Confirm {decisionType === 'approved' ? 'Approval' : 'Rejection'}
              </h3>
              <button
                onClick={() => setDecisionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-ink mb-1">
                  Decision Note {decisionType === 'rejected' && <span className="text-red-600">*</span>}:
                </label>
                <textarea
                  rows={3}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange text-xs"
                  placeholder="Enter reason included in transactional decision email..."
                />
              </div>

              <span className="text-[11px] text-slate-400 block">
                This note will be included directly in the email dispatched to {selectedApp.evaluation?.customer?.email || 'the applicant'}.
              </span>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <button
                onClick={() => setDecisionModalOpen(false)}
                className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDecision}
                className={`flex-1 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${decisionType === 'approved'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
                  }`}
              >
                Confirm {decisionType === 'approved' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
