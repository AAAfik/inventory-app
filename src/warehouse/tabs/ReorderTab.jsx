// ═══════════════════════════════════════════════════════════════════
// ReorderTab.jsx — items below minimum, grouped by supplier,
// with editable order quantities and CSV / print PO draft
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import { Icon } from "../lib/icons";
import { Empty, ErrBox, inp, goldBtn, deepBtn, ghostBtn, Stat } from "./SuppliersTab";
import ReceiveModal from "../components/ReceiveModal";

export default function ReorderTab({ TH, lang = "en", isMobile, isAdmin }) {
  const L = tr(lang);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qtyOverride, setQty] = useState({});   // item_id -> qty
  const [selected, setSelected] = useState({}); // item_id -> bool
  const [urgencyFilter, setUrg] = useState("all");
  const [receivePreset, setReceivePreset] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.from('v_reorder_list').select('*').order('urgency').order('name');
      if (error) throw error;
      setRows(data || []);
      const sel = {};
      (data || []).forEach(r => { sel[r.item_id] = true; });
      setSelected(sel);
    } catch (e) { setError(e.message || String(e)); }
    finally { setLoading(false); }
  }

  const visible = rows.filter(r => urgencyFilter === "all" || r.urgency === urgencyFilter);

  const groups = useMemo(() => {
    const g = {};
    visible.forEach(r => {
      const key = r.supplier_id || 'none';
      if (!g[key]) g[key] = {
        supplier_id: r.supplier_id, name: r.supplier_name || (L.noSupplier || "No supplier assigned"),
        phone: r.supplier_phone, email: r.supplier_email, rows: [],
      };
      g[key].rows.push(r);
    });
    return Object.values(g).sort((a,b) => (a.supplier_id ? 0 : 1) - (b.supplier_id ? 0 : 1) || a.name.localeCompare(b.name));
  }, [visible, L]);

  const qtyFor = r => {
    const v = qtyOverride[r.item_id];
    return v === undefined || v === "" ? Number(r.suggested_qty) || 0 : Number(v) || 0;
  };
  const selRows = visible.filter(r => selected[r.item_id]);
  const totalCost = selRows.reduce((s, r) => s + qtyFor(r) * (Number(r.last_unit_cost) || 0), 0);
  const outCount = rows.filter(r => r.urgency === 'out').length;

  function toggleAll(on) {
    const s = {};
    visible.forEach(r => { s[r.item_id] = on; });
    setSelected(prev => ({ ...prev, ...s }));
  }

  function exportCSV(group) {
    const list = (group ? group.rows : selRows).filter(r => selected[r.item_id]);
    if (!list.length) return;
    const head = ['Item code','Item name','Unit','On hand','Minimum','Order qty','Unit cost','Line total','Supplier'];
    const lines = [head.join(',')];
    list.forEach(r => {
      const q = qtyFor(r);
      lines.push([
        r.code || '', r.name, r.unit || '', r.current_qty ?? 0, r.min_qty ?? '',
        q, r.last_unit_cost ?? '', (q * (Number(r.last_unit_cost)||0)).toFixed(2),
        r.supplier_name || '',
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type:'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reorder_${(group?.name || 'all').replace(/[^\w]/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  function printPO(group) {
    const list = group.rows.filter(r => selected[r.item_id]);
    if (!list.length) return;
    const total = list.reduce((s,r) => s + qtyFor(r) * (Number(r.last_unit_cost)||0), 0);
    const esc = t => String(t ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Purchase request — ${esc(group.name)}</title>
<style>
@page{size:A4;margin:16mm}
body{font-family:Inter,Helvetica,Arial,sans-serif;color:#111;font-size:11pt;margin:0}
.hd{display:flex;justify-content:space-between;border-bottom:3px solid #C9A960;padding-bottom:10px;margin-bottom:18px}
.brand{font-family:'Playfair Display',Georgia,serif;font-size:20pt;color:#16233D;font-weight:700}
.sub{font-size:9pt;color:#8B7A44;letter-spacing:.3em;font-weight:600}
h1{font-family:'Playfair Display',Georgia,serif;font-size:19pt;margin:0 0 4px;color:#16233D;font-weight:600}
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px 18px;background:#FAF9F5;border:1px solid #E2E0D8;padding:12px 14px;margin-bottom:16px}
.lbl{font-size:8pt;color:#8B7A44;text-transform:uppercase;letter-spacing:.09em;font-weight:700;margin-bottom:2px}
table{width:100%;border-collapse:collapse;font-size:10pt}
th{background:#FAF9F5;color:#8B7A44;font-size:8.5pt;text-transform:uppercase;letter-spacing:.06em;padding:8px 9px;text-align:left;border-bottom:2px solid #E2E0D8}
td{padding:8px 9px;border-bottom:1px solid #EDEBE4}
.num{text-align:right}
tfoot td{font-weight:700;border-top:2px solid #16233D;border-bottom:none;padding-top:10px}
.sig{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:44px}
.sigb{border-top:1px solid #999;padding-top:6px;font-size:9pt;color:#666}
.tb{position:fixed;top:10px;right:10px;background:#C9A960;padding:8px 14px;border-radius:6px;font-weight:700;font-size:11pt}
.tb button{background:#16233D;color:#fff;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;font-weight:700;margin-left:8px}
@media print{.tb{display:none}}
</style></head><body>
<div class="tb">Save as PDF<button onclick="window.print()">Print</button></div>
<div class="hd"><div><div class="sub">CAESAR</div><div class="brand">Caesar Projects</div></div>
<div style="text-align:right;font-size:10pt;color:#666">${new Date().toLocaleDateString('en-GB',{year:'numeric',month:'long',day:'2-digit'})}</div></div>
<h1>Purchase request</h1>
<div class="meta">
<div><div class="lbl">Supplier</div><div>${esc(group.name)}</div></div>
<div><div class="lbl">Contact</div><div>${esc(group.phone || '—')}</div></div>
<div><div class="lbl">Email</div><div>${esc(group.email || '—')}</div></div>
<div><div class="lbl">Lines</div><div>${list.length}</div></div>
<div><div class="lbl">Estimated total</div><div style="font-weight:700;color:#8B7A44">€${total.toFixed(2)}</div></div>
<div><div class="lbl">Reference</div><div>PR-${new Date().toISOString().slice(0,10).replace(/-/g,'')}</div></div>
</div>
<table><thead><tr><th>#</th><th>Item</th><th>Code</th><th class="num">On hand</th><th class="num">Min</th><th class="num">Order</th><th class="num">Unit €</th><th class="num">Total €</th></tr></thead><tbody>
${list.map((r,i) => {
  const q = qtyFor(r), c = Number(r.last_unit_cost)||0;
  return `<tr><td>${i+1}</td><td>${esc(r.name)}</td><td>${esc(r.code||'')}</td>
  <td class="num">${r.current_qty ?? 0} ${esc(r.unit||'')}</td><td class="num">${r.min_qty ?? ''}</td>
  <td class="num"><b>${q} ${esc(r.unit||'')}</b></td><td class="num">${c ? c.toFixed(2) : '—'}</td>
  <td class="num">${c ? (q*c).toFixed(2) : '—'}</td></tr>`;
}).join('')}
</tbody><tfoot><tr><td colspan="7" class="num">Estimated total</td><td class="num">€${total.toFixed(2)}</td></tr></tfoot></table>
<div class="sig"><div class="sigb">Requested by</div><div class="sigb">Approved by</div></div>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) { alert('Popup blocked. Please allow popups.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  return (
    <div>
      {receivePreset !== null && (
        <ReceiveModal TH={TH} lang={lang} presetItemId={receivePreset || null}
          onClose={() => setReceivePreset(null)} onDone={() => { setReceivePreset(null); load(); }} />
      )}

      {/* Stats */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)", gap:10, marginBottom:16}}>
        <Stat TH={TH} label={L.belowMin || "Below minimum"} value={rows.length} />
        <Stat TH={TH} label={L.outOfStock || "Out of stock"} value={outCount} alert={outCount > 0} />
        <Stat TH={TH} label={L.suppliersLbl || "Suppliers"} value={groups.filter(g => g.supplier_id).length} />
        <Stat TH={TH} label={L.estCost || "Estimated cost"} value={`€${Math.round(totalCost).toLocaleString('en-GB')}`} gold />
      </div>

      {/* Toolbar */}
      <div style={{display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center"}}>
        <div style={{display:"flex", gap:4}}>
          {[['all', L.filterAll || 'All'], ['out', L.outOfStock || 'Out'], ['low', L.low || 'Low']].map(([k, lbl]) => (
            <button key={k} onClick={() => setUrg(k)} style={pill(TH, urgencyFilter === k)}>{lbl}</button>
          ))}
        </div>
        <div style={{width:1, height:20, background:TH.border}} />
        <button onClick={() => toggleAll(true)}  style={pill(TH, false)}>{L.selectAll || "Select all"}</button>
        <button onClick={() => toggleAll(false)} style={pill(TH, false)}>{L.clear || "Clear"}</button>
        <div style={{marginInlineStart:"auto", display:"flex", gap:8}}>
          <button onClick={() => exportCSV(null)} disabled={!selRows.length} style={{...ghostBtn(TH), display:"inline-flex", alignItems:"center", gap:6, opacity: selRows.length?1:.4}}>
            <Icon name="arrowDown" size={13} />{L.exportCsv || "Export CSV"}
          </button>
        </div>
      </div>

      {error && <ErrBox TH={TH}>{error}</ErrBox>}

      {loading ? <Empty TH={TH}>{L.loading || "Loading…"}</Empty>
       : rows.length === 0 ? (
        <Empty TH={TH}>
          <div style={{color:TH.ok, fontSize:15, fontWeight:600, marginBottom:6}}>{L.nothingToReorder || "Nothing to reorder"}</div>
          <div>{L.allAboveMin || "Every item is at or above its minimum level."}</div>
        </Empty>
      ) : groups.map(g => {
        const gSel = g.rows.filter(r => selected[r.item_id]);
        const gTotal = gSel.reduce((s,r) => s + qtyFor(r) * (Number(r.last_unit_cost)||0), 0);
        return (
          <div key={g.supplier_id || 'none'} style={{
            background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12,
            marginBottom:14, overflow:"hidden", boxShadow:TH.cardGlow,
          }}>
            <div style={{
              display:"flex", justifyContent:"space-between", alignItems:"center", gap:10,
              padding:"13px 16px", borderBottom:`1px solid ${TH.divider}`,
              background: g.supplier_id ? "transparent" : TH.warnBg, flexWrap:"wrap",
            }}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13, fontWeight:700, color: g.supplier_id ? TH.textHeading : TH.warn}}>{g.name}</div>
                <div style={{fontSize:10.5, color:TH.textDim, marginTop:2}}>
                  {g.rows.length} {L.itemsLbl || "items"}
                  {gSel.length !== g.rows.length ? ` · ${gSel.length} ${L.selectedLbl || "selected"}` : ''}
                  {gTotal > 0 ? ` · €${gTotal.toFixed(2)}` : ''}
                  {g.phone ? ` · ${g.phone}` : ''}
                </div>
              </div>
              <div style={{display:"flex", gap:6}}>
                <button onClick={() => exportCSV(g)} disabled={!gSel.length} style={{...iconTextBtn(TH), opacity:gSel.length?1:.4}}>
                  <Icon name="arrowDown" size={12} />CSV
                </button>
                <button onClick={() => printPO(g)} disabled={!gSel.length} style={{...deepBtn(TH), padding:"7px 14px", fontSize:11.5, opacity:gSel.length?1:.4}}>
                  <Icon name="print" size={13} />{L.purchaseRequest || "Purchase request"}
                </button>
              </div>
            </div>

            {g.rows.map(r => {
              const out = r.urgency === 'out';
              const q = qtyFor(r);
              const cost = q * (Number(r.last_unit_cost) || 0);
              return (
                <div key={r.item_id} style={{
                  display:"flex", alignItems:"center", gap:11, padding:"11px 16px",
                  borderBottom:`1px solid ${TH.divider}`,
                  opacity: selected[r.item_id] ? 1 : .45,
                }}>
                  <input type="checkbox" checked={!!selected[r.item_id]}
                    onChange={e => setSelected(p => ({ ...p, [r.item_id]: e.target.checked }))}
                    style={{width:16, height:16, accentColor:TH.accent, cursor:"pointer", flexShrink:0}} />

                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:13, fontWeight:600, color:TH.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{r.name}</div>
                    <div style={{fontSize:10, color:TH.textDim, marginTop:2}}>
                      {[r.code, r.category].filter(Boolean).join(' · ')}
                      {r.last_received_at ? ` · ${L.lastRecv || "last recv"} ${new Date(r.last_received_at).toLocaleDateString('en-GB',{month:'short',year:'2-digit'})}` : ''}
                    </div>
                  </div>

                  <div style={{textAlign:"end", minWidth:78, flexShrink:0}}>
                    <div style={{fontSize:14, fontWeight:700, color: out ? TH.danger : TH.warn, lineHeight:1.1}}>
                      {r.current_qty ?? 0} <span style={{fontSize:9.5, color:TH.textDim, fontWeight:500}}>{r.unit}</span>
                    </div>
                    <div style={{fontSize:9, color:TH.textDim}}>{L.min || "min"} {r.min_qty}</div>
                  </div>

                  <div style={{flexShrink:0, width:104}}>
                    <div style={{fontSize:8.5, fontWeight:700, color:TH.textDim, textTransform:"uppercase", letterSpacing:".08em", marginBottom:3}}>{L.orderQty || "Order"}</div>
                    <input type="number" min="0" step="0.01"
                      value={qtyOverride[r.item_id] ?? r.suggested_qty ?? ''}
                      onChange={e => setQty(p => ({ ...p, [r.item_id]: e.target.value }))}
                      style={{...inp(TH), padding:"6px 9px", fontSize:12.5, textAlign:"end"}} />
                  </div>

                  <div style={{textAlign:"end", minWidth:66, flexShrink:0}}>
                    <div style={{fontSize:8.5, fontWeight:700, color:TH.textDim, textTransform:"uppercase", letterSpacing:".08em"}}>{L.lineTotal || "Total"}</div>
                    <div style={{fontSize:12.5, fontWeight:600, color: cost ? TH.accent : TH.textDim, marginTop:3}}>
                      {cost ? `€${cost.toFixed(2)}` : '—'}
                    </div>
                  </div>

                  <button onClick={() => setReceivePreset(r.item_id)} title={L.receiveBtn || "Receive"} aria-label="Receive"
                    style={{background:"transparent", border:`1px solid ${TH.ok}55`, borderRadius:6, color:TH.ok, padding:"6px 9px", cursor:"pointer", display:"flex", alignItems:"center", flexShrink:0, fontFamily:"inherit"}}>
                    <Icon name="arrowDown" size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function pill(TH, active) {
  return {
    background: active ? TH.accentBg : "transparent",
    border: `1px solid ${active ? TH.accentBorder : TH.border}`,
    borderRadius: 20, color: active ? TH.accentText : TH.textMuted,
    padding: "6px 13px", cursor: "pointer", fontSize: 11.5,
    fontWeight: active ? 700 : 500, fontFamily: "inherit", whiteSpace:"nowrap",
  };
}
function iconTextBtn(TH) {
  return {
    background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8,
    color:TH.textMuted, padding:"7px 12px", cursor:"pointer", fontSize:11.5,
    fontWeight:600, fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:5,
  };
}
