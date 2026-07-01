// ═══════════════════════════════════════════════════════════════════
// PoolsLogChemical.jsx — فرم ثبت مصرف شیمیایی روزانه
// ═══════════════════════════════════════════════════════════════════
// props: TH, pools, isMobile, onSaved (callback بعد از insert موفق)

import { useState, useMemo } from "react";
import { supabase } from "../../supabase";
import { POOL_CHEMICALS, formatEUR } from "./poolUtils";

const todayISO = () => new Date().toISOString().slice(0, 10);

const blankForm = () => ({
  pool_id:       "",
  log_date:      todayISO(),
  qty_klor56:    "",
  qty_klor90:    "",
  qty_floc:      "",
  qty_algae:     "",
  qty_clarify:   "",
  qty_klor_sivi: "",
  qty_asit:      "",
  ph_reading:    "",
  cl_ppm:        "",
  notes:         "",
});

export default function PoolsLogChemical({ TH, pools, isMobile, onSaved }) {
  const [form,    setForm]    = useState(blankForm());
  const [saving,  setSaving]  = useState(false);
  const [feedback,setFeedback]= useState(null); // {type:'ok'|'err', msg:''}

  // محاسبه‌ی هزینه‌ی این log در حین تایپ (preview زنده)
  const totalCost = useMemo(() => {
    return POOL_CHEMICALS.reduce((sum, c) => {
      const qty = Number(form[c.key]) || 0;
      return sum + qty * c.price;
    }, 0);
  }, [form]);

  // ─── helpers ─────────────────────────────────────────────────────
  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (feedback) setFeedback(null);
  }

  function validate() {
    if (!form.pool_id) return "Select a pool";
    if (!form.log_date) return "Pick a date";
    const hasQty = POOL_CHEMICALS.some((c) => Number(form[c.key]) > 0);
    if (!hasQty) return "Enter at least one chemical quantity";
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) {
      setFeedback({ type: "err", msg: err });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const row = {
        pool_id:  Number(form.pool_id),
        log_date: form.log_date,
        notes:    form.notes.trim() || null,
        ph_reading: form.ph_reading === "" ? null : Number(form.ph_reading),
        cl_ppm:     form.cl_ppm     === "" ? null : Number(form.cl_ppm),
      };
      for (const c of POOL_CHEMICALS) {
        row[c.key] = Number(form[c.key]) || 0;
      }
      const { error } = await supabase
        .from("pool_chemical_logs")
        .insert([row]);
      if (error) throw error;

      const poolName = pools.find((p) => p.id === Number(form.pool_id))?.name || "pool";
      setFeedback({
        type: "ok",
        msg: `Saved — ${poolName} · ${formatEUR(totalCost)} on ${form.log_date}`,
      });
      setForm(blankForm());
      onSaved?.();
    } catch (e) {
      setFeedback({ type: "err", msg: e.message || String(e) });
    } finally {
      setSaving(false);
    }
  }

  // ─── styles ──────────────────────────────────────────────────────
  const card = {
    background: TH.bgCard, border: `1px solid ${TH.border}`,
    borderRadius: 12, padding: isMobile ? 16 : 24,
  };
  const sectionTitle = {
    color: TH.textDim, fontSize: 10, fontWeight: 700,
    letterSpacing: "0.12em", textTransform: "uppercase",
    marginBottom: 10, marginTop: 18,
  };
  const sectionTitleFirst = { ...sectionTitle, marginTop: 0 };

  const row2 = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: 12,
  };
  const grid3 = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
    gap: 12,
  };

  const fieldLabel = {
    display: "block", fontSize: 11, color: TH.textMuted,
    marginBottom: 6, fontWeight: 600,
  };
  const input = {
    background: TH.bgInput, border: `1px solid ${TH.border}`, borderRadius: 8,
    color: TH.text, padding: "9px 12px", fontSize: 14, fontFamily: "inherit",
    width: "100%", boxSizing: "border-box", outline: "none",
  };
  const inputWithSuffix = {
    display: "flex", alignItems: "stretch",
    background: TH.bgInput, border: `1px solid ${TH.border}`, borderRadius: 8,
    overflow: "hidden",
  };
  const inputNoBorder = {
    ...input, border: "none", background: "transparent",
    borderRadius: 0, paddingRight: 6,
  };
  const unitSuffix = {
    display: "flex", alignItems: "center", padding: "0 12px",
    color: TH.textMuted, fontSize: 12, fontWeight: 600,
    borderLeft: `1px solid ${TH.border}`,
  };
  const textarea = {
    ...input, minHeight: 60, resize: "vertical", fontFamily: "inherit",
  };

  const footer = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 12, marginTop: 22, flexWrap: "wrap",
  };
  const costBox = {
    color: TH.textMuted, fontSize: 13,
  };
  const costAmount = {
    color: TH.accent, fontSize: 20, fontWeight: 700,
    marginLeft: 6,
  };
  const saveBtn = {
    background: saving
      ? TH.bgInput
      : "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff", border: "none", borderRadius: 10,
    padding: "11px 28px", fontSize: 14, fontWeight: 700,
    cursor: saving ? "default" : "pointer", fontFamily: "inherit",
    boxShadow: saving ? "none" : "0 4px 12px rgba(99,102,241,.3)",
    opacity: saving ? 0.6 : 1, transition: "all .15s",
  };
  const feedbackBox = (type) => ({
    padding: "10px 14px", borderRadius: 8,
    background: type === "ok" ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)",
    color:      type === "ok" ? "#10b981" : "#ef4444",
    border: `1px solid ${type === "ok" ? "#10b98155" : "#ef444455"}`,
    fontSize: 13, marginTop: 14,
  });

  // ─── render ──────────────────────────────────────────────────────
  return (
    <div style={card}>
      {/* بخش ۱: pool + date */}
      <div style={sectionTitleFirst}>Entry</div>
      <div style={row2}>
        <div>
          <label style={fieldLabel}>Pool *</label>
          <select
            value={form.pool_id}
            onChange={(e) => update("pool_id", e.target.value)}
            style={input}
          >
            <option value="">Select pool…</option>
            {pools.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.volume_m3} m³)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={fieldLabel}>Date *</label>
          <input
            type="date"
            value={form.log_date}
            onChange={(e) => update("log_date", e.target.value)}
            max={todayISO()}
            style={input}
          />
        </div>
      </div>

      {/* بخش ۲: ۷ chemical */}
      <div style={sectionTitle}>Chemicals consumed</div>
      <div style={grid3}>
        {POOL_CHEMICALS.map((c) => (
          <div key={c.key}>
            <label style={fieldLabel}>
              {c.label}{" "}
              <span style={{ color: TH.textDim, fontWeight: 500 }}>
                · €{c.price.toFixed(2)}/{c.unit}
              </span>
            </label>
            <div style={inputWithSuffix}>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={form[c.key]}
                onChange={(e) => update(c.key, e.target.value)}
                style={inputNoBorder}
              />
              <div style={unitSuffix}>{c.unit}</div>
            </div>
          </div>
        ))}
      </div>

      {/* بخش ۳: pH و Cl */}
      <div style={sectionTitle}>Water readings (optional)</div>
      <div style={row2}>
        <div>
          <label style={fieldLabel}>pH reading</label>
          <input
            type="number"
            min="0"
            max="14"
            step="0.1"
            placeholder="e.g. 7.4"
            value={form.ph_reading}
            onChange={(e) => update("ph_reading", e.target.value)}
            style={input}
          />
        </div>
        <div>
          <label style={fieldLabel}>Chlorine (ppm)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="e.g. 1.5"
            value={form.cl_ppm}
            onChange={(e) => update("cl_ppm", e.target.value)}
            style={input}
          />
        </div>
      </div>

      {/* بخش ۴: notes */}
      <div style={sectionTitle}>Notes</div>
      <textarea
        placeholder="Optional notes (shock dose, cloudy water, equipment issues…)"
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
        style={textarea}
      />

      {/* footer: cost + save */}
      <div style={footer}>
        <div style={costBox}>
          Total cost this entry:
          <span style={costAmount}>{formatEUR(totalCost)}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={saveBtn}
        >
          {saving ? "Saving…" : "Save Log"}
        </button>
      </div>

      {feedback && (
        <div style={feedbackBox(feedback.type)}>
          {feedback.type === "ok" ? "✓ " : "⚠ "}
          {feedback.msg}
        </div>
      )}
    </div>
  );
}
