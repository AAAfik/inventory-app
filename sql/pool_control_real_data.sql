-- ═══════════════════════════════════════════════════════════════════════
-- POOL CONTROL — REAL DATA MIGRATION (Caesar Resort Cyprus)
-- Source: ÖZEL Havuz Kimyasalları quotation dated 18.02.2026
-- 22 pools with actual volumes + 7 chemicals with real prices
-- + monthly reference consumption per pool (baseline for anomaly detection)
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Clear any previous seed data (safe) ────────────────────────────
DELETE FROM public.pool_treatment_lines
WHERE treatment_id IN (SELECT id FROM public.pool_treatments);
DELETE FROM public.pool_treatments;
DELETE FROM public.pool_chemicals;
DELETE FROM public.pools;
-- Reset sequences so IDs start fresh
ALTER SEQUENCE public.pools_id_seq RESTART WITH 1;
ALTER SEQUENCE public.pool_chemicals_id_seq RESTART WITH 1;

-- ─── Reference table for monthly baseline consumption per pool ──────
CREATE TABLE IF NOT EXISTS public.pool_monthly_reference (
  id           BIGSERIAL PRIMARY KEY,
  pool_id      INTEGER NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  chemical_id  INTEGER NOT NULL REFERENCES public.pool_chemicals(id) ON DELETE CASCADE,
  monthly_qty  NUMERIC NOT NULL DEFAULT 0,
  unit         TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pool_id, chemical_id)
);
ALTER TABLE public.pool_monthly_reference ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY p_pmr_all ON public.pool_monthly_reference FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Real chemicals from ÖZEL supplier quotation ────────────────────
INSERT INTO public.pool_chemicals (code, name, unit, purpose, unit_cost, currency, min_stock_alert) VALUES
  ('TOZ-KLOR-56',  'Toz Klor %56 (Powder Chlorine 56%)',    'kg', 'sanitizer',  3.60, 'EUR', 50),
  ('TOZ-KLOR-90',  'Toz Klor %90 (Powder Chlorine 90%)',    'kg', 'sanitizer',  3.80, 'EUR', 50),
  ('COKTURUCU',    'Çöktürücü (Flocculant)',                'kg', 'clarifier',  1.35, 'EUR', 50),
  ('YOSUN-OLD',    'Yosun Öldürücü (Algaecide)',            'kg', 'algaecide',  1.50, 'EUR', 100),
  ('PARLATICI',    'Parlatıcı (Brightener/Clarifier)',      'kg', 'clarifier',  1.40, 'EUR', 50),
  ('SIVI-KLOR',    'Sıvı Klor Bidon (Liquid Chlorine)',     'kg', 'sanitizer',  1.00, 'EUR', 500),
  ('SIVI-ASIT',    'Sıvı Asit Bidon (Liquid Acid)',         'kg', 'ph_down',    0.85, 'EUR', 200);

-- ─── Real 22 pools with actual volumes (m³ = pool + balance tank) ───
INSERT INTO public.pools (code, name, property_id, volume_m3, pool_type) VALUES
  ('AQUA',         'Aqua Havuz',                (SELECT id FROM public.wh_properties WHERE code='CR'), 250,  'main'),
  ('LUCCA-K',      'Lucca Kapalı Havuz',        (SELECT id FROM public.wh_properties WHERE code='CR'), 120,  'indoor'),
  ('LUCCA',        'Lucca Havuz',               (SELECT id FROM public.wh_properties WHERE code='CR'), 948,  'main'),
  ('OLIMPIK',      'Olimpik Havuz',             (SELECT id FROM public.wh_properties WHERE code='CR'), 530,  'main'),
  ('PAMUKKALE',    'Pamukkale',                 (SELECT id FROM public.wh_properties WHERE code='CR'), 850,  'main'),
  ('LAGOON',       'Lagoon',                    (SELECT id FROM public.wh_properties WHERE code='CR'), 730,  'main'),
  ('TROPIK',       'Tropik (Kumsal) Havuz',     (SELECT id FROM public.wh_properties WHERE code='CR'), 1100, 'main'),
  ('LUCIUS',       'Lucius Havuz',              (SELECT id FROM public.wh_properties WHERE code='CR'), 250,  'main'),
  ('GALLUS',       'Gallus',                    (SELECT id FROM public.wh_properties WHERE code='CR'), 190,  'main'),
  ('ASPASIANUS',   'Aspasianus',                (SELECT id FROM public.wh_properties WHERE code='CR'), 545,  'main'),
  ('PANTHEON-K',   'Pantheon Kapalı Havuz',     (SELECT id FROM public.wh_properties WHERE code='CR'), 140,  'indoor'),
  ('AMELIUS',      'Amelius Havuz',             (SELECT id FROM public.wh_properties WHERE code='CR'), 224,  'main'),
  ('ROMULUS',      'Romulus (Çocuk Tuz) Havuzu',(SELECT id FROM public.wh_properties WHERE code='CR'), 122,  'kids'),
  ('CAFE-PARIS',   'Cafe Paris (Remus) Havuzu', (SELECT id FROM public.wh_properties WHERE code='CR'), 255,  'main'),
  ('ITALUS',       'Italus',                    (SELECT id FROM public.wh_properties WHERE code='CR'), 244,  'main'),
  ('DIDIUS',       'Didius',                    (SELECT id FROM public.wh_properties WHERE code='CR'), 135,  'main'),
  ('SOCRATES',     'Socrates',                  (SELECT id FROM public.wh_properties WHERE code='CR'), 355,  'main'),
  ('SEVERUS',      'Severus',                   (SELECT id FROM public.wh_properties WHERE code='CR'), 145,  'main'),
  ('LAZY-RIVER-N', 'Lazy River Nehir',          (SELECT id FROM public.wh_properties WHERE code='CR'), 215,  'main'),
  ('LAZY-RIVER',   'Lazy River Havuz',          (SELECT id FROM public.wh_properties WHERE code='CR'), 387,  'main'),
  ('CYRUS',        'Cyrus Havuz',               (SELECT id FROM public.wh_properties WHERE code='CR'), 250,  'main'),
  ('DARIUS',       'Darius',                    (SELECT id FROM public.wh_properties WHERE code='CR'), 170,  'main');

