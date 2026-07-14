-- ═══════════════════════════════════════════════════════════════════════
-- CAESAR RBAC — Add inspector role + helper functions for role checks
-- ═══════════════════════════════════════════════════════════════════════
-- Run in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- Add 'inspector' to the enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'role_kind'
      AND t.typnamespace = 'procure'::regnamespace
      AND e.enumlabel = 'inspector'
  ) THEN
    ALTER TYPE procure.role_kind ADD VALUE 'inspector';
  END IF;
END $$;

COMMIT;

-- Helper: current user's active roles (returns array of role_kind)
CREATE OR REPLACE FUNCTION procure.my_roles()
RETURNS TEXT[]
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = procure, public
AS $$
  SELECT COALESCE(array_agg(DISTINCT role::TEXT), '{}')
  FROM procure.user_roles
  WHERE user_id = auth.uid() AND is_active;
$$;

GRANT EXECUTE ON FUNCTION procure.my_roles() TO authenticated;

-- Helper: is current user an owner (highest admin)?
CREATE OR REPLACE FUNCTION procure.i_am_owner()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = procure, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM procure.user_roles
    WHERE user_id = auth.uid() AND role = 'owner' AND is_active
  );
$$;

GRANT EXECUTE ON FUNCTION procure.i_am_owner() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- Verify — see your own roles:
--   SELECT procure.my_roles();
--   SELECT procure.i_am_owner();
-- ═══════════════════════════════════════════════════════════════════════
