import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';

// Standalone Opening Landing Pages
import { Landing } from './pages/Landing';
import { ApplicantLanding } from './pages/ApplicantLanding';
import { ApproverLanding } from './pages/ApproverLanding';

// Page components
import { Dashboard } from './pages/Dashboard';
import { ApplicantDashboard } from './pages/ApplicantDashboard';
import { Segments } from './pages/Segments';
import { NewEvaluation } from './pages/NewEvaluation';
import { Evaluations } from './pages/Evaluations';
import { Applications } from './pages/Applications';
import { Approvals } from './pages/Approvals';
import { Notifications } from './pages/Notifications';
import { AuditLog } from './pages/AuditLog';
import { Admin } from './pages/Admin';
import { InstantCreditCheck } from './pages/InstantCreditCheck';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Dynamic Root: Automatically renders the dedicated landing page based on port
const RootPortalRoute: React.FC = () => {
  const port = typeof window !== 'undefined' ? window.location.port : '';
  if (port === '5173') {
    return <ApplicantLanding />;
  }
  if (port === '5174') {
    return <ApproverLanding />;
  }
  return <Landing />;
};

// Smart Port-Aware Redirect: Ensures direct or legacy routes navigate to the right portal based on port
const PortAwareRedirect: React.FC<{
  applicantTo: string;
  approverTo: string;
}> = ({ applicantTo, approverTo }) => {
  const port = typeof window !== 'undefined' ? window.location.port : '';
  if (port === '5174') {
    return <Navigate to={approverTo} replace />;
  }
  return <Navigate to={applicantTo} replace />;
};

// Strict Portal Route Guards
const ApplicantPortalGuard: React.FC = () => {
  const port = typeof window !== 'undefined' ? window.location.port : '';
  if (port === '5174') {
    // Port 5174 is strictly Approver & Admin - immediately redirect to approver dashboard
    return <Navigate to="/approver/dashboard" replace />;
  }
  return <Layout />;
};

const ApproverPortalGuard: React.FC = () => {
  const port = typeof window !== 'undefined' ? window.location.port : '';
  if (port === '5173') {
    // Port 5173 is strictly Applicant - immediately redirect to applicant dashboard
    return <Navigate to="/applicant/dashboard" replace />;
  }
  return <Layout />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Opening / Landing Pages */}
            <Route path="/" element={<RootPortalRoute />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/applicant-landing" element={<ApplicantLanding />} />
            <Route path="/approver-landing" element={<ApproverLanding />} />

            {/* Applicant Portal: Strictly guarded to prevent rendering on Approver port */}
            <Route path="/applicant" element={<ApplicantPortalGuard />}>
              <Route index element={<Navigate to="/applicant/about" replace />} />
              <Route path="about" element={<ApplicantLanding embeddedInPortal={true} />} />
              <Route path="dashboard" element={<ApplicantDashboard />} />
              <Route path="new" element={<NewEvaluation />} />
              <Route path="applications" element={<Applications />} />
              <Route path="notifications" element={<Notifications />} />
            </Route>

            {/* Approver / Admin Portal: Strictly guarded to prevent rendering on Applicant port */}
            <Route path="/approver" element={<ApproverPortalGuard />}>
              <Route index element={<Navigate to="/approver/about" replace />} />
              <Route path="about" element={<ApproverLanding embeddedInPortal={true} />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="queue" element={<Approvals />} />
              <Route path="applications" element={<Applications />} />
              <Route path="evaluations" element={<Evaluations />} />
              <Route path="instant-check" element={<InstantCreditCheck />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="audit-log" element={<AuditLog />} />
              <Route path="points-panel" element={<Admin />} />
              <Route path="segments" element={<Segments />} />
              <Route path="data-sources" element={<Admin />} />
              <Route path="settings" element={<Admin />} />
            </Route>

            {/* Top-level & direct redirects (port-aware) */}
            <Route
              path="/dashboard"
              element={<PortAwareRedirect applicantTo="/applicant/dashboard" approverTo="/approver/dashboard" />}
            />
            <Route
              path="/new-evaluation"
              element={<PortAwareRedirect applicantTo="/applicant/new" approverTo="/approver/instant-check" />}
            />
            <Route
              path="/evaluations/new"
              element={<PortAwareRedirect applicantTo="/applicant/new" approverTo="/approver/instant-check" />}
            />
            <Route
              path="/evaluations"
              element={<PortAwareRedirect applicantTo="/applicant/dashboard" approverTo="/approver/evaluations" />}
            />
            <Route
              path="/applications"
              element={<PortAwareRedirect applicantTo="/applicant/applications" approverTo="/approver/queue" />}
            />
            <Route
              path="/approvals"
              element={<PortAwareRedirect applicantTo="/applicant/applications" approverTo="/approver/queue" />}
            />
            <Route
              path="/notifications"
              element={<PortAwareRedirect applicantTo="/applicant/notifications" approverTo="/approver/notifications" />}
            />
            <Route
              path="/audit-log"
              element={<PortAwareRedirect applicantTo="/applicant/dashboard" approverTo="/approver/audit-log" />}
            />
            <Route
              path="/segments"
              element={<PortAwareRedirect applicantTo="/applicant/dashboard" approverTo="/approver/segments" />}
            />
            <Route
              path="/admin"
              element={<PortAwareRedirect applicantTo="/applicant/dashboard" approverTo="/approver/settings" />}
            />
            <Route
              path="/settings"
              element={<PortAwareRedirect applicantTo="/applicant/dashboard" approverTo="/approver/settings" />}
            />
            <Route
              path="/about"
              element={<PortAwareRedirect applicantTo="/applicant/about" approverTo="/approver/about" />}
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
