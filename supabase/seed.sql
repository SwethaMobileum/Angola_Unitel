-- Seed: supabase/seed.sql
-- Master seed dataset for Angola Telecom Credit Scoring Web App (POC)

-- 1. Demo User Profiles (Mock UUIDs)
insert into profiles (id, full_name, role) values
  ('00000000-0000-0000-0000-000000000001', 'Tomas Silva (Analyst)', 'analyst'),
  ('00000000-0000-0000-0000-000000000002', 'Dra. Maria Mendes (Approver)', 'approver'),
  ('00000000-0000-0000-0000-000000000003', 'Eng. Carlos Neto (Admin)', 'admin')
on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;

-- 2. Initial Configuration Version
insert into config_versions (id, label, created_by, is_active) values
  ('c0000000-0000-0000-0000-000000000001', 'v1.0-default', '00000000-0000-0000-0000-000000000003', true)
on conflict (id) do nothing;

-- 3. Core Feature Flags
insert into feature_flags (key, value, description) values
  ('wallet_enabled', 'true'::jsonb, 'Globally enables Block W (Wallet and Mobile Money) scoring'),
  ('emi_cap_pct', '30'::jsonb, 'Maximum EMI percentage allowed of monthly income or spend (default 30%)'),
  ('base_points', '94'::jsonb, 'Required sum of block points P+T+W+B+X (must equal 94)'),
  ('asset_bonus_max', '6'::jsonb, 'Maximum bonus points achievable from assets (house, land title, vehicle)'),
  ('starter_months', '6'::jsonb, 'SIM tenure months threshold below which credit limit is capped at starter'),
  ('sim_swap_hold_days', '30'::jsonb, 'Days since last SIM swap that triggers hold_review overlay')
on conflict (key) do update set value = excluded.value;

-- 4. Parameter Blocks (P, T, W, B, X, A)
insert into blocks (code, name, question, color, is_optional, sort) values
  ('P', 'Personal and identity', 'Who is the customer and how verifiable is their identity?', '#5F6F80', false, 1),
  ('T', 'Telecom behaviour', 'How does the customer use their Unitel phone, airtime and data?', '#2A7F8E', false, 2),
  ('W', 'Wallet and mobile money', 'How actively does the customer use Unitel Money or mobile wallets?', '#7B4FA3', true, 3),
  ('B', 'Bank and formal finance', 'What formal banking, card, and credit footprints exist?', '#1F3A5F', false, 4),
  ('X', 'Other alternative data', 'What agent, remittance, utility, and informal signals exist?', '#B26A00', false, 5),
  ('A', 'Assets and income', 'What tangible assets and monthly income level are declared?', '#2E7D4F', false, 6)
on conflict (code) do update set name = excluded.name, color = excluded.color, is_optional = excluded.is_optional, sort = excluded.sort;

-- 5. The 10 Customer Segments
insert into segments (code, name, color, story, how_money_moves, data_visible, share_note, limit_rule, sort) values
  ('S1', 'Button phone, cash-only', '#8A6D3B',
   'Basic feature phone user relying entirely on physical cash and scratch cards.',
   'Physical cash for daily life; physical scratch cards bought from street vendors.',
   'Call/SMS logs, scratch card top-up frequency, airtime loan repayments.',
   'Estimated ~35% of prepaid base in peri-urban and rural Angola.',
   'Starter limit only (max 50,000 Kz) until tenure >= 12m or wallet activated.', 1),

  ('S2', 'Button phone with USSD wallet', '#C0612B',
   'Uses feature phone but actively transacts via USSD (*449#) on Unitel Money.',
   'Cash-in at local agent, P2P sends to relatives via USSD, airtime purchases.',
   'Telecom logs + USSD wallet inflows, agent cash-in, balance stability.',
   'Estimated ~20% of subscribers.',
   'Eligible for standard limits if wallet inflows are consistent.', 2),

  ('S3', 'Smartphone, unbanked, wallet app', '#7B4FA3',
   'Younger or urban unbanked user with Android smartphone using wallet app.',
   'App-based QR payments, peer-to-peer transfers, digital bundle purchases.',
   'Rich wallet app usage, data bundle consumption, merchant payments.',
   'Fastest growing youth & student segment in Luanda/Benguela.',
   'Standard limit based on wallet volume and app tenure.', 3),

  ('S4', 'Agent-assisted cash user', '#B8860B',
   'Transacts primarily through mobile money agents and informal banking intermediaries.',
   'Visits physical agents to send/receive domestic transfers; keeps little float.',
   'Agent transaction receipts, remittance logs, airtime top-ups.',
   'Prevalent in market hubs and transport terminals.',
   'Credit limit tied to agent transaction history and regularity.', 4),

  ('S5', 'Banked, branch and ATM user', '#1F3A5F',
   'Traditional bank customer using debit cards, ATMs, and branch counters.',
   'Salary or business revenue deposited into bank; cash withdrawals at Multicaixa ATM.',
   'Bank statements, ATM card usage, salary credits, telecom top-up history.',
   'Established formal demographic (~15% of national population).',
   'Standard to Higher limit based on average bank balance.', 5),

  ('S6', 'Banked digital, hybrid with wallet', '#2A7F8E',
   'Tech-savvy urban customer using Multicaixa Express, KWiK, and mobile wallets.',
   'Instant interbank transfers (KWiK), MCX Express app, Unitel Money bridges.',
   'High data consumption, MCX Express activity, regular digital inflows.',
   'High-velocity urban middle class.',
   'Higher credit limits supported by digital banking velocity.', 6),

  ('S7', 'Salaried formal worker', '#2E7D4F',
   'Public sector or corporate employee with verifiable monthly payroll deposit.',
   'Predictable monthly bank deposit on 25th-30th; recurring utility debits.',
   'Proof of employment, continuous payroll credits, tax/INSS footprint.',
   'High stability, lowest default rate segment.',
   'High to Highest credit limits, up to 1,000,000 Kz.', 7),

  ('S8', 'Self-employed or informal trader', '#A83F5C',
   'Market vendor, shopkeeper, artisan, or moto-taxi operator.',
   'Daily cash and QR wallet collections; rapid inventory restocking outflows.',
   'Unitel Money merchant receipts, supplier transfers, high daily turnover.',
   'Drives >60% of Angolan informal commercial economy.',
   'Credit limit tied to 90-day merchant inflow velocity.', 8),

  ('S9', 'Remittance-dependent household', '#4A6FA5',
   'Household relying on regular domestic transfers from relatives or diaspora abroad.',
   'Periodic lump-sum receipt (monthly/bi-monthly) disbursed for domestic upkeep.',
   'Consistent sender history, receiving channel consistency, telecom tenure.',
   'Vulnerable to economic shocks but highly loyal.',
   'Standard limit with strict 30% EMI safety cap.', 9),

  ('S10', 'Postpaid or high-value subscriber', '#444B6E',
   'Corporate or high-net-worth individual with monthly billing contract or high ARPU.',
   'Postpaid monthly invoice bank debit or premium prepaid auto-renew plans.',
   'Years of spotless postpaid bill payments, high ARPU, premium devices.',
   'Top 3% telecom revenue tier.',
   'Highest credit limit tier with express auto-approval.', 10)
