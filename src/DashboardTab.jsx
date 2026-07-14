// ═══════════════════════════════════════════════════════════════════
// DashboardTab.jsx — clean dashboard for Caesar (gold/white/black)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function DashboardTab({ TH, isMobile, isAdmin, onNav }) {
  const [stats, setStats] = useState(null);
  const [recentInspections, setRecentInspections] = useState([]);
  const [recentAssets, setRecentAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rAssets, rWh, rIns, rReqs, rInsRecent, rAstRecent] = await Promise.all([
        supabase.from('assets').select('id, kind', { count: 'exact' }).eq('is_active', true),
        supabase.from('warehouses').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('inspections').select('id, status, severity').in('status', ['minor_issue','major_issue','critical','needs_repair']),
        supabase.schema('procure').from('requisitions').select('id', { count: 'exact' }).in('status', ['submitted','dept_approved','in_procurement','pending_approval']),
        supabase.from('inspections').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('assets').select('id, asset_no, name, kind, created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
      ]);

      const assetsByKind = { equipment: 0, tool: 0, vehicle: 0 };
      (rAssets.data || []).forEach(a => { if (assetsByKind[a.kind] !== undefined) assetsByKind[a.kind]++; });

      const openIssues = (rIns.data || []).length;
      const criticalCount = (rIns.data || []).filter(i => i.status === 'critical' || i.severity >= 3).length;

      setStats({
        totalAssets: rAssets.data?.length || 0,
        assetsByKind,
        warehouses: rWh.data?.length || 0,
        openIssues,
        criticalCount,
        pendingRequisitions: rReqs.data?.length || 0,
      });
      setRecentInspections(rInsRecent.data || []);
      setRecentAssets(rAstRecent.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{padding:40, textAlign:"center", color:TH.textMuted}}>Loading dashboard...</div>;

  const s = stats || { totalAssets: 0, assetsByKind: {equipment:0,tool:0,vehicle:0}, warehouses: 0, openIssues: 0, criticalCount: 0, pendingRequisitions: 0 };

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:isMobile?20:26, fontWeight:800, color:TH.text, letterSpacing:"-0.3px"}}>Dashboard</div>
        <div style={{fontSize:13, color:TH.textMuted, marginTop:2}}>
          Live overview of assets, inspections, and procurement across Caesar Projects
        </div>
      </div>

      {error && <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{error}</div>}

      {/* KPI grid */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, 1fr)", gap:14, marginBottom:24}}>
        <KPI TH={TH} onClick={() => onNav?.("warehouse")}
          label="Total Assets"
          value={s.totalAssets}
          sub={`${s.assetsByKind.equipment} equip · ${s.assetsByKind.tool} tools · ${s.assetsByKind.vehicle} vehicles`}
          gradient
        />
        <KPI TH={TH} onClick={() => onNav?.("warehouse")}
          label="Warehouses"
          value={s.warehouses}
          sub="Across all properties"
        />
        <KPI TH={TH} onClick={() => onNav?.("inspection")}
          label="Open Issues"
          value={s.openIssues}
          sub={s.criticalCount > 0 ? `${s.criticalCount} critical` : "Under review"}
          highlight={s.criticalCount > 0}
        />
        <KPI TH={TH} onClick={() => onNav?.("procure")}
          label="Pending Requisitions"
          value={s.pendingRequisitions}
          sub={s.pendingRequisitions > 0 ? "Awaiting approval" : "Queue clear"}
        />
      </div>

      {/* Two-column feed */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:14}}>
        <FeedCard TH={TH} title="Recent Inspections" onNavAll={() => onNav?.("inspection")}>
          {recentInspections.length === 0 ? (
            <div style={{padding:20, color:TH.textDim, fontSize:13, textAlign:"center"}}>No inspections yet</div>
          ) : recentInspections.map(i => (
            <div key={i.id} style={{padding:"10px 0", borderBottom:`1px solid ${TH.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", gap:12}}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13, color:TH.text, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{i.title}</div>
                <div style={{fontSize:11, color:TH.textDim, marginTop:2}}>{new Date(i.created_at).toLocaleString('en-GB', { month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' })}</div>
              </div>
              <StatusPill TH={TH} status={i.status} />
            </div>
          ))}
        </FeedCard>

        <FeedCard TH={TH} title="Recently Registered Assets" onNavAll={() => onNav?.("warehouse")}>
          {recentAssets.length === 0 ? (
            <div style={{padding:20, color:TH.textDim, fontSize:13, textAlign:"center"}}>No assets yet</div>
          ) : recentAssets.map(a => (
            <div key={a.id} style={{padding:"10px 0", borderBottom:`1px solid ${TH.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", gap:12}}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13, color:TH.text, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{a.name}</div>
                <div style={{fontSize:11, color:TH.textDim, marginTop:2, fontFamily:"monospace"}}>{a.asset_no}</div>
              </div>
              <div style={{fontSize:18}}>{a.kind === 'vehicle' ? '🚗' : a.kind === 'tool' ? '🔧' : '🏭'}</div>
            </div>
          ))}
        </FeedCard>
      </div>
    </div>
  );
}

function KPI({ TH, label, value, sub, gradient, highlight, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: gradient ? "linear-gradient(135deg, rgba(201,169,96,0.15), rgba(139,122,68,0.08))"
                            : highlight ? "linear-gradient(135deg, rgba(143,143,143,0.10), rgba(92,92,92,0.05))"
                                        : TH.bgCard,
      border:`1px solid ${highlight ? "rgba(143,143,143,0.3)" : gradient ? "rgba(201,169,96,0.3)" : TH.border}`,
      borderRadius:12, padding:16, cursor: onClick ? "pointer" : "default", transition:"transform 0.15s",
    }}
    onMouseEnter={e => onClick && (e.currentTarget.style.transform = "translateY(-2px)")}
    onMouseLeave={e => onClick && (e.currentTarget.style.transform = "translateY(0)")}>
      <div style={{fontSize:10, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8}}>{label}</div>
      <div style={{fontSize:32, fontWeight:800, color:TH.text, lineHeight:1, marginBottom:6}}>{value}</div>
      <div style={{fontSize:11, color:TH.textMuted}}>{sub}</div>
    </div>
  );
}

function FeedCard({ TH, title, children, onNavAll }) {
  return (
    <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
        <div style={{fontSize:14, fontWeight:700, color:TH.text}}>{title}</div>
        {onNavAll && <button onClick={onNavAll} style={{background:"transparent", border:"none", color:TH.accent, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit"}}>View all →</button>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function StatusPill({ TH, status }) {
  const map = {
    ok:            { label: 'OK',       color: '#C9A960' },
    minor_issue:   { label: 'Minor',    color: '#D4B876' },
    major_issue:   { label: 'Major',    color: '#8B7A44' },
    critical:      { label: 'Critical', color: '#8f8f8f' },
    needs_repair:  { label: 'Repair',   color: '#8B7A44' },
    fixed:         { label: 'Fixed',    color: '#C9A960' },
  };
  const m = map[status] || { label: status, color: TH.textMuted };
  return <span style={{padding:"3px 8px", borderRadius:5, background:m.color+"22", color:m.color, fontSize:10, fontWeight:700, whiteSpace:"nowrap"}}>{m.label}</span>;
}
