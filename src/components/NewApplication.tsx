import { useEffect, useMemo, useState } from 'react';
import {
  PRODUCT_CATALOG,
  UNITEL_MONEY_TIERS,
  buildNotificationDrafts,
  evaluateCreditScore,
  evaluateLimitAndDecision,
  formatAoa,
} from '../scoring';
import type {
  ApplicationRecord,
  CustomerProfile,
  DecisionOutcome,
  NotificationRecord,
  Role,
  ScoringConfig,
} from '../scoring';
import { BandBadge, ConfidenceBadge, DecisionBadge, SourceStatusBadge } from './Badges';
import { ScoreExplanationView } from './ScoreExplanationView';
import { WhatIfPanel } from './WhatIfPanel';

interface NewApplicationProps {
  profiles: CustomerProfile[];
  config: ScoringConfig;
  role: Role;
  initialCustomerId?: string;
  onSubmitApplication: (
    app: ApplicationRecord,
    notifications: NotificationRecord[]
  ) => void;
  onUpdateApplicationAndNotifications: (
    updatedProfile: CustomerProfile,
    updatedApp: ApplicationRecord,
    newNotifications: NotificationRecord[]
  ) => void;
  onOverrideDecision: (
    appId: string,
    decision: DecisionOutcome,
    reason: string
  ) => void;
}

const STEPS = [
  '1. Application',
  '2. Data Collection',
  '3. Proxy Rating',
  '4. Credit Limit',
  '5. Decision',
  '6. Notifications',
];

