// OperatorApp.jsx — اپ تکنیسین استخر v2

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { getPoolStatus, formatEUR, monthStartISO } from "./poolUtils";
import OperatorLogForm from "./OperatorLogForm";
import { OP_LANG } from "./opTranslations";

const LANGS = [
  { key:"en", label:"EN" },
  { key:"ru", label:"RU" },
  { key:"tr", label:"TR" },
  { key:"ur", label:"UR" },
];

const CHEM_PRICES = { qty_klor56:3.60, qty_klor90:3.80, qty_floc:1.35, qty_algae:1.50, qty_clarify:1.40, qty_klor_sivi:1.00, qty_asit:0.85 };

export default function OperatorApp({ user }) {
  const userEmail = user?.email || "";
  const [lang,       setLang]       = useState(() => localStorage.getItem("op-lang") || "en");
  const [theme,      setTheme]      = useState(() => localStorage.getItem("stocktrack-theme") || "dark");
  const [me,         setMe]         = useState(null);
  const [pools,      setPools]      = useState([]);
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [activePool, setActivePool] = useState(null);

  const t = OP_LANG[lang] || OP_LANG.en;
  const isDark = theme === "dark";
  const isRTL = lang === "ur";

  useEffect(() => {
    const h = () => setTheme(localStorage.getItem("stocktrack-theme") || "dark");
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  useEffect(() => { load(); }, [userEmail]);

  function saveLang(l) { setLang(l); localStorage.setItem("op-lang", l); }

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: op, error: e1 } = await supabase
        .from("pool_operators").select("*").ilike("email", userEmail).maybeSingle();
      if (e1) throw e1;
      if (!op) throw new Error(t.notOperator);
      if (op.is_active === false) throw new Error("Account deactivated.");
      setMe(op);

      const { data: ps, error: e2 } = await supabase
        .from("pools").select("*").eq("operator_id", op.id).eq("is_active", true).order("name");
      if (e2) throw e2;
      setPools(ps || []);

      if (ps?.length) {
        const { data: ls, error: e3 } = await supabase
          .from("pool_chemical_logs").select("*")
          .in("pool_id", ps.map(p => p.id))
          .gte("log_date", monthStartISO())
          .order("log_date", { ascending: false });
        if (e3) throw e3;
        setLogs(ls || []);
      }
    } catch(e) { setError(e.message || String(e)); }
    finally { setLoading(false); }
  }

  // Colors
  const C = isDark ? {
    bg:"#0a0f1e", bgCard:"#111827", bgInput:"#0e1525",
    header:"#0d1424", border:"#1e2d4a", divider:"#162039",
    text:"#f0f4ff", textH:"#ffffff", textM:"#8892b0",
    accent:"#818cf8", accentBg:"rgba(99,102,241,0.15)", accentBorder:"#3730a3",
    green:"#10b981", amber:"#f59e0b", red:"#ef4444", gray:"#64748b",
  } : {
    bg:"#f0f4ff", bgCard:"#ffffff", bgInput:"#f8faff",
    header:"#ffffff", border:"#dde3f4", divider:"#eef1f9",
    text:"#0d1530", textH:"#050d24", textM:"#6b7592",
    accent:"#6366f1", accentBg:"rgba(99,102,241,0.08)", accentBorder:"#c7d2fe",
    green:"#059669", amber:"#d97706", red:"#dc2626", gray:"#94a3b8",
  };

  const font = isRTL ? "'Noto Nastaliq Urdu',serif" : "Inter,'Segoe UI',sans-serif";

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:font }}>
      <div style={{ color:C.accent, fontSize:18 }}>⏳</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:font }}>
      <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:32, maxWidth:400, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
        <div style={{ color:C.red, fontSize:14, lineHeight:1.6, marginBottom:16 }}>{error}</div>
        <div style={{ color:C.textM, fontSize:11, marginBottom:20 }}>{userEmail}</div>
        <button onClick={() => supabase.auth.signOut()} style={{ background:C.accentBg, color:C.accent, border:`1px solid ${C.accentBorder}`, borderRadius:10, padding:"10px 24px", fontSize:13, cursor:"pointer", fontFamily:font }}>
          {t.signOut}
        </button>
      </div>
    </div>
  );

  if (activePool) return (
    <OperatorLogForm
      pool={activePool} operator={me}
      lang={lang} t={t} C={C} isRTL={isRTL} font={font}
      onCancel={() => setActivePool(null)}
      onSaved={() => { setActivePool(null); load(); }}
    />
  );

  const totalBaseline = pools.reduce((s,p) => s + getPoolStatus(p,[]).baselineMonthly, 0);
  const totalActual   = pools.reduce((s,p) => s + getPoolStatus(p,logs).actualCost, 0);

  const statusColor = (label) =>
    label==="OK" ? C.green : label==="Watch" ? C.amber : label==="HIGH" ? C.red : C.gray;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:font, direction:isRTL?"rtl":"ltr", color:C.text }}>

      {/* Header */}
      <div style={{ background:C.header, borderBottom:`1px solid ${C.border}`, padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:50, gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>🏊</span>
          <span style={{ fontWeight:700, fontSize:15, color:C.textH }}>{t.appTitle}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          {LANGS.map(l => (
            <button key={l.key} onClick={() => saveLang(l.key)} style={{
              background: lang===l.key ? C.accent : "transparent",
              color: lang===l.key ? "#fff" : C.textM,
              border:`1px solid ${lang===l.key ? C.accent : C.border}`,
              borderRadius:6, padding:"3px 8px", fontSize:11, fontWeight:700,
              cursor:"pointer", fontFamily:font,
            }}>{l.label}</button>
          ))}
          <div style={{ background:C.accentBg, color:C.accent, border:`1px solid ${C.accentBorder}`, borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600 }}>
            👤 {me?.full_name?.split(" ")[0]}
          </div>
          <button onClick={() => supabase.auth.signOut()} title={t.signOut} style={{ background:"transparent", color:C.red, border:`1px solid rgba(239,68,68,0.3)`, borderRadius:8, padding:"5px 10px", fontSize:13, cursor:"pointer" }}>
            ↩
          </button>
        </div>
      </div>

      <div style={{ maxWidth:760, margin:"0 auto", padding:"20px 16px 60px" }}>

        {/* Summary */}
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 18px", marginBottom:20, fontSize:13, color:C.textM, lineHeight:1.9 }}>
          {t.manages} <b style={{ color:C.textH }}>{pools.length}</b> {t.pools} ·{" "}
          {t.thisMonth}: <b style={{ color:C.textH }}>{logs.length}</b> {logs.length===1?t.logCount:t.logsCount} ·{" "}
          {t.spent} <b style={{ color:C.accent }}>{formatEUR(totalActual)}</b> {t.of} <b style={{ color:C.textH }}>{formatEUR(totalBaseline)}</b> {t.baseline}
        </div>

        {/* Section label */}
        <div style={{ fontSize:11, fontWeight:700, color:C.textM, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>
          {t.myPools}
        </div>

        {/* Pool cards */}
        {pools.length === 0 ? (
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:40, textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🏊</div>
            <div style={{ fontSize:14, color:C.textM, marginBottom:6 }}>{t.notAssigned}</div>
            <div style={{ fontSize:12, color:C.textM }}>{t.contactAdmin}</div>
          </div>
        ) : pools.map(p => {
          const st = getPoolStatus(p, logs);
          const sc = statusColor(st.label);
          return (
            <div key={p.id}
              onClick={() => setActivePool(p)}
              style={{
                background:C.bgCard,
                border:`2px solid ${st.label==="HIGH" ? C.red+"aa" : st.label==="Watch" ? C.amber+"aa" : C.border}`,
                borderRadius:14, padding:"18px 20px", marginBottom:12,
                cursor:"pointer", transition:"all .15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.transform="translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=st.label==="HIGH"?C.red+"aa":st.label==="Watch"?C.amber+"aa":C.border; e.currentTarget.style.transform=""; }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:C.textH, marginBottom:4 }}>{p.name}</div>
                  <div style={{ fontSize:12, color:C.textM }}>
                    {Number(p.volume_m3||0).toLocaleString()} m³ · {p.pool_type}
                    {st.logCount > 0 && ` · ${st.logCount} ${st.logCount===1?t.logCount:t.logsCount}`}
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, flexShrink:0 }}>
                  <div style={{ background:sc+"22", color:sc, border:`1px solid ${sc}55`, borderRadius:10, padding:"3px 12px", fontSize:12, fontWeight:700 }}>
                    {st.label}
                  </div>
                  <div style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", borderRadius:10, padding:"9px 18px", fontSize:13, fontWeight:700, boxShadow:"0 4px 12px rgba(99,102,241,0.3)" }}>
                    ➕ {t.tapToLog}
                  </div>
                </div>
              </div>

              {st.pct > 0 && (
                <div style={{ marginTop:14 }}>
                  <div style={{ height:8, background:C.bgInput, borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:Math.min(st.pct,100)+"%", background:`linear-gradient(90deg,${sc},${sc}cc)`, borderRadius:4, transition:"width .4s" }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.textM, marginTop:5 }}>
                    <span>{t.actual}: {formatEUR(st.actualCost)}</span>
                    <span>{st.pct}% {t.of} {t.expected}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Recent logs */}
        {logs.length > 0 && <>
          <div style={{ fontSize:11, fontWeight:700, color:C.textM, letterSpacing:"0.1em", textTransform:"uppercase", margin:"24px 0 12px" }}>
            {t.recentActivity}
          </div>
          {logs.slice(0,6).map(l => {
            const pool = pools.find(p => p.id === l.pool_id);
            const cost = Object.keys(CHEM_PRICES).reduce((s,k) => s+(Number(l[k])||0)*CHEM_PRICES[k], 0);
            return (
              <div key={l.id} style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:C.textH }}>{pool?.name||`#${l.pool_id}`}</div>
                  <div style={{ fontSize:12, color:C.textM, marginTop:2 }}>{l.log_date}</div>
                </div>
                <div style={{ fontWeight:700, color:C.accent, fontSize:15 }}>{formatEUR(cost)}</div>
              </div>
            );
          })}
        </>}

      </div>
    </div>
  );
}
