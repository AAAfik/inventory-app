// ═══════════════════════════════════════════════════════════════════════
// ChemicalStockTab.jsx — pool chemicals catalog + current warehouse stock
// Shows: per chemical, current stock across each warehouse, low-stock alerts,
// dosage per m³, cost, monthly consumption
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { CHEMICAL_PURPOSES, fmtQty, fmtMoney } from "../lib/poolUtils";

export default function ChemicalStockTab({ TH, isMobile, isAdmin }) {
  const [chemicals, setChemicals] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stock, setStock] = useState([]);
  const [items, setItems] = useState([]);
  const [monthUsage, setMonthUsage] = useState({}); // chemId → total qty used this month
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      const monthStart = new Date();
      monthStart.setDate(1); monthStart.setHours(0,0,0,0);

      const [rC, rW, rS, rI, rL] = await Promise.all([
        supabase.from('pool_chemicals').select('*').eq('is_active', true).order('purpose, name'),
        supabase.from('warehouses').select('id, code, name').eq('is_active', true).order('id'),
        supabase.from('consumable_stock').select('*'),
        supabase.from('items').select('id, code, name, unit'),
        supabase.from('pool_treatment_lines').select('chemical_id, qty').gte('id', 0), // all recent
      ]);
      if (rC.error) throw rC.error;
      setChemicals(rC.data || []);
      setWarehouses(rW.data || []);
      setStock(rS.data || []);
      setItems(rI.data || []);

      // Aggregate this month's usage
      const { data: monthLines } = await supabase
        .from('pool_treatment_lines')
        .select('chemical_id, qty, pool_treatments!inner(performed_at)')
        .gte('pool_treatments.performed_at', monthStart.toISOString());
      const usage = {};
      (monthLines || []).forEach(l => {
        usage[l.chemical_id] = (usage[l.chemical_id] || 0) + Number(l.qty || 0);
      });
      setMonthUsage(usage);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit() {
    setBusy(true); setError(null);
    try {
      const { error } = await supabase.from('pool_chemicals').update({
        name: editing.name,
        dosage_per_m3: Number(editing.dosage_per_m3) || null,
        unit_cost: Number(editing.unit_cost) || null,
        min_stock_alert: Number(editing.min_stock_alert) || null,
        item_id: editing.item_id ? Number(editing.item_id) : null,
      }).eq('id', editing.id);
      if (error) throw error;
      setEditing(null);
      await loadAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const stockMap = {};
  stock.forEach(s => { stockMap[`${s.item_id}-${s.warehouse_id}`] = Number(s.qty) || 0; });

  return (
    <div>
      {error && <ErrBox TH={TH}>{error}</ErrBox>}

      {editing && (
        <div style={{background:TH.bgCard, border:`2px solid ${TH.accentBorder}`, borderRadius:14, padding:18, marginBottom:16}}>
          <div style={{fontSize:15, fontWeight:800, color:TH.text, marginBottom:12}}>✏️ Edit chemical: {editing.name}</div>
          <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10}}>
            <Field TH={TH} label="Name"><input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} style={inp(TH)} /></Field>
            <Field TH={TH} label="Dose per m³"><input type="number" step="0.1" value={editing.dosage_per_m3 || ''} onChange={e => setEditing({...editing, dosage_per_m3: e.target.value})} style={inp(TH)} /></Field>
            <Field TH={TH} label={`Cost per ${editing.unit}`}><input type="number" step="0.001" value={editing.unit_cost || ''} onChange={e => setEditing({...editing, unit_cost: e.target.value})} style={inp(TH)} /></Field>
            <Field TH={TH} label="Min stock alert"><input type="number" value={editing.min_stock_alert || ''} onChange={e => setEditing({...editing, min_stock_alert: e.target.value})} style={inp(TH)} /></Field>
            <Field TH={TH} label="Linked warehouse item">
              <select value={editing.item_id || ''} onChange={e => setEditing({...editing, item_id: e.target.value})} style={inp(TH)}>
                <option value="">— not linked (no auto-deduct) —</option>
                {items.map(it => <option key={it.id} value={it.id}>{it.code} · {it.name}</option>)}
              </select>
            </Field>
          </div>
          <div style={{display:"flex", gap:8, justifyContent:"flex-end", marginTop:14}}>
            <button onClick={() => setEditing(null)} style={ghostBtn(TH)}>Cancel</button>
            <button onClick={saveEdit} disabled={busy} style={goldBtn}>{busy ? "Saving..." : "Save"}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading...</div>
      ) : chemicals.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px dashed ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          No chemicals configured. Run the pool control SQL migration to seed defaults.
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:12}}>
          {chemicals.map(chem => {
            const purp = CHEMICAL_PURPOSES[chem.purpose] || {};
            const usedThisMonth = monthUsage[chem.id] || 0;
            // Total stock across all warehouses
            const totalStock = chem.item_id ? warehouses.reduce((s, w) => s + (stockMap[`${chem.item_id}-${w.id}`] || 0), 0) : null;
            const isLow = totalStock != null && chem.min_stock_alert && totalStock < Number(chem.min_stock_alert);

            return (
              <div key={chem.id} style={{
                background:TH.bgCard, border:`1px solid ${isLow ? "rgba(139,122,68,0.5)" : TH.border}`,
                borderLeft:`3px solid ${purp.color || TH.border}`,
                borderRadius:12, padding:14,
              }}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap", marginBottom:12}}>
                  <div style={{flex:1, minWidth:200}}>
                    <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:4}}>
                      <span style={{fontSize:20}}>{purp.icon}</span>
                      <span style={{fontSize:15, fontWeight:700, color:TH.text}}>{chem.name}</span>
                      {isLow && <span style={{fontSize:9, color:"#C9A960", fontWeight:800, background:"rgba(201,169,96,0.15)", padding:"2px 6px", borderRadius:4}}>LOW STOCK</span>}
                    </div>
                    <div style={{fontSize:11, color:TH.textDim, fontFamily:"monospace"}}>{chem.code} · {purp.label}</div>
                  </div>
                  {isAdmin && <button onClick={() => setEditing({...chem})} style={ghostBtn(TH)}>✏️ Edit</button>}
                </div>

                {/* Chemical facts */}
                <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:10, marginBottom:12, padding:10, background:TH.bgInput, borderRadius:8}}>
                  <Info TH={TH} label="Dose per m³">{chem.dosage_per_m3 ? `${chem.dosage_per_m3} ${chem.unit}` : '—'}</Info>
                  <Info TH={TH} label={`Cost per ${chem.unit}`}>{chem.unit_cost ? fmtMoney(chem.unit_cost, chem.currency) : '—'}</Info>
                  <Info TH={TH} label="Used this month">{fmtQty(usedThisMonth, chem.unit)}</Info>
                  <Info TH={TH} label="Cost this month">{chem.unit_cost ? fmtMoney(chem.unit_cost * usedThisMonth) : '—'}</Info>
                  {totalStock != null && (
                    <Info TH={TH} label="Total stock">
                      <strong style={{color: isLow ? "#C9A960" : TH.text}}>{fmtQty(totalStock, chem.unit)}</strong>
                    </Info>
                  )}
                </div>

                {/* Per-warehouse stock */}
                {chem.item_id ? (
                  <div style={{overflow:"auto"}}>
                    <table style={{width:"100%", borderCollapse:"collapse", fontSize:12}}>
                      <thead>
                        <tr style={{borderBottom:`1px solid ${TH.border}`, textAlign:"left"}}>
                          <th style={th(TH)}>Warehouse</th>
                          <th style={{...th(TH), textAlign:"right"}}>Stock</th>
                          <th style={{...th(TH), textAlign:"right"}}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warehouses.map(w => {
                          const qty = stockMap[`${chem.item_id}-${w.id}`] ?? 0;
                          const whLow = chem.min_stock_alert && qty < Number(chem.min_stock_alert);
                          return (
                            <tr key={w.id} style={{borderBottom:`1px solid ${TH.border}`}}>
                              <td style={td(TH)}>{w.code} · {w.name}</td>
                              <td style={{...td(TH), textAlign:"right", fontWeight:700, fontFamily:"monospace", color: whLow ? "#C9A960" : TH.text}}>
                                {fmtQty(qty, chem.unit)}
                              </td>
                              <td style={{...td(TH), textAlign:"right", fontSize:11}}>
                                {qty === 0 ? <span style={{color:"#8f8f8f", fontWeight:700}}>OUT</span>
                                  : whLow ? <span style={{color:"#C9A960", fontWeight:700}}>LOW</span>
                                  : <span style={{color:"#6B9E3A"}}>OK</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{padding:10, fontSize:11, color:TH.textDim, textAlign:"center", fontStyle:"italic"}}>
                    ⚠ Not linked to any warehouse item — chemicals won't auto-deduct.
                    {isAdmin && <span> Click "Edit" and link to an item.</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ TH, label, children }) {
  return (
    <div>
      <label style={{display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px"}}>{label}</label>
      {children}
    </div>
  );
}
function Info({ TH, label, children }) {
  return (
    <div>
      <div style={{fontSize:9, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:2}}>{label}</div>
      <div style={{fontSize:12, color:TH.text}}>{children}</div>
    </div>
  );
}
function inp(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:9, padding:"10px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
function ghostBtn(TH) {
  return { background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.text, padding:"7px 14px", cursor:"pointer", fontSize:13, fontFamily:"inherit", fontWeight:600 };
}
const goldBtn = {
  background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:9,
  color:"#000", padding:"10px 22px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit",
};
function ErrBox({ TH, children }) {
  return <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{children}</div>;
}
function th(TH) { return { padding:"6px 8px", fontSize:9, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:700 }; }
function td(TH) { return { padding:"8px", color:TH.text, verticalAlign:"middle" }; }
