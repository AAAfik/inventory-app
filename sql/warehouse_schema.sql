-- ═══════════════════════════════════════════════════════════════════════
-- CAESAR WAREHOUSE — Multi-warehouse, multi-category asset tracking
-- ═══════════════════════════════════════════════════════════════════════
-- Run this in Supabase SQL Editor. Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. WAREHOUSES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.warehouses (
  id            SERIAL PRIMARY KEY,
  property_id   SMALLINT REFERENCES procure.properties(id),
  code          TEXT NOT NULL UNIQUE,               -- e.g. "CR-MAIN"
  name          TEXT NOT NULL,                      -- "Caesar Resort Main Warehouse"
  location      TEXT,                               -- physical location description
  keeper_user_id UUID REFERENCES auth.users(id),   -- responsible warehouse keeper
  photo_url     TEXT,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_warehouses_property ON public.warehouses(property_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_keeper ON public.warehouses(keeper_user_id);


-- ─── 2. ASSETS (Equipment + Tools + Vehicles) ────────────────────────
-- Consumables stay in the existing public.items table.
CREATE TABLE IF NOT EXISTS public.assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_no          TEXT NOT NULL UNIQUE,           -- e.g. "AST-2026-0001" for QR code
  kind              TEXT NOT NULL CHECK (kind IN ('equipment','tool','vehicle')),
  name              TEXT NOT NULL,
  brand             TEXT,
  model             TEXT,
  serial_number     TEXT,
  plate_number      TEXT,                           -- for vehicles
  photo_url         TEXT,
  qr_code_data      TEXT,                           -- what QR encodes (usually asset_no)

  -- Location & ownership
  warehouse_id      INTEGER REFERENCES public.warehouses(id),
  current_location  TEXT,                           -- descriptive location if not in warehouse
  assigned_to_user_id UUID REFERENCES auth.users(id),
  status            TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','checked_out','in_service','retired','lost')),

  -- Purchase info
  purchased_at      DATE,
  purchase_price    NUMERIC(12,2),
  currency          TEXT DEFAULT 'EUR',
  warranty_expires_at DATE,
  supplier_name     TEXT,

  -- Meta
  category          TEXT,                           -- free-form category tag
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES auth.users(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assets_kind ON public.assets(kind);
CREATE INDEX IF NOT EXISTS idx_assets_warehouse ON public.assets(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_assigned ON public.assets(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_assets_asset_no ON public.assets(asset_no);


-- ─── 3. ASSET MOVEMENTS (check-in / check-out / transfer / service) ──
CREATE TABLE IF NOT EXISTS public.asset_movements (
  id                BIGSERIAL PRIMARY KEY,
  asset_id          UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  movement_type     TEXT NOT NULL
    CHECK (movement_type IN ('checkout','checkin','transfer','service_start','service_end','retire','photo_added','info_updated')),
  from_warehouse_id INTEGER REFERENCES public.warehouses(id),
  to_warehouse_id   INTEGER REFERENCES public.warehouses(id),
  from_user_id      UUID REFERENCES auth.users(id),
  to_user_id        UUID REFERENCES auth.users(id),
  from_location     TEXT,
  to_location       TEXT,
  purpose           TEXT,                           -- "pool cleaning at Iskele"
  expected_return_at TIMESTAMPTZ,                   -- for checkout
  actual_return_at  TIMESTAMPTZ,                    -- filled on checkin
  photos            TEXT[] DEFAULT '{}',
  notes             TEXT,
  performed_by      UUID NOT NULL REFERENCES auth.users(id),
  performed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_movements_asset ON public.asset_movements(asset_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_performer ON public.asset_movements(performed_by);


-- ─── 4. CONSUMABLE STOCK per warehouse ───────────────────────────────
-- Extends the existing public.items table with per-warehouse stock levels.
CREATE TABLE IF NOT EXISTS public.consumable_stock (
  id            BIGSERIAL PRIMARY KEY,
  item_id       INTEGER NOT NULL,                   -- ref public.items(id)
  warehouse_id  INTEGER NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  qty           NUMERIC(12,3) NOT NULL DEFAULT 0,
  min_qty       NUMERIC(12,3),                      -- reorder threshold
  max_qty       NUMERIC(12,3),                      -- storage capacity
  location_in_warehouse TEXT,                       -- "Aisle 3, Shelf B"
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, warehouse_id)
);
CREATE INDEX IF NOT EXISTS idx_stock_warehouse ON public.consumable_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_item ON public.consumable_stock(item_id);


-- ─── 5. CONSUMABLE MOVEMENTS (in / out / transfer / adjust) ──────────
CREATE TABLE IF NOT EXISTS public.consumable_movements (
  id            BIGSERIAL PRIMARY KEY,
  item_id       INTEGER NOT NULL,
  warehouse_id  INTEGER NOT NULL REFERENCES public.warehouses(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in','out','transfer_in','transfer_out','adjust')),
  qty           NUMERIC(12,3) NOT NULL,
  unit          TEXT DEFAULT 'unit',
  reason        TEXT,                               -- "pool cleaning", "restock from PO"
  reference_no  TEXT,                               -- PO number, requisition, etc.
  related_warehouse_id INTEGER REFERENCES public.warehouses(id),  -- for transfers
  photos        TEXT[] DEFAULT '{}',
  notes         TEXT,
  performed_by  UUID NOT NULL REFERENCES auth.users(id),
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cmoves_warehouse ON public.consumable_movements(warehouse_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cmoves_item ON public.consumable_movements(item_id);


-- ─── 6. ASSET SERVICE HISTORY ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_service_logs (
  id            BIGSERIAL PRIMARY KEY,
  asset_id      UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  service_type  TEXT NOT NULL,                      -- "maintenance", "repair", "inspection"
  service_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  cost          NUMERIC(12,2),
  currency      TEXT DEFAULT 'EUR',
  service_provider TEXT,
  description   TEXT,
  photos        TEXT[] DEFAULT '{}',
  next_service_date DATE,
  logged_by     UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_service_asset ON public.asset_service_logs(asset_id, service_date DESC);


-- ─── 7. Auto-update triggers ─────────────────────────────────────────
-- When an asset movement happens, update the asset's current state.
CREATE OR REPLACE FUNCTION public.apply_asset_movement()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.movement_type = 'checkout' THEN
    UPDATE public.assets
      SET status = 'checked_out',
          assigned_to_user_id = NEW.to_user_id,
          current_location = COALESCE(NEW.to_location, current_location),
          warehouse_id = CASE WHEN NEW.to_warehouse_id IS NOT NULL THEN NEW.to_warehouse_id ELSE warehouse_id END,
          updated_at = NOW()
      WHERE id = NEW.asset_id;
  ELSIF NEW.movement_type = 'checkin' THEN
    UPDATE public.assets
      SET status = 'available',
          assigned_to_user_id = NULL,
          current_location = NULL,
          warehouse_id = COALESCE(NEW.to_warehouse_id, warehouse_id),
          updated_at = NOW()
      WHERE id = NEW.asset_id;
  ELSIF NEW.movement_type = 'transfer' THEN
    UPDATE public.assets
      SET warehouse_id = NEW.to_warehouse_id,
          current_location = NEW.to_location,
          updated_at = NOW()
      WHERE id = NEW.asset_id;
  ELSIF NEW.movement_type = 'service_start' THEN
    UPDATE public.assets SET status = 'in_service', updated_at = NOW() WHERE id = NEW.asset_id;
  ELSIF NEW.movement_type = 'service_end' THEN
    UPDATE public.assets SET status = 'available', updated_at = NOW() WHERE id = NEW.asset_id;
  ELSIF NEW.movement_type = 'retire' THEN
    UPDATE public.assets SET status = 'retired', is_active = FALSE, updated_at = NOW() WHERE id = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asset_movement ON public.asset_movements;
CREATE TRIGGER trg_asset_movement
  AFTER INSERT ON public.asset_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_asset_movement();

-- When a consumable movement happens, update stock levels.
CREATE OR REPLACE FUNCTION public.apply_consumable_movement()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  delta NUMERIC;
BEGIN
  IF NEW.movement_type IN ('in','transfer_in') THEN
    delta := NEW.qty;
  ELSIF NEW.movement_type IN ('out','transfer_out') THEN
    delta := -NEW.qty;
  ELSIF NEW.movement_type = 'adjust' THEN
    -- For adjust, qty can be positive or negative directly
    delta := NEW.qty;
  END IF;

  INSERT INTO public.consumable_stock (item_id, warehouse_id, qty, updated_at)
  VALUES (NEW.item_id, NEW.warehouse_id, delta, NOW())
  ON CONFLICT (item_id, warehouse_id)
  DO UPDATE SET qty = public.consumable_stock.qty + EXCLUDED.qty,
                updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consumable_movement ON public.consumable_movements;
CREATE TRIGGER trg_consumable_movement
  AFTER INSERT ON public.consumable_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_consumable_movement();


-- ─── 8. RLS (all authenticated users can access via app logic) ───────
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumable_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumable_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_service_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY p_wh_read  ON public.warehouses FOR SELECT TO authenticated USING (TRUE);
  CREATE POLICY p_wh_write ON public.warehouses FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY p_ast_read  ON public.assets FOR SELECT TO authenticated USING (TRUE);
  CREATE POLICY p_ast_write ON public.assets FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY p_astmove_read  ON public.asset_movements FOR SELECT TO authenticated USING (TRUE);
  CREATE POLICY p_astmove_write ON public.asset_movements FOR INSERT TO authenticated WITH CHECK (performed_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY p_stock_read  ON public.consumable_stock FOR SELECT TO authenticated USING (TRUE);
  CREATE POLICY p_stock_write ON public.consumable_stock FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY p_cmove_read  ON public.consumable_movements FOR SELECT TO authenticated USING (TRUE);
  CREATE POLICY p_cmove_write ON public.consumable_movements FOR INSERT TO authenticated WITH CHECK (performed_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY p_svc_read  ON public.asset_service_logs FOR SELECT TO authenticated USING (TRUE);
  CREATE POLICY p_svc_write ON public.asset_service_logs FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── 9. SEED — one warehouse per property ────────────────────────────
INSERT INTO public.warehouses (property_id, code, name, location)
SELECT p.id, p.code || '-MAIN', 'Main Warehouse — ' || p.name, p.name || ' main storage'
FROM procure.properties p
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- DONE.
-- Verify with:
--   SELECT * FROM public.warehouses;         -- should return 4 rows
--   SELECT count(*) FROM public.assets;      -- 0 (empty, ready to fill)
-- ═══════════════════════════════════════════════════════════════════════
