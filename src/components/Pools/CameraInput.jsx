// ═══════════════════════════════════════════════════════════════════
// CameraInput.jsx — کامپوننت گرفتن عکس از دوربین + فشرده‌سازی + preview
// ═══════════════════════════════════════════════════════════════════
// روی موبایل: دوربین مستقیماً باز می‌شه (capture="environment")
// روی دسکتاپ: یه file picker معمولی باز می‌شه
// props:
//   TH        — theme
//   label     — متن label
//   required  — bool
//   onChange  — callback(blob | null) — Blob فشرده‌شده پاس می‌شه

import { useRef, useState, useEffect } from "react";
import { compressImage } from "./imageUtils";

export default function CameraInput({ TH, label, required = false, onChange }) {
  const fileRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [busy,       setBusy]       = useState(false);
  const [error,      setError]      = useState(null);
  const [stats,      setStats]      = useState(null);

  // cleanup blob URL هنگام unmount
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setBusy(true);
    try {
      const originalKB = Math.round(file.size / 1024);
      const blob = await compressImage(file, 720, 0.65);
      const finalKB = Math.round(blob.size / 1024);
      setStats({ originalKB, finalKB });

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      onChange?.(blob);
    } catch (err) {
      setError(err.message || String(err));
      onChange?.(null);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStats(null);
    setError(null);
    onChange?.(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ─── styles ──────────────────────────────────────────────────────
  const wrap = { marginBottom: 12 };
  const labelStyle = {
    display: "block", fontSize: 11, color: TH.textMuted,
    marginBottom: 6, fontWeight: 600,
  };
  const trigger = {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, width: "100%",
    background: TH.bgInput,
    border: `1.5px dashed ${error ? "#ef4444" : TH.border}`,
    borderRadius: 10, padding: "20px 16px",
    color: error ? "#ef4444" : TH.textMuted,
    fontSize: 14, fontWeight: 600,
    cursor: busy ? "default" : "pointer",
    fontFamily: "inherit",
    opacity: busy ? 0.6 : 1,
    transition: "all .15s",
  };
  const previewWrap = {
    position: "relative",
    border: `1px solid ${TH.border}`,
    borderRadius: 10, overflow: "hidden",
    background: "#000",
  };
  const previewImg = {
    width: "100%", height: "auto",
    maxHeight: 280, objectFit: "contain", display: "block",
  };
  const overlay = {
    position: "absolute", bottom: 0, left: 0, right: 0,
    background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
    padding: "20px 12px 10px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    color: "#fff", fontSize: 11,
  };
  const statText = { opacity: 0.85, fontWeight: 600 };
  const removeBtn = {
    background: "rgba(239,68,68,0.85)", color: "#fff",
    border: "none", borderRadius: 6,
    padding: "4px 10px", fontSize: 11, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  };
  const errorText = {
    color: "#ef4444", fontSize: 11, marginTop: 6,
  };
  const busyText = {
    color: TH.textMuted, fontSize: 11, marginTop: 6,
  };

  return (
    <div style={wrap}>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>

      {!previewUrl ? (
        <button
          type="button"
          onClick={() => !busy && fileRef.current?.click()}
          style={trigger}
          disabled={busy}
        >
          {busy ? "⏳ Compressing…" : "📷 Take photo"}
        </button>
      ) : (
        <div style={previewWrap}>
          <img src={previewUrl} alt="" style={previewImg} />
          <div style={overlay}>
            <span style={statText}>
              {stats ? `${stats.originalKB} KB → ${stats.finalKB} KB` : "Captured"}
            </span>
            <button type="button" onClick={clear} style={removeBtn}>
              Remove
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {busy  && <div style={busyText}>Compressing image…</div>}
      {error && <div style={errorText}>⚠ {error}</div>}
    </div>
  );
}
