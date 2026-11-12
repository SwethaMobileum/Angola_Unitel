import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EMI_PLANS,
  DEFAULT_EQUIPMENT_CATALOG,
  DEFAULT_SCORING_CONFIG,
  calculateEmiPlan,
  cloneConfig,
  evaluateCreditScore,
  evaluateLimitAndDecision,
} from '../index';
import { buildPersonas, generateSeedDataset } from '../../data/seedGenerator';

describe('Unitel Credit Scoring Engine (pure module)', () => {
  const personas = buildPersonas();
  const byName = (name: string) => {
    const found = personas.find((p) => p.customer.full_name === name);
    if (!found) throw new Error(`Missing persona ${name}`);
    return found;
  };

  it('scores Thomas Mateus as Excellent with High confidence and suggests Auto-approve candidate for a car EMI', () => {
    const thomas = byName('Thomas Mateus');
    const exp = evaluateCreditScore(thomas, DEFAULT_SCORING_CONFIG);

    expect(exp.score).toBeGreaterThanOrEqual(800);
    expect(exp.score).toBeLessThanOrEqual(900);
    expect(exp.band).toBe('Excellent');
    expect(exp.confidence).toBe('High');
    expect(exp.meaningfulSourceCount).toBe(4);
    expect(exp.adjustments).toHaveLength(0);

    const carPlan = DEFAULT_EMI_PLANS.find((p) => p.tier === 'high' && p.term_months === 36)!;
    const emi = calculateEmiPlan(5_500_000, carPlan);
    const decision = evaluateLimitAndDecision(
      exp,
      5_500_000,
      DEFAULT_SCORING_CONFIG,
      emi.monthly_emi_aoa
    );
    expect(decision.creditLimitAoa).toBe(7_500_000);
    expect(decision.emiAffordable).toBe(true);
    expect(decision.decision).toBe('auto_approve');
  });

  it('treats Maria Cândida basic low-activity wallet and missing bank account as neutral/thin-file (Medium confidence, Good band)', () => {
    const maria = byName('Maria Cândida');
    const exp = evaluateCreditScore(maria, DEFAULT_SCORING_CONFIG);

    expect(exp.sourceStatuses.mobileMoney).toBe('thin');
    expect(exp.sourceStatuses.tax).toBe('missing');
    expect(exp.confidence).toBe('Medium');
    expect(exp.meaningfulSourceCount).toBe(2);
    expect(exp.band).toBe('Good');
    expect(exp.activeDenominator).toBe(80);
    expect(exp.thinFileNotice).toContain('Wallet data is limited (Basic registration)');
    expect(exp.summaryReasons.some((r) => r.includes('No bank account recorded'))).toBe(true);
    expect(exp.adjustments.some((a) => a.code === 'THIN_FILE_RENORMALIZED')).toBe(true);
  });

  it('never penalizes a missing bank account (score identical with or without bank account)', () => {
    const thomasWithBank = structuredClone(byName('Thomas Mateus'));
    const thomasUnbanked = structuredClone(byName('Thomas Mateus'));
    thomasWithBank.has_bank_account = true;
    thomasUnbanked.has_bank_account = false;

    const expA = evaluateCreditScore(thomasWithBank, DEFAULT_SCORING_CONFIG);
    const expB = evaluateCreditScore(thomasUnbanked, DEFAULT_SCORING_CONFIG);
    expect(expB.score).toBe(expA.score);
  });

  it('never changes score formula by volume_tier alone', () => {
    const lowTier = structuredClone(byName('Maria Cândida'));
    const highTier = structuredClone(byName('Maria Cândida'));
    lowTier.customer.volume_tier = 'low';
    highTier.customer.volume_tier = 'high';

    expect(evaluateCreditScore(lowTier, DEFAULT_SCORING_CONFIG).score).toBe(
      evaluateCreditScore(highTier, DEFAULT_SCORING_CONFIG).score
    );
  });

  it('scores João Baptista with Low confidence and Poor/Fair band', () => {
    const joao = byName('João Baptista');
    const exp = evaluateCreditScore(joao, DEFAULT_SCORING_CONFIG);

    expect(exp.confidence).toBe('Low');
    expect(exp.meaningfulSourceCount).toBe(1);
    expect(['Poor', 'Fair']).toContain(exp.band);
    expect(exp.score).toBeLessThanOrEqual(600);
  });

  it('caps Luísa Fernandes at 600 due to unverified BI, deducts 5 pts for suspended NIF, and routes to Manual review', () => {
    const luisa = byName('Luísa Fernandes');
    const exp = evaluateCreditScore(luisa, DEFAULT_SCORING_CONFIG);

    expect(exp.uncappedScore).toBeGreaterThan(600);
    expect(exp.score).toBe(600);
    expect(exp.band).toBe('Fair');
    expect(exp.adjustments.some((a) => a.code === 'BI_NOT_VERIFIED_CAP')).toBe(true);
    expect(exp.adjustments.some((a) => a.code === 'SUSPENDED_NIF_DEDUCTION')).toBe(true);

    const decision = evaluateLimitAndDecision(exp, 280_000, DEFAULT_SCORING_CONFIG, 30_000);
    expect(decision.decision).toBe('manual_review');
  });

  it('caps Pedro Kiala at 550 (Poor) due to unpaid airtime loans', () => {
    const pedro = byName('Pedro Kiala');
    const exp = evaluateCreditScore(pedro, DEFAULT_SCORING_CONFIG);

    expect(exp.uncappedScore).toBeGreaterThan(550);
    expect(exp.score).toBe(550);
    expect(exp.band).toBe('Poor');
    expect(exp.adjustments.some((a) => a.code === 'UNPAID_LOAN_CAP')).toBe(true);

    const decision = evaluateLimitAndDecision(exp, 280_000, DEFAULT_SCORING_CONFIG, 30_000);
    expect(decision.decision).toBe('decline');
  });

  it('drops Thomas to 550 (Poor) and Decline suggestion when an unpaid airtime loan is toggled in What-If', () => {
    const thomas = structuredClone(byName('Thomas Mateus'));
    thomas.telecom!.airtime_loans_unpaid = 1;
    thomas.telecom!.airtime_loans_repaid_on_time = 3;

    const exp = evaluateCreditScore(thomas, DEFAULT_SCORING_CONFIG);
    expect(exp.score).toBe(550);
    expect(exp.band).toBe('Poor');

    const decision = evaluateLimitAndDecision(exp, 5_500_000, DEFAULT_SCORING_CONFIG, 162_000);
    expect(decision.decision).toBe('decline');
  });

  it('recomputes scores accurately when Admin updates telecom weight from 45 to 35', () => {
    const maria = byName('Maria Cândida');
    const defaultExp = evaluateCreditScore(maria, DEFAULT_SCORING_CONFIG);

    const updatedConfig = cloneConfig(DEFAULT_SCORING_CONFIG);
    updatedConfig.weights.telecom = 35;

    const updatedExp = evaluateCreditScore(maria, updatedConfig);
    expect(updatedExp.activeDenominator).toBe(70);
    expect(updatedExp.score).not.toBe(defaultExp.score);
  });

  it('flags EMI affordability failure when monthly EMI exceeds maxMonthlyEmiAoa', () => {
    const maria = byName('Maria Cândida');
    const exp = evaluateCreditScore(maria, DEFAULT_SCORING_CONFIG); // Good + Medium -> limit 1,100,000, max EMI 110,000
    const decision = evaluateLimitAndDecision(exp, 500_000, DEFAULT_SCORING_CONFIG, 180_000);
    expect(decision.emiAffordable).toBe(false);
    expect(decision.decision).toBe('decline');
  });

  it('generates 300 synthetic Angolan customers, catalog, EMI plans, and audit logs', () => {
    const { profiles, applications, notifications, auditLogs } = generateSeedDataset(
      DEFAULT_SCORING_CONFIG,
      DEFAULT_EQUIPMENT_CATALOG,
      DEFAULT_EMI_PLANS
    );
    expect(profiles).toHaveLength(300);
    expect(applications.length).toBeGreaterThanOrEqual(10);
    expect(notifications.length).toBe(applications.length * 2);
    expect(auditLogs.length).toBe(applications.length);
  });
});
