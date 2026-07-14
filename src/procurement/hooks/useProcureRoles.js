// ═══════════════════════════════════════════════════════════════════
// useProcureRoles.js — fetch & cache current user's procurement roles
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { supabase } from "../../supabase";

export function useProcureRoles() {
  const [roles, setRoles]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => { loadRoles(); }, []);

  async function loadRoles() {
    setLoading(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setRoles([]); return; }
      const { data, error } = await supabase
        .schema('procure')
        .from('user_roles')
        .select('role, property_id, department_id, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
      setRoles(data || []);
    } catch (e) {
      setError(e.message || String(e));
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }

  return { roles, loading, error, reload: loadRoles };
}
