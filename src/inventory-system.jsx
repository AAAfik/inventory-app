import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import DashboardTab from "./DashboardTab";
import UsersTab from "./UsersTab";
import WarehouseHub from "./warehouse/WarehouseHub";
import InspectionHub from "./inspection/InspectionHub";
import PoolControlHub from "./pools/PoolControlHub";
import ProcureHub from "./procurement/ProcureHub";
import ProcurementHub from "./procurement/ProcurementHub";
import MaintenanceTracker from "./maintenance/MaintenanceTracker";
import PWAInstall from "./PWAInstall";
import { tr } from "./i18n";

// ─── Feature flags ──────────────────────────────────────────────────
const WAREHOUSE_ENABLED  = true;
const INSPECTION_ENABLED = true;
const POOLS_ENABLED      = true;
const PROCURE_ENABLED    = true;
const REQUESTS_ENABLED   = true;
const MAINTENANCE_ENABLED = true;

// Hezi's account (maintenance tracker is gated to him + admin)
const HEZI_EMAILS = ["hezicaesar@gmail.com"];

// Superadmin bootstrap: only YOU. Never locked out even if DB roles fail.
// Everyone else (including Hezi, Anzhela) is controlled purely by DB roles.
const ADMIN_EMAILS = [
  "alireza.ariyannekoo@afikgroup.com",
];

// ─── Themes ─────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:"#0A1020", bgElev:"#141E33", bgCard:"#111A2C", bgInput:"#18233A", bgHover:"#1D2942",
    text:"#E6E9F0", textMuted:"#8A94A8", textDim:"#5B6478", textHeading:"#F4F6FA",
    border:"#212D47", borderStrong:"#2F3D5C", divider:"#19233A",
    sidebar:"linear-gradient(180deg, #0E1526 0%, #0A1020 100%)", sidebarBorder:"#212D47",
    header:"rgba(10,16,32,0.94)", headerBorder:"#212D47",
    accent:"#C9A960", accentText:"#D8BE84",
    accentBg:"rgba(201,169,96,.12)", accentBorder:"rgba(201,169,96,.30)",
    deep:"#16233D", deepBorder:"#26365A", onDeep:"#FFFFFF", onDeepMuted:"#95A1B8",
    shadow:"0 1px 3px rgba(0,0,0,.55)", shadowLg:"0 16px 48px rgba(0,0,0,.60)",
    cardGlow:"0 0 0 1px rgba(201,169,96,.06), 0 8px 30px rgba(0,0,0,.40)",
    ok:"#7FB069", okBg:"rgba(127,176,105,.14)",
    warn:"#D9A54C", warnBg:"rgba(217,165,76,.14)",
    danger:"#D97757", dangerBg:"rgba(217,119,87,.14)",
    info:"#6E93C8", infoBg:"rgba(110,147,200,.14)",
  },
  light: {
    bg:"#F6F5F1", bgElev:"#FFFFFF", bgCard:"#FFFFFF", bgInput:"#F1F0EB", bgHover:"#EDECE5",
    text:"#16233D", textMuted:"#5C6779", textDim:"#98A0AE", textHeading:"#0F1A30",
    border:"#E2E0D8", borderStrong:"#CBC8BC", divider:"#EDEBE4",
    sidebar:"linear-gradient(180deg, #FFFFFF 0%, #FAF9F5 100%)", sidebarBorder:"#E2E0D8",
    header:"rgba(255,255,255,0.94)", headerBorder:"#E2E0D8",
    accent:"#A8894A", accentText:"#8C7139",
    accentBg:"rgba(168,137,74,.10)", accentBorder:"rgba(168,137,74,.30)",
    deep:"#16233D", deepBorder:"#26365A", onDeep:"#FFFFFF", onDeepMuted:"#9AA5BC",
    shadow:"0 1px 2px rgba(22,35,61,.06)", shadowLg:"0 16px 48px rgba(22,35,61,.16)",
    cardGlow:"0 1px 2px rgba(22,35,61,.04), 0 6px 24px rgba(22,35,61,.06)",
    ok:"#4E7B3A", okBg:"rgba(78,123,58,.10)",
    warn:"#8A6520", warnBg:"rgba(138,101,32,.10)",
    danger:"#A8492A", dangerBg:"rgba(168,73,42,.10)",
    info:"#2F4E7E", infoBg:"rgba(47,78,126,.10)",
  },
};

