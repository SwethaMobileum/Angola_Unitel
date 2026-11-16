import { Evaluation, Customer, SegmentCode } from '../types';
import { calculateCreditScore } from './scoring';
import { SAMPLE_CUSTOMERS } from '../data/seedData';

const STORAGE_KEY_EVALUATIONS = 'unitel_credit_evaluations_v1';
const STORAGE_KEY_DRAFT = 'unitel_credit_eval_draft_v1';

// Benchmark Seed Evaluations for S1, S3, and S7
function createSeedEvaluations(): Evaluation[] {
  // S1 Persona: João Manuel Baptista (Cash-only, 30m SIM)
  const custS1: Customer = SAMPLE_CUSTOMERS[0];
  const s1Result = calculateCreditScore({
    segmentCode: 'S1',
    customerMeta: {
      simTenureMonths: 30,
      idSimMatch: true,
      dateOfBirth: custS1.date_of_birth,
    },
    parameterInputs: {
      id_sim_match: true,
      age_band: '36-55',
      region: 'rural',
      sim_tenure_months: 30,
      topup_regularity_months: 11,
      topup_avg_amount_kz: 2500,
      arpu_stability: 'stable',
      usage_consistency: 'consistent',
      airtime_loan_repayment: '100%_repaid',
      device_type: 'button_phone',
    },
    assets: { house: 'yes', land_title: 'no', two_wheeler: 'no', car: 'no' },
    incomeBandCode: 2, // Low / Min wage (50k-100k Kz)
  });

  const evalS1: Evaluation = {
    id: 'eval-seed-001',
    customer_id: custS1.id,
    analyst_id: '00000000-0000-0000-0000-000000000001',
    segment_code: 'S1',
    segment_overridden: false,
    config_version_id: 'v1.0-default',
    wallet_available: false,
    income_band_code: 2,
    income_source: 'estimated',
    status: 'scored',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    customer: custS1,
    results: {
      evaluation_id: 'eval-seed-001',
      block_points: {
        P: { rawPoints: s1Result.blockScores.P.basePoints, earnedPoints: s1Result.blockScores.P.earnedPoints, availableParams: s1Result.blockScores.P.availableParamsCount },
        T: { rawPoints: s1Result.blockScores.T.basePoints, earnedPoints: s1Result.blockScores.T.earnedPoints, availableParams: s1Result.blockScores.T.availableParamsCount },
        W: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        B: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        X: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        A: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
      },
      asset_bonus: s1Result.assetBonus,
      total_points: s1Result.totalPoints,
      score: s1Result.score,
      band_label: s1Result.scoreBand.label,
      confidence: s1Result.dataConfidence,
      overlay_flags: s1Result.overlayFlags.map(f => ({ ruleKey: f.ruleKey, action: f.action, note: f.note })),
      reasons: s1Result.positiveReasons,
      limit_kz: s1Result.limitKz,
      limit_cap_applied: s1Result.limitCapApplied,
      score_version: s1Result.scoreVersion,
      computed_at: s1Result.computedAt,
    },
  };

  // S3 Persona: Esperança Teresa Domingos (Unbanked, Wallet App)
  const custS3: Customer = SAMPLE_CUSTOMERS[1];
  const s3Result = calculateCreditScore({
    segmentCode: 'S3',
    walletAvailable: true,
    customerMeta: {
      simTenureMonths: 20,
      idSimMatch: true,
      dateOfBirth: custS3.date_of_birth,
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
    assets: { house: 'no', land_title: 'no', two_wheeler: 'yes', car: 'no' },
    incomeBandCode: 3, // Lower-middle
  });

  const evalS3: Evaluation = {
    id: 'eval-seed-002',
    customer_id: custS3.id,
    analyst_id: '00000000-0000-0000-0000-000000000001',
    segment_code: 'S3',
    segment_overridden: false,
    config_version_id: 'v1.0-default',
    wallet_available: true,
    income_band_code: 3,
    income_source: 'stated',
    status: 'scored',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    customer: custS3,
    results: {
      evaluation_id: 'eval-seed-002',
      block_points: {
        P: { rawPoints: s3Result.blockScores.P.basePoints, earnedPoints: s3Result.blockScores.P.earnedPoints, availableParams: s3Result.blockScores.P.availableParamsCount },
        T: { rawPoints: s3Result.blockScores.T.basePoints, earnedPoints: s3Result.blockScores.T.earnedPoints, availableParams: s3Result.blockScores.T.availableParamsCount },
        W: { rawPoints: s3Result.blockScores.W.basePoints, earnedPoints: s3Result.blockScores.W.earnedPoints, availableParams: s3Result.blockScores.W.availableParamsCount },
        B: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        X: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        A: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
      },
      asset_bonus: s3Result.assetBonus,
      total_points: s3Result.totalPoints,
      score: s3Result.score,
      band_label: s3Result.scoreBand.label,
      confidence: s3Result.dataConfidence,
      overlay_flags: s3Result.overlayFlags.map(f => ({ ruleKey: f.ruleKey, action: f.action, note: f.note })),
      reasons: s3Result.positiveReasons,
      limit_kz: s3Result.limitKz,
      limit_cap_applied: s3Result.limitCapApplied,
      score_version: s3Result.scoreVersion,
      computed_at: s3Result.computedAt,
    },
  };

  // S7 Persona: Dr. Paulo Henrique Afonso (Salaried Formal, Bank Payroll)
  const custS7: Customer = SAMPLE_CUSTOMERS[2];
  const s7Result = calculateCreditScore({
    segmentCode: 'S7',
    walletAvailable: true,
    customerMeta: {
      simTenureMonths: 60,
      idSimMatch: true,
      dateOfBirth: custS7.date_of_birth,
    },
    parameterInputs: {
      id_sim_match: true,
      age_band: '36-55',
      employer_type: 'government',
      time_in_job_months: 84,
      sim_tenure_months: 60,
      topup_regularity_months: 12,
      arpu_stability: 'growing',
      wallet_inflow_regularity: 'regular',
      regular_credits_months: 12,
      salary_amount_band: 'above_500k',
      existing_loan_deductions_kz: 0,
      avg_balance_kz: 450000,
      returned_payments_12m: 0,
      credit_register_flag: 'clear',
      nif_standing: 'active_good',
      inss_record: true,
    },
    assets: { house: 'yes', land_title: 'yes', two_wheeler: 'no', car: 'yes' },
    incomeBandCode: 5, // Upper (500k-1M Kz)
    statedIncomeKz: 750000,
  });

  const evalS7: Evaluation = {
    id: 'eval-seed-003',
    customer_id: custS7.id,
    analyst_id: '00000000-0000-0000-0000-000000000001',
    segment_code: 'S7',
    segment_overridden: false,
    config_version_id: 'v1.0-default',
    wallet_available: true,
    income_band_code: 5,
    income_source: 'stated',
    status: 'scored',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    customer: custS7,
    results: {
      evaluation_id: 'eval-seed-003',
      block_points: {
        P: { rawPoints: s7Result.blockScores.P.basePoints, earnedPoints: s7Result.blockScores.P.earnedPoints, availableParams: s7Result.blockScores.P.availableParamsCount },
        T: { rawPoints: s7Result.blockScores.T.basePoints, earnedPoints: s7Result.blockScores.T.earnedPoints, availableParams: s7Result.blockScores.T.availableParamsCount },
        W: { rawPoints: s7Result.blockScores.W.basePoints, earnedPoints: s7Result.blockScores.W.earnedPoints, availableParams: s7Result.blockScores.W.availableParamsCount },
        B: { rawPoints: s7Result.blockScores.B.basePoints, earnedPoints: s7Result.blockScores.B.earnedPoints, availableParams: s7Result.blockScores.B.availableParamsCount },
        X: { rawPoints: s7Result.blockScores.X.basePoints, earnedPoints: s7Result.blockScores.X.earnedPoints, availableParams: s7Result.blockScores.X.availableParamsCount },
        A: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
      },
      asset_bonus: s7Result.assetBonus,
      total_points: s7Result.totalPoints,
      score: s7Result.score,
      band_label: s7Result.scoreBand.label,
      confidence: s7Result.dataConfidence,
      overlay_flags: s7Result.overlayFlags.map(f => ({ ruleKey: f.ruleKey, action: f.action, note: f.note })),
      reasons: s7Result.positiveReasons,
      limit_kz: s7Result.limitKz,
      limit_cap_applied: s7Result.limitCapApplied,
      score_version: s7Result.scoreVersion,
      computed_at: s7Result.computedAt,
    },
  };

  return [evalS1, evalS3, evalS7];
}

export function getStoredEvaluations(): Evaluation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVALUATIONS);
    if (!raw) {
      const seed = createSeedEvaluations();
      localStorage.setItem(STORAGE_KEY_EVALUATIONS, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load evaluations from storage', err);
    return createSeedEvaluations();
  }
}

