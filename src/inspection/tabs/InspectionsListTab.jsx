// ═══════════════════════════════════════════════════════════════════════
// InspectionsListTab.jsx v3 — Grouped by LOCATION (visit)
// Each card = one visit/location · contains problem sub-cards inside
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { INSPECTION_STATUS, CATEGORIES, PRIORITY, formatDate, severityColor, openLocationPDF } from "../lib/inspectionUtils";
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
      let q = supabase.from('inspections').select('*').order('created_at', { ascending: false }).limit(1000);
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
      const hay = [ins.title, ins.report, ins.inspection_no, ins.inspector_display_name, ins.companion_name].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const groups = groupByVisit(filt);

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
          <option value="all">{L.priority} — All</option>
          {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={inputStyle(TH)}>
          <option value="all">{L.category} — All</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
      </div>

      {error && <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{error}</div>}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>{L.loading}</div>
      ) : groups.length === 0 ? (
        <div style={{padding:"56px 24px", background:TH.bgCard, border:`1px dashed ${TH.border}`, borderRadius:16, color:TH.textMuted, textAlign:"center"}}>
          <div style={{fontSize:44, marginBottom:12, opacity:0.6}}>{onlyOpenIssues ? "✓" : "🔍"}</div>
          <div style={{fontSize:15, fontWeight:700, color:TH.text, marginBottom:4}}>{onlyOpenIssues ? L.allClear : L.noInspEmpty}</div>
          <div style={{fontSize:12.5}}>{onlyOpenIssues ? L.allResolved : L.startWalkDesc}</div>
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:16}}>
          {groups.map(group => (
            <LocationCard
              key={group.key}
              TH={TH} L={L} STATUS_LBL={STATUS_LBL} isMobile={isMobile} lang={lang}
              group={group}
              propMap={propMap} areaMap={areaMap}
              onOpen={id => setSelected(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
function LocationCard({ TH, L, STATUS_LBL, isMobile, lang, group, propMap, areaMap, onOpen }) {
  const wh = propMap[group.property_id];
  const area = group.area_id ? areaMap[group.area_id] : null;
  const dateStr = new Date(group.visit_at || group.created_at).toLocaleString('en-GB', {
    year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit',
  });

  const priorityRank = { critical: 4, high: 3, medium: 2, low: 1 };
  let topPriority = null;
  group.items.forEach(i => {
    if (!topPriority || (priorityRank[i.priority] || 0) > (priorityRank[topPriority] || 0)) {
      topPriority = i.priority;
    }
  });
  const accentColor = PRIORITY[topPriority]?.color || TH.accent;

  function handlePrintAll(e, langCode) {
    e.stopPropagation();
    openLocationPDF(group.items, { property: wh, area }, langCode);
  }

  return (
    <div style={{
      background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14,
      overflow:"hidden", boxShadow: TH.cardGlow || "0 4px 20px rgba(0,0,0,0.06)",
      borderLeft:`4px solid ${accentColor}`,
    }}>
      <div style={{padding: isMobile ? 14 : 18, borderBottom:`1px solid ${TH.border}`, background: `linear-gradient(180deg, ${accentColor}0F 0%, transparent 100%)`}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap"}}>
          <div style={{flex:1, minWidth:0}}>
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: isMobile ? 18 : 22, fontWeight: 700, color: TH.text,
              lineHeight: 1.2, marginBottom: 6, letterSpacing: "-0.2px",
            }}>
              📍 {wh?.name || `Property #${group.property_id}`}
              {area && <span style={{color: TH.textMuted, fontWeight: 500}}> · {area.name}</span>}
            </div>

            {group.location_note && (
              <div style={{fontSize:13, color:TH.textMuted, marginBottom:8, fontStyle:"italic"}}>
                {group.location_note}
              </div>
            )}

            <div style={{
              fontSize: isMobile ? 14 : 16, fontWeight: 700, color: TH.text,
              display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            }}>
              <span style={{fontSize:20}}>🧑</span>
              <span>{group.inspector_display_name || group.inspector_email || 'Unknown'}</span>
              {group.companion_name && (
                <>
                  <span style={{color:TH.textDim, fontWeight:400}}>+</span>
                  <span>{group.companion_name}</span>
                </>
              )}
            </div>
          </div>

          <div style={{textAlign: isMobile ? "left" : "right", flexShrink:0}}>
            <div style={{fontSize:12, color:TH.textMuted, marginBottom:6}}>{dateStr}</div>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:6,
              background: accentColor + "22", color: accentColor,
              padding: "5px 12px", borderRadius: 20,
              fontSize: 12, fontWeight: 800,
              marginBottom: 8,
            }}>
              {group.items.length} problem{group.items.length > 1 ? 's' : ''}
            </div>
            <div style={{display:"flex", gap:6, flexWrap:"wrap", justifyContent: isMobile ? "flex-start" : "flex-end"}}>
              <button
                onClick={e => handlePrintAll(e, "en")}
                title={`Print all ${group.items.length} findings for this location`}
                style={{
                  background: "linear-gradient(135deg,#C9A960,#8B7A44)",
                  color: "#000", border: "none",
                  padding: "6px 12px", borderRadius: 6,
                  fontSize: 11, fontWeight: 800, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >📄 Full report · EN</button>
              <button
                onClick={e => handlePrintAll(e, "he")}
                style={{
                  background: "transparent", color: TH.accent,
                  border: `1px solid ${TH.accent}66`,
                  padding: "6px 12px", borderRadius: 6,
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >📄 HE</button>
              <button
                onClick={e => handlePrintAll(e, "fa")}
                style={{
                  background: "transparent", color: TH.accent,
                  border: `1px solid ${TH.accent}66`,
                  padding: "6px 12px", borderRadius: 6,
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >📄 FA</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        padding: isMobile ? 12 : 14,
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 10,
      }}>
        {group.items.map((ins, idx) => {
          const meta = INSPECTION_STATUS[ins.status] || { label: ins.status, color: '#8f8f8f' };
          const priMeta = PRIORITY[ins.priority] || {};
          const catMeta = CATEGORIES[ins.category];
          const cover = ins.photos?.[0];
          return (
            <div
              key={ins.id}
              onClick={() => onOpen(ins.id)}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              style={{
                background: TH.bgInput, border: `1px solid ${TH.border}`,
                borderRadius: 10, cursor: "pointer", overflow: "hidden",
                transition: "transform .15s ease, box-shadow .15s ease",
                display: "flex", flexDirection: "column",
              }}
            >
              {cover ? (
                <div style={{width:"100%", height:120, background:"#000", overflow:"hidden"}}>
                  <img src={cover} alt="" style={{width:"100%", height:"100%", objectFit:"cover", display:"block"}} loading="lazy" />
                </div>
              ) : (
                <div style={{width:"100%", height:60, background:TH.bgCard, display:"flex", alignItems:"center", justifyContent:"center", color:TH.textDim, fontSize:24}}>
                  {catMeta?.icon || '📋'}
                </div>
              )}
              <div style={{padding:10, flex:1, display:"flex", flexDirection:"column"}}>
                <div style={{display:"flex", justifyContent:"space-between", gap:6, marginBottom:5}}>
                  <span style={{fontSize:9, color:meta.color, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.4px"}}>
                    #{idx + 1} · {STATUS_LBL[ins.status] || meta.label}
                  </span>
                  <span style={{fontSize:9, color:TH.textDim, fontFamily:"monospace", flexShrink:0}}>{ins.inspection_no?.slice(-5)}</span>
                </div>
                <div style={{fontSize:13, fontWeight:700, color:TH.text, marginBottom:6, lineHeight:1.3, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical"}}>
                  {ins.title}
                </div>
                <div style={{display:"flex", flexWrap:"wrap", gap:4, marginTop:"auto"}}>
                  {priMeta.label && <span style={chip(priMeta.color)}>{priMeta.label}</span>}
                  {catMeta && <span style={chip(catMeta.color)}>{catMeta.icon}</span>}
                  {ins.photos?.length > 1 && <span style={{fontSize:9, color:TH.textDim}}>📷{ins.photos.length}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function groupByVisit(list) {
  const map = new Map();
  for (const ins of list) {
    const day = (ins.visit_at || ins.visit_date || ins.created_at || '').slice(0, 10);
    const key = ins.visit_id
      ? `v:${ins.visit_id}`
      : `l:${ins.property_id}|${ins.area_id || 0}|${day}|${ins.inspector_id || ''}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        visit_id: ins.visit_id || null,
        visit_at: ins.visit_at || ins.visit_date || ins.created_at,
        created_at: ins.created_at,
        property_id: ins.property_id,
        area_id: ins.area_id,
        location_note: ins.location_note,
        inspector_id: ins.inspector_id,
        inspector_email: ins.inspector_email,
        inspector_display_name: ins.inspector_display_name,
        companion_name: ins.companion_name,
        items: [],
      });
    }
    map.get(key).items.push(ins);
  }
  const groups = [...map.values()];
  groups.forEach(g => g.items.sort((a,b) => (a.inspection_no || '').localeCompare(b.inspection_no || '')));
  groups.sort((a, b) => new Date(b.visit_at) - new Date(a.visit_at));
  return groups;
}

function chip(color) {
  return { fontSize:9, color: color, background: color + "22", padding:"2px 6px", borderRadius:4, fontWeight:600 };
}
function inputStyle(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
