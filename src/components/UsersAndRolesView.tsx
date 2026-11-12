import type { Role } from '../scoring';

interface UsersAndRolesViewProps {
  currentRole: Role;
  onSwitchRole: (role: Role) => void;
}

const DEMO_USERS: Array<{
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  permissions: string;
}> = [
  {
    id: 'usr-01',
    name: 'Beatriz Domingos',
    email: 'beatriz.domingos@demo.credit-intelligence.ao',
    role: 'analyst',
    department: 'Retail Credit Origination',
    permissions: 'Create/edit drafts, submit applications, view scores & What-If simulator',
  },
  {
    id: 'usr-02',
    name: 'Carlos Tavares',
    email: 'carlos.tavares@demo.credit-intelligence.ao',
    role: 'approver',
    department: 'Credit Underwriting Committee',
    permissions: 'Review queue, Approve / Reject / Request More Info with mandatory reason',
  },
  {
    id: 'usr-03',
    name: 'Sofia Nzinga',
    email: 'sofia.nzinga@demo.credit-intelligence.ao',
    role: 'admin',
    department: 'Risk Governance & Operations',
    permissions: 'Edit scoring rules, catalog, EMI plans, templates, audit log & data tools',
  },
];

export function UsersAndRolesView({ currentRole, onSwitchRole }: UsersAndRolesViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Users &amp; Roles (Demo Directory)</h2>
          <p className="page-subtitle">
            Simulated portal personas. Use the role buttons below or the header segmented control
            to switch active permissions.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Department</th>
                <th>Capabilities</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_USERS.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{u.name}</div>
                    <div style={{ fontSize: 12 }}>{u.email}</div>
                  </td>
                  <td>
                    <span className="badge band-good">{u.role.toUpperCase()}</span>
                  </td>
                  <td>{u.department}</td>
                  <td style={{ fontSize: 12.5 }}>{u.permissions}</td>
                  <td>
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        currentRole === u.role ? 'btn-primary' : 'btn-secondary'
                      }`}
                      onClick={() => onSwitchRole(u.role)}
                    >
                      {currentRole === u.role ? '✓ Active Role' : `Switch to ${u.role}`}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
