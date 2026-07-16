import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import DashboardTab from "./DashboardTab";
import UsersTab from "./UsersTab";
import WarehouseHub from "./warehouse/WarehouseHub";
import InspectionHub from "./inspection/InspectionHub";
import PoolControlHub from "./pools/PoolControlHub";
import ProcureHub from "./procurement/ProcureHub";
import PWAInstall from "./PWAInstall";
import { tr } from "./i18n";

// ─── Feature flags ──────────────────────────────────────────────────
const WAREHOUSE_ENABLED  = true;
const INSPECTION_ENABLED = true;
const POOLS_ENABLED      = true;
const PROCURE_ENABLED    = true;

// Superadmin bootstrap: only YOU. Never locked out even if DB roles fail.
// Everyone else (including Hezi, Anzhela) is controlled purely by DB roles.
const ADMIN_EMAILS = [
  "alireza.ariyannekoo@afikgroup.com",
];

// ─── Themes ─────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:"#050505", bgElev:"#0d0d0c", bgCard:"#0f0e0c", bgInput:"#171613", bgHover:"#1d1c18",
    text:"#f4efe4", textMuted:"#98917f", textDim:"#5c584d", textHeading:"#ffffff",
    border:"#232119", borderStrong:"#33301f", divider:"#191813",
    sidebar:"linear-gradient(180deg, #0a0a09 0%, #050505 100%)", sidebarBorder:"#232119",
    header:"rgba(5,5,5,0.92)", headerBorder:"#232119",
    accent:"#C9A960", accentText:"#D4B876",
    accentBg:"rgba(201,169,96,.10)", accentBorder:"rgba(201,169,96,.30)",
    shadow:"0 1px 3px rgba(0,0,0,.5)", shadowLg:"0 12px 40px rgba(0,0,0,.55)",
    cardGlow:"0 0 0 1px rgba(201,169,96,.06), 0 8px 30px rgba(0,0,0,.35)",
  },
  light: {
    bg:"#F6F2E9", bgElev:"#FFFDF8", bgCard:"#FFFDF8", bgInput:"#F1EBDD", bgHover:"#EDE6D5",
    text:"#1c1a14", textMuted:"#7a7361", textDim:"#a8a08c", textHeading:"#141210",
    border:"#E6DFCC", borderStrong:"#D5CBAE", divider:"#EDE6D5",
    sidebar:"linear-gradient(180deg, #FFFDF8 0%, #FAF6EC 100%)", sidebarBorder:"#E6DFCC",
    header:"rgba(255,253,248,0.92)", headerBorder:"#E6DFCC",
    accent:"#8B7A44", accentText:"#8B7A44",
    accentBg:"rgba(139,122,68,.09)", accentBorder:"rgba(139,122,68,.30)",
    shadow:"0 1px 3px rgba(139,122,68,.10)", shadowLg:"0 12px 40px rgba(139,122,68,.18)",
    cardGlow:"0 1px 2px rgba(139,122,68,.06), 0 8px 28px rgba(139,122,68,.10)",
  },
};

// Global polish CSS injected once
if (typeof document !== 'undefined' && !document.getElementById('caesar-polish')) {
  const st = document.createElement('style');
  st.id = 'caesar-polish';
  st.textContent = `
    * { scrollbar-width: thin; scrollbar-color: rgba(201,169,96,.35) transparent; }
    *::-webkit-scrollbar { width: 8px; height: 8px; }
    *::-webkit-scrollbar-thumb { background: rgba(201,169,96,.30); border-radius: 8px; }
    *::-webkit-scrollbar-thumb:hover { background: rgba(201,169,96,.55); }
    *::-webkit-scrollbar-track { background: transparent; }
    button { transition: background .15s ease, border-color .15s ease, color .15s ease, transform .12s ease, box-shadow .15s ease; }
    button:active { transform: scale(.985); }
    input, select, textarea { transition: border-color .15s ease, box-shadow .15s ease; }
    input:focus, select:focus, textarea:focus { border-color: rgba(201,169,96,.55) !important; box-shadow: 0 0 0 3px rgba(201,169,96,.12); }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    main > * { animation: fadeUp .25s ease; }
  `;
  document.head.appendChild(st);
}

