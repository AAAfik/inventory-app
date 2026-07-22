// ═══════════════════════════════════════════════════════════════════
// RequestsListTab.jsx — filtered list of procurement requests
// mode: 'my' | 'review' | 'final' | 'all'
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import { formatDateShort } from "../../inspection/lib/inspectionUtils";

export const STATUS_META = {
  submitted:            { label: "Submitted",             color: "#7BB3D4", icon: "📤" },
  edem_reviewing:       { label: "Under review",          color: "#C9A960", icon: "🔍" },
  fulfilled_from_stock: { label: "From stock",            color: "#7A9A5B", icon: "📦" },
  edem_approved:        { label: "Awaiting final",        color: "#B8862C", icon: "⏳" },
  edem_rejected:        { label: "Rejected (L1)",         color: "#C43D3D", icon: "✕" },
  hezi_approved:        { label: "Approved to buy",       color: "#7A9A5B", icon: "✓" },
  hezi_rejected:        { label: "Rejected (L2)",         color: "#C43D3D", icon: "✕" },
  purchased:            { label: "Purchased",             color: "#8B7A44", icon: "🛒" },
  cancelled:            { label: "Cancelled",             color: "#8f8f8f", icon: "⊘" },
};

const PRIORITY_META = {
  low:      { label: "Low",      color: "#7A9A5B" },
  medium:   { label: "Medium",   color: "#D4B876" },
  high:     { label: "High",     color: "#E67A2C" },
  urgent:   { label: "Urgent",   color: "#C43D3D" },
};

export default function RequestsListTab({ TH, lang = "en", isMobile, mode, role, onOpen }) {
  const L = tr(lang);
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, [mode]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const [rD, rR] = await Promise.all([
        supabase.from('procurement_departments').select('*').eq('is_active', true).order('name'),
        buildQuery(user?.id, mode),
      ]);
      setDepartments(rD.data || []);
      if (rR.error) throw rR.error;
      setRows(rR.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function buildQuery(userId, mode) {
    let q = supabase.from('procurement_requests').select(`
      id, request_no, purpose, priority, status, department_id, property_id,
      requested_by, edem_decided_at, hezi_decided_at, created_at, updated_at,
      requester_role:user_procurement_roles!procurement_requests_requested_by_fkey ( display_name )
    `).eq('is_active', true);

    if (mode === 'my') {
      q = q.eq('requested_by', userId).order('created_at', { ascending: false });
    } else if (mode === 'review') {
      q = q.in('status', ['submitted', 'edem_reviewing']).order('priority', { ascending: false }).order('created_at');
    } else if (mode === 'final') {
      q = q.eq('status', 'edem_approved').order('priority', { ascending: false }).order('created_at');
    } else {
      q = q.order('created_at', { ascending: false }).limit(200);
    }
    return q;
  }

  const deptMap = Object.fromEntries(departments.map(d => [d.id, d]));

  const filt = rows.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [r.request_no, r.purpose].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Status filter pills — only statuses that actually appear
  const availableStatuses = Array.from(new Set(rows.map(r => r.status)));

  return (
    <div>
      {/* Search + status filter */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"2fr 1fr", gap:8, marginBottom:14}}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L.searchRequests || 'Search by no / purpose…'} style={inp(TH)} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inp(TH)}>
          <option value="all">{L.allStatuses || 'All statuses'}</option>
          {availableStatuses.map(s => (
            <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
          ))}
        </select>
      </div>

      {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:10, padding:"12px 14px", color:"#C43D3D", fontSize:13, marginBottom:14}}>{error}</div>}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>{L.loading || 'Loading…'}</div>
      ) : filt.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          {L.noRequests || 'No requests to display.'}
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {filt.map(r => {
            const sm = STATUS_META[r.status] || { label: r.status, color: '#8f8f8f', icon: '•' };
            const pm = PRIORITY_META[r.priority] || null;
            const dept = deptMap[r.department_id];
            return (
              <div key={r.id} onClick={() => onOpen(r.id)} style={{
                background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12,
                borderLeft:`3px solid ${sm.color}`, cursor:"pointer", padding:14,
              }}
              onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = TH.bgCard}>
                <div style={{display:"flex", justifyContent:"space-between", gap:10, marginBottom:6, flexWrap:"wrap"}}>
                  <div style={{fontSize:11, color:TH.textDim, fontFamily:"monospace"}}>{r.request_no}</div>
                  <div style={{display:"flex", gap:6, alignItems:"center", flexWrap:"wrap"}}>
                    {pm && <span style={{padding:"2px 8px", borderRadius:20, background:pm.color+"22", color:pm.color, fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.05em"}}>{pm.label}</span>}
                    <span style={{padding:"2px 10px", borderRadius:20, background:sm.color+"22", color:sm.color, fontSize:10, fontWeight:700}}>{sm.icon} {sm.label}</span>
                  </div>
                </div>
                <div style={{fontSize:14, fontWeight:700, color:TH.text, marginBottom:6, lineHeight:1.4}}>
                  {r.purpose}
                </div>
                <div style={{display:"flex", gap:6, flexWrap:"wrap", fontSize:11}}>
                  {dept && <Chip TH={TH}>{dept.icon} {dept.name}</Chip>}
                  {r.requester_role?.display_name && <Chip TH={TH}>👤 {r.requester_role.display_name}</Chip>}
                  <Chip TH={TH} muted>📅 {formatDateShort(r.created_at)}</Chip>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({ TH, children, muted }) {
  return <span style={{fontSize:10, color: muted ? TH.textDim : TH.textMuted, background: TH.bgInput, padding:"3px 8px", borderRadius:5, whiteSpace:"nowrap"}}>{children}</span>;
}
function inp(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
