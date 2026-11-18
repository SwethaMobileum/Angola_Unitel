import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Topbar } from './Topbar';
import { ArrowLeft } from 'lucide-react';

export const Layout: React.FC = () => {
  const { role, setRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  // Keep role in sync with the current portal and strictly enforce port isolation
  useEffect(() => {
    const port = typeof window !== 'undefined' ? window.location.port : '';
    if (port === '5174') {
      if (pathname.startsWith('/applicant')) {
        navigate('/approver/dashboard', { replace: true });
        return;
      }
      if (role === 'applicant') {
        setRole('approver');
      }
    } else if (port === '5173') {
      if (pathname.startsWith('/approver')) {
        navigate('/applicant/dashboard', { replace: true });
        return;
      }
      if (role !== 'applicant') {
        setRole('applicant');
      }
    } else {
      if ((pathname.startsWith('/applicant') || pathname === '/new-evaluation') && role !== 'applicant') {
        setRole('applicant');
      } else if (pathname.startsWith('/approver') && role === 'applicant') {
        setRole('approver');
      }
    }
  }, [pathname, role, setRole, navigate]);

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(pathname.startsWith('/applicant') ? '/applicant/dashboard' : '/approver/dashboard');
    }
  };

  const isAboutPage = pathname === '/applicant/about' || pathname === '/approver/about';

  // Do not show back button on root dashboard or about pages
  const isDashboard =
    pathname === '/approver/dashboard' ||
    pathname === '/applicant/dashboard' ||
    pathname === '/applicant' ||
    pathname === '/approver' ||
    isAboutPage;

  return (
    <div className="flex flex-col min-h-screen bg-bg text-slate-800 w-full max-w-[100vw] overflow-x-hidden">
      {/* Modern Top Navigation Bar with Horizontal Tabs */}
      <Topbar />

      {/* Main Full-Width Content Container without artificial side gaps */}
      <main className={`flex-1 w-full min-w-0 max-w-full overflow-x-hidden ${isAboutPage ? 'p-0' : 'p-3 sm:p-5 lg:p-6'}`}>
        {/* Subtle compact back button (visible only on non-dashboard sub-pages) */}
        {!isDashboard && (
          <div className="mb-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-orange hover:bg-orange-soft/40 transition-colors cursor-pointer group"
              title="Return to previous page"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back</span>
            </button>
          </div>
        )}

        {/* Smooth route transition on tab switch */}
        <div key={pathname} className="w-full min-w-0 max-w-full animate-in fade-in-50 slide-in-from-bottom-2 duration-300 ease-out">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
