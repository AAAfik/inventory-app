-- ═══════════════════════════════════════════════════════════════════════
-- CAESAR WAREHOUSE — Storage bucket for asset photos
-- ═══════════════════════════════════════════════════════════════════════
-- Run in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

-- Create bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'asset-photos',
  'asset-photos',
  TRUE,  -- public bucket: anyone can view photos with the URL
  10485760,  -- 10 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies: authenticated users can upload/read/delete
DO $$ BEGIN
  CREATE POLICY p_asset_photos_select ON storage.objects
    FOR SELECT TO authenticated, anon
    USING (bucket_id = 'asset-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY p_asset_photos_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'asset-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY p_asset_photos_update ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'asset-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY p_asset_photos_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'asset-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
