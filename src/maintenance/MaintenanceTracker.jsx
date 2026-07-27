// ═══════════════════════════════════════════════════════════════════
// MaintenanceTracker.jsx — Hezi's maintenance projects dashboard
// Styled to EXACTLY match the caesar-maintenance-tracker PWA:
// dark navy theme, gold accents, colored priority/status badges,
// gradient progress bars, Playfair headings.
// Uses its OWN palette (P) — independent of the system TH theme.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import * as XLSX from "xlsx";

const P = {
  bg: "#10141c", bgPanel: "#171c26", bgRaised: "#1d2330", bgInput: "#0d1017",
  line: "#2a3140", gold: "#c9a960", goldSoft: "#8f7c4d", text: "#eae6da", textDim: "#9aa3b2",
  urgent: "#d9634b", high: "#d99b4b", med: "#5b9bd9", done: "#6fae7f", quotes: "#a985d9",
  radius: 14, serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
  sans: "'Assistant', -apple-system, 'Segoe UI', Tahoma, sans-serif",
};

const PRIORITY = {
  urgent: { label: { he: "דחוף", en: "Urgent" }, color: P.urgent },
  high:   { label: { he: "גבוה", en: "High" }, color: P.high },
  med:    { label: { he: "בינוני", en: "Medium" }, color: P.med },
  medF:   { label: { he: "בינוני", en: "Medium" }, color: P.med },
};
const STATUS = {
  inprogress: { label: { he: "בביצוע", en: "In progress" }, color: P.gold },
  quotes:     { label: { he: "איסוף הצעות", en: "Collecting quotes" }, color: P.quotes },
  done:       { label: { he: "הושלם", en: "Completed" }, color: P.done },
};

