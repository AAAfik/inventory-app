// ═══════════════════════════════════════════════════════════════════
// SuppliersTab.jsx — supplier directory with full CRUD
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import { Icon } from "../lib/icons";

const CATEGORIES = [
  "Pool chemicals", "Electrical", "Plumbing", "Hardware", "Tools",
  "Paint", "Safety / PPE", "Cleaning", "F&B", "Landscaping",
  "Construction", "Services", "Other",
];
const TERMS = ["Cash", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60", "On delivery", "Prepaid"];

export default function SuppliersTab({ TH, lang = "en", isMobile, isAdmin }) {
  const L = tr(lang);
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [editing, setEditing] = useState(null);   // {} = new, obj = edit
  const [detail, setDetail] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rS, rP] = await Promise.all([
        supabase.from('suppliers').select('*').eq('is_active', true).order('name'),
        supabase.from('v_purchases').select('supplier_name, supplier_id, total_cost, performed_at'),
      ]);
      if (rS.error) throw rS.error;
      setRows(rS.data || []);

      const agg = {};
      (rP.data || []).forEach(p => {
        const k = p.supplier_id || p.supplier_name;
        if (!k) return;
        if (!agg[k]) agg[k] = { orders: 0, spend: 0, last: null };
        agg[k].orders++;
        agg[k].spend += Number(p.total_cost) || 0;
        if (!agg[k].last || new Date(p.performed_at) > new Date(agg[k].last)) agg[k].last = p.performed_at;
      });
      setStats(agg);
    } catch (e) {
      setError(e.message || String(e));
    } finally { setLoading(false); }
  }

  const cats = useMemo(() => {
    const s = new Set(rows.map(r => r.category).filter(Boolean));
    return [...s].sort();
  }, [rows]);

  const visible = rows.filter(r => {
    if (catFilter !== "all" && r.category !== catFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [r.name, r.code, r.contact_person, r.phone, r.email, r.category]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(q));
  });

  const totalSpend = Object.values(stats).reduce((s, v) => s + v.spend, 0);

  return (
    <div>
      {editing && <SupplierForm TH={TH} supplier={editing.id ? editing : null}
        onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {detail && <SupplierDetail TH={TH} supplier={detail} stat={stats[detail.id] || stats[detail.name]}
        onClose={() => setDetail(null)} onEdit={() => { setDetail(null); setEditing(detail); }} />}

      {/* Header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, gap:10, flexWrap:"wrap"}}>
        <div style={{color:TH.textMuted, fontSize:13}}>
          {loading ? (L.loading || "Loading…") : `${rows.length} ${L.suppliersLbl || "suppliers"}`}
          {totalSpend > 0 && <span style={{marginInlineStart:10, color:TH.accent, fontWeight:600}}>€{totalSpend.toLocaleString('en-GB',{maximumFractionDigits:0})} {L.totalSpend || "total spend"}</span>}
        </div>
        {isAdmin && (
          <button onClick={() => setEditing({})} style={goldBtn(TH)}>
            <Icon name="plus" size={14} />{L.newSupplier || "New supplier"}
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"2fr 1fr", gap:8, marginBottom:16}}>
        <div style={{...inp(TH), display:"flex", alignItems:"center", gap:8, padding:"0 12px"}}>
          <span style={{color:TH.textDim, display:"flex"}}><Icon name="search" size={14} /></span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={L.searchSupplier || "Search name, contact, phone…"}
            style={{flex:1, background:"transparent", border:"none", outline:"none", color:TH.text, fontSize:13, fontFamily:"inherit", padding:"9px 0"}} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={inp(TH)}>
          <option value="all">{L.allCategories || "All categories"}</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error && <ErrBox TH={TH}>{error}</ErrBox>}

      {loading ? <Empty TH={TH}>{L.loading || "Loading…"}</Empty>
       : visible.length === 0 ? (
        <Empty TH={TH}>
          {rows.length === 0 ? (L.noSuppliers || "No suppliers yet.") : (L.noMatch || "Nothing matches.")}
          {isAdmin && rows.length === 0 && (
            <div style={{marginTop:14}}>
              <button onClick={() => setEditing({})} style={goldBtn(TH)}>
                <Icon name="plus" size={14} />{L.newSupplier || "New supplier"}
              </button>
            </div>
          )}
        </Empty>
      ) : (
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(300px, 1fr))", gap:12}}>
          {visible.map(s => {
            const st = stats[s.id] || stats[s.name] || { orders:0, spend:0, last:null };
            return (
              <div key={s.id} onClick={() => setDetail(s)} style={{
                background:TH.bgCard, border:`1px solid ${TH.border}`,
                borderInlineStart:`3px solid ${TH.accent}`, borderRadius:0,
                padding:"14px 16px", cursor:"pointer", boxShadow:TH.cardGlow,
              }}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:8}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:14, fontWeight:600, color:TH.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{s.name}</div>
                    <div style={{fontSize:10, color:TH.textDim, marginTop:2}}>
                      {[s.code, s.category].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={e => { e.stopPropagation(); setEditing(s); }} aria-label="Edit supplier" style={iconBtn(TH)}>
                      <Icon name="edit" size={13} />
                    </button>
                  )}
                </div>

                {(s.contact_person || s.phone) && (
                  <div style={{fontSize:12, color:TH.textMuted, marginBottom:3}}>
                    {[s.contact_person, s.phone].filter(Boolean).join(' · ')}
                  </div>
                )}
                {s.email && <div style={{fontSize:11, color:TH.accentText, marginBottom:8}}>{s.email}</div>}

                <div style={{display:"flex", gap:14, paddingTop:10, borderTop:`1px solid ${TH.divider}`, marginTop:8}}>
                  <MiniStat TH={TH} label={L.ordersLbl || "Orders"} value={st.orders} />
                  <MiniStat TH={TH} label={L.spendLbl || "Spend"} value={st.spend > 0 ? `€${Math.round(st.spend).toLocaleString('en-GB')}` : '—'} gold />
                  <MiniStat TH={TH} label={L.lastLbl || "Last"} value={st.last ? new Date(st.last).toLocaleDateString('en-GB',{month:'short', year:'2-digit'}) : '—'} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
function SupplierForm({ TH, supplier, onClose, onSaved }) {
  const isEdit = !!supplier;
  const [f, setF] = useState({
    code: supplier?.code || "", name: supplier?.name || "",
    category: supplier?.category || "Other",
    contact_person: supplier?.contact_person || "",
    phone: supplier?.phone || "", email: supplier?.email || "",
    address: supplier?.address || "", payment_terms: supplier?.payment_terms || "Net 30",
    tax_no: supplier?.tax_no || "", website: supplier?.website || "",
    rating: supplier?.rating ?? "", notes: supplier?.notes || "",
    is_active: supplier?.is_active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  async function save() {
    setErr(null);
    if (!f.name.trim()) return setErr("Name is required");
    setBusy(true);
    try {
      const payload = {
        code: f.code.trim() || null, name: f.name.trim(),
        category: f.category || null, contact_person: f.contact_person.trim() || null,
        phone: f.phone.trim() || null, email: f.email.trim() || null,
        address: f.address.trim() || null, payment_terms: f.payment_terms || null,
        tax_no: f.tax_no.trim() || null, website: f.website.trim() || null,
        rating: f.rating === "" ? null : Number(f.rating),
        notes: f.notes.trim() || null, is_active: f.is_active,
      };
      const q = isEdit
        ? supabase.from('suppliers').update(payload).eq('id', supplier.id)
        : supabase.from('suppliers').insert([payload]);
      const { error } = await q;
      if (error) throw error;
      onSaved();
    } catch (e) { setErr(e.message || String(e)); setBusy(false); }
  }

  async function remove() {
    if (!confirm(`Deactivate "${supplier.name}"? Purchase history is kept.`)) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('suppliers').update({ is_active: false }).eq('id', supplier.id);
      if (error) throw error;
      onSaved();
    } catch (e) { setErr(e.message || String(e)); setBusy(false); }
  }

  return (
    <Modal TH={TH} title={isEdit ? "Edit supplier" : "New supplier"} onClose={onClose} busy={busy}>
      <Grid cols={isEdit ? "1fr 2fr" : "1fr 2fr"}>
        <Field TH={TH} label="Code"><input value={f.code} onChange={e=>set('code',e.target.value)} placeholder="SUP-004" style={inp(TH)} /></Field>
        <Field TH={TH} label="Name *"><input value={f.name} onChange={e=>set('name',e.target.value)} style={inp(TH)} /></Field>
      </Grid>
      <Grid cols="1fr 1fr">
        <Field TH={TH} label="Category">
          <select value={f.category} onChange={e=>set('category',e.target.value)} style={inp(TH)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field TH={TH} label="Payment terms">
          <select value={f.payment_terms} onChange={e=>set('payment_terms',e.target.value)} style={inp(TH)}>
            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </Grid>
      <Grid cols="1fr 1fr">
        <Field TH={TH} label="Contact person"><input value={f.contact_person} onChange={e=>set('contact_person',e.target.value)} style={inp(TH)} /></Field>
        <Field TH={TH} label="Phone"><input value={f.phone} onChange={e=>set('phone',e.target.value)} style={inp(TH)} /></Field>
      </Grid>
      <Grid cols="1fr 1fr">
        <Field TH={TH} label="Email"><input type="email" value={f.email} onChange={e=>set('email',e.target.value)} style={inp(TH)} /></Field>
        <Field TH={TH} label="Website"><input value={f.website} onChange={e=>set('website',e.target.value)} placeholder="example.com" style={inp(TH)} /></Field>
      </Grid>
      <Field TH={TH} label="Address"><input value={f.address} onChange={e=>set('address',e.target.value)} style={inp(TH)} /></Field>
      <Grid cols="1fr 1fr">
        <Field TH={TH} label="Tax / VAT no"><input value={f.tax_no} onChange={e=>set('tax_no',e.target.value)} style={inp(TH)} /></Field>
        <Field TH={TH} label="Rating (1-5)">
          <select value={f.rating} onChange={e=>set('rating',e.target.value)} style={inp(TH)}>
            <option value="">—</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
      </Grid>
      <Field TH={TH} label="Notes"><textarea rows={2} value={f.notes} onChange={e=>set('notes',e.target.value)} style={{...inp(TH), resize:"vertical"}} /></Field>

      {err && <ErrBox TH={TH}>{err}</ErrBox>}

      <ModalActions TH={TH} onClose={onClose} onSave={save} busy={busy}
        onDelete={isEdit ? remove : null} saveLabel={isEdit ? "Save changes" : "Create supplier"} />
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
function SupplierDetail({ TH, supplier: s, stat, onClose, onEdit }) {
  const [purchases, setPurchases] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('v_purchases').select('*').eq('supplier_id', s.id).order('performed_at', { ascending: false }).limit(40),
      supabase.from('items').select('id, code, name, unit, last_unit_cost, current_qty').eq('default_supplier_id', s.id).order('name'),
    ]).then(([rP, rI]) => {
      setPurchases(rP.data || []);
      setItems(rI.data || []);
      setLoading(false);
    });
  }, [s.id]);

  const st = stat || { orders:0, spend:0, last:null };

  return (
    <Modal TH={TH} title={s.name} subtitle={[s.code, s.category].filter(Boolean).join(' · ')} onClose={onClose} wide>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:16}}>
        <Stat TH={TH} label="Orders" value={st.orders} />
        <Stat TH={TH} label="Total spend" value={`€${Math.round(st.spend).toLocaleString('en-GB')}`} gold />
        <Stat TH={TH} label="Items supplied" value={items.length} />
        <Stat TH={TH} label="Last order" value={st.last ? new Date(st.last).toLocaleDateString('en-GB') : '—'} />
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16}}>
        {s.contact_person && <Info TH={TH} label="Contact">{s.contact_person}</Info>}
        {s.phone && <Info TH={TH} label="Phone">{s.phone}</Info>}
        {s.email && <Info TH={TH} label="Email">{s.email}</Info>}
        {s.payment_terms && <Info TH={TH} label="Terms">{s.payment_terms}</Info>}
        {s.tax_no && <Info TH={TH} label="Tax no">{s.tax_no}</Info>}
        {s.website && <Info TH={TH} label="Website">{s.website}</Info>}
        {s.address && <Info TH={TH} label="Address">{s.address}</Info>}
      </div>
      {s.notes && (
        <div style={{background:TH.bgInput, borderInlineStart:`2px solid ${TH.accent}`, padding:"11px 13px", marginBottom:16}}>
          <div style={{fontSize:9, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:".11em", marginBottom:5}}>Notes</div>
          <div style={{fontSize:13, color:TH.text, whiteSpace:"pre-wrap"}}>{s.notes}</div>
        </div>
      )}

      {items.length > 0 && (
        <Section TH={TH} title={`Items supplied (${items.length})`}>
          {items.map(it => (
            <div key={it.id} style={{display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${TH.divider}`, fontSize:12}}>
              <span style={{color:TH.text}}>{it.name}</span>
              <span style={{color:TH.textMuted, whiteSpace:"nowrap", marginInlineStart:10}}>
                {it.current_qty} {it.unit}{it.last_unit_cost != null ? ` · €${it.last_unit_cost}` : ''}
              </span>
            </div>
          ))}
        </Section>
      )}

      <Section TH={TH} title={`Purchase history (${purchases.length})`}>
        {loading ? <div style={{fontSize:12, color:TH.textMuted, padding:"10px 0"}}>Loading…</div>
         : purchases.length === 0 ? <div style={{fontSize:12, color:TH.textDim, padding:"10px 0"}}>No purchases recorded.</div>
         : purchases.map(p => (
          <div key={p.id} style={{display:"flex", justifyContent:"space-between", gap:10, padding:"8px 0", borderBottom:`1px solid ${TH.divider}`, fontSize:12}}>
            <div style={{minWidth:0}}>
              <div style={{color:TH.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.name}</div>
              <div style={{fontSize:10, color:TH.textDim}}>
                {new Date(p.performed_at).toLocaleDateString('en-GB')}
                {p.reference_no ? ` · ${p.reference_no}` : ''}
                {p.warehouse_code ? ` · ${p.warehouse_code}` : ''}
              </div>
            </div>
            <div style={{textAlign:"end", whiteSpace:"nowrap"}}>
              <div style={{color:TH.text}}>{p.qty} {p.unit}</div>
              {p.total_cost != null && <div style={{fontSize:10, color:TH.accent}}>€{Number(p.total_cost).toFixed(2)}</div>}
            </div>
          </div>
        ))}
      </Section>

      <div style={{display:"flex", gap:8, marginTop:18, paddingTop:16, borderTop:`1px solid ${TH.divider}`}}>
        <button onClick={onClose} style={ghostBtn(TH)}>Close</button>
        <button onClick={onEdit} style={{...deepBtn(TH), flex:1}}>Edit supplier</button>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Shared bits
// ═══════════════════════════════════════════════════════════════════
export function Modal({ TH, title, subtitle, children, onClose, wide, busy }) {
  return (
    <div onClick={() => !busy && onClose()} style={{position:"fixed", inset:0, background:"rgba(8,12,22,.62)", backdropFilter:"blur(3px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
      <div onClick={e => e.stopPropagation()} style={{
        background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14,
        padding:24, width:"100%", maxWidth: wide ? 720 : 560,
        maxHeight:"92vh", overflowY:"auto", boxShadow:TH.shadowLg,
      }}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:14, marginBottom:18, paddingBottom:14, borderBottom:`1px solid ${TH.divider}`}}>
          <div style={{minWidth:0}}>
            <div style={{fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, fontWeight:500, color:TH.textHeading, lineHeight:1.2}}>{title}</div>
            {subtitle && <div style={{fontSize:11, color:TH.textDim, marginTop:4}}>{subtitle}</div>}
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Close" style={{
            background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:9,
            width:30, height:30, color:TH.textMuted, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, padding:0,
          }}><Icon name="close" size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ TH, onClose, onSave, onDelete, busy, saveLabel = "Save" }) {
  return (
    <div style={{display:"flex", justifyContent:"space-between", gap:8, marginTop:20, paddingTop:16, borderTop:`1px solid ${TH.divider}`, flexWrap:"wrap"}}>
      <div>
        {onDelete && (
          <button onClick={onDelete} disabled={busy} style={{
            background:"transparent", border:`1px solid ${TH.danger}55`, borderRadius:9,
            color:TH.danger, padding:"10px 15px", cursor:"pointer", fontSize:12, fontWeight:700,
            fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6,
          }}><Icon name="trash" size={13} />Deactivate</button>
        )}
      </div>
      <div style={{display:"flex", gap:8}}>
        <button onClick={onClose} disabled={busy} style={ghostBtn(TH)}>Cancel</button>
        <button onClick={onSave} disabled={busy} style={{...deepBtn(TH), opacity: busy?.6:1}}>
          {busy ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}

export function Grid({ cols, children }) {
  return <div style={{display:"grid", gridTemplateColumns:cols, gap:10, marginBottom:10}}>{children}</div>;
}
export function Field({ TH, label, children }) {
  return (
    <div style={{marginBottom:10}}>
      <label style={{display:"block", fontSize:10, fontWeight:700, color:TH.textMuted, marginBottom:5, textTransform:"uppercase", letterSpacing:".1em"}}>{label}</label>
      {children}
    </div>
  );
}
export function Info({ TH, label, children }) {
  return (
    <div>
      <div style={{fontSize:9, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:".11em", marginBottom:3}}>{label}</div>
      <div style={{fontSize:13, color:TH.text, wordBreak:"break-word"}}>{children}</div>
    </div>
  );
}
export function Section({ TH, title, children }) {
  return (
    <div style={{marginBottom:16}}>
      <div style={{fontSize:10, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:".11em", marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${TH.divider}`}}>{title}</div>
      <div style={{maxHeight:220, overflowY:"auto"}}>{children}</div>
    </div>
  );
}
export function Stat({ TH, label, value, gold, alert }) {
  return (
    <div style={{background:TH.bgInput, borderInlineStart:`3px solid ${alert ? TH.danger : gold ? TH.accent : TH.border}`, padding:"10px 13px"}}>
      <div style={{fontSize:9, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:".1em", marginBottom:4}}>{label}</div>
      <div style={{fontFamily:"'Playfair Display',Georgia,serif", fontSize:19, fontWeight:500, color: alert ? TH.danger : gold ? TH.accent : TH.textHeading, lineHeight:1}}>{value}</div>
    </div>
  );
}
function MiniStat({ TH, label, value, gold }) {
  return (
    <div style={{flex:1, minWidth:0}}>
      <div style={{fontSize:8.5, fontWeight:700, color:TH.textDim, textTransform:"uppercase", letterSpacing:".09em"}}>{label}</div>
      <div style={{fontSize:13, fontWeight:600, color: gold ? TH.accent : TH.text, marginTop:2, whiteSpace:"nowrap"}}>{value}</div>
    </div>
  );
}
export function Empty({ TH, children }) {
  return <div style={{padding:"40px 20px", background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center", fontSize:13}}>{children}</div>;
}
export function ErrBox({ TH, children }) {
  return <div style={{background:TH.dangerBg, border:`1px solid ${TH.danger}55`, borderRadius:9, padding:"11px 14px", color:TH.danger, fontSize:12.5, marginBottom:14, whiteSpace:"pre-wrap"}}>{children}</div>;
}
export function inp(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
export function goldBtn(TH) {
  return { background:TH.accent, border:"none", borderRadius:9, color:"#12182B", padding:"9px 16px", cursor:"pointer", fontSize:12.5, fontWeight:700, fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6 };
}
export function deepBtn(TH) {
  return { background:TH.deep, border:`1px solid ${TH.deepBorder}`, borderRadius:9, color:TH.onDeep, padding:"10px 20px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6 };
}
export function ghostBtn(TH) {
  return { background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"inherit" };
}
export function iconBtn(TH) {
  return { background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"5px 8px", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", flexShrink:0 };
}
