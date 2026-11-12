import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_SCORING_CONFIG,
  buildNotificationDrafts,
  cloneConfig,
  evaluateCreditScore,
} from './scoring';
import type {
  ApplicationRecord,
  CustomerProfile,
  DecisionOutcome,
  NotificationRecord,
  Role,
  ScoringConfig,
} from './scoring';
import {
  loadPortalState,
  persistApplication,
  persistConfig,
  persistProfileUpdate,
  recomputeApplicationsWithConfig,
  resetLocalFallback,
  saveLocalFallback,
  type PortalState,
} from './lib/dataService';
import { Dashboard } from './components/Dashboard';
import { NewApplication } from './components/NewApplication';
import { Customer360 } from './components/Customer360';
import { WhatIfPanel } from './components/WhatIfPanel';
import { ApprovalsQueue } from './components/ApprovalsQueue';
import { NotificationsLog } from './components/NotificationsLog';
import { AdminConfig } from './components/AdminConfig';

type Screen =
  | 'dashboard'
  | 'new_application'
  | 'customer_360'
  | 'what_if'
  | 'approvals'
  | 'notifications'
  | 'admin';

export default function App() {
  const [state, setState] = useState<PortalState | null>(null);
  const [role, setRole] = useState<Role>('analyst');
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-001');
  const [appCustomerId, setAppCustomerId] = useState<string>('cust-001');

  useEffect(() => {
    loadPortalState().then((loaded) => setState(loaded));
  }, []);

  const updateState = (updater: (prev: PortalState) => PortalState) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveLocalFallback(next);
      return next;
    });
  };

  const pendingReviewCount = useMemo(
    () => state?.applications.filter((a) => a.decision === 'manual_review').length ?? 0,
    [state]
  );

  if (!state) {
    return (
      <div className="app-shell" style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ color: 'var(--orange-700)' }}>Loading Credit Intelligence Demo Portal...</h2>
      </div>
    );
  }

  const handleSubmitApplication = (
    app: ApplicationRecord,
    notifs: NotificationRecord[]
  ) => {
    updateState((prev) => ({
      ...prev,
      applications: [app, ...prev.applications.filter((a) => a.id !== app.id)],
      notifications: [...notifs, ...prev.notifications],
    }));
    void persistApplication(app, notifs);
  };

  const handleUpdateApplicationAndNotifications = (
    updatedProfile: CustomerProfile,
    updatedApp: ApplicationRecord,
    newNotifs: NotificationRecord[]
  ) => {
    updateState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.customer.id === updatedProfile.customer.id ? updatedProfile : p
      ),
      applications: [
        updatedApp,
        ...prev.applications.filter((a) => a.id !== updatedApp.id),
      ],
      notifications: [...newNotifs, ...prev.notifications],
    }));
    void persistProfileUpdate(updatedProfile);
    void persistApplication(updatedApp, newNotifs);
  };

  const handleOverrideDecision = (
    appId: string,
    decision: DecisionOutcome,
    reason: string
  ) => {
    const target = state.applications.find((a) => a.id === appId);
    if (!target) return;

    const updated: ApplicationRecord = {
      ...target,
      decision,
      decision_reason: reason,
      status:
        decision === 'auto_approve'
          ? 'approved'
          : decision === 'manual_review'
            ? 'pending_review'
            : 'declined',
      overridden_by: role,
    };
    const notifs = buildNotificationDrafts(updated, decision, state.config);

    updateState((prev) => ({
      ...prev,
      applications: prev.applications.map((a) => (a.id === appId ? updated : a)),
      notifications: [...notifs, ...prev.notifications],
    }));
    void persistApplication(updated, notifs);
  };

  const handleSaveConfig = (nextConfig: ScoringConfig) => {
    updateState((prev) => ({
      ...prev,
      config: nextConfig,
      applications: recomputeApplicationsWithConfig(
        prev.applications,
        prev.profiles,
        nextConfig
      ),
    }));
    void persistConfig(nextConfig);
  };

  const handleResetDefaultConfig = () => {
    const def = cloneConfig(DEFAULT_SCORING_CONFIG);
    handleSaveConfig(def);
  };

  const handleResetDemoData = () => {
    const fresh = resetLocalFallback();
    setState(fresh);
  };

  const standaloneWhatIfProfile =
    state.profiles.find((p) => p.customer.id === selectedCustomerId) ?? state.profiles[0];

  return (
    <div className="app-shell">
      {/* Visible Demo Banner */}
      <div className="demo-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="demo-banner-pill">Demo / Simulated Data</span>
          <span>
            Proxy Credit Scoring POC for Angola Telecom &amp; Mobile Money (300 synthetic subscribers)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>
            Storage: <strong>{state.mode === 'supabase' ? 'Supabase Postgres' : 'Local Mock Store'}</strong>
          </span>
          <button
            type="button"
            className="role-btn"
            style={{ background: 'rgba(255,255,255,0.16)', color: '#FFFFFF' }}
            onClick={handleResetDemoData}
          >
            Reset Demo Data
          </button>
        </div>
      </div>

      {/* Top Header */}
      <header className="top-header">
        <div className="brand-block">
          <div className="brand-mark">CI</div>
          <div>
            <div className="brand-title">Credit Intelligence</div>
            <div className="brand-subtitle">
              Proxy Credit Rating, Limit &amp; Approval Portal — Angola Demo
            </div>
          </div>
        </div>

        <div className="header-controls">
          <span style={{ fontSize: 12, color: 'var(--orange-100)', fontWeight: 600 }}>
            Active Role:
          </span>
          <div className="role-switcher" role="group" aria-label="Role switcher">
            {(['analyst', 'approver', 'admin'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`role-btn ${role === r ? 'active' : ''}`}
                onClick={() => setRole(r)}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="shell-body">
        <nav className="sidebar" aria-label="Primary Navigation">
          <div className="nav-section-label">Credit Portal</div>
          <button
            type="button"
            className={`nav-item ${screen === 'dashboard' ? 'active' : ''}`}
            onClick={() => setScreen('dashboard')}
          >
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className={`nav-item ${screen === 'new_application' ? 'active' : ''}`}
            onClick={() => setScreen('new_application')}
          >
            <span>New Application</span>
          </button>
          <button
            type="button"
            className={`nav-item ${screen === 'customer_360' ? 'active' : ''}`}
            onClick={() => setScreen('customer_360')}
          >
            <span>Customer 360°</span>
          </button>
          <button
            type="button"
            className={`nav-item ${screen === 'what_if' ? 'active' : ''}`}
            onClick={() => setScreen('what_if')}
          >
            <span>What-If Simulator</span>
          </button>

          <div className="nav-section-label">Operations &amp; Rules</div>
          <button
            type="button"
            className={`nav-item ${screen === 'approvals' ? 'active' : ''}`}
            onClick={() => setScreen('approvals')}
          >
            <span>Approvals Queue</span>
            {pendingReviewCount > 0 && <span className="nav-badge">{pendingReviewCount}</span>}
          </button>
          <button
            type="button"
            className={`nav-item ${screen === 'notifications' ? 'active' : ''}`}
            onClick={() => setScreen('notifications')}
          >
            <span>Notifications Log</span>
            <span className="nav-badge">{state.notifications.length}</span>
          </button>
          <button
            type="button"
            className={`nav-item ${screen === 'admin' ? 'active' : ''}`}
            onClick={() => setScreen('admin')}
          >
            <span>Admin Config</span>
            <span className="nav-badge">v{state.config.version}</span>
          </button>

          <div className="sidebar-footer">
            <strong>Proxy Score Notice</strong>
            <div style={{ marginTop: 4 }}>
              Telecom behavior carries the highest weight ({state.config.weights.telecom}%). Basic
              wallets with low activity are treated as thin files, not bad credit.
            </div>
          </div>
        </nav>

        <main className="main-content">
          {screen === 'dashboard' && (
            <Dashboard
              profiles={state.profiles}
              applications={state.applications}
              config={state.config}
              onStartNewApplication={(custId) => {
                if (custId) setAppCustomerId(custId);
                setScreen('new_application');
              }}
              onInspectCustomer={(custId) => {
                setSelectedCustomerId(custId);
                setScreen('customer_360');
              }}
              onOpenQueue={() => setScreen('approvals')}
            />
          )}

          {screen === 'new_application' && (
            <NewApplication
              profiles={state.profiles}
              config={state.config}
              role={role}
              initialCustomerId={appCustomerId}
              onSubmitApplication={handleSubmitApplication}
              onUpdateApplicationAndNotifications={handleUpdateApplicationAndNotifications}
              onOverrideDecision={handleOverrideDecision}
            />
          )}

          {screen === 'customer_360' && (
            <Customer360
              profiles={state.profiles}
              config={state.config}
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={setSelectedCustomerId}
              onStartApplication={(custId) => {
                setAppCustomerId(custId);
                setScreen('new_application');
              }}
            />
          )}

          {screen === 'what_if' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="page-header">
                <div>
                  <h2 className="page-title">Standalone What-If Simulator</h2>
                  <p className="page-subtitle">
                    Quick-pick any persona or subscriber and test parameter sensitivity in real time.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {state.profiles.slice(0, 5).map((p) => (
                    <button
                      key={p.customer.id}
                      type="button"
                      className={`btn btn-sm ${
                        selectedCustomerId === p.customer.id ? 'btn-primary' : 'btn-secondary'
                      }`}
                      onClick={() => setSelectedCustomerId(p.customer.id)}
                    >
                      {p.customer.full_name} ({evaluateCreditScore(p, state.config).score})
                    </button>
                  ))}
                </div>
              </div>
              <WhatIfPanel
                profile={standaloneWhatIfProfile}
                config={state.config}
                productName="Compact City Car (Financed)"
                productPriceAoa={5_500_000}
              />
            </div>
          )}

          {screen === 'approvals' && (
            <ApprovalsQueue
              applications={state.applications}
              role={role}
              onOverride={handleOverrideDecision}
              onInspectCustomer={(custId) => {
                setSelectedCustomerId(custId);
                setScreen('customer_360');
              }}
            />
          )}

          {screen === 'notifications' && (
            <NotificationsLog notifications={state.notifications} />
          )}

          {screen === 'admin' && (
            <AdminConfig
              config={state.config}
              role={role}
              onSwitchRole={setRole}
              onSaveConfig={handleSaveConfig}
              onResetDefault={handleResetDefaultConfig}
            />
          )}
        </main>
      </div>

      <footer className="site-footer">
        <span>
          <strong>Credit Intelligence (Demo POC)</strong> — All customer profiles, proxy credit
          scores, credit limits, SMS, and emails are simulated for demonstration purposes only.
        </span>
        <span>
          Not a regulated credit bureau score. No real Unitel, BNA, or AGT integration.
        </span>
      </footer>
    </div>
  );
}

