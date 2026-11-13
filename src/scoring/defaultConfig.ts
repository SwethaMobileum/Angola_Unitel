import type {
  ApproverRecipient,
  EditableNotificationTemplate,
  EmiPlanConfig,
  EquipmentItem,
  NotificationSettings,
  ScoringConfig,
} from './types';

export const UNITEL_MONEY_TIERS = {
  basic: {
    label: 'Basic registration',
    requirements:
      'Active Unitel mobile number, full name, date of birth, gender, mobile PIN created & confirmed, Terms & Conditions accepted (via App, USSD *449#, or Agent/Store)',
    dailyLimitAoa: 25_000,
    maxBalanceAoa: 70_000,
  },
  kyc: {
    label: 'Fully verified (KYC)',
    requirements:
      'Basic fields plus valid Government ID (National ID / Passport), ID number, date & place of issue, residential address, and BNA-compliant additional verification',
    dailyLimitAoa: 300_000,
    maxBalanceAoa: 18_000_000,
  },
} as const;

export const UNITEL_MONEY_UNBANKED_HELPER =
  'Any active Unitel subscriber can subscribe to Unitel Money, including customers without a bank account. The level of personal information provided at onboarding determines the limits.';

export const DEFAULT_EQUIPMENT_CATALOG: EquipmentItem[] = [
  {
    id: 'eq-phone-entry',
    category: 'Phone',
    item_name: 'Unitel Smart 4G (64GB) — Demo',
    price_aoa: 140_000,
    min_tier: 'low',
    active: true,
    description: 'Entry 4G smartphone eligible for Low or High volume tiers',
  },
  {
    id: 'eq-phone-5g',
    category: 'Phone',
    item_name: 'Smartphone 5G Pro (128GB) — Demo',
    price_aoa: 280_000,
    min_tier: 'low',
    active: true,
    description: 'Mid-range 5G handset with installment financing',
  },
  {
    id: 'eq-tv-32',
    category: 'TV',
    item_name: 'Smart TV 32" HD — Demo',
    price_aoa: 320_000,
    min_tier: 'low',
    active: true,
    description: 'Compact home LED TV within Basic/Low volume price ceiling',
  },
  {
    id: 'eq-tv-55',
    category: 'TV',
    item_name: 'Smart TV 55" 4K UHD — Demo',
    price_aoa: 650_000,
    min_tier: 'high',
    active: true,
    description: 'Large 4K UHD TV for High volume / KYC tier',
  },
  {
    id: 'eq-fridge',
    category: 'Fridge',
    item_name: 'Double-Door Inverter Fridge — Demo',
    price_aoa: 920_000,
    min_tier: 'high',
    active: true,
    description: 'Household inverter refrigerator for High volume / KYC tier',
  },
  {
    id: 'eq-car',
    category: 'Car',
    item_name: 'Compact City Car (Financed) — Demo',
    price_aoa: 5_500_000,
    min_tier: 'high',
    active: true,
    description: 'Vehicle equipment financing package for High volume / KYC tier',
  },
];

