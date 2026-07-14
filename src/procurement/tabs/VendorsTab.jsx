// ═══════════════════════════════════════════════════════════════════
// VendorsTab.jsx — vendor master: list, create, approve, risk score
// ═══════════════════════════════════════════════════════════════════
// Only procurement officers, finance officers, and admins can access.
// The RLS on procure.vendors enforces this at DB level.

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";

const VENDOR_STATUS = {
  pending_approval: { label: "Pending approval", color: "#f59e0b" },
  active:           { label: "Active",           color: "#10b981" },
  suspended:        { label: "Suspended",        color: "#8892b0" },
  blacklisted:      { label: "Blacklisted",      color: "#ef4444" },
};

function riskColor(score) {
  const s = Number(score) || 0;
  if (s >= 70) return "#ef4444";  // high risk (red)
  if (s >= 40) return "#f59e0b";  // medium (amber)
  return "#10b981";               // low (green)
}

export default function VendorsTab({ TH, isMobile }) {
  const [vendors, setVendors]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(null); // vendor_id being expanded
  const [statusFilter, setStatusFilter] = useState("all");

  // form state
  const [form, setForm] = useState({
    legal_name: "", display_name: "", tax_id: "", country: "TRNC",
    email: "", phone: "", iban: "", address: "", notes: "",
    category_ids: [], property_ids: [],
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      const [rV, rC, rP] = await Promise.all([
        supabase.schema('procure').from('vendors')
          .select(`
            id, legal_name, display_name, tax_id, country, email, phone,
            status, risk_score, notes, created_at, approved_at,
            vendor_categories ( category_id ),
            vendor_property_assignments ( property_id )
          `)
          .order('created_at', { ascending: false }),
        supabase.schema('procure').from('categories').select('id, code, name').eq('is_active', true).order('id'),
        supabase.schema('procure').from('properties').select('id, code, name').eq('is_active', true).order('id'),
      ]);
      if (rV.error) throw rV.error;
      setVendors(rV.data || []);
      setCategories(rC.data || []);
      setProperties(rP.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function submitVendor() {
    setSubmitting(true); setError(null);
    try {
      if (!form.legal_name.trim()) throw new Error("Legal name is required.");
      const { data: { user } } = await supabase.auth.getUser();

      // Insert vendor
      const { data: vendor, error: e1 } = await supabase.schema('procure').from('vendors').insert([{
        legal_name:   form.legal_name.trim(),
        display_name: form.display_name.trim() || null,
        tax_id:       form.tax_id.trim() || null,
        country:      form.country.trim() || null,
        email:        form.email.trim() || null,
        phone:        form.phone.trim() || null,
        iban:         form.iban.trim() || null,
        address:      form.address.trim() || null,
        notes:        form.notes.trim() || null,
        created_by:   user?.id,
      }]).select().single();
      if (e1) throw e1;

      // Link categories
      if (form.category_ids.length) {
        await supabase.schema('procure').from('vendor_categories').insert(
          form.category_ids.map(cid => ({ vendor_id: vendor.id, category_id: cid, approved_by: user?.id }))
        );
      }
      // Link properties
      if (form.property_ids.length) {
        await supabase.schema('procure').from('vendor_property_assignments').insert(
          form.property_ids.map(pid => ({ vendor_id: vendor.id, property_id: pid }))
        );
      }
      // Audit
      await supabase.schema('procure').from('audit_log').insert([{
        user_id: user?.id, user_email: user?.email,
        action: 'create_vendor', entity_type: 'vendor', entity_id: vendor.id,
        after_data: { legal_name: vendor.legal_name },
      }]);

      setShowForm(false);
      setForm({ legal_name: "", display_name: "", tax_id: "", country: "TRNC", email: "", phone: "", iban: "", address: "", notes: "", category_ids: [], property_ids: [] });
      await loadAll();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(vendor, newStatus) {
    if (!confirm(`Change ${vendor.legal_name} status to "${VENDOR_STATUS[newStatus]?.label}"?`)) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updates = { status: newStatus };
      if (newStatus === 'active') { updates.approved_at = new Date().toISOString(); updates.approved_by = user?.id; }
      const { error } = await supabase.schema('procure').from('vendors').update(updates).eq('id', vendor.id);
      if (error) throw error;
      await supabase.schema('procure').from('audit_log').insert([{
        user_id: user?.id, user_email: user?.email,
        action: `vendor_${newStatus}`, entity_type: 'vendor', entity_id: vendor.id,
        before_data: { status: vendor.status }, after_data: { status: newStatus },
      }]);
      await loadAll();
    } catch (e) { setError(e.message || String(e)); }
  }

  async function updateRiskScore(vendor, score) {
    try {
      const s = Math.max(0, Math.min(100, Number(score) || 0));
      const { error } = await supabase.schema('procure').from('vendors').update({ risk_score: s }).eq('id', vendor.id);
      if (error) throw error;
      await loadAll();
    } catch (e) { setError(e.message || String(e)); }
  }

  const filt = vendors.filter(v => statusFilter === "all" || v.status === statusFilter);
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const propMap = Object.fromEntries(properties.map(p => [p.id, p]));

  function toggleFormArrayField(field, id) {
    setForm(f => ({ ...f, [field]: f[field].includes(id) ? f[field].filter(x => x !== id) : [...f[field], id] }));
  }

  return (
    <div>
      {/* Top bar */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:12, flexWrap:"wrap"}}>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"8px 12px", color:TH.text, fontSize:13, fontFamily:"inherit", outline:"none"}}>
            <option value="all">All statuses</option>
            <option value="pending_approval">Pending approval</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
          <div style={{color:TH.textMuted, fontSize:13}}>
            {loading ? "Loading..." : `${filt.length} of ${vendors.length} vendors`}
          </div>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:10, color:"#000", padding:"10px 16px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit"}}>
          {showForm ? "Cancel" : "+ New vendor"}
        </button>
      </div>

      {error && (
        <div style={{background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.3)", borderRadius:9, padding:"10px 14px", color:"#ef4444", fontSize:13, marginBottom:16}}>
          {error}
        </div>
      )}

      {/* New vendor form */}
      {showForm && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:20, marginBottom:20}}>
          <div style={{fontSize:15, fontWeight:700, color:TH.text, marginBottom:14}}>Onboard new vendor</div>
          <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12}}>
            <Field TH={TH} label="Legal name *"><input value={form.legal_name} onChange={e => setForm(f => ({ ...f, legal_name: e.target.value }))} placeholder="Registered company name" style={inputStyle(TH)} /></Field>
            <Field TH={TH} label="Display / trade name"><input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="How they present themselves" style={inputStyle(TH)} /></Field>
            <Field TH={TH} label="Tax ID / VAT number"><input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} style={inputStyle(TH)} /></Field>
            <Field TH={TH} label="Country"><input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} style={inputStyle(TH)} /></Field>
            <Field TH={TH} label="Email"><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" style={inputStyle(TH)} /></Field>
            <Field TH={TH} label="Phone"><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle(TH)} /></Field>
            <Field TH={TH} label="IBAN (bank account)"><input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} placeholder="For fraud detection" style={inputStyle(TH)} /></Field>
            <Field TH={TH} label="Address"><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={inputStyle(TH)} /></Field>
          </div>
          <Field TH={TH} label="Notes" style={{marginTop:12}}>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{...inputStyle(TH), minHeight:50, resize:"vertical"}} />
          </Field>

          <div style={{marginTop:16}}>
            <div style={{fontSize:12, fontWeight:600, color:TH.textMuted, marginBottom:8}}>Categories</div>
            <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
              {categories.map(c => {
                const on = form.category_ids.includes(c.id);
                return (
                  <button key={c.id} onClick={() => toggleFormArrayField('category_ids', c.id)} style={{background:on?TH.accentBg:"transparent", border:`1px solid ${on?TH.accentBorder:TH.border}`, borderRadius:8, color:on?TH.accentText:TH.textMuted, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:on?600:500, fontFamily:"inherit"}}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{marginTop:14}}>
            <div style={{fontSize:12, fontWeight:600, color:TH.textMuted, marginBottom:8}}>Properties they can supply</div>
            <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
              {properties.map(p => {
                const on = form.property_ids.includes(p.id);
                return (
                  <button key={p.id} onClick={() => toggleFormArrayField('property_ids', p.id)} style={{background:on?TH.accentBg:"transparent", border:`1px solid ${on?TH.accentBorder:TH.border}`, borderRadius:8, color:on?TH.accentText:TH.textMuted, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:on?600:500, fontFamily:"inherit"}}>
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{display:"flex", justifyContent:"flex-end", marginTop:18, paddingTop:14, borderTop:`1px solid ${TH.border}`}}>
            <button onClick={submitVendor} disabled={submitting} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:10, color:"#000", padding:"10px 20px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", opacity:submitting?0.6:1}}>
              {submitting ? "Creating..." : "Create vendor (pending approval)"}
            </button>
          </div>
        </div>
      )}

      {/* Vendor list */}
      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading...</div>
      ) : filt.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          No vendors found. Use "+ New vendor" to onboard one.
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {filt.map(v => {
            const st = VENDOR_STATUS[v.status] || { label: v.status, color: "#8892b0" };
            const isOpen = expanded === v.id;
            const vCats = (v.vendor_categories || []).map(vc => catMap[vc.category_id]).filter(Boolean);
            const vProps = (v.vendor_property_assignments || []).map(vp => propMap[vp.property_id]).filter(Boolean);
            return (
              <div key={v.id} style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, overflow:"hidden"}}>
                {/* Header row */}
                <div onClick={() => setExpanded(isOpen ? null : v.id)} style={{padding:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap"}}>
                  <div style={{flex:1, minWidth:200}}>
                    <div style={{fontSize:15, fontWeight:700, color:TH.text}}>{v.legal_name}</div>
                    {v.display_name && <div style={{fontSize:12, color:TH.textMuted}}>{v.display_name}</div>}
                  </div>
                  <div style={{display:"flex", gap:12, alignItems:"center"}}>
                    <span style={{display:"inline-block", padding:"3px 10px", borderRadius:5, background:st.color+"22", color:st.color, fontSize:11, fontWeight:700}}>{st.label}</span>
                    <div style={{textAlign:"center", minWidth:70}}>
                      <div style={{fontSize:11, color:TH.textMuted}}>Risk</div>
                      <div style={{fontSize:16, fontWeight:800, color:riskColor(v.risk_score)}}>{v.risk_score || 0}</div>
                    </div>
                    <div style={{color:TH.textMuted, fontSize:18}}>{isOpen ? "▾" : "▸"}</div>
                  </div>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div style={{padding:16, borderTop:`1px solid ${TH.border}`, background:TH.bgInput}}>
                    <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:14, marginBottom:14}}>
                      <Info TH={TH} label="Tax ID">{v.tax_id || "—"}</Info>
                      <Info TH={TH} label="Country">{v.country || "—"}</Info>
                      <Info TH={TH} label="Email">{v.email || "—"}</Info>
                      <Info TH={TH} label="Phone">{v.phone || "—"}</Info>
                      <Info TH={TH} label="Created">{new Date(v.created_at).toLocaleDateString()}</Info>
                      <Info TH={TH} label="Approved">{v.approved_at ? new Date(v.approved_at).toLocaleDateString() : "Not yet"}</Info>
                    </div>
                    {v.notes && <div style={{fontSize:12, color:TH.textMuted, padding:10, background:TH.bgCard, borderRadius:8, marginBottom:12}}>{v.notes}</div>}

                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:11, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", marginBottom:6}}>Categories</div>
                      <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
                        {vCats.length === 0 ? <span style={{color:TH.textDim, fontSize:12}}>None</span> :
                          vCats.map(c => <span key={c.id} style={{background:TH.accentBg, color:TH.accentText, padding:"3px 10px", borderRadius:5, fontSize:11, fontWeight:600}}>{c.name}</span>)
                        }
                      </div>
                    </div>

                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:11, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", marginBottom:6}}>Properties</div>
                      <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
                        {vProps.length === 0 ? <span style={{color:TH.textDim, fontSize:12}}>All properties</span> :
                          vProps.map(p => <span key={p.id} style={{background:"rgba(139,122,68,.15)", color:TH.accent, padding:"3px 10px", borderRadius:5, fontSize:11, fontWeight:600}}>{p.code}</span>)
                        }
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", paddingTop:12, borderTop:`1px solid ${TH.border}`}}>
                      <div style={{fontSize:11, color:TH.textMuted, marginRight:8}}>Risk score:</div>
                      <input type="number" min="0" max="100" defaultValue={v.risk_score || 0} onBlur={e => updateRiskScore(v, e.target.value)} style={{width:70, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:6, padding:"5px 8px", color:TH.text, fontSize:12, fontFamily:"inherit", outline:"none"}} />
                      <div style={{flex:1}} />
                      {v.status === 'pending_approval' && <button onClick={() => changeStatus(v, 'active')} style={{background:"#10b981", border:"none", borderRadius:8, color:"#fff", padding:"7px 14px", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit"}}>✓ Approve</button>}
                      {v.status === 'active' && <button onClick={() => changeStatus(v, 'suspended')} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"7px 14px", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit"}}>Suspend</button>}
                      {v.status === 'suspended' && <button onClick={() => changeStatus(v, 'active')} style={{background:"#10b981", border:"none", borderRadius:8, color:"#fff", padding:"7px 14px", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit"}}>Reactivate</button>}
                      {v.status !== 'blacklisted' && <button onClick={() => changeStatus(v, 'blacklisted')} style={{background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:8, color:"#ef4444", padding:"7px 14px", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit"}}>Blacklist</button>}
                    </div>
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

function Field({ TH, label, children, style }) {
  return (
    <div style={style}>
      <label style={{display:"block", color:TH.textMuted, fontSize:12, marginBottom:6, fontWeight:600}}>{label}</label>
      {children}
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
function inputStyle(TH) {
  return {width:"100%", background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box"};
}
