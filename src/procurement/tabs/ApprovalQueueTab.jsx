// ═══════════════════════════════════════════════════════════════════
// ApprovalQueueTab.jsx — approver-facing inbox
// ═══════════════════════════════════════════════════════════════════
// Shows requisitions waiting for the current user's approval.
// Approve / Reject / Return-for-revision actions.

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { REQ_STATUS, formatEUR, formatDate } from "../lib/procureUtils";

export default function ApprovalQueueTab({ TH, isMobile, roles, isAdmin }) {
  const [reqs, setReqs]           = useState([]);
  const [lines, setLines]         = useState({}); // map req_id -> lines[]
  const [actions, setActions]     = useState({}); // map req_id -> actions[]
  const [properties, setProperties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [comment, setComment]     = useState({}); // map req_id -> comment text
  const [busy, setBusy]           = useState({}); // map req_id -> bool

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      const [rReq, rProp, rDept] = await Promise.all([
        supabase.schema('procure').from('requisitions')
          .select('id, req_no, property_id, department_id, justification, linked_other_ref, total_estimate, status, submitted_at, requested_by')
          .in('status', ['submitted', 'dept_approved', 'in_procurement', 'pending_approval'])
          .order('submitted_at', { ascending: true })
          .limit(50),
        supabase.schema('procure').from('properties').select('id, code, name'),
        supabase.schema('procure').from('departments').select('id, code, name, property_id'),
      ]);
      if (rReq.error) throw rReq.error;
      setReqs(rReq.data || []);
      setProperties(rProp.data || []);
      setDepartments(rDept.data || []);

      // Bulk fetch lines + actions for visible reqs
      if (rReq.data?.length) {
        const ids = rReq.data.map(r => r.id);
        const [rLines, rActs] = await Promise.all([
          supabase.schema('procure').from('requisition_lines')
            .select('requisition_id, item_description, qty, unit, unit_estimate')
            .in('requisition_id', ids),
          supabase.schema('procure').from('approval_actions')
            .select('requisition_id, step_order, approver_id, action, comment, acted_at')
            .in('requisition_id', ids)
            .order('acted_at', { ascending: true }),
        ]);
        const linesMap = {}; (rLines.data || []).forEach(l => { (linesMap[l.requisition_id] ||= []).push(l); });
        const actsMap = {};  (rActs.data || []).forEach(a => { (actsMap[a.requisition_id] ||= []).push(a); });
        setLines(linesMap); setActions(actsMap);
      } else {
        setLines({}); setActions({});
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function act(req, action) {
    const c = (comment[req.id] || '').trim();
    if (action === 'reject' && !c) { alert("A reject reason is required."); return; }
    setBusy(b => ({ ...b, [req.id]: true }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in.");

      const stepOrder = (actions[req.id]?.length || 0) + 1;

      // Insert approval action (immutable trail)
      const { error: e1 } = await supabase.schema('procure').from('approval_actions').insert([{
        requisition_id: req.id,
        step_order:     stepOrder,
        approver_id:    user.id,
        action,
        comment:        c || null,
      }]);
      if (e1) throw e1;

      // Update requisition status
      // For Phase 1 we use simple progression. Phase 2 will use the resolved chain.
      let newStatus = req.status;
      if (action === 'approve') {
        if (req.status === 'submitted' || req.status === 'dept_approved') {
          // Move forward; for now mark approved if total < 200, else in_procurement for officer
          newStatus = Number(req.total_estimate) < 200 ? 'approved' : 'in_procurement';
        } else if (req.status === 'in_procurement' || req.status === 'pending_approval') {
          newStatus = 'approved';
        }
      } else if (action === 'reject') {
        newStatus = 'rejected';
      } else if (action === 'return') {
        newStatus = 'draft';
      }

      const { error: e2 } = await supabase.schema('procure').from('requisitions')
        .update({ status: newStatus, rejected_reason: action === 'reject' ? c : null })
        .eq('id', req.id);
      if (e2) throw e2;

      // Audit
      await supabase.schema('procure').from('audit_log').insert([{
        user_id:     user.id,
        user_email:  user.email,
        action:      `approval_${action}`,
        entity_type: 'requisition',
        entity_id:   req.id,
        after_data:  { from: req.status, to: newStatus, comment: c },
      }]);

      setComment(m => ({ ...m, [req.id]: '' }));
      await loadAll();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(b => ({ ...b, [req.id]: false }));
    }
  }

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:12}}>
        <div style={{color:TH.textMuted, fontSize:13}}>
          {loading ? "Loading..." : `${reqs.length} pending`}
        </div>
        <button onClick={loadAll} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"6px 14px", cursor:"pointer", fontSize:12, fontFamily:"inherit"}}>↻ Refresh</button>
      </div>

      {error && (
        <div style={{background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.3)", borderRadius:9, padding:"10px 14px", color:"#ef4444", fontSize:13, marginBottom:16}}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading...</div>
      ) : reqs.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          🎉 Inbox zero. No requisitions pending your action.
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          {reqs.map(r => {
            const prop = properties.find(p => p.id === r.property_id);
            const dept = departments.find(d => d.id === r.department_id);
            const meta = REQ_STATUS[r.status] || { label: r.status, color: "#8892b0" };
            const rLines = lines[r.id] || [];
            const rActs  = actions[r.id] || [];
            return (
              <div key={r.id} style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, flexWrap:"wrap", gap:8}}>
                  <div>
                    <code style={{fontSize:13, color:TH.accent, fontWeight:600}}>{r.req_no}</code>
                    <span style={{marginLeft:10, display:"inline-block", padding:"3px 8px", borderRadius:5, background:meta.color+"22", color:meta.color, fontSize:11, fontWeight:700}}>{meta.label}</span>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:16, fontWeight:700, color:TH.text}}>{formatEUR(r.total_estimate)}</div>
                    <div style={{fontSize:11, color:TH.textMuted}}>{formatDate(r.submitted_at)}</div>
                  </div>
                </div>

                <div style={{fontSize:12, color:TH.textMuted, marginBottom:8}}>
                  {prop?.code || "?"} · {dept?.name || "?"} · ref: <code>{r.linked_other_ref || "—"}</code>
                </div>
                <div style={{fontSize:13, color:TH.text, marginBottom:12, padding:10, background:TH.bgInput, borderRadius:8, borderLeft:`3px solid ${TH.accent}`}}>
                  {r.justification}
                </div>

                {/* Lines */}
                {rLines.length > 0 && (
                  <div style={{marginBottom:12, fontSize:12, color:TH.textMuted}}>
                    {rLines.map((l, i) => (
                      <div key={i} style={{padding:"4px 0", borderBottom:i<rLines.length-1?`1px dashed ${TH.border}`:"none"}}>
                        · {l.item_description} — {l.qty} {l.unit} × {formatEUR(l.unit_estimate)} = <span style={{color:TH.text}}>{formatEUR(Number(l.qty)*Number(l.unit_estimate||0))}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Prior actions */}
                {rActs.length > 0 && (
                  <div style={{marginBottom:12, fontSize:11, color:TH.textMuted}}>
                    Trail: {rActs.map((a, i) => (
                      <span key={i} style={{marginRight:8}}>
                        <span style={{color:a.action==='approve'?'#10b981':a.action==='reject'?'#ef4444':TH.textMuted}}>●</span> {a.action} {a.comment ? `("${a.comment.slice(0,40)}")` : ''}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action bar */}
                <div style={{display:"flex", gap:8, alignItems:"stretch", flexWrap:"wrap", marginTop:14}}>
                  <input
                    value={comment[r.id] || ''}
                    onChange={e => setComment(m => ({ ...m, [r.id]: e.target.value }))}
                    placeholder="Optional comment (required for reject)"
                    style={{flex:1, minWidth:180, background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box"}}
                  />
                  <button onClick={() => act(r, 'approve')} disabled={busy[r.id]} style={{background:"#10b981", border:"none", borderRadius:8, color:"#fff", padding:"9px 16px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", opacity:busy[r.id]?0.5:1}}>✓ Approve</button>
                  <button onClick={() => act(r, 'reject')}  disabled={busy[r.id]} style={{background:"#ef4444", border:"none", borderRadius:8, color:"#fff", padding:"9px 16px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", opacity:busy[r.id]?0.5:1}}>✗ Reject</button>
                  <button onClick={() => act(r, 'return')}  disabled={busy[r.id]} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"9px 16px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit", opacity:busy[r.id]?0.5:1}}>↩ Return</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
