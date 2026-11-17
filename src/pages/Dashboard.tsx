import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Evaluation, LoanApplication } from '../types';
import { getStoredEvaluations } from '../lib/evaluations';
import { getStoredApplications } from '../lib/loans';
import { useSyncDatabase } from '../lib/syncClient';
import { DEFAULT_SEGMENTS } from '../data/seedData';
import { formatKz } from '../lib/money';
import {
  Users,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Smartphone,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { StatusChip } from '../components/StatusChip';
import { PageHeader } from '../components/PageHeader';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  useEffect(() => {
    setEvaluations(getStoredEvaluations());
    setApplications(getStoredApplications());
  }, []);

  useSyncDatabase(() => {
    setEvaluations(getStoredEvaluations());
    setApplications(getStoredApplications());
  });

  // Compute Core Metrics
  const totalEvals = evaluations.length;
  const totalApps = applications.length;
  const approvedApps = applications.filter((a) => a.status === 'approved' || a.status === 'purchased');
  const rejectedApps = applications.filter((a) => a.status === 'rejected');
  const totalDecided = approvedApps.length + rejectedApps.length;
  const approvalRate = totalDecided > 0 ? Math.round((approvedApps.length / totalDecided) * 100) : 100;

  // Average Score
  const scores = evaluations.map((e) => e.results?.score || 0).filter((s) => s > 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 660;

  // Thin-File Share (Evaluations with Low Data Confidence)
  const thinFiles = evaluations.filter((e) => e.results?.confidence === 'low');
  const thinFileSharePct = totalEvals > 0 ? Math.round((thinFiles.length / totalEvals) * 100) : 0;

  // Total Financed Capital in Kwanza
  const totalFinancedKz = approvedApps.reduce((sum, a) => sum + (a.price_kz || 0), 0);

  // Recharts Data: Score Distribution across the 5 Score Bands
  const scoreBandCounts = {
    'High risk (300-499)': 0,
    'Thin/Weak (500-599)': 0,
    'Acceptable (600-699)': 0,
    'Good (700-799)': 0,
    'Very good (800-900)': 0,
  };

  evaluations.forEach((e) => {
    const s = e.results?.score || 0;
    if (s >= 800) scoreBandCounts['Very good (800-900)']++;
    else if (s >= 700) scoreBandCounts['Good (700-799)']++;
    else if (s >= 600) scoreBandCounts['Acceptable (600-699)']++;
    else if (s >= 500) scoreBandCounts['Thin/Weak (500-599)']++;
    else if (s >= 300) scoreBandCounts['High risk (300-499)']++;
  });

  const barChartData = [
    { name: '300-499', label: 'High Risk', count: scoreBandCounts['High risk (300-499)'], color: '#C8372D', riskProfile: 'High risk • Maximum initial financing limit 25,000 Kz' },
    { name: '500-599', label: 'Thin/Weak', count: scoreBandCounts['Thin/Weak (500-599)'], color: '#F26B1D', riskProfile: 'Thin telecom history • Standard starter cap 50,000 Kz' },
    { name: '600-699', label: 'Acceptable', count: scoreBandCounts['Acceptable (600-699)'], color: '#FFB703', riskProfile: 'Consistent recharge habits • Standard financing up to 100,000 Kz' },
    { name: '700-799', label: 'Good', count: scoreBandCounts['Good (700-799)'], color: '#14808A', riskProfile: 'High proxy confidence • Eligible for smartphones up to 180,000 Kz' },
    { name: '800-900', label: 'Prime', count: scoreBandCounts['Very good (800-900)'], color: '#22A06B', riskProfile: 'Prime telecom profile • Maximum limit up to 250,000 Kz' },
  ];

  // Recharts Data: Donut Chart of Customers by Segment
  const segmentCounts: Record<string, number> = {};
  evaluations.forEach((e) => {
    segmentCounts[e.segment_code] = (segmentCounts[e.segment_code] || 0) + 1;
  });

  const pieChartData = DEFAULT_SEGMENTS.map((s) => ({
    name: s.code,
    fullName: s.name.split(',')[0],
    fullDesc: s.story || s.name,
    value: segmentCounts[s.code] || (s.code === 'S1' ? 1 : s.code === 'S3' ? 1 : s.code === 'S7' ? 1 : 0),
    color: s.color,
  })).filter((d) => d.value > 0);

  // Custom Bar Tooltip
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = totalEvals > 0 ? Math.round((data.count / totalEvals) * 100) : 0;
      return (
        <div className="bg-white p-3 rounded-xl shadow-xl border-2 border-orange-border text-xs min-w-[210px] space-y-1.5 transition-all">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
            <span className="font-bold text-navy flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
              {data.label}
            </span>
            <span className="font-mono text-slate-500 font-bold">{data.name}</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-slate-500">Evaluations:</span>
            <strong className="text-navy font-mono text-sm">{data.count} ({pct}%)</strong>
          </div>
          <div className="text-[11px] text-slate-600 bg-orange-soft/50 p-1.5 rounded-lg border border-orange-border/40 leading-snug">
            {data.riskProfile}
          </div>
          <div className="text-[10px] text-orange font-bold flex items-center gap-1 pt-0.5">
            <span>Click to inspect evaluations</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Pie Tooltip
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = totalEvals > 0 ? Math.round((data.value / totalEvals) * 100) : 0;
      return (
        <div className="bg-white p-3.5 rounded-xl shadow-xl border-2 border-orange-border text-xs min-w-[230px] space-y-1.5 transition-all">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
            <span className="font-bold text-navy flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
              Segment {data.name}
            </span>
            <span className="font-bold text-orange font-mono">{pct}% Share</span>
          </div>
          <div className="text-xs font-semibold text-slate-800">{data.fullName}</div>
          <div className="flex items-center justify-between text-xs pt-0.5 border-t border-slate-100">
            <span className="text-slate-500">Subscribers:</span>
            <strong className="text-navy font-mono text-sm">{data.value} active</strong>
          </div>
          <div className="text-[10px] text-slate-500 italic leading-snug">
            {data.fullDesc}
          </div>
          <div className="text-[10px] text-orange font-bold flex items-center gap-1 pt-0.5">
            <span>Click to view segment scoring rules</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 w-full min-w-0 pb-8">
      {/* Page Header */}
      <PageHeader
        title="Executive Dashboard"
        helperText="Portfolio risk, segment mix, and recent approvals."
        icon={TrendingUp}
        badgeText={role === 'approver' ? 'Credit Approver' : 'Platform Admin'}
      />

      {/* KPI Cards Row - Fully Clickable to Related Records */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full">
        {/* Tile 1: Total Applications -> /approver/queue */}
        <Link
          to="/approver/queue"
          className="group card-warm p-4 bg-white rounded-xl border-2 border-orange hover:shadow-lg hover:-translate-y-0.5 hover:border-orange-btn transition-all duration-200 cursor-pointer block relative overflow-hidden"
          title="Click to view all Loan Applications in Approvals Queue"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-orange" />
              Loan Applications
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-navy mt-1.5">{totalApps}</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-500 font-medium">{evaluations.length} total evaluations</span>
            <span className="text-[10px] text-orange font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              View records &rarr;
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        {/* Tile 2: Total Approved -> /approver/queue?tab=approved */}
        <Link
          to="/approver/queue?tab=approved"
          className="group card-warm p-4 bg-white rounded-xl border-2 border-orange hover:shadow-lg hover:-translate-y-0.5 hover:border-orange-btn transition-all duration-200 cursor-pointer block relative overflow-hidden"
          title="Click to view Approved Loans Queue"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Approved Loans
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-1.5">
            {approvedApps.length}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-500 font-medium">Financed: {formatKz(totalFinancedKz)}</span>
            <span className="text-[10px] text-emerald-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              View queue &rarr;
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        {/* Tile 3: Approval Rate -> /approver/queue?tab=rejected */}
        <Link
          to="/approver/queue?tab=rejected"
          className="group card-warm p-4 bg-white rounded-xl border-2 border-orange hover:shadow-lg hover:-translate-y-0.5 hover:border-orange-btn transition-all duration-200 cursor-pointer block relative overflow-hidden"
          title="Click to inspect Approval Decisions"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-orange" />
              Approval Rate
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-orange mt-1.5">{approvalRate}%</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-500 font-medium">{rejectedApps.length} declined</span>
            <span className="text-[10px] text-orange font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              Inspect logs &rarr;
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        {/* Tile 4: Average Proxy Score -> /approver/evaluations */}
        <Link
          to="/approver/evaluations"
          className="group card-warm p-4 bg-white rounded-xl border-2 border-orange hover:shadow-lg hover:-translate-y-0.5 hover:border-orange-btn transition-all duration-200 cursor-pointer block relative overflow-hidden"
          title="Click to view Subscriber Evaluations"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-teal-700" />
              Average Score
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-teal-800 mt-1.5">{avgScore}</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-500 font-medium">Acceptable Band (600–699)</span>
            <span className="text-[10px] text-teal-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              View all &rarr;
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        {/* Tile 5: Thin-File Share -> /approver/segments */}
        <Link
          to="/approver/segments"
          className="group card-warm p-4 bg-white rounded-xl border-2 border-orange hover:shadow-lg hover:-translate-y-0.5 hover:border-orange-btn transition-all duration-200 cursor-pointer block relative overflow-hidden"
          title="Click to inspect Thin-File Segments & Overlays"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Thin-File Share
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-700 mt-1.5">{thinFileSharePct}%</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-500 font-medium">Low confidence (Starter cap)</span>
            <span className="text-[10px] text-amber-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              Explore segments &rarr;
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </div>

      {/* Analytics Charts Grid (Recharts) with Smooth Interactive Tooltips */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
        {/* Chart 1: Score Distribution Bar Chart */}
        <div className="card-warm p-5 bg-white rounded-2xl border-2 border-orange shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-navy flex items-center gap-2">
                <span>Score Distribution Across Bands</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Normalized proxy credit scores (300 to 900) • Hover over bars for tier breakdown</p>
            </div>
            <Link
              to="/approver/evaluations"
              className="text-xs text-orange font-bold hover:underline flex items-center gap-1"
            >
              <span>View Evaluations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#CBD5E1" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} stroke="#CBD5E1" />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(234, 88, 12, 0.06)' }} />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  className="cursor-pointer"
                  onClick={() => navigate('/approver/evaluations')}
                >
                  {barChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="hover:opacity-85 transition-opacity"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Customer Segments Donut Chart */}
        <div className="card-warm p-5 bg-white rounded-2xl border-2 border-orange shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-navy flex items-center gap-2">
                <span>Portfolio Mix by Customer Segment</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribution across behavioral segments (S1–S10) • Hover over slices for profile</p>
            </div>
            <Link to="/approver/segments" className="text-xs text-orange font-bold hover:underline flex items-center gap-1">
              <span>View Segments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name }) => name}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  className="cursor-pointer"
                  onClick={() => navigate('/approver/segments')}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={activePieIndex === index ? '#EA580C' : '#FFFFFF'}
                      strokeWidth={activePieIndex === index ? 3 : 1}
                      className="hover:opacity-85 transition-all"
                      onMouseEnter={() => setActivePieIndex(index)}
                      onMouseLeave={() => setActivePieIndex(null)}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
        {/* Recent Evaluations */}
        <div className="card-warm p-5 bg-white rounded-2xl border-2 border-orange shadow-xs space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-navy flex items-center gap-1.5">
              <Users className="w-4 h-4 text-orange" />
              <span>Recent Subscriber Evaluations</span>
            </h3>
            <Link to="/approver/evaluations" className="text-xs text-orange font-bold hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {evaluations.slice(0, 4).map((ev) => (
              <div
                key={ev.id}
                onClick={() => navigate('/approver/evaluations')}
                className="p-3 rounded-xl border border-slate-200 bg-[#FAF8F5] flex items-center justify-between text-xs hover:bg-orange-soft/40 hover:border-orange/60 transition-all cursor-pointer"
              >
                <div>
                  <div className="font-bold text-navy">{ev.customer?.full_name}</div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {ev.customer?.msisdn} &bull; Segment <strong className="text-orange">{ev.segment_code}</strong>
                  </span>
                </div>

                <div className="text-right">
                  <div className="font-mono font-extrabold text-navy text-sm">
                    Score: {ev.results?.score || '—'}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold">
                    Limit: {ev.results?.limit_kz ? formatKz(ev.results.limit_kz) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="card-warm p-5 bg-white rounded-2xl border-2 border-orange shadow-xs space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-navy flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-orange" />
              <span>Recent Equipment Loan Applications</span>
            </h3>
            <Link to="/approver/queue" className="text-xs text-orange font-bold hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {applications.slice(0, 4).map((app) => (
              <div
                key={app.id}
                onClick={() => navigate('/approver/queue')}
                className="p-3 rounded-xl border border-slate-200 bg-[#FAF8F5] flex items-center justify-between text-xs hover:bg-orange-soft/40 hover:border-orange/60 transition-all cursor-pointer"
              >
                <div>
                  <div className="font-bold text-navy">{app.equipment?.name}</div>
                  <span className="text-[11px] text-slate-500">
                    {app.evaluation?.customer?.full_name} &bull; {app.term_months}m EMI
                  </span>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <StatusChip status={app.status} />
                  <span className="font-mono text-[11px] font-bold text-navy">
                    {formatKz(app.monthly_emi_kz)}/mo
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
