// ═══════════════════════════════════════════════════════════════════
// AssetDetail.jsx — full asset card with movement history + actions
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { ASSET_KINDS, ASSET_STATUS, MOVEMENT_TYPES, formatDate, formatDateShort, formatMoney } from "../lib/warehouseUtils";

export default function AssetDetail({ TH, isMobile, assetId, onClose, warehouses }) {
  const [asset, setAsset]         = useState(null);
  const [movements, setMovements] = useState([]);
  const [services, setServices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [actionType, setActionType] = useState(null); // 'checkout', 'checkin', 'transfer', 'service_start', 'retire'
  const [busy, setBusy]           = useState(false);
  const [actionForm, setActionForm] = useState({ to_warehouse_id: "", to_location: "", purpose: "", expected_return_at: "", notes: "" });

  useEffect(() => { load(); }, [assetId]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rA, rM, rS] = await Promise.all([
        supabase.from('assets').select('*').eq('id', assetId).single(),
        supabase.from('asset_movements').select('*').eq('asset_id', assetId).order('performed_at', { ascending: false }).limit(50),
        supabase.from('asset_service_logs').select('*').eq('asset_id', assetId).order('service_date', { ascending: false }).limit(20),
      ]);
      if (rA.error) throw rA.error;
      setAsset(rA.data);
      setMovements(rM.data || []);
      setServices(rS.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function doAction() {
    setBusy(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        asset_id: assetId,
        movement_type: actionType,
        performed_by: user?.id,
        notes: actionForm.notes.trim() || null,
      };
      if (actionType === 'checkout') {
        payload.from_warehouse_id = asset.warehouse_id;
        payload.to_user_id = user?.id;
        payload.to_location = actionForm.to_location.trim() || null;
        payload.purpose = actionForm.purpose.trim() || null;
        payload.expected_return_at = actionForm.expected_return_at || null;
      } else if (actionType === 'checkin') {
        payload.from_user_id = asset.assigned_to_user_id;
        payload.to_warehouse_id = Number(actionForm.to_warehouse_id) || asset.warehouse_id;
        payload.actual_return_at = new Date().toISOString();
      } else if (actionType === 'transfer') {
        payload.from_warehouse_id = asset.warehouse_id;
        payload.to_warehouse_id = Number(actionForm.to_warehouse_id);
        if (!payload.to_warehouse_id) throw new Error("Destination warehouse is required.");
        payload.purpose = actionForm.purpose.trim() || null;
      } else if (actionType === 'service_start') {
        payload.purpose = actionForm.purpose.trim() || "Service";
      } else if (actionType === 'service_end') {
        // No extra fields needed
      } else if (actionType === 'retire') {
        payload.notes = actionForm.notes.trim() || "Retired";
      }

      const { error } = await supabase.from('asset_movements').insert([payload]);
      if (error) throw error;
      setActionType(null);
      setActionForm({ to_warehouse_id: "", to_location: "", purpose: "", expected_return_at: "", notes: "" });
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div style={{padding:40, textAlign:"center", color:TH.textMuted}}>Loading asset...</div>;
  if (error && !asset) return (
    <div>
      <button onClick={onClose} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"7px 14px", cursor:"pointer", fontSize:13, fontFamily:"inherit", marginBottom:16}}>← Back</button>
      <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:9, padding:"10px 14px", color:"#8f8f8f"}}>{error}</div>
    </div>
  );
  if (!asset) return null;

  const kindMeta = ASSET_KINDS[asset.kind] || {};
  const statusMeta = ASSET_STATUS[asset.status] || { label: asset.status, color: '#8892b0' };
  const whMap = Object.fromEntries((warehouses || []).map(w => [w.id, w]));
  const currentWh = whMap[asset.warehouse_id];

  return (
    <div>
      {/* Back bar */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, gap:12, flexWrap:"wrap"}}>
        <button onClick={onClose} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"7px 14px", cursor:"pointer", fontSize:13, fontFamily:"inherit"}}>← Back to assets</button>
        <div style={{fontSize:11, color:TH.textMuted, fontFamily:"monospace"}}>{asset.asset_no}</div>
      </div>

      {error && <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:9, padding:"10px 14px", color:"#8f8f8f", fontSize:13, marginBottom:16}}>{error}</div>}

      {/* Header card */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, borderLeft:`4px solid ${kindMeta.color || TH.accent}`, padding:20, marginBottom:16}}>
        <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap", marginBottom:16}}>
          <div style={{display:"flex", gap:14, alignItems:"center"}}>
            <div style={{fontSize:44}}>{kindMeta.icon}</div>
            <div>
              <div style={{fontSize:isMobile?20:24, fontWeight:800, color:TH.text, letterSpacing:"-0.3px"}}>{asset.name}</div>
              <div style={{fontSize:12, color:kindMeta.color, fontWeight:700, marginTop:2, textTransform:"uppercase", letterSpacing:"0.5px"}}>{kindMeta.label}</div>
            </div>
          </div>
          <span style={{display:"inline-block", padding:"6px 14px", borderRadius:20, background:statusMeta.color+"22", color:statusMeta.color, fontSize:12, fontWeight:700}}>● {statusMeta.label}</span>
        </div>

        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, 1fr)", gap:14}}>
          <Info TH={TH} label="Brand / Model">{[asset.brand, asset.model].filter(Boolean).join(" · ") || "—"}</Info>
          {asset.kind === 'vehicle' ? <Info TH={TH} label="License plate">{asset.plate_number || "—"}</Info> : <Info TH={TH} label="Serial number">{asset.serial_number || "—"}</Info>}
          <Info TH={TH} label="Warehouse">{currentWh ? currentWh.name : "—"}</Info>
          <Info TH={TH} label="Location">{asset.current_location || (currentWh ? "In warehouse" : "—")}</Info>
          <Info TH={TH} label="Purchased">{formatDateShort(asset.purchased_at)}</Info>
          <Info TH={TH} label="Purchase price">{asset.purchase_price ? formatMoney(asset.purchase_price, asset.currency) : "—"}</Info>
          <Info TH={TH} label="Supplier">{asset.supplier_name || "—"}</Info>
          <Info TH={TH} label="Warranty ends">{formatDateShort(asset.warranty_expires_at)}</Info>
        </div>

        {asset.notes && <div style={{marginTop:14, padding:12, background:TH.bgInput, borderRadius:8, fontSize:13, color:TH.text, borderLeft:`3px solid ${TH.accent}`}}>{asset.notes}</div>}
      </div>

      {/* Action buttons */}
      {!actionType && (
        <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:16}}>
          {asset.status === 'available' && <ActionBtn TH={TH} onClick={() => setActionType('checkout')} color="#D4B876">↗ Check out</ActionBtn>}
          {asset.status === 'checked_out' && <ActionBtn TH={TH} onClick={() => setActionType('checkin')} color="#C9A960">↩ Check in / Return</ActionBtn>}
          {asset.status === 'available' && <ActionBtn TH={TH} onClick={() => setActionType('transfer')} color="#8B7A44">⇄ Transfer</ActionBtn>}
          {(asset.status === 'available' || asset.status === 'checked_out') && <ActionBtn TH={TH} onClick={() => setActionType('service_start')} color="#8B7A44">🔧 Send to service</ActionBtn>}
          {asset.status === 'in_service' && <ActionBtn TH={TH} onClick={() => setActionType('service_end')} color="#C9A960">✓ Back from service</ActionBtn>}
          {asset.status !== 'retired' && <ActionBtn TH={TH} onClick={() => setActionType('retire')} color="#6b7280" outline>⊗ Retire</ActionBtn>}
        </div>
      )}

      {/* Action form */}
      {actionType && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:20, marginBottom:16}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
            <div style={{fontSize:15, fontWeight:700, color:TH.text}}>
              {actionType === 'checkout'      && "↗ Check out asset"}
              {actionType === 'checkin'       && "↩ Return asset"}
              {actionType === 'transfer'      && "⇄ Transfer to another warehouse"}
              {actionType === 'service_start' && "🔧 Send for service"}
              {actionType === 'service_end'   && "✓ Return from service"}
              {actionType === 'retire'        && "⊗ Retire asset"}
            </div>
            <button onClick={() => setActionType(null)} style={{background:"transparent", border:"none", color:TH.textMuted, cursor:"pointer", fontSize:16, fontFamily:"inherit"}}>✕</button>
          </div>

          <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12}}>
            {actionType === 'checkout' && <>
              <Field TH={TH} label="Where is it going? (location)">
                <input value={actionForm.to_location} onChange={e => setActionForm(f => ({ ...f, to_location: e.target.value }))} placeholder='e.g. "Pool #3 Iskele"' style={inputStyle(TH)} />
              </Field>
              <Field TH={TH} label="Purpose">
                <input value={actionForm.purpose} onChange={e => setActionForm(f => ({ ...f, purpose: e.target.value }))} placeholder='e.g. "Pool cleaning"' style={inputStyle(TH)} />
              </Field>
              <Field TH={TH} label="Expected return">
                <input type="datetime-local" value={actionForm.expected_return_at} onChange={e => setActionForm(f => ({ ...f, expected_return_at: e.target.value }))} style={inputStyle(TH)} />
              </Field>
            </>}

            {actionType === 'checkin' && <>
              <Field TH={TH} label="Return to warehouse">
                <select value={actionForm.to_warehouse_id} onChange={e => setActionForm(f => ({ ...f, to_warehouse_id: e.target.value }))} style={inputStyle(TH)}>
                  <option value="">Same warehouse ({currentWh?.code || "?"})</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </Field>
            </>}

            {actionType === 'transfer' && <>
              <Field TH={TH} label="Destination warehouse *">
                <select value={actionForm.to_warehouse_id} onChange={e => setActionForm(f => ({ ...f, to_warehouse_id: e.target.value }))} style={inputStyle(TH)}>
                  <option value="">Select warehouse...</option>
                  {warehouses.filter(w => w.id !== asset.warehouse_id).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </Field>
              <Field TH={TH} label="Reason">
                <input value={actionForm.purpose} onChange={e => setActionForm(f => ({ ...f, purpose: e.target.value }))} placeholder='e.g. "Rebalancing"' style={inputStyle(TH)} />
              </Field>
            </>}

            {actionType === 'service_start' && <>
              <Field TH={TH} label="Service description">
                <input value={actionForm.purpose} onChange={e => setActionForm(f => ({ ...f, purpose: e.target.value }))} placeholder='e.g. "Annual maintenance"' style={inputStyle(TH)} />
              </Field>
            </>}
          </div>

          <Field TH={TH} label="Notes (optional)" style={{marginTop:12}}>
            <textarea value={actionForm.notes} onChange={e => setActionForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{...inputStyle(TH), minHeight:50, resize:"vertical"}} />
          </Field>

          <div style={{display:"flex", justifyContent:"flex-end", gap:8, marginTop:14, paddingTop:12, borderTop:`1px solid ${TH.border}`}}>
            <button onClick={() => setActionType(null)} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"9px 16px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>Cancel</button>
            <button onClick={doAction} disabled={busy} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:8, color:"#000", padding:"9px 20px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", opacity:busy?0.6:1}}>
              {busy ? "Recording..." : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {/* Movement history */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16, marginBottom:16}}>
        <div style={{fontSize:14, fontWeight:700, color:TH.text, marginBottom:12}}>📋 Movement history ({movements.length})</div>
        {movements.length === 0 ? (
          <div style={{padding:20, textAlign:"center", color:TH.textMuted, fontSize:13}}>No movements yet.</div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            {movements.map(m => {
              const meta = MOVEMENT_TYPES[m.movement_type] || { label: m.movement_type, icon: '•', color: TH.textMuted };
              return (
                <div key={m.id} style={{display:"flex", gap:12, padding:"10px 12px", background:TH.bgInput, borderRadius:8, borderLeft:`3px solid ${meta.color}`}}>
                  <div style={{fontSize:18, minWidth:24, textAlign:"center"}}>{meta.icon}</div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:13, color:TH.text, fontWeight:600}}>{meta.label}</div>
                    {m.purpose && <div style={{fontSize:12, color:TH.textMuted}}>{m.purpose}</div>}
                    {m.to_location && <div style={{fontSize:11, color:TH.textDim}}>→ {m.to_location}</div>}
                    {m.notes && <div style={{fontSize:11, color:TH.textDim, fontStyle:"italic", marginTop:4}}>"{m.notes}"</div>}
                  </div>
                  <div style={{fontSize:10, color:TH.textDim, whiteSpace:"nowrap"}}>{formatDate(m.performed_at)}</div>
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
function Field({ TH, label, children, style }) {
  return (
    <div style={style}>
      <label style={{display:"block", color:TH.textMuted, fontSize:12, marginBottom:6, fontWeight:600}}>{label}</label>
      {children}
    </div>
  );
}
function inputStyle(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
function ActionBtn({ TH, onClick, color, children, outline }) {
  return (
    <button onClick={onClick} style={{
      background: outline ? "transparent" : color,
      border: outline ? `1px solid ${color}` : "none",
      borderRadius: 10, color: outline ? color : "#fff",
      padding: "10px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
    }}>{children}</button>
  );
}
