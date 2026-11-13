import { useMemo, useState } from 'react';
import type { NotificationRecord } from '../scoring';

interface NotificationsLogProps {
  notifications: NotificationRecord[];
}

export function NotificationsLog({ notifications }: NotificationsLogProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>(notifications[0]?.id ?? '');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notifications;
    return notifications.filter(
      (n) =>
        n.recipient_email?.toLowerCase().includes(q) ||
        n.subject?.toLowerCase().includes(q) ||
        n.application_id?.toLowerCase().includes(q)
    );
  }, [notifications, search]);

  const activeNotif = filtered.find((n) => n.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Notifications Log</h2>
          <p className="page-subtitle">
            Record of all outbound emails dispatched by the credit portal.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <input
          type="text"
          className="input"
          style={{ maxWidth: 360 }}
          placeholder="Filter by recipient, subject, or application ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid-asymmetric">
        {/* Message Inspector */}
        <div className="card" style={{ padding: 16 }}>
          <div className="card-header" style={{ marginBottom: 12 }}>
            <h3 className="card-title">Email Details</h3>
            {activeNotif && (
              <span className={`badge ${activeNotif.status === 'sent' ? 'band-good' : 'band-poor'}`}>
                {activeNotif.status === 'sent' ? 'SENT' : 'FAILED'}
              </span>
            )}
          </div>

          {activeNotif ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div>
                <strong>To:</strong> <code>{activeNotif.recipient_email}</code>
              </div>
              <div>
                <strong>Subject:</strong> {activeNotif.subject}
              </div>
              <div>
                <strong>Date &amp; Time:</strong>{' '}
                {new Date(activeNotif.sent_at || activeNotif.created_at).toLocaleString()}
              </div>

              {activeNotif.error_message && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: '#FDE8E8',
                    color: '#9B1C1C',
                    fontSize: 12.5,
                  }}
                >
                  <strong>Failure details:</strong> {activeNotif.error_message}
                </div>
              )}

              <div>
                <label className="field-label">Message Content</label>
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
                    maxHeight: 280,
                    overflowY: 'auto',
                  }}
                >
                  {activeNotif.body}
                </pre>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>No notification selected.</div>
          )}
        </div>

        {/* Simplified Table: Date, Recipient, Subject, Status */}
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Date &amp; Time</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th style={{ width: 100 }}>Status</th>
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
                      {new Date(n.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{n.recipient_email}</td>
                    <td style={{ fontSize: 13, maxWidth: 300 }}>{n.subject}</td>
                    <td>
                      <span className={`badge ${n.status === 'sent' ? 'band-good' : 'band-poor'}`}>
                        {n.status === 'sent' ? 'SENT' : 'FAILED'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No notifications recorded yet.
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
