-- Credit Intelligence (Unitel Angola POC) — Supabase Postgres Migration
-- Simulated / demo data schema

create table if not exists public.customers (
  id text primary key,
  mobile_no text unique not null,
  full_name text not null,
  bi_number text not null,
  date_of_birth date not null,
  gender text not null check (gender in ('M', 'F')),
  city text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.src_telecom (
  mobile_no text primary key references public.customers(mobile_no) on delete cascade,
  sim_activation_date date not null,
  avg_monthly_topup_aoa numeric not null default 0,
  topup_months_last_12 integer not null default 0,
  avg_monthly_spend_aoa numeric not null default 0,
  spend_variability numeric not null default 0.5,
  airtime_loans_taken integer not null default 0,
  airtime_loans_repaid_on_time integer not null default 0,
  airtime_loans_unpaid integer not null default 0,
  sim_registered_with_bi boolean not null default false
);

create table if not exists public.src_mobile_money (
  mobile_no text primary key references public.customers(mobile_no) on delete cascade,
  wallet_exists boolean not null default false,
  registration_level text not null default 'basic' check (registration_level in ('basic', 'kyc')),
  monthly_inflow_aoa numeric not null default 0,
  monthly_outflow_aoa numeric not null default 0,
  avg_balance_aoa numeric not null default 0,
  txn_count_90d integer not null default 0,
  failed_txn_count_90d integer not null default 0
);

create table if not exists public.src_identity (
  mobile_no text primary key references public.customers(mobile_no) on delete cascade,
  bi_number text not null,
  id_verified boolean not null default false,
  id_issue_date date null,
  id_issue_place text null,
  address text not null default '',
  address_verified boolean not null default false
);

create table if not exists public.src_tax (
  mobile_no text primary key references public.customers(mobile_no) on delete cascade,
  nif text not null,
  nif_status text not null default 'none' check (nif_status in ('active', 'suspended', 'none')),
  tax_filing_status text not null default 'none' check (tax_filing_status in ('regular', 'irregular', 'none'))
);

create table if not exists public.scoring_config (
  id text primary key,
  version integer not null,
  config_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  customer_name text not null,
  mobile_no text not null,
  product text not null,
  product_price_aoa numeric not null,
  status text not null,
  score integer not null,
  band text not null,
  confidence text not null,
  credit_limit_aoa numeric not null,
  decision text not null,
  decision_reason text not null,
  overridden_by text null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  customer_name text not null,
  mobile_no text not null,
  channel text not null check (channel in ('sms', 'email')),
  template text not null,
  subject text null,
  body text not null,
  status text not null default 'simulated_sent',
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_mobile on public.customers(mobile_no);
create index if not exists idx_applications_customer on public.applications(customer_id);
create index if not exists idx_notifications_app on public.notifications(application_id);

-- Demo-only open RLS policies (no production auth in POC)
alter table public.customers enable row level security;
alter table public.src_telecom enable row level security;
alter table public.src_mobile_money enable row level security;
alter table public.src_identity enable row level security;
alter table public.src_tax enable row level security;
alter table public.scoring_config enable row level security;
alter table public.applications enable row level security;
alter table public.notifications enable row level security;

create policy "demo_all_customers" on public.customers for all using (true) with check (true);
create policy "demo_all_telecom" on public.src_telecom for all using (true) with check (true);
create policy "demo_all_mm" on public.src_mobile_money for all using (true) with check (true);
create policy "demo_all_identity" on public.src_identity for all using (true) with check (true);
create policy "demo_all_tax" on public.src_tax for all using (true) with check (true);
create policy "demo_all_config" on public.scoring_config for all using (true) with check (true);
create policy "demo_all_apps" on public.applications for all using (true) with check (true);
create policy "demo_all_notifs" on public.notifications for all using (true) with check (true);

