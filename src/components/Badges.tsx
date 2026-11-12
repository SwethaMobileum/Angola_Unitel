import type {
  ApplicationStatus,
  ConfidenceLevel,
  DecisionOutcome,
  ScoreBandName,
  SourceStatus,
  VolumeTier,
} from '../scoring';

export function BandBadge({ band }: { band: ScoreBandName }) {
  return <span className={`badge band-${band.toLowerCase()}`}>{band}</span>;
}

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  return <span className={`badge conf-${confidence.toLowerCase()}`}>Confidence: {confidence}</span>;
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  if (status === 'approved') {
    return <span className="badge status-approved">✓ Approved</span>;
  }
  if (status === 'rejected') {
    return <span className="badge status-rejected">✕ Rejected</span>;
  }
  if (status === 'more_info_requested') {
    return <span className="badge status-pending">◷ More Info</span>;
  }
  if (status === 'draft') {
    return <span className="badge status-pending">◷ Draft</span>;
  }
  if (status === 'scored') {
    return <span className="badge status-pending">◷ Scored</span>;
  }
  return <span className="badge status-pending">◷ Pending Review</span>;
}

export function SuggestedDecisionBadge({ decision }: { decision: DecisionOutcome }) {
  if (decision === 'auto_approve') {
    return <span className="badge status-approved">✓ Auto-approve candidate</span>;
  }
  if (decision === 'manual_review') {
    return <span className="badge status-pending">◷ Manual review</span>;
  }
  return <span className="badge status-rejected">✕ Decline (Suggested)</span>;
}

export function VolumeTierBadge({ tier }: { tier: VolumeTier }) {
  return (
    <span className={`badge ${tier === 'high' ? 'band-good' : 'conf-low'}`}>
      {tier === 'high' ? 'High Volume (KYC)' : 'Low Volume (Basic)'}
    </span>
  );
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
