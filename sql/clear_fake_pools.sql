-- Run this in Supabase SQL Editor to remove fake seeded pools from previous migration.
-- ONLY run if you want to start fresh and add real pools via UI.

DELETE FROM public.pool_treatment_lines
WHERE treatment_id IN (SELECT id FROM public.pool_treatments WHERE pool_id IN (SELECT id FROM public.pools WHERE code LIKE 'CR-P__'));
DELETE FROM public.pool_treatments WHERE pool_id IN (SELECT id FROM public.pools WHERE code LIKE 'CR-P__');
DELETE FROM public.pools WHERE code LIKE 'CR-P__';

-- Verify:
SELECT count(*) AS remaining_pools FROM public.pools;
