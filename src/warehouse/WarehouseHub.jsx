// ═══════════════════════════════════════════════════════════════════
// WarehouseHub.jsx — Inventory Management
// Four groups:
//   STOCK      Overview · Items · Reorder · Stocktake
//   ASSETS     Assets · Check in/out · Loans · Scan · Quick add
//   LOGISTICS  Warehouses · Suppliers · Packages
//   INSIGHTS   Activity · Reports
// Quick actions in the header: Receive · Dispense · Transfer
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { fmtMoney, daysUntil } from "./lib/warehouseUtils";
import { tr } from "../i18n";
import { Icon } from "./lib/icons";

import QuickAddTab from "./tabs/QuickAddTab";
import AssetsTab from "./tabs/AssetsTab";
import CheckInOutTab from "./tabs/CheckInOutTab";
import ConsumablesTab from "./tabs/ConsumablesTab";
import WarehousesTab from "./tabs/WarehousesTab";
import ScanTab from "./tabs/ScanTab";
import ActivityTab from "./tabs/ActivityTab";
import PackagesTab from "./tabs/PackagesTab";
import LoansTab from "./tabs/LoansTab";
import SuppliersTab from "./tabs/SuppliersTab";
import ReorderTab from "./tabs/ReorderTab";
import StocktakeTab from "./tabs/StocktakeTab";
import ReportsTab from "./tabs/ReportsTab";

import DispenseModal from "./components/DispenseModal";
import ReceiveModal from "./components/ReceiveModal";
import TransferModal from "./components/TransferModal";
import ImportModal from "./components/ImportModal";

const SERIF = "'Playfair Display', Georgia, serif";

