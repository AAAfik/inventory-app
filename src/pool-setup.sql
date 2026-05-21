-- ═══════════════════════════════════════════════════════════════════
-- StockTrack — Pool Chemical Monitoring Module
-- Caesar Resort KKTC — 22 Pools
-- Run in: Supabase → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════

-- 1. Create pools table
CREATE TABLE IF NOT EXISTS public.pools (
  id          bigserial primary key,
  name        text not null,
  pool_type   text default 'outdoor', -- outdoor, indoor, kids, river
  volume_m3   int not null,
  -- Monthly baseline (kg/month) from 18.02.2026 quote
  b_pwd56     numeric default 0,   -- Powder Chlorine 56%
  b_pwd90     numeric default 0,   -- Powder Chlorine 90%
  b_flo       numeric default 0,   -- Flocculant
  b_alg       numeric default 0,   -- Algaecide
  b_cla       numeric default 0,   -- Clarifier
  b_lcl       numeric default 0,   -- Liquid Chlorine (kg)
  b_lac       numeric default 0,   -- Liquid Acid (kg)
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- 2. Create pool chemical logs table
CREATE TABLE IF NOT EXISTS public.pool_chemical_logs (
  id          bigserial primary key,
  pool_id     bigint references public.pools(id),
  log_date    date not null default current_date,
  -- Actual quantities added (kg)
  qty_pwd56   numeric default 0,
  qty_pwd90   numeric default 0,
  qty_flo     numeric default 0,
  qty_alg     numeric default 0,
  qty_cla     numeric default 0,
  qty_lcl     numeric default 0,
  qty_lac     numeric default 0,
  -- Water quality (optional)
  ph_level    text,
  cl_ppm      text,
  notes       text,
  logged_by   text,
  created_at  timestamptz default now()
);

-- 3. Enable RLS
ALTER TABLE public.pools            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_chemical_logs ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies (safe to re-run)
DROP POLICY IF EXISTS "read_all_auth"     ON public.pools;
DROP POLICY IF EXISTS "insert_admin_only" ON public.pools;
DROP POLICY IF EXISTS "update_admin_only" ON public.pools;
DROP POLICY IF EXISTS "delete_admin_only" ON public.pools;
DROP POLICY IF EXISTS "read_all_auth"     ON public.pool_chemical_logs;
DROP POLICY IF EXISTS "insert_auth"       ON public.pool_chemical_logs;
DROP POLICY IF EXISTS "update_admin_only" ON public.pool_chemical_logs;
DROP POLICY IF EXISTS "delete_admin_only" ON public.pool_chemical_logs;

-- 5. Create RLS policies
CREATE POLICY "read_all_auth"     ON public.pools FOR SELECT    TO authenticated USING (true);
CREATE POLICY "insert_admin_only" ON public.pools FOR INSERT    TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "update_admin_only" ON public.pools FOR UPDATE    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "delete_admin_only" ON public.pools FOR DELETE    TO authenticated USING (public.is_admin());

CREATE POLICY "read_all_auth"     ON public.pool_chemical_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_auth"       ON public.pool_chemical_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_admin_only" ON public.pool_chemical_logs FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "delete_admin_only" ON public.pool_chemical_logs FOR DELETE TO authenticated USING (public.is_admin());

-- 6. Insert all 22 Caesar Resort pools with monthly baselines
INSERT INTO public.pools (name, pool_type, volume_m3, b_pwd56, b_pwd90, b_flo, b_alg, b_cla, b_lcl, b_lac)
VALUES
  ('Lucca Indoor Pool',     'indoor',  120,  0,   0,   10,  10,  20,  250,  100),
  ('Lucca Pool',            'outdoor', 948,  50,  50,  80,  140, 80,  1750, 750),
  ('Olympic Pool',          'outdoor', 530,  25,  25,  20,  40,  20,  1000, 400),
  ('Pamukkale',             'outdoor', 850,  40,  40,  60,  120, 60,  1500, 600),
  ('Aqua Pool',             'outdoor', 250,  10,  10,  20,  40,  20,  450,  150),
  ('Tropic Sandy Pool',     'outdoor', 1100, 100, 100, 90,  180, 90,  1850, 850),
  ('Lucius Pool',           'outdoor', 250,  10,  10,  20,  40,  20,  450,  150),
  ('Gallus',                'outdoor', 190,  10,  10,  20,  40,  20,  400,  125),
  ('Aspasianus',            'outdoor', 545,  30,  20,  20,  40,  20,  1100, 450),
  ('Pantheon Indoor Pool',  'indoor',  140,  0,   0,   10,  20,  10,  275,  125),
  ('Amelius Pool',          'outdoor', 224,  10,  10,  20,  40,  20,  425,  125),
  ('Lagoon',                'outdoor', 730,  40,  40,  40,  100, 40,  1400, 500),
  ('Cafe Paris Remus',      'outdoor', 255,  10,  10,  20,  40,  20,  475,  175),
  ('Italus',                'outdoor', 244,  10,  10,  20,  40,  20,  475,  175),
  ('Didius',                'outdoor', 135,  10,  10,  10,  20,  10,  325,  125),
  ('Socrates',              'outdoor', 355,  25,  25,  20,  40,  20,  750,  325),
  ('Severus',               'outdoor', 145,  10,  10,  10,  20,  10,  350,  125),
  ('Lazy River Nehir',      'river',   215,  10,  10,  20,  40,  20,  450,  150),
  ('Romulus Kids Salt',     'kids',    122,  10,  10,  20,  40,  20,  350,  100),
  ('Cyrus Pool',            'outdoor', 250,  10,  10,  20,  40,  20,  450,  150),
  ('Darius',                'outdoor', 170,  10,  10,  20,  40,  20,  375,  125),
  ('Lazy River Pool',       'river',   387,  35,  35,  20,  40,  20,  825,  375)
ON CONFLICT DO NOTHING;

-- 7. Verify
SELECT
  '✓ Pool module ready!' AS status,
  (SELECT COUNT(*) FROM public.pools) AS total_pools,
  (SELECT SUM(volume_m3) FROM public.pools) AS total_volume_m3,
  (SELECT COUNT(*) FROM public.pool_chemical_logs) AS total_logs;
