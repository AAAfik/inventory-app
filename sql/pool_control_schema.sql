-- ═══════════════════════════════════════════════════════════════════════
-- POOL CONTROL — pool profiles + chemical dosing + auto warehouse deduction
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Pools with volume profile ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pools (
  id             SERIAL PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  property_id    SMALLINT REFERENCES public.wh_properties(id),
  volume_m3      NUMERIC NOT NULL DEFAULT 0,
  depth_m        NUMERIC,
  surface_m2     NUMERIC,
  pool_type      TEXT DEFAULT 'main'
    CHECK (pool_type IN ('main','kids','jacuzzi','spa','plunge','indoor')),
  location_note  TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pools_property ON public.pools(property_id) WHERE is_active;

-- ─── 2. Chemical catalog with recommended dosage ─────────────────────
CREATE TABLE IF NOT EXISTS public.pool_chemicals (
  id                 SERIAL PRIMARY KEY,
  code               TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  unit               TEXT NOT NULL,              -- 'g' | 'ml' | 'kg' | 'L' | 'tab'
  dosage_per_m3      NUMERIC,                    -- recommended amount per m³ per treatment
  purpose            TEXT,                       -- 'sanitizer','ph_up','ph_down','algaecide','clarifier','stabilizer','shock'
  item_id            INTEGER REFERENCES public.items(id) ON DELETE SET NULL,
  min_stock_alert    NUMERIC DEFAULT 5,
  unit_cost          NUMERIC,                    -- fallback cost per unit if item pricing unknown
  currency           TEXT DEFAULT 'EUR',
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. Treatments (audit trail per pool visit) ──────────────────────
CREATE TABLE IF NOT EXISTS public.pool_treatments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_no       TEXT NOT NULL UNIQUE,
  pool_id            INTEGER NOT NULL REFERENCES public.pools(id),
  operator_id        UUID REFERENCES auth.users(id),
  operator_name      TEXT,
  performed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Readings
  ph_before          NUMERIC,
  ph_after           NUMERIC,
  chlorine_ppm       NUMERIC,
  water_temp         NUMERIC,
  clarity            TEXT,                       -- 'clear','cloudy','green','turbid'
  -- Evidence
  photos             TEXT[] NOT NULL DEFAULT '{}',
  notes              TEXT,
  -- Cost rollup (auto-updated by trigger)
  total_cost         NUMERIC DEFAULT 0,
  currency           TEXT DEFAULT 'EUR',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pool_treatments_pool_time ON public.pool_treatments(pool_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pool_treatments_time ON public.pool_treatments(performed_at DESC);

-- ─── 4. Treatment lines — what chemicals were used ───────────────────
CREATE TABLE IF NOT EXISTS public.pool_treatment_lines (
  id                 BIGSERIAL PRIMARY KEY,
  treatment_id       UUID NOT NULL REFERENCES public.pool_treatments(id) ON DELETE CASCADE,
  chemical_id        INTEGER REFERENCES public.pool_chemicals(id),
  chemical_name      TEXT,                       -- snapshot
  qty                NUMERIC NOT NULL CHECK (qty > 0),
  unit               TEXT,
  warehouse_id       INTEGER REFERENCES public.warehouses(id),
  unit_cost          NUMERIC,
  total_cost         NUMERIC,
  auto_deducted      BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_ptl_treatment ON public.pool_treatment_lines(treatment_id);
CREATE INDEX IF NOT EXISTS idx_ptl_chemical  ON public.pool_treatment_lines(chemical_id);


-- ─── 5. TRIGGER — auto-deduct from warehouse consumable_stock ────────
CREATE OR REPLACE FUNCTION public.pool_line_deducts_stock()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_item_id INTEGER;
  v_unit_cost NUMERIC;
BEGIN
  -- Fetch linked item_id + fallback cost from pool_chemicals
  SELECT item_id, unit_cost INTO v_item_id, v_unit_cost
  FROM public.pool_chemicals
  WHERE id = NEW.chemical_id;

  -- If chemical links to a warehouse item AND warehouse_id provided, deduct stock
  IF v_item_id IS NOT NULL AND NEW.warehouse_id IS NOT NULL AND NEW.qty > 0 THEN
    INSERT INTO public.consumable_movements (
      item_id, warehouse_id, qty, movement_type, notes, performed_by
    ) VALUES (
      v_item_id,
      NEW.warehouse_id,
      -ABS(NEW.qty),
      'issue',
      'Pool treatment ' || NEW.treatment_id::TEXT,
      auth.uid()
    );
    NEW.auto_deducted := TRUE;
  END IF;

  -- Compute cost snapshot
  IF NEW.unit_cost IS NULL THEN NEW.unit_cost := v_unit_cost; END IF;
  IF NEW.unit_cost IS NOT NULL THEN NEW.total_cost := NEW.unit_cost * NEW.qty; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pool_line_deducts_stock ON public.pool_treatment_lines;
CREATE TRIGGER trg_pool_line_deducts_stock
BEFORE INSERT ON public.pool_treatment_lines
FOR EACH ROW EXECUTE FUNCTION public.pool_line_deducts_stock();


-- ─── 6. TRIGGER — roll up total_cost onto pool_treatments ────────────
CREATE OR REPLACE FUNCTION public.pool_treatment_recalc_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_total NUMERIC;
DECLARE v_tid UUID;
BEGIN
  v_tid := COALESCE(NEW.treatment_id, OLD.treatment_id);
  SELECT COALESCE(SUM(total_cost), 0) INTO v_total
  FROM public.pool_treatment_lines WHERE treatment_id = v_tid;
  UPDATE public.pool_treatments SET total_cost = v_total WHERE id = v_tid;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_pt_recalc ON public.pool_treatment_lines;
CREATE TRIGGER trg_pt_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.pool_treatment_lines
FOR EACH ROW EXECUTE FUNCTION public.pool_treatment_recalc_total();


-- ─── 7. RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.pools                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_chemicals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_treatments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_treatment_lines   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY p_pools_all ON public.pools FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY p_pchem_all ON public.pool_chemicals FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY p_ptrt_all ON public.pool_treatments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY p_ptl_all ON public.pool_treatment_lines FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── 8. SEED — 7 standard chemicals ──────────────────────────────────
INSERT INTO public.pool_chemicals (code, name, unit, dosage_per_m3, purpose, unit_cost, min_stock_alert)
VALUES
  ('CHL-GRAN', 'Chlorine granules (calcium hypochlorite 65%)', 'g',  10,   'sanitizer',   0.008, 5000),
  ('CHL-TAB',  'Chlorine tablets (trichlor)',                 'tab', 0.03, 'sanitizer',   0.30,  100),
  ('PH-DOWN',  'pH minus (sodium bisulfate)',                 'g',   15,   'ph_down',     0.006, 3000),
  ('PH-UP',    'pH plus (sodium carbonate)',                  'g',   15,   'ph_up',       0.005, 3000),
  ('ALG',      'Algaecide (concentrated)',                    'ml',  3,    'algaecide',   0.015, 2000),
  ('FLOC',     'Flocculant / clarifier',                      'ml',  3,    'clarifier',   0.010, 1000),
  ('STAB',     'Stabilizer (cyanuric acid)',                  'g',   25,   'stabilizer',  0.007, 5000)
ON CONFLICT (code) DO NOTHING;


-- ─── 9. SEED — Caesar Resort Iskele pools (edit volumes as needed) ────
INSERT INTO public.pools (code, name, property_id, volume_m3, pool_type)
SELECT 'CR-P' || LPAD(g::text, 2, '0'),
       'Caesar Resort Pool ' || g,
       (SELECT id FROM public.wh_properties WHERE code = 'CR' LIMIT 1),
       CASE WHEN g <= 3 THEN 800 WHEN g <= 10 THEN 350 WHEN g <= 18 THEN 180 ELSE 45 END,
       CASE WHEN g <= 18 THEN 'main' ELSE 'kids' END
FROM generate_series(1, 22) g
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- Verify
-- SELECT count(*) FROM public.pools;                    -- 22
-- SELECT count(*) FROM public.pool_chemicals;           -- 7
-- SELECT code, name, volume_m3 FROM public.pools LIMIT 5;