export function NewApplication({
  profiles,
  config,
  role,
  initialCustomerId,
  onSubmitApplication,
  onUpdateApplicationAndNotifications,
  onOverrideDecision,
}: NewApplicationProps) {
  const [step, setStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomerId || profiles[0]?.customer.id || 'cust-001'
  );
  const [selectedProductId, setSelectedProductId] = useState<string>('prod-car');
  const [customPriceAoa, setCustomPriceAoa] = useState<number>(
    PRODUCT_CATALOG.find((p) => p.id === 'prod-car')?.defaultPriceAoa ?? 5_500_000
  );

  // Step 2 source fetch simulation state
  const [fetchDone, setFetchDone] = useState(false);
  const [fetchedCount, setFetchedCount] = useState(0);

  // Committed application in this flow
  const [submittedApp, setSubmittedApp] = useState<ApplicationRecord | null>(null);
  const [generatedNotifications, setGeneratedNotifications] = useState<NotificationRecord[]>([]);
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
      setStep(0);
      setSubmittedApp(null);
      setFetchDone(false);
    }
  }, [initialCustomerId]);

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return profiles.slice(0, 25);
    return profiles
      .filter(
        (p) =>
          p.customer.full_name.toLowerCase().includes(q) ||
          p.customer.mobile_no.toLowerCase().includes(q) ||
          p.customer.bi_number.toLowerCase().includes(q)
      )
      .slice(0, 25);
  }, [profiles, searchTerm]);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.customer.id === selectedCustomerId) ?? profiles[0],
    [profiles, selectedCustomerId]
  );

  const selectedProduct = useMemo(
    () => PRODUCT_CATALOG.find((p) => p.id === selectedProductId) ?? PRODUCT_CATALOG[0],
    [selectedProductId]
  );

  const explanation = useMemo(
    () => evaluateCreditScore(selectedProfile, config),
    [selectedProfile, config]
  );

  const limitDecision = useMemo(
    () => evaluateLimitAndDecision(explanation, customPriceAoa, config),
    [explanation, customPriceAoa, config]
  );

  // Trigger animated source collection when entering step 1 (Data Collection)
  useEffect(() => {
    if (step !== 1 || fetchDone) return;
    setFetchedCount(0);
    const timers = [1, 2, 3, 4].map((idx) =>
      window.setTimeout(() => {
        setFetchedCount(idx);
        if (idx === 4) setFetchDone(true);
      }, idx * 240)
    );
    return () => timers.forEach(clearTimeout);
  }, [step, fetchDone]);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = PRODUCT_CATALOG.find((p) => p.id === prodId);
    if (prod) setCustomPriceAoa(prod.defaultPriceAoa);
  };

  const handleCommitDecisionAndNotify = () => {
    const appId = submittedApp?.id ?? `APP-${Math.floor(2000 + Math.random() * 7999)}`;
    const now = new Date().toISOString();
    const app: ApplicationRecord = {
      id: appId,
      customer_id: selectedProfile.customer.id,
      customer_name: selectedProfile.customer.full_name,
      mobile_no: selectedProfile.customer.mobile_no,
      product: selectedProduct.name,
      product_price_aoa: customPriceAoa,
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
      created_at: now,
    };

    const receivedNotifs = buildNotificationDrafts(app, 'received', config, now);
    const outcomeNotifs = buildNotificationDrafts(app, limitDecision.decision, config, now);
    const allNotifs = [...outcomeNotifs, ...receivedNotifs];

    setSubmittedApp(app);
    setGeneratedNotifications(allNotifs);
    onSubmitApplication(app, allNotifs);
    setStep(5);
  };

  const handleManualOverride = (outcome: DecisionOutcome) => {
    if (!submittedApp) return;
    const reason =
      overrideReason.trim() || `Manual ${outcome.replace('_', ' ')} override by ${role.toUpperCase()}`;
    onOverrideDecision(submittedApp.id, outcome, reason);
    const updated: ApplicationRecord = {
      ...submittedApp,
      decision: outcome,
      decision_reason: reason,
      status: outcome === 'auto_approve' ? 'approved' : outcome === 'manual_review' ? 'pending_review' : 'declined',
      overridden_by: role,
    };
    const notifs = buildNotificationDrafts(updated, outcome, config);
    setSubmittedApp(updated);
    setGeneratedNotifications((prev) => [...notifs, ...prev]);
  };

  const sourceCards = [
    {
      key: 'telecom',
      title: '1. Telecom Behavior (Unitel)',
      status: explanation.sourceStatuses.telecom,
      summary: selectedProfile.telecom
        ? `Top-up ${selectedProfile.telecom.topup_months_last_12}/12 mo • Avg ${formatAoa(selectedProfile.telecom.avg_monthly_topup_aoa)} • Unpaid loans: ${selectedProfile.telecom.airtime_loans_unpaid}`
        : 'No telecom profile found',
    },
    {
      key: 'identity',
      title: '2. National Identity & KYC',
      status: explanation.sourceStatuses.identity,
      summary: selectedProfile.identity
        ? `BI ${selectedProfile.identity.bi_number} • ${selectedProfile.identity.id_verified ? 'Verified' : 'Not verified'} • Address ${selectedProfile.identity.address_verified ? 'verified' : 'unverified'}`
        : 'No identity record found',
    },
    {
      key: 'mobileMoney',
      title: '3. Unitel Money Wallet',
      status: explanation.sourceStatuses.mobileMoney,
      summary: selectedProfile.mobileMoney?.wallet_exists
        ? `${UNITEL_MONEY_TIERS[selectedProfile.mobileMoney.registration_level].label} • ${selectedProfile.mobileMoney.txn_count_90d} txns/90d • Bal ${formatAoa(selectedProfile.mobileMoney.avg_balance_aoa)}`
        : 'No Unitel Money wallet registered (thin-file safe)',
    },
    {
      key: 'tax',
      title: '4. Tax Standing (AGT / NIF)',
      status: explanation.sourceStatuses.tax,
      summary: selectedProfile.tax
        ? `NIF status: ${selectedProfile.tax.nif_status.toUpperCase()} • Filing: ${selectedProfile.tax.tax_filing_status.toUpperCase()}`
        : 'No tax record (neutral)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">New Equipment Credit Application</h2>
          <p className="page-subtitle">
            6-stage Credit Workflow: Application → Data Collection → Proxy Rating → Credit Limit →
            Decision → Notification Engine
          </p>
        </div>
      </div>

      {/* Stepper Header */}
      <div className="stepper">
        {STEPS.map((label, idx) => (
          <button
            key={label}
            type="button"
            className={`step-pill ${step === idx ? 'active' : idx < step ? 'done' : ''}`}
            onClick={() => {
              if (idx === 1 && step !== 1) setFetchDone(false);
              setStep(idx);
            }}
          >
            <span className="step-num">{idx + 1}</span>
            <span>{label.replace(/^\d+\.\s*/, '')}</span>
          </button>
        ))}
      </div>

      {/* Step 1: Application Setup */}
      {step === 0 && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Step 1A: Select Subscriber</h3>
            </div>
            <label className="field-label">Search by Name, Mobile (+244), or BI Number</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Thomas, Maria, +244 923 100 001..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ marginBottom: 10 }}
            />

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {profiles.slice(0, 5).map((p) => (
                <button
                  key={p.customer.id}
                  type="button"
                  className={`btn btn-sm ${
                    selectedCustomerId === p.customer.id ? 'btn-primary' : 'btn-secondary'
                  }`}
                  onClick={() => {
                    setSelectedCustomerId(p.customer.id);
                    setSubmittedApp(null);
                  }}
                >
                  {p.customer.full_name}
                </button>
              ))}
            </div>

            <label className="field-label">Subscriber List ({filteredCustomers.length} shown)</label>
            <select
              className="select"
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setSubmittedApp(null);
              }}
            >
              {filteredCustomers.map((p) => (
                <option key={p.customer.id} value={p.customer.id}>
                  {p.customer.full_name} — {p.customer.mobile_no} ({p.customer.city})
                </option>
              ))}
            </select>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Step 1B: Choose Equipment &amp; Price</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {PRODUCT_CATALOG.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  className={`card ${selectedProductId === prod.id ? 'card-tinted' : ''}`}
                  style={{
                    padding: 12,
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderColor:
                      selectedProductId === prod.id ? 'var(--orange-600)' : 'var(--orange-200)',
                  }}
                  onClick={() => handleProductChange(prod.id)}
                >
                  <div style={{ fontWeight: 700, color: 'var(--orange-700)' }}>{prod.category}</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{prod.name}</div>
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>{formatAoa(prod.defaultPriceAoa)}</div>
                </button>
              ))}
            </div>

            <label className="field-label">Equipment Price (AOA)</label>
            <input
              type="number"
              className="input"
              value={customPriceAoa}
              min={10_000}
              step={10_000}
              onChange={(e) => setCustomPriceAoa(Number(e.target.value) || 0)}
            />

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setFetchDone(false);
                  setStep(1);
                }}
              >
                Collect 4 Data Sources →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Data Collection */}
      {step === 1 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                Step 2: Pulling Proxy Data Sources for {selectedProfile.customer.full_name}
              </h3>
              <div style={{ fontSize: 12.5, opacity: 0.85 }}>
                Shared key: <strong>{selectedProfile.customer.mobile_no}</strong> | BI / NIF:{' '}
                <strong>{selectedProfile.customer.bi_number}</strong>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setFetchDone(false)}
            >
              Replay Fetch Animation
            </button>
          </div>

          <div className="grid-2">
            {sourceCards.map((sc, idx) => {
              const loaded = fetchDone || fetchedCount > idx;
              return (
                <div
                  key={sc.key}
                  className={`card ${!loaded ? 'source-loading' : ''}`}
                  style={{ padding: 14 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>{sc.title}</strong>
                    {loaded ? (
                      <SourceStatusBadge status={sc.status} />
                    ) : (
                      <span className="badge band-poor">Querying...</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {loaded ? sc.summary : 'Connecting to simulated source endpoint...'}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Detected Data Confidence:</span>
              <ConfidenceBadge confidence={explanation.confidence} />
              <span style={{ fontSize: 12.5 }}>
                ({explanation.meaningfulSourceCount} of 4 meaningful sources)
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!fetchDone}
              onClick={() => setStep(2)}
            >
              Compute Proxy Credit Score →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Rating */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ScoreExplanationView profile={selectedProfile} explanation={explanation} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
              Assign Credit Limit →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Credit Limit */}
      {step === 3 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Step 4: Credit Limit Assignment vs. Equipment Price</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <BandBadge band={explanation.band} />
              <ConfidenceBadge confidence={explanation.confidence} />
            </div>
          </div>

          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div className="card-tinted">
              <div className="kpi-label">Eligible Credit Limit</div>
              <div className="kpi-value" style={{ fontSize: 24 }}>
                {formatAoa(limitDecision.creditLimitAoa)}
              </div>
              <div className="kpi-meta">
                From {explanation.band} × {explanation.confidence} confidence table
              </div>
            </div>

            <div className="card-tinted">
              <div className="kpi-label">Requested Equipment Price</div>
              <div className="kpi-value" style={{ fontSize: 24 }}>
                {formatAoa(limitDecision.productPriceAoa)}
              </div>
              <div className="kpi-meta">{selectedProduct.name}</div>
            </div>

            <div className="card-tinted">
              <div className="kpi-label">
                {limitDecision.headroomAoa >= 0 ? 'Remaining Headroom' : 'Affordability Gap'}
              </div>
              <div className="kpi-value" style={{ fontSize: 24 }}>
                {limitDecision.headroomAoa >= 0 ? '+' : '-'}
                {formatAoa(Math.abs(limitDecision.headroomAoa))}
              </div>
              <div className="kpi-meta">
                {limitDecision.startSmallApplied
                  ? '"Start small" cap applied due to Low confidence'
                  : limitDecision.headroomAoa >= 0
                    ? 'Price fits cleanly within assigned limit'
                    : 'Customer down-payment or manual review needed'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={() => setStep(4)}>
              Evaluate Decision →
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Decision */}
      {step === 4 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Step 5: Automated Decision Routing</h3>
            <DecisionBadge decision={submittedApp?.decision ?? limitDecision.decision} />
          </div>

          <div className="alert-box" style={{ marginBottom: 14 }}>
            <strong>Decision Rationale:</strong>{' '}
            {submittedApp?.decision_reason ?? limitDecision.decisionReason}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 13 }}>
              Score: <strong>{explanation.score}</strong> (<BandBadge band={explanation.band} />) •{' '}
              <ConfidenceBadge confidence={explanation.confidence} /> • Limit:{' '}
              <strong>{formatAoa(limitDecision.creditLimitAoa)}</strong>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleCommitDecisionAndNotify}>
              Confirm Decision &amp; Generate Notifications →
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Notification Engine & Approver Override */}
      {step === 5 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                Step 6: Notifications Dispatched (Simulated) —{' '}
                {submittedApp?.id ?? 'Draft'}
              </h3>
              <div style={{ fontSize: 12.5, opacity: 0.85 }}>
                Mock SMS &amp; Email generated from editable Admin templates and logged.
              </div>
            </div>
            <DecisionBadge decision={submittedApp?.decision ?? limitDecision.decision} />
          </div>

          {generatedNotifications.length === 0 ? (
            <div className="alert-box">
              Click "Confirm Decision &amp; Generate Notifications" in Step 5 to record this application.
            </div>
          ) : (
            <div className="grid-2" style={{ marginBottom: 16 }}>
              {generatedNotifications.slice(0, 2).map((n) => (
                <div key={n.id} className="card-tinted">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <strong>{n.channel.toUpperCase()} ({n.template})</strong>
                    <span className="badge band-good">Simulated Sent</span>
                  </div>
                  {n.subject && (
                    <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                      Subject: {n.subject}
                    </div>
                  )}
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      fontSize: 12.5,
                    }}
                  >
                    {n.body}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {submittedApp && (role === 'approver' || role === 'admin') && (
            <div
              style={{
                borderTop: '1px solid var(--orange-200)',
                paddingTop: 14,
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <strong style={{ fontSize: 13 }}>Approver Override:</strong>
              <input
                type="text"
                className="input"
                style={{ maxWidth: 340 }}
                placeholder="Override reason (e.g. verified salary slip)"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-approve btn-sm"
                onClick={() => handleManualOverride('auto_approve')}
              >
                Override Approve
              </button>
              <button
                type="button"
                className="btn btn-decline btn-sm"
                onClick={() => handleManualOverride('decline')}
              >
                Override Decline
              </button>
            </div>
          )}
        </div>
      )}

      {/* Always-visible Live What-If Panel below the stepper */}
      <WhatIfPanel
        profile={selectedProfile}
        config={config}
        productName={selectedProduct.name}
        productPriceAoa={customPriceAoa}
        activeApplication={submittedApp}
        onSyncApplicationAndNotifications={(updatedProfile, updatedApp, newNotifs) => {
          setSubmittedApp(updatedApp);
          setGeneratedNotifications((prev) => [...newNotifs, ...prev]);
          onUpdateApplicationAndNotifications(updatedProfile, updatedApp, newNotifs);
        }}
      />
    </div>
  );
}

