export type Role = 'analyst' | 'approver' | 'admin';

export type VolumeTier = 'low' | 'high';
export type RegistrationChannel = 'app' | 'ussd' | 'agent';
export type IdDocumentType = 'BI' | 'Passport' | 'Other';
export type WalletRegistrationLevel = 'basic' | 'kyc';
export type NifStatus = 'active' | 'suspended' | 'none';
export type TaxFilingStatus = 'regular' | 'irregular' | 'none';
export type SourceStatus = 'found' | 'thin' | 'missing';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type ScoreBandName = 'Excellent' | 'Good' | 'Fair' | 'Poor';
export type DecisionOutcome = 'auto_approve' | 'manual_review' | 'decline';
export type ApplicationStatus =
  | 'draft'
  | 'scored'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'more_info_requested';
export type NotificationChannel = 'sms' | 'email';
export type NotificationTrigger =
  | 'received'
  | 'auto_approve'
  | 'manual_review'
  | 'decline'
  | 'more_info_requested';

export interface Customer {
  id: string;
  mobile_no: string;
  full_name: string;
  bi_number: string;
  date_of_birth: string;
  gender: 'M' | 'F';
  city: string;
  address?: string;
  volume_tier?: VolumeTier;
}

export interface TelecomSource {
  mobile_no: string;
  sim_activation_date: string;
  avg_monthly_topup_aoa: number;
  topup_months_last_12: number;
  avg_monthly_spend_aoa: number;
  spend_variability: number;
  airtime_loans_taken: number;
  airtime_loans_repaid_on_time: number;
  airtime_loans_unpaid: number;
  sim_registered_with_bi: boolean;
}

export interface MobileMoneySource {
  mobile_no: string;
  wallet_exists: boolean;
  registration_level: WalletRegistrationLevel;
  monthly_inflow_aoa: number;
  monthly_outflow_aoa: number;
  avg_balance_aoa: number;
  daily_txn_aoa?: number;
  txn_count_90d: number;
  failed_txn_count_90d: number;
}

export interface IdentitySource {
  mobile_no: string;
  bi_number: string;
  id_verified: boolean;
  id_issue_date: string | null;
  id_issue_place: string | null;
  address: string;
  address_verified: boolean;
}

export interface TaxSource {
  mobile_no: string;
  nif: string;
  nif_status: NifStatus;
  tax_filing_status: TaxFilingStatus;
}

export interface CustomerProfile {
  customer: Customer;
  telecom: TelecomSource | null;
  mobileMoney: MobileMoneySource | null;
  identity: IdentitySource | null;
  tax: TaxSource | null;
  has_bank_account?: boolean;
}

export interface RangeRule {
  label: string;
  min?: number;
  max?: number;
  pct: number;
}

export interface CategoryWeights {
  telecom: number;
  identity: number;
  mobileMoney: number;
  tax: number;
}

export interface BandDefinition {
  name: ScoreBandName;
  minScore: number;
  maxScore: number;
}

export type CreditLimitTable = Record<ScoreBandName, Record<ConfidenceLevel, number>>;

export interface NotificationTemplateEntry {
  sms: string;
  emailSubject: string;
  emailBody: string;
}

export type NotificationTemplateSet = Record<NotificationTrigger, NotificationTemplateEntry>;

export interface EquipmentItem {
  id: string;
  category: 'Phone' | 'TV' | 'Fridge' | 'Car' | 'Other';
  item_name: string;
  price_aoa: number;
  min_tier: VolumeTier;
  active: boolean;
  description?: string;
}

export interface EmiPlanConfig {
  id: string;
  tier: VolumeTier;
  term_months: number;
  interest_rate_pct: number;
  min_down_payment_pct: number;
}

export interface EmiCalculation {
  term_months: number;
  interest_rate_pct: number;
  down_payment_aoa: number;
  principal_aoa: number;
  monthly_emi_aoa: number;
  total_payable_aoa: number;
}

