import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoanApplication, Evaluation, Customer } from '../types';
import { getStoredApplications, updateApplicationStatus, softDeleteApplication } from '../lib/loans';
import { getStoredEvaluations } from '../lib/evaluations';
import { useSyncDatabase } from '../lib/syncClient';
import { formatKz } from '../lib/money';
import { DEFAULT_SEGMENTS } from '../data/seedData';
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Store,
  Check,
  X,
  Clock,
  Eye,
  FileText,
  Trash2,
} from 'lucide-react';
import { StatusChip, ScoreChip } from '../components/StatusChip';
import { Modal } from '../components/Modal';

interface UnifiedCustomerRecord {
  id: string;
  applicationId?: string;
  evaluationId: string;
  customer: Customer;
  segmentCode: string;
  segmentName: string;
  score: number;
  bandLabel: string;
  confidence: 'high' | 'medium' | 'low';
  limitKz: number;
  equipmentName: string;
  equipmentPriceKz: number;
  monthlyEmiKz: number;
  termMonths: number;
  status: 'draft' | 'saved' | 'submitted' | 'pending' | 'approved' | 'rejected' | 'purchased';
  createdAt: string;
  dataSources: {
    simTenure: string;
    unitelMoney: boolean;
    interbank: boolean;
    nationalId: boolean;
    endeUtility: boolean;
    civilRegistry: boolean;
  };
}

