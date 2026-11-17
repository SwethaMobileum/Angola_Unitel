import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Building2,
  TrendingUp,
  ArrowRight,
  Phone,
  Mail,
  Plus,
  X,
  Sparkles,
  CheckCircle2,
  Store,
  Clock,
} from 'lucide-react';

export const ApplicantHome: React.FC = () => {
  const navigate = useNavigate();

  // Accordion state for FAQs
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
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
    <div className="space-y-8 pb-12 w-full min-w-0 animate-in fade-in duration-300">
      {/* 1. Hero Welcome Banner - Immersed in the Full-Bleed Real Angola Image Theme */}
      <section className="bg-white/12 backdrop-blur-md rounded-3xl p-6 sm:p-10 lg:p-12 border border-white/20 shadow-2xl text-white space-y-6">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange/30 border border-orange/50 text-amber-200 text-xs font-bold uppercase tracking-wider backdrop-blur-xs shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-orange" />
            <span>Angola Telecom Equipment Financing</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading tracking-tight text-white leading-tight drop-shadow-md">
            Get your next smartphone with instant credit.
          </h1>

          <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed max-w-2xl drop-shadow-xs">
            Fast, transparent device financing for Unitel subscribers across Angola. Apply in 6 simple steps with 0% starter interest and instant operator pre-fill.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/applicant/new')}
              className="btn-orange px-6 py-3.5 text-sm font-bold shadow-xl shadow-orange/40 flex items-center gap-2 cursor-pointer hover:scale-[1.02] transition-transform rounded-2xl"
            >
              <span>Apply for Equipment Loan</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/applicant/applications')}
              className="px-5 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-sm font-bold border border-white/25 backdrop-blur-xs transition-all cursor-pointer shadow-md"
            >
              My Applications
            </button>
          </div>

          {/* Quick Feature Badges in Frosted Glass */}
          <div className="grid grid-cols-3 gap-3 pt-5 border-t border-white/20">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <div className="text-lg sm:text-xl font-black text-amber-300 font-mono">10s</div>
              <div className="text-[11px] text-slate-200 font-medium">Instant decision</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <div className="text-lg sm:text-xl font-black text-amber-300 font-mono">18,000 Kz</div>
              <div className="text-[11px] text-slate-200 font-medium">Loans start from</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <div className="text-lg sm:text-xl font-black text-amber-300 font-mono">18 Provinces</div>
              <div className="text-[11px] text-slate-200 font-medium">Nationwide pickup</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Eligibility Section - Glassmorphic Pill Cards Matching User's Design */}
      <section className="bg-white/12 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-white/20 shadow-2xl text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: 6 Rounded Pill Cards */}
          <div className="lg:col-span-7 space-y-3">
            {eligibilityCriteria.map((item, idx) => {
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

          {/* Right Column: Clean Heading & Get Started CTA */}
          <div className="lg:col-span-5 space-y-5 lg:pl-4">
            <div className="space-y-3">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                Subscriber Requirements
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading leading-tight drop-shadow-sm">
                Are you <span className="text-orange font-extrabold">eligible</span> for our loan?
              </h2>
              <p className="text-sm text-slate-200 leading-relaxed">
                To qualify for Unitel equipment financing, subscribers must meet straightforward telecom, identity, and financial criteria.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/applicant/new')}
                className="btn-orange px-8 py-3.5 text-sm font-bold shadow-xl shadow-orange/40 rounded-2xl flex items-center gap-2 cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-4 flex items-center gap-4 text-xs text-slate-200 border-t border-white/15">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>No paperwork</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-400" />
                <span>Unitel Store pickup</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Need Help? & FAQ Section - Frosted Glass Layout Matching User's Design */}
      <section className="bg-white/12 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-white/20 shadow-2xl text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Need help title & contact channels */}
          <div className="lg:col-span-4 space-y-5">
            <div className="space-y-2">
              <h3 className="text-3xl font-extrabold text-white font-heading drop-shadow-xs">
                Need <span className="text-orange font-extrabold">help?</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                Here are some frequently asked questions. Reach out to our credit support team anytime between 8 AM - 8 PM from Monday to Saturday.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {/* Phone card */}
              <a
                href="tel:+244923000100"
                className="flex items-center gap-3 p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 hover:bg-white/25 transition-all group shadow-sm text-white"
              >
                <div className="w-10 h-10 rounded-xl bg-orange/30 border border-orange/50 flex items-center justify-center text-amber-200 group-hover:scale-105 transition-transform">
                  <Phone className="w-4 h-4 text-amber-200" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Unitel Customer Care
                  </div>
                  <div className="text-sm font-bold text-white font-mono">
                    +244 923 000 100
                  </div>
                </div>
              </a>

              {/* Email card */}
              <a
                href="mailto:apoio.credito@unitel.ao"
                className="flex items-center gap-3 p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 hover:bg-white/25 transition-all group shadow-sm text-white"
              >
                <div className="w-10 h-10 rounded-xl bg-orange/30 border border-orange/50 flex items-center justify-center text-amber-200 group-hover:scale-105 transition-transform">
                  <Mail className="w-4 h-4 text-amber-200" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Financing Support Desk
                  </div>
                  <div className="text-sm font-bold text-white font-mono truncate">
                    apoio.credito@unitel.ao
                  </div>
                </div>
              </a>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/20 text-xs text-slate-200 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Instant WhatsApp support active during business hours</span>
            </div>
          </div>

          {/* Right Column: Accordion Questions */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
            <div className="divide-y divide-white/15">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="py-4 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-center justify-between text-left gap-4 font-bold text-sm sm:text-base text-white hover:text-amber-300 transition-colors cursor-pointer group"
                    >
                      <span className="leading-snug drop-shadow-xs">{faq.q}</span>
                      <span className="w-7 h-7 rounded-full bg-white/20 group-hover:bg-orange flex items-center justify-center shrink-0 transition-colors text-white">
                        {isOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </span>
                    </button>

                    {isOpen && (
                      <p className="text-xs sm:text-sm text-slate-200 mt-3 leading-relaxed animate-in fade-in duration-200">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/15">
              <span className="text-xs text-slate-300 font-medium">
                Need more information on scoring formulas or repayment?
              </span>
              <button
                type="button"
                onClick={() => navigate('/applicant/new')}
                className="px-4 py-2 rounded-xl bg-white/15 hover:bg-orange text-white text-xs font-bold transition-all border border-white/25 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Start Application</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
