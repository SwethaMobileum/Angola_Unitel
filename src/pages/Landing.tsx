import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Smartphone,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { setRole } = useAuth();

  const handleEnterApplicant = () => {
    const port = typeof window !== 'undefined' ? window.location.port : '';
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    if (port === '5174') {
      window.location.href = `http://${hostname}:5173/applicant`;
      return;
    }
    setRole('applicant');
    navigate('/applicant');
  };

  const handleEnterApprover = () => {
    const port = typeof window !== 'undefined' ? window.location.port : '';
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    if (port === '5173') {
      window.location.href = `http://${hostname}:5174/approver`;
      return;
    }
    setRole('approver');
    navigate('/approver');
  };

  return (
    <div
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.72) 0%, rgba(31, 36, 48, 0.76) 50%, rgba(180, 83, 9, 0.68) 100%), url('/angola_telecom_hero.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
      className="min-h-screen flex flex-col justify-between p-4 sm:p-6 relative"
    >
      {/* Top Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2.5 px-4 sm:px-5 bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange flex items-center justify-center font-black text-white text-xs shadow-md shadow-orange/40 border border-orange-btn">
            UCI
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white font-heading leading-tight drop-shadow-xs">
              Unitel Credit Intelligence
            </h1>
            <p className="text-[11px] text-amber-200 font-semibold drop-shadow-xs">
              Angola Telecom Equipment Financing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-orange text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-sm border border-orange-hover">
            v2.0 Enterprise
          </span>
        </div>
      </header>

      {/* Main Two Portal Cards Container */}
      <main className="max-w-4xl w-full mx-auto py-4 sm:py-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight drop-shadow-md">
            Select your portal to continue
          </h2>
          <p className="text-xs sm:text-sm text-slate-100 mt-1 max-w-md mx-auto font-medium drop-shadow-xs">
            Choose your role to evaluate subscribers or review loan applications.
          </p>
        </div>

        {/* 2 Compact Cards Grid with Transparent Blurred Glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch max-w-3xl mx-auto">
          {/* Card 1: Applicant Portal */}
          <div className="bg-white/15 backdrop-blur-md p-5 sm:p-6 rounded-2xl flex flex-col justify-between space-y-5 shadow-2xl border border-white/25 hover:-translate-y-1 hover:bg-white/20 hover:border-white/40 transition-all duration-300">
            <div className="space-y-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange/20 border border-orange/40 flex items-center justify-center text-orange shadow-xs">
                <Smartphone className="w-5 h-5 stroke-[2.5]" />
              </div>

              <div>
                <span className="text-[10px] font-bold text-orange-300 uppercase tracking-wider font-mono">
                  Frontline Originator
                </span>
                <h3 className="text-xl font-black text-white font-heading mt-0.5 drop-shadow-xs">
                  Applicant portal
                </h3>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  Apply for equipment loans and track applications.
                </p>
              </div>

              {/* Features list */}
              <ul className="text-xs text-slate-200 space-y-2 pt-1 border-t border-white/10">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-slate-100 font-medium">6-step streamlined application flow</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-slate-100 font-medium">Real-time pre-fill from data sources</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-slate-100 font-medium">Instant equipment financing decision</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleEnterApplicant}
              className="btn-orange w-full py-2.5 text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer font-bold hover:scale-[1.01] transition-transform"
            >
              <span>Enter Applicant Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Approver & Admin Portal */}
          <div className="bg-white/15 backdrop-blur-md p-5 sm:p-6 rounded-2xl flex flex-col justify-between space-y-5 shadow-2xl border border-white/25 hover:-translate-y-1 hover:bg-white/20 hover:border-white/40 transition-all duration-300">
            <div className="space-y-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal/20 border border-teal/40 flex items-center justify-center text-teal-300 shadow-xs">
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              </div>

              <div>
                <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider font-mono">
                  Credit Committee & Admin
                </span>
                <h3 className="text-xl font-black text-white font-heading mt-0.5 drop-shadow-xs">
                  Approver portal
                </h3>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  Review loan queue, instant checks and admin tools.
                </p>
              </div>

              {/* Features list */}
              <ul className="text-xs text-slate-200 space-y-2 pt-1 border-t border-white/10">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-slate-100 font-medium">Portfolio analytics & approval queue</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-slate-100 font-medium">Instant credit check by mobile number</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-slate-100 font-medium">Live points panel & weight validator</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleEnterApprover}
              className="btn-orange w-full py-2.5 text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer font-bold hover:scale-[1.01] transition-transform"
            >
              <span>Enter Approver Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto py-2 text-center text-[11px] text-slate-200 font-medium bg-black/25 backdrop-blur-xs rounded-full px-4 border border-white/10">
        Unitel Angola &bull; Proxy Telecom Credit Scoring Platform &bull; Enterprise Portal
      </footer>
    </div>
  );
};