-- ─── Monthly reference consumption per pool (kg/month) ──────────────
-- Format: (pool_code, TOZ_KLOR_56, TOZ_KLOR_90, COKTURUCU, YOSUN_OLD, PARLATICI, SIVI_KLOR, SIVI_ASIT)
INSERT INTO public.pool_monthly_reference (pool_id, chemical_id, monthly_qty, unit)
SELECT p.id, c.id, m.qty, 'kg'
FROM (VALUES
  -- pool_code       KL56  KL90  COKT  YOSUN PARL  SIVI_KL SIVI_AS
  ('AQUA',           10,   10,   20,   40,   20,   450,    150),
  ('LUCCA-K',        0,    0,    10,   20,   10,   250,    100),
  ('LUCCA',          50,   50,   80,   140,  80,   1750,   750),
  ('OLIMPIK',        25,   25,   20,   40,   20,   1000,   400),
  ('PAMUKKALE',      40,   40,   60,   120,  60,   1500,   600),
  ('LAGOON',         40,   40,   40,   100,  40,   1400,   500),
  ('TROPIK',         100,  100,  90,   180,  90,   1850,   850),
  ('LUCIUS',         10,   10,   20,   40,   20,   450,    150),
  ('GALLUS',         10,   10,   20,   40,   20,   400,    125),
  ('ASPASIANUS',     30,   30,   20,   40,   20,   1100,   450),
  ('PANTHEON-K',     0,    0,    10,   20,   10,   275,    125),
  ('AMELIUS',        10,   10,   20,   40,   20,   425,    125),
  ('ROMULUS',        10,   10,   20,   40,   20,   350,    100),
  ('CAFE-PARIS',     10,   10,   20,   40,   20,   475,    175),
  ('ITALUS',         10,   10,   20,   40,   20,   475,    175),
  ('DIDIUS',         10,   10,   10,   20,   10,   325,    125),
  ('SOCRATES',       25,   25,   20,   40,   20,   750,    325),
  ('SEVERUS',        10,   10,   10,   20,   10,   350,    125),
  ('LAZY-RIVER-N',   10,   10,   20,   40,   20,   450,    150),
  ('LAZY-RIVER',     35,   35,   20,   40,   20,   825,    375),
  ('CYRUS',          10,   10,   20,   40,   20,   450,    150),
  ('DARIUS',         10,   10,   20,   40,   20,   375,    125)
) AS pool_data(pool_code, kl56, kl90, cokt, yosun, parl, sivi_kl, sivi_as)
CROSS JOIN LATERAL (VALUES
  ('TOZ-KLOR-56', kl56),
  ('TOZ-KLOR-90', kl90),
  ('COKTURUCU',   cokt),
  ('YOSUN-OLD',   yosun),
  ('PARLATICI',   parl),
  ('SIVI-KLOR',   sivi_kl),
  ('SIVI-ASIT',   sivi_as)
) AS m(chem_code, qty)
JOIN public.pools p ON p.code = pool_data.pool_code
JOIN public.pool_chemicals c ON c.code = m.chem_code
WHERE m.qty > 0;

-- ─── Set dosage_per_m3 as average across pools (for quick calc) ─────
-- Uses average of (monthly_qty / volume_m3) across all pools where chemical is used
UPDATE public.pool_chemicals c
SET dosage_per_m3 = ROUND((
  SELECT AVG(m.monthly_qty * 1000.0 / p.volume_m3)::numeric  -- kg → g per m³
  FROM public.pool_monthly_reference m
  JOIN public.pools p ON p.id = m.pool_id
  WHERE m.chemical_id = c.id
), 2);
-- Convert from grams-per-m³ back to whichever unit is more sensible
-- Actually, since we're using kg as the unit, let's express dosage as kg/m³/month
UPDATE public.pool_chemicals c
SET dosage_per_m3 = ROUND((
  SELECT AVG(m.monthly_qty / p.volume_m3)::numeric
  FROM public.pool_monthly_reference m
  JOIN public.pools p ON p.id = m.pool_id
  WHERE m.chemical_id = c.id
), 4);

COMMIT;

-- ─── Verify ─────────────────────────────────────────────────────────
-- SELECT count(*) AS pools FROM public.pools;                              -- 22
-- SELECT count(*) AS chemicals FROM public.pool_chemicals;                 -- 7
-- SELECT count(*) AS reference_rows FROM public.pool_monthly_reference;    -- ~150
-- SELECT code, name, volume_m3 FROM public.pools ORDER BY code;
