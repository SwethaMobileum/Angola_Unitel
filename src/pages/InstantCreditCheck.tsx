import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ScoreGauge } from '../components/ScoreGauge';
import { formatKz } from '../lib/money';
import { calculateCreditScore } from '../lib/scoring';
import {
  SEEDED_DEMO_CUSTOMERS,
  demoProfileToScoringInputs,
  normalizePhoneNumber,
} from '../lib/dataSources';
import {
  Search,
  Sparkles,
  Database,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';

interface RegistryQueryStep {
  name: string;
  source: string;
  found: boolean;
  tag: string;
  detail: string;
}

export const InstantCreditCheck: React.FC = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState<string>('+244 923 000 104'); // Pedro Santos default
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(6);
  const [evaluatedResult, setEvaluatedResult] = useState<any | null>(null);
  const [customerProfile, setCustomerProfile] = useState<any | null>(null);

  const [registrySteps, setRegistrySteps] = useState<RegistryQueryStep[]>([
    { name: 'Telecom CDR', source: 'Unitel Core Telecom', found: true, tag: 'From Unitel', detail: '60 months tenure • 12/12 recharges' },
    { name: 'Unitel Money', source: 'Unitel Money Gateway', found: true, tag: 'From Unitel Money', detail: 'Active 24m • Regular utility payments' },
    { name: 'Bank Gateway', source: 'Banco BAI / BFA Interbank', found: true, tag: 'From Bank (demo)', detail: 'Direct payroll • 520,000 Kz avg balance' },
    { name: 'Asset Registries', source: 'Land & Vehicle Registry', found: true, tag: 'From Registry (demo)', detail: 'Registered house, land title & car' },
    { name: 'Utility Grid', source: 'ENDE Electric Prepaid', found: true, tag: 'From Utility (demo)', detail: '100% on-time bill payments' },
    { name: 'Civil Identity', source: 'National Civil ID & SIM', found: true, tag: 'Verified Match', detail: 'Identity match confirmed' },
  ]);

  // Initial calculation on mount
  useEffect(() => {
    handleRunCheck('+244 923 000 104');
  }, []);

  const handleRunCheck = (rawQuery: string) => {
    setIsQuerying(true);
    setActiveStepIndex(0);

    const digits = normalizePhoneNumber(rawQuery);
    const key = Object.keys(SEEDED_DEMO_CUSTOMERS).find((k) => digits.endsWith(k.slice(-9))) || '244923000104';
    const profile = SEEDED_DEMO_CUSTOMERS[key] || SEEDED_DEMO_CUSTOMERS['244923000104'];

    setCustomerProfile(profile);

    // Sequential tick animation
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setActiveStepIndex(step);
      if (step >= 6) {
        clearInterval(interval);
        const inputs = demoProfileToScoringInputs(profile);
        const res = calculateCreditScore(inputs);
        setEvaluatedResult(res);

        setRegistrySteps([
          {
            name: 'Telecom CDR',
            source: 'Unitel Core Telecom',
            found: profile.telecom !== null,
            tag: profile.telecom ? 'From Unitel' : 'No record',
            detail: profile.telecom ? `${profile.telecom.tenure_months}m tenure • ${profile.telecom.recharge_regularity}` : 'No CDR found',
          },
          {
            name: 'Unitel Money',
            source: 'Unitel Money Gateway',
            found: profile.wallet?.has_wallet ?? false,
            tag: profile.wallet?.has_wallet ? 'From Unitel Money' : 'No record',
            detail: profile.wallet?.has_wallet ? `${profile.wallet.wallet_tenure_months}m active • regular inflow` : 'No wallet account',
          },
          {
            name: 'Bank Gateway',
            source: 'Interbank Network',
            found: profile.bank?.has_bank_account ?? false,
            tag: profile.bank?.has_bank_account ? 'From Bank (demo)' : 'No record',
            detail: profile.bank?.has_bank_account ? `Bank account found (${profile.bank.bounced_cheques_12m} returns)` : 'Unbanked / No record',
          },
          {
            name: 'Asset Registries',
            source: 'Land & Vehicle Registry',
            found: profile.assets?.has_vehicle || profile.assets?.has_registered_house || false,
            tag: profile.assets?.has_vehicle ? 'From Registry (demo)' : 'No record',
            detail: profile.assets?.has_registered_house ? 'Registered property verified' : profile.assets?.has_vehicle ? 'Motor vehicle verified' : 'No titled property',
          },
          {
            name: 'Utility Grid',
            source: 'ENDE Electric Prepaid',
            found: profile.utility !== null,
            tag: profile.utility ? 'From Utility (demo)' : 'No record',
            detail: profile.utility ? `${profile.utility.payment_regularity} electricity payments` : 'No meter record',
          },
          {
            name: 'Civil Identity',
            source: 'National Civil ID & SIM',
            found: profile.telecom !== null,
            tag: profile.telecom ? 'Verified Match' : 'Unverified',
            detail: profile.telecom ? 'Identity match confirmed' : 'No registration match',
          },
        ]);

        setIsQuerying(false);
      }
    }, 180);
  };

  return (
    <div className="space-y-4 w-full min-w-0 pb-8">
      {/* Page Header Strip */}
      <PageHeader
        title="Instant Credit Check"
        helperText="Real-time calculation from stored data sources."
        icon={Sparkles}
        badgeText="Real-Time Scoring Demo"
      />

      {/* Search & Presets Card */}
      <div className="bg-card rounded-2xl p-5 border-2 border-orange shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter mobile number (+244 9XX...) or National ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold focus:ring-2 focus:ring-orange focus:bg-white"
            />
          </div>

          <button
            onClick={() => handleRunCheck(searchInput)}
            disabled={isQuerying}
            className="px-6 py-2.5 bg-orange-btn hover:bg-orange-btn-hover text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all shrink-0"
          >
            <Database className={`w-3.5 h-3.5 ${isQuerying ? 'animate-spin' : ''}`} />
            <span>{isQuerying ? 'Querying Registries...' : 'Run instant check'}</span>
          </button>
        </div>

        {/* Demo Customer Quick Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Demo Subscribers:</span>
          {[
            { label: 'Pedro Santos (S7: 760–820)', phone: '+244 923 000 104' },
            { label: 'Matthew Silva (S3: 650–700)', phone: '+244 923 000 101' },
            { label: 'Carlos Mateus (S5: 700–760)', phone: '+244 923 000 103' },
            { label: 'Tomas Neto (S1: 560–620)', phone: '+244 923 000 102' },
            { label: 'Isabel Fernandes (S8: 640–700)', phone: '+244 923 000 105' },
            { label: 'Joaquim Baptista (S5: 380–480)', phone: '+244 923 000 106' },
          ].map((cust) => (
            <button
              key={cust.phone}
              onClick={() => {
                setSearchInput(cust.phone);
                handleRunCheck(cust.phone);
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-peach text-slate-700 hover:text-orange-800 border border-slate-200 hover:border-orange-200 transition-all"
            >
              {cust.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6 Real-Time Registry Query Tickers */}
      <div className="bg-slate-50 p-4 rounded-2xl border-2 border-orange space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-ink uppercase tracking-wider">
            Real-Time Data Layer (6 Sources)
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            {isQuerying ? `Connecting sources (${activeStepIndex}/6)...` : 'All 6 sources synced in real-time'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-1">
          {registrySteps.map((step, idx) => {
            const isDone = activeStepIndex > idx;
            const isCurrent = activeStepIndex === idx && isQuerying;

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border text-center transition-all ${isDone && step.found
                  ? 'bg-white border-green-300 text-green-900 shadow-xs'
                  : isDone && !step.found
                    ? 'bg-white/70 border-slate-200 text-slate-400'
                    : isCurrent
                      ? 'bg-orange-50 border-orange-400 text-orange-800 ring-2 ring-orange-200 animate-pulse'
                      : 'bg-white/50 border-slate-100 text-slate-300'
                  }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  {isDone && step.found ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  ) : isDone && !step.found ? (
                    <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  ) : (
                    <Database className="w-3.5 h-3.5 text-orange-400 shrink-0 animate-spin" />
                  )}
                  <span className="text-xs font-bold truncate">{step.name}</span>
                </div>
                <span className="text-[10px] font-mono block truncate text-slate-500">
                  {isDone ? step.tag : 'Connecting...'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-Time Results Section */}
      {evaluatedResult && customerProfile && !isQuerying && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start animate-in fade-in duration-300">
          {/* Card 1: Score & Identity */}
          <div className="bg-card rounded-2xl p-5 border border-orange-100 shadow-md flex flex-col items-center text-center space-y-3">
            <div className="w-full text-left border-b pb-2">
              <span className="text-[10px] font-bold text-orange uppercase tracking-wider block">Subscriber Match</span>
              <h3 className="text-base font-black font-heading text-ink">{customerProfile.name}</h3>
              <div className="flex items-center justify-between text-xs font-mono text-slate-500 mt-0.5">
                <span>{customerProfile.phone}</span>
                <span className="font-bold text-orange-700 bg-peach/70 px-2 py-0.5 rounded">
                  Segment {customerProfile.segment}
                </span>
              </div>
            </div>

            <ScoreGauge score={evaluatedResult.score} bandLabel={evaluatedResult.scoreBand.label} size={200} />

            <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Data Coverage:</span>
              <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                {evaluatedResult.dataCoverageLabel} ({evaluatedResult.dataCoverageScore}%)
              </span>
            </div>
          </div>

          {/* Card 2: Approved Financing & Points Bars */}
          <div className="bg-card rounded-2xl p-5 border border-orange-100 shadow-md space-y-4">
            <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
              <span className="text-[10px] uppercase font-bold text-orange-800 tracking-wider block">
                Approved Credit Limit
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black font-mono text-ink">
                  {formatKz(evaluatedResult.limitKz)}
                </span>
                <span className="text-xs text-slate-500">
                  (~USD {Math.round(evaluatedResult.limitKz / 920)})
                </span>
              </div>
              <span className="text-[11px] text-slate-600 block mt-1">
                {evaluatedResult.limitCapApplied || 'Standard score-based financing limit.'}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black text-ink uppercase tracking-wider block">
                Block Points ({Math.round(evaluatedResult.totalPoints)} / 100)
              </span>

              {/* Personal Bar */}
              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-600 font-medium">Personal (P)</span>
                  <span className="font-mono font-bold text-ink">
                    {Math.round(evaluatedResult.blockScores.P.earnedPoints)} / {evaluatedResult.blockScores.P.effectivePoints} pts
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-slate-600 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (evaluatedResult.blockScores.P.earnedPoints / (evaluatedResult.blockScores.P.effectivePoints || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Telecom Bar */}
              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-teal font-medium">Telecom (T)</span>
                  <span className="font-mono font-bold text-ink">
                    {Math.round(evaluatedResult.blockScores.T.earnedPoints)} / {evaluatedResult.blockScores.T.effectivePoints} pts
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-teal rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (evaluatedResult.blockScores.T.earnedPoints / (evaluatedResult.blockScores.T.effectivePoints || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Wallet Bar */}
              {evaluatedResult.blockScores.W.effectivePoints > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-purple-700 font-medium">Wallet (W)</span>
                    <span className="font-mono font-bold text-ink">
                      {Math.round(evaluatedResult.blockScores.W.earnedPoints)} / {evaluatedResult.blockScores.W.effectivePoints} pts
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (evaluatedResult.blockScores.W.earnedPoints / (evaluatedResult.blockScores.W.effectivePoints || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Bank Bar */}
              {evaluatedResult.blockScores.B.effectivePoints > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-blue-700 font-medium">Bank (B)</span>
                    <span className="font-mono font-bold text-ink">
                      {Math.round(evaluatedResult.blockScores.B.earnedPoints)} / {evaluatedResult.blockScores.B.effectivePoints} pts
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-700 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (evaluatedResult.blockScores.B.earnedPoints / (evaluatedResult.blockScores.B.effectivePoints || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Asset Bonus */}
              {evaluatedResult.assetBonus > 0 && (
                <div className="flex justify-between text-xs font-semibold text-green-700 pt-1">
                  <span>Physical Asset Bonus (A)</span>
                  <span className="font-mono font-bold">+{evaluatedResult.assetBonus} pts</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Reasons & Action */}
          <div className="bg-card rounded-2xl p-5 border border-orange-100 shadow-md space-y-4">
            <div>
              <span className="text-xs font-black text-ink uppercase tracking-wider block mb-2">
                Evaluation Drivers
              </span>
              <div className="space-y-2">
                {evaluatedResult.positiveReasons.slice(0, 3).map((r: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 text-xs text-teal-900 space-y-1">
              <span className="font-bold block">Verified Facts:</span>
              <p className="text-[11px] text-teal-800">{customerProfile.keyFacts}</p>
            </div>

            <button
              onClick={() => {
                const port = typeof window !== 'undefined' ? window.location.port : '';
                if (port === '5174') {
                  navigate('/approver/queue');
                } else {
                  navigate('/applicant/new');
                }
              }}
              className="w-full py-2.5 bg-orange-btn hover:bg-orange-btn-hover text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <span>View Approvals Queue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
