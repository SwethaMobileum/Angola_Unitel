import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  ChevronDown,
  Check,
  Menu,
  X,
  LayoutDashboard,
  UserPlus,
  FileSpreadsheet,
  Bell,
  CheckCircle2,
  History,
  Settings,
  Layers,
  Database,
  Info,
} from 'lucide-react';

export interface TopbarProps {
  isGlass?: boolean;
}

interface NavItem {
  to: string;
  label: string;
  icon?: React.ElementType;
  adminOnly?: boolean;
  iconOnly?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ isGlass = false }) => {
  const { role, setRole, currentUser, walletGlobalEnabled, setWalletGlobalEnabled } = useAuth();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const pathname = location.pathname;
  const port = typeof window !== 'undefined' ? window.location.port : '';
  const isApplicant =
    port === '5174'
      ? false
      : port === '5173'
      ? true
      : pathname.startsWith('/applicant') || pathname === '/new-evaluation';

  const landingTarget = isApplicant ? '/applicant/about' : '/approver/about';

  // Close menus on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Tab definitions: "About Us" first, then respective portal tabs in exact order
  const applicantTabs: NavItem[] = [
    { to: '/applicant/about', label: 'About Us', icon: Info },
    { to: '/applicant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/applicant/new', label: 'New application', icon: UserPlus },
    { to: '/applicant/applications', label: 'My applications', icon: FileSpreadsheet },
    { to: '/applicant/notifications', label: 'Notifications', icon: Bell },
  ];

  const approverTabs: NavItem[] = [
    { to: '/approver/about', label: 'About Us', icon: Info },
    { to: '/approver/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/approver/queue', label: 'Applications queue', icon: CheckCircle2 },
    { to: '/approver/instant-check', label: 'Instant credit check', icon: UserPlus },
    { to: '/approver/notifications', label: 'Notifications', icon: Bell },
    { to: '/approver/audit-log', label: 'Audit log', icon: History },
    // Admin only tabs (visible when role is admin)
    { to: '/approver/points-panel', label: 'Points panel', icon: Settings, adminOnly: true },
    { to: '/approver/segments', label: 'Segments', icon: Layers, adminOnly: true },
    { to: '/approver/data-sources', label: 'Data sources', icon: Database, adminOnly: true, iconOnly: true },
    { to: '/approver/settings', label: 'Settings', icon: Settings, adminOnly: true, iconOnly: true },
  ];

  const currentTabs = isApplicant
    ? applicantTabs
    : approverTabs.filter((tab) => !tab.adminOnly || role === 'admin');

  const isAboutPage =
    pathname === '/applicant/about' ||
    pathname === '/approver/about' ||
    pathname === '/applicant-landing' ||
    pathname === '/approver-landing' ||
    pathname === '/landing' ||
    pathname.endsWith('/about');

  const isCurrentTabActive = (tab: NavItem) => {
    if (pathname === tab.to) return true;
    if (tab.to !== '/applicant' && tab.to !== '/approver' && pathname.startsWith(tab.to)) return true;
    return false;
  };

  return (
    <header
      className={`sticky top-0 z-30 bg-white border-b border-orange-border/80 shadow-xs text-slate-800 transition-all duration-300 max-w-full overflow-hidden ${
        isGlass ? 'bg-slate-950/75 backdrop-blur-md border-b border-white/15 text-white' : ''
      }`}
    >
      <div className="w-full max-w-full px-3 sm:px-4 lg:px-6 flex items-center justify-between h-16 relative min-w-0">
        {/* 1. Left Top Corner: Unitel Telecom Brand Logo & Title */}
        <div className="flex items-center shrink-0">
          <Link
            to={landingTarget}
            title="Return to Unitel Landing Page"
            className="flex items-center gap-2 group cursor-pointer py-1"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-orange flex items-center justify-center text-white font-black text-xs tracking-wider shadow-sm shadow-orange/30 border border-orange-btn group-hover:scale-105 transition-transform shrink-0">
              UCI
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-heading font-black text-xs sm:text-sm tracking-wide uppercase leading-tight text-slate-900 group-hover:text-orange transition-colors truncate">
                Unitel Telecom
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-orange leading-none mt-0.5">
                Credit Financing
              </span>
            </div>
          </Link>
        </div>

        {/* 2. Centre: Navigation Tabs (Fixed, consistent labels at all zoom levels) */}
        <nav
          className="hidden lg:flex items-center justify-center gap-0.5 xl:gap-1 2xl:gap-1.5 flex-1 min-w-0 mx-1.5 xl:mx-2.5 relative overflow-x-auto no-scrollbar h-16"
          aria-label="Portal Navigation"
        >
          {currentTabs.map((tab) => {
            const active = isCurrentTabActive(tab);
            const Icon = tab.icon;

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                title={tab.label}
                aria-label={tab.label}
                className={`h-16 inline-flex items-center justify-center ${
                  tab.iconOnly ? 'w-8 xl:w-9 px-0' : 'px-2 xl:px-2.5 2xl:px-3.5'
                } text-xs xl:text-[13px] font-heading transition-colors duration-150 relative select-none whitespace-nowrap cursor-pointer hover:text-orange hover:bg-orange-soft/30 active:scale-95 shrink-0 ${
                  active ? 'text-orange font-bold' : 'text-slate-600 font-medium'
                }`}
              >
                {tab.iconOnly && Icon ? (
                  <Icon className="w-4 h-4 shrink-0 transition-transform hover:scale-110" />
                ) : (
                  <span>{tab.label}</span>
                )}
                {/* Active indicator: Always exactly under the active tab element! */}
                {active && (
                  <span
                    className="absolute bottom-0 left-1 right-1 h-[3px] bg-orange rounded-full shadow-xs shadow-orange/40 animate-in fade-in zoom-in-95 duration-200"
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* 3. Right Top Corner: Compact Controls (Wallet Toggle & Role Switcher) */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
          {!isAboutPage && (
            <>
              {/* Button 1: Reduced-size Wallet Toggle Switch */}
          <button
            type="button"
            onClick={() => setWalletGlobalEnabled(!walletGlobalEnabled)}
            role="switch"
            aria-checked={walletGlobalEnabled}
            className={`h-7 px-2 sm:px-2.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer shadow-2xs select-none flex items-center gap-1.5 shrink-0 ${
              isGlass
                ? walletGlobalEnabled
                  ? 'bg-orange/40 text-white border-orange/70'
                  : 'bg-white/15 text-slate-100 border-white/25 hover:bg-white/25'
                : walletGlobalEnabled
                ? 'bg-orange-soft text-orange border-orange/60 hover:bg-orange/15'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }`}
            title={`Unitel Money Wallet (W) Scoring is currently ${walletGlobalEnabled ? 'ACTIVE' : 'OFF'}. Click to toggle.`}
          >
            <Wallet className={`w-3 h-3 ${walletGlobalEnabled ? 'text-orange' : 'text-slate-400'}`} />
            <span className="hidden xl:inline text-[11px]">Wallet:</span>
            <span className={`text-[11px] font-bold ${walletGlobalEnabled ? 'text-orange' : 'text-slate-500'}`}>
              {walletGlobalEnabled ? 'On' : 'Off'}
            </span>
            <div
              className={`w-5 h-3 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                walletGlobalEnabled ? 'bg-orange justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="bg-white w-2 h-2 rounded-full shadow-xs" />
            </div>
          </button>

          {/* Button 2: Reduced-size Profile & Role Switcher */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => {
                if (!isApplicant) {
                  setIsProfileOpen((prev) => !prev);
                }
              }}
              disabled={isApplicant}
              className={`h-7 px-2 rounded-lg border transition-all select-none flex items-center gap-1.5 shrink-0 ${
                isApplicant
                  ? 'cursor-default bg-[#FAF8F5] border-orange-border/70 text-slate-800'
                  : isGlass
                  ? 'cursor-pointer bg-white/15 hover:bg-white/25 border-white/25 text-white'
                  : isProfileOpen
                  ? 'cursor-pointer bg-orange-soft/60 border-orange/60 ring-1 ring-orange/20 text-slate-900'
                  : 'cursor-pointer bg-[#FAF8F5] hover:bg-orange-soft/40 border-orange-border hover:border-orange/50 text-slate-800 shadow-2xs'
              }`}
              aria-expanded={isProfileOpen}
              aria-haspopup={!isApplicant ? 'menu' : undefined}
              title={!isApplicant ? 'Click to switch role' : currentUser.full_name}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 ${
                  role === 'admin'
                    ? 'bg-purple-600'
                    : 'bg-orange'
                }`}
              >
                {currentUser.full_name.charAt(0)}
              </div>
              <div className="flex items-center gap-1 text-left">
                <span className="text-[11px] font-bold text-slate-800 truncate max-w-[85px] sm:max-w-[105px]">
                  {currentUser.full_name.split(' ')[0]} {currentUser.full_name.split(' ')[1] || ''}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-orange/15 text-orange-btn'
                  }`}
                >
                  {role === 'admin' ? 'Admin' : isApplicant ? 'Applicant' : 'Approver'}
                </span>
              </div>
              {!isApplicant && (
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0 ${
                    isProfileOpen ? 'rotate-180 text-orange' : ''
                  }`}
                />
              )}
            </button>

            {/* Role Switcher Dropdown Menu */}
            {isProfileOpen && !isApplicant && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-orange-border/90 shadow-2xl p-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150"
                role="menu"
              >
                <div className="px-3 py-1.5 border-b border-orange-border/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Switch Portal View
                  </span>
                  <span className="text-[11px] font-medium text-slate-600">
                    Active: <strong className="text-orange capitalize">{role} Desk</strong>
                  </span>
                </div>

                <div className="py-1 space-y-1">
                  {/* Persona 1: Approver */}
                  <button
                    type="button"
                    onClick={() => {
                      setRole('approver');
                      setIsProfileOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                      role === 'approver'
                        ? 'bg-orange-soft/60 border border-orange/40 text-slate-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-orange text-white flex items-center justify-center font-bold text-xs shrink-0">
                      D
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">Dra. Maria Mendes</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange/15 text-orange-btn">
                          Approver
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">Senior Credit Underwriter</p>
                    </div>
                    {role === 'approver' && <Check className="w-3.5 h-3.5 text-orange shrink-0" />}
                  </button>

                  {/* Persona 2: Admin */}
                  <button
                    type="button"
                    onClick={() => {
                      setRole('admin');
                      setIsProfileOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                      role === 'admin'
                        ? 'bg-purple-50 border border-purple-300 text-slate-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      E
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">Eng. Carlos Neto</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          Admin
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">Chief Risk Architect</p>
                    </div>
                    {role === 'admin' && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                  </button>
                </div>
              </div>
            )}
          </div>
            </>
          )}

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-orange hover:bg-orange-soft/40 transition-colors"
            title="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 4. Responsive Mobile Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-orange-border/60 bg-white px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
          {currentTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isCurrentTabActive(tab);

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-heading font-semibold transition-colors ${
                  active
                    ? 'bg-orange text-white font-bold'
                    : 'text-slate-700 hover:bg-orange-soft/40 hover:text-orange'
                }`}
              >
                {Icon && <Icon className="w-4 h-4 shrink-0" />}
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </header>
  );
};