export default function WarehouseHub({ TH, lang = "en", isMobile = false, isAdmin = false }) {
  const L = tr(lang);
  const [tab, setTab] = useState(isMobile ? "scan" : "overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [sum, setSum] = useState(null);
  const [assetStats, setAssetStats] = useState(null);
  const [modal, setModal] = useState(null); // receive | dispense | transfer | import

  useEffect(() => { loadStats(); }, [refreshKey]);
  const bump = () => setRefreshKey(k => k + 1);

  async function loadStats() {
    try {
      const [rSum, rA, rP, rO] = await Promise.all([
        supabase.rpc('inventory_summary'),
        supabase.from('assets').select('id, status, purchase_price, next_service_date').eq('is_active', true),
        supabase.from('packages').select('id').eq('is_active', true).eq('status', 'received'),
        supabase.from('overdue_asset_loans').select('asset_id'),
      ]);
      if (rSum.data) setSum(rSum.data);
      const assets = rA.data || [];
      setAssetStats({
        total: assets.length,
        value: assets.reduce((s,a) => s + (Number(a.purchase_price)||0), 0),
        out: assets.filter(a => a.status === 'checked_out').length,
        overdue: (rO.data || []).length,
        serviceDue: assets.filter(a => { const d = daysUntil(a.next_service_date); return d !== null && d <= 7; }).length,
        packages: (rP.data || []).length,
      });
    } catch { /* stats are non-critical */ }
  }

  const GROUPS = [
    { key:'stock', label: L.groupStock || 'Stock', tabs: [
      { key:'overview',   icon:'boxes',     label: L.overviewTab  || 'Overview' },
      { key:'items',      icon:'ledger',    label: L.itemsTab     || 'Items' },
      { key:'reorder',    icon:'arrowDown', label: L.reorderTab   || 'Reorder', badge: sum?.low_count, alert: sum?.out_count > 0 },
      { key:'stocktake',  icon:'check',     label: L.stocktakeTab || 'Stocktake', badge: sum?.open_stocktakes },
    ]},
    { key:'assets', label: L.groupAssets || 'Assets', tabs: [
      { key:'assets',     icon:'package',   label: L.assets },
      { key:'checkinout', icon:'transfer',  label: L.checkInOut },
      { key:'loans',      icon:'clock',     label: L.loansTab || 'Loans', badge: assetStats?.overdue, alert: assetStats?.overdue > 0 },
      { key:'scan',       icon:'scan',      label: L.scanTab  || 'Scan' },
      { key:'quickadd',   icon:'plus',      label: L.quickAdd },
    ]},
    { key:'logistics', label: L.groupLogistics || 'Logistics', tabs: [
      { key:'warehouses', icon:'warehouse', label: L.warehouses },
      { key:'suppliers',  icon:'building',  label: L.suppliersTab || 'Suppliers', badge: sum?.suppliers },
      { key:'packages',   icon:'mailbox',   label: L.packagesTab  || 'Packages', badge: assetStats?.packages },
    ]},
    { key:'insights', label: L.groupInsights || 'Insights', tabs: [
      { key:'activity',   icon:'sparkle',   label: L.activityTab || 'Activity' },
      { key:'reports',    icon:'chart',     label: L.reportsTab  || 'Reports' },
    ]},
  ];

  const activeGroup = GROUPS.find(g => g.tabs.some(t => t.key === tab)) || GROUPS[0];

  return (
    <div>
      {modal === 'receive'  && <ReceiveModal  TH={TH} lang={lang} onClose={() => setModal(null)} onDone={() => { setModal(null); bump(); }} />}
      {modal === 'dispense' && <DispenseModal TH={TH} lang={lang} onClose={() => setModal(null)} onDone={() => { setModal(null); bump(); }} />}
      {modal === 'transfer' && <TransferModal TH={TH} lang={lang} onClose={() => setModal(null)} onDone={() => { setModal(null); bump(); }} />}
      {modal === 'import'   && <ImportModal   TH={TH} lang={lang} onClose={() => setModal(null)} onDone={() => { setModal(null); bump(); }} />}

      {/* ═══ Header ═══ */}
      <div style={{marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:14, flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:10, letterSpacing:".16em", textTransform:"uppercase", color:TH.accent, fontWeight:700, marginBottom:5}}>
            {L.inventoryEyebrow || "Inventory"}
          </div>
          <div style={{fontSize:isMobile?21:27, fontWeight:500, color:TH.textHeading, letterSpacing:"-.012em", fontFamily:SERIF, lineHeight:1.1}}>
            {L.inventoryTitle || "Inventory Management"}
          </div>
          {!isMobile && (
            <div style={{fontSize:12.5, color:TH.textMuted, marginTop:4}}>
              {L.inventorySub || "Stock, assets, suppliers and movement — one place, one truth"}
            </div>
          )}
        </div>

        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <Action TH={TH} icon="arrowDown" label={L.receiveBtn  || "Receive"}  tone="ok"     onClick={() => setModal('receive')} />
          <Action TH={TH} icon="arrowUp"   label={L.dispenseBtn || "Dispense"} tone="accent" onClick={() => setModal('dispense')} />
          <Action TH={TH} icon="transfer"  label={L.transferBtn || "Transfer"} tone="deep"   onClick={() => setModal('transfer')} />
          {isAdmin && <Action TH={TH} icon="ledger" label={L.importBtn || "Import"} tone="ghost" onClick={() => setModal('import')} />}
        </div>
      </div>

      {/* ═══ KPI strip ═══ */}
      {sum && (
        <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(6,1fr)", gap:9, marginBottom:16}}>
          <Kpi TH={TH} label={L.itemsTracked || "Items"}     value={sum.items_active} onClick={() => setTab('items')} />
          <Kpi TH={TH} label={L.stockValue   || "Stock value"} value={fmtMoney(sum.stock_value)} gold onClick={() => setTab('reports')} />
          <Kpi TH={TH} label={L.lowStock     || "Low stock"}  value={sum.low_count} alert={sum.low_count > 0} onClick={() => setTab('reorder')} />
          <Kpi TH={TH} label={L.outOfStock   || "Out"}        value={sum.out_count} alert={sum.out_count > 0} onClick={() => setTab('reorder')} />
          <Kpi TH={TH} label={L.expiringLbl  || "Expiring"}   value={(sum.expired || 0) + (sum.expiring_soon || 0)} alert={sum.expired > 0} onClick={() => setTab('reports')} />
          <Kpi TH={TH} label={L.assets}                        value={assetStats?.total ?? '—'} onClick={() => setTab('assets')} />
        </div>
      )}

      {/* ═══ Group tabs ═══ */}
      <div style={{display:"flex", gap:3, marginBottom:2, background:TH.bgInput, borderRadius:10, padding:3, overflowX:"auto"}}>
        {GROUPS.map(g => {
          const on = g.key === activeGroup.key;
          return (
            <button key={g.key} onClick={() => setTab(g.tabs[0].key)} style={{
              background: on ? TH.bgCard : "transparent", border:"none", borderRadius:8,
              color: on ? TH.textHeading : TH.textMuted, padding:"8px 16px", cursor:"pointer",
              fontSize:11.5, fontWeight: on ? 700 : 500, fontFamily:"inherit",
              textTransform:"uppercase", letterSpacing:".08em", whiteSpace:"nowrap",
              boxShadow: on ? TH.shadow : "none",
            }}>{g.label}</button>
          );
        })}
      </div>

      {/* ═══ Sub tabs ═══ */}
      <div style={{display:"flex", gap:5, marginBottom:20, paddingBottom:9, borderBottom:`1px solid ${TH.border}`, overflowX:"auto"}}>
        {activeGroup.tabs.map(t => {
          const on = t.key === tab;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: on ? TH.accentBg : "transparent",
              border:`1px solid ${on ? TH.accentBorder : "transparent"}`,
              borderRadius:9, color: on ? TH.accentText : TH.textMuted,
              padding:"8px 14px", cursor:"pointer", fontSize:12.5,
              fontWeight: on ? 700 : 500, fontFamily:"inherit", whiteSpace:"nowrap",
              display:"inline-flex", alignItems:"center", gap:7,
            }}>
              <Icon name={t.icon} size={14} />
              {t.label}
              {t.badge > 0 && (
                <span style={{
                  background: t.alert ? TH.danger : TH.bgInput,
                  color: t.alert ? "#fff" : TH.textMuted,
                  border: t.alert ? "none" : `1px solid ${TH.border}`,
                  borderRadius:10, padding:"1px 7px", fontSize:9.5, fontWeight:700, marginInlineStart:1,
                }}>{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ Panels ═══ */}
      {tab === 'overview'   && <ConsumablesTab key={"ov-"+refreshKey}  TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
      {tab === 'items'      && <ConsumablesTab key={"it-"+refreshKey}  TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} startView="items" />}
      {tab === 'reorder'    && <ReorderTab    key={"ro-"+refreshKey}  TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
      {tab === 'stocktake'  && <StocktakeTab  key={"st-"+refreshKey}  TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}

      {tab === 'assets'     && <AssetsTab     key={"as-"+refreshKey}  TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} onChanged={bump} />}
      {tab === 'checkinout' && <CheckInOutTab key={"co-"+refreshKey}  TH={TH} lang={lang} isMobile={isMobile} onChanged={bump} />}
      {tab === 'loans'      && <LoansTab      key={"lo-"+refreshKey}  TH={TH} lang={lang} isMobile={isMobile} onChanged={bump} />}
      {tab === 'scan'       && <ScanTab       TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} onChanged={bump} />}
      {tab === 'quickadd'   && <QuickAddTab   TH={TH} lang={lang} isMobile={isMobile} onSaved={() => { bump(); setTab('assets'); }} />}

      {tab === 'warehouses' && <WarehousesTab TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
      {tab === 'suppliers'  && <SuppliersTab  key={"su-"+refreshKey}  TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
      {tab === 'packages'   && <PackagesTab   key={"pk-"+refreshKey}  TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}

      {tab === 'activity'   && <ActivityTab   key={"ac-"+refreshKey}  TH={TH} lang={lang} isMobile={isMobile} />}
      {tab === 'reports'    && <ReportsTab    key={"rp-"+refreshKey}  TH={TH} lang={lang} isMobile={isMobile} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
function Action({ TH, icon, label, tone, onClick }) {
  const styles = {
    ok:     { background:TH.ok,   color:"#fff",     border:"none" },
    accent: { background:TH.accent, color:"#12182B", border:"none" },
    deep:   { background:TH.deep, color:TH.onDeep,  border:`1px solid ${TH.deepBorder}` },
    ghost:  { background:"transparent", color:TH.textMuted, border:`1px solid ${TH.border}` },
  }[tone];
  return (
    <button onClick={onClick} style={{
      ...styles, borderRadius:10, padding:"10px 17px", cursor:"pointer",
      fontSize:12.5, fontWeight:700, fontFamily:"inherit",
      display:"inline-flex", alignItems:"center", gap:7,
    }}>
      <Icon name={icon} size={15} />{label}
    </button>
  );
}

function Kpi({ TH, label, value, gold, alert, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: TH.bgCard,
      border:`1px solid ${alert ? TH.danger + '44' : TH.border}`,
      borderInlineStart:`3px solid ${alert ? TH.danger : gold ? TH.accent : TH.border}`,
      borderRadius:0, padding:"11px 14px",
      cursor: onClick ? "pointer" : "default",
    }}>
      <div style={{fontSize:9, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:".1em", marginBottom:5}}>{label}</div>
      <div style={{fontFamily:SERIF, fontSize:19, fontWeight:500, lineHeight:1,
        color: alert ? TH.danger : gold ? TH.accent : TH.textHeading, whiteSpace:"nowrap"}}>{value}</div>
    </div>
  );
}
