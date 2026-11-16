import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { COPY } from '../copy/en';
import { LoanApplication, Evaluation } from '../types';
import { getStoredApplications, saveApplication } from '../lib/loans';
import { getStoredEvaluations } from '../lib/evaluations';
import { DEFAULT_EQUIPMENT } from '../data/seedData';
import { useAuth } from '../context/AuthContext';
import { formatKz } from '../lib/money';
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  Eye,
  AlertOctagon,
  Send,
  X,
  ArrowRight,
  Mail,
} from 'lucide-react';
import { StatusChip } from '../components/StatusChip';

export const Applications: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, currentUser } = useAuth();
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [inspectApp, setInspectApp] = useState<LoanApplication | null>(null);
  const [justSubmittedApp, setJustSubmittedApp] = useState<LoanApplication | null>(null);

  // New Application Drawer / Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [selectedEvalId, setSelectedEvalId] = useState<string>('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [termMonths, setTermMonths] = useState<number>(6);
  const [customerNotificationEmail, setCustomerNotificationEmail] = useState<string>('bhargownarravula777@gmail.com');
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setApplications(getStoredApplications());
    setEvaluations(getStoredEvaluations());
  };

  // Respond to ?evalId=...&openModal=true from NewEvaluation Step 6
  useEffect(() => {
    const evalIdParam = searchParams.get('evalId');
    const openModalParam = searchParams.get('openModal');
    if (openModalParam === 'true') {
      const allEvals = getStoredEvaluations();
      setEvaluations(allEvals);
      if (evalIdParam) {
        setSelectedEvalId(evalIdParam);
        const target = allEvals.find((e) => e.id === evalIdParam);
        if (target?.customer?.email) {
          setCustomerNotificationEmail(target.customer.email);
        }
      } else if (allEvals.length > 0) {
        setSelectedEvalId(allEvals[0].id);
      }
      if (DEFAULT_EQUIPMENT.length > 0) {
        setSelectedEquipmentId(DEFAULT_EQUIPMENT[0].id);
      }
      setIsNewModalOpen(true);
    }
  }, [searchParams]);

  const filtered = applications.filter((app) => {
    const custName = app.evaluation?.customer?.full_name?.toLowerCase() || '';
    const eqName = app.equipment?.name?.toLowerCase() || '';
    const q = search.toLowerCase();
    const matchesSearch = custName.includes(q) || eqName.includes(q) || app.id.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Selected evaluation for new application
  const selectedEval = evaluations.find((e) => e.id === selectedEvalId);
  const creditLimitKz = selectedEval?.results?.limit_kz || 0;

  // Filter equipment catalog by the customer's credit limit
  const availableEquipment = DEFAULT_EQUIPMENT.filter(
    (eq) => eq.active && eq.price_kz <= (creditLimitKz > 0 ? creditLimitKz : 999999999)
  );

  const selectedEquipment = DEFAULT_EQUIPMENT.find((eq) => eq.id === selectedEquipmentId);

  // Affordability calculation
  const monthlyIncomeKz = selectedEval?.income_band_code
    ? [30000, 75000, 175000, 375000, 750000, 1200000][selectedEval.income_band_code - 1] || 100000
    : 100000;

  const priceKz = selectedEquipment?.price_kz || 0;
  const monthlyEmiKz = termMonths > 0 ? Math.round(priceKz / termMonths) : 0;
  const emiSharePct = Number(((monthlyEmiKz / monthlyIncomeKz) * 100).toFixed(1));
  const isOverEmiCap = emiSharePct > 30.0;

  const handleOpenNewModal = () => {
    if (evaluations.length > 0) {
      setSelectedEvalId(evaluations[0].id);
      const target = evaluations[0];
      if (target.customer?.email) {
        setCustomerNotificationEmail(target.customer.email);
      }
    }
    if (DEFAULT_EQUIPMENT.length > 0) {
      setSelectedEquipmentId(DEFAULT_EQUIPMENT[0].id);
    }
    setTermMonths(6);
    setFormError('');
    setIsNewModalOpen(true);
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEval) {
      setFormError('Please select a customer evaluation.');
      return;
    }
    if (!selectedEquipment) {
      setFormError('Please select equipment from the catalog.');
      return;
    }
    if (!customerNotificationEmail.trim() || !customerNotificationEmail.includes('@')) {
      setFormError('Please provide a valid notification email.');
      return;
    }

    const newApp: LoanApplication = {
      id: `app-${Date.now()}`,
      evaluation_id: selectedEval.id,
      equipment_id: selectedEquipment.id,
      price_kz: selectedEquipment.price_kz,
      term_months: termMonths,
      rate_pct: 0,
      monthly_emi_kz: monthlyEmiKz,
      emi_share_pct: emiSharePct,
      status: 'submitted',
      submitted_by: currentUser.id || '00000000-0000-0000-0000-000000000001',
      submitted_at: new Date().toISOString(),
      evaluation: selectedEval,
      equipment: selectedEquipment,
    };

    saveApplication(newApp, customerNotificationEmail);
    refreshData();
    setJustSubmittedApp(newApp);
    setIsNewModalOpen(false);
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-navy">{COPY.nav.applications}</h1>
            <span className="badge-warm capitalize">{role} Desk</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Equipment loan financing applications, 3–12 month EMI plans, and affordability tracking.
          </p>
        </div>
        <button
          onClick={handleOpenNewModal}
          className="btn-primary text-xs flex items-center gap-1.5 py-2.5 px-4 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Loan Application</span>
        </button>
      </div>

      {/* Dynamic Success Banner with Direct Navigation to Approvals */}
      {justSubmittedApp && (
        <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex flex-wrap items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                <span>Loan Application Submitted Successfully!</span>
                <span className="font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs">
                  {justSubmittedApp.id.slice(-8).toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-emerald-800 mt-0.5">
                Applicant: <strong>{justSubmittedApp.evaluation?.customer?.full_name}</strong> &bull; Device: <strong>{justSubmittedApp.equipment?.name}</strong> ({formatKz(justSubmittedApp.price_kz)}). Notification sent to <strong>{customerNotificationEmail}</strong>.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setJustSubmittedApp(null)}
              className="text-xs text-slate-500 hover:text-navy px-2 py-1"
            >
              Dismiss
            </button>
            <button
              onClick={() => navigate('/approvals')}
              className="btn-primary text-xs font-bold flex items-center gap-1.5 py-2 px-4 shadow-sm"
            >
              <span>Go to Approvals Queue to Approve/Reject Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card-warm p-4 bg-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer, device name, or app ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pl-9 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-base text-xs max-w-[160px]"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted (Pending)</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono font-bold">
          Showing {filtered.length} of {applications.length} applications
        </div>
      </div>

      {/* Applications Table */}
      <div className="card-warm bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-[#FAF8F5] text-navy font-bold border-b border-orange-border/70">
              <tr>
                <th className="py-3 px-4 text-left">Application ID</th>
                <th className="py-3 px-4 text-left">Customer</th>
                <th className="py-3 px-4 text-left">Equipment</th>
                <th className="py-3 px-3 text-right">Price</th>
                <th className="py-3 px-3 text-center">Term</th>
                <th className="py-3 px-3 text-right">Monthly EMI</th>
                <th className="py-3 px-3 text-center">EMI Share</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-left">Submitted</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <span>No applications match your search criteria.</span>
                  </td>
                </tr>
              ) : (
                filtered.map((app) => {
                  const cust = app.evaluation?.customer;

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => setInspectApp(app)}
                    >
                      {/* ID */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-navy">
                        {app.id.slice(-8).toUpperCase()}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-navy">{cust?.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {cust?.msisdn} &bull; {app.evaluation?.segment_code}
                        </div>
                      </td>

                      {/* Equipment */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{app.equipment?.name}</div>
                        <div className="text-[11px] text-slate-400">{app.equipment?.category}</div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 whitespace-nowrap text-right font-mono font-bold text-navy">
                        {formatKz(app.price_kz)}
                      </td>

                      {/* Term */}
                      <td className="py-3 px-3 whitespace-nowrap text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                          {app.term_months}m
                        </span>
                      </td>

                      {/* Monthly EMI */}
                      <td className="py-3 px-3 whitespace-nowrap text-right font-mono font-bold text-navy">
                        {formatKz(app.monthly_emi_kz)}/mo
                      </td>

                      {/* EMI Share & Affordability Cap */}
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            app.emi_share_pct > 30.0
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {app.emi_share_pct}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        <StatusChip status={app.status} />
                      </td>

                      {/* Submitted Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px] font-mono">
                        {new Date(app.submitted_at).toLocaleDateString()}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectApp(app);
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

      {/* ================= MODAL: CREATE NEW LOAN APPLICATION ================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-orange uppercase tracking-wider">
                  Origination
                </span>
                <h3 className="text-lg font-bold text-navy mt-0.5">Create Equipment Loan Application</h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-navy"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="space-y-4 text-xs">
              {/* 1. Pick Evaluation */}
              <div className="space-y-1">
                <label className="font-semibold text-navy">1. Select Scored Customer Evaluation *</label>
                <select
                  value={selectedEvalId}
                  onChange={(e) => setSelectedEvalId(e.target.value)}
                  className="input-base text-xs font-medium"
                >
                  {evaluations.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.customer?.full_name} ({ev.segment_code}) — Score: {ev.results?.score || '—'} &bull; Limit: {formatKz(ev.results?.limit_kz || 0)}
                    </option>
                  ))}
                </select>
                {selectedEval && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex justify-between items-center text-slate-700">
                    <span>Approved Credit Limit:</span>
                    <span className="font-mono font-extrabold text-navy">
                      {formatKz(creditLimitKz)}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Equipment Selection (Filtered by Limit) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-navy">2. Select Equipment from Catalog *</label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Filtered by {formatKz(creditLimitKz)} Limit
                  </span>
                </div>
                <select
                  value={selectedEquipmentId}
                  onChange={(e) => setSelectedEquipmentId(e.target.value)}
                  className="input-base text-xs font-medium"
                >
                  {availableEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} — {formatKz(eq.price_kz)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Term Selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-navy">3. Repayment Term Plan *</label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 6, 9, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTermMonths(m)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-all font-mono ${
                        termMonths === m
                          ? 'border-orange bg-orange text-white shadow-xs'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {m} Months
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Affordability Summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Monthly EMI:</span>
                  <span className="font-extrabold font-mono text-sm text-navy">
                    {formatKz(monthlyEmiKz)} / month
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">EMI Share of Monthly Income:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      isOverEmiCap ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {emiSharePct}% (Cap: 30%)
                  </span>
                </div>

                {isOverEmiCap ? (
                  <div className="p-2 rounded bg-red-50 border border-red-200 text-red-800 text-[11px] flex items-center gap-1.5 mt-1">
                    <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>Over 30% affordability cap! Increase term or select lower-priced equipment.</span>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Affordability compliant (under 30% monthly debt service ratio).</span>
                  </div>
                )}
              </div>

              {/* 5. Applicant & Analyst Notification Email */}
              <div className="space-y-1 bg-[#FAF8F5] p-3 rounded-xl border-2 border-slate-200">
                <label className="font-semibold text-navy flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-orange" />
                    Applicant & Notification Email (Instant Alert Recipient) *
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                    Connected
                  </span>
                </label>
                <input
                  type="email"
                  placeholder="bhargownarravula777@gmail.com"
                  value={customerNotificationEmail}
                  onChange={(e) => setCustomerNotificationEmail(e.target.value)}
                  className="input-base text-xs font-mono font-semibold"
                  required
                />
                <span className="text-[11px] text-slate-500 block">
                  Application confirmation and subsequent Approver decisions will be dispatched to this email.
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs flex items-center gap-1.5 py-2 px-5 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit for Approver Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: INSPECT APPLICATION ================= */}
      {inspectApp && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-orange uppercase tracking-wider">
                  Application Details
                </span>
                <h3 className="text-lg font-bold text-navy mt-0.5">
                  Reference: {inspectApp.id.slice(-8).toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setInspectApp(null)}
                className="p-1 rounded text-slate-400 hover:text-navy"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant:</span>
                  <span className="font-bold text-navy">{inspectApp.evaluation?.customer?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Equipment:</span>
                  <span className="font-bold text-navy">{inspectApp.equipment?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Price:</span>
                  <span className="font-mono font-bold text-navy">{formatKz(inspectApp.price_kz)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Term / Monthly EMI:</span>
                  <span className="font-mono font-bold text-navy">
                    {inspectApp.term_months}m &bull; {formatKz(inspectApp.monthly_emi_kz)}/mo
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <StatusChip status={inspectApp.status} />
                </div>
              </div>

              {inspectApp.evaluation?.results && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 space-y-1">
                  <span className="font-bold text-navy">Scoring Audit Footprint:</span>
                  <div className="flex justify-between text-[11px] text-slate-700">
                    <span>Proxy Score: <strong>{inspectApp.evaluation.results.score}</strong></span>
                    <span>Band: <strong>{inspectApp.evaluation.results.band_label}</strong></span>
                    <span>Confidence: <strong>{inspectApp.evaluation.results.confidence}</strong></span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setInspectApp(null)}
                className="btn-outline text-xs py-2 px-5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
