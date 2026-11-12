import {
  DEFAULT_SCORING_CONFIG,
  PRODUCT_CATALOG,
  buildNotificationDrafts,
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

// Deterministic PRNG (Mulberry32) so all 300 customers are reproducible across browser and Supabase seed
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES_M = [
  'António', 'Manuel', 'José', 'Carlos', 'Domingos', 'Francisco', 'Paulo', 'Mateus',
  'Fernando', 'Jorge', 'Miguel', 'Rafael', 'Tiago', 'Eduardo', 'Hélder', 'Bernardo',
  'Mário', 'Lourenço', 'Sebastião', 'Adriano', 'Valter', 'Wilson', 'Osvaldo', 'Sérgio',
];

const FIRST_NAMES_F = [
  'Maria', 'Ana', 'Rosa', 'Teresa', 'Isabel', 'Helena', 'Beatriz', 'Cláudia',
  'Esperança', 'Fátima', 'Graça', 'Inês', 'Joana', 'Lúcia', 'Margarida', 'Natália',
  'Patrícia', 'Raquel', 'Sofia', 'Vânia', 'Zulmira', 'Amélia', 'Célia', 'Neusa',
];

const SURNAMES = [
  'Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins',
  'Sousa', 'Fernandes', 'Gonçalves', 'Gomes', 'Lopes', 'Marques', 'Alves', 'Ribeiro',
  'Kiala', 'Neto', 'Tavares', 'Mendes', 'Carvalho', 'Domingos', 'Baptista', 'Nzinga',
  'Cândida', 'Kwanza', 'Borges', 'Pinto', 'Teixeira', 'Monteiro',
];

const CITIES = [
  { name: 'Luanda', code: 'LA', weight: 0.44 },
  { name: 'Benguela', code: 'BG', weight: 0.16 },
  { name: 'Huambo', code: 'HB', weight: 0.15 },
  { name: 'Lubango', code: 'LB', weight: 0.12 },
  { name: 'Cabinda', code: 'CB', weight: 0.07 },
  { name: 'Malanje', code: 'MJ', weight: 0.06 },
];

const STREETS = [
  'Rua Comandante Gika',
  'Avenida 4 de Fevereiro',
  'Rua Ho Chi Minh',
  'Avenida Deolinda Rodrigues',
  'Rua Major Kanhangulo',
  'Bairro Azul, Casa',
  'Urbanização Nova Vida, Bloco',
  'Rua Amílcar Cabral',
];

function pickCity(rng: () => number): { name: string; code: string } {
  const r = rng();
  let acc = 0;
  for (const c of CITIES) {
    acc += c.weight;
    if (r <= acc) return c;
  }
  return CITIES[0];
}

function pad(n: number, len: number): string {
  return String(n).padStart(len, '0');
}

function isoDateMonthsAgo(monthsAgo: number, day: number): string {
  const base = new Date('2026-11-12T00:00:00Z');
  base.setUTCMonth(base.getUTCMonth() - monthsAgo);
  base.setUTCDate(Math.min(28, Math.max(1, day)));
  return base.toISOString().slice(0, 10);
}

export function buildPersonas(): CustomerProfile[] {
  const personas: CustomerProfile[] = [
    {
      customer: {
        id: 'cust-001',
        mobile_no: '+244 923 100 001',
        full_name: 'Thomas Mateus',
        bi_number: '004198201LA041',
        date_of_birth: '1988-04-19',
        gender: 'M',
        city: 'Luanda',
      },
      telecom: {
        mobile_no: '+244 923 100 001',
        sim_activation_date: '2022-10-15',
        avg_monthly_topup_aoa: 38_000,
        topup_months_last_12: 12,
        avg_monthly_spend_aoa: 35_000,
        spend_variability: 0.14,
        airtime_loans_taken: 4,
        airtime_loans_repaid_on_time: 4,
        airtime_loans_unpaid: 0,
        sim_registered_with_bi: true,
      },
      mobileMoney: {
        mobile_no: '+244 923 100 001',
        wallet_exists: true,
        registration_level: 'kyc',
        monthly_inflow_aoa: 420_000,
        monthly_outflow_aoa: 290_000,
        avg_balance_aoa: 850_000,
        txn_count_90d: 44,
        failed_txn_count_90d: 0,
      },
      identity: {
        mobile_no: '+244 923 100 001',
        bi_number: '004198201LA041',
        id_verified: true,
        id_issue_date: '2021-05-12',
        id_issue_place: 'Luanda',
        address: 'Urbanização Nova Vida, Rua 14, Luanda',
        address_verified: true,
      },
      tax: {
        mobile_no: '+244 923 100 001',
        nif: '004198201LA041',
        nif_status: 'active',
        tax_filing_status: 'regular',
      },
    },
    {
      customer: {
        id: 'cust-002',
        mobile_no: '+244 923 100 002',
        full_name: 'Maria Cândida',
        bi_number: '005284910BG043',
        date_of_birth: '1991-08-11',
        gender: 'F',
        city: 'Benguela',
      },
      telecom: {
        mobile_no: '+244 923 100 002',
        sim_activation_date: '2023-10-10',
        avg_monthly_topup_aoa: 14_000,
        topup_months_last_12: 10,
        avg_monthly_spend_aoa: 11_500,
        spend_variability: 0.3,
        airtime_loans_taken: 2,
        airtime_loans_repaid_on_time: 2,
        airtime_loans_unpaid: 0,
        sim_registered_with_bi: true,
      },
      mobileMoney: {
        mobile_no: '+244 923 100 002',
        wallet_exists: true,
        registration_level: 'basic',
        monthly_inflow_aoa: 4_500,
        monthly_outflow_aoa: 3_800,
        avg_balance_aoa: 5_200,
        txn_count_90d: 2,
        failed_txn_count_90d: 0,
      },
      identity: {
        mobile_no: '+244 923 100 002',
        bi_number: '005284910BG043',
        id_verified: true,
        id_issue_date: '2022-02-20',
        id_issue_place: 'Benguela',
        address: 'Bairro da Graça, Benguela',
        address_verified: false,
      },
      tax: {
        mobile_no: '+244 923 100 002',
        nif: '005284910BG043',
        nif_status: 'none',
        tax_filing_status: 'none',
      },
    },
    {
      customer: {
        id: 'cust-003',
        mobile_no: '+244 923 100 003',
        full_name: 'João Baptista',
        bi_number: '006910234HB048',
        date_of_birth: '2001-01-27',
        gender: 'M',
        city: 'Huambo',
      },
      telecom: {
        mobile_no: '+244 923 100 003',
        sim_activation_date: '2026-09-05',
        avg_monthly_topup_aoa: 1_800,
        topup_months_last_12: 2,
        avg_monthly_spend_aoa: 1_600,
        spend_variability: 0.78,
        airtime_loans_taken: 0,
        airtime_loans_repaid_on_time: 0,
        airtime_loans_unpaid: 0,
        sim_registered_with_bi: false,
      },
      mobileMoney: {
        mobile_no: '+244 923 100 003',
        wallet_exists: false,
        registration_level: 'basic',
        monthly_inflow_aoa: 0,
        monthly_outflow_aoa: 0,
        avg_balance_aoa: 0,
        txn_count_90d: 0,
        failed_txn_count_90d: 0,
      },
      identity: {
        mobile_no: '+244 923 100 003',
        bi_number: '006910234HB048',
        id_verified: false,
        id_issue_date: null,
        id_issue_place: null,
        address: 'Zona Académica, Huambo',
        address_verified: false,
      },
      tax: {
        mobile_no: '+244 923 100 003',
        nif: '006910234HB048',
        nif_status: 'none',
        tax_filing_status: 'none',
      },
    },
    {
      customer: {
        id: 'cust-004',
        mobile_no: '+244 923 100 004',
        full_name: 'Luísa Fernandes',
        bi_number: '004883921LA045',
        date_of_birth: '1986-11-03',
        gender: 'F',
        city: 'Luanda',
      },
      telecom: {
        mobile_no: '+244 923 100 004',
        sim_activation_date: '2025-04-01',
        avg_monthly_topup_aoa: 24_000,
        topup_months_last_12: 10,
        avg_monthly_spend_aoa: 21_000,
        spend_variability: 0.22,
        airtime_loans_taken: 2,
        airtime_loans_repaid_on_time: 2,
        airtime_loans_unpaid: 0,
        sim_registered_with_bi: false,
      },
      mobileMoney: {
        mobile_no: '+244 923 100 004',
        wallet_exists: true,
        registration_level: 'basic',
        monthly_inflow_aoa: 260_000,
        monthly_outflow_aoa: 240_000,
        avg_balance_aoa: 62_000,
        txn_count_90d: 36,
        failed_txn_count_90d: 1,
      },
      identity: {
        mobile_no: '+244 923 100 004',
        bi_number: '004883921LA045',
        id_verified: false,
        id_issue_date: null,
        id_issue_place: null,
        address: 'Maianga, Rua 7, Luanda',
        address_verified: false,
      },
      tax: {
        mobile_no: '+244 923 100 004',
        nif: '004883921LA045',
        nif_status: 'suspended',
        tax_filing_status: 'irregular',
      },
    },
    {
      customer: {
        id: 'cust-005',
        mobile_no: '+244 923 100 005',
        full_name: 'Pedro Kiala',
        bi_number: '003712845LB049',
        date_of_birth: '1984-06-22',
        gender: 'M',
        city: 'Lubango',
      },
      telecom: {
        mobile_no: '+244 923 100 005',
        sim_activation_date: '2021-08-15',
        avg_monthly_topup_aoa: 20_000,
        topup_months_last_12: 11,
        avg_monthly_spend_aoa: 18_500,
        spend_variability: 0.21,
        airtime_loans_taken: 3,
        airtime_loans_repaid_on_time: 1,
        airtime_loans_unpaid: 2,
        sim_registered_with_bi: true,
      },
      mobileMoney: {
        mobile_no: '+244 923 100 005',
        wallet_exists: true,
        registration_level: 'basic',
        monthly_inflow_aoa: 48_000,
        monthly_outflow_aoa: 42_000,
        avg_balance_aoa: 19_000,
        txn_count_90d: 14,
        failed_txn_count_90d: 1,
      },
      identity: {
        mobile_no: '+244 923 100 005',
        bi_number: '003712845LB049',
        id_verified: true,
        id_issue_date: '2020-09-14',
        id_issue_place: 'Lubango',
        address: 'Bairro Comercial, Lubango',
        address_verified: true,
      },
      tax: {
        mobile_no: '+244 923 100 005',
        nif: '003712845LB049',
        nif_status: 'active',
        tax_filing_status: 'regular',
      },
    },
  ];

  return personas;
}

export function generateSeedDataset(config: ScoringConfig = DEFAULT_SCORING_CONFIG): {
  profiles: CustomerProfile[];
  applications: ApplicationRecord[];
  notifications: NotificationRecord[];
} {
  const rng = createRng(20261112);
  const personas = buildPersonas();
  const synthetic: CustomerProfile[] = [];

  for (let i = 6; i <= 300; i++) {
    const gender: 'M' | 'F' = rng() < 0.52 ? 'M' : 'F';
    const firstPool = gender === 'M' ? FIRST_NAMES_M : FIRST_NAMES_F;
    const firstName = firstPool[Math.floor(rng() * firstPool.length)];
    const surname1 = SURNAMES[Math.floor(rng() * SURNAMES.length)];
    const surname2 = SURNAMES[Math.floor(rng() * SURNAMES.length)];
    const fullName = `${firstName} ${surname1}${surname2 !== surname1 ? ' ' + surname2 : ''}`;
    const city = pickCity(rng);

    const prefix = ['923', '924', '925', '931', '932', '941'][Math.floor(rng() * 6)];
    const mid = pad(200 + Math.floor(i / 1000) * 100 + (i % 800), 3);
    const tail = pad(100 + ((i * 37) % 900), 3);
    const mobileNo = `+244 ${prefix} ${mid} ${tail}`;
    const biNumber = `00${pad(1000000 + i * 193, 7)}${city.code}0${pad(35 + (i % 20), 2)}`;

    const birthYear = 1972 + Math.floor(rng() * 32);
    const dob = `${birthYear}-${pad(1 + Math.floor(rng() * 12), 2)}-${pad(1 + Math.floor(rng() * 28), 2)}`;

    // Cohort distribution: 55% thin/no-wallet, 30% mixed, 15% rich
    const cohortRoll = rng();
    const cohort: 'thin' | 'mixed' | 'rich' =
      cohortRoll < 0.55 ? 'thin' : cohortRoll < 0.85 ? 'mixed' : 'rich';

    const simMonths =
      cohort === 'rich'
        ? 26 + Math.floor(rng() * 48)
        : cohort === 'mixed'
          ? 8 + Math.floor(rng() * 36)
          : 1 + Math.floor(rng() * 30);

    const topupMonths =
      cohort === 'rich'
        ? 9 + Math.floor(rng() * 4)
        : cohort === 'mixed'
          ? 5 + Math.floor(rng() * 7)
          : 1 + Math.floor(rng() * 9);

    const avgTopup =
      cohort === 'rich'
        ? Math.round((15_000 + rng() * 35_000) / 500) * 500
        : cohort === 'mixed'
          ? Math.round((5_000 + rng() * 18_000) / 500) * 500
          : Math.round((1_000 + rng() * 9_000) / 250) * 250;

    const spendVariability =
      cohort === 'rich'
        ? Number((0.08 + rng() * 0.2).toFixed(2))
        : cohort === 'mixed'
          ? Number((0.18 + rng() * 0.35).toFixed(2))
          : Number((0.28 + rng() * 0.58).toFixed(2));

    // Correlation: longer SIM + regular top-ups -> better airtime loan repayment, with noise
    const loansTaken = simMonths > 12 ? Math.floor(rng() * 5) : Math.floor(rng() * 2);
    const hasUnpaidNoise =
      cohort === 'thin' ? rng() < 0.16 : cohort === 'mixed' ? rng() < 0.08 : rng() < 0.03;
    const unpaidLoans = loansTaken > 0 && hasUnpaidNoise ? 1 : 0;
    const repaidOnTime = Math.max(
      0,
      loansTaken - unpaidLoans - (loansTaken > 1 && rng() < 0.15 ? 1 : 0)
    );

    const idVerified =
      cohort === 'rich' ? rng() < 0.96 : cohort === 'mixed' ? rng() < 0.78 : rng() < 0.55;
    const simRegBi = idVerified && (cohort === 'rich' ? rng() < 0.95 : rng() < 0.75);
    const addressVerified = idVerified && (cohort === 'rich' ? rng() < 0.85 : rng() < 0.35);

    let walletExists = true;
    let regLevel: 'basic' | 'kyc' = 'basic';
    let inflow = 0;
    let outflow = 0;
    let avgBal = 0;
    let txnCount = 0;
    let failedCount = 0;

    if (cohort === 'thin') {
      walletExists = rng() < 0.58; // ~42% of thin cohort have no wallet at all
      regLevel = 'basic';
      if (walletExists) {
        inflow = Math.round((1_000 + rng() * 10_000) / 100) * 100;
        outflow = Math.round(inflow * (0.7 + rng() * 0.25));
        avgBal = Math.min(70_000, Math.round(1_000 + rng() * 8_000));
        txnCount = Math.floor(rng() * 4); // 0-3 txns -> thin file!
        failedCount = txnCount > 0 && rng() < 0.1 ? 1 : 0;
      }
    } else if (cohort === 'mixed') {
      walletExists = true;
      regLevel = idVerified && rng() < 0.35 ? 'kyc' : 'basic';
      inflow =
        regLevel === 'kyc'
          ? Math.round((60_000 + rng() * 180_000) / 1000) * 1000
          : Math.round((18_000 + rng() * 65_000) / 500) * 500;
      outflow = Math.round(inflow * (0.65 + rng() * 0.25));
      avgBal =
        regLevel === 'kyc'
          ? Math.round(25_000 + rng() * 180_000)
          : Math.min(70_000, Math.round(8_000 + rng() * 45_000));
      txnCount = 6 + Math.floor(rng() * 20);
      failedCount = rng() < 0.25 ? 1 : 0;
    } else {
      walletExists = true;
      regLevel = idVerified ? 'kyc' : 'basic';
      inflow =
        regLevel === 'kyc'
          ? Math.round((180_000 + rng() * 650_000) / 1000) * 1000
          : Math.round((80_000 + rng() * 140_000) / 1000) * 1000;
      outflow = Math.round(inflow * (0.55 + rng() * 0.3));
      avgBal =
        regLevel === 'kyc'
          ? Math.round(120_000 + rng() * 1_400_000)
          : Math.min(70_000, Math.round(35_000 + rng() * 32_000));
      txnCount = 24 + Math.floor(rng() * 40);
      failedCount = rng() < 0.15 ? 1 : 0;
    }

    const taxRoll = rng();
    const nifStatus: TaxSource['nif_status'] =
      cohort === 'rich'
        ? taxRoll < 0.85
          ? 'active'
          : 'none'
        : cohort === 'mixed'
          ? taxRoll < 0.45
            ? 'active'
            : taxRoll < 0.52
              ? 'suspended'
              : 'none'
          : taxRoll < 0.15
            ? 'active'
            : taxRoll < 0.2
              ? 'suspended'
              : 'none';

    const filingStatus: TaxSource['tax_filing_status'] =
      nifStatus === 'none'
        ? 'none'
        : nifStatus === 'suspended'
          ? 'irregular'
          : cohort === 'rich'
            ? rng() < 0.85
              ? 'regular'
              : 'irregular'
            : rng() < 0.5
              ? 'regular'
              : 'irregular';

    const customer: Customer = {
      id: `cust-${pad(i, 3)}`,
      mobile_no: mobileNo,
      full_name: fullName,
      bi_number: biNumber,
      date_of_birth: dob,
      gender,
      city: city.name,
    };

    const telecom: TelecomSource = {
      mobile_no: mobileNo,
      sim_activation_date: isoDateMonthsAgo(simMonths, 1 + Math.floor(rng() * 28)),
      avg_monthly_topup_aoa: avgTopup,
      topup_months_last_12: Math.min(12, topupMonths),
      avg_monthly_spend_aoa: Math.round(avgTopup * (0.8 + rng() * 0.18)),
      spend_variability: spendVariability,
      airtime_loans_taken: loansTaken,
      airtime_loans_repaid_on_time: repaidOnTime,
      airtime_loans_unpaid: unpaidLoans,
      sim_registered_with_bi: simRegBi,
    };

    const mobileMoney: MobileMoneySource = {
      mobile_no: mobileNo,
      wallet_exists: walletExists,
      registration_level: regLevel,
      monthly_inflow_aoa: inflow,
      monthly_outflow_aoa: outflow,
      avg_balance_aoa: avgBal,
      txn_count_90d: txnCount,
      failed_txn_count_90d: failedCount,
    };

    const identity: IdentitySource = {
      mobile_no: mobileNo,
      bi_number: biNumber,
      id_verified: idVerified,
      id_issue_date: idVerified ? isoDateMonthsAgo(12 + Math.floor(rng() * 48), 10) : null,
      id_issue_place: idVerified ? city.name : null,
      address: `${STREETS[Math.floor(rng() * STREETS.length)]}, ${10 + Math.floor(rng() * 190)}, ${city.name}`,
      address_verified: addressVerified,
    };

    const tax: TaxSource = {
      mobile_no: mobileNo,
      nif: biNumber,
      nif_status: nifStatus,
      tax_filing_status: filingStatus,
    };

    synthetic.push({ customer, telecom, mobileMoney, identity, tax });
  }

  const profiles = [...personas, ...synthetic];

  // Create initial realistic demo applications (leaving Thomas Mateus ready to run live in the demo,
  // while pre-populating Maria, João, Luísa, Pedro + 14 synthetic customers across decisions)
  const initialSeeds: Array<{ profileIdx: number; productIdx: number; hoursAgo: number }> = [
    { profileIdx: 1, productIdx: 1, hoursAgo: 2 },   // Maria Cândida - Smart TV -> Auto-approve (Good, Medium)
    { profileIdx: 3, productIdx: 0, hoursAgo: 4 },   // Luísa Fernandes - Smartphone -> Manual review
    { profileIdx: 4, productIdx: 2, hoursAgo: 6 },   // Pedro Kiala - Fridge -> Decline (capped 550)
    { profileIdx: 2, productIdx: 0, hoursAgo: 8 },   // João Baptista - Smartphone -> Decline (Poor, Low)
    { profileIdx: 8, productIdx: 0, hoursAgo: 12 },
    { profileIdx: 11, productIdx: 1, hoursAgo: 15 },
    { profileIdx: 14, productIdx: 2, hoursAgo: 19 },
    { profileIdx: 17, productIdx: 0, hoursAgo: 24 },
    { profileIdx: 22, productIdx: 1, hoursAgo: 28 },
    { profileIdx: 27, productIdx: 0, hoursAgo: 34 },
    { profileIdx: 31, productIdx: 2, hoursAgo: 40 },
    { profileIdx: 36, productIdx: 0, hoursAgo: 45 },
    { profileIdx: 42, productIdx: 1, hoursAgo: 52 },
    { profileIdx: 48, productIdx: 3, hoursAgo: 60 },
  ];

  const applications: ApplicationRecord[] = [];
  const notifications: NotificationRecord[] = [];

  initialSeeds.forEach((item, idx) => {
    const profile = profiles[item.profileIdx];
    const prod = PRODUCT_CATALOG[item.productIdx];
    if (!profile || !prod) return;

    const scoreExp = evaluateCreditScore(profile, config);
    const decisionRes = evaluateLimitAndDecision(scoreExp, prod.defaultPriceAoa, config);
    const createdAt = new Date(Date.parse('2026-11-12T10:00:00Z') - item.hoursAgo * 3600_000).toISOString();

    const app: ApplicationRecord = {
      id: `APP-${1001 + idx}`,
      customer_id: profile.customer.id,
      customer_name: profile.customer.full_name,
      mobile_no: profile.customer.mobile_no,
      product: prod.name,
      product_price_aoa: prod.defaultPriceAoa,
      status:
        decisionRes.decision === 'auto_approve'
          ? 'approved'
          : decisionRes.decision === 'manual_review'
            ? 'pending_review'
            : 'declined',
      score: scoreExp.score,
      band: scoreExp.band,
      confidence: scoreExp.confidence,
      credit_limit_aoa: decisionRes.creditLimitAoa,
      decision: decisionRes.decision,
      decision_reason: decisionRes.decisionReason,
      created_at: createdAt,
    };

    applications.push(app);
    notifications.push(
      ...buildNotificationDrafts(app, decisionRes.decision, config, createdAt)
    );
  });

  return { profiles, applications, notifications };
}

