// ═══════════════════════════════════════════════════════════════════
// PoolsOverview.jsx — کارت‌های وضعیت ۲۲ استخر
// ═══════════════════════════════════════════════════════════════════
// props: TH (theme), pools (array), logs (array of current-month logs), isMobile

import { useState, useMemo } from "react";
import { getPoolStatus, formatEUR } from "./poolUtils";

const FILTERS = [
  { key: "all",     label: "All",      color: null      },
  { key: "OK",      label: "OK",       color: "#10b981" },
  { key: "Watch",   label: "Watch",    color: "#f59e0b" },
  { key: "HIGH",    label: "HIGH",     color: "#ef4444" },
  { key: "No logs", label: "No logs",  color: "#94a3b8" },
];

const SORTS = [
  { key: "name",   label: "Name (A→Z)" },
  { key: "name_d", label: "Name (Z→A)" },
  { key: "pct_d",  label: "% (high→low)" },
  { key: "pct",    label: "% (low→high)" },
  { key: "vol_d",  label: "Volume (big→small)" },
];

export default function PoolsOverview({ TH, pools, logs, isMobile }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort,   setSort]   = useState("name");

  // محاسبه status هر استخر (یک‌بار، memoized)
  const enriched = useMemo(
    () => pools.map((p) => ({ pool: p, status: getPoolStatus(p, logs) })),
    [pools, logs]
  );

  // filter + search + sort
  const visible = useMemo(() => {
    let list = enriched;
    if (filter !== "all") list = list.filter((e) => e.status.label === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => e.pool.name.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "name":   return a.pool.name.localeCompare(b.pool.name);
        case "name_d": return b.pool.name.localeCompare(a.pool.name);
        case "pct_d":  return b.status.pct - a.status.pct;
        case "pct":    return a.status.pct - b.status.pct;
        case "vol_d":  return (b.pool.volume_m3 || 0) - (a.pool.volume_m3 || 0);
        default:       return 0;
      }
    });
    return list;
  }, [enriched, search, filter, sort]);

  // تعداد هر دسته برای badge فیلترها
  const counts = useMemo(() => {
    const c = { all: enriched.length, OK: 0, Watch: 0, HIGH: 0, "No logs": 0 };
    enriched.forEach((e) => { c[e.status.label] = (c[e.status.label] || 0) + 1; });
    return c;
  }, [enriched]);

  // ─── styles ──────────────────────────────────────────────────────
  const toolbar = {
    display: "flex", gap: 10, marginBottom: 14,
    flexWrap: "wrap", alignItems: "center",
  };
  const searchInput = {
    background: TH.bgInput, border: `1px solid ${TH.border}`, borderRadius: 8,
    color: TH.text, padding: "8px 12px", fontSize: 13, fontFamily: "inherit",
    minWidth: 200, flex: isMobile ? "1 1 100%" : "0 1 260px",
    outline: "none",
  };
  const selectS = {
    background: TH.bgInput, border: `1px solid ${TH.border}`, borderRadius: 8,
    color: TH.text, padding: "8px 12px", fontSize: 13, fontFamily: "inherit",
    cursor: "pointer", outline: "none",
  };
  const countText = {
    color: TH.textMuted, fontSize: 12,
    marginLeft: isMobile ? 0 : "auto",
  };

  const filterRow = { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 };
  const filterBtn = (active, color) => ({
    background: active ? (color ? color + "22" : TH.accentBg) : TH.bgInput,
    color: active ? (color || TH.accent) : TH.textMuted,
    border: `1px solid ${active ? (color || TH.accent) : TH.border}`,
    borderRadius: 20, padding: "5px 12px",
    fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
    transition: "all .15s",
  });

  const grid = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 14,
  };

  const card = (statusLabel) => ({
    background: TH.bgCard,
    border: `1px solid ${
      statusLabel === "HIGH"  ? "#ef444466" :
      statusLabel === "Watch" ? "#f59e0b66" :
      TH.border
    }`,
    borderRadius: 12, padding: 16,
    display: "flex", flexDirection: "column", gap: 10,
  });
  const cardHeader = {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", gap: 8,
  };
  const poolName = {
    fontSize: 14.5, fontWeight: 700,
    color: TH.textHeading, margin: 0, lineHeight: 1.3,
  };
  const poolMeta = {
    fontSize: 11, color: TH.textMuted,
    margin: "3px 0 0 0",
  };
  const badge = (color) => ({
    background: color + "22",
    color, border: `1px solid ${color}55`,
    borderRadius: 12, padding: "3px 10px",
    fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap",
    flexShrink: 0,
  });

  const statRow = {
    display: "flex", justifyContent: "space-between",
    fontSize: 12, padding: "2px 0",
  };
  const statLabel = { color: TH.textMuted };
  const statValue = { color: TH.text, fontWeight: 600 };

  const progressTrack = {
    height: 6, background: TH.bgInput, borderRadius: 3,
    overflow: "hidden", marginTop: 4,
  };
  const progressFill = (pct, color) => ({
    height: "100%", width: Math.min(pct, 100) + "%",
    background: color, transition: "width .25s",
  });

  const emptyState = {
    padding: 48, textAlign: "center", color: TH.textMuted,
    background: TH.bgCard, border: `1px solid ${TH.border}`, borderRadius: 12,
  };

  // ─── render ──────────────────────────────────────────────────────
  return (
    <div>
      {/* Toolbar */}
      <div style={toolbar}>
        <input
          type="text"
          placeholder="Search pool name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInput}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={selectS}>
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <span style={countText}>
          {visible.length} of {enriched.length} pools
        </span>
      </div>

      {/* Filter chips */}
      <div style={filterRow}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={filterBtn(filter === f.key, f.color)}
          >
            {f.label}{" "}
            <span style={{ opacity: 0.7, fontWeight: 500 }}>
              ({counts[f.key === "all" ? "all" : f.key] || 0})
            </span>
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {visible.length === 0 ? (
        <div style={emptyState}>No pools match current filter / search.</div>
      ) : (
        <div style={grid}>
          {visible.map(({ pool, status }) => (
            <div key={pool.id} style={card(status.label)}>
              <div style={cardHeader}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={poolName}>{pool.name}</h4>
                  <p style={poolMeta}>
                    {Number(pool.volume_m3 || 0).toLocaleString()} m³ · {pool.pool_type}
                    {status.logCount > 0 && ` · ${status.logCount} logs`}
                  </p>
                </div>
                <span style={badge(status.color)}>{status.label}</span>
              </div>

              <div>
                <div style={statRow}>
                  <span style={statLabel}>Actual (MTD)</span>
                  <span style={statValue}>{formatEUR(status.actualCost)}</span>
                </div>
                <div style={statRow}>
                  <span style={statLabel}>Expected so far</span>
                  <span style={statValue}>{formatEUR(status.expectedNow)}</span>
                </div>
                <div style={statRow}>
                  <span style={statLabel}>Baseline / month</span>
                  <span style={statValue}>{formatEUR(status.baselineMonthly)}</span>
                </div>
              </div>

              <div>
                <div style={progressTrack}>
                  <div style={progressFill(status.pct, status.color)} />
                </div>
                <div style={{ ...statRow, marginTop: 5, fontSize: 11 }}>
                  <span style={statLabel}>
                    {status.pct === 0
                      ? "No activity yet this month"
                      : `${status.pct}% of expected pace`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
