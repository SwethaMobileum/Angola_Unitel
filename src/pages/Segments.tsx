import React, { useState } from 'react';
import { COPY } from '../copy/en';
import {
  DEFAULT_SEGMENTS,
  DEFAULT_BLOCKS,
  DEFAULT_PARAMETERS,
} from '../data/seedData';
import { SegmentCode } from '../types';
import { FlowChart } from '../components/FlowChart';
import { Heatmap } from '../components/Heatmap';
import { SegmentCard } from '../components/SegmentCard';
import { BlockTag } from '../components/BlockTag';
import {
  Layers,
  GitBranch,
  LayoutGrid,
  Table,
  CreditCard,
  UserCheck,
  Search,
  Calculator,
  ShieldCheck,
  ShoppingBag,
  Info,
} from 'lucide-react';

export const Segments: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'flow' | 'finder' | 'blocks' | 'matrix' | 'cards'>('flow');
  const [selectedSegmentCode, setSelectedSegmentCode] = useState<SegmentCode>('S1');
  const [activeFlowStep, setActiveFlowStep] = useState<number>(1);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const tabs = [
    { id: 'flow', label: 'Flow', icon: Layers },
    { id: 'finder', label: 'Find the segment', icon: GitBranch },
    { id: 'blocks', label: 'Blocks', icon: LayoutGrid },
    { id: 'matrix', label: 'Matrix', icon: Table },
    { id: 'cards', label: 'Segment cards', icon: CreditCard },
  ] as const;

  // The 6-step flow definition
  const flowSteps = [
    {
      step: 1,
      title: 'Customer Identification',
      icon: UserCheck,
      shortDesc: 'Capture subscriber identity & verify legal eligibility gates.',
      details: [
        'Collect Full Name, Unitel MSISDN (+244 9xx), National ID (Bilhete de Identidade - BI), Date of Birth, and SIM activation date.',
        'Hard Stop 1: ID & SIM registration match check. Mismatch stops the application for branch KYC review.',
        'Hard Stop 2: Age verification (applicant must be 18+). Age band also caps loan repayment tenure.',
      ],
      ruleNote: 'Never collected / scored: health, gender, religion, ethnicity, or private GPS coordinates.',
    },
    {
      step: 2,
      title: 'Find the Segment',
      icon: GitBranch,
      shortDesc: 'Determine customer profile via 9-question priority chain.',
      details: [
        'Ask the 9 priority decision questions one by one. The FIRST question answered "YES" immediately determines the segment (S10 down to S2).',
        'If all questions are answered "NO", the customer defaults to S1 (Button phone, cash-only).',
        'Analyst override is permitted with a required justification note (captured in immutable audit log).',
        'When Wallet is disabled globally or per evaluation, Questions 6 and 7 are automatically skipped.',
      ],
      ruleNote: 'Segment fixes the base parameter mix and block weights (P+T+W+B+X = 94 base points).',
    },
    {
      step: 3,
      title: 'Pick Segment Parameters',
      icon: LayoutGrid,
      shortDesc: 'Collect only parameters that this segment realistically has.',
      details: [
        'Dynamic form renders only the blocks relevant to the customer segment.',
        'Inputs left blank or marked "not available" are skipped (NEVER penalized as zero).',
        'Device type (button vs smartphone) and ROSCA/Kixikila membership are stored for context with weight 0 (excluded from score average).',
      ],
      ruleNote: 'Core Principle: Customers move money differently (cash, USSD, apps, banks, agents). Missing channels are never a penalty.',
    },
    {
      step: 4,
      title: 'Score & Confidence',
      icon: Calculator,
      shortDesc: 'Calculate 300–900 score, dynamic redistribution, and data confidence.',
      details: [
        'Parameter strengths (0..1) aggregate into weighted block strengths, multiplied by block points.',
        'Dynamic Redistribution: If a block has no data (or wallet is off), its points move proportionally to active behavioral blocks, prioritizing the main block.',
        'Physical Assets Bonus: Declared house (+2), land title (+1), two-wheeler (+1), or car (+2) add up to +6 bonus points. "No" and "Skip" add 0 and never subtract.',
        'Credit Score formula: round(300 + (totalPoints / 100) * 600), mapped into 5 risk bands (300 to 900).',
        'Data Confidence: High (>=3 blocks, >=12m tenure), Medium (2 blocks or 6-12m), Low (1 block or <6m; caps limit at Starter).',
      ],
      ruleNote: 'Base points sum is strictly invariant at 94. Total points capped at 100.',
    },
    {
      step: 5,
      title: 'Credit Limit Engine',
      icon: ShieldCheck,
      shortDesc: 'Apply lowest of Score tier limit, Income cap, and 30% EMI burden.',
      details: [
        'Score Band Baseline: Starter (50,000 Kz), Standard (150,000 Kz), Higher (400,000 Kz), Highest (1,000,000 Kz).',
        'Income Band Cap: Caps the maximum financing amount based on declared or estimated monthly income (Band 1 to 6).',
        'Starter Caps: Triggered if SIM tenure < 6 months, data confidence is Low, or customer belongs to S1 with tenure < 12 months.',
        'SIM Swap Hold: A SIM replacement in the last 30 days triggers a hold for fraud review.',
      ],
      ruleNote: 'The final approved credit limit is strictly the lowest of all applicable constraints.',
    },
    {
      step: 6,
      title: 'Loan Journey & Approvals',
      icon: ShoppingBag,
      shortDesc: 'Select equipment, validate 30% EMI affordability, and submit for decision.',
      details: [
        'Filter equipment catalog (feature phones, 4G smartphones, solar charging kits, tablets) by the customer\'s credit limit.',
        'Build 3 to 12 month EMI repayment plan. Monthly EMI must not exceed 30% of monthly income or spend proxy.',
        'Analyst submits application with their contact email (receives instant status notifications).',
        'Approver reviews in Approval Queue and approves or rejects with a mandatory reason. Every action is written to the immutable audit log.',
      ],
      ruleNote: 'Full traceability: score version, input snapshot, email notification, and timestamped audit log.',
    },
  ];

  const handleSelectSegment = (code: SegmentCode) => {
    setSelectedSegmentCode(code);
    setActiveTab('cards');
  };

  const filteredSegments = DEFAULT_SEGMENTS.filter(
    (s) =>
      (s.is_active ?? true) &&
      (s.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
        s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        s.story.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Page Title & Core Scoring Principle Banner */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">{COPY.nav.segments}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Executive architectural explainer: 10 customer segments, 6 parameter blocks, and tailored scoring weights.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-navy text-white shadow-xs">
              10 Segments (S1–S10)
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange text-white shadow-xs">
              P+T+W+B+X = 94 Base Pts
            </span>
          </div>
        </div>

        {/* Core Principle Callout */}
        <div className="mt-4 p-4 rounded-xl bg-orange-soft border border-orange-border flex items-start gap-3 shadow-xs">
          <Info className="w-5 h-5 text-orange shrink-0 mt-0.5" />
          <div className="text-xs text-navy leading-relaxed">
            <strong className="text-orange">Core Scoring Invariant: </strong>
            {COPY.coreIdea}
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-border gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${isActive
                ? 'border-orange text-orange bg-orange-soft/40 rounded-t-md'
                : 'border-transparent text-slate-muted hover:text-navy hover:bg-slate-100/60 rounded-t-md'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Flow */}
      {activeTab === 'flow' && (
        <div className="space-y-6">
          <div className="card-base p-6 border-2 border-orange rounded-xl bg-white space-y-6">
            <div>
              <h2 className="text-lg font-bold text-navy">The 6-Step Telecom Credit Scoring Flow</h2>
              <p className="text-xs text-slate-muted mt-1">
                From subscriber walk-in and segment identification to tailored scoring, credit limit derivation, and equipment loan approval.
              </p>
            </div>

            {/* Stepper Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {flowSteps.map((fs) => {
                const Icon = fs.icon;
                const isCurrent = activeFlowStep === fs.step;

                return (
                  <button
                    key={fs.step}
                    onClick={() => setActiveFlowStep(fs.step)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between h-32 ${isCurrent
                      ? 'border-orange bg-orange-soft/30 shadow-sm ring-1 ring-orange'
                      : 'border-slate-border bg-slate-50/60 hover:bg-white hover:border-slate-300'
                      }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${isCurrent ? 'bg-orange text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                        >
                          {fs.step}
                        </span>
                        <Icon className={`w-4 h-4 ${isCurrent ? 'text-orange' : 'text-slate-400'}`} />
                      </div>
                      <h4 className="text-xs font-bold text-navy leading-tight">{fs.title}</h4>
                    </div>
                    <span className="text-[10px] text-slate-500 line-clamp-2 mt-1">
                      {fs.shortDesc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Expanded Details of Selected Flow Step */}
            {(() => {
              const currentStepData = flowSteps.find((fs) => fs.step === activeFlowStep) || flowSteps[0];
              const StepIcon = currentStepData.icon;

              return (
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-navy text-white">
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold font-mono text-orange uppercase tracking-wider">
                        Step {currentStepData.step} of 6
                      </span>
                      <h3 className="text-base font-extrabold text-navy">{currentStepData.title}</h3>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                      Process Specifications & Business Rules
                    </h5>
                    <ul className="space-y-2">
                      {currentStepData.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange mt-1.5 shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Compliance Note: </span>
                      <span>{currentStepData.ruleNote}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tab 2: Find the Segment */}
      {activeTab === 'finder' && (
        <div className="space-y-6">
          <div className="card-base p-6 border-2 border-orange rounded-xl bg-white space-y-4">
            <div>
              <h2 className="text-lg font-bold text-navy">Segment Decision Chain (Priority Tree)</h2>
              <p className="text-xs text-slate-muted mt-1">
                Rule: Questions run in priority order 1 through 9. The <strong>first YES wins</strong>. If all questions evaluate to NO, the customer is assigned to <strong>S1 (Button phone, cash-only)</strong>.
              </p>
            </div>

            <FlowChart
              walletEnabled={true}
              onSelectSegment={handleSelectSegment}
            />
          </div>
        </div>
      )}

      {/* Tab 3: Blocks */}
      {activeTab === 'blocks' && (
        <div className="space-y-6">
          <div className="card-base p-6 border-2 border-orange rounded-xl bg-white space-y-4">
            <div>
              <h2 className="text-lg font-bold text-navy">The 6 Parameter Blocks</h2>
              <p className="text-xs text-slate-muted mt-1">
                Parameters are grouped into 6 conceptual blocks. Only blocks applicable to a customer\'s segment are scored.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEFAULT_BLOCKS.map((block) => {
                const blockParams = DEFAULT_PARAMETERS.filter((p) => p.block_code === block.code);

                return (
                  <div
                    key={block.code}
                    className="card-base p-5 border-2 border-orange rounded-xl bg-white hover:shadow-md transition-shadow space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <BlockTag code={block.code} showName={true} className="text-xs py-1" />
                      {block.is_optional && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          Optional Block (W)
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-md border border-slate-100">
                      &ldquo;{block.question}&rdquo;
                    </p>

                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-xs font-semibold text-navy">
                        <span>Contained Parameters</span>
                        <span className="font-mono text-slate-500">{blockParams.length} metrics</span>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {blockParams.map((param) => (
                          <div
                            key={param.key}
                            className="p-1.5 rounded bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs"
                          >
                            <span className="text-slate-700 truncate text-[11px]" title={param.help}>
                              {param.label}
                            </span>
                            <span className="text-[9px] font-mono uppercase px-1 py-0.5 rounded bg-white border border-slate-200 text-slate-500 ml-1 shrink-0">
                              {param.input}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Matrix */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <div className="card-base p-6 border-2 border-orange rounded-xl bg-white space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-navy">Segment Weight Matrix (Heatmap)</h2>
                <p className="text-xs text-slate-muted mt-1">
                  Darker orange shading indicates higher block points. Every segment's base blocks (P+T+W+B+X) sum to exactly <strong>94 points</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Legend:</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">0 pts (N/A)</span>
                <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-mono text-[10px]">1-25 pts</span>
                <span className="px-2 py-0.5 rounded bg-orange/40 text-orange-dark font-mono text-[10px]">26-40 pts</span>
                <span className="px-2 py-0.5 rounded bg-orange text-white font-mono text-[10px] font-bold">41-80 pts</span>
              </div>
            </div>

            <Heatmap
              selectedSegment={selectedSegmentCode}
              onSelectSegment={handleSelectSegment}
            />
          </div>
        </div>
      )}

      {/* Tab 5: Segment Cards */}
      {activeTab === 'cards' && (
        <div className="space-y-6">
          {/* Search and Filter Bar */}
          <div className="card-base p-4 border-2 border-orange rounded-xl bg-white flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search segment by name, code (e.g. S1), or keyword..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="input-base pl-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Showing {filteredSegments.length} active segments</span>
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="text-orange font-semibold hover:underline ml-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredSegments.map((segment) => (
              <SegmentCard
                key={segment.code}
                segment={segment}
                initiallyExpanded={segment.code === selectedSegmentCode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
