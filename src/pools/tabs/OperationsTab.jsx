// ═══════════════════════════════════════════════════════════════════
// OperationsTab.jsx — all pool operations feed with filters
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { formatDate } from "../../inspection/lib/inspectionUtils";

const OP_META = {
  cleaning:        { icon: '🧹', color: '#7BB3D4', label: 'Cleaning' },
  chemical_dosing: { icon: '🧪', color: '#B8935A', label: 'Chemical Dosing' },
  maintenance:     { icon: '🔧', color: '#8B7040', label: 'Maintenance' },
  filter_change:   { icon: '🔄', color: '#B8862C', label: 'Filter Change' },
};

export default function OperationsTab({ TH, isMobile, isAdmin, onOpenPool }) {
  const [rows, setRows]   = useState([]);
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [poolFilter, setPoolFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit]   = useState(50);

  useEffect(() => { load(); }, [limit]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rO, rP] = await Promise.all([
        supabase.from('pool_operations_enriched')
          .select('*')
          .order('performed_at', { ascending: false })
          .limit(limit),
        supabase.from('pools').select('id, code, name').eq('is_active', true).order('code'),
      ]);
      if (rO.error) throw rO.error;
      setRows(rO.data || []);
      setPools(rP.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const counts = { all: rows.length };
  Object.keys(OP_META).forEach(k => { counts[k] = rows.filter(r => r.operation_type === k).length; });

  const filt = rows.filter(r => {
    if (typeFilter !== "all" && r.operation_type !== typeFilter) return false;
    if (poolFilter !== "all" && String(r.pool_id) !== poolFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [r.pool_name, r.pool_code, r.notes].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Type pills */}
      <div style={{display:"flex", gap:6, marginBottom:10, overflowX:"auto"}}>
        <PillBtn TH={TH} on={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
          All <Count on={typeFilter === "all"}>{counts.all || 0}</Count>
        </PillBtn>
        {Object.entries(OP_META).filter(([k]) => (counts[k] || 0) > 0).map(([k, m]) => (
          <PillBtn key={k} TH={TH} on={typeFilter === k} onClick={() => setTypeFilter(k)}>
            {m.icon} {m.label} <Count on={typeFilter === k}>{counts[k]}</Count>
          </PillBtn>
        ))}
      </div>

      {/* Pool + search */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"2fr 1fr", gap:8, marginBottom:14}}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pool / notes…" style={inp(TH)} />
        <select value={poolFilter} onChange={e => setPoolFilter(e.target.value)} style={inp(TH)}>
          <option value="all">All pools</option>
          {pools.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
      </div>

      {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:10, padding:"12px 14px", color:"#C43D3D", fontSize:13, marginBottom:14}}>{error}</div>}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading…</div>
      ) : filt.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          No operations to display.
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {filt.map(op => {
            const meta = OP_META[op.operation_type] || { icon: '•', color: '#8f8f8f', label: op.operation_type };
            return (
              <div key={op.id} style={{
                background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12,
                borderLeft:`3px solid ${meta.color}`, padding:14,
              }}>
                <div style={{display:"flex", justifyContent:"space-between", gap:10, marginBottom:8, flexWrap:"wrap"}}>
                  <div style={{display:"flex", alignItems:"center", gap:10}}>
                    <span style={{fontSize:22}}>{meta.icon}</span>
                    <div>
                      <div style={{fontSize:13, fontWeight:800, color:TH.text}}>
                        {meta.label} · <span onClick={() => onOpenPool?.(op.pool_id)} style={{color: meta.color, cursor: onOpenPool ? "pointer" : "default"}}>{op.pool_code} — {op.pool_name}</span>
                      </div>
                      <div style={{fontSize:10, color:TH.textDim, marginTop:2}}>{formatDate(op.performed_at)}</div>
                    </div>
                  </div>
                </div>

                {/* Water measurements */}
                {(op.ph_before || op.ph_after || op.chlorine_before || op.chlorine_after) && (
                  <div style={{display:"flex", gap:8, flexWrap:"wrap", fontSize:11, color:TH.textMuted, marginBottom:6}}>
                    {op.ph_before != null && <Chip TH={TH}>pH: {op.ph_before}{op.ph_after != null ? ` → ${op.ph_after}` : ''}</Chip>}
                    {op.chlorine_before != null && <Chip TH={TH}>Cl: {op.chlorine_before}{op.chlorine_after != null ? ` → ${op.chlorine_after}` : ''}</Chip>}
                  </div>
                )}

                {/* Chemicals used */}
                {op.chemicals_used && op.chemicals_used.length > 0 && (
                  <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:6}}>
                    {op.chemicals_used.map((c, i) => (
                      <Chip key={i} TH={TH} gold>🧪 {c.item_name}: {c.qty} {c.unit}</Chip>
                    ))}
                  </div>
                )}

                {/* Filter change */}
                {op.operation_type === 'filter_change' && (op.new_filter_type || op.new_filter_model) && (
                  <div style={{fontSize:11, color:TH.textMuted, marginBottom:6}}>
                    🔄 {op.new_filter_type} {op.new_filter_model && `· ${op.new_filter_model}`}
                  </div>
                )}

                {op.notes && (
                  <div style={{fontSize:12, color:TH.text, padding:"6px 10px", background:TH.bgInput, borderRadius:6, marginTop:4}}>
                    {op.notes}
                  </div>
                )}

                {/* Photos */}
                {op.photos && op.photos.length > 0 && (
                  <div style={{display:"flex", gap:4, marginTop:8, flexWrap:"wrap"}}>
                    {op.photos.slice(0, 4).map((url, i) => (
                      <img key={i} src={url} alt="" style={{width:60, height:60, objectFit:"cover", borderRadius:6, background:"#000"}} loading="lazy" />
                    ))}
                    {op.photos.length > 4 && (
                      <div style={{width:60, height:60, borderRadius:6, background:TH.bgInput, display:"flex", alignItems:"center", justifyContent:"center", color:TH.textMuted, fontSize:12, fontWeight:700}}>+{op.photos.length - 4}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rows.length >= limit && (
        <button onClick={() => setLimit(l => l + 50)} style={{width:"100%", marginTop:12, background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:9, color:TH.text, padding:"10px 14px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>Load more</button>
      )}
    </div>
  );
}

function Chip({ TH, children, gold }) {
  return <span style={{fontSize:10, color: gold ? "#B8935A" : TH.textMuted, background: gold ? "rgba(184,147,90,0.12)" : TH.bgInput, padding:"3px 8px", borderRadius:5, whiteSpace:"nowrap"}}>{children}</span>;
}
function PillBtn({ TH, on, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: on ? TH.accentBg : "transparent",
      border: `1px solid ${on ? TH.accentBorder : TH.border}`,
      borderRadius: 20, color: on ? TH.accentText : TH.textMuted,
      padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: on ? 700 : 500,
      fontFamily: "inherit", whiteSpace: "nowrap", display:"inline-flex", alignItems:"center", gap:5,
    }}>{children}</button>
  );
}
function Count({ children, on }) {
  return <span style={{background: on ? "#B8935A" : "rgba(255,255,255,0.05)", color: on ? "#000" : "#888", borderRadius:10, padding:"1px 7px", fontSize:10, fontWeight:700}}>{children}</span>;
}
function inp(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
