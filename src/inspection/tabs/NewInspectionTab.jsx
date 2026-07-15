// ═══════════════════════════════════════════════════════════════════
// NewInspectionTab.jsx v2 — categories, priorities, inspector fields, many photos
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { INSPECTION_STATUS, CATEGORIES, PRIORITY, nextInspectionNo } from "../lib/inspectionUtils";
import { tr } from "../../i18n";

const MAX_PHOTOS = 100;

export default function NewInspectionTab({ TH, lang = "en", isMobile, onSaved }) {
  const L = tr(lang);
  const STATUS_LBL = { ok: L.statusOk, minor_issue: L.statusMinor, major_issue: L.statusMajor, critical: L.statusCritical, needs_repair: L.statusRepair, fixed: L.statusFixed };

  const [areas, setAreas]       = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState(null);
  const [progress, setProgress] = useState(null); // {done, total}
  const [lastSaved, setLastSaved] = useState(null); // for "add another" flow

  // Form state
  const [step, setStep]         = useState(1);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [propertyId, setPropertyId] = useState("");
  const [areaId, setAreaId]     = useState("");
  const [title, setTitle]       = useState("");
  const [report, setReport]     = useState("");
  const [status, setStatus]     = useState("minor_issue");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [actionRequired, setActionRequired] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [companionName, setCompanionName] = useState("");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0,10));

  const fileInputRef = useRef(null);

  useEffect(() => { loadRefData(); }, []);

  async function loadRefData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const [rA, rP] = await Promise.all([
        supabase.from('inspection_areas').select('*').eq('is_active', true).order('property_id, code'),
        supabase.from('wh_properties').select('id, code, name').eq('is_active', true).order('id'),
      ]);
      if (rA.error) throw rA.error;
      if (rP.error) throw rP.error;
      setAreas(rA.data || []);
      setProperties(rP.data || []);
      if (rP.data?.length && !propertyId) setPropertyId(rP.data[0].id);
      // Default inspector to signed-in user's name
      if (user && !inspectorName) {
        const meta = user.user_metadata || {};
        setInspectorName(meta.full_name || user.email?.split('@')[0] || '');
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const available = MAX_PHOTOS - photoFiles.length;
    if (files.length > available) {
      setError(`Max ${MAX_PHOTOS} photos per inspection. Only added ${available}.`);
      files.splice(available);
    }
    const valid = files.filter(f => f.size <= 15 * 1024 * 1024);
    if (valid.length !== files.length) {
      setError("Some photos too large (max 15 MB each) — skipped.");
    }
    setPhotoFiles(prev => [...prev, ...valid]);
    setPhotoPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
    if (step === 1) setStep(2);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(idx) {
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  function resetForm(keepContext) {
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setTitle(""); setReport(""); setActionRequired("");
    if (!keepContext) {
      setLocationNote(""); setCategory(""); setSubcategory("");
      setStatus("minor_issue"); setPriority("medium");
    }
    setStep(1); setSuccess(null); setError(null); setProgress(null);
  }

  function pickStatus(k) {
    setStatus(k);
  }

  function pickCategory(k) {
    setCategory(k);
    setSubcategory("");
  }

  async function submit() {
    setSubmitting(true); setError(null); setProgress(null);
    try {
      if (!title.trim()) throw new Error(L.titleLbl.replace(" *","") + " is required.");
      if (!propertyId) throw new Error(L.property + " is required.");
      if (!inspectorName.trim()) throw new Error(L.inspector + " is required.");

      const { data: { user } } = await supabase.auth.getUser();
      const inspection_no = await nextInspectionNo(supabase);

      // Upload photos (with progress)
      const uploadedUrls = [];
      for (let i = 0; i < photoFiles.length; i++) {
        setProgress({ done: i, total: photoFiles.length });
        const file = photoFiles[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${inspection_no}/photo-${String(i+1).padStart(3,'0')}.${ext}`;
        const { error: upErr } = await supabase.storage.from('inspection-photos').upload(path, file, {
          upsert: true, contentType: file.type,
        });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(path);
        if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
      }
      setProgress({ done: photoFiles.length, total: photoFiles.length });

      // Derive severity from priority for backward compat
      const sev = priority === 'critical' ? 4 : priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;

      const { error: dbErr } = await supabase.from('inspections').insert([{
        inspection_no,
        area_id:                 areaId ? Number(areaId) : null,
        property_id:             Number(propertyId),
        title:                   title.trim(),
        report:                  report.trim() || null,
        status,
        severity:                sev,
        priority,
        category:                category || null,
        subcategory:             subcategory || null,
        action_required:         actionRequired.trim() || null,
        location_note:           locationNote.trim() || null,
        photos:                  uploadedUrls,
        inspector_id:            user?.id,
        inspector_email:         user?.email,
        inspector_display_name:  inspectorName.trim(),
        companion_name:          companionName.trim() || null,
        visit_date:              visitDate || null,
      }]);
      if (dbErr) throw dbErr;

      setLastSaved({ propertyId, areaId, locationNote, inspectorName, companionName, visitDate });
      setSuccess(`✓ ${inspection_no}`);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function addAnotherReport() {
    resetForm(true); // keep context: property, area, inspector, companion, date
    setSuccess(null);
  }

  function filteredAreas() {
    return areas.filter(a => !propertyId || String(a.property_id) === String(propertyId));
  }

  const currentCat = CATEGORIES[category] || null;

  // ═══ Success screen ═══
  if (success) {
    return (
      <div style={{padding:"32px 20px", textAlign:"center", background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:16}}>
        <div style={{fontSize:56, marginBottom:12}}>✅</div>
        <div style={{fontSize:20, fontWeight:800, color:"#C9A960", marginBottom:6, fontFamily:"'Playfair Display', Georgia, serif"}}>{L.success}</div>
        <div style={{fontSize:15, color:TH.text, fontFamily:"monospace", marginBottom:20}}>{success}</div>
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10, maxWidth:420, margin:"0 auto"}}>
          <button onClick={addAnotherReport} style={{
            background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:12,
            color:"#000", padding:"14px 20px", cursor:"pointer", fontSize:14, fontWeight:800, fontFamily:"inherit",
          }}>+ Another report (same site)</button>
          <button onClick={() => { resetForm(false); onSaved?.(); }} style={{
            background:"transparent", border:`1px solid ${TH.border}`, borderRadius:12,
            color:TH.text, padding:"14px 20px", cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"inherit",
          }}>{L.openingList}</button>
        </div>
      </div>
    );
  }

  // ═══ Step 1: photos ═══
  if (step === 1) {
    return (
      <div>
        <div style={{textAlign:"center", padding:"30px 20px", background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:16, marginBottom:16}}>
          <div style={{fontSize:isMobile?52:64, marginBottom:12}}>🔍📸</div>
          <div style={{fontSize:isMobile?18:22, fontWeight:800, color:TH.text, marginBottom:8, fontFamily:"'Playfair Display', Georgia, serif"}}>{L.startWalk}</div>
          <div style={{fontSize:13, color:TH.textMuted, marginBottom:22, padding:"0 10px"}}>
            {L.takePhotosDesc} <br/><span style={{fontSize:11, color:TH.textDim}}>(up to {MAX_PHOTOS} photos)</span>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple onChange={onFilesSelected} style={{display:"none"}} />
          <button onClick={() => fileInputRef.current?.click()} style={goldBtn(isMobile)}>{L.takePhotos}</button>
          <div style={{fontSize:11, color:TH.textDim, marginTop:10}}>{L.orGallery}</div>

          <div style={{marginTop:22}}>
            <button onClick={() => setStep(2)} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:10, color:TH.textMuted, padding:"10px 20px", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit"}}>{L.skipPhotos}</button>
          </div>
        </div>
        {error && <ErrorBox TH={TH}>{error}</ErrorBox>}
      </div>
    );
  }

  // ═══ Step 2: full form ═══
  return (
    <div>
      {/* Photo strip */}
      {photoPreviews.length > 0 && (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11, color:TH.textMuted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6}}>{L.photos} ({photoPreviews.length}/{MAX_PHOTOS})</div>
          <div style={{display:"flex", gap:8, overflowX:"auto", paddingBottom:4}}>
            {photoPreviews.map((src, i) => (
              <div key={i} style={{position:"relative", flexShrink:0, borderRadius:10, overflow:"hidden", border:`1px solid ${TH.border}`}}>
                <img src={src} alt="" style={{width:90, height:90, objectFit:"cover", display:"block"}} />
                <button onClick={() => removePhoto(i)} style={{position:"absolute", top:4, right:4, background:"rgba(0,0,0,0.7)", border:"none", borderRadius:12, width:20, height:20, color:"#fff", cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", padding:0}}>✕</button>
              </div>
            ))}
            {photoPreviews.length < MAX_PHOTOS && (
              <button onClick={() => fileInputRef.current?.click()} style={{flexShrink:0, width:90, height:90, background:TH.bgCard, border:`2px dashed ${TH.border}`, borderRadius:10, color:TH.textMuted, cursor:"pointer", fontSize:22, fontFamily:"inherit"}}>+</button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFilesSelected} style={{display:"none"}} />
          </div>
        </div>
      )}

      {photoPreviews.length === 0 && (
        <button onClick={() => setStep(1)} style={{width:"100%", padding:"14px", marginBottom:14, background:TH.bgCard, border:`1px dashed ${TH.border}`, borderRadius:10, color:TH.textMuted, cursor:"pointer", fontSize:13, fontFamily:"inherit"}}>📷 + Add photos</button>
      )}

      {error && <ErrorBox TH={TH}>{error}</ErrorBox>}

      {/* Header block: inspector + companion + date */}
      <SectionCard TH={TH} title="Inspection header">
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr", gap:10}}>
          <Field TH={TH} label={L.inspector + " *"}><input value={inspectorName} onChange={e => setInspectorName(e.target.value)} placeholder="Name of inspector" style={inp(TH)} /></Field>
          <Field TH={TH} label="Accompanied by"><input value={companionName} onChange={e => setCompanionName(e.target.value)} placeholder="e.g. Maintenance chief" style={inp(TH)} /></Field>
          <Field TH={TH} label={L.date}><input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} style={inp(TH)} /></Field>
        </div>
      </SectionCard>

      {/* Category picker */}
      <SectionCard TH={TH} title={L.category}>
        <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(2, 1fr)":"repeat(3, 1fr)", gap:6, marginBottom: category ? 10 : 0}}>
          {Object.entries(CATEGORIES).map(([k, meta]) => {
            const on = category === k;
            return (
              <button key={k} onClick={() => pickCategory(k)} style={{
                background: on ? meta.color + "22" : "transparent",
                border: `2px solid ${on ? meta.color : TH.border}`,
                borderRadius: 10, color: on ? meta.color : TH.textMuted,
                padding: "12px 8px", cursor: "pointer", fontSize: 13,
                fontWeight: on ? 800 : 500, fontFamily: "inherit",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <span style={{fontSize:22}}>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {currentCat && (
          <div style={{marginTop:10}}>
            <div style={{fontSize:11, color:TH.textMuted, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px"}}>{L.subcategory}</div>
            <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit, minmax(200px, 1fr))", gap:6}}>
              {Object.entries(currentCat.subcategories).map(([sk, slabel]) => {
                const on = subcategory === sk;
                return (
                  <button key={sk} onClick={() => setSubcategory(sk)} style={{
                    background: on ? currentCat.color + "18" : "transparent",
                    border: `1px solid ${on ? currentCat.color : TH.border}`,
                    borderRadius: 8, color: on ? currentCat.color : TH.textMuted,
                    padding: "10px 12px", cursor: "pointer", fontSize: 12,
                    fontWeight: on ? 700 : 500, fontFamily: "inherit", textAlign: "left",
                  }}>
                    {on ? "✓ " : ""}{slabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Safety warnings for electrical */}
        {currentCat?.warnings?.length > 0 && (
          <div style={{marginTop:12, padding:12, background:"rgba(255,180,60,0.08)", border:"1px solid rgba(255,180,60,0.3)", borderRadius:10}}>
            <div style={{fontSize:11, fontWeight:800, color:"#D4B876", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px"}}>⚠️ Safety references (applied to report)</div>
            {currentCat.warnings.map((w, i) => (
              <div key={i} style={{fontSize:12, color:TH.text, marginBottom: i < currentCat.warnings.length - 1 ? 10 : 0, lineHeight:1.5}}>
                • {w.text}
                <div style={{fontSize:10.5, color:TH.textMuted, marginTop:2, marginLeft:12}}>
                  <em>{w.source}</em>
                  {w.url && <> · <a href={w.url} target="_blank" rel="noopener noreferrer" style={{color:"#C9A960", textDecoration:"underline"}}>ref</a></>}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Priority + status */}
      <SectionCard TH={TH} title={L.priority || "Priority & status"}>
        <div style={{fontSize:11, color:TH.textMuted, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px"}}>{L.priority || "Risk priority"}</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6, marginBottom:12}}>
          {Object.entries(PRIORITY).map(([k, meta]) => {
            const on = priority === k;
            return (
              <button key={k} onClick={() => setPriority(k)} style={{
                background: on ? meta.color + "26" : "transparent",
                border: `2px solid ${on ? meta.color : TH.border}`,
                borderRadius: 10, color: on ? meta.color : TH.textMuted,
                padding: "10px 4px", cursor: "pointer", fontSize: 11,
                fontWeight: on ? 800 : 500, fontFamily: "inherit",
              }}>
                {meta.label}
              </button>
            );
          })}
        </div>

        <div style={{fontSize:11, color:TH.textMuted, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px"}}>{L.statusLbl}</div>
        <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(3, 1fr)":"repeat(6, 1fr)", gap:6}}>
          {['ok', 'minor_issue', 'major_issue', 'critical', 'needs_repair', 'fixed'].map(k => {
            const meta = INSPECTION_STATUS[k];
            const on = status === k;
            return (
              <button key={k} onClick={() => pickStatus(k)} style={{
                background: on ? meta.color + "22" : "transparent",
                border: `2px solid ${on ? meta.color : TH.border}`,
                borderRadius: 10, color: on ? meta.color : TH.textMuted,
                padding: "10px 4px", cursor: "pointer", fontSize: 11,
                fontWeight: on ? 700 : 500, fontFamily: "inherit",
              }}>
                {STATUS_LBL[k] || meta.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Location */}
      <SectionCard TH={TH} title={L.property.replace(" *","") + " & " + L.area}>
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10}}>
          <Field TH={TH} label={L.property}>
            <select value={propertyId} onChange={e => { setPropertyId(e.target.value); setAreaId(""); }} style={inp(TH)}>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field TH={TH} label={L.area}>
            <select value={areaId} onChange={e => setAreaId(e.target.value)} style={inp(TH)}>
              <option value="">{L.selectArea}</option>
              {filteredAreas().map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
        <div style={{marginTop:10}}>
          <Field TH={TH} label="Location note (optional)"><input value={locationNote} onChange={e => setLocationNote(e.target.value)} placeholder={L.locationPh} style={inp(TH)} /></Field>
        </div>
      </SectionCard>

      {/* Details */}
      <SectionCard TH={TH} title={L.reportBlock || 'Report'}>
        <Field TH={TH} label={L.titleLbl}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={L.titlePh} style={{...inp(TH), fontSize:16, fontWeight:600}} />
        </Field>
        <Field TH={TH} label={L.reportLbl}>
          <textarea value={report} onChange={e => setReport(e.target.value)} rows={5} placeholder={L.reportPh} style={{...inp(TH), resize:"vertical", minHeight:110}} />
        </Field>
        {status !== 'ok' && status !== 'fixed' && (
          <Field TH={TH} label={L.actionRequired}><input value={actionRequired} onChange={e => setActionRequired(e.target.value)} placeholder={L.actionPh} style={inp(TH)} /></Field>
        )}
      </SectionCard>

      {/* Submit bar */}
      {progress && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:10, padding:10, marginBottom:10}}>
          <div style={{fontSize:12, color:TH.textMuted, marginBottom:4}}>Uploading {progress.done} / {progress.total} photos...</div>
          <div style={{height:4, background:TH.bgInput, borderRadius:2, overflow:"hidden"}}>
            <div style={{height:"100%", width:`${(progress.done/progress.total)*100}%`, background:"linear-gradient(90deg,#C9A960,#D4B876)", transition:"width .2s"}}/>
          </div>
        </div>
      )}

      <div style={{display:"flex", gap:10, marginTop:16}}>
        <button onClick={() => resetForm(false)} disabled={submitting} style={{flex:1, background:"transparent", border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, padding:"16px", cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"inherit"}}>{L.cancel}</button>
        <button onClick={submit} disabled={submitting || !title.trim() || !propertyId || !inspectorName.trim()} style={{
          flex:2, background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:12,
          color:"#000", padding:"16px", cursor:"pointer", fontSize:16, fontWeight:800, fontFamily:"inherit",
          opacity: (submitting || !title.trim() || !propertyId || !inspectorName.trim()) ? 0.5 : 1,
          boxShadow: submitting ? "none" : "0 4px 14px rgba(201,169,96,0.3)",
        }}>{submitting ? L.saving : L.saveInspection}</button>
      </div>
    </div>
  );
}

// ═══ helpers ═══
function goldBtn(isMobile) {
  return {
    background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:16,
    color:"#000", padding:"18px 32px", cursor:"pointer", fontSize:17, fontWeight:800, fontFamily:"inherit",
    width: isMobile ? "100%" : "auto", boxShadow: "0 8px 24px rgba(201,169,96,0.3)",
  };
}
function SectionCard({ TH, title, children }) {
  return (
    <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:14, marginBottom:12}}>
      {title && <div style={{fontSize:12, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:10}}>{title}</div>}
      {children}
    </div>
  );
}
function Field({ TH, label, children }) {
  return (
    <div style={{marginBottom:10}}>
      <label style={{display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px"}}>{label}</label>
      {children}
    </div>
  );
}
function inp(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:9, padding:"11px 12px", color:TH.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
function ErrorBox({ TH, children }) {
  return <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{children}</div>;
}
