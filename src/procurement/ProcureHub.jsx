// ═══════════════════════════════════════════════════════════════════
// ProcureHub.jsx — Caesar Procure container with role-gated sub-tabs
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useProcureRoles } from "./hooks/useProcureRoles";
import {
  canSeeRequisitions, canSeeApprovalQueue, canSeeAuditLog,
} from "./lib/procureUtils";
import RequisitionsTab  from "./tabs/RequisitionsTab";
import ApprovalQueueTab from "./tabs/ApprovalQueueTab";
import AuditLogTab      from "./tabs/AuditLogTab";

export default function ProcureHub({ TH, lang = "en", isMobile = false, isAdmin = false }) {
  const [tab, setTab] = useState("requisitions");
  const { roles, loading, error } = useProcureRoles();

  if (loading) {
    return (
      <div style={{padding:40, textAlign:"center", color:TH.accent}}>
        Loading procurement module...
      </div>
    );
  }
  if (error) {
    return (
      <div style={{padding:40, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.3)", borderRadius:10, color:"#ef4444"}}>
        Failed to load procurement roles: {error}
      </div>
    );
  }

  if (!roles.length && !isAdmin) {
    return (
      <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
        <div style={{fontSize:18, fontWeight:600, color:TH.text, marginBottom:8}}>No procurement access</div>
        <div>You have not been assigned any procurement role yet. Ask Alireza to add you in <code>procure.user_roles</code>.</div>
      </div>
    );
  }

  // Build available tabs based on roles
  const tabs = [];
  if (canSeeRequisitions(roles) || isAdmin) tabs.push({ key: "requisitions", icon: "📝", label: "Requisitions" });
  if (canSeeApprovalQueue(roles) || isAdmin) tabs.push({ key: "approvals",   icon: "✓", label: "Approval Queue" });
  if (canSeeAuditLog(roles)     || isAdmin) tabs.push({ key: "audit",        icon: "🔍", label: "Audit Log" });

  // If selected tab not available, fall back to first
  const activeKey = tabs.find(t => t.key === tab) ? tab : (tabs[0]?.key || "requisitions");

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12}}>
        <div>
          <div style={{fontSize:isMobile?20:24, fontWeight:800, color:TH.text, letterSpacing:"-0.3px"}}>
            Caesar Procure
          </div>
          <div style={{fontSize:13, color:TH.textMuted, marginTop:2}}>
            {roles.length > 0
              ? `Your roles: ${roles.map(r => r.role).join(", ")}`
              : "Admin override"}
          </div>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div style={{display:"flex", gap:6, marginBottom:20, borderBottom:`1px solid ${TH.border}`, paddingBottom:8, overflowX:"auto"}}>
        {tabs.map(t => {
          const active = t.key === activeKey;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background:    active ? TH.accentBg : "transparent",
                border:        `1px solid ${active ? TH.accentBorder : "transparent"}`,
                borderRadius:  9,
                color:         active ? TH.accentText : TH.textMuted,
                padding:       "8px 14px",
                cursor:        "pointer",
                fontSize:      13,
                fontWeight:    active ? 700 : 500,
                fontFamily:    "inherit",
                whiteSpace:    "nowrap",
              }}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeKey === "requisitions" && <RequisitionsTab TH={TH} isMobile={isMobile} roles={roles} isAdmin={isAdmin} />}
      {activeKey === "approvals"    && <ApprovalQueueTab TH={TH} isMobile={isMobile} roles={roles} isAdmin={isAdmin} />}
      {activeKey === "audit"        && <AuditLogTab TH={TH} isMobile={isMobile} />}
    </div>
  );
}
