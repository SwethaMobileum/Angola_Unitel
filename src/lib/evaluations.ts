import { Evaluation, Customer, SegmentCode } from '../types';
import { calculateCreditScore } from './scoring';
import { SAMPLE_CUSTOMERS } from '../data/seedData';
import { syncApi } from './syncClient';
import { syncEvaluationToSupabase } from './supabaseSync';

const STORAGE_KEY_EVALUATIONS = 'unitel_credit_evaluations_v2';
const STORAGE_KEY_DRAFT = 'unitel_credit_eval_draft_v2';

// Benchmark Seed Evaluations for S1, S3, and S7
export function createSeedEvaluations(): Evaluation[] {
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

  // S1 High Risk: Mateus Kiala (Thin File, Recent SIM Swap)
  const custMateus: Customer = SAMPLE_CUSTOMERS[3];
  const mateusResult = calculateCreditScore({
    segmentCode: 'S1',
    customerMeta: {
      simTenureMonths: 2,
      idSimMatch: true,
      dateOfBirth: custMateus.date_of_birth,
      simSwapDaysAgo: 12,
    },
    parameterInputs: {
      id_sim_match: true,
      age_band: '18-24',
      region: 'luanda_peri_urban',
      sim_tenure_months: 2,
      topup_regularity_months: 2,
      topup_avg_amount_kz: 1000,
      arpu_stability: 'erratic',
      usage_consistency: 'irregular',
      airtime_loan_repayment: 'defaulted_often',
      device_type: 'button_phone',
    },
    assets: { house: 'no', land_title: 'no', two_wheeler: 'no', car: 'no' },
    incomeBandCode: 1,
  });

  const evalMateus: Evaluation = {
    id: 'eval-seed-004',
    customer_id: custMateus.id,
    analyst_id: '00000000-0000-0000-0000-000000000001',
    segment_code: 'S1',
    segment_overridden: false,
    config_version_id: 'v1.0-default',
    wallet_available: false,
    income_band_code: 1,
    income_source: 'estimated',
    status: 'scored',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    customer: custMateus,
    results: {
      evaluation_id: 'eval-seed-004',
      block_points: {
        P: { rawPoints: mateusResult.blockScores.P.basePoints, earnedPoints: mateusResult.blockScores.P.earnedPoints, availableParams: mateusResult.blockScores.P.availableParamsCount },
        T: { rawPoints: mateusResult.blockScores.T.basePoints, earnedPoints: mateusResult.blockScores.T.earnedPoints, availableParams: mateusResult.blockScores.T.availableParamsCount },
        W: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        B: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        X: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        A: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
      },
      asset_bonus: mateusResult.assetBonus,
      total_points: mateusResult.totalPoints,
      score: mateusResult.score,
      band_label: mateusResult.scoreBand.label,
      confidence: mateusResult.dataConfidence,
      overlay_flags: mateusResult.overlayFlags.map(f => ({ ruleKey: f.ruleKey, action: f.action, note: f.note })),
      reasons: ['Short network tenure (< 6 months) triggers starter cap.'],
      limit_kz: mateusResult.limitKz,
      limit_cap_applied: mateusResult.limitCapApplied,
      score_version: mateusResult.scoreVersion,
      computed_at: mateusResult.computedAt,
    },
  };

  // S8 Persona: Rosa Maria Bernardo (Informal Trader)
  const custRosa: Customer = SAMPLE_CUSTOMERS[4];
  const rosaResult = calculateCreditScore({
    segmentCode: 'S8',
    walletAvailable: true,
    customerMeta: {
      simTenureMonths: 42,
      idSimMatch: true,
      dateOfBirth: custRosa.date_of_birth,
    },
    parameterInputs: {
      id_sim_match: true,
      age_band: '25-35',
      region: 'luanda_urban',
      business_type: 'retail_food',
      time_in_job_months: 36,
      topup_regularity_months: 11,
      arpu_stability: 'stable',
      usage_consistency: 'consistent',
      merchant_qr_receipts_kz: 120000,
      wallet_inflow_regularity: 'regular',
      wallet_loan_repayment: 'on_time',
      business_licence: 'municipal_receipt',
      utility_bills_paid: 6,
    },
    assets: { house: 'no', land_title: 'no', two_wheeler: 'no', car: 'no' },
    incomeBandCode: 2,
  });

  const evalRosa: Evaluation = {
    id: 'eval-seed-005',
    customer_id: custRosa.id,
    analyst_id: '00000000-0000-0000-0000-000000000001',
    segment_code: 'S8',
    segment_overridden: false,
    config_version_id: 'v1.0-default',
    wallet_available: true,
    income_band_code: 2,
    income_source: 'stated',
    status: 'scored',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    customer: custRosa,
    results: {
      evaluation_id: 'eval-seed-005',
      block_points: {
        P: { rawPoints: rosaResult.blockScores.P.basePoints, earnedPoints: rosaResult.blockScores.P.earnedPoints, availableParams: rosaResult.blockScores.P.availableParamsCount },
        T: { rawPoints: rosaResult.blockScores.T.basePoints, earnedPoints: rosaResult.blockScores.T.earnedPoints, availableParams: rosaResult.blockScores.T.availableParamsCount },
        W: { rawPoints: rosaResult.blockScores.W.basePoints, earnedPoints: rosaResult.blockScores.W.earnedPoints, availableParams: rosaResult.blockScores.W.availableParamsCount },
        B: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        X: { rawPoints: rosaResult.blockScores.X.basePoints, earnedPoints: rosaResult.blockScores.X.earnedPoints, availableParams: rosaResult.blockScores.X.availableParamsCount },
        A: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
      },
      asset_bonus: rosaResult.assetBonus,
      total_points: rosaResult.totalPoints,
      score: rosaResult.score,
      band_label: rosaResult.scoreBand.label,
      confidence: rosaResult.dataConfidence,
      overlay_flags: rosaResult.overlayFlags.map(f => ({ ruleKey: f.ruleKey, action: f.action, note: f.note })),
      reasons: rosaResult.positiveReasons,
      limit_kz: rosaResult.limitKz,
      limit_cap_applied: rosaResult.limitCapApplied,
      score_version: rosaResult.scoreVersion,
      computed_at: rosaResult.computedAt,
    },
  };

  // S5 Persona: Alberto Sebastião (Banked, branch and ATM user)
  const custAlberto: Customer = SAMPLE_CUSTOMERS[5];
  const albertoResult = calculateCreditScore({
    segmentCode: 'S5',
    walletAvailable: false,
    customerMeta: {
      simTenureMonths: 34,
      idSimMatch: true,
      dateOfBirth: custAlberto.date_of_birth,
    },
    parameterInputs: {
      id_sim_match: true,
      age_band: '36-55',
      region: 'benguela',
      employment_type: 'private_formal',
      sim_tenure_months: 34,
      topup_regularity_months: 11,
      arpu_stability: 'stable',
      account_age_months: 36,
      regular_credits_months: 10,
      avg_balance_kz: 180000,
      card_atm_pos_use: 'frequent',
      loan_repayment_history: 'good',
      returned_payments_12m: 0,
      credit_register_flag: 'clear',
    },
    assets: { house: 'yes', land_title: 'no', two_wheeler: 'no', car: 'no' },
    incomeBandCode: 3,
  });

  const evalAlberto: Evaluation = {
    id: 'eval-seed-006',
    customer_id: custAlberto.id,
    analyst_id: '00000000-0000-0000-0000-000000000001',
    segment_code: 'S5',
    segment_overridden: false,
    config_version_id: 'v1.0-default',
    wallet_available: false,
    income_band_code: 3,
    income_source: 'stated',
    status: 'scored',
    created_at: new Date(Date.now() - 1.2 * 86400000).toISOString(),
    customer: custAlberto,
    results: {
      evaluation_id: 'eval-seed-006',
      block_points: {
        P: { rawPoints: albertoResult.blockScores.P.basePoints, earnedPoints: albertoResult.blockScores.P.earnedPoints, availableParams: albertoResult.blockScores.P.availableParamsCount },
        T: { rawPoints: albertoResult.blockScores.T.basePoints, earnedPoints: albertoResult.blockScores.T.earnedPoints, availableParams: albertoResult.blockScores.T.availableParamsCount },
        W: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        B: { rawPoints: albertoResult.blockScores.B.basePoints, earnedPoints: albertoResult.blockScores.B.earnedPoints, availableParams: albertoResult.blockScores.B.availableParamsCount },
        X: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        A: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
      },
      asset_bonus: albertoResult.assetBonus,
      total_points: albertoResult.totalPoints,
      score: albertoResult.score,
      band_label: albertoResult.scoreBand.label,
      confidence: albertoResult.dataConfidence,
      overlay_flags: albertoResult.overlayFlags.map(f => ({ ruleKey: f.ruleKey, action: f.action, note: f.note })),
      reasons: albertoResult.positiveReasons,
      limit_kz: albertoResult.limitKz,
      limit_cap_applied: albertoResult.limitCapApplied,
      score_version: albertoResult.scoreVersion,
      computed_at: albertoResult.computedAt,
    },
  };

  // S6 Persona: Teresa de Jesus Neto (Banked digital, hybrid)
  const custTeresa: Customer = SAMPLE_CUSTOMERS[6];
  const teresaResult = calculateCreditScore({
    segmentCode: 'S6',
    walletAvailable: true,
    customerMeta: {
      simTenureMonths: 28,
      idSimMatch: true,
      dateOfBirth: custTeresa.date_of_birth,
    },
    parameterInputs: {
      id_sim_match: true,
      age_band: '25-35',
      region: 'luanda_urban',
      sim_tenure_months: 28,
      topup_regularity_months: 12,
      arpu_stability: 'growing',
      data_bundles_per_month: 6,
      device_type: 'smartphone',
      express_kwik_activity: 'weekly',
      account_age_months: 24,
      avg_balance_kz: 210000,
    },
    assets: { house: 'no', land_title: 'no', two_wheeler: 'no', car: 'no' },
    incomeBandCode: 3,
  });

  const evalTeresa: Evaluation = {
    id: 'eval-seed-007',
    customer_id: custTeresa.id,
    analyst_id: '00000000-0000-0000-0000-000000000001',
    segment_code: 'S6',
    segment_overridden: false,
    config_version_id: 'v1.0-default',
    wallet_available: true,
    income_band_code: 3,
    income_source: 'estimated',
    status: 'scored',
    created_at: new Date(Date.now() - 0.5 * 86400000).toISOString(),
    customer: custTeresa,
    results: {
      evaluation_id: 'eval-seed-007',
      block_points: {
        P: { rawPoints: teresaResult.blockScores.P.basePoints, earnedPoints: teresaResult.blockScores.P.earnedPoints, availableParams: teresaResult.blockScores.P.availableParamsCount },
        T: { rawPoints: teresaResult.blockScores.T.basePoints, earnedPoints: teresaResult.blockScores.T.earnedPoints, availableParams: teresaResult.blockScores.T.availableParamsCount },
        W: { rawPoints: teresaResult.blockScores.W.basePoints, earnedPoints: teresaResult.blockScores.W.earnedPoints, availableParams: teresaResult.blockScores.W.availableParamsCount },
        B: { rawPoints: teresaResult.blockScores.B.basePoints, earnedPoints: teresaResult.blockScores.B.earnedPoints, availableParams: teresaResult.blockScores.B.availableParamsCount },
        X: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        A: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
      },
      asset_bonus: teresaResult.assetBonus,
      total_points: teresaResult.totalPoints,
      score: teresaResult.score,
      band_label: teresaResult.scoreBand.label,
      confidence: teresaResult.dataConfidence,
      overlay_flags: teresaResult.overlayFlags.map(f => ({ ruleKey: f.ruleKey, action: f.action, note: f.note })),
      reasons: teresaResult.positiveReasons,
      limit_kz: teresaResult.limitKz,
      limit_cap_applied: teresaResult.limitCapApplied,
      score_version: teresaResult.scoreVersion,
      computed_at: teresaResult.computedAt,
    },
  };

  // S2 Persona: Manuel António da Silva (Button phone with USSD wallet)
  const custManuel: Customer = SAMPLE_CUSTOMERS[7];
  const manuelResult = calculateCreditScore({
    segmentCode: 'S2',
    walletAvailable: true,
    customerMeta: {
      simTenureMonths: 46,
      idSimMatch: true,
      dateOfBirth: custManuel.date_of_birth,
    },
    parameterInputs: {
      id_sim_match: true,
      age_band: '25-35',
      region: 'huambo',
      sim_tenure_months: 46,
      topup_regularity_months: 12,
      arpu_stability: 'stable',
      device_type: 'button_phone',
      wallet_level: 'ussd_active',
      wallet_inflow_regularity: 'regular',
      cash_in_out_per_month: 4,
      p2p_per_month: 6,
    },
    assets: { house: 'yes', land_title: 'no', two_wheeler: 'yes', car: 'no' },
    incomeBandCode: 2,
  });

  const evalManuel: Evaluation = {
    id: 'eval-seed-008',
    customer_id: custManuel.id,
    analyst_id: '00000000-0000-0000-0000-000000000001',
    segment_code: 'S2',
    segment_overridden: false,
    config_version_id: 'v1.0-default',
    wallet_available: true,
    income_band_code: 2,
    income_source: 'estimated',
    status: 'scored',
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    customer: custManuel,
    results: {
      evaluation_id: 'eval-seed-008',
      block_points: {
        P: { rawPoints: manuelResult.blockScores.P.basePoints, earnedPoints: manuelResult.blockScores.P.earnedPoints, availableParams: manuelResult.blockScores.P.availableParamsCount },
        T: { rawPoints: manuelResult.blockScores.T.basePoints, earnedPoints: manuelResult.blockScores.T.earnedPoints, availableParams: manuelResult.blockScores.T.availableParamsCount },
        W: { rawPoints: manuelResult.blockScores.W.basePoints, earnedPoints: manuelResult.blockScores.W.earnedPoints, availableParams: manuelResult.blockScores.W.availableParamsCount },
        B: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        X: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        A: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
      },
      asset_bonus: manuelResult.assetBonus,
      total_points: manuelResult.totalPoints,
      score: manuelResult.score,
      band_label: manuelResult.scoreBand.label,
      confidence: manuelResult.dataConfidence,
      overlay_flags: manuelResult.overlayFlags.map(f => ({ ruleKey: f.ruleKey, action: f.action, note: f.note })),
      reasons: manuelResult.positiveReasons,
      limit_kz: manuelResult.limitKz,
      limit_cap_applied: manuelResult.limitCapApplied,
      score_version: manuelResult.scoreVersion,
      computed_at: manuelResult.computedAt,
    },
  };

  return [evalS1, evalS3, evalS7, evalMateus, evalRosa, evalAlberto, evalTeresa, evalManuel];
}

export function getStoredEvaluations(): Evaluation[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createSeedEvaluations();
    }
    const raw = localStorage.getItem(STORAGE_KEY_EVALUATIONS);
    if (!raw) {
      const seed = createSeedEvaluations();
      localStorage.setItem(STORAGE_KEY_EVALUATIONS, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const seed = createSeedEvaluations();
      localStorage.setItem(STORAGE_KEY_EVALUATIONS, JSON.stringify(seed));
      return seed;
    }
    return parsed;
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
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_EVALUATIONS, JSON.stringify(current));
    }
    // Cross-port sync to shared DB and direct Supabase sync
    syncApi.saveEvaluation(evaluation);
    syncEvaluationToSupabase(evaluation);
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
