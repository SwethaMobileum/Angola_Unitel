import { useState } from 'react';
import { formatAoa } from '../scoring';
import type { ApplicationRecord, DecisionOutcome, Role } from '../scoring';
import { BandBadge, ConfidenceBadge, DecisionBadge } from './Badges';

interface ApprovalsQueueProps {
  applications: ApplicationRecord[];
  role: Role;
  onOverride: (appId: string, decision: DecisionOutcome, reason: string) => void;
  onInspectCustomer: (customerId: string) => void;
}

export function ApprovalsQueue({
  applications,
  role,
  onOverride,
  onInspectCustomer,
}: ApprovalsQueueProps) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'queue' | 'all'>('queue');

  const items =
    filter === 'queue'
      ? applications.filter((a) => a.decision === 'manual_review')
      : applications;

  const canAct = role === 'approver' || role === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Approvals Queue</h2>
          <p className="page-subtitle">
            Manual-review applications (Fair band, Low confidence, or slight limit gap). Approver or
            Admin role can override with an audit reason.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn btn-sm ${filter === 'queue' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('queue')}
          >
            Pending Manual Review ({applications.filter((a) => a.decision === 'manual_review').length})
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

      {!canAct && (
        <div className="alert-box">
          You are viewing as <strong>Analyst</strong>. Switch to <strong>Approver</strong> or{' '}
          <strong>Admin</strong> in the top bar to approve or decline queue items.
        </div>
      )}

      <div className="card">
        {items.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', opacity: 0.85 }}>
            No applications currently waiting in the manual review queue.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {items.map((app) => (
              <div
                key={app.id}
                className="card-tinted"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 15 }}>
                      {app.id} — {app.customer_name}
                    </strong>{' '}
                    <span style={{ fontSize: 12.5 }}>({app.mobile_no})</span>
                    <div style={{ fontSize: 13, marginTop: 2 }}>
                      Product: <strong>{app.product}</strong> ({formatAoa(app.product_price_aoa)}) •
                      Assigned Limit: <strong>{formatAoa(app.credit_limit_aoa)}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <strong>Score: {app.score}</strong>
                    <BandBadge band={app.band} />
                    <ConfidenceBadge confidence={app.confidence} />
                    <DecisionBadge decision={app.decision} />
                  </div>
                </div>

                <div style={{ fontSize: 12.5 }}>
                  <strong>Routing Reason:</strong> {app.decision_reason}
                  {app.overridden_by && (
                    <span style={{ marginLeft: 8, fontWeight: 700 }}>
                      (Overridden by {app.overridden_by})
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => onInspectCustomer(app.customer_id)}
                  >
                    Inspect Customer 360°
                  </button>
                  <input
                    type="text"
                    className="input"
                    style={{ maxWidth: 340 }}
                    disabled={!canAct}
                    placeholder="Enter approval / decline reason..."
                    value={reasons[app.id] ?? ''}
                    onChange={(e) =>
                      setReasons((prev) => ({ ...prev, [app.id]: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-approve btn-sm"
                    disabled={!canAct}
                    onClick={() =>
                      onOverride(
                        app.id,
                        'auto_approve',
                        reasons[app.id]?.trim() || 'Approved by Credit Approver after manual review'
                      )
                    }
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-decline btn-sm"
                    disabled={!canAct}
                    onClick={() =>
                      onOverride(
                        app.id,
                        'decline',
                        reasons[app.id]?.trim() || 'Declined by Credit Approver after manual review'
                      )
                    }
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

