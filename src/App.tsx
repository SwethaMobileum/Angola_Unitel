import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_SCORING_CONFIG,
  buildNotificationDrafts,
  calculateEmiPlan,
  cloneConfig,
  evaluateCreditScore,
  evaluateLimitAndDecision,
} from './scoring';
import type {
  ApplicationRecord,
  ApplicationStatus,
  AuditLogEntry,
  CustomerProfile,
  EmiPlanConfig,
  EquipmentItem,
  NotificationRecord,
  Role,
  ScoringConfig,
} from './scoring';
import {
  createEmptyState,
  loadPortalState,
  persistApplication,
  persistConfig,
  persistProfileUpdate,
  recomputeApplicationsWithConfig,
  resetLocalFallback,
  saveLocalFallback,
  type PortalState,
} from './lib/dataService';
import { ChooseRoleScreen } from './components/ChooseRoleScreen';
import { Dashboard } from './components/Dashboard';
import { NewApplication } from './components/NewApplication';
import { ApplicationsList } from './components/ApplicationsList';
import { ApplicationDetail } from './components/ApplicationDetail';
import { Customer360 } from './components/Customer360';
import { ApprovalsQueue } from './components/ApprovalsQueue';
import { NotificationsLog } from './components/NotificationsLog';
import { AdminConfig } from './components/AdminConfig';
import { CatalogAndEmiAdmin } from './components/CatalogAndEmiAdmin';
import { NotificationTemplatesView } from './components/NotificationTemplatesView';
import { UsersAndRolesView } from './components/UsersAndRolesView';
import { AuditLogView } from './components/AuditLogView';
import { DataToolsView } from './components/DataToolsView';

type Screen =
  | 'dashboard'
  | 'new_application'
  | 'my_applications'
  | 'all_applications'
  | 'application_detail'
  | 'customers'
  | 'approvals'
  | 'notifications'
  | 'scoring_rules'
  | 'catalog_emi'
  | 'templates'
  | 'users_roles'
  | 'audit_log'
  | 'data_tools';

const ROLE_STORAGE_KEY = 'unitel_ci_selected_role';

const ROLE_LANDING: Record<Role, Screen> = {
  analyst: 'dashboard',
  approver: 'approvals',
  admin: 'dashboard',
};

const ROLE_ALLOWED_SCREENS: Record<Role, Screen[]> = {
  analyst: ['dashboard', 'new_application', 'my_applications', 'application_detail', 'customers'],
  approver: ['dashboard', 'approvals', 'all_applications', 'application_detail', 'notifications'],
  admin: [
    'dashboard',
    'new_application',
    'all_applications',
    'application_detail',
    'customers',
    'approvals',
    'notifications',
    'scoring_rules',
    'catalog_emi',
    'templates',
    'users_roles',
    'audit_log',
    'data_tools',
  ],
};

function readInitialRole(): Role | null {
  try {
    const saved = localStorage.getItem(ROLE_STORAGE_KEY);
    if (saved === 'analyst' || saved === 'approver' || saved === 'admin') {
      return saved;
    }
  } catch {
    // ignore
  }
  return null;
}

