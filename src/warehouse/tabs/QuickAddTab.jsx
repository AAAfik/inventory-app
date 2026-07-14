// ═══════════════════════════════════════════════════════════════════
// QuickAddTab.jsx — mobile-first quick asset registration
// ═══════════════════════════════════════════════════════════════════
// Big buttons, camera capture, one screen, done.

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { ASSET_KINDS, nextAssetNo } from "../lib/warehouseUtils";

export default function QuickAddTab({ TH, isMobile }) {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [step, setStep]             = useState(1); // 1=photo, 2=details
  const [photoFile, setPhotoFile]   = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [kind, setKind]             = useState("equipment");
  const [name, setName]             = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [brand, setBrand]           = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes]           = useState("");

  const fileInputRef = useRef(null);

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
      setError("Photo too large (max 10 MB). Try again.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError(null);
    setStep(2); // move to details
  }

  function resetForm() {
    setPhotoFile(null);
    setPhotoPreview(null);
    setName("");
    setBrand("");
    setSerialNumber("");
    setNotes("");
    setStep(1);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit() {
    setSubmitting(true); setError(null);
    try {
      if (!photoFile) throw new Error("Photo is required.");
      if (!name.trim()) throw new Error("Name is required.");
      if (!warehouseId) throw new Error("Warehouse is required.");

      const { data: { user } } = await supabase.auth.getUser();
      const asset_no = await nextAssetNo(supabase, kind);

      // Upload photo first
      const ext = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const photoPath = `${asset_no}.${ext}`;
      const { error: upErr } = await supabase.storage.from('asset-photos').upload(photoPath, photoFile, {
        upsert: true,
        contentType: photoFile.type,
      });
      if (upErr) throw upErr;

      // Get public URL
      const { data: urlData } = supabase.storage.from('asset-photos').getPublicUrl(photoPath);
      const photoUrl = urlData?.publicUrl;

      // Insert asset
      const { error: dbErr } = await supabase.from('assets').insert([{
        asset_no,
        kind,
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
      setTimeout(() => resetForm(), 1500);
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
        <div style={{fontSize:20, fontWeight:800, color:"#C9A960", marginBottom:8}}>Success!</div>
        <div style={{fontSize:14, color:TH.text}}>{success}</div>
        <div style={{fontSize:12, color:TH.textMuted, marginTop:12}}>Preparing for next asset...</div>
      </div>
    );
  }

  // Step 1: Take photo
  if (step === 1) {
    return (
      <div>
        <div style={{textAlign:"center", padding:"30px 20px", background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:16, marginBottom:16}}>
          <div style={{fontSize:isMobile?52:64, marginBottom:16}}>📸</div>
          <div style={{fontSize:isMobile?18:22, fontWeight:800, color:TH.text, marginBottom:8}}>Add new asset</div>
          <div style={{fontSize:13, color:TH.textMuted, marginBottom:24, padding:"0 10px"}}>
            Take a photo of the equipment, tool, or vehicle to start registering it.
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileSelected}
            style={{display:"none"}}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background:"linear-gradient(135deg,#C9A960,#8B7A44)",
              border:"none", borderRadius:16,
              color:"#000", padding:"20px 36px",
              cursor:"pointer", fontSize:18, fontWeight:800, fontFamily:"inherit",
              width: isMobile ? "100%" : "auto",
              boxShadow: "0 8px 24px rgba(201,169,96,0.3)",
            }}
          >
            📷 Take photo
          </button>
          <div style={{fontSize:11, color:TH.textDim, marginTop:12}}>Or select from gallery</div>
        </div>

        {error && <ErrorBox TH={TH}>{error}</ErrorBox>}

        <div style={{textAlign:"center", padding:16, fontSize:12, color:TH.textMuted}}>
          {loading ? "Loading warehouses..." : `${warehouses.length} warehouses available`}
        </div>
      </div>
    );
  }

  // Step 2: Fill details
  return (
    <div>
      {/* Photo preview at top */}
      <div style={{position:"relative", marginBottom:16, borderRadius:14, overflow:"hidden", background:"#000", border:`1px solid ${TH.border}`}}>
        <img src={photoPreview} alt="Asset" style={{width:"100%", maxHeight:isMobile?280:400, objectFit:"cover", display:"block"}} />
        <button
          onClick={() => setStep(1)}
          style={{
            position:"absolute", top:12, right:12,
            background:"rgba(0,0,0,0.7)", border:"1px solid rgba(255,255,255,0.3)",
            borderRadius:8, color:"#fff", padding:"6px 12px",
            cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit",
          }}
        >
          🔄 Retake
        </button>
      </div>

      {error && <ErrorBox TH={TH}>{error}</ErrorBox>}

      {/* Kind selector - big touch buttons */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8, marginBottom:14}}>
        {Object.entries(ASSET_KINDS).map(([k, meta]) => {
          const on = kind === k;
          return (
            <button key={k} onClick={() => setKind(k)} style={{
              background: on ? meta.color + "22" : "transparent",
              border: `2px solid ${on ? meta.color : TH.border}`,
              borderRadius: 12, color: on ? meta.color : TH.textMuted,
              padding: "14px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700,
              fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              minHeight: 70,
            }}>
              <div style={{fontSize:24}}>{meta.icon}</div>
              <div>{meta.label}</div>
            </button>
          );
        })}
      </div>

      {/* Name - primary field, big */}
      <div style={{marginBottom:12}}>
        <label style={{display:"block", color:TH.textMuted, fontSize:12, marginBottom:6, fontWeight:600}}>Name *</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder='e.g. "Pool filter pump #3"'
          autoFocus
          style={{
            width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`,
            borderRadius:10, padding:"14px 14px", color:TH.text, fontSize:16,
            outline:"none", fontFamily:"inherit", boxSizing:"border-box",
          }}
        />
      </div>

      {/* Warehouse */}
      <div style={{marginBottom:12}}>
        <label style={{display:"block", color:TH.textMuted, fontSize:12, marginBottom:6, fontWeight:600}}>Warehouse *</label>
        <select
          value={warehouseId}
          onChange={e => setWarehouseId(e.target.value)}
          style={{
            width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`,
            borderRadius:10, padding:"14px 14px", color:TH.text, fontSize:15,
            outline:"none", fontFamily:"inherit", boxSizing:"border-box",
          }}
        >
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {/* Optional fields */}
      <details style={{marginBottom:16, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:10, padding:14}}>
        <summary style={{cursor:"pointer", color:TH.textMuted, fontSize:13, fontWeight:600}}>+ More details (optional)</summary>
        <div style={{marginTop:12, display:"flex", flexDirection:"column", gap:10}}>
          <div>
            <label style={{display:"block", color:TH.textMuted, fontSize:11, marginBottom:4, fontWeight:600}}>Brand</label>
            <input value={brand} onChange={e => setBrand(e.target.value)} style={inputStyle(TH)} />
          </div>
          <div>
            <label style={{display:"block", color:TH.textMuted, fontSize:11, marginBottom:4, fontWeight:600}}>Serial / VIN / Plate</label>
            <input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} style={inputStyle(TH)} />
          </div>
          <div>
            <label style={{display:"block", color:TH.textMuted, fontSize:11, marginBottom:4, fontWeight:600}}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{...inputStyle(TH), resize:"vertical", minHeight:60}} />
          </div>
        </div>
      </details>

      {/* Action bar - sticky at bottom feel */}
      <div style={{display:"flex", gap:10, marginTop:20}}>
        <button
          onClick={resetForm}
          style={{
            flex:1, background:"transparent", border:`1px solid ${TH.border}`,
            borderRadius:12, color:TH.textMuted, padding:"16px",
            cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"inherit",
          }}
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting || !name.trim() || !warehouseId}
          style={{
            flex:2, background:"linear-gradient(135deg,#C9A960,#8B7A44)",
            border:"none", borderRadius:12,
            color:"#000", padding:"16px",
            cursor:"pointer", fontSize:16, fontWeight:800, fontFamily:"inherit",
            opacity: (submitting || !name.trim() || !warehouseId) ? 0.5 : 1,
            boxShadow: submitting ? "none" : "0 4px 14px rgba(201,169,96,0.3)",
          }}
        >
          {submitting ? "Saving..." : "✓ Save asset"}
        </button>
      </div>
    </div>
  );
}

function inputStyle(TH) {
  return {
    width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`,
    borderRadius:8, padding:"11px 12px", color:TH.text, fontSize:14,
    outline:"none", fontFamily:"inherit", boxSizing:"border-box",
  };
}
function ErrorBox({ TH, children }) {
  return (
    <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>
      {children}
    </div>
  );
}
