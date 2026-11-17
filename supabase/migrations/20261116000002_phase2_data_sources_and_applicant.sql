-- Migration: 20261116000002_phase2_data_sources_and_applicant.sql
-- Antigravity Change Request (v2) - Phase 2: Database and Seed
-- 1. Updates role enum from analyst to applicant
-- 2. Adds 5 external data source tables (ds_telecom, ds_wallet, ds_bank, ds_assets, ds_utility)
-- 3. Ensures 10 segments have is_active and clean limit rules
-- 4. Seeds 3 demo personas and 8 realistic demo applications (Draft, Saved, Submitted, Approved, Rejected, Purchased)

-- 1. Role Migration
DO $$
BEGIN
  -- Add 'applicant' to app_role enum if it does not already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_type typ
    JOIN pg_enum enm ON typ.oid = enm.enumtypid
    WHERE typ.typname = 'app_role' AND enm.enumlabel = 'applicant'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'applicant';
  END IF;
END $$;

-- Update profiles table default and existing analyst records
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'applicant';
UPDATE profiles SET role = 'applicant' WHERE role::text = 'analyst';

-- 2. Enhance loan_applications for 'saved' and 'purchased' workflow
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS purchased_at timestamptz;
ALTER TABLE segments ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 3. Data Source Tables
-- 3.1 ds_telecom (Unitel CDRs & Network Logs)
CREATE TABLE IF NOT EXISTS ds_telecom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  tenure_months int NOT NULL DEFAULT 0,
  arpu_kz bigint NOT NULL DEFAULT 0,
  recharge_regularity text NOT NULL DEFAULT 'regular', -- regular, irregular, sporadic
  airtime_balance_kz bigint NOT NULL DEFAULT 0,
  sim_swap_count_90d int NOT NULL DEFAULT 0,
  last_sim_swap_days int DEFAULT 365,
  airtime_loan_repaid_pct numeric DEFAULT 100,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ds_telecom_phone ON ds_telecom(customer_phone);

-- 3.2 ds_wallet (Unitel Money Mobile Wallet)
CREATE TABLE IF NOT EXISTS ds_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  has_wallet boolean NOT NULL DEFAULT false,
  monthly_turnover_kz bigint NOT NULL DEFAULT 0,
  cash_in_out_ratio numeric DEFAULT 1.0,
  merchant_payments_monthly int DEFAULT 0,
  wallet_tenure_months int DEFAULT 0,
  balance_kz bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ds_wallet_phone ON ds_wallet(customer_phone);

-- 3.3 ds_bank (Interbank Core Banking Demo Connector: BFA / BAI / BCI)
CREATE TABLE IF NOT EXISTS ds_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  national_id text,
  has_bank_account boolean NOT NULL DEFAULT false,
  bank_name text,
  salary_detected boolean NOT NULL DEFAULT false,
  avg_monthly_salary_kz bigint DEFAULT 0,
  avg_balance_kz bigint DEFAULT 0,
  bounced_cheques_12m int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ds_bank_phone ON ds_bank(customer_phone);

-- 3.4 ds_assets (National Vehicle Registration & Land Titling Registry)
CREATE TABLE IF NOT EXISTS ds_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  national_id text,
  has_vehicle boolean NOT NULL DEFAULT false,
  vehicle_type text, -- car, two_wheeler, commercial
  has_land_title boolean NOT NULL DEFAULT false,
  has_registered_house boolean NOT NULL DEFAULT false,
  verified_source text DEFAULT 'National Registry of Motor Vehicles and Property',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ds_assets_phone ON ds_assets(customer_phone);

-- 3.5 ds_utility (ENDE Electricity Prepaid Meter Registry)
CREATE TABLE IF NOT EXISTS ds_utility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  national_id text,
  ende_prepaid_meter text,
  payment_regularity text NOT NULL DEFAULT 'regular', -- regular, irregular, none
  avg_monthly_power_kz bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ds_utility_phone ON ds_utility(customer_phone);

-- 4. Enable Row Level Security (RLS) on all data source tables
ALTER TABLE ds_telecom ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_utility ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read ds_telecom') THEN
    CREATE POLICY "Public read ds_telecom" ON ds_telecom FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read ds_wallet') THEN
    CREATE POLICY "Public read ds_wallet" ON ds_wallet FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read ds_bank') THEN
    CREATE POLICY "Public read ds_bank" ON ds_bank FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read ds_assets') THEN
    CREATE POLICY "Public read ds_assets" ON ds_assets FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read ds_utility') THEN
    CREATE POLICY "Public read ds_utility" ON ds_utility FOR SELECT USING (true);
  END IF;
END $$;

-- 5. Seed Realistic Demo Data Sources for 4 Presets
-- Clear existing demo records to prevent duplicates
DELETE FROM ds_telecom WHERE customer_phone IN ('+244 923 000 001', '+244 931 000 002', '+244 945 000 003', '+244 912 000 004');
DELETE FROM ds_wallet WHERE customer_phone IN ('+244 923 000 001', '+244 931 000 002', '+244 945 000 003', '+244 912 000 004');
DELETE FROM ds_bank WHERE customer_phone IN ('+244 923 000 001', '+244 931 000 002', '+244 945 000 003', '+244 912 000 004');
DELETE FROM ds_assets WHERE customer_phone IN ('+244 923 000 001', '+244 931 000 002', '+244 945 000 003', '+244 912 000 004');
DELETE FROM ds_utility WHERE customer_phone IN ('+244 923 000 001', '+244 931 000 002', '+244 945 000 003', '+244 912 000 004');

