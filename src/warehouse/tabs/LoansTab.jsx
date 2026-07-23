// ═══════════════════════════════════════════════════════════════════
// LoansTab.jsx — active asset loans + overdue alerts + checkout/return
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import { formatDate, formatDateShort } from "../../inspection/lib/inspectionUtils";
import { ASSET_KINDS } from "../lib/warehouseUtils";
import CheckoutModal from "../components/CheckoutModal";

export default function LoansTab({ TH, lang = "en", isMobile, onChanged }) {
  const L = tr(lang);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");  // all | active | due_soon | overdue
  const [search, setSearch] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [returning, setReturning] = useState(null);   // asset id being returned
  const [returnNotes, setReturnNotes] = useState("");
  const [returnCondition, setReturnCondition] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      // All checked_out assets with holder + expected return
      const { data, error: e } = await supabase.from('assets')
        .select('id, asset_no, barcode, kind, name, brand, holder_name, holder_phone, assigned_to_user_id, expected_return_at, warehouse_id, current_location, photo_url, condition, status')
        .eq('status', 'checked_out')
        .eq('is_active', true)
        .order('expected_return_at', { ascending: true, nullsFirst: false });
      if (e) throw e;
      setLoans(data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function overdueDays(dateStr) {
    if (!dateStr) return null;
    const now = new Date();
    const d = new Date(dateStr);
    const ms = now.getTime() - d.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  const now = new Date();
  const enriched = loans.map(l => {
    const od = overdueDays(l.expected_return_at);
    const dueSoon = od !== null && od >= -3 && od < 0;   // within 3 days
    const overdue = od !== null && od >= 0;
    return { ...l, overdueDays: od, dueSoon, overdue };
  });

  const filt = enriched.filter(l => {
    if (filter === "overdue"  && !l.overdue) return false;
    if (filter === "due_soon" && !l.dueSoon) return false;
    if (filter === "active"   && (l.overdue || l.dueSoon)) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [l.name, l.asset_no, l.barcode, l.holder_name, l.brand].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all: enriched.length,
    overdue: enriched.filter(x => x.overdue).length,
    due_soon: enriched.filter(x => x.dueSoon).length,
    active: enriched.filter(x => !x.overdue && !x.dueSoon).length,
  };

  async function doReturn() {
    if (!returning) return;
    setBusy(true); setError(null);
    try {
      const { error: e } = await supabase.rpc('return_asset', {
        p_asset_id: returning.id,
        p_to_warehouse_id: returning.warehouse_id || null,
        p_condition: returnCondition || null,
        p_notes: returnNotes.trim() || null,
      });
      if (e) throw e;
      setReturning(null); setReturnNotes(""); setReturnCondition("");
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {showCheckout && (
        <CheckoutModal
          TH={TH} lang={lang}
          onClose={() => setShowCheckout(false)}
          onDone={() => { setShowCheckout(false); load(); onChanged?.(); }}
        />
      )}

      {/* Return dialog */}
      {returning && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
          <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:20, width:"100%", maxWidth:420}}>
            <div style={{fontSize:16, fontWeight:800, color:TH.text, marginBottom:14}}>↩ {L.returnAsset || "Return asset"}</div>
            <div style={{fontSize:12, color:TH.textMuted, marginBottom:14, padding:10, background:TH.bgInput, borderRadius:8}}>
              <b>{returning.name}</b> ({returning.asset_no})<br/>
              Held by: {returning.holder_name}
            </div>
            <label style={{display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px"}}>{L.condition || "Condition on return"}</label>
            <select value={returnCondition} onChange={e => setReturnCondition(e.target.value)} disabled={busy} style={inp(TH)}>
              <option value="">— No change —</option>
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="broken">Broken</option>
            </select>
            <label style={{display:"block", color:TH.textMuted, fontSize:11, marginTop:10, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px"}}>{L.notes || "Notes"}</label>
            <textarea value={returnNotes} onChange={e => setReturnNotes(e.target.value)} disabled={busy} rows={2} placeholder="Optional" style={{...inp(TH), resize:"vertical"}} />
            <div style={{display:"flex", gap:8, justifyContent:"flex-end", marginTop:14}}>
              <button onClick={() => setReturning(null)} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"9px 16px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>{L.cancel || "Cancel"}</button>
              <button onClick={doReturn} disabled={busy} style={{background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:8, color:"#000", padding:"9px 20px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit"}}>{busy ? "Returning…" : (L.confirmReturn || "Confirm return")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:14, fontWeight:800, color:TH.text}}>📤 {L.loansTitle || "Asset Loans"}</div>
          <div style={{fontSize:11, color:TH.textMuted, marginTop:2}}>{L.loansDesc || "Active asset check-outs with expected return dates."}</div>
        </div>
        <button onClick={() => setShowCheckout(true)} style={{background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:10, color:"#000", padding:"12px 20px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit"}}>
          📤 {L.newCheckout || "New checkout"}
        </button>
      </div>

      {/* Filter pills */}
      <div style={{display:"flex", gap:6, marginBottom:12, overflowX:"auto"}}>
        {[
          { k: "all",      label: L.all || "All",           color: TH.textMuted },
          { k: "overdue",  label: L.overdue || "Overdue",   color: "#C43D3D" },
          { k: "due_soon", label: L.dueSoon || "Due soon",  color: "#E67A2C" },
          { k: "active",   label: L.active || "Active",     color: "#7A9A5B" },
        ].map(t => {
          const on = filter === t.k;
          return (
            <button key={t.k} onClick={() => setFilter(t.k)} style={{
              background: on ? t.color+"22" : "transparent",
              border: `1px solid ${on ? t.color : TH.border}`,
              borderRadius: 20, color: on ? t.color : TH.textMuted,
              padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: on ? 700 : 500,
              fontFamily: "inherit", whiteSpace: "nowrap", display:"inline-flex", alignItems:"center", gap:5,
            }}>
              {t.label}
              <span style={{background: on ? t.color : TH.bgInput, color: on ? "#fff" : TH.textMuted, borderRadius:10, padding:"1px 7px", fontSize:10, fontWeight:700}}>{counts[t.k] || 0}</span>
            </button>
          );
        })}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L.searchLoans || "Search asset / holder / barcode…"} style={{...inp(TH), marginBottom:14}} />

      {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:10, padding:"12px 14px", color:"#C43D3D", fontSize:13, marginBottom:14}}>{error}</div>}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>{L.loading || 'Loading…'}</div>
      ) : filt.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          {L.noLoans || "No loans to display."}
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {filt.map(l => {
            const km = ASSET_KINDS[l.kind] || {};
            const stateColor = l.overdue ? "#C43D3D" : l.dueSoon ? "#E67A2C" : "#7A9A5B";
            const stateLabel = l.overdue
              ? `${l.overdueDays} ${l.overdueDays === 1 ? "day" : "days"} overdue`
              : l.dueSoon
                ? `Due in ${Math.abs(l.overdueDays)} ${Math.abs(l.overdueDays) === 1 ? "day" : "days"}`
                : "Active";
            return (
              <div key={l.id} style={{
                background: l.overdue ? "rgba(196,61,61,0.05)" : TH.bgCard,
                border: `1px solid ${l.overdue ? "rgba(196,61,61,0.3)" : TH.border}`,
                borderRadius:12, borderLeft:`3px solid ${stateColor}`, padding:14,
              }}>
                <div style={{display:"flex", gap:12}}>
                  {l.photo_url ? (
                    <img src={l.photo_url} alt="" style={{width:60, height:60, objectFit:"cover", borderRadius:8, flexShrink:0, background:"#000"}} />
                  ) : (
                    <div style={{width:60, height:60, borderRadius:8, flexShrink:0, background:TH.bgInput, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26}}>{km.icon || '📦'}</div>
                  )}
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:"flex", justifyContent:"space-between", gap:8, marginBottom:4, flexWrap:"wrap"}}>
                      <div>
                        <div style={{fontSize:14, fontWeight:800, color:TH.text}}>{l.name}</div>
                        <div style={{fontSize:10, color:TH.textDim, fontFamily:"monospace", marginTop:2}}>{l.asset_no}{l.barcode ? ` · ${l.barcode}` : ''}</div>
                      </div>
                      <span style={{padding:"3px 10px", borderRadius:20, background:stateColor+"22", color:stateColor, fontSize:10, fontWeight:800, whiteSpace:"nowrap", height:"fit-content"}}>{l.overdue ? "⚠" : l.dueSoon ? "⏳" : "●"} {stateLabel}</span>
                    </div>
                    <div style={{display:"flex", gap:6, flexWrap:"wrap", marginTop:6}}>
                      <Chip TH={TH} gold>👤 {l.holder_name}</Chip>
                      {l.holder_phone && <Chip TH={TH}>📞 {l.holder_phone}</Chip>}
                      {l.current_location && <Chip TH={TH}>📍 {l.current_location}</Chip>}
                      {l.expected_return_at && <Chip TH={TH}>📅 {formatDateShort(l.expected_return_at)}</Chip>}
                    </div>
                  </div>
                </div>
                <div style={{marginTop:10, display:"flex", gap:6, justifyContent:"flex-end"}}>
                  <button onClick={() => setReturning(l)} style={{background:"linear-gradient(135deg,#7A9A5B,#5B7A44)", border:"none", borderRadius:8, color:"#fff", padding:"8px 16px", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit"}}>
                    ↩ {L.returnBtn || "Return"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({ TH, children, gold }) {
  return <span style={{fontSize:10, color: gold ? "#B8935A" : TH.textMuted, background: gold ? "rgba(184,147,90,0.12)" : TH.bgInput, padding:"3px 8px", borderRadius:5, whiteSpace:"nowrap"}}>{children}</span>;
}
function inp(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
