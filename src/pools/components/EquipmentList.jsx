// ═══════════════════════════════════════════════════════════════════
// EquipmentList.jsx — multi-equipment manager for a pool
// Displays list of pool_equipment rows. Each can be edited/deleted.
// New equipment via "+ Add equipment" button (opens editor form).
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";

const EQUIPMENT_TYPES = [
  { k: 'pump',        label: 'Pump',         color: '#7BB3D4' },
  { k: 'filter',      label: 'Filter',       color: '#B8935A' },
  { k: 'chlorinator', label: 'Chlorinator',  color: '#B8862C' },
  { k: 'dosing_pump', label: 'Dosing Pump',  color: '#8B7040' },
  { k: 'heater',      label: 'Heater',       color: '#E67A2C' },
  { k: 'uv',          label: 'UV Sanitizer', color: '#9370DB' },
  { k: 'ozone',       label: 'Ozone',        color: '#7A9A5B' },
  { k: 'skimmer',     label: 'Skimmer',      color: '#5B7A9A' },
  { k: 'other',       label: 'Other',        color: '#8f8f8f' },
];

const FILTER_MEDIA = ['sand', 'cartridge', 'de', 'glass', 'zeolite', 'other'];

export default function EquipmentList({ TH, poolId, isAdmin, onZoom }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // {row} or {new: true}

  useEffect(() => { load(); }, [poolId]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.from('pool_equipment')
        .select('*')
        .eq('pool_id', poolId)
        .eq('is_active', true)
        .order('equipment_type')
        .order('created_at');
      if (e) throw e;
      setItems(data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id) {
    if (!confirm("Delete this equipment? This hides it from the list.")) return;
    try {
      const { error: e } = await supabase.from('pool_equipment').update({ is_active: false }).eq('id', id);
      if (e) throw e;
      await load();
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  if (loading) return <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading equipment…</div>;

  return ( <div>{editing && ( <EquipmentEditor
          TH={TH} poolId={poolId} row={editing.row}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />)}

      {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:10, padding:"12px 14px", color:"#C43D3D", fontSize:13, marginBottom:14}}>{error}</div>} <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8}}><div style={{fontSize:12, color:TH.textMuted}}>{items.length} equipment {items.length === 1 ? 'item' : 'items'}</div>{isAdmin && ( <button onClick={() => setEditing({ new: true })} style={{background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:8, color:"#000", padding:"8px 14px", cursor:"pointer", fontSize:12, fontWeight:800, fontFamily:"inherit"}}>+ Add equipment </button>)} </div>{items.length === 0 ? ( <div style={{padding:40, background:TH.bgCard, border:`1px dashed ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center", fontSize:13}}>No equipment registered yet. {isAdmin && "Click \"Add equipment\" to start."} </div>) : ( <div style={{display:"flex", flexDirection:"column", gap:10}}>{items.map(it => {
            const type = EQUIPMENT_TYPES.find(t => t.k === it.equipment_type) || { label: it.equipment_type, color: '#8f8f8f' };
            const overdue = it.next_service_date && new Date(it.next_service_date) < new Date();
            const dueSoon = it.next_service_date && !overdue && (new Date(it.next_service_date) - new Date()) < 30 * 24 * 60 * 60 * 1000;
            return ( <div key={it.id} style={{
                background: TH.bgCard, border: `1px solid ${TH.border}`, borderRadius: 12,
                borderLeft: `3px solid ${overdue ? '#C43D3D' : type.color}`, padding: 14,
              }}><div style={{display:"flex", justifyContent:"space-between", gap:10, marginBottom:8, flexWrap:"wrap"}}><div style={{display:"flex", gap:10, alignItems:"center"}}><div><div style={{fontSize:13, fontWeight:800, color:TH.text}}>{it.label || type.label}
                        {it.label && <span style={{fontSize:10, color:TH.textMuted, fontWeight:400, marginLeft:6}}>· {type.label}</span>} </div><div style={{fontSize:11, color:TH.textMuted, marginTop:2}}>{[it.brand, it.model, it.serial_number && `SN: ${it.serial_number}`].filter(Boolean).join(' · ') || '—'} </div></div></div>{isAdmin && ( <div style={{display:"flex", gap:4}}><button onClick={() => setEditing({ row: it })} style={ghostBtn(TH)}>Edit</button><button onClick={() => deleteItem(it.id)} style={{...ghostBtn(TH), color:"#C43D3D"}}>Delete</button></div>)} </div>{/* Type-specific info */}
                {it.equipment_type === 'filter' && it.filter_media && ( <div style={{fontSize:11, color:TH.text, marginBottom:6}}><b>Media:</b> {it.filter_media} </div>)}

                {/* Service info */}
                {(it.last_service_date || it.next_service_date) && ( <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:6}}>{it.last_service_date && <Chip TH={TH}>Last: {it.last_service_date}</Chip>}
                    {it.next_service_date && ( <span style={{
                        fontSize:10, fontWeight:700,
                        background: overdue ? "rgba(196,61,61,0.15)" : dueSoon ? "rgba(230,122,44,0.15)" : TH.bgInput,
                        color: overdue ? "#C43D3D" : dueSoon ? "#E67A2C" : TH.textMuted,
                        padding:"3px 8px", borderRadius:5, whiteSpace:"nowrap",
                      }}>{overdue ? " Overdue" : dueSoon ? " Due soon" : "Next"}: {it.next_service_date} </span>)}
                    {it.install_date && <Chip TH={TH}>Installed: {it.install_date}</Chip>} </div>)}

                {it.notes && ( <div style={{fontSize:11, color:TH.textMuted, padding:8, background:TH.bgInput, borderRadius:6, marginTop:4}}>{it.notes} </div>)}

                {/* Photos */}
                {it.photos && it.photos.length > 0 && ( <div style={{display:"flex", gap:4, marginTop:8, flexWrap:"wrap"}}>{it.photos.map((url, i) => ( <img key={i} src={url} alt="" onClick={() => onZoom?.(url)} style={{width:60, height:60, objectFit:"cover", borderRadius:6, background:"#000", cursor:"pointer"}} loading="lazy" />))} </div>)} </div>);
          })} </div>)} </div>);
}

// ─── Editor form (add or edit) ─────────────────────────────────────
function EquipmentEditor({ TH, poolId, row = null, onClose, onSaved }) {
  const isNew = !row;
  const [form, setForm] = useState({
    equipment_type: row?.equipment_type || 'pump',
    label: row?.label || '',
    brand: row?.brand || '',
    model: row?.model || '',
    serial_number: row?.serial_number || '',
    install_date: row?.install_date || '',
    filter_media: row?.filter_media || '',
    last_service_date: row?.last_service_date || '',
    next_service_date: row?.next_service_date || '',
    service_interval_days: row?.service_interval_days || '',
    notes: row?.notes || '',
  });
  const [photos, setPhotos] = useState(row?.photos || []);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  function pickPhotos(e) {
    const files = Array.from(e.target.files || []);
    setNewFiles([...newFiles, ...files]);
    setNewPreviews([...newPreviews, ...files.map(f => URL.createObjectURL(f))]);
    if (fileRef.current) fileRef.current.value = "";
  }
  function removeNew(i) {
    URL.revokeObjectURL(newPreviews[i]);
    setNewFiles(newFiles.filter((_, x) => x !== i));
    setNewPreviews(newPreviews.filter((_, x) => x !== i));
  }
  function removeExisting(i) {
    setPhotos(photos.filter((_, x) => x !== i));
  }

  function pathFromUrl(url) {
    const marker = "/pool-photos/";
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.substring(idx + marker.length);
  }

  async function save() {
    setBusy(true); setError(null);
    try {
      const uploadedUrls = [];
      const stamp = Date.now();
      for (let i = 0; i < newFiles.length; i++) {
        const f = newFiles[i];
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${poolId}/eq-${stamp}-${String(i+1).padStart(2,'0')}.${ext}`;
        const { error: upErr } = await supabase.storage.from('pool-photos').upload(path, f, { upsert: true, contentType: f.type });
        if (upErr) throw new Error(`Photo: ${upErr.message}`);
        const { data: urlData } = supabase.storage.from('pool-photos').getPublicUrl(path);
        if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
      }

      // Delete removed photos from storage
      const removedUrls = (row?.photos || []).filter(u => !photos.includes(u));
      const removedPaths = removedUrls.map(pathFromUrl).filter(Boolean);
      if (removedPaths.length > 0) {
        await supabase.storage.from('pool-photos').remove(removedPaths);
      }

      const payload = {
        pool_id: poolId,
        equipment_type: form.equipment_type,
        label: form.label.trim() || null,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        serial_number: form.serial_number.trim() || null,
        install_date: form.install_date || null,
        filter_media: form.equipment_type === 'filter' ? (form.filter_media || null) : null,
        last_service_date: form.last_service_date || null,
        next_service_date: form.next_service_date || null,
        service_interval_days: form.service_interval_days ? Number(form.service_interval_days) : null,
        photos: [...photos, ...uploadedUrls],
        notes: form.notes.trim() || null,
      };

      if (isNew) {
        const { error: e } = await supabase.from('pool_equipment').insert([payload]);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('pool_equipment').update(payload).eq('id', row.id);
        if (e) throw e;
      }

      newPreviews.forEach(url => URL.revokeObjectURL(url));
      onSaved?.();
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  }

  return ( <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}><div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:20, width:"100%", maxWidth:560, maxHeight:"92vh", overflowY:"auto"}}><div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}><div style={{fontSize:16, fontWeight:800, color:TH.text, fontFamily:"'Playfair Display', Georgia, serif"}}>{isNew ? ' Add equipment' : ' Edit equipment'} </div><button onClick={onClose} disabled={busy} style={{background:"transparent", border:"none", color:TH.textMuted, fontSize:22, cursor:"pointer", padding:4, lineHeight:1}}></button></div><div style={{marginBottom:12}}><label style={lbl(TH)}>Type *</label><div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:6}}>{EQUIPMENT_TYPES.map(t => {
              const on = form.equipment_type === t.k;
              return ( <button key={t.k} onClick={() => setForm({...form, equipment_type: t.k})} disabled={busy} style={{
                  background: on ? t.color + "22" : "transparent",
                  border: `2px solid ${on ? t.color : TH.border}`,
                  borderRadius: 8, color: on ? t.color : TH.textMuted,
                  padding: "8px 4px", cursor: "pointer", fontSize: 10, fontWeight: on ? 800 : 500,
                  fontFamily: "inherit", display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                }}><div>{t.label}</div></button>);
            })} </div></div><div style={{marginBottom:10}}><label style={lbl(TH)}>Label (e.g. "Main Pump", "Filter #2")</label><input value={form.label} onChange={e => setForm({...form, label: e.target.value})} disabled={busy} style={inp(TH)} /></div><div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10}}><div><label style={lbl(TH)}>Brand</label><input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} disabled={busy} style={inp(TH)} /></div><div><label style={lbl(TH)}>Model</label><input value={form.model} onChange={e => setForm({...form, model: e.target.value})} disabled={busy} style={inp(TH)} /></div></div><div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:10}}><div><label style={lbl(TH)}>Serial number</label><input value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} disabled={busy} style={inp(TH)} /></div><div><label style={lbl(TH)}>Install date</label><input type="date" value={form.install_date} onChange={e => setForm({...form, install_date: e.target.value})} disabled={busy} style={inp(TH)} /></div></div>{form.equipment_type === 'filter' && ( <div style={{marginBottom:10}}><label style={lbl(TH)}>Filter media</label><select value={form.filter_media} onChange={e => setForm({...form, filter_media: e.target.value})} disabled={busy} style={inp(TH)}><option value="">—</option>{FILTER_MEDIA.map(m => <option key={m} value={m}>{m}</option>)} </select></div>)} <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10}}><div><label style={lbl(TH)}>Last service</label><input type="date" value={form.last_service_date} onChange={e => setForm({...form, last_service_date: e.target.value})} disabled={busy} style={inp(TH)} /></div><div><label style={lbl(TH)}>Next service</label><input type="date" value={form.next_service_date} onChange={e => setForm({...form, next_service_date: e.target.value})} disabled={busy} style={inp(TH)} /></div><div><label style={lbl(TH)}>Interval (days)</label><input type="number" min="0" value={form.service_interval_days} onChange={e => setForm({...form, service_interval_days: e.target.value})} disabled={busy} style={inp(TH)} /></div></div><div style={{marginBottom:12}}><label style={lbl(TH)}>Photos</label><div style={{display:"flex", gap:6, flexWrap:"wrap"}}>{photos.map((url, i) => ( <div key={"e"+i} style={{position:"relative", borderRadius:8, overflow:"hidden", border:`1px solid ${TH.border}`, background:"#000"}}><img src={url} alt="" style={{width:80, height:80, objectFit:"cover", display:"block"}} /><button onClick={() => removeExisting(i)} disabled={busy} style={{position:"absolute", top:2, right:2, background:"rgba(0,0,0,0.75)", border:"none", borderRadius:10, width:20, height:20, color:"#fff", cursor:"pointer", fontSize:11, padding:0, lineHeight:1}}></button></div>))}
            {newPreviews.map((src, i) => ( <div key={"n"+i} style={{position:"relative", borderRadius:8, overflow:"hidden", border:`2px solid #B8935A`, background:"#000"}}><img src={src} alt="" style={{width:80, height:80, objectFit:"cover", display:"block"}} /><button onClick={() => removeNew(i)} disabled={busy} style={{position:"absolute", top:2, right:2, background:"rgba(0,0,0,0.75)", border:"none", borderRadius:10, width:20, height:20, color:"#fff", cursor:"pointer", fontSize:11, padding:0, lineHeight:1}}></button><div style={{position:"absolute", bottom:0, left:0, right:0, background:"rgba(184,147,90,0.85)", color:"#000", fontSize:8, fontWeight:800, textAlign:"center"}}>NEW</div></div>))} <button onClick={() => fileRef.current?.click()} disabled={busy} style={{width:80, height:80, background:"transparent", border:`2px dashed ${TH.border}`, borderRadius:8, color:TH.textMuted, cursor:"pointer", fontSize:26, fontFamily:"inherit"}}>+</button><input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={pickPhotos} style={{display:"none"}} /></div></div><div style={{marginBottom:14}}><label style={lbl(TH)}>Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} disabled={busy} rows={2} style={{...inp(TH), resize:"vertical"}} placeholder="Optional" /></div>{error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:8, padding:"10px 12px", color:"#C43D3D", fontSize:12, marginBottom:10}}>{error}</div>} <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}><button onClick={onClose} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>Cancel</button><button onClick={save} disabled={busy} style={{background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:9, color:"#000", padding:"10px 24px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit", opacity:busy?0.6:1}}>{busy ? "Saving…" : (isNew ? "Add equipment" : "Save changes")} </button></div></div></div>);
}

function Chip({ TH, children }) {
  return <span style={{fontSize:10, color:TH.textMuted, background:TH.bgInput, padding:"3px 8px", borderRadius:5, whiteSpace:"nowrap"}}>{children}</span>;
}
function ghostBtn(TH) { return { background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"5px 10px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }; }
function lbl(TH)  { return { display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }; }
function inp(TH) { return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }; }
