// ═══════════════════════════════════════════════════════════════════
// UsersTab.jsx — team management (owner only)
// Creates users via Supabase Edge Function and assigns roles
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { tr } from "./i18n";

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

export default function UsersTab({ TH, lang = "en", isMobile }) {
  const L = tr(lang);
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const [busy, setBusy]         = useState(false);
  const [showAdd, setShowAdd]   = useState(false);

  const [nEmail, setNEmail]     = useState("");
  const [nName, setNName]       = useState("");
  const [nPassword, setNPassword] = useState("");
  const [nRoles, setNRoles]     = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: rolesData, error: e1 } = await supabase
        .schema('procure').from('user_roles')
        .select('id, user_id, role, is_active, created_at')
        .eq('is_active', true)
        .order('user_id');
      if (e1) throw e1;

      const byUser = {};
      (rolesData || []).forEach(r => {
        if (!byUser[r.user_id]) byUser[r.user_id] = { user_id: r.user_id, roles: [] };
        byUser[r.user_id].roles.push({ id: r.id, role: r.role });
      });

      const list = Object.values(byUser);
      const { data: { user: me } } = await supabase.auth.getUser();
      if (me) {
        if (!byUser[me.id]) list.push({ user_id: me.id, roles: [], email: me.email, is_me: true });
        else { byUser[me.id].email = me.email; byUser[me.id].is_me = true; }
      }

      setUsers(list);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleRole(r) {
    setNRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  }

  function resetForm() {
    setNEmail(""); setNName(""); setNPassword(""); setNRoles([]);
    setShowAdd(false);
  }

  function genPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let p = "";
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setNPassword(p);
  }

  async function createUser() {
    setBusy(true); setError(null); setSuccess(null);
    try {
      if (!nEmail.trim() || !nPassword) throw new Error("Email and password required");
      if (nPassword.length < 6) throw new Error("Password must be at least 6 characters");
      if (nRoles.length === 0) throw new Error("Select at least one role");

      const resp = await supabase.functions.invoke('admin-create-user', {
        body: {
          email:     nEmail.trim(),
          password:  nPassword,
          full_name: nName.trim() || null,
          roles:     nRoles,
        },
      });
      // Extract detailed error even on non-2xx
      let data = resp.data;
      if (resp.error) {
        // Try to read the response body for the real error
        try {
          const ctx = resp.error?.context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) throw new Error(body.error);
          }
        } catch (parseErr) {
          if (parseErr.message && parseErr.message !== '[object Object]') throw parseErr;
        }
        throw new Error(resp.error.message || 'Function call failed');
      }
      if (data?.error) throw new Error(data.error);

      setSuccess(`User ${nEmail} created with roles: ${nRoles.join(', ')}.\n\nPassword: ${nPassword}\n\nSave this password now — you won't see it again.`);
      resetForm();
      await load();
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
        user_id: userId, role,
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
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12}}>
        <div>
          <div style={{fontSize:isMobile?20:26, fontWeight:700, color:TH.text, letterSpacing:"-0.3px", fontFamily:"'Playfair Display', Georgia, serif"}}>{L.teamRoles}</div>
          <div style={{fontSize:13, color:TH.textMuted, marginTop:2}}>{L.teamSub}</div>
        </div>
        {!showAdd && (
          <button onClick={() => { setShowAdd(true); genPassword(); }} style={{
            background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:10,
            color:"#000", padding:"11px 22px", cursor:"pointer", fontSize:14, fontWeight:800, fontFamily:"inherit",
            boxShadow:"0 4px 14px rgba(201,169,96,0.3)",
          }}>{L.newUser}</button>
        )}
      </div>

      {error && (
        <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:TH.text, fontSize:13, marginBottom:14, whiteSpace:"pre-wrap"}}>
          {error}
        </div>
      )}

      {success && (
        <div style={{background:"rgba(201,169,96,0.1)", border:"1px solid rgba(201,169,96,0.4)", borderRadius:10, padding:14, color:TH.accent, fontSize:13, marginBottom:14, whiteSpace:"pre-wrap"}}>
          ✓ {success}
        </div>
      )}

      {showAdd && (
        <div style={{background:TH.bgCard, border:`2px solid ${TH.accentBorder}`, borderRadius:14, padding:20, marginBottom:20}}>
          <div style={{fontSize:16, fontWeight:800, color:TH.text, marginBottom:14}}>{L.createNewUser}</div>

          <div style={{display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12, marginBottom:12}}>
            <div>
              <label style={{display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px"}}>{L.email}</label>
              <input value={nEmail} onChange={e => setNEmail(e.target.value)} placeholder="user@afikgroup.com" style={inputStyle(TH)} />
            </div>
            <div>
              <label style={{display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px"}}>{L.fullName}</label>
              <input value={nName} onChange={e => setNName(e.target.value)} placeholder="Optional" style={inputStyle(TH)} />
            </div>
          </div>

          <div style={{marginBottom:12}}>
            <label style={{display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px"}}>{L.password}</label>
            <div style={{display:"flex", gap:8}}>
              <input value={nPassword} onChange={e => setNPassword(e.target.value)} type="text" style={{...inputStyle(TH), fontFamily:"monospace"}} />
              <button onClick={genPassword} type="button" style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"9px 14px", cursor:"pointer", fontSize:12, fontFamily:"inherit", whiteSpace:"nowrap"}}>{L.regen}</button>
            </div>
            <div style={{fontSize:10, color:TH.textDim, marginTop:4}}>{L.sharePassword}</div>
          </div>

          <div style={{marginBottom:16}}>
            <label style={{display:"block", color:TH.textMuted, fontSize:11, marginBottom:8, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px"}}>{L.rolesChoose}</label>
            <div style={{display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap:6}}>
              {Object.entries(ROLE_LABELS).map(([k, v]) => {
                const on = nRoles.includes(k);
                return (
                  <button key={k} onClick={() => toggleRole(k)} type="button" style={{
                    background: on ? v.color+"22" : "transparent",
                    border: `2px solid ${on ? v.color : TH.border}`,
                    borderRadius:8, color: on ? v.color : TH.textMuted,
                    padding:"10px 12px", cursor:"pointer", fontSize:12, fontWeight:on?700:500, fontFamily:"inherit",
                    textAlign:"left",
                  }}>
                    {on ? "✓ " : ""}{v.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{display:"flex", gap:10, justifyContent:"flex-end"}}>
            <button onClick={resetForm} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:10, color:TH.textMuted, padding:"11px 20px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>{L.cancel}</button>
            <button onClick={createUser} disabled={busy || !nEmail || !nPassword || nRoles.length===0} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:10, color:"#000", padding:"11px 28px", cursor:"pointer", fontSize:14, fontWeight:800, fontFamily:"inherit", opacity: (busy || !nEmail || !nPassword || nRoles.length===0) ? 0.5 : 1}}>
              {busy ? L.creating : L.createUser}
            </button>
          </div>
        </div>
      )}

      <div style={{fontSize:14, fontWeight:700, color:TH.text, marginBottom:12}}>{L.currentTeam} ({users.length})</div>

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>{L.loading}</div>
      ) : users.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          {L.noUsersYet}
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {users.map(u => (
            <div key={u.user_id} style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:10, flexWrap:"wrap"}}>
                <div style={{flex:1, minWidth:200}}>
                  <div style={{fontSize:14, fontWeight:700, color:TH.text, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
                    {u.email || <span style={{color:TH.textDim, fontFamily:"monospace", fontSize:11}}>{u.user_id.slice(0,8)}...</span>}
                    {u.is_me && <span style={{background:TH.accentBg, color:TH.accent, padding:"2px 8px", borderRadius:5, fontSize:10, fontWeight:700}}>{L.you}</span>}
                  </div>
                </div>
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:6, alignItems:"center"}}>
                {u.roles.length === 0 ? (
                  <span style={{color:TH.textDim, fontSize:12, fontStyle:"italic"}}>{L.noRoles}</span>
                ) : u.roles.map(r => {
                  const meta = ROLE_LABELS[r.role] || { label: r.role, color: '#8f8f8f' };
                  return (
                    <span key={r.id} style={{background:meta.color+"22", color:meta.color, padding:"4px 10px", borderRadius:6, fontSize:11, fontWeight:600, display:"inline-flex", alignItems:"center", gap:6}}>
                      {meta.label}
                      <button onClick={() => removeRole(r.id)} title="Remove role" style={{background:"transparent", border:"none", color:meta.color, cursor:"pointer", padding:0, fontSize:14, fontFamily:"inherit", lineHeight:1}}>×</button>
                    </span>
                  );
                })}
                <select
                  onChange={e => { if (e.target.value) { addRoleToUser(u.user_id, e.target.value); e.target.value = ""; } }}
                  value=""
                  style={{background:"transparent", border:`1px dashed ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"3px 8px", fontSize:11, fontFamily:"inherit", cursor:"pointer"}}
                >
                  <option value="">{L.addRole}</option>
                  {Object.entries(ROLE_LABELS).filter(([k]) => !u.roles.some(r => r.role === k)).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{marginTop:24, padding:16, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12}}>
        <div style={{fontSize:13, fontWeight:700, color:TH.text, marginBottom:10}}>{L.accessMatrix}</div>
        <div style={{fontSize:12, color:TH.textMuted, lineHeight:1.7}}>
          <strong style={{color:TH.accent}}>Owner / Auditor</strong> — full access to everything<br/>
          <strong style={{color:TH.accent}}>Warehouse Keeper</strong> — Dashboard + Warehouse only<br/>
          <strong style={{color:TH.accent}}>Inspector</strong> — Dashboard + Inspections only<br/>
          <strong style={{color:TH.accent}}>Procurement (any)</strong> — Dashboard + Caesar Procure only<br/>
          <strong style={{color:TH.textMuted}}>No roles</strong> — Dashboard view only
        </div>
      </div>
    </div>
  );
}

function inputStyle(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
