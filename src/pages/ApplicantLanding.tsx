import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Building2,
  TrendingUp,
  Phone,
  Mail,
  Plus,
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  LogIn,
  Lock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface ApplicantLandingProps {
  embeddedInPortal?: boolean;
}

export const ApplicantLanding: React.FC<ApplicantLandingProps> = ({ embeddedInPortal = false }) => {
  const navigate = useNavigate();

  // 1. 3-Image Carousel rotating every 4 seconds
  const slides = [
    '/applicant_slide_1.jpg',
    '/applicant_slide_2.jpg',
    '/applicant_slide_3.jpg',
  ];
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // 2. Interactive Lead Capture Card State
  const [phoneInput, setPhoneInput] = useState('923 000 101');
  const [termsAgreed, setTermsAgreed] = useState(true);
  const [simConfirmed, setSimConfirmed] = useState(true);
  const [captchaCode, setCaptchaCode] = useState('U7SE1');
  const [captchaInput, setCaptchaInput] = useState('U7SE1');

  const refreshCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput(code);
  };

  // 3. Interactive Equipment Loan & EMI Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(60000); // 18,000 to 250,000 Kz
  const [calcInterest, setCalcInterest] = useState<number>(0); // 0% starter interest to 8%
  const [calcTenure, setCalcTenure] = useState<number>(12); // 6 or 12 months
  const [showCalculatorBenefits, setShowCalculatorBenefits] = useState<boolean>(true);

  // EMI Computations
  const totalInterest = Math.round(calcAmount * (calcInterest / 100) * (calcTenure / 12));
  const totalRepayment = calcAmount + totalInterest;
  const monthlyEmi = Math.round(totalRepayment / calcTenure);

  // Donut chart math
  const principalShare = totalRepayment > 0 ? (calcAmount / totalRepayment) : 1;
  const circumference = 251.2; // 2 * pi * 40
  const principalDash = circumference * principalShare;
  const interestDash = circumference * (1 - principalShare);

  // Dynamic slider track fill percentages (Left side filled orange, right side gray)
  const amountPct = Math.min(100, Math.max(0, ((calcAmount - 18000) / (250000 - 18000)) * 100));
  const interestPct = Math.min(100, Math.max(0, ((calcInterest - 0) / (8 - 0)) * 100));
  const tenurePct = Math.min(100, Math.max(0, ((calcTenure - 6) / (12 - 6)) * 100));

  // 4. Accordion state for FAQs
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleEnterPortal = () => {
    navigate('/applicant/dashboard');
  };

  const eligibilityCriteria = [
    {
      icon: Calendar,
      title: 'Repayment Period',
      text: 'Flexible terms of 6 or 12 months with fixed monthly installments',
      badge: '6 - 12 Months',
    },
    {
      icon: ShieldCheck,
      title: 'Age Eligibility',
      text: 'Must be between 18 and 65 years old with valid Bilhete de Identidade (BI)',
      badge: 'Age 18 - 65',
    },
    {
      icon: Smartphone,
      title: 'Active Unitel Subscriber',
      text: 'Active Unitel SIM card with at least 3 months tenure and regular recharges',
      badge: 'Unitel SIM',
    },
    {
      icon: CreditCard,
      title: 'Affordable Equipment Plans',
      text: 'Smartphone & solar equipment financing available from 18,000 Kz (EMI from 3,000 Kz/mo)',
      badge: 'From 18,000 Kz',
    },
    {
      icon: Building2,
      title: 'Unitel Money or Bank Account',
      text: 'Active Unitel Money (*449#) wallet or verified salary direct deposit in Multicaixa',
      badge: 'USSD / Bank',
    },
    {
      icon: TrendingUp,
      title: 'Minimum Proxy Credit Score',
      text: 'A minimum proxy score of 600 / 900 evaluated across 6 automated operator registries',
      badge: 'Score ≥ 600',
    },
  ];

  const faqs = [
    {
      q: 'Which equipment can I finance through Unitel?',
      a: 'We finance official 4G smartphones (Samsung Galaxy, Xiaomi Redmi, Unitel Smart), pocket Wi-Fi routers, tablets, and home solar kits starting from 18,000 Kz with flexible 6 or 12-month installments.',
    },
    {
      q: 'How does the credit scoring system evaluate my application?',
      a: 'The platform analyzes 6 real-time data sources: SIM tenure, airtime recharge frequency, Unitel Money USSD activity, bank payroll, utility meters, and national identity records. Missing data sources are never penalized.',
    },
    {
      q: 'How fast is the equipment financing decision?',
      a: 'Decisions are generated in under 10 seconds. Once you enter your phone number, our automated engine computes your score, verifies limits, and sends immediate notifications to your email and phone.',
    },
    {
      q: 'Where do I collect the equipment after approval?',
      a: 'Once approved, you can pick up your brand-new equipment at any official Unitel Store across Luanda and all 18 Angolan provinces by presenting your Bilhete de Identidade (BI).',
    },
    {
      q: 'Are there any hidden charges or upfront interest fees?',
      a: 'No. Unitel starter equipment loans carry 0% introductory financing with transparent monthly EMI capped at 30% of your stated or estimated income.',
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
              backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.40) 0%, rgba(15, 23, 42, 0.48) 50%, rgba(15, 23, 42, 0.68) 100%), url('${slide}')`,
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
              <div className="text-xs font-bold text-amber-300 tracking-wider">
                Angola Equipment Financing
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
              <span>Enter Applicant Portal</span>
            </button>
          </div>
        </header>
      )}

      {/* 3. Main Landing Page Content in Zig-Zag Layout */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16 w-full min-w-0 font-sans">
        
        {/* Section 1: Hero Zig-Zag (Text on LEFT, White Lead Capture Card on RIGHT) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Heading, description, and stats floating cleanly on photo */}
          <div className="lg:col-span-7 space-y-6 text-white drop-shadow-md">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange/40 border border-orange/60 text-amber-200 text-xs font-bold uppercase tracking-wider backdrop-blur-xs shadow-xs font-heading">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Angola Telecom Equipment Financing</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-heading tracking-tight text-white leading-tight">
              Get your next smartphone with instant credit.
            </h1>

            <p className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed max-w-xl">
              Experience a seamless device financing process with 0% starter interest, instant approvals, and minimal paperwork across Angola.
            </p>

            {/* Quick Stat Badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 max-w-lg">
              <div className="p-3.5 rounded-2xl bg-slate-950/50 backdrop-blur-md border border-white/20 text-white">
                <div className="text-xl sm:text-2xl font-black text-amber-300 font-heading">10s</div>
                <div className="text-xs text-slate-200 font-medium mt-0.5">Instant decision</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/50 backdrop-blur-md border border-white/20 text-white">
                <div className="text-xl sm:text-2xl font-black text-amber-300 font-heading">18,000 Kz</div>
                <div className="text-xs text-slate-200 font-medium mt-0.5">Loans start from</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/50 backdrop-blur-md border border-white/20 text-white">
                <div className="text-xl sm:text-2xl font-black text-amber-300 font-heading">18 Provinces</div>
                <div className="text-xs text-slate-200 font-medium mt-0.5">Nationwide pickup</div>
              </div>
            </div>
          </div>

          {/* Right Column: Solid White Lead Capture Card with Checkbox & Security Code (from User's Mockup) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 w-full max-w-md space-y-5">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-orange uppercase tracking-wider font-heading">
                  Smartphone Loans up to 150,000 Kz
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 font-heading leading-tight">
                  Check Pre-Approved Limits
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your mobile number to evaluate your Unitel subscriber score and immediate loan offer.
                </p>
              </div>

              {/* Mobile Phone Input with +244 and Phone Icon */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number <span className="text-orange">*</span>
                  </label>
                  <div className="flex rounded-xl border border-slate-300 bg-slate-50 overflow-hidden focus-within:border-orange focus-within:ring-2 focus-within:ring-orange/20 transition-all">
                    <span className="inline-flex items-center px-3.5 text-xs font-bold text-slate-700 bg-slate-100 border-r border-slate-300">
                      +244
                    </span>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-800 bg-transparent outline-none font-sans"
                      placeholder="923 000 000"
                    />
                    <div className="flex items-center pr-3 text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Consent Checkboxes */}
                <div className="space-y-2 pt-1 text-xs text-slate-600">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                      className="mt-0.5 rounded text-orange focus:ring-orange border-slate-300"
                    />
                    <span>
                      I agree to the <strong className="text-orange underline font-semibold">Terms and Conditions</strong>
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={simConfirmed}
                      onChange={(e) => setSimConfirmed(e.target.checked)}
                      className="mt-0.5 rounded text-orange focus:ring-orange border-slate-300"
                    />
                    <span>
                      I confirm I am an <strong className="text-slate-800 font-semibold">active Unitel subscriber</strong> with tenure ≥ 3 months
                    </span>
                  </label>
                </div>

                {/* Security Verification Code Badge & Input */}
                <div className="pt-1 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Security Verification <span className="text-orange">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div
                      title="Click refresh to generate new security code"
                      className="px-3.5 py-1.5 rounded-lg bg-slate-100 border border-slate-300 font-heading text-base font-black tracking-widest text-slate-700 select-none line-through decoration-slate-400 decoration-1"
                    >
                      {captchaCode}
                    </div>
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-orange transition-colors cursor-pointer"
                      title="Refresh verification code"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="text"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      placeholder="Enter characters"
                      className="flex-1 px-3 py-1.5 text-xs font-sans font-semibold rounded-lg border border-slate-300 bg-slate-50 focus:border-orange focus:outline-none"
                    />
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
                  <Lock className="w-3.5 h-3.5 text-orange" />
                  <span>SAFE &amp; SECURE</span>
                </div>
                <div className="flex items-center gap-1 text-orange">
                  <Clock className="w-3.5 h-3.5" />
                  <span>10s DECISION</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Interactive Equipment Loan & EMI Calculator (Feature from User's Idea 1) - Compact Size */}
        <section className="max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl shadow-xl p-5 sm:p-7 border border-slate-100 space-y-5 font-sans">
          <div className="max-w-xl space-y-1">
            <span className="text-[11px] font-bold text-orange uppercase tracking-wider font-heading">
              Planning &amp; Affordability
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Equipment Loan &amp; Monthly EMI Calculator
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Estimate your monthly installment based on smartphone financing amount, tenure, and introductory 0% starter rate.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Sliders on Left (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Slider 1: Loan Amount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Financing Amount <span className="text-orange">*</span>
                  </span>
                  <div className="px-2.5 py-0.5 rounded-md bg-orange-soft border border-orange-border text-xs font-black font-heading text-orange">
                    {calcAmount.toLocaleString()} Kz
                  </div>
                </div>
                <input
                  type="range"
                  min={18000}
                  max={250000}
                  step={2000}
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #F26B1D 0%, #F26B1D ${amountPct}%, #E2E8F0 ${amountPct}%, #E2E8F0 100%)`,
                  }}
                  className="slider-orange"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>18,000 Kz (Starter)</span>
                  <span>250,000 Kz (Premium)</span>
                </div>
              </div>

              {/* Slider 2: Interest Rate */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Interest Rate <span className="text-orange">*</span>
                  </span>
                  <div className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-xs font-black font-heading text-slate-800">
                    {calcInterest}% APR
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={1}
                  value={calcInterest}
                  onChange={(e) => setCalcInterest(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #F26B1D 0%, #F26B1D ${interestPct}%, #E2E8F0 ${interestPct}%, #E2E8F0 100%)`,
                  }}
                  className="slider-orange"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span className="text-emerald-600 font-bold">0% (Starter Special)</span>
                  <span>8% Max</span>
                </div>
              </div>

              {/* Slider 3: Loan Tenure */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Repayment Tenure <span className="text-orange">*</span>
                  </span>
                  <div className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-xs font-black font-heading text-slate-800">
                    {calcTenure} Months
                  </div>
                </div>
                <input
                  type="range"
                  min={6}
                  max={12}
                  step={6}
                  value={calcTenure}
                  onChange={(e) => setCalcTenure(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #F26B1D 0%, #F26B1D ${tenurePct}%, #E2E8F0 ${tenurePct}%, #E2E8F0 100%)`,
                  }}
                  className="slider-orange"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>6 Months</span>
                  <span>12 Months</span>
                </div>
              </div>

              {/* APR & Tenure Cards */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Annual Percentage Rate (APR)</div>
                  <div className="text-base font-black text-slate-900 font-heading mt-0.5">0% – 8%</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">0% introductory promotion</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Equipment Loan Tenure</div>
                  <div className="text-base font-black text-slate-900 font-heading mt-0.5">6 or 12 Mo</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Fixed monthly direct debit</div>
                </div>
              </div>
            </div>

            {/* Output Donut Card on Right (5 cols) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-xs rounded-2xl p-4 bg-slate-50 border border-slate-200 space-y-4 text-center">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Your Monthly EMI
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-orange font-heading mt-0.5">
                    {monthlyEmi.toLocaleString()} Kz
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    {calcInterest}% Interest per annum
                  </div>
                </div>

                {/* Circular SVG Donut Breakdown (Compact 28x28) */}
                <div className="relative w-28 h-28 mx-auto">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#E2E8F0"
                      strokeWidth="14"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#FF6600"
                      strokeWidth="14"
                      strokeDasharray={`${principalDash} ${circumference}`}
                    />
                    {calcInterest > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#1E293B"
                        strokeWidth="14"
                        strokeDasharray={`${interestDash} ${circumference}`}
                        strokeDashoffset={-principalDash}
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Tenure</span>
                    <span className="text-xs font-black text-slate-800 font-heading">{calcTenure} Mo</span>
                  </div>
                </div>

                {/* Breakdown numbers */}
                <div className="grid grid-cols-2 gap-2 text-left pt-2 border-t border-slate-200 text-[11px]">
                  <div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-orange" />
                      <span>Principal:</span>
                    </div>
                    <div className="font-bold text-slate-900 font-heading mt-0.5">
                      {calcAmount.toLocaleString()} Kz
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-slate-800" />
                      <span>Total Interest:</span>
                    </div>
                    <div className="font-bold text-slate-900 font-heading mt-0.5">
                      {totalInterest.toLocaleString()} Kz
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700">Total Repayment:</span>
                  <span className="font-black text-slate-900 font-heading text-xs">
                    {totalRepayment.toLocaleString()} Kz
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Accordion Box (Compact) */}
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowCalculatorBenefits(!showCalculatorBenefits)}
              className="flex items-center justify-between w-full text-left font-bold text-xs text-orange hover:text-orange-btn transition-colors cursor-pointer"
            >
              <span>Benefits of using Unitel EMI Calculator</span>
              {showCalculatorBenefits ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showCalculatorBenefits && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2.5 text-[11px] text-slate-600 animate-in fade-in duration-200">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange shrink-0 mt-0.5" />
                  <span>Easy personal device loan planning tool that's transparent and simple to access</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange shrink-0 mt-0.5" />
                  <span>Instant EMI calculations before you apply, ensuring your 30% income safety cap</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange shrink-0 mt-0.5" />
                  <span>Catered specifically for Unitel subscribers across all 18 provinces with 0% starter promotions</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange shrink-0 mt-0.5" />
                  <span>Helps choose between 6 or 12 month installments without unexpected hidden administrative fees</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Subscriber Requirements (TRANSPARENT Text Tile on LEFT, 6 White Cards on RIGHT) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: TRANSPARENT Tile letting the background image show through */}
          <div className="lg:col-span-5 bg-transparent p-2 text-white drop-shadow-md space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-heading">
                Subscriber Requirements
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading leading-tight drop-shadow-sm">
                Are you <span className="text-orange font-extrabold">eligible</span> for our loan?
              </h2>
              <p className="text-sm text-slate-100 leading-relaxed drop-shadow-xs">
                To qualify for Unitel equipment financing, subscribers must meet straightforward telecom, identity, and financial criteria.
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-3 pt-1 text-xs font-semibold text-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                </div>
                <span>100% Zero-Penalty Policy for thin-file subscribers</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                </div>
                <span>30% Net Income EMI Cap Safety Guarantee</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                </div>
                <span>18 Provinces nationwide pickup across Unitel Stores</span>
              </div>
            </div>
          </div>

          {/* Right Column: 6 Solid White Pill Cards */}
          <div className="lg:col-span-7 space-y-3">
            {eligibilityCriteria.map((item, idx) => {
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

        {/* Section 4: Subscriber Assistance & FAQs (White FAQ Accordion on LEFT, TRANSPARENT Assistance on RIGHT) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start font-sans">
          {/* Left Column: FAQ Accordion in Solid White Tile */}
          <div className="lg:col-span-7">
            <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 space-y-4">
              <div className="space-y-1 pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-orange uppercase tracking-wider font-heading">
                  Frequently Asked Questions
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 font-heading">
                  Subscriber Financing Guidance
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {faqs.map((faq, idx) => {
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

          {/* Right Column: TRANSPARENT Subscriber Assistance Tile letting image show through */}
          <div className="lg:col-span-5 bg-transparent p-2 text-white drop-shadow-md space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-heading">
                Subscriber Assistance
              </span>
              <h3 className="text-3xl font-extrabold text-white font-heading">
                Need <span className="text-orange font-extrabold">help?</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-sans">
                Have questions about your device eligibility or application status? Our frontline support team is ready to assist you.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* Phone Card with Translucent Glass Style */}
              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-950/45 backdrop-blur-md border border-white/20 text-white">
                <div className="w-10 h-10 rounded-xl bg-orange/30 border border-orange/50 flex items-center justify-center text-amber-300 shrink-0">
                  <Phone className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Unitel Support Hotline
                  </div>
                  <div className="text-sm font-bold text-white font-heading">
                    +244 923 192 192
                  </div>
                </div>
              </div>

              {/* Email Card with Translucent Glass Style */}
              <a
                href="mailto:credito@unitel.ao"
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-950/45 backdrop-blur-md border border-white/20 hover:bg-slate-950/60 transition-all group text-white"
              >
                <div className="w-10 h-10 rounded-xl bg-orange/30 border border-orange/50 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform shrink-0">
                  <Mail className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Financing Inquiries
                  </div>
                  <div className="text-sm font-bold text-white font-heading truncate">
                    credito@unitel.ao
                  </div>
                </div>
              </a>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/45 backdrop-blur-md border border-white/20 text-xs text-slate-200 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Stores open Mon–Sat 08:00 – 19:00 across Angola</span>
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
            <span className="font-bold text-white">Unitel Credit Intelligence</span>
            <span className="text-slate-400">&bull;</span>
            <span>Angola Telecom Equipment Financing</span>
          </div>
          <div>
            &copy; 2026 Unitel S.A. All rights reserved. Luanda, Angola.
          </div>
        </div>
      </footer>
    </div>
  );
};