export function saveEvaluation(evaluation: Evaluation): void {
  try {
    const current = getStoredEvaluations();
    const existingIndex = current.findIndex(e => e.id === evaluation.id);
    if (existingIndex >= 0) {
      current[existingIndex] = evaluation;
    } else {
      current.unshift(evaluation);
    }
    localStorage.setItem(STORAGE_KEY_EVALUATIONS, JSON.stringify(current));
  } catch (err) {
    console.warn('Failed to save evaluation', err);
  }
}

export interface EvaluationDraft {
  step: number;
  customer: {
    fullName: string;
    email?: string;
    msisdn: string;
    nationalId: string;
    dateOfBirth: string;
    simActivationDate: string;
  };
  eligibility: {
    isAgeValid: boolean;
    isIdMatch: boolean;
    age: number;
    simTenureMonths: number;
  };
  segment: {
    resolvedCode: SegmentCode;
    isOverridden: boolean;
    overrideCode?: SegmentCode;
    overrideReason?: string;
    questionAnswers: Record<number, boolean>;
  };
  walletAvailable: boolean;
  parameterInputs: Record<string, any>;
  assets: {
    house?: 'yes' | 'no' | 'skip';
    land_title?: 'yes' | 'no' | 'skip';
    two_wheeler?: 'yes' | 'no' | 'skip';
    car?: 'yes' | 'no' | 'skip';
  };
  incomeBandCode?: number;
  statedIncomeKz?: number;
  updatedAt: string;
}

export function getSavedDraft(): EvaluationDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFT);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveDraft(draft: EvaluationDraft): void {
  try {
    draft.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(draft));
  } catch (err) {
    console.warn('Failed to save draft', err);
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_DRAFT);
  } catch {}
}
