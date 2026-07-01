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
  const bg = isDark ? "#0e1220" : "#f6f7fb"
  const cardBg = isDark ? "#161b2c" : "#ffffff"
  const border = isDark ? "#252f4a" : "#e6e9f2"
  const text = isDark ? "#f0f4ff" : "#0d1530"
  const muted = isDark ? "#8892b0" : "#6b7592"
  const inputBg = isDark ? "#0e1220" : "#f6f7fb"

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:bg}}>
      <div style={{color:"#6366f1",fontSize:18}}>Loading...</div>
    </div>
  )

  if (!session) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:bg,fontFamily:"'Inter','Tahoma',sans-serif",padding:20}}>
      <div style={{background:cardBg,border:`1px solid ${border}`,borderRadius:20,padding:"40px 36px",width:"100%",maxWidth:420,boxShadow:isDark?"none":"0 10px 40px rgba(0,0,0,0.06)"}}>

        <div style={{position:"absolute",top:20,right:20}}>
          <button onClick={()=>{const newT=isDark?"light":"dark";setTheme(newT);localStorage.setItem("stocktrack-theme",newT);}} style={{background:inputBg,border:`1px solid ${border}`,borderRadius:9,color:text,padding:"7px 14px",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
            {isDark?"☀ Light":"🌙 Dark"}
          </button>
        </div>

        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:64,height:64,borderRadius:16,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",fontSize:30,color:"#fff",marginBottom:14,boxShadow:"0 8px 24px rgba(99,102,241,0.3)"}}>▦</div>
          <div style={{color:text,fontSize:26,fontWeight:800,letterSpacing:"-0.5px"}}>StockTrack</div>
          <div style={{color:muted,fontSize:13,marginTop:4}}>Inventory Management System</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:muted,fontSize:12,marginBottom:6,fontWeight:600}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com" required
              style={{width:"100%",background:inputBg,border:`1px solid ${border}`,borderRadius:10,padding:"12px 14px",color:text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          <div style={{marginBottom:24}}>
            <label style={{display:"block",color:muted,fontSize:12,marginBottom:6,fontWeight:600}}>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required
              style={{width:"100%",background:inputBg,border:`1px solid ${border}`,borderRadius:10,padding:"12px 14px",color:text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>

          {error && (
            <div style={{background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.3)",borderRadius:9,padding:"10px 14px",color:"#ef4444",fontSize:13,marginBottom:16,textAlign:"center"}}>
              {error}
            </div>
          )}

          <button type="submit" disabled={isLogging} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:11,color:"#fff",padding:"13px",cursor:"pointer",fontSize:15,fontWeight:700,fontFamily:"inherit",opacity:isLogging?0.7:1,boxShadow:"0 6px 16px rgba(99,102,241,0.3)"}}>
            {isLogging ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{marginTop:24,padding:"14px",background:isDark?"rgba(99,102,241,.08)":"rgba(99,102,241,.05)",borderRadius:10,border:"1px solid rgba(99,102,241,.2)"}}>
          <div style={{color:muted,fontSize:11,textAlign:"center",lineHeight:1.7}}>
            To add new users go to<br/>
            <span style={{color:"#a5b4fc"}}>Supabase → Authentication → Users</span>
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
      bg:"#0e1220", bgCard:"#161b2c", bgInput:"#0e1220", bgElev:"#1a2035",
      header:"#111827", headerBorder:"#1a2035",
      text:"#f0f4ff", textHeading:"#ffffff", textMuted:"#8892b0", textDim:"#4a5568",
      border:"#252f4a", divider:"#1a2035", accentBorder:"#4338ca",
      accent:"#818cf8", accentBg:"rgba(99,102,241,0.12)", accentText:"#818cf8",
    } : {
      bg:"#f6f7fb", bgCard:"#ffffff", bgInput:"#f6f7fb", bgElev:"#f0f2f8",
      header:"#ffffff", headerBorder:"#e6e9f2",
      text:"#0d1530", textHeading:"#050d24", textMuted:"#6b7592", textDim:"#9ca3af",
      border:"#e6e9f2", divider:"#f0f2f8", accentBorder:"#6366f1",
      accent:"#6366f1", accentBg:"rgba(99,102,241,0.08)", accentText:"#6366f1",
    }
    const isMobile = window.innerWidth < 900
    return <OperatorApp TH={TH} lang="en" isMobile={isMobile} user={session.user} />
  }

  return <Inventory />
}
