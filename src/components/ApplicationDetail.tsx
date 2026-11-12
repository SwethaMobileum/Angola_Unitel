import { useMemo, useState } from 'react';
import {
  calculateEmiPlan,
  evaluateCreditScore,
  evaluateLimitAndDecision,
  formatAoa,
} from '../scoring';
import type {
  ApplicationRecord,
  ApplicationStatus,
  AuditLogEntry,
  CustomerProfile,
  NotificationRecord,
  Role,
  ScoringConfig,
} from '../scoring';
import {
  BandBadge,
  ConfidenceBadge,
  StatusBadge,
  SuggestedDecisionBadge,
  VolumeTierBadge,
} from './Badges';
import { ScoreExplanationView } from './ScoreExplanationView';
import { WhatIfPanel } from './WhatIfPanel';

interface ApplicationDetailProps {
  application: ApplicationRecord;
  profile: CustomerProfile;
  config: ScoringConfig;
  role: Role;
  auditLogs: AuditLogEntry[];
  notifications: NotificationRecord[];
  onBack: () => void;
  onApproverAction: (
    appId: string,
    status: Extract<ApplicationStatus, 'approved' | 'rejected' | 'more_info_requested'>,
    reason: string
  ) => void;
  onSaveWhatIfVersion: (
    sourceApp: ApplicationRecord,
    updatedProfile: CustomerProfile
  ) => void;
}

