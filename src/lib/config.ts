import {
  FeatureFlags,
  SegmentWeight,
  ConfigVersion,
  Equipment,
} from '../types';
import {
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_WEIGHTS,
  DEFAULT_EQUIPMENT,
} from '../data/seedData';
import { PointRule, DEFAULT_POINT_RULES } from './scoring';
import { addAuditLogEntry } from './loans';

const STORAGE_KEY_FLAGS = 'unitel_credit_flags_v1';
const STORAGE_KEY_WEIGHTS = 'unitel_credit_weights_v1';
const STORAGE_KEY_VERSIONS = 'unitel_credit_versions_v1';
const STORAGE_KEY_EQUIPMENT = 'unitel_credit_equipment_v1';
const STORAGE_KEY_POINT_RULES = 'unitel_credit_point_rules_v2';

const memoryStore: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return memoryStore[key] ?? null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {}
  memoryStore[key] = value;
}

export function getStoredFeatureFlags(): FeatureFlags {
  try {
    const raw = safeGetItem(STORAGE_KEY_FLAGS);
    if (!raw) {
      safeSetItem(STORAGE_KEY_FLAGS, JSON.stringify(DEFAULT_FEATURE_FLAGS));
      return DEFAULT_FEATURE_FLAGS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_FEATURE_FLAGS;
  }
}

export function saveFeatureFlags(flags: FeatureFlags, actor: string = 'Eng. Carlos Neto (Admin)'): void {
  safeSetItem(STORAGE_KEY_FLAGS, JSON.stringify(flags));
  addAuditLogEntry({
    id: Date.now(),
    at: new Date().toISOString(),
    actor_name: actor,
    action: 'update_feature_flags',
    entity: 'feature_flags',
    entity_id: 'global',
    details: flags as Record<string, unknown>,
  });
}

export function getStoredConfigVersions(): ConfigVersion[] {
  try {
    const raw = safeGetItem(STORAGE_KEY_VERSIONS);
    if (!raw) {
      const init: ConfigVersion[] = [
        { id: 'v1.0-default', label: 'v1.0 (Initial Baseline)', is_active: true, created_at: new Date(Date.now() - 7 * 86400000).toISOString() },
      ];
      safeSetItem(STORAGE_KEY_VERSIONS, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw);
  } catch {
    return [{ id: 'v1.0-default', label: 'v1.0 (Initial Baseline)', is_active: true, created_at: new Date().toISOString() }];
  }
}

export function getStoredWeights(): SegmentWeight[] {
  try {
    const raw = safeGetItem(STORAGE_KEY_WEIGHTS);
    if (!raw) {
      safeSetItem(STORAGE_KEY_WEIGHTS, JSON.stringify(DEFAULT_WEIGHTS));
      return DEFAULT_WEIGHTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

export function validateSegmentWeights(weights: SegmentWeight[]): { isValid: boolean; invalidSegments: Array<{ segment: string; sum: number }> } {
  const segmentCodes = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'];
  const baseBlocks = ['P', 'T', 'W', 'B', 'X'];
  const invalidSegments: Array<{ segment: string; sum: number }> = [];

  for (const seg of segmentCodes) {
    const segWeights = weights.filter((w) => w.segment_code === seg && baseBlocks.includes(w.block_code));
    const sum = segWeights.reduce((acc, w) => acc + (w.points || 0), 0);
    if (sum !== 94) {
      invalidSegments.push({ segment: seg, sum });
    }
  }

  return {
    isValid: invalidSegments.length === 0,
    invalidSegments,
  };
}

export function saveNewConfigVersion(
  newLabel: string,
  newWeights: SegmentWeight[],
  actor: string = 'Eng. Carlos Neto (Admin)'
): { success: boolean; versionId: string; error?: string } {
  const validation = validateSegmentWeights(newWeights);
  if (!validation.isValid) {
    const details = validation.invalidSegments.map((s) => `${s.segment} (sum: ${s.sum})`).join(', ');
    return {
      success: false,
      versionId: '',
      error: `Validation failed: Every segment's P+T+W+B+X points must sum to exactly 94. Invalid: ${details}`,
    };
  }

  const newVersionId = `v${Date.now().toString().slice(-4)}`;
  const versions = getStoredConfigVersions();
  // Deactivate others
  versions.forEach((v) => (v.is_active = false));
  const newVersion: ConfigVersion = {
    id: newVersionId,
    label: newLabel || `v1.${versions.length}`,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  versions.unshift(newVersion);
  safeSetItem(STORAGE_KEY_VERSIONS, JSON.stringify(versions));

  // Save weights tagged with new version
  const updatedWeights = newWeights.map((w) => ({
    ...w,
    config_version_id: newVersionId,
  }));
  safeSetItem(STORAGE_KEY_WEIGHTS, JSON.stringify(updatedWeights));

  // Log in Audit Log
  addAuditLogEntry({
    id: Date.now(),
    at: new Date().toISOString(),
    actor_name: actor,
    action: 'publish_config_version',
    entity: 'config_versions',
    entity_id: newVersionId,
    details: {
      version_label: newVersion.label,
      segments_count: 10,
      invariant: 'P+T+W+B+X=94 (Verified)',
    },
  });

  return {
    success: true,
    versionId: newVersionId,
  };
}

export function getStoredEquipment(): Equipment[] {
  try {
    const raw = safeGetItem(STORAGE_KEY_EQUIPMENT);
    if (!raw) {
      safeSetItem(STORAGE_KEY_EQUIPMENT, JSON.stringify(DEFAULT_EQUIPMENT));
      return DEFAULT_EQUIPMENT;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_EQUIPMENT;
  } catch {
    return DEFAULT_EQUIPMENT;
  }
}

export function saveEquipmentCatalog(catalog: Equipment[], actor: string = 'Eng. Carlos Neto (Admin)'): void {
  safeSetItem(STORAGE_KEY_EQUIPMENT, JSON.stringify(catalog));
  addAuditLogEntry({
    id: Date.now(),
    at: new Date().toISOString(),
    actor_name: actor,
    action: 'update_equipment_catalog',
    entity: 'equipment',
    entity_id: 'catalog',
    details: { items_count: catalog.length },
  });
}

export function addCustomEquipment(
  item: { name: string; category?: string; price_kz: number },
  actor: string = 'Applicant (Custom Equipment)'
): Equipment {
  const current = getStoredEquipment();
  const newEquipment: Equipment = {
    id: `cust-eq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: item.name.trim(),
    category: item.category?.trim() || 'Custom Device',
    price_kz: Math.max(1, Math.round(item.price_kz)),
    active: true,
    is_custom: true,
  };
  const updated = [...current, newEquipment];
  saveEquipmentCatalog(updated, actor);
  return newEquipment;
}

export function deleteCustomEquipment(
  id: string,
  actor: string = 'Applicant (Delete Equipment)'
): Equipment[] {
  const current = getStoredEquipment();
  const updated = current.filter((eq) => eq.id !== id);
  saveEquipmentCatalog(updated, actor);
  return updated;
}

export function resetEquipmentCatalogToDefault(actor: string = 'Eng. Carlos Neto (Admin)'): Equipment[] {
  safeSetItem(STORAGE_KEY_EQUIPMENT, JSON.stringify(DEFAULT_EQUIPMENT));
  addAuditLogEntry({
    id: Date.now(),
    at: new Date().toISOString(),
    actor_name: actor,
    action: 'reset_equipment_catalog',
    entity: 'equipment',
    entity_id: 'catalog',
    details: { items_count: DEFAULT_EQUIPMENT.length },
  });
  return DEFAULT_EQUIPMENT;
}

export function getStoredPointRules(): Record<string, PointRule[]> {
  try {
    const raw = safeGetItem(STORAGE_KEY_POINT_RULES);
    if (!raw) {
      safeSetItem(STORAGE_KEY_POINT_RULES, JSON.stringify(DEFAULT_POINT_RULES));
      return DEFAULT_POINT_RULES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_POINT_RULES;
  }
}

export function savePointRules(
  rules: Record<string, PointRule[]>,
  actor: string = 'Eng. Carlos Neto (Admin)'
): void {
  safeSetItem(STORAGE_KEY_POINT_RULES, JSON.stringify(rules));
  addAuditLogEntry({
    id: Date.now(),
    at: new Date().toISOString(),
    actor_name: actor,
    action: 'update_point_rules',
    entity: 'point_rules',
    entity_id: 'v2',
    details: {
      params_count: Object.keys(rules).length,
      timestamp: new Date().toISOString(),
    },
  });
}

export function resetPointRulesToDefault(actor: string = 'Eng. Carlos Neto (Admin)'): Record<string, PointRule[]> {
  safeSetItem(STORAGE_KEY_POINT_RULES, JSON.stringify(DEFAULT_POINT_RULES));
  addAuditLogEntry({
    id: Date.now(),
    at: new Date().toISOString(),
    actor_name: actor,
    action: 'reset_point_rules',
    entity: 'point_rules',
    entity_id: 'default',
    details: { message: 'Reset to seed defaults' },
  });
  return DEFAULT_POINT_RULES;
}
