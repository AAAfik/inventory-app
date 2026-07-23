// ═══════════════════════════════════════════════════════════════════
// WarehouseHub.jsx — Asset Management
// Tabs: Scan · QuickAdd · Assets · CheckInOut · Consumables ·
//       Packages · Loans · Warehouses · Activity
// + Dispense button in header
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { fmtMoney, isOverdue, daysUntil } from "./lib/warehouseUtils";
import { tr } from "../i18n";
import QuickAddTab from "./tabs/QuickAddTab";
import AssetsTab from "./tabs/AssetsTab";
import CheckInOutTab from "./tabs/CheckInOutTab";
import ConsumablesTab from "./tabs/ConsumablesTab";
import WarehousesTab from "./tabs/WarehousesTab";
import ScanTab from "./tabs/ScanTab";
import ActivityTab from "./tabs/ActivityTab";
import PackagesTab from "./tabs/PackagesTab";
import LoansTab from "./tabs/LoansTab";
import DispenseModal from "./components/DispenseModal";

export default function WarehouseHub({ TH, lang = "en", isMobile = false, isAdmin = false }) {
  const L = tr(lang);
  const [tab, setTab] = useState(isMobile ? "scan" : "assets");
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState(null);
  const [showDispense, setShowDispense] = useState(false);

  useEffect(() => { loadStats(); }, [refreshKey]);

  async function loadStats() {
    try {
      const [rA, rP, rO] = await Promise.all([
        supabase.from('assets').select('id, status, purchase_price, next_service_date, expected_return_at').eq('is_active', true),
        supabase.from('packages').select('id, status').eq('is_active', true).eq('status', 'received'),
        supabase.from('overdue_asset_loans').select('asset_id'),
      ]);
      const assets = rA.data;
      if (!assets) return;

      const totalValue = assets.reduce((s, a) => s + (Number(a.purchase_price) || 0), 0);
      const checkedOut = assets.filter(a => a.status === 'checked_out');
      const overdueReturns = (rO.data || []).length;
      const serviceDue = assets.filter(a => {
        const d = daysUntil(a.next_service_date);
        return d !== null && d <= 7;
      }).length;

      setStats({
        total: assets.length,
        totalValue,
        checkedOut: checkedOut.length,
        overdueReturns,
        serviceDue,
        pendingPackages: (rP.data || []).length,
      });
    } catch { /* stats are non-critical */ }
  }

  const bump = () => setRefreshKey(k => k + 1);

  const tabs = [
    { key: "scan",        icon: "📷", label: L.scanTab       || "Scan" },
    { key: "quickadd",    icon: "📸", label: L.quickAdd },
    { key: "assets",      icon: "📦", label: L.assets },
    { key: "checkinout",  icon: "⇄",  label: L.checkInOut, badge: stats?.overdueReturns || 0 },
    { key: "consumables", icon: "🧴", label: L.consumables },
    { key: "loans",       icon: "📤", label: L.loansTab || "Loans", badge: stats?.overdueReturns || 0, alert: (stats?.overdueReturns || 0) > 0 },
    { key: "packages",    icon: "📮", label: L.packagesTab || "Packages", badge: stats?.pendingPackages || 0 },
    { key: "warehouses",  icon: "🏬", label: L.warehouses },
    { key: "activity",    icon: "📜", label: L.activityTab || "Activity" },
  ];

  const title = L.assetMgmtTitle || "Asset Management";
  const subtitle = L.assetMgmtSub || "Vehicles, machinery, tools, consumables, loans and packages — all in one system";

  return (
    <div>
      {showDispense && (
        <DispenseModal
          TH={TH} lang={lang}
          onClose={() => setShowDispense(false)}
          onDone={() => { setShowDispense(false); bump(); }}
        />
      )}

      <div style={{marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:isMobile?18:24, fontWeight:700, color:TH.text, letterSpacing:"-0.3px", fontFamily:"'Playfair Display', Georgia, serif"}}>{title}</div>
          {!isMobile && subtitle && <div style={{fontSize:13, color:TH.textMuted, marginTop:2}}>{subtitle}</div>}
        </div>
        <button
          onClick={() => setShowDispense(true)}
          style={{
            background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:10,
            color:"#000", padding:"10px 18px", fontSize:13, fontWeight:800, cursor:"pointer",
            fontFamily:"inherit", boxShadow:"0 2px 10px rgba(201,169,96,0.3)",
          }}
        >📤 {L.dispenseBtn || "Dispense"}</button>
      </div>

      {stats && (
        <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(6,1fr)", gap:8, marginBottom:16}}>
          <Stat TH={TH} label={L.assets} value={stats.total} />
          <Stat TH={TH} label={L.totalValue} value={fmtMoney(stats.totalValue)} />
          <Stat TH={TH} label={L.checkedOutK} value={stats.checkedOut} onClick={() => setTab("loans")} />
          <Stat TH={TH} label={L.overdueReturns} value={stats.overdueReturns} alert={stats.overdueReturns > 0} onClick={() => setTab("loans")} />
          <Stat TH={TH} label={L.serviceDue7} value={stats.serviceDue} alert={stats.serviceDue > 0} onClick={() => setTab("assets")} />
          <Stat TH={TH} label={L.pendingPackages || "Pending pkgs"} value={stats.pendingPackages} alert={stats.pendingPackages > 0} onClick={() => setTab("packages")} />
        </div>
      )}

      <div style={{display:"flex", gap:6, marginBottom:20, borderBottom:`1px solid ${TH.border}`, paddingBottom:8, overflowX:"auto"}}>
        {tabs.map(t => {
          const active = t.key === tab;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background:   active ? TH.accentBg : "transparent",
              border:       `1px solid ${active ? TH.accentBorder : "transparent"}`,
              borderRadius: 9,
              color:        active ? TH.accentText : TH.textMuted,
              padding:      "9px 14px",
              cursor:       "pointer",
              fontSize:     13,
              fontWeight:   active ? 700 : 500,
              fontFamily:   "inherit",
              whiteSpace:   "nowrap",
              display:      "flex", alignItems: "center", gap: 6,
            }}>
              {t.icon} {t.label}
              {t.badge > 0 && <span style={{background: t.alert ? "#C43D3D" : "#8B7A44", color:"#fff", borderRadius:10, padding:"1px 7px", fontSize:10, fontWeight:700}}>{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {tab === "scan"        && <ScanTab TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} onChanged={bump} />}
      {tab === "quickadd"    && <QuickAddTab TH={TH} lang={lang} isMobile={isMobile} onSaved={() => { bump(); setTab("assets"); }} />}
      {tab === "assets"      && <AssetsTab key={refreshKey} TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} onChanged={bump} />}
      {tab === "checkinout"  && <CheckInOutTab key={"co-"+refreshKey} TH={TH} lang={lang} isMobile={isMobile} onChanged={bump} />}
      {tab === "consumables" && <ConsumablesTab TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
      {tab === "loans"       && <LoansTab key={"lo-"+refreshKey} TH={TH} lang={lang} isMobile={isMobile} onChanged={bump} />}
      {tab === "packages"    && <PackagesTab key={"pkg-"+refreshKey} TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
      {tab === "warehouses"  && <WarehousesTab TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
      {tab === "activity"    && <ActivityTab key={"act-"+refreshKey} TH={TH} lang={lang} isMobile={isMobile} />}
    </div>
  );
}

function Stat({ TH, label, value, alert, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: alert ? "rgba(196,61,61,0.15)" : TH.bgCard,
      border: `1px solid ${alert ? "rgba(196,61,61,0.4)" : TH.border}`,
      borderRadius: 10, padding: "10px 12px",
      cursor: onClick ? "pointer" : "default",
    }}>
      <div style={{fontSize:9, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4}}>{label}</div>
      <div style={{fontSize:20, fontWeight:800, color: alert ? "#C43D3D" : TH.text, lineHeight:1}}>{value}</div>
    </div>
  );
}
