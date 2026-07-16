// ═══════════════════════════════════════════════════════════════════
// WarehousesTab.jsx — list, create, EDIT, delete warehouses
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";

const EMPTY_FORM = { property_id: "", code: "", name: "", location: "", keeper_user_id: "", notes: "" };

export default function WarehousesTab({ TH, isMobile, isAdmin }) {
  const [warehouses, setWarehouses] = useState([]);
  const [properties, setProperties] = useState([]);
  const [stats, setStats]           = useState({});
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit modal state
  const [editing, setEditing]       = useState(null); // warehouse object being edited or null
  const [editForm, setEditForm]     = useState(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      const [rW, rP] = await Promise.all([
        supabase.from('warehouses').select('*').eq('is_active', true).order('property_id, code'),
        supabase.from('wh_properties').select('id, code, name').eq('is_active', true).order('id'),
      ]);
      if (rW.error) throw rW.error;
      setWarehouses(rW.data || []);
      setProperties(rP.data || []);

      if (rW.data?.length) {
        const [rA, rC] = await Promise.all([
          supabase.from('assets').select('warehouse_id').eq('is_active', true).in('warehouse_id', rW.data.map(w => w.id)),
          supabase.from('consumable_stock').select('warehouse_id, qty').in('warehouse_id', rW.data.map(w => w.id)),
        ]);
        const s = {};
        (rA.data || []).forEach(a => {
          if (!s[a.warehouse_id]) s[a.warehouse_id] = { assets: 0, consumableTypes: 0 };
          s[a.warehouse_id].assets++;
        });
        (rC.data || []).forEach(c => {
          if (!s[c.warehouse_id]) s[c.warehouse_id] = { assets: 0, consumableTypes: 0 };
          if (Number(c.qty) > 0) s[c.warehouse_id].consumableTypes++;
        });
        setStats(s);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function submitWarehouse() {
    setSubmitting(true); setError(null);
    try {
      if (!form.property_id || !form.code.trim() || !form.name.trim()) {
        throw new Error("Property, code, and name are required.");
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('warehouses').insert([{
        property_id:  Number(form.property_id),
        code:         form.code.trim().toUpperCase(),
        name:         form.name.trim(),
        location:     form.location.trim() || null,
        keeper_user_id: form.keeper_user_id || null,
        notes:        form.notes.trim() || null,
        created_by:   user?.id,
      }]);
      if (error) throw error;
      setShowForm(false);
      setForm(EMPTY_FORM);
      await loadAll();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(w) {
    setEditForm({
      property_id: String(w.property_id || ""),
      code:        w.code || "",
      name:        w.name || "",
      location:    w.location || "",
      keeper_user_id: w.keeper_user_id || "",
      notes:       w.notes || "",
    });
    setEditing(w);
  }

  async function saveEdit() {
    if (!editing) return;
    setSavingEdit(true); setError(null);
    try {
      if (!editForm.property_id || !editForm.code.trim() || !editForm.name.trim()) {
        throw new Error("Property, code, and name are required.");
      }
      const { error } = await supabase.from('warehouses').update({
        property_id:  Number(editForm.property_id),
        code:         editForm.code.trim().toUpperCase(),
        name:         editForm.name.trim(),
        location:     editForm.location.trim() || null,
        keeper_user_id: editForm.keeper_user_id || null,
        notes:        editForm.notes.trim() || null,
      }).eq('id', editing.id);
      if (error) throw error;
      setEditing(null);
      await loadAll();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteWarehouse() {
    if (!editing) return;
    const st = stats[editing.id] || { assets: 0, consumableTypes: 0 };
    if (st.assets > 0 || st.consumableTypes > 0) {
      alert(`Cannot delete: this warehouse has ${st.assets} asset(s) and ${st.consumableTypes} consumable stock line(s). Move them first.`);
      return;
    }
    if (!confirm(`Delete warehouse "${editing.name}"? This is a soft delete — records are preserved but the warehouse becomes inactive.`)) return;
    setDeleting(true); setError(null);
    try {
      const { error } = await supabase.from('warehouses').update({ is_active: false }).eq('id', editing.id);
      if (error) throw error;
      setEditing(null);
      await loadAll();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setDeleting(false);
    }
  }

  const propMap = Object.fromEntries(properties.map(p => [p.id, p]));

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:12, flexWrap:"wrap"}}>
        <div style={{color:TH.textMuted, fontSize:13}}>
          {loading ? "Loading..." : `${warehouses.length} warehouse${warehouses.length===1?"":"s"}`}
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(s => !s)} style={goldBtn()}>
            {showForm ? "Cancel" : "+ New warehouse"}
          </button>
        )}
      </div>

      {error && <ErrorBox TH={TH}>{error}</ErrorBox>}

      {showForm && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:20, marginBottom:20}}>
          <div style={{fontSize:15, fontWeight:700, color:TH.text, marginBottom:14}}>New warehouse</div>
          <FormFields TH={TH} isMobile={isMobile} form={form} setForm={setForm} properties={properties} />
          <div style={{display:"flex", justifyContent:"flex-end", marginTop:16, paddingTop:14, borderTop:`1px solid ${TH.border}`}}>
            <button onClick={submitWarehouse} disabled={submitting} style={{...goldBtn(), opacity: submitting?0.6:1}}>
              {submitting ? "Creating..." : "Create warehouse"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading...</div>
      ) : warehouses.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          No warehouses yet.
        </div>
      ) : (
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(300px, 1fr))", gap:14}}>
          {warehouses.map(w => {
            const prop = propMap[w.property_id];
            const st = stats[w.id] || { assets: 0, consumableTypes: 0 };
            return (
              <div key={w.id} style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16, transition:"all 0.15s", position:"relative"}}>
                {isAdmin && (
                  <button
                    onClick={() => openEdit(w)}
                    title="Edit warehouse"
                    style={{
                      position:"absolute", top:12, right:12,
                      background:"transparent", border:`1px solid ${TH.border}`,
                      borderRadius:6, color:TH.textMuted,
                      width:28, height:28, cursor:"pointer", fontSize:12,
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}
                  >✎</button>
                )}
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, paddingRight: isAdmin ? 36 : 0}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11, fontWeight:700, color:TH.accent, letterSpacing:"0.5px"}}>{w.code}</div>
                    <div style={{fontSize:16, fontWeight:700, color:TH.text, marginTop:2}}>{w.name}</div>
                    {prop && <div style={{fontSize:12, color:TH.textMuted, marginTop:2}}>{prop.name}</div>}
                  </div>
                </div>
                {w.location && <div style={{fontSize:12, color:TH.textMuted, marginBottom:12, padding:"6px 10px", background:TH.bgInput, borderRadius:6}}>📍 {w.location}</div>}
                <div style={{display:"flex", gap:12, paddingTop:12, borderTop:`1px solid ${TH.border}`}}>
                  <div style={{flex:1, textAlign:"center"}}>
                    <div style={{fontSize:20, fontWeight:800, color:TH.text}}>{st.assets}</div>
                    <div style={{fontSize:10, color:TH.textMuted, textTransform:"uppercase", fontWeight:600}}>Assets</div>
                  </div>
                  <div style={{flex:1, textAlign:"center"}}>
                    <div style={{fontSize:20, fontWeight:800, color:TH.text}}>{st.consumableTypes}</div>
                    <div style={{fontSize:10, color:TH.textMuted, textTransform:"uppercase", fontWeight:600}}>Consumables</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Edit modal ─── */}
      {editing && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20}}
             onClick={() => !savingEdit && !deleting && setEditing(null)}>
          <div onClick={e => e.stopPropagation()} style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:24, width:"100%", maxWidth:560, maxHeight:"90vh", overflow:"auto"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
              <div>
                <div style={{fontSize:11, color:TH.accent, fontWeight:700, letterSpacing:"0.5px"}}>EDIT WAREHOUSE</div>
                <div style={{fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, fontWeight:700, color:TH.text, marginTop:2}}>{editing.name}</div>
              </div>
              <button onClick={() => setEditing(null)} disabled={savingEdit || deleting} style={{background:"transparent", border:"none", color:TH.textMuted, fontSize:24, cursor:"pointer", padding:4, lineHeight:1}}>×</button>
            </div>

            <FormFields TH={TH} isMobile={isMobile} form={editForm} setForm={setEditForm} properties={properties} />

            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:20, paddingTop:16, borderTop:`1px solid ${TH.border}`, gap:8, flexWrap:"wrap"}}>
              <button onClick={deleteWarehouse} disabled={savingEdit || deleting} style={{
                background:"transparent", border:"1px solid rgba(201,80,80,.4)",
                borderRadius:8, color:"#d67373", padding:"9px 14px",
                cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit",
                opacity:(savingEdit || deleting)?0.6:1,
              }}>
                {deleting ? "Deleting..." : "🗑 Delete"}
              </button>
              <div style={{display:"flex", gap:8}}>
                <button onClick={() => setEditing(null)} disabled={savingEdit || deleting} style={{
                  background:"transparent", border:`1px solid ${TH.border}`,
                  borderRadius:8, color:TH.text, padding:"9px 14px",
                  cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit",
                }}>Cancel</button>
                <button onClick={saveEdit} disabled={savingEdit || deleting} style={{...goldBtn(), padding:"9px 18px", opacity:savingEdit?0.6:1}}>
                  {savingEdit ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
function FormFields({ TH, isMobile, form, setForm, properties }) {
  return (
    <>
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12}}>
        <Field TH={TH} label="Property *">
          <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} style={inputStyle(TH)}>
            <option value="">Select property...</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field TH={TH} label="Code * (e.g. CR-POOL)">
          <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Unique short code" style={inputStyle(TH)} />
        </Field>
        <Field TH={TH} label="Name *">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Warehouse name" style={inputStyle(TH)} />
        </Field>
        <Field TH={TH} label="Location">
          <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Building, floor, etc." style={inputStyle(TH)} />
        </Field>
      </div>
      <Field TH={TH} label="Notes" style={{marginTop:12}}>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{...inputStyle(TH), minHeight:60, resize:"vertical"}} />
      </Field>
    </>
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
function goldBtn() {
  return { background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:10, color:"#000", padding:"10px 16px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" };
}
function ErrorBox({ TH, children }) {
  return <div style={{background:"rgba(201,80,80,.10)", border:"1px solid rgba(201,80,80,.35)", borderRadius:9, padding:"10px 14px", color:"#d67373", fontSize:13, marginBottom:16}}>{children}</div>;
}
