import React, { useState, useEffect } from 'react';
import { COPY } from '../copy/en';
import { useAuth } from '../context/AuthContext';
import {
  FeatureFlags,
  SegmentWeight,
  ConfigVersion,
  Equipment,
  BlockCode,
  SegmentCode,
} from '../types';
import {
  getStoredFeatureFlags,
  saveFeatureFlags,
  getStoredConfigVersions,
  getStoredWeights,
  saveNewConfigVersion,
  getStoredEquipment,
  saveEquipmentCatalog,
} from '../lib/config';
import {
  DEFAULT_SEGMENTS,
  DEFAULT_PARAMETERS,
  DEFAULT_SCORE_BANDS,
  DEFAULT_INCOME_BANDS,
  DEFAULT_OVERLAY_RULES,
} from '../data/seedData';
import { formatKz } from '../lib/money';
import {
  Settings,
  ShieldCheck,
  Sliders,
  Database,
  Plus,
  CheckCircle2,
  AlertOctagon,
  Save,
  DollarSign,
  Smartphone,
} from 'lucide-react';
import { BlockTag } from '../components/BlockTag';

export const Admin: React.FC = () => {
  const { role, currentUser, setRole, walletGlobalEnabled, setWalletGlobalEnabled } = useAuth();
  const [activeTab, setActiveTab] = useState<'flags' | 'weights' | 'parameters' | 'overlays' | 'limits' | 'equipment'>('weights');
  const isAuthorizedAdmin = role === 'admin';

  // Config State
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(getStoredFeatureFlags());
  const [weights, setWeights] = useState<SegmentWeight[]>(getStoredWeights());
  const [versions, setVersions] = useState<ConfigVersion[]>(getStoredConfigVersions());
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(getStoredEquipment());

  // Weight Editor State
  const [newVersionLabel, setNewVersionLabel] = useState<string>('');
  const [weightSaveStatus, setWeightSaveStatus] = useState<{ success: boolean; message: string } | null>(null);

  // New Equipment Item State
  const [newEqName, setNewEqName] = useState<string>('');
  const [newEqCategory, setNewEqCategory] = useState<string>('Smartphone');
  const [newEqPriceKz, setNewEqPriceKz] = useState<number>(50000);

  const baseBlocks: BlockCode[] = ['P', 'T', 'W', 'B', 'X'];

  useEffect(() => {
    setFeatureFlags(getStoredFeatureFlags());
    setWeights(getStoredWeights());
    setVersions(getStoredConfigVersions());
    setEquipmentList(getStoredEquipment());
  }, []);

  // Active config version
  const activeVersion = versions.find((v) => v.is_active) || versions[0];

  // Weight Invariant Checker: calculate sum per segment
  const getSegmentSum = (segCode: SegmentCode) => {
    return baseBlocks.reduce((acc, bCode) => {
      const entry = weights.find((w) => w.segment_code === segCode && w.block_code === bCode);
      return acc + (entry?.points || 0);
    }, 0);
  };

  const allSegmentsValid = DEFAULT_SEGMENTS.every((s) => getSegmentSum(s.code) === 94);

  // Handle weight point change
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

  // Save new weights version
  const handleSaveWeights = (e: React.FormEvent) => {
    e.preventDefault();
    const result = saveNewConfigVersion(newVersionLabel, weights);
    if (result.success) {
      setVersions(getStoredConfigVersions());
      setWeightSaveStatus({
        success: true,
        message: `Successfully published new config version ${result.versionId} with verified 94-point invariant!`,
      });
      setNewVersionLabel('');
      setTimeout(() => setWeightSaveStatus(null), 4000);
    } else {
      setWeightSaveStatus({
        success: false,
        message: result.error || 'Failed to publish weights.',
      });
    }
  };

  // Toggle Global Wallet
  const handleToggleGlobalWallet = () => {
    const nextVal = !walletGlobalEnabled;
    setWalletGlobalEnabled(nextVal);
    const updatedFlags: FeatureFlags = {
      ...featureFlags,
      wallet_enabled: nextVal,
    };
    setFeatureFlags(updatedFlags);
    saveFeatureFlags(updatedFlags);
  };

  // Save Feature Flags Form
  const handleSaveFlags = (e: React.FormEvent) => {
    e.preventDefault();
    saveFeatureFlags(featureFlags);
    alert('Feature flags saved successfully!');
  };

  // Add Equipment Item
  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEqName.trim() || newEqPriceKz <= 0) return;

    const newItem: Equipment = {
      id: `eq-${Date.now()}`,
      name: newEqName.trim(),
      category: newEqCategory,
      price_kz: newEqPriceKz,
      active: true,
    };

    const updated = [newItem, ...equipmentList];
    setEquipmentList(updated);
    saveEquipmentCatalog(updated);
    setNewEqName('');
    setNewEqPriceKz(50000);
  };

  const handleToggleEquipmentActive = (id: string) => {
    const updated = equipmentList.map((eq) =>
      eq.id === id ? { ...eq, active: !eq.active } : eq
    );
    setEquipmentList(updated);
    saveEquipmentCatalog(updated);
  };

  return (
    <div className="space-y-6 w-full min-w-0 pb-12">
      {/* Page Header & Active Version Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">{COPY.nav.admin}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            System administration: manage scoring weights, 94-point invariant validation, overlay policies, and feature flags.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#FAF8F5] border border-orange-border text-xs">
            <span className="text-slate-500 font-medium">Active Config: </span>
            <strong className="text-navy font-mono">{activeVersion.label} ({activeVersion.id})</strong>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-bold bg-navy text-white font-mono">
            {currentUser.full_name}
          </span>
        </div>
      </div>

      {/* Role Notice Banner if not Admin */}
      {!isAuthorizedAdmin && (
        <div className="p-4 rounded-xl bg-orange-soft border-2 border-orange-border text-navy flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-orange shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="text-orange">Viewing as {currentUser.full_name}: </strong>
              Publishing new scoring weight configurations, altering policy overlays, and editing the equipment catalog requires <strong>System Administrator privileges (Eng. Carlos Neto)</strong>.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRole('admin')}
            className="btn-primary text-xs py-1.5 px-3.5 shadow-xs"
          >
            Switch to Admin (Eng. Carlos Neto)
          </button>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex border-b border-slate-border gap-1 overflow-x-auto">
        {[
          { id: 'weights', label: 'Segment Weights (94 Pts)', icon: Sliders },
          { id: 'flags', label: 'Feature Flags', icon: Settings },
          { id: 'parameters', label: 'Parameters & Bands', icon: Database },
          { id: 'overlays', label: 'Overlay Rules', icon: ShieldCheck },
          { id: 'limits', label: 'Limit & Income Bands', icon: DollarSign },
          { id: 'equipment', label: 'Equipment Catalog', icon: Smartphone },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-orange text-orange bg-orange-soft/30 rounded-t-md'
                  : 'border-transparent text-slate-600 hover:bg-slate-50 rounded-t-md'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: SEGMENT WEIGHTS & 94 INVARIANT ================= */}
      {activeTab === 'weights' && (
        <div className="space-y-6">
          <div className="card-base p-6 border border-slate-border rounded-xl bg-white space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-navy">Segment Weights & 94 Base Point Validator</h2>
                <p className="text-xs text-slate-muted mt-0.5">
                  Adjust points per block. <strong>Constraint: The sum of P+T+W+B+X for every segment must equal exactly 94 points</strong> before publishing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                    allSegmentsValid
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {allSegmentsValid ? 'All 10 Segments Valid (94 Pts)' : 'Invariant Violation (Sum != 94)'}
                </span>
              </div>
            </div>

            {weightSaveStatus && (
              <div
                className={`p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  weightSaveStatus.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {weightSaveStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{weightSaveStatus.message}</span>
              </div>
            )}

            {/* Matrix Form */}
            <form onSubmit={handleSaveWeights} className="space-y-6">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="min-w-full divide-y divide-slate-border text-xs">
                  <thead className="bg-slate-50 text-navy font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-left">Segment</th>
                      {baseBlocks.map((b) => (
                        <th key={b} className="py-3 px-3 text-center">
                          <BlockTag code={b} showName={true} className="text-[10px] py-0.2" />
                        </th>
                      ))}
                      <th className="py-3 px-3 text-center bg-slate-100">Base Sum (Must = 94)</th>
                      <th className="py-3 px-3 text-center text-emerald-700 bg-emerald-50/50">Asset Bonus</th>
                      <th className="py-3 px-3 text-center bg-navy text-white">Max Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-border">
                    {DEFAULT_SEGMENTS.map((seg) => {
                      const sum = getSegmentSum(seg.code);
                      const isValidSum = sum === 94;

                      return (
                        <tr key={seg.code} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-6 h-6 rounded text-xs font-mono font-bold flex items-center justify-center text-white"
                                style={{ backgroundColor: seg.color }}
                              >
                                {seg.code}
                              </span>
                              <span className="font-bold text-navy">{seg.name.split(',')[0]}</span>
                            </div>
                          </td>

                          {/* Editable Block Points Inputs */}
                          {baseBlocks.map((b) => {
                            const entry = weights.find(
                              (w) => w.segment_code === seg.code && w.block_code === b
                            );
                            const val = entry?.points || 0;

                            return (
                              <td key={b} className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={94}
                                  value={val}
                                  onChange={(e) =>
                                    handleWeightChange(seg.code, b, parseInt(e.target.value, 10))
                                  }
                                  className="w-16 text-center py-1 rounded border border-slate-300 font-mono text-xs font-bold focus:ring-1 focus:ring-orange focus:border-orange"
                                />
                              </td>
                            );
                          })}

                          {/* Row Sum Invariant Validator */}
                          <td className="py-2 px-3 text-center whitespace-nowrap bg-slate-50">
                            <span
                              className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                                isValidSum
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800 ring-1 ring-red-400'
                              }`}
                            >
                              {sum} pts
                            </span>
                          </td>

                          <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/20">
                            +6 pts
                          </td>

                          <td className="py-2 px-3 text-center font-mono font-bold text-navy bg-slate-50">
                            100 pts
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Publish Controls */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                  <label className="text-xs font-bold text-navy whitespace-nowrap">
                    New Version Label:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. v1.1-postpaid-tuning"
                    value={newVersionLabel}
                    onChange={(e) => setNewVersionLabel(e.target.value)}
                    className="input-base text-xs font-mono max-w-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!allSegmentsValid}
                  className="btn-primary text-xs flex items-center gap-1.5 py-2.5 px-6 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>Publish &amp; Activate New Version</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= TAB 2: FEATURE FLAGS ================= */}
      {activeTab === 'flags' && (
        <div className="card-base p-6 border border-slate-border rounded-xl bg-white space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-navy">Global System Feature Flags</h2>
            <p className="text-xs text-slate-muted mt-0.5">
              Control global scoring behaviors, wallet module enablement, and credit limit thresholds.
            </p>
          </div>

          <form onSubmit={handleSaveFlags} className="space-y-4 max-w-2xl text-xs">
            {/* Global Wallet Toggle */}
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-purple-950 block text-sm">
                  Global Wallet Scoring (Block W)
                </span>
                <span className="text-purple-800 text-[11px] block mt-0.5">
                  When switched off: Block W is hidden, questions 6 and 7 are skipped, and W points dynamically redistribute to operational blocks.
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleGlobalWallet}
                className={`px-4 py-2 rounded-lg font-bold transition-all shadow-xs ${
                  walletGlobalEnabled
                    ? 'bg-purple-700 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {walletGlobalEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Max EMI Cap % */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-navy block">Maximum EMI Debt Service Cap (%)</span>
                <span className="text-slate-500 text-[11px]">Monthly EMI must not exceed this % of monthly income or spend proxy.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={10}
                  max={50}
                  value={featureFlags.emi_cap_pct}
                  onChange={(e) => setFeatureFlags({ ...featureFlags, emi_cap_pct: parseInt(e.target.value, 10) })}
                  className="input-base text-xs font-mono w-20 text-center"
                />
                <span className="font-bold text-navy">%</span>
              </div>
            </div>

            {/* Starter SIM Tenure Months */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-navy block">Starter SIM Tenure Threshold</span>
                <span className="text-slate-500 text-[11px]">SIM tenure below this threshold caps approved limit at Starter level (50,000 Kz).</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={featureFlags.starter_months}
                  onChange={(e) => setFeatureFlags({ ...featureFlags, starter_months: parseInt(e.target.value, 10) })}
                  className="input-base text-xs font-mono w-20 text-center"
                />
                <span className="text-slate-500">months</span>
              </div>
            </div>

            {/* SIM Swap Hold Days */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-navy block">SIM Swap Fraud Review Hold Window</span>
                <span className="text-slate-500 text-[11px]">Recent SIM card re-issuance within these days triggers manual hold for review.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={7}
                  max={90}
                  value={featureFlags.sim_swap_hold_days}
                  onChange={(e) => setFeatureFlags({ ...featureFlags, sim_swap_hold_days: parseInt(e.target.value, 10) })}
                  className="input-base text-xs font-mono w-20 text-center"
                />
                <span className="text-slate-500">days</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="btn-primary text-xs flex items-center gap-1.5 py-2 px-5"
              >
                <Save className="w-4 h-4" />
                <span>Save Feature Flags</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 3: PARAMETERS & BANDS ================= */}
      {activeTab === 'parameters' && (
        <div className="card-base p-6 border border-slate-border rounded-xl bg-white space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-navy">Scoring Parameter Registry</h2>
            <p className="text-xs text-slate-muted mt-0.5">
              Parameters mapped to scoring blocks with normalization bands (0.0 .. 1.0).
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="min-w-full divide-y divide-slate-border text-xs">
              <thead className="bg-slate-50 text-navy font-semibold">
                <tr>
                  <th className="py-3 px-4 text-left">Key</th>
                  <th className="py-3 px-3 text-left">Block</th>
                  <th className="py-3 px-4 text-left">Label</th>
                  <th className="py-3 px-3 text-center">Type</th>
                  <th className="py-3 px-3 text-center">Weight</th>
                  <th className="py-3 px-4 text-left">Help Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-border">
                {DEFAULT_PARAMETERS.map((p) => (
                  <tr key={p.key} className="hover:bg-slate-50/60">
                    <td className="py-2 px-4 font-mono font-bold text-navy">{p.key}</td>
                    <td className="py-2 px-3">
                      <BlockTag code={p.block_code} showName={false} className="text-[10px]" />
                    </td>
                    <td className="py-2 px-4 font-medium text-slate-800">{p.label}</td>
                    <td className="py-2 px-3 text-center font-mono uppercase text-slate-500">
                      {p.input}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                      {p.weight}
                    </td>
                    <td className="py-2 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {p.help || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: OVERLAY RULES ================= */}
      {activeTab === 'overlays' && (
        <div className="card-base p-6 border border-slate-border rounded-xl bg-white space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-navy">Policy Overlay Rules</h2>
            <p className="text-xs text-slate-muted mt-0.5">
              Hard stop conditions, starter capping, and fraud prevention holds.
            </p>
          </div>

          <div className="space-y-3">
            {DEFAULT_OVERLAY_RULES.map((rule) => {
              let actionBadge = 'bg-slate-100 text-slate-700';
              if (rule.action === 'stop') actionBadge = 'bg-red-100 text-red-800';
              if (rule.action === 'cap_starter') actionBadge = 'bg-amber-100 text-amber-800';
              if (rule.action === 'hold_review') actionBadge = 'bg-purple-100 text-purple-800';

              return (
                <div
                  key={rule.key}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono text-xs font-bold text-navy">{rule.key}</span>
                    <p className="text-xs text-slate-600">{rule.description}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${actionBadge}`}>
                    {rule.action}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 5: LIMITS & INCOME BANDS ================= */}
      {activeTab === 'limits' && (
        <div className="card-base p-6 border border-slate-border rounded-xl bg-white space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-navy">Baseline Limits & Income Bands</h2>
            <p className="text-xs text-slate-muted mt-0.5">
              Credit limit tiers and monthly income band mapping (national minimum wage 100,000 Kz).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score Bands */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-navy">Score Tiers</h3>
              <div className="space-y-2">
                {DEFAULT_SCORE_BANDS.map((sb) => (
                  <div
                    key={sb.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-bold text-navy">{sb.label}</span>
                      <span className="text-slate-400 font-mono block text-[11px]">
                        {sb.min_score} – {sb.max_score}
                      </span>
                    </div>
                    <span className="font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {sb.limit_level}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Income Bands */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-navy">Income Bands</h3>
              <div className="space-y-2">
                {DEFAULT_INCOME_BANDS.map((ib) => (
                  <div
                    key={ib.code}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-bold text-navy">Band {ib.code}: {ib.label}</span>
                      <span className="text-slate-400 font-mono block text-[11px]">
                        {ib.min_kz === 0 ? 'Below 50,000 Kz' : `${formatKz(ib.min_kz)} – ${formatKz(ib.max_kz)}`}
                      </span>
                    </div>
                    <span className="font-mono text-slate-600 text-[11px]">{ib.usd_note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: EQUIPMENT CATALOG ================= */}
      {activeTab === 'equipment' && (
        <div className="card-base p-6 border border-slate-border rounded-xl bg-white space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-navy">Equipment Catalog Management</h2>
              <p className="text-xs text-slate-muted mt-0.5">
                Devices financed under telecom credit scoring with retail prices in Kwanzas (Kz).
              </p>
            </div>
          </div>

          {/* Add Device Form */}
          <form onSubmit={handleAddEquipment} className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-navy">Device Name *</label>
              <input
                type="text"
                placeholder="e.g. Unitel Smart 4G"
                value={newEqName}
                onChange={(e) => setNewEqName(e.target.value)}
                className="input-base text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-navy">Category</label>
              <select
                value={newEqCategory}
                onChange={(e) => setNewEqCategory(e.target.value)}
                className="input-base text-xs"
              >
                <option value="Basic Phone">Basic Phone</option>
                <option value="Entry Smartphone">Entry Smartphone</option>
                <option value="Mid Smartphone">Mid Smartphone</option>
                <option value="High Smartphone">High Smartphone</option>
                <option value="Tablet">Tablet</option>
                <option value="Solar Appliance">Solar Appliance</option>
                <option value="Network Device">Network Device</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-navy">Price in Kwanzas (Kz) *</label>
              <input
                type="number"
                min={5000}
                step={1000}
                value={newEqPriceKz}
                onChange={(e) => setNewEqPriceKz(parseInt(e.target.value, 10))}
                className="input-base text-xs font-mono"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2.5 px-4 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Device</span>
            </button>
          </form>

          {/* Catalog List */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="min-w-full divide-y divide-slate-border text-xs">
              <thead className="bg-slate-50 text-navy font-semibold">
                <tr>
                  <th className="py-3 px-4 text-left">Device Name</th>
                  <th className="py-3 px-3 text-left">Category</th>
                  <th className="py-3 px-4 text-right">Price (Kz)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-border">
                {equipmentList.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-50/60">
                    <td className="py-2 px-4 font-bold text-navy">{eq.name}</td>
                    <td className="py-2 px-3 text-slate-600">{eq.category}</td>
                    <td className="py-2 px-4 text-right font-mono font-bold text-navy">
                      {formatKz(eq.price_kz)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          eq.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {eq.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleEquipmentActive(eq.id)}
                        className="text-xs text-orange font-semibold hover:underline"
                      >
                        Toggle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
