// ═══════════════════════════════════════════════════════════════════
// AssetDetail.jsx — Warehouse 2.0 asset card:
// QR label + print, check-out/in, transfer, service log, timeline
// Requires: npm install qrcode
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { supabase } from "../../supabase";
import { ASSET_KINDS, ASSET_STATUS, MOVEMENT_TYPES, fmtDate, fmtDateTime, fmtMoney, daysUntil, serviceStatus } from "../lib/warehouseUtils";

export default function AssetDetail({ TH, isMobile, isAdmin, assetId, warehouses, onClose }) {
  const [asset, setAsset] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState(null); // 'checkout' | 'checkin' | 'transfer' | 'service' | 'qr'
  const [qrDataUrl, setQrDataUrl] = useState(null);

  // Action form state
  const [fHolder, setFHolder] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fReturn, setFReturn] = useState("");
  const [fPurpose, setFPurpose] = useState("");
  const [fWh, setFWh] = useState("");
  const [fNote, setFNote] = useState("");
  const [fNextService, setFNextService] = useState("");

  useEffect(() => { load(); }, [assetId]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rA, rM] = await Promise.all([
        supabase.from('assets').select('*').eq('id', assetId).single(),
        supabase.from('asset_movements').select('*').eq('asset_id', assetId).order('performed_at', { ascending: false }).limit(50),
      ]);
      if (rA.error) throw rA.error;
      setAsset(rA.data);
      setMovements(rM.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function showQR() {
    try {
      const url = await QRCode.toDataURL(asset.asset_no, { width: 400, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
      setQrDataUrl(url);
      setAction('qr');
    } catch (e) {
      setError('QR generation failed: ' + e.message);
    }
  }

  function printLabel() {
    const w = window.open('', '_blank', 'width=400,height=500');
    w.document.write(`
      <html><head><title>${asset.asset_no}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
        img { width: 240px; height: 240px; }
        .no { font-size: 20px; font-weight: 800; font-family: monospace; margin: 8px 0 2px; }
        .name { font-size: 14px; color: #444; margin-bottom: 4px; }
        .brand { font-size: 11px; color: #888; }
        @media print { @page { size: 62mm 62mm; margin: 2mm; } }
      </style></head><body>
        <img src="${qrDataUrl}" />
        <div class="no">${asset.asset_no}</div>
        <div class="name">${asset.name}</div>
        <div class="brand">${[asset.brand, asset.model].filter(Boolean).join(' ')} — Caesar Projects</div>
        <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
      </body></html>
    `);
    w.document.close();
  }

  async function doMovement(type, updates, movementExtra = {}) {
    setBusy(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: e1 } = await supabase.from('assets').update({
        ...updates,
        updated_at: new Date().toISOString(),
      }).eq('id', assetId);
      if (e1) throw e1;

      const { error: e2 } = await supabase.from('asset_movements').insert([{
        asset_id: assetId,
        movement_type: type,
        performed_by: user?.id,
        ...movementExtra,
      }]);
      if (e2) throw e2;

      setAction(null);
      resetForms();
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function resetForms() {
    setFHolder(""); setFPhone(""); setFReturn(""); setFPurpose(""); setFWh(""); setFNote(""); setFNextService("");
  }

  function checkout() {
    if (!fHolder.trim()) { setError("Holder name required"); return; }
    doMovement('checkout', {
      status: 'checked_out',
      holder_name: fHolder.trim(),
      holder_phone: fPhone.trim() || null,
      expected_return_at: fReturn || null,
    }, {
      holder_name: fHolder.trim(),
      holder_phone: fPhone.trim() || null,
      purpose: fPurpose.trim() || null,
      expected_return_at: fReturn || null,
      from_warehouse_id: asset.warehouse_id,
    });
  }

  function checkin() {
    doMovement('checkin', {
      status: 'available',
      holder_name: null,
      holder_phone: null,
      expected_return_at: null,
    }, {
      notes: fNote.trim() || null,
      to_warehouse_id: asset.warehouse_id,
      actual_return_at: new Date().toISOString(),
    });
  }

  function transfer() {
    if (!fWh) { setError("Select destination warehouse"); return; }
    doMovement('transfer', {
      warehouse_id: Number(fWh),
    }, {
      from_warehouse_id: asset.warehouse_id,
      to_warehouse_id: Number(fWh),
      notes: fNote.trim() || null,
    });
  }

  function logService() {
    const today = new Date().toISOString().slice(0, 10);
    doMovement('service', {
      last_service_date: today,
      next_service_date: fNextService || null,
      status: 'available',
    }, {
      notes: fNote.trim() || 'Service performed',
    });
  }

  if (loading) return <div style={{padding:40, textAlign:"center", color:TH.textMuted}}>Loading...</div>;
  if (!asset) return null;

  const kindMeta = ASSET_KINDS[asset.kind] || {};
  const statusMeta = ASSET_STATUS[asset.status] || { label: asset.status, color: '#8f8f8f' };
  const whMap = Object.fromEntries((warehouses || []).map(w => [w.id, w]));
  const wh = whMap[asset.warehouse_id];
  const svc = serviceStatus(asset);
  const returnDays = asset.expected_return_at ? daysUntil(asset.expected_return_at) : null;

  return (
    <div>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, gap:12}}>
        <button onClick={onClose} style={btnGhost(TH)}>← Back</button>
        <button onClick={showQR} style={btnGhost(TH)}>▦ QR Label</button>
      </div>

      {error && <ErrBox TH={TH}>{error}</ErrBox>}

      {/* QR modal */}
      {action === 'qr' && qrDataUrl && (
        <div onClick={() => setAction(null)} style={modalBg()}>
          <div onClick={e => e.stopPropagation()} style={{background:"#fff", borderRadius:16, padding:24, textAlign:"center", maxWidth:320}}>
            <img src={qrDataUrl} alt="QR" style={{width:240, height:240}} />
            <div style={{fontFamily:"monospace", fontSize:18, fontWeight:800, color:"#000", margin:"8px 0 2px"}}>{asset.asset_no}</div>
            <div style={{fontSize:13, color:"#444", marginBottom:14}}>{asset.name}</div>
            <div style={{display:"flex", gap:8}}>
              <button onClick={() => setAction(null)} style={{flex:1, background:"#eee", border:"none", borderRadius:8, padding:"10px", cursor:"pointer", fontSize:13, fontWeight:600}}>Close</button>
              <button onClick={printLabel} style={{flex:1, background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:8, color:"#000", padding:"10px", cursor:"pointer", fontSize:13, fontWeight:700}}>🖨 Print</button>
            </div>
          </div>
        </div>
      )}

      {/* Header card */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, borderLeft:`4px solid ${statusMeta.color}`, padding:20, marginBottom:16}}>
        <div style={{display:"flex", gap:16, flexWrap:"wrap"}}>
          {asset.photo_url ? (
            <img src={asset.photo_url} alt="" style={{width:120, height:120, objectFit:"cover", borderRadius:12, background:"#000"}} />
          ) : (
            <div style={{width:120, height:120, borderRadius:12, background:TH.bgInput, display:"flex", alignItems:"center", justifyContent:"center", fontSize:48}}>{kindMeta.icon || '📦'}</div>
          )}
          <div style={{flex:1, minWidth:220}}>
            <div style={{fontSize:11, color:statusMeta.color, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4}}>● {statusMeta.label}</div>
            <div style={{fontSize:isMobile?18:22, fontWeight:800, color:TH.text}}>{asset.name}</div>
            <div style={{fontSize:11, color:TH.textDim, fontFamily:"monospace", marginBottom:10}}>{asset.asset_no}</div>
            <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3, 1fr)", gap:10}}>
              <Info TH={TH} label="Kind">{kindMeta.icon} {kindMeta.label}</Info>
              {asset.brand && <Info TH={TH} label="Brand / Model">{asset.brand} {asset.model}</Info>}
              {asset.serial_number && <Info TH={TH} label="Serial">{asset.serial_number}</Info>}
              {asset.plate_number && <Info TH={TH} label="Plate">{asset.plate_number}</Info>}
              <Info TH={TH} label="Warehouse">{wh?.name || '—'}</Info>
              {asset.purchase_price != null && <Info TH={TH} label="Value">{fmtMoney(asset.purchase_price, asset.currency)}</Info>}
              {asset.purchased_at && <Info TH={TH} label="Purchased">{fmtDate(asset.purchased_at)}</Info>}
              {asset.last_service_date && <Info TH={TH} label="Last service">{fmtDate(asset.last_service_date)}</Info>}
              {asset.next_service_date && <Info TH={TH} label="Next service">{fmtDate(asset.next_service_date)}</Info>}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {asset.status === 'checked_out' && (
          <div style={{marginTop:14, padding:12, background:"rgba(139,122,68,0.12)", border:"1px solid rgba(139,122,68,0.4)", borderRadius:10, fontSize:13, color:TH.text}}>
            👤 With <strong>{asset.holder_name || 'unknown'}</strong>
            {asset.holder_phone && <> · 📞 {asset.holder_phone}</>}
            {asset.expected_return_at && (
              <> · Return: {fmtDate(asset.expected_return_at)}
                {returnDays !== null && returnDays < 0 && <strong style={{color:"#C9A960"}}> — OVERDUE {-returnDays}d</strong>}
              </>
            )}
          </div>
        )}
        {svc && (
          <div style={{marginTop:10, padding:12, background:"rgba(201,169,96,0.08)", border:"1px solid rgba(201,169,96,0.3)", borderRadius:10, fontSize:13, color:svc.color, fontWeight:700}}>
            🔧 {svc.label}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!action && (
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, 1fr)", gap:8, marginBottom:16}}>
          {asset.status !== 'checked_out' && <ActionBtn onClick={() => setAction('checkout')} primary>↗ Check Out</ActionBtn>}
          {asset.status === 'checked_out' && <ActionBtn onClick={() => setAction('checkin')} primary>↩ Check In</ActionBtn>}
          <ActionBtn TH={TH} onClick={() => setAction('transfer')}>⇄ Transfer</ActionBtn>
          <ActionBtn TH={TH} onClick={() => { setFNextService(""); setAction('service'); }}>🔧 Log Service</ActionBtn>
          <ActionBtn TH={TH} onClick={showQR}>▦ QR Label</ActionBtn>
        </div>
      )}

      {/* Action forms */}
      {action === 'checkout' && (
        <FormCard TH={TH} title="↗ Check out asset" onCancel={() => setAction(null)} onSubmit={checkout} busy={busy} submitLabel="Check out">
          <Field TH={TH} label="Given to (name) *"><input value={fHolder} onChange={e => setFHolder(e.target.value)} placeholder="e.g. Mehmet (pool technician)" style={inp(TH)} autoFocus /></Field>
          <Field TH={TH} label="Phone"><input value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="+90..." style={inp(TH)} /></Field>
          <Field TH={TH} label="Expected return"><input type="date" value={fReturn} onChange={e => setFReturn(e.target.value)} style={inp(TH)} /></Field>
          <Field TH={TH} label="Purpose"><input value={fPurpose} onChange={e => setFPurpose(e.target.value)} placeholder="e.g. Pool maintenance at Blue" style={inp(TH)} /></Field>
        </FormCard>
      )}

      {action === 'checkin' && (
        <FormCard TH={TH} title="↩ Check in asset" onCancel={() => setAction(null)} onSubmit={checkin} busy={busy} submitLabel="Check in">
          <div style={{fontSize:13, color:TH.textMuted, marginBottom:10}}>Returning from: <strong style={{color:TH.text}}>{asset.holder_name || 'unknown'}</strong></div>
          <Field TH={TH} label="Condition note"><input value={fNote} onChange={e => setFNote(e.target.value)} placeholder="e.g. OK / minor scratch" style={inp(TH)} autoFocus /></Field>
        </FormCard>
      )}

      {action === 'transfer' && (
        <FormCard TH={TH} title="⇄ Transfer to another warehouse" onCancel={() => setAction(null)} onSubmit={transfer} busy={busy} submitLabel="Transfer">
          <Field TH={TH} label="Destination warehouse *">
            <select value={fWh} onChange={e => setFWh(e.target.value)} style={inp(TH)}>
              <option value="">Select...</option>
              {(warehouses || []).filter(w => w.id !== asset.warehouse_id).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <Field TH={TH} label="Note"><input value={fNote} onChange={e => setFNote(e.target.value)} style={inp(TH)} /></Field>
        </FormCard>
      )}

      {action === 'service' && (
        <FormCard TH={TH} title="🔧 Log service / maintenance" onCancel={() => setAction(null)} onSubmit={logService} busy={busy} submitLabel="Save service">
          <Field TH={TH} label="What was done"><input value={fNote} onChange={e => setFNote(e.target.value)} placeholder="e.g. Oil change, filter replaced" style={inp(TH)} autoFocus /></Field>
          <Field TH={TH} label="Next service date"><input type="date" value={fNextService} onChange={e => setFNextService(e.target.value)} style={inp(TH)} /></Field>
        </FormCard>
      )}

      {/* Movement timeline */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16}}>
        <div style={{fontSize:14, fontWeight:700, color:TH.text, marginBottom:12}}>📋 History ({movements.length})</div>
        {movements.length === 0 ? (
          <div style={{color:TH.textDim, fontSize:13, textAlign:"center", padding:14}}>No movements yet</div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", gap:0}}>
            {movements.map((m, i) => {
              const meta = MOVEMENT_TYPES[m.movement_type] || { label: m.movement_type, icon: '•' };
              return (
                <div key={m.id} style={{display:"flex", gap:12, paddingBottom: i < movements.length-1 ? 14 : 0, position:"relative"}}>
                  <div style={{display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0}}>
                    <div style={{width:30, height:30, borderRadius:15, background:TH.bgInput, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, zIndex:1}}>{meta.icon}</div>
                    {i < movements.length-1 && <div style={{width:1, flex:1, background:TH.border}}/>}
                  </div>
                  <div style={{flex:1, paddingBottom:4}}>
                    <div style={{fontSize:13, fontWeight:700, color:TH.text}}>{meta.label}</div>
                    {m.holder_name && <div style={{fontSize:12, color:TH.textMuted}}>👤 {m.holder_name}{m.holder_phone ? ` · ${m.holder_phone}` : ''}</div>}
                    {m.purpose && <div style={{fontSize:12, color:TH.textMuted}}>{m.purpose}</div>}
                    {m.notes && <div style={{fontSize:12, color:TH.textMuted}}>{m.notes}</div>}
                    <div style={{fontSize:10, color:TH.textDim, marginTop:2}}>{fmtDateTime(m.performed_at)}</div>
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

// ── UI helpers ──────────────────────────────────────────────────────
function Info({ TH, label, children }) {
  return (
    <div>
      <div style={{fontSize:9, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:2}}>{label}</div>
      <div style={{fontSize:13, color:TH.text}}>{children}</div>
    </div>
  );
}
function ActionBtn({ TH, children, onClick, primary }) {
  return (
    <button onClick={onClick} style={primary ? {
      background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:10,
      color:"#000", padding:"13px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit",
    } : {
      background:"transparent", border:`1px solid ${TH.border}`, borderRadius:10,
      color:TH.text, padding:"13px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit",
    }}>{children}</button>
  );
}
function FormCard({ TH, title, children, onCancel, onSubmit, busy, submitLabel }) {
  return (
    <div style={{background:TH.bgCard, border:`2px solid ${TH.accentBorder}`, borderRadius:14, padding:18, marginBottom:16}}>
      <div style={{fontSize:15, fontWeight:800, color:TH.text, marginBottom:12}}>{title}</div>
      {children}
      <div style={{display:"flex", gap:8, justifyContent:"flex-end", marginTop:14}}>
        <button onClick={onCancel} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>Cancel</button>
        <button onClick={onSubmit} disabled={busy} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:9, color:"#000", padding:"10px 24px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit", opacity:busy?0.6:1}}>{busy ? "Saving..." : submitLabel}</button>
      </div>
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
function btnGhost(TH) {
  return { background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"7px 14px", cursor:"pointer", fontSize:13, fontFamily:"inherit" };
}
function ErrBox({ TH, children }) {
  return <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{children}</div>;
}
function modalBg() {
  return { position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20, cursor:"pointer" };
}
