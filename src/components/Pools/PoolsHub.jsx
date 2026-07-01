// ═══════════════════════════════════════════════════════════════════
// PoolsHub.jsx — Container ماژول استخر با ۵ sub-tab
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { monthStartISO, getPoolStatus, formatEUR } from "./poolUtils";
import PoolsOverview     from "./PoolsOverview";
import PoolsLogChemical  from "./PoolsLogChemical";
import PoolsHistory      from "./PoolsHistory";
import OperatorsManager  from "./OperatorsManager";

const TABS = [
  { key: "overview",  icon: "📊", label: "Overview" },
  { key: "map",       icon: "🗺",  label: "Map" },
  { key: "log",       icon: "➕", label: "Log Chemical" },
  { key: "history",   icon: "📋", label: "History" },
  { key: "operators", icon: "👤", label: "Operators", adminOnly: true },
];

export default function PoolsHub({ TH, lang = "en", isMobile = false, isAdmin = false }) {
  const [tab,       setTab]       = useState("overview");
  const [pools,     setPools]     = useState([]);
  const [logs,      setLogs]      = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true); setError(null);
    try {
      const start = monthStartISO();
      const [pRes, lRes, oRes] = await Promise.all([
        supabase.from("pools")
          .select("*")
          .eq("is_active", true)
          .order("name"),
        supabase.from("pool_chemical_logs")
          .select("*")
          .gte("log_date", start),
        supabase.from("pool_operators")
          .select("*")
          .order("full_name"),
      ]);
      if (pRes.error) throw pRes.error;
      if (lRes.error) throw lRes.error;
      if (oRes.error) throw oRes.error;
      setPools(pRes.data || []);
      setLogs(lRes.data || []);
      setOperators(oRes.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // ─── styles ──────────────────────────────────────────────────────
  const wrap = { padding: isMobile ? 12 : 24, color: TH.text };
  const header = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 16, flexWrap: "wrap", gap: 12,
  };
  const titleS = { margin: 0, fontSize: isMobile ? 18 : 24, fontWeight: 700, color: TH.textHeading };
  const subS   = { color: TH.textMuted, fontSize: 13, margin: "4px 0 0 0" };
  const refreshBtn = {
    background: "transparent", color: TH.textMuted,
    border: `1px solid ${TH.border}`, borderRadius: 8,
    padding: "8px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  };
  const tabsRow = {
    display: "flex", gap: 4,
    borderBottom: `1px solid ${TH.border}`,
    marginBottom: 20, overflowX: "auto",
  };
  const tabBtn = (active) => ({
    background: active ? TH.accentBg : "transparent",
    color: active ? TH.accentText : TH.textMuted,
    border: "none",
    borderBottom: `2px solid ${active ? TH.accent : "transparent"}`,
    padding: "10px 14px",
    fontSize: 14, fontWeight: active ? 600 : 500,
    cursor: "pointer", whiteSpace: "nowrap",
    transition: "all .15s", fontFamily: "inherit",
  });
  const card = {
    background: TH.bgCard, border: `1px solid ${TH.border}`,
    borderRadius: 12, padding: 24,
  };
  const placeholder = {
    ...card, textAlign: "center", color: TH.textMuted,
    padding: 48, lineHeight: 1.7,
  };

  if (loading) {
    return <div style={wrap}><div style={placeholder}>⏳ Loading pools…</div></div>;
  }
  if (error) {
    return (
      <div style={wrap}>
        <div style={{ ...placeholder, color: "#ef4444" }}>
          ⚠️ Error loading data:<br />
          <code style={{ fontSize: 12 }}>{error}</code>
          <div style={{ marginTop: 16 }}>
            <button onClick={loadData} style={refreshBtn}>↻ Retry</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── stats + alerts ─────────────────────────────────────────────
  const totalBaseline = pools.reduce((s, p) => s + getPoolStatus(p, []).baselineMonthly, 0);
  const totalActual   = pools.reduce((s, p) => s + getPoolStatus(p, logs).actualCost,    0);

  const highPools  = pools.filter((p) => getPoolStatus(p, logs).label === "HIGH");
  const watchPools = pools.filter((p) => getPoolStatus(p, logs).label === "Watch");
  const unassigned = pools.filter((p) => !p.operator_id);

  // ─── alert styles ────────────────────────────────────────────────
  const alertBanner = (level) => ({
    background: level === "high"
      ? "linear-gradient(90deg, rgba(239,68,68,0.18), rgba(239,68,68,0.06))"
      : level === "watch"
      ? "linear-gradient(90deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))"
      : "linear-gradient(90deg, rgba(99,102,241,0.18), rgba(99,102,241,0.06))",
    border: `1px solid ${level === "high" ? "#ef444466" : level === "watch" ? "#f59e0b66" : "#6366f166"}`,
    borderLeft: `4px solid ${level === "high" ? "#ef4444" : level === "watch" ? "#f59e0b" : "#6366f1"}`,
    borderRadius: 10, padding: "12px 16px", marginBottom: 12,
    color: TH.text, fontSize: 13, lineHeight: 1.5,
  });
  const alertHead = { fontWeight: 700, fontSize: 13.5, marginBottom: 4 };
  const poolPill = (color) => ({
    display: "inline-block",
    background: color + "22", color,
    border: `1px solid ${color}55`,
    borderRadius: 12, padding: "2px 8px",
    fontSize: 11, fontWeight: 600,
    margin: "2px 4px 2px 0", whiteSpace: "nowrap",
  });

  const isAdminTab = TABS.find((t) => t.key === tab)?.adminOnly;
  const blocked = isAdminTab && !isAdmin;

  return (
    <div style={wrap}>
      {/* alerts */}
      {highPools.length > 0 && (
        <div style={alertBanner("high")}>
          <div style={alertHead}>
            🚨 {highPools.length} pool{highPools.length > 1 ? "s" : ""} over 150% — possible misuse or theft
          </div>
          <div>
            {highPools.map((p) => (
              <span key={p.id} style={poolPill("#ef4444")}>
                {p.name} · {getPoolStatus(p, logs).pct}%
              </span>
            ))}
          </div>
        </div>
      )}
      {highPools.length === 0 && watchPools.length > 0 && (
        <div style={alertBanner("watch")}>
          <div style={alertHead}>
            ⚠️ {watchPools.length} pool{watchPools.length > 1 ? "s" : ""} above expected (110–150%) — keep an eye
          </div>
          <div>
            {watchPools.map((p) => (
              <span key={p.id} style={poolPill("#f59e0b")}>
                {p.name} · {getPoolStatus(p, logs).pct}%
              </span>
            ))}
          </div>
        </div>
      )}
      {isAdmin && unassigned.length > 0 && (
        <div style={alertBanner("info")}>
          <div style={alertHead}>
            👤 {unassigned.length} pool{unassigned.length > 1 ? "s" : ""} have no assigned operator
          </div>
          <div style={{ fontSize: 12, color: TH.textMuted }}>
            Open <b>Operators</b> tab to assign responsibility.
          </div>
        </div>
      )}

      <div style={header}>
        <div>
          <h2 style={titleS}>🏊 Pools — Caesar Resort</h2>
          <p style={subS}>
            {pools.length} pools · {operators.length} operators · {logs.length} logs this month ·
            Spent {formatEUR(totalActual)} of {formatEUR(totalBaseline)} baseline
          </p>
        </div>
        <button onClick={loadData} style={refreshBtn}>↻ Refresh</button>
      </div>

      <div style={tabsRow}>
        {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={tabBtn(tab === t.key)}
          >
            <span style={{ marginRight: 6 }}>{t.icon}</span>
            {t.label}
            {t.key === "overview" && highPools.length > 0 && (
              <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
                {highPools.length}
              </span>
            )}
            {t.key === "operators" && unassigned.length > 0 && (
              <span style={{ marginLeft: 6, background: "#f59e0b", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
                {unassigned.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {blocked && (
        <div style={placeholder}>Admin access required.</div>
      )}

      {!blocked && tab === "overview" && (
        <PoolsOverview TH={TH} pools={pools} logs={logs} operators={operators} isMobile={isMobile} />
      )}

      {!blocked && tab === "log" && (
        <PoolsLogChemical
          TH={TH} pools={pools} operators={operators} isMobile={isMobile}
          onSaved={loadData}
        />
      )}

      {!blocked && tab === "history" && (
        <PoolsHistory TH={TH} pools={pools} operators={operators} isMobile={isMobile} />
      )}

      {!blocked && tab === "operators" && (
        <OperatorsManager
          TH={TH} operators={operators} pools={pools}
          isMobile={isMobile} isAdmin={isAdmin}
          onChange={loadData}
        />
      )}

      {!blocked && tab === "map" && (
        <div style={placeholder}>
          🗺 <b>Map</b> — coming next<br />
          <small>Will use Leaflet + Esri satellite tiles, like Resort Map</small>
        </div>
      )}
    </div>
  );
}
