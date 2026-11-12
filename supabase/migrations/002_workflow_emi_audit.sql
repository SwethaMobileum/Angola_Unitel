-- Migration 002: Volume tier, Equipment catalog, EMI config, Application data, Audit log
-- Extends 001_init.sql without dropping existing tables or data

alter table public.customers
  add column if not exists address text null,
  add column if not exists volume_tier text not null default 'low' check (volume_tier in ('low', 'high'));

alter table public.src_mobile_money
  add column if not exists daily_txn_aoa numeric not null default 0;

alter table public.applications
  add column if not exists volume_tier text not null default 'low' check (volume_tier in ('low', 'high')),
  add column if not exists equipment_id text null,
  add column if not exists emi_term_months integer not null default 12,
  add column if not exists emi_rate_pct numeric not null default 11,
  add column if not exists down_payment_aoa numeric not null default 0,
  add column if not exists monthly_emi_aoa numeric not null default 0,
  add column if not exists total_payable_aoa numeric not null default 0,
  add column if not exists emi_affordable boolean not null default true,
  add column if not exists max_monthly_emi_aoa numeric not null default 0,
  add column if not exists decided_by_role text null,
  add column if not exists created_by_role text null,
  add column if not exists score_config_version integer not null default 1;

create table if not exists public.equipment_catalog (
  id text primary key,
  category text not null,
  item_name text not null,
  price_aoa numeric not null,
  min_tier text not null check (min_tier in ('low', 'high')),
  active boolean not null default true,
  description text null
);

create table if not exists public.emi_config (
  id text primary key,
  tier text not null check (tier in ('low', 'high')),
  term_months integer not null,
  interest_rate_pct numeric not null,
  min_down_payment_pct numeric not null
);

create table if not exists public.application_data (
  application_id text primary key references public.applications(id) on delete cascade,
  registration_channel text not null default 'app',
  pin_created boolean not null default true,
  terms_accepted boolean not null default true,
  id_doc_type text null,
  id_number text null,
  id_issue_date date null,
  id_issue_place text null,
  residential_address text null,
  additional_kyc_verified boolean not null default false,
  has_bank_account boolean not null default false,
  daily_txn_aoa numeric not null default 0
);

create table if not exists public.audit_log (
  id text primary key,
  application_id text not null,
  step_name text not null,
  inputs_snapshot jsonb not null default '{}'::jsonb,
  score_config_version integer not null default 1,
  score integer null,
  decision text not null,
  decision_reason text not null,
  role text not null,
  timestamp timestamptz not null default now()
);

create table if not exists public.notification_templates (
  trigger_key text primary key,
  sms text not null,
  email_subject text not null,
  email_body text not null
);

alter table public.equipment_catalog enable row level security;
alter table public.emi_config enable row level security;
alter table public.application_data enable row level security;
alter table public.audit_log enable row level security;
alter table public.notification_templates enable row level security;

create policy "demo_all_equipment" on public.equipment_catalog for all using (true) with check (true);
create policy "demo_all_emi" on public.emi_config for all using (true) with check (true);
create policy "demo_all_app_data" on public.application_data for all using (true) with check (true);
create policy "demo_all_audit" on public.audit_log for all using (true) with check (true);
create policy "demo_all_tpls" on public.notification_templates for all using (true) with check (true);
