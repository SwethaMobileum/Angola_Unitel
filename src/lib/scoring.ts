import {
  BlockCode,
  SegmentCode,
  ScoreBand,
  Parameter,
  SegmentWeight,
} from '../types';
import {
  DEFAULT_WEIGHTS,
  DEFAULT_SCORE_BANDS,
  DEFAULT_INCOME_BANDS,
  DEFAULT_PARAMETERS,
  DEFAULT_FEATURE_FLAGS,
} from '../data/seedData';

export interface ScoringInputs {
  segmentCode: SegmentCode;
  configVersionId?: string;
  walletAvailable?: boolean;
  parameterInputs: Record<string, any>;
  assets?: {
    house?: 'yes' | 'no' | 'skip';
    land_title?: 'yes' | 'no' | 'skip';
    two_wheeler?: 'yes' | 'no' | 'skip';
    car?: 'yes' | 'no' | 'skip';
  };
  incomeBandCode?: number;
  statedIncomeKz?: number;
  equipmentPriceKz?: number;
  termMonths?: number;
  customerMeta?: {
    dateOfBirth?: string;
    simActivationDate?: string;
    simTenureMonths?: number;
    idSimMatch?: boolean;
    lastSimSwapDate?: string;
    simSwapDaysAgo?: number;
  };
}

export interface ParameterScoreDetail {
  key: string;
  label: string;
  blockCode: BlockCode;
  inputValue: any;
  strength: number; // 0.0 .. 1.0
  pointsEarned: number; // live earned points (e.g. 7)
  maxPointsPossible: number; // max points possible for this parameter (e.g. 10)
  weight: number;
  isExcluded: boolean;
  hasValue: boolean;
  matchedBand?: string;
}

export interface BlockScoreDetail {
  blockCode: BlockCode;
  basePoints: number;        // configured points before redistribution
  effectivePoints: number;   // fixed block maximum points (sum of all blocks = 94)
  earnedPoints: number;      // effectivePoints * blockStrength
  blockStrength: number;     // 0.0 .. 1.0 (weighted average of valid parameters)
  hasData: boolean;
  availableParamsCount: number;
  totalConfiguredParams: number;
  status?: 'complete' | 'nil' | 'skipped' | 'not_used';
  parameters: ParameterScoreDetail[];
}

export interface ScoreBandColor {
  bg: string;
  text: string;
  border?: string;
  label?: string;
}

/**
 * Universal Evaluation Colours (Change Request v3)
 * >= 700: DARK green #157A4B (white text)
 * 600 - 699: LIGHT green #8BD3A8 (dark text #0F4A2C for AA contrast)
 * < 600: RED #C8372D (white text)
 */
export function getScoreBandColors(score: number): ScoreBandColor {
  if (score >= 700) {
    return { bg: '#157A4B', text: '#FFFFFF', border: '#0F5B37', label: 'Good' };
  }
  if (score >= 600) {
    return { bg: '#8BD3A8', text: '#0F4A2C', border: '#6BBF8C', label: 'Acceptable' };
  }
  return { bg: '#C8372D', text: '#FFFFFF', border: '#A6261E', label: 'High risk' };
}

export interface RedistributionRecord {
  fromBlock: BlockCode;
  toBlock: BlockCode;
  points: number;
  reason: string;
}

export interface OverlayFlagResult {
  ruleKey: string;
  description: string;
  action: 'stop' | 'cap_starter' | 'hold_review' | 'never_score';
  triggered: boolean;
  note: string;
}

export interface AffordabilityResult {
  monthlyEmiKz: number;
  monthlyIncomeKz: number;
  incomeSource: 'stated' | 'band' | 'spend_proxy' | 'minimum_wage';
  emiSharePct: number;
  maxAllowedSharePct: number;
  isOverCap: boolean;
}

export interface ScoringResult {
  segmentCode: SegmentCode;
  score: number; // 300 .. 900
  totalPoints: number; // 0 .. 100
  basePointsEarned: number; // sum of block earned points
  assetBonus: number; // 0 .. 6
  scoreBand: ScoreBand;
  dataConfidence: 'high' | 'medium' | 'low';
  dataCoverageScore: number; // 0 .. 100%
  dataCoverageLabel: 'High' | 'Medium' | 'Low';
  missingDataNote?: string;
  confidenceReasons: string[];
  blockScores: Record<BlockCode, BlockScoreDetail>;
  redistributions: RedistributionRecord[];
  overlayFlags: OverlayFlagResult[];
  isHardStop: boolean;
  isHoldForReview: boolean;
  isCappedAtStarter: boolean;
  limitKz: number;
  limitCapApplied: string;
  positiveReasons: string[];
  dataGaps: string[];
  scoreVersion: string;
  computedAt: string;
  affordability?: AffordabilityResult;
}

export interface PointRule {
  parameter_key: string;
  option_key?: string;
  min_value?: number;
  max_value?: number;
  label: string;
  points: number;
}

