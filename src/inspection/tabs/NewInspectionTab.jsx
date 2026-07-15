// ═══════════════════════════════════════════════════════════════════════
// NewInspectionTab.jsx v3 — Visit-based flow
// Header (once) → many Problems (up to 100) → Save all
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { INSPECTION_STATUS, CATEGORIES, PRIORITY, nextInspectionNo } from "../lib/inspectionUtils";
import { tr } from "../../i18n";

const MAX_PHOTOS_PER_PROBLEM = 100;
const MAX_PROBLEMS = 100;

// ═══════════════════════════════════════════════════════════════════════

export default function NewInspectionTab({ TH, lang = "en", isMobile, onSaved }) {
  const L = tr(lang);
  const STATUS_LBL = { ok: L.statusOk, minor_issue: L.statusMinor, major_issue: L.statusMajor, critical: L.statusCritical, needs_repair: L.statusRepair, fixed: L.statusFixed };

  const [areas, setAreas] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(null); // { probIdx, photoIdx, total }
  const [success, setSuccess] = useState(null); // { count, inspection_nos[] }

  // ═══ VISIT HEADER (entered once) ═══
  const nowLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
  };
  const [inspectorName, setInspectorName] = useState("");
  const [companionName, setCompanionName] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [visitAt, setVisitAt] = useState(nowLocal());

  const [headerLocked, setHeaderLocked] = useState(false);

  // ═══ PROBLEMS ═══
  const [problems, setProblems] = useState([]);
  const [editingIdx, setEditingIdx] = useState(null); // null = not editing, -1 = new, >=0 = editing existing

  useEffect(() => { loadRef(); }, []);

  async function loadRef() {
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

  // ═══ Header validation ═══
  function headerValid() {
    return !!(inspectorName.trim() && propertyId && visitAt);
  }

  function lockHeader() {
    if (!headerValid()) {
      setError("Please fill inspector name, property, and visit date/time.");
      return;
    }
    setError(null);
    setHeaderLocked(true);
  }

  // ═══ Problem CRUD ═══
  function openNewProblem() {
    if (problems.length >= MAX_PROBLEMS) {
      setError(`Maximum ${MAX_PROBLEMS} problems per visit.`);
      return;
    }
    if (!headerLocked && headerValid()) lockHeader();
    if (!headerLocked) return;
    setEditingIdx(-1);
  }

  function saveProblem(p) {
    if (editingIdx === -1) {
      setProblems(prev => [...prev, p]);
    } else {
      setProblems(prev => prev.map((x, i) => i === editingIdx ? p : x));
    }
    setEditingIdx(null);
  }

  function removeProblem(idx) {
    if (!confirm("Remove this problem?")) return;
    setProblems(prev => prev.filter((_, i) => i !== idx));
  }

  function editProblem(idx) {
    setEditingIdx(idx);
  }

  // ═══ SAVE ALL ═══
  async function saveVisit() {
    setSubmitting(true); setError(null); setProgress(null);
    try {
      if (!headerValid()) throw new Error("Header is incomplete.");
      if (problems.length === 0) throw new Error("Add at least one problem.");

      const { data: { user } } = await supabase.auth.getUser();
      const visit_id = crypto.randomUUID();
      const visit_at_iso = new Date(visitAt).toISOString();
      const inspection_nos = [];

      for (let pi = 0; pi < problems.length; pi++) {
        const p = problems[pi];
        setProgress({ probIdx: pi, photoIdx: 0, total: p.photoFiles.length, problemsTotal: problems.length });

        const inspection_no = await nextInspectionNo(supabase);
        inspection_nos.push(inspection_no);

        // Upload photos
        const uploadedUrls = [];
        for (let phi = 0; phi < p.photoFiles.length; phi++) {
          setProgress({ probIdx: pi, photoIdx: phi, total: p.photoFiles.length, problemsTotal: problems.length });
          const file = p.photoFiles[phi];
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const path = `${inspection_no}/photo-${String(phi + 1).padStart(3, '0')}.${ext}`;
          const { error: upErr } = await supabase.storage.from('inspection-photos').upload(path, file, {
            upsert: true, contentType: file.type,
          });
          if (upErr) throw new Error(`Photo ${phi + 1} of problem ${pi + 1}: ${upErr.message}`);
          const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(path);
          if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
        }

        // Derive severity from priority
        const sev = p.priority === 'critical' ? 4 : p.priority === 'high' ? 3 : p.priority === 'medium' ? 2 : 1;

        const { error: dbErr } = await supabase.from('inspections').insert([{
          inspection_no,
          visit_id,
          visit_at:                visit_at_iso,
          visit_date:              visit_at_iso.slice(0, 10),
          property_id:             Number(propertyId),
          area_id:                 areaId ? Number(areaId) : null,
          location_note:           locationNote.trim() || null,
          title:                   p.title.trim(),
          report:                  p.report.trim() || null,
          status:                  p.status,
          severity:                sev,
          priority:                p.priority,
          category:                p.category || null,
          subcategory:             p.subcategory || null,
          action_required:         p.actionRequired.trim() || null,
          photos:                  uploadedUrls,
          inspector_id:            user?.id,
          inspector_email:         user?.email,
          inspector_display_name:  inspectorName.trim(),
          companion_name:          companionName.trim() || null,
        }]);
        if (dbErr) throw new Error(`Problem ${pi + 1}: ${dbErr.message}`);
      }

      setSuccess({ count: problems.length, inspection_nos });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  }

  function resetAll() {
    setInspectorName(""); setCompanionName("");
    setPropertyId(properties[0]?.id || ""); setAreaId("");
    setLocationNote(""); setVisitAt(nowLocal());
    setHeaderLocked(false);
    setProblems([]);
    setEditingIdx(null);
    setSuccess(null); setError(null);
  }

  function newVisitKeepInspector() {
    const insp = inspectorName;
    resetAll();
    setInspectorName(insp);
  }

  const filteredAreas = () => areas.filter(a => !propertyId || String(a.property_id) === String(propertyId));

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: Success screen
  // ═══════════════════════════════════════════════════════════════════
  if (success) {
    return (
      <div style={{padding:"32px 20px", background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:16}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:56, marginBottom:12}}>✅</div>
          <div style={{fontSize:22, fontWeight:800, color:"#C9A960", marginBottom:6, fontFamily:"'Playfair Display', Georgia, serif"}}>
            Visit saved
          </div>
          <div style={{fontSize:14, color:TH.textMuted, marginBottom:18}}>
            {success.count} problem{success.count > 1 ? 's' : ''} recorded
          </div>
        </div>
        <div style={{background:TH.bgInput, borderRadius:10, padding:14, maxHeight:200, overflowY:"auto", marginBottom:20}}>
          {success.inspection_nos.map(no => (
            <div key={no} style={{fontFamily:"monospace", fontSize:12, color:TH.text, padding:"4px 0"}}>{no}</div>
          ))}
        </div>
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10}}>
          <button onClick={newVisitKeepInspector} style={goldBtn}>+ New visit</button>
          <button onClick={() => { resetAll(); onSaved?.(); }} style={ghostBtn(TH)}>Go to list</button>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>{L.loading}</div>;

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: Editing a problem
  // ═══════════════════════════════════════════════════════════════════
  if (editingIdx !== null) {
    return (
      <ProblemEditor
        TH={TH} L={L} STATUS_LBL={STATUS_LBL} isMobile={isMobile}
        initial={editingIdx >= 0 ? problems[editingIdx] : null}
        problemNumber={editingIdx >= 0 ? editingIdx + 1 : problems.length + 1}
        onCancel={() => setEditingIdx(null)}
        onSave={saveProblem}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: Header + Problems list
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div>
      {error && <div style={errBox(TH)}>{error}</div>}

      {/* HEADER CARD */}
      <div style={{background:TH.bgCard, border:`1px solid ${headerLocked ? TH.border : "rgba(201,169,96,0.4)"}`, borderRadius:14, padding:16, marginBottom:14}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
          <div style={{fontSize:12, fontWeight:800, color:TH.accent, textTransform:"uppercase", letterSpacing:"0.06em"}}>
            📋 Visit header
          </div>
          {headerLocked && (
            <button onClick={() => setHeaderLocked(false)} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"4px 10px", cursor:"pointer", fontSize:11, fontFamily:"inherit"}}>
              ✎ Edit
            </button>
          )}
        </div>

        {!headerLocked ? (
          <>
            <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10, marginBottom:10}}>
              <Field TH={TH} label={"Inspector name *"}>
                <input value={inspectorName} onChange={e => setInspectorName(e.target.value)} placeholder="Name of reporter" style={inp(TH)} />
              </Field>
              <Field TH={TH} label="Accompanied by">
                <input value={companionName} onChange={e => setCompanionName(e.target.value)} placeholder="e.g. Murat (chief)" style={inp(TH)} />
              </Field>
            </div>

            <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10, marginBottom:10}}>
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

            <Field TH={TH} label="Location details">
              <input value={locationNote} onChange={e => setLocationNote(e.target.value)} placeholder={L.locationPh} style={inp(TH)} />
            </Field>

            <Field TH={TH} label="Date & time *">
              <input type="datetime-local" value={visitAt} onChange={e => setVisitAt(e.target.value)} style={inp(TH)} />
            </Field>

            {!headerLocked && problems.length === 0 && (
              <button onClick={lockHeader} disabled={!headerValid()} style={{
                width:"100%", marginTop:6,
                background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:12,
                color:"#000", padding:"14px", cursor: headerValid() ? "pointer" : "not-allowed",
                fontSize:15, fontWeight:800, fontFamily:"inherit", opacity: headerValid() ? 1 : 0.5,
              }}>
                Continue → Add problems
              </button>
            )}
          </>
        ) : (
          // Compact header summary once locked
          <div style={{fontSize:13, color:TH.text, lineHeight:1.6}}>
            <div><span style={metaLbl(TH)}>Inspector:</span> <strong>{inspectorName}</strong>{companionName && <> · <span style={metaLbl(TH)}>with</span> {companionName}</>}</div>
            <div><span style={metaLbl(TH)}>Property:</span> {properties.find(p => String(p.id) === String(propertyId))?.name || '—'}
              {areaId && <> · <span style={metaLbl(TH)}>Area:</span> {areas.find(a => String(a.id) === String(areaId))?.name || '—'}</>}
            </div>
            {locationNote && <div><span style={metaLbl(TH)}>Location:</span> {locationNote}</div>}
            <div><span style={metaLbl(TH)}>Date/time:</span> {new Date(visitAt).toLocaleString('en-GB', {year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit'})}</div>
          </div>
        )}
      </div>

      {/* PROBLEMS LIST */}
      {headerLocked && (
        <>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
            <div style={{fontSize:13, fontWeight:800, color:TH.text, textTransform:"uppercase", letterSpacing:"0.05em"}}>
              Problems ({problems.length}/{MAX_PROBLEMS})
            </div>
          </div>

          {problems.length === 0 ? (
            <div style={{padding:"40px 20px", background:TH.bgCard, border:`1px dashed ${TH.border}`, borderRadius:14, color:TH.textMuted, textAlign:"center", marginBottom:14}}>
              <div style={{fontSize:36, marginBottom:8, opacity:0.5}}>📝</div>
              <div style={{fontSize:14, color:TH.text, fontWeight:600, marginBottom:2}}>No problems added yet</div>
              <div style={{fontSize:12}}>Click "+ Add problem" below to report the first issue.</div>
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", gap:8, marginBottom:14}}>
              {problems.map((p, i) => {
                const statMeta = INSPECTION_STATUS[p.status] || {};
                const priMeta = PRIORITY[p.priority] || {};
                const catMeta = CATEGORIES[p.category];
                return (
                  <div key={i} style={{
                    background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12,
                    padding:12, display:"flex", gap:12, alignItems:"center",
                    borderLeft:`4px solid ${priMeta.color || TH.border}`,
                  }}>
                    {p.photoPreviews[0] ? (
                      <img src={p.photoPreviews[0]} alt="" style={{width:52, height:52, objectFit:"cover", borderRadius:8, flexShrink:0, background:"#000"}} />
                    ) : (
                      <div style={{width:52, height:52, borderRadius:8, background:TH.bgInput, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0}}>{catMeta?.icon || "📋"}</div>
                    )}
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize:13, fontWeight:700, color:TH.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>#{i+1} · {p.title}</div>
                      <div style={{display:"flex", flexWrap:"wrap", gap:4, marginTop:4}}>
                        {catMeta && <span style={chip(catMeta.color)}>{catMeta.icon} {catMeta.label}</span>}
                        {priMeta.label && <span style={chip(priMeta.color)}>{priMeta.label}</span>}
                        {statMeta.label && <span style={chip(statMeta.color)}>{STATUS_LBL[p.status] || statMeta.label}</span>}
                        {p.photoFiles.length > 0 && <span style={{fontSize:10, color:TH.textDim}}>📷 {p.photoFiles.length}</span>}
                      </div>
                    </div>
                    <div style={{display:"flex", flexDirection:"column", gap:4, flexShrink:0}}>
                      <button onClick={() => editProblem(i)} style={smallBtn(TH)}>✎</button>
                      <button onClick={() => removeProblem(i)} style={{...smallBtn(TH), color:"#8f8f8f"}}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={openNewProblem} disabled={problems.length >= MAX_PROBLEMS} style={{
            width:"100%", padding:"14px",
            background: problems.length === 0 ? "linear-gradient(135deg,#C9A960,#8B7A44)" : "transparent",
            border: problems.length === 0 ? "none" : `2px dashed ${TH.accent}`,
            borderRadius:12,
            color: problems.length === 0 ? "#000" : TH.accent,
            cursor: problems.length >= MAX_PROBLEMS ? "not-allowed" : "pointer",
            fontSize:15, fontWeight:800, fontFamily:"inherit",
            marginBottom: problems.length > 0 ? 14 : 0,
            opacity: problems.length >= MAX_PROBLEMS ? 0.4 : 1,
          }}>
            {problems.length === 0 ? "+ Add first problem" : "+ Add another problem"}
          </button>

          {/* SUBMIT ALL */}
          {problems.length > 0 && (
            <>
              {progress && (
                <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:10, padding:10, marginBottom:10}}>
                  <div style={{fontSize:12, color:TH.textMuted, marginBottom:6}}>
                    Saving problem {progress.probIdx + 1} of {progress.problemsTotal} · uploading photo {progress.photoIdx + 1}/{progress.total || 1}
                  </div>
                  <div style={{height:4, background:TH.bgInput, borderRadius:2, overflow:"hidden"}}>
                    <div style={{height:"100%", width:`${((progress.probIdx + (progress.total ? progress.photoIdx / progress.total : 0)) / progress.problemsTotal) * 100}%`, background:"linear-gradient(90deg,#C9A960,#D4B876)", transition:"width .2s"}}/>
                  </div>
                </div>
              )}

              <div style={{display:"flex", gap:10}}>
                <button onClick={() => { if (confirm("Discard all problems and header?")) resetAll(); }} disabled={submitting} style={{flex:1, ...ghostBtn(TH)}}>{L.cancel}</button>
                <button onClick={saveVisit} disabled={submitting} style={{
                  flex:2, background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:12,
                  color:"#000", padding:"16px", cursor:"pointer", fontSize:15, fontWeight:800, fontFamily:"inherit",
                  opacity:submitting?0.6:1, boxShadow:submitting?"none":"0 4px 14px rgba(201,169,96,0.3)",
                }}>
                  {submitting ? "Saving..." : `✓ Save visit (${problems.length} problem${problems.length > 1 ? 's' : ''})`}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PROBLEM EDITOR — inline mini-form for a single problem
// ═══════════════════════════════════════════════════════════════════════
function ProblemEditor({ TH, L, STATUS_LBL, isMobile, initial, problemNumber, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [report, setReport] = useState(initial?.report || "");
  const [status, setStatus] = useState(initial?.status || "minor_issue");
  const [priority, setPriority] = useState(initial?.priority || "medium");
  const [category, setCategory] = useState(initial?.category || "");
  const [subcategory, setSubcategory] = useState(initial?.subcategory || "");
  const [actionRequired, setActionRequired] = useState(initial?.actionRequired || "");
  const [photoFiles, setPhotoFiles] = useState(initial?.photoFiles || []);
  const [photoPreviews, setPhotoPreviews] = useState(initial?.photoPreviews || []);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  const currentCat = CATEGORIES[category];

  function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const available = MAX_PHOTOS_PER_PROBLEM - photoFiles.length;
    const toAdd = files.slice(0, available);
    const valid = toAdd.filter(f => f.size <= 15 * 1024 * 1024);
    if (valid.length !== files.length) setErr("Some photos skipped (too large or over limit)");
    setPhotoFiles(prev => [...prev, ...valid]);
    setPhotoPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto(i) {
    setPhotoFiles(prev => prev.filter((_, x) => x !== i));
    setPhotoPreviews(prev => prev.filter((_, x) => x !== i));
  }

  function submit() {
    if (!title.trim()) { setErr("Title is required."); return; }
    onSave({
      title: title.trim(), report, status, priority, category, subcategory,
      actionRequired, photoFiles, photoPreviews,
    });
  }

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
        <div style={{fontSize:isMobile?18:22, fontWeight:800, color:TH.text, fontFamily:"'Playfair Display', Georgia, serif"}}>
          Problem #{problemNumber}
        </div>
        <button onClick={onCancel} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"7px 14px", cursor:"pointer", fontSize:13, fontFamily:"inherit"}}>← Back</button>
      </div>

      {err && <div style={errBox(TH)}>{err}</div>}

      {/* Photos */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:14, marginBottom:12}}>
        <div style={sectionLbl(TH)}>{L.photos} ({photoFiles.length}/{MAX_PHOTOS_PER_PROBLEM})</div>
        <div style={{display:"flex", gap:8, overflowX:"auto", paddingBottom:4}}>
          {photoPreviews.map((src, i) => (
            <div key={i} style={{position:"relative", flexShrink:0, borderRadius:10, overflow:"hidden", border:`1px solid ${TH.border}`}}>
              <img src={src} alt="" style={{width:80, height:80, objectFit:"cover", display:"block"}} />
              <button onClick={() => removePhoto(i)} style={{position:"absolute", top:3, right:3, background:"rgba(0,0,0,0.75)", border:"none", borderRadius:12, width:20, height:20, color:"#fff", cursor:"pointer", fontSize:11, padding:0}}>✕</button>
            </div>
          ))}
          {photoFiles.length < MAX_PHOTOS_PER_PROBLEM && (
            <>
              <button onClick={() => fileRef.current?.click()} style={{flexShrink:0, width:80, height:80, background:TH.bgCard, border:`2px dashed ${TH.border}`, borderRadius:10, color:TH.textMuted, cursor:"pointer", fontSize:22, fontFamily:"inherit"}}>+</button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={onFilesSelected} style={{display:"none"}} />
            </>
          )}
        </div>
      </div>

      {/* Category */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:14, marginBottom:12}}>
        <div style={sectionLbl(TH)}>{L.category}</div>
        <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(3, 1fr)":"repeat(6, 1fr)", gap:6}}>
          {Object.entries(CATEGORIES).map(([k, meta]) => {
            const on = category === k;
            return (
              <button key={k} onClick={() => { setCategory(k); setSubcategory(""); }} style={{
                background: on ? meta.color + "22" : "transparent",
                border: `2px solid ${on ? meta.color : TH.border}`,
                borderRadius: 10, color: on ? meta.color : TH.textMuted,
                padding: "10px 4px", cursor: "pointer", fontSize: 11,
                fontWeight: on ? 800 : 500, fontFamily: "inherit",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              }}>
                <span style={{fontSize:18}}>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {currentCat && Object.keys(currentCat.subcategories).length > 0 && (
          <div style={{marginTop:10}}>
            <div style={{fontSize:10, color:TH.textMuted, fontWeight:700, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px"}}>{L.subcategory}</div>
            <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit, minmax(180px, 1fr))", gap:6}}>
              {Object.entries(currentCat.subcategories).map(([sk, slabel]) => {
                const on = subcategory === sk;
                return (
                  <button key={sk} onClick={() => setSubcategory(sk)} style={{
                    background: on ? currentCat.color + "18" : "transparent",
                    border: `1px solid ${on ? currentCat.color : TH.border}`,
                    borderRadius: 8, color: on ? currentCat.color : TH.textMuted,
                    padding: "9px 11px", cursor: "pointer", fontSize: 11.5,
                    fontWeight: on ? 700 : 500, fontFamily: "inherit", textAlign: "left",
                  }}>
                    {on ? "✓ " : ""}{slabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentCat?.warnings?.length > 0 && (
          <div style={{marginTop:12, padding:11, background:"rgba(255,180,60,0.08)", border:"1px solid rgba(255,180,60,0.3)", borderRadius:10}}>
            <div style={{fontSize:10.5, fontWeight:800, color:"#D4B876", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px"}}>⚠️ Safety references (included in PDF)</div>
            {currentCat.warnings.map((w, i) => (
              <div key={i} style={{fontSize:11.5, color:TH.text, marginBottom: i < currentCat.warnings.length - 1 ? 8 : 0, lineHeight:1.45}}>
                • {w.text}
                <div style={{fontSize:10, color:TH.textMuted, marginTop:2, marginLeft:10}}>
                  <em>{w.source}</em>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Priority + Status */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:14, marginBottom:12}}>
        <div style={sectionLbl(TH)}>{L.priority} · Risk</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6, marginBottom:10}}>
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

        <div style={{...sectionLbl(TH), marginBottom:6}}>{L.statusLbl}</div>
        <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(3, 1fr)":"repeat(6, 1fr)", gap:6}}>
          {['ok', 'minor_issue', 'major_issue', 'critical', 'needs_repair', 'fixed'].map(k => {
            const meta = INSPECTION_STATUS[k];
            const on = status === k;
            return (
              <button key={k} onClick={() => setStatus(k)} style={{
                background: on ? meta.color + "22" : "transparent",
                border: `2px solid ${on ? meta.color : TH.border}`,
                borderRadius: 10, color: on ? meta.color : TH.textMuted,
                padding: "9px 4px", cursor: "pointer", fontSize: 10.5,
                fontWeight: on ? 700 : 500, fontFamily: "inherit",
              }}>
                {STATUS_LBL[k] || meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Title + report + action */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:14, marginBottom:14}}>
        <Field TH={TH} label={L.titleLbl}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={L.titlePh} style={{...inp(TH), fontSize:16, fontWeight:600}} autoFocus />
        </Field>
        <Field TH={TH} label={L.reportLbl}>
          <textarea value={report} onChange={e => setReport(e.target.value)} rows={4} placeholder={L.reportPh} style={{...inp(TH), resize:"vertical", minHeight:100}} />
        </Field>
        {status !== 'ok' && status !== 'fixed' && (
          <Field TH={TH} label={L.actionRequired}>
            <input value={actionRequired} onChange={e => setActionRequired(e.target.value)} placeholder={L.actionPh} style={inp(TH)} />
          </Field>
        )}
      </div>

      {/* Actions */}
      <div style={{display:"flex", gap:10}}>
        <button onClick={onCancel} style={{flex:1, ...ghostBtn(TH)}}>{L.cancel}</button>
        <button onClick={submit} disabled={!title.trim()} style={{
          flex:2, background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:12,
          color:"#000", padding:"15px", cursor: title.trim() ? "pointer" : "not-allowed",
          fontSize:15, fontWeight:800, fontFamily:"inherit", opacity: title.trim() ? 1 : 0.5,
        }}>
          ✓ Save problem
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// helpers
// ═══════════════════════════════════════════════════════════════════════
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
function sectionLbl(TH) {
  return { fontSize:11, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:8 };
}
function metaLbl(TH) {
  return { color:TH.textDim, fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:"0.4px" };
}
function errBox(TH) {
  return { background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:TH.text || "#8f8f8f", fontSize:13, marginBottom:14 };
}
function chip(color) {
  return { fontSize:10, color: color, background: color + "22", padding:"3px 8px", borderRadius:5, fontWeight:600 };
}
const goldBtn = {
  background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:12,
  color:"#000", padding:"14px 20px", cursor:"pointer", fontSize:14, fontWeight:800, fontFamily:"inherit",
};
function ghostBtn(TH) {
  return { background:"transparent", border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, padding:"14px 20px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit" };
}
function smallBtn(TH) {
  return { background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:TH.text, padding:"5px 10px", cursor:"pointer", fontSize:12, fontFamily:"inherit" };
}
