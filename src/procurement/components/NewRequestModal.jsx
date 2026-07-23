// ═══════════════════════════════════════════════════════════════════
// NewRequestModal.jsx — supervisor creates a new procurement request
// Multi-item: default 1, can add more.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";

export default function NewRequestModal({ TH, lang = "en", onClose, onCreated }) {
  const L = tr(lang);
  const [departments, setDepartments] = useState([]);
  const [properties, setProperties]   = useState([]);
  const [deptId, setDeptId]           = useState("");
  const [propId, setPropId]           = useState("");
  const [purpose, setPurpose]         = useState("");
  const [useLocation, setUseLocation] = useState("");
  const [priority, setPriority]       = useState("medium");
  const [notes, setNotes]             = useState("");
  const [items, setItems]             = useState([
    { name: "", qty: "1", unit: "unit", estimated_cost: "", notes: "" },
  ]);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from('procurement_departments').select('*').eq('is_active', true).order('name'),
      supabase.from('wh_properties').select('*').eq('is_active', true).order('id'),
      supabase.from('user_procurement_roles').select('department_id').eq('user_id', (async () => (await supabase.auth.getUser()).data.user?.id)()).maybeSingle(),
    ]).then(([rD, rP]) => {
      setDepartments(rD.data || []);
      setProperties(rP.data || []);
    });

    // Pre-fill department from user role
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('user_procurement_roles').select('department_id').eq('user_id', user.id).maybeSingle();
      if (data?.department_id) setDeptId(String(data.department_id));
    })();
  }, []);

  function updateItem(i, field, val) {
    setItems(items.map((it, x) => x === i ? { ...it, [field]: val } : it));
  }
  function addItem() {
    setItems([...items, { name: "", qty: "1", unit: "unit", estimated_cost: "", notes: "" }]);
  }
  function removeItem(i) {
    if (items.length === 1) return;
    setItems(items.filter((_, x) => x !== i));
  }

  async function submit() {
    setBusy(true); setError(null);
    try {
      if (!purpose.trim()) throw new Error(L.needPurpose || "Purpose is required.");
      if (!deptId) throw new Error(L.needDepartment || "Department is required.");
      const validItems = items.filter(i => i.name.trim() && Number(i.qty) > 0);
      if (validItems.length === 0) throw new Error(L.needItem || "At least one item with name and qty is required.");

      const { data: { user } } = await supabase.auth.getUser();

      const totalCost = validItems.reduce((s, it) => {
        const q = Number(it.qty) || 0;
        const c = Number(it.estimated_cost) || 0;
        return s + (q * c);
      }, 0);

      const { data: req, error: rErr } = await supabase.from('procurement_requests').insert([{
        requested_by: user.id,
        department_id: Number(deptId),
        property_id: propId ? Number(propId) : null,
        purpose: purpose.trim(),
        use_location: useLocation.trim() || null,
        priority,
        notes: notes.trim() || null,
        total_estimated_cost: totalCost || null,
      }]).select().single();
      if (rErr) throw rErr;

      // Insert items
      const itemRows = validItems.map(it => ({
        request_id: req.id,
        item_name: it.name.trim(),
        qty: Number(it.qty),
        unit: it.unit || 'unit',
        estimated_cost: it.estimated_cost ? Number(it.estimated_cost) : null,
        notes: it.notes.trim() || null,
      }));
      const { error: iErr } = await supabase.from('procurement_request_items').insert(itemRows);
      if (iErr) throw iErr;

      onCreated?.();
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  }

  return ( <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}><div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:20, width:"100%", maxWidth:640, maxHeight:"92vh", overflowY:"auto"}}><div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}><div style={{fontSize:16, fontWeight:800, color:TH.text, fontFamily:"'Playfair Display', Georgia, serif"}}>{L.newRequest || 'New request'} </div><button onClick={onClose} disabled={busy} style={{background:"transparent", border:"none", color:TH.textMuted, fontSize:22, cursor:"pointer", padding:4, lineHeight:1}}></button></div><div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:10}}><div><label style={lbl(TH)}>{L.department || 'Department'} *</label><select value={deptId} onChange={e => setDeptId(e.target.value)} disabled={busy} style={inp(TH)}><option value="">—</option>{departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)} </select></div><div><label style={lbl(TH)}>{L.priority || 'Priority'}</label><select value={priority} onChange={e => setPriority(e.target.value)} disabled={busy} style={inp(TH)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div></div><div style={{marginBottom:10}}><label style={lbl(TH)}>{L.property || 'Property'}</label><select value={propId} onChange={e => setPropId(e.target.value)} disabled={busy} style={inp(TH)}><option value="">—</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)} </select></div><div style={{marginBottom:10}}><label style={lbl(TH)}>{L.purpose || 'Purpose / Reason'} *</label><textarea value={purpose} onChange={e => setPurpose(e.target.value)} disabled={busy} rows={2} style={{...inp(TH), resize:"vertical"}} placeholder={L.purposePh || 'Why do you need this?'} /></div><div style={{marginBottom:14}}><label style={lbl(TH)}>{L.useLocation || 'Where will it be used?'}</label><input value={useLocation} onChange={e => setUseLocation(e.target.value)} disabled={busy} style={inp(TH)} placeholder={L.useLocationPh || 'e.g. Caesar Cliff — main garden'} /></div>{/* Items */} <div style={{marginBottom:14, background:TH.bgInput, borderRadius:10, padding:12}}><div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}><div style={{fontSize:12, fontWeight:700, color:TH.text, textTransform:"uppercase", letterSpacing:"0.5px"}}>{L.items || 'Items'} ({items.length}) </div><button onClick={addItem} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"4px 10px", cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:"inherit"}}>+ {L.addItem || 'Add item'}</button></div>{items.map((it, i) => ( <div key={i} style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:8, padding:10, marginBottom:8}}><div style={{display:"grid", gridTemplateColumns:"1fr 60px 80px auto", gap:6, marginBottom:6, alignItems:"end"}}><div><label style={miniLbl(TH)}>{L.itemName || 'Item name'}</label><input value={it.name} onChange={e => updateItem(i, 'name', e.target.value)} disabled={busy} placeholder="Shovel" style={smInp(TH)} /></div><div><label style={miniLbl(TH)}>{L.qty || 'Qty'}</label><input type="number" step="0.1" min="0" value={it.qty} onChange={e => updateItem(i, 'qty', e.target.value)} disabled={busy} style={smInp(TH)} /></div><div><label style={miniLbl(TH)}>{L.unit || 'Unit'}</label><input value={it.unit} onChange={e => updateItem(i, 'unit', e.target.value)} disabled={busy} placeholder="unit" style={smInp(TH)} /></div>{items.length > 1 && ( <button onClick={() => removeItem(i)} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:"#C43D3D", padding:"7px 10px", cursor:"pointer", fontSize:14, fontFamily:"inherit"}}></button>)} </div><div style={{display:"grid", gridTemplateColumns:"120px 1fr", gap:6}}><div><label style={miniLbl(TH)}>{L.estCost || 'Est. cost'}</label><input type="number" step="0.01" min="0" value={it.estimated_cost} onChange={e => updateItem(i, 'estimated_cost', e.target.value)} disabled={busy} placeholder="0.00" style={smInp(TH)} /></div><div><label style={miniLbl(TH)}>{L.itemNote || 'Note'}</label><input value={it.notes} onChange={e => updateItem(i, 'notes', e.target.value)} disabled={busy} placeholder="Optional" style={smInp(TH)} /></div></div></div>))} </div><div style={{marginBottom:14}}><label style={lbl(TH)}>{L.notes || 'Notes'}</label><textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={busy} rows={2} style={{...inp(TH), resize:"vertical"}} placeholder="Optional" /></div>{error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:8, padding:"10px 12px", color:"#C43D3D", fontSize:12, marginBottom:10}}>{error}</div>} <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}><button onClick={onClose} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>{L.cancel || 'Cancel'}</button><button onClick={submit} disabled={busy} style={{background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:9, color:"#000", padding:"10px 24px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit", opacity:busy?0.6:1}}>{busy ? (L.saving || 'Saving…') : (L.submitRequest || 'Submit request')} </button></div></div></div>);
}

function lbl(TH)  { return { display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }; }
function miniLbl(TH) { return { display:"block", color:TH.textMuted, fontSize:9, marginBottom:3, fontWeight:600, textTransform:"uppercase" }; }
function inp(TH) { return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"10px 12px", color:TH.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }; }
function smInp(TH) { return { ...inp(TH), padding:"7px 10px", fontSize:13 }; }