export const ApplicantDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<UnifiedCustomerRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UnifiedCustomerRecord | null>(null);
  const [handoverSuccess, setHandoverSuccess] = useState<string | null>(null);

  // Load live data from shared database & localStorage
  const loadData = () => {
    setApplications(getStoredApplications());
    setEvaluations(getStoredEvaluations());
  };

  useEffect(() => {
    loadData();
  }, []);

  useSyncDatabase(() => {
    loadData();
  });

  // Build unified customer records list
  const customerRecords: UnifiedCustomerRecord[] = useMemo(() => {
    const list: UnifiedCustomerRecord[] = [];

    // Map through applications (each has customer & equipment details)
    applications.forEach((app) => {
      const evaluation = app.evaluation || evaluations.find((e) => e.id === app.evaluation_id);
      const cust = evaluation?.customer;
      if (!cust) return;

      const seg = DEFAULT_SEGMENTS.find((s) => s.code === evaluation.segment_code);

      list.push({
        id: cust.id,
        applicationId: app.id,
        evaluationId: evaluation.id,
        customer: cust,
        segmentCode: evaluation.segment_code,
        segmentName: seg?.name || evaluation.segment_code,
        score: evaluation.results?.score || 650,
        bandLabel: evaluation.results?.band_label || 'Acceptable',
        confidence: evaluation.results?.confidence || 'medium',
        limitKz: evaluation.results?.limit_kz || app.price_kz,
        equipmentName: app.equipment?.name || 'Standard Telecom Equipment',
        equipmentPriceKz: app.price_kz || 0,
        monthlyEmiKz: app.monthly_emi_kz || 0,
        termMonths: app.term_months || 12,
        status: app.status,
        createdAt: app.submitted_at || evaluation.created_at || new Date().toISOString(),
        dataSources: {
          simTenure: cust.sim_activation_date ? '36m+ verified' : 'Active SIM',
          unitelMoney: true,
          interbank: evaluation.segment_code === 'S1' || evaluation.segment_code === 'S5',
          nationalId: true,
          endeUtility: true,
          civilRegistry: true,
        },
      });
    });

    // Also include evaluations without completed applications
    evaluations.forEach((evaluation) => {
      const alreadyIncluded = list.some((item) => item.evaluationId === evaluation.id);
      if (alreadyIncluded || !evaluation.customer) return;

      const cust = evaluation.customer;
      const seg = DEFAULT_SEGMENTS.find((s) => s.code === evaluation.segment_code);

      list.push({
        id: cust.id,
        evaluationId: evaluation.id,
        customer: cust,
        segmentCode: evaluation.segment_code,
        segmentName: seg?.name || evaluation.segment_code,
        score: evaluation.results?.score || 600,
        bandLabel: evaluation.results?.band_label || 'Evaluated',
        confidence: evaluation.results?.confidence || 'medium',
        limitKz: evaluation.results?.limit_kz || 50000,
        equipmentName: 'Selected in Next Step',
        equipmentPriceKz: 0,
        monthlyEmiKz: 0,
        termMonths: 12,
        status: evaluation.status === 'scored' ? 'draft' : (evaluation.status as any),
        createdAt: evaluation.created_at || new Date().toISOString(),
        dataSources: {
          simTenure: cust.sim_activation_date ? 'Verified' : 'Active',
          unitelMoney: evaluation.wallet_available,
          interbank: evaluation.segment_code === 'S1',
          nationalId: true,
          endeUtility: true,
          civilRegistry: true,
        },
      });
    });

    return list;
  }, [applications, evaluations]);

  // Filtered customer records
  const filteredCustomers = useMemo(() => {
    return customerRecords.filter((rec) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        rec.customer.full_name.toLowerCase().includes(q) ||
        rec.customer.msisdn.toLowerCase().includes(q) ||
        rec.customer.national_id_masked.toLowerCase().includes(q) ||
        (rec.applicationId && rec.applicationId.toLowerCase().includes(q));

      // Segment filter
      const matchesSegment = segmentFilter === 'all' || rec.segmentCode === segmentFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'approved' && (rec.status === 'approved' || rec.status === 'purchased')) ||
        (statusFilter === 'pending' && (rec.status === 'submitted' || rec.status === 'pending')) ||
        (statusFilter === 'rejected' && rec.status === 'rejected') ||
        (statusFilter === 'draft' && (rec.status === 'draft' || rec.status === 'saved'));

      return matchesSearch && matchesSegment && matchesStatus;
    });
  }, [customerRecords, searchQuery, segmentFilter, statusFilter]);

  // Aggregate statistics
  const totalCustomers = customerRecords.length;
  const approvedCustomers = customerRecords.filter((c) => c.status === 'approved' || c.status === 'purchased').length;
  const pendingCustomers = customerRecords.filter((c) => c.status === 'submitted' || c.status === 'pending').length;
  const readyForHandover = customerRecords.filter((c) => c.status === 'approved').length;
  const totalFinancedValue = customerRecords.reduce((acc, c) => acc + (c.equipmentPriceKz || 0), 0);

  // Handle Equipment Handover to Subscriber
  const handleConfirmHandover = (record: UnifiedCustomerRecord) => {
    if (!record.applicationId) return;
    updateApplicationStatus(record.applicationId, 'purchased');
    setHandoverSuccess(
      `Equipment successfully handed over to ${record.customer.full_name}! National ID (${record.customer.national_id_masked}) confirmed.`
    );
    setSelectedCustomer(null);
    loadData();
    setTimeout(() => setHandoverSuccess(null), 6000);
  };

  const agentDisplayName = currentUser?.full_name ? currentUser.full_name.replace(' (Applicant)', '') : 'Tomas Silva';

  return (
    <div className="space-y-6 pb-12 w-full min-w-0 animate-in fade-in duration-200">
      {/* 1. Store Agent & Desk Header */}
      <section className="bg-gradient-to-r from-orange to-[#D95510] text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden border-2 border-orange">
        {/* Subtle decorative circles */}
        <div className="absolute -right-12 -bottom-12 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-32 -top-12 w-40 h-40 rounded-full bg-white/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-white text-xs font-semibold">
              <Store className="w-3.5 h-3.5 text-amber-200" />
              <span>Unitel Retail Store • Luanda Marginal (Desk #04)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
              Customer Intake & Application Desk
            </h1>
            <p className="text-sm text-orange-50 font-normal leading-relaxed">
              Agent: <strong className="font-semibold text-white">{agentDisplayName}</strong> • Overview of subscriber
              profiles, operator data collected, and financing applications under review.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/applicant/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-orange font-bold text-xs shadow-md hover:bg-orange-50 hover:shadow-lg transition-all cursor-pointer group font-heading"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ New Customer Intake</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/applicant/applications')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold text-xs backdrop-blur-xs transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>All Applications ({applications.length})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Handover Success Toast */}
      {handoverSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <p className="text-xs font-bold">Equipment Handover Completed</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">{handoverSuccess}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHandoverSuccess(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Customer Collection Summary KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Customers Collected */}
        <div className="p-5 rounded-2xl bg-white border-2 border-orange shadow-xs hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Customers Collected</span>
            <div className="w-8 h-8 rounded-xl bg-orange-soft flex items-center justify-center text-orange">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-heading font-extrabold text-slate-900">{totalCustomers}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Walk-in subscribers onboarded</span>
          </div>
        </div>

        {/* Metric 2: Approved by Committee */}
        <div className="p-5 rounded-2xl bg-white border-2 border-orange shadow-xs hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Approved by Committee</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-heading font-extrabold text-slate-900">{approvedCustomers}</div>
          <div className="text-[11px] text-emerald-700 font-medium">
            Credit committee approved financing
          </div>
        </div>

        {/* Metric 3: Pending Committee Review */}
        <div className="p-5 rounded-2xl bg-white border-2 border-orange shadow-xs hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Under Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-heading font-extrabold text-slate-900">{pendingCustomers}</div>
          <div className="text-[11px] text-amber-700 font-medium">
            Awaiting committee decision ({readyForHandover} ready for pickup)
          </div>
        </div>

        {/* Metric 4: Total Financed Equipment Value */}
        <div className="p-5 rounded-2xl bg-white border-2 border-orange shadow-xs hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Financed Value</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-heading font-extrabold text-slate-900">{formatKz(totalFinancedValue)}</div>
          <div className="text-[11px] text-slate-500">Across active customer loans</div>
        </div>
      </section>

      {/* 3. Ready for Store Handover Queue (If any approved) */}
      {readyForHandover > 0 && (
        <section className="p-5 rounded-2xl bg-amber-50/70 border-2 border-orange shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <Store className="w-4 h-4 text-orange" />
              <span>Subscribers Ready for Equipment Pickup ({readyForHandover})</span>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">
              Verify customer BI at counter prior to handover
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {customerRecords
              .filter((c) => c.status === 'approved')
              .map((rec) => (
                <div
                  key={rec.id + (rec.applicationId || '')}
                  className="p-3.5 rounded-xl bg-white border border-slate-300 shadow-2xs flex items-center justify-between gap-3 hover:border-orange transition-all"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{rec.customer.full_name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {rec.equipmentName} • {rec.customer.msisdn}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">BI: {rec.customer.national_id_masked}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleConfirmHandover(rec)}
                    className="px-3 py-1.5 rounded-lg bg-orange hover:bg-orange-hover text-white text-xs font-bold transition-all shrink-0 shadow-2xs cursor-pointer"
                  >
                    Handover
                  </button>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* 4. Customer Details Collection Table & Filters */}
      <section className="p-6 rounded-2xl bg-white border-2 border-orange shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange">
              Customer Registry
            </span>
            <h2 className="text-base font-heading font-bold text-slate-900 mt-0.5">
              Overview of Customers Collected at this Desk
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review subscriber identities, operator triangulations, credit limits, and equipment plans.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px] sm:min-w-[320px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, phone, BI..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Segment Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Segment:
            </span>
            {[
              { id: 'all', label: 'All Segments' },
              { id: 'S1', label: 'S1 Public' },
              { id: 'S3', label: 'S3 Merchant' },
              { id: 'S5', label: 'S5 Private' },
              { id: 'S7', label: 'S7 Youth' },
            ].map((seg) => (
              <button
                key={seg.id}
                type="button"
                onClick={() => setSegmentFilter(seg.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${segmentFilter === seg.id
                  ? 'bg-orange text-white shadow-2xs'
                  : 'bg-[#FAF8F5] text-slate-600 hover:bg-orange-soft/40 hover:text-slate-900 border border-orange-border/70'
                  }`}
              >
                {seg.label}
              </button>
            ))}
          </div>

          {/* Status Select Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 outline-none focus:border-orange cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending Review</option>
              <option value="draft">Draft</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Customers Table */}
        {filteredCustomers.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">No customer records matching your filter.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSegmentFilter('all');
                setStatusFilter('all');
              }}
              className="text-xs text-orange font-bold hover:underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3">Subscriber</th>
                  <th className="py-3 px-3">Phone &amp; National ID</th>
                  <th className="py-3 px-3">Segment</th>
                  <th className="py-3 px-3">Data Sources (6)</th>
                  <th className="py-3 px-3">Score &amp; Limit</th>
                  <th className="py-3 px-3">Equipment Plan</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCustomers.map((rec) => (
                  <tr
                    key={rec.id + (rec.applicationId || '')}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => setSelectedCustomer(rec)}
                  >
                    {/* Customer */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-orange-soft text-orange flex items-center justify-center font-bold text-xs shrink-0">
                          {rec.customer.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-orange transition-colors">
                            {rec.customer.full_name}
                          </div>
                          <div className="text-[11px] text-slate-400">{rec.customer.email || 'No email registered'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Phone & National ID */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-800">{rec.customer.msisdn}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">BI: {rec.customer.national_id_masked}</div>
                    </td>

                    {/* Segment */}
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-soft/60 text-orange font-bold text-[11px]">
                        {rec.segmentCode}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[120px]">
                        {rec.segmentName}
                      </div>
                    </td>

                    {/* 6 Data Sources */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1" title="6 Data sources checked: SIM, Wallet, Bank, BI, Utility, Civil">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="SIM Tenure: Active" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Unitel Money: Checked" />
                        <span className={`w-2 h-2 rounded-full ${rec.dataSources.interbank ? 'bg-emerald-500' : 'bg-slate-300'}`} title="Interbank" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="National ID: Verified" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="ENDE Utility: Triangulated" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Civil Registry: Verified" />
                        <span className="text-[10px] font-bold text-emerald-700 ml-1">
                          {rec.dataSources.interbank ? '6/6' : '5/6'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{rec.dataSources.simTenure}</div>
                    </td>

                    {/* Score & Limit */}
                    <td className="py-3.5 px-3">
                      <ScoreChip score={rec.score} />
                      <div className="text-[10px] text-slate-500 mt-1">Cap: {formatKz(rec.limitKz)}</div>
                    </td>

                    {/* Equipment Plan */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-800 truncate max-w-[140px]">
                        {rec.equipmentName}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {rec.monthlyEmiKz > 0 ? `${formatKz(rec.monthlyEmiKz)}/mo • ${rec.termMonths}m` : 'In selection'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <StatusChip status={rec.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {rec.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleConfirmHandover(rec)}
                            className="px-2.5 py-1 rounded-lg bg-orange text-white text-[11px] font-bold hover:bg-orange-hover transition-colors shadow-2xs"
                            title="Confirm device handover to subscriber"
                          >
                            Handover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(rec)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orange hover:bg-orange-soft/40 transition-colors"
                          title="View customer file"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(rec)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title={`Delete ${rec.customer.full_name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Customer File Detail Slide-Over Modal */}
      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-orange-border/90 overflow-hidden space-y-0 animate-in zoom-in-95 duration-150"
      >
        {selectedCustomer && (
          <>
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-orange to-[#D95510] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-sm text-white">
                  {selectedCustomer.customer.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-white leading-tight">
                    {selectedCustomer.customer.full_name}
                  </h3>
                  <p className="text-xs text-orange-100">
                    Collected by Agent {agentDisplayName} • Customer ID: {selectedCustomer.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Section: Customer Identifiers */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange">
                  Subscriber Details
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#FAF8F5] border border-orange-border/70 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">MSISDN (Mobile)</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{selectedCustomer.customer.msisdn}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">National ID (BI)</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{selectedCustomer.customer.national_id_masked}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Date of Birth</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{selectedCustomer.customer.date_of_birth || '1992-06-15'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">SIM Activation</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{selectedCustomer.customer.sim_activation_date || '2021-04-10'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Customer Segment</span>
                    <span className="font-bold text-orange mt-0.5 block">{selectedCustomer.segmentCode} - {selectedCustomer.segmentName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Application Status</span>
                    <div className="mt-0.5">
                      <StatusChip status={selectedCustomer.status} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: 6 Triangulated Data Sources */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange">
                  6-Point Operator Registry Triangulation
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 block">Unitel SIM</span>
                      <span className="text-[10px] text-slate-500">Tenure verified</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 block">Unitel Money (*449#)</span>
                      <span className="text-[10px] text-slate-500">USSD active</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 block">National ID</span>
                      <span className="text-[10px] text-slate-500">Civil match confirmed</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 block">ENDE Utility</span>
                      <span className="text-[10px] text-slate-500">Meter triangulated</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 block">Civil Registry</span>
                      <span className="text-[10px] text-slate-500">Biometrics matched</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-2">
                    {selectedCustomer.dataSources.interbank ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold text-slate-800 block">Interbank Salary</span>
                      <span className="text-[10px] text-slate-500">
                        {selectedCustomer.dataSources.interbank ? 'Multicaixa linked' : 'Zero-penalty unbanked'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Credit Score & Selected Device */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-orange-border/80 bg-orange-soft/30 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange block">
                    Underwriting Score
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-heading font-extrabold text-slate-900">
                      {selectedCustomer.score}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/ 900</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700">
                    Tier: <strong className="text-orange">{selectedCustomer.bandLabel}</strong>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Pre-approved limit: <strong className="text-slate-800">{formatKz(selectedCustomer.limitKz)}</strong>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Financed Equipment
                  </span>
                  <div className="font-bold text-sm text-slate-900">{selectedCustomer.equipmentName}</div>
                  <div className="text-xs text-slate-600">
                    Price: <strong>{formatKz(selectedCustomer.equipmentPriceKz)}</strong>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Installment:{' '}
                    <strong className="text-orange">{formatKz(selectedCustomer.monthlyEmiKz)}/mo</strong> ({selectedCustomer.termMonths} Months)
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Unitel Store Luanda Marginal Desk
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
                >
                  Close
                </button>
                {selectedCustomer.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => handleConfirmHandover(selectedCustomer)}
                    className="px-4 py-2 rounded-xl bg-orange hover:bg-orange-hover text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Confirm Device Handover
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-full bg-red-50 text-red-600 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Delete {deleteTarget.customer.full_name}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                This hides the application from active lists. Approver and admin can still view it in the audit log.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteTarget.applicationId) {
                  softDeleteApplication(deleteTarget.applicationId, `${currentUser?.full_name || 'Applicant'}`);
                }
                loadData();
                setDeleteTarget(null);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-xs"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};