// Global polish CSS injected once
if (typeof document !== 'undefined' && !document.getElementById('caesar-polish')) {
  const st = document.createElement('style');
  st.id = 'caesar-polish';
  st.textContent = `
    * { scrollbar-width: thin; scrollbar-color: rgba(22,35,61,.22) transparent; }
    *::-webkit-scrollbar { width: 8px; height: 8px; }
    *::-webkit-scrollbar-thumb { background: rgba(22,35,61,.20); border-radius: 8px; }
    *::-webkit-scrollbar-thumb:hover { background: rgba(22,35,61,.38); }
    *::-webkit-scrollbar-track { background: transparent; }
    button { transition: background .15s ease, border-color .15s ease, color .15s ease, transform .12s ease, box-shadow .15s ease; }
    button:active { transform: scale(.985); }
    input, select, textarea { transition: border-color .15s ease, box-shadow .15s ease; }
    input:focus, select:focus, textarea:focus { border-color: rgba(168,137,74,.55) !important; box-shadow: 0 0 0 3px rgba(168,137,74,.12); }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    main > * { animation: fadeUp .22s ease; }
    h1, h2, h3 { font-weight: 500; }
  `;
  document.head.appendChild(st);
}

const NAV_GROUPS = [
  { key: "overview",     items: ["dashboard"] },
  ...(WAREHOUSE_ENABLED  ? [{ key: "warehouseGroup",  items: ["warehouse"] }]  : []),
  ...(INSPECTION_ENABLED ? [{ key: "inspectionGroup", items: ["inspection"] }] : []),
  ...(POOLS_ENABLED      ? [{ key: "poolGroup",       items: ["pools"] }]      : []),
  ...(PROCURE_ENABLED    ? [{ key: "procurement",     items: ["procure"] }]    : []),
  ...(REQUESTS_ENABLED   ? [{ key: "requestsGroup",   items: ["requests"] }]   : []),
  ...(MAINTENANCE_ENABLED ? [{ key: "maintenanceGroup", items: ["maintenance"] }] : []),
  { key: "adminGroup",   items: ["users"] },
];

const TAB_ICONS = {
  dashboard:  "◇",
  warehouse:  "▣",
  inspection: "◎",
  pools:      "≋",
  procure:    "◈",
  requests:   "▤",
  maintenance:"⚒",
  users:      "◍",
};

// Local label overrides (bypass i18n for renamed modules)
const LABEL_OVERRIDES = {
  warehouse: "Asset Management",
  requests:  "Requests",
  maintenance: "Maintenance Tracker",
};
const GROUP_LABEL_OVERRIDES = {
  warehouseGroup: "ASSET MANAGEMENT",
  requestsGroup:  "REQUESTS",
  maintenanceGroup: "MAINTENANCE",
};