export default function MaintenanceTracker({ TH, lang = "en", isMobile = false, isAdmin = false }) {
  const L = lang === "he" ? "he" : "en";
  const rtl = L === "he";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("");
  const [priF, setPriF] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase
        .from('maintenance_projects').select('*')
        .eq('is_active', true).order('category').order('sort_order');
      if (e) throw e;
      setRows(data || []);
    } catch (e) { setError(e.message || String(e)); }
    finally { setLoading(false); }
  }

  function bf(obj) {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[L] || obj[L === "he" ? "en" : "he"] || "";
  }
  function bfL(obj, rl) {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[rl] || obj[rl === "he" ? "en" : "he"] || "";
  }

  const inProgress = rows.filter(r => r.category === 'inprogress');
  const routine = rows.filter(r => r.category === 'routine');
  const future = rows.filter(r => r.category === 'future');

  async function updateProgress(id, pct) {
    const progress = pct / 100;
    setRows(rows.map(r => r.id === id ? { ...r, progress } : r));
    try { await supabase.from('maintenance_projects').update({ progress }).eq('id', id); }
    catch (e) { setError(e.message); load(); }
  }
  async function deleteRow(id) {
    if (!confirm(L === "he" ? "למחוק?" : "Delete this item?")) return;
    try { await supabase.from('maintenance_projects').update({ is_active: false }).eq('id', id); await load(); }
    catch (e) { setError(e.message || String(e)); }
  }

  function statusLabel(k, rl) { return STATUS[k]?.label[rl] || k || ""; }
  function priLabel(k, rl) { return PRIORITY[k]?.label[rl] || k || ""; }

  // Progress color: 0% = red -> 50% = yellow -> 100% = green
  function progressColor(pct) {
    const t = Math.max(0, Math.min(100, pct)) / 100;
    let r, g;
    if (t < 0.5) {           // red -> yellow
      r = 217; g = Math.round(75 + (200 - 75) * (t / 0.5));
    } else {                 // yellow -> green
      r = Math.round(217 - (217 - 111) * ((t - 0.5) / 0.5));
      g = Math.round(200 - (200 - 174) * ((t - 0.5) / 0.5));
    }
    const b = 75;
    return `rgb(${r},${g},${b})`;
  }

  const activeCount = inProgress.length;
  const inProgressCount = inProgress.filter(p => p.status === 'inprogress').length;
  const quotesCount = inProgress.filter(p => p.status === 'quotes').length;
  const doneCount = inProgress.filter(p => p.status === 'done').length;
  const urgentCount = inProgress.filter(p => p.priority === 'urgent').length;
  const withProgress = inProgress.filter(p => typeof p.progress === 'number');
  const avgProgress = withProgress.length ? (withProgress.reduce((s, p) => s + Number(p.progress), 0) / withProgress.length) : 0;

  const T = {
    title: { he: "מעקב פרויקטים אחזקה", en: "Maintenance Projects Tracker" },
    sub: { he: "מעקב ובקרה אחר פרויקטים, עבודות שוטפות ותכנון", en: "Track projects, routine work and future planning" },
    dashboard: { he: "לוח בקרה", en: "Dashboard" },
    inProgressTab: { he: "בביצוע", en: "In Progress" },
    routineTab: { he: "עבודות שוטפות", en: "Routine" },
    futureTab: { he: "עתידי", en: "Future" },
    cActive: { he: "סה\"כ פרויקטים פעילים", en: "Total active projects" },
    cInProgress: { he: "בביצוע", en: "In progress" },
    cQuotes: { he: "איסוף הצעות", en: "Collecting quotes" },
    cDone: { he: "הושלמו", en: "Completed" },
    cAvg: { he: "התקדמות ממוצעת", en: "Average progress" },
    cUrgent: { he: "עדיפות דחופה", en: "Urgent priority" },
    cFuture: { he: "פרויקטים עתידיים", en: "Future projects" },
    cRoutine: { he: "עבודות שוטפות", en: "Routine tasks" },
    progressT: { he: "התקדמות", en: "Progress" },
    owner: { he: "אחראי", en: "Owner" },
    dueDate: { he: "תאריך יעד", en: "Due date" },
    noTitle: { he: "(ללא כותרת)", en: "(no title)" },
    add: { he: "הוסף", en: "Add" },
    edit: { he: "ערוך", en: "Edit" },
    search: { he: "חיפוש…", en: "Search…" },
    empty: { he: "אין פריטים", en: "No items" },
    allStatus: { he: "כל הסטטוסים", en: "All statuses" },
    allPri: { he: "כל העדיפויות", en: "All priorities" },
    internal: { he: "פנימי", en: "Internal" },
    external: { he: "חיצוני", en: "External" },
    exportPdf: { he: "ייצוא PDF", en: "Export PDF" },
    exportExcel: { he: "ייצוא Excel", en: "Export Excel" },
    noProgress: { he: "אין נתוני התקדמות", en: "No progress data" },
  };
  const tr = (k) => T[k]?.[L] || k;

  function exportPdf(rl = L) {
    const now = new Date().toLocaleDateString(rl === "he" ? "he-IL" : "en-GB");
    const dir = rl === "he" ? "rtl" : "ltr";
    const avg = withProgress.length ? Math.round(withProgress.reduce((s, p) => s + Number(p.progress), 0) / withProgress.length * 100) : 0;
    const TT = {
      title: { he: "דוח פרויקטי אחזקה", en: "Maintenance Projects Report" },
      gen: { he: "הופק בתאריך", en: "Generated" }, summary: { he: "סיכום", en: "Summary" },
      sec1: { he: "פרויקטים בביצוע", en: "In-Progress Projects" }, sec2: { he: "עבודות שוטפות", en: "Routine Tasks" }, sec3: { he: "פרויקטים עתידיים", en: "Future Projects" },
      cNum: { he: "מס'", en: "#" }, cDesc: { he: "תיאור", en: "Description" }, cOwner: { he: "אחראי", en: "Owner" }, cStatus: { he: "סטטוס", en: "Status" },
      cDue: { he: "תאריך יעד", en: "Due" }, cPri: { he: "עדיפות", en: "Priority" }, cProg: { he: "התקדמות", en: "Progress" }, cNotes: { he: "הערות", en: "Notes" },
      cFreq: { he: "תדירות", en: "Frequency" }, cTeam: { he: "צוות", en: "Team" }, cContractor: { he: "קבלן", en: "Contractor" }, cTarget: { he: "יעד", en: "Target" },
      active: { he: "פרויקטים פעילים", en: "Active projects" }, avg: { he: "התקדמות ממוצעת", en: "Avg progress" }, urgent: { he: "דחוף", en: "Urgent" },
      quotes: { he: "איסוף הצעות", en: "Quotes" }, done: { he: "הושלמו", en: "Completed" }, future: { he: "עתידיים", en: "Future" },
      internal: { he: "פנימי", en: "Internal" }, external: { he: "חיצוני", en: "External" }, footer: { he: "Caesar Projects — מסמך פנימי", en: "Caesar Projects — Internal document" },
    };
    const G = k => TT[k]?.[rl] || k;
    const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const ipRows = inProgress.map(p => `<tr><td>${esc(p.sort_order)}</td><td>${esc(bfL(p.title, rl)) || "—"}</td><td>${esc(bfL(p.owner, rl)) || "—"}</td><td>${statusLabel(p.status, rl)}</td><td>${esc(p.due_date) || "—"}</td><td>${priLabel(p.priority, rl)}</td><td>${p.progress != null ? Math.round(Number(p.progress) * 100) + "%" : "—"}</td><td>${esc(bfL(p.notes, rl))}</td></tr>`).join("");
    const rtRows = routine.map(r => `<tr><td>${esc(bfL(r.title, rl))}</td><td>${esc(bfL(r.owner, rl)) || "—"}</td><td>${esc(bfL(r.freq, rl)) || "—"}</td><td>${esc(bfL(r.team, rl)) || "—"}</td><td>${esc(bfL(r.notes, rl))}</td></tr>`).join("");
    const ftRows = future.map(f => `<tr><td>${esc(bfL(f.title, rl))}</td><td>${esc(bfL(f.owner, rl)) || "—"}</td><td>${f.contractor === "internal" ? G("internal") : G("external")}</td><td>${priLabel(f.priority, rl)}</td><td>${esc(f.target_date) || "—"}</td><td>${esc(bfL(f.notes, rl))}</td></tr>`).join("");
    const html = `<!DOCTYPE html><html lang="${rl}" dir="${dir}"><head><meta charset="utf-8"><title>${G("title")}</title>
      <style>body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#111;padding:24px;}.rpt-header{border-bottom:3px solid #B8935A;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;}.rpt-header h1{font-size:22px;margin:0;}.rpt-header .sub{font-size:12px;color:#666;margin-top:4px;}.rpt-header .date{font-size:12px;color:#444;}h2{font-size:15px;margin:22px 0 8px;padding-bottom:5px;border-bottom:1.5px solid #B8935A;color:#111;}table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px;}th{background:#f5f0e2;text-align:start;padding:6px 8px;border:1px solid #d8d2c0;font-weight:700;}td{padding:6px 8px;border:1px solid #ddd;vertical-align:top;}tr{page-break-inside:avoid;}.rpt-stats{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px;}.rpt-stat{border:1px solid #d8d2c0;border-radius:6px;padding:8px 14px;font-size:11px;}.rpt-stat b{display:block;font-size:17px;color:#8f6f1f;}.rpt-footer{margin-top:26px;font-size:10px;color:#888;border-top:1px solid #ddd;padding-top:8px;}@media print{@page{margin:14mm;}}</style></head><body>
      <div class="rpt-header"><div><h1>${G("title")}</h1><div class="sub">Caesar Projects</div></div><div class="date">${G("gen")}: ${now}</div></div>
      <h2>${G("summary")}</h2><div class="rpt-stats"><div class="rpt-stat"><b>${inProgress.length}</b>${G("active")}</div><div class="rpt-stat"><b>${avg}%</b>${G("avg")}</div><div class="rpt-stat"><b>${urgentCount}</b>${G("urgent")}</div><div class="rpt-stat"><b>${quotesCount}</b>${G("quotes")}</div><div class="rpt-stat"><b>${doneCount}</b>${G("done")}</div><div class="rpt-stat"><b>${future.length}</b>${G("future")}</div></div>
      <h2>${G("sec1")}</h2><table><thead><tr><th style="width:24px">${G("cNum")}</th><th>${G("cDesc")}</th><th>${G("cOwner")}</th><th>${G("cStatus")}</th><th>${G("cDue")}</th><th>${G("cPri")}</th><th style="width:44px">${G("cProg")}</th><th>${G("cNotes")}</th></tr></thead><tbody>${ipRows}</tbody></table>
      <h2>${G("sec2")}</h2><table><thead><tr><th>${G("cDesc")}</th><th>${G("cOwner")}</th><th>${G("cFreq")}</th><th>${G("cTeam")}</th><th>${G("cNotes")}</th></tr></thead><tbody>${rtRows}</tbody></table>
      <h2>${G("sec3")}</h2><table><thead><tr><th>${G("cDesc")}</th><th>${G("cOwner")}</th><th>${G("cContractor")}</th><th>${G("cPri")}</th><th>${G("cTarget")}</th><th>${G("cNotes")}</th></tr></thead><tbody>${ftRows}</tbody></table>
      <div class="rpt-footer">${G("footer")} · ${now}</div>
      <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { alert(L === "he" ? "אנא אפשר חלונות קופצים" : "Please allow pop-ups"); return; }
    w.document.write(html); w.document.close();
  }

  function exportExcel(rl = L) {
    try {
      const now = new Date().toLocaleDateString(rl === "he" ? "he-IL" : "en-GB");
      const avg = withProgress.length ? Math.round(withProgress.reduce((s, p) => s + Number(p.progress), 0) / withProgress.length * 100) : 0;
      const dashAoa = [
        [tr("title")], [(L === "he" ? "הופק" : "Generated") + ": " + now], [],
        [L === "he" ? "מדד" : "Metric", L === "he" ? "ערך" : "Value"],
        [tr("cActive"), inProgress.length], [tr("cInProgress"), inProgressCount],
        [tr("cQuotes"), quotesCount], [tr("cDone"), doneCount],
        [tr("cAvg"), avg + "%"], [tr("cUrgent"), urgentCount],
        [tr("cFuture"), future.length], [tr("cRoutine"), routine.length],
      ];
      const ipAoa = [["#", "Description", "Owner", "Status", "Due", "Priority", "Progress", "Notes"],
        ...inProgress.map(p => [p.sort_order, bfL(p.title, rl), bfL(p.owner, rl), statusLabel(p.status, rl), p.due_date || "", priLabel(p.priority, rl), p.progress != null ? Math.round(Number(p.progress) * 100) + "%" : "", bfL(p.notes, rl)])];
      const rtAoa = [["Description", "Owner", "Frequency", "Team", "Notes"],
        ...routine.map(r => [bfL(r.title, rl), bfL(r.owner, rl), bfL(r.freq, rl), bfL(r.team, rl), bfL(r.notes, rl)])];
      const ftAoa = [["Description", "Owner", "Contractor", "Priority", "Target", "Notes"],
        ...future.map(f => [bfL(f.title, rl), bfL(f.owner, rl), f.contractor === "internal" ? "Internal" : "External", priLabel(f.priority, rl), f.target_date || "", bfL(f.notes, rl)])];
      const wb = XLSX.utils.book_new();
      if (rl === "he") wb.Workbook = { Views: [{ RTL: true }] };
      const addSheet = (aoa, name, widths) => {
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!cols"] = widths.map(w => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
      };
      addSheet(dashAoa, "Dashboard", [38, 14]);
      addSheet(ipAoa, "In Progress", [5, 55, 22, 24, 13, 10, 9, 40]);
      addSheet(rtAoa, "Routine", [55, 22, 14, 22, 40]);
      addSheet(ftAoa, "Future", [55, 22, 18, 10, 13, 40]);
      XLSX.writeFile(wb, "caesar-maintenance-report-" + new Date().toISOString().slice(0, 10) + ".xlsx");
    } catch (e) { setError(e.message || String(e)); }
  }

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
    { k: "dashboard", label: tr("dashboard") },
    { k: "inprogress", label: `${tr("inProgressTab")} (${inProgress.length})` },
    { k: "routine", label: `${tr("routineTab")} (${routine.length})` },
    { k: "future", label: `${tr("futureTab")} (${future.length})` },
  ];

  return (
    <div dir={rtl ? "rtl" : "ltr"} style={{
      background: `radial-gradient(1200px 800px at 85% -10%, #1b2130 0%, ${P.bg} 55%) ${P.bg}`,
      color: P.text, fontFamily: P.sans, textAlign: rtl ? "right" : "left",
      margin: isMobile ? "-16px" : "-24px", padding: isMobile ? 16 : 24, minHeight: "80vh", borderRadius: 12,
    }}>
      {editing && (
        <ProjectEditor L={L} tr={tr} row={editing.row} category={editing.new || editing.row?.category}
          nextSort={rows.filter(r => r.category === (editing.new || editing.row?.category)).length + 1}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}

      <div style={{ borderBottom: `1px solid ${P.line}`, paddingBottom: 18, marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: `1.5px solid ${P.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: P.serif, fontSize: 20, color: P.gold, flexShrink: 0 }}>&#937;</div>
          <div>
            <div style={{ fontFamily: P.serif, fontWeight: 700, fontSize: 22, letterSpacing: "0.3px", color: P.text }}>{tr("title")}</div>
            <div style={{ fontSize: 12.5, color: P.textDim, marginTop: 2 }}>{tr("sub")}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => exportPdf()} style={btnGhost()}>{tr("exportPdf")}</button>
          <button onClick={() => exportExcel()} style={btnGold()}>{tr("exportExcel")}</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {tabs.map(t => {
          const active = t.k === tab;
          return (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              background: active ? P.gold : P.bgPanel, border: `1px solid ${active ? P.gold : P.line}`,
              color: active ? "#171208" : P.textDim, padding: "9px 16px", borderRadius: 999, fontSize: 13.5,
              cursor: "pointer", fontWeight: active ? 600 : 400, fontFamily: P.sans, whiteSpace: "nowrap",
            }}>{t.label}</button>
          );
        })}
      </div>

      {error && <div style={{ background: "rgba(217,99,75,0.12)", border: `1px solid rgba(217,99,75,0.4)`, borderRadius: 10, padding: "12px 14px", color: P.urgent, fontSize: 13, marginBottom: 14 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 50, textAlign: "center", color: P.textDim }}>…</div>
      ) : (
        <>
          {tab === "dashboard" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 22 }}>
                <Card num={activeCount} lbl={tr("cActive")} />
                <Card num={inProgressCount} lbl={tr("cInProgress")} />
                <Card num={quotesCount} lbl={tr("cQuotes")} />
                <Card num={doneCount} lbl={tr("cDone")} />
                <Card num={Math.round(avgProgress * 100) + "%"} lbl={tr("cAvg")} />
                <Card num={urgentCount} lbl={tr("cUrgent")} urgent />
                <Card num={future.length} lbl={tr("cFuture")} />
                <Card num={routine.length} lbl={tr("cRoutine")} />
              </div>
              <div style={panel()}>
                <h2 style={panelH2()}>{tr("progressT")}</h2>
                {withProgress.filter(p => bf(p.title)).length === 0 ? (
                  <p style={{ color: P.textDim, fontSize: 13 }}>{tr("noProgress")}</p>
                ) : withProgress.filter(p => bf(p.title)).map(p => {
                  const title = bf(p.title);
                  const pct = Math.round(Number(p.progress) * 100);
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontSize: 13 }}>
                      <div style={{ width: isMobile ? 110 : 160, flexShrink: 0, color: P.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={title}>{title}</div>
                      <div style={{ flex: 1, height: 8, background: P.bgInput, borderRadius: 99, overflow: "hidden", border: `1px solid ${P.line}` }}>
                        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: progressColor(pct), transition: "width .4s ease, background .3s ease" }} />
                      </div>
                      <div style={{ width: 38, textAlign: rtl ? "left" : "right", color: progressColor(pct), fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "inprogress" && (
            <div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr("search")} style={{ ...inputStyle(), minWidth: 220, flex: 1 }} />
                <select value={statusF} onChange={e => setStatusF(e.target.value)} style={inputStyle()}>
                  <option value="">{tr("allStatus")}</option>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label[L]}</option>)}
                </select>
                <select value={priF} onChange={e => setPriF(e.target.value)} style={inputStyle()}>
                  <option value="">{tr("allPri")}</option>
                  {["urgent", "high", "med"].map(k => <option key={k} value={k}>{PRIORITY[k].label[L]}</option>)}
                </select>
                <button onClick={() => setEditing({ new: "inprogress" })} style={btnGold()}>+ {tr("add")}</button>
              </div>
              {filteredIP.length === 0 ? <EmptyState text={tr("empty")} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredIP.map(p => {
                    const title = bf(p.title), notes = bf(p.notes);
                    const st = STATUS[p.status], pr = PRIORITY[p.priority];
                    return (
                      <div key={p.id} style={projCard()}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ color: P.gold, fontFamily: P.serif, fontSize: 14, opacity: 0.8, flexShrink: 0 }}>#{p.sort_order}</div>
                          <div style={{ fontSize: 15, fontWeight: title ? 600 : 400, lineHeight: 1.4, flex: 1, color: title ? P.text : P.textDim, fontStyle: title ? "normal" : "italic" }}>{title || tr("noTitle")}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          {st && <Badge color={st.color}>{st.label[L]}</Badge>}
                          {pr && <Badge color={pr.color}>{pr.label[L]}</Badge>}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 10, fontSize: 12.5, color: P.textDim }}>
                          <span>{tr("owner")}: <b style={{ color: P.text, fontWeight: 600 }}>{bf(p.owner) || "—"}</b></span>
                          <span>{tr("dueDate")}: <b style={{ color: P.text, fontWeight: 600 }}>{p.due_date || "—"}</b></span>
                        </div>
                        {notes && <div style={{ marginTop: 10, fontSize: 12.5, color: P.textDim, lineHeight: 1.5, [rtl ? "borderRight" : "borderLeft"]: `2px solid ${P.line}`, [rtl ? "paddingRight" : "paddingLeft"]: 10 }}>{notes}</div>}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                          <span style={{ fontSize: 12, color: P.textDim, flexShrink: 0 }}>{tr("progressT")}</span>
                          <input type="range" min="0" max="100" value={Math.round((Number(p.progress) || 0) * 100)} onChange={e => updateProgress(p.id, Number(e.target.value))} style={{ flex: 1, accentColor: progressColor(Math.round((Number(p.progress) || 0) * 100)) }} />
                          <span style={{ fontSize: 12, color: p.progress != null ? progressColor(Math.round(Number(p.progress) * 100)) : P.textDim, fontWeight: 700, width: 36, fontVariantNumeric: "tabular-nums" }}>{p.progress != null ? Math.round(Number(p.progress) * 100) + "%" : "—"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
                          <IconBtn onClick={() => setEditing({ row: p })}>&#9998;</IconBtn>
                          <IconBtn del onClick={() => deleteRow(p.id)}>&#10005;</IconBtn>
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
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <button onClick={() => setEditing({ new: "routine" })} style={btnGold()}>+ {tr("add")}</button>
              </div>
              {routine.length === 0 ? <EmptyState text={tr("empty")} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {routine.map(r => (
                    <div key={r.id} style={projCard()}>
                      <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: P.text }}>{bf(r.title) || tr("noTitle")}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        {bf(r.freq) && <Badge color={P.med}>{bf(r.freq)}</Badge>}
                        {bf(r.team) && <Badge color={P.textDim}>{bf(r.team)}</Badge>}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12.5, color: P.textDim }}>
                        <span>{tr("owner")}: <b style={{ color: P.text, fontWeight: 600 }}>{bf(r.owner) || "—"}</b></span>
                      </div>
                      {bf(r.notes) && <div style={{ marginTop: 10, fontSize: 12.5, color: P.textDim, lineHeight: 1.5, [rtl ? "borderRight" : "borderLeft"]: `2px solid ${P.line}`, [rtl ? "paddingRight" : "paddingLeft"]: 10 }}>{bf(r.notes)}</div>}
                      <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
                        <IconBtn onClick={() => setEditing({ row: r })}>&#9998;</IconBtn>
                        <IconBtn del onClick={() => deleteRow(r.id)}>&#10005;</IconBtn>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "future" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <button onClick={() => setEditing({ new: "future" })} style={btnGold()}>+ {tr("add")}</button>
              </div>
              {future.length === 0 ? <EmptyState text={tr("empty")} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {future.map(f => {
                    const pr = PRIORITY[f.priority];
                    return (
                      <div key={f.id} style={projCard()}>
                        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: P.text }}>{bf(f.title) || tr("noTitle")}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          {pr && <Badge color={pr.color}>{pr.label[L]}</Badge>}
                          {f.contractor && <Badge color={P.textDim}>{f.contractor === "external" ? tr("external") : tr("internal")}</Badge>}
                        </div>
                        <div style={{ marginTop: 10, fontSize: 12.5, color: P.textDim }}>
                          <span>{tr("owner")}: <b style={{ color: P.text, fontWeight: 600 }}>{bf(f.owner) || "—"}</b></span>
                        </div>
                        {bf(f.notes) && <div style={{ marginTop: 10, fontSize: 12.5, color: P.textDim, lineHeight: 1.5, [rtl ? "borderRight" : "borderLeft"]: `2px solid ${P.line}`, [rtl ? "paddingRight" : "paddingLeft"]: 10 }}>{bf(f.notes)}</div>}
                        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
                          <IconBtn onClick={() => setEditing({ row: f })}>&#9998;</IconBtn>
                          <IconBtn del onClick={() => deleteRow(f.id)}>&#10005;</IconBtn>
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

function ProjectEditor({ L, tr, row, category, nextSort, onClose, onSaved }) {
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
        payload.status = status; payload.priority = priority;
        payload.due_date = dueDate || null; payload.progress = progress / 100;
      } else if (cat === "routine") {
        payload.freq = { he: freqHe, en: freqEn }; payload.team = { he: teamHe, en: teamEn };
      } else if (cat === "future") {
        payload.priority = priority; payload.contractor = contractor;
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
    } catch (e) { setError(e.message || String(e)); setBusy(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(8,10,15,.7)", backdropFilter: "blur(3px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} dir="ltr">
      <div style={{ background: P.bgRaised, border: `1px solid ${P.line}`, borderRadius: P.radius, padding: 24, width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto" }}>
        <h3 style={{ fontFamily: P.serif, fontSize: 18, marginBottom: 18, color: P.gold }}>{isNew ? tr("add") : tr("edit")} — {cat}</h3>
        <Field label="Title (HE / EN)"><input value={titleHe} onChange={e => setTitleHe(e.target.value)} placeholder="עברית" dir="rtl" style={modalInput()} /><input value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder="English" style={modalInput()} /></Field>
        <Field label="Owner (HE / EN)"><input value={ownerHe} onChange={e => setOwnerHe(e.target.value)} placeholder="עברית" dir="rtl" style={modalInput()} /><input value={ownerEn} onChange={e => setOwnerEn(e.target.value)} placeholder="English" style={modalInput()} /></Field>
        {cat === "inprogress" && (
          <>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, marginBottom: 14 }}><label style={fieldLabel()}>Status</label><select value={status} onChange={e => setStatus(e.target.value)} style={modalInput()}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label.en}</option>)}</select></div>
              <div style={{ flex: 1, marginBottom: 14 }}><label style={fieldLabel()}>Priority</label><select value={priority} onChange={e => setPriority(e.target.value)} style={modalInput()}>{["urgent", "high", "med"].map(k => <option key={k} value={k}>{PRIORITY[k].label.en}</option>)}</select></div>
              <div style={{ flex: 1, marginBottom: 14 }}><label style={fieldLabel()}>Due (DD/MM/YYYY)</label><input value={dueDate} onChange={e => setDueDate(e.target.value)} placeholder="30/07/2026" style={modalInput()} /></div>
            </div>
            <div style={{ marginBottom: 14 }}><label style={fieldLabel()}>Progress: {progress}%</label><input type="range" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))} style={{ width: "100%", accentColor: P.gold }} /></div>
          </>
        )}
        {cat === "routine" && (
          <>
            <Field label="Frequency (HE / EN)"><input value={freqHe} onChange={e => setFreqHe(e.target.value)} placeholder="עברית" dir="rtl" style={modalInput()} /><input value={freqEn} onChange={e => setFreqEn(e.target.value)} placeholder="English" style={modalInput()} /></Field>
            <Field label="Team (HE / EN)"><input value={teamHe} onChange={e => setTeamHe(e.target.value)} placeholder="עברית" dir="rtl" style={modalInput()} /><input value={teamEn} onChange={e => setTeamEn(e.target.value)} placeholder="English" style={modalInput()} /></Field>
          </>
        )}
        {cat === "future" && (
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, marginBottom: 14 }}><label style={fieldLabel()}>Priority</label><select value={priority} onChange={e => setPriority(e.target.value)} style={modalInput()}>{["high", "medF"].map(k => <option key={k} value={k}>{PRIORITY[k].label.en}</option>)}</select></div>
            <div style={{ flex: 1, marginBottom: 14 }}><label style={fieldLabel()}>Contractor</label><select value={contractor} onChange={e => setContractor(e.target.value)} style={modalInput()}><option value="internal">Internal</option><option value="external">External</option></select></div>
          </div>
        )}
        <Field label="Notes (HE / EN)"><textarea value={notesHe} onChange={e => setNotesHe(e.target.value)} placeholder="עברית" dir="rtl" style={{ ...modalInput(), minHeight: 70, resize: "vertical" }} /><textarea value={notesEn} onChange={e => setNotesEn(e.target.value)} placeholder="English" style={{ ...modalInput(), minHeight: 70, resize: "vertical" }} /></Field>
        {error && <div style={{ background: "rgba(217,99,75,0.12)", border: `1px solid rgba(217,99,75,0.4)`, borderRadius: 8, padding: "10px 12px", color: P.urgent, fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} disabled={busy} style={btnGhost()}>Cancel</button>
          <button onClick={save} disabled={busy} style={btnGold()}>{busy ? "…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function Card({ num, lbl, urgent }) {
  return (
    <div style={{ background: P.bgPanel, border: `1px solid ${P.line}`, borderRadius: P.radius, padding: "18px 18px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${P.gold}, transparent)`, opacity: 0.55 }} />
      <div style={{ fontFamily: P.serif, fontSize: 32, fontWeight: 700, color: urgent ? P.urgent : P.gold, lineHeight: 1 }}>{num}</div>
      <div style={{ fontSize: 12.5, color: P.textDim, marginTop: 8 }}>{lbl}</div>
    </div>
  );
}
function Badge({ color, children }) {
  return <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 600, color, background: `${color}26`, border: `1px solid ${color}59` }}>{children}</span>;
}
function IconBtn({ children, onClick, del }) {
  const [hover, setHover] = useState(false);
  const hc = del ? P.urgent : P.gold;
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      background: "transparent", border: `1px solid ${hover ? (del ? P.urgent : P.goldSoft) : P.line}`,
      color: hover ? hc : P.textDim, width: 30, height: 30, borderRadius: 8, cursor: "pointer",
      fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: P.sans,
    }}>{children}</button>
  );
}
function EmptyState({ text }) {
  return <div style={{ textAlign: "center", padding: "50px 20px", color: P.textDim }}><div style={{ fontSize: 34, marginBottom: 10, color: P.goldSoft }}>&#9671;</div>{text}</div>;
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={fieldLabel()}>{label}</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>
    </div>
  );
}

