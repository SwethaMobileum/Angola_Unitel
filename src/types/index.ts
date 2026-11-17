export type AppRole = 'applicant' | 'approver' | 'admin';

export type ParamRole =
  | 'main'
  | 'support'
  | 'bonus'
  | 'limit_only'
  | 'not_available'
  | 'not_used';

export type InputType = 'number' | 'choice' | 'boolean' | 'yes_no_skip';

export type BlockCode = 'P' | 'T' | 'W' | 'B' | 'X' | 'A';

export type SegmentCode =
  | 'S1'
  | 'S2'
  | 'S3'
  | 'S4'
  | 'S5'
  | 'S6'
  | 'S7'
  | 'S8'
  | 'S9'
  | 'S10';

export interface Profile {
  id: string;
  full_name: string;
  role: AppRole;
  created_at?: string;
}

export interface ConfigVersion {
  id: string;
  label: string;
  created_by?: string;
  created_at: string;
  is_active: boolean;
}

export interface FeatureFlags {
  wallet_enabled: boolean;
  emi_cap_pct: number;
  base_points: number;
  asset_bonus_max: number;
  starter_months: number;
  sim_swap_hold_days: number;
  [key: string]: unknown;
}

export interface Block {
  code: BlockCode;
  name: string;
  question?: string;
  color: string;
  is_optional: boolean;
  sort: number;
}

export interface Segment {
  code: SegmentCode;
  name: string;
  color: string;
  story: string;
  how_money_moves: string;
  data_visible: string;
  share_note: string;
  limit_rule: string;
  sort: number;
  is_active?: boolean;
}

export interface SegmentWeight {
  config_version_id: string;
  segment_code: SegmentCode;
  block_code: BlockCode;
  points: number;
  role: ParamRole;
}

export interface ParameterBandMapping {
  min?: number;
  max?: number;
  value?: string | number | boolean;
  score: number; // 0.0 .. 1.0
  label?: string;
}

export interface Parameter {
  key: string;
  block_code: BlockCode;
  label: string;
  help?: string;
  input: InputType;
  unit?: string;
  options?: Array<{ value: string; label: string }>;
  bands?: ParameterBandMapping[];
  weight: number;
  is_candidate: boolean;
  sort: number;
}

export interface SegmentParameter {
  segment_code: SegmentCode;
  parameter_key: string;
  role: ParamRole;
}

export interface SegmentQuestion {
  id: number;
  position: number;
  text: string;
  yes_segment: SegmentCode;
  requires_wallet: boolean;
}

export interface ScoreBand {
  id: number;
  min_score: number;
  max_score: number;
  label: string;
  limit_level: 'review' | 'starter' | 'standard' | 'higher' | 'highest';
}

export interface OverlayRule {
  id: number;
  key: string;
  description: string;
  action: 'stop' | 'cap_starter' | 'hold_review' | 'never_score';
}

export interface IncomeBand {
  id: number;
  code: number;
  label: string;
  min_kz: number;
  max_kz: number;
  usd_note: string;
  limit_cap_level: 'review' | 'starter' | 'standard' | 'higher' | 'highest';
}

export interface LimitTableEntry {
  id: number;
  limit_level: 'starter' | 'standard' | 'higher' | 'highest';
  income_band_code: number;
  max_limit_kz: number;
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  price_kz: number;
  active: boolean;
  is_custom?: boolean;
}

export interface Customer {
  id: string;
  full_name: string;
  email?: string;
  msisdn: string;
  national_id_masked: string;
  date_of_birth: string;
  sim_activation_date: string;
  created_by?: string;
}

export interface Evaluation {
  id: string;
  customer_id: string;
  analyst_id: string;
  segment_code: SegmentCode;
  segment_overridden: boolean;
  override_reason?: string;
  config_version_id: string;
  wallet_available: boolean;
  wallet_used?: boolean;
  income_band_code?: number;
  income_source?: 'stated' | 'estimated';
  status: 'draft' | 'saved' | 'scored' | 'submitted' | 'approved' | 'rejected' | 'purchased';
  created_at: string;
  customer?: Customer;
  results?: EvaluationResult;
}

