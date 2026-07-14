// ═══════════════════════════════════════════════════════════════════
// InspectionHub.jsx — inspection panel container
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { tr } from "../i18n";
import NewInspectionTab from "./tabs/NewInspectionTab";
import InspectionsListTab from "./tabs/InspectionsListTab";

export default function InspectionHub({ TH, lang = "en", isMobile = false, isAdmin = false }) {
  const L = tr(lang);
  const [tab, setTab] = useState(isMobile ? "new" : "list");
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    { key: "new",       icon: "📸", label: L.newInspection },
    { key: "list",      icon: "📋", label: L.allInspections },
    { key: "issues",    icon: "🚨", label: L.openIssuesTab },
  ];

  const bump = () => setRefreshKey(k => k + 1);

  return (
    <div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:isMobile?18:24, fontWeight:700, color:TH.text, letterSpacing:"-0.3px", fontFamily:"'Playfair Display', Georgia, serif"}}>
          {L.inspectionsTitle}
        </div>
        {!isMobile && <div style={{fontSize:13, color:TH.textMuted, marginTop:2}}>
          {L.inspectionsSub}
        </div>}
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

      {tab === "new"    && <NewInspectionTab TH={TH} lang={lang} isMobile={isMobile} onSaved={() => { bump(); setTab("list"); }} />}
      {tab === "list"   && <InspectionsListTab key={refreshKey} TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
      {tab === "issues" && <InspectionsListTab key={"issues-"+refreshKey} TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} onlyOpenIssues />}
    </div>
  );
}
