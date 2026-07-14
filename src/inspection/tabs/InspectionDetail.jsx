// ═══════════════════════════════════════════════════════════════════
// InspectionDetail.jsx — full inspection card with photo gallery + resolve
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { INSPECTION_STATUS, formatDate } from "../lib/inspectionUtils";

export default function InspectionDetail({ TH, isMobile, isAdmin, inspectionId, properties, areas, onClose }) {
  const [ins, setIns]     = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy]   = useState(false);
  const [photoZoom, setPhotoZoom] = useState(null);
  const [resolveMode, setResolveMode] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");

  useEffect(() => { load(); }, [inspectionId]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rI, rU] = await Promise.all([
        supabase.from('inspections').select('*').eq('id', inspectionId).single(),
        supabase.from('inspection_updates').select('*').eq('inspection_id', inspectionId).order('performed_at', { ascending: false }),
      ]);
      if (rI.error) throw rI.error;
      setIns(rI.data);
      setUpdates(rU.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function markResolved() {
    setBusy(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: e1 } = await supabase.from('inspections').update({
        status: 'fixed',
        severity: 0,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
        resolution_note: resolutionNote.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', inspectionId);
      if (e1) throw e1;

      await supabase.from('inspection_updates').insert([{
        inspection_id: inspectionId,
        update_type:   'resolved',
        message:       resolutionNote.trim() || 'Marked as resolved',
        new_status:    'fixed',
        performed_by:  user?.id,
      }]);

      setResolveMode(false);
      setResolutionNote("");
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div style={{padding:40, textAlign:"center", color:TH.textMuted}}>Loading...</div>;
  if (!ins) return null;

  const meta = INSPECTION_STATUS[ins.status] || { label: ins.status, color: '#8f8f8f' };
  const propMap = Object.fromEntries((properties || []).map(p => [p.id, p]));
  const areaMap = Object.fromEntries((areas || []).map(a => [a.id, a]));
  const wh = propMap[ins.property_id];
  const area = ins.area_id ? areaMap[ins.area_id] : null;

  return (
    <div>
      {/* Photo zoom modal */}
      {photoZoom && (
        <div onClick={() => setPhotoZoom(null)} style={{
          position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.95)",
          zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:20,
        }}>
          <img src={photoZoom} alt="" style={{maxWidth:"100%", maxHeight:"100%", objectFit:"contain"}} />
        </div>
      )}

      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, gap:12}}>
        <button onClick={onClose} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"7px 14px", cursor:"pointer", fontSize:13, fontFamily:"inherit"}}>← Back</button>
        <div style={{fontSize:11, color:TH.textMuted, fontFamily:"monospace"}}>{ins.inspection_no}</div>
      </div>

      {error && <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{error}</div>}

      {/* Header card */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, borderLeft:`4px solid ${meta.color}`, padding:20, marginBottom:16}}>
        <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap", marginBottom:14}}>
          <div style={{flex:1, minWidth:200}}>
            <div style={{fontSize:11, color:meta.color, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6}}>{meta.label}</div>
            <div style={{fontSize:isMobile?18:22, fontWeight:800, color:TH.text, letterSpacing:"-0.3px"}}>{ins.title}</div>
          </div>
          <span style={{padding:"6px 14px", borderRadius:20, background:meta.color+"22", color:meta.color, fontSize:12, fontWeight:700, alignSelf:"flex-start"}}>● {meta.label}</span>
        </div>

        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3, 1fr)", gap:14, marginBottom:14}}>
          <Info TH={TH} label="Property">{wh?.name || '—'}</Info>
          <Info TH={TH} label="Area">{area?.name || '—'}</Info>
          <Info TH={TH} label="Severity">{['None','Low','Medium','High','Critical'][ins.severity] || '—'}</Info>
          <Info TH={TH} label="Inspector">{ins.inspector_email || '—'}</Info>
          <Info TH={TH} label="Reported">{formatDate(ins.created_at)}</Info>
          {ins.resolved_at && <Info TH={TH} label="Resolved">{formatDate(ins.resolved_at)}</Info>}
        </div>

        {ins.location_note && <div style={{padding:10, background:TH.bgInput, borderRadius:8, fontSize:12, color:TH.textMuted, marginBottom:10}}>📍 {ins.location_note}</div>}

        {ins.report && (
          <div style={{marginTop:10, padding:14, background:TH.bgInput, borderRadius:10, borderLeft:`3px solid ${TH.accent}`}}>
            <div style={{fontSize:11, color:TH.textMuted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6}}>Report</div>
            <div style={{fontSize:14, color:TH.text, whiteSpace:"pre-wrap", lineHeight:1.5}}>{ins.report}</div>
          </div>
        )}

        {ins.action_required && (
          <div style={{marginTop:10, padding:14, background:"rgba(201,169,96,0.08)", border:`1px solid rgba(201,169,96,0.3)`, borderRadius:10}}>
            <div style={{fontSize:11, color:TH.accent, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6}}>⚡ Action required</div>
            <div style={{fontSize:14, color:TH.text}}>{ins.action_required}</div>
          </div>
        )}

        {ins.resolution_note && (
          <div style={{marginTop:10, padding:14, background:"rgba(201,169,96,0.06)", borderRadius:10}}>
            <div style={{fontSize:11, color:TH.accent, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6}}>✓ Resolution</div>
            <div style={{fontSize:13, color:TH.text}}>{ins.resolution_note}</div>
          </div>
        )}
      </div>

      {/* Photos */}
      {ins.photos?.length > 0 && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16, marginBottom:16}}>
          <div style={{fontSize:14, fontWeight:700, color:TH.text, marginBottom:12}}>📷 Photos ({ins.photos.length})</div>
          <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(2, 1fr)":"repeat(auto-fill, minmax(160px, 1fr))", gap:8}}>
            {ins.photos.map((url, i) => (
              <div key={i} onClick={() => setPhotoZoom(url)} style={{cursor:"pointer", borderRadius:10, overflow:"hidden", background:"#000", aspectRatio:"1"}}>
                <img src={url} alt="" style={{width:"100%", height:"100%", objectFit:"cover", display:"block"}} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {ins.status !== 'fixed' && !resolveMode && (
        <button onClick={() => setResolveMode(true)} style={{
          width:"100%", background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:12,
          color:"#000", padding:"14px", cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit", marginBottom:16,
        }}>
          ✓ Mark as resolved
        </button>
      )}

      {resolveMode && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16, marginBottom:16}}>
          <div style={{fontSize:14, fontWeight:700, color:TH.text, marginBottom:10}}>Mark as resolved</div>
          <textarea
            value={resolutionNote}
            onChange={e => setResolutionNote(e.target.value)}
            rows={3}
            placeholder="How was this fixed? (optional)"
            style={{
              width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8,
              padding:"10px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit",
              boxSizing:"border-box", resize:"vertical", minHeight:60, marginBottom:10,
            }}
          />
          <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
            <button onClick={() => { setResolveMode(false); setResolutionNote(""); }} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"9px 16px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>Cancel</button>
            <button onClick={markResolved} disabled={busy} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:8, color:"#000", padding:"9px 20px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", opacity:busy?0.6:1}}>
              {busy ? "Saving..." : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {/* Updates history */}
      {updates.length > 0 && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16}}>
          <div style={{fontSize:14, fontWeight:700, color:TH.text, marginBottom:12}}>📋 History ({updates.length})</div>
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            {updates.map(u => (
              <div key={u.id} style={{padding:"10px 12px", background:TH.bgInput, borderRadius:8}}>
                <div style={{fontSize:12, color:TH.text}}>{u.message || u.update_type}</div>
                <div style={{fontSize:10, color:TH.textDim, marginTop:4}}>{formatDate(u.performed_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ TH, label, children }) {
  return (
    <div>
      <div style={{fontSize:10, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3}}>{label}</div>
      <div style={{fontSize:13, color:TH.text}}>{children}</div>
    </div>
  );
}
