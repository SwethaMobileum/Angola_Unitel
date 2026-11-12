import type { Role } from '../scoring';

interface ChooseRoleScreenProps {
  onSelectRole: (role: Role) => void;
}

const ROLE_CARDS: Array<{
  role: Role;
  title: string;
  subtitle: string;
  landing: string;
  permissions: string[];
}> = [
  {
    role: 'analyst',
    title: 'Credit Analyst',
    subtitle: 'Intake, data verification, proxy scoring & simulation',
    landing: 'Lands on Analyst Dashboard',
    permissions: [
      'Create & edit 6-step equipment EMI applications (Low or High volume)',
      'Auto-save drafts, lookup subscribers or enter brand-new customers',
      'Inspect score breakdowns & run What-If simulations',
      'Cannot approve loans or edit scoring configuration',
    ],
  },
  {
    role: 'approver',
    title: 'Credit Approver',
    subtitle: 'Final underwriting review & decision authority',
    landing: 'Lands on Approval Queue',
    permissions: [
      'Review pending applications with full data, EMI plan & score reasons',
      'Approve, Reject, or Request More Info with mandatory audit reason',
      'Override automated policy suggestions with reason logging',
      'Read-only access to All Applications & Notifications log',
    ],
  },
  {
    role: 'admin',
    title: 'Portal Admin',
    subtitle: 'Scoring governance, catalog, EMI plans, templates & data tools',
    landing: 'Lands on Admin Dashboard',
    permissions: [
      'Configure category weights, range tables, bands & credit limit matrix',
      'Manage equipment catalog, price ceilings per tier & EMI plans',
      'Edit SMS/Email notification templates & inspect full Audit Log',
      'Data Tools: load sample data, clear all data, export CSV',
    ],
  },
];

export function ChooseRoleScreen({ onSelectRole }: ChooseRoleScreenProps) {
  return (
    <div className="role-picker-shell">
      <header className="top-header">
        <div className="brand-block">
          <div className="brand-mark">CI</div>
          <div>
            <div className="brand-title">Credit Intelligence</div>
            <div className="brand-subtitle">
              Proxy Credit Rating, Limit &amp; Approval Portal — Angola Demo
            </div>
          </div>
        </div>
        <span className="viewing-badge">Demo / Simulated Data</span>
      </header>

      <div className="role-picker-center">
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--brand-700)' }}>
            Choose your role
          </h1>
          <p style={{ fontSize: 15, marginTop: 6, color: 'var(--text-muted)' }}>
            Select a persona to enter Credit Intelligence. You can switch roles anytime from the top
            navigation bar.
          </p>
        </div>

        <div className="grid-3">
          {ROLE_CARDS.map((card) => (
            <div key={card.role} className="role-card">
              <div>
                <span className="badge band-fair" style={{ marginBottom: 8 }}>
                  {card.landing}
                </span>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>{card.title}</h2>
                <div style={{ fontSize: 13, marginTop: 3 }}>{card.subtitle}</div>
              </div>

              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: 12.5,
                  flex: 1,
                }}
              >
                {card.permissions.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onSelectRole(card.role)}
              >
                Continue as {card.title.split(' ').pop()} →
              </button>
            </div>
          ))}
        </div>
      </div>

      <footer className="site-footer">
        <span>
          <strong>Credit Intelligence (Demo / simulated data)</strong> — All subscriber profiles,
          proxy credit scores, credit limits, SMS, and emails are simulated.
        </span>
        <span>Not a regulated bureau score.</span>
      </footer>
    </div>
  );
}

