-- Migration: 20261117000001_add_src_telecom_recharges.sql
-- Table: src_telecom_recharges
-- Columns: customer_ref, month (YYYY-MM), recharge_count, recharge_value_kz

CREATE TABLE IF NOT EXISTS src_telecom_recharges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_ref TEXT NOT NULL,
    month TEXT NOT NULL,
    recharge_count INTEGER NOT NULL DEFAULT 0,
    recharge_value_kz NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_src_telecom_recharges_ref ON src_telecom_recharges(customer_ref);
CREATE INDEX IF NOT EXISTS idx_src_telecom_recharges_month ON src_telecom_recharges(month);

ALTER TABLE src_telecom_recharges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read src_telecom_recharges" ON src_telecom_recharges FOR SELECT USING (true);
CREATE POLICY "Allow admin all src_telecom_recharges" ON src_telecom_recharges FOR ALL USING (true);

-- Seed 12 months for demo customers
-- 1. Matthew Silva (+244 923 000 101) - In-between: 11 of 12 months, ~4,500 Kz/mo, 3 recharges/mo
INSERT INTO src_telecom_recharges (customer_ref, month, recharge_count, recharge_value_kz) VALUES
('+244 923 000 101', '2025-12', 3, 4500),
('+244 923 000 101', '2026-01', 4, 5000),
('+244 923 000 101', '2026-02', 0, 0),
('+244 923 000 101', '2026-03', 3, 4500),
('+244 923 000 101', '2026-04', 3, 4500),
('+244 923 000 101', '2026-05', 4, 5000),
('+244 923 000 101', '2026-06', 3, 4500),
('+244 923 000 101', '2026-07', 3, 4500),
('+244 923 000 101', '2026-08', 4, 5000),
('+244 923 000 101', '2026-09', 3, 4500),
('+244 923 000 101', '2026-10', 3, 4500),
('+244 923 000 101', '2026-11', 3, 4500);

-- 2. Tomas Neto (+244 923 000 102) - Few small recharges: 8 of 12 months, ~1,800 Kz/mo, 1 recharge/mo
INSERT INTO src_telecom_recharges (customer_ref, month, recharge_count, recharge_value_kz) VALUES
('+244 923 000 102', '2025-12', 1, 1500),
('+244 923 000 102', '2026-01', 2, 2000),
('+244 923 000 102', '2026-02', 0, 0),
('+244 923 000 102', '2026-03', 1, 1500),
('+244 923 000 102', '2026-04', 0, 0),
('+244 923 000 102', '2026-05', 2, 2200),
('+244 923 000 102', '2026-06', 0, 0),
('+244 923 000 102', '2026-07', 1, 1800),
('+244 923 000 102', '2026-08', 0, 0),
('+244 923 000 102', '2026-09', 1, 1800),
('+244 923 000 102', '2026-10', 1, 1800),
('+244 923 000 102', '2026-11', 1, 1800);

-- 3. Carlos Mateus (+244 923 000 103) - Banked: 10 of 12 months, ~6,000 Kz/mo, 4 recharges/mo
INSERT INTO src_telecom_recharges (customer_ref, month, recharge_count, recharge_value_kz) VALUES
('+244 923 000 103', '2025-12', 4, 6000),
('+244 923 000 103', '2026-01', 4, 6000),
('+244 923 000 103', '2026-02', 0, 0),
('+244 923 000 103', '2026-03', 4, 6000),
('+244 923 000 103', '2026-04', 5, 7000),
('+244 923 000 103', '2026-05', 4, 6000),
('+244 923 000 103', '2026-06', 0, 0),
('+244 923 000 103', '2026-07', 4, 6000),
('+244 923 000 103', '2026-08', 4, 6000),
('+244 923 000 103', '2026-09', 4, 6000),
('+244 923 000 103', '2026-10', 4, 6000),
('+244 923 000 103', '2026-11', 4, 6000);

-- 4. Pedro Santos (+244 923 000 104) - Frequent larger ones: 12 of 12 months, ~16,000 Kz/mo, 9 recharges/mo
INSERT INTO src_telecom_recharges (customer_ref, month, recharge_count, recharge_value_kz) VALUES
('+244 923 000 104', '2025-12', 9, 16000),
('+244 923 000 104', '2026-01', 9, 16000),
('+244 923 000 104', '2026-02', 8, 15000),
('+244 923 000 104', '2026-03', 9, 16000),
('+244 923 000 104', '2026-04', 9, 16000),
('+244 923 000 104', '2026-05', 10, 17000),
('+244 923 000 104', '2026-06', 9, 16000),
('+244 923 000 104', '2026-07', 9, 16000),
('+244 923 000 104', '2026-08', 9, 16000),
('+244 923 000 104', '2026-09', 9, 16000),
('+244 923 000 104', '2026-10', 9, 16000),
('+244 923 000 104', '2026-11', 9, 16000);

-- 5. Isabel Fernandes (+244 923 000 105) - In-between: 12 of 12 months, ~9,000 Kz/mo, 6 recharges/mo
INSERT INTO src_telecom_recharges (customer_ref, month, recharge_count, recharge_value_kz) VALUES
('+244 923 000 105', '2025-12', 6, 9000),
('+244 923 000 105', '2026-01', 6, 9000),
('+244 923 000 105', '2026-02', 6, 9000),
('+244 923 000 105', '2026-03', 6, 9000),
('+244 923 000 105', '2026-04', 6, 9000),
('+244 923 000 105', '2026-05', 7, 10000),
('+244 923 000 105', '2026-06', 6, 9000),
('+244 923 000 105', '2026-07', 6, 9000),
('+244 923 000 105', '2026-08', 6, 9000),
('+244 923 000 105', '2026-09', 6, 9000),
('+244 923 000 105', '2026-10', 6, 9000),
('+244 923 000 105', '2026-11', 6, 9000);

-- 6. Joaquim Baptista (+244 923 000 106) - Irregular: 4 of 12 months, small recharges
INSERT INTO src_telecom_recharges (customer_ref, month, recharge_count, recharge_value_kz) VALUES
('+244 923 000 106', '2025-12', 0, 0),
('+244 923 000 106', '2026-01', 0, 0),
('+244 923 000 106', '2026-02', 0, 0),
('+244 923 000 106', '2026-03', 0, 0),
('+244 923 000 106', '2026-04', 0, 0),
('+244 923 000 106', '2026-05', 1, 1500),
('+244 923 000 106', '2026-06', 0, 0),
('+244 923 000 106', '2026-07', 1, 2000),
('+244 923 000 106', '2026-08', 0, 0),
('+244 923 000 106', '2026-09', 1, 1500),
('+244 923 000 106', '2026-10', 0, 0),
('+244 923 000 106', '2026-11', 1, 2000);

-- 7. New Customer (+244 923 000 107) - Leave with NO rows
