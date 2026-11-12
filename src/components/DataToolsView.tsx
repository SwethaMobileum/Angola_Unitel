import { exportApplicationsCsv } from '../lib/dataService';
import type { ApplicationRecord, AuditLogEntry, CustomerProfile } from '../scoring';

interface DataToolsViewProps {
  profiles: CustomerProfile[];
  applications: ApplicationRecord[];
  auditLogs: AuditLogEntry[];
  storageMode: 'supabase' | 'local_mock';
  onLoadSampleData: () => void;
  onClearAllData: () => void;
  onToast: (msg: string) => void;
}

export function DataToolsView({
  profiles,
  applications,
  auditLogs,
  storageMode,
  onLoadSampleData,
  onClearAllData,
  onToast,
}: DataToolsViewProps) {
  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAppsCsv = () => {
    const csv = exportApplicationsCsv(applications);
    downloadFile('unitel_credit_applications_demo.csv', csv, 'text/csv;charset=utf-8;');
    onToast(`Exported ${applications.length} applications to CSV.`);
  };

  const handleExportAuditCsv = () => {
    const headers = ['id', 'application_id', 'step_name', 'score_config_version', 'score', 'decision', 'decision_reason', 'role', 'timestamp'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = auditLogs.map((l) =>
      [l.id, l.application_id, l.step_name, l.score_config_version, l.score ?? '', l.decision, l.decision_reason, l.role, l.timestamp]
        .map(esc)
        .join(',')
    );
    downloadFile(
      'unitel_credit_audit_log_demo.csv',
      [headers.join(','), ...rows].join('\n'),
      'text/csv;charset=utf-8;'
    );
    onToast(`Exported ${auditLogs.length} audit log entries to CSV.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Admin Data Tools</h2>
          <p className="page-subtitle">
            Active storage: <strong>{storageMode === 'supabase' ? 'Supabase Postgres' : 'Local Mock Store (localStorage)'}</strong>
          </p>
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="kpi-label">Subscribers in Database</div>
          <div className="kpi-value">{profiles.length}</div>
          <div className="kpi-meta">Includes 5 hand-crafted demo personas</div>
        </div>
        <div className="card">
          <div className="kpi-label">Stored Applications</div>
          <div className="kpi-value">{applications.length}</div>
          <div className="kpi-meta">Persisted across page reloads</div>
        </div>
        <div className="card">
          <div className="kpi-label">Audit Log Entries</div>
          <div className="kpi-value">{auditLogs.length}</div>
          <div className="kpi-meta">Full input, score &amp; decision history</div>
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 8 }}>Load Sample Data</h3>
          <p style={{ fontSize: 13, marginTop: 0 }}>
            Restores the full 300-subscriber Angolan synthetic dataset, 5 personas, initial
            applications, notifications, and audit trail.
          </p>
          <button type="button" className="btn btn-primary" onClick={onLoadSampleData}>
            Load 300-Customer Sample Data
          </button>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 8 }}>Clear All Data</h3>
          <p style={{ fontSize: 13, marginTop: 0 }}>
            Empties all subscribers, applications, notifications, and audit logs so the portal
            starts completely blank for testing brand-new entry.
          </p>
          <button type="button" className="btn btn-outline-orange" onClick={onClearAllData}>
            Clear All Data (Start Empty)
          </button>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 8 }}>Export CSV</h3>
          <p style={{ fontSize: 13, marginTop: 0 }}>
            Download simulated applications or audit trail records as standard CSV files for
            offline review.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={handleExportAppsCsv}>
              Export Applications CSV
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleExportAuditCsv}>
              Export Audit Log CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
