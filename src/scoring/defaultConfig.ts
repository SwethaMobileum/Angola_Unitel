import type { ProductOption, ScoringConfig } from './types';

export const UNITEL_MONEY_TIERS = {
  basic: {
    label: 'Basic registration',
    requirements: 'Mobile number, full name, date of birth, gender, PIN',
    dailyLimitAoa: 25_000,
    maxBalanceAoa: 70_000,
  },
  kyc: {
    label: 'Fully verified (KYC)',
    requirements: 'Government ID (BI), ID number, date & place of issue, verified address, extra verification',
    dailyLimitAoa: 300_000,
    maxBalanceAoa: 18_000_000,
  },
} as const;

export const PRODUCT_CATALOG: ProductOption[] = [
  {
    id: 'prod-phone',
    name: 'Smartphone 5G (128GB)',
    category: 'Phone',
    defaultPriceAoa: 280_000,
    description: 'Entry flagship handset with 12-month installment plan',
  },
  {
    id: 'prod-tv',
    name: 'Smart TV 55" 4K UHD',
    category: 'TV',
    defaultPriceAoa: 650_000,
    description: 'Home entertainment LED display with 18-month plan',
  },
  {
    id: 'prod-fridge',
    name: 'Double-Door Inverter Fridge',
    category: 'Fridge',
    defaultPriceAoa: 920_000,
    description: 'Energy-efficient household appliance with 24-month plan',
  },
  {
    id: 'prod-car',
    name: 'Compact City Car (Financed)',
    category: 'Car',
    defaultPriceAoa: 5_500_000,
    description: 'Vehicle equipment financing package up to 48 months',
  },
];

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  id: 'default-v1',
  version: 1,
  updatedAt: '2026-11-12T00:00:00.000Z',
  weights: {
    telecom: 45,
    identity: 25,
    mobileMoney: 20,
    tax: 10,
  },
  ranges: {
    simTenureMonths: [
      { label: 'Under 6 months', min: 0, max: 6, pct: 0.2 },
      { label: '6 to 24 months', min: 6, max: 24, pct: 0.6 },
      { label: 'Over 24 months', min: 24, pct: 1.0 },
    ],
    topupMonths12: [
      { label: '0–3 active top-up months', min: 0, max: 4, pct: 0.2 },
      { label: '4–8 active top-up months', min: 4, max: 9, pct: 0.6 },
      { label: '9–12 active top-up months', min: 9, pct: 1.0 },
    ],
    spendVariability: [
      { label: 'Stable spend (CV <= 0.25)', min: 0, max: 0.26, pct: 1.0 },
      { label: 'Moderate variance (0.26–0.55)', min: 0.26, max: 0.56, pct: 0.65 },
      { label: 'Volatile spend (> 0.55)', min: 0.56, pct: 0.25 },
    ],
    airtimeLoanRepaymentRatio: [
      { label: 'Poor (< 75% on-time)', min: 0, max: 0.75, pct: 0.3 },
      { label: 'Moderate (75%–94% on-time)', min: 0.75, max: 0.95, pct: 0.65 },
      { label: 'Strong (95%–100% on-time)', min: 0.95, pct: 1.0 },
    ],
    monthlySpendAoa: [
      { label: 'Low (< 3,000 AOA/mo)', min: 0, max: 3_000, pct: 0.25 },
      { label: 'Moderate (3,000–12,000 AOA/mo)', min: 3_000, max: 12_000, pct: 0.65 },
      { label: 'Consistent high (>= 12,000 AOA/mo)', min: 12_000, pct: 1.0 },
    ],
    monthlyInflowAoa: [
      { label: 'Low (< 25,000 AOA/mo)', min: 0, max: 25_000, pct: 0.35 },
      { label: 'Moderate (25,000–120,000 AOA/mo)', min: 25_000, max: 120_000, pct: 0.7 },
      { label: 'Strong (>= 120,000 AOA/mo)', min: 120_000, pct: 1.0 },
    ],
    avgBalanceAoa: [
      { label: 'Low (< 10,000 AOA)', min: 0, max: 10_000, pct: 0.3 },
      { label: 'Moderate (10,000–60,000 AOA)', min: 10_000, max: 60_000, pct: 0.7 },
      { label: 'Strong (>= 60,000 AOA)', min: 60_000, pct: 1.0 },
    ],
    txnCount90d: [
      { label: 'Light (1–9 txns / 90d)', min: 0, max: 10, pct: 0.4 },
      { label: 'Regular (10–24 txns / 90d)', min: 10, max: 25, pct: 0.75 },
      { label: 'Frequent (>= 25 txns / 90d)', min: 25, pct: 1.0 },
    ],
    failedTxnRate: [
      { label: 'Very low (<= 5% failed)', min: 0, max: 0.051, pct: 1.0 },
      { label: 'Moderate (5%–15% failed)', min: 0.051, max: 0.151, pct: 0.6 },
      { label: 'Elevated (> 15% failed)', min: 0.151, pct: 0.2 },
    ],
  },
  caps: {
    unverifiedBiMaxScore: 600,
    unpaidLoanMaxScore: 550,
    suspendedNifPointDeduction: 5,
  },
  bands: [
    { name: 'Excellent', minScore: 800, maxScore: 900 },
    { name: 'Good', minScore: 700, maxScore: 799 },
    { name: 'Fair', minScore: 551, maxScore: 699 },
    { name: 'Poor', minScore: 300, maxScore: 550 },
  ],
  creditLimitsAoa: {
    Excellent: {
      High: 7_500_000,
      Medium: 3_500_000,
      Low: 450_000,
    },
    Good: {
      High: 2_500_000,
      Medium: 1_100_000,
      Low: 300_000,
    },
    Fair: {
      High: 750_000,
      Medium: 450_000,
      Low: 180_000,
    },
    Poor: {
      High: 150_000,
      Medium: 100_000,
      Low: 60_000,
    },
  },
  templates: {
    received: {
      sms: 'Credit Intelligence (Demo): Olá {{customer_name}}, recebemos o pedido #{{application_id}} para {{product}} ({{product_price}}). Avaliação em curso.',
      emailSubject: '[Demo] Application Received — {{product}} (#{{application_id}})',
      emailBody:
        'Dear {{customer_name}},\n\nWe have received your equipment financing application (#{{application_id}}) for {{product}} priced at {{product_price}}.\n\nProxy Credit Score (demo): {{score}} ({{band}} | Confidence: {{confidence}}).\n\nNote: This is a simulated demo notification.',
    },
    auto_approve: {
      sms: 'Credit Intelligence (Demo): Parabéns {{customer_name}}! O pedido #{{application_id}} ({{product}}) foi APROVADO. Limite: {{credit_limit}}.',
      emailSubject: '[Demo] Approved — {{product}} Financing (#{{application_id}})',
      emailBody:
        'Dear {{customer_name}},\n\nGood news! Your application (#{{application_id}}) for {{product}} ({{product_price}}) has been APPROVED.\n\nAssigned Credit Limit: {{credit_limit}}\nProxy Credit Score (demo): {{score}} — {{band}} (Data Confidence: {{confidence}})\nReason: {{decision_reason}}\n\nNote: Simulated demo message; not a regulated credit offer.',
    },
    manual_review: {
      sms: 'Credit Intelligence (Demo): Olá {{customer_name}}, o pedido #{{application_id}} ({{product}}) está em revisão manual. Entraremos em contacto.',
      emailSubject: '[Demo] Manual Review Required — {{product}} (#{{application_id}})',
      emailBody:
        'Dear {{customer_name}},\n\nYour application (#{{application_id}}) for {{product}} ({{product_price}}) has been routed for manual credit analyst review.\n\nProxy Credit Score (demo): {{score}} — {{band}} (Data Confidence: {{confidence}})\nIndicative Limit: {{credit_limit}}\nReason: {{decision_reason}}\n\nNote: Simulated demo message.',
    },
    decline: {
      sms: 'Credit Intelligence (Demo): Olá {{customer_name}}, o pedido #{{application_id}} ({{product}}) não foi aprovado neste momento. Motivo: {{decision_reason}}.',
      emailSubject: '[Demo] Application Update — {{product}} (#{{application_id}})',
      emailBody:
        'Dear {{customer_name}},\n\nWe are unable to approve your application (#{{application_id}}) for {{product}} ({{product_price}}) under current demo credit rules.\n\nProxy Credit Score (demo): {{score}} — {{band}} (Data Confidence: {{confidence}})\nEligible Limit: {{credit_limit}}\nReason: {{decision_reason}}\n\nNote: Simulated demo message.',
    },
  },
};

export function cloneConfig(config: ScoringConfig): ScoringConfig {
  return JSON.parse(JSON.stringify(config)) as ScoringConfig;
}

