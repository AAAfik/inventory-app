import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { tr } from "./i18n";

// ─── Role catalog: DB key → display labels ─────────────────────────
const ROLE_CATALOG = [
  { key: "owner",               en: "Owner (full access)",     fa: "مدیر (دسترسی کامل)",           he: "מנהל (גישה מלאה)",           color: "#C9A960" },
  { key: "auditor",             en: "Auditor (full access)",   fa: "بازرس ارشد (دسترسی کامل)",      he: "בקר (גישה מלאה)",            color: "#C9A960" },
  { key: "warehouse_keeper",    en: "Warehouse keeper",        fa: "انباردار",                     he: "מנהל מחסן",                  color: "#5DCAA5" },
  { key: "pool_operator",       en: "Pool chemical operator",  fa: "مسئول مواد شیمیایی استخر",     he: "מפעיל כימיקלים לבריכה",       color: "#4FA5D8" },
  { key: "inspector",           en: "Inspector",               fa: "بازرس",                        he: "מבקר",                       color: "#B48ADE" },
  { key: "procurement_officer", en: "Procurement officer",     fa: "کارشناس تدارکات",              he: "אחראי רכש",                  color: "#EF9F27" },
  { key: "deputy_officer",      en: "Deputy officer",          fa: "معاون تدارکات",                he: "סגן אחראי רכש",              color: "#EF9F27" },
  { key: "dept_head",           en: "Department head",         fa: "مدیر بخش",                     he: "ראש מחלקה",                  color: "#EF9F27" },
  { key: "operator",            en: "Operator",                fa: "اپراتور",                      he: "מפעיל",                      color: "#EF9F27" },
  { key: "finance_officer",     en: "Finance officer",         fa: "کارشناس مالی",                 he: "אחראי כספים",                color: "#EF9F27" },
  { key: "approver_mid",        en: "Approver (mid tier)",     fa: "تاییدکننده (سطح میانی)",       he: "מאשר (רמה בינונית)",         color: "#EF9F27" },
  { key: "approver_high",       en: "Approver (high tier)",    fa: "تاییدکننده (سطح بالا)",        he: "מאשר (רמה גבוהה)",           color: "#EF9F27" },
];

function labelForRole(key, lang) {
  const r = ROLE_CATALOG.find(x => x.key === key);
  if (!r) return key;
  if (lang === "fa") return r.fa;
  if (lang === "he") return r.he;
  return r.en;
}
function colorForRole(key) {
  return ROLE_CATALOG.find(x => x.key === key)?.color || "#98917f";
}

function relativeTime(iso, t) {
  if (!iso) return t.neverStr;
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)      return t.justNow;
  if (s < 3600)    return `${Math.floor(s/60)}${t.minAgo}`;
  if (s < 86400)   return `${Math.floor(s/3600)}${t.hourAgo}`;
  if (s < 2592000) return `${Math.floor(s/86400)}${t.dayAgo}`;
  return new Date(iso).toLocaleDateString();
}

