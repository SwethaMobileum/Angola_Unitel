import {
  BlockCode,
  SegmentCode,
  ScoreBand,
  Parameter,
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
  weight: number;
  isExcluded: boolean;
  hasValue: boolean;
  matchedBand?: string;
}

export interface BlockScoreDetail {
  blockCode: BlockCode;
  basePoints: number;        // configured points before redistribution
  effectivePoints: number;   // points after redistribution (sum of all blocks = 94)
  earnedPoints: number;      // effectivePoints * blockStrength
  blockStrength: number;     // 0.0 .. 1.0 (weighted average of valid parameters)
  hasData: boolean;
  availableParamsCount: number;
  totalConfiguredParams: number;
  parameters: ParameterScoreDetail[];
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

/**
 * Maps a single parameter input value to a normalized strength of 0.0 .. 1.0
 * Blank/null/undefined or 'skip' inputs are skipped (never counted as 0).
 * Weight 0 or neutral parameters (like device_type or kixikila_member) are excluded from scoring.
 */
export function scoreParameter(
  param: Parameter,
  rawValue: any
): { strength: number; hasValue: boolean; isExcluded: boolean; matchedBand?: string } {
  // If no value provided or explicitly skipped, treat as no data (do not penalize)
  if (rawValue === undefined || rawValue === null || rawValue === '' || rawValue === 'skip') {
    return { strength: 0, hasValue: false, isExcluded: true };
  }

  // Weight 0 parameters or neutral parameters are stored but excluded from block strength average
  if (param.weight === 0 || param.key === 'device_type' || param.key === 'kixikila_member') {
    return { strength: 0, hasValue: true, isExcluded: true, matchedBand: 'Stored only (weight 0 / neutral)' };
  }

  // Number input
  if (param.input === 'number') {
    const num = Number(rawValue);
    if (isNaN(num)) {
      return { strength: 0, hasValue: false, isExcluded: true };
    }

    if (!param.bands || param.bands.length === 0) {
      return { strength: 0.5, hasValue: true, isExcluded: false };
    }

    // Match band
    for (const b of param.bands) {
      const hasMin = b.min !== undefined && b.min !== null;
      const hasMax = b.max !== undefined && b.max !== null;

      if (hasMin && hasMax) {
        if (num >= b.min! && num <= b.max!) {
          return { strength: b.score, hasValue: true, isExcluded: false, matchedBand: `${b.min}-${b.max} (${b.score})` };
        }
      } else if (hasMax && !hasMin) {
        if (num <= b.max!) {
          return { strength: b.score, hasValue: true, isExcluded: false, matchedBand: `<=${b.max} (${b.score})` };
        }
      } else if (hasMin && !hasMax) {
        if (num >= b.min!) {
          return { strength: b.score, hasValue: true, isExcluded: false, matchedBand: `>=${b.min} (${b.score})` };
        }
      }
    }

    // Default if outside all bands: clamp to closest
    const firstScore = param.bands[0]?.score ?? 0.5;
    const lastScore = param.bands[param.bands.length - 1]?.score ?? 0.5;
    return { strength: num < 0 ? firstScore : lastScore, hasValue: true, isExcluded: false };
  }

  // Choice input
  if (param.input === 'choice') {
    const strVal = String(rawValue);
    if (!param.bands || param.bands.length === 0) {
      return { strength: 0.5, hasValue: true, isExcluded: false };
    }

    const match = param.bands.find(b => String(b.value) === strVal);
    if (match) {
      return { strength: match.score, hasValue: true, isExcluded: false, matchedBand: match.label || strVal };
    }
    return { strength: 0.5, hasValue: true, isExcluded: false };
  }

  // Boolean input
  if (param.input === 'boolean') {
    const boolVal = Boolean(rawValue);
    if (param.bands && param.bands.length > 0) {
      const match = param.bands.find(b => Boolean(b.value) === boolVal);
      if (match) {
        return { strength: match.score, hasValue: true, isExcluded: false, matchedBand: match.label || String(boolVal) };
      }
    }
    return { strength: boolVal ? 1.0 : 0.0, hasValue: true, isExcluded: false };
  }

  // Yes / No / Skip
  if (param.input === 'yes_no_skip') {
    if (rawValue === 'yes') return { strength: 1.0, hasValue: true, isExcluded: false, matchedBand: 'Yes' };
    if (rawValue === 'no') return { strength: 0.0, hasValue: true, isExcluded: false, matchedBand: 'No' };
    return { strength: 0, hasValue: false, isExcluded: true, matchedBand: 'Skip' };
  }

  return { strength: 0.5, hasValue: true, isExcluded: false };
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
 * Main Scoring Engine
 */
export function calculateCreditScore(inputs: ScoringInputs): ScoringResult {
  const {
    segmentCode,
    configVersionId = 'v1.0-default',
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
  const segmentWeights = DEFAULT_WEIGHTS.filter(w => w.segment_code === segmentCode);
  const baseWeightsByBlock: Record<BlockCode, number> = {
    P: 0, T: 0, W: 0, B: 0, X: 0, A: 0,
  };
  segmentWeights.forEach(w => {
    baseWeightsByBlock[w.block_code] = w.points;
  });

  // Determine segment's designated primary (main) block
  const mainWeightEntry = segmentWeights.reduce((prev, curr) => (curr.points > prev.points ? curr : prev), segmentWeights[0]);
  const designatedMainBlock: BlockCode = mainWeightEntry?.block_code || 'T';

  // 2. Evaluate parameter strengths per block
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

    let weightedStrengthSum = 0;
    let totalWeight = 0;
    let availableCount = 0;

    for (const param of blockParams) {
      const rawVal = parameterInputs[param.key];
      const scored = scoreParameter(param, rawVal);

      const pDetail: ParameterScoreDetail = {
        key: param.key,
        label: param.label,
        blockCode: param.block_code,
        inputValue: rawVal,
        strength: scored.strength,
        weight: param.weight,
        isExcluded: scored.isExcluded,
        hasValue: scored.hasValue,
        matchedBand: scored.matchedBand,
      };
      detail.parameters.push(pDetail);

      if (scored.hasValue && !scored.isExcluded) {
        availableCount++;
        weightedStrengthSum += scored.strength * param.weight;
        totalWeight += param.weight;
      }
    }

    detail.availableParamsCount = availableCount;

    // Check if block has valid data
    // Note: if wallet is turned off, W has NO data
    if (blockCode === 'W' && !walletAvailable) {
      detail.hasData = false;
      detail.blockStrength = 0;
    } else if (availableCount > 0 && totalWeight > 0) {
      detail.hasData = true;
      let calculatedStrength = Math.min(1.0, Math.max(0.0, weightedStrengthSum / totalWeight));

      // Behavioral Integrity: SIM tenure alone cannot give high telecom score without confirmed recharge activity
      if (blockCode === 'T' && (parameterInputs['topup_regularity_months'] === undefined || parameterInputs['topup_regularity_months'] === null || parameterInputs['topup_regularity_months'] === '')) {
        calculatedStrength = Math.min(0.30, calculatedStrength);
      }

      detail.blockStrength = calculatedStrength;
    } else {
      detail.hasData = false;
      detail.blockStrength = 0;
    }
  }

  // 3. Dynamic Point Redistribution
  // Blocks with configured base points > 0 that have NO data (or W when wallet is off)
  // move their points proportionally to blocks with data, giving priority to the main block.
  // Never push points into a block with no data.
  const redistributions: RedistributionRecord[] = [];

  // Identify active blocks that have data
  const blocksWithData = blockCodes.filter(b => blockDetails[b].hasData && (b !== 'W' || walletAvailable));
  const blocksNeedingRedistribution = blockCodes.filter(
    b => baseWeightsByBlock[b] > 0 && (!blockDetails[b].hasData || (b === 'W' && !walletAvailable))
  );

  if (blocksNeedingRedistribution.length > 0 && blocksWithData.length > 0) {
    for (const emptyBlock of blocksNeedingRedistribution) {
      const pointsToMove = baseWeightsByBlock[emptyBlock];
      if (pointsToMove <= 0) continue;

      // Select target block with priority to main operational block
      let targetBlock: BlockCode;

      // If segment's designated main block has data and is not the empty block, it gets priority
      if (blocksWithData.includes(designatedMainBlock) && designatedMainBlock !== emptyBlock) {
        targetBlock = designatedMainBlock;
      } else {
        // Main block itself is empty (e.g. W in S3), find the operational behavioral block with highest points
        const behavioralBlocks = blocksWithData.filter(b => b !== 'P');
        if (behavioralBlocks.length > 0) {
          // Choose highest weighted behavioral block
          targetBlock = behavioralBlocks.reduce((prev, curr) =>
            baseWeightsByBlock[curr] > baseWeightsByBlock[prev] ? curr : prev, behavioralBlocks[0]
          );
        } else {
          // Only P has data
          targetBlock = 'P';
        }
      }

      blockDetails[emptyBlock].effectivePoints = 0;
      blockDetails[targetBlock].effectivePoints += pointsToMove;

      redistributions.push({
        fromBlock: emptyBlock,
        toBlock: targetBlock,
        points: pointsToMove,
        reason: emptyBlock === 'W' && !walletAvailable
          ? 'Wallet scoring switched off; points redistributed to maintain 94 base point invariant.'
          : `Block ${emptyBlock} has no input data; points moved to primary active block ${targetBlock} without penalty.`,
      });
    }
  }



  // 4. Earned Points & Asset Bonus
  let basePointsEarned = 0;
  for (const b of blockCodes) {
    const detail = blockDetails[b];
    detail.earnedPoints = detail.effectivePoints * detail.blockStrength;
    basePointsEarned += detail.earnedPoints;
  }

  const assetBonus = calculateAssetBonus(assets);
  const totalPoints = Math.min(100, Math.max(0, basePointsEarned + assetBonus));

  // 5. Calculate Score (300 .. 900)
  // formula: round(300 + (totalPoints / 100) * 600)
  const score = Math.round(300 + (totalPoints / 100) * 600);

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
  if (idSimMatch === false) {
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
  let applicantAge = 25; // default eligible
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

  // 7. Data Confidence Evaluation
  // High = 3 or more blocks with data AND 12 months or more of data
  // Medium = 2 blocks OR 6-12 months
  // Low = 1 block OR under 6 months. Low confidence caps limit at starter level.
  const activeBlockCount = blocksWithData.length;
  let dataConfidence: 'high' | 'medium' | 'low';
  const confidenceReasons: string[] = [];

  if (activeBlockCount >= 3 && simTenureMonths >= 12) {
    dataConfidence = 'high';
    confidenceReasons.push(`High data confidence: ${activeBlockCount} active parameter blocks and established tenure (${simTenureMonths}m).`);
  } else if (activeBlockCount >= 2 || simTenureMonths >= 6) {
    dataConfidence = 'medium';
    confidenceReasons.push(`Medium data confidence: ${activeBlockCount} active parameter blocks with ${simTenureMonths}m subscriber tenure.`);
  } else {
    dataConfidence = 'low';
    confidenceReasons.push(`Low data confidence: Thin file (${activeBlockCount} active block, ${simTenureMonths}m tenure).`);
    isCappedAtStarter = true;
  }

  // Special case: if wallet was designated main block (e.g. S3) and wallet is off, confidence drops
  if (designatedMainBlock === 'W' && !walletAvailable && dataConfidence === 'high') {
    dataConfidence = 'medium';
    confidenceReasons.push('Confidence adjusted to Medium because primary Wallet channel data is disabled.');
  }

  // 8. Credit Limit Calculation
  // Lowest of: score band limit, income band cap, EMI cap
  let limitLevel = scoreBand.limit_level; // 'review' | 'starter' | 'standard' | 'higher' | 'highest'

  if (isHardStop) {
    limitLevel = 'review';
  } else if (isCappedAtStarter) {
    limitLevel = 'starter';
  } else if (segmentCode === 'S1' && simTenureMonths < 12) {
    // S1 rule: starter limit only until tenure >= 12m
    limitLevel = 'starter';
  }

  // Map limit levels to standard baseline amounts (in Kz)
  const baselineLimits: Record<string, number> = {
    review: 0,
    starter: 50000,
    standard: 150000,
    higher: 400000,
    highest: 1000000,
  };

  let maxLimitKz = baselineLimits[limitLevel] ?? 50000;
  let limitCapApplied = `Score Band: ${scoreBand.label} (${limitLevel.toUpperCase()})`;

  // Apply Income Band Cap if income band provided
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
  // Monthly income estimation
  let monthlyIncomeKz = 100000; // default national minimum wage (100k Kz since Sept 2025)
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

  // 10. Generate Plain English Positive Reasons & Data Gaps
  const positiveReasons: string[] = [];
  const dataGaps: string[] = [];

  if (simTenureMonths >= 24) {
    positiveReasons.push(`Strong subscriber loyalty with ${simTenureMonths} months continuous Unitel network tenure.`);
  } else if (simTenureMonths >= 12) {
    positiveReasons.push(`Established telecom relationship with ${simTenureMonths} months tenure.`);
  }

  const topupReg = Number(parameterInputs['topup_regularity_months']);
  if (topupReg >= 10) {
    positiveReasons.push(`Consistent airtime recharges in ${topupReg} of the past 12 months.`);
  }

  if (parameterInputs['arpu_stability'] === 'stable' || parameterInputs['arpu_stability'] === 'growing') {
    positiveReasons.push('Stable and predictable telecom spend pattern.');
  }

  if (walletAvailable && (parameterInputs['wallet_level'] === 'kyc_verified' || parameterInputs['wallet_inflow_regularity'] === 'regular')) {
    positiveReasons.push('Active verified Unitel Money wallet with recurring digital inflows.');
  }

  if (parameterInputs['salary_amount_band'] || parameterInputs['regular_credits_months'] >= 6) {
    positiveReasons.push('Regular monthly bank payroll deposits demonstrate formal repayment ability.');
  }

  if (assetBonus > 0) {
    positiveReasons.push(`Verified asset footprint adds +${assetBonus} bonus points to credit profile.`);
  }

  // Data Gaps (informative, not punitive)
  if (!blockDetails.B.hasData) {
    dataGaps.push('No commercial bank account history recorded (evaluated via telecom and mobile money proxy).');
  }
  if (!walletAvailable || !blockDetails.W.hasData) {
    dataGaps.push('Mobile money wallet channel data is unavailable or unlinked.');
  }
  if (simTenureMonths < 6) {
    dataGaps.push('Limited telecom tenure (< 6 months) restricts initial financing to starter limit.');
  }

  return {
    segmentCode,
    score,
    totalPoints: Number(totalPoints.toFixed(1)),
    basePointsEarned: Number(basePointsEarned.toFixed(1)),
    assetBonus,
    scoreBand,
    dataConfidence,
    confidenceReasons,
    blockScores: blockDetails,
    redistributions,
    overlayFlags,
    isHardStop,
    isHoldForReview,
    isCappedAtStarter,
    limitKz: maxLimitKz,
    limitCapApplied,
    positiveReasons,
    dataGaps,
    scoreVersion: `${configVersionId}-engine-v1.0`,
    computedAt: new Date().toISOString(),
    affordability,
  };
}
