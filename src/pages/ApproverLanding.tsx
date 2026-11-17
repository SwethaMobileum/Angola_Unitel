import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Percent,
  Lock,
  Layers,
  Database,
  FileCheck2,
  Phone,
  Mail,
  Plus,
  X,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Clock,
  LogIn,
  Sliders,
} from 'lucide-react';

export interface ApproverLandingProps {
  embeddedInPortal?: boolean;
}

export const ApproverLanding: React.FC<ApproverLandingProps> = ({ embeddedInPortal = false }) => {
  const navigate = useNavigate();

  // 1. 3-Image Carousel rotating every 4 seconds
  const slides = [
    '/approver_slide_1.jpg',
    '/approver_slide_2.jpg',
    '/approver_slide_3.jpg',
  ];
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // 2. Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleEnterPortal = () => {
    navigate('/approver/dashboard');
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
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-sans">
      {/* 1. Full-Bleed 3-Image Smooth Rotating Carousel Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {slides.map((slide, idx) => (
          <div
            key={idx}
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.40) 0%, rgba(15, 32, 54, 0.50) 50%, rgba(15, 23, 42, 0.70) 100%), url('${slide}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 20%',
            }}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              currentSlide === idx ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
      </div>

      {/* 2. Sleek Landing Top Navigation Bar (Only on standalone landing page) */}
      {!embeddedInPortal && (
        <header className="relative z-20 sticky top-0 h-20 bg-slate-950/60 backdrop-blur-md border-b border-white/15 px-4 sm:px-8 flex items-center justify-between text-white font-sans">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange flex items-center justify-center font-black text-white text-sm shadow-md shadow-orange/40 border border-orange-btn shrink-0 font-heading">
              UCI
            </div>
            <div>
              <div className="text-base sm:text-lg font-black tracking-wide uppercase text-white leading-tight font-heading">
                Unitel Telecom
              </div>
              <div className="text-xs font-bold text-teal-300 tracking-wider">
                Credit Committee &amp; Underwriting
              </div>
            </div>
          </div>

          {/* Carousel Slide Indicators & Enter Portal Button */}
          <div className="flex items-center gap-4">
            {/* 3 Slide Indicator Pills */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xs border border-white/15">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentSlide === idx ? 'w-6 bg-orange' : 'w-2 bg-white/40 hover:bg-white/80'
                  }`}
                  title={`Photo slide ${idx + 1}`}
                  aria-label={`Photo slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleEnterPortal}
              className="btn-orange px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-orange/40 flex items-center gap-2 cursor-pointer hover:scale-[1.02] transition-transform font-heading"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Enter Approver Portal</span>
            </button>
          </div>
        </header>
      )}

      {/* 3. Main Landing Page Content in Zig-Zag Layout */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16 w-full min-w-0 font-sans">
        
        {/* Section 1: Hero Zig-Zag (Text on LEFT, White Committee Terminal Card on RIGHT) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Heading, description, and stats floating cleanly on photo */}
          <div className="lg:col-span-7 space-y-6 text-white drop-shadow-md">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal/30 border border-teal/50 text-teal-200 text-xs font-bold uppercase tracking-wider backdrop-blur-xs shadow-xs font-heading">
              <ShieldCheck className="w-3.5 h-3.5 text-teal" />
              <span>Credit Committee &amp; Portfolio Governance</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-heading tracking-tight text-white leading-tight">
              Institutional risk intelligence and loan underwriting.
            </h1>

            <p className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed max-w-xl">
              Review equipment financing queues, calibrate multi-segment proxy scoring, and monitor portfolio credit performance across Angola in real time.
            </p>

            {/* Quick Stat Badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 max-w-lg">
              <div className="p-3.5 rounded-2xl bg-slate-950/50 backdrop-blur-md border border-white/20 text-white">
                <div className="text-xl sm:text-2xl font-black text-amber-300 font-heading">100% Live</div>
                <div className="text-xs text-slate-200 font-medium mt-0.5">Cross-portal sync</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/50 backdrop-blur-md border border-white/20 text-white">
                <div className="text-xl sm:text-2xl font-black text-amber-300 font-heading">6 Registries</div>
                <div className="text-xs text-slate-200 font-medium mt-0.5">Automated triangulation</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/50 backdrop-blur-md border border-white/20 text-white">
                <div className="text-xl sm:text-2xl font-black text-amber-300 font-heading">Zero-Penalty</div>
                <div className="text-xs text-slate-200 font-medium mt-0.5">Thin-file protection</div>
              </div>
            </div>
          </div>

          {/* Right Column: Solid White Committee Underwriting Terminal Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 w-full max-w-md space-y-6">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange uppercase tracking-wider font-heading">
                    Committee Workspace
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-heading">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE SSE SYNC
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 font-heading leading-tight">
                  Credit Risk Underwriting
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Authorized Credit Committee Members &amp; Administrators. Review subscriber financing applications, risk scores, and calibrate scoring models.
                </p>
              </div>

              {/* Committee Live Triage Queue Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 font-sans">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-heading">
                  Live Queue Underwriting Triage
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="text-base font-black text-emerald-600 font-heading">8</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">Fast-Track</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="text-base font-black text-amber-600 font-heading">3</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">Under Review</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="text-base font-black text-red-600 font-heading">1</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">Fraud Hold</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pt-1 border-t border-slate-200/80">
                  <span>Authorized Roles:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-orange-soft text-orange text-[10px] font-bold font-heading">
                      Dra. Maria (Approver)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold font-heading">
                      Eng. Carlos (Admin)
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <div className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>BNA REGULATED</span>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <ShieldAlert className="w-3.5 h-3.5 text-orange" />
                  <span>IMMUTABLE AUDIT</span>
                </div>
                <div className="flex items-center gap-1 text-orange">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>ZERO-PENALTY</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Credit Scoring Spectrum & Threshold Matrix (Calibrated to Unitel 300-900 Engine) */}
        <section className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-10 border border-slate-100 space-y-8 font-sans">
          <div className="max-w-3xl space-y-2">
            <span className="text-xs font-bold text-orange uppercase tracking-wider font-heading">
              Scoring Model Calibration &amp; Benchmark
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              What's the Scoring Scale for <span className="text-orange font-extrabold">Unitel Equipment Financing?</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed font-sans">
              The Unitel Credit Scoring Engine evaluates subscribers on an official 300 to 900 scale across 6 automated telecom and alternative data registries. Scores of 700 and above unlock instant automated approvals up to 400,000 Kz (up to 1,000,000 Kz for Prime). Scores between 600–699 qualify for standard equipment financing, while thin-file subscribers scoring 500–599 are guaranteed starter financing under the Zero-Penalty Principle without penalties for missing bank records.
            </p>
          </div>

          {/* Visual Multi-Color Spectrum Scale Calibrated to 300-900 Score Bands */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 space-y-6">
            {/* Top Score Tiers with Arrows Matching seedData DEFAULT_SCORE_BANDS */}
            <div className="grid grid-cols-5 gap-2 text-center">
              {/* Tier 1: High Risk (300-499) */}
              <div className="space-y-1">
                <span className="inline-block text-[11px] font-bold text-[#C8372D] bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-heading">
                  High Risk
                </span>
                <div className="text-sm sm:text-base font-extrabold text-slate-900 font-heading">300 – 499</div>
                <div className="text-[11px] text-slate-500 font-sans">Credit Score</div>
                <div className="flex justify-center text-[#C8372D] font-bold text-xs mt-1">▼</div>
              </div>

              {/* Tier 2: Thin / Weak (500-599) */}
              <div className="space-y-1">
                <span className="inline-block text-[11px] font-bold text-[#F26B1D] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-heading">
                  Thin / Weak
                </span>
                <div className="text-sm sm:text-base font-extrabold text-slate-900 font-heading">500 – 599</div>
                <div className="text-[11px] text-slate-500 font-sans">Credit Score</div>
                <div className="flex justify-center text-[#F26B1D] font-bold text-xs mt-1">▼</div>
              </div>

              {/* Tier 3: Acceptable (600-699) */}
              <div className="space-y-1">
                <span className="inline-block text-[11px] font-bold text-[#D97706] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-heading">
                  Acceptable
                </span>
                <div className="text-sm sm:text-base font-extrabold text-slate-900 font-heading">600 – 699</div>
                <div className="text-[11px] text-slate-500 font-sans">Credit Score</div>
                <div className="flex justify-center text-[#D97706] font-bold text-xs mt-1">▼</div>
              </div>

              {/* Tier 4: Good (700-799) */}
              <div className="space-y-1">
                <span className="inline-block text-[11px] font-bold text-[#14808A] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-heading">
                  Good
                </span>
                <div className="text-sm sm:text-base font-extrabold text-slate-900 font-heading">700 – 799</div>
                <div className="text-[11px] text-slate-500 font-sans">Credit Score</div>
                <div className="flex justify-center text-[#14808A] font-bold text-xs mt-1">▼</div>
              </div>

              {/* Tier 5: Prime / Very Good (800-900) */}
              <div className="space-y-1">
                <span className="inline-block text-[11px] font-bold text-[#22A06B] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-heading">
                  Prime (800+)
                </span>
                <div className="text-sm sm:text-base font-extrabold text-slate-900 font-heading">800 – 900</div>
                <div className="text-[11px] text-slate-500 font-sans">Credit Score</div>
                <div className="flex justify-center text-[#22A06B] font-bold text-xs mt-1">▼</div>
              </div>
            </div>

            {/* Continuous Color Gradient Bar Matching Official Dashboard Colors */}
            <div className="h-3.5 w-full rounded-full overflow-hidden flex shadow-inner">
              <div className="h-full w-1/5 bg-[#C8372D]" title="High Risk (300 - 499)" />
              <div className="h-full w-1/5 bg-[#F26B1D]" title="Thin / Weak (500 - 599)" />
              <div className="h-full w-1/5 bg-[#FFB703]" title="Acceptable (600 - 699)" />
              <div className="h-full w-1/5 bg-[#14808A]" title="Good (700 - 799)" />
              <div className="h-full w-1/5 bg-[#22A06B]" title="Prime (800 - 900)" />
            </div>

            {/* Policy Action Summary Underneath */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-200 text-xs">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 font-heading">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Fast-Track Auto Approval</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed font-sans">
                  Subscribers scoring 700+ receive automated pre-approvals from 150,000 Kz up to 1,000,000 Kz (Prime) without manual underwriter intervention.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 font-heading">
                  <Sliders className="w-4 h-4 text-amber-600" />
                  <span>Standard Review Tier</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed font-sans">
                  Applicants scoring between 600–699 qualify for standard equipment loans up to 150,000 Kz, evaluated against the 30% net income EMI cap.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 font-heading">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Zero-Penalty Principle</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed font-sans">
                  Thin-file subscribers (500–599) receive starter financing up to 50,000 Kz evaluated solely on telecom &amp; Unitel Money data without penalization.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Risk Governance Matrix (TRANSPARENT Text Tile on LEFT, 6 White Cards on RIGHT) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: TRANSPARENT Tile letting the background image show through */}
          <div className="lg:col-span-5 bg-transparent p-2 text-white drop-shadow-md space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-heading">
                Risk Governance Matrix
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading leading-tight drop-shadow-sm">
                Are you <span className="text-orange font-extrabold">governing</span> credit to policy?
              </h2>
              <p className="text-sm text-slate-100 leading-relaxed drop-shadow-xs font-sans">
                The 2026 Unitel Credit Underwriting Framework aligns frontline accessibility with institutional solvency and BNA regulatory standards.
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-3 pt-1 text-xs font-semibold text-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                </div>
                <span>30% Net Income EMI Cap Enforced System-Wide</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                </div>
                <span>BNA Regulatory Aligned Credit Underwriting</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                </div>
                <span>Zero-Penalty Multi-Segment Proxy Scoring Engine</span>
              </div>
            </div>
          </div>

          {/* Right Column: 6 Solid White Guideline Cards */}
          <div className="lg:col-span-7 space-y-3">
            {underwritingGuidelines.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white text-slate-900 rounded-2xl p-4 border border-slate-200/80 shadow-md hover:shadow-lg hover:border-orange transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-soft border border-orange-border flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform text-orange">
                      <Icon className="w-5 h-5 text-orange" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {item.text}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-[11px] font-bold text-orange-btn bg-orange-soft px-3 py-1 rounded-full border border-orange-border/80 font-heading whitespace-nowrap shadow-2xs">
                    {item.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 4: Underwriting Desk & Committee FAQs (White FAQ Accordion on LEFT, TRANSPARENT Desk on RIGHT) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start font-sans">
          {/* Left Column: FAQ Accordion in Solid White Tile */}
          <div className="lg:col-span-7">
            <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 space-y-4">
              <div className="space-y-1 pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-orange uppercase tracking-wider font-heading">
                  Committee Guidance
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 font-heading">
                  Underwriting Protocol &amp; FAQs
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {committeeFaqs.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div key={idx} className="py-3.5 first:pt-1 last:pb-1">
                      <button
                        type="button"
                        onClick={() => toggleFaq(idx)}
                        className="w-full flex items-center justify-between text-left gap-4 font-bold text-sm sm:text-base text-slate-800 hover:text-orange transition-colors cursor-pointer group"
                      >
                        <span className="leading-snug">{faq.q}</span>
                        <span className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-orange group-hover:text-white flex items-center justify-center shrink-0 transition-colors text-slate-500">
                          {isOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </span>
                      </button>

                      {isOpen && (
                        <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed animate-in fade-in duration-200 pl-1 font-sans">
                          {faq.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: TRANSPARENT Underwriter Desk Tile letting image show through */}
          <div className="lg:col-span-5 bg-transparent p-2 text-white drop-shadow-md space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-heading">
                Support &amp; Verification
              </span>
              <h3 className="text-3xl font-extrabold text-white font-heading">
                Underwriter <span className="text-orange font-extrabold">desk?</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-sans">
                Credit committee operational desk. Consult Credit Risk Operations for underwriting exceptions or scoring weights calibration.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* Internal Extension Card with Translucent Glass Style */}
              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-950/45 backdrop-blur-md border border-white/20 text-white">
                <div className="w-10 h-10 rounded-xl bg-orange/30 border border-orange/50 flex items-center justify-center text-amber-300 shrink-0">
                  <Phone className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-heading">
                    Internal Operations Desk
                  </div>
                  <div className="text-sm font-bold text-white font-heading">
                    +244 222 000 401
                  </div>
                </div>
              </div>

              {/* Committee Email Card with Translucent Glass Style */}
              <a
                href="mailto:comite.credito@unitel.ao"
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-950/45 backdrop-blur-md border border-white/20 hover:bg-slate-950/60 transition-all group text-white"
              >
                <div className="w-10 h-10 rounded-xl bg-orange/30 border border-orange/50 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform shrink-0">
                  <Mail className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-heading">
                    Credit Committee Inbox
                  </div>
                  <div className="text-sm font-bold text-white font-heading truncate">
                    comite.credito@unitel.ao
                  </div>
                </div>
              </a>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/45 backdrop-blur-md border border-white/20 text-xs text-slate-200 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Committee quorum active Mon–Fri 08:30 – 17:30 WAT</span>
            </div>
          </div>
        </section>
      </main>

      {/* 4. Footer */}
      <footer className="relative z-10 mt-12 border-t border-white/15 bg-slate-950/80 backdrop-blur-md py-6 text-center text-xs text-slate-300">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-orange flex items-center justify-center font-black text-white text-[10px]">
              UCI
            </div>
            <span className="font-bold text-white">Unitel Credit Risk Intelligence</span>
            <span className="text-slate-400">&bull;</span>
            <span>Credit Committee &amp; Portfolio Governance</span>
          </div>
          <div>
            &copy; 2026 Unitel Credit Operations. BNA Regulatory Aligned. Luanda, Angola.
          </div>
        </div>
      </footer>
    </div>
  );
};