// Canonical Points Table as specified in Section 7 of ANTIGRAVITY CHANGE PROMPT (v2)
export const DEFAULT_POINT_RULES: Record<string, PointRule[]> = {
  // P: Personal & Identity
  id_sim_match: [
    { parameter_key: 'id_sim_match', option_key: 'true', label: 'Match Verified', points: 5 },
    { parameter_key: 'id_sim_match', option_key: 'false', label: 'Mismatch', points: 0 },
    { parameter_key: 'id_sim_match', option_key: 'yes', label: 'Match Verified', points: 5 },
    { parameter_key: 'id_sim_match', option_key: 'no', label: 'Mismatch', points: 0 },
  ],
  employment_status: [
    { parameter_key: 'employment_status', option_key: 'formal_job', label: 'Formal job', points: 5 },
    { parameter_key: 'employment_status', option_key: 'government', label: 'Government', points: 5 },
    { parameter_key: 'employment_status', option_key: 'private_formal', label: 'Private corporate', points: 5 },
    { parameter_key: 'employment_status', option_key: 'self_employed', label: 'Self-employed', points: 4 },
    { parameter_key: 'employment_status', option_key: 'informal_business', label: 'Informal trade', points: 4 },
    { parameter_key: 'employment_status', option_key: 'other', label: 'Other', points: 3 },
  ],
  time_in_activity_months: [
    { parameter_key: 'time_in_activity_months', min_value: 0, max_value: 6, label: '< 6 months', points: 1 },
    { parameter_key: 'time_in_activity_months', min_value: 6, max_value: 24, label: '6–24 months', points: 3 },
    { parameter_key: 'time_in_activity_months', min_value: 24, max_value: 9999, label: '> 24 months', points: 5 },
  ],

  // T: Telecom Behaviour
  sim_tenure_months: [
    { parameter_key: 'sim_tenure_months', min_value: 0, max_value: 3, label: '< 3 months', points: 0 },
    { parameter_key: 'sim_tenure_months', min_value: 3, max_value: 6, label: '3–6 months', points: 2 },
    { parameter_key: 'sim_tenure_months', min_value: 6, max_value: 12, label: '6–12 months', points: 4 },
    { parameter_key: 'sim_tenure_months', min_value: 12, max_value: 24, label: '12–24 months', points: 7 },
    { parameter_key: 'sim_tenure_months', min_value: 24, max_value: 9999, label: '> 24 months', points: 10 },
  ],
  topup_months_of_12: [
    { parameter_key: 'topup_months_of_12', min_value: 0, max_value: 4, label: '0–3 months', points: 0 },
    { parameter_key: 'topup_months_of_12', min_value: 4, max_value: 7, label: '4–6 months', points: 3 },
    { parameter_key: 'topup_months_of_12', min_value: 7, max_value: 10, label: '7–9 months', points: 6 },
    { parameter_key: 'topup_months_of_12', min_value: 10, max_value: 13, label: '10–12 months', points: 10 },
  ],
  recharges_per_month: [
    { parameter_key: 'recharges_per_month', min_value: 0, max_value: 2, label: 'Under 2', points: 2 },
    { parameter_key: 'recharges_per_month', min_value: 2, max_value: 5, label: '2–4', points: 5 },
    { parameter_key: 'recharges_per_month', min_value: 5, max_value: 8.001, label: '5–8', points: 8 },
    { parameter_key: 'recharges_per_month', min_value: 8.001, max_value: 9999, label: 'Over 8', points: 10 },
  ],
  recharge_value_per_month_kz: [
    { parameter_key: 'recharge_value_per_month_kz', min_value: 0, max_value: 1500, label: 'Under 1,500 Kz', points: 2 },
    { parameter_key: 'recharge_value_per_month_kz', min_value: 1500, max_value: 3000, label: '1,500–3,000 Kz', points: 5 },
    { parameter_key: 'recharge_value_per_month_kz', min_value: 3000, max_value: 6000, label: '3,000–6,000 Kz', points: 8 },
    { parameter_key: 'recharge_value_per_month_kz', min_value: 6000, max_value: 999999999, label: 'Over 6,000 Kz', points: 10 },
  ],
  recharge_value_per_quarter_kz: [
    { parameter_key: 'recharge_value_per_quarter_kz', min_value: 0, max_value: 4500, label: 'Under 4,500 Kz', points: 2 },
    { parameter_key: 'recharge_value_per_quarter_kz', min_value: 4500, max_value: 9000, label: '4,500–9,000 Kz', points: 5 },
    { parameter_key: 'recharge_value_per_quarter_kz', min_value: 9000, max_value: 18000, label: '9,000–18,000 Kz', points: 8 },
    { parameter_key: 'recharge_value_per_quarter_kz', min_value: 18000, max_value: 999999999, label: 'Over 18,000 Kz', points: 10 },
  ],
  monthly_topup_kz: [
    { parameter_key: 'monthly_topup_kz', min_value: 0, max_value: 1500, label: '< 1,500 Kz', points: 2 },
    { parameter_key: 'monthly_topup_kz', min_value: 1500, max_value: 3000, label: '1,500–3,000 Kz', points: 5 },
    { parameter_key: 'monthly_topup_kz', min_value: 3000, max_value: 6000, label: '3,000–6,000 Kz', points: 8 },
    { parameter_key: 'monthly_topup_kz', min_value: 6000, max_value: 999999999, label: '> 6,000 Kz', points: 10 },
  ],
  spend_stability: [
    { parameter_key: 'spend_stability', option_key: 'stable', label: 'Stable', points: 10 },
    { parameter_key: 'spend_stability', option_key: 'growing', label: 'Growing', points: 10 },
    { parameter_key: 'spend_stability', option_key: 'true', label: 'Stable', points: 10 },
    { parameter_key: 'spend_stability', option_key: 'some_swings', label: 'Some swings', points: 5 },
    { parameter_key: 'spend_stability', option_key: 'erratic', label: 'Erratic', points: 1 },
    { parameter_key: 'spend_stability', option_key: 'false', label: 'Erratic', points: 1 },
  ],
  active_days_per_month: [
    { parameter_key: 'active_days_per_month', min_value: 0, max_value: 10, label: '< 10 days', points: 2 },
    { parameter_key: 'active_days_per_month', min_value: 10, max_value: 20, label: '10–20 days', points: 6 },
    { parameter_key: 'active_days_per_month', min_value: 20, max_value: 32, label: '> 20 days', points: 10 },
    { parameter_key: 'active_days_per_month', option_key: 'consistent', label: 'Consistent (> 20d)', points: 10 },
    { parameter_key: 'active_days_per_month', option_key: 'moderate', label: 'Moderate (10–20d)', points: 6 },
    { parameter_key: 'active_days_per_month', option_key: 'irregular', label: 'Irregular (< 10d)', points: 2 },
  ],
  airtime_loan_repayment: [
    { parameter_key: 'airtime_loan_repayment', option_key: '100%_repaid', label: '100%', points: 10 },
    { parameter_key: 'airtime_loan_repayment', option_key: '80_99%_repaid', label: '80–99%', points: 7 },
    { parameter_key: 'airtime_loan_repayment', option_key: '80-99%_repaid', label: '80–99%', points: 7 },
    { parameter_key: 'airtime_loan_repayment', option_key: '50_79%_repaid', label: '50–79%', points: 3 },
    { parameter_key: 'airtime_loan_repayment', option_key: '50-79%_repaid', label: '50–79%', points: 3 },
    { parameter_key: 'airtime_loan_repayment', option_key: 'under_50%', label: 'Under 50%', points: 0 },
    { parameter_key: 'airtime_loan_repayment', option_key: 'under_50%_repaid', label: 'Under 50%', points: 0 },
    { parameter_key: 'airtime_loan_repayment', option_key: 'defaulted_often', label: 'Defaulted often', points: 0 },
    { parameter_key: 'airtime_loan_repayment', option_key: 'none_borrowed', label: 'None borrowed', points: -1 },
    { parameter_key: 'airtime_loan_repayment', option_key: 'none', label: 'None borrowed', points: -1 },
    { parameter_key: 'airtime_loan_repayment', option_key: 'skip', label: 'Skip', points: -1 },
  ],

  // W: Wallet & Mobile Money
  wallet_months_active: [
    { parameter_key: 'wallet_months_active', min_value: 0, max_value: 3, label: '< 3 months', points: 0 },
    { parameter_key: 'wallet_months_active', min_value: 3, max_value: 6, label: '3–6 months', points: 3 },
    { parameter_key: 'wallet_months_active', min_value: 6, max_value: 12, label: '6–12 months', points: 6 },
    { parameter_key: 'wallet_months_active', min_value: 12, max_value: 9999, label: '> 12 months', points: 10 },
  ],
  wallet_inflow_months_of_12: [
    { parameter_key: 'wallet_inflow_months_of_12', min_value: 0, max_value: 4, label: '0–3 months', points: 0 },
    { parameter_key: 'wallet_inflow_months_of_12', min_value: 4, max_value: 7, label: '4–6 months', points: 3 },
    { parameter_key: 'wallet_inflow_months_of_12', min_value: 7, max_value: 10, label: '7–9 months', points: 6 },
    { parameter_key: 'wallet_inflow_months_of_12', min_value: 10, max_value: 13, label: '10–12 months', points: 10 },
    { parameter_key: 'wallet_inflow_months_of_12', option_key: 'regular', label: 'Regular (10–12m)', points: 10 },
    { parameter_key: 'wallet_inflow_months_of_12', option_key: 'seasonal', label: 'Seasonal (7–9m)', points: 6 },
    { parameter_key: 'wallet_inflow_months_of_12', option_key: 'sporadic', label: 'Sporadic (4–6m)', points: 3 },
    { parameter_key: 'wallet_inflow_months_of_12', option_key: 'none', label: 'None (0–3m)', points: 0 },
  ],
  avg_monthly_inflow_kz: [
    { parameter_key: 'avg_monthly_inflow_kz', min_value: 0, max_value: 20000, label: '< 20,000 Kz', points: 2 },
    { parameter_key: 'avg_monthly_inflow_kz', min_value: 20000, max_value: 80000, label: '20,000–80,000 Kz', points: 5 },
    { parameter_key: 'avg_monthly_inflow_kz', min_value: 80000, max_value: 200000, label: '80,000–200,000 Kz', points: 8 },
    { parameter_key: 'avg_monthly_inflow_kz', min_value: 200000, max_value: 999999999, label: '> 200,000 Kz', points: 10 },
  ],
  merchant_qr_receipts: [
    { parameter_key: 'merchant_qr_receipts', option_key: 'none', label: 'None', points: 0 },
    { parameter_key: 'merchant_qr_receipts', option_key: 'some', label: 'Some', points: 5 },
    { parameter_key: 'merchant_qr_receipts', option_key: 'regular', label: 'Regular', points: 10 },
  ],
  bill_payments_via_wallet: [
    { parameter_key: 'bill_payments_via_wallet', option_key: 'none', label: 'None', points: 0 },
    { parameter_key: 'bill_payments_via_wallet', option_key: 'sometimes', label: 'Sometimes', points: 5 },
    { parameter_key: 'bill_payments_via_wallet', option_key: 'regular', label: 'Regular', points: 10 },
  ],
  wallet_balance_stability: [
    { parameter_key: 'wallet_balance_stability', option_key: 'low', label: 'Low', points: 2 },
    { parameter_key: 'wallet_balance_stability', option_key: 'volatile', label: 'Volatile', points: 2 },
    { parameter_key: 'wallet_balance_stability', option_key: 'medium', label: 'Medium', points: 6 },
    { parameter_key: 'wallet_balance_stability', option_key: 'high', label: 'High', points: 10 },
    { parameter_key: 'wallet_balance_stability', option_key: 'stable', label: 'Stable', points: 10 },
  ],
  wallet_loan_repayment: [
    { parameter_key: 'wallet_loan_repayment', option_key: '100%_repaid', label: 'On time 100%', points: 10 },
    { parameter_key: 'wallet_loan_repayment', option_key: 'on_time', label: 'On time 100%', points: 10 },
    { parameter_key: 'wallet_loan_repayment', option_key: '80_99%_repaid', label: '80–99%', points: 7 },
    { parameter_key: 'wallet_loan_repayment', option_key: '50_79%_repaid', label: '50–79%', points: 3 },
    { parameter_key: 'wallet_loan_repayment', option_key: 'under_50%', label: '< 50%', points: 0 },
    { parameter_key: 'wallet_loan_repayment', option_key: 'none', label: 'No loan (skip)', points: -1 },
    { parameter_key: 'wallet_loan_repayment', option_key: 'skip', label: 'Skip', points: -1 },
  ],

  // B: Bank & Formal Finance
  account_age_months: [
    { parameter_key: 'account_age_months', min_value: 0, max_value: 6, label: '< 6 months', points: 2 },
    { parameter_key: 'account_age_months', min_value: 6, max_value: 24, label: '6–24 months', points: 5 },
    { parameter_key: 'account_age_months', min_value: 24, max_value: 9999, label: '> 24 months', points: 10 },
  ],
  credits_months_of_12: [
    { parameter_key: 'credits_months_of_12', min_value: 0, max_value: 4, label: '0–3 months', points: 0 },
    { parameter_key: 'credits_months_of_12', min_value: 4, max_value: 9, label: '4–8 months', points: 5 },
    { parameter_key: 'credits_months_of_12', min_value: 9, max_value: 13, label: '9–12 months', points: 10 },
  ],
  avg_balance_kz: [
    { parameter_key: 'avg_balance_kz', min_value: 0, max_value: 92000, label: '< 92,000 Kz (~$100)', points: 2 },
    { parameter_key: 'avg_balance_kz', min_value: 92000, max_value: 460000, label: '92,000–460,000 Kz', points: 5 },
    { parameter_key: 'avg_balance_kz', min_value: 460000, max_value: 999999999, label: '> 460,000 Kz (~$500)', points: 10 },
  ],
  card_atm_use: [
    { parameter_key: 'card_atm_use', option_key: 'rare', label: 'Rare', points: 2 },
    { parameter_key: 'card_atm_use', option_key: 'low', label: 'Low', points: 2 },
    { parameter_key: 'card_atm_use', option_key: 'monthly', label: 'Monthly', points: 6 },
    { parameter_key: 'card_atm_use', option_key: 'moderate', label: 'Moderate', points: 6 },
    { parameter_key: 'card_atm_use', option_key: 'weekly', label: 'Weekly', points: 10 },
    { parameter_key: 'card_atm_use', option_key: 'frequent', label: 'Frequent', points: 10 },
  ],
  bank_loan_repayment: [
    { parameter_key: 'bank_loan_repayment', option_key: 'good', label: 'Good', points: 10 },
    { parameter_key: 'bank_loan_repayment', option_key: 'on_time', label: 'On time', points: 10 },
    { parameter_key: 'bank_loan_repayment', option_key: 'late', label: 'Late', points: 3 },
    { parameter_key: 'bank_loan_repayment', option_key: 'fair', label: 'Fair', points: 3 },
    { parameter_key: 'bank_loan_repayment', option_key: 'default', label: 'Default', points: 0 },
    { parameter_key: 'bank_loan_repayment', option_key: 'none', label: 'No loan (skip)', points: -1 },
    { parameter_key: 'bank_loan_repayment', option_key: 'skip', label: 'Skip', points: -1 },
  ],
  returned_payments_12m: [
    { parameter_key: 'returned_payments_12m', min_value: 0, max_value: 1, label: '0 returns', points: 10 },
    { parameter_key: 'returned_payments_12m', min_value: 1, max_value: 3, label: '1–2 returns', points: 6 },
    { parameter_key: 'returned_payments_12m', min_value: 3, max_value: 6, label: '3–5 returns', points: 2 },
    { parameter_key: 'returned_payments_12m', min_value: 6, max_value: 9999, label: '6+ returns', points: 0 },
  ],

  // X: Other Alternative Data
  utility_bills_on_time: [
    { parameter_key: 'utility_bills_on_time', option_key: 'always', label: 'Always', points: 10 },
    { parameter_key: 'utility_bills_on_time', option_key: 'mostly', label: 'Mostly', points: 7 },
    { parameter_key: 'utility_bills_on_time', option_key: 'sometimes', label: 'Sometimes', points: 4 },
    { parameter_key: 'utility_bills_on_time', option_key: 'none', label: 'None / Skip', points: -1 },
    { parameter_key: 'utility_bills_on_time', option_key: 'skip', label: 'Skip', points: -1 },
  ],
  nif_standing: [
    { parameter_key: 'nif_standing', option_key: 'regular', label: 'Regular', points: 10 },
    { parameter_key: 'nif_standing', option_key: 'active_good', label: 'Regular', points: 10 },
    { parameter_key: 'nif_standing', option_key: 'irregular', label: 'Irregular', points: 3 },
    { parameter_key: 'nif_standing', option_key: 'none', label: 'None / Skip', points: -1 },
    { parameter_key: 'nif_standing', option_key: 'skip', label: 'Skip', points: -1 },
  ],
  inss_record: [
    { parameter_key: 'inss_record', option_key: 'true', label: 'Yes', points: 10 },
    { parameter_key: 'inss_record', option_key: 'yes', label: 'Yes', points: 10 },
    { parameter_key: 'inss_record', option_key: 'false', label: 'None / Skip', points: -1 },
    { parameter_key: 'inss_record', option_key: 'none', label: 'None / Skip', points: -1 },
    { parameter_key: 'inss_record', option_key: 'skip', label: 'Skip', points: -1 },
  ],
  business_licence: [
    { parameter_key: 'business_licence', option_key: 'true', label: 'Yes', points: 10 },
    { parameter_key: 'business_licence', option_key: 'yes', label: 'Yes', points: 10 },
    { parameter_key: 'business_licence', option_key: 'alvara_comercial', label: 'Official Alvará', points: 10 },
    { parameter_key: 'business_licence', option_key: 'municipal_receipt', label: 'Municipal Receipt', points: 7 },
    { parameter_key: 'business_licence', option_key: 'none', label: 'None / Skip', points: -1 },
    { parameter_key: 'business_licence', option_key: 'skip', label: 'Skip', points: -1 },
  ],
};

