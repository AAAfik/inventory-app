-- ═══════════════════════════════════════════════════════════════════════
-- WAREHOUSE 2.0 UPGRADE — service scheduling + holder tracking
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- Service scheduling columns
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS next_service_date DATE;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS service_interval_days INTEGER;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS last_service_date DATE;

-- Free-text holder (staff without accounts)
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS holder_name TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS holder_phone TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS expected_return_at TIMESTAMPTZ;

-- Movements: holder name for checkout without user account
ALTER TABLE public.asset_movements ADD COLUMN IF NOT EXISTS holder_name TEXT;
ALTER TABLE public.asset_movements ADD COLUMN IF NOT EXISTS holder_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_assets_service_due ON public.assets(next_service_date) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status) WHERE is_active;

COMMIT;

-- Verify:
-- SELECT column_name FROM information_schema.columns WHERE table_name='assets' AND table_schema='public' ORDER BY ordinal_position;
