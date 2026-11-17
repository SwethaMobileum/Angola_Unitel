import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SegmentCode, BlockCode, Evaluation, LoanApplication, TelecomRechargeRecord, Equipment } from '../types';
import { DEFAULT_EQUIPMENT } from '../data/seedData';
import { getStoredEquipment, addCustomEquipment, deleteCustomEquipment } from '../lib/config';
import { calculateCreditScore, DEFAULT_POINT_RULES } from '../lib/scoring';
import { formatKz } from '../lib/money';
import { saveEvaluation } from '../lib/evaluations';
import { saveApplication } from '../lib/loans';
import { ScoreGauge } from '../components/ScoreGauge';
import { Modal } from '../components/Modal';
import {
  SEEDED_DEMO_CUSTOMERS,
  SRC_TELECOM_RECHARGES,
  demoProfileToScoringInputs,
  normalizePhoneNumber,
} from '../lib/dataSources';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertOctagon,
  Info,
  Smartphone,
  Landmark,
  Briefcase,
  Store,
  Home,
  Car,
  Bike,
  ShieldCheck,
  Send,
  Database,
  PackageCheck,
  X,
  Plus,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';

interface DataSourceTick {
  source: string;
  found: boolean;
  tag: string;
  count: number;
}

export const NewEvaluation: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Step (1 to 6)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState<number>(1);
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(true);

  // Step 1: Customer Details & Data Sources Check
  const [customer, setCustomer] = useState({
    fullName: 'Matthew Silva',
    email: 'bhargownarravula777@gmail.com',
    msisdn: '+244 923 000 101',
    nationalId: '004819284MS31',
    dateOfBirth: '1996-08-14',
    simActivationDate: '2022-03-10',
    idSimMatch: true,
  });

  const [isCheckingSources, setIsCheckingSources] = useState<boolean>(false);
  const [sourceTicks, setSourceTicks] = useState<DataSourceTick[]>([
    { source: 'Unitel Telecom CDR', found: true, tag: 'From Unitel', count: 30 },
    { source: 'Unitel Money Wallet', found: true, tag: 'From Unitel Money', count: 14 },
    { source: 'Interbank Gateway (BFA/BAI)', found: false, tag: 'No record', count: 0 },
    { source: 'National Motor Registry', found: true, tag: 'From Registry (demo)', count: 1 },
    { source: 'ENDE Electricity Grid', found: true, tag: 'From Utility (demo)', count: 12 },
    { source: 'Civil ID & SIM Match', found: true, tag: 'Verified Match', count: 1 },
  ]);

  // Step 2: Segment 4 Big Tiles & Wallet Switch
  const [segmentQuestions, setSegmentQuestions] = useState({
    isSalaried: false,
    isTrader: false,
    hasBankAccount: false,
    hasWalletApp: true,
  });
  const [walletAvailable, setWalletAvailable] = useState<boolean>(true);
  const [resolvedSegment, setResolvedSegment] = useState<SegmentCode>('S3');

  // Step 3: Parameter Inputs & Active Tab
  const [activeBlock, setActiveBlock] = useState<BlockCode>('P');
  const [rechargeView, setRechargeView] = useState<'month' | 'quarter'>('month');
  const [rechargeHistory, setRechargeHistory] = useState<TelecomRechargeRecord[]>(
    SRC_TELECOM_RECHARGES['244923000101'] || []
  );
  const [parameterInputs, setParameterInputs] = useState<Record<string, any>>({
    id_sim_match: 'yes',
    employment_status: 'other',
    time_in_activity_months: 18,
    sim_tenure_months: 30,
    topup_months_of_12: 11,
    recharges_per_month: 3,
    recharge_value_per_month_kz: 4500,
    recharge_value_per_quarter_kz: 13500,
    recharge_view: 'month',
    spend_stability: 'stable',
    active_days_per_month: 16,
    airtime_loan_repayment: '80-99%_repaid',
    wallet_months_active: 14,
    wallet_inflow_months_of_12: 10,
    avg_monthly_inflow_kz: 120000,
    bill_payments_via_wallet: 'sometimes',
    wallet_balance_stability: 'medium',
    wallet_loan_repayment: '80-99%_repaid',
  });

  // Step 4: Assets (Bonus Only) and Income Band
  const [assets, setAssets] = useState<{
    house: 'yes' | 'no' | 'skip';
    land_title: 'yes' | 'no' | 'skip';
    two_wheeler: 'yes' | 'no' | 'skip';
    car: 'yes' | 'no' | 'skip';
  }>({
    house: 'no',
    land_title: 'no',
    two_wheeler: 'yes',
    car: 'no',
  });
  const [incomeBandCode, setIncomeBandCode] = useState<number>(3);
  const [customIncomeKz, setCustomIncomeKz] = useState<string>('');

  // Step 6: Loan Equipment Selection & EMI
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(() => getStoredEquipment());
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>(() => {
    const list = getStoredEquipment();
    return list[0]?.id || 'e-1';
  });
  const [selectedTermMonths, setSelectedTermMonths] = useState<number>(6);
  const [isSubmittingLoan, setIsSubmittingLoan] = useState<boolean>(false);
  const [submittedApp, setSubmittedApp] = useState<LoanApplication | null>(null);
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState<boolean>(false);

  // Customize Equipment Modal & Input State
  const [isCustomEquipmentModalOpen, setIsCustomEquipmentModalOpen] = useState<boolean>(false);
  const [customEqName, setCustomEqName] = useState<string>('');
  const [customEqCategory, setCustomEqCategory] = useState<string>('Smartphone');
  const [customEqPriceKz, setCustomEqPriceKz] = useState<string>('');
  const [customEqError, setCustomEqError] = useState<string>('');

  // Compute live age and SIM tenure
  const calculateAge = (dob: string) => {
    const birth = new Date(dob);
    const diff = Date.now() - birth.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const calculateSimTenureMonths = (activationDate: string) => {
    const act = new Date(activationDate);
    const diffMs = Date.now() - act.getTime();
    return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
  };

  const applicantAge = calculateAge(customer.dateOfBirth);
  const simTenureMonths = calculateSimTenureMonths(customer.simActivationDate);
  const isUnderAge = applicantAge < 18;
  const isIdMismatch = customer.idSimMatch === false;

  // Derive resolved segment from 4 Yes/No questions (First YES wins)
  useEffect(() => {
    if (segmentQuestions.isSalaried) {
      setResolvedSegment('S7');
    } else if (segmentQuestions.isTrader) {
      setResolvedSegment('S8');
    } else if (segmentQuestions.hasBankAccount) {
      setResolvedSegment('S5');
    } else if (segmentQuestions.hasWalletApp && walletAvailable) {
      setResolvedSegment('S3');
    } else {
      setResolvedSegment('S1');
    }
  }, [segmentQuestions, walletAvailable]);

  // Compute scoring dynamically
  const liveScoringResult = useMemo(() => {
    const statedIncome = customIncomeKz ? parseInt(customIncomeKz.replace(/[^0-9]/g, ''), 10) : undefined;
    const selectedEq = equipmentList.find((eq) => eq.id === selectedEquipmentId) || equipmentList[0] || DEFAULT_EQUIPMENT[0];

    return calculateCreditScore({
      segmentCode: resolvedSegment,
      walletAvailable,
      parameterInputs: {
        ...parameterInputs,
        id_sim_match: customer.idSimMatch ? 'yes' : 'no',
        sim_tenure_months: simTenureMonths,
      },
      assets,
      incomeBandCode,
      statedIncomeKz: statedIncome,
      equipmentPriceKz: selectedEq.price_kz,
      termMonths: selectedTermMonths,
      customerMeta: {
        dateOfBirth: customer.dateOfBirth,
        simActivationDate: customer.simActivationDate,
        simTenureMonths,
        idSimMatch: customer.idSimMatch,
      },
    });
  }, [
    resolvedSegment,
    walletAvailable,
    parameterInputs,
    assets,
    incomeBandCode,
    customIncomeKz,
    equipmentList,
    selectedEquipmentId,
    selectedTermMonths,
    customer,
    simTenureMonths,
  ]);

  // Quick preset loader
  const handleLoadPreset = async (phoneKey: string) => {
    const profile = SEEDED_DEMO_CUSTOMERS[phoneKey];
    if (!profile) return;

    setCustomer({
      fullName: profile.name,
      email: profile.email || 'bhargownarravula777@gmail.com',
      msisdn: profile.phone,
      nationalId: profile.nationalId,
      dateOfBirth: profile.dob,
      simActivationDate: profile.simActivation,
      idSimMatch: profile.telecom !== null,
    });

    // Run short animated data check
    await runDataSourceCheck(profile.phone, profile);
  };

  // Run animated data source check
  const runDataSourceCheck = async (rawPhone: string, existingProfile?: any) => {
    setIsCheckingSources(true);

    const digits = normalizePhoneNumber(rawPhone);
    const key = Object.keys(SEEDED_DEMO_CUSTOMERS).find((k) => digits.endsWith(k.slice(-9))) || '244923000101';
    const profile = existingProfile || SEEDED_DEMO_CUSTOMERS[key] || SEEDED_DEMO_CUSTOMERS['244923000101'];

    // Snappy sequential simulation
    setTimeout(() => {
      const inputs = demoProfileToScoringInputs(profile);
      const records = SRC_TELECOM_RECHARGES[key] || [];
      setRechargeHistory(records);
      if (inputs.parameterInputs.recharge_view) {
        setRechargeView(inputs.parameterInputs.recharge_view as 'month' | 'quarter');
      }
      setResolvedSegment(inputs.segmentCode);
      setParameterInputs(inputs.parameterInputs);
      setAssets(inputs.assets as any);
      setIncomeBandCode(inputs.incomeBandCode || 3);

      const hasSalary = profile.bank?.salary_detected || profile.segment === 'S7';
      const hasTrader = profile.segment === 'S8';
      const hasBank = profile.bank?.has_bank_account ?? false;
      const hasWallet = profile.wallet?.has_wallet ?? false;

      setSegmentQuestions({
        isSalaried: hasSalary,
        isTrader: hasTrader,
        hasBankAccount: hasBank,
        hasWalletApp: hasWallet,
      });

      setSourceTicks([
        {
          source: 'Unitel Telecom CDR',
          found: profile.telecom !== null,
          tag: profile.telecom ? 'From Unitel' : 'No record',
          count: profile.telecom ? profile.telecom.tenure_months : 0,
        },
        {
          source: 'Unitel Money Wallet',
          found: profile.wallet?.has_wallet ?? false,
          tag: profile.wallet?.has_wallet ? 'From Unitel Money' : 'No record',
          count: profile.wallet?.monthly_turnover_kz ? Math.round(profile.wallet.monthly_turnover_kz / 1000) : 0,
        },
        {
          source: 'Interbank Gateway (BFA/BAI)',
          found: profile.bank?.has_bank_account ?? false,
          tag: profile.bank?.has_bank_account ? 'From Bank (demo)' : 'No record',
          count: profile.bank?.has_bank_account ? 1 : 0,
        },
        {
          source: 'National Motor Registry',
          found: profile.assets?.has_vehicle ?? false,
          tag: profile.assets?.has_vehicle ? 'From Registry (demo)' : 'No record',
          count: profile.assets?.has_vehicle ? 1 : 0,
        },
        {
          source: 'ENDE Electricity Grid',
          found: profile.utility !== null,
          tag: profile.utility ? 'From Utility (demo)' : 'No record',
          count: profile.utility ? 12 : 0,
        },
        {
          source: 'Civil ID & SIM Match',
          found: profile.telecom !== null,
          tag: profile.telecom ? 'Verified Match' : 'Unverified',
          count: 1,
        },
      ]);

      setIsCheckingSources(false);
      setMaxCompletedStep((prev) => Math.max(prev, 1));
    }, 600);
  };

  // Determine active blocks for current segment
  const segmentActiveBlocks: BlockCode[] = useMemo(() => {
    switch (resolvedSegment) {
      case 'S1':
        return ['P', 'T'];
      case 'S3':
        return walletAvailable ? ['P', 'T', 'W'] : ['P', 'T'];
      case 'S5':
        return ['P', 'T', 'B', 'X'];
      case 'S7':
        return walletAvailable ? ['P', 'T', 'W', 'B', 'X'] : ['P', 'T', 'B', 'X'];
      case 'S8':
        return walletAvailable ? ['P', 'T', 'W', 'B', 'X'] : ['P', 'T', 'B', 'X'];
      default:
        return ['P', 'T'];
    }
  }, [resolvedSegment, walletAvailable]);

  // Keep active tab on an enabled block
  useEffect(() => {
    if (!segmentActiveBlocks.includes(activeBlock)) {
      setActiveBlock(segmentActiveBlocks[0] || 'P');
    }
  }, [segmentActiveBlocks, activeBlock]);

  // Helper to step navigation
  const goToStep = (stepNumber: number) => {
    if (stepNumber <= maxCompletedStep + 1) {
      setCurrentStep(stepNumber);
      setMaxCompletedStep((prev) => Math.max(prev, stepNumber));
    }
  };

  // Live Points Earned Helper for a Parameter
  const getParamPoints = (key: string, value: any): number => {
    const rules = DEFAULT_POINT_RULES[key];
    if (!rules || value === undefined || value === null || value === '') return 0;

    const valStr = String(value).toLowerCase();
    const valNum = typeof value === 'number' ? value : parseFloat(valStr);

    for (const rule of rules) {
      if (rule.option_key && rule.option_key.toLowerCase() === valStr) {
        return rule.points;
      }
      if (!isNaN(valNum) && rule.min_value !== undefined && rule.max_value !== undefined) {
        if (valNum >= rule.min_value && valNum < rule.max_value) {
          return rule.points;
        }
      }
    }
    return 0;
  };

  // Handle Equipment Loan Submission
  const handleSubmitLoan = async () => {
    if (!liveScoringResult) return;
    setIsSubmittingLoan(true);

    const selectedEq = equipmentList.find((eq) => eq.id === selectedEquipmentId) || equipmentList[0] || DEFAULT_EQUIPMENT[0];
    const newEvalId = `eval-${Date.now()}`;

    const newEval: Evaluation = {
      id: newEvalId,
      customer_id: `cust-${Date.now()}`,
      analyst_id: '00000000-0000-0000-0000-000000000001',
      segment_code: resolvedSegment,
      segment_overridden: false,
      config_version_id: 'v1.0-default',
      wallet_available: walletAvailable,
      income_band_code: incomeBandCode,
      income_source: customIncomeKz ? 'stated' : 'estimated',
      status: 'scored',
      created_at: new Date().toISOString(),
      customer: {
        id: `cust-${Date.now()}`,
        full_name: customer.fullName || 'Subscriber',
        email: customer.email,
        msisdn: customer.msisdn,
        national_id_masked: customer.nationalId
          ? `*******${customer.nationalId.slice(-4)}`
          : '*******XX00',
        date_of_birth: customer.dateOfBirth,
        sim_activation_date: customer.simActivationDate,
      },
      results: {
        evaluation_id: newEvalId,
        block_points: {
          P: {
            rawPoints: liveScoringResult.blockScores.P.basePoints,
            earnedPoints: liveScoringResult.blockScores.P.earnedPoints,
            availableParams: liveScoringResult.blockScores.P.availableParamsCount,
          },
          T: {
            rawPoints: liveScoringResult.blockScores.T.basePoints,
            earnedPoints: liveScoringResult.blockScores.T.earnedPoints,
            availableParams: liveScoringResult.blockScores.T.availableParamsCount,
          },
          W: {
            rawPoints: liveScoringResult.blockScores.W.basePoints,
            earnedPoints: liveScoringResult.blockScores.W.earnedPoints,
            availableParams: liveScoringResult.blockScores.W.availableParamsCount,
          },
          B: {
            rawPoints: liveScoringResult.blockScores.B.basePoints,
            earnedPoints: liveScoringResult.blockScores.B.earnedPoints,
            availableParams: liveScoringResult.blockScores.B.availableParamsCount,
          },
          X: {
            rawPoints: liveScoringResult.blockScores.X.basePoints,
            earnedPoints: liveScoringResult.blockScores.X.earnedPoints,
            availableParams: liveScoringResult.blockScores.X.availableParamsCount,
          },
          A: { rawPoints: 6, earnedPoints: liveScoringResult.assetBonus, availableParams: 4 },
        },
        asset_bonus: liveScoringResult.assetBonus,
        total_points: liveScoringResult.totalPoints,
        score: liveScoringResult.score,
        band_label: liveScoringResult.scoreBand.label,
        confidence: liveScoringResult.dataConfidence,
        overlay_flags: liveScoringResult.overlayFlags.map((f) => ({
          ruleKey: f.ruleKey,
          action: f.action,
          note: f.note,
        })),
        reasons: liveScoringResult.positiveReasons,
        limit_kz: liveScoringResult.limitKz,
        limit_cap_applied: liveScoringResult.limitCapApplied,
        score_version: liveScoringResult.scoreVersion,
        computed_at: liveScoringResult.computedAt,
      },
    };

    saveEvaluation(newEval);

    const monthlyEmiVal = Math.round(selectedEq.price_kz / selectedTermMonths);
    const emiShareVal = Math.round((monthlyEmiVal / (incomeEstimateKz || 1)) * 1000) / 10;
    const newAppId = `app-${Date.now()}`;

    const newApp: LoanApplication = {
      id: newAppId,
      evaluation_id: newEvalId,
      equipment_id: selectedEq.id,
      price_kz: selectedEq.price_kz,
      term_months: selectedTermMonths,
      rate_pct: 0,
      monthly_emi_kz: monthlyEmiVal,
      emi_share_pct: emiShareVal,
      status: 'submitted',
      submitted_by: '00000000-0000-0000-0000-000000000001',
      submitted_at: new Date().toISOString(),
      evaluation: newEval,
      equipment: selectedEq,
    };

    saveApplication(newApp, customer.email);
    setSubmittedApp(newApp);
    setIsSubmittingLoan(false);
    setShowEmailPreviewModal(true);
  };

  // Add Custom Equipment Handler
  const handleAddCustomEquipment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = customEqName.trim();
    if (!trimmedName) {
      setCustomEqError('Please enter an equipment or device name.');
      return;
    }
    const cleanPrice = parseInt(customEqPriceKz.replace(/[^0-9]/g, ''), 10);
    if (isNaN(cleanPrice) || cleanPrice <= 0) {
      setCustomEqError('Please enter a valid price in Kz (greater than 0).');
      return;
    }

    const newEq = addCustomEquipment(
      {
        name: trimmedName,
        category: customEqCategory,
        price_kz: cleanPrice,
      },
      customer.fullName ? `${customer.fullName} (Applicant)` : 'Applicant'
    );

    const freshCatalog = getStoredEquipment();
    setEquipmentList(freshCatalog);
    setSelectedEquipmentId(newEq.id);
    setIsCustomEquipmentModalOpen(false);
    setCustomEqName('');
    setCustomEqPriceKz('');
    setCustomEqCategory('Smartphone');
    setCustomEqError('');
  };

  // Delete Custom Equipment Handler
  const handleDeleteCustomEquipment = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedCatalog = deleteCustomEquipment(id, customer.fullName || 'Applicant');
    setEquipmentList(updatedCatalog);
    if (selectedEquipmentId === id) {
      const fallback = updatedCatalog[0]?.id || DEFAULT_EQUIPMENT[0].id;
      setSelectedEquipmentId(fallback);
    }
  };

  const stepsList = [
    { num: 1, label: 'Customer' },
    { num: 2, label: 'Segment' },
    { num: 3, label: 'Details' },
    { num: 4, label: 'Assets & Income' },
    { num: 5, label: 'Evaluation' },
    { num: 6, label: 'Loan' },
  ];

  const selectedEquipment = equipmentList.find((eq) => eq.id === selectedEquipmentId) || equipmentList[0] || DEFAULT_EQUIPMENT[0];
  const monthlyEmi = Math.round(selectedEquipment.price_kz / selectedTermMonths);
  const incomeEstimateKz = customIncomeKz
    ? parseInt(customIncomeKz.replace(/[^0-9]/g, ''), 10)
    : incomeBandCode === 1
      ? 35000
      : incomeBandCode === 2
        ? 75000
        : incomeBandCode === 3
          ? 150000
          : incomeBandCode === 4
            ? 350000
            : incomeBandCode === 5
              ? 750000
              : 1200000;
  const emiSharePct = Math.round((monthlyEmi / (incomeEstimateKz || 1)) * 1000) / 10;
  const isEmiOverCap = emiSharePct > 30;

  const parsedCustomPrice = parseInt(customEqPriceKz.replace(/[^0-9]/g, ''), 10) || 0;
  const isCustomPriceWithinLimit = liveScoringResult ? parsedCustomPrice <= liveScoringResult.limitKz : false;
  const customMonthlyEmi6 = parsedCustomPrice > 0 ? Math.round(parsedCustomPrice / 6) : 0;
  const customSharePct = Math.round((customMonthlyEmi6 / (incomeEstimateKz || 1)) * 1000) / 10;

  return (
    <div className="space-y-4 w-full min-w-0 pb-10">
      {/* 1. STICKY PROGRESS BAR (Shows 'You Are Here' & X of 6 Done) */}
      <div className="sticky top-0 z-30 bg-cream/95 backdrop-blur-md pt-1 pb-3 border-b border-orange-200/50 shadow-xs">
        <div className="flex items-center justify-between px-4 py-2 bg-card rounded-2xl border-2 border-orange shadow-sm">
          <div className="flex items-center space-x-2 md:space-x-4 overflow-x-auto py-1">
            {stepsList.map((st, idx) => {
              const isCurrent = currentStep === st.num;
              const isDone = currentStep > st.num || (st.num < currentStep);
              const isClickable = st.num <= maxCompletedStep + 1;

              return (
                <div key={st.num} className="flex items-center">
                  <button
                    onClick={() => isClickable && goToStep(st.num)}
                    disabled={!isClickable}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-xs font-bold ${isCurrent
                      ? 'bg-orange text-white shadow-md shadow-orange/30 ring-2 ring-orange/30 font-black'
                      : isDone
                        ? 'bg-green text-white hover:bg-green/90 font-bold'
                        : 'bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200 text-slate-700 hover:text-slate-900 font-bold'
                      }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${isCurrent || isDone
                        ? 'bg-white/30 text-white'
                        : 'bg-slate-200 text-slate-800'
                        }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : st.num}
                    </span>
                    <span
                      className={`hidden sm:inline font-heading ${isCurrent || isDone ? 'text-white' : 'text-slate-800'
                        }`}
                    >
                      {st.label}
                    </span>
                  </button>
                  {idx < stepsList.length - 1 && (
                    <div
                      className={`w-4 md:w-8 h-0.5 mx-1 md:mx-2 transition-all ${currentStep > st.num ? 'bg-green' : 'bg-slate-300'
                        }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pl-3">
            <span className="text-xs font-bold font-mono text-orange-btn bg-peach/70 px-2.5 py-1 rounded-lg border border-orange-200">
              {currentStep} of 6 done
            </span>
          </div>
        </div>

        {/* Dismissible 'How it Works' Card with Process Arrows */}
        {showHowItWorks && (
          <div className="mt-2.5 px-4 py-2 bg-gradient-to-r from-[#FFF7EC] via-[#FFF3E5] to-[#FFE8D1] rounded-xl border border-orange-border/80 shadow-2xs flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2.5 flex-wrap text-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-orange-btn shrink-0">
                <Sparkles className="w-4 h-4 text-orange" />
                <span>How it works:</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-800 bg-white/90 px-2.5 py-1 rounded-lg border border-orange-border/60 shadow-2xs">
                  Enter customer
                </span>

                <ArrowRight className="w-3.5 h-3.5 text-orange shrink-0 stroke-[2.5]" />

                <span className="font-bold text-slate-800 bg-white/90 px-2.5 py-1 rounded-lg border border-orange-border/60 shadow-2xs">
                  Fetch 6 data sources
                </span>

                <ArrowRight className="w-3.5 h-3.5 text-orange shrink-0 stroke-[2.5]" />

                <span className="font-bold text-slate-800 bg-white/90 px-2.5 py-1 rounded-lg border border-orange-border/60 shadow-2xs">
                  Get score & loan
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowHowItWorks(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-white/60 transition-colors ml-2 shrink-0 cursor-pointer"
              title="Dismiss banner"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* STEP 1: CUSTOMER DETAILS */}
      {currentStep === 1 && (
        <div className="bg-card rounded-2xl p-6 border-2 border-orange shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-black font-heading text-ink">Customer Details</h2>
              <p className="text-xs text-slate-500">Enter mobile number to check stored records.</p>
            </div>

            {/* Quick Demo Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Demo Presets:</span>
              <button
                onClick={() => handleLoadPreset('244923000101')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-peach/80 hover:bg-peach text-orange-800 border border-orange-200 transition-all"
              >
                Matthew (S3)
              </button>
              <button
                onClick={() => handleLoadPreset('244923000102')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all"
              >
                Tomas (S1)
              </button>
              <button
                onClick={() => handleLoadPreset('244923000103')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-all"
              >
                Carlos (S5)
              </button>
              <button
                onClick={() => handleLoadPreset('244923000104')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-all"
              >
                Pedro (S7)
              </button>
              <button
                onClick={() => handleLoadPreset('244923000105')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition-all"
              >
                Isabel (S8)
              </button>
              <button
                onClick={() => handleLoadPreset('244923000106')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all"
              >
                Joaquim (Risk)
              </button>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Full Name</label>
              <input
                type="text"
                value={customer.fullName}
                onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:bg-white"
                placeholder="e.g. Matthew Silva"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Mobile Number (Unique ID)</label>
              <input
                type="text"
                value={customer.msisdn}
                onChange={(e) => setCustomer({ ...customer, msisdn: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold focus:ring-2 focus:ring-orange-500 focus:bg-white"
                placeholder="+244 923 000 101"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">National ID (BI)</label>
              <input
                type="text"
                value={customer.nationalId}
                onChange={(e) => setCustomer({ ...customer, nationalId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-orange-500 focus:bg-white"
                placeholder="004819284MS31"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Date of Birth</label>
              <input
                type="date"
                value={customer.dateOfBirth}
                onChange={(e) => setCustomer({ ...customer, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
              <span className={`text-[11px] font-bold mt-1 inline-block ${isUnderAge ? 'text-red-600' : 'text-green-600'}`}>
                {applicantAge} years old ({isUnderAge ? 'Under 18 Gate Stop' : 'Age 18+ Passed'})
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">SIM Activation Date</label>
              <input
                type="date"
                value={customer.simActivationDate}
                onChange={(e) => setCustomer({ ...customer, simActivationDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
              <span className="text-[11px] font-mono font-semibold text-slate-500 mt-1 inline-block">
                Tenure: {simTenureMonths} months ({simTenureMonths < 6 ? 'Starter Cap 50k Kz' : 'Full Eligibility'})
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Notification Email</label>
              <input
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-orange-900 focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Live decision delivery via Brevo</span>
            </div>
          </div>

          {/* Hard Stop Eligibility Alerts */}
          {(isUnderAge || isIdMismatch) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs">
              <AlertOctagon className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-bold">Hard stop:</span>{' '}
              {isUnderAge
                ? 'Applicant must be at least 18 years old.'
                : 'National ID does not match SIM subscriber registration.'}
            </div>
          )}

          {/* Check Data Sources Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-black text-ink uppercase tracking-wider">6 Data Sources</span>
                <p className="text-[11px] text-slate-500">Real-time check from operator and partner registries.</p>
              </div>

              <button
                onClick={() => runDataSourceCheck(customer.msisdn)}
                disabled={isCheckingSources}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all"
              >
                <Database className={`w-3.5 h-3.5 ${isCheckingSources ? 'animate-spin' : ''}`} />
                {isCheckingSources ? 'Pulling Data...' : 'Check data sources'}
              </button>
            </div>

            {/* Visual Source Ticker Badges */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-1">
              {sourceTicks.map((st, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg border text-center transition-all ${st.found
                    ? 'bg-white border-green-200 text-green-800'
                    : 'bg-white/60 border-slate-200 text-slate-400'
                    }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    {st.found ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-300" />
                    )}
                    <span className="text-[11px] font-bold truncate">{st.source.split(' ')[0]}</span>
                  </div>
                  <span className="text-[10px] font-mono block text-slate-500">
                    {st.found ? st.tag : 'No record'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => goToStep(2)}
              disabled={isUnderAge || isIdMismatch}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>Continue to Segment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SEGMENT (4 Big Yes/No Tiles + Result Card) */}
      {currentStep === 2 && (
        <div className="bg-card rounded-2xl p-6 border-2 border-orange shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xl font-black font-heading text-ink">Customer Segment</h2>
            <p className="text-xs text-slate-500">Confirm the customer's financial activity.</p>
          </div>

          {/* 4 Big Yes/No Tiles (One Screen Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Tile 1: S7 Salaried Worker */}
            <div
              className={`p-4 rounded-xl border transition-all ${segmentQuestions.isSalaried
                ? 'bg-blue-50/70 border-blue-400 shadow-sm'
                : 'bg-slate-50 border-slate-200'
                }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold text-ink">1. Salary Paid In</span>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">S7 Salaried</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">Is a regular salary paid in via bank or wallet?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSegmentQuestions({ ...segmentQuestions, isSalaried: true })}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${segmentQuestions.isSalaried ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'
                    }`}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => setSegmentQuestions({ ...segmentQuestions, isSalaried: false })}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${!segmentQuestions.isSalaried ? 'bg-slate-700 text-white' : 'bg-white border text-slate-600'
                    }`}
                >
                  NO
                </button>
              </div>
            </div>

            {/* Tile 2: S8 Trader / Self-Employed */}
            <div
              className={`p-4 rounded-xl border transition-all ${!segmentQuestions.isSalaried && segmentQuestions.isTrader
                ? 'bg-purple-50/70 border-purple-400 shadow-sm'
                : 'bg-slate-50 border-slate-200'
                }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-purple-600 shrink-0" />
                  <span className="text-xs font-bold text-ink">2. Trader Payments</span>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">S8 Trader</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">Do you take customer payments (shop, moto-taxi, trade)?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSegmentQuestions({ ...segmentQuestions, isTrader: true })}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${segmentQuestions.isTrader ? 'bg-purple-600 text-white' : 'bg-white border text-slate-600'
                    }`}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => setSegmentQuestions({ ...segmentQuestions, isTrader: false })}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${!segmentQuestions.isTrader ? 'bg-slate-700 text-white' : 'bg-white border text-slate-600'
                    }`}
                >
                  NO
                </button>
              </div>
            </div>

            {/* Tile 3: S5 Banked ATM/Card */}
            <div
              className={`p-4 rounded-xl border transition-all ${!segmentQuestions.isSalaried && !segmentQuestions.isTrader && segmentQuestions.hasBankAccount
                ? 'bg-teal-50/70 border-teal-400 shadow-sm'
                : 'bg-slate-50 border-slate-200'
                }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-teal-600 shrink-0" />
                  <span className="text-xs font-bold text-ink">3. Bank Account</span>
                </div>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">S5 Banked</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">Do you have an active bank account with card & ATM?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSegmentQuestions({ ...segmentQuestions, hasBankAccount: true })}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${segmentQuestions.hasBankAccount ? 'bg-teal-600 text-white' : 'bg-white border text-slate-600'
                    }`}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => setSegmentQuestions({ ...segmentQuestions, hasBankAccount: false })}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${!segmentQuestions.hasBankAccount ? 'bg-slate-700 text-white' : 'bg-white border text-slate-600'
                    }`}
                >
                  NO
                </button>
              </div>
            </div>

            {/* Tile 4: S3 Smartphone Wallet */}
            <div
              className={`p-4 rounded-xl border transition-all ${!segmentQuestions.isSalaried &&
                !segmentQuestions.isTrader &&
                !segmentQuestions.hasBankAccount &&
                segmentQuestions.hasWalletApp
                ? 'bg-amber-50/70 border-amber-400 shadow-sm'
                : 'bg-slate-50 border-slate-200'
                }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold text-ink">4. Smartphone Wallet</span>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">S3 Wallet</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">Do you use a mobile wallet app on a smartphone?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSegmentQuestions({ ...segmentQuestions, hasWalletApp: true })}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${segmentQuestions.hasWalletApp ? 'bg-amber-600 text-white' : 'bg-white border text-slate-600'
                    }`}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => setSegmentQuestions({ ...segmentQuestions, hasWalletApp: false })}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${!segmentQuestions.hasWalletApp ? 'bg-slate-700 text-white' : 'bg-white border text-slate-600'
                    }`}
                >
                  NO
                </button>
              </div>
            </div>
          </div>

          {/* Resolved Segment Highlight Card */}
          <div className="p-4 bg-gradient-to-r from-peach/80 via-orange-50 to-white rounded-2xl border-2 border-orange-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {resolvedSegment}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black font-heading text-ink">
                    {resolvedSegment === 'S1' && 'Button phone, cash-only'}
                    {resolvedSegment === 'S3' && 'Smartphone wallet user'}
                    {resolvedSegment === 'S5' && 'Banked (ATM and card)'}
                    {resolvedSegment === 'S7' && 'Salaried worker'}
                    {resolvedSegment === 'S8' && 'Trader or self-employed'}
                  </span>
                  <span className="text-[10px] font-mono bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold">
                    Primary Match
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {resolvedSegment === 'S1' && 'Scored mostly on telecom recharge habits.'}
                  {resolvedSegment === 'S3' && 'Scored on telecom habits and mobile wallet turnover.'}
                  {resolvedSegment === 'S5' && 'Scored on banking transactions, ATM card use and telecom.'}
                  {resolvedSegment === 'S7' && 'Scored on verified salary inflows and telecom stability.'}
                  {resolvedSegment === 'S8' && 'Scored on business turnover, QR receipts and telecom.'}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Active blocks:</span>
                  {segmentActiveBlocks.map((b) => (
                    <span key={b} className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                      Block {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional Wallet Toggle */}
            <div className="bg-white p-3 rounded-xl border border-orange-200 shrink-0 text-center">
              <span className="text-xs font-bold text-ink block mb-1.5">Use wallet data?</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setWalletAvailable(true)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${walletAvailable ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-500'
                    }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setWalletAvailable(false)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${!walletAvailable ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-500'
                    }`}
                >
                  No
                </button>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                {walletAvailable ? 'Wallet block active' : 'Points move to Telecom'}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => goToStep(1)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Customer</span>
            </button>
            <button
              onClick={() => goToStep(3)}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>Continue to Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DETAILS (Parameters by Active Block with Source Chips & Live Points) */}
      {currentStep === 3 && (
        <div className="bg-card rounded-2xl p-6 border-2 border-orange shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-black font-heading text-ink">Behavior Parameters</h2>
              <p className="text-xs text-slate-500">Data pulled from verified sources or entered.</p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-400">
              Blank values are skipped without penalty
            </span>
          </div>

          {/* Block Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
            {segmentActiveBlocks.map((blk) => {
              const label =
                blk === 'P'
                  ? 'Personal (P)'
                  : blk === 'T'
                    ? 'Telecom (T)'
                    : blk === 'W'
                      ? 'Wallet (W)'
                      : blk === 'B'
                        ? 'Bank (B)'
                        : 'Alternative (X)';
              const isActive = activeBlock === blk;

              return (
                <button
                  key={blk}
                  onClick={() => setActiveBlock(blk)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${isActive
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Compact 2-Column Grid for Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* P: Personal Block */}
            {activeBlock === 'P' && (
              <>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">ID and SIM Registry Match</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('id_sim_match', parameterInputs.id_sim_match)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.id_sim_match || 'yes'}
                    onChange={(e) => setParameterInputs({ ...parameterInputs, id_sim_match: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value="yes">Yes (Matched & Verified)</option>
                    <option value="no">No (Mismatch - Hard Stop)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-semibold">
                      From Unitel
                    </span>
                    <span className="text-[10px] text-slate-400">Civil ID database</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Employment Status</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('employment_status', parameterInputs.employment_status)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.employment_status || 'other'}
                    onChange={(e) => setParameterInputs({ ...parameterInputs, employment_status: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value="formal_job">Formal job (Corporate/Gov)</option>
                    <option value="self_employed">Self-employed / Shop owner</option>
                    <option value="informal_business">Informal trade</option>
                    <option value="other">Other / Not specified</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                      You entered
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Time in Current Activity (Months)</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('time_in_activity_months', parameterInputs.time_in_activity_months)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.time_in_activity_months || 18}
                    onChange={(e) =>
                      setParameterInputs({ ...parameterInputs, time_in_activity_months: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value={4}>Under 6 months (+1 pt)</option>
                    <option value={18}>6 to 24 months (+3 pts)</option>
                    <option value={36}>Over 24 months (+5 pts)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                      You entered
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* T: Telecom Block */}
            {activeBlock === 'T' && (
              <>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">SIM Tenure (Months)</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('sim_tenure_months', parameterInputs.sim_tenure_months)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.sim_tenure_months || 30}
                    onChange={(e) =>
                      setParameterInputs({ ...parameterInputs, sim_tenure_months: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value={2}>Under 3 months (0 pts)</option>
                    <option value={4}>3–6 months (2 pts)</option>
                    <option value={8}>6–12 months (4 pts)</option>
                    <option value={18}>12–24 months (7 pts)</option>
                    <option value={30}>Over 24 months (10 pts)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-semibold">
                      From Unitel
                    </span>
                    <span className="text-[10px] text-slate-400">CDR tenure</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Top-Up Months of Last 12</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('topup_months_of_12', parameterInputs.topup_months_of_12)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.topup_months_of_12 || 11}
                    onChange={(e) =>
                      setParameterInputs({ ...parameterInputs, topup_months_of_12: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value={2}>0–3 months (0 pts)</option>
                    <option value={5}>4–6 months (3 pts)</option>
                    <option value={8}>7–9 months (6 pts)</option>
                    <option value={11}>10–12 months (10 pts)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-semibold">
                      From Unitel
                    </span>
                  </div>
                </div>

                {/* Recharges Compact Card with Month/Quarter toggle, points, source chip, and 12-month bar chart */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-ink">Recharges</label>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                          rechargeHistory && rechargeHistory.length > 0
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {rechargeHistory && rechargeHistory.length > 0 ? 'From Unitel' : 'You entered'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Month / Quarter Toggle */}
                      <div className="inline-flex rounded-lg bg-slate-200 p-0.5 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => {
                            setRechargeView('month');
                            setParameterInputs({
                              ...parameterInputs,
                              recharge_view: 'month',
                              recharge_value_per_quarter_kz: undefined,
                            });
                          }}
                          className={`px-2.5 py-0.5 rounded-md transition-all ${
                            rechargeView === 'month'
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'text-slate-600 hover:text-ink'
                          }`}
                        >
                          Month
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRechargeView('quarter');
                            const qVal = parameterInputs.recharge_value_per_quarter_kz ??
                              (parameterInputs.recharge_value_per_month_kz ? parameterInputs.recharge_value_per_month_kz * 3 : undefined);
                            setParameterInputs({
                              ...parameterInputs,
                              recharge_view: 'quarter',
                              recharge_value_per_quarter_kz: qVal,
                              recharge_value_per_month_kz: undefined,
                            });
                          }}
                          className={`px-2.5 py-0.5 rounded-md transition-all ${
                            rechargeView === 'quarter'
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'text-slate-600 hover:text-ink'
                          }`}
                        >
                          Quarter
                        </button>
                      </div>

                      {/* Points earned live */}
                      <span className="text-xs font-mono font-bold text-orange-600">
                        +{(
                          (parameterInputs.recharges_per_month !== undefined
                            ? getParamPoints('recharges_per_month', parameterInputs.recharges_per_month)
                            : 0) +
                          (rechargeView === 'quarter'
                            ? parameterInputs.recharge_value_per_quarter_kz !== undefined
                              ? getParamPoints('recharge_value_per_quarter_kz', parameterInputs.recharge_value_per_quarter_kz)
                              : 0
                            : parameterInputs.recharge_value_per_month_kz !== undefined
                            ? getParamPoints('recharge_value_per_month_kz', parameterInputs.recharge_value_per_month_kz)
                            : 0)
                        )} pts
                      </span>
                    </div>
                  </div>

                  {/* Inputs Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 mb-1">
                        <span>Recharges / Month (3m avg)</span>
                        <span className="text-[10px] font-mono font-bold text-orange-600">
                          {parameterInputs.recharges_per_month !== undefined
                            ? `+${getParamPoints('recharges_per_month', parameterInputs.recharges_per_month)} pts`
                            : 'Skipped'}
                        </span>
                      </div>
                      <select
                        value={parameterInputs.recharges_per_month ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          setParameterInputs({ ...parameterInputs, recharges_per_month: val });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      >
                        <option value="">(Blank - skipped)</option>
                        <option value={1}>Under 2 (2 pts)</option>
                        <option value={3}>2–4 recharges (5 pts)</option>
                        <option value={6}>5–8 recharges (8 pts)</option>
                        <option value={9}>Over 8 recharges (10 pts)</option>
                      </select>
                    </div>

                    {rechargeView === 'month' ? (
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 mb-1">
                          <span>Recharge Value / Month (3m avg)</span>
                          <span className="text-[10px] font-mono font-bold text-orange-600">
                            {parameterInputs.recharge_value_per_month_kz !== undefined
                              ? `+${getParamPoints('recharge_value_per_month_kz', parameterInputs.recharge_value_per_month_kz)} pts`
                              : 'Skipped'}
                          </span>
                        </div>
                        <select
                          value={parameterInputs.recharge_value_per_month_kz ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                            setParameterInputs({
                              ...parameterInputs,
                              recharge_value_per_month_kz: val,
                              recharge_value_per_quarter_kz: val !== undefined ? val * 3 : undefined,
                            });
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                        >
                          <option value="">(Blank - skipped)</option>
                          <option value={1000}>Under 1,500 Kz (2 pts)</option>
                          <option value={2000}>1,500–3,000 Kz (5 pts)</option>
                          <option value={4500}>3,000–6,000 Kz (8 pts)</option>
                          <option value={9000}>Over 6,000 Kz (10 pts)</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 mb-1">
                          <span>Recharge Value / Quarter (3m total)</span>
                          <span className="text-[10px] font-mono font-bold text-orange-600">
                            {parameterInputs.recharge_value_per_quarter_kz !== undefined
                              ? `+${getParamPoints('recharge_value_per_quarter_kz', parameterInputs.recharge_value_per_quarter_kz)} pts`
                              : 'Skipped'}
                          </span>
                        </div>
                        <select
                          value={parameterInputs.recharge_value_per_quarter_kz ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                            setParameterInputs({
                              ...parameterInputs,
                              recharge_value_per_quarter_kz: val,
                              recharge_value_per_month_kz: val !== undefined ? Math.round(val / 3) : undefined,
                            });
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                        >
                          <option value="">(Blank - skipped)</option>
                          <option value={3000}>Under 4,500 Kz (2 pts)</option>
                          <option value={6000}>4,500–9,000 Kz (5 pts)</option>
                          <option value={13500}>9,000–18,000 Kz (8 pts)</option>
                          <option value={27000}>Over 18,000 Kz (10 pts)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Tiny 12-Month Bar Chart */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="font-semibold text-slate-600">12-Month Recharge Pattern</span>
                      <span className="text-[9px] text-slate-400">Values in Kz (last 3m highlighted)</span>
                    </div>
                    {rechargeHistory && rechargeHistory.length > 0 ? (
                      <div className="flex items-end gap-1 h-9 px-1.5 bg-white rounded-lg border border-slate-200/80 py-1">
                        {rechargeHistory.map((r, i) => {
                          const maxVal = Math.max(...rechargeHistory.map((m) => m.recharge_value_kz), 1);
                          const heightPct = Math.max(10, Math.round((r.recharge_value_kz / maxVal) * 100));
                          const isLast3 = i >= rechargeHistory.length - 3;
                          return (
                            <div
                              key={r.month}
                              className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                              title={`${r.month}: ${r.recharge_value_kz.toLocaleString()} Kz (${r.recharge_count} txns)`}
                            >
                              <div
                                style={{ height: `${r.recharge_value_kz > 0 ? heightPct : 8}%` }}
                                className={`w-full rounded-t-xs transition-all ${
                                  r.recharge_value_kz === 0
                                    ? 'bg-slate-200'
                                    : isLast3
                                    ? 'bg-orange-500 shadow-xs'
                                    : 'bg-orange-300 group-hover:bg-orange-400'
                                }`}
                              />
                              <span className="text-[8px] text-slate-400 font-mono mt-0.5 leading-none">
                                {r.month.split('-')[1]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-8 flex items-center justify-center bg-white rounded border border-dashed border-slate-200 text-[10px] text-slate-400">
                        No recharge record on file (parameter skipped)
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Recharge Stability</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('spend_stability', parameterInputs.spend_stability)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.spend_stability || 'stable'}
                    onChange={(e) => setParameterInputs({ ...parameterInputs, spend_stability: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value="stable">Stable (10 pts)</option>
                    <option value="some_swings">Some swings (5 pts)</option>
                    <option value="erratic">Erratic (1 pt)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-semibold">
                      From Unitel
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Airtime Loan Repayment</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('airtime_loan_repayment', parameterInputs.airtime_loan_repayment)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.airtime_loan_repayment || '80-99%_repaid'}
                    onChange={(e) =>
                      setParameterInputs({ ...parameterInputs, airtime_loan_repayment: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value="100%_repaid">100% on time (10 pts)</option>
                    <option value="80-99%_repaid">80–99% repaid (7 pts)</option>
                    <option value="50_79%_repaid">50–79% repaid (3 pts)</option>
                    <option value="under_50%_repaid">Under 50% (0 pts)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-semibold">
                      From Unitel
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* W: Wallet Block */}
            {activeBlock === 'W' && (
              <>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Wallet Months Active</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('wallet_months_active', parameterInputs.wallet_months_active)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.wallet_months_active || 14}
                    onChange={(e) =>
                      setParameterInputs({ ...parameterInputs, wallet_months_active: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value={2}>Under 3 months (0 pts)</option>
                    <option value={4}>3–6 months (3 pts)</option>
                    <option value={8}>6–12 months (6 pts)</option>
                    <option value={14}>Over 12 months (10 pts)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                      From Unitel Money
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Inflow Months of 12</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('wallet_inflow_months_of_12', parameterInputs.wallet_inflow_months_of_12)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.wallet_inflow_months_of_12 || 10}
                    onChange={(e) =>
                      setParameterInputs({
                        ...parameterInputs,
                        wallet_inflow_months_of_12: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value={2}>0–3 months (0 pts)</option>
                    <option value={5}>4–6 months (3 pts)</option>
                    <option value={8}>7–9 months (6 pts)</option>
                    <option value={10}>10–12 months (10 pts)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                      From Unitel Money
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Average Monthly Inflow</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('avg_monthly_inflow_kz', parameterInputs.avg_monthly_inflow_kz)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.avg_monthly_inflow_kz || 120000}
                    onChange={(e) =>
                      setParameterInputs({ ...parameterInputs, avg_monthly_inflow_kz: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value={15000}>Under 20,000 Kz (2 pts)</option>
                    <option value={50000}>20,000–80,000 Kz (5 pts)</option>
                    <option value={120000}>80,000–200,000 Kz (8 pts)</option>
                    <option value={250000}>Over 200,000 Kz (10 pts)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                      From Unitel Money
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Utility & Bill Payments</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('bill_payments_via_wallet', parameterInputs.bill_payments_via_wallet)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.bill_payments_via_wallet || 'sometimes'}
                    onChange={(e) =>
                      setParameterInputs({ ...parameterInputs, bill_payments_via_wallet: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value="none">None (0 pts)</option>
                    <option value="sometimes">Sometimes (5 pts)</option>
                    <option value="regular">Regular (10 pts)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                      From Unitel Money
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* B: Bank Block */}
            {activeBlock === 'B' && (
              <>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Bank Account Age</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('account_age_months', parameterInputs.account_age_months)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.account_age_months || 48}
                    onChange={(e) =>
                      setParameterInputs({ ...parameterInputs, account_age_months: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value={4}>Under 6 months (2 pts)</option>
                    <option value={18}>6–24 months (5 pts)</option>
                    <option value={48}>Over 24 months (10 pts)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                      From Bank (demo)
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Credits Months of Last 12</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('credits_months_of_12', parameterInputs.credits_months_of_12)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.credits_months_of_12 || 10}
                    onChange={(e) =>
                      setParameterInputs({ ...parameterInputs, credits_months_of_12: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value={2}>0–3 months (0 pts)</option>
                    <option value={6}>4–8 months (5 pts)</option>
                    <option value={10}>9–12 months (10 pts)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                      From Bank (demo)
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Returned Payments (12m)</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('returned_payments_12m', parameterInputs.returned_payments_12m)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.returned_payments_12m ?? 0}
                    onChange={(e) =>
                      setParameterInputs({ ...parameterInputs, returned_payments_12m: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value={0}>0 returned (10 pts)</option>
                    <option value={1}>1–2 returned (6 pts)</option>
                    <option value={4}>3–5 returned (2 pts)</option>
                    <option value={6}>6 or more (0 pts)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                      From Bank (demo)
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* X: Alternative Data Block */}
            {activeBlock === 'X' && (
              <>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Utility Bills on Time</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('utility_bills_on_time', parameterInputs.utility_bills_on_time)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.utility_bills_on_time || 'mostly'}
                    onChange={(e) => setParameterInputs({ ...parameterInputs, utility_bills_on_time: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value="always">Always on time (10 pts)</option>
                    <option value="mostly">Mostly on time (7 pts)</option>
                    <option value="sometimes">Sometimes (4 pts)</option>
                    <option value="none">None / Skipped (0 pts)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                      From Utility (demo)
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">Tax Standing (NIF)</label>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      +{getParamPoints('nif_standing', parameterInputs.nif_standing)} pts
                    </span>
                  </div>
                  <select
                    value={parameterInputs.nif_standing || 'regular'}
                    onChange={(e) => setParameterInputs({ ...parameterInputs, nif_standing: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value="regular">Regular / In order (10 pts)</option>
                    <option value="irregular">Irregular (3 pts)</option>
                    <option value="none">No record (0 pts)</option>
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                      From Registry (demo)
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => goToStep(2)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Segment</span>
            </button>
            <button
              onClick={() => goToStep(4)}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>Continue to Assets & Income</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: ASSETS & INCOME (One Screen, Two Cards) */}
      {currentStep === 4 && (
        <div className="bg-card rounded-2xl p-6 border-2 border-orange shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xl font-black font-heading text-ink">Assets and Income</h2>
            <p className="text-xs text-slate-500">Bonus asset points and income capacity.</p>
          </div>

          {/* Two Cards Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Card: Assets (Bonus Only) */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black font-heading text-ink">Physical Assets (Bonus Only)</h3>
                  <p className="text-[11px] text-slate-500">Physical property adds up to +6 bonus points.</p>
                </div>
                <span className="text-xs font-mono font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">
                  Max +6 pts
                </span>
              </div>

              {/* 4 Asset Tiles */}
              <div className="space-y-2">
                {/* House Tile */}
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-orange-600" />
                    <div>
                      <span className="text-xs font-bold text-ink">House</span>
                      <span className="text-[10px] text-orange-600 font-bold ml-1.5">+2 pts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {(['yes', 'no', 'skip'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setAssets({ ...assets, house: opt })}
                        className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-all ${assets.house === opt
                          ? opt === 'yes'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-700 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Land Title Tile */}
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <div>
                      <span className="text-xs font-bold text-ink">Land Title</span>
                      <span className="text-[10px] text-orange-600 font-bold ml-1.5">+1 pt</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {(['yes', 'no', 'skip'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setAssets({ ...assets, land_title: opt })}
                        className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-all ${assets.land_title === opt
                          ? opt === 'yes'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-700 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Two-Wheeler Tile */}
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Bike className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-xs font-bold text-ink">Two-Wheeler</span>
                      <span className="text-[10px] text-orange-600 font-bold ml-1.5">+1 pt</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {(['yes', 'no', 'skip'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setAssets({ ...assets, two_wheeler: opt })}
                        className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-all ${assets.two_wheeler === opt
                          ? opt === 'yes'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-700 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Car Tile */}
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-purple-600" />
                    <div>
                      <span className="text-xs font-bold text-ink">Car</span>
                      <span className="text-[10px] text-orange-600 font-bold ml-1.5">+2 pts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {(['yes', 'no', 'skip'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setAssets({ ...assets, car: opt })}
                        className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-all ${assets.car === opt
                          ? opt === 'yes'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-700 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <span className="text-[11px] text-slate-500 italic block">
                Assets only add points. Missing or skipped items never reduce your score.
              </span>
            </div>

            {/* Right Card: Income Band */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black font-heading text-ink">Income Band</h3>
                  <p className="text-[11px] text-slate-500">Declared monthly income capacity.</p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">USD note (~920 Kz)</span>
              </div>

              {/* 6 Income Chips */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { code: 1, label: '< 50,000 Kz', usd: 'USD 54', tier: 'Very Low' },
                  { code: 2, label: '50k–100k Kz', usd: 'USD 108', tier: 'Low' },
                  { code: 3, label: '100k–250k Kz', usd: 'USD 271', tier: 'Medium' },
                  { code: 4, label: '250k–500k Kz', usd: 'USD 543', tier: 'Medium-High' },
                  { code: 5, label: '500k–1M Kz', usd: 'USD 1,086', tier: 'High' },
                  { code: 6, label: '> 1,000,000 Kz', usd: 'USD 1,086+', tier: 'Very High' },
                ].map((band) => {
                  const isSelected = incomeBandCode === band.code && !customIncomeKz;
                  return (
                    <button
                      key={band.code}
                      type="button"
                      onClick={() => {
                        setIncomeBandCode(band.code);
                        setCustomIncomeKz('');
                      }}
                      className={`p-2 rounded-xl text-left border transition-all ${isSelected
                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-ink'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono">{band.label}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          {band.usd}
                        </span>
                      </div>
                      <span className={`text-[10px] block ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                        {band.tier}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Other Custom Amount Input */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-ink mb-1">Other Amount (Custom Kz)</label>
                <input
                  type="text"
                  value={customIncomeKz}
                  onChange={(e) => setCustomIncomeKz(e.target.value)}
                  placeholder="e.g. 185,000 Kz"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Default is estimated from telecom spend and wallet transactions.
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => goToStep(3)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Details</span>
            </button>
            <button
              onClick={() => goToStep(5)}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>Calculate Evaluation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: EVALUATION (Score Gauge, Block Bars, Reasons & Cap) */}
      {currentStep === 5 && liveScoringResult && (
        <div className="bg-card rounded-2xl p-6 border-2 border-orange shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black font-heading text-ink">Credit Evaluation</h2>
              <p className="text-xs text-slate-500">Calculated from verified points model.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Data Coverage:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${liveScoringResult.dataCoverageLabel === 'High'
                  ? 'bg-green-100 text-green-800'
                  : liveScoringResult.dataCoverageLabel === 'Medium'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                  }`}
              >
                {liveScoringResult.dataCoverageLabel} ({liveScoringResult.dataCoverageScore}%)
              </span>
            </div>
          </div>

          {/* 3-Column Evaluation Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {/* Left: Score Gauge */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
              <ScoreGauge score={liveScoringResult.score} bandLabel={liveScoringResult.scoreBand.label} size={210} />
              <div className="mt-3 pt-3 border-t border-slate-200 w-full flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Credit Limit:</span>
                <span className="font-bold font-mono text-ink">
                  {formatKz(liveScoringResult.limitKz)}
                </span>
              </div>
            </div>

            {/* Middle: Horizontal Coloured Bars per Block */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-black text-ink uppercase tracking-wider block">
                Points per Block
              </span>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">Personal (P)</span>
                    <span className="font-mono font-bold text-ink">
                      {Math.round(liveScoringResult.blockScores.P.earnedPoints)} of {liveScoringResult.blockScores.P.effectivePoints} pts
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-slate-600 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (liveScoringResult.blockScores.P.earnedPoints / (liveScoringResult.blockScores.P.effectivePoints || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-teal-800">Telecom (T)</span>
                    <span className="font-mono font-bold text-ink">
                      {Math.round(liveScoringResult.blockScores.T.earnedPoints)} of {liveScoringResult.blockScores.T.effectivePoints} pts
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (liveScoringResult.blockScores.T.earnedPoints / (liveScoringResult.blockScores.T.effectivePoints || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {liveScoringResult.blockScores.W.effectivePoints > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-purple-800">Wallet (W)</span>
                      <span className="font-mono font-bold text-ink">
                        {Math.round(liveScoringResult.blockScores.W.earnedPoints)} of {liveScoringResult.blockScores.W.effectivePoints} pts
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (liveScoringResult.blockScores.W.earnedPoints / (liveScoringResult.blockScores.W.effectivePoints || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {liveScoringResult.blockScores.B.effectivePoints > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-blue-800">Bank (B)</span>
                      <span className="font-mono font-bold text-ink">
                        {Math.round(liveScoringResult.blockScores.B.earnedPoints)} of {liveScoringResult.blockScores.B.effectivePoints} pts
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-blue-700 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (liveScoringResult.blockScores.B.earnedPoints / (liveScoringResult.blockScores.B.effectivePoints || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {liveScoringResult.blockScores.X.effectivePoints > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-amber-800">Alternative (X)</span>
                      <span className="font-mono font-bold text-ink">
                        {Math.round(liveScoringResult.blockScores.X.earnedPoints)} of {liveScoringResult.blockScores.X.effectivePoints} pts
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-amber-600 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (liveScoringResult.blockScores.X.earnedPoints / (liveScoringResult.blockScores.X.effectivePoints || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-bold">
                  <span className="text-ink">Total Base Points</span>
                  <span className="font-mono text-orange-600">
                    {Math.round(liveScoringResult.totalPoints)} / 100 pts
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Plain Words Reasons */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-black text-ink uppercase tracking-wider block">
                Top 3 Positive Reasons
              </span>

              <div className="space-y-2">
                {liveScoringResult.positiveReasons.slice(0, 3).map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              {liveScoringResult.dataCoverageScore < 100 && (
                <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-medium flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Missing data did not lower the score.</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Actions */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => goToStep(4)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Assets</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  saveEvaluation({
                    id: `eval-${Date.now()}`,
                    customer_id: `cust-${Date.now()}`,
                    analyst_id: '00000000-0000-0000-0000-000000000001',
                    segment_code: resolvedSegment,
                    segment_overridden: false,
                    config_version_id: 'v1.0-default',
                    wallet_available: walletAvailable,
                    income_band_code: incomeBandCode,
                    income_source: 'estimated',
                    status: 'scored',
                    created_at: new Date().toISOString(),
                    customer: {
                      id: `cust-${Date.now()}`,
                      full_name: customer.fullName,
                      email: customer.email,
                      msisdn: customer.msisdn,
                      national_id_masked: `*******${customer.nationalId.slice(-4)}`,
                      date_of_birth: customer.dateOfBirth,
                      sim_activation_date: customer.simActivationDate,
                    },
                    results: {
                      evaluation_id: `eval-${Date.now()}`,
                      block_points: {} as any,
                      asset_bonus: liveScoringResult.assetBonus,
                      total_points: liveScoringResult.totalPoints,
                      score: liveScoringResult.score,
                      band_label: liveScoringResult.scoreBand.label,
                      confidence: liveScoringResult.dataConfidence,
                      overlay_flags: [],
                      reasons: liveScoringResult.positiveReasons,
                      limit_kz: liveScoringResult.limitKz,
                      limit_cap_applied: liveScoringResult.limitCapApplied,
                      score_version: liveScoringResult.scoreVersion,
                      computed_at: liveScoringResult.computedAt,
                    },
                  });
                  alert('Evaluation saved successfully!');
                }}
                className="px-4 py-2 border border-orange-300 text-orange-700 hover:bg-orange-50 font-bold text-xs rounded-xl transition-all"
              >
                Save Evaluation
              </button>

              <button
                onClick={() => goToStep(6)}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <span>Apply for Equipment Loan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: LOAN (Limit, Equipment Catalog, EMI & Submit) */}
      {currentStep === 6 && liveScoringResult && (
        <div className="bg-card rounded-2xl p-6 border-2 border-orange shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-black font-heading text-ink">Equipment Loan</h2>
              <p className="text-xs text-slate-500">Select equipment and affordable EMI plan.</p>
            </div>

            {/* Approved Limit Banner */}
            <div className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl shadow-sm text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider block opacity-90">
                Approved Credit Limit
              </span>
              <span className="text-lg font-black font-mono">
                {formatKz(liveScoringResult.limitKz)}
              </span>
              <span className="text-[10px] block opacity-85">
                (about USD {Math.round(liveScoringResult.limitKz / 920)})
              </span>
            </div>
          </div>

          {/* Block 2: Equipment Catalog */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-ink uppercase tracking-wider">
                  Select Equipment
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  ({equipmentList.length} available)
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  Filtered by your credit limit
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomEqError('');
                    setIsCustomEquipmentModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-300 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Customize Equipment</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {equipmentList.map((eq) => {
                const isSelected = selectedEquipmentId === eq.id;
                const isAffordable = eq.price_kz <= liveScoringResult.limitKz;

                return (
                  <button
                    key={eq.id}
                    disabled={!isAffordable}
                    onClick={() => isAffordable && setSelectedEquipmentId(eq.id)}
                    className={`p-3 rounded-2xl text-left border transition-all relative ${isSelected
                      ? 'border-orange-500 bg-peach/50 ring-2 ring-orange-300 shadow-sm'
                      : isAffordable
                        ? 'border-slate-200 bg-white hover:bg-slate-50'
                        : 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
                      }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3" />
                      </span>
                    )}

                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                        {eq.category.replace('_', ' ')}
                      </span>
                      {eq.is_custom && (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 tracking-wider uppercase">
                            Custom
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            title="Delete custom equipment"
                            onClick={(e) => handleDeleteCustomEquipment(e, eq.id)}
                            className="p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </span>
                        </div>
                      )}
                    </div>

                    <span className="text-xs font-bold text-ink block truncate" title={eq.name}>{eq.name}</span>
                    <span className="text-sm font-black font-mono text-orange-600 block mt-1">
                      {formatKz(eq.price_kz)}
                    </span>
                    {!isAffordable && (
                      <span className="text-[10px] font-bold text-red-600 mt-1 block">
                        Exceeds limit
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Customize Equipment Card in Grid */}
              <button
                type="button"
                onClick={() => {
                  setCustomEqError('');
                  setIsCustomEquipmentModalOpen(true);
                }}
                className="p-3 rounded-2xl text-left border-2 border-dashed border-orange-300 bg-orange-50/40 hover:bg-orange-50 hover:border-orange-500 transition-all flex flex-col justify-between group min-h-[96px] cursor-pointer"
              >
                <div>
                  <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mb-1 group-hover:bg-orange-500 group-hover:text-white transition-all">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-extrabold text-ink block group-hover:text-orange-600">
                    + Customize Equipment
                  </span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                    Add custom device & amount
                  </span>
                </div>
                <span className="text-[10px] font-bold text-orange-600 mt-1 flex items-center gap-1">
                  Enter custom &rarr;
                </span>
              </button>
            </div>
          </div>

          {/* Block 3: EMI Plan & Affordability Check */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-black text-ink uppercase tracking-wider block">
              Repayment Term & Monthly EMI
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <span className="text-xs font-bold text-slate-600 block mb-1.5">Choose Term:</span>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 6, 9, 12].map((term) => (
                    <button
                      key={term}
                      onClick={() => setSelectedTermMonths(term)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${selectedTermMonths === term
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      {term} Months
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Monthly Installment</span>
                  <span className="text-lg font-black font-mono text-ink">
                    {formatKz(monthlyEmi)} / mo
                  </span>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${isEmiOverCap ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'
                      }`}
                  >
                    {isEmiOverCap ? <AlertOctagon className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{emiSharePct}% of income</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isEmiOverCap ? 'Exceeds 30% cap threshold' : 'Within 30% affordability cap'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Loan Button */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => goToStep(5)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Evaluation</span>
            </button>

            <button
              onClick={handleSubmitLoan}
              disabled={isSubmittingLoan}
              className="px-8 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Send className={`w-4 h-4 ${isSubmittingLoan ? 'animate-bounce' : ''}`} />
              <span>{isSubmittingLoan ? 'Submitting Application...' : 'Submit Application'}</span>
            </button>
          </div>
        </div>
      )}

      {/* CUSTOMIZE EQUIPMENT MODAL */}
      <Modal
        isOpen={isCustomEquipmentModalOpen}
        onClose={() => setIsCustomEquipmentModalOpen(false)}
        className="bg-white rounded-2xl max-w-lg md:max-w-xl w-full p-5 sm:p-6 shadow-2xl border-2 border-orange space-y-4 animate-in zoom-in-95 duration-150"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black font-heading text-ink">Customize Equipment</h3>
                <p className="text-[11px] text-slate-500">
                  Add a custom device, appliance, or kit with custom pricing.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomEquipmentModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Customer Credit Limit Banner */}
          {liveScoringResult && (
            <div className="p-3 bg-peach/40 border border-orange-200 rounded-xl flex items-center justify-between text-xs mb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Customer Approved Credit Limit
                </span>
                <span className="font-mono font-black text-sm text-orange-600">
                  {formatKz(liveScoringResult.limitKz)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Score: {liveScoringResult.score} ({liveScoringResult.scoreBand.label})
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Monthly Income
                </span>
                <span className="font-mono font-bold text-xs text-ink">
                  {formatKz(incomeEstimateKz)} / mo
                </span>
                <span className="text-[10px] text-green-700 font-bold block">
                  30% Cap: {formatKz(Math.round(incomeEstimateKz * 0.3))} / mo
                </span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAddCustomEquipment} className="space-y-3.5">
            {customEqError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>{customEqError}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-ink block mb-1">
                Equipment / Device Name & Model *
              </label>
              <input
                type="text"
                value={customEqName}
                onChange={(e) => {
                  setCustomEqName(e.target.value);
                  setCustomEqError('');
                }}
                placeholder="e.g., Tecno Spark 20 Pro (256GB), Solar Water Pump Kit..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-ink font-medium"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-ink block mb-1">
                  Device Category
                </label>
                <select
                  value={customEqCategory}
                  onChange={(e) => setCustomEqCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none bg-white text-ink font-medium"
                >
                  <option value="Smartphone">Smartphone</option>
                  <option value="Basic Phone">Basic Phone</option>
                  <option value="Solar Appliance">Solar Appliance</option>
                  <option value="Network Device">Network Device (MiFi/Router)</option>
                  <option value="Tablet / PC">Tablet / Laptop</option>
                  <option value="Home Appliance">Home Appliance</option>
                  <option value="Agricultural Kit">Agricultural / Productive Tool</option>
                  <option value="Other">Other Equipment</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-ink block mb-1">
                  Equipment Price (Kz) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Kz</span>
                  <input
                    type="text"
                    value={customEqPriceKz}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setCustomEqPriceKz(raw ? parseInt(raw, 10).toLocaleString('en-US') : '');
                      setCustomEqError('');
                    }}
                    placeholder="e.g. 45,000"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-ink"
                  />
                </div>
              </div>
            </div>

            {/* Quick Price Suggestion Chips */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-1">
                Quick Amounts:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  25000,
                  35000,
                  45000,
                  liveScoringResult ? liveScoringResult.limitKz : 50000,
                  75000,
                  100000,
                ]
                  .filter((v, idx, arr) => arr.indexOf(v) === idx)
                  .map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setCustomEqPriceKz(amount.toLocaleString('en-US'));
                        setCustomEqError('');
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-700 transition-colors"
                    >
                      {formatKz(amount)}
                    </button>
                  ))}
              </div>
            </div>

            {/* Live Affordability & Limit Check in Modal */}
            {parsedCustomPrice > 0 && liveScoringResult && (
              <div className="p-3 rounded-xl border space-y-2 bg-slate-50 border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Live Limit Check
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isCustomPriceWithinLimit
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isCustomPriceWithinLimit ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertOctagon className="w-3 h-3" />
                    )}
                    <span>
                      {isCustomPriceWithinLimit
                        ? 'Within Credit Limit'
                        : `Exceeds Limit by ${formatKz(parsedCustomPrice - liveScoringResult.limitKz)}`}
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center pt-1 border-t border-slate-200">
                  {[3, 6, 9, 12].map((term) => {
                    const emi = Math.round(parsedCustomPrice / term);
                    return (
                      <div key={term} className="p-1.5 bg-white rounded-lg border border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 block">{term} Mo</span>
                        <span className="text-[10px] font-black font-mono text-ink block">
                          {formatKz(emi)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[10px] text-slate-500 flex justify-between items-center pt-0.5">
                  <span>At 6-month term (recommended):</span>
                  <span className={`font-bold ${customSharePct > 30 ? 'text-amber-700' : 'text-green-700'}`}>
                    {customSharePct}% of income {customSharePct > 30 ? '(Over 30% cap)' : '(Affordable)'}
                  </span>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCustomEquipmentModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!customEqName.trim() || parsedCustomPrice <= 0}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add & Select Equipment</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* CONFIRMATION & EMAIL PREVIEW MODAL */}
      <Modal
        isOpen={showEmailPreviewModal && !!submittedApp}
        onClose={() => setShowEmailPreviewModal(false)}
        className="bg-white rounded-2xl max-w-xl md:max-w-2xl w-full p-6 sm:p-7 shadow-2xl border-2 border-orange/40 space-y-4 animate-in zoom-in-95 duration-150"
      >
        {submittedApp && (
          <div>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-heading text-ink">Application Submitted</h3>
                  <span className="text-[11px] font-mono text-slate-500">Ref: {submittedApp.id}</span>
                </div>
              </div>
              <button
                onClick={() => setShowEmailPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Auto-Written Summary (4 Lines) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-bold text-ink">{customer.fullName} ({customer.msisdn})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Segment & Score:</span>
                <span className="font-bold text-ink">
                  {resolvedSegment} • Score: {liveScoringResult?.score} ({liveScoringResult?.scoreBand.label})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Equipment:</span>
                <span className="font-bold text-ink">
                  {selectedEquipment.name} ({formatKz(selectedEquipment.price_kz)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Repayment Plan:</span>
                <span className="font-bold text-orange-600">
                  {formatKz(monthlyEmi)} / mo over {selectedTermMonths} months ({emiSharePct}% share)
                </span>
              </div>
            </div>

            {/* Email Preview Drawer */}
            <div className="border border-orange-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-orange-600 px-3 py-1.5 text-white font-bold flex items-center justify-between">
                <span>Transactional Email Dispatched</span>
                <span className="text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded">To: maria.mendes@unitel.ao</span>
              </div>
              <div className="p-3 bg-white space-y-2 text-slate-700">
                <p className="font-semibold text-ink">
                  Subject: New Loan Application Submitted ({submittedApp.id.slice(-6).toUpperCase()}) - {customer.fullName}
                </p>
                <p className="text-[11px] text-slate-500">
                  A new credit evaluation and equipment financing application has been submitted for {selectedEquipment.name} ({formatKz(selectedEquipment.price_kz)}).
                </p>
                <div className="p-2 bg-peach/40 rounded border border-orange-100 text-[11px] font-mono text-orange-950">
                  Score: {liveScoringResult?.score} • EMI: {formatKz(monthlyEmi)}/mo • Affordability: {emiSharePct}%
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowEmailPreviewModal(false);
                  navigate('/applicant/applications');
                }}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                Track my application
              </button>
              <button
                onClick={() => {
                  setShowEmailPreviewModal(false);
                  setCurrentStep(1);
                }}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-600 rounded-xl transition-all"
              >
                Start New
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
