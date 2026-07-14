// ═══════════════════════════════════════════════════════════════════
// UsersTab.jsx — team management (owner only)
// Assign roles to users: warehouse_keeper, inspector, procurement, owner
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const ROLE_LABELS = {
  owner:               { label: "Owner (full access)",         color: "#C9A960" },
  auditor:             { label: "Auditor",                     color: "#C9A960" },
  warehouse_keeper:    { label: "Warehouse Keeper",            color: "#D4B876" },
  inspector:           { label: "Inspector",                   color: "#D4B876" },
  procurement_officer: { label: "Procurement Officer",         color: "#8B7A44" },
  deputy_officer:      { label: "Deputy Procurement",          color: "#8B7A44" },
  dept_head:           { label: "Department Head",             color: "#8B7A44" },
  operator:            { label: "Operator (creates requests)", color: "#8f8f8f" },
  finance_officer:     { label: "Finance",                     color: "#8B7A44" },
  approver_mid:        { label: "Mid-level Approver",          color: "#8B7A44" },
  approver_high:       { label: "High-level Approver",         color: "#C9A960" },
};

export default function UsersTab({ TH, isMobile }) {
  const [users, setUsers] = useState([]);         // combined: users + roles
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("warehouse_keeper");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      // Get all user_roles, group by user_id
      const { data: rolesData, error: e1 } = await supabase
        .schema('procure').from('user_roles')
        .select('id, user_id, role, is_active, created_at')
        .eq('is_active', true)
        .order('user_id');
      if (e1) throw e1;

      // Group by user_id
      const byUser = {};
      (rolesData || []).forEach(r => {
        if (!byUser[r.user_id]) byUser[r.user_id] = { user_id: r.user_id, roles: [] };
        byUser[r.user_id].roles.push({ id: r.id, role: r.role });
      });

      // We can't easily list auth.users from client, so use whatever info we have
      // For each user_id, try to get their email via a lookup (best-effort)
      const list = Object.values(byUser);

      // Also add current user if not in list
      const { data: { user: me } } = await supabase.auth.getUser();
      if (me && !byUser[me.id]) {
        list.push({ user_id: me.id, roles: [], email: me.email, is_me: true });
      } else if (me && byUser[me.id]) {
        byUser[me.id].email = me.email;
        byUser[me.id].is_me = true;
      }

      setUsers(list);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function addRole() {
    setBusy(true); setError(null);
    try {
      if (!newEmail.trim()) throw new Error("Email is required.");
      if (!newRole) throw new Error("Role is required.");

      // Look up user by email — this requires a manual step since we can't query auth.users from client
      // Workaround: use RPC or ask admin to first sign up the user in Supabase Auth
      // Best approach: expect admin to have created user via Supabase dashboard first
      // Then paste email here — we search among existing users_roles by joining with auth via RPC

      // Since we can't reliably get user_id from email on client, instruct admin:
      throw new Error(
        "To add a role to a new user:\n\n" +
        "1) In Supabase → Authentication → Users → Add User with email: " + newEmail.trim() + "\n" +
        "2) Then run this SQL:\n\n" +
        "INSERT INTO procure.user_roles (user_id, role)\n" +
        "SELECT id, '" + newRole + "'::procure.role_kind FROM auth.users WHERE email = '" + newEmail.trim() + "';\n\n" +
        "3) The user logs in — they'll see their assigned module."
      );
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeRole(roleId) {
    if (!confirm("Remove this role?")) return;
    setBusy(true); setError(null);
    try {
      const { error } = await supabase.schema('procure').from('user_roles').update({ is_active: false }).eq('id', roleId);
      if (error) throw error;
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function addRoleToUser(userId, role) {
    setBusy(true); setError(null);
    try {
      const { error } = await supabase.schema('procure').from('user_roles').insert([{
        user_id: userId,
        role,
      }]);
      if (error) throw error;
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:isMobile?20:26, fontWeight:800, color:TH.text, letterSpacing:"-0.3px"}}>Team & Roles</div>
        <div style={{fontSize:13, color:TH.textMuted, marginTop:2}}>
          Assign roles to control what each person can access
        </div>
      </div>

      {error && (
        <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:TH.text, fontSize:13, marginBottom:14, whiteSpace:"pre-wrap"}}>
          {error}
        </div>
      )}

      {/* Add new user role - explanation card */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:20, marginBottom:20}}>
        <div style={{fontSize:15, fontWeight:700, color:TH.text, marginBottom:10}}>➕ Add role to a user</div>
        <div style={{fontSize:12, color:TH.textMuted, marginBottom:12, lineHeight:1.5}}>
          To add a role, the person must first be a user in Supabase Auth.
          <br/><strong style={{color:TH.text}}>1.</strong> Add them via Supabase → Authentication → Users → Add User
          <br/><strong style={{color:TH.text}}>2.</strong> Come back here and click "+" next to their name below
        </div>
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email of user to add" style={{flex:1, minWidth:220, background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit"}}/>
          <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit"}}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={addRole} disabled={busy} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:8, color:"#000", padding:"9px 18px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", opacity:busy?0.6:1}}>Show SQL</button>
        </div>
      </div>

      {/* Users list */}
      <div style={{fontSize:14, fontWeight:700, color:TH.text, marginBottom:12}}>👥 Current team ({users.length})</div>

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading...</div>
      ) : users.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          No users with assigned roles yet.
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {users.map(u => (
            <div key={u.user_id} style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:10, flexWrap:"wrap"}}>
                <div style={{flex:1, minWidth:200}}>
                  <div style={{fontSize:14, fontWeight:700, color:TH.text, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
                    {u.email || <span style={{color:TH.textDim, fontFamily:"monospace", fontSize:11}}>{u.user_id.slice(0,8)}...</span>}
                    {u.is_me && <span style={{background:TH.accentBg, color:TH.accent, padding:"2px 8px", borderRadius:5, fontSize:10, fontWeight:700}}>YOU</span>}
                  </div>
                </div>
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
                {u.roles.length === 0 ? (
                  <span style={{color:TH.textDim, fontSize:12, fontStyle:"italic"}}>No roles assigned — no module access</span>
                ) : u.roles.map(r => {
                  const meta = ROLE_LABELS[r.role] || { label: r.role, color: '#8f8f8f' };
                  return (
                    <span key={r.id} style={{background:meta.color+"22", color:meta.color, padding:"4px 10px", borderRadius:6, fontSize:11, fontWeight:600, display:"inline-flex", alignItems:"center", gap:6}}>
                      {meta.label}
                      <button onClick={() => removeRole(r.id)} title="Remove role" style={{background:"transparent", border:"none", color:meta.color, cursor:"pointer", padding:0, fontSize:12, fontFamily:"inherit"}}>×</button>
                    </span>
                  );
                })}
                <select
                  onChange={e => { if (e.target.value) { addRoleToUser(u.user_id, e.target.value); e.target.value = ""; } }}
                  value=""
                  style={{background:"transparent", border:`1px dashed ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"3px 8px", fontSize:11, fontFamily:"inherit", cursor:"pointer"}}
                >
                  <option value="">+ Add role...</option>
                  {Object.entries(ROLE_LABELS).filter(([k]) => !u.roles.some(r => r.role === k)).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{marginTop:24, padding:16, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12}}>
        <div style={{fontSize:13, fontWeight:700, color:TH.text, marginBottom:10}}>📖 Access matrix</div>
        <div style={{fontSize:12, color:TH.textMuted, lineHeight:1.7}}>
          <strong style={{color:TH.accent}}>Owner / Auditor</strong> — full access to everything<br/>
          <strong style={{color:TH.accent}}>Warehouse Keeper</strong> — Dashboard + Warehouse Manager only<br/>
          <strong style={{color:TH.accent}}>Inspector</strong> — Dashboard + Inspections only<br/>
          <strong style={{color:TH.accent}}>Procurement (any variant)</strong> — Dashboard + Caesar Procure only<br/>
          <strong style={{color:TH.textMuted}}>No roles</strong> — Dashboard view only
        </div>
      </div>
    </div>
  );
}
