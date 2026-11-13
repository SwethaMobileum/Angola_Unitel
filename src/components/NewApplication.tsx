import { useEffect, useMemo, useState } from 'react';
import {
  UNITEL_MONEY_TIERS,
  UNITEL_MONEY_UNBANKED_HELPER,
  calculateEmiPlan,
  evaluateCreditScore,
  evaluateLimitAndDecision,
  formatAoa,
} from '../scoring';
import type {
  ApplicationData,
  ApplicationRecord,
  ApproverRecipient,
  AuditLogEntry,
  CustomerProfile,
  EmiPlanConfig,
  EquipmentItem,
  IdDocumentType,
  NifStatus,
  RegistrationChannel,
  Role,
  ScoringConfig,
  TaxFilingStatus,
  VolumeTier,
} from '../scoring';
import {
  BandBadge,
  ConfidenceBadge,
  SuggestedDecisionBadge,
  SourceStatusBadge,
  VolumeTierBadge,
} from './Badges';

interface NewApplicationProps {
  profiles: CustomerProfile[];
  config: ScoringConfig;
  catalog: EquipmentItem[];
  emiPlans: EmiPlanConfig[];
  role: Role;
  initialCustomerId?: string;
  approverRecipients?: ApproverRecipient[];
  onSubmitApplication: (
    app: ApplicationRecord,
    newOrUpdatedProfile: CustomerProfile,
    auditEntries: AuditLogEntry[]
  ) => void;
  onSaveWhatIfVersion: (sourceApp: ApplicationRecord, updatedProfile: CustomerProfile) => void;
  onToast: (msg: string) => void;
  onNavigate?: (screen: string) => void;
  isDemoMode?: boolean;
}

const DRAFT_STORAGE_KEY = 'unitel_ci_app_draft_v1';

const STEP_LABELS = [
  '1. Customer Details',
  '2. Transaction Volume',
  '3. Equipment & Price',
  '4. EMI Plan',
  '5. Database & Sources',
  '6. Review & Submit',
];

const LAST_SUBMITTER_EMAIL_KEY = 'unitel_last_submitter_email';
const LAST_SUBMITTER_NAME_KEY = 'unitel_last_submitter_name';

interface DraftState {
  step: number;
  // Submitter (Applicant) Details
  submittedByName: string;
  submittedByEmail: string;
  // Step 1 Customer Fields
  fullName: string;
  mobileNo: string;
  biNumber: string;
  dateOfBirth: string;
  gender: 'M' | 'F';
  city: string;
  address: string;
  // Step 2
  volumeTier: VolumeTier;
  registrationChannel: RegistrationChannel;
  pinCreated: boolean;
  termsAccepted: boolean;
  walletBalanceAoa: number;
  dailyTxnAoa: number;
  idDocType: IdDocumentType;
  idNumber: string;
  idIssueDate: string;
  idIssuePlace: string;
  residentialAddress: string;
  additionalKycVerified: boolean;
  // Step 3
  useCustomEquipment: boolean;
  selectedEquipmentId: string;
  customItemName: string;
  equipmentPriceAoa: number;
  // Step 4
  selectedEmiPlanId: string;
  // Step 5 (Source data)
  matchedCustomerId: string | null;
  simActivationDate: string;
  avgMonthlyTopupAoa: number;
  topupMonthsLast12: number;
  avgMonthlySpendAoa: number;
  spendVariability: number;
  airtimeLoansTaken: number;
  airtimeLoansRepaidOnTime: number;
  airtimeLoansUnpaid: number;
  simRegisteredWithBi: boolean;
  walletExists: boolean;
  monthlyInflowAoa: number;
  monthlyOutflowAoa: number;
  txnCount90d: number;
  failedTxnCount90d: number;
  hasBankAccount: boolean;
  idVerified: boolean;
  addressVerified: boolean;
  nifStatus: NifStatus;
  taxFilingStatus: TaxFilingStatus;
}

function createEmptyDraft(catalog: EquipmentItem[], emiPlans: EmiPlanConfig[]): DraftState {
  const defaultEq = catalog.find((c) => c.min_tier === 'low' && c.active) ?? catalog[0];
  const defaultPlan = emiPlans.find((p) => p.tier === 'low') ?? emiPlans[0];
  let rememberedEmail = '';
  let rememberedName = '';
  try {
    rememberedEmail = localStorage.getItem(LAST_SUBMITTER_EMAIL_KEY) || '';
    rememberedName = localStorage.getItem(LAST_SUBMITTER_NAME_KEY) || '';
  } catch {
    // Ignore storage issues
  }
  return {
    step: 0,
    submittedByName: rememberedName,
    submittedByEmail: rememberedEmail,
    fullName: '',
    mobileNo: '+244 923 ',
    biNumber: '',
    dateOfBirth: '1992-05-15',
    gender: 'M',
    city: 'Luanda',
    address: '',
    volumeTier: 'low',
    registrationChannel: 'app',
    pinCreated: true,
    termsAccepted: true,
    walletBalanceAoa: 5_000,
    dailyTxnAoa: 2_500,
    idDocType: 'BI',
    idNumber: '',
    idIssueDate: '2022-03-10',
    idIssuePlace: 'Luanda',
    residentialAddress: '',
    additionalKycVerified: false,
    useCustomEquipment: false,
    selectedEquipmentId: defaultEq?.id ?? '',
    customItemName: '',
    equipmentPriceAoa: defaultEq?.price_aoa ?? 140_000,
    selectedEmiPlanId: defaultPlan?.id ?? '',
    matchedCustomerId: null,
    simActivationDate: '2024-06-01',
    avgMonthlyTopupAoa: 10_000,
    topupMonthsLast12: 9,
    avgMonthlySpendAoa: 8_500,
    spendVariability: 0.25,
    airtimeLoansTaken: 1,
    airtimeLoansRepaidOnTime: 1,
    airtimeLoansUnpaid: 0,
    simRegisteredWithBi: true,
    walletExists: true,
    monthlyInflowAoa: 15_000,
    monthlyOutflowAoa: 12_000,
    txnCount90d: 8,
    failedTxnCount90d: 0,
    hasBankAccount: false,
    idVerified: true,
    addressVerified: false,
    nifStatus: 'none',
    taxFilingStatus: 'none',
  };
}

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '').trim();
}

export function isValidUnitelMobile(phone: string): boolean {
  return /^\+244\s?9\d{2}\s?\d{3}\s?\d{3}$/.test(phone.trim());
}

