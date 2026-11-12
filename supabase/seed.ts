import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_EMI_PLANS,
  DEFAULT_EQUIPMENT_CATALOG,
  DEFAULT_SCORING_CONFIG,
} from '../src/scoring';
import { generateSeedDataset } from '../src/data/seedGenerator';

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error(
      'Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_*). Set them in .env before seeding.'
    );
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { profiles, applications, notifications, auditLogs } = generateSeedDataset(
    DEFAULT_SCORING_CONFIG,
    DEFAULT_EQUIPMENT_CATALOG,
    DEFAULT_EMI_PLANS
  );

  console.log(`Seeding ${profiles.length} customers, catalog, EMI plans, applications & logs...`);

  const customers = profiles.map((p) => p.customer);
  const telecoms = profiles.map((p) => p.telecom!).filter(Boolean);
  const mobileMoneys = profiles.map((p) => p.mobileMoney!).filter(Boolean);
  const identities = profiles.map((p) => p.identity!).filter(Boolean);
  const taxes = profiles.map((p) => p.tax!).filter(Boolean);

  const upsertBatch = async (table: string, rows: unknown[], conflictCol: string) => {
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflictCol });
      if (error) throw new Error(`${table} upsert failed: ${error.message}`);
    }
  };

  await upsertBatch('customers', customers, 'id');
  await upsertBatch('src_telecom', telecoms, 'mobile_no');
  await upsertBatch('src_mobile_money', mobileMoneys, 'mobile_no');
  await upsertBatch('src_identity', identities, 'mobile_no');
  await upsertBatch('src_tax', taxes, 'mobile_no');

  await upsertBatch('equipment_catalog', DEFAULT_EQUIPMENT_CATALOG, 'id');
  await upsertBatch('emi_config', DEFAULT_EMI_PLANS, 'id');

  const tplRows = Object.entries(DEFAULT_SCORING_CONFIG.templates).map(([k, v]) => ({
    trigger_key: k,
    sms: v.sms,
    email_subject: v.emailSubject,
    email_body: v.emailBody,
  }));
  await upsertBatch('notification_templates', tplRows, 'trigger_key');

  const { error: cfgErr } = await supabase.from('scoring_config').upsert(
    {
      id: DEFAULT_SCORING_CONFIG.id,
      version: DEFAULT_SCORING_CONFIG.version,
      config_json: DEFAULT_SCORING_CONFIG,
    },
    { onConflict: 'id' }
  );
  if (cfgErr) throw new Error(`scoring_config upsert failed: ${cfgErr.message}`);

  const appRows = applications.map(({ application_data: _ad, profile_snapshot: _ps, ...rest }) => rest);
  await upsertBatch('applications', appRows, 'id');

  const appDataRows = applications
    .filter((a) => a.application_data)
    .map((a) => ({ application_id: a.id, ...a.application_data }));
  await upsertBatch('application_data', appDataRows, 'application_id');

  await upsertBatch('notifications', notifications, 'id');
  await upsertBatch('audit_log', auditLogs, 'id');

  console.log(
    `Seed complete: ${customers.length} customers, ${DEFAULT_EQUIPMENT_CATALOG.length} catalog items, ${DEFAULT_EMI_PLANS.length} EMI plans, ${applications.length} applications, ${auditLogs.length} audit logs.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
