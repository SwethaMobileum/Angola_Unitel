-- Migration: 20261116000001_initial_schema.sql
-- Unitel Credit Scoring POC Database Schema
-- Defines enums, core tables, audit triggers, and Row Level Security (RLS)

-- 1. Custom Enum Types
create type app_role as enum ('analyst', 'approver', 'admin');
create type param_role as enum ('main', 'support', 'bonus', 'limit_only', 'not_available', 'not_used');
create type input_type as enum ('number', 'choice', 'boolean', 'yes_no_skip');

-- 2. User Profiles linked to auth.users
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  role app_role not null default 'analyst',
  created_at timestamptz default now()
);

-- 3. Configuration Versions
create table config_versions (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  is_active boolean default false
);

-- 4. Feature Flags
create table feature_flags (
  key text primary key,
  value jsonb not null,
  description text
);

-- 5. Parameter Blocks (P, T, W, B, X, A)
create table blocks (
  code char(1) primary key,
  name text not null,
  question text,
  color text not null,
  is_optional boolean default false,
  sort int not null default 0
);

-- 6. Customer Segments (S1 through S10)
create table segments (
  code text primary key,
  name text not null,
  color text not null,
  story text not null,
  how_money_moves text not null,
  data_visible text not null,
  share_note text,
  limit_rule text not null,
  sort int not null default 0
);

-- 7. Segment Block Weights (Sum of P+T+W+B+X must equal 94)
create table segment_weights (
  config_version_id uuid references config_versions(id) on delete cascade,
  segment_code text references segments(code) on delete cascade,
  block_code char(1) references blocks(code) on delete cascade,
  points int not null check (points between 0 and 94),
  role param_role not null,
  primary key (config_version_id, segment_code, block_code)
);

-- 8. Parameters
create table parameters (
  key text primary key,
  block_code char(1) references blocks(code) on delete cascade,
  label text not null,
  help text,
  input input_type not null,
  unit text,
  options jsonb,
  bands jsonb,
  weight numeric default 1,
  is_candidate boolean default false,
  sort int not null default 0
);

-- 9. Segment Parameters Mapping
create table segment_parameters (
  segment_code text references segments(code) on delete cascade,
  parameter_key text references parameters(key) on delete cascade,
  role param_role not null,
  primary key (segment_code, parameter_key)
);

-- 10. Segment Decision Chain Questions (First YES wins)
create table segment_questions (
  id serial primary key,
  position int not null,
  text text not null,
  yes_segment text references segments(code) on delete cascade,
  requires_wallet boolean default false
);

-- 11. Score Bands (300 to 900)
create table score_bands (
  id serial primary key,
  min_score int not null,
  max_score int not null,
  label text not null,
  limit_level text not null -- review, starter, standard, higher, highest
);

-- 12. Overlay Rules
create table overlay_rules (
  id serial primary key,
  key text unique not null,
  description text not null,
  action text not null -- stop, cap_starter, hold_review, never_score
);

-- 13. Income Bands (Kz per month)
create table income_bands (
  id serial primary key,
  code int not null unique,
  label text not null,
  min_kz bigint not null,
  max_kz bigint not null,
  usd_note text,
  limit_cap_level text not null
);

-- 14. Credit Limit Matrix Table
create table limit_table (
  id serial primary key,
  limit_level text not null,
  income_band_code int not null references income_bands(code) on delete cascade,
  max_limit_kz bigint not null
);

-- 15. Equipment Catalog
create table equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price_kz bigint not null,
  active boolean default true
);

-- 16. Customers
create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  msisdn text not null,
  national_id_masked text not null,
  date_of_birth date not null,
  sim_activation_date date not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- 17. Evaluations
create table evaluations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  analyst_id uuid not null references profiles(id),
  segment_code text not null references segments(code),
  segment_overridden boolean default false,
  override_reason text,
  config_version_id uuid not null references config_versions(id),
  wallet_available boolean default true,
  income_band_code int references income_bands(code),
  income_source text default 'estimated', -- stated, estimated
  status text not null default 'draft', -- draft, scored, submitted, approved, rejected
  created_at timestamptz default now()
);

