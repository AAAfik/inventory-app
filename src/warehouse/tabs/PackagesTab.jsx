// ═══════════════════════════════════════════════════════════════════
// PackagesTab.jsx — postal package management
// Warehouse keeper takes photo + records recipient info.
// Filters by status / property / search.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import { formatDate, formatDateShort } from "../../inspection/lib/inspectionUtils";
import NewPackageModal from "../components/NewPackageModal";
import PackageDetail from "./PackageDetail";

const STATUS_META = {
  received:  { label: "Received",  color: "#B8935A", icon: "📦" },
  collected: { label: "Collected", color: "#7A9A5B", icon: "✓" },
  returned:  { label: "Returned",  color: "#8f8f8f", icon: "↩" },
  lost:      { label: "Lost",      color: "#C43D3D", icon: "⚠" },
};

export default function PackagesTab({ TH, lang = "en", isMobile, isAdmin }) {
  const L = tr(lang);
  const [packages, setPackages] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("received");
  const [propFilter, setPropFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      const [rP, rWH] = await Promise.all([
        supabase.from('packages').select('*').eq('is_active', true).order('received_at', { ascending: false }),
        supabase.from('wh_properties').select('id, code, name').eq('is_active', true).order('id'),
      ]);
      if (rP.error) throw rP.error;
      setPackages(rP.data || []);
      setProperties(rWH.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  if (selected) {
    return <PackageDetail
      TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin}
      packageId={selected}
      properties={properties}
      onClose={() => { setSelected(null); loadAll(); }}
    />;
  }

  const propMap = Object.fromEntries(properties.map(p => [p.id, p]));

  const filt = packages.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (propFilter !== "all" && String(p.recipient_property_id) !== propFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [p.package_no, p.recipient_name, p.recipient_unit, p.notes].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const statusCounts = { all: packages.length };
  Object.keys(STATUS_META).forEach(k => { statusCounts[k] = packages.filter(p => p.status === k).length; });

  return (
    <div>
      {showNew && (
        <NewPackageModal
          TH={TH} lang={lang}
          properties={properties}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); loadAll(); }}
        />
      )}

      {/* Header row */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:14, fontWeight:800, color:TH.text}}>📮 {L.packagesTitle || 'Packages'}</div>
          <div style={{fontSize:11, color:TH.textMuted, marginTop:2}}>{L.packagesDesc || 'Receive and track postal packages for guests / staff.'}</div>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{
            background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:10,
            color:"#000", padding:"12px 20px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
            boxShadow:"0 2px 10px rgba(184,147,90,0.3)", display:"flex", alignItems:"center", gap:6,
          }}
        >📦 {L.newPackage || 'New package'}</button>
      </div>

      {/* Status pills */}
      <div style={{display:"flex", gap:6, marginBottom:12, overflowX:"auto"}}>
        <PillBtn TH={TH} on={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
          {L.all || 'All'} <Count on={statusFilter === "all"}>{statusCounts.all || 0}</Count>
        </PillBtn>
        {Object.entries(STATUS_META).map(([k, m]) => (
          <PillBtn key={k} TH={TH} on={statusFilter === k} onClick={() => setStatusFilter(k)}>
            {m.icon} {m.label} <Count on={statusFilter === k}>{statusCounts[k] || 0}</Count>
          </PillBtn>
        ))}
      </div>

      {/* Search + property */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"2fr 1fr", gap:8, marginBottom:14}}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L.packagesSearchPh || 'Search name / package no / unit…'} style={inp(TH)} />
        <select value={propFilter} onChange={e => setPropFilter(e.target.value)} style={inp(TH)}>
          <option value="all">{L.allProperties || 'All properties'}</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:10, padding:"12px 14px", color:"#C43D3D", fontSize:13, marginBottom:14}}>{error}</div>}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>{L.loading || 'Loading…'}</div>
      ) : filt.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          {L.packagesEmpty || 'No packages match.'}
        </div>
      ) : (
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(300px, 1fr))", gap:12}}>
          {filt.map(p => {
            const sm = STATUS_META[p.status] || { label: p.status, color: '#8f8f8f', icon: '•' };
            const prop = propMap[p.recipient_property_id];
            const cover = p.photos?.[0];
            return (
              <div key={p.id} onClick={() => setSelected(p.id)} style={{
                background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, cursor:"pointer",
                borderLeft:`3px solid ${sm.color}`, overflow:"hidden",
              }}
              onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = TH.bgCard}>
                <div style={{display:"flex", gap:12, padding:14}}>
                  {cover ? (
                    <img src={cover} alt="" style={{width:76, height:76, objectFit:"cover", borderRadius:10, flexShrink:0, background:"#000"}} loading="lazy" />
                  ) : (
                    <div style={{width:76, height:76, borderRadius:10, flexShrink:0, background:TH.bgInput, display:"flex", alignItems:"center", justifyContent:"center", fontSize:34}}>📦</div>
                  )}
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:"flex", justifyContent:"space-between", gap:8, marginBottom:4}}>
                      <div style={{fontSize:14, fontWeight:800, color:TH.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.recipient_name}</div>
                      <span style={{fontSize:9, color:sm.color, fontWeight:700, textTransform:"uppercase", whiteSpace:"nowrap", flexShrink:0}}>{sm.icon} {sm.label}</span>
                    </div>
                    <div style={{fontSize:10, color:TH.textDim, fontFamily:"monospace", marginBottom:6}}>{p.package_no}</div>
                    <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
                      {prop && <Chip TH={TH}>🏢 {prop.name}</Chip>}
                      {p.recipient_unit && <Chip TH={TH} gold>🏠 {p.recipient_unit}</Chip>}
                      {p.photos?.length > 1 && <Chip TH={TH}>📸 {p.photos.length}</Chip>}
                    </div>
                    <div style={{fontSize:10, color:TH.textDim, marginTop:6}}>
                      {p.status === 'collected' && p.collected_at
                        ? `${L.collectedOn || 'Collected'} · ${formatDateShort(p.collected_at)}`
                        : `${L.receivedOn || 'Received'} · ${formatDateShort(p.received_at)}`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PillBtn({ TH, on, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: on ? TH.accentBg : "transparent",
      border: `1px solid ${on ? TH.accentBorder : TH.border}`,
      borderRadius: 20, color: on ? TH.accentText : TH.textMuted,
      padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: on ? 700 : 500,
      fontFamily: "inherit", whiteSpace: "nowrap", display:"inline-flex", alignItems:"center", gap:5,
    }}>{children}</button>
  );
}
function Count({ children, on }) {
  return <span style={{background: on ? "#B8935A" : "rgba(255,255,255,0.05)", color: on ? "#000" : "#888", borderRadius:10, padding:"1px 7px", fontSize:10, fontWeight:700}}>{children}</span>;
}
function Chip({ TH, children, gold }) {
  return <span style={{fontSize:10, color: gold ? "#B8935A" : TH.textMuted, background: gold ? "rgba(184,147,90,0.12)" : TH.bgInput, padding:"3px 8px", borderRadius:5, whiteSpace:"nowrap"}}>{children}</span>;
}
function inp(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