on conflict (code) do update set
  name = excluded.name, color = excluded.color, story = excluded.story,
  how_money_moves = excluded.how_money_moves, data_visible = excluded.data_visible,
  share_note = excluded.share_note, limit_rule = excluded.limit_rule, sort = excluded.sort;

-- 6. Segment Weights (Each row P+T+W+B+X = 94, verified by check constraint)
insert into segment_weights (config_version_id, segment_code, block_code, points, role) values
  -- S1: Button phone, cash-only (P=14, T=80, W=0, B=0, X=0) -> Sum 94
  ('c0000000-0000-0000-0000-000000000001', 'S1', 'P', 14, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S1', 'T', 80, 'main'),
  ('c0000000-0000-0000-0000-000000000001', 'S1', 'W', 0, 'not_available'),
  ('c0000000-0000-0000-0000-000000000001', 'S1', 'B', 0, 'not_available'),
  ('c0000000-0000-0000-0000-000000000001', 'S1', 'X', 0, 'not_used'),

  -- S2: Button phone with USSD wallet (P=12, T=50, W=32, B=0, X=0) -> Sum 94
  ('c0000000-0000-0000-0000-000000000001', 'S2', 'P', 12, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S2', 'T', 50, 'main'),
  ('c0000000-0000-0000-0000-000000000001', 'S2', 'W', 32, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S2', 'B', 0, 'not_available'),
  ('c0000000-0000-0000-0000-000000000001', 'S2', 'X', 0, 'not_used'),

  -- S3: Smartphone, unbanked, wallet app (P=12, T=40, W=42, B=0, X=0) -> Sum 94
  ('c0000000-0000-0000-0000-000000000001', 'S3', 'P', 12, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S3', 'T', 40, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S3', 'W', 42, 'main'),
  ('c0000000-0000-0000-0000-000000000001', 'S3', 'B', 0, 'not_available'),
  ('c0000000-0000-0000-0000-000000000001', 'S3', 'X', 0, 'not_used'),

  -- S4: Agent-assisted cash user (P=12, T=62, W=0, B=0, X=20) -> Sum 94
  ('c0000000-0000-0000-0000-000000000001', 'S4', 'P', 12, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S4', 'T', 62, 'main'),
  ('c0000000-0000-0000-0000-000000000001', 'S4', 'W', 0, 'not_available'),
  ('c0000000-0000-0000-0000-000000000001', 'S4', 'B', 0, 'not_available'),
  ('c0000000-0000-0000-0000-000000000001', 'S4', 'X', 20, 'support'),

  -- S5: Banked, branch and ATM user (P=12, T=25, W=0, B=50, X=7) -> Sum 94
  ('c0000000-0000-0000-0000-000000000001', 'S5', 'P', 12, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S5', 'T', 25, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S5', 'W', 0, 'not_available'),
  ('c0000000-0000-0000-0000-000000000001', 'S5', 'B', 50, 'main'),
  ('c0000000-0000-0000-0000-000000000001', 'S5', 'X', 7, 'support'),

  -- S6: Banked digital, hybrid with wallet (P=10, T=22, W=22, B=40, X=0) -> Sum 94
  ('c0000000-0000-0000-0000-000000000001', 'S6', 'P', 10, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S6', 'T', 22, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S6', 'W', 22, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S6', 'B', 40, 'main'),
  ('c0000000-0000-0000-0000-000000000001', 'S6', 'X', 0, 'not_used'),

  -- S7: Salaried formal worker (P=10, T=20, W=10, B=48, X=6) -> Sum 94
  ('c0000000-0000-0000-0000-000000000001', 'S7', 'P', 10, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S7', 'T', 20, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S7', 'W', 10, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S7', 'B', 48, 'main'),
  ('c0000000-0000-0000-0000-000000000001', 'S7', 'X', 6, 'support'),

  -- S8: Self-employed or informal trader (P=10, T=30, W=34, B=12, X=8) -> Sum 94
  ('c0000000-0000-0000-0000-000000000001', 'S8', 'P', 10, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S8', 'T', 30, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S8', 'W', 34, 'main'),
  ('c0000000-0000-0000-0000-000000000001', 'S8', 'B', 12, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S8', 'X', 8, 'support'),

  -- S9: Remittance-dependent household (P=10, T=36, W=20, B=8, X=20) -> Sum 94
  ('c0000000-0000-0000-0000-000000000001', 'S9', 'P', 10, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S9', 'T', 36, 'main'),
  ('c0000000-0000-0000-0000-000000000001', 'S9', 'W', 20, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S9', 'B', 8, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S9', 'X', 20, 'support'),

  -- S10: Postpaid or high-value subscriber (P=10, T=40, W=8, B=28, X=8) -> Sum 94
  ('c0000000-0000-0000-0000-000000000001', 'S10', 'P', 10, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S10', 'T', 40, 'main'),
  ('c0000000-0000-0000-0000-000000000001', 'S10', 'W', 8, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S10', 'B', 28, 'support'),
  ('c0000000-0000-0000-0000-000000000001', 'S10', 'X', 8, 'support')
on conflict (config_version_id, segment_code, block_code) do update set
  points = excluded.points, role = excluded.role;

-- 7. Segment Finder Questions (Priority chain: first YES wins)
insert into segment_questions (id, position, text, yes_segment, requires_wallet) values
  (1, 1, 'Is the line postpaid (monthly bill)?', 'S10', false),
  (2, 2, 'Is a salary paid in regularly (bank or wallet)?', 'S7', false),
  (3, 3, 'Does the person take customer payments (shop, trader, moto-taxi)?', 'S8', false),
  (4, 4, 'Bank account AND active on Multicaixa Express or KWiK?', 'S6', false),
  (5, 5, 'Bank account, mostly ATM, card or branch?', 'S5', false),
  (6, 6, 'Uses a wallet app on a smartphone?', 'S3', true),
  (7, 7, 'Uses a wallet by USSD code on a button phone?', 'S2', true),
  (8, 8, 'Gets regular money from family or abroad?', 'S9', false),
  (9, 9, 'Sends or receives money through agents or bank staff?', 'S4', false)
on conflict (id) do update set
  position = excluded.position, text = excluded.text, yes_segment = excluded.yes_segment, requires_wallet = excluded.requires_wallet;

-- 8. Score Bands (300 to 900)
insert into score_bands (id, min_score, max_score, label, limit_level) values
  (1, 300, 499, 'High risk', 'review'),
  (2, 500, 599, 'Thin or weak record', 'starter'),
  (3, 600, 699, 'Acceptable', 'standard'),
  (4, 700, 799, 'Good', 'higher'),
  (5, 800, 900, 'Very good', 'highest')
on conflict (id) do update set
  min_score = excluded.min_score, max_score = excluded.max_score, label = excluded.label, limit_level = excluded.limit_level;

-- 9. Income Bands (Monthly in Kz, ~920 Kz per USD)
insert into income_bands (id, code, label, min_kz, max_kz, usd_note, limit_cap_level) values
  (1, 1, 'Very low', 0, 49999, 'Below $55 / mo (subsistence)', 'starter'),
  (2, 2, 'Low (Min Wage)', 50000, 100000, '~$55 - $110 / mo (Min wage: 100k Kz since Sept 2025)', 'starter'),
  (3, 3, 'Lower-middle', 100001, 250000, '~$110 - $270 / mo', 'standard'),
  (4, 4, 'Middle', 250001, 500000, '~$270 - $540 / mo', 'higher'),
  (5, 5, 'Upper', 500001, 1000000, '~$540 - $1,080 / mo', 'highest'),
  (6, 6, 'High', 1000001, 99999999, 'Above $1,080 / mo', 'highest')
on conflict (id) do update set
  code = excluded.code, label = excluded.label, min_kz = excluded.min_kz, max_kz = excluded.max_kz,
  usd_note = excluded.usd_note, limit_cap_level = excluded.limit_cap_level;

-- 10. Credit Limit Matrix Table (Placeholder values, editable by Admin)
insert into limit_table (id, limit_level, income_band_code, max_limit_kz) values
  (1, 'starter', 1, 30000),
  (2, 'starter', 2, 50000),
  (3, 'starter', 3, 50000),
  (4, 'starter', 4, 50000),
  (5, 'starter', 5, 50000),
  (6, 'starter', 6, 50000),

  (7, 'standard', 1, 30000),
  (8, 'standard', 2, 80000),
  (9, 'standard', 3, 150000),
  (10, 'standard', 4, 150000),
  (11, 'standard', 5, 150000),
  (12, 'standard', 6, 150000),

  (13, 'higher', 1, 30000),
  (14, 'higher', 2, 80000),
  (15, 'higher', 3, 200000),
  (16, 'higher', 4, 350000),
  (17, 'higher', 5, 400000),
  (18, 'higher', 6, 400000),

  (19, 'highest', 1, 30000),
  (20, 'highest', 2, 80000),
  (21, 'highest', 3, 250000),
  (22, 'highest', 4, 500000),
  (23, 'highest', 5, 800000),
  (24, 'highest', 6, 1000000)
on conflict (id) do update set
  limit_level = excluded.limit_level, income_band_code = excluded.income_band_code, max_limit_kz = excluded.max_limit_kz;

-- 11. Overlay Rules
insert into overlay_rules (id, key, description, action) values
  (1, 'id_sim_mismatch', 'ID name does not match SIM card subscriber registry', 'stop'),
  (2, 'age_under_18', 'Applicant is under 18 years old', 'stop'),
  (3, 'sim_under_6m', 'Unitel SIM activation tenure is less than 6 months', 'cap_starter'),
  (4, 'sim_swap_30d', 'SIM card was swapped or re-issued within the last 30 days', 'hold_review')
on conflict (id) do update set
  key = excluded.key, description = excluded.description, action = excluded.action;

-- 12. Parameters (with bands 0..1 mappings)
insert into parameters (key, block_code, label, help, input, unit, bands, weight, is_candidate, sort) values
  -- Block P
  ('id_sim_match', 'P', 'ID & SIM Registration Match', 'Does the National ID (BI) match the SIM owner name?', 'boolean', null,
   '[{"value": true, "score": 1.0, "label": "Full Match"}, {"value": false, "score": 0.0, "label": "Mismatch"}]'::jsonb, 1.0, false, 1),
  ('age_band', 'P', 'Age Range', 'Age of applicant (must be 18+)', 'choice', null,
   '[{"value": "18-24", "score": 0.6, "label": "18-24 yrs"}, {"value": "25-35", "score": 0.85, "label": "25-35 yrs"}, {"value": "36-55", "score": 1.0, "label": "36-55 yrs"}, {"value": "56+", "score": 0.75, "label": "56+ yrs"}]'::jsonb, 1.0, false, 2),
  ('region', 'P', 'Location / Province', 'Geographic classification', 'choice', null,
   '[{"value": "luanda_urban", "score": 1.0, "label": "Luanda Urban"}, {"value": "provincial_capital", "score": 0.85, "label": "Provincial Capital"}, {"value": "rural", "score": 0.7, "label": "Rural / Interior"}]'::jsonb, 0.8, false, 3),
  ('employment_type', 'P', 'Employment Status', 'Declared primary income source', 'choice', null,
   '[{"value": "formal_salaried", "score": 1.0, "label": "Formal Salaried"}, {"value": "informal_business", "score": 0.75, "label": "Self-Employed / Trader"}, {"value": "contractor", "score": 0.7, "label": "Temporary Contractor"}, {"value": "unemployed", "score": 0.2, "label": "Unemployed"}]'::jsonb, 1.0, false, 4),
  ('employer_type', 'P', 'Employer Organization', 'Sector of employment', 'choice', null,
   '[{"value": "government", "score": 1.0, "label": "Public / Civil Service"}, {"value": "multinational", "score": 0.95, "label": "Multinational / Bank"}, {"value": "sme", "score": 0.8, "label": "Local SME"}, {"value": "informal", "score": 0.5, "label": "Informal Enterprise"}]'::jsonb, 0.9, false, 5),
  ('business_type', 'P', 'Business Activity', 'Type of micro-enterprise or trade', 'choice', null,
   '[{"value": "retail_store", "score": 0.9, "label": "Fixed Retail Shop"}, {"value": "market_stall", "score": 0.75, "label": "Market Stall (Kwanza)"}, {"value": "moto_taxi", "score": 0.7, "label": "Moto-Taxi / Transport"}, {"value": "service", "score": 0.8, "label": "Personal Services"}]'::jsonb, 0.8, false, 6),
  ('time_in_job_months', 'P', 'Tenure in Job / Trade (Months)', 'How many months in current job or business', 'number', 'months',
   '[{"max": 6, "score": 0.3}, {"min": 6, "max": 12, "score": 0.6}, {"min": 12, "max": 36, "score": 0.85}, {"min": 36, "score": 1.0}]'::jsonb, 0.9, false, 7),
  ('dependents', 'P', 'Number of Dependents', 'Household dependents count', 'number', null,
   '[{"max": 2, "score": 1.0}, {"min": 3, "max": 5, "score": 0.75}, {"min": 6, "score": 0.5}]'::jsonb, 0.5, true, 8),

  -- Block T (Telecom Behaviour)
  ('sim_tenure_months', 'T', 'SIM Card Tenure', 'Total active months on Unitel network', 'number', 'months',
   '[{"max": 3, "score": 0.1}, {"min": 3, "max": 6, "score": 0.3}, {"min": 6, "max": 12, "score": 0.5}, {"min": 12, "max": 24, "score": 0.75}, {"min": 24, "score": 1.0}]'::jsonb, 1.2, false, 1),
  ('topup_regularity_months', 'T', 'Top-up Regularity (Last 12m)', 'Number of months with at least one recharge in last 12', 'number', 'months',
   '[{"max": 3, "score": 0.2}, {"min": 4, "max": 6, "score": 0.5}, {"min": 7, "max": 9, "score": 0.75}, {"min": 10, "score": 1.0}]'::jsonb, 1.4, false, 2),
  ('topup_avg_amount_kz', 'T', 'Average Top-up Amount', 'Typical recharge amount in Kwanzas', 'number', 'Kz',
   '[{"max": 1000, "score": 0.3}, {"min": 1000, "max": 3000, "score": 0.6}, {"min": 3000, "max": 8000, "score": 0.85}, {"min": 8000, "score": 1.0}]'::jsonb, 1.0, false, 3),
  ('topup_seasonality', 'T', 'Top-up Seasonality / Stability', 'Recharge variance month-to-month', 'choice', null,
   '[{"value": "stable", "score": 1.0, "label": "Highly Stable"}, {"value": "moderate", "score": 0.7, "label": "Moderate Fluctuation"}, {"value": "volatile", "score": 0.35, "label": "High Volatility"}]'::jsonb, 0.8, false, 4),
  ('arpu_kz', 'T', 'Average Revenue Per User (ARPU)', 'Monthly average spend on Unitel network', 'number', 'Kz',
   '[{"max": 2000, "score": 0.3}, {"min": 2000, "max": 6000, "score": 0.6}, {"min": 6000, "max": 15000, "score": 0.85}, {"min": 15000, "score": 1.0}]'::jsonb, 1.1, false, 5),
  ('arpu_stability', 'T', 'Spend Consistency', 'Has customer sustained active spend over 6m?', 'boolean', null,
   '[{"value": true, "score": 1.0, "label": "Consistent"}, {"value": false, "score": 0.45, "label": "Intermittent"}]'::jsonb, 0.9, false, 6),
  ('usage_consistency', 'T', 'Weekly Network Usage Activity', 'Active on network days per week', 'number', 'days/wk',
   '[{"max": 2, "score": 0.25}, {"min": 3, "max": 4, "score": 0.6}, {"min": 5, "score": 1.0}]'::jsonb, 0.9, false, 7),
  ('data_bundles_per_month', 'T', 'Data Bundles Purchased', 'Average mobile data bundles bought per month', 'number', 'bundles',
   '[{"max": 0, "score": 0.4}, {"min": 1, "max": 3, "score": 0.7}, {"min": 4, "score": 1.0}]'::jsonb, 0.7, false, 8),
  ('airtime_loan_repayment', 'T', 'Airtime Loan Repayment Ratio', 'Share of emergency airtime advances repaid on time', 'number', '%',
   '[{"max": 50, "score": 0.1}, {"min": 50, "max": 79, "score": 0.5}, {"min": 80, "max": 99, "score": 0.85}, {"min": 100, "score": 1.0}]'::jsonb, 1.3, false, 9),
  ('emergency_airtime_requests', 'T', 'Airtime Advance Frequency', 'Number of emergency airtime requests per month', 'number', 'times',
   '[{"max": 1, "score": 1.0}, {"min": 2, "max": 4, "score": 0.7}, {"min": 5, "score": 0.4}]'::jsonb, 0.6, false, 10),
  ('churn_sim_changes_12m', 'T', 'SIM Swaps in Past 12 Months', 'Count of replacement SIM cards issued', 'number', null,
   '[{"max": 0, "score": 1.0}, {"min": 1, "max": 1, "score": 0.7}, {"min": 2, "score": 0.2}]'::jsonb, 0.8, false, 11),
  ('device_type', 'T', 'Handset Category', 'Button feature phone vs Smartphone (Never penalised)', 'choice', null,
   '[{"value": "button_phone", "score": 0.8, "label": "Feature Button Phone"}, {"value": "smartphone", "score": 0.8, "label": "Smartphone (Android/iOS)"}]'::jsonb, 0.0, false, 12),
  ('device_age_months', 'T', 'Device Tenure on IMEI', 'Handset active duration on current IMEI', 'number', 'months',
   '[{"max": 6, "score": 0.5}, {"min": 6, "max": 18, "score": 0.8}, {"min": 18, "score": 1.0}]'::jsonb, 0.5, true, 13),
  ('stable_contacts', 'T', 'Contact Network Stability', 'Stable high-frequency calling circle contacts', 'number', 'contacts',
   '[{"max": 3, "score": 0.5}, {"min": 4, "max": 8, "score": 0.8}, {"min": 9, "score": 1.0}]'::jsonb, 0.5, true, 14),
  ('bill_payment_history', 'T', 'Postpaid On-time Months', 'Consecutive on-time postpaid billing cycles', 'number', 'months',
   '[{"max": 3, "score": 0.3}, {"min": 3, "max": 6, "score": 0.6}, {"min": 6, "max": 12, "score": 0.85}, {"min": 12, "score": 1.0}]'::jsonb, 1.2, false, 15),
  ('plan_size_kz', 'T', 'Postpaid Plan Commitment', 'Contract plan size in Kwanzas', 'number', 'Kz',
   '[{"max": 5000, "score": 0.4}, {"min": 5000, "max": 15000, "score": 0.7}, {"min": 15000, "score": 1.0}]'::jsonb, 0.9, false, 16),

  -- Block W (Wallet & Mobile Money - Optional)
  ('wallet_level', 'W', 'Unitel Money Registration Tier', 'Basic (*449#) vs Verified KYC', 'choice', null,
   '[{"value": "none", "score": 0.2, "label": "No Wallet"}, {"value": "basic", "score": 0.6, "label": "Basic (Max 70k Kz)"}, {"value": "kyc", "score": 1.0, "label": "Verified KYC (Max 18M Kz)"}]'::jsonb, 1.0, false, 1),
  ('wallet_inflow_regularity', 'W', 'Wallet Inflow Regularity', 'Months in last 6 with cash-in or transfer received', 'number', 'months',
   '[{"max": 1, "score": 0.2}, {"min": 2, "max": 3, "score": 0.5}, {"min": 4, "max": 5, "score": 0.8}, {"min": 6, "score": 1.0}]'::jsonb, 1.3, false, 2),
  ('p2p_per_month', 'W', 'P2P Transfers Per Month', 'Peer to peer money transfers count', 'number', 'txns',
   '[{"max": 0, "score": 0.3}, {"min": 1, "max": 3, "score": 0.65}, {"min": 4, "max": 8, "score": 0.85}, {"min": 9, "score": 1.0}]'::jsonb, 0.9, false, 3),
  ('cash_in_out_per_month', 'W', 'Agent Cash-In/Out Count', 'Monthly transactions through Unitel Money agents', 'number', 'txns',
   '[{"max": 0, "score": 0.3}, {"min": 1, "max": 2, "score": 0.6}, {"min": 3, "score": 1.0}]'::jsonb, 1.0, false, 4),
  ('merchant_qr_receipts_kz', 'W', 'Merchant QR Receipts (Monthly)', 'Customer collections via QR code payments in Kz', 'number', 'Kz',
   '[{"max": 10000, "score": 0.3}, {"min": 10000, "max": 50000, "score": 0.65}, {"min": 50000, "max": 200000, "score": 0.85}, {"min": 200000, "score": 1.0}]'::jsonb, 1.2, false, 5),
  ('bill_airtime_payments', 'W', 'Bill & Utility Payments via Wallet', 'Electricity (ENDE), Water (EPAL) or Airtime via wallet', 'number', 'txns/mo',
   '[{"max": 0, "score": 0.3}, {"min": 1, "max": 2, "score": 0.7}, {"min": 3, "score": 1.0}]'::jsonb, 0.9, false, 6),
  ('wallet_balance_stability', 'W', 'Average Monthly Wallet Balance', 'Maintained end-of-day balance in Unitel Money', 'number', 'Kz',
   '[{"max": 2000, "score": 0.3}, {"min": 2000, "max": 10000, "score": 0.6}, {"min": 10000, "score": 1.0}]'::jsonb, 0.8, false, 7),
  ('ussd_or_app_use', 'W', 'Primary Wallet Interface', 'USSD code vs Android/iOS App', 'choice', null,
   '[{"value": "ussd", "score": 0.8, "label": "USSD *449#"}, {"value": "app", "score": 1.0, "label": "Mobile App"}]'::jsonb, 0.6, false, 8),
  ('wallet_loan_repayment', 'W', 'Micro-credit Repayment (Wallet)', 'Repayment standing on wallet nano-loans', 'choice', null,
   '[{"value": "none_taken", "score": 0.7, "label": "No micro-loans taken"}, {"value": "good", "score": 1.0, "label": "All repaid on time"}, {"value": "late", "score": 0.4, "label": "Occasional late repayment"}, {"value": "default", "score": 0.0, "label": "Unpaid default"}]'::jsonb, 1.2, false, 9),
  ('days_active_per_month', 'W', 'Wallet Active Days per Month', 'Distinct days with wallet activity', 'number', 'days',
   '[{"max": 3, "score": 0.3}, {"min": 4, "max": 10, "score": 0.65}, {"min": 11, "score": 1.0}]'::jsonb, 0.8, false, 10),
  ('supplier_payments', 'W', 'Supplier / B2B Payments via Wallet', 'Direct digital payments to inventory distributors', 'number', 'txns/mo',
   '[{"max": 0, "score": 0.4}, {"min": 1, "max": 3, "score": 0.75}, {"min": 4, "score": 1.0}]'::jsonb, 0.8, false, 11),

  -- Block B (Bank & Formal Finance)
  ('account_age_months', 'B', 'Bank Account Tenure', 'Total months with commercial bank account', 'number', 'months',
   '[{"max": 6, "score": 0.3}, {"min": 6, "max": 24, "score": 0.65}, {"min": 24, "score": 1.0}]'::jsonb, 1.0, false, 1),
  ('regular_credits_months', 'B', 'Regular Monthly Credits (Past 6m)', 'Months with verifiable income credits in bank', 'number', 'months',
   '[{"max": 2, "score": 0.25}, {"min": 3, "max": 4, "score": 0.65}, {"min": 5, "score": 1.0}]'::jsonb, 1.4, false, 2),
  ('salary_amount_band', 'B', 'Net Salary Credit Level', 'Monthly salary amount deposited in bank', 'choice', null,
   '[{"value": "under_100k", "score": 0.4, "label": "< 100,000 Kz"}, {"value": "100k_250k", "score": 0.7, "label": "100k - 250k Kz"}, {"value": "250k_600k", "score": 0.9, "label": "250k - 600k Kz"}, {"value": "600k_plus", "score": 1.0, "label": "600,000+ Kz"}]'::jsonb, 1.3, false, 3),
  ('avg_balance_kz', 'B', 'Average Bank Balance (90 Days)', 'Average closing balance in Kwanzas', 'number', 'Kz',
   '[{"max": 25000, "score": 0.3}, {"min": 25000, "max": 100000, "score": 0.65}, {"min": 100000, "max": 300000, "score": 0.85}, {"min": 300000, "score": 1.0}]'::jsonb, 1.1, false, 4),
  ('card_atm_pos_use', 'B', 'Multicaixa Card Usage Frequency', 'ATM and POS card payments per month', 'number', 'txns',
   '[{"max": 2, "score": 0.35}, {"min": 3, "max": 8, "score": 0.7}, {"min": 9, "score": 1.0}]'::jsonb, 0.8, false, 5),
  ('express_kwik_activity', 'B', 'MCX Express / KWiK Transfers', 'Digital payments using Multicaixa Express or KWiK', 'number', 'txns/mo',
   '[{"max": 0, "score": 0.3}, {"min": 1, "max": 5, "score": 0.7}, {"min": 6, "score": 1.0}]'::jsonb, 1.1, false, 6),
  ('loan_repayment_history', 'B', 'Bank Loan Repayment History', 'Historical credit standing with commercial banks', 'choice', null,
   '[{"value": "no_prior_loans", "score": 0.7, "label": "No prior loans (Neutral)"}, {"value": "spotless", "score": 1.0, "label": "Spotless repayment"}, {"value": "minor_delay", "score": 0.45, "label": "Minor past delays"}, {"value": "default", "score": 0.0, "label": "Default / Bureau Flag"}]'::jsonb, 1.4, false, 7),
  ('returned_payments_12m', 'B', 'Bounced Payments (Last 12m)', 'Count of returned checks or bounced direct debits', 'number', null,
   '[{"max": 0, "score": 1.0}, {"min": 1, "max": 2, "score": 0.6}, {"min": 3, "max": 5, "score": 0.3}, {"min": 6, "score": 0.0}]'::jsonb, 1.3, false, 8),
  ('credit_register_flag', 'B', 'BNA CIRC Bureau Record', 'Central de Informacao de Risco de Credito (BNA)', 'choice', null,
   '[{"value": "clear", "score": 1.0, "label": "Clear / No Adverse Record"}, {"value": "inquiry_only", "score": 0.85, "label": "Recent Inquiries Only"}, {"value": "delinquent", "score": 0.0, "label": "Adverse Default Reported"}]'::jsonb, 1.5, false, 9),
  ('existing_loan_deductions_kz', 'B', 'Existing Monthly Loan Debits', 'Current active monthly debt obligations in Kz', 'number', 'Kz',
   '[{"max": 0, "score": 1.0}, {"min": 1, "max": 50000, "score": 0.7}, {"min": 50000, "max": 150000, "score": 0.4}, {"min": 150000, "score": 0.1}]'::jsonb, 1.0, false, 10),
  ('cross_channel_consistency', 'B', 'Bank & Mobile Money Cross Flow', 'Frequency of bank-to-wallet top-ups', 'choice', null,
   '[{"value": "active_cross", "score": 1.0, "label": "Regular Bank <-> Wallet transfers"}, {"value": "single_channel", "score": 0.7, "label": "Bank only or Wallet only"}]'::jsonb, 0.7, false, 11),

  -- Block X (Alternative Data)
  ('agent_txn_history', 'X', 'Agent Footprint Duration (Months)', 'Months transacting with recognized agent locations', 'number', 'months',
   '[{"max": 3, "score": 0.3}, {"min": 3, "max": 12, "score": 0.7}, {"min": 12, "score": 1.0}]'::jsonb, 1.2, false, 1),
  ('remittance_regularity_months', 'X', 'Remittance Frequency (Past 12m)', 'Months with incoming money transfer from family/abroad', 'number', 'months',
   '[{"max": 2, "score": 0.1}, {"min": 3, "max": 5, "score": 0.4}, {"min": 6, "max": 9, "score": 0.75}, {"min": 10, "score": 1.0}]'::jsonb, 1.4, false, 2),
  ('remittance_amount_stability', 'X', 'Remittance Stability', 'Consistency of received transfer amounts', 'choice', null,
   '[{"value": "stable", "score": 1.0, "label": "Predictable Sum"}, {"value": "variable", "score": 0.6, "label": "Variable Amount"}]'::jsonb, 0.9, false, 3),
  ('same_sender_months', 'X', 'Single Primary Sender (Months)', 'Consecutive months received from identical verified sender', 'number', 'months',
   '[{"max": 2, "score": 0.3}, {"min": 3, "max": 6, "score": 0.7}, {"min": 6, "score": 1.0}]'::jsonb, 0.9, false, 4),
  ('receiving_channel', 'X', 'Remittance Channel', 'Method of transfer arrival', 'choice', null,
   '[{"value": "unitel_money", "score": 1.0, "label": "Unitel Money / Bank Deposit"}, {"value": "western_union", "score": 0.8, "label": "Western Union / MoneyGram"}, {"value": "informal", "score": 0.5, "label": "Informal / Peer courier"}]'::jsonb, 0.8, false, 5),
  ('utility_bills_paid', 'X', 'Utility Bills Paid On-Time', 'Continuous verified ENDE electricity or EPAL water payments', 'number', 'months',
   '[{"max": 0, "score": 0.3}, {"min": 1, "max": 4, "score": 0.65}, {"min": 5, "score": 1.0}]'::jsonb, 1.1, false, 6),
  ('nif_standing', 'X', 'Tax Identification (NIF) Standing', 'AGT national tax number registration status', 'choice', null,
   '[{"value": "active_good", "score": 1.0, "label": "Active & In Good Standing"}, {"value": "registered", "score": 0.8, "label": "Registered with AGT"}, {"value": "none", "score": 0.5, "label": "No NIF (Unregistered)"}]'::jsonb, 0.9, false, 7),
  ('inss_record', 'X', 'Social Security (INSS) Record', 'Active contributions to Instituto Nacional de Seguranca Social', 'boolean', null,
   '[{"value": true, "score": 1.0, "label": "Active Contributor"}, {"value": false, "score": 0.5, "label": "Not Registered"}]'::jsonb, 1.0, false, 8),
  ('business_licence', 'X', 'Municipal Business Permit / Alvará', 'Local municipal trade permit', 'choice', null,
   '[{"value": "alvara_comercial", "score": 1.0, "label": "Official Alvará Comercial"}, {"value": "municipal_receipt", "score": 0.75, "label": "Municipal Tax Receipt"}, {"value": "none", "score": 0.4, "label": "Informal Trader"}]'::jsonb, 0.9, false, 9),
  ('kixikila_member', 'X', 'Rotating Savings (Kixikila) Member', 'Informal community ROSCA membership (Stored, weight 0)', 'boolean', null,
   '[{"value": true, "score": 0.0, "label": "Member"}, {"value": false, "score": 0.0, "label": "Non-member"}]'::jsonb, 0.0, false, 10),

  -- Block A (Assets & Income - Optional Bonus up to 6 pts)
  ('owns_house', 'A', 'Owns Residential House', 'Angola average ~73%. Adds +2 pts. Never reduces score.', 'yes_no_skip', null,
   '[{"value": "yes", "score": 2.0}, {"value": "no", "score": 0.0}, {"value": "skip", "score": 0.0}]'::jsonb, 1.0, false, 1),
  ('has_land_title', 'A', 'Has Official Land Title (Direito de Superfície)', 'Angola average ~28%. Adds +1 pt. Never reduces score.', 'yes_no_skip', null,
   '[{"value": "yes", "score": 1.0}, {"value": "no", "score": 0.0}, {"value": "skip", "score": 0.0}]'::jsonb, 1.0, false, 2),
  ('owns_two_wheeler', 'A', 'Owns Motorbike / Scooter', 'Angola average ~13%. Adds +1 pt. Never reduces score.', 'yes_no_skip', null,
   '[{"value": "yes", "score": 1.0}, {"value": "no", "score": 0.0}, {"value": "skip", "score": 0.0}]'::jsonb, 1.0, false, 3),
  ('owns_car', 'A', 'Owns Automobile', 'Angola average ~3-4%. Adds +2 pts. Never reduces score.', 'yes_no_skip', null,
   '[{"value": "yes", "score": 2.0}, {"value": "no", "score": 0.0}, {"value": "skip", "score": 0.0}]'::jsonb, 1.0, false, 4),
  ('income_band', 'A', 'Monthly Income Band', 'Determines credit limit cap and affordability check', 'choice', null, null, 1.0, false, 5),
  ('emi_share_pct', 'A', 'EMI to Income Ratio (%)', 'Calculated EMI burden vs monthly capacity', 'number', '%', null, 1.0, false, 6)
on conflict (key) do update set
  label = excluded.label, help = excluded.help, input = excluded.input,
  bands = excluded.bands, weight = excluded.weight, is_candidate = excluded.is_candidate, sort = excluded.sort;

-- 13. Equipment Catalog (Prices in Kwanza Kz)
insert into equipment (id, name, category, price_kz, active) values
  ('e0000000-0000-0000-0000-000000000001', 'Unitel Feature Phone 2G/3G (FM Radio, Dual SIM)', 'Basic Phone', 18000, true),
  ('e0000000-0000-0000-0000-000000000002', 'Unitel Smart 4G (Android Go, 32GB)', 'Entry Smartphone', 45000, true),
  ('e0000000-0000-0000-0000-000000000003', 'Solar Home Lighting & Phone Charging Kit', 'Solar Appliance', 65000, true),
  ('e0000000-0000-0000-0000-000000000004', '4G LTE Portable Pocket Wi-Fi Router Kit', 'Network Device', 35000, true),
  ('e0000000-0000-0000-0000-000000000005', 'Samsung Galaxy A05 4G (64GB)', 'Mid Smartphone', 85000, true),
  ('e0000000-0000-0000-0000-000000000006', 'Xiaomi Redmi 13C 4G (128GB)', 'Mid Smartphone', 120000, true),
  ('e0000000-0000-0000-0000-000000000007', 'Samsung Galaxy A15 4G (128GB, AMOLED)', 'High Smartphone', 165000, true),
  ('e0000000-0000-0000-0000-000000000008', 'Lenovo Tab M10 4G LTE Tablet (64GB)', 'Tablet', 210000, true)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_kz = excluded.price_kz, active = excluded.active;

-- 14. Sample Customers for Benchmark Personas (S1, S3, S7)
insert into customers (id, full_name, msisdn, national_id_masked, date_of_birth, sim_activation_date, created_by) values
  ('a0000000-0000-0000-0000-000000000001', 'Joao Manuel Baptista', '+244 923 100 001', '*******LA41', '1984-06-15', '2022-04-10', '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', 'Esperanca Teresa Domingos', '+244 923 200 002', '*******BA09', '1998-11-20', '2023-08-01', '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', 'Dr. Paulo Henrique Afonso', '+244 923 300 003', '*******UE92', '1979-03-08', '2019-01-15', '00000000-0000-0000-0000-000000000001')
on conflict (id) do update set
  full_name = excluded.full_name, msisdn = excluded.msisdn, national_id_masked = excluded.national_id_masked;
