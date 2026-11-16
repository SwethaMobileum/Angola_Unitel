import { describe, it, expect } from 'vitest';
import {
  calculateCreditScore,
  ScoringInputs,
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
    expect(resultOff.blockScores.W.effectivePoints).toBe(0);
    // W points (42) must have moved to T (40 + 42 = 82)
    expect(resultOff.blockScores.T.effectivePoints).toBe(82);
    expect(resultOff.blockScores.P.effectivePoints).toBe(12);
    // Base points sum must still be 94 (82 + 12 = 94)
    expect(resultOff.blockScores.T.effectivePoints + resultOff.blockScores.P.effectivePoints).toBe(94);
    // Total points must never exceed 100
    expect(resultOff.totalPoints).toBeLessThanOrEqual(100);
    // Confidence is lower when primary wallet channel is switched off
    expect(resultOff.dataConfidence).toBe('medium');
    // Redistribution record present
    const wRedistribution = resultOff.redistributions.find(r => r.fromBlock === 'W' && r.toBlock === 'T');
    expect(wRedistribution).toBeDefined();
    expect(wRedistribution?.points).toBe(42);
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

    // Bank block is detected as having no data
    expect(result.blockScores.B.hasData).toBe(false);
    expect(result.blockScores.B.earnedPoints).toBe(0);

    // Bank's 50 points were moved to the active behavioral block (T)
    // T originally has 25 pts, now has 25 + 50 = 75 pts
    expect(result.blockScores.T.effectivePoints).toBe(75);
    const sumEffective = Object.values(result.blockScores).reduce((s, b) => s + b.effectivePoints, 0);
    expect(sumEffective).toBe(94);

    // Customer achieves a valid score based on available data, not penalized to zero
    expect(result.score).toBeGreaterThanOrEqual(550);
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
});
