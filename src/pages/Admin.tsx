import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FeatureFlags,
  SegmentWeight,
  ConfigVersion,
  BlockCode,
  SegmentCode,
} from '../types';
import {
  getStoredFeatureFlags,
  saveFeatureFlags,
  getStoredConfigVersions,
  getStoredWeights,
  saveNewConfigVersion,
  getStoredPointRules,
  savePointRules,
  resetPointRulesToDefault,
} from '../lib/config';
import {
  DEFAULT_SEGMENTS,
  DEFAULT_PARAMETERS,
} from '../data/seedData';
import {
  calculateCreditScore,
  PointRule,
  DEFAULT_POINT_RULES,
} from '../lib/scoring';
import {
  SEEDED_DEMO_CUSTOMERS,
  demoProfileToScoringInputs,
  DemoCustomerProfile,
} from '../lib/dataSources';
import { PageHeader } from '../components/PageHeader';
import { ScoreGauge } from '../components/ScoreGauge';
import { BlockTag } from '../components/BlockTag';
import { Modal } from '../components/Modal';
import { formatKz } from '../lib/money';
import {
  Sliders,
  Settings as SettingsIcon,
  Database,
  Table,
  CheckCircle2,
  AlertOctagon,
  Save,
  RotateCcw,
  Plus,
  Minus,
  ExternalLink,
  ArrowRight,
  Car,
  Home,
  Zap,
  Wallet,
  Landmark,
  X,
  Phone,
} from 'lucide-react';