// ═══════════════════════════════════════════════════════════════════
// Main app
// ═══════════════════════════════════════════════════════════════════
export default function InventorySystem() {
  const [session, setSession]     = useState(null);
  const [checking, setChecking]   = useState(true);
  const [tab, setTab]             = useState("dashboard");
  const [theme, setTheme]         = useState(() => localStorage.getItem("caesarTheme") || "dark");
  const [lang, setLang]           = useState(() => localStorage.getItem("caesarLang") || "en");
  const [now, setNow]             = useState(new Date());
  const [userRoles, setUserRoles] = useState([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [isMobile, setIsMobile]   = useState(() => typeof window !== 'undefined' ? window.innerWidth < 900 : false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const TH = THEMES[theme];
  const t  = tr(lang);
  const isRTL = lang === 'he' || lang === 'fa';

  const email    = session?.user?.email || "";
  const isHezi   = HEZI_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase())
                   || userRoles.includes("approver_level_2");
  const isAdmin  = (ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase())
                   || userRoles.includes("owner") || userRoles.includes("auditor"))
                   && !isHezi;   // Hezi is never treated as admin, even if also listed
  const isOwner  = isAdmin;

  // Role-based access.
  // Hezi sees ONLY the Maintenance Tracker; everyone else never sees it.
  const canSeeDashboard  = isOwner && !isHezi;
  const canSeeWarehouse  = (isOwner || userRoles.includes("warehouse_keeper")) && !isHezi;
  const canSeeInspection = (isOwner || userRoles.includes("inspector")) && !isHezi;
  const canSeePools      = (isOwner || userRoles.includes("pool_operator")) && !isHezi;
  const canSeeProcure    = (isOwner || [
    "procurement_officer","deputy_officer","dept_head","operator",
    "finance_officer","approver_mid","approver_high",
  ].some(r => userRoles.includes(r))) && !isHezi;
  const canSeeUsers      = isOwner && !isHezi;
  // Requests visible to everyone signed in EXCEPT Hezi (who only gets maintenance)
  const canSeeRequests   = !isHezi;
  // Maintenance tracker: ONLY Hezi
  const canSeeMaintenance = isHezi;

  const allTabs = [
    ...(canSeeDashboard                        ? ["dashboard"]  : []),
    ...(WAREHOUSE_ENABLED  && canSeeWarehouse  ? ["warehouse"]  : []),
    ...(INSPECTION_ENABLED && canSeeInspection ? ["inspection"] : []),
    ...(POOLS_ENABLED      && canSeePools      ? ["pools"]      : []),
    ...(PROCURE_ENABLED    && canSeeProcure    ? ["procure"]    : []),
    ...(REQUESTS_ENABLED   && canSeeRequests   ? ["requests"]   : []),
    ...(MAINTENANCE_ENABLED && canSeeMaintenance ? ["maintenance"] : []),
    ...(canSeeUsers                            ? ["users"]      : []),
  ];

  // ─── Auth session ───────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ─── Load roles ─────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.user) { setUserRoles([]); setRolesLoaded(true); return; }
    (async () => {
      try {
        const { data } = await supabase.schema('procure').rpc('my_roles');
        setUserRoles(Array.isArray(data) ? data : []);
      } catch {
        setUserRoles([]);
      } finally {
        setRolesLoaded(true);
      }
    })();
  }, [session?.user?.id]);

  // ─── Live clock ─────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Mobile detect ──────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      const m = window.innerWidth < 900;
      setIsMobile(m);
      if (!m) setSidebarOpen(true);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ─── Auto-pick first accessible tab if current one isn't allowed ─
  useEffect(() => {
    if (!rolesLoaded) return;
    if (!allTabs.includes(tab)) {
      setTab(allTabs[0] || "dashboard");
    }
  }, [rolesLoaded, allTabs.join(","), tab]);

  useEffect(() => localStorage.setItem("caesarTheme", theme), [theme]);
  useEffect(() => localStorage.setItem("caesarLang", lang), [lang]);

  // ─── Login screen ───────────────────────────────────────────────
  if (checking) {
    return <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:TH.bg, color:TH.text, fontFamily:"'Inter',system-ui,sans-serif"}}>Loading... </div>;
  }
  if (!session) return <LoginScreen TH={TH} onSignedIn={setSession} />;
  if (!rolesLoaded) return <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:TH.bg, color:TH.text}}>{t.loadingRoles}</div>;

  // ─── Layout ─────────────────────────────────────────────────────
  const dt = now;
  const dateStr = dt.toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
  const timeStr = dt.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

  return ( <div dir={isRTL?"rtl":"ltr"} style={{
      display:"flex", flexDirection:"column", minHeight:"100vh",
      background:TH.bg, color:TH.text,
      fontFamily: lang==="fa" ? "'Vazirmatn','Tahoma',sans-serif" : lang==="he" ? "'Heebo','Arial',sans-serif" : "'Inter','Segoe UI',system-ui,sans-serif",
    }}>{/* ═══ HEADER ═══ */} <header style={{
        position:"sticky", top:0, zIndex:100,
        background:TH.header,
        backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)",
        borderBottom:`1px solid ${TH.headerBorder}`,
        boxShadow:"0 1px 0 rgba(184,147,90,.15)",
        height:isMobile?54:62,
        display:"flex", alignItems:"center",
        padding:isMobile?"0 12px":"0 24px",
        gap:isMobile?8:16, flexShrink:0,
      }}>{isMobile && ( <button onClick={()=>setSidebarOpen(v=>!v)} style={{background:"transparent",border:"none",color:TH.text,fontSize:22,cursor:"pointer",padding:"4px 8px"}}></button>)} <div style={{display:"flex", alignItems:"center", gap:12}}><div style={{
            height:isMobile?38:48,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}><img src="/caesar-logo.png" alt="Caesar Projects" style={{height:"100%", width:"auto", objectFit:"contain", display:"block"}}
                 onError={(e)=>{ e.target.style.display='none'; e.target.parentNode.innerHTML='<span style="color:'+TH.accent+';font-weight:800;font-family:Georgia,serif;font-size:20px">CAESAR</span>'; }} /></div>{!isMobile && <div style={{fontSize:11, color:"#B8935A", fontWeight:700, letterSpacing:"0.14em"}}>● LIVE</div>} </div><div style={{flex:1}} />{!isMobile && ( <div style={{fontFamily:"monospace", fontSize:13, color:TH.textMuted}}>{dateStr} <span style={{color:TH.text, fontWeight:700}}>{timeStr}</span></div>)} <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{
          background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:20,
          color:TH.text, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit",
          display:"flex", alignItems:"center", gap:6,
        }}>{theme==="dark" ? "Dark" : "Light"} </button><div style={{display:"flex", gap:2, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:20, padding:2}}>{["en","he","fa"].map(l=>( <button key={l} onClick={()=>setLang(l)} style={{
              background: lang===l ? "linear-gradient(135deg,#B8935A,#8B7040)" : "transparent",
              border:"none", borderRadius:16, color: lang===l?"#000":TH.textMuted,
              padding:"5px 12px", cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit",
              textTransform:"uppercase",
            }}>{l}</button>))} </div>{!isMobile && ( <div style={{display:"flex", alignItems:"center", gap:10, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:24, padding:"4px 14px 4px 4px"}}><div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#B8935A,#8B7040)",display:"flex",alignItems:"center",justifyContent:"center",color:"#000",fontWeight:800,fontSize:13}}>{(email[0]||"?").toUpperCase()} </div><div><div style={{fontSize:12, fontWeight:700, color:TH.text, lineHeight:1.2}}>{isAdmin?"Admin":"User"}</div><div style={{fontSize:10, color:TH.textMuted, lineHeight:1.2}}>{email}</div></div></div>)} <button onClick={async ()=>{ await supabase.auth.signOut(); }} style={{
          background:"transparent", border:`1px solid ${TH.border}`, borderRadius:20,
          color:TH.text, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit",
        }}> Logout</button></header><div style={{display:"flex", flex:1, minHeight:0}}>{/* ═══ SIDEBAR ═══ */}
        {sidebarOpen && ( <aside style={{
            width: isMobile ? "80vw" : 260,
            maxWidth: 280,
            background: TH.sidebar,
            borderRight: `1px solid ${TH.sidebarBorder}`,
            padding:"18px 0",
            display:"flex", flexDirection:"column",
            position: isMobile ? "fixed" : "sticky",
            top: isMobile ? 54 : 62, bottom: 0, left: isRTL ? undefined : 0, right: isRTL ? 0 : undefined,
            zIndex: isMobile ? 90 : 5,
            height: isMobile ? "calc(100vh - 54px)" : "auto",
            overflowY:"auto",
          }}>{NAV_GROUPS.filter(g => g.items.some(k => allTabs.includes(k))).map(group => ( <div key={group.key} style={{marginBottom:16, padding:"0 12px"}}><div style={{padding:"0 12px 8px", color:TH.textDim, fontSize:9.5, fontWeight:800, letterSpacing:"0.16em"}}>{GROUP_LABEL_OVERRIDES[group.key] || (t[group.key]||group.key).toUpperCase()} </div>{group.items.filter(k=>allTabs.includes(k)).map(k=>{
                  const active = tab===k;
                  return ( <button key={k} onClick={()=>{ setTab(k); if(isMobile) setSidebarOpen(false); }} style={{
                      display:"flex", alignItems:"center", gap:11, width:"100%",
                      padding:"10px 12px", marginBottom:2,
                      background: active ? "linear-gradient(135deg, rgba(184,147,90,.16), rgba(139,122,68,.08))" : "transparent",
                      border: active ? "1px solid rgba(184,147,90,.35)" : "1px solid transparent",
                      borderRadius:11,
                      color: active ? TH.accent : TH.textMuted,
                      cursor:"pointer", fontSize:13, textAlign:"left", fontFamily:"inherit",
                      fontWeight: active ? 700 : 500,
                      boxShadow: active ? "0 2px 10px rgba(184,147,90,.10)" : "none",
                    }}
                    onMouseEnter={e=>{ if(!active) e.currentTarget.style.background = TH.bgHover; }}
                    onMouseLeave={e=>{ if(!active) e.currentTarget.style.background = "transparent"; }}><span style={{fontSize:14, width:20, textAlign:"center", flexShrink:0, opacity: active ? 1 : 0.5}}>{TAB_ICONS[k]}</span><span style={{flex:1}}>{LABEL_OVERRIDES[k] || t[k] || k}</span>{active && <span style={{width:5, height:5, borderRadius:3, background:"#B8935A", flexShrink:0}}/>} </button>);
                })} </div>))} <div style={{flex:1}} /><div style={{padding:"12px"}}><PWAInstall TH={TH} isMobile={isMobile} /></div></aside>)}

        {/* ═══ MAIN ═══ */} <main style={{flex:1, minWidth:0, padding: isMobile?"14px 12px":"22px 26px", overflow:"auto"}}>{allTabs.length === 0 && ( <div style={{maxWidth:520, margin:"80px auto", textAlign:"center", padding:"40px 32px", background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:16, boxShadow:TH.cardGlow}}><div style={{fontSize:38, marginBottom:12, color:TH.accent, fontFamily:"'Playfair Display',Georgia,serif"}}>⊘</div><div style={{fontFamily:"'Playfair Display',Georgia,serif", fontSize:22, fontWeight:400, color:TH.text, marginBottom:8}}>{t.noAccessTitle}</div><div style={{color:TH.textMuted, fontSize:14, lineHeight:1.6}}>{t.noAccessDesc} </div><div style={{marginTop:16, fontSize:12, color:TH.textDim}}>{email}</div></div>)}
          {tab==="dashboard" && canSeeDashboard   && <DashboardTab TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} onNav={setTab} />}
          {tab==="warehouse" && WAREHOUSE_ENABLED  && canSeeWarehouse  && <WarehouseHub  TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
          {tab==="inspection" && INSPECTION_ENABLED && canSeeInspection && <InspectionHub TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
          {tab==="pools" && POOLS_ENABLED      && canSeePools      && <PoolControlHub TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
          {tab==="procure" && PROCURE_ENABLED    && canSeeProcure    && <ProcureHub    TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
          {tab==="requests" && REQUESTS_ENABLED   && canSeeRequests   && <ProcurementHub TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
          {tab==="maintenance" && MAINTENANCE_ENABLED && canSeeMaintenance && <MaintenanceTracker TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
          {tab==="users" && canSeeUsers        && <UsersTab TH={TH} lang={lang} isMobile={isMobile} />} </main></div></div>);
}

// ═══════════════════════════════════════════════════════════════════
// LoginScreen
// ═══════════════════════════════════════════════════════════════════
function LoginScreen({ TH, onSignedIn }) {
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [error, setError]     = useState(null);
  const [busy, setBusy]       = useState(false);

  async function submit(e) {
    e?.preventDefault();
    setBusy(true); setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      onSignedIn(data.session);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return ( <div style={{
      minHeight:"100vh", background:TH.bg, color:TH.text,
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, fontFamily:"'Inter',system-ui,sans-serif",
      backgroundImage: `radial-gradient(ellipse 800px 500px at 50% -10%, rgba(184,147,90,0.10), transparent 60%)`,
    }}><form onSubmit={submit} style={{
        background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:16,
        padding:36, maxWidth:420, width:"100%",
        boxShadow: TH.shadowLg,
      }}><div style={{textAlign:"center", marginBottom:28}}><div style={{
            width:72, height:72, margin:"0 auto 16px", borderRadius:18,
            background: "linear-gradient(135deg, #1a1814 0%, #0d0c0a 100%)",
            border:`1px solid ${TH.accentBorder}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"'Playfair Display',Georgia,serif", fontSize:38, color:TH.accent, fontWeight:400,
            boxShadow: `0 0 0 1px rgba(184,147,90,.15) inset, 0 8px 24px rgba(184,147,90,.15)`,
            lineHeight:1,
          }}>Ω</div><div style={{fontFamily:"'Playfair Display',Georgia,serif", fontSize:26, fontWeight:400, color:TH.text, letterSpacing:"-0.01em"}}>Omega Control System</div><div style={{fontSize:11, color:TH.textMuted, letterSpacing:"0.18em", marginTop:6, textTransform:"uppercase"}}>Caesar Projects · Internal</div></div><label style={{display:"block", fontSize:11, fontWeight:600, color:TH.textMuted, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px"}}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={{
          width:"100%", padding:"12px 14px", marginBottom:16,
          background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:10,
          color:TH.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box",
        }} /><label style={{display:"block", fontSize:11, fontWeight:600, color:TH.textMuted, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px"}}>Password</label><input type="password" value={password} onChange={e=>setPass(e.target.value)} required style={{
          width:"100%", padding:"12px 14px", marginBottom:16,
          background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:10,
          color:TH.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box",
        }} />{error && ( <div style={{background:"rgba(201,80,80,.08)", border:"1px solid rgba(201,80,80,.3)", borderRadius:8, padding:"10px 12px", color:"#d67373", fontSize:12, marginBottom:14}}>{error} </div>)} <button type="submit" disabled={busy} style={{
          width:"100%", padding:"14px",
          background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:10,
          color:"#000", cursor:"pointer", fontSize:14, fontWeight:800, fontFamily:"inherit",
          letterSpacing:"0.02em",
          opacity: busy ? 0.6 : 1,
          boxShadow: "0 4px 14px rgba(184,147,90,.25)",
        }}>{busy ? "Signing in…" : "Sign in"}</button><div style={{marginTop:20, padding:"12px 14px", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:10, textAlign:"center"}}><div style={{fontSize:11, color:TH.textMuted, marginBottom:2}}>To add new users, go to</div><div style={{fontSize:12, color:TH.accent, fontWeight:600}}>Team &amp; Roles · Admin only</div></div></form></div>);
}