export const DEFAULT_EMI_PLANS: EmiPlanConfig[] = [
  {
    id: 'emi-low-3m',
    tier: 'low',
    term_months: 3,
    interest_rate_pct: 6,
    min_down_payment_pct: 15,
  },
  {
    id: 'emi-low-6m',
    tier: 'low',
    term_months: 6,
    interest_rate_pct: 9,
    min_down_payment_pct: 20,
  },
  {
    id: 'emi-high-6m',
    tier: 'high',
    term_months: 6,
    interest_rate_pct: 8,
    min_down_payment_pct: 10,
  },
  {
    id: 'emi-high-12m',
    tier: 'high',
    term_months: 12,
    interest_rate_pct: 11,
    min_down_payment_pct: 10,
  },
  {
    id: 'emi-high-24m',
    tier: 'high',
    term_months: 24,
    interest_rate_pct: 13,
    min_down_payment_pct: 15,
  },
  {
    id: 'emi-high-36m',
    tier: 'high',
    term_months: 36,
    interest_rate_pct: 15,
    min_down_payment_pct: 15,
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
  priceCeilingsAoa: {
    low: 500_000,
    high: 10_000_000,
  },
  maxMonthlyEmiRatioOfLimit: 0.1,
  templates: {
    received: {
      sms: 'Credit Intelligence (Demo): Olá {{customer_name}}, recebemos o pedido #{{application_id}} para {{product}} ({{product_price}}, EMI {{monthly_emi}}/mês). Em análise.',
      emailSubject: '[Demo] Application Submitted for Approval — {{product}} (#{{application_id}})',
      emailBody:
        'Dear {{customer_name}},\n\nYour equipment EMI application (#{{application_id}}) for {{product}} ({{product_price}}) has been submitted to our Credit Approver.\n\nSelected EMI Plan: {{emi_term}} months at {{monthly_emi}}/month\nProxy Credit Score (demo): {{score}} ({{band}} | Confidence: {{confidence}})\n\nNote: This is a simulated demo notification.',
    },
    auto_approve: {
      sms: 'Credit Intelligence (Demo): Parabéns {{customer_name}}! O pedido #{{application_id}} ({{product}}) foi APROVADO. Limite: {{credit_limit}}, EMI: {{monthly_emi}}/mês.',
      emailSubject: '[Demo] Approved — {{product}} EMI Plan (#{{application_id}})',
      emailBody:
        'Dear {{customer_name}},\n\nGood news! Your application (#{{application_id}}) for {{product}} ({{product_price}}) has been APPROVED.\n\nAssigned Credit Limit: {{credit_limit}}\nEMI Plan: {{emi_term}} months • Monthly EMI: {{monthly_emi}}\nProxy Credit Score (demo): {{score}} — {{band}} (Data Confidence: {{confidence}})\nDecision Note: {{decision_reason}}\n\nNote: Simulated demo message; not a regulated credit offer.',
    },
    manual_review: {
      sms: 'Credit Intelligence (Demo): Olá {{customer_name}}, o pedido #{{application_id}} ({{product}}) está em revisão pelo Aprovador.',
      emailSubject: '[Demo] Under Approver Review — {{product}} (#{{application_id}})',
      emailBody:
        'Dear {{customer_name}},\n\nYour application (#{{application_id}}) for {{product}} ({{product_price}}) is under Approver review.\n\nProxy Credit Score (demo): {{score}} — {{band}} (Data Confidence: {{confidence}})\nIndicative Limit: {{credit_limit}} • Monthly EMI: {{monthly_emi}}\nNote: {{decision_reason}}\n\nNote: Simulated demo message.',
    },
    decline: {
      sms: 'Credit Intelligence (Demo): Olá {{customer_name}}, o pedido #{{application_id}} ({{product}}) não foi aprovado. Motivo: {{decision_reason}}.',
      emailSubject: '[Demo] Application Decision — {{product}} (#{{application_id}})',
      emailBody:
        'Dear {{customer_name}},\n\nWe are unable to approve your application (#{{application_id}}) for {{product}} ({{product_price}}) under current demo credit rules.\n\nProxy Credit Score (demo): {{score}} — {{band}} (Data Confidence: {{confidence}})\nEligible Limit: {{credit_limit}}\nReason: {{decision_reason}}\n\nNote: Simulated demo message.',
    },
    more_info_requested: {
      sms: 'Credit Intelligence (Demo): Olá {{customer_name}}, precisamos de informação adicional para o pedido #{{application_id}}. Motivo: {{decision_reason}}.',
      emailSubject: '[Demo] More Information Requested — {{product}} (#{{application_id}})',
      emailBody:
        'Dear {{customer_name}},\n\nOur Credit Approver requested additional information before finalizing application #{{application_id}} for {{product}}.\n\nNote: {{decision_reason}}\n\nNote: Simulated demo message.',
    },
  },
};

export function cloneConfig(config: ScoringConfig): ScoringConfig {
  return JSON.parse(JSON.stringify(config)) as ScoringConfig;
}

export const DEFAULT_APPROVER_RECIPIENTS: ApproverRecipient[] = [
  {
    id: 'appr-1',
    name: 'Unitel Risk Desk (Approver 1)',
    email: 'approver1@unitel-demo.ao',
    active: true,
  },
  {
    id: 'appr-2',
    name: 'Credit Ops Lead (Approver 2)',
    email: 'approver2@unitel-demo.ao',
    active: true,
  },
  {
    id: 'appr-3',
    name: 'Senior Approver (Backup)',
    email: 'senior.approver@unitel-demo.ao',
    active: false,
  },
];

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  notify_customer: false,
};

