import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  UserPlus,
  ClipboardList,
  FileSpreadsheet,
  CheckCircle2,
  Bell,
  History,
  Settings,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COPY } from '../copy/en';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles?: ('analyst' | 'approver' | 'admin')[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: COPY.nav.dashboard, icon: LayoutDashboard },
  { to: '/segments', label: COPY.nav.segments, icon: Layers },
  { to: '/new-evaluation', label: COPY.nav.newEvaluation, icon: UserPlus, roles: ['analyst', 'admin'] },
  { to: '/evaluations', label: COPY.nav.evaluations, icon: ClipboardList },
  { to: '/applications', label: COPY.nav.applications, icon: FileSpreadsheet },
  { to: '/approvals', label: COPY.nav.approvals, icon: CheckCircle2, roles: ['approver', 'admin'] },
  { to: '/notifications', label: COPY.nav.notifications, icon: Bell },
  { to: '/audit-log', label: COPY.nav.auditLog, icon: History, roles: ['approver', 'admin'] },
  { to: '/admin', label: COPY.nav.admin, icon: Settings, roles: ['admin'] },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { role } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside
      className={`bg-white border-r border-orange-border/80 flex flex-col justify-between shrink-0 min-h-screen text-slate-800 shadow-xs z-20 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header / App Brand */}
      <div>
        <div
          className={`h-16 flex items-center border-b border-orange-border/80 bg-white transition-all ${
            isCollapsed ? 'px-3 justify-center' : 'px-5 justify-between'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange flex items-center justify-center font-black text-white text-xs shadow-sm shadow-orange/30 shrink-0">
              AO
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 animate-in fade-in duration-200">
                <span className="font-extrabold text-sm tracking-wide text-slate-900 uppercase leading-none truncate">
                  Unitel Telecom
                </span>
                <span className="text-[10px] font-bold text-orange tracking-wider mt-0.5 truncate">
                  Credit Financing
                </span>
              </div>
            )}
          </div>

          {/* Collapse / Expand Toggle Button */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-orange hover:bg-orange-soft/60 transition-colors ${
                isCollapsed ? 'mt-2' : ''
              }`}
              title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Sidebar to Icon-Only View'}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-orange" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1.5" aria-label="Main Navigation">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `relative flex items-center rounded-xl text-xs font-bold transition-all ${
                    isCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-2.5'
                  } ${
                    isActive
                      ? 'bg-orange text-white font-extrabold shadow-md shadow-orange/25'
                      : 'text-slate-600 hover:text-orange hover:bg-orange-soft/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-white stroke-[2.5]' : 'text-slate-400 group-hover:text-orange'
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

      {/* Bottom Core Principles Notice */}
      <div className="p-3 m-3">
        {isCollapsed ? (
          <div
            className="w-10 h-10 rounded-xl bg-orange-soft border border-orange-border flex items-center justify-center text-orange mx-auto shadow-2xs"
            title={COPY.coreIdea}
          >
            <Info className="w-4 h-4 text-orange" />
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-orange-soft border border-orange-border text-xs shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 font-bold text-orange mb-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Core Principle</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              {COPY.coreIdea}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
