import { useState, useMemo } from 'react';
import {
  DEFAULT_APPROVER_RECIPIENTS,
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../scoring';
import type {
  ApproverRecipient,
  EditableNotificationTemplate,
  NotificationSettings,
} from '../scoring';
import { interpolate } from '../scoring/notifications';
import { sendTestNotification } from '../lib/emailService';

interface NotificationTemplatesViewProps {
  approverRecipients: ApproverRecipient[];
  emailTemplates: Record<string, EditableNotificationTemplate>;
  notificationSettings: NotificationSettings;
  isDemoMode?: boolean;
  onSaveNotificationSettings: (
    recipients: ApproverRecipient[],
    templates: Record<string, EditableNotificationTemplate>,
    settings: NotificationSettings
  ) => void;
  onToast: (msg: string) => void;
}

type EmailEventType = 'submitted' | 'approved' | 'rejected' | 'more_info';

const EVENT_LABELS: Record<EmailEventType, string> = {
  submitted: 'Application Submitted (To Approvers)',
  approved: 'Application Approved (To Submitter)',
  rejected: 'Application Rejected (To Submitter)',
  more_info: 'More Info Requested (To Submitter)',
};

const SAMPLE_VARS: Record<string, string> = {
  reference: 'CR-8421',
  application_id: 'APP-8421',
  customer_name: 'Ana Paula Mendes',
  mobile_no: '+244 923 100 001',
  volume_tier: 'Low Volume (Basic)',
  equipment: 'Unitel Smart 4G (64GB)',
  product: 'Unitel Smart 4G (64GB)',
  price: '140.000 AOA',
  product_price: '140.000 AOA',
  emi_term: '12',
  monthly_emi: '14.000 AOA',
  score: '685',
  band: 'Good',
  confidence: 'High',
  credit_limit: '300.000 AOA',
  suggestion: 'Auto-approve candidate',
  decision: 'Approved',
  reason: 'Strong telecom tenure of 24 months and clean on-time top-up behavior.',
  decided_by: 'Credit Approver Silva (APPROVER)',
  decided_at: '2026-11-13 11:30',
  submitted_by_name: 'Thomas Silva',
  submitted_by_email: 'analyst@unitel-demo.ao',
  submitted_at: '2026-11-13 11:15',
  link: `${window.location.origin}?appId=APP-8421`,
};

export function NotificationTemplatesView({
  approverRecipients,
  emailTemplates,
  notificationSettings,
  isDemoMode = true,
  onSaveNotificationSettings,
  onToast,
}: NotificationTemplatesViewProps) {
  // Local state for editable approver list
  const [approvers, setApprovers] = useState<ApproverRecipient[]>(() =>
    approverRecipients.length ? [...approverRecipients] : [...DEFAULT_APPROVER_RECIPIENTS]
  );
  const [newApproverName, setNewApproverName] = useState('');
  const [newApproverEmail, setNewApproverEmail] = useState('');
  const [approverError, setApproverError] = useState('');

  // Local state for notification settings (customer email toggle)
  const [settings, setSettings] = useState<NotificationSettings>(
    () => notificationSettings ?? { ...DEFAULT_NOTIFICATION_SETTINGS }
  );

  // Local state for 4 email templates
  const [templates, setTemplates] = useState<Record<string, EditableNotificationTemplate>>(() => ({
    ...DEFAULT_EMAIL_TEMPLATES,
    ...emailTemplates,
  }));

  // Selected event tab for editing & preview
  const [activeEvent, setActiveEvent] = useState<EmailEventType>('submitted');

  // Test email state
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const activeApproversCount = useMemo(
    () => approvers.filter((a) => a.active).length,
    [approvers]
  );

  // Live interpolated preview
  const currentTemplate = templates[activeEvent] ?? DEFAULT_EMAIL_TEMPLATES[activeEvent];
  const previewSubject = useMemo(
    () => interpolate(currentTemplate.subject, SAMPLE_VARS),
    [currentTemplate.subject]
  );
  const previewBody = useMemo(
    () => interpolate(currentTemplate.body_text, SAMPLE_VARS),
    [currentTemplate.body_text]
  );

  // Add Approver recipient
  const handleAddApprover = () => {
    const name = newApproverName.trim();
    const email = newApproverEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name) {
      setApproverError('Approver name is required.');
      return;
    }
    if (!email || !emailRegex.test(email)) {
      setApproverError('Enter a valid email address (e.g. approver@unitel-demo.ao).');
      return;
    }

    const next: ApproverRecipient = {
      id: `appr-${Date.now()}`,
      name,
      email,
      active: true,
    };

    setApprovers((prev) => [...prev, next]);
    setNewApproverName('');
    setNewApproverEmail('');
    setApproverError('');
    onToast(`Added ${name} to Approver notification list.`);
  };

  const handleToggleApproverActive = (id: string) => {
    setApprovers((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const handleRemoveApprover = (id: string) => {
    setApprovers((prev) => prev.filter((a) => a.id !== id));
    onToast('Removed approver recipient.');
  };

  // Send test email
  const handleSendTestEmail = async () => {
    const target = testEmailAddress.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!target || !emailRegex.test(target)) {
      setTestEmailStatus('Please enter a valid test recipient email address.');
      return;
    }

    setIsSendingTest(true);
    setTestEmailStatus(null);

    try {
      const res = await sendTestNotification(target, currentTemplate, SAMPLE_VARS);
      if (res.status === 'sent') {
        setTestEmailStatus(`✓ Real test email dispatched to ${target}!`);
        onToast(`Test email sent to ${target}`);
      } else if (res.status === 'demo') {
        setTestEmailStatus(`ℹ Test email recorded in demo mode for ${target} (no SMTP/API key configured).`);
        onToast(`Test email simulated in demo mode for ${target}`);
      } else {
        setTestEmailStatus(`✕ Sending failed: ${res.errorMessage || 'Unknown error'}`);
        onToast(`Failed to send test email: ${res.errorMessage}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestEmailStatus(`✕ Sending error: ${msg}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (!window.confirm('Reset all notification templates, approver recipients, and settings to defaults?')) {
      return;
    }
    setApprovers([...DEFAULT_APPROVER_RECIPIENTS]);
    setTemplates({ ...DEFAULT_EMAIL_TEMPLATES });
    setSettings({ ...DEFAULT_NOTIFICATION_SETTINGS });
    onSaveNotificationSettings(
      DEFAULT_APPROVER_RECIPIENTS,
      DEFAULT_EMAIL_TEMPLATES,
      DEFAULT_NOTIFICATION_SETTINGS
    );
    onToast('Reset notifications to factory defaults.');
  };

  // Save all changes
  const handleSaveAll = () => {
    onSaveNotificationSettings(approvers, templates, settings);
    onToast('Notification settings, templates, and approver list saved successfully.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Admin Notification Settings &amp; Templates</h2>
          <p className="page-subtitle">
            Manage approver email recipients, customize submission &amp; decision email templates,
            preview with live data, and configure customer delivery.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={handleResetToDefault}>
            Reset to Default
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSaveAll}>
            Save All Settings
          </button>
        </div>
      </div>

      {/* Demo Mode Notice */}
      {isDemoMode && (
        <div
          className="card-tinted"
          style={{
            borderLeft: '4px solid var(--brand-500)',
            padding: '12px 16px',
            background: 'var(--brand-50)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge band-fair">Demo Mode Active</span>
            <strong style={{ color: 'var(--brand-700)' }}>Email is in demo mode</strong>
          </div>
          <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text)' }}>
            Real email API credentials (<code>EMAIL_API_KEY</code> / <code>SMTP</code>) are not configured.
            Outgoing emails will be safely marked as <strong>Not sent (demo mode)</strong> in the notifications log without blocking approvals.
          </div>
        </div>
      )}

      {/* SECTION 1: Approver Notification List */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">1. Approver Notification Recipient List</h3>
            <p className="page-subtitle" style={{ margin: 0 }}>
              Whenever an Analyst submits an application, all <strong>active</strong> email addresses below will receive Email 1 with full loan details.
            </p>
          </div>
          <span className={`badge ${activeApproversCount > 0 ? 'band-good' : 'band-poor'}`}>
            {activeApproversCount} Active Approver{activeApproversCount === 1 ? '' : 's'}
          </span>
        </div>

        {activeApproversCount === 0 && (
          <div
            className="alert-box"
            style={{
              background: '#FEF2F2',
              borderColor: '#EF4444',
              color: '#991B1B',
              marginBottom: 16,
            }}
          >
            <strong>⚠️ Warning:</strong> No active approver email address is configured. At least one active address is required before submissions can be sent. New submissions will be logged as <em>failed (no recipients)</em>.
          </div>
        )}

        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 60 }}>Active</th>
                <th>Name / Desk</th>
                <th>Email Address</th>
                <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvers.map((appr) => (
                <tr key={appr.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={appr.active}
                      onChange={() => handleToggleApproverActive(appr.id)}
                      title={appr.active ? 'Deactivate this approver' : 'Activate this approver'}
                    />
                  </td>
                  <td style={{ fontWeight: 600 }}>{appr.name}</td>
                  <td>
                    <code>{appr.email}</code>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#EF4444' }}
                      onClick={() => handleRemoveApprover(appr.id)}
                      title="Remove from list"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {approvers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No approver addresses added. Use the form below to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add New Approver Row */}
        <div
          className="card-tinted"
          style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <strong style={{ fontSize: 13, color: 'var(--brand-700)' }}>
            + Add New Approver Recipient
          </strong>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 200px' }}>
              <input
                type="text"
                className="input"
                placeholder="Approver / Desk Name (e.g. Risk Lead)"
                value={newApproverName}
                onChange={(e) => {
                  setNewApproverName(e.target.value);
                  setApproverError('');
                }}
              />
            </div>
            <div style={{ flex: '1 1 240px' }}>
              <input
                type="email"
                className="input"
                placeholder="approver.email@unitel-demo.ao"
                value={newApproverEmail}
                onChange={(e) => {
                  setNewApproverEmail(e.target.value);
                  setApproverError('');
                }}
              />
            </div>
            <button type="button" className="btn btn-primary" onClick={handleAddApprover}>
              Add Approver
            </button>
          </div>
          {approverError && <div className="field-error">{approverError}</div>}
        </div>
      </div>

      {/* SECTION 2: General Notification Settings */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">2. Customer Notification Preferences</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ marginTop: 3 }}
              checked={settings.notify_customer}
              onChange={(e) => setSettings({ notify_customer: e.target.checked })}
            />
            <div>
              <strong style={{ color: 'var(--text)', fontSize: 14 }}>
                Also email the customer (default off)
              </strong>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                When enabled, an identical copy of the approval, rejection, or request-more-info email is also sent to the <code>customer_email</code> address provided on the application form. When disabled, decision emails are sent strictly to the submitting Analyst.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* SECTION 3: Editable Email Templates */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">3. Editable Email Templates &amp; Live Preview</h3>
            <p className="page-subtitle" style={{ margin: 0 }}>
              Edit subject and body copy for each lifecycle event. Placeholders are dynamically interpolated.
            </p>
          </div>
        </div>

        {/* Event Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {(['submitted', 'approved', 'rejected', 'more_info'] as EmailEventType[]).map((ev) => (
            <button
              key={ev}
              type="button"
              className={`btn btn-sm ${activeEvent === ev ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setActiveEvent(ev);
                setTestEmailStatus(null);
              }}
            >
              {EVENT_LABELS[ev]}
            </button>
          ))}
        </div>

        {/* Placeholders Reference */}
        <div className="alert-box" style={{ marginBottom: 16 }}>
          <strong style={{ color: 'var(--brand-700)' }}>Supported Placeholders:</strong>{' '}
          <code>{'{{reference}}'}</code>, <code>{'{{customer_name}}'}</code>,{' '}
          <code>{'{{mobile_no}}'}</code>, <code>{'{{volume_tier}}'}</code>,{' '}
          <code>{'{{equipment}}'}</code>, <code>{'{{price}}'}</code>,{' '}
          <code>{'{{emi_term}}'}</code>, <code>{'{{monthly_emi}}'}</code>,{' '}
          <code>{'{{score}}'}</code>, <code>{'{{band}}'}</code>,{' '}
          <code>{'{{confidence}}'}</code>, <code>{'{{credit_limit}}'}</code>,{' '}
          <code>{'{{decision}}'}</code>, <code>{'{{reason}}'}</code>,{' '}
          <code>{'{{decided_by}}'}</code>, <code>{'{{link}}'}</code>,{' '}
          <code>{'{{submitted_by_name}}'}</code>, <code>{'{{submitted_by_email}}'}</code>
        </div>

        <div className="grid-2">
          {/* Left Column: Template Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="field-label">Email Subject</label>
              <input
                type="text"
                className="input"
                value={currentTemplate.subject}
                onChange={(e) =>
                  setTemplates((prev) => ({
                    ...prev,
                    [activeEvent]: {
                      ...prev[activeEvent],
                      subject: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div>
              <label className="field-label">Email Body (Plain Text &amp; Placeholders)</label>
              <textarea
                className="textarea"
                rows={12}
                value={currentTemplate.body_text}
                onChange={(e) =>
                  setTemplates((prev) => ({
                    ...prev,
                    [activeEvent]: {
                      ...prev[activeEvent],
                      body_text: e.target.value,
                    },
                  }))
                }
                style={{ fontFamily: 'monospace', fontSize: 12.5 }}
              />
            </div>
          </div>

          {/* Right Column: Live Preview & Send Test */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card-tinted" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ color: 'var(--brand-700)' }}>Live Preview (Sample Persona)</strong>
                <span className="badge band-good">Interpolated</span>
              </div>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <strong>Subject:</strong> {previewSubject}
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 8,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  fontSize: 12.5,
                  maxHeight: 280,
                  overflowY: 'auto',
                }}
              >
                {previewBody}
              </pre>
            </div>

            {/* Send Test Email Box */}
            <div
              className="card-tinted"
              style={{
                borderLeft: '4px solid var(--brand-500)',
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <strong style={{ color: 'var(--brand-700)', fontSize: 13 }}>
                Send Test Email for "{EVENT_LABELS[activeEvent]}"
              </strong>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                Test emails are sent strictly to the address you type below. Never sends to actual customer or approver addresses during test mode.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="email"
                  className="input"
                  style={{ maxWidth: 300 }}
                  placeholder="Enter your email to receive test..."
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={isSendingTest}
                  onClick={handleSendTestEmail}
                >
                  {isSendingTest ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
              {testEmailStatus && (
                <div
                  style={{
                    fontSize: 12.5,
                    padding: '6px 10px',
                    borderRadius: 6,
                    background: testEmailStatus.startsWith('✓')
                      ? '#DEF7EC'
                      : testEmailStatus.startsWith('ℹ')
                        ? '#FEF3C7'
                        : '#FDE8E8',
                    color: testEmailStatus.startsWith('✓')
                      ? '#03543F'
                      : testEmailStatus.startsWith('ℹ')
                        ? '#92400E'
                        : '#9B1C1C',
                  }}
                >
                  {testEmailStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