export interface ScoringConfig {
  id: string;
  version: number;
  updatedAt: string;
  weights: CategoryWeights;
  ranges: {
    simTenureMonths: RangeRule[];
    topupMonths12: RangeRule[];
    spendVariability: RangeRule[];
    airtimeLoanRepaymentRatio: RangeRule[];
    monthlySpendAoa: RangeRule[];
    monthlyInflowAoa: RangeRule[];
    avgBalanceAoa: RangeRule[];
    txnCount90d: RangeRule[];
    failedTxnRate: RangeRule[];
  };
  caps: {
    unverifiedBiMaxScore: number;
    unpaidLoanMaxScore: number;
    suspendedNifPointDeduction: number;
  };
  bands: BandDefinition[];
  creditLimitsAoa: CreditLimitTable;
  priceCeilingsAoa: Record<VolumeTier, number>;
  maxMonthlyEmiRatioOfLimit: number;
  templates: NotificationTemplateSet;
}

export interface ParameterBreakdown {
  id: string;
  category: keyof CategoryWeights;
  label: string;
  rawValue: string;
  earnedPoints: number;
  maxPoints: number;
  pct: number;
  reason: string;
  excluded?: boolean;
}

export interface CategoryBreakdown {
  category: keyof CategoryWeights;
  label: string;
  sourceStatus: SourceStatus;
  weight: number;
  earnedPoints: number;
  effectiveMaxPoints: number;
  excludedFromDenominator: boolean;
  note: string;
}

export interface AppliedAdjustment {
  code:
    | 'BI_NOT_VERIFIED_CAP'
    | 'UNPAID_LOAN_CAP'
    | 'SUSPENDED_NIF_DEDUCTION'
    | 'THIN_FILE_RENORMALIZED';
  label: string;
  impactText: string;
}

export interface ScoreExplanation {
  score: number;
  uncappedScore: number;
  normalizedPoints: number;
  rawEarnedPoints: number;
  activeDenominator: number;
  band: ScoreBandName;
  confidence: ConfidenceLevel;
  meaningfulSourceCount: number;
  sourceStatuses: {
    telecom: SourceStatus;
    identity: SourceStatus;
    mobileMoney: SourceStatus;
    tax: SourceStatus;
  };
  categories: CategoryBreakdown[];
  parameters: ParameterBreakdown[];
  adjustments: AppliedAdjustment[];
  summaryReasons: string[];
  thinFileNotice?: string;
}

export interface LimitDecisionResult {
  creditLimitAoa: number;
  productPriceAoa: number;
  headroomAoa: number;
  monthlyEmiAoa: number;
  maxMonthlyEmiAoa: number;
  emiAffordable: boolean;
  decision: DecisionOutcome;
  decisionLabel: string;
  decisionReason: string;
  startSmallApplied: boolean;
}

export interface ApplicationData {
  registration_channel: RegistrationChannel;
  pin_created: boolean;
  terms_accepted: boolean;
  id_doc_type?: IdDocumentType;
  id_number?: string;
  id_issue_date?: string;
  id_issue_place?: string;
  residential_address?: string;
  additional_kyc_verified?: boolean;
  has_bank_account: boolean;
  daily_txn_aoa: number;
}

export interface ApplicationRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  mobile_no: string;
  volume_tier: VolumeTier;
  equipment_id?: string;
  product: string;
  product_price_aoa: number;
  emi_term_months: number;
  emi_rate_pct: number;
  down_payment_aoa: number;
  monthly_emi_aoa: number;
  total_payable_aoa: number;
  emi_affordable: boolean;
  max_monthly_emi_aoa: number;
  status: ApplicationStatus;
  score: number;
  band: ScoreBandName;
  confidence: ConfidenceLevel;
  credit_limit_aoa: number;
  decision: DecisionOutcome; // suggested decision by engine
  decision_reason: string;
  overridden_by?: string;
  decided_by_role?: Role;
  created_by_role?: Role;
  score_config_version?: number;
  application_data?: ApplicationData;
  profile_snapshot?: CustomerProfile;
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  application_id: string;
  customer_name: string;
  mobile_no: string;
  channel: NotificationChannel;
  template: NotificationTrigger;
  subject?: string;
  body: string;
  status: 'simulated_sent';
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  application_id: string;
  step_name: string;
  inputs_snapshot: Record<string, unknown>;
  score_config_version: number;
  score?: number;
  decision: string;
  decision_reason: string;
  role: Role;
  timestamp: string;
}

export interface ScoreHistoryEntry {
  date: string;
  score: number;
  band: ScoreBandName;
  confidence: ConfidenceLevel;
  note: string;
}
