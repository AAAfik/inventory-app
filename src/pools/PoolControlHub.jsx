// ═══════════════════════════════════════════════════════════════════
// PoolControlHub.jsx — Pool Management
// Tabs: Pools · Log Treatment · Operations · History · Chemicals · Operators
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { fmtMoney } from "./lib/poolUtils";
import PoolsListTab from "./tabs/PoolsListTab";
import LogTreatmentTab from "./tabs/LogTreatmentTab";
import TreatmentHistoryTab from "./tabs/TreatmentHistoryTab";
import ChemicalStockTab from "./tabs/ChemicalStockTab";
import OperationsTab from "./tabs/OperationsTab";
import OperatorsTab from "./tabs/OperatorsTab";
import PoolDetailModal from "./components/PoolDetailModal";
import NewOperationModal from "./components/NewOperationModal";

export default function PoolControlHub({ TH, lang = "en", isMobile = false, isAdmin = false }) {
  const [tab, setTab] = useState(isMobile ? "operations" : "pools");
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState(null);
  const [detailPoolId, setDetailPoolId] = useState(null);
  const [showNewOp, setShowNewOp] = useState(false);

  useEffect(() => { loadStats(); }, [refreshKey]);

  async function loadStats() {
    try {
      const monthStart = new Date();
      monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const [rP, rT, rOp] = await Promise.all([
        supabase.from('pools').select('id, volume_m3').eq('is_active', true),
        supabase.from('pool_treatments').select('id, total_cost').gte('performed_at', monthStart.toISOString()),
        supabase.from('pool_operations').select('id, operation_type').gte('performed_at', monthStart.toISOString()).eq('is_active', true),
      ]);
      const pools = rP.data || [];
      const treatments = rT.data || [];
      const ops = rOp.data || [];

      // Filter changes due soon (next 30 days)
      const { data: filterDue } = await supabase.from('pools')
        .select('id, filter_next_change')
        .eq('is_active', true)
        .not('filter_next_change', 'is', null);
      const in30 = new Date(); in30.setDate(in30.getDate() + 30);
      const filterDueCount = (filterDue || []).filter(p => new Date(p.filter_next_change) <= in30).length;

      setStats({
        totalPools: pools.length,
        totalVolume: pools.reduce((s, p) => s + (Number(p.volume_m3) || 0), 0),
        mthTreatments: treatments.length,
        mthCost: treatments.reduce((s, t) => s + (Number(t.total_cost) || 0), 0),
        mthOperations: ops.length,
        filterDueCount,
      });
    } catch { /* stats optional */ }
  }
  const bump = () => setRefreshKey(k => k + 1);

  const tabs = [
    { key: "pools",  label: "Pools" },
    { key: "operations", label: "Operations" },
    { key: "log",  label: "Log Treatment" },
    { key: "history",  label: "History" },
    { key: "stock",  label: "Chemicals" },
    { key: "operators",  label: "Operators" },
  ];

  return ( <div>{/* Pool detail modal (opens for any pool) */}
      {detailPoolId && ( <PoolDetailModal
          TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin}
          poolId={detailPoolId}
          onClose={() => { setDetailPoolId(null); bump(); }}
        />)}

      {/* New operation modal (global new op button) */}
      {showNewOp && ( <NewOperationModal
          TH={TH} lang={lang} isMobile={isMobile}
          onClose={() => setShowNewOp(false)}
          onDone={() => { setShowNewOp(false); bump(); }}
        />)} <div style={{marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap"}}><div><div style={{fontSize: isMobile ? 20 : 26, fontWeight: 700, color: TH.text, letterSpacing: "-0.3px", fontFamily: "'Playfair Display', Georgia, serif"}}>Pool Management </div>{!isMobile && ( <div style={{fontSize:13, color:TH.textMuted, marginTop:2}}>Pool profiles · operations log · equipment tracking · auto warehouse deduction </div>)} </div><button
          onClick={() => setShowNewOp(true)}
          style={{
            background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:10,
            color:"#000", padding:"12px 20px", fontSize:14, fontWeight:800, cursor:"pointer",
            fontFamily:"inherit", boxShadow:"0 2px 10px rgba(184,147,90,0.3)",
          }}
        > New Operation</button></div>{stats && ( <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(6,1fr)", gap:10, marginBottom:16}}><Stat TH={TH} label="Pools" value={stats.totalPools} sub="active" /><Stat TH={TH} label="Total volume" value={`${stats.totalVolume.toLocaleString()} m³`} sub="all pools" /><Stat TH={TH} label="Operations (mo)" value={stats.mthOperations} onClick={() => setTab("operations")} sub="this month" /><Stat TH={TH} label="Treatments (mo)" value={stats.mthTreatments} onClick={() => setTab("history")} sub="this month" /><Stat TH={TH} label="Chemical cost (mo)" value={fmtMoney(stats.mthCost)} onClick={() => setTab("history")} sub="this month" /><Stat TH={TH} label="Filter due ≤30d" value={stats.filterDueCount} alert={stats.filterDueCount > 0} onClick={() => setTab("pools")} sub="scheduled" /></div>)} <div style={{display:"flex", gap:6, marginBottom:20, borderBottom:`1px solid ${TH.border}`, paddingBottom:8, overflowX:"auto"}}>{tabs.map(t => {
          const active = t.key === tab;
          return ( <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: active ? TH.accentBg : "transparent",
              border: `1px solid ${active ? TH.accentBorder : "transparent"}`,
              borderRadius: 9, color: active ? TH.accentText : TH.textMuted,
              padding: "9px 14px", cursor: "pointer",
              fontSize: 13, fontWeight: active ? 700 : 500,
              fontFamily: "inherit", whiteSpace: "nowrap",
              display:"flex", alignItems:"center", gap:6,
            }}>{t.label} </button>);
        })} </div>{tab === "pools" && <PoolsListTab key={refreshKey} TH={TH} isMobile={isMobile} isAdmin={isAdmin} onChanged={bump} onOpenPool={(id) => setDetailPoolId(id)} />}
      {tab === "operations" && <OperationsTab key={"op-"+refreshKey} TH={TH} isMobile={isMobile} isAdmin={isAdmin} onOpenPool={(id) => setDetailPoolId(id)} />}
      {tab === "log" && <LogTreatmentTab TH={TH} isMobile={isMobile} onSaved={() => { bump(); setTab("history"); }} />}
      {tab === "history" && <TreatmentHistoryTab key={"h-"+refreshKey} TH={TH} isMobile={isMobile} isAdmin={isAdmin} />}
      {tab === "stock" && <ChemicalStockTab TH={TH} isMobile={isMobile} isAdmin={isAdmin} />}
      {tab === "operators" && <OperatorsTab key={"opr-"+refreshKey} TH={TH} isMobile={isMobile} isAdmin={isAdmin} onOpenPool={(id) => setDetailPoolId(id)} />} </div>);
}

function Stat({ TH, label, value, sub, onClick, alert }) {
  return ( <div onClick={onClick} style={{
      background: alert ? "rgba(196,61,61,0.10)" : TH.bgCard,
      border: `1px solid ${alert ? "rgba(196,61,61,0.4)" : TH.border}`,
      borderRadius: 12, padding: "12px 14px",
      cursor: onClick ? "pointer" : "default",
      boxShadow: TH.cardGlow,
    }}><div style={{fontSize:9, fontWeight:800, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:5}}>{label}</div><div style={{fontSize:20, fontWeight:800, color: alert ? "#C43D3D" : TH.text, lineHeight:1, fontFamily:"monospace"}}>{value}</div>{sub && <div style={{fontSize:10, color:TH.textDim, marginTop:4}}>{sub}</div>} </div>);
}
