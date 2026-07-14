// ═══════════════════════════════════════════════════════════════════
// WarehouseHub.jsx — top-level container for warehouse manager
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import QuickAddTab from "./tabs/QuickAddTab";
import WarehousesTab from "./tabs/WarehousesTab";
import AssetsTab from "./tabs/AssetsTab";

export default function WarehouseHub({ TH, lang = "en", isMobile = false, isAdmin = false }) {
  // On mobile, default to Quick Add. On desktop, default to Assets list.
  const [tab, setTab] = useState(isMobile ? "quickadd" : "assets");

  const tabs = [
    { key: "quickadd",   icon: "📸", label: "Quick Add" },
    { key: "assets",     icon: "📦", label: "Assets" },
    { key: "warehouses", icon: "🏬", label: "Warehouses" },
  ];

  return (
    <div>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:12}}>
        <div>
          <div style={{fontSize:isMobile?18:24, fontWeight:800, color:TH.text, letterSpacing:"-0.3px"}}>
            Warehouse Manager
          </div>
          {!isMobile && <div style={{fontSize:13, color:TH.textMuted, marginTop:2}}>
            Track equipment, tools, vehicles, and consumables across all properties
          </div>}
        </div>
      </div>

      <div style={{display:"flex", gap:6, marginBottom:20, borderBottom:`1px solid ${TH.border}`, paddingBottom:8, overflowX:"auto"}}>
        {tabs.map(t => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
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
              }}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {tab === "quickadd"   && <QuickAddTab TH={TH} isMobile={isMobile} />}
      {tab === "assets"     && <AssetsTab TH={TH} isMobile={isMobile} isAdmin={isAdmin} />}
      {tab === "warehouses" && <WarehousesTab TH={TH} isMobile={isMobile} isAdmin={isAdmin} />}
    </div>
  );
}
