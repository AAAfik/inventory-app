-- ═══════════════════════════════════════════════════════════════════════
-- CAESAR INSPECTIONS — Walk-around resort inspection system
-- ═══════════════════════════════════════════════════════════════════════
-- Run in Supabase SQL Editor after CAESAR_FRESH_START.sql
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Inspection areas (koja bazrasi mishe) ────────────────────────
CREATE TABLE IF NOT EXISTS public.inspection_areas (
  id            SERIAL PRIMARY KEY,
  property_id   SMALLINT REFERENCES public.wh_properties(id),
  code          TEXT NOT NULL UNIQUE,        -- e.g. "POOL-01", "LOBBY-A"
  name          TEXT NOT NULL,
  category      TEXT,                        -- "pool", "kitchen", "hvac", "electrical", "lobby", etc.
  location      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed some common areas per property
INSERT INTO public.inspection_areas (property_id, code, name, category, location)
SELECT p.id, p.code || '-' || cat.code, cat.name || ' — ' || p.name, cat.category, cat.category
FROM public.wh_properties p
CROSS JOIN (VALUES
  ('LOBBY',      'Lobby & Reception',     'lobby'),
  ('POOL',       'Pool Area',             'pool'),
  ('KITCHEN',    'Kitchen & F&B',         'kitchen'),
  ('HVAC',       'HVAC & AC systems',     'hvac'),
  ('ELECTRICAL', 'Electrical panels',     'electrical'),
  ('LAUNDRY',    'Laundry',               'laundry'),
  ('GYM',        'Gym & Wellness',        'wellness'),
  ('EXTERIOR',   'Exterior & Grounds',    'exterior'),
  ('SECURITY',   'Security & CCTV',       'security')
) AS cat(code, name, category)
ON CONFLICT (code) DO NOTHING;


-- ─── 2. Inspections (each = 1 card) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inspections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_no     TEXT NOT NULL UNIQUE,
  area_id           INTEGER REFERENCES public.inspection_areas(id),
  asset_id          UUID REFERENCES public.assets(id),      -- optional link to a specific asset
  property_id       SMALLINT REFERENCES public.wh_properties(id),

  title             TEXT NOT NULL,
  report            TEXT,                                    -- inspector notes
  category          TEXT,                                    -- optional override
  location_note     TEXT,                                    -- free-form location text

  status            TEXT NOT NULL DEFAULT 'ok'
    CHECK (status IN ('ok', 'minor_issue', 'major_issue', 'critical', 'needs_repair', 'fixed')),
  severity          SMALLINT NOT NULL DEFAULT 0 CHECK (severity BETWEEN 0 AND 4),
                                                              -- 0=OK, 1=low, 2=med, 3=high, 4=critical
  action_required   TEXT,
  photos            TEXT[] NOT NULL DEFAULT '{}',

  inspector_id      UUID NOT NULL REFERENCES auth.users(id),
  inspector_email   TEXT,

  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID REFERENCES auth.users(id),
  resolution_note   TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inspections_created ON public.inspections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_severity ON public.inspections(severity DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_property ON public.inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector ON public.inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_area ON public.inspections(area_id);


-- ─── 3. Inspection follow-ups (comments, updates) ────────────────────
CREATE TABLE IF NOT EXISTS public.inspection_updates (
  id             BIGSERIAL PRIMARY KEY,
  inspection_id  UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  update_type    TEXT NOT NULL CHECK (update_type IN ('comment', 'status_change', 'photo_added', 'assigned', 'resolved')),
  message        TEXT,
  new_status     TEXT,
  photos         TEXT[] DEFAULT '{}',
  performed_by   UUID NOT NULL REFERENCES auth.users(id),
  performed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_upd_inspection ON public.inspection_updates(inspection_id, performed_at DESC);


-- ─── 4. RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.inspection_areas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_updates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY p_iarea_all ON public.inspection_areas FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY p_ins_all ON public.inspections FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY p_iupd_all ON public.inspection_updates FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── 5. Storage bucket for inspection photos ─────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-photos',
  'inspection-photos',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY p_ins_photos_select ON storage.objects FOR SELECT TO authenticated, anon
    USING (bucket_id = 'inspection-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY p_ins_photos_insert ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'inspection-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY p_ins_photos_update ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'inspection-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY p_ins_photos_delete ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'inspection-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

-- Verify:
-- SELECT count(*) FROM public.inspection_areas;  -- ~36 (9 categories × 4 properties)
-- SELECT count(*) FROM public.inspections;       -- 0
