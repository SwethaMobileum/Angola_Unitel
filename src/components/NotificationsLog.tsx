import { useMemo, useState } from 'react';
import type { NotificationChannel, NotificationRecord } from '../scoring';

interface NotificationsLogProps {
  notifications: NotificationRecord[];
}

export function NotificationsLog({ notifications }: NotificationsLogProps) {
  const [channelFilter, setChannelFilter] = useState<'all' | NotificationChannel>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>(notifications[0]?.id ?? '');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((n) => {
      if (channelFilter !== 'all' && n.channel !== channelFilter) return false;
      if (!q) return true;
      return (
        n.customer_name.toLowerCase().includes(q) ||
        n.application_id.toLowerCase().includes(q) ||
        n.mobile_no.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q)
      );
    });
  }, [notifications, channelFilter, search]);

  const activeNotif =
    filtered.find((n) => n.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Notifications Log (Simulated SMS &amp; Email)</h2>
          <p className="page-subtitle">
            All customer messages are generated from editable templates in Admin Config. No real
            SMS or emails are dispatched.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="input"
            style={{ maxWidth: 320 }}
            placeholder="Filter by customer, App ID, mobile, text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className={`btn btn-sm ${channelFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setChannelFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${channelFilter === 'sms' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setChannelFilter('sms')}
          >
            SMS ({notifications.filter((n) => n.channel === 'sms').length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${channelFilter === 'email' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setChannelFilter('email')}
          >
            Email ({notifications.filter((n) => n.channel === 'email').length})
          </button>
        </div>
      </div>

      <div className="grid-asymmetric">
        <div className="card" style={{ padding: 14 }}>
          <div className="card-header">
            <h3 className="card-title">Template Preview</h3>
          </div>
          {activeNotif ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge band-good">{activeNotif.channel.toUpperCase()}</span>
                <span className="badge band-fair">Template: {activeNotif.template}</span>
              </div>
              <div style={{ fontSize: 12.5 }}>
                <div>
                  <strong>To:</strong> {activeNotif.customer_name} ({activeNotif.mobile_no})
                </div>
                <div>
                  <strong>Application:</strong> {activeNotif.application_id}
                </div>
                <div>
                  <strong>Status:</strong> Simulated Sent
                </div>
              </div>
              {activeNotif.subject && (
                <div className="card-tinted" style={{ padding: 10, fontSize: 13 }}>
                  <strong>Subject:</strong> {activeNotif.subject}
                </div>
              )}
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 8,
                  background: 'var(--orange-50)',
                  border: '1px solid var(--orange-200)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  fontSize: 13,
                }}
              >
                {activeNotif.body}
              </pre>
            </div>
          ) : (
            <div>No matching notifications.</div>
          )}
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>App ID</th>
                  <th>Customer</th>
                  <th>Channel</th>
                  <th>Trigger</th>
                  <th>Excerpt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((n) => (
                  <tr
                    key={n.id}
                    style={{
                      cursor: 'pointer',
                      background: activeNotif?.id === n.id ? 'var(--orange-100)' : undefined,
                    }}
                    onClick={() => setSelectedId(n.id)}
                  >
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 700 }}>{n.application_id}</td>
                    <td>{n.customer_name}</td>
                    <td>
                      <span className="badge band-fair">{n.channel.toUpperCase()}</span>
                    </td>
                    <td>{n.template}</td>
                    <td style={{ fontSize: 12.5, maxWidth: 320 }}>
                      {(n.subject || n.body).slice(0, 75)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

