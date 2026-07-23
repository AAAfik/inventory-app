// ═══════════════════════════════════════════════════════════════════
// RequisitionsTab.jsx — operator creates + lists own requisitions
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { REQ_STATUS, formatEUR, formatDate, nextRequisitionNumber, canCreateRequisition } from "../lib/procureUtils";

export default function RequisitionsTab({ TH, isMobile, roles, isAdmin }) {
  const [reqs, setReqs]           = useState([]);
  const [properties, setProperties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [propertyId, setPropertyId]   = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [justification, setJustification] = useState("");
  const [linkedRef, setLinkedRef] = useState("");
  const [lines, setLines] = useState([{ desc: "", qty: 1, unit: "unit", est: 0 }]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      const [rReq, rProp, rDept] = await Promise.all([
        supabase.schema('procure').from('requisitions')
          .select('id, req_no, property_id, department_id, justification, total_estimate, currency, status, submitted_at, created_at, requested_by')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.schema('procure').from('properties').select('id, code, name').eq('is_active', true).order('id'),
        supabase.schema('procure').from('departments').select('id, code, name, property_id').eq('is_active', true).order('id'),
      ]);
      if (rReq.error)  throw rReq.error;
      if (rProp.error) throw rProp.error;
      if (rDept.error) throw rDept.error;
      setReqs(rReq.data || []);
      setProperties(rProp.data || []);
      setDepartments(rDept.data || []);
      if (rProp.data?.length && !propertyId) setPropertyId(rProp.data[0].id);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function addLine() { setLines(l => [...l, { desc: "", qty: 1, unit: "unit", est: 0 }]); }
  function removeLine(i) { setLines(l => l.filter((_, idx) => idx !== i)); }
  function updateLine(i, field, value) { setLines(l => l.map((row, idx) => idx === i ? { ...row, [field]: value } : row)); }
  const lineTotal = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.est || 0), 0);

  async function submitRequisition() {
    setSubmitting(true); setError(null);
    try {
      if (!propertyId || !departmentId) throw new Error("Property and department are required.");
      if (justification.trim().length < 10) throw new Error("Justification must be at least 10 characters.");
      if (!linkedRef.trim()) throw new Error("Linked reference is required (ticket, pool log, etc).");
      if (lines.length === 0 || lines.some(l => !l.desc.trim() || Number(l.qty) <= 0)) {
        throw new Error("Each line needs a description and qty > 0.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in.");

      const req_no = await nextRequisitionNumber(supabase);

      // Insert requisition (draft state initially)
      const { data: req, error: e1 } = await supabase.schema('procure').from('requisitions').insert([{
        req_no,
        property_id:      Number(propertyId),
        department_id:    Number(departmentId),
        requested_by:     user.id,
        justification:    justification.trim(),
        linked_other_ref: linkedRef.trim(),
        total_estimate:   lineTotal,
        status:           'submitted',
        submitted_at:     new Date().toISOString(),
      }]).select().single();
      if (e1) throw e1;

      // Insert lines
      const linesPayload = lines.map(l => ({
        requisition_id:   req.id,
        item_description: l.desc.trim(),
        qty:              Number(l.qty),
        unit:             l.unit || 'unit',
        unit_estimate:    Number(l.est || 0),
      }));
      const { error: e2 } = await supabase.schema('procure').from('requisition_lines').insert(linesPayload);
      if (e2) throw e2;

      // Audit log
      await supabase.schema('procure').from('audit_log').insert([{
        user_id:     user.id,
        user_email:  user.email,
        action:      'create_requisition',
        entity_type: 'requisition',
        entity_id:   req.id,
        after_data:  { req_no: req.req_no, total: lineTotal },
      }]);

      // Reset form
      setShowForm(false);
      setJustification(""); setLinkedRef(""); setLines([{ desc: "", qty: 1, unit: "unit", est: 0 }]);
      await loadAll();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const filtDept = departments.filter(d => d.property_id === Number(propertyId));
  const canCreate = canCreateRequisition(roles) || isAdmin;

  return (
    <div>
      {/* Top bar */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:12, flexWrap:"wrap"}}>
        <div style={{color:TH.textMuted, fontSize:13}}>
          {loading ? "Loading..." : `${reqs.length} requisition${reqs.length===1?"":"s"}`}
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(s => !s)}
            style={{background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:10, color:"#000", padding:"10px 16px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit"}}
          >
            {showForm ? "Cancel" : "+ New requisition"}
          </button>
        )}
      </div>

      {error && (
        <div style={{background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.3)", borderRadius:9, padding:"10px 14px", color:"#ef4444", fontSize:13, marginBottom:16}}>
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:20, marginBottom:20}}>
          <div style={{fontSize:15, fontWeight:700, color:TH.text, marginBottom:14}}>New requisition</div>

          <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12, marginBottom:14}}>
            <Field TH={TH} label="Property">
              <select value={propertyId} onChange={e => { setPropertyId(e.target.value); setDepartmentId(""); }} style={selectStyle(TH)}>
                <option value="">Select property...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field TH={TH} label="Department">
              <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} style={selectStyle(TH)} disabled={!propertyId}>
                <option value="">Select department...</option>
                {filtDept.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>

          <Field TH={TH} label="Linked reference (ticket no., pool log, work order, etc.)">
            <input value={linkedRef} onChange={e => setLinkedRef(e.target.value)} placeholder="e.g. MAINT-2847 or Pool log #1923" style={inputStyle(TH)} />
          </Field>

          <Field TH={TH} label="Justification (≥10 chars)" style={{marginTop:12}}>
            <textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3} placeholder="Why is this needed?" style={{...inputStyle(TH), minHeight:60, resize:"vertical"}} />
          </Field>

          {/* Lines */}
          <div style={{marginTop:16, marginBottom:8, fontSize:13, fontWeight:600, color:TH.textMuted}}>Items</div>
          {lines.map((l, i) => (
            <div key={i} style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"3fr 1fr 1fr 1fr auto", gap:8, marginBottom:6}}>
              <input value={l.desc} onChange={e => updateLine(i, 'desc', e.target.value)} placeholder="Description" style={inputStyle(TH)} />
              <input value={l.qty} onChange={e => updateLine(i, 'qty', e.target.value)} type="number" step="0.001" placeholder="Qty" style={inputStyle(TH)} />
              <input value={l.unit} onChange={e => updateLine(i, 'unit', e.target.value)} placeholder="Unit" style={inputStyle(TH)} />
              <input value={l.est} onChange={e => updateLine(i, 'est', e.target.value)} type="number" step="0.01" placeholder="Est. €/unit" style={inputStyle(TH)} />
              <button onClick={() => removeLine(i)} disabled={lines.length === 1} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"6px 10px", cursor:lines.length===1?"not-allowed":"pointer", fontFamily:"inherit"}}>×</button>
            </div>
          ))}
          <button onClick={addLine} style={{background:"transparent", border:`1px dashed ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"6px 14px", cursor:"pointer", fontSize:12, fontFamily:"inherit", marginTop:4}}>+ Add line</button>

          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:18, paddingTop:14, borderTop:`1px solid ${TH.border}`}}>
            <div style={{fontSize:14, color:TH.text}}>
              Estimated total: <span style={{fontWeight:700}}>{formatEUR(lineTotal)}</span>
            </div>
            <button onClick={submitRequisition} disabled={submitting} style={{background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:10, color:"#000", padding:"10px 20px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", opacity:submitting?0.6:1}}>
              {submitting ? "Submitting..." : "Submit requisition"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading...</div>
      ) : reqs.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          No requisitions yet. {canCreate && "Use the button above to create the first one."}
        </div>
      ) : (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
              <thead>
                <tr style={{background:TH.bgElev}}>
                  <Th TH={TH}>Req No.</Th>
                  <Th TH={TH}>Status</Th>
                  <Th TH={TH}>Property / Dept</Th>
                  <Th TH={TH}>Total</Th>
                  <Th TH={TH}>Submitted</Th>
                </tr>
              </thead>
              <tbody>
                {reqs.map(r => {
                  const prop = properties.find(p => p.id === r.property_id);
                  const dept = departments.find(d => d.id === r.department_id);
                  const meta = REQ_STATUS[r.status] || { label: r.status, color: "#8892b0" };
                  return (
                    <tr key={r.id} style={{borderTop:`1px solid ${TH.border}`}}>
                      <Td TH={TH}><code style={{fontSize:12, color:TH.accent}}>{r.req_no}</code></Td>
                      <Td TH={TH}>
                        <span style={{display:"inline-block", padding:"3px 8px", borderRadius:5, background:meta.color+"22", color:meta.color, fontSize:11, fontWeight:700}}>{meta.label}</span>
                      </Td>
                      <Td TH={TH}>{prop?.code || "?"} · {dept?.name || "?"}</Td>
                      <Td TH={TH}>{formatEUR(r.total_estimate)}</Td>
                      <Td TH={TH} style={{color:TH.textMuted}}>{formatDate(r.submitted_at || r.created_at)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── tiny helpers (inlined to avoid more files) ──────────────────────
function Field({ TH, label, children, style }) {
  return (
    <div style={style}>
      <label style={{display:"block", color:TH.textMuted, fontSize:12, marginBottom:6, fontWeight:600}}>{label}</label>
      {children}
    </div>
  );
}
function Th({ TH, children }) {
  return <th style={{textAlign:"left", padding:"10px 14px", color:TH.textMuted, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px"}}>{children}</th>;
}
function Td({ TH, children, style }) {
  return <td style={{padding:"10px 14px", color:TH.text, ...style}}>{children}</td>;
}
function inputStyle(TH) {
  return {width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box"};
}
function selectStyle(TH) { return { ...inputStyle(TH), cursor:"pointer" }; }
