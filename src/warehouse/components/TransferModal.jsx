// ═══════════════════════════════════════════════════════════════════
// TransferModal.jsx — move stock between warehouses in one atomic call
// Uses RPC: transfer_consumable (writes both legs + syncs stock)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import { Icon } from "../lib/icons";

export default function TransferModal({ TH, lang = "en", presetItemId = null, onClose, onDone }) {
  const L = tr(lang);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [itemSearch, setItemSearch] = useState("");
  const [results, setResults] = useState([]);
  const [item, setItem] = useState(null);

  const [warehouses, setWarehouses] = useState([]);
  const [stock, setStock] = useState([]);
  const [fromWh, setFromWh] = useState("");
  const [toWh, setToWh] = useState("");
  const [qty, setQty] = useState("");
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    supabase.from('warehouses').select('id, code, name').eq('is_active', true).order('id')
      .then(({ data }) => setWarehouses(data || []));
    if (presetItemId) {
      supabase.from('items').select('*').eq('id', presetItemId).single()
        .then(({ data }) => { if (data) pick(data); });
    }
  }, [presetItemId]);

  useEffect(() => {
    if (item) return;
    if (!itemSearch.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('items')
        .select('id, code, name, unit, current_qty')
        .ilike('name', `%${itemSearch.trim()}%`)
        .eq('is_active', true).order('name').limit(10);
      setResults(data || []);
    }, 200);
    return () => clearTimeout(t);
  }, [itemSearch, item]);

  async function pick(it) {
    setItem(it); setItemSearch(it.name); setResults([]);
    const { data } = await supabase.from('consumable_stock')
      .select('warehouse_id, qty').eq('item_id', it.id);
    setStock(data || []);
    const withStock = (data || []).filter(s => Number(s.qty) > 0).sort((a,b) => b.qty - a.qty);
    if (withStock.length) setFromWh(String(withStock[0].warehouse_id));
  }

  const qtyIn = whId => Number((stock.find(s => String(s.warehouse_id) === String(whId)) || {}).qty || 0);
  const available = fromWh ? qtyIn(fromWh) : 0;

  async function submit() {
    setError(null);
    if (!item) return setError(L.pickItem || "Pick an item first");
    if (!fromWh) return setError("Pick the source warehouse");
    if (!toWh) return setError("Pick the destination warehouse");
    if (fromWh === toWh) return setError("Source and destination must differ");
    if (!qty || Number(qty) <= 0) return setError("Enter a quantity");
    if (Number(qty) > available) return setError(`Only ${available} ${item.unit || ''} available in the source warehouse`);

    setBusy(true);
    try {
      const { error: e } = await supabase.rpc('transfer_consumable', {
        p_item_id: item.id,
        p_from_warehouse: Number(fromWh),
        p_to_warehouse: Number(toWh),
        p_qty: Number(qty),
        p_notes: notes.trim() || null,
        p_reference_no: ref.trim() || null,
      });
      if (e) throw e;
      onDone?.();
    } catch (e) { setError(e.message || String(e)); setBusy(false); }
  }

  const whName = id => (warehouses.find(w => String(w.id) === String(id)) || {}).name || '—';

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(8,12,22,.72)", backdropFilter:"blur(3px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:24, width:"100%", maxWidth:560, maxHeight:"92vh", overflowY:"auto", boxShadow:TH.shadowLg}}>

        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, paddingBottom:14, borderBottom:`1px solid ${TH.divider}`}}>
          <div style={{display:"flex", alignItems:"center", gap:9}}>
            <span style={{color:TH.accent, display:"flex"}}><Icon name="transfer" size={19} /></span>
            <span style={{fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, fontWeight:500, color:TH.textHeading}}>
              {L.transferTitle2 || "Transfer stock"}
            </span>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Close" style={{background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:9, width:30, height:30, color:TH.textMuted, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0}}>
            <Icon name="close" size={14} />
          </button>
        </div>

        {/* Item */}
        <Lbl TH={TH}>{L.item || "Item"} *</Lbl>
        {!item ? (
          <div style={{position:"relative", marginBottom:14}}>
            <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} autoFocus
              placeholder={L.searchItem || "Start typing an item name…"} style={inp(TH)} />
            {results.length > 0 && (
              <div style={{position:"absolute", top:"100%", left:0, right:0, background:TH.bgElev, border:`1px solid ${TH.border}`, borderRadius:8, marginTop:4, maxHeight:220, overflowY:"auto", zIndex:10, boxShadow:TH.shadowLg}}>
                {results.map(it => (
                  <div key={it.id} onClick={() => pick(it)} style={{padding:"9px 12px", cursor:"pointer", borderBottom:`1px solid ${TH.divider}`}}
                    onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{fontSize:13, fontWeight:600, color:TH.text}}>{it.name}</div>
                    <div style={{fontSize:10, color:TH.textDim}}>{it.code ? `${it.code} · ` : ''}{it.current_qty} {it.unit} total</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{background:TH.bgInput, borderRadius:8, padding:"11px 13px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center", gap:10}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13, fontWeight:600, color:TH.text}}>{item.name}</div>
              <div style={{fontSize:10, color:TH.textDim}}>{item.code ? `${item.code} · ` : ''}{L.unitLbl || "unit"}: {item.unit}</div>
            </div>
            <button onClick={() => { setItem(null); setItemSearch(""); setStock([]); setFromWh(""); }} disabled={busy}
              style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"5px 11px", cursor:"pointer", fontSize:11, fontFamily:"inherit", flexShrink:0}}>
              {L.change || "Change"}
            </button>
          </div>
        )}

        {item && (<>
          {/* Stock per warehouse */}
          {stock.length > 0 && (
            <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:14}}>
              {warehouses.map(w => {
                const q = qtyIn(w.id);
                if (q === 0) return null;
                return (
                  <span key={w.id} style={{fontSize:10.5, color:TH.textMuted, background:TH.bgInput, border:`1px solid ${TH.border}`, padding:"3px 9px", borderRadius:4}}>
                    {w.code}: <b style={{color:TH.text}}>{q}</b>
                  </span>
                );
              })}
            </div>
          )}

          {/* From → To */}
          <div style={{display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:10, alignItems:"end", marginBottom:14}}>
            <div>
              <Lbl TH={TH}>{L.fromLbl || "From"} *</Lbl>
              <select value={fromWh} onChange={e => setFromWh(e.target.value)} disabled={busy} style={inp(TH)}>
                <option value="">—</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id} disabled={qtyIn(w.id) <= 0}>
                    {w.code} ({qtyIn(w.id)})
                  </option>
                ))}
              </select>
            </div>
            <div style={{color:TH.accent, display:"flex", paddingBottom:11}}><Icon name="arrowRight" size={19} /></div>
            <div>
              <Lbl TH={TH}>{L.toLbl || "To"} *</Lbl>
              <select value={toWh} onChange={e => setToWh(e.target.value)} disabled={busy} style={inp(TH)}>
                <option value="">—</option>
                {warehouses.filter(w => String(w.id) !== fromWh).map(w => (
                  <option key={w.id} value={w.id}>{w.code} ({qtyIn(w.id)})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Qty */}
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14}}>
            <div>
              <Lbl TH={TH}>
                {L.qty || "Qty"} * <span style={{color:TH.textDim, fontSize:9, textTransform:"none", fontWeight:400}}>{item.unit} · max {available}</span>
              </Lbl>
              <input type="number" step="0.01" min="0" max={available} value={qty}
                onChange={e => setQty(e.target.value)} disabled={busy || !fromWh}
                style={{...inp(TH), borderColor: qty && Number(qty) > available ? TH.danger : TH.border}} />
            </div>
            <div>
              <Lbl TH={TH}>{L.referenceNo2 || "Reference"}</Lbl>
              <input value={ref} onChange={e => setRef(e.target.value)} disabled={busy}
                placeholder={L.autoGen || "auto"} style={inp(TH)} />
            </div>
          </div>

          <div style={{marginBottom:16}}>
            <Lbl TH={TH}>{L.notes || "Notes"}</Lbl>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} disabled={busy}
              placeholder={L.whyMoving || "Why is this moving?"} style={{...inp(TH), resize:"vertical"}} />
          </div>

          {fromWh && toWh && qty > 0 && Number(qty) <= available && (
            <div style={{background:TH.infoBg, border:`1px solid ${TH.info}33`, borderRadius:9, padding:"11px 13px", marginBottom:14, fontSize:12, color:TH.textMuted}}>
              <b style={{color:TH.text}}>{qty} {item.unit}</b> {L.willMove || "will move from"} <b style={{color:TH.text}}>{whName(fromWh)}</b> {L.toLbl2 || "to"} <b style={{color:TH.text}}>{whName(toWh)}</b>.
              <div style={{marginTop:5, fontSize:11, color:TH.textDim}}>
                {whName(fromWh)}: {available} → {available - Number(qty)} · {whName(toWh)}: {qtyIn(toWh)} → {qtyIn(toWh) + Number(qty)}
              </div>
            </div>
          )}
        </>)}

        {error && (
          <div style={{background:TH.dangerBg, border:`1px solid ${TH.danger}55`, borderRadius:9, padding:"11px 13px", color:TH.danger, fontSize:12.5, marginBottom:14}}>{error}</div>
        )}

        <div style={{display:"flex", gap:8, justifyContent:"flex-end", paddingTop:14, borderTop:`1px solid ${TH.divider}`}}>
          <button onClick={onClose} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"inherit"}}>
            {L.cancel || "Cancel"}
          </button>
          <button onClick={submit} disabled={busy || !item} style={{
            background:TH.deep, border:`1px solid ${TH.deepBorder}`, borderRadius:9,
            color:TH.onDeep, padding:"10px 22px", cursor:"pointer", fontSize:13, fontWeight:700,
            fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:7,
            opacity:(busy || !item) ? .5 : 1,
          }}>
            <Icon name="transfer" size={14} />{busy ? (L.transferring || "Transferring…") : (L.confirmTransfer || "Transfer")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Lbl({ TH, children }) {
  return <label style={{display:"block", fontSize:10, fontWeight:700, color:TH.textMuted, marginBottom:5, textTransform:"uppercase", letterSpacing:".1em"}}>{children}</label>;
}
function inp(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"10px 12px", color:TH.text, fontSize:13.5, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
