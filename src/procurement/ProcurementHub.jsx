// ═══════════════════════════════════════════════════════════════════
// ProcurementHub.jsx — Smart Requests / Procurement module
// Tabs visible depend on user's role in user_procurement_roles.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { tr } from "../i18n";
import RequestsListTab from "./tabs/RequestsListTab";
import RequestDetail from "./tabs/RequestDetail";
import NewRequestModal from "./components/NewRequestModal";

export default function ProcurementHub({ TH, lang = "en", isMobile = false, isAdmin = false }) {
  const L = tr(lang);
  const [role, setRole]           = useState(null);   // 'supervisor' | 'approver_level_1' | 'approver_level_2' | 'admin' | null
  const [displayName, setDisplayName] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState("my");
  const [showNew, setShowNew]     = useState(false);
  const [openId, setOpenId]       = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [counts, setCounts]       = useState({});

  useEffect(() => { loadRole(); loadCounts(); }, [refreshKey]);

  async function loadRole() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('user_procurement_roles')
        .select('role, display_name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (data) {
        setRole(data.role);
        setDisplayName(data.display_name);
      } else if (isAdmin) {
        setRole('admin');
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadCounts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [my, forEdem, forHezi] = await Promise.all([
        supabase.from('procurement_requests').select('id', { count: 'exact', head: true }).eq('requested_by', user.id).eq('is_active', true),
        supabase.from('procurement_requests').select('id', { count: 'exact', head: true }).in('status', ['submitted','edem_reviewing']).eq('is_active', true),
        supabase.from('procurement_requests').select('id', { count: 'exact', head: true }).eq('status', 'edem_approved').eq('is_active', true),
      ]);
      setCounts({
        my: my.count || 0,
        forEdem: forEdem.count || 0,
        forHezi: forHezi.count || 0,
      });
    } catch { /* non-critical */ }
  }

  const bump = () => setRefreshKey(k => k + 1);

  const isSupervisor = role === 'supervisor';
  const isEdem       = role === 'approver_level_1' || role === 'admin';
  const isHezi       = role === 'approver_level_2' || role === 'admin';
  const isAdminRole  = role === 'admin' || isAdmin;

  if (openId) {
    return <RequestDetail
      TH={TH} lang={lang} isMobile={isMobile}
      requestId={openId}
      role={role}
      isAdmin={isAdminRole}
      onClose={() => { setOpenId(null); bump(); }}
    />;
  }

  const tabs = [
    { key: "my",     icon: "📝", label: L.myRequests || "My Requests", badge: counts.my || 0 },
    ...(isEdem  ? [{ key: "review", icon: "🔍", label: L.forReview     || "For Review",     badge: counts.forEdem || 0, alert: (counts.forEdem||0) > 0 }] : []),
    ...(isHezi  ? [{ key: "final",  icon: "✍️", label: L.finalApproval || "Final Approval", badge: counts.forHezi || 0, alert: (counts.forHezi||0) > 0 }] : []),
    ...(isAdminRole ? [{ key: "all", icon: "📚", label: L.allRequests || "All Requests" }] : []),
  ];

  const canCreate = isSupervisor || isAdminRole || isEdem || isHezi;

  return (
    <div>
      {showNew && (
        <NewRequestModal
          TH={TH} lang={lang}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); bump(); }}
        />
      )}

      <div style={{marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:isMobile?18:24, fontWeight:700, color:TH.text, letterSpacing:"-0.3px", fontFamily:"'Playfair Display', Georgia, serif"}}>
            {L.procurementTitle || "Procurement Requests"}
          </div>
          <div style={{fontSize:13, color:TH.textMuted, marginTop:2}}>
            {L.procurementSub || "Supervisor requests → Edem reviews → Hezi approves → Purchase"}
            {role && displayName && (
              <span style={{marginLeft:10, padding:"2px 8px", background:TH.bgInput, borderRadius:6, fontSize:11}}>
                👤 {displayName} · {roleLabel(role)}
              </span>
            )}
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowNew(true)}
            style={{
              background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:10,
              color:"#000", padding:"12px 20px", fontSize:14, fontWeight:800, cursor:"pointer",
              fontFamily:"inherit", boxShadow:"0 2px 10px rgba(184,147,90,0.3)",
            }}
          >📝 {L.newRequest || "New request"}</button>
        )}
      </div>

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>{L.loading || 'Loading…'}</div>
      ) : !role ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          <div style={{fontSize:14, fontWeight:700, marginBottom:8}}>{L.noRoleTitle || "No role assigned"}</div>
          <div style={{fontSize:12}}>{L.noRoleDesc || "You don't have a procurement role. Contact an admin to be added as supervisor or approver."}</div>
        </div>
      ) : (
        <>
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
                  display:      "flex", alignItems:"center", gap: 6,
                }}>
                  {t.icon} {t.label}
                  {t.badge > 0 && (
                    <span style={{background: t.alert ? "#C43D3D" : "#8B7040", color:"#fff", borderRadius:10, padding:"1px 7px", fontSize:10, fontWeight:700}}>
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <RequestsListTab
            key={tab + refreshKey}
            TH={TH} lang={lang} isMobile={isMobile}
            mode={tab}
            role={role}
            onOpen={(id) => setOpenId(id)}
          />
        </>
      )}
    </div>
  );
}

function roleLabel(role) {
  return ({
    supervisor:        "Supervisor",
    approver_level_1:  "Approver L1",
    approver_level_2:  "Approver L2 (Final)",
    admin:             "Admin",
  })[role] || role;
}