const REVERSE_ALIASES: Record<string, string[]> = {
  topup_regularity_months: ['topup_months_of_12'],
  topup_months_of_12: ['topup_regularity_months'],
  arpu_stability: ['spend_stability'],
  spend_stability: ['arpu_stability'],
  topup_avg_amount_kz: ['recharge_value_per_month_kz', 'monthly_topup_kz'],
  monthly_topup_kz: ['recharge_value_per_month_kz', 'topup_avg_amount_kz'],
  recharge_value_per_month_kz: ['monthly_topup_kz', 'topup_avg_amount_kz'],
  wallet_inflow_regularity: ['wallet_inflow_months_of_12'],
  wallet_inflow_months_of_12: ['wallet_inflow_regularity'],
  bill_airtime_payments: ['bill_payments_via_wallet'],
  bill_payments_via_wallet: ['bill_airtime_payments'],
  regular_credits_months: ['credits_months_of_12'],
  credits_months_of_12: ['regular_credits_months'],
  utility_bills_paid: ['utility_bills_on_time'],
  utility_bills_on_time: ['utility_bills_paid'],
  days_active_per_month: ['active_days_per_month'],
  active_days_per_month: ['days_active_per_month'],
  time_in_job_months: ['time_in_activity_months'],
  time_in_activity_months: ['time_in_job_months'],
  card_atm_pos_use: ['card_atm_use'],
  card_atm_use: ['card_atm_pos_use'],
  loan_repayment_history: ['bank_loan_repayment'],
  bank_loan_repayment: ['loan_repayment_history'],
};

