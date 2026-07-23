import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import Inventory from "./inventory-system"
import OperatorApp from "./components/Pools/OperatorApp"

// ─── Feature flags ──────────────────────────────────────────────────
// Set POOLS_ENABLED = true to bring the Pools module back.
const POOLS_ENABLED = false

const ADMIN_EMAILS = [
  "admin@inventory.com",
  "hezicaesar@gmail.com",
  "alireza.ariyannekoo@afikgroup.com",
  "anzhelaklavdieva2@gmail.com",
]

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLogging, setIsLogging] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem("stocktrack-theme") || "dark")
  const [opForce, setOpForce] = useState(window.location.hash === "#operator")

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handler = () => setTheme(localStorage.getItem("stocktrack-theme") || "dark")
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  useEffect(() => {
    const onHash = () => setOpForce(window.location.hash === "#operator")
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setIsLogging(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError("ایمیل یا پسورد اشتباه است / Wrong email or password")
    setIsLogging(false)
  }

  const isDark = theme === "dark"

  // ─── Caesar / Omega palette — Plastic Surgery edition ─────────────
  const bg           = isDark ? "#141210" : "#EFE9D9"
  const cardBg       = isDark ? "#1a1712" : "#FBF7EB"
  const border       = isDark ? "#2e2a20" : "#DDD4BC"
  const text         = isDark ? "#EAE4D3" : "#231f18"
  const muted        = isDark ? "#8B8580" : "#7a7361"
  const inputBg      = isDark ? "#211d16" : "#F0EAD8"
  const accent       = "#B8935A"
  const accentDark   = "#8B7040"
  const accentBg     = isDark ? "rgba(184,147,90,.10)" : "rgba(139,112,64,.08)"
  const accentBorder = isDark ? "rgba(184,147,90,.32)" : "rgba(139,112,64,.32)"

  // Paper texture (same as main app)
  const paperTexture = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.011 0.013' numOctaves='4' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.72 0 0 0 0 0.58 0 0 0 0 0.35 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:bg}}>
      <div style={{color:accent,fontSize:16,fontFamily:"'Inter',system-ui,sans-serif"}}>Loading…</div>
    </div>
  )

  if (!session) return (
    <div style={{
      display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",
      background:bg,
      backgroundImage: `${paperTexture}, ${isDark
        ? `radial-gradient(ellipse 900px 500px at 50% -10%, rgba(184,147,90,0.12), transparent 60%)`
        : `radial-gradient(ellipse 900px 500px at 50% -10%, rgba(139,112,64,0.12), transparent 60%)`}`,
      backgroundSize: "400px 400px, auto",
      fontFamily:"'Inter','Tahoma',sans-serif",padding:20,position:"relative"
    }}>

      <div style={{position:"absolute",top:20,right:20}}>
        <button onClick={()=>{const newT=isDark?"light":"dark";setTheme(newT);localStorage.setItem("stocktrack-theme",newT);}} style={{background:cardBg,border:`1px solid ${border}`,borderRadius:20,color:text,padding:"7px 16px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600}}>
          {isDark?"Light":"Dark"}
        </button>
      </div>

      <div style={{background:cardBg,border:`1px solid ${border}`,borderRadius:18,padding:"40px 36px",width:"100%",maxWidth:420,boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.55)" : "0 12px 40px rgba(139,112,64,0.18)"}}>

        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            width:72,height:72,borderRadius:18,
            background: isDark ? "linear-gradient(135deg,#211d16 0%,#171410 100%)" : "linear-gradient(135deg,#FBF7EB 0%,#F0EAD8 100%)",
            border:`1px solid ${accentBorder}`,
            fontFamily:"'Playfair Display',Georgia,serif",
            fontSize:40,color:accent,fontWeight:400,lineHeight:1,
            marginBottom:16,
            boxShadow: `0 0 0 1px ${accentBorder} inset, 0 8px 24px rgba(184,147,90,0.20)`
          }}>Ω</div>
          <div style={{color:text,fontSize:26,fontWeight:400,letterSpacing:"-0.01em",fontFamily:"'Playfair Display',Georgia,serif"}}>Omega Control System</div>
          <div style={{color:muted,fontSize:11,marginTop:6,letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:600}}>Caesar Projects · Internal</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:muted,fontSize:11,marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@afikgroup.com" required
              style={{width:"100%",background:inputBg,border:`1px solid ${border}`,borderRadius:10,padding:"12px 14px",color:text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          <div style={{marginBottom:22}}>
            <label style={{display:"block",color:muted,fontSize:11,marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required
              style={{width:"100%",background:inputBg,border:`1px solid ${border}`,borderRadius:10,padding:"12px 14px",color:text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>

          {error && (
            <div style={{background:"rgba(201,80,80,.10)",border:"1px solid rgba(201,80,80,.35)",borderRadius:9,padding:"10px 14px",color:"#d67373",fontSize:13,marginBottom:16,textAlign:"center"}}>
              {error}
            </div>
          )}

          <button type="submit" disabled={isLogging} style={{
            width:"100%",
            background:`linear-gradient(135deg,${accent},${accentDark})`,
            border:"none",borderRadius:11,color:"#000",
            padding:"14px",cursor:"pointer",fontSize:14,fontWeight:800,fontFamily:"inherit",
            letterSpacing:"0.02em",
            opacity:isLogging?0.6:1,
            boxShadow:"0 6px 18px rgba(184,147,90,0.30)"
          }}>
            {isLogging ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{marginTop:22,padding:"14px",background:accentBg,borderRadius:10,border:`1px solid ${accentBorder}`}}>
          <div style={{color:muted,fontSize:11,textAlign:"center",lineHeight:1.7}}>
            To add new users, go to<br/>
            <span style={{color:accent,fontWeight:600}}>Team &amp; Roles · Admin only</span>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── Logged in ────────────────────────────────────────────────────
  const userEmail = session?.user?.email || ""
  const isAdmin = ADMIN_EMAILS.includes(userEmail)
  const showOperator = POOLS_ENABLED && (opForce || !isAdmin)

  if (showOperator) {
    const TH = isDark ? {
      bg:"#141210", bgCard:"#1a1712", bgInput:"#211d16", bgElev:"#1a1712",
      header:"#141210", headerBorder:"#2e2a20",
      text:"#EAE4D3", textHeading:"#F5F0E4", textMuted:"#8B8580", textDim:"#5f5a52",
      border:"#2e2a20", divider:"#241f18", accentBorder:"rgba(184,147,90,.32)",
      accent:"#B8935A", accentBg:"rgba(184,147,90,.12)", accentText:"#D4A853",
    } : {
      bg:"#EFE9D9", bgCard:"#FBF7EB", bgInput:"#F0EAD8", bgElev:"#FBF7EB",
      header:"#FBF7EB", headerBorder:"#DDD4BC",
      text:"#231f18", textHeading:"#1a1712", textMuted:"#7a7361", textDim:"#a49c88",
      border:"#DDD4BC", divider:"#E8E1CD", accentBorder:"rgba(139,112,64,.32)",
      accent:"#8B7040", accentBg:"rgba(139,112,64,.10)", accentText:"#8B7040",
    }
    const isMobile = window.innerWidth < 900
    return <OperatorApp TH={TH} lang="en" isMobile={isMobile} user={session.user} />
  }

  return <Inventory />
}
