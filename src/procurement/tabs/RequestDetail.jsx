// ═══════════════════════════════════════════════════════════════════
// RequestDetail.jsx — view + role-based actions on one request.
// Edem (L1): lookup stock per item, decide from_stock/to_purchase/reject,
//            then approve/reject the whole request.
// Hezi (L2): final approve or reject items sent to purchase.
// Admin:    Mark as purchased when hezi_approved.
// Supervisor: view own + cancel while still 'submitted'.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import { formatDate } from "../../inspection/lib/inspectionUtils";
import { STATUS_META } from "./RequestsListTab";

const DECISION_META = {
  pending:      { label: "Pending",     color: "#8f8f8f", icon: "○" },
  from_stock:   { label: "From stock",  color: "#7A9A5B", icon: "📦" },
  to_purchase:  { label: "To purchase", color: "#C9A960", icon: "🛒" },
  rejected:     { label: "Rejected",    color: "#C43D3D", icon: "✕" },
};

const EVENT_META = {
  created:              { icon: "📝", color: "#7BB3D4", label: "Created" },
  opened:               { icon: "👁", color: "#C9A960", label: "Opened by Edem" },
  edem_approved:        { icon: "✓",  color: "#B8862C", label: "Approved by Edem" },
  edem_rejected:        { icon: "✕",  color: "#C43D3D", label: "Rejected by Edem" },
  fulfilled_from_stock: { icon: "📦", color: "#7A9A5B", label: "Fulfilled from stock" },
  hezi_approved:        { icon: "✓",  color: "#7A9A5B", label: "Final approval (Hezi)" },
  hezi_rejected:        { icon: "✕",  color: "#C43D3D", label: "Rejected by Hezi" },
  purchased:            { icon: "🛒", color: "#8B7A44", label: "Purchased" },
  cancelled:            { icon: "⊘",  color: "#8f8f8f", label: "Cancelled" },
  item_decision:        { icon: "•",  color: "#8f8f8f", label: "Item decision" },
  note:                 { icon: "💬", color: "#8f8f8f", label: "Note" },
  updated:              { icon: "✏️", color: "#8B7A44", label: "Updated" },
};

