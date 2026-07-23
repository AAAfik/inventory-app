// ═══════════════════════════════════════════════════════════════════
// NewOperationModal.jsx — log a pool operation
// Type: cleaning / chemical_dosing / maintenance / filter_change
// If chemicals used  auto-deducts from warehouse via log_pool_operation RPC
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";

const OP_TYPES = [
  { k: 'cleaning',        label: 'Cleaning',        color: '#7BB3D4' },
  { k: 'chemical_dosing', label: 'Chemical Dosing', color: '#B8935A' },
  { k: 'maintenance',     label: 'Maintenance',     color: '#8B7040' },
  { k: 'filter_change',   label: 'Filter Change',   color: '#B8862C' },
];

const FILTER_TYPES = ['sand', 'cartridge', 'de', 'glass', 'zeolite', 'other'];
const MAX_PHOTO_MB = 15;

export default function NewOperationModal({ TH, lang = "en", isMobile, presetPoolId = null, onClose, onDone }) {
  const [pools, setPools]       = useState([]);
  const [items, setItems]       = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [poolId, setPoolId]     = useState(presetPoolId || "");
  const [opType, setOpType]     = useState('chemical_dosing');
  const [notes, setNotes]       = useState("");
  const [phBefore, setPhBefore]     = useState("");
  const [phAfter, setPhAfter]       = useState("");
  const [chlBefore, setChlBefore]   = useState("");
  const [chlAfter, setChlAfter]     = useState("");

  const [filterType, setFilterType]   = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterDate, setFilterDate]   = useState(() => new Date().toISOString().slice(0, 10));

  // Chemicals list (dynamic)
  const [chemicals, setChemicals] = useState([]);   // [{item_id, warehouse_id, qty, item_name, unit, stock}]

  // Photos
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const fileRef = useRef(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from('pools').select('id, code, name, filter_type').eq('is_active', true).order('code'),
      supabase.from('items').select('id, name, unit, category, current_qty').gt('current_qty', 0).order('name'),
      supabase.from('warehouses').select('id, code, name').eq('is_active', true).order('code'),
    ]).then(([rP, rI, rW]) => {
      setPools(rP.data || []);
      setItems(rI.data || []);
      setWarehouses(rW.data || []);
    });
  }, []);

  useEffect(() => {
    return () => { photoPreviews.forEach(url => URL.revokeObjectURL(url)); };
    // eslint-disable-next-line
  }, []);

  function pickPhotos(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const valid = files.filter(f => f.size <= MAX_PHOTO_MB * 1024 * 1024);
    setPhotoFiles([...photoFiles, ...valid]);
    setPhotoPreviews([...photoPreviews, ...valid.map(f => URL.createObjectURL(f))]);
    if (fileRef.current) fileRef.current.value = "";
  }
  function removePhoto(i) {
    URL.revokeObjectURL(photoPreviews[i]);
    setPhotoFiles(photoFiles.filter((_, x) => x !== i));
    setPhotoPreviews(photoPreviews.filter((_, x) => x !== i));
  }

  function addChemical() {
    setChemicals([...chemicals, { item_id: "", warehouse_id: "", qty: "" }]);
  }
  function updateChemical(i, field, val) {
    setChemicals(chemicals.map((c, x) => x === i ? { ...c, [field]: val } : c));
  }
  function removeChemical(i) {
    setChemicals(chemicals.filter((_, x) => x !== i));
  }

  async function loadStockForItem(itemId, chemIdx) {
    if (!itemId) return;
    const { data } = await supabase.rpc('find_stock_across_warehouses', {
      p_item_id: Number(itemId), p_qty_needed: null,
    });
    setChemicals(prev => prev.map((c, x) => x === chemIdx ? { ...c, stockRows: data || [] } : c));
    // Auto-pick warehouse with most stock
    if (data && data.length) {
      updateChemical(chemIdx, 'warehouse_id', String(data[0].warehouse_id));
    }
  }

  async function submit() {
    if (!poolId) { setError("Pick a pool"); return; }

    // Validate chemicals for dosing op
    if (opType === 'chemical_dosing' && chemicals.length === 0) {
      setError("Chemical dosing requires at least one chemical"); return;
    }
    for (const c of chemicals) {
      if (!c.item_id || !c.warehouse_id || !c.qty || Number(c.qty) <= 0) {
        setError("Every chemical row needs item, warehouse, and positive qty"); return;
      }
    }

    setBusy(true); setError(null);
    try {
      // Upload photos first
      const uploadedUrls = [];
      const stamp = Date.now();
      for (let i = 0; i < photoFiles.length; i++) {
        const f = photoFiles[i];
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${poolId}/op-${stamp}-${String(i+1).padStart(2,'0')}.${ext}`;
        const { error: upErr } = await supabase.storage.from('pool-photos').upload(path, f, { upsert: true, contentType: f.type });
        if (upErr) throw new Error(`Photo ${i+1}: ${upErr.message}`);
        const { data: urlData } = supabase.storage.from('pool-photos').getPublicUrl(path);
        if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
      }

      // Build measurements object
      const measurements = {};
      if (phBefore)   measurements.ph_before = Number(phBefore);
      if (phAfter)    measurements.ph_after  = Number(phAfter);
      if (chlBefore)  measurements.chlorine_before = Number(chlBefore);
      if (chlAfter)   measurements.chlorine_after  = Number(chlAfter);

      // Build chemicals array for RPC
      const chemArr = chemicals.map(c => ({
        item_id:      Number(c.item_id),
        warehouse_id: Number(c.warehouse_id),
        qty:          Number(c.qty),
      }));

      const { error: e } = await supabase.rpc('log_pool_operation', {
        p_pool_id:         Number(poolId),
        p_operation_type:  opType,
        p_notes:           notes.trim() || null,
        p_photos:          uploadedUrls,
        p_chemicals:       chemArr,
        p_measurements:    Object.keys(measurements).length > 0 ? measurements : null,
        p_filter_type:     opType === 'filter_change' ? filterType || null : null,
        p_filter_model:    opType === 'filter_change' ? filterModel.trim() || null : null,
        p_new_filter_date: opType === 'filter_change' && filterDate ? filterDate : null,
      });
      if (e) throw e;

      photoPreviews.forEach(url => URL.revokeObjectURL(url));
      onDone?.();
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  }

  const selectedOp = OP_TYPES.find(t => t.k === opType);

  return ( <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}><div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:20, width:"100%", maxWidth:640, maxHeight:"92vh", overflowY:"auto"}}><div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}><div style={{fontSize:16, fontWeight:800, color:TH.text, fontFamily:"'Playfair Display', Georgia, serif"}}>New pool operation </div><button onClick={onClose} disabled={busy} style={{background:"transparent", border:"none", color:TH.textMuted, fontSize:22, cursor:"pointer", padding:4, lineHeight:1}}></button></div>{/* Pool + Type */} <div style={{display:"grid", gridTemplateColumns:"1fr", gap:10, marginBottom:12}}><div><label style={lbl(TH)}>Pool *</label><select value={poolId} onChange={e => setPoolId(e.target.value)} disabled={busy || !!presetPoolId} style={inp(TH)}><option value="">— Select pool —</option>{pools.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)} </select></div></div>{/* Operation type buttons */} <div style={{marginBottom:12}}><label style={lbl(TH)}>Operation type *</label><div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6}}>{OP_TYPES.map(t => {
              const on = opType === t.k;
              return ( <button key={t.k} onClick={() => setOpType(t.k)} disabled={busy} style={{
                  background: on ? t.color + "22" : "transparent",
                  border: `2px solid ${on ? t.color : TH.border}`,
                  borderRadius: 10, color: on ? t.color : TH.textMuted,
                  padding: "10px 4px", cursor: "pointer", fontSize: 10, fontWeight: on ? 800 : 500,
                  fontFamily: "inherit", display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                }}><div>{t.label}</div></button>);
            })} </div></div>{/* Chemical dosing measurements */}
        {opType === 'chemical_dosing' && ( <div style={{marginBottom:12, padding:10, background:TH.bgInput, borderRadius:10}}><div style={{fontSize:11, fontWeight:800, color:selectedOp.color, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em"}}> Water measurements</div><div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6}}><div><label style={miniLbl(TH)}>pH before</label><input type="number" step="0.1" value={phBefore} onChange={e => setPhBefore(e.target.value)} disabled={busy} style={smInp(TH)} /></div><div><label style={miniLbl(TH)}>pH after</label><input type="number" step="0.1" value={phAfter} onChange={e => setPhAfter(e.target.value)} disabled={busy} style={smInp(TH)} /></div><div><label style={miniLbl(TH)}>Cl before</label><input type="number" step="0.1" value={chlBefore} onChange={e => setChlBefore(e.target.value)} disabled={busy} style={smInp(TH)} /></div><div><label style={miniLbl(TH)}>Cl after</label><input type="number" step="0.1" value={chlAfter} onChange={e => setChlAfter(e.target.value)} disabled={busy} style={smInp(TH)} /></div></div></div>)}

        {/* Filter change details */}
        {opType === 'filter_change' && ( <div style={{marginBottom:12, padding:10, background:TH.bgInput, borderRadius:10}}><div style={{fontSize:11, fontWeight:800, color:selectedOp.color, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em"}}> Filter details</div><div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6}}><div><label style={miniLbl(TH)}>New filter type</label><select value={filterType} onChange={e => setFilterType(e.target.value)} disabled={busy} style={smInp(TH)}><option value="">—</option>{FILTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)} </select></div><div><label style={miniLbl(TH)}>Model</label><input value={filterModel} onChange={e => setFilterModel(e.target.value)} disabled={busy} style={smInp(TH)} /></div><div><label style={miniLbl(TH)}>Changed on</label><input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} disabled={busy} style={smInp(TH)} /></div></div></div>)}

        {/* Chemicals used */} <div style={{marginBottom:12, padding:10, background:TH.bgInput, borderRadius:10}}><div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}><div style={{fontSize:11, fontWeight:800, color:TH.text, textTransform:"uppercase", letterSpacing:"0.05em"}}> Chemicals used ({chemicals.length})</div><button onClick={addChemical} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"4px 10px", cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:"inherit"}}>+ Add chemical</button></div>{chemicals.map((c, i) => {
            const item = items.find(it => String(it.id) === String(c.item_id));
            return ( <div key={i} style={{background:TH.bgCard, borderRadius:8, padding:8, marginBottom:6, display:"grid", gridTemplateColumns:"2fr 1.5fr 80px auto", gap:6, alignItems:"end"}}><div><label style={miniLbl(TH)}>Item</label><select value={c.item_id} onChange={e => { updateChemical(i, 'item_id', e.target.value); loadStockForItem(e.target.value, i); }} disabled={busy} style={smInp(TH)}><option value="">— Select —</option>{items.map(it => <option key={it.id} value={it.id}>{it.name} ({it.current_qty} {it.unit})</option>)} </select></div><div><label style={miniLbl(TH)}>Warehouse</label><select value={c.warehouse_id} onChange={e => updateChemical(i, 'warehouse_id', e.target.value)} disabled={busy || !c.stockRows} style={smInp(TH)}><option value="">—</option>{(c.stockRows || warehouses.map(w => ({ warehouse_id: w.id, warehouse_name: w.name, qty: 0 }))).map(r => ( <option key={r.warehouse_id} value={r.warehouse_id}>{r.warehouse_name}{r.qty > 0 ? ` (${r.qty})` : ''} </option>))} </select></div><div><label style={miniLbl(TH)}>Qty {item?.unit ? `(${item.unit})` : ''}</label><input type="number" step="0.01" min="0" value={c.qty} onChange={e => updateChemical(i, 'qty', e.target.value)} disabled={busy} style={smInp(TH)} /></div><button onClick={() => removeChemical(i)} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:"#C43D3D", padding:"6px 10px", cursor:"pointer", fontSize:12}}></button></div>);
          })}
          {chemicals.length === 0 && <div style={{fontSize:11, color:TH.textDim, textAlign:"center", padding:8}}>No chemicals added</div>} </div>{/* Photos */} <div style={{marginBottom:12}}><label style={lbl(TH)}>Photos ({photoFiles.length})</label><div style={{display:"flex", gap:6, flexWrap:"wrap"}}>{photoPreviews.map((src, i) => ( <div key={i} style={{position:"relative", flexShrink:0, borderRadius:8, overflow:"hidden", border:`1px solid ${TH.border}`, background:"#000"}}><img src={src} alt="" style={{width:60, height:60, objectFit:"cover", display:"block"}} /><button onClick={() => removePhoto(i)} disabled={busy} style={{position:"absolute", top:2, right:2, background:"rgba(0,0,0,0.75)", border:"none", borderRadius:10, width:18, height:18, color:"#fff", cursor:"pointer", fontSize:10, padding:0, lineHeight:1}}></button></div>))} <button onClick={() => fileRef.current?.click()} disabled={busy} style={{flexShrink:0, width:60, height:60, background:"transparent", border:`2px dashed ${TH.border}`, borderRadius:8, color:TH.textMuted, cursor:"pointer", fontSize:22, fontFamily:"inherit"}}>+</button><input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={pickPhotos} style={{display:"none"}} /></div></div>{/* Notes */} <div style={{marginBottom:14}}><label style={lbl(TH)}>Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={busy} rows={2} style={{...inp(TH), resize:"vertical"}} placeholder="Optional" /></div>{error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:8, padding:"10px 12px", color:"#C43D3D", fontSize:12, marginBottom:10}}>{error}</div>} <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}><button onClick={onClose} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>Cancel</button><button onClick={submit} disabled={busy} style={{background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:9, color:"#000", padding:"10px 24px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit", opacity:busy?0.6:1}}>{busy ? "Saving…" : "Save operation"} </button></div></div></div>);
}

function lbl(TH)  { return { display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }; }
function miniLbl(TH) { return { display:"block", color:TH.textMuted, fontSize:9, marginBottom:3, fontWeight:600, textTransform:"uppercase" }; }
function inp(TH) { return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"10px 12px", color:TH.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }; }
function smInp(TH) { return { ...inp(TH), padding:"6px 10px", fontSize:12 }; }
