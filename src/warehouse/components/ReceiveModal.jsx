// ═══════════════════════════════════════════════════════════════════
// ReceiveModal.jsx — receive consumable into warehouse (Stock IN)
// Mirror of DispenseModal: item + warehouse + qty + source + supplier + PO + cost + batch/expiry + photo + notes
// Uses RPC: receive_consumable
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";

const SOURCE_TYPES = [
  { key: "supplier",   labelEn: "From supplier",     labelFa: "از تامین‌کننده",     icon: "" },
  { key: "return",     labelEn: "Return to stock",   labelFa: "بازگشت به انبار",    icon: "" },
  { key: "transfer",   labelEn: "Transfer in",       labelFa: "انتقال از انبار",   icon: "" },
  { key: "initial",    labelEn: "Initial stock",     labelFa: "موجودی اولیه",      icon: "" },
  { key: "correction", labelEn: "Count correction",  labelFa: "اصلاح شمارش",       icon: "" },
];

export default function ReceiveModal({ TH, lang = "en", presetItemId = null, onClose, onDone }) {
  const L = tr(lang);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Item search
  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  // Warehouse + qty
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [qty, setQty] = useState("");

  // Source
  const [sourceType, setSourceType] = useState("supplier");
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");   // free text override
  const [pools, setPools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [returnPoolId, setReturnPoolId] = useState("");
  const [returnDeptId, setReturnDeptId] = useState("");
  const [transferFromWh, setTransferFromWh] = useState("");

  // Financial + batch
  const [unitCost, setUnitCost] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  // Photo (invoice / delivery note)
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [notes, setNotes] = useState("");

  // ─── Load lookups ─────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      supabase.from('warehouses').select('id, code, name').eq('is_active', true).order('id'),
      supabase.from('suppliers').select('id, name').eq('is_active', true).order('name'),
      supabase.from('pools').select('id, code, name').eq('is_active', true).order('code'),
      supabase.from('procurement_departments').select('id, name').eq('is_active', true).order('name'),
    ]).then(([rW, rS, rP, rD]) => {
      setWarehouses(rW.data || []);
      setSuppliers(rS.data || []);
      setPools(rP.data || []);
      setDepartments(rD.data || []);
      if (rW.data?.length) setWarehouseId(String(rW.data[0].id));
    });

    if (presetItemId) {
      supabase.from('items').select('*').eq('id', presetItemId).single().then(({ data }) => {
        if (data) selectItem(data);
      });
    }
  }, [presetItemId]);

  // ─── Debounced item search ────────────────────────────────────
  useEffect(() => {
    if (selectedItem) return;
    if (!itemSearch.trim()) { setItemResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('items')
        .select('id, name, code, category, unit, current_qty, last_unit_cost, default_supplier_id')
        .ilike('name', `%${itemSearch.trim()}%`)
        .eq('is_active', true)
        .order('name')
        .limit(10);
      setItemResults(data || []);
    }, 200);
    return () => clearTimeout(t);
  }, [itemSearch, selectedItem]);

  function selectItem(item) {
    setSelectedItem(item);
    setItemSearch(item.name);
    setItemResults([]);
    // Auto-fill unit cost from last known price
    if (item.last_unit_cost != null) setUnitCost(String(item.last_unit_cost));
    // Auto-pick default supplier
    if (item.default_supplier_id) setSupplierId(String(item.default_supplier_id));
  }

  function clearItem() {
    setSelectedItem(null);
    setItemSearch("");
    setUnitCost("");
  }

  async function onPhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function uploadPhoto() {
    if (!photoFile) return null;
    setUploadingPhoto(true);
    try {
      const ext = photoFile.name.split('.').pop() || 'jpg';
      const filename = `receipts/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const { error: e } = await supabase.storage
        .from('asset-photos')
        .upload(filename, photoFile, { cacheControl: '3600', upsert: false });
      if (e) throw e;
      const { data } = supabase.storage.from('asset-photos').getPublicUrl(filename);
      return data.publicUrl;
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function submit() {
    setError(null);
    if (!selectedItem) return setError(L.pickItem || "Pick an item first");
    if (!warehouseId) return setError(L.pickWarehouse || "Pick a warehouse");
    if (!qty || Number(qty) <= 0) return setError(L.needQty || "Enter a quantity");
    if (sourceType === 'supplier' && !supplierId && !supplierName.trim())
      return setError("Pick a supplier or type a name");
    if (sourceType === 'return' && !returnPoolId && !returnDeptId)
      return setError("Pick pool or department to return from");

    setBusy(true);
    try {
      // Upload photo first if provided
      let photoUrl = null;
      if (photoFile) {
        try { photoUrl = await uploadPhoto(); } catch (e) { console.warn('Photo upload failed:', e); }
      }

      const { error: e } = await supabase.rpc('receive_consumable', {
        p_item_id:      selectedItem.id,
        p_warehouse_id: Number(warehouseId),
        p_qty:          Number(qty),
        p_source_type:  sourceType,
        p_supplier_id:  sourceType === 'supplier' && supplierId ? Number(supplierId) : null,
        p_supplier_name: sourceType === 'supplier' ? (supplierName.trim() || null) : null,
        p_reference_no: referenceNo.trim() || null,
        p_unit_cost:    unitCost ? Number(unitCost) : null,
        p_batch_number: batchNo.trim() || null,
        p_expires_at:   expiresAt || null,
        p_photo_url:    photoUrl,
        p_notes:        notes.trim() || null,
        p_return_from_pool_id:       sourceType === 'return' && returnPoolId ? Number(returnPoolId) : null,
        p_return_from_department_id: sourceType === 'return' && returnDeptId ? Number(returnDeptId) : null,
      });
      if (e) throw e;
      onDone?.();
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  }

  const total = (qty && unitCost) ? (Number(qty) * Number(unitCost)).toFixed(2) : null;

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:20, width:"100%", maxWidth:600, maxHeight:"92vh", overflowY:"auto"}}>

        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
          <div style={{fontSize:16, fontWeight:800, color:TH.text, fontFamily:"'Playfair Display', Georgia, serif"}}>
            ↓ {L.receiveTitle || "Receive stock"}
          </div>
          <button onClick={onClose} disabled={busy} style={{background:"transparent", border:"none", color:TH.textMuted, fontSize:22, cursor:"pointer", padding:4, lineHeight:1}}>×</button>
        </div>

        {/* Item selector */}
        <div style={{marginBottom:12}}>
          <label style={lbl(TH)}>{L.item || "Item"} *</label>
          {!selectedItem ? (
            <div style={{position:"relative"}}>
              <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder={L.searchItem || "Start typing an item name…"} autoFocus style={inp(TH)} />
              {itemResults.length > 0 && (
                <div style={{position:"absolute", top:"100%", left:0, right:0, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:8, marginTop:4, maxHeight:220, overflowY:"auto", zIndex:10}}>
                  {itemResults.map(it => (
                    <div key={it.id} onClick={() => selectItem(it)} style={{padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${TH.border}`}}
                         onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
                         onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{fontSize:13, fontWeight:700, color:TH.text}}>{it.name}</div>
                      <div style={{fontSize:10, color:TH.textMuted}}>{it.category ? `${it.category} · ` : ''}Current: {it.current_qty} {it.unit}{it.last_unit_cost ? ` · Last: €${it.last_unit_cost}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{background:TH.bgInput, borderRadius:8, padding:"10px 12px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div>
                <div style={{fontSize:13, fontWeight:700, color:TH.text}}>{selectedItem.name}</div>
                <div style={{fontSize:10, color:TH.textMuted}}>{selectedItem.code ? `${selectedItem.code} · ` : ''}Unit: {selectedItem.unit} · Current: {selectedItem.current_qty}</div>
              </div>
              <button onClick={clearItem} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"4px 10px", cursor:"pointer", fontSize:11}}>{L.change || "Change"}</button>
            </div>
          )}
        </div>

        {selectedItem && (<>

          {/* Warehouse + qty */}
          <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:12}}>
            <div>
              <label style={lbl(TH)}>{L.warehouse || "Warehouse"} *</label>
              <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} disabled={busy} style={inp(TH)}>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl(TH)}>{L.qty || "Qty"} * <span style={{color:TH.textDim, fontSize:9, textTransform:"none"}}>{selectedItem.unit}</span></label>
              <input type="number" step="0.01" min="0" value={qty} onChange={e => setQty(e.target.value)} disabled={busy} style={inp(TH)} />
            </div>
          </div>

          {/* Source type */}
          <div style={{marginBottom:8, fontSize:11, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px"}}>{L.source || "Source"} *</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(110px, 1fr))", gap:6, marginBottom:12}}>
            {SOURCE_TYPES.map(s => (
              <button key={s.key} onClick={() => setSourceType(s.key)} disabled={busy} style={{
                background: sourceType === s.key ? TH.accentBg : "transparent",
                border: `1px solid ${sourceType === s.key ? TH.accentBorder : TH.border}`,
                borderRadius: 8, color: sourceType === s.key ? TH.accentText : TH.textMuted,
                padding: "8px 4px", cursor: "pointer", fontSize: 11, fontWeight: sourceType === s.key ? 700 : 500,
                fontFamily:"inherit",
              }}>{lang === 'fa' ? s.labelFa : s.labelEn}</button>
            ))}
          </div>

          {/* Source-specific fields */}
          {sourceType === 'supplier' && (
            <div style={{marginBottom:12}}>
              <label style={lbl(TH)}>{L.supplier || "Supplier"}</label>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                <select value={supplierId} onChange={e => { setSupplierId(e.target.value); setSupplierName(""); }} disabled={busy} style={inp(TH)}>
                  <option value="">— Pick from list —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input value={supplierName} onChange={e => { setSupplierName(e.target.value); setSupplierId(""); }} disabled={busy} placeholder="Or type name" style={inp(TH)} />
              </div>
            </div>
          )}

          {sourceType === 'return' && (
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12}}>
              <div>
                <label style={miniLbl(TH)}>Return from pool</label>
                <select value={returnPoolId} onChange={e => { setReturnPoolId(e.target.value); setReturnDeptId(""); }} disabled={busy} style={inp(TH)}>
                  <option value="">— none —</option>
                  {pools.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={miniLbl(TH)}>Return from dept</label>
                <select value={returnDeptId} onChange={e => { setReturnDeptId(e.target.value); setReturnPoolId(""); }} disabled={busy} style={inp(TH)}>
                  <option value="">— none —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {sourceType === 'transfer' && (
            <div style={{marginBottom:12}}>
              <label style={lbl(TH)}>Transfer from warehouse</label>
              <select value={transferFromWh} onChange={e => setTransferFromWh(e.target.value)} disabled={busy} style={inp(TH)}>
                <option value="">— pick source —</option>
                {warehouses.filter(w => String(w.id) !== warehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <div style={{fontSize:10, color:TH.textDim, marginTop:4}}>Note: this only records the IN side. You must also dispense from the source warehouse manually.</div>
            </div>
          )}

          {/* Reference + cost */}
          <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:12}}>
            <div>
              <label style={lbl(TH)}>{L.referenceNo || "PO / delivery note"}</label>
              <input value={referenceNo} onChange={e => setReferenceNo(e.target.value)} disabled={busy} placeholder="e.g. PO-2026-042" style={inp(TH)} />
            </div>
            <div>
              <label style={lbl(TH)}>{L.unitCost || "Unit cost"} <span style={{color:TH.textDim, fontSize:9, textTransform:"none"}}>€</span></label>
              <input type="number" step="0.0001" min="0" value={unitCost} onChange={e => setUnitCost(e.target.value)} disabled={busy} style={inp(TH)} />
            </div>
          </div>

          {total && (
            <div style={{background:TH.bgInput, border:`1px dashed ${TH.border}`, borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:12, color:TH.textMuted, textAlign:"right"}}>
              Total: <span style={{color:TH.accent, fontWeight:800, fontSize:14}}>€{total}</span>
            </div>
          )}

          {/* Batch / expiry (chemicals) */}
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12}}>
            <div>
              <label style={lbl(TH)}>{L.batchNo || "Batch / Lot"}</label>
              <input value={batchNo} onChange={e => setBatchNo(e.target.value)} disabled={busy} placeholder="Optional" style={inp(TH)} />
            </div>
            <div>
              <label style={lbl(TH)}>{L.expiresAt || "Expires"}</label>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} disabled={busy} style={inp(TH)} />
            </div>
          </div>

          {/* Photo */}
          <div style={{marginBottom:12}}>
            <label style={lbl(TH)}>{L.invoicePhoto || "Invoice / delivery photo"}</label>
            {photoPreview ? (
              <div style={{position:"relative", display:"inline-block"}}>
                <img src={photoPreview} alt="preview" style={{width:120, height:120, objectFit:"cover", borderRadius:8, border:`1px solid ${TH.border}`}} />
                <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} disabled={busy} style={{position:"absolute", top:-6, right:-6, background:"#C43D3D", color:"#fff", border:"none", borderRadius:"50%", width:22, height:22, cursor:"pointer", fontSize:11, fontWeight:800}}>×</button>
              </div>
            ) : (
              <label style={{display:"inline-block", cursor:"pointer", background:"transparent", border:`1px dashed ${TH.border}`, borderRadius:8, padding:"14px 20px", color:TH.textMuted, fontSize:12}}>
                📷 Take / choose photo
                <input type="file" accept="image/*" capture="environment" onChange={onPhotoChange} style={{display:"none"}} />
              </label>
            )}
          </div>

          {/* Notes */}
          <div style={{marginBottom:14}}>
            <label style={lbl(TH)}>{L.notes || "Notes"}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={busy} rows={2} style={{...inp(TH), resize:"vertical"}} placeholder="Optional" />
          </div>
        </>)}

        {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:8, padding:"10px 12px", color:"#C43D3D", fontSize:12, marginBottom:10}}>{error}</div>}

        <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
          <button onClick={onClose} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>{L.cancel || "Cancel"}</button>
          <button onClick={submit} disabled={busy || !selectedItem} style={{background:"linear-gradient(135deg,#7A9A5B,#5B7A44)", border:"none", borderRadius:9, color:"#fff", padding:"10px 24px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit", opacity:(busy || !selectedItem)?0.6:1}}>
            {busy ? (uploadingPhoto ? "Uploading photo…" : (L.receiving || "Receiving…")) : (L.confirmReceive || "Confirm receive")}
          </button>
        </div>
      </div>
    </div>
  );
}

function lbl(TH)     { return { display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }; }
function miniLbl(TH) { return { display:"block", color:TH.textMuted, fontSize:10, marginBottom:3, fontWeight:600, textTransform:"uppercase" }; }
function inp(TH)     { return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"10px 12px", color:TH.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }; }
