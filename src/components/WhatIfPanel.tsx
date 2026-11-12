import { useMemo, useRef, useState } from 'react';
import {
  UNITEL_MONEY_TIERS,
  buildNotificationDrafts,
  evaluateCreditScore,
  evaluateLimitAndDecision,
  formatAoa,
  monthsBetween,
} from '../scoring';
import type {
  ApplicationRecord,
  CustomerProfile,
  NotificationRecord,
  ScoringConfig,
} from '../scoring';
import { BandBadge, ConfidenceBadge, DecisionBadge, SourceStatusBadge } from './Badges';
import { ScoreGauge } from './ScoreGauge';

interface WhatIfPanelProps {
  profile: CustomerProfile;
  config: ScoringConfig;
  productName: string;
  productPriceAoa: number;
  activeApplication?: ApplicationRecord | null;
  onSyncApplicationAndNotifications?: (
    updatedProfile: CustomerProfile,
    updatedApp: ApplicationRecord,
    newNotifications: NotificationRecord[]
  ) => void;
  onResetProfile?: () => void;
}

export function WhatIfPanel({
  profile,
  config,
  productName,
  productPriceAoa,
  activeApplication,
  onSyncApplicationAndNotifications,
  onResetProfile,
}: WhatIfPanelProps) {
  const [draft, setDraft] = useState<CustomerProfile>(() => structuredClone(profile));
  const originalRef = useRef<CustomerProfile>(structuredClone(profile));
  const [simMonths, setSimMonths] = useState<number>(() =>
    profile.telecom ? monthsBetween(profile.telecom.sim_activation_date) : 12
  );
  const [lastProfileId, setLastProfileId] = useState(profile.customer.id);

  if (profile.customer.id !== lastProfileId) {
    setLastProfileId(profile.customer.id);
    const fresh = structuredClone(profile);
    originalRef.current = structuredClone(profile);
    setDraft(fresh);
    setSimMonths(profile.telecom ? monthsBetween(profile.telecom.sim_activation_date) : 12);
  }

  const explanation = useMemo(() => evaluateCreditScore(draft, config), [draft, config]);
  const limitDecision = useMemo(
    () => evaluateLimitAndDecision(explanation, productPriceAoa, config),
    [explanation, productPriceAoa, config]
  );

  const previewApp: ApplicationRecord = useMemo(
    () => ({
      id: activeApplication?.id ?? 'WHATIF-PREVIEW',
      customer_id: draft.customer.id,
      customer_name: draft.customer.full_name,
      mobile_no: draft.customer.mobile_no,
      product: productName,
      product_price_aoa: productPriceAoa,
      status:
        limitDecision.decision === 'auto_approve'
          ? 'approved'
          : limitDecision.decision === 'manual_review'
            ? 'pending_review'
            : 'declined',
      score: explanation.score,
      band: explanation.band,
      confidence: explanation.confidence,
      credit_limit_aoa: limitDecision.creditLimitAoa,
      decision: limitDecision.decision,
      decision_reason: limitDecision.decisionReason,
      created_at: new Date().toISOString(),
    }),
    [activeApplication, draft.customer, productName, productPriceAoa, explanation, limitDecision]
  );

  const previewNotifications = useMemo(
    () => buildNotificationDrafts(previewApp, limitDecision.decision, config),
    [previewApp, limitDecision.decision, config]
  );

  const applyDraftChange = (updater: (next: CustomerProfile) => void) => {
    const next = structuredClone(draft);
    updater(next);
    setDraft(next);

    if (activeApplication && onSyncApplicationAndNotifications) {
      const nextExp = evaluateCreditScore(next, config);
      const nextDec = evaluateLimitAndDecision(nextExp, productPriceAoa, config);
      const nextApp: ApplicationRecord = {
        ...activeApplication,
        product: productName,
        product_price_aoa: productPriceAoa,
        score: nextExp.score,
        band: nextExp.band,
        confidence: nextExp.confidence,
        credit_limit_aoa: nextDec.creditLimitAoa,
        decision: nextDec.decision,
        decision_reason: nextDec.decisionReason,
        status:
          nextDec.decision === 'auto_approve'
            ? 'approved'
            : nextDec.decision === 'manual_review'
              ? 'pending_review'
              : 'declined',
      };
      const notifs = buildNotificationDrafts(nextApp, nextDec.decision, config);
      onSyncApplicationAndNotifications(next, nextApp, notifs);
    }
  };

  const handleSimMonthsChange = (months: number) => {
    setSimMonths(months);
    const base = new Date('2026-11-12T00:00:00Z');
    base.setUTCMonth(base.getUTCMonth() - months);
    const iso = base.toISOString().slice(0, 10);
    applyDraftChange((next) => {
      if (next.telecom) next.telecom.sim_activation_date = iso;
    });
  };

  const handleReset = () => {
    const orig = structuredClone(originalRef.current);
    setDraft(orig);
    setSimMonths(orig.telecom ? monthsBetween(orig.telecom.sim_activation_date) : 12);
    if (activeApplication && onSyncApplicationAndNotifications) {
      const nextExp = evaluateCreditScore(orig, config);
      const nextDec = evaluateLimitAndDecision(nextExp, productPriceAoa, config);
      const nextApp: ApplicationRecord = {
        ...activeApplication,
        product: productName,
        product_price_aoa: productPriceAoa,
        score: nextExp.score,
        band: nextExp.band,
        confidence: nextExp.confidence,
        credit_limit_aoa: nextDec.creditLimitAoa,
        decision: nextDec.decision,
        decision_reason: nextDec.decisionReason,
        status:
          nextDec.decision === 'auto_approve'
            ? 'approved'
            : nextDec.decision === 'manual_review'
              ? 'pending_review'
              : 'declined',
      };
      const notifs = buildNotificationDrafts(nextApp, nextDec.decision, config);
      onSyncApplicationAndNotifications(orig, nextApp, notifs);
    }
    onResetProfile?.();
  };

  return (
    <div className="card" style={{ borderColor: 'var(--orange-400)', borderWidth: 2 }}>
      <div className="card-header">
        <div>
          <h3 className="card-title">Live What-If Simulator — {draft.customer.full_name}</h3>
          <div style={{ fontSize: 12.5, opacity: 0.85 }}>
            Adjust telecom, KYC, Unitel Money, or tax attributes to see score, limit, decision, and
            notifications update instantaneously.
          </div>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset}>
          Reset Customer Fields
        </button>
      </div>

      <div className="grid-asymmetric">
        {/* Live Output Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card-tinted">
            <ScoreGauge
              score={explanation.score}
              uncappedScore={explanation.uncappedScore}
              band={explanation.band}
              confidence={explanation.confidence}
            />
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 700 }}>Outcome for {productName}</span>
              <DecisionBadge decision={limitDecision.decision} />
            </div>
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>
                Assigned limit: <strong>{formatAoa(limitDecision.creditLimitAoa)}</strong>
              </div>
              <div>
                Product price: <strong>{formatAoa(productPriceAoa)}</strong>
              </div>
              <div>
                {limitDecision.headroomAoa >= 0 ? 'Headroom' : 'Shortfall gap'}:{' '}
                <strong>{formatAoa(Math.abs(limitDecision.headroomAoa))}</strong>
              </div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
                {limitDecision.decisionReason}
              </div>
            </div>
          </div>

          {explanation.adjustments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {explanation.adjustments.map((adj) => (
                <div key={adj.code} className="alert-box" style={{ fontSize: 12 }}>
                  <strong>{adj.label}:</strong> {adj.impactText}
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange-700)', marginBottom: 6 }}>
              Regenerated Notification Preview ({limitDecision.decisionLabel})
            </div>
            <div style={{ fontSize: 12, background: 'var(--orange-50)', padding: 8, borderRadius: 6, marginBottom: 6 }}>
              <strong>SMS:</strong> {previewNotifications[0]?.body}
            </div>
            <div style={{ fontSize: 12, background: 'var(--orange-50)', padding: 8, borderRadius: 6 }}>
              <strong>Email Subject:</strong> {previewNotifications[1]?.subject}
            </div>
          </div>
        </div>

        {/* Interactive Controls Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid-2">
            {/* Telecom Controls */}
            <div className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <strong style={{ color: 'var(--orange-700)' }}>Telecom Behavior (45%)</strong>
                <SourceStatusBadge status={explanation.sourceStatuses.telecom} />
              </div>

              <label className="field-label">
                SIM Tenure: {simMonths} months
              </label>
              <input
                type="range"
                min={1}
                max={72}
                value={simMonths}
                onChange={(e) => handleSimMonthsChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--orange-600)', marginBottom: 10 }}
              />

              <label className="field-label">
                Top-up Months (last 12m): {draft.telecom?.topup_months_last_12 ?? 0}/12
              </label>
              <input
                type="range"
                min={0}
                max={12}
                value={draft.telecom?.topup_months_last_12 ?? 0}
                onChange={(e) =>
                  applyDraftChange((next) => {
                    if (next.telecom) next.telecom.topup_months_last_12 = Number(e.target.value);
                  })
                }
                style={{ width: '100%', accentColor: 'var(--orange-600)', marginBottom: 10 }}
              />

              <label className="field-label">
                Unpaid Airtime Loans: {draft.telecom?.airtime_loans_unpaid ?? 0}
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    applyDraftChange((next) => {
                      if (!next.telecom) return;
                      next.telecom.airtime_loans_unpaid = Math.max(
                        0,
                        next.telecom.airtime_loans_unpaid - 1
                      );
                    })
                  }
                >
                  -1 Unpaid
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() =>
                    applyDraftChange((next) => {
                      if (!next.telecom) return;
                      next.telecom.airtime_loans_unpaid += 1;
                      if (
                        next.telecom.airtime_loans_taken <
                        next.telecom.airtime_loans_unpaid + next.telecom.airtime_loans_repaid_on_time
                      ) {
                        next.telecom.airtime_loans_taken += 1;
                      }
                    })
                  }
                >
                  Mark 1 Loan Unpaid
                </button>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(draft.telecom?.sim_registered_with_bi)}
                  onChange={(e) =>
                    applyDraftChange((next) => {
                      if (next.telecom) next.telecom.sim_registered_with_bi = e.target.checked;
                    })
                  }
                />
                SIM registered with matching BI
              </label>
            </div>

            {/* Identity & Tax Controls */}
            <div className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <strong style={{ color: 'var(--orange-700)' }}>Identity (25%) &amp; Tax (10%)</strong>
                <SourceStatusBadge status={explanation.sourceStatuses.identity} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.identity?.id_verified)}
                    onChange={(e) =>
                      applyDraftChange((next) => {
                        if (next.identity) next.identity.id_verified = e.target.checked;
                      })
                    }
                  />
                  National BI Verified (unverified caps at 600)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.identity?.address_verified)}
                    onChange={(e) =>
                      applyDraftChange((next) => {
                        if (next.identity) next.identity.address_verified = e.target.checked;
                      })
                    }
                  />
                  Residential Address Verified
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label className="field-label">NIF Status</label>
                  <select
                    className="select"
                    value={draft.tax?.nif_status ?? 'none'}
                    onChange={(e) =>
                      applyDraftChange((next) => {
                        if (next.tax) next.tax.nif_status = e.target.value as 'active' | 'suspended' | 'none';
                      })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended (-5 pts)</option>
                    <option value="none">None (neutral)</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Tax Filing</label>
                  <select
                    className="select"
                    value={draft.tax?.tax_filing_status ?? 'none'}
                    onChange={(e) =>
                      applyDraftChange((next) => {
                        if (next.tax)
                          next.tax.tax_filing_status = e.target.value as 'regular' | 'irregular' | 'none';
                      })
                    }
                  >
                    <option value="regular">Regular</option>
                    <option value="irregular">Irregular</option>
                    <option value="none">None (neutral)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Unitel Money Controls */}
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <strong style={{ color: 'var(--orange-700)' }}>Mobile Money — Unitel Money (20%)</strong>
              <SourceStatusBadge status={explanation.sourceStatuses.mobileMoney} />
            </div>

            <div className="grid-3">
              <div>
                <label className="field-label">Wallet Present &amp; Tier</label>
                <select
                  className="select"
                  value={
                    !draft.mobileMoney?.wallet_exists
                      ? 'none'
                      : draft.mobileMoney.registration_level
                  }
                  onChange={(e) =>
                    applyDraftChange((next) => {
                      if (!next.mobileMoney) return;
                      if (e.target.value === 'none') {
                        next.mobileMoney.wallet_exists = false;
                        next.mobileMoney.txn_count_90d = 0;
                        next.mobileMoney.monthly_inflow_aoa = 0;
                        next.mobileMoney.avg_balance_aoa = 0;
                      } else {
                        next.mobileMoney.wallet_exists = true;
                        next.mobileMoney.registration_level = e.target.value as 'basic' | 'kyc';
                      }
                    })
                  }
                >
                  <option value="none">No Wallet</option>
                  <option value="basic">Basic Registration</option>
                  <option value="kyc">Fully Verified (KYC)</option>
                </select>
              </div>

              <div>
                <label className="field-label">
                  90-Day Txn Count: {draft.mobileMoney?.txn_count_90d ?? 0}
                </label>
                <input
                  type="range"
                  min={0}
                  max={60}
                  disabled={!draft.mobileMoney?.wallet_exists}
                  value={draft.mobileMoney?.txn_count_90d ?? 0}
                  onChange={(e) =>
                    applyDraftChange((next) => {
                      if (next.mobileMoney) next.mobileMoney.txn_count_90d = Number(e.target.value);
                    })
                  }
                  style={{ width: '100%', accentColor: 'var(--orange-600)' }}
                />
              </div>

              <div>
                <label className="field-label">
                  Monthly Inflow: {formatAoa(draft.mobileMoney?.monthly_inflow_aoa ?? 0)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={500_000}
                  step={5_000}
                  disabled={!draft.mobileMoney?.wallet_exists}
                  value={draft.mobileMoney?.monthly_inflow_aoa ?? 0}
                  onChange={(e) =>
                    applyDraftChange((next) => {
                      if (next.mobileMoney)
                        next.mobileMoney.monthly_inflow_aoa = Number(e.target.value);
                    })
                  }
                  style={{ width: '100%', accentColor: 'var(--orange-600)' }}
                />
              </div>
            </div>

            <div style={{ fontSize: 12, marginTop: 8, opacity: 0.85 }}>
              {draft.mobileMoney?.wallet_exists ? (
                <>
                  Tier limits —{' '}
                  <strong>
                    {UNITEL_MONEY_TIERS[draft.mobileMoney.registration_level].label}:
                  </strong>{' '}
                  Daily up to{' '}
                  {formatAoa(UNITEL_MONEY_TIERS[draft.mobileMoney.registration_level].dailyLimitAoa)},
                  max balance{' '}
                  {formatAoa(UNITEL_MONEY_TIERS[draft.mobileMoney.registration_level].maxBalanceAoa)}.
                </>
              ) : (
                'No Unitel Money wallet — treated as missing/thin without score penalty.'
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <BandBadge band={explanation.band} />
            <ConfidenceBadge confidence={explanation.confidence} />
            <span style={{ fontSize: 12, opacity: 0.85 }}>
              Active denominator: {explanation.activeDenominator} pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

