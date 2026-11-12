import {
  DEFAULT_EMI_PLANS,
  DEFAULT_EQUIPMENT_CATALOG,
  DEFAULT_SCORING_CONFIG,
  calculateEmiPlan,
  evaluateCreditScore,
  evaluateLimitAndDecision,
} from '../scoring';
import type {
  ApplicationRecord,
  AuditLogEntry,
  Customer,
  CustomerProfile,
  EmiPlanConfig,
  EquipmentItem,
  IdentitySource,
  MobileMoneySource,
  NotificationRecord,
  ScoringConfig,
  TaxSource,
  TelecomSource,
} from '../scoring';
import { generateSeedDataset } from '../data/seedGenerator';
import { isSupabaseConfigured, supabase } from './supabaseClient';

export interface PortalState {
  mode: 'supabase' | 'local_mock';
  profiles: CustomerProfile[];
  config: ScoringConfig;
  configHistory: ScoringConfig[];
  catalog: EquipmentItem[];
  emiPlans: EmiPlanConfig[];
  applications: ApplicationRecord[];
  notifications: NotificationRecord[];
  auditLogs: AuditLogEntry[];
}

const STORAGE_KEY = 'unitel_credit_intelligence_poc_v2';

function buildInitialMockState(): PortalState {
  const seed = generateSeedDataset(
    DEFAULT_SCORING_CONFIG,
    DEFAULT_EQUIPMENT_CATALOG,
    DEFAULT_EMI_PLANS
  );
  return {
    mode: 'local_mock',
    profiles: seed.profiles,
    config: DEFAULT_SCORING_CONFIG,
    configHistory: [DEFAULT_SCORING_CONFIG],
    catalog: DEFAULT_EQUIPMENT_CATALOG,
    emiPlans: DEFAULT_EMI_PLANS,
    applications: seed.applications,
    notifications: seed.notifications,
    auditLogs: seed.auditLogs,
  };
}

function loadLocalFallback(): PortalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PortalState;
      if (parsed.config && Array.isArray(parsed.profiles) && Array.isArray(parsed.applications)) {
        return {
          ...parsed,
          mode: 'local_mock',
          configHistory: parsed.configHistory?.length ? parsed.configHistory : [parsed.config],
          catalog: parsed.catalog?.length ? parsed.catalog : DEFAULT_EQUIPMENT_CATALOG,
          emiPlans: parsed.emiPlans?.length ? parsed.emiPlans : DEFAULT_EMI_PLANS,
          auditLogs: parsed.auditLogs ?? [],
        };
      }
    }
  } catch {
    // Ignore corrupt localStorage and regenerate seed
  }
  const initial = buildInitialMockState();
  saveLocalFallback(initial);
  return initial;
}

export function saveLocalFallback(state: PortalState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota issues
  }
}

export function resetLocalFallback(): PortalState {
  localStorage.removeItem(STORAGE_KEY);
  return loadLocalFallback();
}

export function createEmptyState(current: PortalState): PortalState {
  return {
    ...current,
    profiles: [],
    applications: [],
    notifications: [],
    auditLogs: [],
  };
}

export async function loadPortalState(): Promise<PortalState> {
  if (!isSupabaseConfigured || !supabase) {
    return loadLocalFallback();
  }

  try {
    const [custRes, telRes, mmRes, idRes, taxRes, cfgRes, appRes, notifRes, eqRes, emiRes, auditRes] =
      await Promise.all([
        supabase.from('customers').select('*').order('id'),
        supabase.from('src_telecom').select('*'),
        supabase.from('src_mobile_money').select('*'),
        supabase.from('src_identity').select('*'),
        supabase.from('src_tax').select('*'),
        supabase.from('scoring_config').select('*').order('version', { ascending: false }),
        supabase.from('applications').select('*').order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }),
        supabase.from('equipment_catalog').select('*'),
        supabase.from('emi_config').select('*'),
        supabase.from('audit_log').select('*').order('timestamp', { ascending: false }),
      ]);

    if (custRes.error || !custRes.data || custRes.data.length === 0) {
      return loadLocalFallback();
    }

    const telMap = new Map((telRes.data as TelecomSource[] | null)?.map((r) => [r.mobile_no, r]) ?? []);
    const mmMap = new Map((mmRes.data as MobileMoneySource[] | null)?.map((r) => [r.mobile_no, r]) ?? []);
    const idMap = new Map((idRes.data as IdentitySource[] | null)?.map((r) => [r.mobile_no, r]) ?? []);
    const taxMap = new Map((taxRes.data as TaxSource[] | null)?.map((r) => [r.mobile_no, r]) ?? []);

    const profiles: CustomerProfile[] = (custRes.data as Customer[]).map((customer) => ({
      customer,
      telecom: telMap.get(customer.mobile_no) ?? null,
      mobileMoney: mmMap.get(customer.mobile_no) ?? null,
      identity: idMap.get(customer.mobile_no) ?? null,
      tax: taxMap.get(customer.mobile_no) ?? null,
    }));

    const configHistory =
      (cfgRes.data?.map((r) => r.config_json as ScoringConfig).filter(Boolean) ?? []);
    const config = configHistory[0] ?? DEFAULT_SCORING_CONFIG;

    return {
      mode: 'supabase',
      profiles,
      config,
      configHistory: configHistory.length ? configHistory : [DEFAULT_SCORING_CONFIG],
      catalog: (eqRes.data as EquipmentItem[] | null)?.length
        ? (eqRes.data as EquipmentItem[])
        : DEFAULT_EQUIPMENT_CATALOG,
      emiPlans: (emiRes.data as EmiPlanConfig[] | null)?.length
        ? (emiRes.data as EmiPlanConfig[])
        : DEFAULT_EMI_PLANS,
      applications: (appRes.data as ApplicationRecord[] | null) ?? [],
      notifications: (notifRes.data as NotificationRecord[] | null) ?? [],
      auditLogs: (auditRes.data as AuditLogEntry[] | null) ?? [],
    };
  } catch {
    return loadLocalFallback();
  }
}

