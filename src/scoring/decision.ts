import type { DecisionOutcome, LimitDecisionResult, ScoreExplanation, ScoringConfig } from './types';

export function formatAoa(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')} AOA`;
}

/**
 * Pure credit limit and decision routing evaluator.
 * - Credit limit comes from (band x confidence) table in ScoringConfig.
 * - Low confidence applies a "start small" caution note and prevents auto-approval.
 * - Auto-approve: Good or Excellent, Medium or High confidence, price <= credit limit.
 * - Manual review: Fair band, OR Low confidence (when not Poor), OR price slightly above limit (<= 1.25x limit) when band >= Fair.
 * - Decline: Poor band, OR price far above limit (> 1.25x limit, or > limit on Low confidence & Poor).
 */
export function evaluateLimitAndDecision(
  explanation: ScoreExplanation,
  productPriceAoa: number,
  config: ScoringConfig
): LimitDecisionResult {
  const { band, confidence } = explanation;
  const creditLimitAoa = config.creditLimitsAoa[band][confidence];
  const headroomAoa = creditLimitAoa - productPriceAoa;
  const startSmallApplied = confidence === 'Low';

  let decision: DecisionOutcome;
  let decisionLabel: string;
  let decisionReason: string;

  const slightOverageThreshold = creditLimitAoa * 1.25;

  if (band === 'Poor') {
    decision = 'decline';
    decisionLabel = 'Decline';
    decisionReason = `Score ${explanation.score} is in the Poor band (${
      explanation.adjustments.find((a) => a.code === 'UNPAID_LOAN_CAP')
        ? 'capped due to unpaid airtime loan'
        : 'below minimum creditworthiness threshold'
    }).`;
  } else if (productPriceAoa > slightOverageThreshold) {
    decision = 'decline';
    decisionLabel = 'Decline';
    decisionReason = `Requested product (${formatAoa(productPriceAoa)}) exceeds eligible credit limit (${formatAoa(creditLimitAoa)}) by ${formatAoa(productPriceAoa - creditLimitAoa)} (>25% gap).`;
  } else if (
    (band === 'Excellent' || band === 'Good') &&
    (confidence === 'High' || confidence === 'Medium') &&
    productPriceAoa <= creditLimitAoa
  ) {
    decision = 'auto_approve';
    decisionLabel = 'Auto-approve';
    decisionReason = `${band} proxy score (${explanation.score}) with ${confidence} data confidence and product price within ${formatAoa(creditLimitAoa)} limit.`;
  } else {
    decision = 'manual_review';
    decisionLabel = 'Manual review';
    if (confidence === 'Low') {
      decisionReason = `Low data confidence (${explanation.meaningfulSourceCount} meaningful source) — "start small" limit of ${formatAoa(creditLimitAoa)} requires analyst/approver review.`;
    } else if (productPriceAoa > creditLimitAoa) {
      decisionReason = `Product price (${formatAoa(productPriceAoa)}) is slightly above the ${formatAoa(creditLimitAoa)} limit (gap of ${formatAoa(productPriceAoa - creditLimitAoa)}) — eligible for manual review or down-payment.`;
    } else {
      decisionReason = `${band} band (${explanation.score}) routed to manual review per credit policy.`;
    }
  }

  return {
    creditLimitAoa,
    productPriceAoa,
    headroomAoa,
    decision,
    decisionLabel,
    decisionReason,
    startSmallApplied,
  };
}