export function getInputValue(paramKey: string, inputs: Record<string, any>): any {
  if (inputs[paramKey] !== undefined) return inputs[paramKey];
  const aliases = REVERSE_ALIASES[paramKey] || [];
  for (const a of aliases) {
    if (inputs[a] !== undefined) return inputs[a];
  }
  return undefined;
}

/**
 * Evaluates points earned and maximum possible points for a parameter using Point Rules.
 */
export function evaluateParameterPoints(
  paramKey: string,
  rawValue: any,
  rulesOverride?: Record<string, PointRule[]>
): {
  earnedPoints: number;
  maxPossiblePoints: number;
  hasData: boolean;
  isSkipped: boolean;
  matchedLabel: string;
} {
  const activeRulesMap = rulesOverride || DEFAULT_POINT_RULES;
  const canonicalKey = activeRulesMap[paramKey]
    ? paramKey
    : (REVERSE_ALIASES[paramKey]?.find(k => activeRulesMap[k]) || paramKey);
  const rules = activeRulesMap[canonicalKey];

  if (!rules || rules.length === 0) {
    return {
      earnedPoints: 0,
      maxPossiblePoints: 10,
      hasData: false,
      isSkipped: false,
      matchedLabel: '',
    };
  }

  // Calculate max possible points among non-skipped options
  const positiveRules = rules.filter(r => r.points >= 0);
  const maxPossible = positiveRules.length > 0 ? Math.max(...positiveRules.map(r => r.points)) : 10;

  // Check for empty / unprovided input
  if (rawValue === undefined || rawValue === null || rawValue === '' || rawValue === 'skip') {
    return {
      earnedPoints: 0,
      maxPossiblePoints: maxPossible,
      hasData: false,
      isSkipped: true,
      matchedLabel: 'Skipped',
    };
  }

  // Explicit 'Not available' selection (0 points, lowers score)
  if (rawValue === 'not_available') {
    return {
      earnedPoints: 0,
      maxPossiblePoints: maxPossible,
      hasData: true,
      isSkipped: false,
      matchedLabel: 'Not available (0 pts)',
    };
  }

  // Check numeric input against range rules
  const num = Number(rawValue);
  if (!isNaN(num) && typeof rawValue !== 'boolean') {
    const rangeRule = rules.find(
      r => r.min_value !== undefined && num >= r.min_value && (r.max_value === undefined || num < r.max_value)
    );
    if (rangeRule) {
      if (rangeRule.points < 0) {
        return { earnedPoints: 0, maxPossiblePoints: maxPossible, hasData: false, isSkipped: true, matchedLabel: rangeRule.label };
      }
      return {
        earnedPoints: Math.max(0, rangeRule.points),
        maxPossiblePoints: maxPossible,
        hasData: true,
        isSkipped: false,
        matchedLabel: rangeRule.label,
      };
    }
  }

  // Check string / boolean option rules
  const strVal = String(rawValue).toLowerCase().trim();
  const optionRule = rules.find(r => r.option_key && r.option_key.toLowerCase() === strVal);
  if (optionRule) {
    if (optionRule.points < 0) {
      return { earnedPoints: 0, maxPossiblePoints: maxPossible, hasData: false, isSkipped: true, matchedLabel: optionRule.label };
    }
    return {
      earnedPoints: Math.max(0, optionRule.points),
      maxPossiblePoints: maxPossible,
      hasData: true,
      isSkipped: false,
      matchedLabel: optionRule.label,
    };
  }

  // Fallback to highest / lowest rule
  const defaultRule = positiveRules[positiveRules.length - 1];
  return {
    earnedPoints: defaultRule ? defaultRule.points : 5,
    maxPossiblePoints: maxPossible,
    hasData: true,
    isSkipped: false,
    matchedLabel: String(rawValue),
  };
}

