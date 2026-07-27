// ═══════════════════════════════════════════════════════════════════
// MaintenanceTracker.jsx — Hezi's maintenance projects dashboard
// Cloud version of the caesar-maintenance-tracker PWA.
// Categories: In Progress · Routine · Future. Bilingual he/en.
// Supabase table: maintenance_projects
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../supabase";

const PRIORITY = {
  urgent: { label: { he: "דחוף", en: "Urgent" },  color: "#D9634B" },
  high:   { label: { he: "גבוה",  en: "High" },    color: "#D99B4B" },
  med:    { label: { he: "בינוני", en: "Medium" }, color: "#5B9BD9" },
  medF:   { label: { he: "בינוני", en: "Medium" }, color: "#5B9BD9" },
};
const STATUS = {
  inprogress: { label: { he: "בביצוע",     en: "In progress" }, color: "#5B9BD9" },
  quotes:     { label: { he: "איסוף הצעות", en: "Collecting quotes" }, color: "#A985D9" },
  done:       { label: { he: "הושלם",       en: "Completed" }, color: "#6FAE7F" },
};

export default function MaintenanceTracker({ TH, lang = "en", isMobile = false, isAdmin = false }) {
  const L = lang === "he" ? "he" : "en";
  const rtl = L === "he";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [editing, setEditing] = useState(null);   // { row } | { new: category }
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("");
  const [priF, setPriF] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase
        .from('maintenance_projects')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('sort_order');
      if (e) throw e;
      setRows(data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function bf(obj) {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[L] || obj[L === "he" ? "en" : "he"] || "";
  }

  const inProgress = rows.filter(r => r.category === 'inprogress');
  const routine    = rows.filter(r => r.category === 'routine');
  const future     = rows.filter(r => r.category === 'future');

  async function updateProgress(id, pct) {
    const progress = pct / 100;
    setRows(rows.map(r => r.id === id ? { ...r, progress } : r));  // optimistic
    try {
      await supabase.from('maintenance_projects').update({ progress }).eq('id', id);
    } catch (e) { setError(e.message); load(); }
  }

  async function deleteRow(id) {
    if (!confirm(L === "he" ? "למחוק?" : "Delete this item?")) return;
    try {
      await supabase.from('maintenance_projects').update({ is_active: false }).eq('id', id);
      await load();
    } catch (e) { setError(e.message || String(e)); }
  }

  // ── Dashboard stats ──
  const activeCount = inProgress.length;
  const inProgressCount = inProgress.filter(p => p.status === 'inprogress').length;
  const quotesCount = inProgress.filter(p => p.status === 'quotes').length;
  const doneCount = inProgress.filter(p => p.status === 'done').length;
  const urgentCount = inProgress.filter(p => p.priority === 'urgent').length;
  const withProgress = inProgress.filter(p => typeof p.progress === 'number');
  const avgProgress = withProgress.length ? (withProgress.reduce((s, p) => s + Number(p.progress), 0) / withProgress.length) : 0;

  const T = {
    title:       { he: "מעקב פרויקטים אחזקה", en: "Maintenance Projects Tracker" },
    sub:         { he: "מעקב ובקרה אחר פרויקטים, עבודות שוטפות ותכנון", en: "Track projects, routine work and future planning" },
    dashboard:   { he: "לוח בקרה", en: "Dashboard" },
    inProgressTab:{ he: "בביצוע", en: "In Progress" },
    routineTab:  { he: "עבודות שוטפות", en: "Routine" },
    futureTab:   { he: "עתידי", en: "Future" },
    cActive:     { he: "סה\"כ פרויקטים פעילים", en: "Total active projects" },
    cInProgress: { he: "בביצוע", en: "In progress" },
    cQuotes:     { he: "איסוף הצעות", en: "Collecting quotes" },
    cDone:       { he: "הושלמו", en: "Completed" },
    cAvg:        { he: "התקדמות ממוצעת", en: "Average progress" },
    cUrgent:     { he: "עדיפות דחופה", en: "Urgent priority" },
    cFuture:     { he: "פרויקטים עתידיים", en: "Future projects" },
    cRoutine:    { he: "עבודות שוטפות", en: "Routine tasks" },
    owner:       { he: "אחראי", en: "Owner" },
    dueDate:     { he: "תאריך יעד", en: "Due date" },
    progress:    { he: "התקדמות", en: "Progress" },
    freq:        { he: "תדירות", en: "Frequency" },
    team:        { he: "צוות", en: "Team" },
    contractor:  { he: "קבלן", en: "Contractor" },
    notSet:      { he: "לא נקבע", en: "Not set" },
    noTitle:     { he: "(ללא כותרת)", en: "(no title)" },
    add:         { he: "הוסף", en: "Add" },
    edit:        { he: "ערוך", en: "Edit" },
    search:      { he: "חיפוש…", en: "Search…" },
    empty:       { he: "אין פריטים", en: "No items" },
    internal:    { he: "פנימי", en: "Internal" },
    external:    { he: "חיצוני", en: "External" },
  };
  const tr = (k) => T[k]?.[L] || k;

  const filteredIP = inProgress.filter(p => {
    if (statusF && p.status !== statusF) return false;
    if (priF && p.priority !== priF) return false;
    if (search) {
      const hay = [bf(p.title), bf(p.owner), bf(p.notes), p.title?.he, p.title?.en].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const tabs = [
    { k: "dashboard",  label: tr("dashboard") },
    { k: "inprogress", label: `${tr("inProgressTab")} (${inProgress.length})` },
    { k: "routine",    label: `${tr("routineTab")} (${routine.length})` },
    { k: "future",     label: `${tr("futureTab")} (${future.length})` },
  ];

  return (
    <div dir={rtl ? "rtl" : "ltr"} style={{ textAlign: rtl ? "right" : "left" }}>
      {editing && (
        <ProjectEditor
          TH={TH} L={L} tr={tr} bf={bf}
          row={editing.row} category={editing.new || editing.row?.category}
          nextSort={rows.filter(r => r.category === (editing.new || editing.row?.category)).length + 1}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 400, color: TH.text, fontFamily: "'Playfair Display', Georgia, serif" }}>
          {tr("title")}
        </div>
        <div style={{ fontSize: 13, color: TH.textMuted, marginTop: 2 }}>{tr("sub")}</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: `1px solid ${TH.border}`, paddingBottom: 8, overflowX: "auto" }}>
        {tabs.map(t => {
          const active = t.k === tab;
          return (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              background: active ? TH.accentBg : "transparent",
              border: `1px solid ${active ? TH.accentBorder : "transparent"}`,
              borderRadius: 9, color: active ? TH.accentText : TH.textMuted,
              padding: "9px 14px", cursor: "pointer", fontSize: 13,
              fontWeight: active ? 700 : 500, fontFamily: "inherit", whiteSpace: "nowrap",
            }}>{t.label}</button>
          );
        })}
      </div>

      {error && <div style={{ background: "rgba(217,99,75,0.1)", border: "1px solid rgba(217,99,75,0.3)", borderRadius: 10, padding: "12px 14px", color: "#D9634B", fontSize: 13, marginBottom: 14 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 30, textAlign: "center", color: TH.textMuted }}>…</div>
      ) : (
        <>
          {tab === "dashboard" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
                <StatCard TH={TH} num={activeCount} lbl={tr("cActive")} />
                <StatCard TH={TH} num={inProgressCount} lbl={tr("cInProgress")} />
                <StatCard TH={TH} num={quotesCount} lbl={tr("cQuotes")} />
                <StatCard TH={TH} num={doneCount} lbl={tr("cDone")} />
                <StatCard TH={TH} num={Math.round(avgProgress * 100) + "%"} lbl={tr("cAvg")} />
                <StatCard TH={TH} num={urgentCount} lbl={tr("cUrgent")} alert={urgentCount > 0} />
                <StatCard TH={TH} num={future.length} lbl={tr("cFuture")} />
                <StatCard TH={TH} num={routine.length} lbl={tr("cRoutine")} />
              </div>

              {/* Progress bars */}
              <div style={{ background: TH.bgCard, border: `1px solid ${TH.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TH.text, marginBottom: 12 }}>{tr("progress")}</div>
                {withProgress.filter(p => bf(p.title)).map(p => {
                  const title = bf(p.title);
                  const pct = Math.round(Number(p.progress) * 100);
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: isMobile ? 100 : 200, fontSize: 12, color: TH.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={title}>{title}</div>
                      <div style={{ flex: 1, height: 8, background: TH.bgInput, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#B8935A,#8B7040)" }} />
                      </div>
                      <div style={{ width: 40, fontSize: 12, color: TH.accent, fontWeight: 700, textAlign: "center" }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "inprogress" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr("search")} style={{ ...inp(TH), flex: 1, minWidth: 160 }} />
                <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ ...inp(TH), width: "auto" }}>
                  <option value="">{L === "he" ? "כל הסטטוסים" : "All statuses"}</option>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label[L]}</option>)}
                </select>
                <select value={priF} onChange={e => setPriF(e.target.value)} style={{ ...inp(TH), width: "auto" }}>
                  <option value="">{L === "he" ? "כל העדיפויות" : "All priorities"}</option>
                  {["urgent", "high", "med"].map(k => <option key={k} value={k}>{PRIORITY[k].label[L]}</option>)}
                </select>
                <button onClick={() => setEditing({ new: "inprogress" })} style={btnGold()}>+ {tr("add")}</button>
              </div>

              {filteredIP.length === 0 ? (
                <Empty TH={TH} text={tr("empty")} />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(340px,1fr))", gap: 12 }}>
                  {filteredIP.map(p => {
                    const title = bf(p.title), notes = bf(p.notes);
                    const st = STATUS[p.status], pr = PRIORITY[p.priority];
                    return (
                      <div key={p.id} style={{ background: TH.bgCard, border: `1px solid ${TH.border}`, borderRadius: 12, padding: 14, borderTop: `2px solid ${pr?.color || TH.border}` }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: title ? TH.text : TH.textDim, marginBottom: 8 }}>{title || tr("noTitle")}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                          {st && <Badge color={st.color}>{st.label[L]}</Badge>}
                          {pr && <Badge color={pr.color}>{pr.label[L]}</Badge>}
                        </div>
                        <div style={{ fontSize: 11, color: TH.textMuted, marginBottom: 6 }}>
                          {tr("owner")}: <b style={{ color: TH.text }}>{bf(p.owner) || "—"}</b>
                          {p.due_date && <> · {tr("dueDate")}: <b style={{ color: TH.text }}>{p.due_date}</b></>}
                        </div>
                        {notes && <div style={{ fontSize: 11, color: TH.textMuted, padding: 8, background: TH.bgInput, borderRadius: 6, marginBottom: 8 }}>{notes}</div>}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 11, color: TH.textMuted }}>{tr("progress")}</span>
                          <input type="range" min="0" max="100" value={Math.round((Number(p.progress) || 0) * 100)} onChange={e => updateProgress(p.id, Number(e.target.value))} style={{ flex: 1 }} />
                          <span style={{ fontSize: 12, color: TH.accent, fontWeight: 700, width: 36 }}>{p.progress != null ? Math.round(Number(p.progress) * 100) + "%" : "—"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, justifyContent: rtl ? "flex-start" : "flex-end" }}>
                          <button onClick={() => setEditing({ row: p })} style={ghost(TH)}>{tr("edit")}</button>
                          <button onClick={() => deleteRow(p.id)} style={{ ...ghost(TH), color: "#D9634B" }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "routine" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <button onClick={() => setEditing({ new: "routine" })} style={btnGold()}>+ {tr("add")}</button>
              </div>
              {routine.length === 0 ? <Empty TH={TH} text={tr("empty")} /> : (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(340px,1fr))", gap: 12 }}>
                  {routine.map(r => (
                    <div key={r.id} style={{ background: TH.bgCard, border: `1px solid ${TH.border}`, borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: TH.text, marginBottom: 8 }}>{bf(r.title) || tr("noTitle")}</div>
                      <div style={{ fontSize: 11, color: TH.textMuted, marginBottom: 4 }}>{tr("owner")}: <b style={{ color: TH.text }}>{bf(r.owner) || "—"}</b></div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                        {bf(r.freq) && <Badge color="#5B9BD9">{bf(r.freq)}</Badge>}
                        {bf(r.team) && <Badge color={TH.textMuted}>{bf(r.team)}</Badge>}
                      </div>
                      {bf(r.notes) && <div style={{ fontSize: 11, color: TH.textMuted, padding: 8, background: TH.bgInput, borderRadius: 6, marginBottom: 8 }}>{bf(r.notes)}</div>}
                      <div style={{ display: "flex", gap: 6, justifyContent: rtl ? "flex-start" : "flex-end" }}>
                        <button onClick={() => setEditing({ row: r })} style={ghost(TH)}>{tr("edit")}</button>
                        <button onClick={() => deleteRow(r.id)} style={{ ...ghost(TH), color: "#D9634B" }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "future" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <button onClick={() => setEditing({ new: "future" })} style={btnGold()}>+ {tr("add")}</button>
              </div>
              {future.length === 0 ? <Empty TH={TH} text={tr("empty")} /> : (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(340px,1fr))", gap: 12 }}>
                  {future.map(f => {
                    const pr = PRIORITY[f.priority];
                    return (
                      <div key={f.id} style={{ background: TH.bgCard, border: `1px solid ${TH.border}`, borderRadius: 12, padding: 14, borderTop: `2px solid ${pr?.color || TH.border}` }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: TH.text, marginBottom: 8 }}>{bf(f.title) || tr("noTitle")}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                          {pr && <Badge color={pr.color}>{pr.label[L]}</Badge>}
                          {f.contractor && <Badge color={TH.textMuted}>{f.contractor === "external" ? tr("external") : tr("internal")}</Badge>}
                        </div>
                        <div style={{ fontSize: 11, color: TH.textMuted, marginBottom: 6 }}>{tr("owner")}: <b style={{ color: TH.text }}>{bf(f.owner) || "—"}</b></div>
                        {bf(f.notes) && <div style={{ fontSize: 11, color: TH.textMuted, padding: 8, background: TH.bgInput, borderRadius: 6, marginBottom: 8 }}>{bf(f.notes)}</div>}
                        <div style={{ display: "flex", gap: 6, justifyContent: rtl ? "flex-start" : "flex-end" }}>
                          <button onClick={() => setEditing({ row: f })} style={ghost(TH)}>{tr("edit")}</button>
                          <button onClick={() => deleteRow(f.id)} style={{ ...ghost(TH), color: "#D9634B" }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Editor modal ──────────────────────────────────────────────────
function ProjectEditor({ TH, L, tr, bf, row, category, nextSort, onClose, onSaved }) {
  const isNew = !row;
  const cat = category;
  const [titleHe, setTitleHe] = useState(row?.title?.he || "");
  const [titleEn, setTitleEn] = useState(row?.title?.en || "");
  const [ownerHe, setOwnerHe] = useState(row?.owner?.he || "");
  const [ownerEn, setOwnerEn] = useState(row?.owner?.en || "");
  const [notesHe, setNotesHe] = useState(row?.notes?.he || "");
  const [notesEn, setNotesEn] = useState(row?.notes?.en || "");
  const [status, setStatus] = useState(row?.status || "inprogress");
  const [priority, setPriority] = useState(row?.priority || "med");
  const [dueDate, setDueDate] = useState(row?.due_date || "");
  const [progress, setProgress] = useState(row?.progress != null ? Math.round(Number(row.progress) * 100) : 0);
  const [freqHe, setFreqHe] = useState(row?.freq?.he || "");
  const [freqEn, setFreqEn] = useState(row?.freq?.en || "");
  const [teamHe, setTeamHe] = useState(row?.team?.he || "");
  const [teamEn, setTeamEn] = useState(row?.team?.en || "");
  const [contractor, setContractor] = useState(row?.contractor || "internal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    setBusy(true); setError(null);
    try {
      const payload = {
        category: cat,
        title: { he: titleHe, en: titleEn },
        owner: { he: ownerHe, en: ownerEn },
        notes: { he: notesHe, en: notesEn },
      };
      if (cat === "inprogress") {
        payload.status = status;
        payload.priority = priority;
        payload.due_date = dueDate || null;
        payload.progress = progress / 100;
      } else if (cat === "routine") {
        payload.freq = { he: freqHe, en: freqEn };
        payload.team = { he: teamHe, en: teamEn };
      } else if (cat === "future") {
        payload.priority = priority;
        payload.contractor = contractor;
      }
      if (isNew) {
        payload.sort_order = nextSort;
        const { data: { user } } = await supabase.auth.getUser();
        payload.created_by = user?.id;
        const { error: e } = await supabase.from('maintenance_projects').insert([payload]);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('maintenance_projects').update(payload).eq('id', row.id);
        if (e) throw e;
      }
      onSaved?.();
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} dir="ltr">
      <div style={{ background: TH.bgCard, border: `1px solid ${TH.border}`, borderRadius: 14, padding: 20, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 400, color: TH.text, fontFamily: "'Playfair Display', Georgia, serif" }}>
            {isNew ? tr("add") : tr("edit")} — {cat}
          </div>
          <button onClick={onClose} disabled={busy} style={{ background: "transparent", border: "none", color: TH.textMuted, fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>

        <Row2 label="Title (HE / EN)">
          <input value={titleHe} onChange={e => setTitleHe(e.target.value)} placeholder="עברית" dir="rtl" style={inp(TH)} />
          <input value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder="English" style={inp(TH)} />
        </Row2>
        <Row2 label="Owner (HE / EN)">
          <input value={ownerHe} onChange={e => setOwnerHe(e.target.value)} placeholder="עברית" dir="rtl" style={inp(TH)} />
          <input value={ownerEn} onChange={e => setOwnerEn(e.target.value)} placeholder="English" style={inp(TH)} />
        </Row2>

        {cat === "inprogress" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div>
                <Lbl TH={TH}>Status</Lbl>
                <select value={status} onChange={e => setStatus(e.target.value)} style={inp(TH)}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label.en}</option>)}
                </select>
              </div>
              <div>
                <Lbl TH={TH}>Priority</Lbl>
                <select value={priority} onChange={e => setPriority(e.target.value)} style={inp(TH)}>
                  {["urgent", "high", "med"].map(k => <option key={k} value={k}>{PRIORITY[k].label.en}</option>)}
                </select>
              </div>
              <div>
                <Lbl TH={TH}>Due (DD/MM/YYYY)</Lbl>
                <input value={dueDate} onChange={e => setDueDate(e.target.value)} placeholder="30/07/2026" style={inp(TH)} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <Lbl TH={TH}>Progress: {progress}%</Lbl>
              <input type="range" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
          </>
        )}

        {cat === "routine" && (
          <>
            <Row2 label="Frequency (HE / EN)">
              <input value={freqHe} onChange={e => setFreqHe(e.target.value)} placeholder="עברית" dir="rtl" style={inp(TH)} />
              <input value={freqEn} onChange={e => setFreqEn(e.target.value)} placeholder="English" style={inp(TH)} />
            </Row2>
            <Row2 label="Team (HE / EN)">
              <input value={teamHe} onChange={e => setTeamHe(e.target.value)} placeholder="עברית" dir="rtl" style={inp(TH)} />
              <input value={teamEn} onChange={e => setTeamEn(e.target.value)} placeholder="English" style={inp(TH)} />
            </Row2>
          </>
        )}

        {cat === "future" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <Lbl TH={TH}>Priority</Lbl>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={inp(TH)}>
                {["high", "medF"].map(k => <option key={k} value={k}>{PRIORITY[k].label.en}</option>)}
              </select>
            </div>
            <div>
              <Lbl TH={TH}>Contractor</Lbl>
              <select value={contractor} onChange={e => setContractor(e.target.value)} style={inp(TH)}>
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </div>
          </div>
        )}

        <Row2 label="Notes (HE / EN)">
          <textarea value={notesHe} onChange={e => setNotesHe(e.target.value)} placeholder="עברית" dir="rtl" rows={2} style={{ ...inp(TH), resize: "vertical" }} />
          <textarea value={notesEn} onChange={e => setNotesEn(e.target.value)} placeholder="English" rows={2} style={{ ...inp(TH), resize: "vertical" }} />
        </Row2>

        {error && <div style={{ background: "rgba(217,99,75,0.1)", border: "1px solid rgba(217,99,75,0.3)", borderRadius: 8, padding: "10px 12px", color: "#D9634B", fontSize: 12, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={busy} style={ghost(TH)}>Cancel</button>
          <button onClick={save} disabled={busy} style={btnGold()}>{busy ? "…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ TH, num, lbl, alert }) {
  return (
    <div style={{ background: alert ? "rgba(217,99,75,0.1)" : TH.bgCard, border: `1px solid ${alert ? "rgba(217,99,75,0.4)" : TH.border}`, borderRadius: 12, padding: "16px 14px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #B8935A, transparent)" }} />
      <div style={{ fontSize: 30, fontWeight: 400, color: alert ? "#D9634B" : "#B8935A", fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1 }}>{num}</div>
      <div style={{ fontSize: 12, color: TH.textMuted, marginTop: 8 }}>{lbl}</div>
    </div>
  );
}
function Badge({ color, children }) {
  return <span style={{ fontSize: 10, fontWeight: 700, color: color, background: `${color}22`, padding: "3px 9px", borderRadius: 5, whiteSpace: "nowrap" }}>{children}</span>;
}
function Empty({ TH, text }) {
  return <div style={{ padding: 40, background: TH.bgCard, border: `1px dashed ${TH.border}`, borderRadius: 12, color: TH.textMuted, textAlign: "center" }}>{text}</div>;
}
function Row2({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "#8B8580", marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{children}</div>
    </div>
  );
}
function Lbl({ TH, children }) {
  return <div style={{ fontSize: 11, color: TH.textMuted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{children}</div>;
}
function inp(TH) { return { width: "100%", background: TH.bgInput, border: `1px solid ${TH.border}`, borderRadius: 8, padding: "9px 12px", color: TH.text, fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }; }
function ghost(TH) { return { background: "transparent", border: `1px solid ${TH.border}`, borderRadius: 8, color: TH.textMuted, padding: "9px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }; }
function btnGold() { return { background: "linear-gradient(135deg,#B8935A,#8B7040)", border: "none", borderRadius: 8, color: "#000", padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 800, fontFamily: "inherit" }; }
