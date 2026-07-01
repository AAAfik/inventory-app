// OperatorLogForm.jsx — فرم ثبت شیمیایی v2

import { useState, useMemo } from "react";
import { supabase } from "../../supabase";
import { POOL_CHEMICALS, formatEUR } from "./poolUtils";
import { uploadPoolPhoto } from "./imageUtils";
import CameraInput from "./CameraInput";

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

export default function OperatorLogForm({ pool, operator, lang, t, C, isRTL, font, onSaved, onCancel }) {
  const [step,            setStep]            = useState(1);
  const [date,            setDate]            = useState(todayISO());
  const [qty,             setQty]             = useState({});
  const [ph,              setPh]              = useState("");
  const [cl,              setCl]              = useState("");
  const [notes,           setNotes]           = useState("");
  const [withdrawalBlob,  setWithdrawalBlob]  = useState(null);
  const [consumptionBlob, setConsumptionBlob] = useState(null);
  const [saving,          setSaving]          = useState(false);
  const [feedback,        setFeedback]        = useState(null);

  const totalCost = useMemo(
    () => POOL_CHEMICALS.reduce((s,c) => s + (Number(qty[c.key])||0) * c.price, 0),
    [qty]
  );
  const hasQty = POOL_CHEMICALS.some(c => Number(qty[c.key]) > 0);
  const photosOK = !!withdrawalBlob && !!consumptionBlob;

  async function save() {
    if (!hasQty || !photosOK) { setFeedback({ type:"err", msg: !hasQty ? t.atLeastOne : t.photoRequired }); return; }
    setSaving(true); setFeedback(null);
    try {
      const [wp, cp] = await Promise.all([
        uploadPoolPhoto(withdrawalBlob,  { poolId:pool.id, kind:"withdrawal" }),
        uploadPoolPhoto(consumptionBlob, { poolId:pool.id, kind:"consumption" }),
      ]);
      const row = {
        pool_id: pool.id, log_date: date,
        ph_reading: ph==="" ? null : Number(ph),
        cl_ppm:     cl==="" ? null : Number(cl),
        notes: notes.trim()||null,
        withdrawal_photo: wp, consumption_photo: cp,
      };
      POOL_CHEMICALS.forEach(c => { row[c.key] = Number(qty[c.key])||0; });
      const { error } = await supabase.from("pool_chemical_logs").insert([row]);
      if (error) throw error;
      setFeedback({ type:"ok", msg: t.saved });
      setTimeout(() => onSaved?.(), 1000);
    } catch(e) {
      setFeedback({ type:"err", msg: e.message || String(e) });
    } finally { setSaving(false); }
  }

  // ─── styles ──────────────────────────────────────────────────────
  const page = { minHeight:"100vh", background:C.bg, fontFamily: font || "Inter,sans-serif", direction:isRTL?"rtl":"ltr", color:C.text };
  const header = { background:C.header, borderBottom:`1px solid ${C.border}`, padding:"12px 20px", display:"flex", alignItems:"center", gap:14, position:"sticky", top:0, zIndex:50 };
  const backBtn = { background:C.bgInput, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"8px 14px", fontSize:16, cursor:"pointer", fontFamily:"inherit" };
  const content = { maxWidth:700, margin:"0 auto", padding:"20px 16px 120px" };

  const stepRow = { display:"flex", gap:6, marginBottom:22 };
  const stepPill = (s) => ({
    flex:1, padding:"9px 6px",
    background: step>s ? C.green+"22" : step===s ? C.accentBg : C.bgInput,
    color: step>s ? C.green : step===s ? C.accent : C.textM,
    border:`1px solid ${step>s ? C.green+"55" : step===s ? C.accentBorder : C.border}`,
    borderRadius:8, fontSize:12, fontWeight:700, textAlign:"center",
  });

  const label = { display:"block", fontSize:11, fontWeight:700, color:C.textM, marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" };
  const inputS = { background:C.bgInput, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"10px 14px", fontSize:14, fontFamily:"inherit", width:"100%", boxSizing:"border-box", outline:"none" };
  const textarea = { ...inputS, minHeight:60, resize:"vertical" };
  const card = { background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:16 };
  const secTitle = { fontSize:11, fontWeight:700, color:C.textM, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12, marginTop:20 };

  // chemical row
  const chemRow = (last) => ({
    display:"flex", alignItems:"center", gap:10, padding:"12px 0",
    borderBottom: last ? "none" : `1px solid ${C.divider}`,
  });
  const qtyWrap = { display:"flex", alignItems:"stretch", width:140, flexShrink:0 };
  const qtyInput = { flex:1, background:C.bgInput, border:`1px solid ${C.border}`, borderRight:"none", borderRadius:"8px 0 0 8px", color:C.text, padding:"10px 8px", fontSize:16, outline:"none", textAlign:"right", fontFamily:"inherit", width:"100%" };
  const unitBox  = { display:"flex", alignItems:"center", padding:"0 10px", background:C.bgInput, border:`1px solid ${C.border}`, borderLeft:"none", borderRadius:"0 8px 8px 0", color:C.textM, fontSize:12, fontWeight:700, whiteSpace:"nowrap" };

  // sticky footer
  const footer = { position:"fixed", bottom:0, left:0, right:0, background:C.header, borderTop:`1px solid ${C.border}`, padding:"12px 20px", display:"flex", alignItems:"center", gap:12, zIndex:10 };
  const costWrap = { flex:1 };
  const costLabel = { fontSize:10, color:C.textM, textTransform:"uppercase", letterSpacing:"0.06em" };
  const costVal = { fontSize:20, fontWeight:800, color:C.accent };
  const nextBtn = (ok) => ({ background: ok ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : C.bgInput, color: ok ? "#fff" : C.textM, border:"none", borderRadius:10, padding:"12px 24px", fontSize:14, fontWeight:700, cursor:ok?"pointer":"default", fontFamily:"inherit", opacity:ok?1:0.55, boxShadow:ok?"0 4px 12px rgba(99,102,241,0.3)":"none", minWidth:120 });
  const backSmall = { background:C.bgInput, border:`1px solid ${C.border}`, borderRadius:8, color:C.textM, padding:"10px 14px", fontSize:13, cursor:"pointer", fontFamily:"inherit" };

  const toast = (type) => ({ position:"fixed", left:16, right:16, bottom:80, zIndex:20, padding:"14px 18px", borderRadius:12, fontSize:14, fontWeight:600, background:type==="ok"?"#10b981":"#ef4444", color:"#fff", textAlign:"center", boxShadow:"0 8px 24px rgba(0,0,0,0.25)" });

  // ─── render ──────────────────────────────────────────────────────
  return (
    <div style={page}>
      {/* Header */}
      <div style={header}>
        <button onClick={onCancel} style={backBtn}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:17, fontWeight:700, color:C.textH }}>{pool.name}</div>
          <div style={{ fontSize:12, color:C.textM }}>{Number(pool.volume_m3||0).toLocaleString()} m³ · {t.logChemical}</div>
        </div>
      </div>

      <div style={content}>
        {/* Steps */}
        <div style={stepRow}>
          {[1,2,3].map(s => (
            <div key={s} style={stepPill(s)}>
              {s===1?`1. ${t.step1}`:s===2?`2. ${t.step2}`:`3. ${t.step3}`}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step===1 && <>
          <div style={{ marginBottom:16 }}>
            <label style={label}>{t.date}</label>
            <input type="date" value={date} max={todayISO()} onChange={e=>setDate(e.target.value)} style={inputS} />
          </div>

          <div style={secTitle}>{t.chemUsed}</div>
          <div style={card}>
            {POOL_CHEMICALS.map((c,i) => (
              <div key={c.key} style={chemRow(i===POOL_CHEMICALS.length-1)}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.textH }}>{c.label}</div>
                  <div style={{ fontSize:11, color:C.textM }}>€{c.price.toFixed(2)} / {c.unit}</div>
                </div>
                <div style={qtyWrap}>
                  <input type="number" min="0" step="0.1" inputMode="decimal" placeholder="0"
                    value={qty[c.key]||""}
                    onChange={e => setQty(q=>({...q,[c.key]:e.target.value}))}
                    style={qtyInput}
                  />
                  <span style={unitBox}>{c.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={secTitle}>{t.waterReading} <span style={{ color:C.textM, fontWeight:400, textTransform:"none", letterSpacing:0 }}>— {t.optional}</span></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div>
              <label style={label}>{t.ph}</label>
              <input type="number" inputMode="decimal" min="0" max="14" step="0.1" placeholder="7.4" value={ph} onChange={e=>setPh(e.target.value)} style={inputS} />
            </div>
            <div>
              <label style={label}>{t.cl}</label>
              <input type="number" inputMode="decimal" min="0" step="0.1" placeholder="1.5" value={cl} onChange={e=>setCl(e.target.value)} style={inputS} />
            </div>
          </div>
        </>}

        {/* STEP 2 */}
        {step===2 && <>
          <div style={card}>
            <CameraInput TH={{...C, bgInput:C.bgInput, border:C.border, textMuted:C.textM, text:C.text}} label={t.photo_withdrawal} required onChange={setWithdrawalBlob} />
          </div>
          <div style={card}>
            <CameraInput TH={{...C, bgInput:C.bgInput, border:C.border, textMuted:C.textM, text:C.text}} label={t.photo_consumption} required onChange={setConsumptionBlob} />
          </div>

          <div style={{ ...card, marginTop:4 }}>
            <label style={label}>{t.notes} <span style={{ color:C.textM, fontWeight:400, textTransform:"none", letterSpacing:0 }}>— {t.optional}</span></label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder={t.notesPlaceholder} style={textarea} />
          </div>
        </>}

        {/* STEP 3 */}
        {step===3 && <>
          <div style={card}>
            <div style={{ marginBottom:14 }}>
              <div style={{ ...label, marginBottom:4 }}>{t.pool}</div>
              <div style={{ fontSize:16, fontWeight:700, color:C.textH }}>{pool.name}</div>
              <div style={{ fontSize:12, color:C.textM }}>{Number(pool.volume_m3||0).toLocaleString()} m³</div>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ ...label, marginBottom:4 }}>{t.date}</div>
              <div style={{ fontSize:14 }}>{date}</div>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ ...label, marginBottom:8 }}>{t.chemUsed}</div>
              {POOL_CHEMICALS.filter(c=>Number(qty[c.key])>0).map(c=>(
                <div key={c.key} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"4px 0", borderBottom:`1px solid ${C.divider}` }}>
                  <span style={{ color:C.textM }}>{c.label}</span>
                  <span style={{ fontWeight:600 }}>{Number(qty[c.key])} {c.unit} = {formatEUR(Number(qty[c.key])*c.price)}</span>
                </div>
              ))}
            </div>
            {(ph||cl) && (
              <div style={{ display:"flex", gap:20, fontSize:13, marginBottom:14 }}>
                {ph && <span>pH: <b>{ph}</b></span>}
                {cl && <span>Cl: <b>{cl} ppm</b></span>}
              </div>
            )}
            {notes && <div style={{ fontSize:13, color:C.textM, lineHeight:1.5 }}>{notes}</div>}
            <div style={{ fontSize:11, color:C.textM, marginTop:10, display:"flex", gap:10 }}>
              <span>📦 {withdrawalBlob ? `${Math.round(withdrawalBlob.size/1024)} KB` : "—"}</span>
              <span>🏊 {consumptionBlob ? `${Math.round(consumptionBlob.size/1024)} KB` : "—"}</span>
            </div>
          </div>
        </>}
      </div>

      {/* Toast */}
      {feedback && <div style={toast(feedback.type)}>{feedback.type==="ok"?"✓ ":"⚠ "}{feedback.msg}</div>}

      {/* Footer */}
      <div style={footer}>
        <div style={costWrap}>
          <div style={costLabel}>{t.total}</div>
          <div style={costVal}>{formatEUR(totalCost)}</div>
        </div>
        {step>1 && <button onClick={()=>setStep(step-1)} style={backSmall}>{t.back}</button>}
        {step===1 && <button onClick={()=>hasQty&&setStep(2)} disabled={!hasQty} style={nextBtn(hasQty)}>{t.next} →</button>}
        {step===2 && <button onClick={()=>photosOK&&setStep(3)} disabled={!photosOK} style={nextBtn(photosOK)}>{t.next} →</button>}
        {step===3 && <button onClick={save} disabled={saving} style={nextBtn(!saving)}>{saving?t.saving:t.save}</button>}
      </div>
    </div>
  );
}
