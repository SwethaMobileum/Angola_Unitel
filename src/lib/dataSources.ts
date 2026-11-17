import { supabase, isSupabaseConfigured } from './supabase';
import {
  DataSourceTelecom,
  DataSourceWallet,
  DataSourceBank,
  DataSourceAssets,
  DataSourceUtility,
  DataSourceCheckResult,
  TelecomRechargeRecord,
} from '../types';

export interface DemoCustomerProfile {
  name: string;
  phone: string;
  nationalId: string;
  dob: string;
  simActivation: string;
  email: string;
  segment: string;
  targetScore: string;
  keyFacts: string;
  telecom: DataSourceTelecom | null;
  wallet: DataSourceWallet | null;
  bank: DataSourceBank | null;
  assets: DataSourceAssets | null;
  utility: DataSourceUtility | null;
  recharges?: TelecomRechargeRecord[];
}

export const DEMO_12_MONTHS = [
  '2025-12', '2026-01', '2026-02', '2026-03',
  '2026-04', '2026-05', '2026-06', '2026-07',
  '2026-08', '2026-09', '2026-10', '2026-11',
];

// Seeded 12-month recharge history matching each demo customer's story
export const SRC_TELECOM_RECHARGES: Record<string, TelecomRechargeRecord[]> = {
  // 1. Matthew Silva (In-between: 11 of 12 months, ~4,500 Kz/mo, 3 recharges/mo)
  '244923000101': [
    { customer_ref: '+244 923 000 101', month: '2025-12', recharge_count: 3, recharge_value_kz: 4500 },
    { customer_ref: '+244 923 000 101', month: '2026-01', recharge_count: 4, recharge_value_kz: 5000 },
    { customer_ref: '+244 923 000 101', month: '2026-02', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 101', month: '2026-03', recharge_count: 3, recharge_value_kz: 4500 },
    { customer_ref: '+244 923 000 101', month: '2026-04', recharge_count: 3, recharge_value_kz: 4500 },
    { customer_ref: '+244 923 000 101', month: '2026-05', recharge_count: 4, recharge_value_kz: 5000 },
    { customer_ref: '+244 923 000 101', month: '2026-06', recharge_count: 3, recharge_value_kz: 4500 },
    { customer_ref: '+244 923 000 101', month: '2026-07', recharge_count: 3, recharge_value_kz: 4500 },
    { customer_ref: '+244 923 000 101', month: '2026-08', recharge_count: 4, recharge_value_kz: 5000 },
    { customer_ref: '+244 923 000 101', month: '2026-09', recharge_count: 3, recharge_value_kz: 4500 },
    { customer_ref: '+244 923 000 101', month: '2026-10', recharge_count: 3, recharge_value_kz: 4500 },
    { customer_ref: '+244 923 000 101', month: '2026-11', recharge_count: 3, recharge_value_kz: 4500 },
  ],
  // 2. Tomas Neto (Few small recharges: 8 of 12 months, ~1,800 Kz/mo, 1 recharge/mo)
  '244923000102': [
    { customer_ref: '+244 923 000 102', month: '2025-12', recharge_count: 1, recharge_value_kz: 1500 },
    { customer_ref: '+244 923 000 102', month: '2026-01', recharge_count: 2, recharge_value_kz: 2000 },
    { customer_ref: '+244 923 000 102', month: '2026-02', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 102', month: '2026-03', recharge_count: 1, recharge_value_kz: 1500 },
    { customer_ref: '+244 923 000 102', month: '2026-04', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 102', month: '2026-05', recharge_count: 2, recharge_value_kz: 2200 },
    { customer_ref: '+244 923 000 102', month: '2026-06', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 102', month: '2026-07', recharge_count: 1, recharge_value_kz: 1800 },
    { customer_ref: '+244 923 000 102', month: '2026-08', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 102', month: '2026-09', recharge_count: 1, recharge_value_kz: 1800 },
    { customer_ref: '+244 923 000 102', month: '2026-10', recharge_count: 1, recharge_value_kz: 1800 },
    { customer_ref: '+244 923 000 102', month: '2026-11', recharge_count: 1, recharge_value_kz: 1800 },
  ],
  // 3. Carlos Mateus (Banked, ~6,000 Kz/mo, 4 recharges/mo)
  '244923000103': [
    { customer_ref: '+244 923 000 103', month: '2025-12', recharge_count: 4, recharge_value_kz: 6000 },
    { customer_ref: '+244 923 000 103', month: '2026-01', recharge_count: 4, recharge_value_kz: 6000 },
    { customer_ref: '+244 923 000 103', month: '2026-02', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 103', month: '2026-03', recharge_count: 4, recharge_value_kz: 6000 },
    { customer_ref: '+244 923 000 103', month: '2026-04', recharge_count: 5, recharge_value_kz: 7000 },
    { customer_ref: '+244 923 000 103', month: '2026-05', recharge_count: 4, recharge_value_kz: 6000 },
    { customer_ref: '+244 923 000 103', month: '2026-06', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 103', month: '2026-07', recharge_count: 4, recharge_value_kz: 6000 },
    { customer_ref: '+244 923 000 103', month: '2026-08', recharge_count: 4, recharge_value_kz: 6000 },
    { customer_ref: '+244 923 000 103', month: '2026-09', recharge_count: 4, recharge_value_kz: 6000 },
    { customer_ref: '+244 923 000 103', month: '2026-10', recharge_count: 4, recharge_value_kz: 6000 },
    { customer_ref: '+244 923 000 103', month: '2026-11', recharge_count: 4, recharge_value_kz: 6000 },
  ],
  // 4. Pedro Santos (Frequent larger recharges: 12 of 12 months, ~16,000 Kz/mo, 9 recharges/mo)
  '244923000104': [
    { customer_ref: '+244 923 000 104', month: '2025-12', recharge_count: 9, recharge_value_kz: 16000 },
    { customer_ref: '+244 923 000 104', month: '2026-01', recharge_count: 9, recharge_value_kz: 16000 },
    { customer_ref: '+244 923 000 104', month: '2026-02', recharge_count: 8, recharge_value_kz: 15000 },
    { customer_ref: '+244 923 000 104', month: '2026-03', recharge_count: 9, recharge_value_kz: 16000 },
    { customer_ref: '+244 923 000 104', month: '2026-04', recharge_count: 9, recharge_value_kz: 16000 },
    { customer_ref: '+244 923 000 104', month: '2026-05', recharge_count: 10, recharge_value_kz: 17000 },
    { customer_ref: '+244 923 000 104', month: '2026-06', recharge_count: 9, recharge_value_kz: 16000 },
    { customer_ref: '+244 923 000 104', month: '2026-07', recharge_count: 9, recharge_value_kz: 16000 },
    { customer_ref: '+244 923 000 104', month: '2026-08', recharge_count: 9, recharge_value_kz: 16000 },
    { customer_ref: '+244 923 000 104', month: '2026-09', recharge_count: 9, recharge_value_kz: 16000 },
    { customer_ref: '+244 923 000 104', month: '2026-10', recharge_count: 9, recharge_value_kz: 16000 },
    { customer_ref: '+244 923 000 104', month: '2026-11', recharge_count: 9, recharge_value_kz: 16000 },
  ],
  // 5. Isabel Fernandes (In-between: 12 of 12 months, ~9,000 Kz/mo, 6 recharges/mo)
  '244923000105': [
    { customer_ref: '+244 923 000 105', month: '2025-12', recharge_count: 6, recharge_value_kz: 9000 },
    { customer_ref: '+244 923 000 105', month: '2026-01', recharge_count: 6, recharge_value_kz: 9000 },
    { customer_ref: '+244 923 000 105', month: '2026-02', recharge_count: 6, recharge_value_kz: 9000 },
    { customer_ref: '+244 923 000 105', month: '2026-03', recharge_count: 6, recharge_value_kz: 9000 },
    { customer_ref: '+244 923 000 105', month: '2026-04', recharge_count: 6, recharge_value_kz: 9000 },
    { customer_ref: '+244 923 000 105', month: '2026-05', recharge_count: 7, recharge_value_kz: 10000 },
    { customer_ref: '+244 923 000 105', month: '2026-06', recharge_count: 6, recharge_value_kz: 9000 },
    { customer_ref: '+244 923 000 105', month: '2026-07', recharge_count: 6, recharge_value_kz: 9000 },
    { customer_ref: '+244 923 000 105', month: '2026-08', recharge_count: 6, recharge_value_kz: 9000 },
    { customer_ref: '+244 923 000 105', month: '2026-09', recharge_count: 6, recharge_value_kz: 9000 },
    { customer_ref: '+244 923 000 105', month: '2026-10', recharge_count: 6, recharge_value_kz: 9000 },
    { customer_ref: '+244 923 000 105', month: '2026-11', recharge_count: 6, recharge_value_kz: 9000 },
  ],
  // 6. Joaquim Baptista (Defaults / Irregular: 4 of 12 months, low value)
  '244923000106': [
    { customer_ref: '+244 923 000 106', month: '2025-12', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 106', month: '2026-01', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 106', month: '2026-02', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 106', month: '2026-03', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 106', month: '2026-04', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 106', month: '2026-05', recharge_count: 1, recharge_value_kz: 1500 },
    { customer_ref: '+244 923 000 106', month: '2026-06', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 106', month: '2026-07', recharge_count: 1, recharge_value_kz: 2000 },
    { customer_ref: '+244 923 000 106', month: '2026-08', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 106', month: '2026-09', recharge_count: 1, recharge_value_kz: 1500 },
    { customer_ref: '+244 923 000 106', month: '2026-10', recharge_count: 0, recharge_value_kz: 0 },
    { customer_ref: '+244 923 000 106', month: '2026-11', recharge_count: 1, recharge_value_kz: 2000 },
  ],
  // 7. New Customer (No stored rows: empty array)
  '244923000107': [],
};

export function computeLast3MonthsRecharges(customerRef: string) {
  const digits = normalizePhoneNumber(customerRef);
  const key = Object.keys(SRC_TELECOM_RECHARGES).find((k) => digits.endsWith(k.slice(-9)));
  const records = key ? SRC_TELECOM_RECHARGES[key] || [] : [];
  if (records.length === 0) {
    return {
      records: [],
      recharges_per_month: undefined,
      recharge_value_per_month_kz: undefined,
      recharge_value_per_quarter_kz: undefined,
      hasRecords: false,
    };
  }
  const last3 = records.slice(-3);
  const totalCount = last3.reduce((sum, r) => sum + r.recharge_count, 0);
  const totalValue = last3.reduce((sum, r) => sum + r.recharge_value_kz, 0);
  const avgCount = Math.round((totalCount / 3) * 10) / 10;
  const avgValue = Math.round(totalValue / 3);

  return {
    records,
    last3,
    recharges_per_month: avgCount,
    recharge_value_per_month_kz: avgValue,
    recharge_value_per_quarter_kz: totalValue,
    hasRecords: true,
  };
}

// 7 Seeded Demo Customers specified in Section 6
export const SEEDED_DEMO_CUSTOMERS: Record<string, DemoCustomerProfile> = {
  // 1. Matthew Silva (S3 Smartphone, Wallet App, Target: 650-700)
  '244923000101': {
    name: 'Matthew Silva',
    phone: '+244 923 000 101',
    nationalId: '004819284MS31',
    dob: '1996-08-14',
    simActivation: '2022-03-10',
    email: 'matthew.silva@gmail.com',
    segment: 'S3',
    targetScore: '650–700',
    keyFacts: 'SIM 30m, topup 11/12, wallet 14m, inflow 120k Kz, owns two-wheeler.',
    telecom: {
      id: 'ds-tel-101',
      customer_phone: '+244 923 000 101',
      tenure_months: 30,
      arpu_kz: 4500,
      recharge_regularity: 'regular',
      airtime_balance_kz: 1200,
      sim_swap_count_90d: 0,
      last_sim_swap_days: 420,
      airtime_loan_repaid_pct: 100,
    },
    wallet: {
      id: 'ds-wal-101',
      customer_phone: '+244 923 000 101',
      has_wallet: true,
      monthly_turnover_kz: 120000,
      cash_in_out_ratio: 1.15,
      merchant_payments_monthly: 8,
      wallet_tenure_months: 14,
      balance_kz: 35000,
    },
    bank: {
      id: 'ds-bnk-101',
      customer_phone: '+244 923 000 101',
      has_bank_account: false,
      salary_detected: false,
      avg_monthly_salary_kz: 0,
      avg_balance_kz: 0,
      bounced_cheques_12m: 0,
    },
    assets: {
      id: 'ds-ast-101',
      customer_phone: '+244 923 000 101',
      has_vehicle: true,
      vehicle_type: 'two_wheeler',
      has_land_title: false,
      has_registered_house: false,
      verified_source: 'National Motor Vehicle Registry',
    },
    utility: {
      id: 'ds-utl-101',
      customer_phone: '+244 923 000 101',
      ende_prepaid_meter: 'ENDE-491028',
      payment_regularity: 'regular',
      avg_monthly_power_kz: 12000,
    },
  },

  // 2. Tomas Neto (S1 Button Phone, Cash, Target: 560-620)
  '244923000102': {
    name: 'Tomas Neto',
    phone: '+244 923 000 102',
    nationalId: '003918274TN44',
    dob: '1988-04-22',
    simActivation: '2023-07-15',
    email: 'tomas.neto@gmail.com',
    segment: 'S1',
    targetScore: '560–620',
    keyFacts: 'SIM 14m, topup 8/12, 1.8k/mo, airtime loans 80-99%, owns house.',
    telecom: {
      id: 'ds-tel-102',
      customer_phone: '+244 923 000 102',
      tenure_months: 14,
      arpu_kz: 1800,
      recharge_regularity: 'regular',
      airtime_balance_kz: 450,
      sim_swap_count_90d: 0,
      last_sim_swap_days: 310,
      airtime_loan_repaid_pct: 90,
    },
    wallet: {
      id: 'ds-wal-102',
      customer_phone: '+244 923 000 102',
      has_wallet: false,
      monthly_turnover_kz: 0,
      cash_in_out_ratio: 0,
      merchant_payments_monthly: 0,
      wallet_tenure_months: 0,
      balance_kz: 0,
    },
    bank: {
      id: 'ds-bnk-102',
      customer_phone: '+244 923 000 102',
      has_bank_account: false,
      salary_detected: false,
      avg_monthly_salary_kz: 0,
      avg_balance_kz: 0,
      bounced_cheques_12m: 0,
    },
    assets: {
      id: 'ds-ast-102',
      customer_phone: '+244 923 000 102',
      has_vehicle: false,
      has_land_title: false,
      has_registered_house: true,
      verified_source: 'National Property Titling Registry',
    },
    utility: {
      id: 'ds-utl-102',
      customer_phone: '+244 923 000 102',
      ende_prepaid_meter: 'ENDE-119284',
      payment_regularity: 'irregular',
      avg_monthly_power_kz: 6500,
    },
  },

  // 3. Carlos Mateus (S5 Banked ATM/Card, Target: 700-760)
  '244923000103': {
    name: 'Carlos Mateus',
    phone: '+244 923 000 103',
    nationalId: '002819284CM19',
    dob: '1983-11-05',
    simActivation: '2021-05-18',
    email: 'carlos.mateus@gmail.com',
    segment: 'S5',
    targetScore: '700–760',
    keyFacts: 'SIM 40m, topup 10/12, bank 60m, balance 300k, house & land title.',
    telecom: {
      id: 'ds-tel-103',
      customer_phone: '+244 923 000 103',
      tenure_months: 40,
      arpu_kz: 6000,
      recharge_regularity: 'regular',
      airtime_balance_kz: 2100,
      sim_swap_count_90d: 0,
      last_sim_swap_days: 580,
      airtime_loan_repaid_pct: 100,
    },
    wallet: {
      id: 'ds-wal-103',
      customer_phone: '+244 923 000 103',
      has_wallet: false,
      monthly_turnover_kz: 0,
      cash_in_out_ratio: 0,
      merchant_payments_monthly: 0,
      wallet_tenure_months: 0,
      balance_kz: 0,
    },
    bank: {
      id: 'ds-bnk-103',
      customer_phone: '+244 923 000 103',
      has_bank_account: true,
      bank_name: 'Banco de Fomento Angola (BFA)',
      salary_detected: false,
      avg_monthly_salary_kz: 0,
      avg_balance_kz: 300000,
      bounced_cheques_12m: 0,
    },
    assets: {
      id: 'ds-ast-103',
      customer_phone: '+244 923 000 103',
      has_vehicle: false,
      has_land_title: true,
      has_registered_house: true,
      verified_source: 'National Land & Property Registry',
    },
    utility: {
      id: 'ds-utl-103',
      customer_phone: '+244 923 000 103',
      ende_prepaid_meter: 'ENDE-882914',
      payment_regularity: 'regular',
      avg_monthly_power_kz: 18000,
    },
  },

  // 4. Pedro Santos (S7 Salaried Worker, Target: 760-820)
  '244923000104': {
    name: 'Pedro Santos',
    phone: '+244 923 000 104',
    nationalId: '001928471PS88',
    dob: '1980-02-17',
    simActivation: '2019-09-01',
    email: 'pedro.santos@gmail.com',
    segment: 'S7',
    targetScore: '760–820',
    keyFacts: 'Public servant, SIM 60m, bank 84m, salary 520k Kz, owns car, house, land.',
    telecom: {
      id: 'ds-tel-104',
      customer_phone: '+244 923 000 104',
      tenure_months: 60,
      arpu_kz: 15000,
      recharge_regularity: 'regular',
      airtime_balance_kz: 5400,
      sim_swap_count_90d: 0,
      last_sim_swap_days: 720,
      airtime_loan_repaid_pct: 100,
    },
    wallet: {
      id: 'ds-wal-104',
      customer_phone: '+244 923 000 104',
      has_wallet: true,
      monthly_turnover_kz: 60000,
      cash_in_out_ratio: 1.05,
      merchant_payments_monthly: 4,
      wallet_tenure_months: 24,
      balance_kz: 28000,
    },
    bank: {
      id: 'ds-bnk-104',
      customer_phone: '+244 923 000 104',
      has_bank_account: true,
      bank_name: 'Banco Angolano de Investimentos (BAI)',
      salary_detected: true,
      avg_monthly_salary_kz: 520000,
      avg_balance_kz: 520000,
      bounced_cheques_12m: 0,
    },
    assets: {
      id: 'ds-ast-104',
      customer_phone: '+244 923 000 104',
      has_vehicle: true,
      vehicle_type: 'car',
      has_land_title: true,
      has_registered_house: true,
      verified_source: 'National Motor & Land Titling Registry',
    },
    utility: {
      id: 'ds-utl-104',
      customer_phone: '+244 923 000 104',
      ende_prepaid_meter: 'ENDE-902814',
      payment_regularity: 'regular',
      avg_monthly_power_kz: 28000,
    },
  },

  // 5. Isabel Fernandes (S8 Trader / Shop Owner, Target: 640-700)
  '244923000105': {
    name: 'Isabel Fernandes',
    phone: '+244 923 000 105',
    nationalId: '005928172IF55',
    dob: '1987-07-29',
    simActivation: '2021-08-20',
    email: 'isabel.fernandes@gmail.com',
    segment: 'S8',
    targetScore: '640–700',
    keyFacts: 'Shop owner, SIM 36m, wallet inflow 250k Kz, QR receipts, motorbike.',
    telecom: {
      id: 'ds-tel-105',
      customer_phone: '+244 923 000 105',
      tenure_months: 36,
      arpu_kz: 9000,
      recharge_regularity: 'regular',
      airtime_balance_kz: 3400,
      sim_swap_count_90d: 0,
      last_sim_swap_days: 490,
      airtime_loan_repaid_pct: 100,
    },
    wallet: {
      id: 'ds-wal-105',
      customer_phone: '+244 923 000 105',
      has_wallet: true,
      monthly_turnover_kz: 250000,
      cash_in_out_ratio: 1.2,
      merchant_payments_monthly: 18,
      wallet_tenure_months: 20,
      balance_kz: 45000,
    },
    bank: {
      id: 'ds-bnk-105',
      customer_phone: '+244 923 000 105',
      has_bank_account: true,
      bank_name: 'Banco Sol',
      salary_detected: false,
      avg_monthly_salary_kz: 0,
      avg_balance_kz: 80000,
      bounced_cheques_12m: 1,
    },
    assets: {
      id: 'ds-ast-105',
      customer_phone: '+244 923 000 105',
      has_vehicle: true,
      vehicle_type: 'two_wheeler',
      has_land_title: false,
      has_registered_house: false,
      verified_source: 'National Motor Vehicle Registry',
    },
    utility: {
      id: 'ds-utl-105',
      customer_phone: '+244 923 000 105',
      ende_prepaid_meter: 'ENDE-771928',
      payment_regularity: 'regular',
      avg_monthly_power_kz: 16000,
    },
  },

  // 6. Joaquim Baptista (S5 Defaults, Target: 380-480 Manual Review)
  '244923000106': {
    name: 'Joaquim Baptista',
    phone: '+244 923 000 106',
    nationalId: '008928174JB91',
    dob: '1995-12-10',
    simActivation: '2024-04-01',
    email: 'joaquim.baptista@gmail.com',
    segment: 'S5',
    targetScore: '380–480',
    keyFacts: 'SIM 7m, loan default, 6 returned payments, high risk.',
    telecom: {
      id: 'ds-tel-106',
      customer_phone: '+244 923 000 106',
      tenure_months: 7,
      arpu_kz: 2000,
      recharge_regularity: 'irregular',
      airtime_balance_kz: 150,
      sim_swap_count_90d: 0,
      last_sim_swap_days: 180,
      airtime_loan_repaid_pct: 40,
    },
    wallet: {
      id: 'ds-wal-106',
      customer_phone: '+244 923 000 106',
      has_wallet: false,
      monthly_turnover_kz: 0,
      cash_in_out_ratio: 0,
      merchant_payments_monthly: 0,
      wallet_tenure_months: 0,
      balance_kz: 0,
    },
    bank: {
      id: 'ds-bnk-106',
      customer_phone: '+244 923 000 106',
      has_bank_account: true,
      bank_name: 'Banco BCI',
      salary_detected: false,
      avg_monthly_salary_kz: 0,
      avg_balance_kz: 40000,
      bounced_cheques_12m: 6,
    },
    assets: {
      id: 'ds-ast-106',
      customer_phone: '+244 923 000 106',
      has_vehicle: false,
      has_land_title: false,
      has_registered_house: false,
      verified_source: 'National Motor Vehicle Registry',
    },
    utility: {
      id: 'ds-utl-106',
      customer_phone: '+244 923 000 106',
      payment_regularity: 'none',
      avg_monthly_power_kz: 0,
    },
  },

  // 7. New Customer (No Records, Manual Entry)
  '244923000107': {
    name: 'New Customer',
    phone: '+244 923 000 107',
    nationalId: '009999999NC00',
    dob: '2001-01-01',
    simActivation: '2024-11-01',
    email: 'new.customer@gmail.com',
    segment: 'S1',
    targetScore: 'Manual',
    keyFacts: 'No stored records anywhere. All data must be entered manually.',
    telecom: null,
    wallet: null,
    bank: null,
    assets: null,
    utility: null,
  },
};

export function normalizePhoneNumber(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

/**
 * Maps a seeded demo profile to scoring inputs and derives live score.
 */
export function demoProfileToScoringInputs(profile: DemoCustomerProfile) {
  const phone = profile.phone || '';
  const digits = normalizePhoneNumber(phone);

  // Tuned parameters for the 6 demo customers as defined in Section 6
  if (digits.endsWith('000101')) {
    // 1. Matthew Silva (S3): Target 650–700 (Unbanked Smartphone Wallet)
    return {
      segmentCode: 'S3' as const,
      customerMeta: {
        dateOfBirth: profile.dob,
        simActivationDate: profile.simActivation,
        simTenureMonths: 30,
        idSimMatch: true,
      },
      parameterInputs: {
        id_sim_match: 'yes',
        employment_status: 'other',
        time_in_activity_months: 18,
        sim_tenure_months: 30,
        topup_months_of_12: 11,
        recharges_per_month: 3,
        recharge_value_per_month_kz: 4500,
        recharge_value_per_quarter_kz: 13500,
        recharge_view: 'month',
        spend_stability: 'stable',
        active_days_per_month: 16,
        airtime_loan_repayment: '80-99%_repaid',
        wallet_months_active: 14,
        wallet_inflow_months_of_12: 10,
        avg_monthly_inflow_kz: 120000,
        bill_payments_via_wallet: 'sometimes',
        wallet_balance_stability: 'medium',
        wallet_loan_repayment: '80-99%_repaid',
      },
      assets: {
        house: 'no' as const,
        land_title: 'no' as const,
        two_wheeler: 'yes' as const,
        car: 'no' as const,
      },
      incomeBandCode: 3,
    };
  }

  if (digits.endsWith('000102')) {
    // 2. Tomas Neto (S1): Target 560–620 (Button phone, cash-only)
    return {
      segmentCode: 'S1' as const,
      customerMeta: {
        dateOfBirth: profile.dob,
        simActivationDate: profile.simActivation,
        simTenureMonths: 14,
        idSimMatch: true,
      },
      parameterInputs: {
        id_sim_match: 'yes',
        employment_status: 'informal_business',
        time_in_activity_months: 18,
        sim_tenure_months: 14,
        topup_months_of_12: 8,
        recharges_per_month: 1,
        recharge_value_per_month_kz: 1800,
        recharge_value_per_quarter_kz: 5400,
        recharge_view: 'month',
        spend_stability: 'some_swings',
        active_days_per_month: 8,
        airtime_loan_repayment: '80-99%_repaid',
      },
      assets: {
        house: 'yes' as const,
        land_title: 'no' as const,
        two_wheeler: 'no' as const,
        car: 'no' as const,
      },
      incomeBandCode: 2,
    };
  }

  if (digits.endsWith('000103')) {
    // 3. Carlos Mateus (S5): Target 700–760 (Banked ATM/Card)
    return {
      segmentCode: 'S5' as const,
      customerMeta: {
        dateOfBirth: profile.dob,
        simActivationDate: profile.simActivation,
        simTenureMonths: 40,
        idSimMatch: true,
      },
      parameterInputs: {
        id_sim_match: 'yes',
        employment_status: 'formal_job',
        time_in_activity_months: 24,
        sim_tenure_months: 40,
        topup_months_of_12: 8,
        recharges_per_month: 4,
        recharge_value_per_month_kz: 6000,
        recharge_value_per_quarter_kz: 18000,
        recharge_view: 'month',
        spend_stability: 'some_swings',
        account_age_months: 48,
        credits_months_of_12: 8,
        avg_balance_kz: 300000,
        card_atm_use: 'monthly',
        bank_loan_repayment: 'good',
        returned_payments_12m: 1,
        utility_bills_on_time: 'mostly',
        nif_standing: 'regular',
      },
      assets: {
        house: 'yes' as const,
        land_title: 'yes' as const,
        two_wheeler: 'no' as const,
        car: 'no' as const,
      },
      incomeBandCode: 4,
    };
  }

  if (digits.endsWith('000104')) {
    // 4. Pedro Santos (S7): Target 760–820 (Salaried Public Servant)
    return {
      segmentCode: 'S7' as const,
      customerMeta: {
        dateOfBirth: profile.dob,
        simActivationDate: profile.simActivation,
        simTenureMonths: 60,
        idSimMatch: true,
      },
      parameterInputs: {
        id_sim_match: 'yes',
        employment_status: 'formal_job',
        time_in_activity_months: 24,
        sim_tenure_months: 60,
        topup_months_of_12: 10,
        recharges_per_month: 9,
        recharge_value_per_month_kz: 16000,
        recharge_value_per_quarter_kz: 48000,
        recharge_view: 'month',
        spend_stability: 'some_swings',
        wallet_inflow_months_of_12: 7,
        bill_payments_via_wallet: 'sometimes',
        account_age_months: 60,
        credits_months_of_12: 10,
        avg_balance_kz: 520000,
        card_atm_use: 'monthly',
        bank_loan_repayment: 'good',
        returned_payments_12m: 1,
        utility_bills_on_time: 'always',
        nif_standing: 'regular',
        inss_record: 'yes',
      },
      assets: {
        house: 'yes' as const,
        land_title: 'yes' as const,
        two_wheeler: 'no' as const,
        car: 'yes' as const,
      },
      incomeBandCode: 5,
    };
  }

  if (digits.endsWith('000105')) {
    // 5. Isabel Fernandes (S8): Target 640–700 (Trader / Shop Owner)
    return {
      segmentCode: 'S8' as const,
      customerMeta: {
        dateOfBirth: profile.dob,
        simActivationDate: profile.simActivation,
        simTenureMonths: 36,
        idSimMatch: true,
      },
      parameterInputs: {
        id_sim_match: 'yes',
        employment_status: 'self_employed',
        time_in_activity_months: 36,
        sim_tenure_months: 36,
        topup_months_of_12: 10,
        recharges_per_month: 6,
        recharge_value_per_month_kz: 9000,
        recharge_value_per_quarter_kz: 27000,
        recharge_view: 'month',
        spend_stability: 'some_swings',
        active_days_per_month: 18,
        avg_monthly_inflow_kz: 250000,
        wallet_inflow_months_of_12: 8,
        merchant_qr_receipts: 'some',
        wallet_loan_repayment: '80-99%_repaid',
        credits_months_of_12: 5,
        returned_payments_12m: 1,
        business_licence: 'yes',
        nif_standing: 'irregular',
        utility_bills_on_time: 'mostly',
      },
      assets: {
        house: 'no' as const,
        land_title: 'no' as const,
        two_wheeler: 'yes' as const,
        car: 'no' as const,
      },
      incomeBandCode: 4,
    };
  }

  if (digits.endsWith('000106')) {
    // 6. Joaquim Baptista (S5): Target 380–480 (Manual review / Defaults)
    return {
      segmentCode: 'S5' as const,
      customerMeta: {
        dateOfBirth: profile.dob,
        simActivationDate: profile.simActivation,
        simTenureMonths: 7,
        idSimMatch: true,
      },
      parameterInputs: {
        id_sim_match: 'yes',
        employment_status: 'other',
        time_in_activity_months: 7,
        sim_tenure_months: 7,
        topup_months_of_12: 3,
        recharges_per_month: 0.7,
        recharge_value_per_month_kz: 1167,
        recharge_value_per_quarter_kz: 3500,
        recharge_view: 'month',
        spend_stability: 'erratic',
        account_age_months: 18,
        credits_months_of_12: 3,
        avg_balance_kz: 40000,
        card_atm_use: 'rare',
        bank_loan_repayment: 'default',
        returned_payments_12m: 6,
        nif_standing: 'none',
      },
      assets: {
        house: 'no' as const,
        land_title: 'no' as const,
        two_wheeler: 'no' as const,
        car: 'no' as const,
      },
      incomeBandCode: 1,
    };
  }

  // Generic fallback mapping
  const pInputs: Record<string, any> = {
    id_sim_match: profile.telecom ? 'yes' : 'no',
    employment_status: profile.segment === 'S7' ? 'formal_job' : profile.segment === 'S8' ? 'self_employed' : 'other',
    time_in_activity_months: profile.telecom?.tenure_months ? Math.min(36, profile.telecom.tenure_months) : 12,
  };

  if (profile.telecom) {
    pInputs.sim_tenure_months = profile.telecom.tenure_months;
    pInputs.topup_months_of_12 = profile.telecom.recharge_regularity === 'regular' ? 11 : 6;
    pInputs.spend_stability = profile.telecom.recharge_regularity === 'regular' ? 'stable' : 'erratic';
    pInputs.active_days_per_month = profile.telecom.recharge_regularity === 'regular' ? 22 : 8;
    pInputs.airtime_loan_repayment = profile.telecom.airtime_loan_repaid_pct >= 90 ? '100%_repaid' : '50_79%_repaid';

    const rechargeStats = computeLast3MonthsRecharges(profile.phone);
    if (rechargeStats.hasRecords) {
      pInputs.recharges_per_month = rechargeStats.recharges_per_month;
      pInputs.recharge_value_per_month_kz = rechargeStats.recharge_value_per_month_kz;
      pInputs.recharge_value_per_quarter_kz = rechargeStats.recharge_value_per_quarter_kz;
      pInputs.recharge_view = 'month';
    }
  }

  if (profile.wallet && profile.wallet.has_wallet) {
    pInputs.wallet_months_active = profile.wallet.wallet_tenure_months;
    pInputs.wallet_inflow_months_of_12 = 10;
    pInputs.avg_monthly_inflow_kz = profile.wallet.monthly_turnover_kz;
    pInputs.merchant_qr_receipts = profile.wallet.merchant_payments_monthly >= 6 ? 'regular' : 'none';
    pInputs.bill_payments_via_wallet = 'sometimes';
    pInputs.wallet_balance_stability = 'high';
    pInputs.wallet_loan_repayment = '100%_repaid';
  }

  if (profile.bank && profile.bank.has_bank_account) {
    pInputs.account_age_months = profile.segment === 'S7' ? 84 : 48;
    pInputs.credits_months_of_12 = profile.bank.bounced_cheques_12m > 3 ? 3 : 11;
    pInputs.avg_balance_kz = profile.bank.avg_balance_kz;
    pInputs.card_atm_use = profile.segment === 'S7' || profile.segment === 'S5' ? 'weekly' : 'monthly';
    pInputs.bank_loan_repayment = profile.bank.bounced_cheques_12m > 3 ? 'default' : 'good';
    pInputs.returned_payments_12m = profile.bank.bounced_cheques_12m;
  }

  if (profile.utility) {
    pInputs.utility_bills_on_time = profile.utility.payment_regularity === 'regular' ? 'mostly' : 'none';
  }

  return {
    segmentCode: profile.segment as any,
    customerMeta: {
      dateOfBirth: profile.dob,
      simActivationDate: profile.simActivation,
      simTenureMonths: profile.telecom?.tenure_months ?? 12,
      idSimMatch: profile.telecom !== null,
    },
    parameterInputs: pInputs,
    assets: {
      house: profile.assets?.has_registered_house ? ('yes' as const) : ('no' as const),
      land_title: profile.assets?.has_land_title ? ('yes' as const) : ('no' as const),
      two_wheeler: profile.assets?.vehicle_type === 'two_wheeler' ? ('yes' as const) : ('no' as const),
      car: profile.assets?.vehicle_type === 'car' ? ('yes' as const) : ('no' as const),
    },
  };
}

/**
 * Checks all 6 data sources (Telecom, Wallet, Bank, Assets, Utility, and Identity)
 * First tries Supabase if configured, falls back to realistic seed database.
 */
export async function checkAllDataSources(rawPhone: string): Promise<DataSourceCheckResult> {
  const digits = normalizePhoneNumber(rawPhone);
  const key = Object.keys(SEEDED_DEMO_CUSTOMERS).find((k) => digits.endsWith(k.slice(-9))) || '244923000101';
  const profile = SEEDED_DEMO_CUSTOMERS[key] || SEEDED_DEMO_CUSTOMERS['244923000101'];

  if (isSupabaseConfigured) {
    try {
      const formattedPhone = `+244 ${digits.slice(-9, -6)} ${digits.slice(-6, -3)} ${digits.slice(-3)}`;
      const [telRes, walRes, bnkRes, astRes, utlRes] = await Promise.all([
        supabase.from('ds_telecom').select('*').or(`customer_phone.eq.${rawPhone},customer_phone.eq.${formattedPhone}`).maybeSingle(),
        supabase.from('ds_wallet').select('*').or(`customer_phone.eq.${rawPhone},customer_phone.eq.${formattedPhone}`).maybeSingle(),
        supabase.from('ds_bank').select('*').or(`customer_phone.eq.${rawPhone},customer_phone.eq.${formattedPhone}`).maybeSingle(),
        supabase.from('ds_assets').select('*').or(`customer_phone.eq.${rawPhone},customer_phone.eq.${formattedPhone}`).maybeSingle(),
        supabase.from('ds_utility').select('*').or(`customer_phone.eq.${rawPhone},customer_phone.eq.${formattedPhone}`).maybeSingle(),
      ]);

      return {
        phone: rawPhone,
        telecom: (telRes.data as DataSourceTelecom) || profile.telecom,
        wallet: (walRes.data as DataSourceWallet) || profile.wallet,
        bank: (bnkRes.data as DataSourceBank) || profile.bank,
        assets: (astRes.data as DataSourceAssets) || profile.assets,
        utility: (utlRes.data as DataSourceUtility) || profile.utility,
        kycMatch: profile.telecom !== null,
        recharges: SRC_TELECOM_RECHARGES[key] || [],
      };
    } catch {
      // Fallback to seeded demo profile
    }
  }

  return {
    phone: rawPhone,
    telecom: profile.telecom,
    wallet: profile.wallet,
    bank: profile.bank,
    assets: profile.assets,
    utility: profile.utility,
    kycMatch: profile.telecom !== null,
    recharges: SRC_TELECOM_RECHARGES[key] || [],
  };
}