function panel() { return { background: P.bgPanel, border: `1px solid ${P.line}`, borderRadius: P.radius, padding: 20, marginBottom: 18 }; }
function panelH2() { return { fontFamily: P.serif, fontSize: 17, marginBottom: 14, color: P.text, fontWeight: 700 }; }
function projCard() { return { background: P.bgPanel, border: `1px solid ${P.line}`, borderRadius: P.radius, padding: "16px 18px" }; }
function inputStyle() { return { background: P.bgRaised, border: `1px solid ${P.line}`, color: P.text, padding: "9px 14px", borderRadius: 10, fontSize: 13.5, fontFamily: P.sans, outline: "none" }; }
function modalInput() { return { width: "100%", background: P.bgInput, border: `1px solid ${P.line}`, color: P.text, padding: "10px 12px", borderRadius: 9, fontSize: 13.5, fontFamily: P.sans, outline: "none", colorScheme: "dark", boxSizing: "border-box" }; }
function fieldLabel() { return { display: "block", fontSize: 12.5, color: P.textDim, marginBottom: 6 }; }
function btnGold() { return { background: P.gold, color: "#171208", border: "none", padding: "9px 18px", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: P.sans }; }
function btnGhost() { return { background: "transparent", border: `1px solid ${P.goldSoft}`, color: P.gold, padding: "9px 18px", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: P.sans }; }