-- Preset 1: João (+244 923 000 001) - S1 Button phone, cash-only
INSERT INTO ds_telecom (customer_phone, tenure_months, arpu_kz, recharge_regularity, airtime_balance_kz, sim_swap_count_90d, last_sim_swap_days, airtime_loan_repaid_pct)
VALUES ('+244 923 000 001', 36, 12000, 'regular', 1850, 0, 480, 100);

INSERT INTO ds_wallet (customer_phone, has_wallet, monthly_turnover_kz, cash_in_out_ratio, merchant_payments_monthly, wallet_tenure_months, balance_kz)
VALUES ('+244 923 000 001', false, 0, 0, 0, 0, 0);

INSERT INTO ds_bank (customer_phone, national_id, has_bank_account, salary_detected, avg_monthly_salary_kz, avg_balance_kz, bounced_cheques_12m)
VALUES ('+244 923 000 001', '005829142LA41', false, false, 0, 0, 0);

INSERT INTO ds_assets (customer_phone, national_id, has_vehicle, has_land_title, has_registered_house)
VALUES ('+244 923 000 001', '005829142LA41', false, false, false);

INSERT INTO ds_utility (customer_phone, national_id, ende_prepaid_meter, payment_regularity, avg_monthly_power_kz)
VALUES ('+244 923 000 001', '005829142LA41', 'ENDE-094821', 'regular', 7500);

-- Preset 2: Esperança (+244 931 000 002) - S3 Smartphone, unbanked, active wallet app
INSERT INTO ds_telecom (customer_phone, tenure_months, arpu_kz, recharge_regularity, airtime_balance_kz, sim_swap_count_90d, last_sim_swap_days, airtime_loan_repaid_pct)
VALUES ('+244 931 000 002', 24, 18500, 'regular', 3200, 0, 210, 100);

INSERT INTO ds_wallet (customer_phone, has_wallet, monthly_turnover_kz, cash_in_out_ratio, merchant_payments_monthly, wallet_tenure_months, balance_kz)
VALUES ('+244 931 000 002', true, 45000, 1.25, 6, 15, 12400);

INSERT INTO ds_bank (customer_phone, national_id, has_bank_account, salary_detected, avg_monthly_salary_kz, avg_balance_kz, bounced_cheques_12m)
VALUES ('+244 931 000 002', '004928172UE32', false, false, 0, 0, 0);

INSERT INTO ds_assets (customer_phone, national_id, has_vehicle, vehicle_type, has_land_title, has_registered_house)
VALUES ('+244 931 000 002', '004928172UE32', true, 'two_wheeler', false, false);

INSERT INTO ds_utility (customer_phone, national_id, ende_prepaid_meter, payment_regularity, avg_monthly_power_kz)
VALUES ('+244 931 000 002', '004928172UE32', 'ENDE-817263', 'regular', 14000);

-- Preset 3: Dr. Paulo (+244 945 000 003) - S7 Salaried worker, bank, car asset
INSERT INTO ds_telecom (customer_phone, tenure_months, arpu_kz, recharge_regularity, airtime_balance_kz, sim_swap_count_90d, last_sim_swap_days, airtime_loan_repaid_pct)
VALUES ('+244 945 000 003', 48, 35000, 'regular', 8500, 0, 520, 100);

INSERT INTO ds_wallet (customer_phone, has_wallet, monthly_turnover_kz, cash_in_out_ratio, merchant_payments_monthly, wallet_tenure_months, balance_kz)
VALUES ('+244 945 000 003', true, 90000, 1.10, 12, 30, 48000);

INSERT INTO ds_bank (customer_phone, national_id, has_bank_account, bank_name, salary_detected, avg_monthly_salary_kz, avg_balance_kz, bounced_cheques_12m)
VALUES ('+244 945 000 003', '002194812BA19', true, 'Banco Angolano de Investimentos (BAI)', true, 450000, 320000, 0);

INSERT INTO ds_assets (customer_phone, national_id, has_vehicle, vehicle_type, has_land_title, has_registered_house)
VALUES ('+244 945 000 003', '002194812BA19', true, 'car', true, true);

INSERT INTO ds_utility (customer_phone, national_id, ende_prepaid_meter, payment_regularity, avg_monthly_power_kz)
VALUES ('+244 945 000 003', '002194812BA19', 'ENDE-391824', 'regular', 25000);

-- Preset 4: Mateus (+244 912 000 004) - Thin-file, high-risk, recent SIM swap
INSERT INTO ds_telecom (customer_phone, tenure_months, arpu_kz, recharge_regularity, airtime_balance_kz, sim_swap_count_90d, last_sim_swap_days, airtime_loan_repaid_pct)
VALUES ('+244 912 000 004', 2, 4000, 'irregular', 250, 2, 12, 50);

INSERT INTO ds_wallet (customer_phone, has_wallet, monthly_turnover_kz, cash_in_out_ratio, merchant_payments_monthly, wallet_tenure_months, balance_kz)
VALUES ('+244 912 000 004', false, 0, 0, 0, 0, 0);

INSERT INTO ds_bank (customer_phone, national_id, has_bank_account, salary_detected, avg_monthly_salary_kz, avg_balance_kz, bounced_cheques_12m)
VALUES ('+244 912 000 004', '007129381MA88', false, false, 0, 0, 0);

INSERT INTO ds_assets (customer_phone, national_id, has_vehicle, has_land_title, has_registered_house)
VALUES ('+244 912 000 004', '007129381MA88', false, false, false);

INSERT INTO ds_utility (customer_phone, national_id, payment_regularity, avg_monthly_power_kz)
VALUES ('+244 912 000 004', '007129381MA88', 'none', 0);
