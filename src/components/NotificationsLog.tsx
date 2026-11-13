import { useMemo, useState } from 'react';
import type { ApplicationRecord, NotificationChannel, NotificationRecord, Role } from '../scoring';

interface NotificationsLogProps {
  notifications: NotificationRecord[];
  role?: Role;
  applications?: ApplicationRecord[];
  currentSubmitterEmail?: string;
  isDemoMode?: boolean;
  onRetry?: (notificationId: string) => void;
}

export function NotificationsLog({
  notifications,
  role = 'admin',
  applications = [],
  currentSubmitterEmail = '',
  isDemoMode = true,
  onRetry,
}: NotificationsLogProps) {
  const [channelFilter, setChannelFilter] = useState<'all' | NotificationChannel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'demo' | 'failed'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>(notifications[0]?.id ?? '');

  // Role visibility restriction: Analyst sees only their own notifications
  const roleFiltered = useMemo(() => {
    if (role !== 'analyst') return notifications;

    const emailMatch = currentSubmitterEmail.trim().toLowerCase();
    const analystAppIds = new Set(
      applications
        .filter(
          (a) =>
            (a.submitted_by_email && a.submitted_by_email.toLowerCase() === emailMatch) ||
            a.created_by_role === 'analyst'
        )
        .map((a) => a.id)
    );

    return notifications.filter((n) => {
      if (emailMatch && n.recipient_email?.toLowerCase() === emailMatch) return true;
      if (analystAppIds.has(n.application_id)) return true;
      if (n.recipient_role === 'analyst') return true;
      return false;
    });
  }, [notifications, role, applications, currentSubmitterEmail]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roleFiltered.filter((n) => {
      if (channelFilter !== 'all' && n.channel !== channelFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'demo' && n.status !== 'demo' && n.status !== 'simulated_sent') {
          return false;
        }
        if (statusFilter === 'sent' && n.status !== 'sent') return false;
        if (statusFilter === 'failed' && n.status !== 'failed') return false;
      }
      if (!q) return true;
      return (
        n.customer_name?.toLowerCase().includes(q) ||
        n.application_id?.toLowerCase().includes(q) ||
        n.recipient_email?.toLowerCase().includes(q) ||
        n.subject?.toLowerCase().includes(q) ||
        n.body?.toLowerCase().includes(q) ||
        n.event_type?.toLowerCase().includes(q)
      );
    });
  }, [roleFiltered, channelFilter, statusFilter, search]);

  const activeNotif =
    filtered.find((n) => n.id === selectedId) ?? filtered[0] ?? null;

  const renderStatusBadge = (status: NotificationRecord['status']) => {
    switch (status) {
      case 'sent':
        return <span className="badge band-good">SENT</span>;
      case 'demo':
      case 'simulated_sent':
        return <span className="badge band-fair">DEMO (NOT SENT)</span>;
      case 'failed':
        return <span className="badge band-poor">FAILED</span>;
      case 'queued':
      default:
        return <span className="badge band-fair">QUEUED</span>;
    }
  };

  const getEventLabel = (n: NotificationRecord) => {
    if (n.event_type) {
      switch (n.event_type) {
        case 'submitted':
          return 'Application Submitted';
        case 'approved':
          return 'Application Approved';
        case 'rejected':
          return 'Application Rejected';
        case 'more_info':
          return 'More Info Requested';
        case 'test':
          return 'Test Email';
      }
    }
    return n.template ?? 'Notification';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Notifications Log</h2>
          <p className="page-subtitle">
            {role === 'analyst'
              ? 'Showing notifications for your submitted credit applications.'
              : 'Complete audit log of application lifecycle emails and simulated notices.'}
          </p>
        </div>
      </div>

      {/* Admin Demo Mode Banner */}
      {role === 'admin' && isDemoMode && (
        <div
          className="card-tinted"
          style={{
            borderLeft: '4px solid var(--brand-500)',
            padding: '10px 14px',
            background: 'var(--brand-50)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge band-fair">Demo Mode</span>
            <strong style={{ color: 'var(--brand-700)' }}>Email is in demo mode</strong>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>
            Email API credentials are unconfigured. Outgoing emails are stored as <strong>Not sent (demo mode)</strong>. Admin can use <strong>Retry</strong> below once credentials are configured.
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="Search email, App ID, recipient, text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('all')}
            >
              All Statuses ({roleFiltered.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'sent' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('sent')}
            >
              Sent ({roleFiltered.filter((n) => n.status === 'sent').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'demo' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('demo')}
            >
              Demo ({roleFiltered.filter((n) => n.status === 'demo' || n.status === 'simulated_sent').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'failed' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('failed')}
            >
              Failed ({roleFiltered.filter((n) => n.status === 'failed').length})
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button
              type="button"
              className={`btn btn-sm ${channelFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setChannelFilter('all')}
            >
              All Channels
            </button>
            <button
              type="button"
              className={`btn btn-sm ${channelFilter === 'email' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setChannelFilter('email')}
            >
              Email Only
            </button>
          </div>
        </div>
      </div>

      <div className="grid-asymmetric">
        {/* Left Side: Message Preview Detail */}
        <div className="card" style={{ padding: 16 }}>
          <div className="card-header" style={{ marginBottom: 12 }}>
            <h3 className="card-title">Message Inspector</h3>
            {activeNotif && renderStatusBadge(activeNotif.status)}
          </div>

          {activeNotif ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge band-good">{activeNotif.channel.toUpperCase()}</span>
                <span className="badge band-fair">{getEventLabel(activeNotif)}</span>
              </div>

              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div>
                  <strong>Recipient:</strong>{' '}
                  {activeNotif.recipient_email ? (
                    <code>{activeNotif.recipient_email}</code>
                  ) : (
                    <span style={{ color: '#EF4444' }}>None (missing recipient)</span>
                  )}{' '}
                  {activeNotif.recipient_role && (
                    <span style={{ color: 'var(--text-muted)' }}>({activeNotif.recipient_role})</span>
                  )}
                </div>
                <div>
                  <strong>Application:</strong> <code>{activeNotif.application_id}</code>
                </div>
                <div>
                  <strong>Customer:</strong> {activeNotif.customer_name} ({activeNotif.mobile_no})
                </div>
                <div>
                  <strong>Created:</strong> {new Date(activeNotif.created_at).toLocaleString()}
                </div>
                {activeNotif.sent_at && (
                  <div>
                    <strong>Delivered:</strong> {new Date(activeNotif.sent_at).toLocaleString()}
                  </div>
                )}
              </div>

              {activeNotif.error_message && (
                <div
                  className="alert-box"
                  style={{
                    background: '#FEF2F2',
                    borderColor: '#EF4444',
                    color: '#991B1B',
                    fontSize: 12.5,
                  }}
                >
                  <strong>Error details:</strong> {activeNotif.error_message}
                </div>
              )}

              {activeNotif.status === 'failed' && role === 'admin' && onRetry && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onRetry(activeNotif.id)}
                  >
                    ↻ Retry Sending Notification
                  </button>
                </div>
              )}

              {activeNotif.subject && (
                <div className="card-tinted" style={{ padding: 10, fontSize: 13 }}>
                  <strong>Subject:</strong> {activeNotif.subject}
                </div>
              )}

              <div>
                <label className="field-label">Rendered Content</label>
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    borderRadius: 8,
                    background: 'var(--table-stripe)',
                    border: '1px solid var(--border)',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    fontSize: 12.5,
                    maxHeight: 320,
                    overflowY: 'auto',
                  }}
                >
                  {activeNotif.body}
                </pre>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>No matching notifications found.</div>
          )}
        </div>

        {/* Right Side: Notifications Table */}
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Time</th>
                  <th>Event</th>
                  <th>App Ref</th>
                  <th>Recipient</th>
                  <th>Subject / Summary</th>
                  <th>Status</th>
                  {role === 'admin' && <th style={{ textAlign: 'right' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((n) => (
                  <tr
                    key={n.id}
                    style={{
                      cursor: 'pointer',
                      background: activeNotif?.id === n.id ? 'var(--hover)' : undefined,
                    }}
                    onClick={() => setSelectedId(n.id)}
                  >
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(n.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ fontSize: 12.5, fontWeight: 600 }}>{getEventLabel(n)}</td>
                    <td style={{ fontWeight: 700 }}>{n.application_id}</td>
                    <td style={{ fontSize: 12.5 }}>
                      {n.recipient_email || n.customer_name}
                    </td>
                    <td style={{ fontSize: 12.5, maxWidth: 260 }}>
                      {(n.subject || n.body).slice(0, 50)}...
                    </td>
                    <td>{renderStatusBadge(n.status)}</td>
                    {role === 'admin' && (
                      <td style={{ textAlign: 'right' }}>
                        {n.status === 'failed' && onRetry && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetry(n.id);
                            }}
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={role === 'admin' ? 7 : 6}
                      style={{ textAlign: 'center', color: 'var(--text-muted)' }}
                    >
                      No notifications match your current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
