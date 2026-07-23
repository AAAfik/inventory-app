// ═══════════════════════════════════════════════════════════════════
// DispenseModal.jsx — dispense consumable to a destination
// Cross-warehouse aware, structured destination (pool/dept/user).
// Uses RPCs: find_stock_across_warehouses + dispense_consumable.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";

export default function DispenseModal({ TH, lang = "en", presetItemId = null, onClose, onDone }) {
  const L = tr(lang);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Item search
  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [stockRows, setStockRows] = useState([]);

  // Selected warehouse + qty
  const [warehouseId, setWarehouseId] = useState("");
  const [qty, setQty] = useState("");

  // Destination
  const [destType, setDestType] = useState("pool");   // 'pool' | 'department' | 'user' | 'other'
  const [pools, setPools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [destPoolId, setDestPoolId] = useState("");
  const [destDeptId, setDestDeptId] = useState("");
  const [destUserId, setDestUserId] = useState("");
  const [destPersonName, setDestPersonName] = useState("");

  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Load lookups
    Promise.all([
      supabase.from('pools').select('id, code, name').eq('is_active', true).order('code'),
      supabase.from('procurement_departments').select('*').eq('is_active', true).order('name'),
      supabase.from('user_procurement_roles').select('user_id, display_name').eq('is_active', true),
    ]).then(([rP, rD, rU]) => {
      setPools(rP.data || []);
      setDepartments(rD.data || []);
      setUsers(rU.data || []);
    });

    if (presetItemId) {
      supabase.from('items').select('*').eq('id', presetItemId).single().then(({ data }) => {
        if (data) selectItem(data);
      });
    }
  }, [presetItemId]);

  // Debounced item search
  useEffect(() => {
    if (selectedItem) return;
    if (!itemSearch.trim()) { setItemResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('items')
        .select('id, name, category, unit, current_qty')
        .ilike('name', `%${itemSearch.trim()}%`)
        .order('current_qty', { ascending: false })
        .limit(10);
      setItemResults(data || []);
    }, 200);
    return () => clearTimeout(t);
  }, [itemSearch, selectedItem]);

  async function selectItem(item) {
    setSelectedItem(item);
    setItemSearch(item.name);
    setItemResults([]);
    // Load per-warehouse stock
    const { data } = await supabase.rpc('find_stock_across_warehouses', {
      p_item_id: item.id, p_qty_needed: null,
    });
    setStockRows(data || []);
    // Auto-pick warehouse with most stock
    if (data && data.length) setWarehouseId(String(data[0].warehouse_id));
  }

  function clearItem() {
    setSelectedItem(null);
    setStockRows([]);
    setWarehouseId("");
    setItemSearch("");
  }

  // Recommend cheapest/best warehouse based on qty
  useEffect(() => {
    if (!selectedItem || !qty || !stockRows.length) return;
    const needed = Number(qty);
    const best = stockRows.find(r => Number(r.qty) >= needed);
    if (best) setWarehouseId(String(best.warehouse_id));
  }, [qty]);

  async function submit() {
    if (!selectedItem) { setError(L.pickItem || "Pick an item first"); return; }
    if (!warehouseId)  { setError(L.pickWarehouse || "Pick a warehouse"); return; }
    if (!qty || Number(qty) <= 0) { setError(L.needQty || "Enter a quantity"); return; }

    let destPool = null, destDept = null, destUser = null, destName = destPersonName.trim() || null;
    if (destType === 'pool')       { if (!destPoolId) { setError(L.pickPool || "Pick a pool"); return; } destPool = Number(destPoolId); }
    if (destType === 'department') { if (!destDeptId) { setError(L.pickDept || "Pick a department"); return; } destDept = Number(destDeptId); }
    if (destType === 'user')       { destUser = destUserId || null; if (!destUser && !destName) { setError(L.pickPerson || "Pick a user or enter a name"); return; } }
    if (destType === 'other')      { if (!destName) { setError(L.enterPerson || "Enter recipient name"); return; } }

    setBusy(true); setError(null);
    try {
      const { error: e } = await supabase.rpc('dispense_consumable', {
        p_item_id: selectedItem.id,
        p_warehouse_id: Number(warehouseId),
        p_qty: Number(qty),
        p_destination_type: destType,
        p_destination_pool_id: destPool,
        p_destination_department_id: destDept,
        p_destination_user_id: destUser,
        p_destination_person_name: destName,
        p_reason: reason.trim() || null,
        p_notes: notes.trim() || null,
        p_procurement_request_id: null,
      });
      if (e) throw e;
      onDone?.();
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  }

  const currentWhStock = stockRows.find(r => String(r.warehouse_id) === warehouseId);
  const insufficient = currentWhStock && Number(qty) > Number(currentWhStock.qty);

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:20, width:"100%", maxWidth:560, maxHeight:"92vh", overflowY:"auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
          <div style={{fontSize:16, fontWeight:800, color:TH.text, fontFamily:"'Playfair Display', Georgia, serif"}}>
            📤 {L.dispenseTitle || "Dispense consumable"}
          </div>
          <button onClick={onClose} disabled={busy} style={{background:"transparent", border:"none", color:TH.textMuted, fontSize:22, cursor:"pointer", padding:4, lineHeight:1}}>✕</button>
        </div>

        {/* Item selector */}
        <div style={{marginBottom:12}}>
          <label style={lbl(TH)}>{L.item || "Item"} *</label>
          {!selectedItem ? (
            <div style={{position:"relative"}}>
              <input
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                placeholder={L.searchItem || "Start typing an item name…"}
                autoFocus
                style={inp(TH)}
              />
              {itemResults.length > 0 && (
                <div style={{position:"absolute", top:"100%", left:0, right:0, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:8, marginTop:4, maxHeight:220, overflowY:"auto", zIndex:10}}>
                  {itemResults.map(it => (
                    <div key={it.id} onClick={() => selectItem(it)} style={{padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${TH.border}`}}
                      onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{fontSize:13, fontWeight:700, color:TH.text}}>{it.name}</div>
                      <div style={{fontSize:10, color:TH.textMuted}}>{it.category ? `${it.category} · ` : ''}Total: {it.current_qty} {it.unit}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{background:TH.bgInput, borderRadius:8, padding:"10px 12px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div>
                <div style={{fontSize:13, fontWeight:700, color:TH.text}}>{selectedItem.name}</div>
                <div style={{fontSize:10, color:TH.textMuted}}>{selectedItem.category ? `${selectedItem.category} · ` : ''}Unit: {selectedItem.unit} · Total: {selectedItem.current_qty}</div>
              </div>
              <button onClick={clearItem} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"4px 10px", cursor:"pointer", fontSize:11}}>{L.change || "Change"}</button>
            </div>
          )}
        </div>

        {/* Warehouse + qty */}
        {selectedItem && (
          <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:12}}>
            <div>
              <label style={lbl(TH)}>{L.warehouse || "Warehouse"} * <span style={{color:TH.textDim, fontSize:9, textTransform:"none"}}>(sorted by stock)</span></label>
              <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} disabled={busy} style={inp(TH)}>
                {stockRows.length === 0 && <option value="">{L.noStock || "Out of stock in all warehouses"}</option>}
                {stockRows.map(r => (
                  <option key={r.warehouse_id} value={r.warehouse_id}>
                    {r.warehouse_name} — {r.qty} {selectedItem.unit}{r.can_fulfill ? '' : ' ⚠'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl(TH)}>{L.qty || "Qty"} *</label>
              <input type="number" step="0.01" min="0" value={qty} onChange={e => setQty(e.target.value)} disabled={busy}
                style={{...inp(TH), borderColor: insufficient ? '#C43D3D' : TH.border}} />
            </div>
          </div>
        )}
        {insufficient && (
          <div style={{fontSize:11, color:"#C43D3D", marginBottom:10, marginTop:-6}}>
            ⚠ {L.insufficientStock || "Insufficient stock in this warehouse."}
          </div>
        )}

        {/* Destination type tabs */}
        {selectedItem && (
          <>
            <div style={{marginBottom:8, fontSize:11, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px"}}>{L.destination || "Destination"} *</div>
            <div style={{display:"flex", gap:6, marginBottom:10, flexWrap:"wrap"}}>
              {[
                { k: "pool", icon: "🏊", label: L.pool || "Pool" },
                { k: "department", icon: "🏢", label: L.department || "Department" },
                { k: "user", icon: "👤", label: L.user || "User" },
                { k: "other", icon: "📝", label: L.other || "Other" },
              ].map(t => (
                <button key={t.k} onClick={() => setDestType(t.k)} disabled={busy} style={{
                  flex:1, minWidth:80,
                  background: destType === t.k ? TH.accentBg : "transparent",
                  border:`1px solid ${destType === t.k ? TH.accentBorder : TH.border}`,
                  borderRadius:8, color: destType === t.k ? TH.accentText : TH.textMuted,
                  padding:"8px 6px", cursor:"pointer", fontSize:12, fontWeight:destType === t.k ? 700 : 500,
                  fontFamily:"inherit",
                }}>{t.icon} {t.label}</button>
              ))}
            </div>

            {/* Destination-specific selector */}
            {destType === 'pool' && (
              <div style={{marginBottom:12}}>
                <select value={destPoolId} onChange={e => setDestPoolId(e.target.value)} disabled={busy} style={inp(TH)}>
                  <option value="">— Select pool —</option>
                  {pools.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
            )}
            {destType === 'department' && (
              <div style={{marginBottom:12}}>
                <select value={destDeptId} onChange={e => setDestDeptId(e.target.value)} disabled={busy} style={inp(TH)}>
                  <option value="">— Select department —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
                </select>
              </div>
            )}
            {destType === 'user' && (
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12}}>
                <div>
                  <label style={miniLbl(TH)}>{L.selectUser || "System user"}</label>
                  <select value={destUserId} onChange={e => setDestUserId(e.target.value)} disabled={busy} style={inp(TH)}>
                    <option value="">— Or enter name →</option>
                    {users.map(u => <option key={u.user_id} value={u.user_id}>{u.display_name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={miniLbl(TH)}>{L.orName || "Or free-text name"}</label>
                  <input value={destPersonName} onChange={e => setDestPersonName(e.target.value)} disabled={busy} placeholder="Person's name" style={inp(TH)} />
                </div>
              </div>
            )}
            {destType === 'other' && (
              <div style={{marginBottom:12}}>
                <input value={destPersonName} onChange={e => setDestPersonName(e.target.value)} disabled={busy} placeholder={L.recipientPh || "Recipient / description"} style={inp(TH)} />
              </div>
            )}

            {/* Reason + notes */}
            <div style={{marginBottom:10}}>
              <label style={lbl(TH)}>{L.reason || "Reason"}</label>
              <input value={reason} onChange={e => setReason(e.target.value)} disabled={busy} placeholder={L.reasonPh || "e.g. daily pool treatment"} style={inp(TH)} />
            </div>
            <div style={{marginBottom:14}}>
              <label style={lbl(TH)}>{L.notes || "Notes"}</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={busy} rows={2} style={{...inp(TH), resize:"vertical"}} placeholder="Optional" />
            </div>
          </>
        )}

        {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:8, padding:"10px 12px", color:"#C43D3D", fontSize:12, marginBottom:10}}>{error}</div>}

        <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
          <button onClick={onClose} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>{L.cancel || "Cancel"}</button>
          <button onClick={submit} disabled={busy || !selectedItem || insufficient} style={{background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:9, color:"#000", padding:"10px 24px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit", opacity: (busy || !selectedItem || insufficient) ? 0.6 : 1}}>
            {busy ? (L.dispensing || "Dispensing…") : (L.confirmDispense || "Confirm dispense")}
          </button>
        </div>
      </div>
    </div>
  );
}

function lbl(TH)  { return { display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }; }
function miniLbl(TH) { return { display:"block", color:TH.textMuted, fontSize:10, marginBottom:3, fontWeight:600, textTransform:"uppercase" }; }
function inp(TH) { return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"10px 12px", color:TH.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }; }
