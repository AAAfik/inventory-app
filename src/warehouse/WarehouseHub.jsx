// ═══════════════════════════════════════════════════════════════════
// WarehouseHub.jsx — top-level container for warehouse manager
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import WarehousesTab from "./tabs/WarehousesTab";
import AssetsTab from "./tabs/AssetsTab";

export default function WarehouseHub({ TH, lang = "en", isMobile = false, isAdmin = false }) {
  const [tab, setTab] = useState("assets");

  const tabs = [
    { key: "assets",     icon: "📦", label: "Assets" },
    { key: "warehouses", icon: "🏬", label: "Warehouses" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12}}>
        <div>
          <div style={{fontSize:isMobile?20:24, fontWeight:800, color:TH.text, letterSpacing:"-0.3px"}}>
            Warehouse Manager
          </div>
          <div style={{fontSize:13, color:TH.textMuted, marginTop:2}}>
            Track equipment, tools, vehicles, and consumables across all properties
          </div>
        </div>
      </div>

      {/* Sub-tab bar */}
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
                padding:      "8px 14px",
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

      {tab === "assets"     && <AssetsTab TH={TH} isMobile={isMobile} isAdmin={isAdmin} />}
      {tab === "warehouses" && <WarehousesTab TH={TH} isMobile={isMobile} isAdmin={isAdmin} />}
    </div>
  );
}
