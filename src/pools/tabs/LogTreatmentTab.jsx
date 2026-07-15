// ═══════════════════════════════════════════════════════════════════
// LogTreatmentTab.jsx — mobile-first form to log a pool treatment
// Auto-deducts chemicals from warehouse via DB trigger
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import {
 POOL_TYPES, CHEMICAL_PURPOSES, CLARITY_OPTIONS,
 recommendedDose, estimatedCost,
 phStatus, chlorineStatus,
 fmtQty, fmtMoney, nextTreatmentNo,
} from "../lib/poolUtils";

export default function LogTreatmentTab({ TH, isMobile, onSaved }) {
 const [pools, setPools] = useState([]);
 const [chemicals, setChemicals] = useState([]);
 const [warehouses, setWarehouses] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [busy, setBusy] = useState(false);
 const [success, setSuccess] = useState(null);
 const [progress, setProgress] = useState(null);
 // Form state
 const [poolId, setPoolId] = useState("");
 const [operatorName, setOperatorName] = useState("");
 const [warehouseId, setWarehouseId] = useState("");
 const [phBefore, setPhBefore] = useState("");
 const [phAfter, setPhAfter] = useState("");
 const [chlorine, setChlorine] = useState("");
 const [waterTemp, setWaterTemp] = useState("");
 const [clarity, setClarity] = useState("clear");
 const [notes, setNotes] = useState("");
 const [lines, setLines] = useState([]);  // [{ chemical_id, qty }]
 const [photoFiles, setPhotoFiles] = useState([]);
 const [photoPreviews, setPhotoPreviews] = useState([]);
 const fileRef = useRef(null);
 useEffect(() => { loadAll(); }, []);
 async function loadAll() {
 setLoading(true);
 try {
 const { data: { user } } = await supabase.auth.getUser();
 const [rP, rC, rW] = await Promise.all([
 supabase.from('pools').select('*').eq('is_active', true).order('code'),
 supabase.from('pool_chemicals').select('*').eq('is_active', true).order('purpose, name'),
 supabase.from('warehouses').select('id, code, name').eq('is_active', true).order('id'),
 ]);
 if (rP.error) throw rP.error;
 setPools(rP.data || []);
 setChemicals(rC.data || []);
 setWarehouses(rW.data || []);
 if (rW.data?.length && !warehouseId) setWarehouseId(rW.data[0].id);
 if (user && !operatorName) {
 const meta = user.user_metadata || {};
 setOperatorName(meta.full_name || user.email?.split('@')[0] || '');
 }
 } catch (e) {
 setError(e.message || String(e));
 } finally {
 setLoading(false);
 }
 }
 const selectedPool = pools.find(p =>String(p.id) === String(poolId));
 function toggleChemical(chemId) {
 setLines(prev => {
 const idx = prev.findIndex(l => l.chemical_id === chemId);
 if (idx >= 0) return prev.filter((_, i) => i !== idx);
 const chem = chemicals.find(c => c.id === chemId);
 const dose = selectedPool ? recommendedDose(chem, selectedPool.volume_m3) : 0;
 return [...prev, { chemical_id: chemId, qty: dose || 0 }];
 });
 }
 function updateLineQty(chemId, qty) {
 setLines(prev => prev.map(l => l.chemical_id === chemId ? { ...l, qty: Number(qty) || 0 } : l));
 }
 function onFilesSelected(e) {
 const files = Array.from(e.target.files || []);
 if (!files.length) return;
 const valid = files.filter(f => f.size <= 15 * 1024 * 1024);
 setPhotoFiles(prev => [...prev, ...valid]);
 setPhotoPreviews(prev => [...prev, ...valid.map(f =>URL.createObjectURL(f))]);
 if (fileRef.current) fileRef.current.value = "";
 }
 function removePhoto(i) {
 setPhotoFiles(prev => prev.filter((_, x) => x !== i));
 setPhotoPreviews(prev => prev.filter((_, x) => x !== i));
 }
 function resetForm() {
 setPoolId(""); setPhBefore(""); setPhAfter(""); setChlorine(""); setWaterTemp("");
 setClarity("clear"); setNotes(""); setLines([]);
 setPhotoFiles([]); setPhotoPreviews([]);
 setSuccess(null); setError(null); setProgress(null);
 }
 async function submit() {
 setBusy(true); setError(null); setProgress(null);
 try {
 if (!poolId) throw new Error("Select a pool.");
 if (!operatorName.trim()) throw new Error("Operator name required.");
 if (photoFiles.length === 0) throw new Error("At least one photo is required as evidence.");
 if (lines.length === 0) throw new Error("Select at least one chemical used.");
 const { data: { user } } = await supabase.auth.getUser();
 const treatment_no = await nextTreatmentNo(supabase);
 // Upload photos
 const uploaded = [];
 for (let i = 0; i < photoFiles.length; i++) {
 setProgress({ done: i, total: photoFiles.length });
 const file = photoFiles[i];
 const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
 const path = `pool-treatments/${treatment_no}/photo-${i+1}.${ext}`;
 const { error: upErr } = await supabase.storage.from('inspection-photos').upload(path, file, {
 upsert: true, contentType: file.type,
 });
 if (upErr) throw upErr;
 const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(path);
 if (urlData?.publicUrl) uploaded.push(urlData.publicUrl);
 }
 setProgress({ done: photoFiles.length, total: photoFiles.length });
 // Insert treatment record
 const { data: tData, error: e1 } = await supabase.from('pool_treatments').insert([{
 treatment_no,
 pool_id: Number(poolId),
 operator_id: user?.id,
 operator_name: operatorName.trim(),
 performed_at: new Date().toISOString(),
 ph_before: phBefore || null,
 ph_after: phAfter || null,
 chlorine_ppm: chlorine || null,
 water_temp: waterTemp || null,
 clarity,
 photos: uploaded,
 notes: notes.trim() || null,
 }]).select().single();
 if (e1) throw e1;
 // Insert lines — trigger auto-deducts stock
 const rows = lines.map(l => {
 const chem = chemicals.find(c => c.id === l.chemical_id);
 return {
 treatment_id: tData.id,
 chemical_id: l.chemical_id,
 chemical_name: chem?.name,
 qty: l.qty,
 unit: chem?.unit,
 warehouse_id: Number(warehouseId),
 };
 });
 const { error: e2 } = await supabase.from('pool_treatment_lines').insert(rows);
 if (e2) throw e2;
 setSuccess(treatment_no);
 setTimeout(() => { resetForm(); onSaved?.(); }, 1600);
 } catch (e) {
 setError(e.message || String(e));
 } finally {
 setBusy(false);
 setProgress(null);
 }
 }
 const totalEstCost = lines.reduce((sum, l) => {
 const chem = chemicals.find(c => c.id === l.chemical_id);
 return sum + estimatedCost(chem, l.qty);
 }, 0);
 if (loading) return <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading...</div>;
 if (success) {
 return (
      <div style={{padding:"48px 20px", textAlign:"center", background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:16, boxShadow: TH.cardGlow}}>
        <div style={{fontSize:56, marginBottom:12}}>✅</div>
        <div style={{fontSize:22, fontWeight:800, color:"#C9A960", marginBottom:6, fontFamily:"'Playfair Display', Georgia, serif"}}>Treatment saved</div>
        <div style={{fontSize:14, color:TH.text, fontFamily:"monospace", marginBottom:10}}>{success}</div>
        <div style={{fontSize:12, color:TH.textMuted}}>Chemicals deducted from warehouse </div>
      </div> );
 }
 return (
    <div> {error && <ErrBox TH={TH}>{error}</ErrBox>}
 {/* Header — pool & operator */}
      <SectionCard TH={TH} title="Treatment header">
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10}}>
          <Field TH={TH} label="Pool *">
            <select value={poolId} onChange={e => { setPoolId(e.target.value); setLines([]); }} style={inp(TH)}>
              <option value="">Select pool...</option> {pools.map(p => {
 const type = POOL_TYPES[p.pool_type] || POOL_TYPES.main;
 return <option key={p.id} value={p.id}> {p.name} ({p.volume_m3} m³)</option>;
 })}
            </select>
          </Field>
          <Field TH={TH} label="Operator *"><input value={operatorName} onChange={e => setOperatorName(e.target.value)} style={inp(TH)} /></Field>
          <Field TH={TH} label="Withdraw chemicals from">
            <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} style={inp(TH)}> {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
        </div> {selectedPool && (
          <div style={{marginTop:10, padding:10, background:"rgba(201,169,96,0.08)", border:"1px solid rgba(201,169,96,0.20)", borderRadius:8, fontSize:12, color:TH.text}}>
             <strong>{selectedPool.name}</strong> · Volume <strong>{Number(selectedPool.volume_m3).toLocaleString()} m³</strong>
            <div style={{fontSize:11, color:TH.textMuted, marginTop:3}}>Chemicals below will auto-fill with recommended doses for this volume.</div>
          </div> )}
      </SectionCard> {/* Water readings */}
      <SectionCard TH={TH} title="Water readings (optional)">
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, 1fr)", gap:10}}>
          <Field TH={TH} label="pH before">
            <input type="number" step="0.1" value={phBefore} onChange={e => setPhBefore(e.target.value)} placeholder="7.4" style={inp(TH)} /> {phBefore && <StatusRow s={phStatus(phBefore)} />}
          </Field>
          <Field TH={TH} label="pH after">
            <input type="number" step="0.1" value={phAfter} onChange={e => setPhAfter(e.target.value)} placeholder="7.4" style={inp(TH)} /> {phAfter && <StatusRow s={phStatus(phAfter)} />}
          </Field>
          <Field TH={TH} label="Chlorine (ppm)">
            <input type="number" step="0.1" value={chlorine} onChange={e => setChlorine(e.target.value)} placeholder="2.0" style={inp(TH)} /> {chlorine && <StatusRow s={chlorineStatus(chlorine)} />}
          </Field>
          <Field TH={TH} label="Water temp (°C)">
            <input type="number" step="0.1" value={waterTemp} onChange={e => setWaterTemp(e.target.value)} placeholder="26" style={inp(TH)} />
          </Field>
        </div>
        <div style={{marginTop:12}}>
          <div style={{fontSize:11, color:TH.textMuted, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px"}}>Water clarity</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6}}> {Object.entries(CLARITY_OPTIONS).map(([k, v]) => {
 const on = clarity === k;
 return (
                <button key={k} onClick={() => setClarity(k)} style={{
 background: on ? v.color + "22" : "transparent",
 border: `2px solid ${on ? v.color : TH.border}`,
 borderRadius: 10, color: on ? v.color : TH.textMuted,
 padding: "10px 4px", cursor: "pointer", fontSize: 12,
 fontWeight: on ? 700 : 500, fontFamily: "inherit",
 }}>{v.label}</button> );
 })}
          </div>
        </div>
      </SectionCard> {/* Chemicals */}
      <SectionCard TH={TH} title="Chemicals used *"> {!selectedPool && <div style={{padding:20, fontSize:12, color:TH.textDim, textAlign:"center"}}>Select a pool first to see recommended doses.</div>}
 {selectedPool && (
          <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(240px, 1fr))", gap:8}}> {chemicals.map(chem => {
 const purp = CHEMICAL_PURPOSES[chem.purpose] || {};
 const selectedLine = lines.find(l => l.chemical_id === chem.id);
 const recDose = recommendedDose(chem, selectedPool.volume_m3);
 const cost = estimatedCost(chem, selectedLine?.qty || 0);
 return (
                <div key={chem.id} onClick={(e) => { if (e.target.tagName !== 'INPUT') toggleChemical(chem.id); }} style={{
 background: selectedLine ? "rgba(201,169,96,0.08)" : TH.bgInput,
 border: `2px solid ${selectedLine ? (purp.color || "#C9A960") : TH.border}`,
 borderRadius: 10, padding: 12, cursor: "pointer",
 }}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6}}>
                    <div style={{fontSize:12, fontWeight:700, color:TH.text}}>{selectedLine ? ' ' : ''}{chem.name}</div>
                    <span style={{fontSize:18}}></span>
                  </div>
                  <div style={{fontSize:10, color:TH.textMuted, marginBottom:selectedLine?8:0}}>{purp.label} · rec {fmtQty(recDose, chem.unit)}</div> {selectedLine && (
                    <div style={{display:"flex", gap:6, alignItems:"center"}}>
                      <input
 type="number" step="0.1" value={selectedLine.qty}
 onChange={e => updateLineQty(chem.id, e.target.value)}
 onClick={e => e.stopPropagation()}
 style={{...inp(TH), fontSize:15, fontWeight:700, padding:"6px 8px", width:90, textAlign:"center"}}
 />
                      <span style={{fontSize:11, color:TH.textMuted}}>{chem.unit}</span>
                      <span style={{marginLeft:"auto", fontSize:12, color:"#C9A960", fontWeight:700, fontFamily:"monospace"}}>{fmtMoney(cost)}</span>
                    </div> )}
                </div> );
 })}
          </div> )}
 {lines.length > 0 && (
          <div style={{marginTop:12, padding:12, background:"rgba(201,169,96,0.10)", borderRadius:8, display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13}}>
            <span style={{color:TH.text, fontWeight:600}}>Total estimated cost:</span>
            <span style={{color:"#C9A960", fontWeight:800, fontFamily:"monospace", fontSize:16}}>{fmtMoney(totalEstCost)}</span>
          </div> )}
      </SectionCard> {/* Photos */}
      <SectionCard TH={TH} title="Evidence photos * (required)">
        <div style={{display:"flex", gap:8, overflowX:"auto", paddingBottom:4}}> {photoPreviews.map((src, i) => (
            <div key={i} style={{position:"relative", flexShrink:0, borderRadius:10, overflow:"hidden", border:`1px solid ${TH.border}`}}>
              <img src={src} alt="" style={{width:84, height:84, objectFit:"cover", display:"block"}} />
              <button onClick={() => removePhoto(i)} style={{position:"absolute", top:3, right:3, background:"rgba(0,0,0,0.75)", border:"none", borderRadius:12, width:20, height:20, color:"#fff", cursor:"pointer", fontSize:11, padding:0}}></button>
            </div> ))}
          <button onClick={() => fileRef.current?.click()} style={{flexShrink:0, width:84, height:84, background:TH.bgCard, border:`2px dashed ${TH.border}`, borderRadius:10, color:TH.textMuted, cursor:"pointer", fontSize:24, fontFamily:"inherit"}}>+</button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={onFilesSelected} style={{display:"none"}} />
        </div>
      </SectionCard> {/* Notes */}
      <SectionCard TH={TH} title="Notes">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
 placeholder="Observations, backwashing done, other maintenance..."
 style={{...inp(TH), resize:"vertical", minHeight:80}} />
      </SectionCard> {progress && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:10, padding:10, marginBottom:10}}>
          <div style={{fontSize:12, color:TH.textMuted, marginBottom:6}}>Uploading {progress.done} / {progress.total} photos...</div>
          <div style={{height:4, background:TH.bgInput, borderRadius:2, overflow:"hidden"}}>
            <div style={{height:"100%", width:`${(progress.done/progress.total)*100}%`, background:"linear-gradient(90deg,#C9A960,#D4B876)", transition:"width .2s"}}/>
          </div>
        </div> )}

      <div style={{display:"flex", gap:10, marginTop:14}}>
        <button onClick={resetForm} disabled={busy} style={{flex:1, ...ghostBtn(TH)}}>Cancel</button>
        <button onClick={submit} disabled={busy || !poolId || photoFiles.length===0 || lines.length===0} style={{
 flex:2, background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:12,
 color:"#000", padding:"16px", cursor:"pointer", fontSize:15, fontWeight:800, fontFamily:"inherit",
 opacity:(busy||!poolId||photoFiles.length===0||lines.length===0)?0.5:1,
 boxShadow:busy?"none":"0 4px 14px rgba(201,169,96,0.3)",
 }}>{busy ? "Saving..." : " Save treatment"}</button>
      </div>
    </div> );
}

// ─── helpers ────────────────────────────────────────────────────────
function StatusRow({ s }) {
 if (!s) return null;
 return <div style={{marginTop:4, fontSize:10, fontWeight:800, color: s.color}}> {s.label}{s.urgent ? " " : ""}</div>;
}
function Field({ TH, label, children }) {
 return (
    <div>
      <label style={{display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px"}}>{label}</label> {children}
    </div> );
}
function SectionCard({ TH, title, children }) {
 return (
    <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:14, marginBottom:12, boxShadow: TH.cardGlow}}> {title && <div style={{fontSize:12, fontWeight:800, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:10}}>{title}</div>}
 {children}
    </div> );
}
function inp(TH) {
 return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:9, padding:"10px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
function ghostBtn(TH) {
 return { background:"transparent", border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, padding:"14px 20px", cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"inherit" };
}
function ErrBox({ TH, children }) {
 return <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{children}</div>;
}
