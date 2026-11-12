import {
  DEFAULT_SCORING_CONFIG,
  evaluateCreditScore,
  evaluateLimitAndDecision,
} from '../scoring';
import type {
  ApplicationRecord,
  Customer,
  CustomerProfile,
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
  applications: ApplicationRecord[];
  notifications: NotificationRecord[];
}

const STORAGE_KEY = 'unitel_credit_intelligence_poc_v1';

function loadLocalFallback(): PortalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PortalState;
      if (parsed.profiles?.length >= 5 && parsed.config) {
        return { ...parsed, mode: 'local_mock' };
      }
    }
  } catch {
    // Ignore corrupt localStorage and regenerate seed
  }
  const seed = generateSeedDataset(DEFAULT_SCORING_CONFIG);
  const state: PortalState = {
    mode: 'local_mock',
    profiles: seed.profiles,
    config: DEFAULT_SCORING_CONFIG,
    applications: seed.applications,
    notifications: seed.notifications,
  };
  saveLocalFallback(state);
  return state;
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

export async function loadPortalState(): Promise<PortalState> {
  if (!isSupabaseConfigured || !supabase) {
    return loadLocalFallback();
  }

  try {
    const [custRes, telRes, mmRes, idRes, taxRes, cfgRes, appRes, notifRes] = await Promise.all([
      supabase.from('customers').select('*').order('id'),
      supabase.from('src_telecom').select('*'),
      supabase.from('src_mobile_money').select('*'),
      supabase.from('src_identity').select('*'),
      supabase.from('src_tax').select('*'),
      supabase.from('scoring_config').select('*').order('version', { ascending: false }).limit(1),
      supabase.from('applications').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
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

    const config: ScoringConfig =
      cfgRes.data && cfgRes.data[0]?.config_json
        ? (cfgRes.data[0].config_json as ScoringConfig)
        : DEFAULT_SCORING_CONFIG;

    return {
      mode: 'supabase',
      profiles,
      config,
      applications: (appRes.data as ApplicationRecord[] | null) ?? [],
      notifications: (notifRes.data as NotificationRecord[] | null) ?? [],
    };
  } catch {
    return loadLocalFallback();
  }
}

export async function persistApplication(
  app: ApplicationRecord,
  notifs: NotificationRecord[]
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('applications').upsert(app, { onConflict: 'id' });
  if (notifs.length > 0) {
    await supabase.from('notifications').upsert(notifs, { onConflict: 'id' });
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
    const profile = byId.get(app.customer_id);
    if (!profile) return app;
    const exp = evaluateCreditScore(profile, config);
    const dec = evaluateLimitAndDecision(exp, app.product_price_aoa, config);

    // Preserve explicit manual approver overrides while updating score/band/limit
    if (app.overridden_by) {
      return {
        ...app,
        score: exp.score,
        band: exp.band,
        confidence: exp.confidence,
        credit_limit_aoa: dec.creditLimitAoa,
      };
    }

    return {
      ...app,
      score: exp.score,
      band: exp.band,
      confidence: exp.confidence,
      credit_limit_aoa: dec.creditLimitAoa,
      decision: dec.decision,
      decision_reason: dec.decisionReason,
      status:
        dec.decision === 'auto_approve'
          ? 'approved'
          : dec.decision === 'manual_review'
            ? 'pending_review'
            : 'declined',
    };
  });
}

