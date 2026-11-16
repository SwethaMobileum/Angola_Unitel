import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';

// Page components
import { Dashboard } from './pages/Dashboard';
import { Segments } from './pages/Segments';
import { NewEvaluation } from './pages/NewEvaluation';
import { Evaluations } from './pages/Evaluations';
import { Applications } from './pages/Applications';
import { Approvals } from './pages/Approvals';
import { Notifications } from './pages/Notifications';
import { AuditLog } from './pages/AuditLog';
import { Admin } from './pages/Admin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="segments" element={<Segments />} />
              <Route path="new-evaluation" element={<NewEvaluation />} />
              <Route path="evaluations/new" element={<NewEvaluation />} />
              <Route path="evaluations" element={<Evaluations />} />
              <Route path="applications" element={<Applications />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="audit-log" element={<AuditLog />} />
              <Route path="admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
