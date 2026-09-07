// ═══════════════════════════════════════════════════════════════════
// ItemFormModal.jsx — create or edit an item (consumable product)
// Admin-only: warehouse_keeper / owner / auditor
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";

const UNITS = ["pcs", "kg", "g", "L", "ml", "m", "box", "pack", "bottle", "bag", "roll"];
const CATEGORIES = [
  "Chemicals",
  "Cleaning supplies",
  "Consumables",
  "Spare parts",
  "Tools",
  "Safety equipment",
  "Office supplies",
  "F&B supplies",
  "Landscaping",
  "Other",
];

export default function ItemFormModal({ TH, lang = "en", item = null, onClose, onSaved }) {
  const isEdit = !!item;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [suppliers, setSuppliers] = useState([]);

  const [form, setForm] = useState({
    code:                item?.code || "",
    name:                item?.name || "",
    description:         item?.description || "",
    category:            item?.category || "Chemicals",
    unit:                item?.unit || "pcs",
    min_qty:           item?.min_qty ?? "",
    last_unit_cost:      item?.last_unit_cost ?? "",
    currency:            item?.currency || "EUR",
    default_supplier_id: item?.default_supplier_id || "",
    is_active:           item?.is_active ?? true,
  });

  useEffect(() => {
    supabase.from('suppliers').select('id, name').eq('is_active', true).order('name').then(({ data }) => {
      setSuppliers(data || []);
    });
  }, []);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function submit() {
    setError(null);
    if (!form.name.trim()) return setError("Name is required");
    if (!form.unit) return setError("Unit is required");

    setBusy(true);
    try {
      const payload = {
        code:                form.code.trim() || null,
        name:                form.name.trim(),
        description:         form.description.trim() || null,
        category:            form.category || null,
        unit:                form.unit,
        min_qty:           form.min_qty === "" ? null : Number(form.min_qty),
        last_unit_cost:      form.last_unit_cost === "" ? null : Number(form.last_unit_cost),
        currency:            form.currency || 'EUR',
        default_supplier_id: form.default_supplier_id ? Number(form.default_supplier_id) : null,
        is_active:           form.is_active,
      };

      if (isEdit) {
        const { error: e } = await supabase.from('items').update(payload).eq('id', item.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('items').insert([payload]);
        if (e) throw e;
      }
      onSaved?.();
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!confirm(`Delete item "${item.name}"? This is a soft delete — records are preserved but the item becomes inactive.`)) return;
    setBusy(true); setError(null);
    try {
      const { error: e } = await supabase.from('items').update({ is_active: false }).eq('id', item.id);
      if (e) throw e;
      onSaved?.();
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  }

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:20, width:"100%", maxWidth:560, maxHeight:"92vh", overflowY:"auto"}}>

        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
          <div style={{fontSize:16, fontWeight:800, color:TH.text, fontFamily:"'Playfair Display', Georgia, serif"}}>
            {isEdit ? "Edit item" : "New item"}
          </div>
          <button onClick={onClose} disabled={busy} style={{background:"transparent", border:"none", color:TH.textMuted, fontSize:22, cursor:"pointer", padding:4, lineHeight:1}}>×</button>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"1fr 2fr", gap:10, marginBottom:10}}>
          <div>
            <label style={lbl(TH)}>Code</label>
            <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="e.g. CHL-90" style={inp(TH)} />
          </div>
          <div>
            <label style={lbl(TH)}>Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Chlorine tablets 90%" style={inp(TH)} />
          </div>
        </div>

        <div style={{marginBottom:10}}>
          <label style={lbl(TH)}>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Optional" style={{...inp(TH), resize:"vertical"}} />
        </div>

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10}}>
          <div>
            <label style={lbl(TH)}>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={inp(TH)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl(TH)}>Unit *</label>
            <select value={form.unit} onChange={e => set('unit', e.target.value)} style={inp(TH)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl(TH)}>Min stock</label>
            <input type="number" step="0.01" min="0" value={form.min_qty} onChange={e => set('min_qty', e.target.value)} placeholder="Alert if below" style={inp(TH)} />
          </div>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10}}>
          <div>
            <label style={lbl(TH)}>Last unit cost <span style={{color:TH.textDim, fontSize:9, textTransform:"none"}}>{form.currency}</span></label>
            <input type="number" step="0.0001" min="0" value={form.last_unit_cost} onChange={e => set('last_unit_cost', e.target.value)} placeholder="e.g. 3.80" style={inp(TH)} />
          </div>
          <div>
            <label style={lbl(TH)}>Currency</label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)} style={inp(TH)}>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="TRY">TRY (₺)</option>
              <option value="ILS">ILS (₪)</option>
            </select>
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={lbl(TH)}>Default supplier</label>
          <select value={form.default_supplier_id} onChange={e => set('default_supplier_id', e.target.value)} style={inp(TH)}>
            <option value="">— none —</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {isEdit && (
          <label style={{display:"flex", alignItems:"center", gap:8, marginBottom:14, cursor:"pointer"}}>
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
            <span style={{fontSize:12, color:TH.textMuted}}>Active (uncheck to disable — will hide from lists)</span>
          </label>
        )}

        {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:8, padding:"10px 12px", color:"#C43D3D", fontSize:12, marginBottom:10}}>{error}</div>}

        <div style={{display:"flex", gap:8, justifyContent:"space-between", alignItems:"center"}}>
          <div>
            {isEdit && (
              <button onClick={doDelete} disabled={busy} style={{background:"transparent", border:"1px solid rgba(196,61,61,0.4)", borderRadius:9, color:"#C43D3D", padding:"10px 16px", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit"}}>
                 Delete
              </button>
            )}
          </div>
          <div style={{display:"flex", gap:8}}>
            <button onClick={onClose} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>Cancel</button>
            <button onClick={submit} disabled={busy} style={{background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:9, color:"#000", padding:"10px 24px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit", opacity:busy?0.6:1}}>
              {busy ? "Saving…" : (isEdit ? "Save changes" : "Create item")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function lbl(TH) { return { display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }; }
function inp(TH) { return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }; }
