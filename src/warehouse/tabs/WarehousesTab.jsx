// ═══════════════════════════════════════════════════════════════════
// WarehousesTab.jsx — list, create, and manage warehouses
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";

export default function WarehousesTab({ TH, isMobile, isAdmin }) {
  const [warehouses, setWarehouses] = useState([]);
  const [properties, setProperties] = useState([]);
  const [users, setUsers]           = useState([]);
  const [stats, setStats]           = useState({}); // warehouse_id -> {assets, consumables}
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ property_id: "", code: "", name: "", location: "", keeper_user_id: "", notes: "" });

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

      // Get asset & consumable counts per warehouse
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
      setForm({ property_id: "", code: "", name: "", location: "", keeper_user_id: "", notes: "" });
      await loadAll();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
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
          <button onClick={() => setShowForm(s => !s)} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:10, color:"#000", padding:"10px 16px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit"}}>
            {showForm ? "Cancel" : "+ New warehouse"}
          </button>
        )}
      </div>

      {error && <ErrorBox TH={TH}>{error}</ErrorBox>}

      {showForm && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:20, marginBottom:20}}>
          <div style={{fontSize:15, fontWeight:700, color:TH.text, marginBottom:14}}>New warehouse</div>
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
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{...inputStyle(TH), minHeight:50, resize:"vertical"}} />
          </Field>
          <div style={{display:"flex", justifyContent:"flex-end", marginTop:16, paddingTop:14, borderTop:`1px solid ${TH.border}`}}>
            <button onClick={submitWarehouse} disabled={submitting} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:10, color:"#000", padding:"10px 20px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", opacity:submitting?0.6:1}}>
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
              <div key={w.id} style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16, transition:"all 0.15s"}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10}}>
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
function ErrorBox({ TH, children }) {
  return <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:9, padding:"10px 14px", color:"#8f8f8f", fontSize:13, marginBottom:16}}>{children}</div>;
}
