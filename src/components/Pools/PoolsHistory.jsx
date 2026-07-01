// ═══════════════════════════════════════════════════════════════════
// PoolsHistory.jsx — تاریخچه‌ی لاگ‌ها + خلاصه‌ها برای anti-fraud monitoring
// ═══════════════════════════════════════════════════════════════════
// props: TH, pools, isMobile
// خودش logها رو با بازه‌ی تاریخ مستقل fetch می‌کنه (نه فقط ماه جاری)

import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../supabase";
import { POOL_CHEMICALS, formatEUR } from "./poolUtils";

// helper: yyyy-mm-dd از date object
const iso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
// پیش‌فرض: ۳۰ روز اخیر
const defaultFrom = () => {
  const d = new Date(); d.setDate(d.getDate() - 30); return iso(d);
};
const defaultTo = () => iso(new Date());

export default function PoolsHistory({ TH, pools, isMobile }) {
  const [from,     setFrom]     = useState(defaultFrom());
  const [to,       setTo]       = useState(defaultTo());
  const [poolFilter,     setPoolFilter]     = useState("all");
  const [operatorFilter, setOperatorFilter] = useState("all");
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // fetch logs در بازه‌ی تاریخی
  useEffect(() => { fetchLogs(); /* eslint-disable-next-line */ }, [from, to]);

  async function fetchLogs() {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase
        .from("pool_chemical_logs")
        .select("*")
        .gte("log_date", from)
        .lte("log_date", to)
        .order("log_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const poolById = useMemo(() => {
    const m = {};
    pools.forEach((p) => { m[p.id] = p; });
    return m;
  }, [pools]);

  // فیلتر کلاینت‌ساید (pool + operator)
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (poolFilter !== "all" && l.pool_id !== Number(poolFilter)) return false;
      if (operatorFilter !== "all" && (l.logged_by || "—") !== operatorFilter) return false;
      return true;
    });
  }, [logs, poolFilter, operatorFilter]);

  // لیست operatorهای موجود (برای dropdown)
  const operators = useMemo(() => {
    const s = new Set();
    logs.forEach((l) => s.add(l.logged_by || "—"));
    return Array.from(s).sort();
  }, [logs]);

  // خلاصه‌ی per-chemical
  const chemicalTotals = useMemo(() => {
    return POOL_CHEMICALS.map((c) => {
      const qty = filtered.reduce((s, l) => s + (Number(l[c.key]) || 0), 0);
      return { ...c, qty, cost: qty * c.price };
    });
  }, [filtered]);

  // خلاصه‌ی per-operator (برای spot کردن آنومالی)
  const operatorStats = useMemo(() => {
    const stats = {};
    filtered.forEach((l) => {
      const op = l.logged_by || "—";
      if (!stats[op]) stats[op] = { op, count: 0, cost: 0 };
      stats[op].count++;
      stats[op].cost += POOL_CHEMICALS.reduce(
        (s, c) => s + (Number(l[c.key]) || 0) * c.price, 0
      );
    });
    return Object.values(stats).sort((a, b) => b.cost - a.cost);
  }, [filtered]);

  const totalCost = chemicalTotals.reduce((s, c) => s + c.cost, 0);

  // ─── export ──────────────────────────────────────────────────────
  function exportExcel() {
    const rows = filtered.map((l) => {
      const p = poolById[l.pool_id];
      const r = {
        Date:        l.log_date,
        Pool:        p?.name || `#${l.pool_id}`,
        "Volume m³": p?.volume_m3 || "",
        Operator:    l.logged_by || "",
      };
      let cost = 0;
      POOL_CHEMICALS.forEach((c) => {
        const q = Number(l[c.key]) || 0;
        r[`${c.label} (${c.unit})`] = q;
        cost += q * c.price;
      });
      r["Cost €"]    = Math.round(cost * 100) / 100;
      r["pH"]        = l.ph_reading ?? "";
      r["Cl ppm"]    = l.cl_ppm ?? "";
      r["Notes"]     = l.notes || "";
      r["Logged at"] = l.created_at;
      return r;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pool Logs");
    XLSX.writeFile(wb, `pool_chemical_logs_${from}_to_${to}.xlsx`);
  }

  // ─── styles ──────────────────────────────────────────────────────
  const card = {
    background: TH.bgCard, border: `1px solid ${TH.border}`,
    borderRadius: 12, padding: isMobile ? 14 : 18,
  };
  const filterBar = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr 1fr"
      : "auto auto 1fr 1fr auto",
    gap: 10, alignItems: "end",
    marginBottom: 14,
  };
  const fieldLabel = {
    display: "block", fontSize: 11, color: TH.textMuted,
    marginBottom: 5, fontWeight: 600,
  };
  const input = {
    background: TH.bgInput, border: `1px solid ${TH.border}`, borderRadius: 8,
    color: TH.text, padding: "7px 10px", fontSize: 13, fontFamily: "inherit",
    width: "100%", boxSizing: "border-box", outline: "none",
  };
  const exportBtn = {
    background: TH.accentBg,
    border: `1px solid ${TH.accentBorder}`,
    borderRadius: 8, color: TH.accent,
    padding: "8px 14px", fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
    whiteSpace: "nowrap",
    gridColumn: isMobile ? "1 / -1" : "auto",
  };

  // KPI strip
  const kpiRow = {
    display: "grid",
    gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",
    gap: 10, marginBottom: 14,
  };
  const kpi = (color) => ({
    background: TH.bgCard, border: `1px solid ${TH.border}`,
    borderLeft: `3px solid ${color}`,
    borderRadius: 8, padding: "10px 14px",
  });
  const kpiLabel = {
    fontSize: 10, color: TH.textMuted, fontWeight: 700,
    letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4,
  };
  const kpiValue = { fontSize: 18, fontWeight: 700, color: TH.textHeading };

  // Section grid (chemicals + operators)
  const sectionGrid = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr",
    gap: 12, marginBottom: 14,
  };
  const sectionTitle = {
    fontSize: 13, fontWeight: 700, color: TH.textHeading,
    marginBottom: 10, marginTop: 0,
  };
  const smallTable = {
    width: "100%", borderCollapse: "collapse", fontSize: 12,
  };
  const th = {
    textAlign: "left", padding: "6px 8px",
    color: TH.textMuted, fontWeight: 600,
    borderBottom: `1px solid ${TH.border}`, fontSize: 11,
  };
  const td = {
    padding: "6px 8px",
    borderBottom: `1px solid ${TH.divider}`, color: TH.text,
  };
  const tdRight = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

  // Main table
  const tableWrap = {
    overflowX: "auto",
    border: `1px solid ${TH.border}`, borderRadius: 12,
    background: TH.bgCard,
  };
  const table = {
    width: "100%", borderCollapse: "collapse", fontSize: 12,
    minWidth: 1000,
  };
  const thMain = { ...th, padding: "10px 10px", background: TH.bgElev, position: "sticky", top: 0 };
  const tdMain = { ...td, padding: "8px 10px" };

  // ─── render ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ ...card, color: "#ef4444" }}>
        ⚠️ Error: <code style={{ fontSize: 12 }}>{error}</code>
      </div>
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={filterBar}>
        <div>
          <label style={fieldLabel}>From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={input} />
        </div>
        <div>
          <label style={fieldLabel}>To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={input} />
        </div>
        <div>
          <label style={fieldLabel}>Pool</label>
          <select value={poolFilter} onChange={(e) => setPoolFilter(e.target.value)} style={input}>
            <option value="all">All pools</option>
            {pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={fieldLabel}>Operator</label>
          <select value={operatorFilter} onChange={(e) => setOperatorFilter(e.target.value)} style={input}>
            <option value="all">All operators</option>
            {operators.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <button onClick={exportExcel} style={exportBtn} disabled={!filtered.length}>
          ↓ Excel
        </button>
      </div>

      {/* KPI strip */}
      <div style={kpiRow}>
        <div style={kpi("#6366f1")}>
          <div style={kpiLabel}>Logs</div>
          <div style={kpiValue}>{filtered.length}</div>
        </div>
        <div style={kpi("#22d3ee")}>
          <div style={kpiLabel}>Total cost</div>
          <div style={kpiValue}>{formatEUR(totalCost)}</div>
        </div>
        <div style={kpi("#f59e0b")}>
          <div style={kpiLabel}>Operators</div>
          <div style={kpiValue}>{operatorStats.length}</div>
        </div>
        <div style={kpi("#10b981")}>
          <div style={kpiLabel}>Pools used</div>
          <div style={kpiValue}>{new Set(filtered.map((l) => l.pool_id)).size}</div>
        </div>
      </div>

      {/* Breakdown sections */}
      {filtered.length > 0 && (
        <div style={sectionGrid}>
          {/* Per-chemical */}
          <div style={card}>
            <h4 style={sectionTitle}>Per-chemical totals</h4>
            <table style={smallTable}>
              <thead>
                <tr>
                  <th style={th}>Chemical</th>
                  <th style={{ ...th, textAlign: "right" }}>Qty</th>
                  <th style={{ ...th, textAlign: "right" }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {chemicalTotals.map((c) => (
                  <tr key={c.key}>
                    <td style={td}>{c.label}</td>
                    <td style={tdRight}>{c.qty.toFixed(1)} {c.unit}</td>
                    <td style={tdRight}>{formatEUR(c.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Per-operator (anti-fraud) */}
          <div style={card}>
            <h4 style={sectionTitle}>Per-operator (audit)</h4>
            <table style={smallTable}>
              <thead>
                <tr>
                  <th style={th}>Operator</th>
                  <th style={{ ...th, textAlign: "right" }}>Logs</th>
                  <th style={{ ...th, textAlign: "right" }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {operatorStats.map((s) => (
                  <tr key={s.op}>
                    <td style={td}>{s.op}</td>
                    <td style={tdRight}>{s.count}</td>
                    <td style={tdRight}>{formatEUR(s.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main log table */}
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={thMain}>Date</th>
              <th style={thMain}>Pool</th>
              {POOL_CHEMICALS.map((c) => (
                <th key={c.key} style={{ ...thMain, textAlign: "right" }}>
                  {c.label.split(" ")[0]}
                </th>
              ))}
              <th style={{ ...thMain, textAlign: "right" }}>Cost</th>
              <th style={{ ...thMain, textAlign: "right" }}>pH</th>
              <th style={{ ...thMain, textAlign: "right" }}>Cl</th>
              <th style={thMain}>Operator</th>
              <th style={thMain}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td style={{ ...tdMain, textAlign: "center" }} colSpan={POOL_CHEMICALS.length + 6}>
                ⏳ Loading…
              </td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td style={{ ...tdMain, textAlign: "center", color: TH.textMuted, padding: 32 }} colSpan={POOL_CHEMICALS.length + 6}>
                No logs in this range.
              </td></tr>
            )}
            {!loading && filtered.map((l) => {
              const cost = POOL_CHEMICALS.reduce(
                (s, c) => s + (Number(l[c.key]) || 0) * c.price, 0
              );
              return (
                <tr key={l.id}>
                  <td style={tdMain}>{l.log_date}</td>
                  <td style={tdMain}>{poolById[l.pool_id]?.name || `#${l.pool_id}`}</td>
                  {POOL_CHEMICALS.map((c) => (
                    <td key={c.key} style={{ ...tdMain, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {Number(l[c.key]) || ""}
                    </td>
                  ))}
                  <td style={{ ...tdMain, textAlign: "right", fontWeight: 600 }}>{formatEUR(cost)}</td>
                  <td style={{ ...tdMain, textAlign: "right" }}>{l.ph_reading ?? ""}</td>
                  <td style={{ ...tdMain, textAlign: "right" }}>{l.cl_ppm ?? ""}</td>
                  <td style={{ ...tdMain, fontSize: 11, color: TH.textMuted }}>{l.logged_by || "—"}</td>
                  <td style={{ ...tdMain, fontSize: 11, color: TH.textMuted, maxWidth: 200 }}>{l.notes || ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