const NAV_GROUPS = [
  { key: "overview",     items: ["dashboard"] },
  ...(WAREHOUSE_ENABLED  ? [{ key: "warehouseGroup",  items: ["warehouse"] }]  : []),
  ...(INSPECTION_ENABLED ? [{ key: "inspectionGroup", items: ["inspection"] }] : []),
  ...(POOLS_ENABLED      ? [{ key: "poolGroup",       items: ["pools"] }]      : []),
  ...(PROCURE_ENABLED    ? [{ key: "procurement",     items: ["procure"] }]    : []),
  { key: "adminGroup",   items: ["users"] },
];

const TAB_ICONS = {
  dashboard:  "◈",
  warehouse:  "🏬",
  inspection: "🔍",
  pools:      "🏊",
  procure:    "💳",
  users:      "👥",
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
  const isAdmin  = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase())
                   || userRoles.includes("owner") || userRoles.includes("auditor");
  const isOwner  = isAdmin;

  // Role-based access
  const canSeeWarehouse  = isOwner || userRoles.includes("warehouse_keeper");
  const canSeeInspection = isOwner || userRoles.includes("inspector");
  const canSeePools      = isOwner || userRoles.includes("pool_operator");
  const canSeeProcure    = isOwner || [
    "procurement_officer","deputy_officer","dept_head","operator",
    "finance_officer","approver_mid","approver_high",
  ].some(r => userRoles.includes(r));
  const canSeeUsers      = isOwner;

  const allTabs = [
    "dashboard",
    ...(WAREHOUSE_ENABLED  && canSeeWarehouse  ? ["warehouse"]  : []),
    ...(INSPECTION_ENABLED && canSeeInspection ? ["inspection"] : []),
    ...(POOLS_ENABLED      && canSeePools      ? ["pools"]      : []),
    ...(PROCURE_ENABLED    && canSeeProcure    ? ["procure"]    : []),
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

  useEffect(() => localStorage.setItem("caesarTheme", theme), [theme]);
  useEffect(() => localStorage.setItem("caesarLang", lang), [lang]);

  // ─── Login screen ───────────────────────────────────────────────
  if (checking) {
    return <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:TH.bg, color:TH.text, fontFamily:"'Inter',system-ui,sans-serif"}}>
      Loading...
    </div>;
  }
  if (!session) return <LoginScreen TH={TH} onSignedIn={setSession} />;
  if (!rolesLoaded) return <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:TH.bg, color:TH.text}}>Loading roles...</div>;

  // ─── Layout ─────────────────────────────────────────────────────
  const dt = now;
  const dateStr = dt.toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
  const timeStr = dt.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

  return (
    <div dir={isRTL?"rtl":"ltr"} style={{
      display:"flex", flexDirection:"column", minHeight:"100vh",
      background:TH.bg, color:TH.text,
      fontFamily: lang==="fa" ? "'Vazirmatn','Tahoma',sans-serif"
                : lang==="he" ? "'Heebo','Arial',sans-serif"
                : "'Inter','Segoe UI',system-ui,sans-serif",
    }}>
      {/* ═══ HEADER ═══ */}
      <header style={{
        position:"sticky", top:0, zIndex:100,
        background:TH.header,
        backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)",
        borderBottom:`1px solid ${TH.headerBorder}`,
        boxShadow:"0 1px 0 rgba(201,169,96,.15)",
        height:isMobile?54:62,
        display:"flex", alignItems:"center",
        padding:isMobile?"0 12px":"0 24px",
        gap:isMobile?8:16, flexShrink:0,
      }}>
        {isMobile && (
          <button onClick={()=>setSidebarOpen(v=>!v)} style={{background:"transparent",border:"none",color:TH.text,fontSize:22,cursor:"pointer",padding:"4px 8px"}}>☰</button>
        )}
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <div style={{
            height:isMobile?38:48,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <img src="/caesar-logo.png" alt="Caesar Projects" style={{height:"100%", width:"auto", objectFit:"contain", display:"block"}}
                 onError={(e)=>{ e.target.style.display='none'; e.target.parentNode.innerHTML='<span style="color:'+TH.accent+';font-weight:800;font-family:Georgia,serif;font-size:20px">CAESAR</span>'; }} />
          </div>
          {!isMobile && <div style={{fontSize:11, color:"#C9A960", fontWeight:700, letterSpacing:"0.14em"}}>● LIVE</div>}
        </div>

        <div style={{flex:1}} />

        {!isMobile && (
          <div style={{fontFamily:"monospace", fontSize:13, color:TH.textMuted}}>
            {dateStr} <span style={{color:TH.text, fontWeight:700}}>{timeStr}</span>
          </div>
        )}

        <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{
          background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:20,
          color:TH.text, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit",
          display:"flex", alignItems:"center", gap:6,
        }}>
          {theme==="dark" ? "🌙 Dark" : "☀ Light"}
        </button>

        <div style={{display:"flex", gap:2, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:20, padding:2}}>
          {["en","he","fa"].map(l=>(
            <button key={l} onClick={()=>setLang(l)} style={{
              background: lang===l ? "linear-gradient(135deg,#C9A960,#8B7A44)" : "transparent",
              border:"none", borderRadius:16, color: lang===l?"#000":TH.textMuted,
              padding:"5px 12px", cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit",
              textTransform:"uppercase",
            }}>{l}</button>
          ))}
        </div>

        {!isMobile && (
          <div style={{display:"flex", alignItems:"center", gap:10, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:24, padding:"4px 14px 4px 4px"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#C9A960,#8B7A44)",display:"flex",alignItems:"center",justifyContent:"center",color:"#000",fontWeight:800,fontSize:13}}>
              {(email[0]||"?").toUpperCase()}
            </div>
            <div>
              <div style={{fontSize:12, fontWeight:700, color:TH.text, lineHeight:1.2}}>{isAdmin?"Admin":"User"}</div>
              <div style={{fontSize:10, color:TH.textMuted, lineHeight:1.2}}>{email}</div>
            </div>
          </div>
        )}

        <button onClick={async ()=>{ await supabase.auth.signOut(); }} style={{
          background:"transparent", border:`1px solid ${TH.border}`, borderRadius:20,
          color:TH.text, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit",
        }}>↩ Logout</button>
      </header>

      <div style={{display:"flex", flex:1, minHeight:0}}>
        {/* ═══ SIDEBAR ═══ */}
        {sidebarOpen && (
          <aside style={{
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
          }}>
            {NAV_GROUPS.filter(g => g.items.some(k => allTabs.includes(k))).map(group => (
              <div key={group.key} style={{marginBottom:16, padding:"0 12px"}}>
                <div style={{padding:"0 12px 8px", color:TH.textDim, fontSize:9.5, fontWeight:800, letterSpacing:"0.16em"}}>
                  {(t[group.key]||group.key).toUpperCase()}
                </div>
                {group.items.filter(k=>allTabs.includes(k)).map(k=>{
                  const active = tab===k;
                  return (
                    <button key={k} onClick={()=>{ setTab(k); if(isMobile) setSidebarOpen(false); }} style={{
                      display:"flex", alignItems:"center", gap:11, width:"100%",
                      padding:"10px 12px", marginBottom:2,
                      background: active ? "linear-gradient(135deg, rgba(201,169,96,.16), rgba(139,122,68,.08))" : "transparent",
                      border: active ? "1px solid rgba(201,169,96,.35)" : "1px solid transparent",
                      borderRadius:11,
                      color: active ? TH.accent : TH.textMuted,
                      cursor:"pointer", fontSize:13, textAlign:"left", fontFamily:"inherit",
                      fontWeight: active ? 700 : 500,
                      boxShadow: active ? "0 2px 10px rgba(201,169,96,.10)" : "none",
                    }}
                    onMouseEnter={e=>{ if(!active) e.currentTarget.style.background = TH.bgHover; }}
                    onMouseLeave={e=>{ if(!active) e.currentTarget.style.background = "transparent"; }}>
                      <span style={{fontSize:15, width:20, textAlign:"center", flexShrink:0, filter: active ? "none" : "grayscale(0.4)"}}>{TAB_ICONS[k]}</span>
                      <span style={{flex:1}}>{t[k] || k}</span>
                      {active && <span style={{width:5, height:5, borderRadius:3, background:"#C9A960", flexShrink:0}}/>}
                    </button>
                  );
                })}
              </div>
            ))}
            <div style={{flex:1}} />
            <div style={{padding:"12px"}}>
              <PWAInstall TH={TH} isMobile={isMobile} />
            </div>
          </aside>
        )}

        {/* ═══ MAIN ═══ */}
        <main style={{flex:1, minWidth:0, padding: isMobile?"14px 12px":"22px 26px", overflow:"auto"}}>
          {tab==="dashboard" && <DashboardTab TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} onNav={setTab} />}
          {tab==="warehouse"  && WAREHOUSE_ENABLED  && canSeeWarehouse  && <WarehouseHub  TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
          {tab==="inspection" && INSPECTION_ENABLED && canSeeInspection && <InspectionHub TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
          {tab==="pools"      && POOLS_ENABLED      && canSeePools      && <PoolControlHub TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
          {tab==="procure"    && PROCURE_ENABLED    && canSeeProcure    && <ProcureHub    TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}
          {tab==="users"      && canSeeUsers        && <UsersTab TH={TH} lang={lang} isMobile={isMobile} />}
        </main>
      </div>
    </div>
  );
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

  return (
    <div style={{
      minHeight:"100vh", background:TH.bg, color:TH.text,
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, fontFamily:"'Inter',system-ui,sans-serif",
      backgroundImage: `radial-gradient(ellipse 800px 500px at 50% -10%, rgba(201,169,96,0.10), transparent 60%)`,
    }}>
      <form onSubmit={submit} style={{
        background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:16,
        padding:36, maxWidth:420, width:"100%",
        boxShadow: TH.shadowLg,
      }}>
        <div style={{textAlign:"center", marginBottom:28}}>
          <div style={{
            width:72, height:72, margin:"0 auto 16px", borderRadius:18,
            background: "linear-gradient(135deg, #1a1814 0%, #0d0c0a 100%)",
            border:`1px solid ${TH.accentBorder}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"'Playfair Display',Georgia,serif", fontSize:38, color:TH.accent, fontWeight:700,
            boxShadow: `0 0 0 1px rgba(201,169,96,.15) inset, 0 8px 24px rgba(201,169,96,.15)`,
            lineHeight:1,
          }}>Ω</div>
          <div style={{fontFamily:"'Playfair Display',Georgia,serif", fontSize:26, fontWeight:700, color:TH.text, letterSpacing:"-0.01em"}}>Omega Control System</div>
          <div style={{fontSize:11, color:TH.textMuted, letterSpacing:"0.18em", marginTop:6, textTransform:"uppercase"}}>Caesar Projects · Internal</div>
        </div>

        <label style={{display:"block", fontSize:11, fontWeight:600, color:TH.textMuted, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px"}}>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={{
          width:"100%", padding:"12px 14px", marginBottom:16,
          background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:10,
          color:TH.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box",
        }} />

        <label style={{display:"block", fontSize:11, fontWeight:600, color:TH.textMuted, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px"}}>Password</label>
        <input type="password" value={password} onChange={e=>setPass(e.target.value)} required style={{
          width:"100%", padding:"12px 14px", marginBottom:16,
          background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:10,
          color:TH.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box",
        }} />

        {error && (
          <div style={{background:"rgba(201,80,80,.08)", border:"1px solid rgba(201,80,80,.3)", borderRadius:8, padding:"10px 12px", color:"#d67373", fontSize:12, marginBottom:14}}>
            {error}
          </div>
        )}

        <button type="submit" disabled={busy} style={{
          width:"100%", padding:"14px",
          background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:10,
          color:"#000", cursor:"pointer", fontSize:14, fontWeight:800, fontFamily:"inherit",
          letterSpacing:"0.02em",
          opacity: busy ? 0.6 : 1,
          boxShadow: "0 4px 14px rgba(201,169,96,.25)",
        }}>{busy ? "Signing in…" : "Sign in"}</button>

        <div style={{marginTop:20, padding:"12px 14px", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:10, textAlign:"center"}}>
          <div style={{fontSize:11, color:TH.textMuted, marginBottom:2}}>To add new users, go to</div>
          <div style={{fontSize:12, color:TH.accent, fontWeight:600}}>Team &amp; Roles · Admin only</div>
        </div>
      </form>
    </div>
  );
}