export default function App() {
  const [state, setState] = useState<PortalState | null>(null);
  const [role, setRole] = useState<Role | null>(() => readInitialRole());
  const [screen, setScreen] = useState<Screen>(() => {
    const initial = readInitialRole();
    return initial ? ROLE_LANDING[initial] : 'dashboard';
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-001');
  const [appCustomerId, setAppCustomerId] = useState<string | undefined>(undefined);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string }>>([]);

  useEffect(() => {
    loadPortalState().then((loaded) => setState(loaded));
  }, []);

  const showToast = (msg: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, msg }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  };

  const handleSelectRole = (nextRole: Role) => {
    setRole(nextRole);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    } catch {
      // ignore
    }
    setScreen(ROLE_LANDING[nextRole]);
    showToast(`Switched to ${nextRole.charAt(0).toUpperCase() + nextRole.slice(1)} view`);
  };

  const updateState = (updater: (prev: PortalState) => PortalState) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveLocalFallback(next);
      return next;
    });
  };

  const pendingReviewCount = useMemo(
    () =>
      state?.applications.filter(
        (a) => a.status === 'pending_review' || a.status === 'more_info_requested'
      ).length ?? 0,
    [state]
  );

  if (!role) {
    return <ChooseRoleScreen onSelectRole={handleSelectRole} />;
  }

  if (!state) {
    return (
      <div className="app-shell" style={{ padding: 48, textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
          <h2 style={{ color: 'var(--brand-700)' }}>Loading Credit Intelligence...</h2>
          <p>Preparing 300 subscriber profiles, scoring engine, and catalog.</p>
        </div>
      </div>
    );
  }

  const handleSubmitApplication = (
    app: ApplicationRecord,
    newOrUpdatedProfile: CustomerProfile,
    auditEntries: AuditLogEntry[]
  ) => {
    const receivedNotifs = buildNotificationDrafts(app, 'received', state.config, app.created_at);
    updateState((prev) => {
      const exists = prev.profiles.some(
        (p) => p.customer.id === newOrUpdatedProfile.customer.id
      );
      const nextProfiles = exists
        ? prev.profiles.map((p) =>
            p.customer.id === newOrUpdatedProfile.customer.id ? newOrUpdatedProfile : p
          )
        : [newOrUpdatedProfile, ...prev.profiles];

      return {
        ...prev,
        profiles: nextProfiles,
        applications: [app, ...prev.applications.filter((a) => a.id !== app.id)],
        notifications: [...receivedNotifs, ...prev.notifications],
        auditLogs: [...auditEntries.reverse(), ...prev.auditLogs],
      };
    });
    void persistProfileUpdate(newOrUpdatedProfile);
    void persistApplication(app, receivedNotifs, auditEntries[auditEntries.length - 1]);
    showToast(`Application ${app.id} submitted to Approver queue.`);
  };

  const handleApproverDecision = (
    appId: string,
    status: Extract<ApplicationStatus, 'approved' | 'rejected' | 'more_info_requested'>,
    reason: string
  ) => {
    const target = state.applications.find((a) => a.id === appId);
    if (!target) return;
    const now = new Date().toISOString();

    const updated: ApplicationRecord = {
      ...target,
      status,
      decision_reason: reason,
      decided_by_role: role,
      overridden_by: role,
    };

    const trigger =
      status === 'approved'
        ? 'auto_approve'
        : status === 'rejected'
          ? 'decline'
          : 'more_info_requested';

    const notifs: NotificationRecord[] = buildNotificationDrafts(
      updated,
      trigger,
      state.config,
      now
    );

    const audit: AuditLogEntry = {
      id: `audit-${appId}-${Date.now()}`,
      application_id: appId,
      step_name: `Approver Decision (${status})`,
      inputs_snapshot: {
        previous_status: target.status,
        suggested_decision: target.decision,
      },
      score_config_version: target.score_config_version ?? state.config.version,
      score: target.score,
      decision: status,
      decision_reason: reason,
      role,
      timestamp: now,
    };

    updateState((prev) => ({
      ...prev,
      applications: prev.applications.map((a) => (a.id === appId ? updated : a)),
      notifications: [...notifs, ...prev.notifications],
      auditLogs: [audit, ...prev.auditLogs],
    }));
    void persistApplication(updated, notifs, audit);
    showToast(`Application ${appId} marked as ${status.replace(/_/g, ' ')}. SMS & Email logged.`);
  };

  const handleSaveWhatIfVersion = (
    sourceApp: ApplicationRecord,
    updatedProfile: CustomerProfile
  ) => {
    const now = new Date().toISOString();
    const baseId = sourceApp.id.replace(/-v\d+$/, '');
    const versionCount =
      state.applications.filter((a) => a.id.startsWith(baseId)).length + 1;
    const nextId = `${baseId}-v${versionCount}`;

    const exp = evaluateCreditScore(updatedProfile, state.config);
    const emiCalc = calculateEmiPlan(sourceApp.product_price_aoa, {
      id: 'whatif',
      tier: sourceApp.volume_tier,
      term_months: sourceApp.emi_term_months,
      interest_rate_pct: sourceApp.emi_rate_pct,
      min_down_payment_pct:
        sourceApp.product_price_aoa > 0
          ? Math.round((sourceApp.down_payment_aoa / sourceApp.product_price_aoa) * 100)
          : 10,
    });
    const dec = evaluateLimitAndDecision(
      exp,
      sourceApp.product_price_aoa,
      state.config,
      emiCalc.monthly_emi_aoa
    );

    const nextApp: ApplicationRecord = {
      ...sourceApp,
      id: nextId,
      score: exp.score,
      band: exp.band,
      confidence: exp.confidence,
      credit_limit_aoa: dec.creditLimitAoa,
      emi_affordable: dec.emiAffordable,
      max_monthly_emi_aoa: dec.maxMonthlyEmiAoa,
      decision: dec.decision,
      decision_reason: dec.decisionReason,
      status: 'pending_review',
      decided_by_role: undefined,
      overridden_by: undefined,
      score_config_version: state.config.version,
      profile_snapshot: updatedProfile,
      created_at: now,
    };

    const audit: AuditLogEntry = {
      id: `audit-${nextId}-${Date.now()}`,
      application_id: nextId,
      step_name: 'What-If Saved as New Version',
      inputs_snapshot: {
        parent_application_id: sourceApp.id,
        unpaid_loans: updatedProfile.telecom?.airtime_loans_unpaid ?? 0,
        id_verified: updatedProfile.identity?.id_verified ?? false,
        wallet_level: updatedProfile.mobileMoney?.registration_level ?? 'none',
      },
      score_config_version: state.config.version,
      score: exp.score,
      decision: dec.decision,
      decision_reason: dec.decisionReason,
      role,
      timestamp: now,
    };

    updateState((prev) => ({
      ...prev,
      applications: [nextApp, ...prev.applications],
      auditLogs: [audit, ...prev.auditLogs],
    }));
    void persistApplication(nextApp, [], audit);
    setSelectedAppId(nextId);
    showToast(`Saved What-If snapshot as ${nextId}.`);
  };

  const handleSaveConfig = (nextConfig: ScoringConfig) => {
    const audit: AuditLogEntry = {
      id: `audit-cfg-${Date.now()}`,
      application_id: 'SYSTEM-CONFIG',
      step_name: `Scoring Rules Updated to v${nextConfig.version}`,
      inputs_snapshot: { weights: nextConfig.weights, priceCeilingsAoa: nextConfig.priceCeilingsAoa },
      score_config_version: nextConfig.version,
      decision: 'config_updated',
      decision_reason: 'All portfolio scores recomputed',
      role,
      timestamp: nextConfig.updatedAt,
    };

    updateState((prev) => ({
      ...prev,
      config: nextConfig,
      configHistory: [nextConfig, ...prev.configHistory],
      applications: recomputeApplicationsWithConfig(
        prev.applications,
        prev.profiles,
        nextConfig
      ),
      auditLogs: [audit, ...prev.auditLogs],
    }));
    void persistConfig(nextConfig);
    showToast(`Saved Config v${nextConfig.version} and recomputed all scores.`);
  };

  const handleResetDefaultConfig = () => {
    const def = cloneConfig(DEFAULT_SCORING_CONFIG);
    def.version = state.config.version + 1;
    def.id = `v-${def.version}`;
    def.updatedAt = new Date().toISOString();
    handleSaveConfig(def);
  };

  const handleSaveCatalogAndEmi = (
    nextConfig: ScoringConfig,
    nextCatalog: EquipmentItem[],
    nextEmiPlans: EmiPlanConfig[]
  ) => {
    const audit: AuditLogEntry = {
      id: `audit-cat-${Date.now()}`,
      application_id: 'SYSTEM-CATALOG',
      step_name: 'Catalog & EMI Plans Updated',
      inputs_snapshot: {
        catalog_count: nextCatalog.length,
        emi_plans_count: nextEmiPlans.length,
        priceCeilingsAoa: nextConfig.priceCeilingsAoa,
      },
      score_config_version: nextConfig.version,
      decision: 'catalog_updated',
      decision_reason: 'Updated equipment ceilings and EMI terms',
      role,
      timestamp: nextConfig.updatedAt,
    };

    updateState((prev) => ({
      ...prev,
      config: nextConfig,
      configHistory: [nextConfig, ...prev.configHistory],
      catalog: nextCatalog,
      emiPlans: nextEmiPlans,
      auditLogs: [audit, ...prev.auditLogs],
    }));
    void persistConfig(nextConfig);
    showToast('Saved Equipment Catalog, Price Ceilings, and EMI Plans.');
  };

  const handleLoadSampleData = () => {
    const fresh = resetLocalFallback();
    setState(fresh);
    showToast('Loaded 300 synthetic Angolan subscribers and sample applications.');
  };

  const handleClearAllData = () => {
    updateState((prev) => createEmptyState(prev));
    showToast('Cleared all subscribers, applications, notifications, and audit logs.');
  };

  const openAppDetail = (appId: string) => {
    setSelectedAppId(appId);
    setScreen('application_detail');
  };

  const isScreenAllowed = ROLE_ALLOWED_SCREENS[role].includes(screen);

  const sidebarItems: Array<{ id: Screen; label: string; badge?: string | number }> =
    role === 'analyst'
      ? [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'new_application', label: 'New Application' },
          { id: 'my_applications', label: 'My Applications', badge: state.applications.length },
          { id: 'customers', label: 'Customers', badge: state.profiles.length },
        ]
      : role === 'approver'
        ? [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'approvals', label: 'Approval Queue', badge: pendingReviewCount },
            { id: 'all_applications', label: 'All Applications', badge: state.applications.length },
            { id: 'notifications', label: 'Notifications', badge: state.notifications.length },
          ]
        : [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'all_applications', label: 'All Applications', badge: state.applications.length },
            { id: 'new_application', label: 'New Application' },
            { id: 'scoring_rules', label: 'Scoring Rules', badge: `v${state.config.version}` },
            { id: 'catalog_emi', label: 'Catalog & EMI Plans' },
            { id: 'templates', label: 'Notification Templates' },
            { id: 'users_roles', label: 'Users & Roles' },
            { id: 'audit_log', label: 'Audit Log', badge: state.auditLogs.length },
            { id: 'data_tools', label: 'Data Tools' },
          ];

  const activeDetailApp =
    state.applications.find((a) => a.id === selectedAppId) ?? state.applications[0] ?? null;
  const activeDetailProfile = activeDetailApp
    ? activeDetailApp.profile_snapshot ??
      state.profiles.find((p) => p.customer.id === activeDetailApp.customer_id) ??
      state.profiles[0]
    : null;

  return (
    <div className="app-shell">
      {/* Top Bar */}
      <header className="top-header">
        <div
          className="brand-block"
          onClick={() => setRole(null)}
          title="Return to Choose your role"
        >
          <div className="brand-mark">CI</div>
          <div>
            <div className="brand-title">Credit Intelligence</div>
            <div className="brand-subtitle">
              Proxy Credit Rating, Limit &amp; Approval Portal — Angola Demo
            </div>
          </div>
        </div>

        <div className="header-controls">
          <span className="viewing-badge">
            Viewing as {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
          <div className="role-switcher" role="group" aria-label="Role switcher">
            {(['analyst', 'approver', 'admin'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`role-btn ${role === r ? 'active' : ''}`}
                onClick={() => handleSelectRole(r)}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="shell-body">
        <nav className="sidebar" aria-label="Role Navigation">
          <div className="nav-section-label">
            {role.charAt(0).toUpperCase() + role.slice(1)} Menu
          </div>
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${screen === item.id ? 'active' : ''}`}
              onClick={() => setScreen(item.id)}
            >
              <span>{item.label}</span>
              {item.badge !== undefined && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}

          <div className="sidebar-footer">
            <strong>Telecom-First Proxy Score</strong>
            <div style={{ marginTop: 4 }}>
              Telecom weight: <strong>{state.config.weights.telecom}%</strong>. Basic/low-activity
              wallets and unbanked customers are never penalized.
            </div>
          </div>
        </nav>

        <main className="main-content">
          {!isScreenAllowed ? (
            <div className="card" style={{ padding: 32, textAlign: 'center', maxWidth: 560, margin: '24px auto' }}>
              <h2 className="page-title" style={{ marginBottom: 8 }}>Not available for this role</h2>
              <p style={{ marginBottom: 18 }}>
                The current screen is restricted while viewing as{' '}
                <strong>{role.toUpperCase()}</strong>. Switch role or return to your default landing
                page.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setScreen(ROLE_LANDING[role])}
                >
                  Go to {role} Landing Page
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleSelectRole('admin')}
                >
                  Switch to Admin
                </button>
              </div>
            </div>
          ) : (
            <>
              {screen === 'dashboard' && (
                <Dashboard
                  profiles={state.profiles}
                  applications={state.applications}
                  config={state.config}
                  role={role}
                  onStartNewApplication={(custId) => {
                    setAppCustomerId(custId);
                    setScreen('new_application');
                  }}
                  onInspectCustomer={(custId) => {
                    setSelectedCustomerId(custId);
                    setScreen('customers');
                  }}
                  onOpenApplication={openAppDetail}
                  onOpenQueue={() => setScreen('approvals')}
                />
              )}

              {screen === 'new_application' && (
                <NewApplication
                  profiles={state.profiles}
                  config={state.config}
                  catalog={state.catalog}
                  emiPlans={state.emiPlans}
                  role={role}
                  initialCustomerId={appCustomerId}
                  onSubmitApplication={handleSubmitApplication}
                  onSaveWhatIfVersion={handleSaveWhatIfVersion}
                  onToast={showToast}
                />
              )}

              {(screen === 'my_applications' || screen === 'all_applications') && (
                <ApplicationsList
                  title={
                    screen === 'my_applications'
                      ? 'My Applications'
                      : role === 'approver'
                        ? 'All Applications (Read-Only)'
                        : 'All Equipment Credit Applications'
                  }
                  subtitle="Search, filter by status, score band, confidence, volume level, or date, and open any application detail."
                  applications={state.applications}
                  role={role}
                  onOpenDetail={openAppDetail}
                  onStartNew={() => setScreen('new_application')}
                />
              )}

              {screen === 'application_detail' && activeDetailApp && activeDetailProfile && (
                <ApplicationDetail
                  application={activeDetailApp}
                  profile={activeDetailProfile}
                  config={state.config}
                  role={role}
                  auditLogs={state.auditLogs}
                  notifications={state.notifications}
                  onBack={() =>
                    setScreen(
                      role === 'approver'
                        ? 'approvals'
                        : role === 'analyst'
                          ? 'my_applications'
                          : 'all_applications'
                    )
                  }
                  onApproverAction={handleApproverDecision}
                  onSaveWhatIfVersion={handleSaveWhatIfVersion}
                />
              )}

              {screen === 'customers' && (
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

              {screen === 'approvals' && (
                <ApprovalsQueue
                  applications={state.applications}
                  profiles={state.profiles}
                  config={state.config}
                  role={role}
                  onDecision={handleApproverDecision}
                  onOpenDetail={openAppDetail}
                />
              )}

              {screen === 'notifications' && (
                <NotificationsLog notifications={state.notifications} />
              )}

              {screen === 'scoring_rules' && (
                <AdminConfig
                  config={state.config}
                  configHistory={state.configHistory}
                  role={role}
                  onSwitchRole={handleSelectRole}
                  onSaveConfig={handleSaveConfig}
                  onResetDefault={handleResetDefaultConfig}
                />
              )}

              {screen === 'catalog_emi' && (
                <CatalogAndEmiAdmin
                  config={state.config}
                  catalog={state.catalog}
                  emiPlans={state.emiPlans}
                  onSaveCatalogAndEmi={handleSaveCatalogAndEmi}
                />
              )}

              {screen === 'templates' && (
                <NotificationTemplatesView
                  config={state.config}
                  onSaveConfig={handleSaveConfig}
                />
              )}

              {screen === 'users_roles' && (
                <UsersAndRolesView currentRole={role} onSwitchRole={handleSelectRole} />
              )}

              {screen === 'audit_log' && <AuditLogView auditLogs={state.auditLogs} />}

              {screen === 'data_tools' && (
                <DataToolsView
                  profiles={state.profiles}
                  applications={state.applications}
                  auditLogs={state.auditLogs}
                  storageMode={state.mode}
                  onLoadSampleData={handleLoadSampleData}
                  onClearAllData={handleClearAllData}
                  onToast={showToast}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Toast Stack */}
      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              {t.msg}
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer Footer */}
      <footer className="site-footer">
        <span>
          <strong>Credit Intelligence — Demo / simulated data.</strong> All subscriber profiles,
          proxy credit scores, credit limits, SMS, and emails are simulated.
        </span>
        <span>
          Not a regulated bureau score. Storage:{' '}
          <strong>{state.mode === 'supabase' ? 'Supabase Postgres' : 'Local Mock Store'}</strong>
        </span>
      </footer>
    </div>
  );
}
