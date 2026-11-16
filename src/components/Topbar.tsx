import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppRole } from '../types';
import { ShieldCheck, Wallet, Database, X, CheckCircle2, AlertCircle, Key, Server } from 'lucide-react';
import { COPY } from '../copy/en';
import { checkSupabaseConnection } from '../lib/supabaseSync';
import { isSupabaseConfigured } from '../lib/supabase';

export const Topbar: React.FC = () => {
  const { role, setRole, currentUser, walletGlobalEnabled, setWalletGlobalEnabled } = useAuth();
  const [isDbModalOpen, setIsDbModalOpen] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message: string }>({
    connected: false,
    message: 'Checking database status...',
  });
  const [isTesting, setIsTesting] = useState<boolean>(false);

  useEffect(() => {
    testDb();
  }, []);

  const testDb = async () => {
    setIsTesting(true);
    const result = await checkSupabaseConnection();
    setDbStatus(result);
    setIsTesting(false);
  };

  const rolesList: AppRole[] = ['analyst', 'approver', 'admin'];

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-orange-border/80 h-16 flex items-center justify-between px-6 shadow-xs">
        {/* Brand & Context */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange flex items-center justify-center text-white font-black text-sm tracking-wider shadow-sm shadow-orange/30 border border-orange-hover">
            UCI
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
              <span>{COPY.app.title}</span>
            </div>
            <div className="text-xs text-slate-500 hidden sm:block">
              {COPY.app.subtitle}
            </div>
          </div>
        </div>

        {/* Right Controls: DB Status, Interactive Wallet Toggle Switch, Role Switcher & User Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Cloud DB Status Pill */}
          <button
            type="button"
            onClick={() => setIsDbModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              isSupabaseConfigured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
            title="Click to view database & cloud sync settings"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {isSupabaseConfigured ? 'Supabase: Connected' : 'Storage: Local Browser'}
            </span>
          </button>

          {/* Interactive Wallet Toggle Switch Button (Default: Off) */}
          <button
            type="button"
            onClick={() => setWalletGlobalEnabled(!walletGlobalEnabled)}
            role="switch"
            aria-checked={walletGlobalEnabled}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-xs select-none ${
              walletGlobalEnabled
                ? 'bg-orange-soft text-orange border-orange/60 hover:bg-orange/15 shadow-orange/10'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }`}
            title={`Unitel Money Wallet (W) Scoring is currently ${walletGlobalEnabled ? 'ACTIVE' : 'OFF'}. Click to toggle.`}
          >
            <Wallet className={`w-3.5 h-3.5 transition-colors ${walletGlobalEnabled ? 'text-orange' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">
              Wallet (W): <strong className={walletGlobalEnabled ? 'text-orange font-bold' : 'text-slate-500 font-medium'}>{walletGlobalEnabled ? 'Active' : 'Off'}</strong>
            </span>
            {/* Toggle Switch Visual Pill */}
            <div
              className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                walletGlobalEnabled ? 'bg-orange justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="bg-white w-3 h-3 rounded-full shadow-md transition-transform duration-200" />
            </div>
          </button>

          {/* Dynamic Role Switcher */}
          <div className="flex items-center bg-[#FAF8F5] p-1 rounded-lg border border-orange-border">
            <span className="text-[11px] font-bold text-slate-500 px-2 hidden lg:inline uppercase tracking-wider">
              Role:
            </span>
            {rolesList.map((r) => {
              const isActive = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`text-xs px-2.5 py-1 rounded font-semibold transition-all ${
                    isActive
                      ? 'bg-orange text-white shadow-xs'
                      : 'text-slate-600 hover:text-navy hover:bg-orange-soft/60'
                  }`}
                  title={COPY.roles[r].desc}
                >
                  {COPY.roles[r].label}
                </button>
              );
            })}
          </div>

          {/* User Badge */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-orange text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {currentUser.full_name.charAt(0)}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {currentUser.full_name}
              </div>
              <div className="text-[11px] text-slate-500 capitalize flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-orange" />
                <span className="font-medium">{role} view</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Database & Cloud Sync Details Modal */}
      {isDbModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-orange-border rounded-xl shadow-xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-orange" />
                <h3 className="text-lg font-bold text-navy">Supabase Database & Mail Configuration</h3>
              </div>
              <button
                onClick={() => setIsDbModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status Banner */}
            <div
              className={`p-3.5 rounded-lg border flex items-start gap-3 ${
                dbStatus.connected
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              {dbStatus.connected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs leading-relaxed">
                <div className="font-bold mb-0.5">
                  {dbStatus.connected ? 'Connected to Cloud PostgreSQL' : 'Local Browser Persistence Active'}
                </div>
                <p className="text-slate-600">{dbStatus.message}</p>
              </div>
            </div>

            {/* Required Environment Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-4 h-4 text-orange" />
                What Details to Provide in <code>.env</code>
              </h4>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono space-y-2 text-slate-800">
                <div>
                  <span className="text-slate-500 font-sans block text-[11px] font-semibold">1. Supabase Project URL:</span>
                  <span className="text-navy font-bold">VITE_SUPABASE_URL=</span>https://your-project.supabase.co
                </div>
                <div>
                  <span className="text-slate-500 font-sans block text-[11px] font-semibold">2. Supabase Anon Public Key:</span>
                  <span className="text-navy font-bold">VITE_SUPABASE_ANON_KEY=</span>eyJhbGciOiJIUzI1Ni...
                </div>
                <div>
                  <span className="text-slate-500 font-sans block text-[11px] font-semibold">3. Resend API Key (Optional for Live Emails):</span>
                  <span className="text-navy font-bold">VITE_RESEND_API_KEY=</span>re_123456789...
                </div>
                <div>
                  <span className="text-slate-500 font-sans block text-[11px] font-semibold">4. Sender Email:</span>
                  <span className="text-navy font-bold">VITE_EMAIL_FROM=</span>Unitel Credit &lt;onboarding@resend.dev&gt;
                </div>
              </div>
            </div>

            {/* SQL Migration Instructions */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="font-bold text-navy flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-orange" />
                Database Schema Setup:
              </div>
              <p>
                Run the 24-table migration in your Supabase SQL Editor from:
                <br />
                <code className="text-navy font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">
                  supabase/migrations/20261116000001_initial_schema.sql
                </code>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={testDb}
                disabled={isTesting}
                className="btn-secondary text-xs"
              >
                {isTesting ? 'Testing Connection...' : 'Re-test DB Connection'}
              </button>

              <button
                type="button"
                onClick={() => setIsDbModalOpen(false)}
                className="btn-primary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
