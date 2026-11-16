import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ArrowLeft, ChevronRight, LayoutDashboard } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  '/segments': 'Customer Segments Explainer',
  '/new-evaluation': 'New Credit Evaluation',
  '/evaluations': 'Evaluations History',
  '/evaluations/new': 'New Credit Evaluation',
  '/applications': 'Equipment Financing Applications',
  '/approvals': 'Approver Credit Decision Queue',
  '/notifications': 'Transactional Email Ledger',
  '/audit-log': 'Immutable Audit Trail',
  '/admin': 'Scoring Administration & Invariant Rules',
};

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('unitel_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('unitel_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const isHome = pathname === '/';
  const pageTitle = ROUTE_LABELS[pathname] || pathname.replace('/', '').replace(/-/g, ' ');

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Left Collapsible Corporate Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full min-w-0 overflow-y-auto">
          {/* Universal Back Navigation & Breadcrumb Trail */}
          {!isHome && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-xl border border-orange-border/70 shadow-2xs animate-in fade-in">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-orange-border bg-[#FAF8F5] hover:bg-orange hover:text-white hover:border-orange text-xs font-bold text-slate-700 transition-all cursor-pointer group shadow-2xs"
                title="Return to the previous screen"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-orange group-hover:text-white group-hover:-translate-x-0.5 transition-all" />
                <span>&larr; Back to previous page</span>
              </button>

              {/* Breadcrumb Trail */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Link
                  to="/"
                  className="text-slate-600 hover:text-orange hover:underline font-semibold flex items-center gap-1 transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-orange" />
                  <span>Dashboard</span>
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-extrabold text-navy capitalize">
                  {pageTitle}
                </span>
              </div>
            </div>
          )}

          <Outlet />
        </main>
      </div>
    </div>
  );
};