export const DEFAULT_EMAIL_TEMPLATES: Record<'submitted' | 'approved' | 'rejected' | 'more_info', EditableNotificationTemplate> = {
  submitted: {
    event_type: 'submitted',
    version: 1,
    subject: 'New credit application {{reference}} awaiting your approval',
    body_text: `New credit application {{reference}} has been submitted and is awaiting your approval.

Submitted By: {{submitted_by_name}} ({{submitted_by_email}})
Submission Time: {{submitted_at}}

Customer: {{customer_name}} ({{mobile_no}})
Volume Tier: {{volume_tier}}
Equipment: {{equipment}} ({{price}})
EMI Plan: {{emi_term}} months • Monthly EMI: {{monthly_emi}}

Scoring & Policy Evaluation:
- Proxy Credit Score (demo): {{score}}
- Score Band: {{band}}
- Data Confidence: {{confidence}}
- Policy Suggestion: {{suggestion}}

Open in Approval Queue:
{{link}}`,
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; color: #1F2933; line-height: 1.5;">
  <div style="background-color: #E86A00; color: #ffffff; padding: 16px 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">Unitel Credit Intelligence</h2>
    <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">New Credit Application Awaiting Approval</p>
  </div>
  <div style="padding: 20px; border: 1px solid #E3E6EB; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
    <p>Application <strong>{{reference}}</strong> has been submitted by <strong>{{submitted_by_name}}</strong> ({{submitted_by_email}}) on {{submitted_at}}.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #616E7C;">Customer:</td><td style="padding: 8px; font-weight: bold;">{{customer_name}} ({{mobile_no}})</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #616E7C;">Volume Tier:</td><td style="padding: 8px;">{{volume_tier}}</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #616E7C;">Equipment:</td><td style="padding: 8px;">{{equipment}} ({{price}})</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #616E7C;">EMI Plan:</td><td style="padding: 8px;">{{emi_term}} months @ {{monthly_emi}}/mo</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #616E7C;">Proxy Score:</td><td style="padding: 8px; font-weight: bold;">{{score}} ({{band}}) • Confidence: {{confidence}}</td></tr>
      <tr><td style="padding: 8px; color: #616E7C;">System Suggestion:</td><td style="padding: 8px; font-weight: bold; color: #C2410C;">{{suggestion}}</td></tr>
    </table>
    <div style="margin-top: 24px; text-align: center;">
      <a href="{{link}}" style="background-color: #FF7A00; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Open in Approval Queue</a>
    </div>
  </div>
</div>`,
  },
  approved: {
    event_type: 'approved',
    version: 1,
    subject: 'Your credit application {{reference}} was approved',
    body_text: `Dear {{submitted_by_name}},

Good news! Credit application {{reference}} for customer {{customer_name}} ({{mobile_no}}) has been APPROVED.

Equipment: {{equipment}} ({{price}})
Approved EMI Plan: {{emi_term}} months • Monthly EMI: {{monthly_emi}}
Approved Credit Limit: {{credit_limit}}

Decision Details:
- Final Decision: APPROVED
- Decided By: {{decided_by}}
- Decision Timestamp: {{decided_at}}
- Approver Reason: {{reason}}

Next Steps:
The customer may proceed with equipment collection after confirming their initial down payment.

View Application:
{{link}}`,
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; color: #1F2933; line-height: 1.5;">
  <div style="background-color: #10B981; color: #ffffff; padding: 16px 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">Unitel Credit Intelligence</h2>
    <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Application Approved</p>
  </div>
  <div style="padding: 20px; border: 1px solid #E3E6EB; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
    <p>Dear {{submitted_by_name}},</p>
    <p>Good news! Application <strong>{{reference}}</strong> for <strong>{{customer_name}}</strong> has been <strong style="color: #10B981;">APPROVED</strong>.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #616E7C;">Equipment:</td><td style="padding: 8px;">{{equipment}} ({{price}})</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #616E7C;">Approved Limit:</td><td style="padding: 8px; font-weight: bold;">{{credit_limit}}</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #616E7C;">EMI Plan:</td><td style="padding: 8px;">{{emi_term}} months @ {{monthly_emi}}/mo</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #616E7C;">Decided By:</td><td style="padding: 8px;">{{decided_by}} on {{decided_at}}</td></tr>
      <tr><td style="padding: 8px; color: #616E7C;">Approver Reason:</td><td style="padding: 8px; font-style: italic;">{{reason}}</td></tr>
    </table>
    <div style="margin-top: 24px; text-align: center;">
      <a href="{{link}}" style="background-color: #FF7A00; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Application</a>
    </div>
  </div>
</div>`,
  },
  rejected: {
    event_type: 'rejected',
    version: 1,
    subject: 'Your credit application {{reference}} was rejected',
    body_text: `Dear {{submitted_by_name}},

Credit application {{reference}} for customer {{customer_name}} ({{mobile_no}}) was REJECTED.

Equipment: {{equipment}} ({{price}})
Requested EMI Plan: {{emi_term}} months • Monthly EMI: {{monthly_emi}}

Decision Details:
- Final Decision: REJECTED
- Decided By: {{decided_by}}
- Decision Timestamp: {{decided_at}}
- Approver Reason: {{reason}}

View Application:
{{link}}`,
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; color: #1F2933; line-height: 1.5;">
  <div style="background-color: #EF4444; color: #ffffff; padding: 16px 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">Unitel Credit Intelligence</h2>
    <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Application Rejected</p>
  </div>
  <div style="padding: 20px; border: 1px solid #E3E6EB; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
    <p>Dear {{submitted_by_name}},</p>
    <p>Credit application <strong>{{reference}}</strong> for <strong>{{customer_name}}</strong> has been <strong style="color: #EF4444;">REJECTED</strong>.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #616E7C;">Equipment:</td><td style="padding: 8px;">{{equipment}} ({{price}})</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #616E7C;">EMI Plan:</td><td style="padding: 8px;">{{emi_term}} months @ {{monthly_emi}}/mo</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #616E7C;">Decided By:</td><td style="padding: 8px;">{{decided_by}} on {{decided_at}}</td></tr>
      <tr><td style="padding: 8px; color: #616E7C;">Approver Reason:</td><td style="padding: 8px; color: #EF4444;">{{reason}}</td></tr>
    </table>
    <div style="margin-top: 24px; text-align: center;">
      <a href="{{link}}" style="background-color: #FF7A00; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Application</a>
    </div>
  </div>
</div>`,
  },
  more_info: {
    event_type: 'more_info',
    version: 1,
    subject: 'More information requested for credit application {{reference}}',
    body_text: `Dear {{submitted_by_name}},

The Credit Approver has requested additional information before finalizing application {{reference}} for customer {{customer_name}} ({{mobile_no}}).

Equipment: {{equipment}} ({{price}})

Approver Note / Required Details:
{{reason}}

Reviewer: {{decided_by}}
Timestamp: {{decided_at}}

Please update the application and re-submit:
{{link}}`,
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; color: #1F2933; line-height: 1.5;">
  <div style="background-color: #F59E0B; color: #ffffff; padding: 16px 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">Unitel Credit Intelligence</h2>
    <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">More Information Requested</p>
  </div>
  <div style="padding: 20px; border: 1px solid #E3E6EB; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
    <p>Dear {{submitted_by_name}},</p>
    <p>Additional details are required for application <strong>{{reference}}</strong> (Customer: <strong>{{customer_name}}</strong>).</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #616E7C;">Equipment:</td><td style="padding: 8px;">{{equipment}} ({{price}})</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #616E7C;">Reviewer:</td><td style="padding: 8px;">{{decided_by}} on {{decided_at}}</td></tr>
      <tr><td style="padding: 8px; color: #616E7C;">Approver Message:</td><td style="padding: 8px; font-weight: bold; color: #D97706;">{{reason}}</td></tr>
    </table>
    <div style="margin-top: 24px; text-align: center;">
      <a href="{{link}}" style="background-color: #FF7A00; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Update Application</a>
    </div>
  </div>
</div>`,
  },
};
