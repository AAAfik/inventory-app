// ═══════════════════════════════════════════════════════════════════
// InspectionsListTab.jsx — grid of inspection cards
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { INSPECTION_STATUS, CATEGORIES, PRIORITY, formatDate, severityColor } from "../lib/inspectionUtils";
import { tr } from "../../i18n";
import InspectionDetail from "./InspectionDetail";

export default function InspectionsListTab({ TH, lang = "en", isMobile, isAdmin, onlyOpenIssues = false }) {
  const L = tr(lang);
  const STATUS_LBL = { ok: L.statusOk, minor_issue: L.statusMinor, major_issue: L.statusMajor, critical: L.statusCritical, needs_repair: L.statusRepair, fixed: L.statusFixed };
  const [inspections, setInspections] = useState([]);
  const [properties, setProperties]   = useState([]);
  const [areas, setAreas]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [selected, setSelected]       = useState(null);

  const [statusFilter, setStatusFilter]     = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch]                 = useState("");

  useEffect(() => { loadAll(); }, [onlyOpenIssues]);

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      let q = supabase.from('inspections').select('*').order('created_at', { ascending: false }).limit(500);
      if (onlyOpenIssues) {
        q = q.in('status', ['minor_issue', 'major_issue', 'critical', 'needs_repair']);
      }
      const [rI, rP, rA] = await Promise.all([
        q,
        supabase.from('wh_properties').select('id, code, name'),
        supabase.from('inspection_areas').select('id, code, name'),
      ]);
      if (rI.error) throw rI.error;
      setInspections(rI.data || []);
      setProperties(rP.data || []);
      setAreas(rA.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  if (selected) {
    return <InspectionDetail
      TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin}
      inspectionId={selected}
      properties={properties} areas={areas}
      onClose={() => { setSelected(null); loadAll(); }}
    />;
  }

  const propMap = Object.fromEntries(properties.map(p => [p.id, p]));
  const areaMap = Object.fromEntries(areas.map(a => [a.id, a]));

  const filt = inspections.filter(ins => {
    if (statusFilter !== "all" && ins.status !== statusFilter) return false;
    if (propertyFilter !== "all" && String(ins.property_id) !== propertyFilter) return false;
    if (priorityFilter !== "all" && ins.priority !== priorityFilter) return false;
    if (categoryFilter !== "all" && ins.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(ins.title || '').toLowerCase().includes(q)
        && !(ins.report || '').toLowerCase().includes(q)
        && !(ins.inspection_no || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const statusCounts = {
    all: inspections.length,
    ok: inspections.filter(i => i.status === 'ok').length,
    minor_issue: inspections.filter(i => i.status === 'minor_issue').length,
    major_issue: inspections.filter(i => i.status === 'major_issue').length,
    critical: inspections.filter(i => i.status === 'critical').length,
    needs_repair: inspections.filter(i => i.status === 'needs_repair').length,
    fixed: inspections.filter(i => i.status === 'fixed').length,
  };

  return (
    <div>
      {/* Filters */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)", gap:8, marginBottom:8}}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L.searchInsp} style={inputStyle(TH)} />
        <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)} style={inputStyle(TH)}>
          <option value="all">{L.allProperties}</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3, 1fr)", gap:8, marginBottom:16}}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle(TH)}>
          <option value="all">{L.allStatuses} ({statusCounts.all})</option>
          {Object.entries(INSPECTION_STATUS).map(([k, v]) => <option key={k} value={k}>{STATUS_LBL[k] || v.label} ({statusCounts[k] || 0})</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={inputStyle(TH)}>
          <option value="all">{L.priority ? L.priority : "Priority"} — All</option>
          {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={inputStyle(TH)}>
          <option value="all">{L.category ? L.category : "Category"} — All</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
      </div>

      {error && <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{error}</div>}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>{L.loading}</div>
      ) : filt.length === 0 ? (
        <div style={{padding:"56px 24px", background:TH.bgCard, border:`1px dashed ${TH.border}`, borderRadius:16, color:TH.textMuted, textAlign:"center"}}>
          <div style={{fontSize:44, marginBottom:12, opacity:0.6}}>{onlyOpenIssues ? "✓" : "🔍"}</div>
          <div style={{fontSize:15, fontWeight:700, color:TH.text, marginBottom:4}}>{onlyOpenIssues ? L.allClear : L.noInspEmpty}</div>
          <div style={{fontSize:12.5}}>{onlyOpenIssues ? L.allResolved : L.startWalkDesc}</div>
        </div>
      ) : (
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(320px, 1fr))", gap:14}}>
          {filt.map(ins => {
            const meta = INSPECTION_STATUS[ins.status] || { label: ins.status, color: '#8f8f8f' };
            const wh = propMap[ins.property_id];
            const area = ins.area_id ? areaMap[ins.area_id] : null;
            const cover = ins.photos?.[0];
            return (
              <div key={ins.id} onClick={() => setSelected(ins.id)} style={{
                background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, cursor:"pointer",
                borderLeft:`3px solid ${meta.color}`, overflow:"hidden", transition:"all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = TH.bgCard}>
                {cover ? (
                  <div style={{width:"100%", height:180, background:"#000", overflow:"hidden"}}>
                    <img src={cover} alt="" style={{width:"100%", height:"100%", objectFit:"cover", display:"block"}} loading="lazy" />
                  </div>
                ) : (
                  <div style={{width:"100%", height:60, background:TH.bgInput, display:"flex", alignItems:"center", justifyContent:"center", color:TH.textDim, fontSize:24}}>📋</div>
                )}
                <div style={{padding:14}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:6}}>
                    <div style={{fontSize:11, color:meta.color, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px"}}>{STATUS_LBL[ins.status] || meta.label}</div>
                    <div style={{fontSize:10, color:TH.textDim, fontFamily:"monospace"}}>{ins.inspection_no}</div>
                  </div>
                  <div style={{fontSize:15, fontWeight:700, color:TH.text, marginBottom:6, lineHeight:1.3}}>{ins.title}</div>
                  {ins.report && <div style={{fontSize:12, color:TH.textMuted, marginBottom:10, lineHeight:1.4, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden"}}>{ins.report}</div>}
                  <div style={{display:"flex", flexWrap:"wrap", gap:6, marginBottom:8}}>
                    {ins.priority && PRIORITY[ins.priority] && <span style={{fontSize:10, color:PRIORITY[ins.priority].color, background:PRIORITY[ins.priority].color+"22", padding:"3px 8px", borderRadius:5, fontWeight:700}}>{PRIORITY[ins.priority].label}</span>}
                    {ins.category && CATEGORIES[ins.category] && <span style={{fontSize:10, color:CATEGORIES[ins.category].color, background:CATEGORIES[ins.category].color+"22", padding:"3px 8px", borderRadius:5, fontWeight:600}}>{CATEGORIES[ins.category].icon} {CATEGORIES[ins.category].label}</span>}
                    {wh && <span style={{fontSize:10, color:TH.textMuted, background:TH.bgInput, padding:"3px 8px", borderRadius:5}}>📍 {wh.code}</span>}
                    {area && <span style={{fontSize:10, color:TH.textMuted, background:TH.bgInput, padding:"3px 8px", borderRadius:5}}>{area.name}</span>}
                    {ins.photos?.length > 1 && <span style={{fontSize:10, color:TH.textMuted, background:TH.bgInput, padding:"3px 8px", borderRadius:5}}>📷 {ins.photos.length}</span>}
                    {ins.visit_id && <span style={{fontSize:10, color:"#C9A960", background:"rgba(201,169,96,0.10)", padding:"3px 8px", borderRadius:5, fontWeight:600}}>◇ Visit</span>}
                  </div>
                  <div style={{fontSize:10, color:TH.textDim, paddingTop:8, borderTop:`1px solid ${TH.border}`}}>
                    {ins.inspector_display_name || ins.inspector_email || 'Unknown'}{ins.companion_name ? ` + ${ins.companion_name}` : ''} · {formatDate(ins.created_at)}
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

function inputStyle(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
