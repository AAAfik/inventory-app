-- ═══════════════════════════════════════════════════════════════════
-- Warehouse: Suppliers + Items CRUD + Receive workflow
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1) Suppliers catalog ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id            bigserial PRIMARY KEY,
  name          text NOT NULL,
  contact_person text,
  phone         text,
  email         text,
  address       text,
  notes         text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  created_by    uuid
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name) WHERE is_active = true;

-- ─── 2) Extend items with extra metadata ─────────────────────────
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS description        text,
  ADD COLUMN IF NOT EXISTS default_supplier_id bigint REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS last_unit_cost     numeric(12,4),
  ADD COLUMN IF NOT EXISTS currency           text DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS is_active          boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS image_url          text;

-- ─── 3) Extend consumable_movements with receipt/batch metadata ──
ALTER TABLE public.consumable_movements
  ADD COLUMN IF NOT EXISTS unit_cost         numeric(12,4),
  ADD COLUMN IF NOT EXISTS total_cost        numeric(12,4),
  ADD COLUMN IF NOT EXISTS supplier_id       bigint REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS supplier_name     text,
  ADD COLUMN IF NOT EXISTS reference_no      text,      -- PO / delivery note / invoice no
  ADD COLUMN IF NOT EXISTS batch_number      text,
  ADD COLUMN IF NOT EXISTS expires_at        date,
  ADD COLUMN IF NOT EXISTS photo_url         text,      -- invoice / delivery note photo
  ADD COLUMN IF NOT EXISTS source_type       text,      -- 'supplier'|'return'|'transfer'|'initial'|'correction'
  ADD COLUMN IF NOT EXISTS return_from_pool_id bigint,
  ADD COLUMN IF NOT EXISTS return_from_department_id bigint;

CREATE INDEX IF NOT EXISTS idx_cmov_item_perf ON public.consumable_movements(item_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cmov_supplier  ON public.consumable_movements(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cmov_expires   ON public.consumable_movements(expires_at)  WHERE expires_at IS NOT NULL;

-- ─── 4) receive_consumable RPC (mirror of dispense_consumable) ───
CREATE OR REPLACE FUNCTION public.receive_consumable(
  p_item_id       bigint,
  p_warehouse_id  bigint,
  p_qty           numeric,
  p_source_type   text,                             -- 'supplier'|'return'|'transfer'|'initial'|'correction'
  p_supplier_id   bigint DEFAULT NULL,
  p_supplier_name text   DEFAULT NULL,
  p_reference_no  text   DEFAULT NULL,
  p_unit_cost     numeric DEFAULT NULL,
  p_batch_number  text   DEFAULT NULL,
  p_expires_at    date   DEFAULT NULL,
  p_photo_url     text   DEFAULT NULL,
  p_notes         text   DEFAULT NULL,
  p_return_from_pool_id       bigint DEFAULT NULL,
  p_return_from_department_id bigint DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  v_user := auth.uid();
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  IF p_item_id IS NULL OR p_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'Item and warehouse are required';
  END IF;

  INSERT INTO public.consumable_movements (
    item_id, warehouse_id, qty, movement_type,
    unit_cost, total_cost,
    supplier_id, supplier_name, reference_no,
    batch_number, expires_at, photo_url,
    source_type,
    return_from_pool_id, return_from_department_id,
    notes, performed_by, performed_at
  ) VALUES (
    p_item_id, p_warehouse_id, p_qty, 'restock',
    p_unit_cost, p_qty * COALESCE(p_unit_cost, 0),
    p_supplier_id, NULLIF(p_supplier_name,''), NULLIF(p_reference_no,''),
    NULLIF(p_batch_number,''), p_expires_at, NULLIF(p_photo_url,''),
    NULLIF(p_source_type,''),
    p_return_from_pool_id, p_return_from_department_id,
    NULLIF(p_notes,''), v_user, now()
  );

  -- Update items' last_unit_cost so next receipt/dispense knows the recent price
  IF p_unit_cost IS NOT NULL AND p_unit_cost > 0 THEN
    UPDATE public.items
      SET last_unit_cost = p_unit_cost
      WHERE id = p_item_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.receive_consumable(
  bigint, bigint, numeric, text,
  bigint, text, text, numeric, text, date, text, text,
  bigint, bigint
) TO authenticated;

-- ─── 5) get_item_movements RPC (item-level ledger drill-down) ────
CREATE OR REPLACE FUNCTION public.get_item_movements(
  p_item_id bigint,
  p_limit   int DEFAULT 200
)
RETURNS TABLE (
  id bigint,
  performed_at timestamptz,
  qty numeric,
  movement_type text,
  warehouse_id bigint,
  warehouse_name text,
  source_type text,
  supplier_name text,
  reference_no text,
  unit_cost numeric,
  total_cost numeric,
  batch_number text,
  expires_at date,
  photo_url text,
  destination_type text,
  destination_pool_name text,
  destination_department_name text,
  destination_person_name text,
  reason text,
  notes text,
  performed_by_email text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT
    m.id,
    m.performed_at,
    m.qty,
    m.movement_type::text,
    m.warehouse_id,
    w.name,
    m.source_type,
    COALESCE(m.supplier_name, s.name),
    m.reference_no,
    m.unit_cost,
    m.total_cost,
    m.batch_number,
    m.expires_at,
    m.photo_url,
    m.destination_type,
    p.name,
    d.name,
    m.destination_person_name,
    m.reason,
    m.notes,
    u.email::text
  FROM public.consumable_movements m
  LEFT JOIN public.warehouses w ON w.id = m.warehouse_id
  LEFT JOIN public.suppliers s ON s.id = m.supplier_id
  LEFT JOIN public.pools p ON p.id = m.destination_pool_id
  LEFT JOIN public.procurement_departments d ON d.id = m.destination_department_id
  LEFT JOIN auth.users u ON u.id = m.performed_by
  WHERE m.item_id = p_item_id
  ORDER BY m.performed_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_item_movements(bigint, int) TO authenticated;

-- ─── 6) RLS: suppliers ─────────────────────────────────────────
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_read"  ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_write" ON public.suppliers;

CREATE POLICY "suppliers_read" ON public.suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "suppliers_write" ON public.suppliers
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM procure.user_roles WHERE user_id = auth.uid()
            AND role::text IN ('owner','auditor','warehouse_keeper'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM procure.user_roles WHERE user_id = auth.uid()
            AND role::text IN ('owner','auditor','warehouse_keeper'))
  );
