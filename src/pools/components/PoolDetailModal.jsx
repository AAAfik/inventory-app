// ═══════════════════════════════════════════════════════════════════
// PoolDetailModal.jsx — modal with 4 sub-tabs for one pool
// Overview · Equipment · Operations · History (consumables used)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { formatDate, formatDateShort } from "../../inspection/lib/inspectionUtils";
import NewOperationModal from "./NewOperationModal";
import EquipmentList from "./EquipmentList";

const FILTER_TYPES = ['sand', 'cartridge', 'de', 'glass', 'zeolite', 'other'];
const CHLORINE_SYSTEMS = ['manual', 'auto', 'salt', 'uv', 'mixed'];

const OP_META = {
  cleaning:        { icon: '🧹', color: '#7BB3D4', label: 'Cleaning' },
  chemical_dosing: { icon: '🧪', color: '#C9A960', label: 'Chemical Dosing' },
  maintenance:     { icon: '🔧', color: '#8B7A44', label: 'Maintenance' },
  filter_change:   { icon: '🔄', color: '#B8862C', label: 'Filter Change' },
};

export default function PoolDetailModal({ TH, lang = "en", isMobile, isAdmin, poolId, onClose }) {
  const [pool, setPool]     = useState(null);
  const [operations, setOperations] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [subTab, setSubTab] = useState("overview");
  const [showNewOp, setShowNewOp] = useState(false);
  const [zoom, setZoom]     = useState(null);

  useEffect(() => { load(); }, [poolId]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rP, rO, rC] = await Promise.all([
        supabase.from('pools').select('*').eq('id', poolId).single(),
        supabase.from('pool_operations_enriched').select('*').eq('pool_id', poolId).order('performed_at', { ascending: false }).limit(100),
        supabase.from('consumable_history_by_pool').select('*').eq('destination_pool_id', poolId).order('performed_at', { ascending: false }).limit(100),
      ]);
      if (rP.error) throw rP.error;
      setPool(rP.data);
      setOperations(rO.data || []);
      setConsumables(rC.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  if (loading || !pool) {
    return (
      <div style={overlay}>
        <div style={{...panel(TH), padding:40, textAlign:"center", color:TH.textMuted}}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={overlay}>
      {zoom && (
        <div onClick={() => setZoom(null)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:10001, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:20}}>
          <img src={zoom} alt="" style={{maxWidth:"100%", maxHeight:"100%", objectFit:"contain"}} />
        </div>
      )}
      {showNewOp && (
        <NewOperationModal
          TH={TH} lang={lang} isMobile={isMobile}
          presetPoolId={poolId}
          onClose={() => setShowNewOp(false)}
          onDone={() => { setShowNewOp(false); load(); }}
        />
      )}

      <div style={panel(TH)}>
        {/* Header */}
        <div style={{position:"sticky", top:0, background:TH.bgCard, padding:"16px 20px", borderBottom:`1px solid ${TH.border}`, zIndex:1}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:11, color:TH.textDim, fontFamily:"monospace", marginBottom:3}}>{pool.code}</div>
              <div style={{fontSize:isMobile?18:22, fontWeight:800, color:TH.text, fontFamily:"'Playfair Display', Georgia, serif"}}>{pool.name}</div>
              {pool.location_note && <div style={{fontSize:11, color:TH.textMuted, marginTop:2}}>📍 {pool.location_note}</div>}
            </div>
            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <button onClick={() => setShowNewOp(true)} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:8, color:"#000", padding:"8px 14px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit"}}>
                ⚙️ New Op
              </button>
              <button onClick={onClose} style={{background:"transparent", border:"none", color:TH.textMuted, fontSize:22, cursor:"pointer", padding:4, lineHeight:1}}>✕</button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div style={{display:"flex", gap:4, marginTop:12, overflowX:"auto"}}>
            {[
              { k: "overview",   label: "📋 Overview" },
              { k: "equipment",  label: "🔧 Equipment" },
              { k: "operations", label: `⚙️ Operations (${operations.length})` },
              { k: "history",    label: `📜 History (${consumables.length})` },
            ].map(t => (
              <button key={t.k} onClick={() => setSubTab(t.k)} style={{
                background: subTab === t.k ? TH.accentBg : "transparent",
                border: `1px solid ${subTab === t.k ? TH.accentBorder : "transparent"}`,
                borderRadius: 8, color: subTab === t.k ? TH.accentText : TH.textMuted,
                padding: "7px 12px", cursor: "pointer",
                fontSize: 12, fontWeight: subTab === t.k ? 700 : 500,
                fontFamily: "inherit", whiteSpace:"nowrap",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{padding:20}}>
          {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:10, padding:"12px 14px", color:"#C43D3D", fontSize:13, marginBottom:14}}>{error}</div>}

          {subTab === "overview" && <OverviewSubTab TH={TH} pool={pool} operations={operations} />}
          {subTab === "equipment" && <EquipmentList TH={TH} poolId={poolId} isAdmin={isAdmin} onZoom={setZoom} />}
          {subTab === "operations" && <OperationsSubTab TH={TH} operations={operations} onZoom={setZoom} />}
          {subTab === "history" && <HistorySubTab TH={TH} consumables={consumables} />}
        </div>
      </div>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────
function OverviewSubTab({ TH, pool, operations }) {
  const recent = operations.slice(0, 5);
  return (
    <div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))", gap:10, marginBottom:16}}>
        <Info TH={TH} label="Volume">{pool.volume_m3 ? `${pool.volume_m3} m³` : '—'}</Info>
        <Info TH={TH} label="Depth">{pool.depth_m ? `${pool.depth_m} m` : '—'}</Info>
        <Info TH={TH} label="Surface">{pool.surface_m2 ? `${pool.surface_m2} m²` : '—'}</Info>
        <Info TH={TH} label="Type">{pool.pool_type || '—'}</Info>
        <Info TH={TH} label="Filter">{pool.filter_type || '—'}</Info>
        <Info TH={TH} label="Chlorine">{pool.chlorine_system || '—'}</Info>
      </div>

      {pool.filter_next_change && (
        <div style={{background:"rgba(184,134,44,0.1)", border:"1px solid rgba(184,134,44,0.3)", borderRadius:10, padding:12, marginBottom:14, fontSize:12, color:"#B8862C"}}>
          🔄 Next filter change: <b>{formatDateShort(pool.filter_next_change)}</b>
        </div>
      )}

      <div style={{fontSize:12, fontWeight:800, color:TH.text, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px"}}>Recent operations</div>
      {recent.length === 0 ? (
        <div style={{padding:20, background:TH.bgInput, borderRadius:10, textAlign:"center", color:TH.textMuted, fontSize:12}}>No operations yet</div>
      ) : (
        recent.map(op => {
          const m = OP_META[op.operation_type] || {};
          return (
            <div key={op.id} style={{background:TH.bgInput, borderRadius:8, padding:"8px 12px", marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center", borderLeft:`3px solid ${m.color || '#8f8f8f'}`}}>
              <div>
                <div style={{fontSize:12, fontWeight:700, color:TH.text}}>{m.icon} {m.label || op.operation_type}</div>
                {op.notes && <div style={{fontSize:11, color:TH.textMuted, marginTop:2}}>{op.notes}</div>}
              </div>
              <div style={{fontSize:10, color:TH.textDim}}>{formatDateShort(op.performed_at)}</div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Equipment (editable) ─────────────────────────────────────────
function EquipmentSubTab({ TH, pool, isAdmin, onSaved, onZoom }) {
  const [edit, setEdit] = useState({
    pump_brand: pool.pump_brand || '',
    pump_model: pool.pump_model || '',
    filter_type: pool.filter_type || '',
    filter_brand: pool.filter_brand || '',
    filter_model: pool.filter_model || '',
    filter_last_changed: pool.filter_last_changed || '',
    filter_next_change: pool.filter_next_change || '',
    chlorine_system: pool.chlorine_system || '',
    equipment_notes: pool.equipment_notes || '',
  });
  const [pumpPhotos, setPumpPhotos] = useState(pool.pump_photos || []);
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([]);
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function pickPhotos(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setNewPhotoFiles([...newPhotoFiles, ...files]);
    setNewPhotoPreviews([...newPhotoPreviews, ...files.map(f => URL.createObjectURL(f))]);
    if (fileRef.current) fileRef.current.value = "";
  }
  function removeNewPhoto(i) {
    URL.revokeObjectURL(newPhotoPreviews[i]);
    setNewPhotoFiles(newPhotoFiles.filter((_, x) => x !== i));
    setNewPhotoPreviews(newPhotoPreviews.filter((_, x) => x !== i));
  }
  function removeExistingPhoto(i) {
    setPumpPhotos(pumpPhotos.filter((_, x) => x !== i));
  }

  function pathFromUrl(url) {
    const marker = "/pool-photos/";
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.substring(idx + marker.length);
  }

  async function save() {
    setBusy(true); setError(null);
    try {
      // Upload new photos
      const uploadedUrls = [];
      const stamp = Date.now();
      for (let i = 0; i < newPhotoFiles.length; i++) {
        const f = newPhotoFiles[i];
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${pool.id}/pump-${stamp}-${String(i+1).padStart(2,'0')}.${ext}`;
        const { error: upErr } = await supabase.storage.from('pool-photos').upload(path, f, { upsert: true, contentType: f.type });
        if (upErr) throw new Error(`Photo: ${upErr.message}`);
        const { data: urlData } = supabase.storage.from('pool-photos').getPublicUrl(path);
        if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
      }

      // Detect removed photos + delete from storage
      const removedUrls = (pool.pump_photos || []).filter(u => !pumpPhotos.includes(u));
      const removedPaths = removedUrls.map(pathFromUrl).filter(Boolean);
      if (removedPaths.length > 0) {
        await supabase.storage.from('pool-photos').remove(removedPaths);
      }

      const finalPhotos = [...pumpPhotos, ...uploadedUrls];

      const { error: e } = await supabase.from('pools').update({
        ...edit,
        pump_photos: finalPhotos,
        filter_last_changed: edit.filter_last_changed || null,
        filter_next_change: edit.filter_next_change || null,
      }).eq('id', pool.id);
      if (e) throw e;

      newPhotoPreviews.forEach(url => URL.revokeObjectURL(url));
      onSaved?.();
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Pump photos */}
      <div style={{marginBottom:16}}>
        <label style={lbl(TH)}>Pump room / equipment photos</label>
        <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
          {pumpPhotos.map((url, i) => (
            <div key={"e"+i} style={{position:"relative", flexShrink:0, borderRadius:8, overflow:"hidden", border:`1px solid ${TH.border}`, background:"#000"}}>
              <img src={url} alt="" style={{width:100, height:100, objectFit:"cover", display:"block", cursor:"pointer"}} onClick={() => onZoom?.(url)} />
              {isAdmin && <button onClick={() => removeExistingPhoto(i)} style={{position:"absolute", top:2, right:2, background:"rgba(0,0,0,0.75)", border:"none", borderRadius:10, width:22, height:22, color:"#fff", cursor:"pointer", fontSize:12}}>✕</button>}
            </div>
          ))}
          {newPhotoPreviews.map((src, i) => (
            <div key={"n"+i} style={{position:"relative", flexShrink:0, borderRadius:8, overflow:"hidden", border:`2px solid #C9A960`, background:"#000"}}>
              <img src={src} alt="" style={{width:100, height:100, objectFit:"cover", display:"block"}} />
              <button onClick={() => removeNewPhoto(i)} style={{position:"absolute", top:2, right:2, background:"rgba(0,0,0,0.75)", border:"none", borderRadius:10, width:22, height:22, color:"#fff", cursor:"pointer", fontSize:12}}>✕</button>
              <div style={{position:"absolute", bottom:0, left:0, right:0, background:"rgba(201,169,96,0.85)", color:"#000", fontSize:9, fontWeight:800, textAlign:"center", padding:"2px 0"}}>NEW</div>
            </div>
          ))}
          {isAdmin && (
            <button onClick={() => fileRef.current?.click()} disabled={busy} style={{flexShrink:0, width:100, height:100, background:"transparent", border:`2px dashed ${TH.border}`, borderRadius:8, color:TH.textMuted, cursor:"pointer", fontSize:28, fontFamily:"inherit"}}>+</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={pickPhotos} style={{display:"none"}} />
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12}}>
        <div>
          <label style={lbl(TH)}>Pump brand</label>
          <input value={edit.pump_brand} onChange={e => setEdit({...edit, pump_brand: e.target.value})} disabled={!isAdmin || busy} style={inp(TH)} />
        </div>
        <div>
          <label style={lbl(TH)}>Pump model</label>
          <input value={edit.pump_model} onChange={e => setEdit({...edit, pump_model: e.target.value})} disabled={!isAdmin || busy} style={inp(TH)} />
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12}}>
        <div>
          <label style={lbl(TH)}>Filter type</label>
          <select value={edit.filter_type} onChange={e => setEdit({...edit, filter_type: e.target.value})} disabled={!isAdmin || busy} style={inp(TH)}>
            <option value="">—</option>
            {FILTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl(TH)}>Filter brand</label>
          <input value={edit.filter_brand} onChange={e => setEdit({...edit, filter_brand: e.target.value})} disabled={!isAdmin || busy} style={inp(TH)} />
        </div>
        <div>
          <label style={lbl(TH)}>Filter model</label>
          <input value={edit.filter_model} onChange={e => setEdit({...edit, filter_model: e.target.value})} disabled={!isAdmin || busy} style={inp(TH)} />
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12}}>
        <div>
          <label style={lbl(TH)}>Filter last changed</label>
          <input type="date" value={edit.filter_last_changed} onChange={e => setEdit({...edit, filter_last_changed: e.target.value})} disabled={!isAdmin || busy} style={inp(TH)} />
        </div>
        <div>
          <label style={lbl(TH)}>Filter next change</label>
          <input type="date" value={edit.filter_next_change} onChange={e => setEdit({...edit, filter_next_change: e.target.value})} disabled={!isAdmin || busy} style={inp(TH)} />
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <label style={lbl(TH)}>Chlorine system</label>
        <select value={edit.chlorine_system} onChange={e => setEdit({...edit, chlorine_system: e.target.value})} disabled={!isAdmin || busy} style={inp(TH)}>
          <option value="">—</option>
          {CHLORINE_SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{marginBottom:14}}>
        <label style={lbl(TH)}>Equipment notes</label>
        <textarea value={edit.equipment_notes} onChange={e => setEdit({...edit, equipment_notes: e.target.value})} disabled={!isAdmin || busy} rows={3} style={{...inp(TH), resize:"vertical"}} />
      </div>

      {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:8, padding:"10px 12px", color:"#C43D3D", fontSize:12, marginBottom:10}}>{error}</div>}

      {isAdmin && (
        <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
          <button onClick={save} disabled={busy} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:9, color:"#000", padding:"10px 22px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit"}}>
            {busy ? "Saving…" : "Save equipment"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Operations sub-tab (for this pool) ───────────────────────────
function OperationsSubTab({ TH, operations, onZoom }) {
  if (operations.length === 0) {
    return <div style={{padding:30, textAlign:"center", color:TH.textMuted, fontSize:12}}>No operations yet.</div>;
  }
  return (
    <div style={{display:"flex", flexDirection:"column", gap:10}}>
      {operations.map(op => {
        const m = OP_META[op.operation_type] || {};
        return (
          <div key={op.id} style={{background:TH.bgInput, borderRadius:10, padding:12, borderLeft:`3px solid ${m.color || '#8f8f8f'}`}}>
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:6, flexWrap:"wrap", gap:6}}>
              <div style={{fontSize:12, fontWeight:800, color:TH.text}}>{m.icon} {m.label || op.operation_type}</div>
              <div style={{fontSize:10, color:TH.textDim}}>{formatDate(op.performed_at)}</div>
            </div>
            {(op.ph_before != null || op.chlorine_before != null) && (
              <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:6}}>
                {op.ph_before != null && <Chip TH={TH}>pH: {op.ph_before}{op.ph_after != null ? ` → ${op.ph_after}` : ''}</Chip>}
                {op.chlorine_before != null && <Chip TH={TH}>Cl: {op.chlorine_before}{op.chlorine_after != null ? ` → ${op.chlorine_after}` : ''}</Chip>}
              </div>
            )}
            {op.chemicals_used?.length > 0 && (
              <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:6}}>
                {op.chemicals_used.map((c, i) => <Chip key={i} TH={TH} gold>🧪 {c.item_name}: {c.qty} {c.unit}</Chip>)}
              </div>
            )}
            {op.notes && <div style={{fontSize:11, color:TH.textMuted, marginTop:4}}>{op.notes}</div>}
            {op.photos?.length > 0 && (
              <div style={{display:"flex", gap:4, marginTop:6, flexWrap:"wrap"}}>
                {op.photos.map((url, i) => (
                  <img key={i} src={url} alt="" onClick={() => onZoom?.(url)} style={{width:50, height:50, objectFit:"cover", borderRadius:5, background:"#000", cursor:"pointer"}} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Consumable history sub-tab ───────────────────────────────────
function HistorySubTab({ TH, consumables }) {
  if (consumables.length === 0) {
    return <div style={{padding:30, textAlign:"center", color:TH.textMuted, fontSize:12}}>No consumables have been dispensed to this pool yet.</div>;
  }

  // Group by item for summary
  const summary = {};
  consumables.forEach(c => {
    if (!summary[c.item_name]) summary[c.item_name] = { name: c.item_name, unit: c.unit, total: 0, count: 0 };
    summary[c.item_name].total += Number(c.qty) || 0;
    summary[c.item_name].count += 1;
  });

  return (
    <div>
      {/* Summary */}
      <div style={{fontSize:11, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8}}>Total usage</div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:8, marginBottom:16}}>
        {Object.values(summary).map((s, i) => (
          <div key={i} style={{background:"rgba(201,169,96,0.08)", border:"1px solid rgba(201,169,96,0.3)", borderRadius:8, padding:10}}>
            <div style={{fontSize:10, fontWeight:700, color:"#C9A960", textTransform:"uppercase", letterSpacing:"0.05em"}}>{s.name}</div>
            <div style={{fontSize:16, fontWeight:800, color:TH.text, fontFamily:"monospace", marginTop:3}}>{s.total.toLocaleString()} {s.unit}</div>
            <div style={{fontSize:9, color:TH.textDim, marginTop:2}}>{s.count} times</div>
          </div>
        ))}
      </div>

      {/* Detailed log */}
      <div style={{fontSize:11, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8}}>Detailed log ({consumables.length})</div>
      <div style={{display:"flex", flexDirection:"column", gap:6}}>
        {consumables.map((c, i) => (
          <div key={i} style={{background:TH.bgInput, borderRadius:8, padding:"8px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6}}>
            <div>
              <div style={{fontSize:12, fontWeight:700, color:TH.text}}>🧪 {c.item_name}</div>
              <div style={{fontSize:10, color:TH.textMuted, marginTop:2}}>from {c.warehouse_name}{c.destination_person_name ? ` · by ${c.destination_person_name}` : ''}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:12, fontWeight:800, color:"#C9A960", fontFamily:"monospace"}}>{c.qty} {c.unit}</div>
              <div style={{fontSize:9, color:TH.textDim}}>{formatDateShort(c.performed_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Info({ TH, label, children }) {
  return (
    <div style={{background:TH.bgInput, borderRadius:8, padding:"10px 12px"}}>
      <div style={{fontSize:10, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3}}>{label}</div>
      <div style={{fontSize:14, fontWeight:700, color:TH.text}}>{children}</div>
    </div>
  );
}
function Chip({ TH, children, gold }) {
  return <span style={{fontSize:10, color: gold ? "#C9A960" : TH.textMuted, background: gold ? "rgba(201,169,96,0.12)" : TH.bgCard, padding:"3px 8px", borderRadius:5, whiteSpace:"nowrap"}}>{children}</span>;
}

function lbl(TH)  { return { display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }; }
function inp(TH) { return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"10px 12px", color:TH.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }; }

const overlay = { position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 };
function panel(TH) { return { background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, width:"100%", maxWidth:820, maxHeight:"92vh", overflowY:"auto" }; }
