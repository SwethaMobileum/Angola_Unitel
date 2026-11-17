import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  UserPlus,
  FileSpreadsheet,
  CheckCircle2,
  Bell,
  History,
  Settings,
  Database,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COPY } from '../copy/en';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  badge?: string;
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isGlass?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { role } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  const port = typeof window !== 'undefined' ? window.location.port : '';
  // Detect whether we are in applicant or approver portal
  const isApplicantPortal =
    port === '5174'
      ? false
      : port === '5173'
      ? true
      : pathname.startsWith('/applicant') || pathname === '/new-evaluation';

  const landingTarget =
    port === '5173'
      ? isApplicantPortal ? '/' : '/approver-landing'
      : port === '5174'
      ? !isApplicantPortal ? '/' : '/applicant-landing'
      : isApplicantPortal ? '/applicant-landing' : '/approver-landing';

  const applicantNav: NavItem[] = [
    { to: '/applicant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/applicant/new', label: COPY.nav.newApplication, icon: UserPlus },
    { to: '/applicant/applications', label: COPY.nav.myApplications, icon: FileSpreadsheet },
    { to: '/applicant/notifications', label: COPY.nav.notifications, icon: Bell },
  ];

  const approverNav: NavItem[] = [
    { to: '/approver/dashboard', label: COPY.nav.dashboard, icon: LayoutDashboard },
    { to: '/approver/queue', label: COPY.nav.queue, icon: CheckCircle2 },
    { to: '/approver/instant-check', label: COPY.nav.instantCheck, icon: UserPlus },
    { to: '/approver/notifications', label: COPY.nav.notifications, icon: Bell },
    { to: '/approver/audit-log', label: COPY.nav.auditLog, icon: History },
    // Admin only tabs
    { to: '/approver/points-panel', label: COPY.nav.pointsPanel, icon: Settings, adminOnly: true },
    { to: '/approver/segments', label: COPY.nav.segments, icon: Layers, adminOnly: true },
    { to: '/approver/data-sources', label: COPY.nav.dataSources, icon: Database, adminOnly: true },
    { to: '/approver/settings', label: COPY.nav.settings, icon: Settings, adminOnly: true },
  ];

  const currentNav = isApplicantPortal
    ? applicantNav
    : approverNav.filter((item) => !item.adminOnly || role === 'admin');

  return (
    <aside
      className={`sticky top-0 h-screen max-h-screen self-start flex flex-col justify-between shrink-0 shadow-xs z-20 transition-all duration-300 ease-in-out sidebar-clean bg-white border-r border-orange-border/80 text-slate-800 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header & Navigation Area */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {/* Brand Header linking to Landing Page */}
        <Link
          to={landingTarget}
          title="Return to Unitel Landing Page"
          className={`h-16 shrink-0 flex items-center border-b border-orange-border/80 hover:bg-orange-soft/20 transition-colors cursor-pointer group ${
            isCollapsed ? 'px-3 justify-center' : 'px-5 justify-start'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl bg-orange flex items-center justify-center font-black text-white text-xs shadow-sm shadow-orange/30 shrink-0 border border-orange-btn group-hover:scale-105 transition-transform"
            >
              UCI
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 animate-in fade-in duration-200">
                <span className="font-black text-sm tracking-wide uppercase leading-none truncate text-slate-900 group-hover:text-orange transition-colors">
                  Unitel Telecom
                </span>
                <span className="text-[11px] font-bold tracking-wider mt-1 truncate text-orange-btn">
                  Credit Financing
                </span>
              </div>
            )}
          </div>
        </Link>

        {/* Navigation list */}
        <nav className="p-3 space-y-1" aria-label="Main Navigation">
          {currentNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center rounded-xl text-xs font-bold transition-all ${
                    isCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-2.5'
                  } ${
                    isActive
                      ? 'bg-orange text-white font-black shadow-md shadow-orange/30'
                      : 'text-slate-600 hover:text-orange hover:bg-orange-soft/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-white stroke-[2.5]'
                          : 'text-slate-400 group-hover:text-orange'
                      }`}
                    />
                    {!isCollapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                              isActive ? 'bg-white text-orange' : 'bg-orange text-white'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions: Collapse toggle */}
      <div className="shrink-0 p-3 border-t border-orange-border/60 bg-[#FFFDF9]">
        {onToggleCollapse && (
          <div>
            {isCollapsed ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all border shadow-2xs group cursor-pointer bg-slate-100 hover:bg-orange text-slate-600 hover:text-white border-slate-200"
                title="Expand Navigation Sidebar"
                aria-label="Expand Navigation Sidebar"
              >
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-full flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border group cursor-pointer bg-slate-50 hover:bg-orange-soft/50 text-slate-600 hover:text-orange border-slate-200/80"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <span className="flex items-center gap-2">
                  <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-orange" />
                  <span>Collapse Sidebar</span>
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