export function NewApplication({
  profiles,
  config,
  catalog,
  emiPlans,
  role,
  initialCustomerId,
  approverRecipients = [],
  onSubmitApplication,
  onSaveWhatIfVersion: _onSaveWhatIfVersion,
  onToast,
  onNavigate,
}: NewApplicationProps) {
  const [draft, setDraft] = useState<DraftState>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DraftState;
        return {
          ...createEmptyDraft(catalog, emiPlans),
          ...parsed,
        };
      }
    } catch {
      // ignore
    }
    return createEmptyDraft(catalog, emiPlans);
  });

  const [lookupMobile, setLookupMobile] = useState('');
  const [lookupMessage, setLookupMessage] = useState('');
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [submittedResult, setSubmittedResult] = useState<{
    app: ApplicationRecord;
    profile: CustomerProfile;
  } | null>(null);

  // Auto-save draft
  useEffect(() => {
    if (submittedResult) return;
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [draft, submittedResult]);

  // Pre-fill if launched for a specific customer
  useEffect(() => {
    if (!initialCustomerId) return;
    const found = profiles.find((p) => p.customer.id === initialCustomerId);
    if (found) {
      applyProfileToDraft(found, true);
      setSubmittedResult(null);
    }
  }, [initialCustomerId]);

  const applyProfileToDraft = (profile: CustomerProfile, includeIdentityFields: boolean) => {
    const tier: VolumeTier =
      profile.customer.volume_tier ??
      (profile.mobileMoney?.registration_level === 'kyc' ? 'high' : 'low');

    const eligibleEq =
      catalog.filter((c) => c.active && (tier === 'high' || c.min_tier === 'low'))[0] ?? catalog[0];
    const eligiblePlan = emiPlans.find((p) => p.tier === tier) ?? emiPlans[0];

    setDraft((prev) => ({
      ...prev,
      ...(includeIdentityFields
        ? {
            fullName: profile.customer.full_name,
            mobileNo: profile.customer.mobile_no,
            biNumber: profile.customer.bi_number,
            dateOfBirth: profile.customer.date_of_birth,
            gender: profile.customer.gender,
            city: profile.customer.city,
            address: profile.customer.address ?? profile.identity?.address ?? '',
            volumeTier: tier,
            idNumber: profile.customer.bi_number,
            idIssueDate: profile.identity?.id_issue_date ?? '2022-01-15',
            idIssuePlace: profile.identity?.id_issue_place ?? profile.customer.city,
            residentialAddress: profile.customer.address ?? profile.identity?.address ?? '',
            additionalKycVerified: tier === 'high' && Boolean(profile.identity?.id_verified),
            selectedEquipmentId: eligibleEq?.id ?? prev.selectedEquipmentId,
            equipmentPriceAoa: eligibleEq?.price_aoa ?? prev.equipmentPriceAoa,
            selectedEmiPlanId: eligiblePlan?.id ?? prev.selectedEmiPlanId,
          }
        : {}),
      matchedCustomerId: profile.customer.id,
      walletBalanceAoa: profile.mobileMoney?.avg_balance_aoa ?? 0,
      dailyTxnAoa: profile.mobileMoney?.daily_txn_aoa ?? 0,
      simActivationDate: profile.telecom?.sim_activation_date ?? '2024-06-01',
      avgMonthlyTopupAoa: profile.telecom?.avg_monthly_topup_aoa ?? 0,
      topupMonthsLast12: profile.telecom?.topup_months_last_12 ?? 0,
      avgMonthlySpendAoa: profile.telecom?.avg_monthly_spend_aoa ?? 0,
      spendVariability: profile.telecom?.spend_variability ?? 0.35,
      airtimeLoansTaken: profile.telecom?.airtime_loans_taken ?? 0,
      airtimeLoansRepaidOnTime: profile.telecom?.airtime_loans_repaid_on_time ?? 0,
      airtimeLoansUnpaid: profile.telecom?.airtime_loans_unpaid ?? 0,
      simRegisteredWithBi: Boolean(profile.telecom?.sim_registered_with_bi),
      walletExists: Boolean(profile.mobileMoney?.wallet_exists),
      monthlyInflowAoa: profile.mobileMoney?.monthly_inflow_aoa ?? 0,
      monthlyOutflowAoa: profile.mobileMoney?.monthly_outflow_aoa ?? 0,
      txnCount90d: profile.mobileMoney?.txn_count_90d ?? 0,
      failedTxnCount90d: profile.mobileMoney?.failed_txn_count_90d ?? 0,
      hasBankAccount: Boolean(profile.has_bank_account),
      idVerified: Boolean(profile.identity?.id_verified),
      addressVerified: Boolean(profile.identity?.address_verified),
      nifStatus: profile.tax?.nif_status ?? 'none',
      taxFilingStatus: profile.tax?.tax_filing_status ?? 'none',
    }));
  };

  // Match mobile number against database whenever entering step 4 (Step 5: Database & Sources)
  const dbMatch = useMemo(() => {
    const norm = normalizePhone(draft.mobileNo);
    if (!norm) return null;
    return profiles.find((p) => normalizePhone(p.customer.mobile_no) === norm) ?? null;
  }, [profiles, draft.mobileNo]);

  const handleFindByMobile = () => {
    const norm = normalizePhone(lookupMobile || draft.mobileNo);
    const found = profiles.find((p) => normalizePhone(p.customer.mobile_no) === norm);
    if (found) {
      applyProfileToDraft(found, true);
      setLookupMessage(`Pre-filled details for ${found.customer.full_name} (${found.customer.mobile_no}).`);
      setStepErrors({});
    } else {
      setLookupMessage('No existing subscriber matched that number — you can enter a brand-new customer below.');
    }
  };

  // Filtered equipment & EMI plans for chosen volume tier
  const priceCeiling = config.priceCeilingsAoa[draft.volumeTier];
  const filteredCatalog = useMemo(
    () =>
      catalog.filter(
        (item) =>
          item.active &&
          item.price_aoa <= priceCeiling &&
          (draft.volumeTier === 'high' || item.min_tier === 'low')
      ),
    [catalog, draft.volumeTier, priceCeiling]
  );

  const filteredEmiPlans = useMemo(
    () => emiPlans.filter((p) => p.tier === draft.volumeTier),
    [emiPlans, draft.volumeTier]
  );

  const selectedPlan = useMemo(
    () =>
      filteredEmiPlans.find((p) => p.id === draft.selectedEmiPlanId) ??
      filteredEmiPlans[0] ??
      emiPlans[0],
    [filteredEmiPlans, draft.selectedEmiPlanId, emiPlans]
  );

  const emiCalc = useMemo(
    () => calculateEmiPlan(draft.equipmentPriceAoa, selectedPlan),
    [draft.equipmentPriceAoa, selectedPlan]
  );

  const activeEquipmentName = useMemo(() => {
    if (draft.useCustomEquipment) {
      return draft.customItemName.trim() || 'Custom Equipment (Demo)';
    }
    return (
      catalog.find((c) => c.id === draft.selectedEquipmentId)?.item_name ??
      filteredCatalog[0]?.item_name ??
      'Equipment Item'
    );
  }, [draft.useCustomEquipment, draft.customItemName, draft.selectedEquipmentId, catalog, filteredCatalog]);

  // Construct live CustomerProfile from draft inputs
  const liveProfile: CustomerProfile = useMemo(() => {
    const custId = dbMatch?.customer.id ?? `cust-new-${normalizePhone(draft.mobileNo).replace(/\D/g, '') || '000'}`;
    const regLevel = draft.volumeTier === 'high' ? 'kyc' : 'basic';
    return {
      customer: {
        id: custId,
        mobile_no: draft.mobileNo.trim(),
        full_name: draft.fullName.trim() || 'New Subscriber',
        bi_number: draft.biNumber.trim().toUpperCase(),
        date_of_birth: draft.dateOfBirth,
        gender: draft.gender,
        city: draft.city,
        address: draft.address.trim(),
        volume_tier: draft.volumeTier,
      },
      has_bank_account: draft.hasBankAccount,
      telecom: {
        mobile_no: draft.mobileNo.trim(),
        sim_activation_date: draft.simActivationDate,
        avg_monthly_topup_aoa: draft.avgMonthlyTopupAoa,
        topup_months_last_12: draft.topupMonthsLast12,
        avg_monthly_spend_aoa: draft.avgMonthlySpendAoa,
        spend_variability: draft.spendVariability,
        airtime_loans_taken: draft.airtimeLoansTaken,
        airtime_loans_repaid_on_time: draft.airtimeLoansRepaidOnTime,
        airtime_loans_unpaid: draft.airtimeLoansUnpaid,
        sim_registered_with_bi: draft.simRegisteredWithBi,
      },
      mobileMoney: {
        mobile_no: draft.mobileNo.trim(),
        wallet_exists: draft.walletExists,
        registration_level: regLevel,
        monthly_inflow_aoa: draft.walletExists ? draft.monthlyInflowAoa : 0,
        monthly_outflow_aoa: draft.walletExists ? draft.monthlyOutflowAoa : 0,
        avg_balance_aoa: draft.walletExists ? draft.walletBalanceAoa : 0,
        daily_txn_aoa: draft.walletExists ? draft.dailyTxnAoa : 0,
        txn_count_90d: draft.walletExists ? draft.txnCount90d : 0,
        failed_txn_count_90d: draft.walletExists ? draft.failedTxnCount90d : 0,
      },
      identity: {
        mobile_no: draft.mobileNo.trim(),
        bi_number: draft.biNumber.trim().toUpperCase(),
        id_verified: draft.idVerified,
        id_issue_date: draft.volumeTier === 'high' ? draft.idIssueDate || null : null,
        id_issue_place: draft.volumeTier === 'high' ? draft.idIssuePlace || null : null,
        address: draft.residentialAddress.trim() || draft.address.trim(),
        address_verified: draft.addressVerified,
      },
      tax: {
        mobile_no: draft.mobileNo.trim(),
        nif: draft.biNumber.trim().toUpperCase(),
        nif_status: draft.nifStatus,
        tax_filing_status: draft.taxFilingStatus,
      },
    };
  }, [draft, dbMatch]);

  const liveExplanation = useMemo(
    () => evaluateCreditScore(liveProfile, config),
    [liveProfile, config]
  );

  const liveDecision = useMemo(
    () =>
      evaluateLimitAndDecision(
        liveExplanation,
        draft.equipmentPriceAoa,
        config,
        emiCalc.monthly_emi_aoa
      ),
    [liveExplanation, draft.equipmentPriceAoa, config, emiCalc.monthly_emi_aoa]
  );

  const validateStep = (targetStep: number): boolean => {
    const errors: Record<string, string> = {};
    if (targetStep === 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!draft.submittedByEmail.trim()) {
        errors.submittedByEmail = 'Your email (for notifications) is required.';
      } else if (!emailRegex.test(draft.submittedByEmail.trim())) {
        errors.submittedByEmail = 'Please enter a valid email address (e.g. analyst@unitel-demo.ao).';
      }

      if (!draft.submittedByName.trim()) {
        errors.submittedByName = 'Your name is required.';
      }

      if (!draft.fullName.trim()) errors.fullName = 'Full name is required.';
      if (!isValidUnitelMobile(draft.mobileNo)) {
        errors.mobileNo = 'Enter a valid Unitel Angola number (+244 9XX XXX XXX).';
      }
      if (draft.biNumber.trim().length !== 14) {
        errors.biNumber = 'BI number must be exactly 14 characters (e.g. 004198201LA041).';
      }
      if (!draft.dateOfBirth) errors.dateOfBirth = 'Date of birth is required.';
      if (!draft.address.trim()) errors.address = 'Address is required.';
    }

    if (targetStep === 1) {
      const tierLimits =
        draft.volumeTier === 'low' ? UNITEL_MONEY_TIERS.basic : UNITEL_MONEY_TIERS.kyc;
      if (!draft.pinCreated) errors.pinCreated = 'Mobile PIN creation & confirmation is required.';
      if (!draft.termsAccepted) errors.termsAccepted = 'Terms & Conditions acceptance is required.';
      if (draft.walletBalanceAoa > tierLimits.maxBalanceAoa) {
        errors.walletBalanceAoa = `Wallet balance (${formatAoa(draft.walletBalanceAoa)}) exceeds the ${tierLimits.label} limit of ${formatAoa(tierLimits.maxBalanceAoa)}.`;
      }
      if (draft.dailyTxnAoa > tierLimits.dailyLimitAoa) {
        errors.dailyTxnAoa = `Daily transaction amount (${formatAoa(draft.dailyTxnAoa)}) exceeds the ${tierLimits.label} daily limit of ${formatAoa(tierLimits.dailyLimitAoa)}.`;
      }
      if (draft.volumeTier === 'high') {
        if (!draft.idNumber.trim()) errors.idNumber = 'ID number is required for Enhanced KYC.';
        if (!draft.idIssueDate) errors.idIssueDate = 'ID issue date is required.';
        if (!draft.idIssuePlace.trim()) errors.idIssuePlace = 'ID place of issue is required.';
        if (!draft.residentialAddress.trim()) {
          errors.residentialAddress = 'Residential address is required for Enhanced KYC.';
        }
      }
    }

    if (targetStep === 2) {
      if (draft.useCustomEquipment && !draft.customItemName.trim()) {
        errors.customItemName = 'Enter a custom equipment name.';
      }
      if (draft.equipmentPriceAoa <= 0) {
        errors.equipmentPriceAoa = 'Price must be greater than 0 AOA.';
      } else if (draft.equipmentPriceAoa > priceCeiling) {
        errors.equipmentPriceAoa = `Price (${formatAoa(draft.equipmentPriceAoa)}) exceeds the ${draft.volumeTier.toUpperCase()} volume ceiling of ${formatAoa(priceCeiling)}.`;
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goToStep = (nextStep: number) => {
    if (nextStep > draft.step && !validateStep(draft.step)) {
      onToast('Please fix the highlighted validation fields before continuing.');
      return;
    }

    // Auto-fetch from DB when entering Step 5 (index 4) if mobile matches a stored customer
    if (nextStep === 4 && dbMatch && draft.matchedCustomerId !== dbMatch.customer.id) {
      applyProfileToDraft(dbMatch, false);
      onToast(`Fetched 4 data sources for ${dbMatch.customer.full_name} from subscriber database.`);
    }

    setStepErrors({});
    setDraft((prev) => ({ ...prev, step: nextStep }));
  };

  const handleVolumeTierChange = (tier: VolumeTier) => {
    const ceiling = config.priceCeilingsAoa[tier];
    const nextCatalog = catalog.filter(
      (c) => c.active && c.price_aoa <= ceiling && (tier === 'high' || c.min_tier === 'low')
    );
    const nextEq = nextCatalog[0];
    const nextPlan = emiPlans.find((p) => p.tier === tier) ?? emiPlans[0];

    setStepErrors({});
    setDraft((prev) => ({
      ...prev,
      volumeTier: tier,
      idNumber: prev.idNumber || prev.biNumber,
      residentialAddress: prev.residentialAddress || prev.address,
      selectedEquipmentId: nextEq?.id ?? prev.selectedEquipmentId,
      equipmentPriceAoa: nextEq?.price_aoa ?? prev.equipmentPriceAoa,
      selectedEmiPlanId: nextPlan?.id ?? prev.selectedEmiPlanId,
    }));
  };

  const handleFinalSubmit = () => {
    const now = new Date().toISOString();
    const appId = `APP-${Math.floor(2000 + Math.random() * 7999)}`;
    const appData: ApplicationData = {
      registration_channel: draft.registrationChannel,
      pin_created: draft.pinCreated,
      terms_accepted: draft.termsAccepted,
      id_doc_type: draft.volumeTier === 'high' ? draft.idDocType : undefined,
      id_number: draft.volumeTier === 'high' ? draft.idNumber : undefined,
      id_issue_date: draft.volumeTier === 'high' ? draft.idIssueDate : undefined,
      id_issue_place: draft.volumeTier === 'high' ? draft.idIssuePlace : undefined,
      residential_address: draft.residentialAddress || draft.address,
      additional_kyc_verified: draft.volumeTier === 'high' ? draft.additionalKycVerified : false,
      has_bank_account: draft.hasBankAccount,
      daily_txn_aoa: draft.dailyTxnAoa,
    };

    const app: ApplicationRecord = {
      id: appId,
      customer_id: liveProfile.customer.id,
      customer_name: liveProfile.customer.full_name,
      mobile_no: liveProfile.customer.mobile_no,
      volume_tier: draft.volumeTier,
      equipment_id: draft.useCustomEquipment ? undefined : draft.selectedEquipmentId,
      product: activeEquipmentName,
      product_price_aoa: draft.equipmentPriceAoa,
      emi_term_months: emiCalc.term_months,
      emi_rate_pct: emiCalc.interest_rate_pct,
      down_payment_aoa: emiCalc.down_payment_aoa,
      monthly_emi_aoa: emiCalc.monthly_emi_aoa,
      total_payable_aoa: emiCalc.total_payable_aoa,
      emi_affordable: liveDecision.emiAffordable,
      max_monthly_emi_aoa: liveDecision.maxMonthlyEmiAoa,
      status: 'pending_review', // Always routes to Approver for final decision
      score: liveExplanation.score,
      band: liveExplanation.band,
      confidence: liveExplanation.confidence,
      credit_limit_aoa: liveDecision.creditLimitAoa,
      decision: liveDecision.decision,
      decision_reason: liveDecision.decisionReason,
      created_by_role: role,
      score_config_version: config.version,
      application_data: appData,
      profile_snapshot: liveProfile,
      submitted_by_name: draft.submittedByName.trim(),
      submitted_by_email: draft.submittedByEmail.trim(),
      created_at: now,
    };

    if (draft.submittedByEmail.trim()) {
      try {
        localStorage.setItem(LAST_SUBMITTER_EMAIL_KEY, draft.submittedByEmail.trim());
      } catch {
        // ignore
      }
    }
    if (draft.submittedByName.trim()) {
      try {
        localStorage.setItem(LAST_SUBMITTER_NAME_KEY, draft.submittedByName.trim());
      } catch {
        // ignore
      }
    }

    const auditEntries: AuditLogEntry[] = [
      {
        id: `audit-${appId}-1`,
        application_id: appId,
        step_name: 'Customer & Volume Onboarding',
        inputs_snapshot: {
          full_name: app.customer_name,
          mobile_no: app.mobile_no,
          volume_tier: app.volume_tier,
          channel: appData.registration_channel,
          has_bank_account: appData.has_bank_account,
          submitted_by_name: app.submitted_by_name,
          submitted_by_email: app.submitted_by_email,
          customer_email: app.customer_email,
        },
        score_config_version: config.version,
        decision: 'captured',
        decision_reason: `Volume tier: ${app.volume_tier}`,
        role,
        timestamp: now,
      },
      {
        id: `audit-${appId}-2`,
        application_id: appId,
        step_name: 'Equipment, EMI & Scoring Evaluation',
        inputs_snapshot: {
          product: app.product,
          price_aoa: app.product_price_aoa,
          emi_term_months: app.emi_term_months,
          monthly_emi_aoa: app.monthly_emi_aoa,
          confidence: app.confidence,
        },
        score_config_version: config.version,
        score: app.score,
        decision: app.decision,
        decision_reason: app.decision_reason,
        role,
        timestamp: now,
      },
      {
        id: `audit-${appId}-3`,
        application_id: appId,
        step_name: 'Submitted to Approver Queue',
        inputs_snapshot: { status: 'pending_review' },
        score_config_version: config.version,
        score: app.score,
        decision: 'pending_review',
        decision_reason: `Routed to Approver (Suggestion: ${liveDecision.decisionLabel})`,
        role,
        timestamp: now,
      },
    ];

    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setSubmittedResult({ app, profile: liveProfile });
    onSubmitApplication(app, liveProfile, auditEntries);
  };

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraft(createEmptyDraft(catalog, emiPlans));
    setLookupMessage('');
    setStepErrors({});
    setSubmittedResult(null);
    onToast('Draft cleared.');
  };

  // Result Page after Submit (Clean confirmation per spec)
  if (submittedResult) {
    const { app } = submittedResult;
    const activeApprovers = approverRecipients.filter((a) => a.active);
    const approverEmailsStr =
      activeApprovers.length > 0
        ? activeApprovers.map((a) => a.email).join(', ')
        : 'the Approver';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          className="card"
          style={{
            padding: '40px 24px',
            textAlign: 'center',
            maxWidth: 580,
            margin: '24px auto',
            width: '100%',
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>📬</div>
          <h2 className="page-title" style={{ marginBottom: 8 }}>
            Application Submitted
          </h2>
          <div style={{ fontSize: 16, color: 'var(--text)', marginBottom: 16 }}>
            Reference: <strong>{app.id}</strong>
          </div>
          <div style={{ marginBottom: 16 }}>
            <span
              className="badge"
              style={{
                background: 'var(--brand-50)',
                color: 'var(--brand-700)',
                border: '1px solid var(--brand-500)',
                fontSize: 14,
                padding: '6px 14px',
                fontWeight: 600,
              }}
            >
              Waiting for approval
            </span>
          </div>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 14,
              marginBottom: 28,
              lineHeight: 1.5,
            }}
          >
            An email was sent to <strong>{approverEmailsStr}</strong>
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('my_applications');
                } else {
                  handleClearDraft();
                }
              }}
            >
              View My Applications
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleClearDraft}
            >
              Create another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">New Equipment EMI Application</h2>
          <p className="page-subtitle">
            Draft auto-saved locally • Complete all 6 steps to score and submit to the Approver.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge band-fair">✓ Draft Auto-Saved</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearDraft}>
            Reset / New Blank Form
          </button>
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="stepper">
        {STEP_LABELS.map((label, idx) => (
          <button
            key={label}
            type="button"
            className={`step-pill ${draft.step === idx ? 'active' : idx < draft.step ? 'done' : ''}`}
            onClick={() => {
              if (idx <= draft.step) goToStep(idx);
            }}
          >
            <span className="step-num">{idx < draft.step ? '✓' : idx + 1}</span>
            <span>{label.replace(/^\d+\.\s*/, '')}</span>
          </button>
        ))}
      </div>

      {/* STEP 1: Customer Details */}
      {draft.step === 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Step 1: Customer Details &amp; Submitter Notification</h3>
          </div>

          {/* Submitter (Analyst) Notification Information */}
          <div className="card-tinted" style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 10px', color: 'var(--brand-700)', fontSize: 14 }}>
              Submitter Information (Email Notifications)
            </h4>
            <div className="grid-2">
              <div>
                <label className="field-label">Your Name *</label>
                <input
                  type="text"
                  className={`input ${stepErrors.submittedByName ? 'input-error' : ''}`}
                  placeholder="e.g. Thomas Silva"
                  value={draft.submittedByName}
                  onChange={(e) => setDraft((p) => ({ ...p, submittedByName: e.target.value }))}
                />
                {stepErrors.submittedByName && (
                  <div className="field-error">{stepErrors.submittedByName}</div>
                )}
              </div>

              <div>
                <label className="field-label">Your email (for notifications) *</label>
                <input
                  type="email"
                  className={`input ${stepErrors.submittedByEmail ? 'input-error' : ''}`}
                  placeholder="e.g. analyst@unitel-demo.ao"
                  value={draft.submittedByEmail}
                  onChange={(e) => setDraft((p) => ({ ...p, submittedByEmail: e.target.value }))}
                />
                <div className="field-helper">
                  You will receive an email when your application is approved or rejected.
                </div>
                {stepErrors.submittedByEmail && (
                  <div className="field-error">{stepErrors.submittedByEmail}</div>
                )}
              </div>
            </div>
          </div>

          <div className="card-tinted" style={{ marginBottom: 16 }}>
            <label className="field-label">Find Existing Customer by Mobile Number (Optional)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="text"
                className="input"
                style={{ maxWidth: 280 }}
                placeholder="e.g. +244 923 100 001"
                value={lookupMobile}
                onChange={(e) => setLookupMobile(e.target.value)}
              />
              <button type="button" className="btn btn-secondary" onClick={handleFindByMobile}>
                Find Existing Customer
              </button>
            </div>
            {lookupMessage && <div className="field-helper">{lookupMessage}</div>}
          </div>

          <div className="grid-2">
            <div>
              <label className="field-label">Full Name *</label>
              <input
                type="text"
                className={`input ${stepErrors.fullName ? 'input-error' : ''}`}
                placeholder="e.g. Ana Paula Mendes"
                value={draft.fullName}
                onChange={(e) => setDraft((p) => ({ ...p, fullName: e.target.value }))}
              />
              {stepErrors.fullName && <div className="field-error">{stepErrors.fullName}</div>}
            </div>

            <div>
              <label className="field-label">Unitel Mobile Number * (+244 9XX XXX XXX)</label>
              <input
                type="text"
                className={`input ${stepErrors.mobileNo ? 'input-error' : ''}`}
                placeholder="+244 923 456 789"
                value={draft.mobileNo}
                onChange={(e) => setDraft((p) => ({ ...p, mobileNo: e.target.value }))}
              />
              {stepErrors.mobileNo && <div className="field-error">{stepErrors.mobileNo}</div>}
            </div>

            <div>
              <label className="field-label">BI Number * (14 characters)</label>
              <input
                type="text"
                maxLength={14}
                className={`input ${stepErrors.biNumber ? 'input-error' : ''}`}
                placeholder="004198201LA041"
                value={draft.biNumber}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, biNumber: e.target.value.toUpperCase() }))
                }
              />
              <div className="field-helper">{draft.biNumber.trim().length}/14 characters</div>
              {stepErrors.biNumber && <div className="field-error">{stepErrors.biNumber}</div>}
            </div>

            <div>
              <label className="field-label">Date of Birth *</label>
              <input
                type="date"
                className={`input ${stepErrors.dateOfBirth ? 'input-error' : ''}`}
                value={draft.dateOfBirth}
                onChange={(e) => setDraft((p) => ({ ...p, dateOfBirth: e.target.value }))}
              />
              {stepErrors.dateOfBirth && <div className="field-error">{stepErrors.dateOfBirth}</div>}
            </div>

            <div>
              <label className="field-label">Gender *</label>
              <select
                className="select"
                value={draft.gender}
                onChange={(e) => setDraft((p) => ({ ...p, gender: e.target.value as 'M' | 'F' }))}
              >
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
              </select>
            </div>

            <div>
              <label className="field-label">City / Province *</label>
              <select
                className="select"
                value={draft.city}
                onChange={(e) => setDraft((p) => ({ ...p, city: e.target.value }))}
              >
                <option value="Luanda">Luanda</option>
                <option value="Benguela">Benguela</option>
                <option value="Huambo">Huambo</option>
                <option value="Lubango">Lubango</option>
                <option value="Cabinda">Cabinda</option>
                <option value="Malanje">Malanje</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="field-label">Residential Address *</label>
            <input
              type="text"
              className={`input ${stepErrors.address ? 'input-error' : ''}`}
              placeholder="Rua Comandante Gika, 42, Luanda"
              value={draft.address}
              onChange={(e) => setDraft((p) => ({ ...p, address: e.target.value }))}
            />
            {stepErrors.address && <div className="field-error">{stepErrors.address}</div>}
          </div>
        </div>
      )}

      {/* STEP 2: Transaction Volume */}
      {draft.step === 1 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Step 2: Transaction Volume &amp; Unitel Money Verification</h3>
          </div>

          <div className="alert-box" style={{ marginBottom: 14 }}>
            <strong>Unitel Money Onboarding Rule:</strong> {UNITEL_MONEY_UNBANKED_HELPER}
          </div>

          <div className="grid-2" style={{ marginBottom: 16 }}>
            <button
              type="button"
              className={`card-selectable ${draft.volumeTier === 'low' ? 'selected' : ''}`}
              onClick={() => handleVolumeTierChange('low')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong style={{ fontSize: 16, color: 'var(--brand-700)' }}>Low Volume</strong>
                <span className="badge band-fair">Basic Verification</span>
              </div>
              <div style={{ fontSize: 13 }}>
                Low-level digital transactions. Requires <strong>Basic Registration</strong> only.
              </div>
              <div style={{ fontSize: 12, marginTop: 8, fontWeight: 700 }}>
                Limits: up to 25,000 AOA daily • up to 70,000 AOA wallet balance
              </div>
            </button>

            <button
              type="button"
              className={`card-selectable ${draft.volumeTier === 'high' ? 'selected' : ''}`}
              onClick={() => handleVolumeTierChange('high')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong style={{ fontSize: 16, color: 'var(--brand-700)' }}>High Volume</strong>
                <span className="badge band-excellent">Basic + Enhanced KYC</span>
              </div>
              <div style={{ fontSize: 13 }}>
                Higher-value equipment &amp; digital flows. Requires <strong>Enhanced KYC</strong>{' '}
                (Government ID + address + BNA check).
              </div>
              <div style={{ fontSize: 12, marginTop: 8, fontWeight: 700 }}>
                Limits: up to 300,000 AOA daily • up to 18,000,000 AOA wallet balance
              </div>
            </button>
          </div>

          {/* Basic Fields (always shown) */}
          <div className="card-tinted" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: 'var(--brand-700)', marginBottom: 10 }}>
              Basic Registration Verification
            </div>
            <div className="grid-3">
              <div>
                <label className="field-label">Subscriber Name / DOB / Gender</label>
                <div style={{ fontSize: 13, paddingTop: 6 }}>
                  <strong>{draft.fullName || 'New Subscriber'}</strong> • {draft.dateOfBirth} •{' '}
                  {draft.gender}
                </div>
              </div>

              <div>
                <label className="field-label">Registration Channel</label>
                <select
                  className="select"
                  value={draft.registrationChannel}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      registrationChannel: e.target.value as RegistrationChannel,
                    }))
                  }
                >
                  <option value="app">Unitel Money Mobile App</option>
                  <option value="ussd">USSD *449#</option>
                  <option value="agent">Authorized Agent or Store</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={draft.pinCreated}
                    onChange={(e) => setDraft((p) => ({ ...p, pinCreated: e.target.checked }))}
                  />
                  Mobile PIN created &amp; confirmed
                </label>
                {stepErrors.pinCreated && <div className="field-error">{stepErrors.pinCreated}</div>}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={draft.termsAccepted}
                    onChange={(e) => setDraft((p) => ({ ...p, termsAccepted: e.target.checked }))}
                  />
                  Terms &amp; Conditions accepted
                </label>
                {stepErrors.termsAccepted && (
                  <div className="field-error">{stepErrors.termsAccepted}</div>
                )}
              </div>
            </div>

            <div className="grid-2" style={{ marginTop: 12 }}>
              <div>
                <label className="field-label">
                  Wallet Balance (AOA) — Max{' '}
                  {formatAoa(
                    draft.volumeTier === 'low'
                      ? UNITEL_MONEY_TIERS.basic.maxBalanceAoa
                      : UNITEL_MONEY_TIERS.kyc.maxBalanceAoa
                  )}
                </label>
                <input
                  type="number"
                  className={`input ${stepErrors.walletBalanceAoa ? 'input-error' : ''}`}
                  value={draft.walletBalanceAoa}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, walletBalanceAoa: Number(e.target.value) || 0 }))
                  }
                />
                {stepErrors.walletBalanceAoa && (
                  <div className="field-error">{stepErrors.walletBalanceAoa}</div>
                )}
              </div>

              <div>
                <label className="field-label">
                  Daily Transaction Amount (AOA) — Max{' '}
                  {formatAoa(
                    draft.volumeTier === 'low'
                      ? UNITEL_MONEY_TIERS.basic.dailyLimitAoa
                      : UNITEL_MONEY_TIERS.kyc.dailyLimitAoa
                  )}
                </label>
                <input
                  type="number"
                  className={`input ${stepErrors.dailyTxnAoa ? 'input-error' : ''}`}
                  value={draft.dailyTxnAoa}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, dailyTxnAoa: Number(e.target.value) || 0 }))
                  }
                />
                {stepErrors.dailyTxnAoa && (
                  <div className="field-error">{stepErrors.dailyTxnAoa}</div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced KYC Fields (ONLY shown for High Volume) */}
          {draft.volumeTier === 'high' && (
            <div className="card-tinted">
              <div style={{ fontWeight: 700, color: 'var(--brand-700)', marginBottom: 10 }}>
                Enhanced KYC Verification (Required for High Volume)
              </div>
              <div className="grid-3">
                <div>
                  <label className="field-label">ID Document Type *</label>
                  <select
                    className="select"
                    value={draft.idDocType}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, idDocType: e.target.value as IdDocumentType }))
                    }
                  >
                    <option value="BI">National ID (BI)</option>
                    <option value="Passport">Passport</option>
                    <option value="Other">Other Government ID</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Identification Number *</label>
                  <input
                    type="text"
                    className={`input ${stepErrors.idNumber ? 'input-error' : ''}`}
                    value={draft.idNumber}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, idNumber: e.target.value.toUpperCase() }))
                    }
                  />
                  {stepErrors.idNumber && <div className="field-error">{stepErrors.idNumber}</div>}
                </div>

                <div>
                  <label className="field-label">Date of Issue *</label>
                  <input
                    type="date"
                    className={`input ${stepErrors.idIssueDate ? 'input-error' : ''}`}
                    value={draft.idIssueDate}
                    onChange={(e) => setDraft((p) => ({ ...p, idIssueDate: e.target.value }))}
                  />
                  {stepErrors.idIssueDate && (
                    <div className="field-error">{stepErrors.idIssueDate}</div>
                  )}
                </div>

                <div>
                  <label className="field-label">Place of Issue *</label>
                  <input
                    type="text"
                    className={`input ${stepErrors.idIssuePlace ? 'input-error' : ''}`}
                    value={draft.idIssuePlace}
                    onChange={(e) => setDraft((p) => ({ ...p, idIssuePlace: e.target.value }))}
                  />
                  {stepErrors.idIssuePlace && (
                    <div className="field-error">{stepErrors.idIssuePlace}</div>
                  )}
                </div>

                <div>
                  <label className="field-label">Residential Address *</label>
                  <input
                    type="text"
                    className={`input ${stepErrors.residentialAddress ? 'input-error' : ''}`}
                    value={draft.residentialAddress}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, residentialAddress: e.target.value }))
                    }
                  />
                  {stepErrors.residentialAddress && (
                    <div className="field-error">{stepErrors.residentialAddress}</div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', paddingTop: 18 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={draft.additionalKycVerified}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, additionalKycVerified: e.target.checked }))
                      }
                    />
                    Additional BNA KYC verification completed
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Equipment & Price */}
      {draft.step === 2 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                Step 3: Equipment Selection (Demo Prices)
              </h3>
              <div style={{ fontSize: 12.5 }}>
                Filtered for <VolumeTierBadge tier={draft.volumeTier} /> • Admin price ceiling:{' '}
                <strong>{formatAoa(priceCeiling)}</strong>
              </div>
            </div>
          </div>

          <div className="grid-3" style={{ marginBottom: 16 }}>
            {filteredCatalog.map((item) => {
              const selected = !draft.useCustomEquipment && draft.selectedEquipmentId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`card-selectable ${selected ? 'selected' : ''}`}
                  onClick={() =>
                    setDraft((p) => ({
                      ...p,
                      useCustomEquipment: false,
                      selectedEquipmentId: item.id,
                      equipmentPriceAoa: item.price_aoa,
                    }))
                  }
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="badge band-fair">{item.category}</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>Demo Price</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14.5 }}>{item.item_name}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 6 }}>
                    {formatAoa(item.price_aoa)}
                  </div>
                  {item.description && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>{item.description}</div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="card-tinted">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={draft.useCustomEquipment}
                onChange={(e) => setDraft((p) => ({ ...p, useCustomEquipment: e.target.checked }))}
              />
              Enter Custom Equipment Item &amp; Price (within {formatAoa(priceCeiling)} ceiling)
            </label>

            <div className="grid-2">
              <div>
                <label className="field-label">Custom Equipment Name</label>
                <input
                  type="text"
                  className={`input ${stepErrors.customItemName ? 'input-error' : ''}`}
                  disabled={!draft.useCustomEquipment}
                  placeholder="e.g. Solar Inverter Kit"
                  value={draft.customItemName}
                  onChange={(e) => setDraft((p) => ({ ...p, customItemName: e.target.value }))}
                />
                {stepErrors.customItemName && (
                  <div className="field-error">{stepErrors.customItemName}</div>
                )}
              </div>

              <div>
                <label className="field-label">Equipment Price (AOA)</label>
                <input
                  type="number"
                  className={`input ${stepErrors.equipmentPriceAoa ? 'input-error' : ''}`}
                  value={draft.equipmentPriceAoa}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, equipmentPriceAoa: Number(e.target.value) || 0 }))
                  }
                />
                {stepErrors.equipmentPriceAoa && (
                  <div className="field-error">{stepErrors.equipmentPriceAoa}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: EMI Plan */}
      {draft.step === 3 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Step 4: Select EMI Plan</h3>
              <div style={{ fontSize: 12.5 }}>
                Plans tailored for <VolumeTierBadge tier={draft.volumeTier} /> •{' '}
                {activeEquipmentName} ({formatAoa(draft.equipmentPriceAoa)})
              </div>
            </div>
          </div>

          <div className="grid-2">
            {filteredEmiPlans.map((plan) => {
              const calc = calculateEmiPlan(draft.equipmentPriceAoa, plan);
              const selected = selectedPlan?.id === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  className={`card-selectable ${selected ? 'selected' : ''}`}
                  onClick={() => setDraft((p) => ({ ...p, selectedEmiPlanId: plan.id }))}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <strong style={{ fontSize: 17, color: 'var(--brand-700)' }}>
                      {plan.term_months} Months EMI
                    </strong>
                    <span className="badge band-good">{plan.interest_rate_pct}% APR (Demo)</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>
                    {formatAoa(calc.monthly_emi_aoa)} <span style={{ fontSize: 13 }}>/ month</span>
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 8 }}>
                    Down payment ({plan.min_down_payment_pct}%):{' '}
                    <strong>{formatAoa(calc.down_payment_aoa)}</strong> • Total payable:{' '}
                    <strong>{formatAoa(calc.total_payable_aoa)}</strong>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 5: Database & Sources */}
      {draft.step === 4 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Step 5: Subscriber Data Sources &amp; Banking Check</h3>
              <div style={{ fontSize: 12.5 }}>
                Lookup key: <strong>{draft.mobileNo}</strong> —{' '}
                {dbMatch ? (
                  <span className="badge band-good">
                    Found in database ({dbMatch.customer.full_name})
                  </span>
                ) : (
                  <span className="badge band-fair">
                    New customer (not in database) — enter source fields manually below
                  </span>
                )}
              </div>
            </div>

            <div style={{ minWidth: 250 }}>
              <label className="field-label">Fill Sample Data (Quick Demo)</label>
              <select
                className="select"
                value={draft.matchedCustomerId ?? ''}
                onChange={(e) => {
                  const found = profiles.find((p) => p.customer.id === e.target.value);
                  if (found) {
                    applyProfileToDraft(found, true);
                    onToast(`Loaded sample customer: ${found.customer.full_name}`);
                  }
                }}
              >
                <option value="">-- Choose example persona --</option>
                {profiles.slice(0, 5).map((p) => (
                  <option key={p.customer.id} value={p.customer.id}>
                    {p.customer.full_name} ({p.customer.mobile_no})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-4" style={{ marginBottom: 16 }}>
            <div className="card-tinted" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Telecom</strong>
                <SourceStatusBadge status={liveExplanation.sourceStatuses.telecom} />
              </div>
            </div>
            <div className="card-tinted" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Mobile Money</strong>
                <SourceStatusBadge status={liveExplanation.sourceStatuses.mobileMoney} />
              </div>
            </div>
            <div className="card-tinted" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Identity</strong>
                <SourceStatusBadge status={liveExplanation.sourceStatuses.identity} />
              </div>
            </div>
            <div className="card-tinted" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Tax (AGT)</strong>
                <SourceStatusBadge status={liveExplanation.sourceStatuses.tax} />
              </div>
            </div>
          </div>

          <div className="grid-2">
            {/* Telecom Source Form */}
            <div className="card" style={{ padding: 14 }}>
              <strong style={{ color: 'var(--brand-700)', display: 'block', marginBottom: 10 }}>
                1. Telecom Behavior
              </strong>
              <div className="grid-2">
                <div>
                  <label className="field-label">SIM Activation Date</label>
                  <input
                    type="date"
                    className="input"
                    value={draft.simActivationDate}
                    onChange={(e) => setDraft((p) => ({ ...p, simActivationDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="field-label">Avg Monthly Top-up (AOA)</label>
                  <input
                    type="number"
                    className="input"
                    value={draft.avgMonthlyTopupAoa}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, avgMonthlyTopupAoa: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Top-up Months (Last 12m)</label>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    className="input"
                    value={draft.topupMonthsLast12}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, topupMonthsLast12: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Airtime Loans Taken</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={draft.airtimeLoansTaken}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, airtimeLoansTaken: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Loans Repaid On Time</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={draft.airtimeLoansRepaidOnTime}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        airtimeLoansRepaidOnTime: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Unpaid Airtime Loans</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={draft.airtimeLoansUnpaid}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, airtimeLoansUnpaid: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={draft.simRegisteredWithBi}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, simRegisteredWithBi: e.target.checked }))
                  }
                />
                SIM registered with matching BI
              </label>
            </div>

            {/* Mobile Money, Banking, Identity, Tax */}
            <div className="card" style={{ padding: 14 }}>
              <strong style={{ color: 'var(--brand-700)', display: 'block', marginBottom: 10 }}>
                2. Unitel Money, Banking, Identity &amp; Tax
              </strong>
              <div className="grid-2">
                <div>
                  <label className="field-label">Avg Monthly Inflow (AOA)</label>
                  <input
                    type="number"
                    className="input"
                    disabled={!draft.walletExists}
                    value={draft.monthlyInflowAoa}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, monthlyInflowAoa: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Transactions (Last 90d)</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    disabled={!draft.walletExists}
                    value={draft.txnCount90d}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, txnCount90d: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Failed Transactions (90d)</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    disabled={!draft.walletExists}
                    value={draft.failedTxnCount90d}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, failedTxnCount90d: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">NIF Status</label>
                  <select
                    className="select"
                    value={draft.nifStatus}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, nifStatus: e.target.value as NifStatus }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended (-5 pts)</option>
                    <option value="none">None (neutral)</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Tax Filing Status</label>
                  <select
                    className="select"
                    value={draft.taxFilingStatus}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        taxFilingStatus: e.target.value as TaxFilingStatus,
                      }))
                    }
                  >
                    <option value="regular">Regular</option>
                    <option value="irregular">Irregular</option>
                    <option value="none">None (neutral)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, fontSize: 13 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={draft.walletExists}
                    onChange={(e) => setDraft((p) => ({ ...p, walletExists: e.target.checked }))}
                  />
                  Has Unitel Money wallet ({draft.volumeTier === 'high' ? 'KYC' : 'Basic'})
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={draft.hasBankAccount}
                    onChange={(e) => setDraft((p) => ({ ...p, hasBankAccount: e.target.checked }))}
                  />
                  Has traditional bank account (Neutral — unbanked is never penalized)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={draft.idVerified}
                    onChange={(e) => setDraft((p) => ({ ...p, idVerified: e.target.checked }))}
                  />
                  BI Identity Verified
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={draft.addressVerified}
                    onChange={(e) => setDraft((p) => ({ ...p, addressVerified: e.target.checked }))}
                  />
                  Residential Address Verified
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: Review & Submit */}
      {draft.step === 5 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Step 6: Review &amp; Submit for Approval</h3>
            <ConfidenceBadge confidence={liveExplanation.confidence} />
          </div>

          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="card-tinted">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong>Customer &amp; Volume Tier</strong>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft((p) => ({ ...p, step: 0 }))}>
                  Edit
                </button>
              </div>
              <div style={{ fontSize: 13 }}>
                <div><strong>{draft.fullName}</strong> ({draft.mobileNo})</div>
                <div>BI: {draft.biNumber} • {draft.city}</div>
                <div style={{ marginTop: 4 }}><VolumeTierBadge tier={draft.volumeTier} /></div>
              </div>
            </div>

            <div className="card-tinted">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong>Equipment &amp; EMI Plan</strong>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft((p) => ({ ...p, step: 2 }))}>
                  Edit
                </button>
              </div>
              <div style={{ fontSize: 13 }}>
                <div><strong>{activeEquipmentName}</strong> — {formatAoa(draft.equipmentPriceAoa)}</div>
                <div>
                  {emiCalc.term_months} months @ {emiCalc.interest_rate_pct}% • Down:{' '}
                  {formatAoa(emiCalc.down_payment_aoa)}
                </div>
                <div>
                  Monthly EMI: <strong>{formatAoa(emiCalc.monthly_emi_aoa)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Submitter & Notifications Review */}
          <div className="card-tinted" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <strong>Analyst Submitter &amp; Notifications</strong>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setDraft((p) => ({ ...p, step: 0 }))}
              >
                Edit
              </button>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div>
                Submitted By: <strong>{draft.submittedByName || 'Thomas Silva'}</strong> ({draft.submittedByEmail})
              </div>
              <div style={{ color: 'var(--brand-700)', fontWeight: 600, marginTop: 4 }}>
                Approvers will be notified by email when you submit.
              </div>
            </div>
          </div>

          <div className="card-tinted" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>Data Completeness &amp; Pre-Submission Score Preview</strong>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft((p) => ({ ...p, step: 4 }))}>
                Edit Sources
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span>Meaningful Sources: <strong>{liveExplanation.meaningfulSourceCount}/4</strong></span>
              <span>Proxy Score (Demo): <strong>{liveExplanation.score}</strong></span>
              <BandBadge band={liveExplanation.band} />
              <ConfidenceBadge confidence={liveExplanation.confidence} />
              <SuggestedDecisionBadge decision={liveDecision.decision} />
            </div>
            {liveExplanation.thinFileNotice && (
              <div style={{ fontSize: 12.5, marginTop: 8 }}>{liveExplanation.thinFileNotice}</div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={handleFinalSubmit}>
              Submit Application to Approver →
            </button>
          </div>
        </div>
      )}

      {/* Back / Next Footer Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={draft.step === 0}
          onClick={() => goToStep(draft.step - 1)}
        >
          ← Back
        </button>
        {draft.step < STEP_LABELS.length - 1 && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => goToStep(draft.step + 1)}
          >
            Next: {STEP_LABELS[draft.step + 1].replace(/^\d+\.\s*/, '')} →
          </button>
        )}
      </div>
    </div>
  );
}
