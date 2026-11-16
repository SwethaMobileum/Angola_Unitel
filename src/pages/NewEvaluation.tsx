import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SegmentCode,
  BlockCode,
  Customer,
  Evaluation,
} from '../types';
import {
  DEFAULT_SEGMENTS,
  DEFAULT_QUESTIONS,
  DEFAULT_PARAMETERS,
  DEFAULT_INCOME_BANDS,
  DEFAULT_SEGMENT_PARAMETERS,
  SAMPLE_CUSTOMERS,
} from '../data/seedData';
import { calculateCreditScore, ScoringResult } from '../lib/scoring';
import { formatKz } from '../lib/money';
import { saveEvaluation, getSavedDraft, saveDraft, clearDraft, EvaluationDraft } from '../lib/evaluations';
import { ScoreGauge } from '../components/ScoreGauge';
import { BlockBar } from '../components/BlockBar';
import { BlockTag } from '../components/BlockTag';
import { syncEvaluationToSupabase } from '../lib/supabaseSync';
import {
  UserCheck,
  GitBranch,
  LayoutGrid,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Save,
  Check,
  AlertOctagon,
  TrendingUp,
  DollarSign,
  Info,
  Building2,
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Phone,
  Mail,
} from 'lucide-react';

export const NewEvaluation: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Step (1 to 6)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Customer Details & Eligibility
  const [customer, setCustomer] = useState({
    fullName: '',
    email: 'bhargownarravula777@gmail.com',
    msisdn: '+244 9',
    nationalId: '',
    dateOfBirth: '1995-05-12',
    simActivationDate: '2026-08-15',
    idSimMatch: true,
  });

  // Step 1: Formal Banking & Residence Details (Optional for Informal Applicants)
  const [bankingDetails, setBankingDetails] = useState({
    province: 'Luanda',
    municipality: 'Belas',
    nif: '',
    employerType: 'informal',
    employerName: '',
    bankIban: '',
    circStatus: 'clear',
    emergencyContact: '',
  });
  const [showFormalBankFields, setShowFormalBankFields] = useState<boolean>(false);

  // Step 2: Segment Decision Tree Answers & Overrides
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, boolean>>({});
  const [resolvedSegment, setResolvedSegment] = useState<SegmentCode>('S1');
  const [isOverridden, setIsOverridden] = useState<boolean>(false);
  const [overrideSegment, setOverrideSegment] = useState<SegmentCode>('S1');
  const [overrideReason, setOverrideReason] = useState<string>('');

  // Step 3: Wallet Flag & Parameter Inputs
  const [walletAvailable, setWalletAvailable] = useState<boolean>(true);
  const [activeParamBlock, setActiveParamBlock] = useState<BlockCode>('P');
  const [parameterInputs, setParameterInputs] = useState<Record<string, any>>({});

  // Step 4: Assets Declaration
  const [assets, setAssets] = useState<{
    house: 'yes' | 'no' | 'skip';
    land_title: 'yes' | 'no' | 'skip';
    two_wheeler: 'yes' | 'no' | 'skip';
    car: 'yes' | 'no' | 'skip';
  }>({
    house: 'skip',
    land_title: 'skip',
    two_wheeler: 'skip',
    car: 'skip',
  });

  // Step 5: Income Band & Stated Income
  const [incomeBandCode, setIncomeBandCode] = useState<number>(2);
  const [statedIncomeKz, setStatedIncomeKz] = useState<number | undefined>(undefined);

  // Step 6: Computed Scoring Result
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Load draft on mount if available
  useEffect(() => {
    const draft = getSavedDraft();
    if (draft) {
      setCurrentStep(draft.step);
      setCustomer({
        fullName: draft.customer.fullName,
        email: draft.customer.email || 'bhargownarravula777@gmail.com',
        msisdn: draft.customer.msisdn,
        nationalId: draft.customer.nationalId,
        dateOfBirth: draft.customer.dateOfBirth,
        simActivationDate: draft.customer.simActivationDate,
        idSimMatch: draft.eligibility.isIdMatch,
      });
      setQuestionAnswers(draft.segment.questionAnswers || {});
      setResolvedSegment(draft.segment.resolvedCode || 'S1');
      setIsOverridden(draft.segment.isOverridden || false);
      if (draft.segment.overrideCode) setOverrideSegment(draft.segment.overrideCode);
      if (draft.segment.overrideReason) setOverrideReason(draft.segment.overrideReason);
      setWalletAvailable(draft.walletAvailable ?? true);
      setParameterInputs(draft.parameterInputs || {});
      if (draft.assets) setAssets(draft.assets as any);
      if (draft.incomeBandCode) setIncomeBandCode(draft.incomeBandCode);
      if (draft.statedIncomeKz) setStatedIncomeKz(draft.statedIncomeKz);
    }
  }, []);

  // Calculate age and SIM tenure
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

  // Resolve segment whenever question answers or wallet flag changes
  useEffect(() => {
    const activeQuestions = DEFAULT_QUESTIONS.filter(
      (q) => walletAvailable || !q.requires_wallet
    );

    let winner: SegmentCode | null = null;
    for (const q of activeQuestions) {
      if (questionAnswers[q.id] === true) {
        winner = q.yes_segment;
        break;
      }
    }

    if (!winner) {
      // Check if all non-skipped answered NO
      const allNo = activeQuestions.every((q) => questionAnswers[q.id] === false);
      if (allNo) winner = 'S1';
    }

    if (winner) {
      setResolvedSegment(winner);
      if (!isOverridden) {
        setOverrideSegment(winner);
      }
    }
  }, [questionAnswers, walletAvailable, isOverridden]);

  // Effective segment used for scoring
  const effectiveSegment = isOverridden ? overrideSegment : resolvedSegment;

  // Autosave draft on meaningful updates
  useEffect(() => {
    if (customer.fullName || currentStep > 1) {
      const draft: EvaluationDraft = {
        step: currentStep,
        customer: {
          fullName: customer.fullName,
          msisdn: customer.msisdn,
          nationalId: customer.nationalId,
          dateOfBirth: customer.dateOfBirth,
          simActivationDate: customer.simActivationDate,
        },
        eligibility: {
          isAgeValid: !isUnderAge,
          isIdMatch: !isIdMismatch,
          age: applicantAge,
          simTenureMonths,
        },
        segment: {
          resolvedCode: resolvedSegment,
          isOverridden,
          overrideCode: isOverridden ? overrideSegment : undefined,
          overrideReason: isOverridden ? overrideReason : undefined,
          questionAnswers,
        },
        walletAvailable,
        parameterInputs,
        assets,
        incomeBandCode,
        statedIncomeKz,
        updatedAt: new Date().toISOString(),
      };
      saveDraft(draft);
    }
  }, [
    currentStep,
    customer,
    applicantAge,
    simTenureMonths,
    isUnderAge,
    isIdMismatch,
    resolvedSegment,
    isOverridden,
    overrideSegment,
    overrideReason,
    questionAnswers,
    walletAvailable,
    parameterInputs,
    assets,
    incomeBandCode,
    statedIncomeKz,
  ]);

  // Recalculate score on step 6 or parameter change
  const computeScore = () => {
    const inputs = {
      segmentCode: effectiveSegment,
      walletAvailable,
      parameterInputs: {
        ...parameterInputs,
        id_sim_match: customer.idSimMatch,
        sim_tenure_months: simTenureMonths,
      },
      assets,
      incomeBandCode,
      statedIncomeKz,
      customerMeta: {
        dateOfBirth: customer.dateOfBirth,
        simActivationDate: customer.simActivationDate,
        simTenureMonths,
        idSimMatch: customer.idSimMatch,
      },
    };

    const res = calculateCreditScore(inputs);
    setScoringResult(res);
    return res;
  };

  useEffect(() => {
    if (currentStep === 6 || currentStep === 3) {
      computeScore();
    }
  }, [
    currentStep,
    effectiveSegment,
    walletAvailable,
    parameterInputs,
    assets,
    incomeBandCode,
    statedIncomeKz,
    customer.idSimMatch,
    simTenureMonths,
  ]);

  // Quick prefill persona
  const handleLoadPersona = (personaIndex: number) => {
    const sample = SAMPLE_CUSTOMERS[personaIndex];
    if (!sample) return;

    if (personaIndex === 0) {
      // S1 João
      setCustomer({
        fullName: sample.full_name,
        email: sample.email || 'bhargownarravula777@gmail.com',
        msisdn: sample.msisdn,
        nationalId: '005829142LA41',
        dateOfBirth: sample.date_of_birth,
        simActivationDate: sample.sim_activation_date,
        idSimMatch: true,
      });
      setBankingDetails({
        province: 'Luanda',
        municipality: 'Cacuaco',
        nif: '',
        employerType: 'informal',
        employerName: 'Mercadinho Informal / Comércio de Rua',
        bankIban: '',
        circStatus: 'clear',
        emergencyContact: 'Ana Baptista (Irmã) - +244 923 112 334',
      });
      setShowFormalBankFields(false);
      // All NO
      const allNo: Record<number, boolean> = {};
      DEFAULT_QUESTIONS.forEach((q) => {
        allNo[q.id] = false;
      });
      setQuestionAnswers(allNo);
      setResolvedSegment('S1');
      setWalletAvailable(false);
      setParameterInputs({
        id_sim_match: true,
        age_band: '36-55',
        region: 'rural',
        sim_tenure_months: 30,
        topup_regularity_months: 11,
        topup_avg_amount_kz: 2500,
        arpu_stability: true,
        usage_consistency: 6,
        airtime_loan_repayment: 100,
        device_type: 'button_phone',
      });
      setAssets({ house: 'yes', land_title: 'no', two_wheeler: 'no', car: 'no' });
      setIncomeBandCode(2);
    } else if (personaIndex === 1) {
      // S3 Esperança
      setCustomer({
        fullName: sample.full_name,
        email: sample.email || 'bhargownarravula777@gmail.com',
        msisdn: sample.msisdn,
        nationalId: '008921472BA09',
        dateOfBirth: sample.date_of_birth,
        simActivationDate: sample.sim_activation_date,
        idSimMatch: true,
      });
      setBankingDetails({
        province: 'Luanda',
        municipality: 'Cazenga',
        nif: '5409128312',
        employerType: 'informal',
        employerName: 'Zungueira / Comércio a Retalho no Mercado',
        bankIban: '',
        circStatus: 'clear',
        emergencyContact: 'Mateus Domingos (Esposo) - +244 924 556 778',
      });
      setShowFormalBankFields(true);
      setQuestionAnswers({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: true });
      setResolvedSegment('S3');
      setWalletAvailable(true);
      setParameterInputs({
        id_sim_match: true,
        age_band: '25-35',
        region: 'luanda_urban',
        employment_type: 'informal_business',
        sim_tenure_months: 20,
        topup_regularity_months: 10,
        arpu_stability: true,
        data_bundles_per_month: 4,
        usage_consistency: 5,
        wallet_level: 'kyc_verified',
        wallet_inflow_regularity: 'regular',
        p2p_per_month: 8,
        merchant_qr_receipts_kz: 80000,
        bill_airtime_payments: 5,
        wallet_balance_stability: 'stable',
        days_active_per_month: 22,
        wallet_loan_repayment: 'on_time',
      });
      setAssets({ house: 'no', land_title: 'no', two_wheeler: 'yes', car: 'no' });
      setIncomeBandCode(3);
    } else if (personaIndex === 2) {
      // S7 Dr. Paulo
      setCustomer({
        fullName: sample.full_name,
        email: sample.email || 'bhargownarravula777@gmail.com',
        msisdn: sample.msisdn,
        nationalId: '002194812UE92',
        dateOfBirth: sample.date_of_birth,
        simActivationDate: sample.sim_activation_date,
        idSimMatch: true,
      });
      setBankingDetails({
        province: 'Luanda',
        municipality: 'Talatona',
        nif: '5001294812',
        employerType: 'government',
        employerName: 'Ministério das Finanças (MINFIN)',
        bankIban: 'AO06 0040 0000 1234 5678 9012 3 (Banco BAI)',
        circStatus: 'clear',
        emergencyContact: 'Dra. Teresa Afonso (Cônjuge) - +244 928 990 011',
      });
      setShowFormalBankFields(true);
      setQuestionAnswers({ 1: false, 2: true });
      setResolvedSegment('S7');
      setWalletAvailable(true);
      setParameterInputs({
        id_sim_match: true,
        age_band: '36-55',
        employer_type: 'government',
        time_in_job_months: 84,
        sim_tenure_months: 60,
        topup_regularity_months: 12,
        arpu_stability: true,
        wallet_inflow_regularity: 'regular',
        regular_credits_months: 12,
        salary_amount_band: 'above_500k',
        existing_loan_deductions_kz: 0,
        avg_balance_kz: 450000,
        returned_payments_12m: 0,
        credit_register_flag: 'clear',
        nif_standing: 'active_good',
        inss_record: true,
      });
      setAssets({ house: 'yes', land_title: 'yes', two_wheeler: 'no', car: 'yes' });
      setIncomeBandCode(5);
      setStatedIncomeKz(750000);
    } else if (personaIndex === 3) {
      // Mateus Kiala (High Risk / Thin File / Starter Cap)
      setCustomer({
        fullName: sample.full_name,
        email: sample.email || 'bhargownarravula777@gmail.com',
        msisdn: sample.msisdn,
        nationalId: '009182374ME55',
        dateOfBirth: sample.date_of_birth,
        simActivationDate: sample.sim_activation_date,
        idSimMatch: true,
      });
      setBankingDetails({
        province: 'Luanda',
        municipality: 'Viana',
        nif: '',
        employerType: 'informal',
        employerName: 'Biscates Ocasionais (Trabalhador Informal)',
        bankIban: '',
        circStatus: 'unregistered',
        emergencyContact: 'Luísa Kiala (Mãe) - +244 923 999 888',
      });
      setShowFormalBankFields(false);
      // All NO
      const allNo: Record<number, boolean> = {};
      DEFAULT_QUESTIONS.forEach((q) => {
        allNo[q.id] = false;
      });
      setQuestionAnswers(allNo);
      setResolvedSegment('S1');
      setWalletAvailable(false);
      setParameterInputs({
        id_sim_match: true,
        age_band: '18-24',
        region: 'rural',
        sim_tenure_months: 2,
        topup_regularity_months: 1,
        topup_avg_amount_kz: 500,
        arpu_stability: false,
        usage_consistency: 1,
        airtime_loan_repayment: 20,
        device_type: 'button_phone',
      });
      setAssets({ house: 'no', land_title: 'no', two_wheeler: 'no', car: 'no' });
      setIncomeBandCode(1);
      setStatedIncomeKz(25000);
    }
  };

  const createEvaluationPayload = () => {
    const finalResult = computeScore();
    const newEvalId = `eval-${Date.now()}`;

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      full_name: customer.fullName || 'Anonymous Subscriber',
      email: customer.email || 'bhargownarravula777@gmail.com',
      msisdn: customer.msisdn,
      national_id_masked: customer.nationalId
        ? `*******${customer.nationalId.slice(-4)}`
        : '*******XX00',
      date_of_birth: customer.dateOfBirth,
      sim_activation_date: customer.simActivationDate,
    };

    const newEval: Evaluation = {
      id: newEvalId,
      customer_id: newCustomer.id,
      analyst_id: '00000000-0000-0000-0000-000000000001',
      segment_code: effectiveSegment,
      segment_overridden: isOverridden,
      override_reason: isOverridden ? overrideReason : undefined,
      config_version_id: 'v1.0-default',
      wallet_available: walletAvailable,
      income_band_code: incomeBandCode,
      income_source: statedIncomeKz ? 'stated' : 'estimated',
      status: 'scored',
      created_at: new Date().toISOString(),
      customer: newCustomer,
      results: {
        evaluation_id: newEvalId,
        block_points: {
          P: { rawPoints: finalResult.blockScores.P.basePoints, earnedPoints: finalResult.blockScores.P.earnedPoints, availableParams: finalResult.blockScores.P.availableParamsCount },
          T: { rawPoints: finalResult.blockScores.T.basePoints, earnedPoints: finalResult.blockScores.T.earnedPoints, availableParams: finalResult.blockScores.T.availableParamsCount },
          W: { rawPoints: finalResult.blockScores.W.basePoints, earnedPoints: finalResult.blockScores.W.earnedPoints, availableParams: finalResult.blockScores.W.availableParamsCount },
          B: { rawPoints: finalResult.blockScores.B.basePoints, earnedPoints: finalResult.blockScores.B.earnedPoints, availableParams: finalResult.blockScores.B.availableParamsCount },
          X: { rawPoints: finalResult.blockScores.X.basePoints, earnedPoints: finalResult.blockScores.X.earnedPoints, availableParams: finalResult.blockScores.X.availableParamsCount },
          A: { rawPoints: 0, earnedPoints: 0, availableParams: 0 },
        },
        asset_bonus: finalResult.assetBonus,
        total_points: finalResult.totalPoints,
        score: finalResult.score,
        band_label: finalResult.scoreBand.label,
        confidence: finalResult.dataConfidence,
        overlay_flags: finalResult.overlayFlags.map((f) => ({ ruleKey: f.ruleKey, action: f.action, note: f.note })),
        reasons: finalResult.positiveReasons,
        limit_kz: finalResult.limitKz,
        limit_cap_applied: finalResult.limitCapApplied,
        score_version: finalResult.scoreVersion,
        computed_at: finalResult.computedAt,
      },
    };

    return { newEval, newEvalId };
  };

  const handleSaveEvaluationRecord = () => {
    const { newEval } = createEvaluationPayload();
    saveEvaluation(newEval);
    syncEvaluationToSupabase(newEval);
    clearDraft();
    setSavedSuccess(true);
    setTimeout(() => {
      navigate('/evaluations');
    }, 1200);
  };

  const handleProceedToFinancing = () => {
    const { newEval, newEvalId } = createEvaluationPayload();
    saveEvaluation(newEval);
    syncEvaluationToSupabase(newEval);
    clearDraft();
    navigate(`/applications?evalId=${newEvalId}&openModal=true`);
  };

  const handleStartFresh = () => {
    clearDraft();
    setCurrentStep(1);
    setCustomer({
      fullName: '',
      email: 'bhargownarravula777@gmail.com',
      msisdn: '+244 9',
      nationalId: '',
      dateOfBirth: '1995-05-12',
      simActivationDate: '2026-08-15',
      idSimMatch: true,
    });
    setQuestionAnswers({});
    setResolvedSegment('S1');
    setIsOverridden(false);
    setParameterInputs({});
    setAssets({ house: 'skip', land_title: 'skip', two_wheeler: 'skip', car: 'skip' });
    setIncomeBandCode(2);
    setStatedIncomeKz(undefined);
    setScoringResult(null);
  };

  // Step 3 Parameters: get parameters assigned to effective segment
  const segmentParamKeys = DEFAULT_SEGMENT_PARAMETERS[effectiveSegment] || [];
  const segmentParameters = DEFAULT_PARAMETERS.filter((p) => segmentParamKeys.includes(p.key));
  const segmentBlockCodes = Array.from(new Set(segmentParameters.map((p) => p.block_code))) as BlockCode[];

  // Ensure activeParamBlock is among available blocks
  useEffect(() => {
    if (segmentBlockCodes.length > 0 && !segmentBlockCodes.includes(activeParamBlock)) {
      setActiveParamBlock(segmentBlockCodes[0]);
    }
  }, [segmentBlockCodes, activeParamBlock]);

  // Current segment metadata
  const currentSegmentMeta = DEFAULT_SEGMENTS.find((s) => s.code === effectiveSegment);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header with Title and Presets */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-navy">New Credit Evaluation</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-soft text-orange">
              Step {currentStep} of 6
            </span>
          </div>
          <p className="text-xs text-slate-muted mt-0.5">
            Evaluate subscriber eligibility, assign customer segment, collect proxy signals, and set credit limit.
          </p>
        </div>

        {/* Demo Persona Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-orange" />
            Quick Presets:
          </span>
          <button
            onClick={() => handleLoadPersona(0)}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:border-orange hover:text-orange shadow-xs"
          >
            João (S1)
          </button>
          <button
            onClick={() => handleLoadPersona(1)}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:border-orange hover:text-orange shadow-xs"
          >
            Esperança (S3)
          </button>
          <button
            onClick={() => handleLoadPersona(2)}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:border-orange hover:text-orange shadow-xs"
          >
            Dr. Paulo (S7)
          </button>
          <button
            onClick={() => handleLoadPersona(3)}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-rose-300 text-rose-700 hover:border-rose-500 hover:bg-rose-50 shadow-xs flex items-center gap-1.5"
            title="Load low-income, thin-file, high-risk subscriber profile"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Mateus (High Risk S1)
          </button>
          <button
            onClick={handleStartFresh}
            className="p-1 rounded text-slate-400 hover:text-navy hover:bg-slate-100"
            title="Start fresh evaluation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 6-Step Progress Stepper Bar - Crisp, High-Contrast & Clickable */}
      <div className="card-base p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { step: 1, label: 'Customer', icon: UserCheck },
            { step: 2, label: 'Find Segment', icon: GitBranch },
            { step: 3, label: 'Parameters', icon: LayoutGrid },
            { step: 4, label: 'Assets', icon: ShieldCheck },
            { step: 5, label: 'Income Band', icon: DollarSign },
            { step: 6, label: 'Result & Limit', icon: TrendingUp },
          ].map((s) => {
            const Icon = s.icon;
            const isDone = currentStep > s.step;
            const isCurrent = currentStep === s.step;

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setCurrentStep(s.step)}
                className={`group flex items-center justify-between sm:flex-col sm:justify-center gap-1.5 py-2 px-2 rounded-lg border transition-all text-left sm:text-center cursor-pointer ${
                  isCurrent
                    ? 'bg-orange-50/90 border-2 border-orange shadow-xs'
                    : isDone
                    ? 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100/60 hover:border-emerald-300'
                    : 'bg-slate-50/80 border-slate-200 hover:bg-orange-50/40 hover:border-orange/60'
                }`}
              >
                <div className="flex items-center gap-2 sm:flex-col sm:gap-1 w-full">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors ${
                      isCurrent
                        ? 'bg-orange text-white ring-2 ring-orange/30'
                        : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border-2 border-slate-300 text-slate-700 group-hover:border-orange group-hover:text-orange'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                  </div>
                  <span
                    className={`text-xs leading-tight font-bold truncate max-w-full flex items-center gap-1 ${
                      isCurrent
                        ? 'text-orange font-extrabold'
                        : isDone
                        ? 'text-emerald-950'
                        : 'text-slate-800 group-hover:text-orange'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 hidden sm:inline shrink-0 ${isCurrent ? 'text-orange' : isDone ? 'text-emerald-600' : 'text-slate-500 group-hover:text-orange'}`} />
                    {s.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= STEP 1: CUSTOMER DETAILS & ELIGIBILITY ================= */}
      {currentStep === 1 && (
        <div className="card-warm p-6 bg-white space-y-6">
          <div className="border-b border-orange-border/70 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-orange" />
                Step 1: Customer Details & Eligibility Check
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Input subscriber identity data. Regulatory eligibility gates (Age 18+ and SIM-ID Registry Match) are verified in real time.
              </p>
            </div>
            <span className="badge-warm">
              Unitel Core KYC Verified
            </span>
          </div>

          {/* 7 Primary Telecom KYC Fields with Prominent Bordered Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="bg-[#FAF8F5] p-3.5 rounded-xl border-2 border-slate-200 hover:border-orange/70 focus-within:border-orange focus-within:ring-4 focus-within:ring-orange/15 transition-all space-y-1.5">
              <label className="text-xs font-bold text-navy flex items-center justify-between">
                <span>Full Name (Nome Completo) *</span>
                <span className="text-[10px] text-slate-400 font-normal">Official ID Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. João Manuel Baptista"
                value={customer.fullName}
                onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })}
                className="input-base text-sm font-semibold"
              />
              <span className="text-[11px] text-slate-500 block">
                Must match the applicant's official Bilhete de Identidade (BI).
              </span>
            </div>

            {/* Applicant & Notification Email Address */}
            <div className="bg-[#FAF8F5] p-3.5 rounded-xl border-2 border-slate-200 hover:border-orange/70 focus-within:border-orange focus-within:ring-4 focus-within:ring-orange/15 transition-all space-y-1.5">
              <label className="text-xs font-bold text-navy flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-orange" />
                  Applicant / Notification Email Address *
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  Instant Alerts Active
                </span>
              </label>
              <input
                type="email"
                placeholder="e.g. bhargownarravula777@gmail.com"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                className="input-base text-sm font-semibold"
              />
              <span className="text-[11px] text-slate-500 block">
                Loan submission confirmations, tracking alerts, and approval decisions are delivered here.
              </span>
            </div>

            {/* MSISDN */}
            <div className="bg-[#FAF8F5] p-3.5 rounded-xl border-2 border-slate-200 hover:border-orange/70 focus-within:border-orange focus-within:ring-4 focus-within:ring-orange/15 transition-all space-y-1.5">
              <label className="text-xs font-bold text-navy flex items-center justify-between">
                <span>Unitel Phone Number (MSISDN) *</span>
                <span className="text-[10px] text-orange font-bold uppercase font-mono">Unitel Network</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="+244 923 000 000"
                  value={customer.msisdn}
                  onChange={(e) => setCustomer({ ...customer, msisdn: e.target.value })}
                  className="input-base text-sm font-mono font-bold"
                />
              </div>
              <span className="text-[11px] text-slate-500 block">
                Active SIM number used to pull network CDR top-up regularity.
              </span>
            </div>

            {/* National ID */}
            <div className="bg-[#FAF8F5] p-3.5 rounded-xl border-2 border-slate-200 hover:border-orange/70 focus-within:border-orange focus-within:ring-4 focus-within:ring-orange/15 transition-all space-y-1.5">
              <label className="text-xs font-bold text-navy flex items-center justify-between">
                <span>National ID (Bilhete de Identidade - BI) *</span>
                <span className="text-[10px] text-slate-400 font-mono">Format: 00...LA..</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 005829142LA41"
                value={customer.nationalId}
                onChange={(e) => setCustomer({ ...customer, nationalId: e.target.value.toUpperCase() })}
                className="input-base text-sm font-mono font-bold uppercase"
              />
              <span className="text-[11px] text-slate-500 block">
                Masked securely in public lists (*LA41) compliant with data privacy.
              </span>
            </div>

            {/* Date of Birth & Age Gate */}
            <div className="bg-[#FAF8F5] p-3.5 rounded-xl border-2 border-slate-200 hover:border-orange/70 focus-within:border-orange focus-within:ring-4 focus-within:ring-orange/15 transition-all space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-navy">Date of Birth *</label>
                {applicantAge >= 18 ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {applicantAge} years (Age 18+ Passed)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3 text-red-600" />
                    {applicantAge} years (Under Legal Age)
                  </span>
                )}
              </div>
              <input
                type="date"
                value={customer.dateOfBirth}
                onChange={(e) => setCustomer({ ...customer, dateOfBirth: e.target.value })}
                className="input-base text-sm font-semibold"
              />
              <span className="text-[11px] text-slate-500 block">
                Applicants must be at least 18 years old to legally enter loan agreements.
              </span>
            </div>

            {/* SIM Activation Date & Tenure Gate */}
            <div className="bg-[#FAF8F5] p-3.5 rounded-xl border-2 border-slate-200 hover:border-orange/70 focus-within:border-orange focus-within:ring-4 focus-within:ring-orange/15 transition-all space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-navy">SIM Card Activation Date *</label>
                {simTenureMonths >= 6 ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {simTenureMonths}m tenure (Seasoned)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Info className="w-3 h-3 text-amber-600" />
                    {simTenureMonths}m tenure (Starter Cap &le;50k)
                  </span>
                )}
              </div>
              <input
                type="date"
                value={customer.simActivationDate}
                onChange={(e) => setCustomer({ ...customer, simActivationDate: e.target.value })}
                className="input-base text-sm font-semibold"
              />
              <span className="text-[11px] text-slate-500 block">
                SIMs active &ge; 6 months unlock standard and higher credit limits.
              </span>
            </div>

            {/* ID & SIM Match Gate */}
            <div className="bg-[#FAF8F5] p-3.5 rounded-xl border-2 border-slate-200 hover:border-orange/70 transition-all space-y-1.5">
              <label className="text-xs font-bold text-navy">ID & SIM Owner Registration Match *</label>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setCustomer({ ...customer, idSimMatch: true })}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold border-2 flex items-center justify-center gap-1.5 transition-all ${
                    customer.idSimMatch
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Full Match (Verified)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomer({ ...customer, idSimMatch: false })}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold border-2 flex items-center justify-center gap-1.5 transition-all ${
                    !customer.idSimMatch
                      ? 'bg-red-600 text-white border-red-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  Mismatch (Requires Review)
                </button>
              </div>
              <span className="text-[11px] text-slate-500 block">
                Compares applicant National ID against HLR subscriber registry.
              </span>
            </div>
          </div>

          {/* ================= OPTIONAL FORMAL BANKING & RESIDENCE DETAILS ================= */}
          <div className="border border-orange-border/80 rounded-xl overflow-hidden bg-[#FFFBF7]">
            <button
              type="button"
              onClick={() => setShowFormalBankFields(!showFormalBankFields)}
              className="w-full px-4 py-3 bg-[#FFF4EC] hover:bg-[#FFEBD9] flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-orange" />
                <div>
                  <span className="text-xs font-bold text-navy">
                    Formal Banking, Tax (NIF) & Residence Details
                  </span>
                  <span className="ml-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    (Traditional Bank Fields — Optional for Informal Applicants)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-orange">
                  {showFormalBankFields ? 'Hide Formal Fields' : 'Expand Details'}
                </span>
                {showFormalBankFields ? (
                  <ChevronUp className="w-4 h-4 text-orange" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-orange" />
                )}
              </div>
            </button>

            {/* Informational Callout regarding How Banks Process Loans */}
            <div className="p-4 border-t border-orange-border/50 text-xs text-slate-700 space-y-4">
              <div className="bg-white p-3 rounded-lg border border-orange-border/60 text-xs leading-relaxed text-slate-600 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-orange shrink-0 mt-0.5" />
                <div>
                  <strong className="text-navy">How Banks in Angola Process Loans: </strong>
                  Commercial banks (such as Banco BAI, BFA, Standard Bank) require stamped paystubs, formal employer declaration, tax NIF, bank statements with salary domiciliation, and Central de Risco (BNA CIRC) clearance.
                  Because over 70% of Angola is informal/unbanked, our Unitel scoring engine accepts these when present, but <strong>never penalizes unbanked applicants who leave them empty</strong>.
                </div>
              </div>

              {showFormalBankFields && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Province */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-navy flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-orange" />
                      Província (Province)
                    </label>
                    <select
                      value={bankingDetails.province}
                      onChange={(e) => setBankingDetails({ ...bankingDetails, province: e.target.value })}
                      className="input-base text-xs font-medium"
                    >
                      <option value="Luanda">Luanda</option>
                      <option value="Benguela">Benguela</option>
                      <option value="Huambo">Huambo</option>
                      <option value="Huíla">Huíla</option>
                      <option value="Cabinda">Cabinda</option>
                      <option value="Cuanza Sul">Cuanza Sul</option>
                      <option value="Cuanza Norte">Cuanza Norte</option>
                      <option value="Uíge">Uíge</option>
                      <option value="Zaire">Zaire</option>
                      <option value="Malanje">Malanje</option>
                      <option value="Lunda Norte">Lunda Norte</option>
                      <option value="Lunda Sul">Lunda Sul</option>
                      <option value="Moxico">Moxico</option>
                      <option value="Bié">Bié</option>
                      <option value="Namibe">Namibe</option>
                      <option value="Cunene">Cunene</option>
                      <option value="Cuando Cubango">Cuando Cubango</option>
                      <option value="Bengo">Bengo</option>
                    </select>
                  </div>

                  {/* Municipality */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-navy">Município (Municipality)</label>
                    <input
                      type="text"
                      placeholder="e.g. Belas, Cazenga, Talatona, Viana"
                      value={bankingDetails.municipality}
                      onChange={(e) => setBankingDetails({ ...bankingDetails, municipality: e.target.value })}
                      className="input-base text-xs font-medium"
                    />
                  </div>

                  {/* NIF */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-navy flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-orange" />
                      Tax Identification (NIF - Número de Identificação Fiscal)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5001294812 (Optional for informal)"
                      value={bankingDetails.nif}
                      onChange={(e) => setBankingDetails({ ...bankingDetails, nif: e.target.value })}
                      className="input-base text-xs font-mono font-medium"
                    />
                  </div>

                  {/* Employer / Activity */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-navy flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-orange" />
                      Employer or Trade Activity (Entidade Empregadora / Actividade)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MINFIN, Comércio a Retalho, Candongueiro, Zungueira"
                      value={bankingDetails.employerName}
                      onChange={(e) => setBankingDetails({ ...bankingDetails, employerName: e.target.value })}
                      className="input-base text-xs font-medium"
                    />
                  </div>

                  {/* Bank Account IBAN */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-navy flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-orange" />
                      Multicaixa Bank Account (IBAN - Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="AO06.0040.0000.1234.5678.9012.3 (e.g. Banco BAI/BFA)"
                      value={bankingDetails.bankIban}
                      onChange={(e) => setBankingDetails({ ...bankingDetails, bankIban: e.target.value })}
                      className="input-base text-xs font-mono font-medium"
                    />
                  </div>

                  {/* BNA Central de Risco (CIRC) */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-navy">
                      Central de Risco (BNA CIRC Registry)
                    </label>
                    <select
                      value={bankingDetails.circStatus}
                      onChange={(e) => setBankingDetails({ ...bankingDetails, circStatus: e.target.value })}
                      className="input-base text-xs font-medium"
                    >
                      <option value="clear">Clear / No Adverse Record (Sem Incidentes)</option>
                      <option value="active_performing">Active Performing Credit (Crédito Regular)</option>
                      <option value="unregistered">Unbanked / Not Registered in CIRC (Sem Histórico Bancário)</option>
                      <option value="restructured">Past Restructured Credit (Regularizado)</option>
                    </select>
                  </div>

                  {/* Emergency / Reference Contact */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-navy flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-orange" />
                      Family / Emergency Reference Contact (Contacto de Referência Familiar)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mateus Domingos (Esposo / Irmão) - +244 923 000 000"
                      value={bankingDetails.emergencyContact}
                      onChange={(e) => setBankingDetails({ ...bankingDetails, emergencyContact: e.target.value })}
                      className="input-base text-xs font-medium"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Gate Checks Warning Alerts */}
          {isUnderAge && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Hard Stop: Age Under 18 </span>
                <p className="mt-0.5">
                  The applicant is {applicantAge} years old. Angola credit financing regulations require applicants to be at least 18 years of age.
                </p>
              </div>
            </div>
          )}

          {isIdMismatch && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Hard Stop: ID & SIM Registry Mismatch </span>
                <p className="mt-0.5">
                  National ID does not match the registered SIM card subscriber name in the Unitel database. Manual in-branch KYC verification is required.
                </p>
              </div>
            </div>
          )}

          {simTenureMonths < 6 && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Starter Limit Policy: </span>
                <span>
                  SIM activation is under 6 months ({simTenureMonths}m). Initial credit limit will be capped at the Starter level (max 50,000 Kz).
                </span>
              </div>
            </div>
          )}

          {/* Stepper Navigation */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500 italic">
              Draft is automatically saved at every step.
            </span>
            <button
              onClick={() => setCurrentStep(2)}
              disabled={isUnderAge}
              className="btn-primary text-xs flex items-center gap-1.5 py-2 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Next: Find Segment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: FIND SEGMENT DECISION TREE ================= */}
      {currentStep === 2 && (
        <div className="card-base p-6 border border-slate-border rounded-xl bg-white space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-orange" />
                Step 2: Find the Customer Segment
              </h2>
              <p className="text-xs text-slate-muted mt-0.5">
                Priority order questions (1 to 9). The <strong>first YES wins</strong>. If all are NO, defaults to <strong>S1 (Button phone, cash-only)</strong>.
              </p>
            </div>

            {/* Wallet Toggle on Step 2 */}
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <span className="font-semibold text-slate-600">Wallet Available?</span>
              <button
                type="button"
                onClick={() => setWalletAvailable(!walletAvailable)}
                className={`px-2.5 py-0.5 rounded text-xs font-bold transition-colors ${
                  walletAvailable
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {walletAvailable ? 'Yes (Q6 & Q7 Active)' : 'No (Skip Q6 & Q7)'}
              </button>
            </div>
          </div>

          {/* Resulting Segment Callout Banner */}
          {currentSegmentMeta && (
            <div
              className="p-4 rounded-xl border-2 flex flex-wrap items-center justify-between gap-4 transition-all"
              style={{
                borderColor: currentSegmentMeta.color,
                backgroundColor: `${currentSegmentMeta.color}10`,
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-12 h-12 rounded-xl text-lg font-mono font-extrabold flex items-center justify-center text-white shadow-md"
                  style={{ backgroundColor: currentSegmentMeta.color }}
                >
                  {currentSegmentMeta.code}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Assigned Customer Segment
                    </span>
                    {isOverridden && (
                      <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                        Analyst Override
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-extrabold text-navy">{currentSegmentMeta.name}</h3>
                  <p className="text-xs text-slate-600 mt-0.5 max-w-xl">{currentSegmentMeta.story}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 block">Base Points Invariant</span>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  P+T+W+B+X = 94 pts
                </span>
              </div>
            </div>
          )}

          {/* 9 Priority Questions with Big YES / NO Buttons */}
          <div className="space-y-2.5">
            {DEFAULT_QUESTIONS.map((q) => {
              const isSkipped = !walletAvailable && q.requires_wallet;
              const isYes = questionAnswers[q.id] === true;
              const isNo = questionAnswers[q.id] === false;
              const targetSegment = DEFAULT_SEGMENTS.find((s) => s.code === q.yes_segment);

              return (
                <div
                  key={q.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                    isSkipped
                      ? 'bg-slate-50/60 border-slate-200 opacity-50'
                      : isYes
                      ? 'bg-emerald-50/50 border-emerald-400 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-0.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        Q{q.position}
                      </span>
                      {q.requires_wallet && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-100 text-purple-800">
                          Wallet Channel
                        </span>
                      )}
                      {isSkipped && (
                        <span className="text-[10px] font-semibold text-amber-700 italic">
                          (Skipped because wallet scoring is turned off)
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-semibold ${isSkipped ? 'line-through text-slate-400' : 'text-navy'}`}>
                      {q.text}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500 hidden sm:inline">
                      &rarr; If YES: <strong style={{ color: targetSegment?.color }}>{q.yes_segment}</strong>
                    </span>

                    {!isSkipped ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQuestionAnswers({ ...questionAnswers, [q.id]: true })}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            isYes
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          YES
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestionAnswers({ ...questionAnswers, [q.id]: false })}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            isNo
                              ? 'bg-slate-700 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          NO
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic font-mono px-3 py-1 bg-slate-100 rounded">
                        Skipped
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Analyst Override Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-navy">
                <input
                  type="checkbox"
                  checked={isOverridden}
                  onChange={(e) => setIsOverridden(e.target.checked)}
                  className="rounded text-orange focus:ring-orange"
                />
                <span>Override System Segment Assignment (Analyst Discretion)</span>
              </label>
              {isOverridden && (
                <span className="text-[11px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  Requires Justification Note
                </span>
              )}
            </div>

            {isOverridden && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Select Target Segment</label>
                  <select
                    value={overrideSegment}
                    onChange={(e) => setOverrideSegment(e.target.value as SegmentCode)}
                    className="input-base text-xs font-semibold"
                  >
                    {DEFAULT_SEGMENTS.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code}: {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Override Reason (Mandatory) *</label>
                  <input
                    type="text"
                    placeholder="e.g. Verified informal business receipts presented in branch"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="input-base text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stepper Navigation */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="btn-outline text-xs flex items-center gap-1.5 py-2 px-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Customer</span>
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              disabled={isOverridden && !overrideReason.trim()}
              className="btn-primary text-xs flex items-center gap-1.5 py-2 px-5 disabled:opacity-50"
            >
              <span>Next: Enter Parameters</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: DYNAMIC PARAMETERS ================= */}
      {currentStep === 3 && (
        <div className="card-base p-6 border border-slate-border rounded-xl bg-white space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-orange" />
                  Step 3: Segment Parameters ({effectiveSegment})
                </h2>
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold text-white font-mono"
                  style={{ backgroundColor: currentSegmentMeta?.color || '#1F3A5F' }}
                >
                  {effectiveSegment}
                </span>
              </div>
              <p className="text-xs text-slate-muted mt-0.5">
                Inputs can be left blank if not available (missing data is never penalized).
              </p>
            </div>

            {/* Live Data Confidence Badge & Wallet Toggle */}
            <div className="flex items-center gap-3">
              {scoringResult && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                  <span className="text-slate-500 font-semibold">Live Confidence:</span>
                  <span
                    className={`font-bold capitalize ${
                      scoringResult.dataConfidence === 'high'
                        ? 'text-emerald-700'
                        : scoringResult.dataConfidence === 'medium'
                        ? 'text-amber-700'
                        : 'text-red-700'
                    }`}
                  >
                    {scoringResult.dataConfidence}
                  </span>
                </div>
              )}

              {/* Wallet Availability Toggle */}
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[11px] font-semibold text-slate-600">Wallet Data?</span>
                <button
                  type="button"
                  onClick={() => setWalletAvailable(!walletAvailable)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    walletAvailable
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {walletAvailable ? 'Available' : 'Unavailable'}
                </button>
              </div>
            </div>
          </div>

          {/* Non-punitive Reassurance Banner */}
          <div className="p-3 rounded-lg bg-teal-50/70 border border-teal-200/80 flex items-start gap-2.5 text-xs text-teal-900">
            <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Non-Penalizing Evaluation Principle: </span>
              <span>
                Any omitted field is excluded from calculation. If an entire channel has no data, its base points are dynamically redistributed to your primary active blocks to preserve the 94-point baseline.
              </span>
            </div>
          </div>

          {/* Parameter Block Tabs */}
          <div className="flex border-b border-slate-border gap-1 overflow-x-auto">
            {segmentBlockCodes.map((code) => {
              if (code === 'W' && !walletAvailable) return null;
              const isActive = activeParamBlock === code;
              const blockDetail = scoringResult?.blockScores[code];

              return (
                <button
                  key={code}
                  onClick={() => setActiveParamBlock(code)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                    isActive
                      ? 'border-orange text-orange bg-orange-soft/30 rounded-t-md'
                      : 'border-transparent text-slate-600 hover:bg-slate-50 rounded-t-md'
                  }`}
                >
                  <BlockTag code={code} showName={true} className="text-[10px] py-0.2" />
                  {blockDetail && (
                    <span className="font-mono text-[10px] text-slate-500">
                      ({blockDetail.effectivePoints} pts)
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Parameters for the Active Block */}
          {(() => {
            const currentBlockParams = segmentParameters.filter((p) => p.block_code === activeParamBlock);

            return (
              <div className="space-y-4 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentBlockParams.map((param) => {
                    const val = parameterInputs[param.key];

                    return (
                      <div
                        key={param.key}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 hover:bg-white hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="text-xs font-bold text-navy block leading-tight">
                            {param.label}
                          </label>
                          <span className="text-[9px] font-mono text-slate-500 uppercase px-1.5 py-0.2 bg-white rounded border border-slate-200 shrink-0">
                            {param.input}
                          </span>
                        </div>

                        {param.help && (
                          <p className="text-[11px] text-slate-500 leading-normal">{param.help}</p>
                        )}

                        {/* Number Input */}
                        {param.input === 'number' && (
                          <div className="relative">
                            <input
                              type="number"
                              placeholder="Leave blank if not available"
                              value={val ?? ''}
                              onChange={(e) =>
                                setParameterInputs({
                                  ...parameterInputs,
                                  [param.key]: e.target.value === '' ? undefined : Number(e.target.value),
                                })
                              }
                              className="input-base text-xs font-mono pr-12"
                            />
                            {param.unit && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                                {param.unit}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Choice Input */}
                        {param.input === 'choice' && (
                          <select
                            value={val ?? ''}
                            onChange={(e) =>
                              setParameterInputs({
                                ...parameterInputs,
                                [param.key]: e.target.value === '' ? undefined : e.target.value,
                              })
                            }
                            className="input-base text-xs"
                          >
                            <option value="">Not available (Skip without penalty)</option>
                            {param.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Boolean Input */}
                        {param.input === 'boolean' && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setParameterInputs({ ...parameterInputs, [param.key]: true })}
                              className={`flex-1 py-1 px-2 rounded text-xs font-bold border transition-colors ${
                                val === true
                                  ? 'bg-emerald-600 text-white border-emerald-700'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setParameterInputs({ ...parameterInputs, [param.key]: false })}
                              className={`flex-1 py-1 px-2 rounded text-xs font-bold border transition-colors ${
                                val === false
                                  ? 'bg-slate-700 text-white border-slate-800'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              No
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const copy = { ...parameterInputs };
                                delete copy[param.key];
                                setParameterInputs(copy);
                              }}
                              className={`px-2 py-1 rounded text-xs font-medium text-slate-400 hover:text-slate-600 ${
                                val === undefined ? 'underline font-semibold' : ''
                              }`}
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Stepper Navigation */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="btn-outline text-xs flex items-center gap-1.5 py-2 px-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Segment</span>
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="btn-primary text-xs flex items-center gap-1.5 py-2 px-5"
            >
              <span>Next: Physical Assets</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: PHYSICAL ASSETS (OPTIONAL BONUS) ================= */}
      {currentStep === 4 && (
        <div className="card-base p-6 border border-slate-border rounded-xl bg-white space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Step 4: Physical Assets & Collateral Footprint (Optional Bonus)
              </h2>
              <p className="text-xs text-slate-muted mt-0.5">
                Verifiable physical assets add <strong>+1 to +6 bonus points</strong>. Answers "No" or "Skip" add 0 points and <strong>never reduce the score</strong>.
              </p>
            </div>

            <div className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono font-bold text-emerald-800">
              Active Bonus: +{scoringResult?.assetBonus || 0} / 6 pts
            </div>
          </div>

          {/* 4 Asset Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: 'house' as const,
                title: 'Owns Residential House (Habitação Própria)',
                bonus: '+2 points',
                angolaStat: '~73% of Angolan households own their dwelling',
                desc: 'Proof of home ownership or local communal residency confirmation.',
              },
              {
                key: 'land_title' as const,
                title: 'Official Land Title (Direito de Superfície)',
                bonus: '+1 point',
                angolaStat: '~28% of property in urban/peri-urban Angola holds formal title',
                desc: 'Formal municipal land concession or registered property title.',
              },
              {
                key: 'two_wheeler' as const,
                title: 'Owns Two-Wheeler / Motorbike',
                bonus: '+1 point',
                angolaStat: '~13% of households own a motorbike or delivery scooter',
                desc: 'Vehicle registration document or kupapata commercial ownership.',
              },
              {
                key: 'car' as const,
                title: 'Owns Automobile / Passenger Car',
                bonus: '+2 points',
                angolaStat: '~3-4% of Angolan population owns a passenger car',
                desc: 'National automobile registration (Livrete) in applicant\'s name.',
              },
            ].map((asset) => {
              const currentVal = assets[asset.key];

              return (
                <div
                  key={asset.key}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 hover:bg-white hover:border-slate-300 transition-all"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-navy leading-tight">{asset.title}</h4>
                      <span className="text-[11px] text-slate-500 block mt-0.5">{asset.desc}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-emerald-100 text-emerald-800 shrink-0">
                      {asset.bonus}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-slate-100/70 text-[11px] text-slate-600 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Angola Context: {asset.angolaStat}</span>
                  </div>

                  {/* 3-State Buttons: Yes / No / Skip */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAssets({ ...assets, [asset.key]: 'yes' })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        currentVal === 'yes'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50'
                      }`}
                    >
                      Yes ({asset.bonus})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssets({ ...assets, [asset.key]: 'no' })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        currentVal === 'no'
                          ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      No (+0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssets({ ...assets, [asset.key]: 'skip' })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        currentVal === 'skip'
                          ? 'bg-slate-200 text-slate-800 border-slate-400 shadow-xs'
                          : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Skip (+0)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stepper Navigation */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(3)}
              className="btn-outline text-xs flex items-center gap-1.5 py-2 px-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Parameters</span>
            </button>
            <button
              onClick={() => setCurrentStep(5)}
              className="btn-primary text-xs flex items-center gap-1.5 py-2 px-5"
            >
              <span>Next: Income Band</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 5: INCOME BAND & CAPACITY ================= */}
      {currentStep === 5 && (
        <div className="card-base p-6 border border-slate-border rounded-xl bg-white space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange" />
                Step 5: Monthly Income Band & Capacity
              </h2>
              <p className="text-xs text-slate-muted mt-0.5">
                Income band sets the credit limit ceiling and enforces the 30% monthly EMI affordability check.
              </p>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              National Min Wage: <strong className="text-navy">100,000 Kz</strong> (since Sept 2025)
            </div>
          </div>

          {/* 6 Income Band Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DEFAULT_INCOME_BANDS.map((band) => {
              const isSelected = incomeBandCode === band.code;

              return (
                <button
                  key={band.code}
                  type="button"
                  onClick={() => setIncomeBandCode(band.code)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-orange bg-orange-soft/30 shadow-sm ring-1 ring-orange'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-navy">Band {band.code}: {band.label}</span>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                        isSelected ? 'bg-orange text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {band.limit_cap_level}
                    </span>
                  </div>
                  <div className="text-sm font-extrabold font-mono text-navy">
                    {band.min_kz === 0 ? 'Below 50,000 Kz' : `${formatKz(band.min_kz)} - ${formatKz(band.max_kz)}`}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{band.usd_note}</p>
                </button>
              );
            })}
          </div>

          {/* Optional Stated Income Input */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="text-xs font-semibold text-navy block">
              Exact Stated Monthly Net Income (Optional Kz)
            </label>
            <div className="relative max-w-sm">
              <input
                type="number"
                placeholder="e.g. 150000"
                value={statedIncomeKz ?? ''}
                onChange={(e) =>
                  setStatedIncomeKz(e.target.value === '' ? undefined : Number(e.target.value))
                }
                className="input-base text-xs font-mono pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Kz
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              If left blank, the midpoint of Band {incomeBandCode} will be used for loan affordability calculations.
            </p>
          </div>

          {/* Stepper Navigation */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(4)}
              className="btn-outline text-xs flex items-center gap-1.5 py-2 px-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Assets</span>
            </button>
            <button
              onClick={() => {
                computeScore();
                setCurrentStep(6);
              }}
              className="btn-primary text-xs flex items-center gap-1.5 py-2 px-5"
            >
              <span>Calculate Score & Limit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 6: RESULT & CREDIT LIMIT ================= */}
      {currentStep === 6 && scoringResult && (
        <div className="space-y-6 animate-in fade-in">
          {/* Main Score Result Card */}
          <div className="card-base p-6 border border-slate-border rounded-xl bg-white space-y-6">
            <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold font-mono text-orange uppercase tracking-wider">
                  Evaluation Results
                </span>
                <h2 className="text-xl font-extrabold text-navy">
                  Credit Evaluation Summary: {customer.fullName || 'Subscriber'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded text-xs font-bold bg-navy text-white font-mono">
                  Segment: {effectiveSegment}
                </span>
                <span className="px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700 font-mono">
                  Ver: {scoringResult.scoreVersion}
                </span>
              </div>
            </div>

            {/* Non-Penalizing Core Reassurance Banner */}
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Missing data was NOT counted against the customer. Proxy points were dynamically redistributed to active operational channels.
              </span>
            </div>

            {/* Score Dial & Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Dial Gauge */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50/70 rounded-xl border border-slate-200">
                <ScoreGauge
                  score={scoringResult.score}
                  bandLabel={scoringResult.scoreBand.label}
                  size={210}
                />
              </div>

              {/* Points & Confidence Metrics */}
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Base Points Earned</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold font-mono text-navy">
                      {scoringResult.basePointsEarned}
                    </span>
                    <span className="text-xs text-slate-400">/ 94 base pts</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="text-xs font-bold text-emerald-700 uppercase">Asset Bonus</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold font-mono text-emerald-800">
                      +{scoringResult.assetBonus}
                    </span>
                    <span className="text-xs text-emerald-600">/ 6 bonus pts</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-navy/5 border border-navy/20 space-y-1">
                  <span className="text-xs font-bold text-navy uppercase">Total Points</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold font-mono text-navy">
                      {scoringResult.totalPoints}
                    </span>
                    <span className="text-xs text-slate-400">/ 100 max pts</span>
                  </div>
                </div>
              </div>

              {/* Credit Limit & Cap Card */}
              <div className="p-5 rounded-xl bg-orange-soft/40 border border-orange/40 flex flex-col justify-between h-full space-y-3">
                <div>
                  <span className="text-xs font-bold text-orange-dark uppercase tracking-wider block">
                    Calculated Credit Limit
                  </span>
                  <div className="text-2xl font-extrabold font-mono text-navy mt-1">
                    {formatKz(scoringResult.limitKz)}
                  </div>
                  <span className="text-[11px] text-slate-600 block mt-1 font-medium">
                    Governing Rule: {scoringResult.limitCapApplied}
                  </span>
                </div>

                <div className="pt-2 border-t border-orange/20 text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Score Tier Limit:</span>
                    <span className="font-mono font-semibold">{scoringResult.scoreBand.limit_level.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data Confidence:</span>
                    <span className="font-bold capitalize text-navy">{scoringResult.dataConfidence}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Block Points Stacked Bar */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xs font-semibold text-navy">
                <span>Earned Block Points Breakdown</span>
                <span className="font-mono text-slate-500">
                  Total Earned: {scoringResult.totalPoints} pts
                </span>
              </div>
              <BlockBar
                points={{
                  P: scoringResult.blockScores.P.earnedPoints,
                  T: scoringResult.blockScores.T.earnedPoints,
                  W: scoringResult.blockScores.W.earnedPoints,
                  B: scoringResult.blockScores.B.earnedPoints,
                  X: scoringResult.blockScores.X.earnedPoints,
                }}
                maxPoints={94}
                showLabels={true}
              />
            </div>

            {/* Dynamic Redistribution Notice if Triggered */}
            {scoringResult.redistributions.length > 0 && (
              <div className="p-3.5 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-purple-700" />
                  Dynamic Point Redistribution Logged:
                </span>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {scoringResult.redistributions.map((r, i) => (
                    <li key={i}>
                      Block <strong>{r.fromBlock}</strong> ({r.points} pts) &rarr; redistributed to Block{' '}
                      <strong>{r.toBlock}</strong>: {r.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Overlay Rule Flags if Triggered */}
            {scoringResult.overlayFlags.length > 0 && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-amber-700" />
                  Policy Overlay Rules Triggered:
                </span>
                <div className="space-y-1 text-[11px]">
                  {scoringResult.overlayFlags.map((flag, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span>&bull; {flag.note}</span>
                      <span className="px-2 py-0.2 rounded text-[9px] font-mono uppercase font-bold bg-amber-200 text-amber-900">
                        {flag.action}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plain English Reasons & Data Gaps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <h5 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Positive Credit Drivers
                </h5>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {scoringResult.positiveReasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">&check;</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <h5 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-slate-500" />
                  Observed Data Footprints & Gaps
                </h5>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {scoringResult.dataGaps.map((gap, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-slate-400">&bull;</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(5)}
                className="btn-outline text-xs flex items-center gap-1.5 py-2.5 px-4"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Modify Inputs</span>
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleSaveEvaluationRecord}
                  className="btn-outline text-xs flex items-center gap-1.5 py-2.5 px-4 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{savedSuccess ? 'Saved!' : 'Save Evaluation Only'}</span>
                </button>

                <button
                  onClick={handleProceedToFinancing}
                  className="btn-primary text-xs font-bold flex items-center gap-2 py-2.5 px-6 shadow-md"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Apply for Equipment Loan Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
