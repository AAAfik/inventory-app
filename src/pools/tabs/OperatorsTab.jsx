// ═══════════════════════════════════════════════════════════════════
// OperatorsTab.jsx — per-pool operator assignments
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";

export default function OperatorsTab({ TH, isMobile, isAdmin, onOpenPool }) {
  const [pools, setPools] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [assigningPoolId, setAssigningPoolId] = useState(null);
  const [newUserId, setNewUserId] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rP, rA, rU] = await Promise.all([
        supabase.from('pools').select('id, code, name, assigned_operator_id, property_id').eq('is_active', true).order('code'),
        supabase.from('pool_operator_assignments').select('*').eq('is_active', true),
        supabase.from('user_procurement_roles').select('user_id, display_name, role').eq('is_active', true),
      ]);
      setPools(rP.data || []);
      setAssignments(rA.data || []);
      setUsers(rU.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function setPrimaryOperator(poolId, userId) {
    if (!isAdmin) { setError("Only admins can assign operators"); return; }
    setBusy(true); setError(null);
    try {
      const { error: e } = await supabase.from('pools')
        .update({ assigned_operator_id: userId || null })
        .eq('id', poolId);
      if (e) throw e;
      // Also make sure the user is in assignments
      if (userId) {
        await supabase.from('pool_operator_assignments').upsert({
          pool_id: poolId,
          user_id: userId,
          is_primary: true,
          is_active: true,
        }, { onConflict: 'pool_id,user_id' });
      }
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function addOperator(poolId) {
    if (!newUserId) return;
    if (!isAdmin) { setError("Only admins can assign operators"); return; }
    setBusy(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: e } = await supabase.from('pool_operator_assignments').upsert({
        pool_id: poolId,
        user_id: newUserId,
        is_primary: false,
        assigned_by: user?.id,
        is_active: true,
      }, { onConflict: 'pool_id,user_id' });
      if (e) throw e;
      setAssigningPoolId(null); setNewUserId("");
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeOperator(assignmentId) {
    if (!isAdmin) return;
    if (!confirm("Remove this operator from this pool?")) return;
    setBusy(true); setError(null);
    try {
      const { error: e } = await supabase.from('pool_operator_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId);
      if (e) throw e;
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  const userMap = Object.fromEntries(users.map(u => [u.user_id, u]));
  const assignmentsByPool = {};
  assignments.forEach(a => {
    if (!assignmentsByPool[a.pool_id]) assignmentsByPool[a.pool_id] = [];
    assignmentsByPool[a.pool_id].push(a);
  });

  if (loading) return <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading…</div>;

  return (
    <div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:14, fontWeight:800, color:TH.text}}>👥 Pool Operators</div>
        <div style={{fontSize:11, color:TH.textMuted, marginTop:2}}>Assign staff to pools. Primary operator receives alerts.</div>
      </div>

      {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:10, padding:"12px 14px", color:"#C43D3D", fontSize:13, marginBottom:14}}>{error}</div>}

      <div style={{display:"flex", flexDirection:"column", gap:10}}>
        {pools.map(p => {
          const primary = p.assigned_operator_id ? userMap[p.assigned_operator_id] : null;
          const others = (assignmentsByPool[p.id] || []).filter(a => a.user_id !== p.assigned_operator_id);
          return (
            <div key={p.id} style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:14}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8}}>
                <div style={{cursor: onOpenPool ? "pointer" : "default"}} onClick={() => onOpenPool?.(p.id)}>
                  <div style={{fontSize:14, fontWeight:700, color:TH.text}}>🏊 {p.name}</div>
                  <div style={{fontSize:10, color:TH.textDim, fontFamily:"monospace"}}>{p.code}</div>
                </div>
              </div>

              {/* Primary operator */}
              <div style={{marginBottom:8}}>
                <div style={{fontSize:10, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4}}>Primary operator</div>
                <div style={{display:"flex", gap:8, alignItems:"center"}}>
                  {isAdmin ? (
                    <select value={p.assigned_operator_id || ''} onChange={e => setPrimaryOperator(p.id, e.target.value || null)} disabled={busy} style={{...inp(TH), flex:1, maxWidth:300}}>
                      <option value="">— No primary —</option>
                      {users.map(u => <option key={u.user_id} value={u.user_id}>{u.display_name} ({u.role})</option>)}
                    </select>
                  ) : (
                    <div style={{fontSize:12, color:primary ? "#C9A960" : TH.textMuted, fontWeight:700}}>{primary?.display_name || '— None —'}</div>
                  )}
                </div>
              </div>

              {/* Additional operators */}
              {(others.length > 0 || assigningPoolId === p.id) && (
                <div style={{marginTop:10, paddingTop:10, borderTop:`1px solid ${TH.border}`}}>
                  <div style={{fontSize:10, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6}}>Additional operators ({others.length})</div>
                  <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                    {others.map(a => {
                      const u = userMap[a.user_id];
                      return (
                        <div key={a.id} style={{background:TH.bgInput, borderRadius:20, padding:"5px 10px 5px 12px", fontSize:11, color:TH.text, display:"inline-flex", alignItems:"center", gap:6}}>
                          👤 {u?.display_name || a.user_id.slice(0, 8)}
                          {isAdmin && <button onClick={() => removeOperator(a.id)} disabled={busy} style={{background:"transparent", border:"none", color:TH.textMuted, cursor:"pointer", fontSize:14, padding:0, lineHeight:1}}>✕</button>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add operator */}
              {isAdmin && (
                assigningPoolId === p.id ? (
                  <div style={{marginTop:10, display:"flex", gap:6, alignItems:"center"}}>
                    <select value={newUserId} onChange={e => setNewUserId(e.target.value)} style={{...inp(TH), flex:1}}>
                      <option value="">— Select user —</option>
                      {users.filter(u => u.user_id !== p.assigned_operator_id && !others.some(a => a.user_id === u.user_id)).map(u => (
                        <option key={u.user_id} value={u.user_id}>{u.display_name}</option>
                      ))}
                    </select>
                    <button onClick={() => addOperator(p.id)} disabled={busy || !newUserId} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:8, color:"#000", padding:"8px 14px", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit"}}>Add</button>
                    <button onClick={() => { setAssigningPoolId(null); setNewUserId(""); }} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"8px 12px", cursor:"pointer", fontSize:12, fontFamily:"inherit"}}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setAssigningPoolId(p.id)} disabled={busy} style={{marginTop:10, background:"transparent", border:`1px dashed ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"6px 12px", cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:"inherit"}}>
                    + Add operator
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function inp(TH) {
  return { background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"8px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
