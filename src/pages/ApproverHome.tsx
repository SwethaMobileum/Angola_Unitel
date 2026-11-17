import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Percent,
  Lock,
  Layers,
  Database,
  FileCheck2,
  ArrowRight,
  Phone,
  Mail,
  Plus,
  X,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Clock,
  LayoutDashboard,
} from 'lucide-react';

export const ApproverHome: React.FC = () => {
  const navigate = useNavigate();

  // Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const underwritingGuidelines = [
    {
      icon: Percent,
      title: '30% Net Income EMI Cap',
      text: 'Monthly installment must not exceed 30% of stated or verified monthly income',
      badge: 'Max 30% EMI',
    },
    {
      icon: Lock,
      title: 'Starter Financing Cap',
      text: 'S1 cash-only and S2 USSD wallet subscribers are capped at 50,000 Kz for starter loans',
      badge: '50,000 Kz Cap',
    },
    {
      icon: ShieldAlert,
      title: 'Anti-Fraud SIM Swap Quarantine',
      text: 'Mandatory 30-day review hold on subscribers with SIM replacement in the last 30 days',
      badge: '30d Swap Hold',
    },
    {
      icon: Layers,
      title: 'Scoring Decision Bands',
      text: 'Auto-approval benchmark at 700+, committee review between 600-699, reject below 600',
      badge: 'Score Bands',
    },
    {
      icon: Database,
      title: 'Multi-Source Triangulation',
      text: 'Cross-checks telecom CDRs, Unitel Money (*449#), EMIS interbank, and ENDE power meters',
      badge: '6 Data Sources',
    },
    {
      icon: FileCheck2,
      title: 'Immutable Audit Logging',
      text: 'Every score version, analyst submission, and committee approval is permanently recorded',
      badge: 'Audit Trail',
    },
  ];

  const committeeFaqs = [
    {
      q: 'What is the decision protocol for pending loan applications?',
      a: 'Review the 6 automated registry checks, confirm that the EMI share percentage does not exceed 30%, inspect for any fraud overlays (e.g. SIM swap quarantine), enter a committee reason, and record the decision. An approval notification is automatically dispatched to the applicant.',
    },
    {
      q: 'How does real-time cross-portal synchronization work with Port 5173?',
      a: 'When frontline originators submit an application on Port 5173, the record is immediately committed to the shared database and pushed live to this queue via Server-Sent Events (SSE). When you click Approve here, the applicant on Port 5173 sees their status change to Approved in real time.',
    },
    {
      q: 'How does the Zero-Penalty Principle protect unbanked subscribers?',
      a: 'If an applicant lacks bank records (S1, S2, S3) or utility meters, the scoring engine reweights available telecom and wallet points so that missing records never lower the candidate’s score below their verified baseline.',
    },
    {
      q: 'Can administrators recalibrate scoring weights or block multipliers?',
      a: 'Yes. Administrators can use the Points Panel tab to adjust base points, block weights (P, T, W, B, X, A), test sensitivity against benchmark customer personas, and publish new scoring configurations.',
    },
    {
      q: 'How are email notices delivered to subscribers and committee members?',
      a: 'Transactional HTML emails are dispatched immediately via Brevo REST API and Gmail SMTP endpoints. Every delivery is traceable in the Notifications ledger with full HTML payload inspection.',
    },
  ];

  return (
    <div className="space-y-8 pb-12 w-full min-w-0 animate-in fade-in duration-300">
      {/* 1. Hero Welcome Banner - Immersed in the Full-Bleed Real Angola Image Theme */}
      <section className="bg-white/12 backdrop-blur-md rounded-3xl p-6 sm:p-10 lg:p-12 border border-white/20 shadow-2xl text-white space-y-6">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal/30 border border-teal/50 text-teal-200 text-xs font-bold uppercase tracking-wider backdrop-blur-xs shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-teal" />
            <span>Credit Committee & Portfolio Governance</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading tracking-tight text-white leading-tight drop-shadow-md">
            Institutional risk intelligence and loan underwriting.
          </h1>

          <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed max-w-2xl drop-shadow-xs">
            Review equipment financing queues, calibrate multi-segment proxy scoring, and monitor portfolio credit performance across Angola in real time.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/approver/queue')}
              className="btn-orange px-6 py-3.5 text-sm font-bold shadow-xl shadow-orange/40 flex items-center gap-2 cursor-pointer hover:scale-[1.02] transition-transform rounded-2xl"
            >
              <span>Review Applications Queue</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/approver/dashboard')}
              className="px-5 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-sm font-bold border border-white/25 backdrop-blur-xs transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Portfolio Dashboard</span>
            </button>
          </div>

          {/* Quick Stats in Frosted Glass */}
          <div className="grid grid-cols-3 gap-3 pt-5 border-t border-white/20">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <div className="text-lg sm:text-xl font-black text-amber-300 font-mono">100% Live</div>
              <div className="text-[11px] text-slate-200 font-medium">Cross-portal sync</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <div className="text-lg sm:text-xl font-black text-amber-300 font-mono">6 Registries</div>
              <div className="text-[11px] text-slate-200 font-medium">Automated triangulation</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <div className="text-lg sm:text-xl font-black text-amber-300 font-mono">Zero-Penalty</div>
              <div className="text-[11px] text-slate-200 font-medium">Thin-file protection</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Policy & Underwriting Guidelines - Glassmorphic Pill Cards Matching User's Design */}
      <section className="bg-white/12 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-white/20 shadow-2xl text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: 6 Rounded Pill Cards */}
          <div className="lg:col-span-7 space-y-3">
            {underwritingGuidelines.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl p-3.5 sm:p-4 bg-white/15 backdrop-blur-md border border-white/25 hover:bg-white/25 hover:border-white/40 transition-all flex items-center justify-between gap-3 shadow-md group text-white"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/25 border border-white/35 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform text-amber-300">
                      <Icon className="w-5 h-5 text-amber-300" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate drop-shadow-xs">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-200 line-clamp-1 mt-0.5">
                        {item.text}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-[11px] font-bold text-amber-200 bg-orange/40 px-3 py-1 rounded-full border border-orange/50 font-mono whitespace-nowrap shadow-xs">
                    {item.badge}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right Column: Clean Heading & Open Queue CTA */}
          <div className="lg:col-span-5 space-y-5 lg:pl-4">
            <div className="space-y-3">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                Risk Governance Matrix
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading leading-tight drop-shadow-sm">
                Are you <span className="text-orange font-extrabold">governing</span> credit to policy?
              </h2>
              <p className="text-sm text-slate-200 leading-relaxed">
                The 2026 Unitel Credit Underwriting Framework aligns frontline accessibility with institutional solvency and BNA regulatory standards.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/approver/queue')}
                className="btn-orange px-8 py-3.5 text-sm font-bold shadow-xl shadow-orange/40 rounded-2xl flex items-center gap-2 cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <span>Launch Review Queue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-4 flex items-center gap-4 text-xs text-slate-200 border-t border-white/20">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>BNA Regulatory Aligned</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>30% Cap Enforced</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Underwriting Desk & FAQ Section - Glassmorphic Cards Matching User's Design */}
      <section className="bg-white/12 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-white/20 shadow-2xl text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Underwriter guidance & contact */}
          <div className="lg:col-span-4 space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                Support & Verification
              </span>
              <h3 className="text-3xl font-extrabold text-white font-heading">
                Underwriter <span className="text-orange font-extrabold">desk?</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                Credit committee operational desk. Consult Credit Risk Operations for underwriting exceptions or scoring weights calibration.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {/* Internal extension */}
              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-white/25 border border-white/35 flex items-center justify-center text-amber-300 shrink-0">
                  <Phone className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Internal Operations Desk
                  </div>
                  <div className="text-sm font-bold text-white font-mono">
                    +244 222 000 401
                  </div>
                </div>
              </div>

              {/* Committee email */}
              <a
                href="mailto:comite.credito@unitel.ao"
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 hover:bg-white/25 transition-all group text-white shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-white/25 border border-white/35 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform shrink-0">
                  <Mail className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Credit Committee Inbox
                  </div>
                  <div className="text-sm font-bold text-white font-mono truncate">
                    comite.credito@unitel.ao
                  </div>
                </div>
              </a>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 text-xs text-slate-200 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Committee quorum active Mon–Fri 08:30 – 17:30 WAT</span>
            </div>
          </div>

          {/* Right Column: Committee Accordion Questions */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
            <div className="divide-y divide-white/20">
              {committeeFaqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="py-4 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-center justify-between text-left gap-4 font-bold text-sm sm:text-base text-white hover:text-amber-300 transition-colors cursor-pointer group"
                    >
                      <span className="leading-snug">{faq.q}</span>
                      <span className="w-7 h-7 rounded-full bg-white/20 group-hover:bg-orange flex items-center justify-center shrink-0 transition-colors text-white">
                        {isOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </span>
                    </button>

                    {isOpen && (
                      <p className="text-xs sm:text-sm text-slate-200 mt-3 leading-relaxed animate-in fade-in duration-200 pl-1">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/20">
              <span className="text-xs text-slate-200 font-medium">
                Want to calibrate segment weights or risk parameters?
              </span>
              <button
                type="button"
                onClick={() => navigate('/approver/points-panel')}
                className="px-4 py-2 rounded-xl bg-orange hover:bg-orange-btn text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Points Panel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
