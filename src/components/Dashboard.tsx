import { useMemo } from 'react';
import { evaluateCreditScore, formatAoa } from '../scoring';
import type {
  ApplicationRecord,
  ConfidenceLevel,
  CustomerProfile,
  Role,
  ScoreBandName,
  ScoringConfig,
} from '../scoring';
import { BandBadge, ConfidenceBadge, StatusBadge, VolumeTierBadge } from './Badges';

interface DashboardProps {
  profiles: CustomerProfile[];
  applications: ApplicationRecord[];
  config: ScoringConfig;
  role: Role;
  onStartNewApplication: (customerId?: string) => void;
  onInspectCustomer: (customerId: string) => void;
  onOpenApplication: (appId: string) => void;
  onOpenQueue: () => void;
}

export function Dashboard({
  profiles,
  applications,
  config,
  role,
  onStartNewApplication,
  onInspectCustomer,
  onOpenApplication,
  onOpenQueue,
}: DashboardProps) {
  const portfolioStats = useMemo(() => {
    const bandCounts: Record<ScoreBandName, number> = {
      Excellent: 0,
      Good: 0,
      Fair: 0,
      Poor: 0,
    };
    const confCounts: Record<ConfidenceLevel, number> = {
      High: 0,
      Medium: 0,
      Low: 0,
    };
    let lowVolumeSubscribers = 0;
    let highVolumeSubscribers = 0;
    let thinOrMissingWallets = 0;
    let scoreSum = 0;

    for (const p of profiles) {
      const exp = evaluateCreditScore(p, config);
      bandCounts[exp.band] += 1;
      confCounts[exp.confidence] += 1;
      scoreSum += exp.score;
      if (exp.sourceStatuses.mobileMoney !== 'found') {
        thinOrMissingWallets += 1;
      }
      if ((p.customer.volume_tier ?? 'low') === 'high') {
        highVolumeSubscribers += 1;
      } else {
        lowVolumeSubscribers += 1;
      }
    }

    const avgScore = profiles.length > 0 ? Math.round(scoreSum / profiles.length) : 0;
    return {
      bandCounts,
      confCounts,
      lowVolumeSubscribers,
      highVolumeSubscribers,
      thinOrMissingWallets,
      avgScore,
    };
  }, [profiles, config]);

  const appCounts = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    let lowVol = 0;
    let highVol = 0;
    for (const app of applications) {
      if (app.status === 'approved') approved += 1;
      else if (app.status === 'rejected') rejected += 1;
      else pending += 1;
      if (app.volume_tier === 'high') highVol += 1;
      else lowVol += 1;
    }
    return { approved, pending, rejected, lowVol, highVol, total: applications.length };
  }, [applications]);

  const bandsOrder: Array<{ name: ScoreBandName; range: string; color: string }> = [
    { name: 'Poor', range: '300–550', color: 'var(--slate-300)' },
    { name: 'Fair', range: '551–699', color: 'var(--slate-400)' },
    { name: 'Good', range: '700–799', color: 'var(--slate-500)' },
    { name: 'Excellent', range: '800–900', color: 'var(--slate-600)' },
  ];

  const confOrder: Array<{ name: ConfidenceLevel; desc: string; color: string }> = [
    { name: 'Low', desc: '1 meaningful source (thin file)', color: 'var(--slate-300)' },
    { name: 'Medium', desc: '2 meaningful sources (partial thin file)', color: 'var(--slate-500)' },
    { name: 'High', desc: '3–4 meaningful sources', color: 'var(--slate-600)' },
  ];

  const maxBandCount = Math.max(1, ...Object.values(portfolioStats.bandCounts));
  const maxConfCount = Math.max(1, ...Object.values(portfolioStats.confCounts));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            {role === 'analyst'
              ? 'Analyst Credit Workspace'
              : role === 'approver'
                ? 'Approver Portfolio Overview'
                : 'Admin Governance Dashboard'}
          </h2>
          <p className="page-subtitle">
            {profiles.length} subscribers evaluated with Config v{config.version} (Telecom weight:{' '}
            {config.weights.telecom}%)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {role === 'approver' && (
            <button type="button" className="btn btn-primary" onClick={onOpenQueue}>
              Go to Approval Queue ({appCounts.pending}) →
            </button>
          )}
          {(role === 'analyst' || role === 'admin') && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onStartNewApplication()}
            >
              + New Application
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4">
        <div className="card">
          <div className="kpi-label">Pending Approver Review</div>
          <div className="kpi-value">{appCounts.pending}</div>
          <div className="kpi-meta">
            Approved: {appCounts.approved} • Rejected: {appCounts.rejected}
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">Applications by Volume</div>
          <div className="kpi-value">
            {appCounts.lowVol} / {appCounts.highVol}
          </div>
          <div className="kpi-meta">
            Low Volume (Basic) vs High Volume (KYC)
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">Portfolio Avg Proxy Score</div>
          <div className="kpi-value">{portfolioStats.avgScore}</div>
          <div className="kpi-meta">
            {profiles.length > 0
              ? `${portfolioStats.thinOrMissingWallets}/${profiles.length} thin/no-wallet subscribers`
              : 'No subscribers loaded'}
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">Subscribers by Volume Tier</div>
          <div className="kpi-value">
            {portfolioStats.lowVolumeSubscribers} / {portfolioStats.highVolumeSubscribers}
          </div>
          <div className="kpi-meta">Basic (Low) vs KYC (High) in database</div>
        </div>
      </div>

      {/* Score Band Distribution + Confidence (Thin-File) Chart */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Proxy Score Distribution ({profiles.length} Subscribers)</h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Neutral slate ramp; updates immediately when Admin updates weights or rules.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {bandsOrder.map((b) => {
              const count = portfolioStats.bandCounts[b.name];
              const pct = profiles.length > 0 ? Math.round((count / profiles.length) * 100) : 0;
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
                      <span style={{ fontSize: 12 }}>({b.range})</span>
                    </div>
                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {count} ({pct}%)
                    </strong>
                  </div>
                  <div className="bar-track" style={{ height: 15 }}>
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
            <div>
              <h3 className="card-title">Data Confidence &amp; Thin-File Breakdown</h3>
              <div style={{ fontSize: 12 }}>
                Shows how many subscribers rely mainly on telecom signals due to thin/basic wallets.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {confOrder.map((c) => {
              const count = portfolioStats.confCounts[c.name];
              const pct = profiles.length > 0 ? Math.round((count / profiles.length) * 100) : 0;
              const barWidth = Math.round((count / maxConfCount) * 100);
              return (
                <div key={c.name}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 5,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ConfidenceBadge confidence={c.name} />
                      <span style={{ fontSize: 12 }}>{c.desc}</span>
                    </div>
                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {count} ({pct}%)
                    </strong>
                  </div>
                  <div className="bar-track" style={{ height: 15 }}>
                    <div
                      className="bar-fill"
                      style={{ width: `${barWidth}%`, backgroundColor: c.color }}
                    />
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
          <h3 className="card-title">Recent Equipment EMI Applications</h3>
        </div>
        {applications.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center' }}>
            No applications yet. Create a new application or load sample data from Admin &gt; Data Tools.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>App ID</th>
                  <th>Customer</th>
                  <th>Volume</th>
                  <th>Equipment &amp; EMI</th>
                  <th>Proxy Score (Demo)</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.slice(0, 8).map((app) => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: 700 }}>{app.id}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{app.customer_name}</div>
                      <div style={{ fontSize: 12 }}>{app.mobile_no}</div>
                    </td>
                    <td>
                      <VolumeTierBadge tier={app.volume_tier} />
                    </td>
                    <td>
                      <div>{app.product}</div>
                      <div style={{ fontSize: 12 }}>
                        {formatAoa(app.product_price_aoa)} • {app.emi_term_months}m (
                        {formatAoa(app.monthly_emi_aoa)}/mo)
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <strong>{app.score}</strong>
                        <BandBadge band={app.band} />
                        <ConfidenceBadge confidence={app.confidence} />
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={app.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenApplication(app.id)}
                        >
                          Detail
                        </button>
                        {role !== 'approver' && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => onInspectCustomer(app.customer_id)}
                          >
                            360°
                          </button>
                        )}
                      </div>
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
