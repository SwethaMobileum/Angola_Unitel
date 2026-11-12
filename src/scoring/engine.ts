import type {
  AppliedAdjustment,
  CategoryBreakdown,
  ConfidenceLevel,
  CustomerProfile,
  ParameterBreakdown,
  RangeRule,
  ScoreBandName,
  ScoreExplanation,
  ScoringConfig,
  SourceStatus,
} from './types';

const DEFAULT_REFERENCE_DATE = new Date('2026-11-12T00:00:00Z');

export function monthsBetween(isoDate: string, referenceDate: Date = DEFAULT_REFERENCE_DATE): number {
  const start = new Date(isoDate);
  if (Number.isNaN(start.getTime())) return 0;
  const years = referenceDate.getUTCFullYear() - start.getUTCFullYear();
  const months = referenceDate.getUTCMonth() - start.getUTCMonth();
  const days = referenceDate.getUTCDate() - start.getUTCDate();
  const total = years * 12 + months + (days >= 0 ? 0 : -1);
  return Math.max(0, total);
}

export function matchRange(value: number, rules: RangeRule[]): RangeRule {
  for (const rule of rules) {
    const aboveMin = rule.min === undefined || value >= rule.min;
    const belowMax = rule.max === undefined || value < rule.max;
    if (aboveMin && belowMax) {
      return rule;
    }
  }
  return rules[rules.length - 1] ?? { label: 'Default', pct: 0.5 };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function detectSourceStatuses(
  profile: CustomerProfile,
  referenceDate: Date = DEFAULT_REFERENCE_DATE
): {
  telecom: SourceStatus;
  identity: SourceStatus;
  mobileMoney: SourceStatus;
  tax: SourceStatus;
  meaningfulCount: number;
} {
  const { telecom, mobileMoney, identity, tax } = profile;

  let telecomStatus: SourceStatus = 'missing';
  if (telecom) {
    const tenure = monthsBetween(telecom.sim_activation_date, referenceDate);
    if (tenure < 1 && telecom.topup_months_last_12 === 0 && telecom.avg_monthly_topup_aoa === 0) {
      telecomStatus = 'thin';
    } else {
      telecomStatus = 'found';
    }
  }

  let identityStatus: SourceStatus = 'missing';
  if (identity) {
    if (identity.id_verified || identity.address_verified || telecom?.sim_registered_with_bi) {
      identityStatus = 'found';
    } else {
      identityStatus = 'missing';
    }
  }

  let mobileMoneyStatus: SourceStatus = 'missing';
  if (mobileMoney && mobileMoney.wallet_exists) {
    const isBasicLowActivity =
      mobileMoney.registration_level === 'basic' &&
      mobileMoney.txn_count_90d < 5 &&
      mobileMoney.monthly_inflow_aoa < 15_000;
    mobileMoneyStatus = isBasicLowActivity ? 'thin' : 'found';
  }

  let taxStatus: SourceStatus = 'missing';
  if (tax && !(tax.nif_status === 'none' && tax.tax_filing_status === 'none')) {
    taxStatus = 'found';
  }

  const meaningfulCount = [telecomStatus, identityStatus, mobileMoneyStatus, taxStatus].filter(
    (s) => s === 'found'
  ).length;

  return {
    telecom: telecomStatus,
    identity: identityStatus,
    mobileMoney: mobileMoneyStatus,
    tax: taxStatus,
    meaningfulCount,
  };
}

export function mapConfidence(meaningfulCount: number): ConfidenceLevel {
  if (meaningfulCount >= 3) return 'High';
  if (meaningfulCount === 2) return 'Medium';
  return 'Low';
}

export function mapBand(score: number, config: ScoringConfig): ScoreBandName {
  for (const band of config.bands) {
    if (score >= band.minScore && score <= band.maxScore) {
      return band.name;
    }
  }
  if (score >= 800) return 'Excellent';
  if (score >= 700) return 'Good';
  if (score >= 551) return 'Fair';
  return 'Poor';
}

/**
 * Pure scoring function: no UI or database side-effects.
 * Evaluates all four proxy data sources, handles thin-file denominator removal
 * and re-normalization, applies hard caps, and builds a full explanation.
 */
export function evaluateCreditScore(
  profile: CustomerProfile,
  config: ScoringConfig,
  referenceDate: Date = DEFAULT_REFERENCE_DATE
): ScoreExplanation {
  const statuses = detectSourceStatuses(profile, referenceDate);
  const confidence = mapConfidence(statuses.meaningfulCount);
  const parameters: ParameterBreakdown[] = [];
  const categories: CategoryBreakdown[] = [];
  const adjustments: AppliedAdjustment[] = [];
  const summaryReasons: string[] = [];
  let thinFileNotice: string | undefined;

  // 1. Telecom Behavior (base 45)
  const telecomBaseTotal = 45;
  const telecomScale = config.weights.telecom / telecomBaseTotal;
  const telecomExcluded = statuses.telecom === 'missing';

  if (profile.telecom && !telecomExcluded) {
    const t = profile.telecom;
    const tenureMonths = monthsBetween(t.sim_activation_date, referenceDate);
    const tenureRule = matchRange(tenureMonths, config.ranges.simTenureMonths);
    const topupRule = matchRange(t.topup_months_last_12, config.ranges.topupMonths12);
    const varRule = matchRange(t.spend_variability, config.ranges.spendVariability);

    let loanPct = 0.5;
    let loanRaw = 'No loans taken';
    let loanReason = 'No airtime loans taken (neutral baseline)';
    if (t.airtime_loans_unpaid > 0) {
      loanPct = 0;
      loanRaw = `${t.airtime_loans_unpaid} unpaid of ${t.airtime_loans_taken}`;
      loanReason = `${t.airtime_loans_unpaid} unpaid airtime loan(s) — zero points and hard cap at ${config.caps.unpaidLoanMaxScore}`;
    } else if (t.airtime_loans_taken > 0) {
      const ratio = t.airtime_loans_repaid_on_time / t.airtime_loans_taken;
      const loanRule = matchRange(ratio, config.ranges.airtimeLoanRepaymentRatio);
      loanPct = loanRule.pct;
      loanRaw = `${t.airtime_loans_repaid_on_time}/${t.airtime_loans_taken} on-time`;
      loanReason = loanRule.label;
    }

    const spendRule = matchRange(t.avg_monthly_spend_aoa, config.ranges.monthlySpendAoa);
    const consistencyPct = round2((spendRule.pct + topupRule.pct) / 2);

    const telecomParams: ParameterBreakdown[] = [
      {
        id: 'sim_tenure',
        category: 'telecom',
        label: 'SIM tenure',
        rawValue: `${tenureMonths} months`,
        maxPoints: round2(10 * telecomScale),
        earnedPoints: round2(10 * telecomScale * tenureRule.pct),
        pct: tenureRule.pct,
        reason: tenureRule.label,
      },
      {
        id: 'topup_regularity',
        category: 'telecom',
        label: 'Top-up regularity (12m)',
        rawValue: `${t.topup_months_last_12}/12 months`,
        maxPoints: round2(12 * telecomScale),
        earnedPoints: round2(12 * telecomScale * topupRule.pct),
        pct: topupRule.pct,
        reason: topupRule.label,
      },
      {
        id: 'spend_stability',
        category: 'telecom',
        label: 'Spend stability',
        rawValue: `CV ${t.spend_variability.toFixed(2)}`,
        maxPoints: round2(8 * telecomScale),
        earnedPoints: round2(8 * telecomScale * varRule.pct),
        pct: varRule.pct,
        reason: varRule.label,
      },
      {
        id: 'airtime_loan_repayment',
        category: 'telecom',
        label: 'Airtime loan repayment',
        rawValue: loanRaw,
        maxPoints: round2(10 * telecomScale),
        earnedPoints: round2(10 * telecomScale * loanPct),
        pct: loanPct,
        reason: loanReason,
      },
      {
        id: 'usage_consistency',
        category: 'telecom',
        label: 'Usage & spend consistency',
        rawValue: `${t.avg_monthly_spend_aoa.toLocaleString('en-US')} AOA/mo`,
        maxPoints: round2(5 * telecomScale),
        earnedPoints: round2(5 * telecomScale * consistencyPct),
        pct: consistencyPct,
        reason: `${spendRule.label}; ${topupRule.label.toLowerCase()}`,
      },
    ];

    parameters.push(...telecomParams);
    const earned = round2(telecomParams.reduce((acc, p) => acc + p.earnedPoints, 0));
    categories.push({
      category: 'telecom',
      label: 'Telecom behavior',
      sourceStatus: statuses.telecom,
      weight: config.weights.telecom,
      earnedPoints: earned,
      effectiveMaxPoints: config.weights.telecom,
      excludedFromDenominator: false,
      note:
        statuses.telecom === 'thin'
          ? 'Very recent SIM with minimal activity'
          : `${tenureMonths}-month SIM history evaluated`,
    });
    summaryReasons.push(
      `Telecom (${earned}/${config.weights.telecom} pts): ${tenureMonths}-month SIM, ${t.topup_months_last_12}/12 active top-up months.`
    );
  } else {
    categories.push({
      category: 'telecom',
      label: 'Telecom behavior',
      sourceStatus: 'missing',
      weight: config.weights.telecom,
      earnedPoints: 0,
      effectiveMaxPoints: 0,
      excludedFromDenominator: true,
      note: 'Telecom source missing — excluded from denominator',
    });
    summaryReasons.push('Telecom data unavailable — excluded from score denominator.');
  }

  // 2. Identity & KYC (base 25)
  const identityBaseTotal = 25;
  const identityScale = config.weights.identity / identityBaseTotal;
  const identityExcluded = !profile.identity;

  if (profile.identity) {
    const id = profile.identity;
    const mm = profile.mobileMoney;
    const simBiMatched = Boolean(profile.telecom?.sim_registered_with_bi);
    const walletKycPct = mm?.wallet_exists ? (mm.registration_level === 'kyc' ? 1.0 : 0.4) : 0.0;
    const walletKycLabel = mm?.wallet_exists
      ? mm.registration_level === 'kyc'
        ? 'Fully verified (KYC)'
        : 'Basic registration'
      : 'No wallet';

    const identityParams: ParameterBreakdown[] = [
      {
        id: 'bi_verified',
        category: 'identity',
        label: 'BI (National ID) verified',
        rawValue: id.id_verified ? 'Verified' : 'Not verified',
        maxPoints: round2(10 * identityScale),
        earnedPoints: round2(10 * identityScale * (id.id_verified ? 1 : 0)),
        pct: id.id_verified ? 1 : 0,
        reason: id.id_verified
          ? 'Government BI verified'
          : `BI not verified — caps final score at ${config.caps.unverifiedBiMaxScore}`,
      },
      {
        id: 'sim_bi_match',
        category: 'identity',
        label: 'SIM registered with matching BI',
        rawValue: simBiMatched ? 'Matched' : 'Unmatched',
        maxPoints: round2(8 * identityScale),
        earnedPoints: round2(8 * identityScale * (simBiMatched ? 1 : 0)),
        pct: simBiMatched ? 1 : 0,
        reason: simBiMatched ? 'SIM registration matches BI' : 'SIM not linked to verified BI',
      },
      {
        id: 'address_verified',
        category: 'identity',
        label: 'Residential address verified',
        rawValue: id.address_verified ? 'Verified' : 'Unverified',
        maxPoints: round2(4 * identityScale),
        earnedPoints: round2(4 * identityScale * (id.address_verified ? 1 : 0)),
        pct: id.address_verified ? 1 : 0,
        reason: id.address_verified ? 'Address verified' : 'Address not independently verified',
      },
      {
        id: 'wallet_kyc_level',
        category: 'identity',
        label: 'Wallet KYC tier',
        rawValue: walletKycLabel,
        maxPoints: round2(3 * identityScale),
        earnedPoints: round2(3 * identityScale * walletKycPct),
        pct: walletKycPct,
        reason:
          walletKycPct === 1
            ? 'Unitel Money KYC tier verified'
            : walletKycPct > 0
              ? 'Basic wallet tier (partial KYC credit)'
              : 'No Unitel Money wallet registered',
      },
    ];

    parameters.push(...identityParams);
    const earned = round2(identityParams.reduce((acc, p) => acc + p.earnedPoints, 0));
    categories.push({
      category: 'identity',
      label: 'Identity & KYC',
      sourceStatus: statuses.identity,
      weight: config.weights.identity,
      earnedPoints: earned,
      effectiveMaxPoints: config.weights.identity,
      excludedFromDenominator: false,
      note: id.id_verified
        ? `BI verified${id.address_verified ? ' and address verified' : ''}`
        : 'BI unverified — score cap active',
    });
    summaryReasons.push(
      `Identity & KYC (${earned}/${config.weights.identity} pts): BI ${id.id_verified ? 'verified' : 'not verified'}, SIM-BI ${simBiMatched ? 'matched' : 'unmatched'}.`
    );
  } else {
    categories.push({
      category: 'identity',
      label: 'Identity & KYC',
      sourceStatus: 'missing',
      weight: config.weights.identity,
      earnedPoints: 0,
      effectiveMaxPoints: 0,
      excludedFromDenominator: true,
      note: 'Identity record missing — excluded from denominator',
    });
  }

  // 3. Mobile Money (base 20) — Thin-file aware!
  const mmBaseTotal = 20;
  const mmScale = config.weights.mobileMoney / mmBaseTotal;
  const mmExcluded = statuses.mobileMoney !== 'found';

  if (profile.mobileMoney && !mmExcluded) {
    const mm = profile.mobileMoney;
    const inflowRule = matchRange(mm.monthly_inflow_aoa, config.ranges.monthlyInflowAoa);
    const balanceRule = matchRange(mm.avg_balance_aoa, config.ranges.avgBalanceAoa);
    const txnRule = matchRange(mm.txn_count_90d, config.ranges.txnCount90d);
    const failRate = mm.txn_count_90d > 0 ? mm.failed_txn_count_90d / mm.txn_count_90d : 0;
    const failRule = matchRange(failRate, config.ranges.failedTxnRate);

    const mmParams: ParameterBreakdown[] = [
      {
        id: 'mm_inflow',
        category: 'mobileMoney',
        label: 'Monthly inflow level',
        rawValue: `${mm.monthly_inflow_aoa.toLocaleString('en-US')} AOA`,
        maxPoints: round2(6 * mmScale),
        earnedPoints: round2(6 * mmScale * inflowRule.pct),
        pct: inflowRule.pct,
        reason: inflowRule.label,
      },
      {
        id: 'mm_balance',
        category: 'mobileMoney',
        label: 'Average wallet balance',
        rawValue: `${mm.avg_balance_aoa.toLocaleString('en-US')} AOA`,
        maxPoints: round2(4 * mmScale),
        earnedPoints: round2(4 * mmScale * balanceRule.pct),
        pct: balanceRule.pct,
        reason: balanceRule.label,
      },
      {
        id: 'mm_activity',
        category: 'mobileMoney',
        label: '90-day transaction activity',
        rawValue: `${mm.txn_count_90d} txns`,
        maxPoints: round2(5 * mmScale),
        earnedPoints: round2(5 * mmScale * txnRule.pct),
        pct: txnRule.pct,
        reason: txnRule.label,
      },
      {
        id: 'mm_failed_rate',
        category: 'mobileMoney',
        label: 'Failed transaction rate',
        rawValue: `${(failRate * 100).toFixed(1)}% (${mm.failed_txn_count_90d}/${mm.txn_count_90d})`,
        maxPoints: round2(2 * mmScale),
        earnedPoints: round2(2 * mmScale * failRule.pct),
        pct: failRule.pct,
        reason: failRule.label,
      },
      {
        id: 'mm_wallet_exists',
        category: 'mobileMoney',
        label: 'Wallet active status',
        rawValue: mm.registration_level === 'kyc' ? 'Active (KYC)' : 'Active (Basic)',
        maxPoints: round2(3 * mmScale),
        earnedPoints: round2(3 * mmScale),
        pct: 1,
        reason: 'Active Unitel Money wallet',
      },
    ];

    parameters.push(...mmParams);
    const earned = round2(mmParams.reduce((acc, p) => acc + p.earnedPoints, 0));
    categories.push({
      category: 'mobileMoney',
      label: 'Mobile money (Unitel Money)',
      sourceStatus: 'found',
      weight: config.weights.mobileMoney,
      earnedPoints: earned,
      effectiveMaxPoints: config.weights.mobileMoney,
      excludedFromDenominator: false,
      note: `${mm.registration_level.toUpperCase()} wallet with ${mm.txn_count_90d} txns/90d`,
    });
    summaryReasons.push(
      `Mobile Money (${earned}/${config.weights.mobileMoney} pts): ${mm.registration_level.toUpperCase()} wallet, ${mm.txn_count_90d} txns in 90 days.`
    );
  } else {
    const thinNote =
      statuses.mobileMoney === 'thin'
        ? 'Wallet data is limited (Basic registration), score is based mainly on telecom data'
        : 'No Unitel Money wallet — score is based mainly on telecom data (no penalty)';
    thinFileNotice = thinNote;

    parameters.push({
      id: 'mm_thin_placeholder',
      category: 'mobileMoney',
      label: 'Unitel Money activity',
      rawValue: statuses.mobileMoney === 'thin' ? 'Basic / thin activity' : 'No wallet',
      maxPoints: config.weights.mobileMoney,
      earnedPoints: 0,
      pct: 0,
      excluded: true,
      reason: thinNote,
    });

    categories.push({
      category: 'mobileMoney',
      label: 'Mobile money (Unitel Money)',
      sourceStatus: statuses.mobileMoney,
      weight: config.weights.mobileMoney,
      earnedPoints: 0,
      effectiveMaxPoints: 0,
      excludedFromDenominator: true,
      note: thinNote,
    });

    adjustments.push({
      code: 'THIN_FILE_RENORMALIZED',
      label: 'Thin-file re-normalization',
      impactText: `Mobile money (${config.weights.mobileMoney} pts) excluded from denominator; remaining sources scaled to 100.`,
    });
    summaryReasons.push(thinNote + '.');
  }

  // 4. Tax Standing (base 10) — `none` = neutral half credit
  const taxBaseTotal = 10;
  const taxScale = config.weights.tax / taxBaseTotal;
  const tax = profile.tax;

  const nifPct =
    !tax || tax.nif_status === 'none'
      ? 0.5
      : tax.nif_status === 'active'
        ? 1.0
        : 0.0;
  const filingPct =
    !tax || tax.tax_filing_status === 'none'
      ? 0.5
      : tax.tax_filing_status === 'regular'
        ? 1.0
        : 0.25;

  const taxParams: ParameterBreakdown[] = [
    {
      id: 'nif_status',
      category: 'tax',
      label: 'NIF registration status',
      rawValue: tax ? tax.nif_status.toUpperCase() : 'NONE',
      maxPoints: round2(4 * taxScale),
      earnedPoints: round2(4 * taxScale * nifPct),
      pct: nifPct,
      reason:
        !tax || tax.nif_status === 'none'
          ? 'No NIF record — neutral half credit (not penalized)'
          : tax.nif_status === 'active'
            ? 'NIF active'
            : `NIF suspended — ${config.caps.suspendedNifPointDeduction}-point deduction applied`,
    },
    {
      id: 'tax_filing_status',
      category: 'tax',
      label: 'Tax filing standing',
      rawValue: tax ? tax.tax_filing_status.toUpperCase() : 'NONE',
      maxPoints: round2(6 * taxScale),
      earnedPoints: round2(6 * taxScale * filingPct),
      pct: filingPct,
      reason:
        !tax || tax.tax_filing_status === 'none'
          ? 'No filing record — neutral half credit (common in Angola)'
          : tax.tax_filing_status === 'regular'
            ? 'Regular tax filings'
            : 'Irregular tax filings',
    },
  ];
  parameters.push(...taxParams);
  const taxEarned = round2(taxParams.reduce((acc, p) => acc + p.earnedPoints, 0));
  categories.push({
    category: 'tax',
    label: 'Tax standing (AGT / NIF)',
    sourceStatus: statuses.tax,
    weight: config.weights.tax,
    earnedPoints: taxEarned,
    effectiveMaxPoints: config.weights.tax,
    excludedFromDenominator: false,
    note:
      statuses.tax === 'missing'
        ? 'No tax record — neutral 50% credit applied'
        : `NIF ${tax?.nif_status ?? 'none'}, filing ${tax?.tax_filing_status ?? 'none'}`,
  });

  // Aggregate & re-normalize across active denominator
  const activeDenominator = round2(
    categories.reduce((acc, c) => acc + (c.excludedFromDenominator ? 0 : c.effectiveMaxPoints), 0)
  );
  const rawEarnedPoints = round2(
    categories.reduce((acc, c) => acc + (c.excludedFromDenominator ? 0 : c.earnedPoints), 0)
  );

  let normalizedPoints = activeDenominator > 0 ? (rawEarnedPoints / activeDenominator) * 100 : 0;

  // Suspended NIF deduction (5 points on the 0-100 scale)
  if (tax?.nif_status === 'suspended') {
    normalizedPoints = Math.max(0, normalizedPoints - config.caps.suspendedNifPointDeduction);
    adjustments.push({
      code: 'SUSPENDED_NIF_DEDUCTION',
      label: 'Suspended NIF deduction',
      impactText: `-${config.caps.suspendedNifPointDeduction} normalized points due to suspended NIF.`,
    });
    summaryReasons.push(
      `Suspended NIF triggered a ${config.caps.suspendedNifPointDeduction}-point deduction.`
    );
  }

  normalizedPoints = round2(Math.max(0, Math.min(100, normalizedPoints)));
  const uncappedScore = Math.round(300 + (normalizedPoints / 100) * 600);
  let finalScore = uncappedScore;

  // Hard cap 1: BI not verified caps score at 600
  const biVerified = Boolean(profile.identity?.id_verified);
  if (!biVerified && finalScore > config.caps.unverifiedBiMaxScore) {
    finalScore = config.caps.unverifiedBiMaxScore;
    adjustments.push({
      code: 'BI_NOT_VERIFIED_CAP',
      label: 'BI not verified cap',
      impactText: `Score capped at ${config.caps.unverifiedBiMaxScore} (from ${uncappedScore}) because national BI is unverified.`,
    });
    summaryReasons.push(`Hard cap applied: unverified BI caps score at ${config.caps.unverifiedBiMaxScore}.`);
  }

  // Hard cap 2: Any unpaid airtime loan caps score at 550
  const unpaidLoans = profile.telecom?.airtime_loans_unpaid ?? 0;
  if (unpaidLoans > 0 && finalScore > config.caps.unpaidLoanMaxScore) {
    finalScore = config.caps.unpaidLoanMaxScore;
    adjustments.push({
      code: 'UNPAID_LOAN_CAP',
      label: 'Unpaid airtime loan cap',
      impactText: `Score capped at ${config.caps.unpaidLoanMaxScore} (from ${uncappedScore}) due to ${unpaidLoans} unpaid airtime loan(s).`,
    });
    summaryReasons.push(
      `Hard cap applied: ${unpaidLoans} unpaid airtime loan(s) cap score at ${config.caps.unpaidLoanMaxScore}.`
    );
  }

  const band = mapBand(finalScore, config);

  if (profile.has_bank_account === false) {
    summaryReasons.push(
      'No bank account recorded — treated as neutral (unbanked subscribers are never penalized).'
    );
  }

  if (identityExcluded) {
    summaryReasons.push('Identity source missing — KYC cannot be verified.');
  }

  return {
    score: finalScore,
    uncappedScore,
    normalizedPoints,
    rawEarnedPoints,
    activeDenominator,
    band,
    confidence,
    meaningfulSourceCount: statuses.meaningfulCount,
    sourceStatuses: {
      telecom: statuses.telecom,
      identity: statuses.identity,
      mobileMoney: statuses.mobileMoney,
      tax: statuses.tax,
    },
    categories,
    parameters,
    adjustments,
    summaryReasons,
    thinFileNotice,
  };
}