function initials(email) {
  if (!email) return "?";
  const [name] = email.split("@");
  const parts = name.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function UsersTab({ TH, lang = "en", isMobile }) {
  const t = tr(lang);
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all");
  const [myEmail, setMyEmail]     = useState("");
  const [busyUserId, setBusyId]   = useState(null);
  const [showNew, setShowNew]     = useState(false);

  const isRTL = lang === "he" || lang === "fa";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyEmail(data?.user?.email || ""));
  }, []);

  async function loadUsers() {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.schema("procure").rpc("get_users_with_roles");
      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function addRole(userId, role) {
    setBusyId(userId);
    try {
      const { error } = await supabase.schema("procure").rpc("add_user_role", { target_user: userId, new_role: role });
      if (error) throw error;
      await loadUsers();
    } catch (e) {
      alert(t.addRoleFailed + (e.message || e));
    } finally {
      setBusyId(null);
    }
  }

  async function removeRole(userId, role) {
    if (!confirm(t.confirmRemoveRole.replace("{role}", labelForRole(role, lang)))) return;
    setBusyId(userId);
    try {
      const { error } = await supabase.schema("procure").rpc("remove_user_role", { target_user: userId, old_role: role });
      if (error) throw error;
      await loadUsers();
    } catch (e) {
      alert(t.removeRoleFailed + (e.message || e));
    } finally {
      setBusyId(null);
    }
  }

  const stats = useMemo(() => {
    let owners = 0, pending = 0, activeToday = 0;
    const today = new Date(); today.setHours(0,0,0,0);
    for (const u of users) {
      if ((u.roles || []).includes("owner") || (u.roles || []).includes("auditor")) owners++;
      if (!u.last_sign_in_at) pending++;
      else if (new Date(u.last_sign_in_at) >= today) activeToday++;
    }
    return { total: users.length, owners, pending, activeToday };
  }, [users]);

  const visibleUsers = useMemo(() => {
    let list = users;
    if (filter !== "all") {
      list = list.filter(u => (u.roles || []).includes(filter));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(u => (u.email || "").toLowerCase().includes(q) || (u.roles||[]).some(r => r.toLowerCase().includes(q)));
    }
    return list;
  }, [users, filter, search]);

  const s = styles(TH);

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      {/* ─── Header ─── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.h1}>{t.teamAccess}</h1>
          <p style={s.sub}>{t.manageUsersDesc}</p>
        </div>
        <button onClick={() => setShowNew(true)} style={s.primaryBtn}>
          {t.newUserBtn}
        </button>
      </div>

      {/* ─── Stats ─── */}
      <div style={s.statsGrid}>
        <StatCard TH={TH} label={t.statTotalUsers}       value={stats.total}       accent="#C9A960" />
        <StatCard TH={TH} label={t.statActiveToday}      value={stats.activeToday} accent="#5DCAA5" />
        <StatCard TH={TH} label={t.statAdmins}           value={stats.owners}      accent="#C9A960" />
        <StatCard TH={TH} label={t.statNeverSignedIn}    value={stats.pending}     accent="#EF9F27" />
      </div>

      {/* ─── Toolbar ─── */}
      <div style={s.toolbar}>
        <div style={s.searchBox}>
          <span style={{fontSize:14, color:TH.textDim}}>🔍</span>
          <input
            placeholder={t.searchByEmailRole}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={s.searchInput}
          />
        </div>
        <div style={s.filterChips}>
          {[
            { k: "all",              lbl: t.filterAll },
            { k: "owner",            lbl: t.filterOwners },
            { k: "warehouse_keeper", lbl: t.filterWarehouse },
            { k: "pool_operator",    lbl: t.filterPool },
            { k: "inspector",        lbl: t.filterInspector },
          ].map(f => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              style={filter === f.k ? s.chipActive : s.chip}
            >{f.lbl}</button>
          ))}
        </div>
      </div>

      {/* ─── Body ─── */}
      {loading && <div style={{padding:40, textAlign:"center", color:TH.textMuted}}>{t.loadingUsers}</div>}
      {error && <div style={s.errorBox}>Error: {error}<br/><br/><b>{t.didYouRunMigration}</b></div>}

      {!loading && !error && (
        <div>
          {visibleUsers.length === 0 && (
            <div style={{padding:40, textAlign:"center", color:TH.textMuted}}>{t.noUsersMatch}</div>
          )}
          {visibleUsers.map(u => (
            <UserRow
              key={u.id}
              user={u}
              isMe={u.email === myEmail}
              lang={lang}
              t={t}
              TH={TH}
              busy={busyUserId === u.id}
              onAddRole={role => addRole(u.id, role)}
              onRemoveRole={role => removeRole(u.id, role)}
            />
          ))}
        </div>
      )}

      {/* ─── Access matrix ─── */}
      <AccessMatrix TH={TH} t={t} />

      {/* ─── New user modal ─── */}
      {showNew && (
        <NewUserModal TH={TH} t={t} lang={lang} onClose={() => setShowNew(false)} onCreated={loadUsers} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
function StatCard({ TH, label, value, accent }) {
  return (
    <div style={{
      background: TH.bgCard, border: `1px solid ${TH.border}`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: 10, padding: "12px 16px",
    }}>
      <div style={{fontSize:11, color:TH.textMuted, textTransform:"uppercase", letterSpacing:".08em", fontWeight:600}}>{label}</div>
      <div style={{fontSize:24, fontWeight:700, color:TH.text, marginTop:4, fontFamily:"'Playfair Display',Georgia,serif"}}>{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
function UserRow({ user, isMe, lang, t, TH, busy, onAddRole, onRemoveRole }) {
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const roles = user.roles || [];
  const availableToAdd = ROLE_CATALOG.filter(r => !roles.includes(r.key));

  const status = !user.last_sign_in_at ? { txt: t.statusInvitePending, color: "#EF9F27" }
    : (Date.now() - new Date(user.last_sign_in_at).getTime() < 24*3600*1000) ? { txt: t.statusActive, color: "#5DCAA5" }
    : { txt: t.statusIdle, color: "#98917f" };

  return (
    <div style={{
      background: TH.bgCard,
      border: `1px solid ${isMe ? "rgba(201,169,96,.35)" : TH.border}`,
      borderRadius: 12, padding: "14px 16px", marginBottom: 10,
      opacity: busy ? 0.6 : 1,
    }}>
      <div style={{display:"flex", alignItems:"center", gap:14, marginBottom:10}}>
        <div style={{
          width:42, height:42, borderRadius:"50%",
          background: isMe ? "linear-gradient(135deg,#C9A960,#8B7A44)" : "rgba(201,169,96,.15)",
          border: isMe ? "none" : "1px solid rgba(201,169,96,.35)",
          color: isMe ? "#000" : "#C9A960",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontWeight:700, fontSize:14,
        }}>{initials(user.email)}</div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:2, flexWrap:"wrap"}}>
            <span style={{fontSize:14, fontWeight:600, color:TH.text}}>{user.email || user.id.slice(0,8)+"…"}</span>
            {isMe && <span style={{background:"#C9A960", color:"#000", fontSize:10, padding:"2px 6px", borderRadius:4, fontWeight:700}}>{t.you}</span>}
            <span style={{background:status.color+"22", color:status.color, fontSize:10, padding:"2px 6px", borderRadius:4, fontWeight:600}}>{status.txt}</span>
          </div>
          <div style={{fontSize:11, color:TH.textMuted}}>{t.lastActive}: {relativeTime(user.last_sign_in_at, t)}</div>
        </div>
      </div>

      <div style={{display:"flex", gap:6, flexWrap:"wrap", alignItems:"center"}}>
        {roles.length === 0 && (
          <span style={{fontSize:12, color:TH.textDim, fontStyle:"italic"}}>{t.noRolesAssigned}</span>
        )}
        {roles.map(r => {
          const c = colorForRole(r);
          return (
            <span key={r} style={{
              display:"inline-flex", alignItems:"center", gap:6,
              background: c+"22", color: c,
              padding:"4px 10px", borderRadius:6, fontSize:12, fontWeight:600,
            }}>
              {labelForRole(r, lang)}
              <button onClick={() => onRemoveRole(r)} disabled={busy} style={{
                background:"transparent", border:"none", color:c, cursor:"pointer",
                fontSize:14, lineHeight:1, padding:0, opacity:.7,
              }}>×</button>
            </span>
          );
        })}

        {availableToAdd.length > 0 && (
          <div style={{position:"relative"}}>
            <button onClick={() => setAddPickerOpen(v => !v)} disabled={busy} style={{
              background: "transparent", border: `1px dashed ${TH.border}`,
              color: TH.textMuted, padding:"4px 10px", borderRadius:6,
              fontSize:12, cursor:"pointer", fontFamily:"inherit",
            }}>{t.addRoleBtn}</button>
            {addPickerOpen && (
              <div style={{
                position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:20,
                background: TH.bgElev, border:`1px solid ${TH.border}`,
                borderRadius:10, padding:6, minWidth:280,
                boxShadow: TH.shadowLg,
              }}>
                {availableToAdd.map(r => (
                  <button key={r.key} onClick={() => { setAddPickerOpen(false); onAddRole(r.key); }} style={{
                    display:"block", width:"100%", textAlign:"left",
                    background:"transparent", border:"none", color:TH.text,
                    padding:"8px 10px", borderRadius:6, cursor:"pointer",
                    fontSize:13, fontFamily:"inherit",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{color:r.color, fontWeight:600}}>●</span>{" "}
                    {labelForRole(r.key, lang)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
function AccessMatrix({ TH, t }) {
  const [open, setOpen] = useState(false);
  const rows = [
    { role: t.amOwner,        access: t.amOwnerDesc },
    { role: t.amWarehouse,    access: t.amWarehouseDesc },
    { role: t.amPool,         access: t.amPoolDesc },
    { role: t.amInspector,    access: t.amInspectorDesc },
    { role: t.amProcurement,  access: t.amProcurementDesc },
    { role: t.amNoRoles,      access: t.amNoRolesDesc },
  ];
  return (
    <div style={{
      background: TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:10,
      padding:"12px 16px", marginTop:20,
    }}>
      <div onClick={()=>setOpen(v=>!v)} style={{display:"flex", justifyContent:"space-between", cursor:"pointer"}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <span style={{color:"#C9A960"}}>🛡</span>
          <span style={{fontSize:13, fontWeight:600, color:TH.text}}>{t.accessMatrixTitle}</span>
          <span style={{fontSize:11, color:TH.textMuted}}>{rows.length} {t.rolesCount}</span>
        </div>
        <span style={{color:TH.textMuted, fontSize:14}}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{marginTop:12, borderTop:`1px solid ${TH.border}`, paddingTop:12}}>
          {rows.map(r => (
            <div key={r.role} style={{display:"flex", padding:"6px 0", fontSize:12, gap:16}}>
              <div style={{width:200, fontWeight:700, color:"#C9A960", flexShrink:0}}>{r.role}</div>
              <div style={{flex:1, color:TH.textMuted}}>{r.access}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
function NewUserModal({ TH, t, lang, onClose, onCreated }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState("warehouse_keeper");
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: email.trim(), password, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onCreated();
      onClose();
    } catch (e) {
      setErr((e.message || String(e)) + t.edgeFnHint);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.7)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:200, padding:20,
    }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14,
        padding:28, width:"100%", maxWidth:440, boxShadow:TH.shadowLg,
      }}>
        <h2 style={{margin:"0 0 16px", fontFamily:"'Playfair Display',Georgia,serif", fontSize:22, fontWeight:700, color:TH.text}}>{t.newUserModalTitle}</h2>

        <label style={lbl(TH)}>{t.email}</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={inp(TH)} />

        <label style={lbl(TH)}>{t.tempPassword}</label>
        <input type="text" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} style={inp(TH)} />

        <label style={lbl(TH)}>{t.initialRole}</label>
        <select value={role} onChange={e=>setRole(e.target.value)} style={inp(TH)}>
          {ROLE_CATALOG.map(r => <option key={r.key} value={r.key}>{labelForRole(r.key, lang)}</option>)}
        </select>

        {err && (
          <div style={{background:"rgba(201,80,80,.10)", border:"1px solid rgba(201,80,80,.35)", borderRadius:8, padding:"10px 12px", color:"#d67373", fontSize:12, marginTop:12, whiteSpace:"pre-wrap"}}>
            {err}
          </div>
        )}

        <div style={{display:"flex", gap:8, marginTop:20}}>
          <button type="button" onClick={onClose} style={{
            flex:1, padding:"12px", background:"transparent",
            border:`1px solid ${TH.border}`, borderRadius:10, color:TH.text,
            cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit",
          }}>{t.cancel}</button>
          <button type="submit" disabled={busy} style={{
            flex:1, padding:"12px",
            background:"linear-gradient(135deg,#C9A960,#8B7A44)",
            border:"none", borderRadius:10, color:"#000",
            cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit",
            opacity: busy ? 0.6 : 1,
          }}>{busy ? t.creatingUser : t.createUserBtn}</button>
        </div>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
function styles(TH) {
  return {
    headerRow: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, gap:16, flexWrap:"wrap" },
    h1: { fontFamily:"'Playfair Display',Georgia,serif", fontSize:28, fontWeight:700, color:TH.text, margin:"0 0 4px" },
    sub: { color:TH.textMuted, fontSize:13, margin:0 },
    primaryBtn: {
      background:"linear-gradient(135deg,#C9A960,#8B7A44)", color:"#000",
      border:"none", padding:"10px 18px", borderRadius:10,
      fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
    },
    statsGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10, marginBottom:20 },
    toolbar: { display:"flex", gap:10, alignItems:"center", marginBottom:16, flexWrap:"wrap" },
    searchBox: {
      flex:1, minWidth:200, background:TH.bgCard, border:`1px solid ${TH.border}`,
      borderRadius:10, padding:"8px 12px", display:"flex", alignItems:"center", gap:8,
    },
    searchInput: {
      flex:1, background:"transparent", border:"none", outline:"none",
      color:TH.text, fontSize:13, fontFamily:"inherit",
    },
    filterChips: { display:"flex", gap:6, flexWrap:"wrap" },
    chip: {
      background:"transparent", border:`1px solid ${TH.border}`,
      color:TH.textMuted, padding:"6px 12px", borderRadius:6,
      fontSize:12, cursor:"pointer", fontFamily:"inherit",
    },
    chipActive: {
      background:"rgba(201,169,96,.15)", border:"1px solid rgba(201,169,96,.4)",
      color:"#C9A960", padding:"6px 12px", borderRadius:6,
      fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
    },
    errorBox: {
      background:"rgba(201,80,80,.10)", border:"1px solid rgba(201,80,80,.35)",
      borderRadius:8, padding:"14px 16px", color:"#d67373", fontSize:13, whiteSpace:"pre-wrap",
    },
  };
}
function lbl(TH) { return { display:"block", fontSize:11, fontWeight:600, color:TH.textMuted, marginBottom:5, marginTop:12, textTransform:"uppercase", letterSpacing:".5px" }; }
function inp(TH) { return { width:"100%", padding:"10px 12px", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }; }
