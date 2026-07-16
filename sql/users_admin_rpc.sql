-- ═══════════════════════════════════════════════════════════════════
-- User management: cleanup + admin RPC to list users with roles
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1) Remove duplicate (user_id, role) rows (fixes the "3× Owner" issue)
DELETE FROM procure.user_roles a
USING procure.user_roles b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id
  AND a.role = b.role;

-- 2) Prevent future duplicates
ALTER TABLE procure.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_role_unique;
ALTER TABLE procure.user_roles
  ADD CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role);

-- 3) Admin RPC: list every auth user with their roles + last sign-in
--    SECURITY DEFINER lets it read auth.users, but we check caller is owner/auditor.
CREATE OR REPLACE FUNCTION procure.get_users_with_roles()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  roles text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, procure, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM procure.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('owner','auditor')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(
      (SELECT array_agg(DISTINCT ur.role ORDER BY ur.role)
       FROM procure.user_roles ur
       WHERE ur.user_id = u.id),
      ARRAY[]::text[]
    ) AS roles
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION procure.get_users_with_roles() TO authenticated;

-- 4) Add role RPC (safer than direct INSERT from client)
CREATE OR REPLACE FUNCTION procure.add_user_role(target_user uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, procure
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM procure.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('owner','auditor')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO procure.user_roles (user_id, role)
  VALUES (target_user, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION procure.add_user_role(uuid, text) TO authenticated;

-- 5) Remove role RPC
CREATE OR REPLACE FUNCTION procure.remove_user_role(target_user uuid, old_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, procure
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM procure.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('owner','auditor')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Prevent removing your own last owner role (lockout protection)
  IF target_user = auth.uid() AND old_role = 'owner' THEN
    IF (SELECT COUNT(*) FROM procure.user_roles WHERE role = 'owner') <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last owner';
    END IF;
  END IF;

  DELETE FROM procure.user_roles
  WHERE user_id = target_user AND role = old_role;
END;
$$;

GRANT EXECUTE ON FUNCTION procure.remove_user_role(uuid, text) TO authenticated;
