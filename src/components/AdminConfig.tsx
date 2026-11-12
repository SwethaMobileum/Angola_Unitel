import { useState } from 'react';
import { DEFAULT_SCORING_CONFIG, cloneConfig } from '../scoring';
import type {
  ConfidenceLevel,
  NotificationTrigger,
  RangeRule,
  Role,
  ScoreBandName,
  ScoringConfig,
} from '../scoring';

interface AdminConfigProps {
  config: ScoringConfig;
  role: Role;
  onSwitchRole: (role: Role) => void;
  onSaveConfig: (nextConfig: ScoringConfig) => void;
  onResetDefault: () => void;
}

const BANDS: ScoreBandName[] = ['Excellent', 'Good', 'Fair', 'Poor'];
const CONFIDENCES: ConfidenceLevel[] = ['High', 'Medium', 'Low'];
const TRIGGERS: NotificationTrigger[] = ['received', 'auto_approve', 'manual_review', 'decline'];

export function AdminConfig({
  config,
  role,
  onSwitchRole,
  onSaveConfig,
  onResetDefault,
}: AdminConfigProps) {
  const [draft, setDraft] = useState<ScoringConfig>(() => cloneConfig(config));
  const [savedMessage, setSavedMessage] = useState<string>('');
  const [lastVersion, setLastVersion] = useState(config.version);

  if (config.version !== lastVersion) {
    setLastVersion(config.version);
    setDraft(cloneConfig(config));
  }

  const isAdmin = role === 'admin';
  const weightSum =
    draft.weights.telecom +
    draft.weights.identity +
    draft.weights.mobileMoney +
    draft.weights.tax;

  const handleSave = () => {
    const next: ScoringConfig = {
      ...cloneConfig(draft),
      version: config.version + 1,
      id: `v-${config.version + 1}`,
      updatedAt: new Date().toISOString(),
    };
    onSaveConfig(next);
    setSavedMessage(
      `Saved Config v${next.version}. All 300 customer scores, limits, and dashboard metrics recomputed.`
    );
  };

  const handleReset = () => {
    const base = cloneConfig(DEFAULT_SCORING_CONFIG);
    setDraft(base);
    onResetDefault();
    setSavedMessage('Reset scoring configuration to default v1.');
  };

  const updateRangeRule = (
    key: keyof ScoringConfig['ranges'],
    idx: number,
    patch: Partial<RangeRule>
  ) => {
    setDraft((prev) => {
      const next = cloneConfig(prev);
      next.ranges[key][idx] = { ...next.ranges[key][idx], ...patch };
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Admin Configuration &amp; Versioning</h2>
          <p className="page-subtitle">
            Active version: <strong>v{config.version}</strong> • Last updated:{' '}
            {new Date(config.updatedAt).toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!isAdmin}
            onClick={handleReset}
          >
            Reset to Default
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!isAdmin}
            onClick={handleSave}
          >
            Save v{config.version + 1} &amp; Recompute All Scores
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div
          className="alert-box"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
        >
          <span>
            You are currently viewing as <strong>{role.toUpperCase()}</strong>. Switch to{' '}
            <strong>Admin</strong> to edit weights, range tables, credit limits, and templates.
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onSwitchRole('admin')}
          >
            Switch to Admin
          </button>
        </div>
      )}

      {savedMessage && <div className="alert-box">{savedMessage}</div>}

      {/* Weights & Caps */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Category Weights (Total: {weightSum} pts)</h3>
          </div>
          <div className="grid-2">
            <div>
              <label className="field-label">Telecom Behavior</label>
              <input
                type="number"
                className="input"
                disabled={!isAdmin}
                value={draft.weights.telecom}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    weights: { ...p.weights, telecom: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
            <div>
              <label className="field-label">Identity &amp; KYC</label>
              <input
                type="number"
                className="input"
                disabled={!isAdmin}
                value={draft.weights.identity}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    weights: { ...p.weights, identity: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
            <div>
              <label className="field-label">Mobile Money (Unitel Money)</label>
              <input
                type="number"
                className="input"
                disabled={!isAdmin}
                value={draft.weights.mobileMoney}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    weights: { ...p.weights, mobileMoney: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
            <div>
              <label className="field-label">Tax Standing (NIF)</label>
              <input
                type="number"
                className="input"
                disabled={!isAdmin}
                value={draft.weights.tax}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    weights: { ...p.weights, tax: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
          </div>
          <div style={{ fontSize: 12, marginTop: 10, opacity: 0.85 }}>
            Note: The scoring engine automatically re-normalizes active category weights to a 100-pt
            scale (so changing Telecom from 45 to 35 immediately re-weights all scores).
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Hard Caps &amp; Deductions</h3>
          </div>
          <div className="grid-3">
            <div>
              <label className="field-label">Unverified BI Max Score</label>
              <input
                type="number"
                className="input"
                disabled={!isAdmin}
                value={draft.caps.unverifiedBiMaxScore}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    caps: { ...p.caps, unverifiedBiMaxScore: Number(e.target.value) || 300 },
                  }))
                }
              />
            </div>
            <div>
              <label className="field-label">Unpaid Loan Max Score</label>
              <input
                type="number"
                className="input"
                disabled={!isAdmin}
                value={draft.caps.unpaidLoanMaxScore}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    caps: { ...p.caps, unpaidLoanMaxScore: Number(e.target.value) || 300 },
                  }))
                }
              />
            </div>
            <div>
              <label className="field-label">Suspended NIF Deduction (pts)</label>
              <input
                type="number"
                className="input"
                disabled={!isAdmin}
                value={draft.caps.suspendedNifPointDeduction}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    caps: { ...p.caps, suspendedNifPointDeduction: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Score Bands</div>
            <div className="grid-4">
              {draft.bands.map((b, idx) => (
                <div key={b.name} className="card-tinted" style={{ padding: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{b.name}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <input
                      type="number"
                      className="input"
                      disabled={!isAdmin}
                      value={b.minScore}
                      onChange={(e) =>
                        setDraft((p) => {
                          const next = cloneConfig(p);
                          next.bands[idx].minScore = Number(e.target.value) || 300;
                          return next;
                        })
                      }
                    />
                    <input
                      type="number"
                      className="input"
                      disabled={!isAdmin}
                      value={b.maxScore}
                      onChange={(e) =>
                        setDraft((p) => {
                          const next = cloneConfig(p);
                          next.bands[idx].maxScore = Number(e.target.value) || 900;
                          return next;
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Credit Limit Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Credit Limit Matrix (AOA by Band × Data Confidence)</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Band</th>
                {CONFIDENCES.map((c) => (
                  <th key={c}>{c} Confidence (AOA)</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BANDS.map((band) => (
                <tr key={band}>
                  <td style={{ fontWeight: 700 }}>{band}</td>
                  {CONFIDENCES.map((conf) => (
                    <td key={conf}>
                      <input
                        type="number"
                        className="input"
                        disabled={!isAdmin}
                        step={50_000}
                        value={draft.creditLimitsAoa[band][conf]}
                        onChange={(e) =>
                          setDraft((p) => {
                            const next = cloneConfig(p);
                            next.creditLimitsAoa[band][conf] = Number(e.target.value) || 0;
                            return next;
                          })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Range Tables */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Parameter Range Tables (% of Parameter Max Points)</h3>
        </div>
        <div className="grid-2">
          {(
            [
              ['simTenureMonths', 'SIM Tenure (Months)'],
              ['topupMonths12', 'Active Top-up Months (Last 12m)'],
            ] as const
          ).map(([key, title]) => (
            <div key={key} className="card-tinted">
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
              {draft.ranges[key].map((rule, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px',
                    gap: 8,
                    marginBottom: 6,
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 12.5 }}>{rule.label}</span>
                  <input
                    type="number"
                    className="input"
                    disabled={!isAdmin}
                    step={0.05}
                    min={0}
                    max={1}
                    value={rule.pct}
                    onChange={(e) =>
                      updateRangeRule(key, idx, { pct: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Notification Templates */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Editable Notification Templates</h3>
        </div>
        <div className="grid-2">
          {TRIGGERS.map((trigger) => (
            <div key={trigger} className="card-tinted">
              <div style={{ fontWeight: 700, marginBottom: 8, textTransform: 'capitalize' }}>
                {trigger.replace('_', ' ')}
              </div>
              <label className="field-label">SMS Template</label>
              <textarea
                className="textarea"
                rows={2}
                disabled={!isAdmin}
                value={draft.templates[trigger].sms}
                onChange={(e) =>
                  setDraft((p) => {
                    const next = cloneConfig(p);
                    next.templates[trigger].sms = e.target.value;
                    return next;
                  })
                }
                style={{ marginBottom: 8 }}
              />
              <label className="field-label">Email Subject</label>
              <input
                type="text"
                className="input"
                disabled={!isAdmin}
                value={draft.templates[trigger].emailSubject}
                onChange={(e) =>
                  setDraft((p) => {
                    const next = cloneConfig(p);
                    next.templates[trigger].emailSubject = e.target.value;
                    return next;
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

