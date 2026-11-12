import { useMemo, useState } from 'react';
import type { AuditLogEntry, Role } from '../scoring';

interface AuditLogViewProps {
  auditLogs: AuditLogEntry[];
}

export function AuditLogView({ auditLogs }: AuditLogViewProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditLogs.filter((entry) => {
      if (roleFilter !== 'all' && entry.role !== roleFilter) return false;
      if (!q) return true;
      return (
        entry.application_id.toLowerCase().includes(q) ||
        entry.step_name.toLowerCase().includes(q) ||
        entry.decision.toLowerCase().includes(q) ||
        entry.decision_reason.toLowerCase().includes(q) ||
        JSON.stringify(entry.inputs_snapshot).toLowerCase().includes(q)
      );
    });
  }, [auditLogs, search, roleFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Audit Log</h2>
          <p className="page-subtitle">
            Immutable trail of every application step, inputs snapshot, scoring config version,
            decision, role, and timestamp.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="input"
            style={{ maxWidth: 320 }}
            placeholder="Filter by App ID, step, decision, input..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {(['all', 'analyst', 'approver', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setRoleFilter(r)}
            >
              {r === 'all' ? `All (${auditLogs.length})` : r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center' }}>No audit entries recorded.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>App ID</th>
                  <th>Step</th>
                  <th>Role</th>
                  <th>Config</th>
                  <th>Score</th>
                  <th>Decision &amp; Reason</th>
                  <th>Inputs Snapshot</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 700 }}>{log.application_id}</td>
                    <td style={{ fontWeight: 600 }}>{log.step_name}</td>
                    <td>
                      <span className="badge band-fair">{log.role.toUpperCase()}</span>
                    </td>
                    <td>v{log.score_config_version}</td>
                    <td style={{ fontWeight: 700 }}>{log.score ?? '—'}</td>
                    <td style={{ maxWidth: 280, fontSize: 12.5 }}>
                      <strong>{log.decision}:</strong> {log.decision_reason}
                    </td>
                    <td style={{ maxWidth: 260, fontSize: 11.5 }}>
                      <code>{JSON.stringify(log.inputs_snapshot)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
