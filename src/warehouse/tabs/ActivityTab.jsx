// ═══════════════════════════════════════════════════════════════════
// ActivityTab.jsx — global feed of asset_history events
// Shows recent activity across ALL assets with filters.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import { formatDate } from "../../inspection/lib/inspectionUtils";

const EVENT_META = {
  created:          { icon: "✨", color: "#7A9A5B", label: "Created" },
  updated:          { icon: "✏️", color: "#8B7040", label: "Updated" },
  moved:            { icon: "📍", color: "#7BB3D4", label: "Moved" },
  assigned:         { icon: "👤", color: "#B8935A", label: "Assigned" },
  unassigned:       { icon: "🔓", color: "#8f8f8f", label: "Unassigned" },
  serviced:         { icon: "🔧", color: "#B8862C", label: "Serviced" },
  condition_changed:{ icon: "🩹", color: "#E67A2C", label: "Condition changed" },
  cost_updated:     { icon: "💰", color: "#8B7040", label: "Cost updated" },
  status_changed:   { icon: "🔄", color: "#7BB3D4", label: "Status changed" },
  deleted:          { icon: "🗑",  color: "#C43D3D", label: "Deleted" },
  barcode_scanned:  { icon: "📷", color: "#B8935A", label: "Barcode scanned" },
  note:             { icon: "📝", color: "#8f8f8f", label: "Note" },
};

export default function ActivityTab({ TH, lang = "en", isMobile }) {
  const L = tr(lang);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventFilter, setEventFilter] = useState("all");
  const [assetFilter, setAssetFilter] = useState("");
  const [limit, setLimit] = useState(50);

  useEffect(() => { load(); }, [limit]);

  async function load() {
    setLoading(true); setError(null);
    try {
      // Join history with asset name + user email in one query
      const { data, error: e } = await supabase
        .from('asset_history')
        .select(`
          id, event_type, field_name, old_value, new_value, notes, performed_at, performed_by,
          asset:asset_id ( id, name, asset_no, barcode, kind )
        `)
        .order('performed_at', { ascending: false })
        .limit(limit);
      if (e) throw e;
      setRows(data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const filt = rows.filter(r => {
    if (eventFilter !== "all" && r.event_type !== eventFilter) return false;
    if (assetFilter) {
      const q = assetFilter.toLowerCase();
      const hay = [r.asset?.name, r.asset?.asset_no, r.asset?.barcode].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Count events by type for filter pills
  const eventCounts = { all: rows.length };
  Object.keys(EVENT_META).forEach(k => { eventCounts[k] = rows.filter(r => r.event_type === k).length; });

  return (
    <div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:14, fontWeight:800, color:TH.text, marginBottom:4}}>{L.activityTitle || 'Activity Feed'}</div>
        <div style={{fontSize:12, color:TH.textMuted}}>{L.activityDesc || 'All asset events across the system.'}</div>
      </div>

      {/* Filter pills — event types */}
      <div style={{display:"flex", gap:6, marginBottom:10, overflowX:"auto", paddingBottom:4}}>
        <button onClick={() => setEventFilter("all")} style={pill(TH, eventFilter === "all")}>
          {L.allEvents || 'All'} <Count on={eventFilter === "all"}>{eventCounts.all || 0}</Count>
        </button>
        {Object.entries(EVENT_META).filter(([k]) => (eventCounts[k] || 0) > 0).map(([k, m]) => (
          <button key={k} onClick={() => setEventFilter(k)} style={pill(TH, eventFilter === k)}>
            {m.icon} {m.label} <Count on={eventFilter === k}>{eventCounts[k]}</Count>
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        value={assetFilter}
        onChange={e => setAssetFilter(e.target.value)}
        placeholder={L.activitySearchPh || 'Search by asset name / no / barcode…'}
        style={{width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box", marginBottom:14}}
      />

      {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:10, padding:"12px 14px", color:"#C43D3D", fontSize:13, marginBottom:14}}>{error}</div>}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>{L.loading || 'Loading…'}</div>
      ) : filt.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          {L.activityEmpty || 'No activity to display.'}
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {filt.map(r => {
            const em = EVENT_META[r.event_type] || { icon: "•", color: "#8f8f8f", label: r.event_type };
            return (
              <div key={r.id} style={{
                background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:10,
                borderLeft:`3px solid ${em.color}`, padding:"10px 14px",
              }}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap"}}>
                  <div style={{display:"flex", alignItems:"center", gap:8}}>
                    <span style={{fontSize:16}}>{em.icon}</span>
                    <div>
                      <div style={{fontSize:13, fontWeight:700, color:TH.text}}>
                        {em.label}
                        {r.field_name && <span style={{fontSize:11, color:TH.textMuted, fontWeight:400}}> · {r.field_name}</span>}
                      </div>
                      <div style={{fontSize:11, color:TH.textDim, marginTop:2}}>
                        {r.asset ? (
                          <>
                            <b style={{color:TH.textMuted}}>{r.asset.name}</b>
                            <span style={{fontFamily:"monospace", marginLeft:6}}>{r.asset.asset_no}{r.asset.barcode ? ` · ${r.asset.barcode}` : ''}</span>
                          </>
                        ) : <span style={{color:"#C43D3D"}}>{L.assetDeleted || 'Asset deleted'}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{fontSize:10, color:TH.textDim, whiteSpace:"nowrap"}}>{formatDate(r.performed_at)}</div>
                </div>
                {(r.old_value || r.new_value) && (
                  <div style={{fontSize:11, color:TH.textMuted, marginTop:6, padding:8, background:TH.bgInput, borderRadius:6}}>
                    {r.old_value && <div><span style={{color:"#C43D3D"}}>−</span> {jsonPreview(r.old_value)}</div>}
                    {r.new_value && <div><span style={{color:"#7A9A5B"}}>+</span> {jsonPreview(r.new_value)}</div>}
                  </div>
                )}
                {r.notes && <div style={{fontSize:11, color:TH.textMuted, marginTop:4, fontStyle:"italic"}}>💬 {r.notes}</div>}
              </div>
            );
          })}
        </div>
      )}

      {rows.length >= limit && (
        <button onClick={() => setLimit(l => l + 50)} style={{
          width:"100%", marginTop:12, background:TH.bgInput, border:`1px solid ${TH.border}`,
          borderRadius:9, color:TH.text, padding:"10px 14px", cursor:"pointer",
          fontSize:13, fontWeight:600, fontFamily:"inherit",
        }}>{L.loadMore || 'Load more'}</button>
      )}
    </div>
  );
}

function jsonPreview(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v !== 'object') return String(v);
  return Object.entries(v).map(([k, val]) => `${k}: ${val === null ? '—' : val}`).join(' · ');
}

function pill(TH, on) {
  return {
    background: on ? TH.accentBg : "transparent",
    border: `1px solid ${on ? TH.accentBorder : TH.border}`,
    borderRadius: 20, color: on ? TH.accentText : TH.textMuted,
    padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: on ? 700 : 500,
    fontFamily: "inherit", whiteSpace: "nowrap", display:"inline-flex", alignItems:"center", gap:5,
  };
}
function Count({ children, on }) {
  return <span style={{background: on ? "#B8935A" : "rgba(255,255,255,0.05)", color: on ? "#000" : "#888", borderRadius:10, padding:"1px 7px", fontSize:10, fontWeight:700}}>{children}</span>;
}