export async function persistApplication(
  app: ApplicationRecord,
  notifs: NotificationRecord[],
  auditEntry?: AuditLogEntry
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { application_data, profile_snapshot: _ps, ...appRow } = app;
  await supabase.from('applications').upsert(appRow, { onConflict: 'id' });
  if (application_data) {
    await supabase
      .from('application_data')
      .upsert({ application_id: app.id, ...application_data }, { onConflict: 'application_id' });
  }
  if (notifs.length > 0) {
    await supabase.from('notifications').upsert(notifs, { onConflict: 'id' });
  }
  if (auditEntry) {
    await supabase.from('audit_log').upsert(auditEntry, { onConflict: 'id' });
  }
}

export async function persistConfig(config: ScoringConfig): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('scoring_config').upsert(
    {
      id: `v-${config.version}`,
      version: config.version,
      config_json: config,
    },
    { onConflict: 'id' }
  );
}

export async function persistProfileUpdate(profile: CustomerProfile): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('customers').upsert(profile.customer, { onConflict: 'id' });
  if (profile.telecom) await supabase.from('src_telecom').upsert(profile.telecom, { onConflict: 'mobile_no' });
  if (profile.mobileMoney)
    await supabase.from('src_mobile_money').upsert(profile.mobileMoney, { onConflict: 'mobile_no' });
  if (profile.identity) await supabase.from('src_identity').upsert(profile.identity, { onConflict: 'mobile_no' });
  if (profile.tax) await supabase.from('src_tax').upsert(profile.tax, { onConflict: 'mobile_no' });
}

export function recomputeApplicationsWithConfig(
  applications: ApplicationRecord[],
  profiles: CustomerProfile[],
  config: ScoringConfig
): ApplicationRecord[] {
  const byId = new Map(profiles.map((p) => [p.customer.id, p]));
  return applications.map((app) => {
    const profile = app.profile_snapshot ?? byId.get(app.customer_id);
    if (!profile) return app;
    const exp = evaluateCreditScore(profile, config);
    const emiCalc = calculateEmiPlan(app.product_price_aoa, {
      id: 'recalc',
      tier: app.volume_tier,
      term_months: app.emi_term_months,
      interest_rate_pct: app.emi_rate_pct,
      min_down_payment_pct:
        app.product_price_aoa > 0
          ? Math.round((app.down_payment_aoa / app.product_price_aoa) * 100)
          : 10,
    });
    const dec = evaluateLimitAndDecision(
      exp,
      app.product_price_aoa,
      config,
      app.monthly_emi_aoa || emiCalc.monthly_emi_aoa
    );

    return {
      ...app,
      score: exp.score,
      band: exp.band,
      confidence: exp.confidence,
      credit_limit_aoa: dec.creditLimitAoa,
      max_monthly_emi_aoa: dec.maxMonthlyEmiAoa,
      emi_affordable: dec.emiAffordable,
      decision: dec.decision,
      score_config_version: config.version,
      decision_reason: app.decided_by_role ? app.decision_reason : dec.decisionReason,
    };
  });
}

export function exportApplicationsCsv(applications: ApplicationRecord[]): string {
  const headers = [
    'id',
    'customer_name',
    'mobile_no',
    'volume_tier',
    'product',
    'product_price_aoa',
    'emi_term_months',
    'monthly_emi_aoa',
    'score',
    'band',
    'confidence',
    'credit_limit_aoa',
    'suggested_decision',
    'status',
    'decided_by_role',
    'decision_reason',
    'created_at',
  ];
  const escape = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows = applications.map((a) =>
    [
      a.id,
      a.customer_name,
      a.mobile_no,
      a.volume_tier,
      a.product,
      a.product_price_aoa,
      a.emi_term_months,
      a.monthly_emi_aoa,
      a.score,
      a.band,
      a.confidence,
      a.credit_limit_aoa,
      a.decision,
      a.status,
      a.decided_by_role ?? '',
      a.decision_reason,
      a.created_at,
    ]
      .map(escape)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
