import { useMemo, useRef, useState } from 'react';
import {
  UNITEL_MONEY_TIERS,
  UNITEL_MONEY_UNBANKED_HELPER,
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
import {
  BandBadge,
  ConfidenceBadge,
  SourceStatusBadge,
  SuggestedDecisionBadge,
} from './Badges';
import { ScoreGauge } from './ScoreGauge';

interface WhatIfPanelProps {
  profile: CustomerProfile;
  config: ScoringConfig;
  productName: string;
  productPriceAoa: number;
  monthlyEmiAoa?: number;
  activeApplication?: ApplicationRecord | null;
  onProfileDraftChange?: (draft: CustomerProfile) => void;
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
  monthlyEmiAoa,
  activeApplication,
  onProfileDraftChange,
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
    () => evaluateLimitAndDecision(explanation, productPriceAoa, config, monthlyEmiAoa),
    [explanation, productPriceAoa, config, monthlyEmiAoa]
  );

  const previewApp: ApplicationRecord = useMemo(
    () => ({
      id: activeApplication?.id ?? 'WHATIF-PREVIEW',
      customer_id: draft.customer.id,
      customer_name: draft.customer.full_name,
      mobile_no: draft.customer.mobile_no,
      volume_tier: activeApplication?.volume_tier ?? draft.customer.volume_tier ?? 'low',
      product: productName,
      product_price_aoa: productPriceAoa,
      emi_term_months: activeApplication?.emi_term_months ?? 12,
      emi_rate_pct: activeApplication?.emi_rate_pct ?? 11,
      down_payment_aoa: activeApplication?.down_payment_aoa ?? Math.round(productPriceAoa * 0.1),
      monthly_emi_aoa: limitDecision.monthlyEmiAoa,
      total_payable_aoa: activeApplication?.total_payable_aoa ?? productPriceAoa,
      emi_affordable: limitDecision.emiAffordable,
      max_monthly_emi_aoa: limitDecision.maxMonthlyEmiAoa,
      status: activeApplication?.status ?? 'pending_review',
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
    onProfileDraftChange?.(next);

    if (activeApplication && onSyncApplicationAndNotifications) {
      const nextExp = evaluateCreditScore(next, config);
      const nextDec = evaluateLimitAndDecision(nextExp, productPriceAoa, config, monthlyEmiAoa);
      const nextApp: ApplicationRecord = {
        ...activeApplication,
        product: productName,
        product_price_aoa: productPriceAoa,
        score: nextExp.score,
        band: nextExp.band,
        confidence: nextExp.confidence,
        credit_limit_aoa: nextDec.creditLimitAoa,
        emi_affordable: nextDec.emiAffordable,
        max_monthly_emi_aoa: nextDec.maxMonthlyEmiAoa,
        decision: nextDec.decision,
        decision_reason: nextDec.decisionReason,
        profile_snapshot: next,
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
    onProfileDraftChange?.(orig);
    if (activeApplication && onSyncApplicationAndNotifications) {
      const nextExp = evaluateCreditScore(orig, config);
      const nextDec = evaluateLimitAndDecision(nextExp, productPriceAoa, config, monthlyEmiAoa);
      const nextApp: ApplicationRecord = {
        ...activeApplication,
        product: productName,
        product_price_aoa: productPriceAoa,
        score: nextExp.score,
        band: nextExp.band,
        confidence: nextExp.confidence,
        credit_limit_aoa: nextDec.creditLimitAoa,
        emi_affordable: nextDec.emiAffordable,
        max_monthly_emi_aoa: nextDec.maxMonthlyEmiAoa,
        decision: nextDec.decision,
        decision_reason: nextDec.decisionReason,
        profile_snapshot: orig,
      };
      const notifs = buildNotificationDrafts(nextApp, nextDec.decision, config);
      onSyncApplicationAndNotifications(orig, nextApp, notifs);
    }
    onResetProfile?.();
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Live What-If Simulator — {draft.customer.full_name}</h3>
          <div style={{ fontSize: 12.5 }}>
            Adjust telecom, KYC, Unitel Money, banking, or tax attributes to test score, limit,
            EMI affordability, and decision suggestion instantly.
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700 }}>Policy Suggestion</span>
              <SuggestedDecisionBadge decision={limitDecision.decision} />
            </div>
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>
                Assigned limit: <strong>{formatAoa(limitDecision.creditLimitAoa)}</strong>
              </div>
              <div>
                Equipment price: <strong>{formatAoa(productPriceAoa)}</strong>
              </div>
              <div>
                Monthly EMI: <strong>{formatAoa(limitDecision.monthlyEmiAoa)}</strong> vs max{' '}
                <strong>{formatAoa(limitDecision.maxMonthlyEmiAoa)}</strong> (
                {limitDecision.emiAffordable ? '✓ Affordable' : '✕ Over cap'})
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{limitDecision.decisionReason}</div>
            </div>
          </div>

          {explanation.thinFileNotice && (
            <div className="alert-box" style={{ fontSize: 12 }}>
              <strong>Thin File:</strong> {explanation.thinFileNotice}
            </div>
          )}

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
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              Simulated Notification Preview ({limitDecision.decisionLabel})
            </div>
            <div style={{ fontSize: 12, background: 'var(--table-stripe)', border: '1px solid var(--border)', padding: 8, borderRadius: 6, marginBottom: 6 }}>
              <strong>SMS:</strong> {previewNotifications[0]?.body}
            </div>
            <div style={{ fontSize: 12, background: 'var(--table-stripe)', border: '1px solid var(--border)', padding: 8, borderRadius: 6 }}>
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
                <strong style={{ color: 'var(--brand-700)' }}>
                  Telecom Behavior ({config.weights.telecom}%)
                </strong>
                <SourceStatusBadge status={explanation.sourceStatuses.telecom} />
              </div>

              <label className="field-label">SIM Tenure: {simMonths} months</label>
              <input
                type="range"
                min={1}
                max={72}
                value={simMonths}
                onChange={(e) => handleSimMonthsChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--slate-600)', marginBottom: 10 }}
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
                style={{ width: '100%', accentColor: 'var(--slate-600)', marginBottom: 10 }}
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

            {/* Identity, Banking & Tax Controls */}
            <div className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <strong style={{ color: 'var(--brand-700)' }}>
                  Identity ({config.weights.identity}%), Bank &amp; Tax ({config.weights.tax}%)
                </strong>
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

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.has_bank_account)}
                    onChange={(e) =>
                      applyDraftChange((next) => {
                        next.has_bank_account = e.target.checked;
                      })
                    }
                  />
                  Has Bank Account (Neutral — never reduces score)
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
              <strong style={{ color: 'var(--brand-700)' }}>
                Mobile Money — Unitel Money ({config.weights.mobileMoney}%)
              </strong>
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
                  style={{ width: '100%', accentColor: 'var(--slate-600)' }}
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
                  style={{ width: '100%', accentColor: 'var(--slate-600)' }}
                />
              </div>
            </div>

            <div style={{ fontSize: 12, marginTop: 8 }}>
              {draft.mobileMoney?.wallet_exists ? (
                <>
                  <strong>{UNITEL_MONEY_TIERS[draft.mobileMoney.registration_level].label}:</strong>{' '}
                  daily up to{' '}
                  {formatAoa(UNITEL_MONEY_TIERS[draft.mobileMoney.registration_level].dailyLimitAoa)},
                  balance up to{' '}
                  {formatAoa(UNITEL_MONEY_TIERS[draft.mobileMoney.registration_level].maxBalanceAoa)}.
                </>
              ) : (
                UNITEL_MONEY_UNBANKED_HELPER
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <BandBadge band={explanation.band} />
            <ConfidenceBadge confidence={explanation.confidence} />
            <span style={{ fontSize: 12 }}>
              Active denominator: {explanation.activeDenominator} pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
