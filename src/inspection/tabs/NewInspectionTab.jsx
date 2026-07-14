// ═══════════════════════════════════════════════════════════════════
// NewInspectionTab.jsx — mobile-first inspector walk-around flow
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { INSPECTION_STATUS, INSPECTION_CATEGORIES, nextInspectionNo } from "../lib/inspectionUtils";

export default function NewInspectionTab({ TH, isMobile, onSaved }) {
  const [areas, setAreas]       = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState(null);

  // Form state
  const [step, setStep]         = useState(1); // 1=photo, 2=details
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [propertyId, setPropertyId] = useState("");
  const [areaId, setAreaId]     = useState("");
  const [title, setTitle]       = useState("");
  const [report, setReport]     = useState("");
  const [status, setStatus]     = useState("ok");
  const [severity, setSeverity] = useState(0);
  const [actionRequired, setActionRequired] = useState("");
  const [locationNote, setLocationNote] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => { loadRefData(); }, []);

  async function loadRefData() {
    setLoading(true);
    try {
      const [rA, rP] = await Promise.all([
        supabase.from('inspection_areas').select('*').eq('is_active', true).order('property_id, code'),
        supabase.from('wh_properties').select('id, code, name').eq('is_active', true).order('id'),
      ]);
      if (rA.error) throw rA.error;
      if (rP.error) throw rP.error;
      setAreas(rA.data || []);
      setProperties(rP.data || []);
      if (rP.data?.length && !propertyId) setPropertyId(rP.data[0].id);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024);
    if (valid.length !== files.length) {
      setError("Some photos too large (max 10 MB each) — skipped.");
    }
    setPhotoFiles(prev => [...prev, ...valid]);
    setPhotoPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
    setStep(2);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(idx) {
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  function resetForm() {
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setTitle(""); setReport(""); setActionRequired(""); setLocationNote("");
    setStatus("ok"); setSeverity(0);
    setStep(1); setSuccess(null); setError(null);
  }

  function pickStatus(k) {
    const meta = INSPECTION_STATUS[k];
    setStatus(k);
    setSeverity(meta?.severity ?? 0);
  }

  async function submit() {
    setSubmitting(true); setError(null);
    try {
      if (!title.trim()) throw new Error("Title is required.");
      if (!propertyId) throw new Error("Property is required.");

      const { data: { user } } = await supabase.auth.getUser();
      const inspection_no = await nextInspectionNo(supabase);

      // Upload photos
      const uploadedUrls = [];
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${inspection_no}/photo-${i+1}.${ext}`;
        const { error: upErr } = await supabase.storage.from('inspection-photos').upload(path, file, {
          upsert: true, contentType: file.type,
        });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(path);
        if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
      }

      // Insert inspection
      const { error: dbErr } = await supabase.from('inspections').insert([{
        inspection_no,
        area_id:         areaId ? Number(areaId) : null,
        property_id:     Number(propertyId),
        title:           title.trim(),
        report:          report.trim() || null,
        status,
        severity,
        action_required: actionRequired.trim() || null,
        location_note:   locationNote.trim() || null,
        photos:          uploadedUrls,
        inspector_id:    user?.id,
        inspector_email: user?.email,
      }]);
      if (dbErr) throw dbErr;

      setSuccess(`✓ ${inspection_no} saved!`);
      setTimeout(() => {
        resetForm();
        if (onSaved) onSaved();
      }, 1500);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  // Filter areas by selected property
  const filteredAreas = areas.filter(a => !propertyId || String(a.property_id) === String(propertyId));

  if (success) {
    return (
      <div style={{padding:"40px 20px", textAlign:"center", background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12}}>
        <div style={{fontSize:60, marginBottom:16}}>✅</div>
        <div style={{fontSize:20, fontWeight:800, color:"#C9A960", marginBottom:8}}>Success!</div>
        <div style={{fontSize:14, color:TH.text}}>{success}</div>
        <div style={{fontSize:12, color:TH.textMuted, marginTop:12}}>Opening list...</div>
      </div>
    );
  }

  // Step 1: capture photo(s)
  if (step === 1) {
    return (
      <div>
        <div style={{textAlign:"center", padding:"30px 20px", background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:16, marginBottom:16}}>
          <div style={{fontSize:isMobile?52:64, marginBottom:16}}>🔍📸</div>
          <div style={{fontSize:isMobile?18:22, fontWeight:800, color:TH.text, marginBottom:8}}>Start walk-around inspection</div>
          <div style={{fontSize:13, color:TH.textMuted, marginBottom:24, padding:"0 10px"}}>
            Take one or more photos of the area or equipment you're inspecting.
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={onFilesSelected}
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
            📷 Take photo(s)
          </button>
          <div style={{fontSize:11, color:TH.textDim, marginTop:12}}>Or select from gallery — you can add multiple</div>

          <div style={{marginTop:24}}>
            <button
              onClick={() => setStep(2)}
              style={{
                background:"transparent", border:`1px solid ${TH.border}`, borderRadius:10,
                color:TH.textMuted, padding:"10px 20px",
                cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit",
              }}
            >
              Skip photos — write report only →
            </button>
          </div>
        </div>

        {error && <ErrorBox TH={TH}>{error}</ErrorBox>}
      </div>
    );
  }

  // Step 2: fill details
  return (
    <div>
      {/* Photo strip */}
      {photoPreviews.length > 0 && (
        <div style={{display:"flex", gap:8, overflowX:"auto", marginBottom:14, paddingBottom:4}}>
          {photoPreviews.map((src, i) => (
            <div key={i} style={{position:"relative", flexShrink:0, borderRadius:10, overflow:"hidden", border:`1px solid ${TH.border}`}}>
              <img src={src} alt="" style={{width:100, height:100, objectFit:"cover", display:"block"}} />
              <button onClick={() => removePhoto(i)} style={{
                position:"absolute", top:4, right:4, background:"rgba(0,0,0,0.7)", border:"none",
                borderRadius:12, width:22, height:22, color:"#fff", cursor:"pointer", fontSize:12,
                display:"flex", alignItems:"center", justifyContent:"center", padding:0,
              }}>✕</button>
            </div>
          ))}
          <button onClick={() => { setStep(1); }} style={{
            flexShrink:0, width:100, height:100, background:TH.bgCard, border:`2px dashed ${TH.border}`,
            borderRadius:10, color:TH.textMuted, cursor:"pointer", fontSize:24, fontFamily:"inherit",
          }}>+</button>
        </div>
      )}

      {photoPreviews.length === 0 && (
        <button onClick={() => setStep(1)} style={{
          width:"100%", padding:"14px", marginBottom:14,
          background:TH.bgCard, border:`1px dashed ${TH.border}`, borderRadius:10,
          color:TH.textMuted, cursor:"pointer", fontSize:13, fontFamily:"inherit",
        }}>📷 + Add photos</button>
      )}

      {error && <ErrorBox TH={TH}>{error}</ErrorBox>}

      {/* Status pills (severity) */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11, color:TH.textMuted, fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px"}}>Status</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:6}}>
          {['ok', 'minor_issue', 'major_issue', 'critical', 'needs_repair', 'fixed'].map(k => {
            const meta = INSPECTION_STATUS[k];
            const on = status === k;
            return (
              <button key={k} onClick={() => pickStatus(k)} style={{
                background: on ? meta.color + "22" : "transparent",
                border: `2px solid ${on ? meta.color : TH.border}`,
                borderRadius: 10, color: on ? meta.color : TH.textMuted,
                padding: "10px 4px", cursor: "pointer", fontSize: 11, fontWeight: 700,
                fontFamily: "inherit",
              }}>
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Title */}
      <div style={{marginBottom:12}}>
        <label style={{display:"block", color:TH.textMuted, fontSize:12, marginBottom:6, fontWeight:600}}>Title *</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder='e.g. "Pool #2 pump making noise"'
          autoFocus
          style={{
            width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`,
            borderRadius:10, padding:"14px 14px", color:TH.text, fontSize:16,
            outline:"none", fontFamily:"inherit", boxSizing:"border-box",
          }}
        />
      </div>

      {/* Property */}
      <div style={{marginBottom:12}}>
        <label style={{display:"block", color:TH.textMuted, fontSize:12, marginBottom:6, fontWeight:600}}>Property *</label>
        <select value={propertyId} onChange={e => { setPropertyId(e.target.value); setAreaId(""); }} style={selectStyle(TH)}>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Area */}
      <div style={{marginBottom:12}}>
        <label style={{display:"block", color:TH.textMuted, fontSize:12, marginBottom:6, fontWeight:600}}>Area / Location</label>
        <select value={areaId} onChange={e => setAreaId(e.target.value)} style={selectStyle(TH)}>
          <option value="">Select area (optional)...</option>
          {filteredAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {/* Report */}
      <div style={{marginBottom:12}}>
        <label style={{display:"block", color:TH.textMuted, fontSize:12, marginBottom:6, fontWeight:600}}>Report / What did you find?</label>
        <textarea
          value={report}
          onChange={e => setReport(e.target.value)}
          rows={4}
          placeholder="Describe what you inspected and any observations..."
          style={{
            width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`,
            borderRadius:10, padding:"12px 14px", color:TH.text, fontSize:14,
            outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", minHeight:100,
          }}
        />
      </div>

      {/* Action required (only shown if not OK) */}
      {status !== 'ok' && status !== 'fixed' && (
        <div style={{marginBottom:12}}>
          <label style={{display:"block", color:TH.textMuted, fontSize:12, marginBottom:6, fontWeight:600}}>Action required</label>
          <input
            value={actionRequired}
            onChange={e => setActionRequired(e.target.value)}
            placeholder='e.g. "Replace pump within 48h"'
            style={{
              width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`,
              borderRadius:10, padding:"12px 14px", color:TH.text, fontSize:14,
              outline:"none", fontFamily:"inherit", boxSizing:"border-box",
            }}
          />
        </div>
      )}

      {/* Location note (free-form) */}
      <details style={{marginBottom:16, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:10, padding:14}}>
        <summary style={{cursor:"pointer", color:TH.textMuted, fontSize:13, fontWeight:600}}>+ Location details</summary>
        <div style={{marginTop:10}}>
          <input
            value={locationNote}
            onChange={e => setLocationNote(e.target.value)}
            placeholder='Free-form location, e.g. "Building A, 2nd floor, room 205"'
            style={{
              width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`,
              borderRadius:8, padding:"10px 12px", color:TH.text, fontSize:13,
              outline:"none", fontFamily:"inherit", boxSizing:"border-box",
            }}
          />
        </div>
      </details>

      {/* Action bar */}
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
          disabled={submitting || !title.trim() || !propertyId}
          style={{
            flex:2, background:"linear-gradient(135deg,#C9A960,#8B7A44)",
            border:"none", borderRadius:12,
            color:"#000", padding:"16px",
            cursor:"pointer", fontSize:16, fontWeight:800, fontFamily:"inherit",
            opacity: (submitting || !title.trim() || !propertyId) ? 0.5 : 1,
            boxShadow: submitting ? "none" : "0 4px 14px rgba(201,169,96,0.3)",
          }}
        >
          {submitting ? "Saving..." : "✓ Save inspection"}
        </button>
      </div>
    </div>
  );
}

function selectStyle(TH) {
  return {
    width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`,
    borderRadius:10, padding:"14px 14px", color:TH.text, fontSize:15,
    outline:"none", fontFamily:"inherit", boxSizing:"border-box",
  };
}
function ErrorBox({ TH, children }) {
  return <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{children}</div>;
}