export default function RequestDetail({ TH, lang = "en", isMobile, requestId, role, isAdmin, onClose }) {
  const L = tr(lang);
  const [req, setReq]       = useState(null);
  const [items, setItems]   = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [busy, setBusy]     = useState(false);
  const [department, setDepartment] = useState(null);
  const [property, setProperty]     = useState(null);
  const [requesterName, setRequesterName] = useState(null);
  const [notesInput, setNotesInput] = useState("");

  // Stock lookup state per item
  const [stockLookups, setStockLookups] = useState({});   // item.id → [matches]

  useEffect(() => { load(); }, [requestId]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rR, rI, rH] = await Promise.all([
        supabase.from('procurement_requests').select('*').eq('id', requestId).single(),
        supabase.from('procurement_request_items').select('*').eq('request_id', requestId).order('created_at'),
        supabase.from('procurement_request_history').select('*').eq('request_id', requestId).order('at', { ascending: false }),
      ]);
      if (rR.error) throw rR.error;
      setReq(rR.data);
      setItems(rI.data || []);
      setHistory(rH.data || []);

      // Fetch related labels
      if (rR.data.department_id) {
        const { data: d } = await supabase.from('procurement_departments').select('*').eq('id', rR.data.department_id).single();
        setDepartment(d);
      }
      if (rR.data.property_id) {
        const { data: p } = await supabase.from('wh_properties').select('*').eq('id', rR.data.property_id).single();
        setProperty(p);
      }
      if (rR.data.requested_by) {
        const { data: u } = await supabase.from('user_procurement_roles').select('display_name').eq('user_id', rR.data.requested_by).maybeSingle();
        setRequesterName(u?.display_name);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function lookupStock(itemRow) {
    if (stockLookups[itemRow.id]) return;   // cached
    try {
      const { data } = await supabase.rpc('lookup_item_stock', { p_item_name: itemRow.item_name });
      setStockLookups(prev => ({ ...prev, [itemRow.id]: data || [] }));
    } catch (e) {
      setStockLookups(prev => ({ ...prev, [itemRow.id]: [] }));
    }
  }

  async function setItemDecision(itemRow, decision) {
    setBusy(true); setError(null);
    try {
      const { error: e } = await supabase.from('procurement_request_items').update({
        decision,
      }).eq('id', itemRow.id);
      if (e) throw e;
      // Also link item_id if we found a catalog match (first result)
      const matches = stockLookups[itemRow.id] || [];
      if (decision === 'from_stock' && matches[0] && !itemRow.item_id) {
        await supabase.from('procurement_request_items').update({ item_id: matches[0].item_id }).eq('id', itemRow.id);
      }
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function fulfillFromStock(itemRow, warehouseId, itemId) {
    if (!confirm(L.confirmFulfill || `Deduct ${itemRow.qty} ${itemRow.unit} from stock? This cannot be undone.`)) return;
    setBusy(true); setError(null);
    try {
      // Ensure item_id linkage first
      if (!itemRow.item_id && itemId) {
        await supabase.from('procurement_request_items').update({ item_id: itemId }).eq('id', itemRow.id);
      }
      const { error: e } = await supabase.rpc('fulfill_request_item_from_stock', {
        p_request_item_id: itemRow.id,
        p_warehouse_id: warehouseId,
        p_qty: itemRow.qty,
      });
      if (e) throw e;
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function edemApprove() {
    // Approve only if at least one item is to_purchase
    const hasToPurchase = items.some(i => i.decision === 'to_purchase');
    if (!hasToPurchase) {
      if (!confirm(L.noPurchaseConfirm || 'No items marked for purchase. Approve anyway (empty)?')) return;
    }
    await updateRequest({
      status: 'edem_approved',
      edem_notes: notesInput.trim() || null,
      edem_decided_at: new Date().toISOString(),
      edem_decided_by: (await supabase.auth.getUser()).data.user?.id,
    });
  }

  async function edemFulfillAllFromStock() {
    const allFromStock = items.every(i => i.decision === 'from_stock');
    if (!allFromStock) {
      if (!confirm(L.notAllFromStock || 'Not all items are marked as from_stock. Mark request complete anyway?')) return;
    }
    await updateRequest({
      status: 'fulfilled_from_stock',
      edem_notes: notesInput.trim() || null,
      edem_decided_at: new Date().toISOString(),
      edem_decided_by: (await supabase.auth.getUser()).data.user?.id,
      fulfilled_at: new Date().toISOString(),
    });
  }

  async function edemReject() {
    if (!notesInput.trim() && !confirm(L.rejectNoNote || 'Reject without a reason?')) return;
    await updateRequest({
      status: 'edem_rejected',
      edem_notes: notesInput.trim() || null,
      edem_decided_at: new Date().toISOString(),
      edem_decided_by: (await supabase.auth.getUser()).data.user?.id,
    });
  }

  async function heziApprove() {
    await updateRequest({
      status: 'hezi_approved',
      hezi_notes: notesInput.trim() || null,
      hezi_decided_at: new Date().toISOString(),
      hezi_decided_by: (await supabase.auth.getUser()).data.user?.id,
    });
  }
  async function heziReject() {
    if (!notesInput.trim() && !confirm(L.rejectNoNote || 'Reject without a reason?')) return;
    await updateRequest({
      status: 'hezi_rejected',
      hezi_notes: notesInput.trim() || null,
      hezi_decided_at: new Date().toISOString(),
      hezi_decided_by: (await supabase.auth.getUser()).data.user?.id,
    });
  }
  async function markPurchased() {
    if (!confirm(L.confirmPurchased || 'Mark as purchased (added to warehouse)?')) return;
    await updateRequest({
      status: 'purchased',
      purchased_at: new Date().toISOString(),
      purchased_by: (await supabase.auth.getUser()).data.user?.id,
    });
  }
  async function cancelRequest() {
    if (!confirm(L.confirmCancel || 'Cancel this request?')) return;
    await updateRequest({ status: 'cancelled' });
  }

  async function updateRequest(patch) {
    setBusy(true); setError(null);
    try {
      const { error: e } = await supabase.from('procurement_requests').update(patch).eq('id', requestId);
      if (e) throw e;
      setNotesInput("");
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div style={{padding:40, textAlign:"center", color:TH.textMuted}}>{L.loading || 'Loading…'}</div>;
  if (!req) return null;

  const sm = STATUS_META[req.status] || { label: req.status, color: '#8f8f8f', icon: '•' };
  const isEdem = role === 'approver_level_1' || isAdmin;
  const isHezi = role === 'approver_level_2' || isAdmin;
  const isSupervisor = role === 'supervisor';
  const isOwn = req.requested_by === null;   // will be set from auth below in supervisor checks

  const canEdem = isEdem && ['submitted', 'edem_reviewing'].includes(req.status);
  const canHezi = isHezi && req.status === 'edem_approved';
  const canPurchase = isAdmin && req.status === 'hezi_approved';
  const canCancel = ['submitted', 'edem_reviewing'].includes(req.status);

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:12, flexWrap:"wrap"}}>
        <button onClick={onClose} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"7px 14px", cursor:"pointer", fontSize:13, fontFamily:"inherit"}}>← {L.back || 'Back'}</button>
        <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
          <div style={{fontSize:11, color:TH.textMuted, fontFamily:"monospace"}}>{req.request_no}</div>
          <span style={{padding:"5px 14px", borderRadius:20, background:sm.color+"22", color:sm.color, fontSize:11, fontWeight:700}}>{sm.icon} {sm.label}</span>
        </div>
      </div>

      {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:10, padding:"12px 14px", color:"#C43D3D", fontSize:13, marginBottom:14}}>{error}</div>}

      {/* Main info card */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, borderLeft:`4px solid ${sm.color}`, padding:20, marginBottom:16}}>
        <div style={{fontSize:isMobile?16:20, fontWeight:800, color:TH.text, marginBottom:8}}>{req.purpose}</div>
        {req.use_location && <div style={{fontSize:12, color:TH.textMuted, marginBottom:12}}>📍 {req.use_location}</div>}

        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3, 1fr)", gap:14}}>
          <Info TH={TH} label={L.department || 'Department'}>{department ? `${department.icon} ${department.name}` : '—'}</Info>
          <Info TH={TH} label={L.property || 'Property'}>{property?.name || '—'}</Info>
          <Info TH={TH} label={L.requestedBy || 'Requested by'}>{requesterName || '—'}</Info>
          <Info TH={TH} label={L.priority || 'Priority'}>{req.priority || '—'}</Info>
          <Info TH={TH} label={L.created || 'Created'}>{formatDate(req.created_at)}</Info>
          {req.total_estimated_cost != null && <Info TH={TH} label={L.estTotal || 'Est. total'}>{req.total_estimated_cost}</Info>}
        </div>

        {req.notes && (
          <div style={{marginTop:12, padding:10, background:TH.bgInput, borderRadius:8, fontSize:12, color:TH.textMuted}}>📝 {req.notes}</div>
        )}
      </div>

      {/* Items with decisions */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16, marginBottom:16}}>
        <div style={{fontSize:13, fontWeight:700, color:TH.text, marginBottom:12}}>📦 {L.items || 'Items'} ({items.length})</div>

        {items.map(it => {
          const dm = DECISION_META[it.decision] || DECISION_META.pending;
          const matches = stockLookups[it.id];
          return (
            <div key={it.id} style={{background:TH.bgInput, borderRadius:10, padding:12, marginBottom:10, borderLeft:`3px solid ${dm.color}`}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:8, flexWrap:"wrap"}}>
                <div>
                  <div style={{fontSize:14, fontWeight:700, color:TH.text}}>{it.item_name}</div>
                  <div style={{fontSize:11, color:TH.textMuted, marginTop:2}}>
                    {it.qty} {it.unit}{it.estimated_cost ? ` · ~${it.estimated_cost}` : ''}
                  </div>
                  {it.notes && <div style={{fontSize:11, color:TH.textMuted, marginTop:4, fontStyle:"italic"}}>{it.notes}</div>}
                </div>
                <span style={{padding:"3px 10px", borderRadius:20, background:dm.color+"22", color:dm.color, fontSize:10, fontWeight:800, letterSpacing:"0.05em"}}>{dm.icon} {dm.label}</span>
              </div>

              {/* Fulfillment info if from_stock */}
              {it.decision === 'from_stock' && it.fulfilled_at && (
                <div style={{fontSize:11, color:"#7A9A5B", padding:"6px 10px", background:"rgba(122,154,91,0.1)", borderRadius:6, marginTop:6}}>
                  ✓ Fulfilled {it.fulfilled_qty} {it.unit} — {formatDate(it.fulfilled_at)}
                </div>
              )}

              {/* Edem controls */}
              {canEdem && it.decision === 'pending' && (
                <div style={{marginTop:10, paddingTop:10, borderTop:`1px solid ${TH.border}`}}>
                  {!matches ? (
                    <button onClick={() => lookupStock(it)} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.text, padding:"8px 14px", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit"}}>
                      🔍 {L.checkStock || 'Check stock'}
                    </button>
                  ) : matches.length === 0 ? (
                    <div style={{fontSize:11, color:TH.textMuted, padding:8, background:TH.bgCard, borderRadius:6, marginBottom:8}}>
                      {L.noStockMatch || 'No matching catalog item — treat as new purchase.'}
                    </div>
                  ) : (
                    <div style={{marginBottom:8}}>
                      {matches.map(m => (
                        <div key={m.item_id} style={{background:TH.bgCard, borderRadius:8, padding:10, marginBottom:6}}>
                          <div style={{fontSize:12, fontWeight:700, color:TH.text}}>{m.item_name}</div>
                          <div style={{fontSize:10, color:TH.textMuted, marginBottom:6}}>
                            {m.category ? `${m.category} · ` : ''}Total: {m.current_qty} {m.unit}
                          </div>
                          {(m.warehouses || []).length === 0 ? (
                            <div style={{fontSize:10, color:"#C43D3D"}}>Out of stock in all warehouses</div>
                          ) : (
                            <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
                              {m.warehouses.map(w => (
                                <button
                                  key={w.warehouse_id}
                                  onClick={() => fulfillFromStock(it, w.warehouse_id, m.item_id)}
                                  disabled={busy || Number(w.qty) < Number(it.qty)}
                                  title={Number(w.qty) < Number(it.qty) ? 'Insufficient stock' : `Take ${it.qty} from ${w.warehouse_name}`}
                                  style={{
                                    background: Number(w.qty) >= Number(it.qty) ? "rgba(122,154,91,0.15)" : TH.bgInput,
                                    border:`1px solid ${Number(w.qty) >= Number(it.qty) ? '#7A9A5B' : TH.border}`,
                                    borderRadius:6, color: Number(w.qty) >= Number(it.qty) ? '#7A9A5B' : TH.textMuted,
                                    padding:"5px 10px", cursor: Number(w.qty) >= Number(it.qty) ? "pointer" : "not-allowed",
                                    fontSize:10, fontWeight:700, fontFamily:"inherit",
                                  }}
                                >
                                  📍 {w.warehouse_name}: {w.qty}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                    <button onClick={() => setItemDecision(it, 'to_purchase')} disabled={busy} style={{background:"rgba(201,169,96,0.15)", border:"1px solid #C9A960", borderRadius:6, color:"#C9A960", padding:"6px 12px", cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit"}}>
                      🛒 {L.toPurchase || 'To purchase'}
                    </button>
                    <button onClick={() => setItemDecision(it, 'rejected')} disabled={busy} style={{background:"transparent", border:"1px solid rgba(196,61,61,0.4)", borderRadius:6, color:"#C43D3D", padding:"6px 12px", cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit"}}>
                      ✕ {L.rejectItem || 'Reject item'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Notes box for approver */}
      {(canEdem || canHezi) && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:14, marginBottom:16}}>
          <label style={{display:"block", color:TH.textMuted, fontSize:11, marginBottom:6, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px"}}>
            {canEdem ? (L.edemNotes || 'Edem notes') : (L.heziNotes || 'Hezi notes')}
          </label>
          <textarea value={notesInput} onChange={e => setNotesInput(e.target.value)} rows={2} placeholder={L.notesPh || 'Optional — decision reasoning'} style={{width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"10px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", resize:"vertical", boxSizing:"border-box"}} />
        </div>
      )}

      {/* Action buttons */}
      <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:16}}>
        {canEdem && (
          <>
            <button onClick={edemApprove} disabled={busy} style={btnPrimary()}>✓ {L.approveForPurchase || 'Approve for purchase → Hezi'}</button>
            <button onClick={edemFulfillAllFromStock} disabled={busy} style={btnSuccess()}>📦 {L.fulfilledComplete || 'Fulfilled complete'}</button>
            <button onClick={edemReject} disabled={busy} style={btnDanger()}>✕ {L.rejectRequest || 'Reject request'}</button>
          </>
        )}
        {canHezi && (
          <>
            <button onClick={heziApprove} disabled={busy} style={btnSuccess()}>✓ {L.finalApprove || 'Final approve → Purchase list'}</button>
            <button onClick={heziReject} disabled={busy} style={btnDanger()}>✕ {L.reject || 'Reject'}</button>
          </>
        )}
        {canPurchase && (
          <button onClick={markPurchased} disabled={busy} style={btnPrimary()}>🛒 {L.markPurchased || 'Mark as purchased'}</button>
        )}
        {canCancel && (
          <button onClick={cancelRequest} disabled={busy} style={btnCancel(TH)}>⊘ {L.cancelRequest || 'Cancel request'}</button>
        )}
      </div>

      {/* Approver decisions shown */}
      {(req.edem_notes || req.hezi_notes) && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:14, marginBottom:16}}>
          {req.edem_notes && (
            <div style={{marginBottom:req.hezi_notes ? 10 : 0, padding:10, background:TH.bgInput, borderRadius:8}}>
              <div style={{fontSize:10, fontWeight:800, color:"#C9A960", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4}}>Edem — {formatDate(req.edem_decided_at)}</div>
              <div style={{fontSize:12, color:TH.text}}>{req.edem_notes}</div>
            </div>
          )}
          {req.hezi_notes && (
            <div style={{padding:10, background:TH.bgInput, borderRadius:8}}>
              <div style={{fontSize:10, fontWeight:800, color:"#7A9A5B", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4}}>Hezi — {formatDate(req.hezi_decided_at)}</div>
              <div style={{fontSize:12, color:TH.text}}>{req.hezi_notes}</div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:14}}>
        <div style={{fontSize:13, fontWeight:700, color:TH.text, marginBottom:12}}>📜 {L.history || 'History'} ({history.length})</div>
        {history.length === 0 ? (
          <div style={{padding:12, color:TH.textMuted, fontSize:12, textAlign:"center"}}>{L.historyEmpty || 'No history.'}</div>
        ) : (
          <div style={{position:"relative", paddingLeft:20}}>
            <div style={{position:"absolute", left:8, top:10, bottom:10, width:2, background:TH.border}} />
            {history.map(h => {
              const em = EVENT_META[h.event_type] || { icon:"•", color:"#8f8f8f", label:h.event_type };
              return (
                <div key={h.id} style={{position:"relative", marginBottom:10, paddingLeft:20}}>
                  <div style={{position:"absolute", left:-16, top:6, width:16, height:16, background:em.color, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9}}>{em.icon}</div>
                  <div style={{background:TH.bgInput, borderRadius:8, padding:"9px 12px", borderLeft:`2px solid ${em.color}`}}>
                    <div style={{display:"flex", justifyContent:"space-between", gap:8, flexWrap:"wrap"}}>
                      <div style={{fontSize:12, fontWeight:700, color:TH.text}}>{em.label}</div>
                      <div style={{fontSize:10, color:TH.textDim, whiteSpace:"nowrap"}}>{formatDate(h.at)}</div>
                    </div>
                    {h.notes && <div style={{fontSize:11, color:TH.textMuted, marginTop:3, fontStyle:"italic"}}>{h.notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ TH, label, children }) {
  return (
    <div>
      <div style={{fontSize:10, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3}}>{label}</div>
      <div style={{fontSize:13, color:TH.text}}>{children}</div>
    </div>
  );
}
function btnPrimary()  { return { background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:9, color:"#000", padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit" }; }
function btnSuccess()  { return { background:"linear-gradient(135deg,#7A9A5B,#5B7A44)", border:"none", borderRadius:9, color:"#fff", padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit" }; }
function btnDanger()   { return { background:"transparent", border:"1px solid rgba(196,61,61,0.4)", borderRadius:9, color:"#C43D3D", padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }; }
function btnCancel(TH) { return { background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit" }; }
