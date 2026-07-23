// ═══════════════════════════════════════════════════════════════════
// QuickAddTab.jsx — mobile-first quick registration
// All 7 asset kinds + Consumables (routed to `items` table)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { ASSET_KINDS, nextAssetNo } from "../lib/warehouseUtils";

const CONSUMABLE_META = { icon: "🧴", label: "Consumable", color: "#7BB3D4" };

// All available kinds shown in the picker
function allKinds() {
  return {
    ...ASSET_KINDS,
    consumable: CONSUMABLE_META,
  };
}

const UNIT_OPTIONS = [
  { value: "unit",   label: "unit / pcs" },
  { value: "kg",     label: "kg" },
  { value: "g",      label: "g" },
  { value: "l",      label: "liter" },
  { value: "ml",     label: "ml" },
  { value: "m",      label: "meter" },
  { value: "box",    label: "box" },
  { value: "bottle", label: "bottle" },
  { value: "roll",   label: "roll" },
  { value: "bag",    label: "bag" },
  { value: "set",    label: "set" },
];

export default function QuickAddTab({ TH, lang = "en", isMobile, onSaved }) {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Common form state
  const [kind, setKind]             = useState("equipment");
  const [photoFile, setPhotoFile]   = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [name, setName]             = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes]           = useState("");

  // Asset-specific
  const [brand, setBrand]           = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  // Consumable-specific
  const [category, setCategory]     = useState("");
  const [unit, setUnit]             = useState("unit");
  const [initialQty, setInitialQty] = useState("");
  const [cost, setCost]             = useState("");
  const [minQty, setMinQty]         = useState("");

  const fileInputRef = useRef(null);
  const isConsumable = kind === "consumable";

  useEffect(() => { loadWarehouses(); }, []);

  async function loadWarehouses() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('warehouses').select('id, code, name').eq('is_active', true).order('code');
      if (error) throw error;
      setWarehouses(data || []);
      if (data?.length && !warehouseId) setWarehouseId(data[0].id);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function onFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Photo too large (max 10 MB).");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError(null);
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetForm() {
    clearPhoto();
    setName(""); setBrand(""); setSerialNumber(""); setNotes("");
    setCategory(""); setUnit("unit"); setInitialQty(""); setCost(""); setMinQty("");
    setSuccess(null);
  }

  async function submit() {
    setSubmitting(true); setError(null);
    try {
      if (!name.trim())    throw new Error("Name is required.");
      if (!warehouseId)    throw new Error("Warehouse is required.");
      if (!isConsumable && !photoFile) throw new Error("Photo is required for assets.");

      const { data: { user } } = await supabase.auth.getUser();

      if (isConsumable) {
        // ─── Consumable path ────────────────────────────────────
        const qty = Number(initialQty) || 0;

        // Optional photo upload
        let photoUrl = null;
        if (photoFile) {
          const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
          const path = `consumable-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from('asset-photos').upload(path, photoFile, { upsert: true, contentType: photoFile.type });
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('asset-photos').getPublicUrl(path);
            photoUrl = urlData?.publicUrl || null;
          }
        }

        // Insert into items catalog
        const { data: itemRow, error: iErr } = await supabase.from('items').insert([{
          name: name.trim(),
          category: category.trim() || null,
          unit,
          current_qty: qty,
          min_qty: minQty ? Number(minQty) : 0,
          cost: cost ? Number(cost) : null,
          notes: [notes.trim(), photoUrl ? `photo: ${photoUrl}` : null].filter(Boolean).join(' | ') || null,
          created_by: user?.id,
        }]).select().single();
        if (iErr) throw iErr;

        // Per-warehouse stock row
        if (qty > 0 || minQty) {
          const { error: sErr } = await supabase.from('consumable_stock').insert([{
            item_id: itemRow.id,
            warehouse_id: Number(warehouseId),
            qty,
            min_qty: minQty ? Number(minQty) : null,
          }]);
          if (sErr) console.warn('Stock insert failed:', sErr.message);
        }

        // Log initial movement
        if (qty > 0) {
          const { error: mErr } = await supabase.from('consumable_movements').insert([{
            item_id: itemRow.id,
            warehouse_id: Number(warehouseId),
            movement_type: 'in',
            qty,
            unit,
            reason: 'Initial stock',
            performed_by: user?.id,
          }]);
          if (mErr) console.warn('Movement insert failed:', mErr.message);
        }

        setSuccess(`✓ Consumable "${name.trim()}" added${qty > 0 ? ` · ${qty} ${unit}` : ''}!`);
      } else {
        // ─── Asset path (existing flow) ─────────────────────────
        const asset_no = await nextAssetNo(supabase, kind);
        const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
        const photoPath = `${asset_no}.${ext}`;
        const { error: upErr } = await supabase.storage.from('asset-photos').upload(photoPath, photoFile, { upsert: true, contentType: photoFile.type });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('asset-photos').getPublicUrl(photoPath);
        const photoUrl = urlData?.publicUrl;

        const { error: dbErr } = await supabase.from('assets').insert([{
          asset_no, kind,
          name: name.trim(),
          brand: brand.trim() || null,
          serial_number: serialNumber.trim() || null,
          warehouse_id: Number(warehouseId),
          photo_url: photoUrl,
          qr_code_data: asset_no,
          notes: notes.trim() || null,
          created_by: user?.id,
        }]);
        if (dbErr) throw dbErr;
        setSuccess(`✓ ${asset_no} registered!`);
      }

      setTimeout(() => { resetForm(); if (onSaved) onSaved(); }, 1500);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  // Success screen
  if (success) {
    return (
      <div style={{padding:"40px 20px", textAlign:"center", background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12}}>
        <div style={{fontSize:60, marginBottom:16}}>✅</div>
        <div style={{fontSize:20, fontWeight:800, color:"#B8935A", marginBottom:8}}>Success!</div>
        <div style={{fontSize:14, color:TH.text}}>{success}</div>
        <div style={{fontSize:12, color:TH.textMuted, marginTop:12}}>Preparing next…</div>
      </div>
    );
  }

  const kinds = allKinds();
  const submitDisabled = submitting || !name.trim() || !warehouseId || (!isConsumable && !photoFile);

  return (
    <div>
      {/* Kind picker — all 8 kinds in responsive grid */}
      <div style={{marginBottom:14}}>
        <label style={{display:"block", color:TH.textMuted, fontSize:12, marginBottom:8, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px"}}>Type *</label>
        <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(2, 1fr)":"repeat(4, 1fr)", gap:8}}>
          {Object.entries(kinds).map(([k, meta]) => {
            const on = kind === k;
            const color = meta.color || "#B8935A";
            return (
              <button key={k} onClick={() => setKind(k)} style={{
                background: on ? color + "22" : "transparent",
                border: `2px solid ${on ? color : TH.border}`,
                borderRadius: 12, color: on ? color : TH.textMuted,
                padding: "12px 6px", cursor: "pointer", fontSize: 11, fontWeight: 700,
                fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                minHeight: 64,
              }}>
                <div style={{fontSize:22}}>{meta.icon}</div>
                <div>{meta.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Photo section */}
      {photoPreview ? (
        <div style={{position:"relative", marginBottom:14, borderRadius:14, overflow:"hidden", background:"#000", border:`1px solid ${TH.border}`}}>
          <img src={photoPreview} alt="" style={{width:"100%", maxHeight:isMobile?240:320, objectFit:"cover", display:"block"}} />
          <button onClick={clearPhoto} style={{position:"absolute", top:10, right:10, background:"rgba(0,0,0,0.7)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:8, color:"#fff", padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit"}}>
            🔄 Retake
          </button>
        </div>
      ) : (
        <div style={{marginBottom:14, padding:20, textAlign:"center", background:TH.bgCard, border:`2px dashed ${TH.border}`, borderRadius:12}}>
          <div style={{fontSize:isMobile?36:48, marginBottom:10}}>📸</div>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={onFileSelected} style={{display:"none"}} />
          <button onClick={() => fileInputRef.current?.click()} style={{background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:10, color:"#000", padding:"12px 24px", cursor:"pointer", fontSize:14, fontWeight:800, fontFamily:"inherit"}}>
            📷 {isConsumable ? "Add photo (optional)" : "Take photo *"}
          </button>
          {isConsumable && (
            <div style={{fontSize:11, color:TH.textDim, marginTop:8}}>Consumables don't require a photo.</div>
          )}
        </div>
      )}

      {error && <ErrorBox TH={TH}>{error}</ErrorBox>}

      {/* Name */}
      <div style={{marginBottom:12}}>
        <label style={lbl(TH)}>Name *</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={isConsumable ? 'e.g. "Chlorine tablets"' : 'e.g. "Pool filter pump #3"'}
          autoFocus
          style={{...inputStyle(TH), fontSize:16, padding:"14px 14px"}}
        />
      </div>

      {/* Warehouse */}
      <div style={{marginBottom:12}}>
        <label style={lbl(TH)}>Warehouse *</label>
        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} style={{...inputStyle(TH), fontSize:15, padding:"14px 14px"}}>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {/* Consumable-specific fields */}
      {isConsumable && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:14, marginBottom:14}}>
          <div style={{fontSize:12, fontWeight:700, color:"#7BB3D4", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.5px"}}>🧴 Consumable details</div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10}}>
            <div>
              <label style={lbl(TH)}>Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} style={inputStyle(TH)}>
                {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl(TH)}>Initial qty</label>
              <input type="number" step="0.01" min="0" value={initialQty} onChange={e => setInitialQty(e.target.value)} placeholder="0" style={inputStyle(TH)} />
            </div>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10}}>
            <div>
              <label style={lbl(TH)}>Category</label>
              <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Chemicals" style={inputStyle(TH)} />
            </div>
            <div>
              <label style={lbl(TH)}>Cost per unit</label>
              <input type="number" step="0.01" min="0" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" style={inputStyle(TH)} />
            </div>
          </div>

          <div>
            <label style={lbl(TH)}>Min qty (alert threshold)</label>
            <input type="number" step="0.01" min="0" value={minQty} onChange={e => setMinQty(e.target.value)} placeholder="Optional" style={inputStyle(TH)} />
          </div>
        </div>
      )}

      {/* Optional asset fields */}
      {!isConsumable && (
        <details style={{marginBottom:16, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:10, padding:14}}>
          <summary style={{cursor:"pointer", color:TH.textMuted, fontSize:13, fontWeight:600}}>+ More details (optional)</summary>
          <div style={{marginTop:12, display:"flex", flexDirection:"column", gap:10}}>
            <div>
              <label style={lbl(TH)}>Brand</label>
              <input value={brand} onChange={e => setBrand(e.target.value)} style={inputStyle(TH)} />
            </div>
            <div>
              <label style={lbl(TH)}>Serial / VIN / Plate</label>
              <input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} style={inputStyle(TH)} />
            </div>
            <div>
              <label style={lbl(TH)}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{...inputStyle(TH), resize:"vertical", minHeight:60}} />
            </div>
          </div>
        </details>
      )}

      {isConsumable && (
        <div style={{marginBottom:16}}>
          <label style={lbl(TH)}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional" style={{...inputStyle(TH), resize:"vertical", minHeight:60}} />
        </div>
      )}

      {/* Actions */}
      <div style={{display:"flex", gap:10, marginTop:20}}>
        <button onClick={resetForm} style={{flex:1, background:"transparent", border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, padding:"16px", cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"inherit"}}>
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitDisabled}
          style={{flex:2, background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:12, color:"#000", padding:"16px", cursor:"pointer", fontSize:16, fontWeight:800, fontFamily:"inherit", opacity: submitDisabled ? 0.5 : 1, boxShadow: submitting ? "none" : "0 4px 14px rgba(184,147,90,0.3)"}}
        >
          {submitting ? "Saving…" : `✓ Save ${isConsumable ? 'consumable' : 'asset'}`}
        </button>
      </div>

      <div style={{textAlign:"center", padding:12, fontSize:11, color:TH.textDim}}>
        {loading ? "Loading warehouses…" : `${warehouses.length} warehouses available`}
      </div>
    </div>
  );
}

function lbl(TH) { return { display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }; }
function inputStyle(TH) { return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"11px 12px", color:TH.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }; }
function ErrorBox({ TH, children }) { return <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:10, padding:"12px 14px", color:"#C43D3D", fontSize:13, marginBottom:14}}>{children}</div>; }
