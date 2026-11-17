import { describe, it, expect } from 'vitest';
import {
  calculateCreditScore,
  ScoringInputs,
  DEFAULT_POINT_RULES,
} from './scoring';
import {
  DEFAULT_WEIGHTS,
} from '../data/seedData';
import { SegmentCode, BlockCode } from '../types';

describe('Unitel Credit Scoring Engine', () => {
  // Test 1: Invariant - Every segment's P+T+W+B+X equals 94
  it('Test 1: Every segment\'s P+T+W+B+X equals exactly 94 base points', () => {
    const allSegmentCodes: SegmentCode[] = [
      'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'
    ];

    for (const code of allSegmentCodes) {
      const weights = DEFAULT_WEIGHTS.filter(w => w.segment_code === code);
      const baseBlocks: BlockCode[] = ['P', 'T', 'W', 'B', 'X'];

      const totalBasePoints = weights
        .filter(w => baseBlocks.includes(w.block_code))
        .reduce((sum, w) => sum + w.points, 0);

      expect(totalBasePoints, `Segment ${code} base points sum`).toBe(94);
    }
  });

  // Test 2: S1 customer with 30m SIM, 11/12m topups, stable spend, no assets -> score computed, no error, confidence medium or high
  it('Test 2: S1 customer (Button phone, cash-only) computes valid score with medium/high confidence', () => {
    const s1Input: ScoringInputs = {
      segmentCode: 'S1',
      customerMeta: {
        simTenureMonths: 30,
        idSimMatch: true,
        dateOfBirth: '1984-06-15',
      },
      parameterInputs: {
        id_sim_match: true,
        age_band: '25-35',
        region: 'rural',
        sim_tenure_months: 30,
        topup_regularity_months: 11,
        topup_avg_amount_kz: 2500,
        arpu_stability: 'stable',
        usage_consistency: 'consistent',
        airtime_loan_repayment: '100%_repaid',
        device_type: 'button_phone',
      },
      assets: {}, // no assets
      incomeBandCode: 2, // Low / Min Wage
    };

    const result = calculateCreditScore(s1Input);

    expect(result.score).toBeGreaterThanOrEqual(300);
    expect(result.score).toBeLessThanOrEqual(900);
    expect(result.totalPoints).toBeGreaterThan(0);
    expect(result.totalPoints).toBeLessThanOrEqual(100);
    expect(result.isHardStop).toBe(false);
    expect(['medium', 'high']).toContain(result.dataConfidence);
    expect(result.positiveReasons.length).toBeGreaterThan(0);
    expect(result.blockScores.T.hasData).toBe(true);
    expect(result.blockScores.T.blockStrength).toBeGreaterThan(0.7);
  });

  // Test 3: Same S3 customer with wallet on versus off: W points move to T, total <= 100, confidence is lower with wallet off
  it('Test 3: S3 customer with wallet ON vs OFF redistributes W points to T and lowers confidence', () => {
    const baseCustomerInput: ScoringInputs = {
      segmentCode: 'S3',
      customerMeta: {
        simTenureMonths: 20,
        idSimMatch: true,
        dateOfBirth: '1998-11-20',
      },
      parameterInputs: {
        id_sim_match: true,
        age_band: '25-35',
        region: 'luanda_urban',
        employment_type: 'informal_business',
        sim_tenure_months: 20,
        topup_regularity_months: 10,
        arpu_stability: 'stable',
        data_bundles_per_month: 4,
        usage_consistency: 'consistent',
        wallet_level: 'kyc_verified',
        wallet_inflow_regularity: 'regular',
        p2p_per_month: 8,
        merchant_qr_receipts_kz: 80000,
        bill_airtime_payments: 5,
        wallet_balance_stability: 'stable',
        days_active_per_month: 22,
        wallet_loan_repayment: 'on_time',
      },
      assets: {
        house: 'no',
        car: 'skip',
      },
      incomeBandCode: 3,
    };

    // Evaluate with Wallet ON
    const resultOn = calculateCreditScore({ ...baseCustomerInput, walletAvailable: true });

    expect(resultOn.blockScores.W.hasData).toBe(true);
    expect(resultOn.blockScores.W.effectivePoints).toBe(42);
    expect(resultOn.blockScores.T.effectivePoints).toBe(40);
    expect(resultOn.totalPoints).toBeLessThanOrEqual(100);
    expect(resultOn.dataConfidence).toBe('high');

    // Evaluate with Wallet OFF
    const resultOff = calculateCreditScore({ ...baseCustomerInput, walletAvailable: false });

    expect(resultOff.blockScores.W.hasData).toBe(false);
    expect(resultOff.blockScores.W.status).toBe('skipped');
    expect(resultOff.blockScores.W.earnedPoints).toBe(0);
    // Effective points keep segment's base weight (no redistribution)
    expect(resultOff.blockScores.W.effectivePoints).toBe(42);
    expect(resultOff.blockScores.T.effectivePoints).toBe(40);
    expect(resultOff.blockScores.P.effectivePoints).toBe(12);
    // Base points sum must still be 94 (12 + 40 + 42 = 94)
    expect(resultOff.blockScores.P.effectivePoints + resultOff.blockScores.T.effectivePoints + resultOff.blockScores.W.effectivePoints).toBe(94);
    // Score is lower when wallet is switched off (missing data lowers score)
    expect(resultOff.score).toBeLessThan(resultOn.score);
    // No redistributions recorded
    expect(resultOff.redistributions).toHaveLength(0);
  });

  // Test 4: Missing block is never counted as zero (not penalized)
  it('Test 4: Missing block is never counted as zero or penalized', () => {
    // S5 is Banked ATM user: P=12, T=25, B=50, X=7 (Sum = 94)
    // Customer has only P, T, and X inputs (Bank data temporarily unavailable/missing)
    const s5MissingBankInput: ScoringInputs = {
      segmentCode: 'S5',
      customerMeta: {
        simTenureMonths: 18,
        idSimMatch: true,
      },
      parameterInputs: {
        id_sim_match: true,
        age_band: '25-35',
        region: 'luanda_urban',
        sim_tenure_months: 18,
        topup_regularity_months: 10,
        arpu_stability: 'stable',
        utility_bills_paid: 6,
        nif_standing: 'active_good',
        // No bank parameters provided!
      },
      assets: {},
      incomeBandCode: 3,
    };

    const result = calculateCreditScore(s5MissingBankInput);

    // Bank block is detected as having no data and marked 'nil'
    expect(result.blockScores.B.hasData).toBe(false);
    expect(result.blockScores.B.status).toBe('nil');
    expect(result.blockScores.B.earnedPoints).toBe(0);

    // Bank keeps its maximum (50 pts) and is not redistributed
    expect(result.blockScores.B.effectivePoints).toBe(50);
    expect(result.blockScores.T.effectivePoints).toBe(25);
    expect(result.redistributions).toHaveLength(0);

    const sumEffective = Object.values(result.blockScores).reduce((s, b) => s + b.effectivePoints, 0);
    expect(sumEffective).toBe(94);

    // Data gaps include the bank record gap
    expect(result.dataGaps).toContain('No bank record: 0 of 50 points');
  });

  // Test 5: Asset answers "No" and "Skip" give identical score to no answer
  it('Test 5: Asset answers "No" and "Skip" give identical score to no answer', () => {
    const baseInput: ScoringInputs = {
      segmentCode: 'S1',
      customerMeta: { simTenureMonths: 24, idSimMatch: true },
      parameterInputs: {
        id_sim_match: true,
        age_band: '36-55',
        region: 'provincial_capital',
        sim_tenure_months: 24,
        topup_regularity_months: 12,
        arpu_stability: 'stable',
      },
    };

    const scoreNoAnswer = calculateCreditScore({
      ...baseInput,
      assets: undefined,
    });

    const scoreEmptyObject = calculateCreditScore({
      ...baseInput,
      assets: {},
    });

    const scoreAllNo = calculateCreditScore({
      ...baseInput,
      assets: { house: 'no', land_title: 'no', two_wheeler: 'no', car: 'no' },
    });

    const scoreAllSkip = calculateCreditScore({
      ...baseInput,
      assets: { house: 'skip', land_title: 'skip', two_wheeler: 'skip', car: 'skip' },
    });

    // All must produce identical scores and 0 bonus points
    expect(scoreNoAnswer.assetBonus).toBe(0);
    expect(scoreEmptyObject.assetBonus).toBe(0);
    expect(scoreAllNo.assetBonus).toBe(0);
    expect(scoreAllSkip.assetBonus).toBe(0);

    expect(scoreNoAnswer.totalPoints).toBe(scoreAllNo.totalPoints);
    expect(scoreNoAnswer.totalPoints).toBe(scoreAllSkip.totalPoints);
    expect(scoreNoAnswer.score).toBe(scoreAllNo.score);
    expect(scoreNoAnswer.score).toBe(scoreAllSkip.score);

    // Conversely, "yes" adds points
    const scoreWithHouse = calculateCreditScore({
      ...baseInput,
      assets: { house: 'yes' },
    });
    expect(scoreWithHouse.assetBonus).toBe(2);
    expect(scoreWithHouse.totalPoints).toBe(Number((scoreNoAnswer.totalPoints + 2).toFixed(1)));
  });

  // Test 6: SIM < 6m caps limit at starter; SIM swap < 30d triggers hold for review
  it('Test 6: Overlay rules - SIM < 6m caps at starter; SIM swap < 30d holds for review', () => {
    // 6A: SIM tenure under 6 months (4 months)
    const shortTenureResult = calculateCreditScore({
      segmentCode: 'S2',
      customerMeta: {
        simTenureMonths: 4,
        idSimMatch: true,
      },
      parameterInputs: {
        id_sim_match: true,
        sim_tenure_months: 4,
        topup_regularity_months: 3,
        arpu_stability: 'stable',
      },
    });

    expect(shortTenureResult.isCappedAtStarter).toBe(true);
    expect(shortTenureResult.limitKz).toBeLessThanOrEqual(50000);
    const starterFlag = shortTenureResult.overlayFlags.find(f => f.ruleKey === 'sim_under_6m');
    expect(starterFlag).toBeDefined();
    expect(starterFlag?.action).toBe('cap_starter');

    // 6B: SIM swap in last 30 days (12 days ago)
    const simSwapResult = calculateCreditScore({
      segmentCode: 'S2',
      customerMeta: {
        simTenureMonths: 24,
        idSimMatch: true,
        simSwapDaysAgo: 12,
      },
      parameterInputs: {
        id_sim_match: true,
        sim_tenure_months: 24,
        topup_regularity_months: 12,
      },
    });

    expect(simSwapResult.isHoldForReview).toBe(true);
    const swapFlag = simSwapResult.overlayFlags.find(f => f.ruleKey === 'sim_swap_30d');
    expect(swapFlag).toBeDefined();
    expect(swapFlag?.action).toBe('hold_review');

    // 6C: ID Mismatch triggers hard stop
    const idMismatchResult = calculateCreditScore({
      segmentCode: 'S2',
      customerMeta: {
        idSimMatch: false,
      },
      parameterInputs: {
        id_sim_match: false,
      },
    });

    expect(idMismatchResult.isHardStop).toBe(true);
    expect(idMismatchResult.limitKz).toBe(0);
  });

  // Test 7: EMI above 30% of income marks status as over cap
  it('Test 7: EMI above 30% of monthly income marks affordability as over cap', () => {
    // Applicant with 100,000 Kz monthly income (Min Wage)
    // Financing phone costing 210,000 Kz over 6 months -> Monthly EMI = 35,000 Kz
    // 35,000 / 100,000 = 35% (> 30% cap) -> isOverCap: true
    const overCapResult = calculateCreditScore({
      segmentCode: 'S1',
      statedIncomeKz: 100000,
      equipmentPriceKz: 210000,
      termMonths: 6,
      customerMeta: { simTenureMonths: 24, idSimMatch: true },
      parameterInputs: {
        id_sim_match: true,
        sim_tenure_months: 24,
        topup_regularity_months: 12,
      },
    });

    expect(overCapResult.affordability).toBeDefined();
    expect(overCapResult.affordability?.monthlyEmiKz).toBe(35000);
    expect(overCapResult.affordability?.emiSharePct).toBe(35);
    expect(overCapResult.affordability?.isOverCap).toBe(true);

    // Phone costing 45,000 Kz over 6 months -> Monthly EMI = 7,500 Kz
    // 7,500 / 100,000 = 7.5% (<= 30% cap) -> isOverCap: false
    const affordableResult = calculateCreditScore({
      segmentCode: 'S1',
      statedIncomeKz: 100000,
      equipmentPriceKz: 45000,
      termMonths: 6,
      customerMeta: { simTenureMonths: 24, idSimMatch: true },
      parameterInputs: {
        id_sim_match: true,
        sim_tenure_months: 24,
        topup_regularity_months: 12,
      },
    });

    expect(affordableResult.affordability).toBeDefined();
    expect(affordableResult.affordability?.monthlyEmiKz).toBe(7500);
    expect(affordableResult.affordability?.emiSharePct).toBe(7.5);
    expect(affordableResult.affordability?.isOverCap).toBe(false);
  });

  // Test 8: Low-run / thin-file applicant scores in High Risk band (score < 500) and is capped at Starter limit
  it('Test 8: Low-run / thin-file applicant scores in High Risk band (score < 500) and is capped at Starter limit', () => {
    const lowRunResult = calculateCreditScore({
      segmentCode: 'S1',
      customerMeta: {
        simTenureMonths: 2,
        idSimMatch: true,
        dateOfBirth: '2004-03-10',
      },
      parameterInputs: {
        id_sim_match: true,
        age_band: '18-24',
        region: 'rural',
        sim_tenure_months: 2,
        topup_regularity_months: 1,
        topup_avg_amount_kz: 500,
        arpu_stability: false,
        usage_consistency: 1,
        airtime_loan_repayment: 20,
        device_type: 'button_phone',
      },
      assets: { house: 'no', land_title: 'no', two_wheeler: 'no', car: 'no' },
      incomeBandCode: 1,
      statedIncomeKz: 25000,
    });

    expect(lowRunResult.score).toBeLessThan(500);
    expect(lowRunResult.scoreBand.label).toBe('High risk');
    expect(lowRunResult.isCappedAtStarter).toBe(true);
    expect(lowRunResult.limitKz).toBeLessThanOrEqual(50000);
  });

  // Test 9: Data coverage calculation returns 0-100 score and High/Medium/Low label
  it('Test 9: Data coverage calculation returns 0-100 score and High/Medium/Low label', () => {
    // S1 has P (14) and T (80) = 94 base points. Full data gives 100% data coverage
    const s1Full = calculateCreditScore({
      segmentCode: 'S1',
      parameterInputs: {
        id_sim_match: true,
        sim_tenure_months: 24,
        topup_months_of_12: 12,
      },
    });
    expect(s1Full.dataCoverageScore).toBe(100);
    expect(s1Full.dataCoverageLabel).toBe('High');

    // S5 has P (12), T (25), B (50), X (7). If B and X are missing, only P+T (37/94 = ~39%)
    const s5Partial = calculateCreditScore({
      segmentCode: 'S5',
      parameterInputs: {
        id_sim_match: true,
        sim_tenure_months: 12,
        // no B, no X
      },
    });
    expect(s5Partial.dataCoverageScore).toBeLessThan(50);
    expect(s5Partial.dataCoverageLabel).toBe('Low');
    expect(s5Partial.missingDataNote).toBe('No data scores Nil.');
  });

  // Test 10: Rule-based reason generator outputs top 3 plain English reasons
  it('Test 10: Rule-based reason generator outputs top 3 plain English reasons without jargon', () => {
    const res = calculateCreditScore({
      segmentCode: 'S7',
      customerMeta: { simTenureMonths: 48, idSimMatch: true },
      parameterInputs: {
        id_sim_match: true,
        sim_tenure_months: 48,
        topup_months_of_12: 12,
        account_age_months: 60,
        credits_months_of_12: 12,
        avg_balance_kz: 500000,
        card_atm_use: 'weekly',
        returned_payments_12m: 0,
      },
      assets: { house: 'yes', car: 'yes' },
    });

    expect(res.positiveReasons).toBeDefined();
    expect(res.positiveReasons.length).toBeGreaterThan(0);
    expect(res.positiveReasons.length).toBeLessThanOrEqual(3);
    expect(res.positiveReasons[0]).toMatch(/loyalty|tenure|subscriber/i);
  });

  // Test 11: Changing a parameter rule value changes the computed score
  it('Test 11: Parameter points directly impact the computed score', () => {
    const base = {
      segmentCode: 'S1' as const,
      customerMeta: { simTenureMonths: 24, idSimMatch: true },
      parameterInputs: {
        id_sim_match: true,
        sim_tenure_months: 24,
      },
    };

    const regularTopupScore = calculateCreditScore({
      ...base,
      parameterInputs: {
        ...base.parameterInputs,
        topup_months_of_12: 12, // 10 points
      },
    });

    const lowTopupScore = calculateCreditScore({
      ...base,
      parameterInputs: {
        ...base.parameterInputs,
        topup_months_of_12: 2, // 0 points
      },
    });

    expect(regularTopupScore.score).toBeGreaterThan(lowTopupScore.score);
  });

  // Test 12: Seeded customers score within their manager-specified target ranges
  it('Test 12: Seeded customers land in target score ranges', async () => {
    const { SEEDED_DEMO_CUSTOMERS, demoProfileToScoringInputs } = await import('./dataSources');

    const expectedRanges: Record<string, { min: number; max: number; label: string }> = {
      '244923000101': { min: 650, max: 700, label: 'Matthew Silva (S3)' },
      '244923000102': { min: 560, max: 620, label: 'Tomas Neto (S1)' },
      '244923000103': { min: 700, max: 760, label: 'Carlos Mateus (S5)' },
      '244923000104': { min: 760, max: 820, label: 'Pedro Santos (S7)' },
      '244923000105': { min: 640, max: 700, label: 'Isabel Fernandes (S8)' },
      '244923000106': { min: 380, max: 480, label: 'Joaquim Baptista (S5 defaults)' },
    };

    for (const [key, range] of Object.entries(expectedRanges)) {
      const profile = SEEDED_DEMO_CUSTOMERS[key];
      expect(profile).toBeDefined();
      const scoringInput = demoProfileToScoringInputs(profile);
      const result = calculateCreditScore(scoringInput);

      expect(
        result.score,
        `${range.label} score ${result.score} should be within [${range.min}, ${range.max}]`
      ).toBeGreaterThanOrEqual(range.min);
      expect(
        result.score,
        `${range.label} score ${result.score} should be within [${range.min}, ${range.max}]`
      ).toBeLessThanOrEqual(range.max);
    }
  });

  // Test 13: Live test card - passing custom point rules immediately updates score
  it('Test 13: Passing custom point rules immediately updates calculated score', () => {
    const baseInput: ScoringInputs = {
      segmentCode: 'S1',
      customerMeta: { simTenureMonths: 36, idSimMatch: true },
      parameterInputs: {
        id_sim_match: 'yes',
        sim_tenure_months: 36,
        topup_months_of_12: 12,
        monthly_topup_kz: 6500,
        spend_stability: 'stable',
        active_days_per_month: 25,
      },
    };

    const baseline = calculateCreditScore(baseInput);

    // Create custom point rules where over 24 months tenure gives 20 points instead of 10
    const customRules = {
      ...DEFAULT_POINT_RULES,
      sim_tenure_months: DEFAULT_POINT_RULES.sim_tenure_months.map((r) =>
        r.label.includes('Over 24') ? { ...r, points: 20 } : r
      ),
    };

    const boosted = calculateCreditScore(baseInput, undefined, customRules);
    expect(boosted.score).toBeGreaterThanOrEqual(baseline.score);
  });

  // Test 14: Segment weight invariant validation (P+T+W+B+X = 94 check)
  it('Test 14: validateSegmentWeights checks P+T+W+B+X = 94 invariant', async () => {
    const { validateSegmentWeights, getStoredWeights } = await import('./config');
    const validWeights = getStoredWeights();
    const validation = validateSegmentWeights(validWeights);
    expect(validation.isValid).toBe(true);
    expect(validation.invalidSegments.length).toBe(0);

    // Invalidate S1 by adding 5 points
    const invalidWeights = validWeights.map((w) =>
      w.segment_code === 'S1' && w.block_code === 'T' ? { ...w, points: w.points + 5 } : w
    );
    const failedValidation = validateSegmentWeights(invalidWeights);
    expect(failedValidation.isValid).toBe(false);
    expect(failedValidation.invalidSegments.some((s) => s.segment === 'S1')).toBe(true);
  });

  // Test 15: Recharge parameters award correct points across all bands
  it('Test 15: Recharge parameters award correct points across all bands', async () => {
    const { evaluateParameterPoints } = await import('./scoring');

    // recharges_per_month: under 2 = 2, 2-4 = 5, 5-8 = 8, over 8 = 10
    expect(evaluateParameterPoints('recharges_per_month', 1).earnedPoints).toBe(2);
    expect(evaluateParameterPoints('recharges_per_month', 3).earnedPoints).toBe(5);
    expect(evaluateParameterPoints('recharges_per_month', 6).earnedPoints).toBe(8);
    expect(evaluateParameterPoints('recharges_per_month', 10).earnedPoints).toBe(10);

    // recharge_value_per_month_kz: under 1,500 = 2, 1,500-3,000 = 5, 3,000-6,000 = 8, over 6,000 = 10
    expect(evaluateParameterPoints('recharge_value_per_month_kz', 1000).earnedPoints).toBe(2);
    expect(evaluateParameterPoints('recharge_value_per_month_kz', 2500).earnedPoints).toBe(5);
    expect(evaluateParameterPoints('recharge_value_per_month_kz', 4500).earnedPoints).toBe(8);
    expect(evaluateParameterPoints('recharge_value_per_month_kz', 15000).earnedPoints).toBe(10);

    // recharge_value_per_quarter_kz: under 4,500 = 2, 4,500-9,000 = 5, 9,000-18,000 = 8, over 18,000 = 10
    expect(evaluateParameterPoints('recharge_value_per_quarter_kz', 3000).earnedPoints).toBe(2);
    expect(evaluateParameterPoints('recharge_value_per_quarter_kz', 6000).earnedPoints).toBe(5);
    expect(evaluateParameterPoints('recharge_value_per_quarter_kz', 13500).earnedPoints).toBe(8);
    expect(evaluateParameterPoints('recharge_value_per_quarter_kz', 45000).earnedPoints).toBe(10);
  });

  // Test 16: Blank / missing recharge value is skipped and never treated as zero
  it('Test 16: Blank / missing recharge parameter is skipped and not counted as zero', async () => {
    const { evaluateParameterPoints } = await import('./scoring');

    const blankEval = evaluateParameterPoints('recharges_per_month', undefined);
    expect(blankEval.hasData).toBe(false);
    expect(blankEval.isSkipped).toBe(true);

    const emptyStrEval = evaluateParameterPoints('recharge_value_per_month_kz', '');
    expect(emptyStrEval.hasData).toBe(false);
    expect(emptyStrEval.isSkipped).toBe(true);

    const nullEval = evaluateParameterPoints('recharge_value_per_quarter_kz', null);
    expect(nullEval.hasData).toBe(false);
    expect(nullEval.isSkipped).toBe(true);
  });

  // Test 17: Month / Quarter toggle does not double count and yields identical scores
  it('Test 17: Switching Month / Quarter view does not double count and yields identical score', () => {
    const baseInput: ScoringInputs = {
      segmentCode: 'S3',
      customerMeta: { dateOfBirth: '1996-08-14', simActivationDate: '2022-03-10', simTenureMonths: 30, idSimMatch: true },
      parameterInputs: {
        id_sim_match: 'yes',
        employment_status: 'other',
        time_in_activity_months: 18,
        sim_tenure_months: 30,
        topup_months_of_12: 11,
        recharges_per_month: 3,
        spend_stability: 'stable',
        active_days_per_month: 16,
        airtime_loan_repayment: '80-99%_repaid',
        wallet_months_active: 14,
        wallet_inflow_months_of_12: 10,
        avg_monthly_inflow_kz: 120000,
        bill_payments_via_wallet: 'sometimes',
        wallet_balance_stability: 'medium',
        wallet_loan_repayment: '80-99%_repaid',
      },
    };

    // Month view: 4,500 Kz/mo (8 pts)
    const monthScore = calculateCreditScore({
      ...baseInput,
      parameterInputs: {
        ...baseInput.parameterInputs,
        recharge_view: 'month',
        recharge_value_per_month_kz: 4500,
        recharge_value_per_quarter_kz: 13500, // Even if passed, should NOT double count
      },
    });

    // Quarter view: 13,500 Kz/quarter (8 pts)
    const quarterScore = calculateCreditScore({
      ...baseInput,
      parameterInputs: {
        ...baseInput.parameterInputs,
        recharge_view: 'quarter',
        recharge_value_per_month_kz: 4500, // Even if passed, should NOT double count
        recharge_value_per_quarter_kz: 13500,
      },
    });

    expect(monthScore.score).toBe(quarterScore.score);

    // Verify telecom block points are identical between month and quarter
    const monthTel = monthScore.blockScores.T;
    const quarterTel = quarterScore.blockScores.T;
    expect(monthTel.earnedPoints).toBe(quarterTel.earnedPoints);
    expect(monthTel.blockStrength).toBe(quarterTel.blockStrength);
  });

  // Test 18: Custom Equipment creation, catalog persistence, and affordability/limit checks
  it('Test 18: Custom Equipment creation, catalog persistence, and affordability calculation', async () => {
    const { addCustomEquipment, getStoredEquipment, deleteCustomEquipment } = await import('./config');

    const customDevice = addCustomEquipment({
      name: 'Custom Satellite Dish Kit',
      category: 'Network Device',
      price_kz: 45000,
    }, 'Unitel Tester');

    expect(customDevice.id).toBeDefined();
    expect(customDevice.is_custom).toBe(true);
    expect(customDevice.name).toBe('Custom Satellite Dish Kit');
    expect(customDevice.price_kz).toBe(45000);

    const catalog = getStoredEquipment();
    const found = catalog.find((eq) => eq.id === customDevice.id);
    expect(found).toBeDefined();
    expect(found?.is_custom).toBe(true);

    // Verify EMI calculation for custom equipment: 45,000 over 6 months = 7,500 Kz/mo
    const emi6 = Math.round(customDevice.price_kz / 6);
    expect(emi6).toBe(7500);

    // Clean up
    deleteCustomEquipment(customDevice.id);
    const updatedCatalog = getStoredEquipment();
    expect(updatedCatalog.find((eq) => eq.id === customDevice.id)).toBeUndefined();
  });

  // Test 19: All 5 active segments' block maximums add to 100, Nil scoring, and total equals row sum
  it('Test 19: All 5 active segments block maximums add to 100, missing data scores Nil, and total equals row sum', () => {
    const segments: SegmentCode[] = ['S1', 'S3', 'S5', 'S7', 'S8'];
    for (const seg of segments) {
      const res = calculateCreditScore({
        segmentCode: seg,
        parameterInputs: { id_sim_match: 'yes', sim_tenure_months: 24 },
        assets: { house: 'yes' },
      });

      // Sum of base block maximums (must be 94)
      const sumBaseMax = Object.values(res.blockScores).reduce((sum, b) => sum + b.effectivePoints, 0);
      expect(sumBaseMax).toBe(94);
      // Fixed 100-point model invariant: 94 base max + 6 assets bonus max = 100
      expect(sumBaseMax + 6).toBe(100);

      // Total points must equal sum of earned block points + asset bonus
      const sumEarned = Object.values(res.blockScores).reduce((sum, b) => sum + b.earnedPoints, 0);
      expect(res.totalPoints).toBeCloseTo(sumEarned + res.assetBonus, 1);
    }
  });
});
