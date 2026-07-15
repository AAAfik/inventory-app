// ═══════════════════════════════════════════════════════════════════════
// PoolsListTab.jsx — grid of pools; click → profile with recommended doses
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { POOL_TYPES, CHEMICAL_PURPOSES, recommendedDose, estimatedCost, fmtQty, fmtMoney, fmtDateTime } from "../lib/poolUtils";

export default function PoolsListTab({ TH, isMobile, isAdmin, onChanged }) {
  const [pools, setPools] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      const [rP, rC, rProp] = await Promise.all([
        supabase.from('pools').select('*').eq('is_active', true).order('code'),
        supabase.from('pool_chemicals').select('*').eq('is_active', true).order('name'),
        supabase.from('wh_properties').select('id, code, name').eq('is_active', true),
      ]);
      if (rP.error) throw rP.error;
      setPools(rP.data || []);
      setChemicals(rC.data || []);
      setProperties(rProp.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadPoolHistory(poolId) {
    const { data } = await supabase.from('pool_treatments').select('*').eq('pool_id', poolId).order('performed_at', { ascending: false }).limit(10);
    return data || [];
  }

  const propMap = Object.fromEntries(properties.map(p => [p.id, p]));

  const filt = pools.filter(p => {
    if (filter !== "all" && String(p.property_id) !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${p.name} ${p.code}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ─── Detail view ─────────────────────────────────────────────────
  if (selected) {
    return <PoolDetail
      TH={TH} isMobile={isMobile} isAdmin={isAdmin}
      pool={selected} chemicals={chemicals} propMap={propMap}
      onClose={() => { setSelected(null); loadAll(); }}
      loadHistory={loadPoolHistory}
    />;
  }

  return (
    <div>
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"2fr 1fr", gap:8, marginBottom:16}}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search pool..." style={inp(TH)} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={inp(TH)}>
          <option value="all">All properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {error && <ErrBox TH={TH}>{error}</ErrBox>}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading...</div>
      ) : filt.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          No pools found.
        </div>
      ) : (
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(280px, 1fr))", gap:12}}>
          {filt.map(pool => {
            const type = POOL_TYPES[pool.pool_type] || POOL_TYPES.main;
            const prop = propMap[pool.property_id];
            return (
              <div key={pool.id} onClick={() => setSelected(pool)} style={{
                background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12,
                borderLeft:`3px solid ${type.color}`, padding:14, cursor:"pointer",
                transition:"transform .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:8}}>
                  <div style={{fontSize:22}}>{type.icon}</div>
                  <div style={{fontSize:10, color:TH.textDim, fontFamily:"monospace"}}>{pool.code}</div>
                </div>
                <div style={{fontSize:15, fontWeight:700, color:TH.text, marginBottom:6, fontFamily:"'Playfair Display', Georgia, serif"}}>{pool.name}</div>
                <div style={{display:"flex", flexWrap:"wrap", gap:6, marginBottom:6}}>
                  <span style={chip(type.color)}>{type.label}</span>
                  {prop && <span style={{fontSize:10, color:TH.textMuted, background:TH.bgInput, padding:"3px 8px", borderRadius:5}}>📍 {prop.code}</span>}
                </div>
                <div style={{fontSize:12, color:TH.text}}>
                  <span style={{color:TH.textMuted}}>Volume:</span> <strong>{Number(pool.volume_m3).toLocaleString()} m³</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
function PoolDetail({ TH, isMobile, isAdmin, pool, chemicals, propMap, onClose, loadHistory }) {
  const type = POOL_TYPES[pool.pool_type] || POOL_TYPES.main;
  const prop = propMap[pool.property_id];
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: pool.name, volume_m3: pool.volume_m3, depth_m: pool.depth_m || '',
    surface_m2: pool.surface_m2 || '', pool_type: pool.pool_type, location_note: pool.location_note || '',
  });

  useEffect(() => { loadHistory(pool.id).then(setHistory); }, [pool.id]);

  async function save() {
    setBusy(true); setError(null);
    try {
      const { error } = await supabase.from('pools').update({
        name: form.name, volume_m3: Number(form.volume_m3),
        depth_m: form.depth_m ? Number(form.depth_m) : null,
        surface_m2: form.surface_m2 ? Number(form.surface_m2) : null,
        pool_type: form.pool_type,
        location_note: form.location_note || null,
      }).eq('id', pool.id);
      if (error) throw error;
      setEditMode(false);
      onClose();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deletePool() {
    if (!confirm(`Delete pool ${pool.name}? This hides it from lists.`)) return;
    setBusy(true);
    try {
      await supabase.from('pools').update({ is_active: false }).eq('id', pool.id);
      onClose();
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, gap:8, flexWrap:"wrap"}}>
        <button onClick={onClose} style={ghostBtn(TH)}>← Back</button>
        {isAdmin && !editMode && (
          <div style={{display:"flex", gap:6}}>
            <button onClick={() => setEditMode(true)} style={ghostBtn(TH)}>✏️ Edit</button>
            <button onClick={deletePool} style={{...ghostBtn(TH), color:"#8f8f8f"}}>🗑 Delete</button>
          </div>
        )}
      </div>

      {error && <ErrBox TH={TH}>{error}</ErrBox>}

      {/* Header card */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, borderLeft:`4px solid ${type.color}`, padding:18, marginBottom:14}}>
        <div style={{display:"flex", alignItems:"flex-start", gap:14, flexWrap:"wrap"}}>
          <div style={{fontSize:52}}>{type.icon}</div>
          <div style={{flex:1, minWidth:200}}>
            {!editMode ? (
              <>
                <div style={{fontSize:11, color:type.color, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px"}}>{type.label}</div>
                <div style={{fontSize:isMobile?20:26, fontWeight:700, color:TH.text, fontFamily:"'Playfair Display', Georgia, serif"}}>{pool.name}</div>
                <div style={{fontSize:11, color:TH.textDim, fontFamily:"monospace", marginBottom:12}}>{pool.code}</div>
                <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))", gap:10}}>
                  <Info TH={TH} label="Property">{prop?.name || '—'}</Info>
                  <Info TH={TH} label="Volume"><strong>{Number(pool.volume_m3).toLocaleString()} m³</strong></Info>
                  {pool.depth_m && <Info TH={TH} label="Depth">{pool.depth_m} m</Info>}
                  {pool.surface_m2 && <Info TH={TH} label="Surface">{pool.surface_m2} m²</Info>}
                </div>
                {pool.location_note && <div style={{marginTop:10, fontSize:12, color:TH.textMuted, fontStyle:"italic"}}>📍 {pool.location_note}</div>}
              </>
            ) : (
              <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10}}>
                <Field TH={TH} label="Name"><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inp(TH)} /></Field>
                <Field TH={TH} label="Type">
                  <select value={form.pool_type} onChange={e => setForm({...form, pool_type: e.target.value})} style={inp(TH)}>
                    {Object.entries(POOL_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Field>
                <Field TH={TH} label="Volume (m³) *"><input type="number" value={form.volume_m3} onChange={e => setForm({...form, volume_m3: e.target.value})} style={inp(TH)} /></Field>
                <Field TH={TH} label="Depth (m)"><input type="number" step="0.1" value={form.depth_m} onChange={e => setForm({...form, depth_m: e.target.value})} style={inp(TH)} /></Field>
                <Field TH={TH} label="Surface (m²)"><input type="number" value={form.surface_m2} onChange={e => setForm({...form, surface_m2: e.target.value})} style={inp(TH)} /></Field>
                <Field TH={TH} label="Location note"><input value={form.location_note} onChange={e => setForm({...form, location_note: e.target.value})} style={inp(TH)} /></Field>
                <div style={{gridColumn:"1/-1", display:"flex", gap:8, justifyContent:"flex-end", marginTop:6}}>
                  <button onClick={() => { setEditMode(false); setForm({...pool}); }} style={ghostBtn(TH)}>Cancel</button>
                  <button onClick={save} disabled={busy} style={goldBtn}>{busy ? "Saving..." : "Save"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommended dosage table */}
      {!editMode && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:18, marginBottom:14}}>
          <div style={{fontSize:14, fontWeight:800, color:TH.text, marginBottom:12}}>💧 Recommended dosage for {Number(pool.volume_m3).toLocaleString()} m³</div>
          <div style={{fontSize:11, color:TH.textMuted, marginBottom:12}}>
            Per-treatment amounts based on standard chemical concentrations. Adjust for water readings.
          </div>
          <div style={{overflow:"auto"}}>
            <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
              <thead>
                <tr style={{borderBottom:`1px solid ${TH.border}`, textAlign:"left"}}>
                  <th style={th(TH)}>Chemical</th>
                  <th style={th(TH)}>Purpose</th>
                  <th style={{...th(TH), textAlign:"right"}}>Dose</th>
                  <th style={{...th(TH), textAlign:"right"}}>Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {chemicals.map(c => {
                  const dose = recommendedDose(c, pool.volume_m3);
                  const cost = estimatedCost(c, dose);
                  const purp = CHEMICAL_PURPOSES[c.purpose] || {};
                  return (
                    <tr key={c.id} style={{borderBottom:`1px solid ${TH.border}`}}>
                      <td style={td(TH)}>{c.name}</td>
                      <td style={td(TH)}><span style={chip(purp.color || TH.textMuted)}>{purp.icon} {purp.label || c.purpose}</span></td>
                      <td style={{...td(TH), textAlign:"right", fontWeight:700, fontFamily:"monospace"}}>{fmtQty(dose, c.unit)}</td>
                      <td style={{...td(TH), textAlign:"right", fontFamily:"monospace"}}>{fmtMoney(cost, c.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" style={{...td(TH), fontWeight:700, textAlign:"right"}}>Full treatment cost:</td>
                  <td style={{...td(TH), textAlign:"right", fontWeight:800, color:TH.accent, fontFamily:"monospace"}}>
                    {fmtMoney(chemicals.reduce((s, c) => {
                      const d = recommendedDose(c, pool.volume_m3);
                      const cst = estimatedCost(c, d);
                      return s + (cst || 0);
                    }, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Recent treatments */}
      {!editMode && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:18}}>
          <div style={{fontSize:14, fontWeight:800, color:TH.text, marginBottom:12}}>📋 Recent treatments</div>
          {history.length === 0 ? (
            <div style={{padding:20, color:TH.textDim, fontSize:13, textAlign:"center"}}>No treatments logged yet</div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", gap:8}}>
              {history.map(h => (
                <div key={h.id} style={{padding:"10px 12px", background:TH.bgInput, borderRadius:8, fontSize:12}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                    <div>
                      <div style={{fontWeight:700, color:TH.text}}>{h.operator_name || 'Unknown'}</div>
                      <div style={{color:TH.textDim, fontSize:10, fontFamily:"monospace"}}>{h.treatment_no}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{color:TH.text, fontWeight:700, fontFamily:"monospace"}}>{fmtMoney(h.total_cost)}</div>
                      <div style={{color:TH.textMuted, fontSize:10}}>{fmtDateTime(h.performed_at)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ TH, label, children }) {
  return (
    <div>
      <div style={{fontSize:9, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:2}}>{label}</div>
      <div style={{fontSize:13, color:TH.text}}>{children}</div>
    </div>
  );
}
function Field({ TH, label, children }) {
  return (
    <div>
      <label style={{display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px"}}>{label}</label>
      {children}
    </div>
  );
}
function inp(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:9, padding:"10px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
function chip(color) {
  return { fontSize:10, color: color, background: color + "22", padding:"3px 8px", borderRadius:5, fontWeight:600 };
}
function ghostBtn(TH) {
  return { background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.text, padding:"7px 14px", cursor:"pointer", fontSize:13, fontFamily:"inherit", fontWeight:600 };
}
const goldBtn = {
  background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:9,
  color:"#000", padding:"10px 22px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit",
};
function ErrBox({ TH, children }) {
  return <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{children}</div>;
}
function th(TH) {
  return { padding:"8px 10px", fontSize:10, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:700 };
}
function td(TH) {
  return { padding:"10px", color:TH.text, verticalAlign:"middle" };
}