-- 18. Evaluation Parameter Inputs
create table evaluation_inputs (
  evaluation_id uuid references evaluations(id) on delete cascade,
  parameter_key text references parameters(key) on delete cascade,
  value jsonb not null,
  primary key (evaluation_id, parameter_key)
);

-- 19. Evaluation Assets (Optional bonus, never penalises)
create table evaluation_assets (
  evaluation_id uuid primary key references evaluations(id) on delete cascade,
  house text not null default 'skip', -- yes, no, skip
  land_title text not null default 'skip',
  two_wheeler text not null default 'skip',
  car text not null default 'skip'
);

-- 20. Evaluation Computed Results
create table evaluation_results (
  evaluation_id uuid primary key references evaluations(id) on delete cascade,
  block_points jsonb not null,
  asset_bonus numeric not null default 0,
  total_points numeric not null,
  score int not null,
  band_label text not null,
  confidence text not null, -- high, medium, low
  overlay_flags jsonb default '[]'::jsonb,
  reasons jsonb default '[]'::jsonb,
  limit_kz bigint not null,
  limit_cap_applied text not null,
  score_version text not null,
  computed_at timestamptz default now()
);

-- 21. Loan Applications
create table loan_applications (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references evaluations(id) on delete cascade,
  equipment_id uuid not null references equipment(id),
  price_kz bigint not null,
  term_months int not null,
  rate_pct numeric not null,
  monthly_emi_kz bigint not null,
  emi_share_pct numeric not null,
  status text not null default 'submitted', -- submitted, approved, rejected
  submitted_by uuid not null references profiles(id),
  submitted_at timestamptz default now()
);

-- 22. Approver Decisions
create table approvals (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references loan_applications(id) on delete cascade,
  approver_id uuid not null references profiles(id),
  decision text not null, -- approved, rejected
  reason text not null,
  decided_at timestamptz default now()
);

-- 23. Notifications Log
create table notifications (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references loan_applications(id) on delete cascade,
  to_email text not null,
  kind text not null,
  subject text not null,
  body text not null,
  status text not null default 'logged', -- logged, sent, failed
  created_at timestamptz default now()
);

-- 24. Immutable Audit Log
create table audit_log (
  id bigserial primary key,
  at timestamptz default now(),
  actor uuid references profiles(id),
  action text not null,
  entity text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb
);

-- 25. Row Level Security (RLS) Configuration
alter table profiles enable row level security;
alter table config_versions enable row level security;
alter table feature_flags enable row level security;
alter table blocks enable row level security;
alter table segments enable row level security;
alter table segment_weights enable row level security;
alter table parameters enable row level security;
alter table segment_parameters enable row level security;
alter table segment_questions enable row level security;
alter table score_bands enable row level security;
alter table overlay_rules enable row level security;
alter table income_bands enable row level security;
alter table limit_table enable row level security;
alter table equipment enable row level security;
alter table customers enable row level security;
alter table evaluations enable row level security;
alter table evaluation_inputs enable row level security;
alter table evaluation_assets enable row level security;
alter table evaluation_results enable row level security;
alter table loan_applications enable row level security;
alter table approvals enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;

-- Config tables: readable by all authenticated users, writable only by admin
create policy "Allow read config to all users" on config_versions for select using (auth.role() = 'authenticated');
create policy "Allow admin write config" on config_versions for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create policy "Allow read feature_flags to all" on feature_flags for select using (true);
create policy "Allow admin write feature_flags" on feature_flags for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create policy "Allow read blocks to all" on blocks for select using (true);
create policy "Allow read segments to all" on segments for select using (true);
create policy "Allow read segment_weights to all" on segment_weights for select using (true);
create policy "Allow read parameters to all" on parameters for select using (true);
create policy "Allow read segment_parameters to all" on segment_parameters for select using (true);
create policy "Allow read segment_questions to all" on segment_questions for select using (true);
create policy "Allow read score_bands to all" on score_bands for select using (true);
create policy "Allow read overlay_rules to all" on overlay_rules for select using (true);
create policy "Allow read income_bands to all" on income_bands for select using (true);
create policy "Allow read limit_table to all" on limit_table for select using (true);
create policy "Allow read equipment to all" on equipment for select using (true);

