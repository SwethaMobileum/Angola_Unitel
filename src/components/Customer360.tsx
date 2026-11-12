import { useMemo, useState } from 'react';
import {
  UNITEL_MONEY_TIERS,
  evaluateCreditScore,
  formatAoa,
  mapBand,
  monthsBetween,
} from '../scoring';
import type {
  CustomerProfile,
  ScoreHistoryEntry,
  ScoringConfig,
} from '../scoring';
import { BandBadge, ConfidenceBadge, SourceStatusBadge } from './Badges';
import { ScoreExplanationView } from './ScoreExplanationView';
import { WhatIfPanel } from './WhatIfPanel';

interface Customer360Props {
  profiles: CustomerProfile[];
  config: ScoringConfig;
  selectedCustomerId: string;
  onSelectCustomer: (id: string) => void;
  onStartApplication: (id: string) => void;
}

export function Customer360({
  profiles,
  config,
  selectedCustomerId,
  onSelectCustomer,
  onStartApplication,
}: Customer360Props) {
  const [search, setSearch] = useState('');
  const [subView, setSubView] = useState<'sources' | 'explanation' | 'whatif'>('sources');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles.slice(0, 40);
    return profiles
      .filter(
        (p) =>
          p.customer.full_name.toLowerCase().includes(q) ||
          p.customer.mobile_no.toLowerCase().includes(q) ||
          p.customer.bi_number.toLowerCase().includes(q) ||
          p.customer.city.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [profiles, search]);

  const profile = useMemo(
    () => profiles.find((p) => p.customer.id === selectedCustomerId) ?? profiles[0] ?? null,
    [profiles, selectedCustomerId]
  );

  const explanation = useMemo(
    () => (profile ? evaluateCreditScore(profile, config) : null),
    [profile, config]
  );

  // Deterministic 6-month proxy score history
  const scoreHistory: ScoreHistoryEntry[] = useMemo(() => {
    if (!profile || !explanation) return [];
    const months = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
    const tenure = profile.telecom ? monthsBetween(profile.telecom.sim_activation_date) : 6;
    return months.map((m, idx) => {
      const offset = (5 - idx) * (tenure > 24 ? -4 : -8);
      const s = Math.max(300, Math.min(900, explanation.score + offset));
      return {
        date: m,
        score: s,
        band: mapBand(s, config),
        confidence: explanation.confidence,
        note: idx === 5 ? 'Current evaluation' : 'Monthly batch snapshot (simulated)',
      };
    });
  }, [profile, explanation, config]);

  if (!profile || !explanation) {
    return (
      <div className="card" style={{ padding: 28, textAlign: 'center' }}>
        <h3 className="card-title">No Customers in Database</h3>
        <p>Create a new application or load sample data from Admin &gt; Data Tools.</p>
      </div>
    );
  }

  const mmTier = profile.mobileMoney?.wallet_exists
    ? UNITEL_MONEY_TIERS[profile.mobileMoney.registration_level]
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Customer 360° &amp; Score Explanation</h2>
          <p className="page-subtitle">
            Inspect all four proxy data sources side-by-side, score history, and parameter breakdowns.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onStartApplication(profile.customer.id)}
        >
          Start Application for {profile.customer.full_name} →
        </button>
      </div>

      {/* Selector Bar */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <input
            type="text"
            className="input"
            style={{ maxWidth: 300 }}
            placeholder="Search 300 customers (name, +244, BI, city)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {profiles.slice(0, 5).map((p) => (
              <button
                key={p.customer.id}
                type="button"
                className={`btn btn-sm ${
                  p.customer.id === profile.customer.id ? 'btn-primary' : 'btn-secondary'
                }`}
                onClick={() => onSelectCustomer(p.customer.id)}
              >
                {p.customer.full_name}
              </button>
            ))}
          </div>
        </div>

        <select
          className="select"
          value={profile.customer.id}
          onChange={(e) => onSelectCustomer(e.target.value)}
        >
          {filtered.map((p) => (
            <option key={p.customer.id} value={p.customer.id}>
              {p.customer.full_name} — {p.customer.mobile_no} — {p.customer.city} (BI:{' '}
              {p.customer.bi_number})
            </option>
          ))}
        </select>
      </div>

      {/* Customer Summary Header + Sub-tabs */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-700)' }}>
              {profile.customer.full_name}
            </h3>
            <div style={{ fontSize: 13, marginTop: 2 }}>
              Mobile: <strong>{profile.customer.mobile_no}</strong> • BI / NIF:{' '}
              <strong>{profile.customer.bi_number}</strong> • City:{' '}
              <strong>{profile.customer.city}</strong> • DOB: {profile.customer.date_of_birth}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                Proxy credit score (demo)
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>
                {explanation.score}
              </div>
            </div>
            <BandBadge band={explanation.band} />
            <ConfidenceBadge confidence={explanation.confidence} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${subView === 'sources' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubView('sources')}
          >
            4 Data Sources &amp; Score History
          </button>
          <button
            type="button"
            className={`btn btn-sm ${subView === 'explanation' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubView('explanation')}
          >
            Score Explanation Breakdown
          </button>
          <button
            type="button"
            className={`btn btn-sm ${subView === 'whatif' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubView('whatif')}
          >
            What-If Simulator
          </button>
        </div>
      </div>

      {subView === 'sources' && (
        <>
          <div className="grid-4">
            {/* Source 1: Telecom */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: 10 }}>
                <strong style={{ color: 'var(--brand-700)' }}>Telecom Behavior</strong>
                <SourceStatusBadge status={explanation.sourceStatuses.telecom} />
              </div>
              {profile.telecom ? (
                <div style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div>
                    SIM Activated: <strong>{profile.telecom.sim_activation_date}</strong> (
                    {monthsBetween(profile.telecom.sim_activation_date)} mo)
                  </div>
                  <div>
                    Avg Monthly Top-up:{' '}
                    <strong>{formatAoa(profile.telecom.avg_monthly_topup_aoa)}</strong>
                  </div>
                  <div>
                    Active Top-up Months (12m):{' '}
                    <strong>{profile.telecom.topup_months_last_12} / 12</strong>
                  </div>
                  <div>
                    Avg Spend: <strong>{formatAoa(profile.telecom.avg_monthly_spend_aoa)}</strong>{' '}
                    (CV {profile.telecom.spend_variability.toFixed(2)})
                  </div>
                  <div>
                    Airtime Loans: <strong>{profile.telecom.airtime_loans_taken}</strong> taken,{' '}
                    <strong>{profile.telecom.airtime_loans_repaid_on_time}</strong> on-time,{' '}
                    <strong>{profile.telecom.airtime_loans_unpaid}</strong> unpaid
                  </div>
                  <div>
                    SIM Registered with BI:{' '}
                    <strong>{profile.telecom.sim_registered_with_bi ? 'Yes' : 'No'}</strong>
                  </div>
                </div>
              ) : (
                <div>No telecom data.</div>
              )}
            </div>

            {/* Source 2: Identity */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: 10 }}>
                <strong style={{ color: 'var(--brand-700)' }}>Identity &amp; KYC</strong>
                <SourceStatusBadge status={explanation.sourceStatuses.identity} />
              </div>
              {profile.identity ? (
                <div style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div>
                    BI Number: <strong>{profile.identity.bi_number}</strong>
                  </div>
                  <div>
                    BI Verified:{' '}
                    <strong>{profile.identity.id_verified ? 'Verified' : 'Not Verified'}</strong>
                  </div>
                  <div>
                    Issue Date / Place:{' '}
                    <strong>
                      {profile.identity.id_issue_date ?? 'N/A'} /{' '}
                      {profile.identity.id_issue_place ?? 'N/A'}
                    </strong>
                  </div>
                  <div>
                    Address: <strong>{profile.identity.address}</strong>
                  </div>
                  <div>
                    Address Verified:{' '}
                    <strong>{profile.identity.address_verified ? 'Yes' : 'No'}</strong>
                  </div>
                </div>
              ) : (
                <div>No identity record.</div>
              )}
            </div>

            {/* Source 3: Mobile Money */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: 10 }}>
                <strong style={{ color: 'var(--brand-700)' }}>Unitel Money</strong>
                <SourceStatusBadge status={explanation.sourceStatuses.mobileMoney} />
              </div>
              {profile.mobileMoney?.wallet_exists ? (
                <div style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div>
                    Tier: <strong>{mmTier?.label}</strong>
                  </div>
                  <div>
                    Tier Limits: daily up to{' '}
                    <strong>{formatAoa(mmTier?.dailyLimitAoa ?? 0)}</strong>, balance up to{' '}
                    <strong>{formatAoa(mmTier?.maxBalanceAoa ?? 0)}</strong>
                  </div>
                  <div>
                    Monthly Inflow:{' '}
                    <strong>{formatAoa(profile.mobileMoney.monthly_inflow_aoa)}</strong>
                  </div>
                  <div>
                    Monthly Outflow:{' '}
                    <strong>{formatAoa(profile.mobileMoney.monthly_outflow_aoa)}</strong>
                  </div>
                  <div>
                    Avg Balance: <strong>{formatAoa(profile.mobileMoney.avg_balance_aoa)}</strong>
                  </div>
                  <div>
                    90d Txns: <strong>{profile.mobileMoney.txn_count_90d}</strong> (failed:{' '}
                    {profile.mobileMoney.failed_txn_count_90d})
                  </div>
                  <div>
                    Bank Account:{' '}
                    <strong>
                      {profile.has_bank_account ? 'Yes' : 'No (Neutral — no penalty)'}
                    </strong>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5 }}>
                  No Unitel Money wallet registered. Treated as thin file without score penalty.
                  Bank account:{' '}
                  <strong>
                    {profile.has_bank_account ? 'Yes' : 'No (Neutral — no penalty)'}
                  </strong>
                  .
                </div>
              )}
            </div>

            {/* Source 4: Tax */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: 10 }}>
                <strong style={{ color: 'var(--brand-700)' }}>Tax Standing (AGT)</strong>
                <SourceStatusBadge status={explanation.sourceStatuses.tax} />
              </div>
              {profile.tax ? (
                <div style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div>
                    NIF: <strong>{profile.tax.nif}</strong>
                  </div>
                  <div>
                    NIF Status: <strong>{profile.tax.nif_status.toUpperCase()}</strong>
                  </div>
                  <div>
                    Filing Status: <strong>{profile.tax.tax_filing_status.toUpperCase()}</strong>
                  </div>
                  <div style={{ opacity: 0.85, marginTop: 4 }}>
                    Note: Tax "none" is treated neutrally (half credit) because many Angolan
                    subscribers have never filed.
                  </div>
                </div>
              ) : (
                <div>No tax record.</div>
              )}
            </div>
          </div>

          {/* Score History */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Proxy Credit Score History (6-Month Simulated Trend)</h3>
            </div>
            <div className="grid-3" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
              {scoreHistory.map((h) => {
                const heightPct = Math.max(15, Math.round(((h.score - 300) / 600) * 100));
                return (
                  <div
                    key={h.date}
                    className="card-tinted"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: 10,
                    }}
                  >
                    <strong style={{ fontSize: 16 }}>{h.score}</strong>
                    <div
                      style={{
                        width: 28,
                        height: 76,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'flex-end',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: `${heightPct}%`,
                          background:
                            h.band === 'Excellent'
                              ? 'var(--slate-600)'
                              : h.band === 'Good'
                                ? 'var(--slate-500)'
                                : h.band === 'Fair'
                                  ? 'var(--slate-400)'
                                  : 'var(--slate-300)',
                        }}
                      />
                    </div>
                    <BandBadge band={h.band} />
                    <span style={{ fontSize: 11 }}>{h.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {subView === 'explanation' && (
        <ScoreExplanationView profile={profile} explanation={explanation} />
      )}

      {subView === 'whatif' && (
        <WhatIfPanel
          profile={profile}
          config={config}
          productName="Smartphone 5G (128GB)"
          productPriceAoa={280_000}
        />
      )}
    </div>
  );
}

