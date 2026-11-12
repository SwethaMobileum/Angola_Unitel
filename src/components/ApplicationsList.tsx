import { useMemo, useState } from 'react';
import { formatAoa } from '../scoring';
import type {
  ApplicationRecord,
  ApplicationStatus,
  ConfidenceLevel,
  Role,
  ScoreBandName,
  VolumeTier,
} from '../scoring';
import { BandBadge, ConfidenceBadge, StatusBadge, SuggestedDecisionBadge, VolumeTierBadge } from './Badges';

interface ApplicationsListProps {
  title: string;
  subtitle: string;
  applications: ApplicationRecord[];
  role: Role;
  onOpenDetail: (appId: string) => void;
  onStartNew?: () => void;
}

export function ApplicationsList({
  title,
  subtitle,
  applications,
  role,
  onOpenDetail,
  onStartNew,
}: ApplicationsListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [bandFilter, setBandFilter] = useState<'all' | ScoreBandName>('all');
  const [confFilter, setConfFilter] = useState<'all' | ConfidenceLevel>('all');
  const [tierFilter, setTierFilter] = useState<'all' | VolumeTier>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'score_desc' | 'score_asc' | 'price_desc'>('newest');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const list = applications.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (bandFilter !== 'all' && a.band !== bandFilter) return false;
      if (confFilter !== 'all' && a.confidence !== confFilter) return false;
      if (tierFilter !== 'all' && a.volume_tier !== tierFilter) return false;
      if (dateFilter !== 'all') {
        const ageHours = (now - Date.parse(a.created_at)) / 3600_000;
        if (dateFilter === 'today' && ageHours > 24) return false;
        if (dateFilter === '7d' && ageHours > 24 * 7) return false;
      }
      if (!q) return true;
      return (
        a.id.toLowerCase().includes(q) ||
        a.customer_name.toLowerCase().includes(q) ||
        a.mobile_no.toLowerCase().includes(q) ||
        a.product.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'oldest') return Date.parse(a.created_at) - Date.parse(b.created_at);
      if (sortBy === 'score_desc') return b.score - a.score;
      if (sortBy === 'score_asc') return a.score - b.score;
      if (sortBy === 'price_desc') return b.product_price_aoa - a.product_price_aoa;
      return Date.parse(b.created_at) - Date.parse(a.created_at);
    });
  }, [applications, search, statusFilter, bandFilter, confFilter, tierFilter, dateFilter, sortBy]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">{title}</h2>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        {(role === 'analyst' || role === 'admin') && onStartNew && (
          <button type="button" className="btn btn-primary" onClick={onStartNew}>
            + New Application
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 10,
          }}
        >
          <div>
            <label className="field-label">Search</label>
            <input
              type="text"
              className="input"
              placeholder="Name, App ID, +244..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Status</label>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | ApplicationStatus)}
            >
              <option value="all">All Statuses</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="more_info_requested">More Info Requested</option>
            </select>
          </div>
          <div>
            <label className="field-label">Score Band</label>
            <select
              className="select"
              value={bandFilter}
              onChange={(e) => setBandFilter(e.target.value as 'all' | ScoreBandName)}
            >
              <option value="all">All Bands</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>
          <div>
            <label className="field-label">Confidence</label>
            <select
              className="select"
              value={confFilter}
              onChange={(e) => setConfFilter(e.target.value as 'all' | ConfidenceLevel)}
            >
              <option value="all">All Confidence</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div>
            <label className="field-label">Volume Level</label>
            <select
              className="select"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as 'all' | VolumeTier)}
            >
              <option value="all">All Volumes</option>
              <option value="low">Low Volume</option>
              <option value="high">High Volume</option>
            </select>
          </div>
          <div>
            <label className="field-label">Date / Sort</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                className="select"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | '7d')}
              >
                <option value="all">Any Date</option>
                <option value="today">Last 24h</option>
                <option value="7d">Last 7d</option>
              </select>
              <select
                className="select"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as 'newest' | 'oldest' | 'score_desc' | 'score_asc' | 'price_desc'
                  )
                }
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="score_desc">Score ↓</option>
                <option value="score_asc">Score ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            No applications match the selected filters.
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
                  <th>Limit &amp; Affordability</th>
                  <th>Suggestion</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => (
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
                      <div style={{ fontWeight: 600 }}>{app.product}</div>
                      <div style={{ fontSize: 12 }}>
                        {formatAoa(app.product_price_aoa)} • {app.emi_term_months}m @{' '}
                        {formatAoa(app.monthly_emi_aoa)}/mo
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong>{app.score}</strong>
                        <BandBadge band={app.band} />
                        <ConfidenceBadge confidence={app.confidence} />
                      </div>
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      <div style={{ fontWeight: 700 }}>{formatAoa(app.credit_limit_aoa)}</div>
                      <div>{app.emi_affordable ? '✓ EMI Affordable' : '✕ EMI Exceeds Cap'}</div>
                    </td>
                    <td>
                      <SuggestedDecisionBadge decision={app.decision} />
                    </td>
                    <td>
                      <StatusBadge status={app.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onOpenDetail(app.id)}
                      >
                        Open Detail
                      </button>
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

