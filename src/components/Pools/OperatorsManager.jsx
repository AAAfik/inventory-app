// ═══════════════════════════════════════════════════════════════════
// OperatorsManager.jsx — مدیریت مسئولین استخر و انتساب
// ═══════════════════════════════════════════════════════════════════
// props: TH, operators, pools, isMobile, isAdmin, onChange (refresh hub)

import { useState, useMemo } from "react";
import { supabase } from "../../supabase";

const ROLES = [
  { key: "pool_tech",  label: "Pool Technician" },
  { key: "supervisor", label: "Supervisor" },
  { key: "manager",    label: "Manager" },
  { key: "other",      label: "Other" },
];

const blankForm = () => ({
  id: null,
  full_name: "",
  email: "",
  role: "pool_tech",
  phone: "",
  notes: "",
  is_active: true,
});

export default function OperatorsManager({ TH, operators, pools, isMobile, isAdmin, onChange }) {
  const [formMode,  setFormMode]   = useState("closed"); // closed | add | edit
  const [form,      setForm]       = useState(blankForm());
  const [managingId, setManagingId]= useState(null);     // operator id که داریم poolهاش رو ادیت می‌کنیم
  const [saving,    setSaving]     = useState(false);
  const [feedback,  setFeedback]   = useState(null);

  const poolCount = useMemo(() => {
    const c = {};
    pools.forEach((p) => {
      if (p.operator_id) c[p.operator_id] = (c[p.operator_id] || 0) + 1;
    });
    return c;
  }, [pools]);

  const unassignedCount = pools.filter((p) => !p.operator_id).length;

  function openAdd()   { setForm(blankForm()); setFormMode("add");  setFeedback(null); }
  function openEdit(op){
    setForm({
      id: op.id,
      full_name: op.full_name || "",
      email: op.email || "",
      role: op.role || "pool_tech",
      phone: op.phone || "",
      notes: op.notes || "",
      is_active: op.is_active !== false,
    });
    setFormMode("edit"); setFeedback(null);
  }
  function closeForm() { setFormMode("closed"); setForm(blankForm()); }
  function upd(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function save() {
    if (!form.full_name.trim()) {
      setFeedback({ type: "err", msg: "Full name is required" });
      return;
    }
    setSaving(true); setFeedback(null);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email:     form.email.trim() || null,
        role:      form.role,
        phone:     form.phone.trim() || null,
        notes:     form.notes.trim() || null,
        is_active: form.is_active,
      };
      if (formMode === "add") {
        const { error } = await supabase.from("pool_operators").insert([payload]);
        if (error) throw error;
        setFeedback({ type: "ok", msg: `Added ${payload.full_name}` });
      } else {
        const { error } = await supabase.from("pool_operators")
          .update(payload).eq("id", form.id);
        if (error) throw error;
        setFeedback({ type: "ok", msg: `Updated ${payload.full_name}` });
      }
      closeForm();
      onChange?.();
    } catch (e) {
      setFeedback({ type: "err", msg: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(op) {
    const count = poolCount[op.id] || 0;
    const msg = count > 0
      ? `Delete ${op.full_name}? ${count} pool(s) will become unassigned.`
      : `Delete ${op.full_name}?`;
    if (!window.confirm(msg)) return;
    try {
      const { error } = await supabase.from("pool_operators").delete().eq("id", op.id);
      if (error) throw error;
      setFeedback({ type: "ok", msg: `Removed ${op.full_name}` });
      if (managingId === op.id) setManagingId(null);
      onChange?.();
    } catch (e) {
      setFeedback({ type: "err", msg: e.message });
    }
  }

  // toggle ownership of a pool for a given operator
  async function togglePool(poolId, currentOpId, targetOpId) {
    const newOpId = currentOpId === targetOpId ? null : targetOpId;
    try {
      const { error } = await supabase.from("pools")
        .update({ operator_id: newOpId }).eq("id", poolId);
      if (error) throw error;
      onChange?.();
    } catch (e) {
      setFeedback({ type: "err", msg: e.message });
    }
  }

  // ─── styles ──────────────────────────────────────────────────────
  const card = {
    background: TH.bgCard, border: `1px solid ${TH.border}`,
    borderRadius: 12, padding: isMobile ? 14 : 18,
  };
  const headerRow = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
  };
  const summaryText = { color: TH.textMuted, fontSize: 13 };
  const addBtn = {
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    color: "#fff", border: "none", borderRadius: 8,
    padding: "8px 16px", fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  };

  const tableWrap = {
    background: TH.bgCard, border: `1px solid ${TH.border}`,
    borderRadius: 12, overflowX: "auto", marginBottom: 14,
  };
  const table = { width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 };
  const th = {
    textAlign: "left", padding: "10px 12px",
    background: TH.bgElev, color: TH.textMuted,
    fontWeight: 600, fontSize: 11,
    borderBottom: `1px solid ${TH.border}`,
    letterSpacing: "0.05em", textTransform: "uppercase",
  };
  const td = {
    padding: "10px 12px",
    borderBottom: `1px solid ${TH.divider}`,
    color: TH.text,
  };
  const actionBtn = {
    background: "transparent", border: `1px solid ${TH.border}`,
    borderRadius: 6, color: TH.textMuted,
    padding: "4px 10px", fontSize: 11.5, cursor: "pointer",
    fontFamily: "inherit", marginRight: 4,
  };
  const deleteBtn = {
    ...actionBtn,
    color: "#ef4444", borderColor: "#ef444455",
  };
  const inactiveBadge = {
    background: TH.bgInput, color: TH.textMuted,
    border: `1px solid ${TH.border}`, borderRadius: 10,
    padding: "1px 8px", fontSize: 10, fontWeight: 600, marginLeft: 6,
  };

  // form styles
  const formCard = { ...card, marginBottom: 14, borderColor: TH.accentBorder };
  const formTitle = {
    fontSize: 14, fontWeight: 700, color: TH.textHeading,
    margin: 0, marginBottom: 12,
  };
  const fieldGrid = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: 12, marginBottom: 12,
  };
  const fieldLabel = {
    display: "block", fontSize: 11, color: TH.textMuted,
    marginBottom: 5, fontWeight: 600,
  };
  const input = {
    background: TH.bgInput, border: `1px solid ${TH.border}`, borderRadius: 8,
    color: TH.text, padding: "8px 12px", fontSize: 13, fontFamily: "inherit",
    width: "100%", boxSizing: "border-box", outline: "none",
  };
  const textarea = { ...input, minHeight: 50, resize: "vertical" };
  const checkboxLabel = {
    display: "inline-flex", alignItems: "center", gap: 6,
    cursor: "pointer", color: TH.text, fontSize: 13,
  };
  const formFooter = {
    display: "flex", gap: 8, justifyContent: "flex-end",
    marginTop: 14, flexWrap: "wrap",
  };
  const saveBtn = {
    background: saving ? TH.bgInput : "linear-gradient(135deg,#6366f1,#8b5cf6)",
    color: "#fff", border: "none", borderRadius: 8,
    padding: "9px 22px", fontSize: 13, fontWeight: 600,
    cursor: saving ? "default" : "pointer", fontFamily: "inherit",
    opacity: saving ? 0.6 : 1,
  };
  const cancelBtn = {
    background: "transparent", border: `1px solid ${TH.border}`,
    color: TH.textMuted, borderRadius: 8,
    padding: "9px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  };

  // assign panel
  const assignPanel = {
    background: TH.bgElev, border: `1px solid ${TH.accentBorder}`,
    borderRadius: 10, padding: 14, marginTop: 6,
  };
  const assignGrid = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 8, marginTop: 10,
  };
  const poolRow = (assignedHere, assignedElsewhere) => ({
    display: "flex", alignItems: "center", gap: 8,
    padding: "7px 10px", borderRadius: 6,
    background: assignedHere ? TH.accentBg : assignedElsewhere ? TH.bgInput : "transparent",
    border: `1px solid ${assignedHere ? TH.accentBorder : TH.border}`,
    cursor: "pointer", fontSize: 12,
    color: assignedElsewhere && !assignedHere ? TH.textMuted : TH.text,
  });
  const poolMeta = { color: TH.textMuted, fontSize: 10, marginLeft: "auto" };

  const feedbackBox = (type) => ({
    padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 12,
    background: type === "ok" ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)",
    color:      type === "ok" ? "#10b981" : "#ef4444",
    border: `1px solid ${type === "ok" ? "#10b98155" : "#ef444455"}`,
  });

  // operator → quick lookup for name (for "assigned elsewhere" label)
  const opById = useMemo(() => {
    const m = {}; operators.forEach((o) => { m[o.id] = o; });
    return m;
  }, [operators]);

  // ─── render ──────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div style={{ ...card, textAlign: "center", color: TH.textMuted, padding: 32 }}>
        Admin access required to manage operators.
      </div>
    );
  }

  return (
    <div>
      <div style={headerRow}>
        <div style={summaryText}>
          {operators.length} operator{operators.length !== 1 ? "s" : ""} ·{" "}
          {pools.length - unassignedCount}/{pools.length} pools assigned
          {unassignedCount > 0 && (
            <span style={{ color: "#f59e0b", marginLeft: 8 }}>
              · {unassignedCount} unassigned
            </span>
          )}
        </div>
        {formMode === "closed" && (
          <button onClick={openAdd} style={addBtn}>+ Add operator</button>
        )}
      </div>

      {feedback && (
        <div style={feedbackBox(feedback.type)}>
          {feedback.type === "ok" ? "✓ " : "⚠ "}{feedback.msg}
        </div>
      )}

      {/* Add / Edit form */}
      {formMode !== "closed" && (
        <div style={formCard}>
          <h4 style={formTitle}>
            {formMode === "add" ? "Add operator" : `Edit: ${form.full_name}`}
          </h4>
          <div style={fieldGrid}>
            <div>
              <label style={fieldLabel}>Full name *</label>
              <input value={form.full_name} onChange={(e) => upd("full_name", e.target.value)} style={input} />
            </div>
            <div>
              <label style={fieldLabel}>Email (Supabase login)</label>
              <input type="email" value={form.email} onChange={(e) => upd("email", e.target.value)} style={input} placeholder="optional, for matching with auth users" />
            </div>
            <div>
              <label style={fieldLabel}>Role</label>
              <select value={form.role} onChange={(e) => upd("role", e.target.value)} style={input}>
                {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Phone</label>
              <input value={form.phone} onChange={(e) => upd("phone", e.target.value)} style={input} placeholder="optional" />
            </div>
          </div>
          <div>
            <label style={fieldLabel}>Notes</label>
            <textarea value={form.notes} onChange={(e) => upd("notes", e.target.value)} style={textarea} />
          </div>
          <label style={{ ...checkboxLabel, marginTop: 10 }}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => upd("is_active", e.target.checked)} />
            Active
          </label>
          <div style={formFooter}>
            <button onClick={closeForm} style={cancelBtn}>Cancel</button>
            <button onClick={save} disabled={saving} style={saveBtn}>
              {saving ? "Saving…" : (formMode === "add" ? "Add" : "Save")}
            </button>
          </div>
        </div>
      )}

      {/* Operators table */}
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Role</th>
              <th style={th}>Phone</th>
              <th style={{ ...th, textAlign: "right" }}>Pools</th>
              <th style={{ ...th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {operators.length === 0 && (
              <tr><td style={{ ...td, textAlign: "center", padding: 32, color: TH.textMuted }} colSpan={6}>
                No operators yet. Click "+ Add operator" to start.
              </td></tr>
            )}
            {operators.map((op) => {
              const count = poolCount[op.id] || 0;
              const isManaging = managingId === op.id;
              return (
                <>
                  <tr key={op.id}>
                    <td style={td}>
                      <strong>{op.full_name}</strong>
                      {op.is_active === false && <span style={inactiveBadge}>inactive</span>}
                    </td>
                    <td style={{ ...td, color: TH.textMuted, fontSize: 12 }}>{op.email || "—"}</td>
                    <td style={{ ...td, color: TH.textMuted, fontSize: 12 }}>
                      {ROLES.find((r) => r.key === op.role)?.label || op.role}
                    </td>
                    <td style={{ ...td, color: TH.textMuted, fontSize: 12 }}>{op.phone || "—"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{count}</td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      <button onClick={() => setManagingId(isManaging ? null : op.id)} style={actionBtn}>
                        {isManaging ? "Close" : "Pools"}
                      </button>
                      <button onClick={() => openEdit(op)} style={actionBtn}>Edit</button>
                      <button onClick={() => remove(op)} style={deleteBtn}>Delete</button>
                    </td>
                  </tr>
                  {isManaging && (
                    <tr>
                      <td colSpan={6} style={{ ...td, padding: 0, borderBottom: "none" }}>
                        <div style={assignPanel}>
                          <div style={{ fontSize: 12, color: TH.textMuted }}>
                            Toggle pools managed by <b style={{ color: TH.text }}>{op.full_name}</b>.
                            Selecting a pool already assigned elsewhere will reassign it.
                          </div>
                          <div style={assignGrid}>
                            {pools.map((p) => {
                              const here = p.operator_id === op.id;
                              const elsewhere = !!p.operator_id && !here;
                              const otherName = elsewhere ? opById[p.operator_id]?.full_name : null;
                              return (
                                <label key={p.id} style={poolRow(here, elsewhere)}>
                                  <input
                                    type="checkbox"
                                    checked={here}
                                    onChange={() => togglePool(p.id, p.operator_id, op.id)}
                                  />
                                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {p.name}
                                  </span>
                                  {elsewhere && (
                                    <span style={poolMeta} title={`Currently: ${otherName}`}>
                                      {otherName?.split(" ")[0] || "other"}
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
