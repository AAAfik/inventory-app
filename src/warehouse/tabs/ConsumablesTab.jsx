// ═══════════════════════════════════════════════════════════════════
// ConsumablesTab.jsx — per-warehouse consumable stock with min alerts
// Links public.items ↔ public.consumable_stock
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";

export default function ConsumablesTab({ TH, isMobile, isAdmin }) {
  const [items, setItems] = useState([]);
  const [stock, setStock] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [whFilter, setWhFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [adjusting, setAdjusting] = useState(null); // {itemId, warehouseId, current}
  const [adjQty, setAdjQty] = useState("");
  const [adjDir, setAdjDir] = useState("in");
  const [adjNote, setAdjNote] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rI, rS, rW] = await Promise.all([
        supabase.from('items').select('id, code, name, unit, min_stock').order('name'),
        supabase.from('consumable_stock').select('*'),
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

  async function applyAdjust() {
    setBusy(true); setError(null);
    try {
      const qty = Number(adjQty);
      if (!qty || qty <= 0) throw new Error("Enter a positive quantity");
      const { data: { user } } = await supabase.auth.getUser();

      const { error: e } = await supabase.from('consumable_movements').insert([{
        item_id:      adjusting.itemId,
        warehouse_id: adjusting.warehouseId,
        qty:          adjDir === 'in' ? qty : -qty,
        movement_type: adjDir === 'in' ? 'restock' : 'issue',
        notes:        adjNote.trim() || null,
        performed_by: user?.id,
      }]);
      if (e) throw e;

      setAdjusting(null); setAdjQty(""); setAdjNote("");
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  // Build display rows: one per item × warehouse with stock, or aggregated
  const stockMap = {};
  stock.forEach(s => { stockMap[`${s.item_id}-${s.warehouse_id}`] = Number(s.qty) || 0; });

  const whList = whFilter === "all" ? warehouses : warehouses.filter(w => String(w.id) === whFilter);

  const rows = [];
  items.forEach(item => {
    if (search && !`${item.name} ${item.code}`.toLowerCase().includes(search.toLowerCase())) return;
    whList.forEach(w => {
      const qty = stockMap[`${item.id}-${w.id}`] ?? 0;
      const low = item.min_stock != null && qty < Number(item.min_stock);
      if (lowOnly && !low) return;
      if (whFilter === "all" && qty === 0 && !low) return; // hide empty rows in "all" view
      rows.push({ item, warehouse: w, qty, low });
    });
  });

  return (
    <div>
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"2fr 1fr auto", gap:8, marginBottom:16}}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search item..." style={inp(TH)} />
        <select value={whFilter} onChange={e => setWhFilter(e.target.value)} style={inp(TH)}>
          <option value="all">All warehouses</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <button onClick={() => setLowOnly(v => !v)} style={{
          background: lowOnly ? "rgba(139,122,68,0.2)" : "transparent",
          border:`1px solid ${lowOnly ? "#8B7A44" : TH.border}`, borderRadius:8,
          color: lowOnly ? "#C9A960" : TH.textMuted, padding:"9px 16px",
          cursor:"pointer", fontSize:13, fontWeight: lowOnly ? 700 : 500, fontFamily:"inherit", whiteSpace:"nowrap",
        }}>⚠ Low only</button>
      </div>

      {error && <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{error}</div>}

      {/* Adjust modal */}
      {adjusting && (
        <div style={{background:TH.bgCard, border:`2px solid ${TH.accentBorder}`, borderRadius:14, padding:18, marginBottom:16}}>
          <div style={{fontSize:15, fontWeight:800, color:TH.text, marginBottom:4}}>{adjusting.itemName}</div>
          <div style={{fontSize:12, color:TH.textMuted, marginBottom:12}}>{adjusting.whName} · current: {adjusting.current}</div>
          <div style={{display:"flex", gap:8, marginBottom:10}}>
            <button onClick={() => setAdjDir('in')} style={{
              flex:1, background: adjDir==='in' ? "rgba(201,169,96,0.15)" : "transparent",
              border:`2px solid ${adjDir==='in' ? "#C9A960" : TH.border}`, borderRadius:9,
              color: adjDir==='in' ? "#C9A960" : TH.textMuted, padding:"10px", cursor:"pointer",
              fontSize:13, fontWeight:700, fontFamily:"inherit",
            }}>＋ Stock IN</button>
            <button onClick={() => setAdjDir('out')} style={{
              flex:1, background: adjDir==='out' ? "rgba(139,122,68,0.15)" : "transparent",
              border:`2px solid ${adjDir==='out' ? "#8B7A44" : TH.border}`, borderRadius:9,
              color: adjDir==='out' ? "#C9A960" : TH.textMuted, padding:"10px", cursor:"pointer",
              fontSize:13, fontWeight:700, fontFamily:"inherit",
            }}>－ Issue OUT</button>
          </div>
          <div style={{display:"flex", gap:8, marginBottom:10}}>
            <input type="number" inputMode="decimal" value={adjQty} onChange={e => setAdjQty(e.target.value)} placeholder="Qty" autoFocus style={{...inp(TH), fontSize:18, fontWeight:700, textAlign:"center", maxWidth:120}} />
            <input value={adjNote} onChange={e => setAdjNote(e.target.value)} placeholder="Note (e.g. pool 7 cleaning)" style={inp(TH)} />
          </div>
          <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
            <button onClick={() => setAdjusting(null)} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>Cancel</button>
            <button onClick={applyAdjust} disabled={busy || !adjQty} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:9, color:"#000", padding:"10px 24px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit", opacity:(busy||!adjQty)?0.5:1}}>{busy ? "Saving..." : "Apply"}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading...</div>
      ) : rows.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center", fontSize:13}}>
          No stock rows. Use ＋/－ on an item after selecting a specific warehouse, or add items in the legacy Items tab.
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {rows.map(({ item, warehouse, qty, low }) => (
            <div key={`${item.id}-${warehouse.id}`} style={{
              background:TH.bgCard, border:`1px solid ${low ? "rgba(139,122,68,0.5)" : TH.border}`,
              borderRadius:10, padding:"12px 14px",
              display:"flex", alignItems:"center", gap:12,
            }}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13, fontWeight:700, color:TH.text}}>{item.name}</div>
                <div style={{fontSize:10, color:TH.textDim}}>{item.code} · {warehouse.code}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:18, fontWeight:800, color: low ? "#C9A960" : TH.text, lineHeight:1}}>
                  {qty} <span style={{fontSize:10, color:TH.textDim, fontWeight:500}}>{item.unit || ''}</span>
                </div>
                {low && <div style={{fontSize:9, color:"#C9A960", fontWeight:700}}>LOW (min {item.min_stock})</div>}
              </div>
              <button onClick={() => setAdjusting({ itemId: item.id, warehouseId: warehouse.id, current: qty, itemName: item.name, whName: warehouse.name })} style={{
                background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8,
                color:TH.accent, padding:"8px 14px", cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit", flexShrink:0,
              }}>＋/－</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function inp(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
