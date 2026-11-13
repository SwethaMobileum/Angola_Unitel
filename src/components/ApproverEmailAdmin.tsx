import { useState, useEffect } from 'react';
import type { ApproverRecipient } from '../scoring';
import { checkServerHealth, sendRealTestEmail } from '../lib/emailService';

interface ApproverEmailAdminProps {
  approverRecipients: ApproverRecipient[];
  onSaveApprovers: (recipients: ApproverRecipient[]) => void;
  onToast: (msg: string) => void;
}

export function ApproverEmailAdmin({
  approverRecipients,
  onSaveApprovers,
  onToast,
}: ApproverEmailAdminProps) {
  const [approvers, setApprovers] = useState<ApproverRecipient[]>(() =>
    approverRecipients.length > 0
      ? approverRecipients
      : [
          {
            id: 'appr-1',
            name: 'Credit Approver',
            email: 'approver@unitel-demo.ao',
            active: true,
          },
        ]
  );

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [formError, setFormError] = useState('');

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  // Server health state
  const [serverStatus, setServerStatus] = useState<{
    online: boolean;
    smtpConfigured: boolean;
    emailFrom?: string;
  } | null>(null);

  useEffect(() => {
    checkServerHealth().then((status) => {
      setServerStatus(status);
    });
  }, []);

  const handleAddApprover = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const email = newEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name) {
      setFormError('Please enter a name for the approver.');
      return;
    }

    if (!email || !emailRegex.test(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    const nextList: ApproverRecipient[] = [
      ...approvers,
      {
        id: `appr-${Date.now()}`,
        name,
        email,
        active: true,
      },
    ];

    setApprovers(nextList);
    onSaveApprovers(nextList);
    setNewName('');
    setNewEmail('');
    setFormError('');
    onToast(`Approver ${name} (${email}) added.`);
  };

  const handleRemoveApprover = (id: string) => {
    if (approvers.length <= 1) {
      if (!window.confirm('Removing all approvers means no one will receive new application emails. Continue?')) {
        return;
      }
    }
    const nextList = approvers.filter((a) => a.id !== id);
    setApprovers(nextList);
    onSaveApprovers(nextList);
    onToast('Approver removed.');
  };

  const handleSendTest = async () => {
    const target = testEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!target || !emailRegex.test(target)) {
      setTestStatus({ success: false, message: 'Please enter a valid email address to receive the test.' });
      return;
    }

    setSendingTest(true);
    setTestStatus(null);

    const res = await sendRealTestEmail(target);
    setSendingTest(false);

    if (res.success) {
      setTestStatus({ success: true, message: `Real test email sent to ${target}! Please check your inbox.` });
      onToast(`Test email sent to ${target}`);
    } else {
      setTestStatus({
        success: false,
        message: res.error || 'Failed to dispatch email. Check server terminal for exact SMTP error.',
      });
      onToast('Test email failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Approver Email Settings</h2>
          <p className="page-subtitle">
            Configure who receives new credit applications for review and approval.
          </p>
        </div>
      </div>

      {/* SMTP Server Connection Status */}
      {serverStatus && (
        <div
          className="card-tinted"
          style={{
            borderLeft: `4px solid ${serverStatus.smtpConfigured ? 'var(--brand-500)' : '#EF4444'}`,
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: serverStatus.smtpConfigured ? 'var(--brand-700)' : '#EF4444' }}>
                {serverStatus.smtpConfigured
                  ? '✓ SMTP Email Server Connected'
                  : '⚠️ SMTP Credentials Missing in server .env'}
              </strong>
              <div style={{ fontSize: 13, marginTop: 2, color: 'var(--text-muted)' }}>
                {serverStatus.smtpConfigured
                  ? `Emails will be sent from ${serverStatus.emailFrom} via backend on port 3001.`
                  : 'Add SMTP_USER and SMTP_PASS (e.g. Gmail App Password) to your .env file to deliver real emails.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approver List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Current Approver Email List</h3>
          <span className="badge band-good">
            {approvers.length} Approver{approvers.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Approver Name</th>
                <th>Email Address (Receives New Applications)</th>
                <th style={{ width: 100, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {approvers.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.name}</td>
                  <td>
                    <code>{a.email}</code>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#EF4444' }}
                      onClick={() => handleRemoveApprover(a.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {approvers.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No approvers configured. Add an approver email below so new submissions can be received.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Approver Form */}
        <form onSubmit={handleAddApprover} className="card-tinted" style={{ padding: 14 }}>
          <strong style={{ display: 'block', marginBottom: 10, color: 'var(--brand-700)', fontSize: 13 }}>
            + Add New Approver Address
          </strong>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 200px' }}>
              <input
                type="text"
                className="input"
                placeholder="Name (e.g. Risk Lead, Colleague Name)"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setFormError('');
                }}
              />
            </div>
            <div style={{ flex: '1 1 260px' }}>
              <input
                type="email"
                className="input"
                placeholder="email@company.com"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setFormError('');
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Save Approver
            </button>
          </div>
          {formError && <div className="field-error" style={{ marginTop: 8 }}>{formError}</div>}
        </form>
      </div>

      {/* Send Test Email Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Send Test Email</h3>
        </div>
        <p className="page-subtitle" style={{ margin: '0 0 12px' }}>
          Test that your SMTP connection is working and emails really land in an inbox.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <input
            type="email"
            className="input"
            style={{ maxWidth: 320 }}
            placeholder="Enter your personal or test email..."
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={sendingTest}
            onClick={handleSendTest}
          >
            {sendingTest ? 'Sending...' : 'Send Test Email'}
          </button>
        </div>

        {testStatus && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              background: testStatus.success ? '#DEF7EC' : '#FDE8E8',
              color: testStatus.success ? '#03543F' : '#9B1C1C',
              border: `1px solid ${testStatus.success ? '#31C48D' : '#F98080'}`,
            }}
          >
            {testStatus.message}
          </div>
        )}
      </div>
    </div>
  );
}

