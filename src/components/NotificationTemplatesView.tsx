import { useState } from 'react';
import { DEFAULT_SCORING_CONFIG, cloneConfig } from '../scoring';
import type { NotificationTrigger, ScoringConfig } from '../scoring';

interface NotificationTemplatesViewProps {
  config: ScoringConfig;
  onSaveConfig: (nextConfig: ScoringConfig) => void;
}

const TRIGGERS: NotificationTrigger[] = [
  'received',
  'auto_approve',
  'manual_review',
  'decline',
  'more_info_requested',
];

export function NotificationTemplatesView({
  config,
  onSaveConfig,
}: NotificationTemplatesViewProps) {
  const [draft, setDraft] = useState<ScoringConfig>(() => cloneConfig(config));

  const handleSave = () => {
    onSaveConfig({
      ...cloneConfig(draft),
      version: config.version + 1,
      id: `v-${config.version + 1}`,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleReset = () => {
    const next = cloneConfig(draft);
    next.templates = cloneConfig(DEFAULT_SCORING_CONFIG).templates;
    next.version = config.version + 1;
    next.id = `v-${next.version}`;
    next.updatedAt = new Date().toISOString();
    setDraft(next);
    onSaveConfig(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Notification Templates (SMS &amp; Email)</h2>
          <p className="page-subtitle">
            Customize mock SMS and Email messages dispatched when applications are submitted or
            decided by an Approver.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            Reset Templates
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save Templates
          </button>
        </div>
      </div>

      <div className="alert-box">
        Supported template placeholders: <code>{'{{customer_name}}'}</code>,{' '}
        <code>{'{{application_id}}'}</code>, <code>{'{{product}}'}</code>,{' '}
        <code>{'{{product_price}}'}</code>, <code>{'{{monthly_emi}}'}</code>,{' '}
        <code>{'{{emi_term}}'}</code>, <code>{'{{score}}'}</code>, <code>{'{{band}}'}</code>,{' '}
        <code>{'{{confidence}}'}</code>, <code>{'{{credit_limit}}'}</code>,{' '}
        <code>{'{{decision_reason}}'}</code>
      </div>

      <div className="grid-2">
        {TRIGGERS.map((trigger) => (
          <div key={trigger} className="card">
            <div className="card-header" style={{ marginBottom: 10 }}>
              <h3 className="card-title" style={{ textTransform: 'capitalize' }}>
                {trigger.replace(/_/g, ' ')}
              </h3>
            </div>
            <label className="field-label">SMS Body</label>
            <textarea
              className="textarea"
              rows={2}
              value={draft.templates[trigger].sms}
              onChange={(e) =>
                setDraft((p) => {
                  const next = cloneConfig(p);
                  next.templates[trigger].sms = e.target.value;
                  return next;
                })
              }
              style={{ marginBottom: 10 }}
            />
            <label className="field-label">Email Subject</label>
            <input
              type="text"
              className="input"
              value={draft.templates[trigger].emailSubject}
              onChange={(e) =>
                setDraft((p) => {
                  const next = cloneConfig(p);
                  next.templates[trigger].emailSubject = e.target.value;
                  return next;
                })
              }
              style={{ marginBottom: 10 }}
            />
            <label className="field-label">Email Body</label>
            <textarea
              className="textarea"
              rows={4}
              value={draft.templates[trigger].emailBody}
              onChange={(e) =>
                setDraft((p) => {
                  const next = cloneConfig(p);
                  next.templates[trigger].emailBody = e.target.value;
                  return next;
                })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

