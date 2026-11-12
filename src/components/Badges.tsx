import type { ConfidenceLevel, DecisionOutcome, ScoreBandName, SourceStatus } from '../scoring';

export function BandBadge({ band }: { band: ScoreBandName }) {
  const cls = `badge band-${band.toLowerCase()}`;
  return <span className={cls}>{band}</span>;
}

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  const cls = `badge conf-${confidence.toLowerCase()}`;
  return <span className={cls}>Confidence: {confidence}</span>;
}

export function DecisionBadge({ decision }: { decision: DecisionOutcome }) {
  const label =
    decision === 'auto_approve'
      ? 'Approved'
      : decision === 'manual_review'
        ? 'Manual Review'
        : 'Declined';
  return <span className={`badge decision-${decision}`}>{label}</span>;
}

export function SourceStatusBadge({ status }: { status: SourceStatus }) {
  const label =
    status === 'found' ? 'Found' : status === 'thin' ? 'Thin File (No Penalty)' : 'Missing';
  const cls =
    status === 'found'
      ? 'badge band-good'
      : status === 'thin'
        ? 'badge band-fair'
        : 'badge band-poor';
  return <span className={cls}>{label}</span>;
}

export function orangeRampForRatio(ratio: number): string {
  if (ratio >= 0.8) return 'var(--orange-700)';
  if (ratio >= 0.6) return 'var(--orange-500)';
  if (ratio >= 0.4) return 'var(--orange-400)';
  return 'var(--orange-300)';
}