export const Admin: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, currentUser, setRole, walletGlobalEnabled, setWalletGlobalEnabled } = useAuth();

  // Determine active tab based on pathname or internal state
  const getInitialTab = (): 'points' | 'weights' | 'sources' | 'settings' => {
    const path = location.pathname;
    if (path.includes('data-sources')) return 'sources';
    if (path.includes('settings')) return 'settings';
    if (path.includes('weights')) return 'weights';
    return 'points';
  };

  const [activeTab, setActiveTab] = useState<'points' | 'weights' | 'sources' | 'settings'>(getInitialTab);

  // Sync tab if URL changes
  useEffect(() => {
    if (location.pathname.includes('data-sources')) setActiveTab('sources');
    else if (location.pathname.includes('settings')) setActiveTab('settings');
    else if (location.pathname.includes('points-panel')) setActiveTab('points');
  }, [location.pathname]);

  // Config & Rules State
  const [pointRules, setPointRules] = useState<Record<string, PointRule[]>>(getStoredPointRules());
  const [weights, setWeights] = useState<SegmentWeight[]>(getStoredWeights());
  const [versions, setVersions] = useState<ConfigVersion[]>(getStoredConfigVersions());
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(getStoredFeatureFlags());

  // Points Panel State
  const [selectedBlock, setSelectedBlock] = useState<BlockCode>('T');
  const [selectedParamKey, setSelectedParamKey] = useState<string>('sim_tenure_months');
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string>('244923000101'); // Matthew Silva
  const [saveStatusMessage, setSaveStatusMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Segment Weights State
  const [newVersionLabel, setNewVersionLabel] = useState<string>('');
  const [weightsSaveStatus, setWeightsSaveStatus] = useState<{ success: boolean; text: string } | null>(null);

  // Data Sources State
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [newSourceName, setNewSourceName] = useState<string>('');
  const [newSourceType, setNewSourceType] = useState<string>('Fintech API');

  const baseBlocks: BlockCode[] = ['P', 'T', 'W', 'B', 'X'];
  const activeSegments = useMemo(() => DEFAULT_SEGMENTS.filter((s) => s.is_active), []);
  const activeVersion = versions.find((v) => v.is_active) || versions[0];

  // -------------------------------------------------------------
  // LIVE TEST CARD RECALCULATION
  // Recalculates live score, band, and block bars instantly on points or weights edit
  // -------------------------------------------------------------
  const selectedProfile: DemoCustomerProfile =
    SEEDED_DEMO_CUSTOMERS[selectedCustomerKey] || SEEDED_DEMO_CUSTOMERS['244923000101'];

  const scoringInputs = useMemo(() => {
    const base = demoProfileToScoringInputs(selectedProfile);
    return {
      ...base,
      walletAvailable: walletGlobalEnabled,
    };
  }, [selectedProfile, walletGlobalEnabled]);

  const liveResult = useMemo(() => {
    return calculateCreditScore(scoringInputs, weights, pointRules);
  }, [scoringInputs, weights, pointRules]);

  // Block definitions with token colors
  const blockDefinitions: Array<{
    code: BlockCode;
    name: string;
    description: string;
  }> = [
      { code: 'P', name: 'Identity & KYC', description: 'National ID, SIM match, activity tenure' },
      { code: 'T', name: 'Telecom Habits', description: 'Airtime regularity, spend stability, SIM tenure' },
      { code: 'W', name: 'Wallet & Money', description: 'Inflow turnover, merchant QR, bill pay (Optional)' },
      { code: 'B', name: 'Banking History', description: 'Account age, salary credits, cheque bounce' },
      { code: 'X', name: 'Alternative Data', description: 'Utility bills, tax standing (NIF), licenses' },
      { code: 'A', name: 'Assets & Income', description: 'House, land title, two-wheeler, car bonus' },
    ];

  // Parameters for the currently selected block
  const currentBlockParams = useMemo(() => {
    return DEFAULT_PARAMETERS.filter((p) => p.block_code === selectedBlock);
  }, [selectedBlock]);

  // When changing block, select its first parameter
  useEffect(() => {
    if (currentBlockParams.length > 0) {
      const exists = currentBlockParams.some((p) => p.key === selectedParamKey);
      if (!exists) {
        setSelectedParamKey(currentBlockParams[0].key);
      }
    }
  }, [selectedBlock, currentBlockParams, selectedParamKey]);

  // Rules for selected parameter
  const selectedParamRules = useMemo(() => {
    return pointRules[selectedParamKey] || DEFAULT_POINT_RULES[selectedParamKey] || [];
  }, [pointRules, selectedParamKey]);

  // Maximum possible points for selected parameter
  const selectedParamMaxPoints = useMemo(() => {
    const positive = selectedParamRules.filter((r) => r.points >= 0);
    return positive.length > 0 ? Math.max(...positive.map((r) => r.points)) : 10;
  }, [selectedParamRules]);

  // Total possible points in current block
  const currentBlockTotalPossible = useMemo(() => {
    return currentBlockParams.reduce((acc, param) => {
      const rules = pointRules[param.key] || DEFAULT_POINT_RULES[param.key] || [];
      const positive = rules.filter((r) => r.points >= 0);
      const maxPts = positive.length > 0 ? Math.max(...positive.map((r) => r.points)) : 10;
      return acc + maxPts;
    }, 0);
  }, [currentBlockParams, pointRules]);

  // -------------------------------------------------------------
  // HANDLERS FOR POINTS RULES EDITING
  // -------------------------------------------------------------
  const handleUpdateRulePoints = (paramKey: string, ruleIndex: number, delta: number) => {
    setPointRules((prev) => {
      const currentList = [...(prev[paramKey] || DEFAULT_POINT_RULES[paramKey] || [])];
      if (!currentList[ruleIndex]) return prev;

      const currentPts = currentList[ruleIndex].points;
      const nextPts = Math.max(0, Math.min(20, currentPts + delta));
      currentList[ruleIndex] = {
        ...currentList[ruleIndex],
        points: nextPts,
      };

      return {
        ...prev,
        [paramKey]: currentList,
      };
    });
  };

  const handleSetRulePoints = (paramKey: string, ruleIndex: number, newPoints: number) => {
    setPointRules((prev) => {
      const currentList = [...(prev[paramKey] || DEFAULT_POINT_RULES[paramKey] || [])];
      if (!currentList[ruleIndex]) return prev;

      const clamped = Math.max(0, Math.min(20, isNaN(newPoints) ? 0 : newPoints));
      currentList[ruleIndex] = {
        ...currentList[ruleIndex],
        points: clamped,
      };

      return {
        ...prev,
        [paramKey]: currentList,
      };
    });
  };

  const handleSavePointRules = () => {
    savePointRules(pointRules, currentUser?.full_name || 'Eng. Carlos Neto (Admin)');
    const vResult = saveNewConfigVersion(
      `v2.${versions.length} Custom Points`,
      weights,
      currentUser?.full_name || 'Eng. Carlos Neto (Admin)'
    );
    if (vResult.success) {
      setVersions(getStoredConfigVersions());
    }
    setSaveStatusMessage({
      success: true,
      text: 'Points table saved and applied to scoring engine.',
    });
    setTimeout(() => setSaveStatusMessage(null), 3500);
  };

  const handleResetPointRules = () => {
    if (window.confirm('Reset all point rules back to seed defaults?')) {
      const reset = resetPointRulesToDefault(currentUser?.full_name || 'Eng. Carlos Neto (Admin)');
      setPointRules(reset);
      setSaveStatusMessage({
        success: true,
        text: 'Point rules reset to factory defaults.',
      });
      setTimeout(() => setSaveStatusMessage(null), 3500);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR SEGMENT WEIGHTS (P+T+W+B+X = 94 INVARIANT)
  // -------------------------------------------------------------
  const getSegmentSum = (segCode: SegmentCode) => {
    return baseBlocks.reduce((acc, bCode) => {
      const entry = weights.find((w) => w.segment_code === segCode && w.block_code === bCode);
      return acc + (entry?.points || 0);
    }, 0);
  };

  const allActiveSegmentsValid = activeSegments.every((s) => getSegmentSum(s.code as SegmentCode) === 94);

  const handleWeightChange = (segCode: SegmentCode, bCode: BlockCode, newPoints: number) => {
    const clamped = Math.max(0, Math.min(94, isNaN(newPoints) ? 0 : newPoints));
    setWeights((prev) =>
      prev.map((w) => {
        if (w.segment_code === segCode && w.block_code === bCode) {
          return { ...w, points: clamped };
        }
        return w;
      })
    );
  };

  const handleSaveWeights = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allActiveSegmentsValid) {
      setWeightsSaveStatus({
        success: false,
        text: 'Save blocked: Each active segment must sum to exactly 94 points.',
      });
      return;
    }

    const result = saveNewConfigVersion(
      newVersionLabel || `v2.${versions.length} Weight Calibration`,
      weights,
      currentUser?.full_name || 'Eng. Carlos Neto (Admin)'
    );

    if (result.success) {
      setVersions(getStoredConfigVersions());
      setWeightsSaveStatus({
        success: true,
        text: `Config version ${result.versionId} published successfully with verified 94-pt invariant.`,
      });
      setNewVersionLabel('');
      setTimeout(() => setWeightsSaveStatus(null), 4000);
    } else {
      setWeightsSaveStatus({
        success: false,
        text: result.error || 'Failed to publish weights.',
      });
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR SETTINGS & DEMO PERSONA
  // -------------------------------------------------------------
  const handleToggleGlobalWallet = () => {
    const nextVal = !walletGlobalEnabled;
    setWalletGlobalEnabled(nextVal);
    const updatedFlags: FeatureFlags = {
      ...featureFlags,
      wallet_enabled: nextVal,
    };
    setFeatureFlags(updatedFlags);
    saveFeatureFlags(updatedFlags, currentUser?.full_name || 'Eng. Carlos Neto (Admin)');
  };

  // 6 Data Connectors
  const connectorCards = [
    {
      id: 'conn-unitel-tel',
      name: 'Unitel Telecom CDR',
      category: 'telecom',
      owner: 'Operator (Unitel)',
      status: 'Live (Real-time)',
      statusColor: 'emerald',
      recordsCount: 7,
      lastSync: 'Instant CDR Hook',
      icon: Phone,
      description: 'CDR top-up frequency, airtime credit repayment, and SIM tenure registry.',
    },
    {
      id: 'conn-unitel-money',
      name: 'Unitel Money Core',
      category: 'wallet',
      owner: 'Operator (Unitel)',
      status: 'Live (Real-time)',
      statusColor: 'emerald',
      recordsCount: 7,
      lastSync: 'Instant Wallet API',
      icon: Wallet,
      description: 'Mobile money turnover, merchant QR receipts, and wallet balance stability.',
    },
    {
      id: 'conn-bank-emis',
      name: 'Bank Gateway (EMIS)',
      category: 'bank',
      owner: 'Third Party (EMIS/MCX)',
      status: 'Demo Connected',
      statusColor: 'teal',
      recordsCount: 7,
      lastSync: '5 mins ago',
      icon: Landmark,
      description: 'Multicaixa ATM card frequency, formal salary deposits, and cheque records.',
    },
    {
      id: 'conn-dnvt-vehicle',
      name: 'Vehicle Registry (DNVT)',
      category: 'assets',
      owner: 'Third Party (DNVT)',
      status: 'Demo Connected',
      statusColor: 'teal',
      recordsCount: 7,
      lastSync: '12 mins ago',
      icon: Car,
      description: 'Vehicle ownership database (two-wheelers, passenger cars, utility trucks).',
    },
    {
      id: 'conn-land-registry',
      name: 'Land Title Registry',
      category: 'assets',
      owner: 'Third Party (Conservatória)',
      status: 'Demo Connected',
      statusColor: 'teal',
      recordsCount: 7,
      lastSync: '1 hour ago',
      icon: Home,
      description: 'Residential property deeds, municipal land concessions, and leasehold records.',
    },
    {
      id: 'conn-utilities',
      name: 'Utilities (ENDE / EPAL)',
      category: 'utility',
      owner: 'Third Party (Public)',
      status: 'Demo Connected',
      statusColor: 'teal',
      recordsCount: 7,
      lastSync: '4 hours ago',
      icon: Zap,
      description: 'Electricity (ENDE) and potable water (EPAL) recurring bill settlement logs.',
    },
  ];

  return (
    <div className="space-y-4 w-full min-w-0 pb-10">
      {/* Page Header (Few-words rule: title <= 4 words, helper <= 10 words) */}
      <PageHeader
        title="Credit Administration"
        helperText="Configure points, validate weights, and test live calculations."
        badgeText={`Active: ${activeVersion.label}`}
      />

      {/* Main Tab Navigation Bar */}
      <div className="bg-white rounded-xl p-1.5 shadow-sm border-2 border-orange flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('points');
              navigate('/approver/points-panel');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'points'
              ? 'bg-orange text-white shadow-sm'
              : 'text-slate-600 hover:text-ink hover:bg-cream'
              }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Points Panel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('weights')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'weights'
              ? 'bg-orange text-white shadow-sm'
              : 'text-slate-600 hover:text-ink hover:bg-cream'
              }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Segment Weights</span>
            {!allActiveSegmentsValid && (
              <span className="w-2 h-2 rounded-full bg-red animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('sources');
              navigate('/approver/data-sources');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'sources'
              ? 'bg-orange text-white shadow-sm'
              : 'text-slate-600 hover:text-ink hover:bg-cream'
              }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Data Sources</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cream text-orange font-mono">
              6
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('settings');
              navigate('/approver/settings');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'settings'
              ? 'bg-orange text-white shadow-sm'
              : 'text-slate-600 hover:text-ink hover:bg-cream'
              }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>

        {/* Global Wallet Quick Toggle Badge */}
        <div className="flex items-center gap-3 px-3 py-1 bg-cream/70 rounded-lg border border-peach/50 text-xs">
          <span className="text-slate-500 font-medium">Wallet Block (W):</span>
          <button
            type="button"
            onClick={handleToggleGlobalWallet}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${walletGlobalEnabled ? 'bg-orange' : 'bg-slate-300'
              }`}
            title="Toggle Wallet Module Globally"
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${walletGlobalEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
            />
          </button>
          <span
            className={`font-bold text-[11px] ${walletGlobalEnabled ? 'text-orange-btn' : 'text-slate-400'
              }`}
          >
            {walletGlobalEnabled ? 'ACTIVE' : 'OFF'}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: POINTS PANEL (3-COLUMN LAYOUT WITH LIVE TEST CARD)     */}
      {/* ============================================================== */}
      {activeTab === 'points' && (
        <div className="space-y-3">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border-2 border-orange shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink">Points Configuration</span>
              <span className="text-[11px] text-slate-500">
                &bull; Adjust parameter rules and watch the live test card recalculate immediately.
              </span>
            </div>

            <div className="flex items-center gap-2">
              {saveStatusMessage && (
                <div
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 ${saveStatusMessage.success ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
                    }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{saveStatusMessage.text}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleResetPointRules}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-cream text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Restore seed points table"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset to default</span>
              </button>

              <button
                type="button"
                onClick={handleSavePointRules}
                className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-4 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save point rules</span>
              </button>
            </div>
          </div>

          {/* 3-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            {/* COLUMN 1: 6 Blocks List (Col-span-3) */}
            <div className="lg:col-span-3 bg-white rounded-xl p-3 border-2 border-orange shadow-xs space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Scoring Blocks
              </div>

              <div className="space-y-1.5">
                {blockDefinitions.map((block) => {
                  const isSelected = selectedBlock === block.code;
                  const paramCount = DEFAULT_PARAMETERS.filter((p) => p.block_code === block.code).length;

                  return (
                    <button
                      key={block.code}
                      type="button"
                      onClick={() => setSelectedBlock(block.code)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all border ${isSelected
                        ? 'bg-cream border-orange shadow-xs'
                        : 'bg-white border-slate-100 hover:border-peach hover:bg-cream/40'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <BlockTag code={block.code} showName={false} />
                          <span className="font-bold text-xs text-ink truncate">{block.name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {paramCount} params
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{block.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="p-2.5 rounded-lg bg-cream/70 border border-peach/40 text-[11px] text-slate-600">
                <span className="font-bold text-ink">Max Block Points: </span>
                <span className="font-mono text-orange font-bold">{currentBlockTotalPossible} pts</span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Parameters without data are excluded from numerator and denominator.
                </p>
              </div>
            </div>

            {/* COLUMN 2: Parameters & Editable Rules (Col-span-5) */}
            <div className="lg:col-span-5 bg-white rounded-xl p-3 border-2 border-orange shadow-xs space-y-3">
              {/* Parameter Selection Tabs / Pills */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
                  <span>Parameters in Block {selectedBlock}</span>
                  <span className="text-orange font-mono">Max: {selectedParamMaxPoints} pts</span>
                </div>

                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-cream/30 rounded-lg border border-peach/30">
                  {currentBlockParams.map((param) => {
                    const isSelected = selectedParamKey === param.key;
                    return (
                      <button
                        key={param.key}
                        type="button"
                        onClick={() => setSelectedParamKey(param.key)}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all ${isSelected
                          ? 'bg-ink text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:text-ink hover:bg-cream border border-slate-200'
                          }`}
                      >
                        {param.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Parameter Details & Rules Table */}
              <div className="border border-peach/50 rounded-xl p-3 bg-cream/20 space-y-2">
                <div className="flex items-center justify-between border-b border-peach/40 pb-2">
                  <div>
                    <h3 className="text-xs font-extrabold text-ink">
                      {DEFAULT_PARAMETERS.find((p) => p.key === selectedParamKey)?.label || selectedParamKey}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Key: {selectedParamKey}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Parameter Cap</span>
                    <span className="text-xs font-mono font-black text-orange">+{selectedParamMaxPoints} pts</span>
                  </div>
                </div>

                {/* Rules List (Label + Points Stepper) */}
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {selectedParamRules.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No point options configured for this parameter.
                    </div>
                  ) : (
                    selectedParamRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 hover:border-orange/40 transition-colors gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-ink block truncate">{rule.label}</span>
                          {rule.option_key && (
                            <span className="text-[9px] font-mono text-slate-400">
                              match: {rule.option_key}
                            </span>
                          )}
                        </div>

                        {/* Point Stepper Control */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateRulePoints(selectedParamKey, idx, -1)}
                            disabled={rule.points <= 0}
                            className="w-6 h-6 rounded flex items-center justify-center bg-cream hover:bg-peach text-ink font-bold text-xs disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            title="Decrease point"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={rule.points}
                            onChange={(e) =>
                              handleSetRulePoints(selectedParamKey, idx, parseInt(e.target.value, 10))
                            }
                            className="w-10 h-6 text-center font-mono font-bold text-xs border border-slate-300 rounded focus:border-orange focus:ring-1 focus:ring-orange focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => handleUpdateRulePoints(selectedParamKey, idx, 1)}
                            disabled={rule.points >= 20}
                            className="w-6 h-6 rounded flex items-center justify-center bg-cream hover:bg-peach text-ink font-bold text-xs disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            title="Increase point"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 3: Live Test Card (Col-span-4) */}
            <div className="lg:col-span-4 bg-white rounded-xl p-3 border-2 border-orange/30 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-peach/40 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange animate-ping" />
                  <span className="text-xs font-extrabold text-ink uppercase tracking-wide">
                    Live Test Card
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">Recalculates Live</span>
              </div>

              {/* Customer Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  Select Demo Subscriber
                </label>
                <select
                  value={selectedCustomerKey}
                  onChange={(e) => setSelectedCustomerKey(e.target.value)}
                  className="w-full text-xs font-bold text-ink bg-cream/50 border border-peach rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange"
                >
                  <option value="244923000101">Matthew Silva (S3 Smartphone Wallet)</option>
                  <option value="244923000102">Tomas Neto (S1 Button Phone Cash)</option>
                  <option value="244923000103">Carlos Mateus (S5 Banked MCX ATM)</option>
                  <option value="244923000104">Pedro Santos (S7 Salaried Employee)</option>
                  <option value="244923000105">Isabel Fernandes (S8 Informal Trader)</option>
                  <option value="244923000106">Joaquim Baptista (S5 Low Balance Defaults)</option>
                  <option value="244923000107">Rosa Manuel (S3 Thin-File Starter)</option>
                </select>
              </div>

              {/* Selected Profile Facts */}
              <div className="p-2 rounded-lg bg-cream/40 border border-peach/30 text-[11px] space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-ink">{selectedProfile.name}</span>
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-orange/10 text-orange font-bold">
                    {selectedProfile.segment}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1">{selectedProfile.keyFacts}</p>
              </div>

              {/* Animated Live Score Gauge */}
              <div className="py-1 flex flex-col items-center justify-center">
                <ScoreGauge score={liveResult.score} size={135} />
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs font-bold text-ink">{liveResult.scoreBand.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cream border border-peach text-orange">
                    Coverage: {liveResult.dataCoverageLabel}
                  </span>
                </div>
              </div>

              {/* Calculated Limit Note */}
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">Credit Limit</span>
                  <span className="font-mono font-bold text-ink">
                    {formatKz(liveResult.limitKz)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[10px] block">Total Points</span>
                  <span className="font-mono font-bold text-orange">
                    {liveResult.totalPoints.toFixed(1)} / 100
                  </span>
                </div>
              </div>

              {/* Block Points Breakdown Horizontal Bars */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Block Points Earned</div>
                {Object.values(liveResult.blockScores)
                  .filter((b) => b.blockCode !== 'A')
                  .map((b) => {
                    const pct = b.effectivePoints > 0 ? (b.earnedPoints / b.effectivePoints) * 100 : 0;
                    return (
                      <div key={b.blockCode} className="space-y-0.5">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                          <span className="flex items-center gap-1">
                            <BlockTag code={b.blockCode} showName={false} />
                            <span>Block {b.blockCode}</span>
                          </span>
                          <span className="font-mono font-bold text-ink">
                            {b.earnedPoints.toFixed(1)} of {b.effectivePoints} pts
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SEGMENT WEIGHTS (P+T+W+B+X = 94 INVARIANT VALIDATOR)    */}
      {/* ============================================================== */}
      {activeTab === 'weights' && (
        <div className="bg-white rounded-xl p-4 border-2 border-orange shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-peach/30 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-ink">Segment Block Weights</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every active segment must sum to exactly 94 points ($P+T+W+B+X = 94$). Assets add up to 6 bonus points.
              </p>
            </div>

            {/* Validation Banner */}
            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 ${allActiveSegmentsValid
                ? 'bg-green/10 text-green border border-green/30'
                : 'bg-red/10 text-red border border-red/30 animate-pulse'
                }`}
            >
              {allActiveSegmentsValid ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Invariant Verified: All segments sum to 94 points</span>
                </>
              ) : (
                <>
                  <AlertOctagon className="w-4 h-4" />
                  <span>Validation Error: Save is blocked until all segments equal 94</span>
                </>
              )}
            </div>
          </div>

          {/* Form for Segment Weights Table */}
          <form onSubmit={handleSaveWeights} className="space-y-4">
            <div className="overflow-x-auto border border-peach/30 rounded-xl">
              <table className="w-full text-xs divide-y divide-slate-100">
                <thead className="bg-cream/60 text-ink font-bold">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Segment</th>
                    <th className="py-2.5 px-2 text-center">P (Identity)</th>
                    <th className="py-2.5 px-2 text-center">T (Telecom)</th>
                    <th className="py-2.5 px-2 text-center">W (Wallet)</th>
                    <th className="py-2.5 px-2 text-center">B (Bank)</th>
                    <th className="py-2.5 px-2 text-center">X (Alternative)</th>
                    <th className="py-2.5 px-3 text-center">Total Sum</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeSegments.map((segment) => {
                    const sCode = segment.code as SegmentCode;
                    const sum = getSegmentSum(sCode);
                    const isValid = sum === 94;

                    const getVal = (bCode: BlockCode) => {
                      const entry = weights.find(
                        (w) => w.segment_code === sCode && w.block_code === bCode
                      );
                      return entry ? entry.points : 0;
                    };

                    return (
                      <tr key={sCode} className="hover:bg-cream/20">
                        <td className="py-2.5 px-3 font-bold text-ink">
                          <div className="flex items-center gap-2">
                            <span className="font-mono px-1.5 py-0.5 rounded bg-cream border border-peach font-black text-orange">
                              {sCode}
                            </span>
                            <div>
                              <span className="block font-bold">{segment.name}</span>
                              <span className="text-[10px] text-slate-400 block line-clamp-1">
                                {segment.story}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* P input */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={94}
                            value={getVal('P')}
                            onChange={(e) => handleWeightChange(sCode, 'P', parseInt(e.target.value, 10))}
                            className="w-12 h-7 text-center font-mono font-bold text-xs border border-slate-300 rounded focus:border-orange focus:outline-none"
                          />
                        </td>

                        {/* T input */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={94}
                            value={getVal('T')}
                            onChange={(e) => handleWeightChange(sCode, 'T', parseInt(e.target.value, 10))}
                            className="w-12 h-7 text-center font-mono font-bold text-xs border border-slate-300 rounded focus:border-orange focus:outline-none"
                          />
                        </td>

                        {/* W input */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={94}
                            value={getVal('W')}
                            onChange={(e) => handleWeightChange(sCode, 'W', parseInt(e.target.value, 10))}
                            className="w-12 h-7 text-center font-mono font-bold text-xs border border-slate-300 rounded focus:border-orange focus:outline-none"
                          />
                        </td>

                        {/* B input */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={94}
                            value={getVal('B')}
                            onChange={(e) => handleWeightChange(sCode, 'B', parseInt(e.target.value, 10))}
                            className="w-12 h-7 text-center font-mono font-bold text-xs border border-slate-300 rounded focus:border-orange focus:outline-none"
                          />
                        </td>

                        {/* X input */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={94}
                            value={getVal('X')}
                            onChange={(e) => handleWeightChange(sCode, 'X', parseInt(e.target.value, 10))}
                            className="w-12 h-7 text-center font-mono font-bold text-xs border border-slate-300 rounded focus:border-orange focus:outline-none"
                          />
                        </td>

                        {/* Total Sum */}
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`font-mono font-extrabold text-xs px-2 py-0.5 rounded ${isValid
                              ? 'bg-green/10 text-green'
                              : 'bg-red/10 text-red font-black border border-red/30'
                              }`}
                          >
                            {sum} / 94
                          </span>
                        </td>

                        {/* Status Check */}
                        <td className="py-2 px-3 text-center">
                          {isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red">
                              <AlertOctagon className="w-3.5 h-3.5" />
                              <span>Invalid ({sum > 94 ? `+${sum - 94}` : sum - 94})</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Version Label & Submit Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Version description (e.g. v2.1 Telecom Focus)"
                  value={newVersionLabel}
                  onChange={(e) => setNewVersionLabel(e.target.value)}
                  className="input-base text-xs w-64"
                />
                <span className="text-[11px] text-slate-400">
                  New config published will be permanently audit logged.
                </span>
              </div>

              <div className="flex items-center gap-3">
                {weightsSaveStatus && (
                  <span
                    className={`text-xs font-bold ${weightsSaveStatus.success ? 'text-green' : 'text-red'
                      }`}
                  >
                    {weightsSaveStatus.text}
                  </span>
                )}

                <button
                  type="submit"
                  disabled={!allActiveSegmentsValid}
                  className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Publish Segment Weights</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: DATA SOURCES (6 CONNECTORS + REGISTRY RECORDS TABLE)     */}
      {/* ============================================================== */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          {/* Top Bar with Connect New Source Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border-2 border-orange shadow-xs">
            <div>
              <h2 className="text-xs font-extrabold text-ink uppercase tracking-wide">
                Simulated Data Sources Layer
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Real-time scoring layer connecting 6 live registries via subscriber MSISDN and National ID.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect new source</span>
            </button>
          </div>

          {/* 6 Connector Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {connectorCards.map((conn) => {
              const Icon = conn.icon;
              return (
                <div
                  key={conn.id}
                  className="bg-white rounded-xl p-3.5 border-2 border-orange shadow-xs hover:border-orange-btn transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-cream border border-peach flex items-center justify-center text-orange">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold text-ink leading-tight">{conn.name}</h3>
                        <span className="text-[10px] text-slate-400 font-medium">{conn.owner}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${conn.statusColor === 'emerald'
                        ? 'bg-green/10 text-green border border-green/20'
                        : 'bg-teal/10 text-teal border border-teal/20'
                        }`}
                    >
                      {conn.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                    {conn.description}
                  </p>

                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Records: {conn.recordsCount} seeded</span>
                    <span>Sync: {conn.lastSync}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Demo Records Explorer Table */}
          <div className="bg-white rounded-xl p-4 border-2 border-orange shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-peach/30 pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-ink">Stored Subscriber Profiles</h3>
                <span className="text-[11px] text-slate-400">
                  Sample data only. Tune with real operator data before commercial rollout.
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                  Demo Dataset Active
                </span>
              </div>
            </div>

            {/* Table of the 7 Demo Customers */}
            <div className="overflow-x-auto border border-peach/30 rounded-xl">
              <table className="w-full text-xs divide-y divide-slate-100">
                <thead className="bg-cream/60 text-ink font-bold">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Subscriber</th>
                    <th className="py-2.5 px-3 text-left">Mobile & ID</th>
                    <th className="py-2.5 px-2 text-center">Segment</th>
                    <th className="py-2.5 px-3 text-left">Key Data Facts</th>
                    <th className="py-2.5 px-2 text-center">Target Band</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(SEEDED_DEMO_CUSTOMERS).map(([key, cust]) => (
                    <tr key={key} className="hover:bg-cream/20">
                      <td className="py-2 px-3 font-bold text-ink">
                        <span>{cust.name}</span>
                        <span className="text-[10px] text-slate-400 block font-normal font-mono">
                          DOB: {cust.dob}
                        </span>
                      </td>

                      <td className="py-2 px-3 font-mono text-slate-600">
                        <span className="font-bold text-ink block">{cust.phone}</span>
                        <span className="text-[10px] text-slate-400">{cust.nationalId}</span>
                      </td>

                      <td className="py-2 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-cream text-orange border border-peach">
                          {cust.segment}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-[11px] text-slate-600 max-w-xs">
                        {cust.keyFacts}
                      </td>

                      <td className="py-2 px-2 text-center font-mono font-bold text-teal">
                        {cust.targetScore}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerKey(key);
                            setActiveTab('points');
                          }}
                          className="text-[11px] font-bold text-orange hover:underline inline-flex items-center gap-1"
                        >
                          <span>Test in Panel</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Connect New Source Modal (Coming Soon Panel) */}
          <Modal
            isOpen={isConnectModalOpen}
            onClose={() => setIsConnectModalOpen(false)}
            className="bg-white rounded-2xl max-w-xl w-full p-6 border-2 border-orange/40 shadow-xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-peach/30 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange/10 flex items-center justify-center text-orange">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-ink">Connect New Source</h3>
                  <p className="text-[10px] text-slate-500">Plug external registry into credit engine</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConnectModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-ink hover:bg-cream"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-ink block mb-1">Source / Registry Name</label>
                <input
                  type="text"
                  placeholder="e.g. Banco BAI Core Banking"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  className="input-base text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-ink block mb-1">Connector Category</label>
                <select
                  value={newSourceType}
                  onChange={(e) => setNewSourceType(e.target.value)}
                  className="input-base text-xs"
                >
                  <option value="Fintech API">Fintech / Payment Gateway</option>
                  <option value="Banking API">Commercial Banking API</option>
                  <option value="Tax Authority">AGT Tax Authority API</option>
                  <option value="Utility Provider">Utility Billing System</option>
                  <option value="Payroll Registry">Public Sector Payroll (SIGFE)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-cream border border-peach/50 text-[11px] text-slate-600 leading-relaxed">
                <span className="font-bold text-orange block mb-0.5">Integration Pipeline Notice:</span>
                External data sources connect via authenticated Edge Functions. Additional connectors
                can be registered with encrypted OAuth2 credentials in production rollout.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConnectModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-cream"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Connector request for "${newSourceName || 'New Source'}" recorded. Custom driver will be loaded in v2.2.`);
                  setIsConnectModalOpen(false);
                  setNewSourceName('');
                }}
                className="btn-primary text-xs py-1.5 px-4 shadow-sm"
              >
                Register Connector
              </button>
            </div>
          </Modal>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: SETTINGS (GLOBAL WALLET TOGGLE & DEMO PERSONA SWITCHER) */}
      {/* ============================================================== */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl p-5 border-2 border-orange shadow-xs space-y-6 max-w-4xl">
          <div>
            <h2 className="text-sm font-extrabold text-ink">System Configuration</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Global scoring switches, demo roles, and operational safety rules.
            </p>
          </div>

          {/* Section 1: Global Wallet Switch */}
          <div className="p-4 rounded-xl bg-cream/30 border border-peach/40 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5 max-w-lg">
              <span className="text-xs font-extrabold text-ink block">
                Global Wallet Module (`wallet_enabled`)
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                When turned off, the Wallet (W) block is skipped, question 4
                is bypassed, and wallet points score 0 (Skipped / Nil) without redistribution.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleGlobalWallet}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${walletGlobalEnabled ? 'bg-orange' : 'bg-slate-300'
                  }`}
                title="Toggle Global Wallet State"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${walletGlobalEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
              <span
                className={`font-mono font-bold text-xs ${walletGlobalEnabled ? 'text-orange-btn' : 'text-slate-400'
                  }`}
              >
                {walletGlobalEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
          </div>

          {/* Section 2: Demo Persona Switcher */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wide">
              Active Demo Persona Switcher
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Persona 1: Tomas Silva (Applicant) */}
              <button
                type="button"
                onClick={() => setRole('applicant')}
                className={`p-3 rounded-xl border text-left transition-all ${role === 'applicant'
                  ? 'border-orange bg-cream shadow-xs'
                  : 'border-slate-200 bg-white hover:border-peach hover:bg-cream/30'
                  }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-xs text-ink">Tomas Silva</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange/10 text-orange font-bold">
                    Applicant
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 block">Unitel Store Agent</span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Access: New Application, My Applications
                </span>
              </button>

              {/* Persona 2: Dra. Maria Mendes (Approver) */}
              <button
                type="button"
                onClick={() => setRole('approver')}
                className={`p-3 rounded-xl border text-left transition-all ${role === 'approver'
                  ? 'border-orange bg-cream shadow-xs'
                  : 'border-slate-200 bg-white hover:border-peach hover:bg-cream/30'
                  }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-xs text-ink">Dra. Maria Mendes</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal/10 text-teal font-bold">
                    Approver
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 block">Senior Credit Officer</span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Access: Dashboard, Applications Queue, Instant Check
                </span>
              </button>

              {/* Persona 3: Eng. Carlos Neto (Admin) */}
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-3 rounded-xl border text-left transition-all ${role === 'admin'
                  ? 'border-orange bg-cream shadow-xs'
                  : 'border-slate-200 bg-white hover:border-peach hover:bg-cream/30'
                  }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-xs text-ink">Eng. Carlos Neto</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold">
                    Admin
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 block">Chief Risk Architect</span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Access: Points Panel, Weights, Data Sources, Settings
                </span>
              </button>
            </div>
          </div>

          {/* Section 3: Audit Trail & Compliance */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-ink block">Compliance & Audit Integrity</span>
              <span className="text-[11px] text-slate-400">
                All configuration revisions, rule modifications, and credit decisions are cryptographically logged.
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/approver/audit-log')}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-cream font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Open Audit Ledger</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