/**
 * Maps a single parameter input value to a normalized strength of 0.0 .. 1.0
 * Blank/null/undefined or 'skip' inputs are skipped (never counted as 0).
 */
export function scoreParameter(
  param: Parameter,
  rawValue: any
): { strength: number; hasValue: boolean; isExcluded: boolean; matchedBand?: string } {
  // Excluded or stored-only parameters
  if (param.weight === 0 || param.is_candidate) {
    return { strength: 0, hasValue: false, isExcluded: true };
  }

  const pointEval = evaluateParameterPoints(param.key, rawValue);
  if (pointEval.isSkipped || !pointEval.hasData) {
    return { strength: 0, hasValue: false, isExcluded: pointEval.isSkipped, matchedBand: pointEval.matchedLabel };
  }

  const strength = pointEval.maxPossiblePoints > 0 ? pointEval.earnedPoints / pointEval.maxPossiblePoints : 0;
  return {
    strength: Math.min(1.0, Math.max(0.0, strength)),
    hasValue: true,
    isExcluded: false,
    matchedBand: pointEval.matchedLabel,
  };
}

/**
 * Calculates asset bonus points (+1 .. +6)
 * Yes adds points; No or Skip adds 0; never subtracts.
 */
export function calculateAssetBonus(assets?: {
  house?: 'yes' | 'no' | 'skip';
  land_title?: 'yes' | 'no' | 'skip';
  two_wheeler?: 'yes' | 'no' | 'skip';
  car?: 'yes' | 'no' | 'skip';
}): number {
  if (!assets) return 0;
  let bonus = 0;
  if (assets.house === 'yes') bonus += 2;
  if (assets.land_title === 'yes') bonus += 1;
  if (assets.two_wheeler === 'yes') bonus += 1;
  if (assets.car === 'yes') bonus += 2;
  return Math.min(DEFAULT_FEATURE_FLAGS.asset_bonus_max, bonus);
}

/**
 * Main Scoring Engine v2
 * Fully pure function implementing the points table model.
 */