export interface EvaluationAssets {
  evaluation_id: string;
  house: 'yes' | 'no' | 'skip';
  land_title: 'yes' | 'no' | 'skip';
  two_wheeler: 'yes' | 'no' | 'skip';
  car: 'yes' | 'no' | 'skip';
}

export interface EvaluationResult {
  evaluation_id: string;
  block_points: Record<BlockCode, { rawPoints: number; earnedPoints: number; availableParams: number }>;
  asset_bonus: number;
  total_points: number;
  score: number;
  band_label: string;
  confidence: 'high' | 'medium' | 'low';
  overlay_flags: Array<{ ruleKey: string; action: string; note: string }>;
  reasons: string[];
  limit_kz: number;
  limit_cap_applied: string;
  score_version: string;
  computed_at: string;
}

export interface LoanApplication {
  id: string;
  evaluation_id: string;
  equipment_id: string;
  price_kz: number;
  term_months: number;
  rate_pct: number;
  monthly_emi_kz: number;
  emi_share_pct: number;
  status: 'draft' | 'saved' | 'submitted' | 'pending' | 'approved' | 'rejected' | 'purchased';
  submitted_by: string;
  submitted_at: string;
  purchased_at?: string;
  evaluation?: Evaluation;
  equipment?: Equipment;
}

export interface Approval {
  id: string;
  application_id: string;
  approver_id: string;
  decision: 'approved' | 'rejected';
  reason: string;
  decided_at: string;
}

export interface NotificationRecord {
  id: string;
  application_id?: string;
  to_email: string;
  kind: string;
  subject: string;
  body: string;
  html_body?: string;
  status: 'sent' | 'logged' | 'failed';
  created_at: string;
}

export interface AuditLogEntry {
  id: number;
  at: string;
  actor?: string;
  actor_name?: string;
  action: string;
  entity: string;
  entity_id: string;
  details: Record<string, unknown>;
}

// Data Sources (ds_telecom, ds_wallet, ds_bank, ds_assets, ds_utility)
export interface DataSourceTelecom {
  id: string;
  customer_phone: string;
  tenure_months: number;
  arpu_kz: number;
  recharge_regularity: 'regular' | 'irregular' | 'sporadic';
  airtime_balance_kz: number;
  sim_swap_count_90d: number;
  last_sim_swap_days: number;
  airtime_loan_repaid_pct: number;
  created_at?: string;
}

export interface DataSourceWallet {
  id: string;
  customer_phone: string;
  has_wallet: boolean;
  monthly_turnover_kz: number;
  cash_in_out_ratio: number;
  merchant_payments_monthly: number;
  wallet_tenure_months: number;
  balance_kz: number;
  created_at?: string;
}

export interface DataSourceBank {
  id: string;
  customer_phone: string;
  national_id?: string;
  has_bank_account: boolean;
  bank_name?: string;
  salary_detected: boolean;
  avg_monthly_salary_kz: number;
  avg_balance_kz: number;
  bounced_cheques_12m: number;
  created_at?: string;
}

export interface DataSourceAssets {
  id: string;
  customer_phone: string;
  national_id?: string;
  has_vehicle: boolean;
  vehicle_type?: 'car' | 'two_wheeler' | 'commercial';
  has_land_title: boolean;
  has_registered_house: boolean;
  verified_source?: string;
  created_at?: string;
}

export interface DataSourceUtility {
  id: string;
  customer_phone: string;
  national_id?: string;
  ende_prepaid_meter?: string;
  payment_regularity: 'regular' | 'irregular' | 'none';
  avg_monthly_power_kz: number;
  created_at?: string;
}

export interface TelecomRechargeRecord {
  id?: string;
  customer_ref: string;
  month: string; // YYYY-MM
  recharge_count: number;
  recharge_value_kz: number;
  created_at?: string;
}

export interface DataSourceCheckResult {
  phone: string;
  telecom: DataSourceTelecom | null;
  wallet: DataSourceWallet | null;
  bank: DataSourceBank | null;
  assets: DataSourceAssets | null;
  utility: DataSourceUtility | null;
  kycMatch: boolean;
  recharges?: TelecomRechargeRecord[];
}

