// ═══════════════════════════════════════════════════════════════════════
// TreatmentHistoryTab.jsx — all past treatments with filters + detail view
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { POOL_TYPES, CHEMICAL_PURPOSES, CLARITY_OPTIONS, phStatus, chlorineStatus, fmtQty, fmtMoney, fmtDateTime } from "../lib/poolUtils";

export default function TreatmentHistoryTab({ TH, isMobile, isAdmin }) {
  const [treatments, setTreatments] = useState([]);
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const [poolFilter, setPoolFilter] = useState("all");
  const [rangeFilter, setRangeFilter] = useState("30d");
  const [search, setSearch] = useState("");

  useEffect(() => { loadAll(); }, [rangeFilter]);

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      let cutoff = null;
      if (rangeFilter === "7d") cutoff = new Date(Date.now() - 7*24*3600*1000);
      else if (rangeFilter === "30d") cutoff = new Date(Date.now() - 30*24*3600*1000);
      else if (rangeFilter === "90d") cutoff = new Date(Date.now() - 90*24*3600*1000);

      let q = supabase.from('pool_treatments').select('*').order('performed_at', { ascending: false }).limit(500);
      if (cutoff) q = q.gte('performed_at', cutoff.toISOString());

      const [rT, rP] = await Promise.all([
        q,
        supabase.from('pools').select('id, code, name, pool_type, property_id'),
      ]);
      if (rT.error) throw rT.error;
      setTreatments(rT.data || []);
      setPools(rP.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const poolMap = Object.fromEntries(pools.map(p => [p.id, p]));

  const filt = treatments.filter(t => {
    if (poolFilter !== "all" && String(t.pool_id) !== poolFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const pool = poolMap[t.pool_id];
      const hay = [t.treatment_no, t.operator_name, pool?.name, pool?.code, t.notes].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const totalCost = filt.reduce((s, t) => s + (Number(t.total_cost) || 0), 0);

  if (selected) {
    return <TreatmentDetail TH={TH} isMobile={isMobile} isAdmin={isAdmin} treatment={selected} pool={poolMap[selected.pool_id]} onClose={() => { setSelected(null); loadAll(); }} />;
  }

  return (
    <div>
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr", gap:8, marginBottom:16}}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search operator, pool, notes..." style={inp(TH)} />
        <select value={poolFilter} onChange={e => setPoolFilter(e.target.value)} style={inp(TH)}>
          <option value="all">All pools</option>
          {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={rangeFilter} onChange={e => setRangeFilter(e.target.value)} style={inp(TH)}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      {error && <ErrBox TH={TH}>{error}</ErrBox>}

      {/* Summary */}
      {filt.length > 0 && (
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8, marginBottom:14}}>
          <MiniStat TH={TH} label="Treatments" value={filt.length} />
          <MiniStat TH={TH} label="Total cost" value={fmtMoney(totalCost)} />
          <MiniStat TH={TH} label="Avg / treatment" value={fmtMoney(filt.length ? totalCost/filt.length : 0)} />
        </div>
      )}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading...</div>
      ) : filt.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px dashed ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          No treatments in this period.
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {filt.map(t => {
            const pool = poolMap[t.pool_id];
            const type = POOL_TYPES[pool?.pool_type] || POOL_TYPES.main;
            const cover = t.photos?.[0];
            return (
              <div key={t.id} onClick={() => setSelected(t)} style={{
                background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:10,
                padding:12, cursor:"pointer", display:"flex", gap:12, alignItems:"center",
              }}
              onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = TH.bgCard}>
                {cover ? (
                  <img src={cover} alt="" style={{width:50, height:50, objectFit:"cover", borderRadius:8, background:"#000", flexShrink:0}} loading="lazy" />
                ) : (
                  <div style={{width:50, height:50, background:TH.bgInput, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0}}>{type.icon}</div>
                )}
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:14, fontWeight:700, color:TH.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{pool?.name || 'Unknown pool'}</div>
                  <div style={{fontSize:11, color:TH.textMuted}}>👤 {t.operator_name || 'Unknown'} · {fmtDateTime(t.performed_at)}</div>
                  <div style={{fontSize:10, color:TH.textDim, fontFamily:"monospace"}}>{t.treatment_no}</div>
                </div>
                <div style={{textAlign:"right", flexShrink:0}}>
                  <div style={{fontSize:15, fontWeight:800, color:TH.accent, fontFamily:"monospace"}}>{fmtMoney(t.total_cost)}</div>
                  {t.photos?.length > 1 && <div style={{fontSize:10, color:TH.textDim}}>📷 {t.photos.length}</div>}
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
function TreatmentDetail({ TH, isMobile, isAdmin, treatment, pool, onClose }) {
  const [lines, setLines] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(null);
  const type = POOL_TYPES[pool?.pool_type] || POOL_TYPES.main;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [rL, rC] = await Promise.all([
          supabase.from('pool_treatment_lines').select('*').eq('treatment_id', treatment.id),
          supabase.from('pool_chemicals').select('id, name, purpose'),
        ]);
        setLines(rL.data || []);
        setChemicals(rC.data || []);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [treatment.id]);

  async function deleteTreatment() {
    if (!confirm(`Delete treatment ${treatment.treatment_no}? This will NOT restore chemicals back to warehouse.`)) return;
    try {
      await supabase.from('pool_treatments').delete().eq('id', treatment.id);
      onClose();
    } catch (e) { setError(e.message); }
  }

  const chemMap = Object.fromEntries(chemicals.map(c => [c.id, c]));

  return (
    <div>
      {zoom && (
        <div onClick={() => setZoom(null)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.94)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16, cursor:"pointer"}}>
          <img src={zoom} alt="" style={{maxWidth:"100%", maxHeight:"100%", objectFit:"contain"}} />
        </div>
      )}

      <div style={{display:"flex", justifyContent:"space-between", marginBottom:14, gap:8, flexWrap:"wrap"}}>
        <button onClick={onClose} style={ghostBtn(TH)}>← Back</button>
        <div style={{display:"flex", gap:6, alignItems:"center"}}>
          {isAdmin && <button onClick={deleteTreatment} style={{...ghostBtn(TH), color:"#8f8f8f"}}>🗑 Delete</button>}
          <div style={{fontSize:11, color:TH.textMuted, fontFamily:"monospace"}}>{treatment.treatment_no}</div>
        </div>
      </div>

      {error && <ErrBox TH={TH}>{error}</ErrBox>}

      {/* Header */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, borderLeft:`4px solid ${type.color}`, padding:18, marginBottom:14}}>
        <div style={{display:"flex", gap:14, flexWrap:"wrap", alignItems:"flex-start"}}>
          <div style={{fontSize:52}}>{type.icon}</div>
          <div style={{flex:1, minWidth:180}}>
            <div style={{fontSize:11, color:type.color, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px"}}>Pool Treatment</div>
            <div style={{fontSize:isMobile?18:22, fontWeight:700, color:TH.text, fontFamily:"'Playfair Display', Georgia, serif"}}>{pool?.name || 'Unknown pool'}</div>
            <div style={{fontSize:12, color:TH.textMuted, marginBottom:12}}>👤 {treatment.operator_name || 'Unknown'} · {fmtDateTime(treatment.performed_at)}</div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(110px, 1fr))", gap:10}}>
              <Info TH={TH} label="pH before">{treatment.ph_before || '—'}</Info>
              <Info TH={TH} label="pH after">{treatment.ph_after || '—'}</Info>
              <Info TH={TH} label="Chlorine">{treatment.chlorine_ppm ? `${treatment.chlorine_ppm} ppm` : '—'}</Info>
              <Info TH={TH} label="Water temp">{treatment.water_temp ? `${treatment.water_temp}°C` : '—'}</Info>
              <Info TH={TH} label="Clarity">{CLARITY_OPTIONS[treatment.clarity]?.label || '—'}</Info>
              <Info TH={TH} label="Total cost"><strong style={{color:TH.accent, fontFamily:"monospace"}}>{fmtMoney(treatment.total_cost)}</strong></Info>
            </div>
          </div>
        </div>
      </div>

      {/* Photos */}
      {treatment.photos?.length > 0 && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:14, marginBottom:14}}>
          <div style={{fontSize:12, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", marginBottom:10, letterSpacing:"0.5px"}}>📷 Evidence ({treatment.photos.length})</div>
          <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(2, 1fr)":"repeat(auto-fill, minmax(140px, 1fr))", gap:8}}>
            {treatment.photos.map((url, i) => (
              <img key={i} src={url} alt="" onClick={() => setZoom(url)} style={{width:"100%", height:120, objectFit:"cover", borderRadius:8, cursor:"pointer", background:"#000"}} loading="lazy" />
            ))}
          </div>
        </div>
      )}

      {/* Chemicals used */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:14, marginBottom:14}}>
        <div style={{fontSize:12, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", marginBottom:10, letterSpacing:"0.5px"}}>🧪 Chemicals used</div>
        {loading ? (
          <div style={{padding:20, textAlign:"center", color:TH.textDim}}>Loading...</div>
        ) : lines.length === 0 ? (
          <div style={{padding:16, textAlign:"center", color:TH.textDim, fontSize:13}}>No chemical lines recorded</div>
        ) : (
          <div style={{overflow:"auto"}}>
            <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
              <thead>
                <tr style={{borderBottom:`1px solid ${TH.border}`}}>
                  <th style={th(TH)}>Chemical</th>
                  <th style={{...th(TH), textAlign:"right"}}>Qty</th>
                  <th style={{...th(TH), textAlign:"right"}}>Cost</th>
                  <th style={{...th(TH), textAlign:"center"}}>WH deducted</th>
                </tr>
              </thead>
              <tbody>
                {lines.map(l => {
                  const chem = chemMap[l.chemical_id];
                  const purp = CHEMICAL_PURPOSES[chem?.purpose] || {};
                  return (
                    <tr key={l.id} style={{borderBottom:`1px solid ${TH.border}`}}>
                      <td style={td(TH)}>{purp.icon} {l.chemical_name || chem?.name || '—'}</td>
                      <td style={{...td(TH), textAlign:"right", fontFamily:"monospace"}}>{fmtQty(l.qty, l.unit)}</td>
                      <td style={{...td(TH), textAlign:"right", fontFamily:"monospace"}}>{fmtMoney(l.total_cost)}</td>
                      <td style={{...td(TH), textAlign:"center"}}>{l.auto_deducted ? <span style={{color:"#C9A960", fontWeight:700}}>✓</span> : <span style={{color:TH.textDim}}>—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {treatment.notes && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:14}}>
          <div style={{fontSize:12, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", marginBottom:8, letterSpacing:"0.5px"}}>Notes</div>
          <div style={{fontSize:13, color:TH.text, whiteSpace:"pre-wrap", lineHeight:1.5}}>{treatment.notes}</div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ TH, label, value }) {
  return (
    <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:10, padding:"10px 12px"}}>
      <div style={{fontSize:9, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4}}>{label}</div>
      <div style={{fontSize:16, fontWeight:800, color:TH.text, fontFamily:"monospace"}}>{value}</div>
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
function inp(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
function ghostBtn(TH) {
  return { background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.text, padding:"7px 14px", cursor:"pointer", fontSize:13, fontFamily:"inherit", fontWeight:600 };
}
function ErrBox({ TH, children }) {
  return <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{children}</div>;
}
function th(TH) { return { padding:"8px 10px", fontSize:10, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:700, textAlign:"left" }; }
function td(TH) { return { padding:"10px", color:TH.text, verticalAlign:"middle" }; }