export function ApplicationDetail({
  application,
  profile,
  config,
  role,
  auditLogs,
  notifications,
  onBack,
  onApproverAction,
  onSaveWhatIfVersion,
}: ApplicationDetailProps) {
  const [decisionReason, setDecisionReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [whatIfProfile, setWhatIfProfile] = useState<CustomerProfile | null>(null);

  const activeProfile = application.profile_snapshot ?? profile;
  const explanation = useMemo(
    () => evaluateCreditScore(activeProfile, config),
    [activeProfile, config]
  );

  const appAuditLogs = useMemo(
    () => auditLogs.filter((l) => l.application_id === application.id),
    [auditLogs, application.id]
  );

  const appNotifications = useMemo(
    () => notifications.filter((n) => n.application_id === application.id),
    [notifications, application.id]
  );

  const canApprove = role === 'approver' || role === 'admin';
  const canWhatIf = role === 'analyst' || role === 'admin';

  const handleAction = (
    status: Extract<ApplicationStatus, 'approved' | 'rejected' | 'more_info_requested'>
  ) => {
    if (!decisionReason.trim()) {
      setReasonError('Please enter a mandatory decision reason before submitting.');
      return;
    }
    setReasonError('');
    onApproverAction(application.id, status, decisionReason.trim());
    setDecisionReason('');
  };

  const handleSaveVersion = () => {
    const edited = whatIfProfile ?? activeProfile;
    onSaveWhatIfVersion(application, edited);
  };

  const whatIfPreview = useMemo(() => {
    const p = whatIfProfile ?? activeProfile;
    const exp = evaluateCreditScore(p, config);
    const emiCalc = calculateEmiPlan(application.product_price_aoa, {
      id: 'detail',
      tier: application.volume_tier,
      term_months: application.emi_term_months,
      interest_rate_pct: application.emi_rate_pct,
      min_down_payment_pct:
        application.product_price_aoa > 0
          ? Math.round((application.down_payment_aoa / application.product_price_aoa) * 100)
          : 10,
    });
    const dec = evaluateLimitAndDecision(
      exp,
      application.product_price_aoa,
      config,
      emiCalc.monthly_emi_aoa
    );
    return { exp, dec };
  }, [whatIfProfile, activeProfile, config, application]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: 8 }}
            onClick={onBack}
          >
            ← Back to Applications
          </button>
          <h2 className="page-title">
            Application {application.id} — {application.customer_name}
          </h2>
          <p className="page-subtitle">
            {application.mobile_no} • Created {new Date(application.created_at).toLocaleString()} •
            Scoring Config v{application.score_config_version ?? config.version}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <VolumeTierBadge tier={application.volume_tier} />
          <StatusBadge status={application.status} />
        </div>
      </div>

      {/* Equipment, EMI & Decision Summary */}
      <div className="grid-3">
        <div className="card">
          <div className="kpi-label">Equipment &amp; Price</div>
          <div style={{ fontSize: 17, fontWeight: 800, marginTop: 6 }}>{application.product}</div>
          <div style={{ fontSize: 13.5, marginTop: 4 }}>
            Price: <strong>{formatAoa(application.product_price_aoa)}</strong>
          </div>
          <div style={{ fontSize: 12.5, marginTop: 4 }}>
            Assigned Limit: <strong>{formatAoa(application.credit_limit_aoa)}</strong> (
            {application.credit_limit_aoa >= application.product_price_aoa
              ? `+${formatAoa(application.credit_limit_aoa - application.product_price_aoa)} headroom`
              : `${formatAoa(application.product_price_aoa - application.credit_limit_aoa)} gap`}
            )
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">EMI Plan &amp; Affordability</div>
          <div style={{ fontSize: 17, fontWeight: 800, marginTop: 6 }}>
            {formatAoa(application.monthly_emi_aoa)} / month
          </div>
          <div style={{ fontSize: 12.5, marginTop: 4 }}>
            Term: <strong>{application.emi_term_months} months</strong> @{' '}
            <strong>{application.emi_rate_pct}% APR</strong> • Down payment:{' '}
            <strong>{formatAoa(application.down_payment_aoa)}</strong>
          </div>
          <div style={{ fontSize: 12.5, marginTop: 4 }}>
            Max affordable EMI: <strong>{formatAoa(application.max_monthly_emi_aoa)}/mo</strong> —{' '}
            <strong>{application.emi_affordable ? '✓ Affordable' : '✕ Over monthly cap'}</strong>
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Rating &amp; Policy Decision</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 22 }}>{application.score}</strong>
            <BandBadge band={application.band} />
            <ConfidenceBadge confidence={application.confidence} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <SuggestedDecisionBadge decision={application.decision} />
          </div>
          <div style={{ fontSize: 12.5, marginTop: 6 }}>
            <strong>Reason:</strong> {application.decision_reason}
          </div>
        </div>
      </div>

      {/* Onboarding & Banking Context */}
      {application.application_data && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Onboarding Verification &amp; Banking Context</h3>
          </div>
          <div className="grid-4" style={{ fontSize: 12.5 }}>
            <div>
              <strong>Channel:</strong>{' '}
              {application.application_data.registration_channel.toUpperCase()}
            </div>
            <div>
              <strong>Bank Account:</strong>{' '}
              {application.application_data.has_bank_account
                ? 'Yes'
                : 'No (Neutral — no penalty)'}
            </div>
            <div>
              <strong>Daily Txn Amount:</strong>{' '}
              {formatAoa(application.application_data.daily_txn_aoa)}
            </div>
            <div>
              <strong>KYC Doc:</strong>{' '}
              {application.volume_tier === 'high'
                ? `${application.application_data.id_doc_type ?? 'BI'} (${application.application_data.id_number ?? activeProfile.customer.bi_number})`
                : 'Basic Registration Only'}
            </div>
          </div>
        </div>
      )}

      {/* Thin-file Notice */}
      {explanation.thinFileNotice && (
        <div className="alert-box">
          <strong>Thin-File Notice:</strong> {explanation.thinFileNotice}
        </div>
      )}

      {/* Approver Action Box */}
      {canApprove && (
        <div className="card" style={{ borderColor: 'var(--orange-500)', borderWidth: 2 }}>
          <div className="card-header">
            <h3 className="card-title">Approver Decision Panel</h3>
            <SuggestedDecisionBadge decision={application.decision} />
          </div>
          <label className="field-label">Decision Reason (Required)</label>
          <input
            type="text"
            className={`input ${reasonError ? 'input-error' : ''}`}
            placeholder="Enter approval, rejection, or request-more-info justification..."
            value={decisionReason}
            onChange={(e) => {
              setDecisionReason(e.target.value);
              setReasonError('');
            }}
          />
          {reasonError && <div className="field-error">{reasonError}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleAction('approved')}
            >
              ✓ Approve Application
            </button>
            <button
              type="button"
              className="btn btn-outline-orange"
              onClick={() => handleAction('more_info_requested')}
            >
              ◷ Request More Info
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleAction('rejected')}
            >
              ✕ Reject Application
            </button>
          </div>
        </div>
      )}

      {/* Full Score Explanation */}
      <ScoreExplanationView profile={activeProfile} explanation={explanation} />

      {/* Analyst / Admin What-If Panel with "Save as new version" */}
      {canWhatIf && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            className="card-tinted"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <strong>What-If Version Preview:</strong> Score{' '}
              <strong>{whatIfPreview.exp.score}</strong> ({whatIfPreview.exp.band},{' '}
              {whatIfPreview.exp.confidence}) • Limit{' '}
              <strong>{formatAoa(whatIfPreview.dec.creditLimitAoa)}</strong> •{' '}
              {whatIfPreview.dec.emiAffordable ? 'EMI Affordable' : 'EMI Over Cap'}
            </div>
            <button type="button" className="btn btn-primary" onClick={handleSaveVersion}>
              Save What-If as New Application Version
            </button>
          </div>

          <WhatIfPanel
            profile={activeProfile}
            config={config}
            productName={application.product}
            productPriceAoa={application.product_price_aoa}
            monthlyEmiAoa={application.monthly_emi_aoa}
            onProfileDraftChange={setWhatIfProfile}
          />
        </div>
      )}

      {/* Timeline / Audit Log & Notifications */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Application Audit Timeline ({appAuditLogs.length})</h3>
          </div>
          {appAuditLogs.length === 0 ? (
            <div>No audit entries recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {appAuditLogs.map((log) => (
                <div key={log.id} className="card-tinted" style={{ padding: 10, fontSize: 12.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>{log.step_name}</span>
                    <span>
                      {log.role.toUpperCase()} • v{log.score_config_version}
                    </span>
                  </div>
                  <div>
                    Decision: <strong>{log.decision}</strong> — {log.decision_reason}
                  </div>
                  <div style={{ fontSize: 11.5, opacity: 0.85 }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Notifications ({appNotifications.length})</h3>
          </div>
          {appNotifications.length === 0 ? (
            <div>No notifications generated yet (dispatched after Approver decision).</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {appNotifications.map((n) => (
                <div key={n.id} className="card-tinted" style={{ padding: 10, fontSize: 12.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>
                      {n.channel.toUpperCase()} ({n.template})
                    </span>
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  {n.subject && <div style={{ fontWeight: 700 }}>{n.subject}</div>}
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: 3 }}>{n.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
