import { useMemo } from 'react';
import {
  evaluateCreditScore,
  formatAoa,
} from '../scoring';
import type {
  ApplicationRecord,
  CustomerProfile,
  ScoreBandName,
  ScoringConfig,
} from '../scoring';
import { BandBadge, ConfidenceBadge, DecisionBadge } from './Badges';

interface DashboardProps {
  profiles: CustomerProfile[];
  applications: ApplicationRecord[];
  config: ScoringConfig;
  onStartNewApplication: (customerId?: string) => void;
  onInspectCustomer: (customerId: string) => void;
  onOpenQueue: () => void;
}

export function Dashboard({
  profiles,
  applications,
  config,
  onStartNewApplication,
  onInspectCustomer,
  onOpenQueue,
}: DashboardProps) {
  const portfolioStats = useMemo(() => {
    const bandCounts: Record<ScoreBandName, number> = {
      Excellent: 0,
      Good: 0,
      Fair: 0,
      Poor: 0,
    };
    let thinOrMissingWallets = 0;
    let scoreSum = 0;

    for (const p of profiles) {
      const exp = evaluateCreditScore(p, config);
      bandCounts[exp.band] += 1;
      scoreSum += exp.score;
      if (exp.sourceStatuses.mobileMoney !== 'found') {
        thinOrMissingWallets += 1;
      }
    }

    const avgScore = profiles.length > 0 ? Math.round(scoreSum / profiles.length) : 0;
    return { bandCounts, thinOrMissingWallets, avgScore };
  }, [profiles, config]);

  const decisionCounts = useMemo(() => {
    let approved = 0;
    let review = 0;
    let declined = 0;
    for (const app of applications) {
      if (app.decision === 'auto_approve') approved += 1;
      else if (app.decision === 'manual_review') review += 1;
      else declined += 1;
    }
    return { approved, review, declined, total: applications.length };
  }, [applications]);

  const bandsOrder: Array<{ name: ScoreBandName; range: string; color: string }> = [
    { name: 'Poor', range: '300–550', color: 'var(--orange-300)' },
    { name: 'Fair', range: '551–699', color: 'var(--orange-400)' },
    { name: 'Good', range: '700–799', color: 'var(--orange-500)' },
    { name: 'Excellent', range: '800–900', color: 'var(--orange-700)' },
  ];

  const maxBandCount = Math.max(1, ...Object.values(portfolioStats.bandCounts));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Credit Portfolio Dashboard</h2>
          <p className="page-subtitle">
            {profiles.length} simulated Angolan subscribers evaluated with Config v{config.version}{' '}
            (Telecom weight: {config.weights.telecom}%)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={onOpenQueue}>
            Approvals Queue ({decisionCounts.review})
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onStartNewApplication('cust-001')}
          >
            + New Application (Demo)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4">
        <div className="card">
          <div className="kpi-label">Approved Applications</div>
          <div className="kpi-value">{decisionCounts.approved}</div>
          <div className="kpi-meta">
            of {decisionCounts.total} processed applications
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">Manual Review Queue</div>
          <div className="kpi-value">{decisionCounts.review}</div>
          <div className="kpi-meta">Fair band, low confidence, or minor limit gap</div>
        </div>
        <div className="card">
          <div className="kpi-label">Declined Applications</div>
          <div className="kpi-value">{decisionCounts.declined}</div>
          <div className="kpi-meta">Poor band, unpaid loan cap, or &gt;25% limit gap</div>
        </div>
        <div className="card">
          <div className="kpi-label">Portfolio Avg Proxy Score</div>
          <div className="kpi-value">{portfolioStats.avgScore}</div>
          <div className="kpi-meta">
            {portfolioStats.thinOrMissingWallets}/{profiles.length} thin/no-wallet files
          </div>
        </div>
      </div>

      {/* Distribution Chart + Key Personas */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Proxy Score Distribution (300 Subscribers)</h3>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Single orange ramp from Poor to Excellent; updates live when Admin edits weights.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {bandsOrder.map((b) => {
              const count = portfolioStats.bandCounts[b.name];
              const pct = Math.round((count / profiles.length) * 100);
              const barWidth = Math.round((count / maxBandCount) * 100);
              return (
                <div key={b.name}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 5,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BandBadge band={b.name} />
                      <span style={{ fontSize: 12, opacity: 0.85 }}>({b.range})</span>
                    </div>
                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {count} customers ({pct}%)
                    </strong>
                  </div>
                  <div className="bar-track" style={{ height: 16 }}>
                    <div
                      className="bar-fill"
                      style={{ width: `${barWidth}%`, backgroundColor: b.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Demo Personas Quick Launch</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {profiles.slice(0, 5).map((p) => {
              const exp = evaluateCreditScore(p, config);
              return (
                <div
                  key={p.customer.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 8,
                    background: 'var(--orange-50)',
                    border: '1px solid var(--orange-200)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.customer.full_name}</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      {p.customer.mobile_no} • {p.customer.city}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{exp.score}</strong>
                    <BandBadge band={exp.band} />
                    <ConfidenceBadge confidence={exp.confidence} />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => onInspectCustomer(p.customer.id)}
                    >
                      360°
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onStartNewApplication(p.customer.id)}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Equipment Credit Applications</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>App ID</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Price</th>
                <th>Proxy Score (Demo)</th>
                <th>Assigned Limit</th>
                <th>Decision</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.slice(0, 12).map((app) => (
                <tr key={app.id}>
                  <td style={{ fontWeight: 700 }}>{app.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{app.customer_name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{app.mobile_no}</div>
                  </td>
                  <td>{app.product}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatAoa(app.product_price_aoa)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{app.score}</strong>
                      <BandBadge band={app.band} />
                      <ConfidenceBadge confidence={app.confidence} />
                    </div>
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {formatAoa(app.credit_limit_aoa)}
                  </td>
                  <td>
                    <DecisionBadge decision={app.decision} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onInspectCustomer(app.customer_id)}
                    >
                      Customer 360
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