-- Evaluations & Applications:
-- Analyst sees own, Approver sees submitted/decided, Admin sees all
create policy "Evaluations read policy" on evaluations for select using (
  auth.uid() = analyst_id or
  exists (select 1 from profiles where id = auth.uid() and role in ('approver', 'admin'))
);
create policy "Evaluations write policy" on evaluations for all using (
  auth.uid() = analyst_id or
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create policy "Evaluation inputs read" on evaluation_inputs for select using (true);
create policy "Evaluation inputs write" on evaluation_inputs for all using (true);

create policy "Evaluation assets read" on evaluation_assets for select using (true);
create policy "Evaluation assets write" on evaluation_assets for all using (true);

create policy "Evaluation results read" on evaluation_results for select using (true);
create policy "Evaluation results write" on evaluation_results for all using (true);

create policy "Customers read policy" on customers for select using (auth.role() = 'authenticated');
create policy "Customers write policy" on customers for insert with check (auth.role() = 'authenticated');

create policy "Loan applications read policy" on loan_applications for select using (
  auth.uid() = submitted_by or
  exists (select 1 from profiles where id = auth.uid() and role in ('approver', 'admin'))
);
create policy "Loan applications insert policy" on loan_applications for insert with check (
  auth.uid() = submitted_by or
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create policy "Approvals read policy" on approvals for select using (auth.role() = 'authenticated');
create policy "Approvals insert policy" on approvals for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('approver', 'admin'))
);

create policy "Notifications read policy" on notifications for select using (auth.role() = 'authenticated');
create policy "Notifications insert policy" on notifications for insert with check (auth.role() = 'authenticated');

-- Audit Log: Insert by any authenticated user, Select by admin and approver, No update or delete
create policy "Audit log select" on audit_log for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'approver'))
);
create policy "Audit log insert" on audit_log for insert with check (auth.role() = 'authenticated');

-- 26. Audit Triggers
create or replace function fn_audit_evaluation() returns trigger as $$
begin
  insert into audit_log (actor, action, entity, entity_id, details)
  values (
    new.analyst_id,
    TG_OP || '_evaluation',
    'evaluations',
    new.id::text,
    jsonb_build_object(
      'status', new.status,
      'segment_code', new.segment_code,
      'segment_overridden', new.segment_overridden,
      'wallet_available', new.wallet_available
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_audit_evaluation
after insert or update on evaluations
for each row execute function fn_audit_evaluation();

create or replace function fn_audit_loan_application() returns trigger as $$
begin
  insert into audit_log (actor, action, entity, entity_id, details)
  values (
    new.submitted_by,
    TG_OP || '_loan_application',
    'loan_applications',
    new.id::text,
    jsonb_build_object(
      'price_kz', new.price_kz,
      'term_months', new.term_months,
      'monthly_emi_kz', new.monthly_emi_kz,
      'status', new.status
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_audit_loan_application
after insert or update on loan_applications
for each row execute function fn_audit_loan_application();

create or replace function fn_audit_approval() returns trigger as $$
begin
  insert into audit_log (actor, action, entity, entity_id, details)
  values (
    new.approver_id,
    'decision_' || new.decision,
    'approvals',
    new.id::text,
    jsonb_build_object(
      'application_id', new.application_id,
      'decision', new.decision,
      'reason', new.reason
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_audit_approval
after insert on approvals
for each row execute function fn_audit_approval();
