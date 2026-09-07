-- ═══════════════════════════════════════════════════════════════════
-- Inventory Management — full professional layer
--   1. Suppliers (already exists, hardened)
--   2. Atomic warehouse transfers
--   3. Stocktake sessions (physical count + variance)
--   4. Expiry / batch tracking views
--   5. Reorder suggestions
--   6. Reporting views (valuation, consumption, movements)
--   7. Bin/shelf location
-- Run in Supabase SQL Editor. Idempotent.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- 0) PRE-FLIGHT — make sure every column and table the views need exists
-- ═══════════════════════════════════════════════════════════════════

-- Destination / receipt columns on consumable_movements
ALTER TABLE public.consumable_movements
  ADD COLUMN IF NOT EXISTS destination_type           text,
  ADD COLUMN IF NOT EXISTS destination_pool_id        bigint,
  ADD COLUMN IF NOT EXISTS destination_department_id  bigint,
  ADD COLUMN IF NOT EXISTS destination_person_name    text,
  ADD COLUMN IF NOT EXISTS source_type                text,
  ADD COLUMN IF NOT EXISTS supplier_id                bigint,
  ADD COLUMN IF NOT EXISTS supplier_name              text,
  ADD COLUMN IF NOT EXISTS reference_no               text,
  ADD COLUMN IF NOT EXISTS unit_cost                  numeric(12,4),
  ADD COLUMN IF NOT EXISTS total_cost                 numeric(12,4),
  ADD COLUMN IF NOT EXISTS batch_number               text,
  ADD COLUMN IF NOT EXISTS expires_at                 date,
  ADD COLUMN IF NOT EXISTS photo_url                  text,
  ADD COLUMN IF NOT EXISTS related_warehouse_id       integer;

-- Items columns used by the views
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS description         text,
  ADD COLUMN IF NOT EXISTS default_supplier_id bigint,
  ADD COLUMN IF NOT EXISTS last_unit_cost      numeric(12,4),
  ADD COLUMN IF NOT EXISTS currency            text DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS is_active           boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS image_url           text;

-- Fallback tables so v_consumption can always be created.
-- If you already have these, nothing changes.
CREATE TABLE IF NOT EXISTS public.pools (
  id bigserial PRIMARY KEY,
  code text,
  name text,
  is_active boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.procurement_departments (
  id bigserial PRIMARY KEY,
  name text,
  is_active boolean DEFAULT true
);

-- The movement_type check constraint must allow every type we write
ALTER TABLE public.consumable_movements DROP CONSTRAINT IF EXISTS consumable_movements_movement_type_check;
ALTER TABLE public.consumable_movements
  ADD CONSTRAINT consumable_movements_movement_type_check
  CHECK (movement_type IN ('in','out','transfer_in','transfer_out','adjust','restock','issue'));

-- ═══════════════════════════════════════════════════════════════════
-- 1) SUPPLIERS — make sure every column the UI needs exists
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.suppliers (
  id bigserial PRIMARY KEY,
  name text NOT NULL
);
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS code            text,
  ADD COLUMN IF NOT EXISTS category        text,
  ADD COLUMN IF NOT EXISTS contact_person  text,
  ADD COLUMN IF NOT EXISTS phone           text,
  ADD COLUMN IF NOT EXISTS email           text,
  ADD COLUMN IF NOT EXISTS address          text,
  ADD COLUMN IF NOT EXISTS payment_terms   text,
  ADD COLUMN IF NOT EXISTS tax_no          text,
  ADD COLUMN IF NOT EXISTS website         text,
  ADD COLUMN IF NOT EXISTS notes           text,
  ADD COLUMN IF NOT EXISTS rating          smallint,
  ADD COLUMN IF NOT EXISTS is_active       boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at      timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by      uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_name_uniq ON public.suppliers(lower(name));
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON public.suppliers(name) WHERE is_active;

