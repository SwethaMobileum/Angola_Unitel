import { useState } from 'react';
import { evaluateCreditScore, formatAoa } from '../scoring';
import type {
  ApplicationRecord,
  ApplicationStatus,
  CustomerProfile,
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

interface ApprovalsQueueProps {
  applications: ApplicationRecord[];
  profiles: CustomerProfile[];
  config: ScoringConfig;
  role: Role;
  onDecision: (
    appId: string,
    status: Extract<ApplicationStatus, 'approved' | 'rejected' | 'more_info_requested'>,
    reason: string
  ) => void;
  onOpenDetail: (appId: string) => void;
}

export function ApprovalsQueue({
  applications,
  profiles,
  config,
  role,
  onDecision,
  onOpenDetail,
}: ApprovalsQueueProps) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const pendingItems = applications.filter(
    (a) => a.status === 'pending_review' || a.status === 'more_info_requested'
  );
  const items = filter === 'pending' ? pendingItems : applications;
  const canAct = role === 'approver' || role === 'admin';

  const [confirmDialog, setConfirmDialog] = useState<{
    app: ApplicationRecord;
    status: Extract<ApplicationStatus, 'approved' | 'rejected' | 'more_info_requested'>;
    reason: string;
  } | null>(null);

  const handleAction = (
    appId: string,
    status: Extract<ApplicationStatus, 'approved' | 'rejected' | 'more_info_requested'>
  ) => {
    const reason = (reasons[appId] ?? '').trim();
    if (!reason) {
      setErrors((prev) => ({
        ...prev,
        [appId]: 'A decision reason is required before approving, rejecting, or requesting info.',
      }));
      return;
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next[appId];
      return next;
    });

    const targetApp = applications.find((a) => a.id === appId);
    if (targetApp) {
      setConfirmDialog({ app: targetApp, status, reason });
    } else {
      onDecision(appId, status, reason);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Approval Queue</h2>
          <p className="page-subtitle">
            Every submitted loan application routes here for final Approver decision. Review volume
            level, equipment, EMI plan, proxy score reasons, and policy suggestion.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('pending')}
          >
            Pending Review ({pendingItems.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            All Applications ({applications.length})
          </button>
        </div>
      </div>

      <div className="card">
        {items.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            No applications currently waiting in the Approval Queue.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map((app) => {
              const profile =
                app.profile_snapshot ??
                profiles.find((p) => p.customer.id === app.customer_id);
              const exp = profile ? evaluateCreditScore(profile, config) : null;

              return (
                <div
                  key={app.id}
                  className="card-tinted"
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 16 }}>
                          {app.id} — {app.customer_name}
                        </strong>
                        <VolumeTierBadge tier={app.volume_tier} />
                        <StatusBadge status={app.status} />
                      </div>
                      <div style={{ fontSize: 12.5, marginTop: 4 }}>
                        Mobile: <strong>{app.mobile_no}</strong> • Equipment:{' '}
                        <strong>{app.product}</strong> ({formatAoa(app.product_price_aoa)}) • EMI:{' '}
                        <strong>
                          {app.emi_term_months}m @ {formatAoa(app.monthly_emi_aoa)}/mo
                        </strong>{' '}
                        ({app.emi_affordable ? '✓ Affordable' : '✕ Over cap'})
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 18 }}>{app.score}</strong>
                      <BandBadge band={app.band} />
                      <ConfidenceBadge confidence={app.confidence} />
                      <SuggestedDecisionBadge decision={app.decision} />
                    </div>
                  </div>

                  {/* Score Breakdown & Reasons inline */}
                  <div
                    className="card"
                    style={{ padding: 12, background: 'var(--surface)', fontSize: 12.5 }}
                  >
                    <div style={{ marginBottom: 6 }}>
                      <strong>Credit Limit:</strong> {formatAoa(app.credit_limit_aoa)} (Max EMI:{' '}
                      {formatAoa(app.max_monthly_emi_aoa)}/mo) •{' '}
                      <strong>Policy Suggestion Note:</strong> {app.decision_reason}
                    </div>
                    {exp && (
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {exp.categories.map((c) => (
                          <span key={c.category}>
                            <strong>{c.label}:</strong>{' '}
                            {c.excludedFromDenominator
                              ? 'Excluded (Thin File)'
                              : `${c.earnedPoints}/${c.effectiveMaxPoints}`}
                          </span>
                        ))}
                      </div>
                    )}
                    {exp?.thinFileNotice && (
                      <div style={{ marginTop: 4, fontWeight: 600, color: 'var(--text-muted)' }}>
                        {exp.thinFileNotice}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onOpenDetail(app.id)}
                      >
                        Full Breakdown
                      </button>
                      <input
                        type="text"
                        className={`input ${errors[app.id] ? 'input-error' : ''}`}
                        style={{ maxWidth: 360 }}
                        disabled={!canAct}
                        placeholder="Required decision reason (e.g. Verified telecom stability)..."
                        value={reasons[app.id] ?? ''}
                        onChange={(e) => {
                          setReasons((prev) => ({ ...prev, [app.id]: e.target.value }));
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next[app.id];
                            return next;
                          });
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={!canAct}
                        onClick={() => handleAction(app.id, 'approved')}
                      >
                        ✓ Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={!canAct}
                        onClick={() => handleAction(app.id, 'more_info_requested')}
                      >
                        ◷ Request Info
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={!canAct}
                        onClick={() => handleAction(app.id, 'rejected')}
                      >
                        ✕ Reject
                      </button>
                    </div>
                    {errors[app.id] && <div className="field-error">{errors[app.id]}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Decision Confirmation Modal with Notification Preview */}
      {confirmDialog && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--brand-700)' }}>
                Confirm Approver Decision
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmDialog(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              <div>Application: <strong>{confirmDialog.app.id}</strong></div>
              <div>Customer: <strong>{confirmDialog.app.customer_name}</strong> ({confirmDialog.app.mobile_no})</div>
              <div>Equipment: <strong>{confirmDialog.app.product}</strong></div>
              <div>
                Action:{' '}
                <strong style={{
                  color:
                    confirmDialog.status === 'approved'
                      ? 'var(--slate-700)'
                      : confirmDialog.status === 'rejected'
                        ? 'var(--brand-700)'
                        : 'var(--text)',
                  textTransform: 'uppercase',
                }}>
                  {confirmDialog.status.replace(/_/g, ' ')}
                </strong>
              </div>
              <div style={{ marginTop: 6 }}>
                Reason: <em>"{confirmDialog.reason}"</em>
              </div>
            </div>

            <div
              className="card-tinted"
              style={{
                borderLeft: '4px solid var(--brand-500)',
                padding: '12px 14px',
                background: 'var(--brand-50)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--brand-700)', marginBottom: 2 }}>
                Email Notification
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>
                An email will be sent to <strong>{confirmDialog.app.submitted_by_email || 'analyst@unitel-demo.ao'}</strong>.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onDecision(confirmDialog.app.id, confirmDialog.status, confirmDialog.reason);
                  setConfirmDialog(null);
                }}
              >
                Confirm &amp; Send Email Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
