import type { CustomerProfile, ScoreExplanation } from '../scoring';
import { BandBadge, ConfidenceBadge, SourceStatusBadge, slateRampForRatio } from './Badges';
import { ScoreGauge } from './ScoreGauge';

interface ScoreExplanationViewProps {
  profile: CustomerProfile;
  explanation: ScoreExplanation;
  compact?: boolean;
}

export function ScoreExplanationView({
  profile,
  explanation,
  compact = false,
}: ScoreExplanationViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="grid-asymmetric">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ScoreGauge
            score={explanation.score}
            uncappedScore={explanation.uncappedScore}
            band={explanation.band}
            confidence={explanation.confidence}
          />
          <div className="card-tinted" style={{ fontSize: 12.5 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Score Calculation Summary</div>
            <div>
              Customer: <strong>{profile.customer.full_name}</strong> ({profile.customer.mobile_no})
            </div>
            <div>
              Points earned: <strong>{explanation.rawEarnedPoints}</strong> /{' '}
              <strong>{explanation.activeDenominator}</strong> active weight
            </div>
            <div>
              Normalized index: <strong>{explanation.normalizedPoints} / 100</strong>
            </div>
            <div>
              Meaningful sources: <strong>{explanation.meaningfulSourceCount} of 4</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Category Breakdown</h3>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Thin or missing wallets are removed from the denominator so basic-tier users are not penalized.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <BandBadge band={explanation.band} />
              <ConfidenceBadge confidence={explanation.confidence} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {explanation.categories.map((cat) => {
              const ratio =
                cat.excludedFromDenominator || cat.effectiveMaxPoints === 0
                  ? 0
                  : cat.earnedPoints / cat.effectiveMaxPoints;
              return (
                <div key={cat.category}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 5,
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong>{cat.label}</strong>
                      <SourceStatusBadge status={cat.sourceStatus} />
                    </div>
                    <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {cat.excludedFromDenominator
                        ? `Excluded (${cat.weight} pts removed)`
                        : `${cat.earnedPoints} / ${cat.effectiveMaxPoints} pts`}
                    </div>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: cat.excludedFromDenominator ? '0%' : `${Math.min(100, ratio * 100)}%`,
                        backgroundColor: slateRampForRatio(ratio),
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>{cat.note}</div>
                </div>
              );
            })}
          </div>

          {explanation.adjustments.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                Rules, Thin-File Re-normalization &amp; Caps Applied
              </div>
              {explanation.adjustments.map((adj) => (
                <div key={adj.code} className="alert-box">
                  <strong>{adj.label}:</strong> {adj.impactText}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Plain-Language Explanation</h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {explanation.summaryReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Parameter-Level Scoring Table</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Parameter</th>
                    <th>Observed Value</th>
                    <th>Points</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {explanation.parameters.map((param) => (
                    <tr key={param.id}>
                      <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                        {param.category === 'mobileMoney' ? 'Mobile money' : param.category}
                      </td>
                      <td style={{ fontWeight: 600 }}>{param.label}</td>
                      <td>{param.rawValue}</td>
                      <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {param.excluded ? 'Excluded' : `${param.earnedPoints} / ${param.maxPoints}`}
                      </td>
                      <td>{param.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

