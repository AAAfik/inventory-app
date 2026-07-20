// ═══════════════════════════════════════════════════════════════════
// NewPackageModal.jsx — quick "receive package" flow
// Camera-first: photo → recipient name → property + unit → save.
// ═══════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";

const MAX_PHOTO_MB = 15;

export default function NewPackageModal({ TH, lang = "en", properties, onClose, onCreated }) {
  const L = tr(lang);
  const [files, setFiles] = useState([]);         // File objects to upload
  const [previews, setPreviews] = useState([]);   // blob URLs for preview
  const [name, setName] = useState("");
  const [propId, setPropId] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    return () => { previews.forEach(url => URL.revokeObjectURL(url)); };
    // eslint-disable-next-line
  }, []);

  function pickFiles(e) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const valid = selected.filter(f => f.size <= MAX_PHOTO_MB * 1024 * 1024);
    if (valid.length !== selected.length) setError(`Some photos over ${MAX_PHOTO_MB}MB were skipped`);
    setFiles(prev => [...prev, ...valid]);
    setPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto(i) {
    URL.revokeObjectURL(previews[i]);
    setFiles(files.filter((_, x) => x !== i));
    setPreviews(previews.filter((_, x) => x !== i));
  }

  async function save() {
    if (!name.trim())  { setError(L.pkgNeedName || 'Recipient name is required'); return; }
    if (!files.length) { setError(L.pkgNeedPhoto || 'At least one photo is required'); return; }
    setBusy(true); setError(null);
    try {
      // Generate package_no upfront so we can use it as folder name
      const { data: pkgNo, error: nErr } = await supabase.rpc('generate_package_no');
      if (nErr) throw nErr;

      // Upload photos
      const uploadedUrls = [];
      const now = Date.now();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${pkgNo}/photo-${now}-${String(i + 1).padStart(3, '0')}.${ext}`;
        const { error: upErr } = await supabase.storage.from('package-photos').upload(path, file, {
          contentType: file.type, upsert: true,
        });
        if (upErr) throw new Error(`Photo ${i + 1}: ${upErr.message}`);
        const { data: urlData } = supabase.storage.from('package-photos').getPublicUrl(path);
        if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { error: iErr } = await supabase.from('packages').insert([{
        package_no: pkgNo,
        recipient_name: name.trim(),
        recipient_property_id: propId ? Number(propId) : null,
        recipient_unit: unit.trim() || null,
        photos: uploadedUrls,
        notes: notes.trim() || null,
        received_by: user?.id,
      }]);
      if (iErr) throw iErr;

      // Cleanup previews
      previews.forEach(url => URL.revokeObjectURL(url));
      onCreated?.();
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  }

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:20, width:"100%", maxWidth:500, maxHeight:"92vh", overflowY:"auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
          <div style={{fontSize:16, fontWeight:800, color:TH.text, fontFamily:"'Playfair Display', Georgia, serif"}}>
            📦 {L.newPackage || 'New package'}
          </div>
          <button onClick={onClose} disabled={busy} style={{background:"transparent", border:"none", color:TH.textMuted, fontSize:22, cursor:"pointer", padding:4, lineHeight:1}}>✕</button>
        </div>

        {/* Photos */}
        <div style={{marginBottom:12}}>
          <label style={lbl(TH)}>{L.pkgPhotos || 'Photos'} * ({files.length})</label>
          <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
            {previews.map((src, i) => (
              <div key={i} style={{position:"relative", flexShrink:0, borderRadius:8, overflow:"hidden", border:`1px solid ${TH.border}`, background:"#000"}}>
                <img src={src} alt="" style={{width:70, height:70, objectFit:"cover", display:"block"}} />
                <button onClick={() => removePhoto(i)} disabled={busy} style={{position:"absolute", top:2, right:2, background:"rgba(0,0,0,0.75)", border:"none", borderRadius:12, width:20, height:20, color:"#fff", cursor:"pointer", fontSize:11, padding:0, lineHeight:1}}>✕</button>
              </div>
            ))}
            <button onClick={() => fileRef.current?.click()} disabled={busy} style={{
              flexShrink:0, width:70, height:70, background:"transparent",
              border:`2px dashed ${TH.border}`, borderRadius:8, color:TH.textMuted,
              cursor:"pointer", fontSize:24, fontFamily:"inherit",
            }}>+</button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={pickFiles} style={{display:"none"}} />
          </div>
          <div style={{fontSize:10, color:TH.textDim, marginTop:6}}>
            {L.pkgPhotoHint || 'On mobile: opens rear camera directly. Max 15MB per photo.'}
          </div>
        </div>

        {/* Recipient name */}
        <div style={{marginBottom:10}}>
          <label style={lbl(TH)}>{L.recipientName || 'Recipient name'} *</label>
          <input value={name} onChange={e => setName(e.target.value)} disabled={busy} autoFocus style={inp(TH)} placeholder="John Smith" />
        </div>

        {/* Property + unit */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 100px", gap:8, marginBottom:10}}>
          <div>
            <label style={lbl(TH)}>{L.property || 'Property'} / {L.department || 'Department'}</label>
            <select value={propId} onChange={e => setPropId(e.target.value)} disabled={busy} style={inp(TH)}>
              <option value="">—</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl(TH)}>{L.unit || 'Unit'} #</label>
            <input value={unit} onChange={e => setUnit(e.target.value)} disabled={busy} style={inp(TH)} placeholder="A-105" />
          </div>
        </div>

        {/* Notes */}
        <div style={{marginBottom:14}}>
          <label style={lbl(TH)}>{L.notes || 'Notes'}</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={busy} rows={2} style={{...inp(TH), resize:"vertical"}} placeholder={L.pkgNotesPh || 'Optional — courier, size, fragile, etc.'} />
        </div>

        {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:8, padding:"10px 12px", color:"#C43D3D", fontSize:12, marginBottom:10}}>{error}</div>}

        <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
          <button onClick={onClose} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>{L.cancel || 'Cancel'}</button>
          <button onClick={save} disabled={busy} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:9, color:"#000", padding:"10px 24px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit", opacity:busy?0.6:1}}>
            {busy ? (L.saving || 'Saving…') : (L.savePackage || 'Save package')}
          </button>
        </div>
      </div>
    </div>
  );
}

function lbl(TH) { return { display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }; }
function inp(TH) { return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"10px 12px", color:TH.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }; }
