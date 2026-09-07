// ═══════════════════════════════════════════════════════════════════
// ConsumablesTab.jsx v2 — Stock view + Items catalog (admin CRUD) + click-through history
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import ItemFormModal from "../components/ItemFormModal";
import ItemHistoryModal from "../components/ItemHistoryModal";
import ReceiveModal from "../components/ReceiveModal";
import DispenseModal from "../components/DispenseModal";

export default function ConsumablesTab({ TH, lang = "en", isMobile, isAdmin }) {
  const L = tr(lang);
  const [items, setItems] = useState([]);
  const [stock, setStock] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [view, setView] = useState("stock");    // 'stock' | 'items'
  const [whFilter, setWhFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Modals
  const [historyItem, setHistoryItem] = useState(null);
  const [editItem, setEditItem] = useState(null);       // {} for new, item obj for edit
  const [receivePreset, setReceivePreset] = useState(null);
  const [dispensePreset, setDispensePreset] = useState(null);

  useEffect(() => { load(); }, [showInactive]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const itemsQ = supabase.from('items')
        .select('id, code, name, description, category, unit, min_qty, last_unit_cost, currency, current_qty, default_supplier_id, is_active')
        .order('name');
      if (!showInactive) itemsQ.eq('is_active', true);

      const [rI, rS, rW] = await Promise.all([
        itemsQ,
        supabase.from('consumable_stock').select('item_id, warehouse_id, qty'),
        supabase.from('warehouses').select('id, code, name').eq('is_active', true).order('id'),
      ]);
      if (rI.error) throw rI.error;
      setItems(rI.data || []);
      setStock(rS.data || []);
      setWarehouses(rW.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // Build stock rows
  const stockMap = {};
  stock.forEach(s => { stockMap[`${s.item_id}-${s.warehouse_id}`] = Number(s.qty) || 0; });
  const whList = whFilter === "all" ? warehouses : warehouses.filter(w => String(w.id) === whFilter);

  const rows = [];
  items.forEach(item => {
    if (search && !`${item.name} ${item.code || ''} ${item.category || ''}`.toLowerCase().includes(search.toLowerCase())) return;

    if (whFilter === "all") {
      // ─── One row per item: total across every warehouse ─────────
      let total = 0;
      const breakdown = [];
      warehouses.forEach(w => {
        const q = stockMap[`${item.id}-${w.id}`] ?? 0;
        total += q;
        if (q !== 0) breakdown.push({ code: w.code, qty: q });
      });
      const low = item.min_qty != null && total < Number(item.min_qty);
      // Hide items with no stock anywhere unless they're genuinely low-flagged and we're hunting for those
      if (total === 0 && !lowOnly) return;
      if (lowOnly && !low) return;
      rows.push({ item, warehouse: null, qty: total, low, breakdown });
    } else {
      // ─── Specific warehouse: show its own stock line ────────────
      const w = warehouses.find(x => String(x.id) === whFilter);
      if (!w) return;
      const qty = stockMap[`${item.id}-${w.id}`] ?? 0;
      const low = item.min_qty != null && qty < Number(item.min_qty);
      if (lowOnly && !low) return;
      if (!lowOnly && qty === 0) return;
      rows.push({ item, warehouse: w, qty, low, breakdown: null });
    }
  });

  // Item catalog view (no warehouse breakdown)
  const catalogItems = items.filter(item => {
    if (search && !`${item.name} ${item.code || ''} ${item.category || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* ─── Modals ─── */}
      {historyItem && <ItemHistoryModal TH={TH} lang={lang} item={historyItem} onClose={() => setHistoryItem(null)} />}
      {editItem && <ItemFormModal TH={TH} lang={lang} item={editItem.id ? editItem : null} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); load(); }} />}
      {receivePreset !== null && <ReceiveModal TH={TH} lang={lang} presetItemId={receivePreset || null} onClose={() => setReceivePreset(null)} onDone={() => { setReceivePreset(null); load(); }} />}
      {dispensePreset !== null && <DispenseModal TH={TH} lang={lang} presetItemId={dispensePreset || null} onClose={() => setDispensePreset(null)} onDone={() => { setDispensePreset(null); load(); }} />}

      {/* ─── View switcher + actions ─── */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10}}>
        <div style={{display:"flex", gap:4, background:TH.bgInput, borderRadius:9, padding:3}}>
          <button onClick={() => setView("stock")} style={tabBtn(TH, view === "stock")}>📦 Stock</button>
          <button onClick={() => setView("items")} style={tabBtn(TH, view === "items")}>📋 Items catalog</button>
        </div>
        <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
          <button onClick={() => setReceivePreset("")} style={btnGreen()}>↓ Receive</button>
          <button onClick={() => setDispensePreset("")} style={btnGold()}>↑ Dispense</button>
          {isAdmin && <button onClick={() => setEditItem({})} style={btnOutline(TH)}>+ New item</button>}
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"2fr 1fr auto", gap:8, marginBottom:16}}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L.searchItem || "Search item name, code, category…"} style={inp(TH)} />
        {view === "stock" && (
          <select value={whFilter} onChange={e => setWhFilter(e.target.value)} style={inp(TH)}>
            <option value="all">{L.allWarehouses || "All warehouses"}</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
        {view === "stock" ? (
          <button onClick={() => setLowOnly(v => !v)} style={{
            background: lowOnly ? "rgba(139,112,64,0.2)" : "transparent",
            border:`1px solid ${lowOnly ? "#8B7040" : TH.border}`, borderRadius:8,
            color: lowOnly ? "#B8935A" : TH.textMuted, padding:"9px 16px",
            cursor:"pointer", fontSize:13, fontWeight: lowOnly ? 700 : 500, fontFamily:"inherit", whiteSpace:"nowrap",
          }}>{L.lowOnly || "⚠ Low only"}</button>
        ) : (
          isAdmin && (
            <label style={{display:"flex", alignItems:"center", gap:6, padding:"9px 12px", cursor:"pointer", color:TH.textMuted, fontSize:12}}>
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
              Show inactive
            </label>
          )
        )}
      </div>

      {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:10, padding:"12px 14px", color:"#C43D3D", fontSize:13, marginBottom:14}}>{error}</div>}

      {/* ─── Body: Stock view ─── */}
      {view === "stock" && (loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>{L.loading || "Loading…"}</div>
      ) : rows.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          {items.length === 0 ? (
            <>
              No items yet.
              {isAdmin && <><br/><button onClick={() => setEditItem({})} style={{...btnGold(), marginTop:12}}>+ Create your first item</button></>}
            </>
          ) : lowOnly
            ? "Nothing is below its minimum level."
            : "No stock on hand. Use ↓ Receive to bring items in, or switch to Items catalog to see all products."}
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {rows.map(({ item, warehouse, qty, low, breakdown }) => (
            <div key={warehouse ? `${item.id}-${warehouse.id}` : `${item.id}-all`} style={{
              background:TH.bgCard, border:`1px solid ${low ? "rgba(139,112,64,0.5)" : TH.border}`,
              borderRadius:10, padding:"12px 14px",
              display:"flex", alignItems:"center", gap:12,
            }}>
              <div style={{flex:1, minWidth:0, cursor:"pointer"}} onClick={() => setHistoryItem(item)}>
                <div style={{fontSize:13, fontWeight:700, color:TH.text}}>{item.name}</div>
                <div style={{fontSize:10, color:TH.textDim}}>
                  {item.code ? `${item.code} · ` : ''}
                  {warehouse ? warehouse.code : (item.department || '')}
                  {item.category ? ` · ${item.category}` : ''}
                </div>
                {breakdown && breakdown.length > 0 && (
                  <div style={{display:"flex", gap:4, marginTop:5, flexWrap:"wrap"}}>
                    {breakdown.map(b => (
                      <span key={b.code} style={{fontSize:9, color:TH.textMuted, background:TH.bgInput, border:`1px solid ${TH.border}`, padding:"1px 6px", borderRadius:3}}>
                        {b.code}: <b style={{color:TH.text}}>{b.qty}</b>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:18, fontWeight:800, color: low ? "#B8935A" : TH.text, lineHeight:1}}>
                  {qty} <span style={{fontSize:10, color:TH.textDim, fontWeight:500}}>{item.unit || ''}</span>
                </div>
                {low && <div style={{fontSize:9, color:"#B8935A", fontWeight:700}}>{L.low || "LOW"} ({L.min || "min"} {item.min_qty})</div>}
              </div>
              <div style={{display:"flex", gap:4, flexShrink:0}}>
                <button onClick={() => setReceivePreset(item.id)} title="Receive stock" style={{background:"transparent", border:`1px solid rgba(122,154,91,0.4)`, borderRadius:6, color:"#7A9A5B", padding:"6px 10px", cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit"}}>↓</button>
                <button onClick={() => setDispensePreset(item.id)} title="Dispense" style={{background:"transparent", border:`1px solid rgba(184,147,90,0.4)`, borderRadius:6, color:"#B8935A", padding:"6px 10px", cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit"}}>↑</button>
                <button onClick={() => setHistoryItem(item)} title="Movement history" style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"6px 10px", cursor:"pointer", fontSize:12, fontFamily:"inherit"}}>📜</button>
                {isAdmin && <button onClick={() => setEditItem(item)} title="Edit item" style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"6px 10px", cursor:"pointer", fontSize:12, fontFamily:"inherit"}}>✎</button>}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* ─── Body: Items catalog view ─── */}
      {view === "items" && (loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>{L.loading || "Loading…"}</div>
      ) : catalogItems.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          No items match.
          {isAdmin && <><br/><button onClick={() => setEditItem({})} style={{...btnGold(), marginTop:12}}>+ New item</button></>}
        </div>
      ) : (
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(280px, 1fr))", gap:10}}>
          {catalogItems.map(item => (
            <div key={item.id} style={{
              background:TH.bgCard, border:`1px solid ${TH.border}`,
              borderLeft: item.is_active === false ? `3px solid #5c5c5c` : `3px solid ${TH.accent}`,
              borderRadius:10, padding:"12px 14px",
              opacity: item.is_active === false ? 0.6 : 1,
            }}>
              <div style={{display:"flex", justifyContent:"space-between", gap:8, marginBottom:6}}>
                <div style={{flex:1, minWidth:0, cursor:"pointer"}} onClick={() => setHistoryItem(item)}>
                  <div style={{fontSize:14, fontWeight:700, color:TH.text}}>{item.name}</div>
                  <div style={{fontSize:10, color:TH.textDim, marginTop:2}}>
                    {item.code && <span>{item.code} · </span>}
                    {item.category}
                  </div>
                </div>
                {isAdmin && <button onClick={() => setEditItem(item)} title="Edit" style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"4px 8px", cursor:"pointer", fontSize:11, fontFamily:"inherit"}}>✎</button>}
              </div>
              {item.description && <div style={{fontSize:11, color:TH.textMuted, marginBottom:6, lineHeight:1.4}}>{item.description}</div>}
              <div style={{display:"flex", gap:6, flexWrap:"wrap", marginTop:8}}>
                <span style={chip(TH)}>Unit: <b style={{color:TH.text}}>{item.unit}</b></span>
                {item.current_qty != null && <span style={chip(TH)}>Total: <b style={{color:TH.text}}>{item.current_qty}</b></span>}
                {item.min_qty != null && <span style={chip(TH)}>Min: {item.min_qty}</span>}
                {item.last_unit_cost != null && <span style={{...chip(TH), color:TH.accent}}>€{item.last_unit_cost}/{item.unit}</span>}
              </div>
              <div style={{display:"flex", gap:4, marginTop:10}}>
                <button onClick={() => setReceivePreset(item.id)} style={{flex:1, background:"transparent", border:`1px solid rgba(122,154,91,0.4)`, borderRadius:6, color:"#7A9A5B", padding:"6px", cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit"}}>↓ Receive</button>
                <button onClick={() => setDispensePreset(item.id)} style={{flex:1, background:"transparent", border:`1px solid rgba(184,147,90,0.4)`, borderRadius:6, color:"#B8935A", padding:"6px", cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit"}}>↑ Dispense</button>
                <button onClick={() => setHistoryItem(item)} style={{flex:1, background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"6px", cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:"inherit"}}>📜 History</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function tabBtn(TH, active) {
  return {
    background: active ? TH.bgCard : "transparent",
    border: "none", borderRadius: 7,
    color: active ? TH.text : TH.textMuted,
    padding: "6px 14px", cursor: "pointer", fontSize: 12,
    fontWeight: active ? 700 : 500, fontFamily: "inherit",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
  };
}
function btnGreen() {
  return { background: "linear-gradient(135deg,#7A9A5B,#5B7A44)", border:"none", borderRadius:9, color:"#fff", padding:"9px 16px", cursor:"pointer", fontSize:12, fontWeight:800, fontFamily:"inherit" };
}
function btnGold() {
  return { background: "linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:9, color:"#000", padding:"9px 16px", cursor:"pointer", fontSize:12, fontWeight:800, fontFamily:"inherit" };
}
function btnOutline(TH) {
  return { background:"transparent", border:`1px solid ${TH.accent}`, borderRadius:9, color:TH.accent, padding:"9px 16px", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit" };
}
function inp(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
function chip(TH) {
  return { fontSize:10, color:TH.textMuted, background:TH.bgInput, border:`1px solid ${TH.border}`, padding:"2px 8px", borderRadius:4, whiteSpace:"nowrap" };
}
