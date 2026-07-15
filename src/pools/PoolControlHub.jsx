// ═══════════════════════════════════════════════════════════════════
// PoolControlHub.jsx — container: KPI bar + 4 tabs
// Matches system's existing design (Playfair headings, gold gradient,
// glass card style, mobile-first)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { fmtMoney } from "./lib/poolUtils";
import PoolsListTab from "./tabs/PoolsListTab";
import LogTreatmentTab from "./tabs/LogTreatmentTab";
import TreatmentHistoryTab from "./tabs/TreatmentHistoryTab";
import ChemicalStockTab from "./tabs/ChemicalStockTab";

export default function PoolControlHub({ TH, lang = "en", isMobile = false, isAdmin = false }) {
  const [tab, setTab] = useState(isMobile ? "log" : "pools");
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState(null);

  useEffect(() => { loadStats(); }, [refreshKey]);

  async function loadStats() {
    try {
      const { data: pools } = await supabase.from('pools').select('id, volume_m3').eq('is_active', true);
      const totalPools = pools?.length || 0;
      const totalVolume = pools?.reduce((s, p) => s + (Number(p.volume_m3) || 0), 0) || 0;

      const monthStart = new Date();
      monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const { data: treatments } = await supabase.from('pool_treatments')
        .select('id, total_cost')
        .gte('performed_at', monthStart.toISOString());
      const mthTreatments = treatments?.length || 0;
      const mthCost = treatments?.reduce((s, t) => s + (Number(t.total_cost) || 0), 0) || 0;

      setStats({ totalPools, totalVolume, mthTreatments, mthCost });
    } catch { /* stats optional */ }
  }

  const bump = () => setRefreshKey(k => k + 1);

  const tabs = [
    { key: "pools",   icon: "🏊", label: "Pools" },
    { key: "log",     icon: "💧", label: "Log Treatment" },
    { key: "history", icon: "📋", label: "History" },
    { key: "stock",   icon: "🧪", label: "Chemicals" },
  ];

  return (
    <div>
      <div style={{marginBottom:14}}>
        <div style={{
          fontSize: isMobile ? 20 : 26,
          fontWeight: 700, color: TH.text, letterSpacing: "-0.3px",
          fontFamily: "'Playfair Display', Georgia, serif",
        }}>Pool Control</div>
        {!isMobile && <div style={{fontSize:13, color:TH.textMuted, marginTop:2}}>
          Pool profiles · dosage calculator · treatment logs · auto warehouse deduction
        </div>}
      </div>

      {stats && (
        <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)", gap:10, marginBottom:16}}>
          <Stat TH={TH} label="Pools" value={stats.totalPools} sub="active" />
          <Stat TH={TH} label="Total volume" value={`${stats.totalVolume.toLocaleString()} m³`} sub="all pools" />
          <Stat TH={TH} label="Treatments (mo)" value={stats.mthTreatments} onClick={() => setTab("history")} sub="this month" />
          <Stat TH={TH} label="Chemical cost (mo)" value={fmtMoney(stats.mthCost)} onClick={() => setTab("history")} sub="this month" />
        </div>
      )}

      <div style={{display:"flex", gap:6, marginBottom:20, borderBottom:`1px solid ${TH.border}`, paddingBottom:8, overflowX:"auto"}}>
        {tabs.map(t => {
          const active = t.key === tab;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: active ? TH.accentBg : "transparent",
              border: `1px solid ${active ? TH.accentBorder : "transparent"}`,
              borderRadius: 9,
              color: active ? TH.accentText : TH.textMuted,
              padding: "9px 14px", cursor: "pointer",
              fontSize: 13, fontWeight: active ? 700 : 500,
              fontFamily: "inherit", whiteSpace: "nowrap",
            }}>
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {tab === "pools"   && <PoolsListTab       key={refreshKey}     TH={TH} isMobile={isMobile} isAdmin={isAdmin} onChanged={bump} />}
      {tab === "log"     && <LogTreatmentTab                          TH={TH} isMobile={isMobile}                  onSaved={() => { bump(); setTab("history"); }} />}
      {tab === "history" && <TreatmentHistoryTab key={"h-"+refreshKey} TH={TH} isMobile={isMobile} isAdmin={isAdmin} />}
      {tab === "stock"   && <ChemicalStockTab                          TH={TH} isMobile={isMobile} isAdmin={isAdmin} />}
    </div>
  );
}

function Stat({ TH, label, value, sub, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: TH.bgCard, border: `1px solid ${TH.border}`, borderRadius: 12,
      padding: "12px 14px", cursor: onClick ? "pointer" : "default",
      boxShadow: TH.cardGlow,
    }}>
      <div style={{fontSize:9, fontWeight:800, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:5}}>{label}</div>
      <div style={{fontSize:20, fontWeight:800, color:TH.text, lineHeight:1, fontFamily:"monospace"}}>{value}</div>
      {sub && <div style={{fontSize:10, color:TH.textDim, marginTop:4}}>{sub}</div>}
    </div>
  );
}
