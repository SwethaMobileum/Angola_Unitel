import type {
  DecisionOutcome,
  EmiCalculation,
  EmiPlanConfig,
  LimitDecisionResult,
  ScoreExplanation,
  ScoringConfig,
} from './types';

export function formatAoa(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')} AOA`;
}

export function calculateEmiPlan(priceAoa: number, plan: EmiPlanConfig): EmiCalculation {
  const downPayment = Math.round(priceAoa * (plan.min_down_payment_pct / 100));
  const principal = Math.max(0, priceAoa - downPayment);
  const n = Math.max(1, plan.term_months);
  const monthlyRate = plan.interest_rate_pct / 100 / 12;

  let monthlyEmi = 0;
  if (principal > 0) {
    if (monthlyRate === 0) {
      monthlyEmi = Math.round(principal / n);
    } else {
      const factor = Math.pow(1 + monthlyRate, n);
      monthlyEmi = Math.round((principal * monthlyRate * factor) / (factor - 1));
    }
  }

  const totalPayable = downPayment + monthlyEmi * n;
  return {
    term_months: n,
    interest_rate_pct: plan.interest_rate_pct,
    down_payment_aoa: downPayment,
    principal_aoa: principal,
    monthly_emi_aoa: monthlyEmi,
    total_payable_aoa: totalPayable,
  };
}

/**
 * Pure credit limit, EMI affordability, and decision suggestion evaluator.
 * Every submitted application still routes to the Approver for final decision,
 * while this engine computes the policy suggestion ("Auto-approve candidate",
 * "Manual review", or "Decline").
 */
export function evaluateLimitAndDecision(
  explanation: ScoreExplanation,
  productPriceAoa: number,
  config: ScoringConfig,
  monthlyEmiAoa?: number
): LimitDecisionResult {
  const { band, confidence } = explanation;
  const creditLimitAoa = config.creditLimitsAoa[band][confidence];
  const headroomAoa = creditLimitAoa - productPriceAoa;
  const startSmallApplied = confidence === 'Low';
  const maxMonthlyEmiAoa = Math.round(creditLimitAoa * (config.maxMonthlyEmiRatioOfLimit ?? 0.1));
  const effectiveMonthlyEmi =
    monthlyEmiAoa !== undefined ? monthlyEmiAoa : Math.round(productPriceAoa / 12);
  const emiAffordable = effectiveMonthlyEmi <= maxMonthlyEmiAoa;

  let decision: DecisionOutcome;
  let decisionLabel: string;
  let decisionReason: string;

  const slightOverageThreshold = creditLimitAoa * 1.25;

  if (band === 'Poor') {
    decision = 'decline';
    decisionLabel = 'Decline (Suggested)';
    decisionReason = `Score ${explanation.score} is in the Poor band (${
      explanation.adjustments.find((a) => a.code === 'UNPAID_LOAN_CAP')
        ? 'capped due to unpaid airtime loan'
        : 'below minimum creditworthiness threshold'
    }).`;
  } else if (productPriceAoa > slightOverageThreshold) {
    decision = 'decline';
    decisionLabel = 'Decline (Suggested)';
    decisionReason = `Requested equipment (${formatAoa(productPriceAoa)}) exceeds eligible credit limit (${formatAoa(creditLimitAoa)}) by ${formatAoa(productPriceAoa - creditLimitAoa)} (>25% gap).`;
  } else if (!emiAffordable && effectiveMonthlyEmi > maxMonthlyEmiAoa * 1.5) {
    decision = 'decline';
    decisionLabel = 'Decline (Suggested)';
    decisionReason = `Monthly EMI (${formatAoa(effectiveMonthlyEmi)}) exceeds 150% of max monthly affordability (${formatAoa(maxMonthlyEmiAoa)}).`;
  } else if (
    (band === 'Excellent' || band === 'Good') &&
    (confidence === 'High' || confidence === 'Medium') &&
    productPriceAoa <= creditLimitAoa &&
    emiAffordable
  ) {
    decision = 'auto_approve';
    decisionLabel = 'Auto-approve candidate';
    decisionReason = `${band} proxy score (${explanation.score}) with ${confidence} data confidence, price within ${formatAoa(creditLimitAoa)} limit, and affordable EMI (${formatAoa(effectiveMonthlyEmi)}/mo <= ${formatAoa(maxMonthlyEmiAoa)}/mo).`;
  } else {
    decision = 'manual_review';
    decisionLabel = 'Manual review';
    if (!emiAffordable) {
      decisionReason = `Monthly EMI (${formatAoa(effectiveMonthlyEmi)}) slightly exceeds monthly affordability cap (${formatAoa(maxMonthlyEmiAoa)}) — Approver review needed.`;
    } else if (confidence === 'Low') {
      decisionReason = `Low data confidence (${explanation.meaningfulSourceCount} meaningful source) — "start small" limit of ${formatAoa(creditLimitAoa)} requires Approver review.`;
    } else if (productPriceAoa > creditLimitAoa) {
      decisionReason = `Product price (${formatAoa(productPriceAoa)}) is slightly above the ${formatAoa(creditLimitAoa)} limit (gap of ${formatAoa(productPriceAoa - creditLimitAoa)}) — eligible for Approver review or higher down-payment.`;
    } else {
      decisionReason = `${band} band (${explanation.score}) routed to Approver review per credit policy.`;
    }
  }

  return {
    creditLimitAoa,
    productPriceAoa,
    headroomAoa,
    monthlyEmiAoa: effectiveMonthlyEmi,
    maxMonthlyEmiAoa,
    emiAffordable,
    decision,
    decisionLabel,
    decisionReason,
    startSmallApplied,
  };
}