-- ═══════════════════════════════════════════════════════════════════
-- 2) BIN / SHELF LOCATION on stock rows
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.consumable_stock
  ADD COLUMN IF NOT EXISTS bin_location text;

-- ═══════════════════════════════════════════════════════════════════
-- 3) ATOMIC WAREHOUSE TRANSFER
--    Writes both legs (out of source, into destination) in one call.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.transfer_consumable(
  p_item_id        bigint,
  p_from_warehouse bigint,
  p_to_warehouse   bigint,
  p_qty            numeric,
  p_notes          text DEFAULT NULL,
  p_reference_no   text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_unit  text;
  v_avail numeric;
  v_ref   text;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  IF p_from_warehouse = p_to_warehouse THEN
    RAISE EXCEPTION 'Source and destination warehouse must differ';
  END IF;

  SELECT unit INTO v_unit FROM public.items WHERE id = p_item_id;

  SELECT COALESCE(qty, 0) INTO v_avail
  FROM public.consumable_stock
  WHERE item_id = p_item_id AND warehouse_id = p_from_warehouse;

  IF COALESCE(v_avail, 0) < p_qty THEN
    RAISE EXCEPTION 'Not enough stock in source warehouse (have %, need %)', COALESCE(v_avail,0), p_qty;
  END IF;

  v_ref := COALESCE(NULLIF(p_reference_no,''), 'TRF-' || to_char(now(),'YYYYMMDDHH24MISS'));

  -- OUT leg
  INSERT INTO public.consumable_movements
    (item_id, warehouse_id, movement_type, qty, unit, reason, reference_no,
     related_warehouse_id, notes, performed_by, performed_at)
  VALUES
    (p_item_id, p_from_warehouse, 'transfer_out', -p_qty, v_unit,
     'Transfer out', v_ref, p_to_warehouse, p_notes, v_user, now());

  -- IN leg
  INSERT INTO public.consumable_movements
    (item_id, warehouse_id, movement_type, qty, unit, reason, reference_no,
     related_warehouse_id, notes, performed_by, performed_at)
  VALUES
    (p_item_id, p_to_warehouse, 'transfer_in', p_qty, v_unit,
     'Transfer in', v_ref, p_from_warehouse, p_notes, v_user, now());

  -- Sync both stock rows
  PERFORM public.sync_item_stock(p_item_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.transfer_consumable(bigint,bigint,bigint,numeric,text,text) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 4) STOCK SYNC helper — recompute stock rows for one item
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.sync_item_stock(p_item_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.consumable_stock (item_id, warehouse_id, qty, updated_at)
  SELECT m.item_id, m.warehouse_id, SUM(m.qty), now()
  FROM public.consumable_movements m
  WHERE m.item_id = p_item_id
  GROUP BY m.item_id, m.warehouse_id
  ON CONFLICT (item_id, warehouse_id) DO UPDATE
    SET qty = EXCLUDED.qty, updated_at = now();

  UPDATE public.items i
  SET current_qty = COALESCE((
    SELECT SUM(cs.qty) FROM public.consumable_stock cs WHERE cs.item_id = i.id
  ), 0)
  WHERE i.id = p_item_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_item_stock(bigint) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 5) STOCKTAKE — physical count sessions with variance
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.stocktakes (
  id            bigserial PRIMARY KEY,
  stocktake_no  text UNIQUE,
  warehouse_id  bigint NOT NULL REFERENCES public.warehouses(id),
  status        text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','counting','review','posted','cancelled')),
  scope         text DEFAULT 'full' CHECK (scope IN ('full','category','partial')),
  scope_value   text,
  notes         text,
  started_at    timestamptz DEFAULT now(),
  started_by    uuid,
  posted_at     timestamptz,
  posted_by     uuid,
  total_lines   int DEFAULT 0,
  counted_lines int DEFAULT 0,
  variance_lines int DEFAULT 0,
  variance_value numeric(14,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_stocktakes_wh ON public.stocktakes(warehouse_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.stocktake_lines (
  id            bigserial PRIMARY KEY,
  stocktake_id  bigint NOT NULL REFERENCES public.stocktakes(id) ON DELETE CASCADE,
  item_id       bigint NOT NULL,
  system_qty    numeric(12,3) NOT NULL DEFAULT 0,
  counted_qty   numeric(12,3),
  variance      numeric(12,3) GENERATED ALWAYS AS (COALESCE(counted_qty,0) - system_qty) STORED,
  unit_cost     numeric(12,4),
  bin_location  text,
  note          text,
  counted_at    timestamptz,
  counted_by    uuid,
  UNIQUE (stocktake_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_stlines_take ON public.stocktake_lines(stocktake_id);

-- Open a stocktake and snapshot current system quantities
CREATE OR REPLACE FUNCTION public.open_stocktake(
  p_warehouse_id bigint,
  p_scope        text DEFAULT 'full',
  p_scope_value  text DEFAULT NULL,
  p_notes        text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
  v_no text;
  v_n  int;
BEGIN
  SELECT 'ST-' || to_char(now(),'YYYY') || '-' ||
         lpad((COALESCE(MAX(substring(stocktake_no from 9)::int), 0) + 1)::text, 4, '0')
  INTO v_no
  FROM public.stocktakes
  WHERE stocktake_no LIKE 'ST-' || to_char(now(),'YYYY') || '-%';

  INSERT INTO public.stocktakes (stocktake_no, warehouse_id, status, scope, scope_value, notes, started_by)
  VALUES (COALESCE(v_no, 'ST-' || to_char(now(),'YYYY') || '-0001'),
          p_warehouse_id, 'counting', p_scope, p_scope_value, p_notes, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.stocktake_lines (stocktake_id, item_id, system_qty, unit_cost, bin_location)
  SELECT v_id, i.id, COALESCE(cs.qty, 0), i.last_unit_cost, cs.bin_location
  FROM public.items i
  LEFT JOIN public.consumable_stock cs
         ON cs.item_id = i.id AND cs.warehouse_id = p_warehouse_id
  WHERE i.is_active
    AND (p_scope <> 'category' OR i.category = p_scope_value)
    AND (p_scope <> 'partial'  OR COALESCE(cs.qty,0) <> 0);

  SELECT COUNT(*) INTO v_n FROM public.stocktake_lines WHERE stocktake_id = v_id;
  UPDATE public.stocktakes SET total_lines = v_n WHERE id = v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.open_stocktake(bigint,text,text,text) TO authenticated;

-- Record a count on one line
CREATE OR REPLACE FUNCTION public.count_stocktake_line(
  p_line_id     bigint,
  p_counted_qty numeric,
  p_note        text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_take bigint;
BEGIN
  UPDATE public.stocktake_lines
  SET counted_qty = p_counted_qty, note = p_note,
      counted_at = now(), counted_by = auth.uid()
  WHERE id = p_line_id
  RETURNING stocktake_id INTO v_take;

  UPDATE public.stocktakes s
  SET counted_lines  = (SELECT COUNT(*) FROM public.stocktake_lines WHERE stocktake_id = v_take AND counted_qty IS NOT NULL),
      variance_lines = (SELECT COUNT(*) FROM public.stocktake_lines WHERE stocktake_id = v_take AND counted_qty IS NOT NULL AND variance <> 0),
      variance_value = (SELECT COALESCE(SUM(variance * COALESCE(unit_cost,0)),0) FROM public.stocktake_lines WHERE stocktake_id = v_take AND counted_qty IS NOT NULL)
  WHERE s.id = v_take;
END;
$$;
GRANT EXECUTE ON FUNCTION public.count_stocktake_line(bigint,numeric,text) TO authenticated;

-- Post a stocktake: write adjustment movements for every variance
CREATE OR REPLACE FUNCTION public.post_stocktake(p_stocktake_id bigint)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wh   bigint;
  v_no   text;
  v_rows int := 0;
  r      record;
BEGIN
  SELECT warehouse_id, stocktake_no INTO v_wh, v_no
  FROM public.stocktakes WHERE id = p_stocktake_id AND status <> 'posted';
  IF v_wh IS NULL THEN
    RAISE EXCEPTION 'Stocktake not found or already posted';
  END IF;

  FOR r IN
    SELECT l.item_id, l.variance, i.unit
    FROM public.stocktake_lines l
    JOIN public.items i ON i.id = l.item_id
    WHERE l.stocktake_id = p_stocktake_id
      AND l.counted_qty IS NOT NULL
      AND l.variance <> 0
  LOOP
    INSERT INTO public.consumable_movements
      (item_id, warehouse_id, movement_type, qty, unit, reason, reference_no,
       source_type, notes, performed_by, performed_at)
    VALUES
      (r.item_id, v_wh, 'adjust', r.variance, r.unit,
       'Stocktake adjustment', v_no, 'correction',
       'Posted from stocktake ' || v_no, auth.uid(), now());
    PERFORM public.sync_item_stock(r.item_id);
    v_rows := v_rows + 1;
  END LOOP;

  UPDATE public.stocktakes
  SET status = 'posted', posted_at = now(), posted_by = auth.uid()
  WHERE id = p_stocktake_id;

  RETURN v_rows;
END;
$$;
GRANT EXECUTE ON FUNCTION public.post_stocktake(bigint) TO authenticated;

ALTER TABLE public.stocktakes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocktake_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS st_all  ON public.stocktakes;
DROP POLICY IF EXISTS stl_all ON public.stocktake_lines;
CREATE POLICY st_all  ON public.stocktakes      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY stl_all ON public.stocktake_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════
-- 6) REPORTING VIEWS
-- ═══════════════════════════════════════════════════════════════════

-- Stock on hand, per item per warehouse, with value + status
CREATE OR REPLACE VIEW public.v_stock_on_hand AS
SELECT
  i.id            AS item_id,
  i.code, i.name, i.category, i.unit,
  i.min_qty, i.last_unit_cost, i.currency,
  w.id            AS warehouse_id,
  w.code          AS warehouse_code,
  w.name          AS warehouse_name,
  cs.bin_location,
  COALESCE(cs.qty, 0)                                   AS qty,
  COALESCE(cs.qty, 0) * COALESCE(i.last_unit_cost, 0)   AS stock_value,
  CASE
    WHEN i.min_qty IS NULL                       THEN 'ok'
    WHEN COALESCE(cs.qty,0) <= 0                 THEN 'out'
    WHEN COALESCE(cs.qty,0) < i.min_qty          THEN 'low'
    ELSE 'ok'
  END AS stock_status
FROM public.items i
CROSS JOIN public.warehouses w
LEFT JOIN public.consumable_stock cs ON cs.item_id = i.id AND cs.warehouse_id = w.id
WHERE i.is_active AND w.is_active;

GRANT SELECT ON public.v_stock_on_hand TO authenticated;

-- Reorder suggestions: items below minimum, with supplier + suggested qty
CREATE OR REPLACE VIEW public.v_reorder_list AS
SELECT
  i.id AS item_id, i.code, i.name, i.category, i.unit,
  i.current_qty, i.min_qty, i.last_unit_cost, i.currency,
  GREATEST(COALESCE(i.min_qty,0) * 2 - COALESCE(i.current_qty,0), COALESCE(i.min_qty,0)) AS suggested_qty,
  GREATEST(COALESCE(i.min_qty,0) * 2 - COALESCE(i.current_qty,0), COALESCE(i.min_qty,0))
    * COALESCE(i.last_unit_cost,0) AS estimated_cost,
  s.id   AS supplier_id,
  s.name AS supplier_name,
  s.phone AS supplier_phone,
  s.email AS supplier_email,
  (SELECT MAX(m.performed_at) FROM public.consumable_movements m
     WHERE m.item_id = i.id AND m.qty > 0) AS last_received_at,
  CASE WHEN COALESCE(i.current_qty,0) <= 0 THEN 'out' ELSE 'low' END AS urgency
FROM public.items i
LEFT JOIN public.suppliers s ON s.id = i.default_supplier_id
WHERE i.is_active
  AND i.min_qty IS NOT NULL
  AND COALESCE(i.current_qty,0) < i.min_qty;

GRANT SELECT ON public.v_reorder_list TO authenticated;

-- Batches with an expiry date, and how close they are
CREATE OR REPLACE VIEW public.v_expiring_batches AS
SELECT
  m.id AS movement_id,
  m.item_id, i.code, i.name, i.unit,
  m.warehouse_id, w.code AS warehouse_code, w.name AS warehouse_name,
  m.batch_number, m.expires_at, m.qty,
  m.supplier_name, m.reference_no, m.performed_at,
  (m.expires_at - CURRENT_DATE) AS days_left,
  CASE
    WHEN m.expires_at <  CURRENT_DATE                       THEN 'expired'
    WHEN m.expires_at <= CURRENT_DATE + INTERVAL '30 days'  THEN 'critical'
    WHEN m.expires_at <= CURRENT_DATE + INTERVAL '90 days'  THEN 'soon'
    ELSE 'ok'
  END AS expiry_status
FROM public.consumable_movements m
JOIN public.items i      ON i.id = m.item_id
LEFT JOIN public.warehouses w ON w.id = m.warehouse_id
WHERE m.expires_at IS NOT NULL AND m.qty > 0;

GRANT SELECT ON public.v_expiring_batches TO authenticated;

-- Consumption by destination (pool / department / person) per item
CREATE OR REPLACE VIEW public.v_consumption AS
SELECT
  m.item_id, i.code, i.name, i.unit, i.category,
  m.performed_at::date                        AS day,
  date_trunc('month', m.performed_at)::date   AS month,
  m.warehouse_id, w.code AS warehouse_code,
  m.destination_type,
  p.name AS pool_name,
  d.name AS department_name,
  m.destination_person_name,
  ABS(m.qty)                                       AS qty_out,
  ABS(m.qty) * COALESCE(i.last_unit_cost, 0)       AS cost_out
FROM public.consumable_movements m
JOIN public.items i ON i.id = m.item_id
LEFT JOIN public.warehouses w ON w.id = m.warehouse_id
LEFT JOIN public.pools p ON p.id = m.destination_pool_id
LEFT JOIN public.procurement_departments d ON d.id = m.destination_department_id
WHERE m.qty < 0;

GRANT SELECT ON public.v_consumption TO authenticated;

-- Purchases by supplier
CREATE OR REPLACE VIEW public.v_purchases AS
SELECT
  m.id, m.item_id, i.code, i.name, i.unit,
  m.warehouse_id, w.code AS warehouse_code,
  m.performed_at, m.performed_at::date AS day,
  date_trunc('month', m.performed_at)::date AS month,
  COALESCE(m.supplier_name, s.name) AS supplier_name,
  m.supplier_id, m.reference_no,
  m.qty, m.unit_cost, m.total_cost,
  m.batch_number, m.expires_at
FROM public.consumable_movements m
JOIN public.items i ON i.id = m.item_id
LEFT JOIN public.warehouses w ON w.id = m.warehouse_id
LEFT JOIN public.suppliers s ON s.id = m.supplier_id
WHERE m.qty > 0 AND (m.source_type = 'supplier' OR m.supplier_id IS NOT NULL OR m.supplier_name IS NOT NULL);

GRANT SELECT ON public.v_purchases TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 7) DASHBOARD SUMMARY RPC — one call for the whole overview
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.inventory_summary()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT json_build_object(
    'items_active',   (SELECT COUNT(*) FROM public.items WHERE is_active),
    'warehouses',     (SELECT COUNT(*) FROM public.warehouses WHERE is_active),
    'suppliers',      (SELECT COUNT(*) FROM public.suppliers WHERE is_active),
    'stock_value',    (SELECT COALESCE(SUM(COALESCE(current_qty,0) * COALESCE(last_unit_cost,0)),0) FROM public.items WHERE is_active),
    'low_count',      (SELECT COUNT(*) FROM public.v_reorder_list),
    'out_count',      (SELECT COUNT(*) FROM public.v_reorder_list WHERE urgency = 'out'),
    'reorder_cost',   (SELECT COALESCE(SUM(estimated_cost),0) FROM public.v_reorder_list),
    'expired',        (SELECT COUNT(*) FROM public.v_expiring_batches WHERE expiry_status = 'expired'),
    'expiring_soon',  (SELECT COUNT(*) FROM public.v_expiring_batches WHERE expiry_status IN ('critical','soon')),
    'open_stocktakes',(SELECT COUNT(*) FROM public.stocktakes WHERE status IN ('open','counting','review')),
    'movements_30d',  (SELECT COUNT(*) FROM public.consumable_movements WHERE performed_at >= now() - INTERVAL '30 days'),
    'purchased_30d',  (SELECT COALESCE(SUM(total_cost),0) FROM public.consumable_movements WHERE qty > 0 AND performed_at >= now() - INTERVAL '30 days'),
    'consumed_30d',   (SELECT COALESCE(SUM(cost_out),0) FROM public.v_consumption WHERE day >= CURRENT_DATE - 30)
  );
$$;
GRANT EXECUTE ON FUNCTION public.inventory_summary() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 8) BULK ITEM UPSERT — for CSV import
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.bulk_upsert_items(p_rows jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r          jsonb;
  v_inserted int := 0;
  v_updated  int := 0;
  v_errors   jsonb := '[]'::jsonb;
  v_id       bigint;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    BEGIN
      IF COALESCE(r->>'name','') = '' THEN
        v_errors := v_errors || jsonb_build_object('row', r, 'error', 'name is required');
        CONTINUE;
      END IF;

      SELECT id INTO v_id FROM public.items
      WHERE (NULLIF(r->>'code','') IS NOT NULL AND code = r->>'code')
         OR lower(name) = lower(r->>'name')
      LIMIT 1;

      IF v_id IS NULL THEN
        INSERT INTO public.items (code, name, category, unit, min_qty, last_unit_cost, currency, department, notes, is_active, current_qty)
        VALUES (NULLIF(r->>'code',''), r->>'name', NULLIF(r->>'category',''),
                COALESCE(NULLIF(r->>'unit',''),'pcs'),
                NULLIF(r->>'min_qty','')::numeric, NULLIF(r->>'cost','')::numeric,
                COALESCE(NULLIF(r->>'currency',''),'EUR'),
                NULLIF(r->>'location',''), NULLIF(r->>'notes',''), true, 0);
        v_inserted := v_inserted + 1;
      ELSE
        UPDATE public.items SET
          category       = COALESCE(NULLIF(r->>'category',''), category),
          unit           = COALESCE(NULLIF(r->>'unit',''), unit),
          min_qty        = COALESCE(NULLIF(r->>'min_qty','')::numeric, min_qty),
          last_unit_cost = COALESCE(NULLIF(r->>'cost','')::numeric, last_unit_cost),
          department     = COALESCE(NULLIF(r->>'location',''), department),
          notes          = COALESCE(NULLIF(r->>'notes',''), notes)
        WHERE id = v_id;
        v_updated := v_updated + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('row', r, 'error', SQLERRM);
    END;
  END LOOP;

  RETURN json_build_object('inserted', v_inserted, 'updated', v_updated, 'errors', v_errors);
END;
$$;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_items(jsonb) TO authenticated;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- VERIFY
-- ═══════════════════════════════════════════════════════════════════
SELECT public.inventory_summary();
-- SELECT * FROM public.v_reorder_list ORDER BY urgency, name;
-- SELECT * FROM public.v_stock_on_hand WHERE qty <> 0 ORDER BY warehouse_code, name;
-- SELECT * FROM public.v_expiring_batches ORDER BY days_left;