export function calculateCreditScore(
  inputs: ScoringInputs,
  weightsOverride?: SegmentWeight[],
  rulesOverride?: Record<string, PointRule[]>
): ScoringResult {
  const {
    segmentCode,
    configVersionId = 'v2.0-default',
    walletAvailable = true,
    parameterInputs = {},
    assets = {},
    incomeBandCode,
    statedIncomeKz,
    equipmentPriceKz,
    termMonths = 6,
    customerMeta = {},
  } = inputs;

  const blockCodes: BlockCode[] = ['P', 'T', 'W', 'B', 'X'];

  // 1. Retrieve configured base weights for this segment
  const activeWeights = weightsOverride || DEFAULT_WEIGHTS;
  const segmentWeights = activeWeights.filter(w => w.segment_code === segmentCode);
  const baseWeightsByBlock: Record<BlockCode, number> = {
    P: 0, T: 0, W: 0, B: 0, X: 0, A: 0,
  };
  segmentWeights.forEach(w => {
    baseWeightsByBlock[w.block_code as BlockCode] = w.points;
  });

  // 2. Evaluate parameter points per block
  const blockDetails: Record<BlockCode, BlockScoreDetail> = {
    P: { blockCode: 'P', basePoints: baseWeightsByBlock.P, effectivePoints: baseWeightsByBlock.P, earnedPoints: 0, blockStrength: 0, hasData: false, availableParamsCount: 0, totalConfiguredParams: 0, parameters: [] },
    T: { blockCode: 'T', basePoints: baseWeightsByBlock.T, effectivePoints: baseWeightsByBlock.T, earnedPoints: 0, blockStrength: 0, hasData: false, availableParamsCount: 0, totalConfiguredParams: 0, parameters: [] },
    W: { blockCode: 'W', basePoints: baseWeightsByBlock.W, effectivePoints: baseWeightsByBlock.W, earnedPoints: 0, blockStrength: 0, hasData: false, availableParamsCount: 0, totalConfiguredParams: 0, parameters: [] },
    B: { blockCode: 'B', basePoints: baseWeightsByBlock.B, effectivePoints: baseWeightsByBlock.B, earnedPoints: 0, blockStrength: 0, hasData: false, availableParamsCount: 0, totalConfiguredParams: 0, parameters: [] },
    X: { blockCode: 'X', basePoints: baseWeightsByBlock.X, effectivePoints: baseWeightsByBlock.X, earnedPoints: 0, blockStrength: 0, hasData: false, availableParamsCount: 0, totalConfiguredParams: 0, parameters: [] },
    A: { blockCode: 'A', basePoints: 0, effectivePoints: 0, earnedPoints: 0, blockStrength: 0, hasData: false, availableParamsCount: 0, totalConfiguredParams: 0, parameters: [] },
  };

  const configuredParams = DEFAULT_PARAMETERS.filter(p => p.block_code !== 'A');

  for (const blockCode of blockCodes) {
    const blockParams = configuredParams.filter(p => p.block_code === blockCode);
    const detail = blockDetails[blockCode];
    detail.totalConfiguredParams = blockParams.length;

    let pointsEarnedSum = 0;
    let pointsPossibleSum = 0;
    let availableCount = 0;

    // Month / Quarter toggle detection for Block T (recharge parameters)
    const rechargeView = parameterInputs['recharge_view'] ||
      (parameterInputs['recharge_value_per_quarter_kz'] !== undefined && parameterInputs['recharge_value_per_month_kz'] === undefined
        ? 'quarter'
        : 'month');

    for (const param of blockParams) {
      // Mutual exclusion: never count both Month and Quarter recharge values in the same calculation
      if (blockCode === 'T') {
        if (param.key === 'recharge_value_per_quarter_kz' && rechargeView !== 'quarter') {
          detail.parameters.push({
            key: param.key,
            label: param.label,
            blockCode: param.block_code,
            inputValue: parameterInputs[param.key],
            strength: 0,
            pointsEarned: 0,
            maxPointsPossible: 10,
            weight: param.weight,
            isExcluded: true,
            hasValue: false,
            matchedBand: 'Skipped (Month view active)',
          });
          continue;
        }
        if (param.key === 'recharge_value_per_month_kz' && rechargeView === 'quarter') {
          detail.parameters.push({
            key: param.key,
            label: param.label,
            blockCode: param.block_code,
            inputValue: parameterInputs[param.key],
            strength: 0,
            pointsEarned: 0,
            maxPointsPossible: 10,
            weight: param.weight,
            isExcluded: true,
            hasValue: false,
            matchedBand: 'Skipped (Quarter view active)',
          });
          continue;
        }
        if (param.key === 'topup_avg_amount_kz' && (parameterInputs['recharge_value_per_month_kz'] !== undefined || parameterInputs['recharge_value_per_quarter_kz'] !== undefined)) {
          detail.parameters.push({
            key: param.key,
            label: param.label,
            blockCode: param.block_code,
            inputValue: undefined,
            strength: 0,
            pointsEarned: 0,
            maxPointsPossible: 10,
            weight: param.weight,
            isExcluded: true,
            hasValue: false,
            matchedBand: 'Replaced by recharge parameters',
          });
          continue;
        }
      }

      const rawVal = getInputValue(param.key, parameterInputs);
      const ptEval = evaluateParameterPoints(param.key, rawVal, rulesOverride);

      const pDetail: ParameterScoreDetail = {
        key: param.key,
        label: param.label,
        blockCode: param.block_code,
        inputValue: rawVal,
        strength: ptEval.maxPossiblePoints > 0 ? ptEval.earnedPoints / ptEval.maxPossiblePoints : 0,
        pointsEarned: ptEval.earnedPoints,
        maxPointsPossible: ptEval.maxPossiblePoints,
        weight: param.weight,
        isExcluded: ptEval.isSkipped,
        hasValue: ptEval.hasData,
        matchedBand: ptEval.matchedLabel,
      };
      detail.parameters.push(pDetail);

      if (ptEval.hasData && !ptEval.isSkipped) {
        availableCount++;
        pointsEarnedSum += ptEval.earnedPoints;
        pointsPossibleSum += ptEval.maxPossiblePoints;
      }
    }

    detail.availableParamsCount = availableCount;

    // Check if block has valid data
    // A block with NO data at all (no record and nothing entered, or all "Not available") earns 0 and is shown as "Nil".
    const hasEnteredData = blockParams.some(p => {
      const raw = getInputValue(p.key, parameterInputs);
      return raw !== undefined && raw !== null && raw !== '' && raw !== 'not_available' && raw !== 'skip' && raw !== 'none';
    });

    if (baseWeightsByBlock[blockCode] === 0) {
      detail.hasData = false;
      detail.blockStrength = 0;
      detail.earnedPoints = 0;
      detail.status = 'not_used';
    } else if (blockCode === 'W' && !walletAvailable) {
      detail.hasData = false;
      detail.blockStrength = 0;
      detail.earnedPoints = 0;
      detail.status = 'skipped';
    } else if (hasEnteredData && pointsPossibleSum > 0) {
      detail.hasData = true;
      let calculatedStrength = Math.min(1.0, Math.max(0.0, pointsEarnedSum / pointsPossibleSum));

      // Behavioral Integrity: SIM tenure alone cannot give high telecom score without confirmed recharge activity
      const topupVal = parameterInputs['topup_months_of_12'] ?? parameterInputs['topup_regularity_months'];
      if (blockCode === 'T' && (topupVal === undefined || topupVal === null || topupVal === '' || topupVal === 'not_available')) {
        calculatedStrength = Math.min(0.30, calculatedStrength);
      }

      detail.blockStrength = calculatedStrength;
      detail.earnedPoints = Math.round(calculatedStrength * detail.effectivePoints * 10) / 10;
      detail.status = 'complete';
    } else {
      detail.hasData = false;
      detail.blockStrength = 0;
      detail.earnedPoints = 0;
      detail.status = 'nil';
    }
  }

  // 3. Dynamic Point Redistribution REMOVED (Change Request v3 rule: missing data lowers score)
  // Each block's maximum is the fixed block points for the segment. Sum of base blocks = 94 (+6 assets bonus = 100).
  const redistributions: RedistributionRecord[] = [];
  for (const b of blockCodes) {
    blockDetails[b].effectivePoints = baseWeightsByBlock[b];
  }

  const blocksWithData = blockCodes.filter(b => blockDetails[b].hasData && (b !== 'W' || walletAvailable));

  // 4. Earned Points & Asset Bonus
  let basePointsEarned = 0;
  for (const b of blockCodes) {
    basePointsEarned += blockDetails[b].earnedPoints;
  }

  const assetBonus = calculateAssetBonus(assets);
  const totalPoints = Math.min(100, Math.max(0, Math.round((basePointsEarned + assetBonus) * 10) / 10));

  // 5. Calculate Score (300 .. 900)
  // Formula: Score = 300 + Math.round(totalPoints * 6)
  const score = Math.min(900, Math.max(300, 300 + Math.round(totalPoints * 6)));

  // Match Score Band
  const scoreBand = DEFAULT_SCORE_BANDS.find(sb => score >= sb.min_score && score <= sb.max_score)
    || DEFAULT_SCORE_BANDS[0];

  // 6. Overlay Rules Evaluation
  const overlayFlags: OverlayFlagResult[] = [];
  let isHardStop = false;
  let isHoldForReview = false;
  let isCappedAtStarter = false;

  // Rule 1: ID & SIM Match
  const idSimInput = parameterInputs['id_sim_match'];
  const idSimMatch = customerMeta.idSimMatch !== undefined ? customerMeta.idSimMatch : idSimInput;
  if (idSimMatch === false || idSimMatch === 'no') {
    isHardStop = true;
    overlayFlags.push({
      ruleKey: 'id_sim_mismatch',
      description: 'National ID name does not match SIM subscriber registration',
      action: 'stop',
      triggered: true,
      note: 'Identity verification mismatch. Application stopped for manual branch KYC review.',
    });
  }

  // Rule 2: Age under 18
  let applicantAge = 25;
  if (customerMeta.dateOfBirth) {
    const dob = new Date(customerMeta.dateOfBirth);
    const diffMs = Date.now() - dob.getTime();
    applicantAge = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
  }
  if (applicantAge < 18) {
    isHardStop = true;
    overlayFlags.push({
      ruleKey: 'age_under_18',
      description: 'Applicant is under 18 years old',
      action: 'stop',
      triggered: true,
      note: 'Applicant is under legal age (18). Not eligible for equipment financing.',
    });
  }

  // Rule 3: SIM tenure under 6 months
  const simTenureMonths = customerMeta.simTenureMonths ?? Number(parameterInputs['sim_tenure_months'] ?? 12);
  if (simTenureMonths < DEFAULT_FEATURE_FLAGS.starter_months) {
    isCappedAtStarter = true;
    overlayFlags.push({
      ruleKey: 'sim_under_6m',
      description: 'SIM card activation tenure is under 6 months',
      action: 'cap_starter',
      triggered: true,
      note: 'Tenure on Unitel network under 6 months. Credit limit capped at Starter level.',
    });
  }

  // Rule 4: SIM swap in last 30 days
  const simSwapDaysAgo = customerMeta.simSwapDaysAgo ?? (parameterInputs['sim_swap_days_ago'] !== undefined ? Number(parameterInputs['sim_swap_days_ago']) : undefined);
  if (simSwapDaysAgo !== undefined && simSwapDaysAgo <= DEFAULT_FEATURE_FLAGS.sim_swap_hold_days) {
    isHoldForReview = true;
    overlayFlags.push({
      ruleKey: 'sim_swap_30d',
      description: 'SIM card replaced / swapped within the last 30 days',
      action: 'hold_review',
      triggered: true,
      note: 'Recent SIM swap detected. Held for fraud prevention verification.',
    });
  }

  // 7. Data Coverage Evaluation (0 to 100%)
  const verifiedBasePoints = blocksWithData.reduce((sum, b) => sum + baseWeightsByBlock[b], 0);
  const dataCoverageScore = Math.round((verifiedBasePoints / 94) * 100);
  const dataCoverageLabel: 'High' | 'Medium' | 'Low' =
    dataCoverageScore >= 75 ? 'High' : dataCoverageScore >= 50 ? 'Medium' : 'Low';
  const dataConfidence: 'high' | 'medium' | 'low' =
    dataCoverageScore >= 75 ? 'high' : dataCoverageScore >= 50 ? 'medium' : 'low';

  const confidenceReasons: string[] = [
    `Data coverage: ${dataCoverageScore}% across verified data sources.`,
  ];

  // 8. Credit Limit Calculation
  let limitLevel = scoreBand.limit_level;

  if (isHardStop) {
    limitLevel = 'review';
  } else if (isCappedAtStarter) {
    limitLevel = 'starter';
  } else if (segmentCode === 'S1' && simTenureMonths < 12) {
    limitLevel = 'starter';
  }

  const baselineLimits: Record<string, number> = {
    review: 0,
    starter: 50000,
    standard: 150000,
    higher: 400000,
    highest: 1000000,
  };

  let maxLimitKz = baselineLimits[limitLevel] ?? 50000;
  let limitCapApplied = `Score Band: ${scoreBand.label} (${limitLevel.toUpperCase()})`;

  if (incomeBandCode) {
    const incBand = DEFAULT_INCOME_BANDS.find(ib => ib.code === incomeBandCode);
    if (incBand) {
      const incCapAmount = baselineLimits[incBand.limit_cap_level] ?? 50000;
      if (incCapAmount < maxLimitKz) {
        maxLimitKz = incCapAmount;
        limitCapApplied = `Income Cap: ${incBand.label} (Max ${incBand.limit_cap_level.toUpperCase()})`;
      }
    }
  }

  if (isCappedAtStarter) {
    maxLimitKz = Math.min(maxLimitKz, 50000);
    limitCapApplied = 'Overlay Cap: Starter Level (Max 50,000 Kz)';
  }

  if (isHardStop) {
    maxLimitKz = 0;
    limitCapApplied = 'Hard Stop: Ineligible (0 Kz)';
  }

  // 9. Affordability & EMI Calculation
  let monthlyIncomeKz = 100000; // national baseline minimum wage
  let incomeSource: 'stated' | 'band' | 'spend_proxy' | 'minimum_wage' = 'minimum_wage';

  if (statedIncomeKz && statedIncomeKz > 0) {
    monthlyIncomeKz = statedIncomeKz;
    incomeSource = 'stated';
  } else if (incomeBandCode) {
    const incBand = DEFAULT_INCOME_BANDS.find(ib => ib.code === incomeBandCode);
    if (incBand) {
      monthlyIncomeKz = incBand.max_kz > 1000000 ? 1200000 : Math.round((incBand.min_kz + incBand.max_kz) / 2);
      incomeSource = 'band';
    }
  } else if (parameterInputs['arpu_kz']) {
    monthlyIncomeKz = Math.round(Number(parameterInputs['arpu_kz']) * 10);
    incomeSource = 'spend_proxy';
  }

  let affordability: AffordabilityResult | undefined;
  if (equipmentPriceKz && equipmentPriceKz > 0) {
    const monthlyEmiKz = Math.round(equipmentPriceKz / termMonths);
    const emiSharePct = Number(((monthlyEmiKz / monthlyIncomeKz) * 100).toFixed(1));
    const isOverCap = emiSharePct > DEFAULT_FEATURE_FLAGS.emi_cap_pct;

    affordability = {
      monthlyEmiKz,
      monthlyIncomeKz,
      incomeSource,
      emiSharePct,
      maxAllowedSharePct: DEFAULT_FEATURE_FLAGS.emi_cap_pct,
      isOverCap,
    };
  }

  // 10. Generate Top 3 Reasons in Plain Words & Plain Data Gaps
  const positiveReasons: string[] = [];
  const dataGaps: string[] = [];

  for (const b of blockCodes) {
    if (baseWeightsByBlock[b] > 0) {
      const bDetail = blockDetails[b];
      const blockName = b === 'P' ? 'Personal' : b === 'T' ? 'Telecom' : b === 'W' ? 'Wallet' : b === 'B' ? 'Bank' : 'Alternative';
      if (b === 'W' && !walletAvailable) {
        dataGaps.push(`Wallet switched off: 0 of ${baseWeightsByBlock[b]} points`);
      } else if (bDetail.status === 'nil') {
        dataGaps.push(`No ${blockName.toLowerCase()} record: 0 of ${baseWeightsByBlock[b]} points`);
      }
    }
  }

  if (simTenureMonths >= 24) {
    positiveReasons.push(`Longstanding mobile subscriber loyalty (${simTenureMonths} months tenure).`);
  } else if (simTenureMonths >= 12) {
    positiveReasons.push(`Established telecom relationship (${simTenureMonths} months tenure).`);
  }

  const topupMonths = Number(parameterInputs['topup_months_of_12'] ?? parameterInputs['topup_regularity_months']);
  if (topupMonths >= 10) {
    positiveReasons.push(`Consistent monthly airtime recharges (${topupMonths} of past 12 months).`);
  }

  if (walletAvailable && blockDetails.W.hasData && blockDetails.W.blockStrength >= 0.7) {
    positiveReasons.push('Active mobile money wallet transactions and digital inflows.');
  }

  if (blockDetails.B.hasData && blockDetails.B.blockStrength >= 0.7) {
    positiveReasons.push('Verified formal banking relationship with regular account deposits.');
  }

  if (assetBonus > 0) {
    positiveReasons.push(`Tangible residential or vehicle asset bonus added (+${assetBonus} pts).`);
  }

  // Combine positive reasons and data gaps to show full picture
  const combinedReasons = [...positiveReasons];
  if (dataGaps.length > 0) {
    combinedReasons.push(...dataGaps);
  }
  if (combinedReasons.length < 3) {
    combinedReasons.push('Verified national identity registry match with active SIM ownership.');
  }

  const finalTop3Reasons = combinedReasons.slice(0, 3);
  const missingDataNote = dataGaps.length > 0 ? 'No data scores Nil.' : undefined;

  return {
    segmentCode,
    score,
    totalPoints: Number(totalPoints.toFixed(1)),
    basePointsEarned: Number(basePointsEarned.toFixed(1)),
    assetBonus,
    scoreBand,
    dataConfidence,
    dataCoverageScore,
    dataCoverageLabel,
    missingDataNote,
    confidenceReasons,
    blockScores: blockDetails,
    redistributions,
    overlayFlags,
    isHardStop,
    isHoldForReview,
    isCappedAtStarter,
    limitKz: maxLimitKz,
    limitCapApplied,
    positiveReasons: finalTop3Reasons,
    dataGaps,
    scoreVersion: `${configVersionId}-points-engine-v2`,
    computedAt: new Date().toISOString(),
    affordability,
  };
}
