// ═══════════════════════════════════════════════════════════════════
// PackageDetail.jsx — single package view: photos, info, actions, history
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import { formatDate } from "../../inspection/lib/inspectionUtils";

const STATUS_META = {
  received:  { label: "Received",  color: "#C9A960", icon: "📦" },
  collected: { label: "Collected", color: "#7A9A5B", icon: "✓" },
  returned:  { label: "Returned",  color: "#8f8f8f", icon: "↩" },
  lost:      { label: "Lost",      color: "#C43D3D", icon: "⚠" },
};

const EVENT_META = {
  received:    { icon: "📦", color: "#C9A960", label: "Received" },
  updated:     { icon: "✏️", color: "#8B7A44", label: "Updated" },
  collected:   { icon: "✓",  color: "#7A9A5B", label: "Collected" },
  returned:    { icon: "↩",  color: "#8f8f8f", label: "Returned" },
  lost:        { icon: "⚠",  color: "#C43D3D", label: "Lost" },
  note:        { icon: "📝", color: "#8f8f8f", label: "Note" },
  photo_added: { icon: "📸", color: "#7BB3D4", label: "Photo added" },
};

export default function PackageDetail({ TH, lang = "en", isMobile, isAdmin, packageId, properties, onClose }) {
  const L = tr(lang);
  const [pkg, setPkg] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(null);
  const [collectSignature, setCollectSignature] = useState("");
  const [showCollect, setShowCollect] = useState(false);

  useEffect(() => { load(); }, [packageId]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rP, rH] = await Promise.all([
        supabase.from('packages').select('*').eq('id', packageId).single(),
        supabase.from('package_history').select('*').eq('package_id', packageId).order('performed_at', { ascending: false }),
      ]);
      if (rP.error) throw rP.error;
      setPkg(rP.data);
      setHistory(rH.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function markCollected() {
    if (!collectSignature.trim()) { setError(L.pkgNeedSignature || 'Enter name of person collecting'); return; }
    setBusy(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: e } = await supabase.from('packages').update({
        status: 'collected',
        collected_at: new Date().toISOString(),
        collected_by: user?.id,
        collected_signature: collectSignature.trim(),
      }).eq('id', packageId);
      if (e) throw e;
      setShowCollect(false); setCollectSignature("");
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function markReturned() {
    if (!confirm(L.confirmReturn || 'Mark this package as returned to sender?')) return;
    setBusy(true); setError(null);
    try {
      const { error: e } = await supabase.from('packages').update({ status: 'returned' }).eq('id', packageId);
      if (e) throw e;
      await load();
    } catch (e) { setError(e.message || String(e)); } finally { setBusy(false); }
  }

  async function markLost() {
    if (!confirm(L.confirmLost || 'Mark this package as lost?')) return;
    setBusy(true); setError(null);
    try {
      const { error: e } = await supabase.from('packages').update({ status: 'lost' }).eq('id', packageId);
      if (e) throw e;
      await load();
    } catch (e) { setError(e.message || String(e)); } finally { setBusy(false); }
  }

  async function deletePackage() {
    if (!confirm(L.confirmDelete || 'Delete this package permanently?')) return;
    setBusy(true); setError(null);
    try {
      const { error: e } = await supabase.from('packages').update({ is_active: false }).eq('id', packageId);
      if (e) throw e;
      onClose();
    } catch (e) { setError(e.message || String(e)); setBusy(false); }
  }

  if (loading) return <div style={{padding:40, textAlign:"center", color:TH.textMuted}}>{L.loading || 'Loading…'}</div>;
  if (!pkg) return null;

  const sm = STATUS_META[pkg.status] || { label: pkg.status, color: '#8f8f8f', icon: '•' };
  const propMap = Object.fromEntries((properties || []).map(p => [p.id, p]));
  const prop = propMap[pkg.recipient_property_id];

  return (
    <div>
      {zoom && (
        <div onClick={() => setZoom(null)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:20}}>
          <img src={zoom} alt="" style={{maxWidth:"100%", maxHeight:"100%", objectFit:"contain"}} />
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:12, flexWrap:"wrap"}}>
        <button onClick={onClose} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"7px 14px", cursor:"pointer", fontSize:13, fontFamily:"inherit"}}>← {L.back || 'Back'}</button>
        <div style={{display:"flex", gap:6, alignItems:"center"}}>
          {isAdmin && (
            <button onClick={deletePackage} disabled={busy} style={{background:"transparent", border:"1px solid rgba(196,61,61,0.4)", borderRadius:8, color:"#C43D3D", padding:"7px 14px", cursor:"pointer", fontSize:13, fontFamily:"inherit"}}>{L.del || 'Delete'}</button>
          )}
          <div style={{fontSize:11, color:TH.textMuted, fontFamily:"monospace"}}>{pkg.package_no}</div>
        </div>
      </div>

      {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:10, padding:"12px 14px", color:"#C43D3D", fontSize:13, marginBottom:14}}>{error}</div>}

      {/* Main info card */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, borderLeft:`4px solid ${sm.color}`, padding:20, marginBottom:16}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap", marginBottom:14}}>
          <div>
            <div style={{fontSize:11, color:sm.color, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4}}>{sm.icon} {sm.label}</div>
            <div style={{fontSize:isMobile?18:22, fontWeight:800, color:TH.text, letterSpacing:"-0.3px"}}>{pkg.recipient_name}</div>
          </div>
          <span style={{padding:"5px 14px", borderRadius:20, background:sm.color+"22", color:sm.color, fontSize:11, fontWeight:700}}>● {sm.label}</span>
        </div>

        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3, 1fr)", gap:14}}>
          <Info TH={TH} label={L.property || 'Property'}>{prop?.name || '—'}</Info>
          <Info TH={TH} label={L.unit || 'Unit'}>{pkg.recipient_unit || '—'}</Info>
          <Info TH={TH} label={L.receivedOn || 'Received'}>{formatDate(pkg.received_at)}</Info>
          {pkg.collected_at && <Info TH={TH} label={L.collectedOn || 'Collected'}>{formatDate(pkg.collected_at)}</Info>}
          {pkg.collected_signature && <Info TH={TH} label={L.collectedBy || 'Picked up by'}>{pkg.collected_signature}</Info>}
        </div>

        {pkg.notes && (
          <div style={{marginTop:12, padding:10, background:TH.bgInput, borderRadius:8, fontSize:12, color:TH.textMuted}}>
            📝 {pkg.notes}
          </div>
        )}
      </div>

      {/* Photos */}
      {pkg.photos?.length > 0 && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16, marginBottom:16}}>
          <div style={{fontSize:13, fontWeight:700, color:TH.text, marginBottom:10}}>📸 {L.photos || 'Photos'} ({pkg.photos.length})</div>
          <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(2, 1fr)":"repeat(auto-fill, minmax(150px, 1fr))", gap:8}}>
            {pkg.photos.map((url, i) => (
              <div key={i} onClick={() => setZoom(url)} style={{cursor:"pointer", borderRadius:10, overflow:"hidden", background:"#000", aspectRatio:"1"}}>
                <img src={url} alt="" style={{width:"100%", height:"100%", objectFit:"cover", display:"block"}} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {pkg.status === 'received' && !showCollect && (
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr", gap:8, marginBottom:16}}>
          <button onClick={() => setShowCollect(true)} disabled={busy} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:10, color:"#000", padding:"12px", cursor:"pointer", fontSize:14, fontWeight:800, fontFamily:"inherit"}}>
            ✓ {L.markCollected || 'Mark as collected'}
          </button>
          <button onClick={markReturned} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:10, color:TH.text, padding:"12px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>
            ↩ {L.markReturned || 'Return'}
          </button>
          <button onClick={markLost} disabled={busy} style={{background:"transparent", border:"1px solid rgba(196,61,61,0.4)", borderRadius:10, color:"#C43D3D", padding:"12px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>
            ⚠ {L.markLost || 'Lost'}
          </button>
        </div>
      )}

      {showCollect && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16, marginBottom:16}}>
          <div style={{fontSize:13, fontWeight:700, color:TH.text, marginBottom:10}}>{L.whoPickedUp || 'Who picked up the package?'}</div>
          <input value={collectSignature} onChange={e => setCollectSignature(e.target.value)} placeholder={pkg.recipient_name} autoFocus style={{width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"10px 12px", color:TH.text, fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:10, fontFamily:"inherit"}} />
          <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
            <button onClick={() => { setShowCollect(false); setCollectSignature(""); }} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"9px 16px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>{L.cancel || 'Cancel'}</button>
            <button onClick={markCollected} disabled={busy} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:8, color:"#000", padding:"9px 20px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit", opacity:busy?0.6:1}}>
              {busy ? (L.saving || 'Saving…') : (L.confirm || 'Confirm')}
            </button>
          </div>
        </div>
      )}

      {/* History timeline */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16}}>
        <div style={{fontSize:13, fontWeight:700, color:TH.text, marginBottom:12}}>📜 {L.history || 'History'} ({history.length})</div>
        {history.length === 0 ? (
          <div style={{padding:12, textAlign:"center", color:TH.textMuted, fontSize:12}}>{L.historyEmpty || 'No history yet.'}</div>
        ) : (
          <div style={{position:"relative", paddingLeft:20}}>
            <div style={{position:"absolute", left:8, top:10, bottom:10, width:2, background:TH.border}} />
            {history.map((h) => {
              const em = EVENT_META[h.event_type] || { icon: "•", color: "#8f8f8f", label: h.event_type };
              return (
                <div key={h.id} style={{position:"relative", marginBottom:10, paddingLeft:20}}>
                  <div style={{position:"absolute", left:-16, top:6, width:16, height:16, background:em.color, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9}}>{em.icon}</div>
                  <div style={{background:TH.bgInput, borderRadius:8, padding:"9px 12px", borderLeft:`2px solid ${em.color}`}}>
                    <div style={{display:"flex", justifyContent:"space-between", gap:8, flexWrap:"wrap"}}>
                      <div style={{fontSize:12, fontWeight:700, color:TH.text}}>{em.label}</div>
                      <div style={{fontSize:10, color:TH.textDim, whiteSpace:"nowrap"}}>{formatDate(h.performed_at)}</div>
                    </div>
                    {h.notes && <div style={{fontSize:11, color:TH.textMuted, marginTop:3, fontStyle:"italic"}}>💬 {h.notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
