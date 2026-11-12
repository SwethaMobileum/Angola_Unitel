import { useState } from 'react';
import {
  DEFAULT_EMI_PLANS,
  DEFAULT_EQUIPMENT_CATALOG,
  DEFAULT_SCORING_CONFIG,
  cloneConfig,
  formatAoa,
} from '../scoring';
import type { EmiPlanConfig, EquipmentItem, ScoringConfig, VolumeTier } from '../scoring';

interface CatalogAndEmiAdminProps {
  config: ScoringConfig;
  catalog: EquipmentItem[];
  emiPlans: EmiPlanConfig[];
  onSaveCatalogAndEmi: (
    nextConfig: ScoringConfig,
    nextCatalog: EquipmentItem[],
    nextEmiPlans: EmiPlanConfig[]
  ) => void;
}

export function CatalogAndEmiAdmin({
  config,
  catalog,
  emiPlans,
  onSaveCatalogAndEmi,
}: CatalogAndEmiAdminProps) {
  const [draftConfig, setDraftConfig] = useState<ScoringConfig>(() => cloneConfig(config));
  const [draftCatalog, setDraftCatalog] = useState<EquipmentItem[]>(() =>
    structuredClone(catalog)
  );
  const [draftPlans, setDraftPlans] = useState<EmiPlanConfig[]>(() =>
    structuredClone(emiPlans)
  );
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<EquipmentItem['category']>('Phone');
  const [newItemPrice, setNewItemPrice] = useState(220_000);
  const [newItemTier, setNewItemTier] = useState<VolumeTier>('low');

  const handleSaveAll = () => {
    const nextCfg: ScoringConfig = {
      ...cloneConfig(draftConfig),
      version: config.version + 1,
      id: `v-${config.version + 1}`,
      updatedAt: new Date().toISOString(),
    };
    onSaveCatalogAndEmi(nextCfg, draftCatalog, draftPlans);
  };

  const handleReset = () => {
    const nextCfg = cloneConfig(DEFAULT_SCORING_CONFIG);
    nextCfg.version = config.version + 1;
    nextCfg.id = `v-${nextCfg.version}`;
    nextCfg.updatedAt = new Date().toISOString();
    const defCat = structuredClone(DEFAULT_EQUIPMENT_CATALOG);
    const defPlans = structuredClone(DEFAULT_EMI_PLANS);
    setDraftConfig(nextCfg);
    setDraftCatalog(defCat);
    setDraftPlans(defPlans);
    onSaveCatalogAndEmi(nextCfg, defCat, defPlans);
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    setDraftCatalog((prev) => [
      ...prev,
      {
        id: `eq-custom-${Date.now()}`,
        category: newItemCategory,
        item_name: newItemName.trim(),
        price_aoa: newItemPrice,
        min_tier: newItemTier,
        active: true,
        description: 'Admin-added demo catalog item',
      },
    ]);
    setNewItemName('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Catalog &amp; EMI Plans</h2>
          <p className="page-subtitle">
            Manage equipment items, volume-tier price ceilings, EMI terms/rates, and monthly
            affordability ratio.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            Reset Catalog &amp; EMI to Default
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSaveAll}>
            Save Catalog &amp; EMI Changes
          </button>
        </div>
      </div>

      {/* Price Ceilings & Affordability Cap */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Price Ceilings per Volume Level &amp; EMI Affordability</h3>
        </div>
        <div className="grid-3">
          <div>
            <label className="field-label">Low Volume Price Ceiling (AOA)</label>
            <input
              type="number"
              className="input"
              step={25_000}
              value={draftConfig.priceCeilingsAoa.low}
              onChange={(e) =>
                setDraftConfig((p) => ({
                  ...p,
                  priceCeilingsAoa: {
                    ...p.priceCeilingsAoa,
                    low: Number(e.target.value) || 0,
                  },
                }))
              }
            />
            <div className="field-helper">
              Current: {formatAoa(draftConfig.priceCeilingsAoa.low)}
            </div>
          </div>

          <div>
            <label className="field-label">High Volume Price Ceiling (AOA)</label>
            <input
              type="number"
              className="input"
              step={100_000}
              value={draftConfig.priceCeilingsAoa.high}
              onChange={(e) =>
                setDraftConfig((p) => ({
                  ...p,
                  priceCeilingsAoa: {
                    ...p.priceCeilingsAoa,
                    high: Number(e.target.value) || 0,
                  },
                }))
              }
            />
            <div className="field-helper">
              Current: {formatAoa(draftConfig.priceCeilingsAoa.high)}
            </div>
          </div>

          <div>
            <label className="field-label">Max Monthly EMI (% of Credit Limit)</label>
            <input
              type="number"
              className="input"
              step={1}
              min={1}
              max={50}
              value={Math.round(draftConfig.maxMonthlyEmiRatioOfLimit * 100)}
              onChange={(e) =>
                setDraftConfig((p) => ({
                  ...p,
                  maxMonthlyEmiRatioOfLimit: (Number(e.target.value) || 10) / 100,
                }))
              }
            />
            <div className="field-helper">
              Default 10% (e.g. 1,000,000 AOA limit = 100,000 AOA max monthly EMI)
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Catalog */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Equipment Catalog (Demo Prices)</h3>
        </div>
        <div className="table-wrap" style={{ marginBottom: 14 }}>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Item Name</th>
                <th>Demo Price (AOA)</th>
                <th>Minimum Tier</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {draftCatalog.map((item, idx) => (
                <tr key={item.id}>
                  <td>
                    <select
                      className="select"
                      value={item.category}
                      onChange={(e) =>
                        setDraftCatalog((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { ...x, category: e.target.value as EquipmentItem['category'] }
                              : x
                          )
                        )
                      }
                    >
                      <option value="Phone">Phone</option>
                      <option value="TV">TV</option>
                      <option value="Fridge">Fridge</option>
                      <option value="Car">Car</option>
                      <option value="Other">Other</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input"
                      value={item.item_name}
                      onChange={(e) =>
                        setDraftCatalog((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, item_name: e.target.value } : x))
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input"
                      step={10_000}
                      value={item.price_aoa}
                      onChange={(e) =>
                        setDraftCatalog((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, price_aoa: Number(e.target.value) || 0 } : x
                          )
                        )
                      }
                    />
                  </td>
                  <td>
                    <select
                      className="select"
                      value={item.min_tier}
                      onChange={(e) =>
                        setDraftCatalog((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, min_tier: e.target.value as VolumeTier } : x
                          )
                        )
                      }
                    >
                      <option value="low">Low Volume</option>
                      <option value="high">High Volume</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={(e) =>
                        setDraftCatalog((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, active: e.target.checked } : x))
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card-tinted">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Add Catalog Item</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              className="select"
              style={{ maxWidth: 130 }}
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value as EquipmentItem['category'])}
            >
              <option value="Phone">Phone</option>
              <option value="TV">TV</option>
              <option value="Fridge">Fridge</option>
              <option value="Car">Car</option>
              <option value="Other">Other</option>
            </select>
            <input
              type="text"
              className="input"
              style={{ maxWidth: 260 }}
              placeholder="Item name (Demo)..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
            />
            <input
              type="number"
              className="input"
              style={{ maxWidth: 150 }}
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(Number(e.target.value) || 0)}
            />
            <select
              className="select"
              style={{ maxWidth: 140 }}
              value={newItemTier}
              onChange={(e) => setNewItemTier(e.target.value as VolumeTier)}
            >
              <option value="low">Low Volume</option>
              <option value="high">High Volume</option>
            </select>
            <button type="button" className="btn btn-secondary" onClick={handleAddItem}>
              + Add Item
            </button>
          </div>
        </div>
      </div>

      {/* EMI Plans */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">EMI Plans by Volume Level</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Volume Tier</th>
                <th>Term (Months)</th>
                <th>Interest Rate (% APR)</th>
                <th>Min Down Payment (%)</th>
              </tr>
            </thead>
            <tbody>
              {draftPlans.map((plan, idx) => (
                <tr key={plan.id}>
                  <td>
                    <select
                      className="select"
                      value={plan.tier}
                      onChange={(e) =>
                        setDraftPlans((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, tier: e.target.value as VolumeTier } : p
                          )
                        )
                      }
                    >
                      <option value="low">Low Volume</option>
                      <option value="high">High Volume</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input"
                      min={1}
                      max={60}
                      value={plan.term_months}
                      onChange={(e) =>
                        setDraftPlans((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, term_months: Number(e.target.value) || 3 } : p
                          )
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input"
                      step={0.5}
                      min={0}
                      value={plan.interest_rate_pct}
                      onChange={(e) =>
                        setDraftPlans((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, interest_rate_pct: Number(e.target.value) || 0 } : p
                          )
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input"
                      step={1}
                      min={0}
                      max={80}
                      value={plan.min_down_payment_pct}
                      onChange={(e) =>
                        setDraftPlans((prev) =>
                          prev.map((p, i) =>
                            i === idx
                              ? { ...p, min_down_payment_pct: Number(e.target.value) || 0 }
                              : p
                          )
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
