import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { COPY } from '../copy/en';
import { LoanApplication } from '../types';
import { getStoredApplications, processApprovalDecision } from '../lib/loans';
import { useAuth } from '../context/AuthContext';
import { formatKz } from '../lib/money';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Check,
  X,
  ShieldCheck,
  TrendingUp,
  AlertOctagon,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { StatusChip } from '../components/StatusChip';

type ApprovalTab = 'submitted' | 'approved' | 'rejected' | 'all';

export const Approvals: React.FC = () => {
  const { role, currentUser, setRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<LoanApplication[]>([]);

  // Parse initial tab from query param e.g. /approvals?tab=approved
  const initialTabParam = searchParams.get('tab') || searchParams.get('status');
  const [activeTab, setActiveTab] = useState<ApprovalTab>(() => {
    if (initialTabParam === 'approved') return 'approved';
    if (initialTabParam === 'rejected') return 'rejected';
    if (initialTabParam === 'all') return 'all';
    return 'submitted';
  });

  const [search, setSearch] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);

  const isAuthorizedApprover = role === 'approver' || role === 'admin';

  // Decision Modal State
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected'>('approved');
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [approverName, setApproverName] = useState<string>(currentUser.full_name);
  const [actionSuccess, setActionSuccess] = useState<string>('');

  useEffect(() => {
    setApproverName(currentUser.full_name);
  }, [currentUser]);

  useEffect(() => {
    refreshData();
  }, []);

  // Sync tab state when URL query params change
  useEffect(() => {
    const t = searchParams.get('tab') || searchParams.get('status');
    if (t === 'approved') setActiveTab('approved');
    else if (t === 'rejected') setActiveTab('rejected');
    else if (t === 'submitted' || t === 'pending') setActiveTab('submitted');
    else if (t === 'all') setActiveTab('all');
  }, [searchParams]);

  const refreshData = () => {
    setApplications(getStoredApplications());
  };

  const handleSelectTab = (tab: ApprovalTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Metrics
  const submittedApps = applications.filter((a) => a.status === 'submitted');
  const approvedApps = applications.filter((a) => a.status === 'approved');
  const rejectedApps = applications.filter((a) => a.status === 'rejected');
  const totalDecided = approvedApps.length + rejectedApps.length;
  const approvalRate = totalDecided > 0 ? Math.round((approvedApps.length / totalDecided) * 100) : 100;

  // Filtered list based on active tab and search
  const filteredApps = applications.filter((app) => {
    const custName = app.evaluation?.customer?.full_name?.toLowerCase() || '';
    const q = search.toLowerCase();
    const matchesSearch =
      custName.includes(q) ||
      app.id.toLowerCase().includes(q) ||
      (app.equipment?.name && app.equipment.name.toLowerCase().includes(q));

    if (activeTab === 'submitted') {
      return matchesSearch && app.status === 'submitted';
    }
    if (activeTab === 'approved') {
      return matchesSearch && app.status === 'approved';
    }
    if (activeTab === 'rejected') {
      return matchesSearch && app.status === 'rejected';
    }
    return matchesSearch;
  });

  const handleOpenDecisionModal = (app: LoanApplication, type: 'approved' | 'rejected') => {
    setSelectedApp(app);
    setDecisionType(type);
    if (type === 'approved') {
      setDecisionReason(
        `Approved based on acceptable credit proxy score (${app.evaluation?.results?.score || 600}) and manageable ${app.emi_share_pct}% EMI debt burden.`
      );
    } else {
      setDecisionReason('Application does not meet credit risk criteria or affordability thresholds.');
    }
    setActionSuccess('');
  };

  const handleExecuteDecision = () => {
    if (!selectedApp) return;
    if (!decisionReason.trim()) {
      alert('Please provide a mandatory decision reason.');
      return;
    }

    const recipientEmail = selectedApp.evaluation?.customer?.email || 'bhargownarravula777@gmail.com';

    processApprovalDecision(
      selectedApp.id,
      decisionType,
      decisionReason,
      approverName,
      recipientEmail
    );

    refreshData();
    setActionSuccess(`Application ${selectedApp.id.slice(-6).toUpperCase()} successfully marked as ${decisionType.toUpperCase()}! Decision notification dispatched to ${recipientEmail}.`);
    setTimeout(() => {
      setSelectedApp(null);
      setActionSuccess('');
    }, 1500);
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-orange-border/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-navy">{COPY.nav.approvals}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Approver review queue: inspect proxy scoring breakdowns, evaluate policy overlay flags, and record final financing decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge-warm">
            Active Approver: {approverName}
          </span>
        </div>
      </div>

      {/* Role Alert Banner if Viewing as Analyst */}
      {!isAuthorizedApprover && (
        <div className="p-4 rounded-xl bg-orange-soft border-2 border-orange-border text-navy flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-orange shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="text-orange">Analyst Mode (Viewing as {currentUser.full_name}): </strong>
              Frontline analysts can originate applications. Under Unitel & BNA credit regulations, loan approval decisions require an authorized <strong>Approver role (Dra. Maria Mendes)</strong>.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRole('approver')}
            className="btn-primary text-xs py-1.5 px-3.5 shadow-xs"
          >
            Switch to Approver (Dra. Maria Mendes)
          </button>
        </div>
      )}

      {/* Metrics Row - Clickable Cards that directly activate the matching tab */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Metric 1: Submitted / Pending */}
        <button
          type="button"
          onClick={() => handleSelectTab('submitted')}
          className={`card-warm p-4 rounded-xl space-y-1 text-left transition-all cursor-pointer ${
            activeTab === 'submitted'
              ? 'ring-2 ring-orange bg-orange-soft/40 border-orange'
              : 'bg-white hover:border-orange/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange" />
              Submitted / Pending
            </span>
            <span className="text-[10px] font-bold text-orange flex items-center gap-0.5">
              Filter &rarr;
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-orange mt-1">
            {submittedApps.length}
          </div>
          <span className="text-[11px] text-slate-500 block">Awaiting approver review</span>
        </button>

        {/* Metric 2: Approved Loans */}
        <button
          type="button"
          onClick={() => handleSelectTab('approved')}
          className={`card-warm p-4 rounded-xl space-y-1 text-left transition-all cursor-pointer ${
            activeTab === 'approved'
              ? 'ring-2 ring-emerald-500 bg-emerald-50/60 border-emerald-500'
              : 'bg-white hover:border-emerald-500/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Approved Loans
            </span>
            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
              Filter &rarr;
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-1">
            {approvedApps.length}
          </div>
          <span className="text-[11px] text-slate-500 block">Financed equipment contracts</span>
        </button>

        {/* Metric 3: Rejected Loans */}
        <button
          type="button"
          onClick={() => handleSelectTab('rejected')}
          className={`card-warm p-4 rounded-xl space-y-1 text-left transition-all cursor-pointer ${
            activeTab === 'rejected'
              ? 'ring-2 ring-red-500 bg-red-50/60 border-red-500'
              : 'bg-white hover:border-red-500/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-red-600" />
              Rejected Loans
            </span>
            <span className="text-[10px] font-bold text-red-700 flex items-center gap-0.5">
              Filter &rarr;
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-red-700 mt-1">
            {rejectedApps.length}
          </div>
          <span className="text-[11px] text-slate-500 block">Risk or affordability cap declined</span>
        </button>

        {/* Metric 4: All Loans / Approval Rate */}
        <button
          type="button"
          onClick={() => handleSelectTab('all')}
          className={`card-warm p-4 rounded-xl space-y-1 text-left transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'ring-2 ring-navy bg-slate-50 border-navy'
              : 'bg-white hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-navy" />
              Approval Rate
            </span>
            <span className="text-[10px] font-bold text-navy flex items-center gap-0.5">
              View All &rarr;
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-navy mt-1">
            {approvalRate}%
          </div>
          <span className="text-[11px] text-slate-500 block">{applications.length} total applications</span>
        </button>
      </div>

      {/* Tabs and Search Bar - Clear Categorization (Submitted, Approved, Rejected, All) */}
      <div className="card-warm p-4 bg-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 border border-orange-border/80 rounded-xl p-1 bg-[#FAF8F5]">
          {/* Tab 1: Submitted / Pending */}
          <button
            onClick={() => handleSelectTab('submitted')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'submitted'
                ? 'bg-orange text-white shadow-xs'
                : 'text-slate-600 hover:text-orange hover:bg-orange-soft/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Submitted ({submittedApps.length})</span>
          </button>

          {/* Tab 2: Approved */}
          <button
            onClick={() => handleSelectTab('approved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved ({approvedApps.length})</span>
          </button>

          {/* Tab 3: Rejected */}
          <button
            onClick={() => handleSelectTab('rejected')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'rejected'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-red-700 hover:bg-red-50'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected ({rejectedApps.length})</span>
          </button>

          {/* Tab 4: All Applications */}
          <button
            onClick={() => handleSelectTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-navy text-white shadow-xs'
                : 'text-slate-600 hover:text-navy hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>All ({applications.length})</span>
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, device, or app reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-9 text-xs"
          />
        </div>
      </div>

      {/* Approval Queue List */}
      <div className="space-y-4">
        {filteredApps.length === 0 ? (
          <div className="card-warm p-12 text-center bg-white rounded-2xl text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto opacity-40 text-orange" />
            <h3 className="text-base font-bold text-navy">
              No {activeTab === 'submitted' ? 'Submitted (Pending)' : activeTab === 'approved' ? 'Approved' : activeTab === 'rejected' ? 'Rejected' : ''} Applications in Queue
            </h3>
            <p className="text-xs text-slate-500">
              There are currently no applications matching the "{activeTab}" filter.
            </p>
          </div>
        ) : (
          filteredApps.map((app) => {
            const cust = app.evaluation?.customer;
            const res = app.evaluation?.results;
            const isPending = app.status === 'submitted';

            return (
              <div
                key={app.id}
                className="card-warm p-5 bg-white rounded-2xl hover:shadow-md transition-shadow space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Left: Customer & Equipment */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {app.id.slice(-8).toUpperCase()}
                      </span>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange text-white">
                        {app.evaluation?.segment_code}
                      </span>
                      <StatusChip status={app.status} />
                    </div>
                    <h3 className="text-base font-bold text-navy">{cust?.full_name}</h3>
                    <p className="text-xs text-slate-500 font-mono">
                      MSISDN: {cust?.msisdn} &bull; ID: {cust?.national_id_masked}
                    </p>
                  </div>

                  {/* Right: Equipment Financing */}
                  <div className="text-right space-y-0.5">
                    <span className="text-xs text-slate-500 font-medium">Financed Device:</span>
                    <div className="text-sm font-bold text-navy">{app.equipment?.name}</div>
                    <div className="text-xs font-mono font-bold text-orange">
                      {formatKz(app.monthly_emi_kz)}/mo ({app.term_months}m plan &bull; Total {formatKz(app.price_kz)})
                    </div>
                  </div>
                </div>

                {/* Score & Affordability Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-[#FAF8F5] border border-orange-border/60 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Proxy Score:</span>
                    <span className="font-mono font-extrabold text-navy text-sm">
                      {res?.score || '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">({res?.band_label})</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px] block">Data Confidence:</span>
                    <span className="font-bold text-emerald-700 capitalize">
                      {res?.confidence || 'Medium'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Non-penalized</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px] block">Credit Limit Cap:</span>
                    <span className="font-mono font-bold text-navy">
                      {res?.limit_kz ? formatKz(res.limit_kz) : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate" title={res?.limit_cap_applied}>
                      {res?.limit_cap_applied}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px] block">Monthly Debt Burden:</span>
                    <span
                      className={`font-mono font-bold px-1.5 py-0.2 rounded text-[11px] ${
                        app.emi_share_pct > 30.0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {app.emi_share_pct}% of income
                    </span>
                    <span className="text-[10px] text-slate-400 block">Cap: 30%</span>
                  </div>
                </div>

                {/* Overlay Flags Callout if Any */}
                {res?.overlay_flags && res.overlay_flags.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-orange-soft border border-orange-border text-xs text-navy flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-orange shrink-0" />
                    <span>
                      Policy Flags Triggered: {res.overlay_flags.map((f) => f.note).join('; ')}
                    </span>
                  </div>
                )}

                {/* Approver Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Submitted: {new Date(app.submitted_at).toLocaleString()}
                  </span>

                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenDecisionModal(app, 'rejected')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject Application
                      </button>
                      <button
                        onClick={() => handleOpenDecisionModal(app, 'approved')}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve Application
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Decision recorded in Audit Log & Notification Sent
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================= DECISION MODAL ================= */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-orange-border p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-mono font-bold text-orange uppercase tracking-wider block">
                  Mandatory Credit Decision
                </span>
                <h3 className="text-base font-bold text-navy mt-0.5">
                  Record Decision for {selectedApp.evaluation?.customer?.full_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1 rounded-md text-slate-400 hover:text-navy hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Summary Strip */}
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-orange-border/60 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block">Equipment:</span>
                  <strong className="text-navy">{selectedApp.equipment?.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Price:</span>
                  <strong className="text-navy">{formatKz(selectedApp.price_kz)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Monthly EMI:</span>
                  <strong className="text-orange">{formatKz(selectedApp.monthly_emi_kz)}/mo</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Score:</span>
                  <strong className="text-emerald-700">{selectedApp.evaluation?.results?.score || '—'}</strong>
                </div>
              </div>

              {/* Decision Toggle */}
              <div className="space-y-1.5">
                <label className="font-bold text-navy">Decision *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDecisionType('approved')}
                    className={`py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      decisionType === 'approved'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="w-4 h-4 text-emerald-600" />
                    Approve Loan
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecisionType('rejected')}
                    className={`py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      decisionType === 'rejected'
                        ? 'border-red-500 bg-red-50 text-red-800 ring-2 ring-red-400'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <X className="w-4 h-4 text-red-600" />
                    Reject Loan
                  </button>
                </div>
              </div>

              {/* Mandatory Reason */}
              <div className="space-y-1.5">
                <label className="font-bold text-navy">
                  Decision Justification (Mandatory Audit Trail Note) *
                </label>
                <textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="State the justification for approval or rejection under BNA / Unitel lending policy..."
                  rows={3}
                  className="input-base text-xs font-medium"
                />
                <span className="text-[11px] text-slate-500 block">
                  This explanation is dispatched to the Analyst via email and written to the immutable audit log.
                </span>
              </div>

              {/* Approver Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-navy">Approver Sign-off Name *</label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="input-base text-xs font-semibold"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDecision}
                  className={`text-xs py-2 px-4 rounded-xl font-bold text-white shadow-sm flex items-center gap-1.5 ${
                    decisionType === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  <span>Confirm {decisionType === 'approved' ? 'Approval' : 'Rejection'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
