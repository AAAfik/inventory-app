// ═══════════════════════════════════════════════════════════════════
// StocktakeTab.jsx — physical count sessions with variance and posting
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import { Icon } from "../lib/icons";
import { Modal, ModalActions, Field, Grid, Empty, ErrBox, inp, goldBtn, deepBtn, ghostBtn, Stat } from "./SuppliersTab";

const STATUS = {
  open:      { label: 'Open',      role: 'info'    },
  counting:  { label: 'Counting',  role: 'warn'    },
  review:    { label: 'In review', role: 'warn'    },
  posted:    { label: 'Posted',    role: 'ok'      },
  cancelled: { label: 'Cancelled', role: 'neutral' },
};
function rc(TH, role) {
  if (role === 'ok')     return { fg: TH.ok,     bg: TH.okBg };
  if (role === 'warn')   return { fg: TH.warn,   bg: TH.warnBg };
  if (role === 'danger') return { fg: TH.danger, bg: TH.dangerBg };
  if (role === 'info')   return { fg: TH.info,   bg: TH.infoBg };
  return { fg: TH.textMuted, bg: TH.bgInput };
}

export default function StocktakeTab({ TH, lang = "en", isMobile, isAdmin }) {
  const L = tr(lang);
  const [takes, setTakes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rT, rW] = await Promise.all([
        supabase.from('stocktakes').select('*').order('started_at', { ascending: false }).limit(50),
        supabase.from('warehouses').select('id, code, name').eq('is_active', true).order('id'),
      ]);
      if (rT.error) throw rT.error;
      setTakes(rT.data || []);
      setWarehouses(rW.data || []);
    } catch (e) { setError(e.message || String(e)); }
    finally { setLoading(false); }
  }

  const whMap = Object.fromEntries(warehouses.map(w => [w.id, w]));
  const active = takes.filter(t => ['open','counting','review'].includes(t.status));

  if (openId) {
    return <CountSheet TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin}
      stocktakeId={openId} whMap={whMap} onBack={() => { setOpenId(null); load(); }} />;
  }

  return (
    <div>
      {creating && <NewStocktake TH={TH} warehouses={warehouses}
        onClose={() => setCreating(false)}
        onCreated={id => { setCreating(false); load(); setOpenId(id); }} />}

      <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)", gap:10, marginBottom:16}}>
        <Stat TH={TH} label={L.activeCounts || "Active counts"} value={active.length} alert={active.length > 0} />
        <Stat TH={TH} label={L.postedLbl || "Posted"} value={takes.filter(t => t.status === 'posted').length} />
        <Stat TH={TH} label={L.totalSessions || "Total sessions"} value={takes.length} />
        <Stat TH={TH} label={L.lastCount || "Last count"}
          value={takes[0] ? new Date(takes[0].started_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '—'} />
      </div>

      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, gap:10, flexWrap:"wrap"}}>
        <div style={{color:TH.textMuted, fontSize:12.5}}>
          {L.stocktakeIntro || "Count physical stock, compare against the system, then post the difference."}
        </div>
        {isAdmin && (
          <button onClick={() => setCreating(true)} style={goldBtn(TH)}>
            <Icon name="plus" size={14} />{L.newCount || "New count"}
          </button>
        )}
      </div>

      {error && <ErrBox TH={TH}>{error}</ErrBox>}

      {loading ? <Empty TH={TH}>{L.loading || "Loading…"}</Empty>
       : takes.length === 0 ? (
        <Empty TH={TH}>
          {L.noStocktakes || "No stock counts yet."}
          {isAdmin && <div style={{marginTop:14}}><button onClick={() => setCreating(true)} style={goldBtn(TH)}><Icon name="plus" size={14} />{L.newCount || "New count"}</button></div>}
        </Empty>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {takes.map(t => {
            const meta = STATUS[t.status] || { label:t.status, role:'neutral' };
            const c = rc(TH, meta.role);
            const pct = t.total_lines ? Math.round((t.counted_lines / t.total_lines) * 100) : 0;
            const varNeg = Number(t.variance_value) < 0;
            return (
              <div key={t.id} onClick={() => setOpenId(t.id)} style={{
                background:TH.bgCard, border:`1px solid ${TH.border}`,
                borderInlineStart:`3px solid ${c.fg}`, borderRadius:0,
                padding:"14px 16px", cursor:"pointer", boxShadow:TH.cardGlow,
              }}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap"}}>
                  <div style={{minWidth:0}}>
                    <div style={{display:"flex", alignItems:"center", gap:9, flexWrap:"wrap", marginBottom:4}}>
                      <span style={{fontFamily:"ui-monospace,monospace", fontSize:12.5, fontWeight:700, color:TH.text}}>{t.stocktake_no}</span>
                      <span style={{background:c.bg, color:c.fg, fontSize:9.5, fontWeight:700, padding:"2px 8px", borderRadius:4, textTransform:"uppercase", letterSpacing:".06em"}}>{meta.label}</span>
                      {t.scope !== 'full' && (
                        <span style={{background:TH.bgInput, color:TH.textMuted, fontSize:9.5, padding:"2px 7px", borderRadius:4, border:`1px solid ${TH.border}`}}>
                          {t.scope}{t.scope_value ? `: ${t.scope_value}` : ''}
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:12.5, color:TH.text}}>{whMap[t.warehouse_id]?.name || `Warehouse ${t.warehouse_id}`}</div>
                    <div style={{fontSize:10.5, color:TH.textDim, marginTop:2}}>
                      {new Date(t.started_at).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                      {t.posted_at ? ` · ${L.postedLbl || "posted"} ${new Date(t.posted_at).toLocaleDateString('en-GB')}` : ''}
                    </div>
                  </div>

                  <div style={{display:"flex", gap:isMobile?14:22, flexShrink:0}}>
                    <Col TH={TH} label={L.progressLbl || "Progress"} value={`${t.counted_lines}/${t.total_lines}`} sub={`${pct}%`} />
                    <Col TH={TH} label={L.varianceLines || "Variances"} value={t.variance_lines || 0}
                      alert={t.variance_lines > 0} />
                    <Col TH={TH} label={L.varianceValue || "Value"}
                      value={t.variance_value ? `${varNeg ? '−' : '+'}€${Math.abs(Number(t.variance_value)).toFixed(0)}` : '€0'}
                      alert={Math.abs(Number(t.variance_value)) > 0} />
                    <span style={{display:"flex", alignItems:"center", color:TH.textDim}}><Icon name="chevron" size={16} /></span>
                  </div>
                </div>

                {t.total_lines > 0 && t.status !== 'posted' && (
                  <div style={{height:3, background:TH.bgInput, borderRadius:2, marginTop:11, overflow:"hidden"}}>
                    <div style={{height:"100%", width:`${pct}%`, background:c.fg, transition:"width .3s"}} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
function NewStocktake({ TH, warehouses, onClose, onCreated }) {
  const [whId, setWhId] = useState(warehouses[0]?.id ? String(warehouses[0].id) : "");
  const [scope, setScope] = useState("full");
  const [scopeValue, setScopeValue] = useState("");
  const [notes, setNotes] = useState("");
  const [cats, setCats] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    supabase.from('items').select('category').eq('is_active', true).then(({ data }) => {
      setCats([...new Set((data || []).map(d => d.category).filter(Boolean))].sort());
    });
  }, []);

  async function create() {
    setErr(null);
    if (!whId) return setErr("Pick a warehouse");
    if (scope === 'category' && !scopeValue) return setErr("Pick a category");
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('open_stocktake', {
        p_warehouse_id: Number(whId),
        p_scope: scope,
        p_scope_value: scope === 'category' ? scopeValue : null,
        p_notes: notes.trim() || null,
      });
      if (error) throw error;
      onCreated(data);
    } catch (e) { setErr(e.message || String(e)); setBusy(false); }
  }

  return (
    <Modal TH={TH} title="New stock count" onClose={onClose} busy={busy}>
      <Field TH={TH} label="Warehouse *">
        <select value={whId} onChange={e => setWhId(e.target.value)} style={inp(TH)}>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </Field>

      <Field TH={TH} label="Scope">
        <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6}}>
          {[['full','Everything'],['category','One category'],['partial','Only items with stock']].map(([k,lbl]) => (
            <button key={k} onClick={() => setScope(k)} style={{
              background: scope === k ? TH.accentBg : "transparent",
              border:`1px solid ${scope === k ? TH.accentBorder : TH.border}`,
              borderRadius:8, color: scope === k ? TH.accentText : TH.textMuted,
              padding:"9px 6px", cursor:"pointer", fontSize:11.5,
              fontWeight: scope === k ? 700 : 500, fontFamily:"inherit",
            }}>{lbl}</button>
          ))}
        </div>
      </Field>

      {scope === 'category' && (
        <Field TH={TH} label="Category *">
          <select value={scopeValue} onChange={e => setScopeValue(e.target.value)} style={inp(TH)}>
            <option value="">— pick —</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      )}

      <Field TH={TH} label="Notes">
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Quarterly count, Q3 2026" style={{...inp(TH), resize:"vertical"}} />
      </Field>

      <div style={{background:TH.infoBg, border:`1px solid ${TH.info}33`, borderRadius:9, padding:"11px 13px", fontSize:12, color:TH.textMuted, marginBottom:4}}>
        A snapshot of current system quantities is taken now. Count the shelves, enter what you find,
        then post — the system writes an adjustment for every difference.
      </div>

      {err && <ErrBox TH={TH}>{err}</ErrBox>}
      <ModalActions TH={TH} onClose={onClose} onSave={create} busy={busy} saveLabel="Start counting" />
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
function CountSheet({ TH, lang, isMobile, isAdmin, stocktakeId, whMap, onBack }) {
  const L = tr(lang);
  const [take, setTake] = useState(null);
  const [lines, setLines] = useState([]);
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | uncounted | variance
  const [draft, setDraft] = useState({});      // line_id -> value
  const [saving, setSaving] = useState({});    // line_id -> bool
  const [posting, setPosting] = useState(false);

  useEffect(() => { load(); }, [stocktakeId]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rT, rL] = await Promise.all([
        supabase.from('stocktakes').select('*').eq('id', stocktakeId).single(),
        supabase.from('stocktake_lines').select('*').eq('stocktake_id', stocktakeId).order('id'),
      ]);
      if (rT.error) throw rT.error;
      setTake(rT.data);
      const ls = rL.data || [];
      setLines(ls);
      if (ls.length) {
        const { data: its } = await supabase.from('items')
          .select('id, code, name, unit, category')
          .in('id', ls.map(l => l.item_id));
        setItems(Object.fromEntries((its || []).map(i => [i.id, i])));
      }
    } catch (e) { setError(e.message || String(e)); }
    finally { setLoading(false); }
  }

  async function saveLine(line, value) {
    if (value === "" || value === null || value === undefined) return;
    setSaving(p => ({ ...p, [line.id]: true }));
    try {
      const { error } = await supabase.rpc('count_stocktake_line', {
        p_line_id: line.id, p_counted_qty: Number(value), p_note: null,
      });
      if (error) throw error;
      setLines(prev => prev.map(l => l.id === line.id
        ? { ...l, counted_qty: Number(value), variance: Number(value) - Number(l.system_qty), counted_at: new Date().toISOString() }
        : l));
      setDraft(p => { const n = { ...p }; delete n[line.id]; return n; });
    } catch (e) { setError(e.message || String(e)); }
    finally { setSaving(p => ({ ...p, [line.id]: false })); }
  }

  async function post() {
    const varLines = lines.filter(l => l.counted_qty !== null && Number(l.variance) !== 0);
    const uncounted = lines.filter(l => l.counted_qty === null).length;
    let msg = `Post this count?\n\n${varLines.length} adjustment${varLines.length === 1 ? '' : 's'} will be written to the stock ledger.`;
    if (uncounted) msg += `\n\n${uncounted} line${uncounted === 1 ? '' : 's'} were never counted and will be left untouched.`;
    if (!confirm(msg)) return;
    setPosting(true); setError(null);
    try {
      const { data, error } = await supabase.rpc('post_stocktake', { p_stocktake_id: stocktakeId });
      if (error) throw error;
      alert(`Posted. ${data} adjustment${data === 1 ? '' : 's'} written.`);
      onBack();
    } catch (e) { setError(e.message || String(e)); setPosting(false); }
  }

  function exportSheet() {
    const head = ['Item code','Item name','Unit','Bin','System qty','Counted qty','Variance','Unit cost','Variance value','Note'];
    const rows = [head.join(',')];
    lines.forEach(l => {
      const it = items[l.item_id] || {};
      const v = l.counted_qty === null ? '' : Number(l.variance);
      rows.push([
        it.code || '', it.name || '', it.unit || '', l.bin_location || '',
        l.system_qty, l.counted_qty ?? '', v,
        l.unit_cost ?? '', v === '' ? '' : (v * (Number(l.unit_cost)||0)).toFixed(2),
        l.note || '',
      ].map(x => `"${String(x).replace(/"/g,'""')}"`).join(','));
    });
    const blob = new Blob([rows.join('\n')], { type:'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${take?.stocktake_no || 'stocktake'}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  const visible = lines.filter(l => {
    const it = items[l.item_id] || {};
    if (filter === 'uncounted' && l.counted_qty !== null) return false;
    if (filter === 'variance' && (l.counted_qty === null || Number(l.variance) === 0)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [it.name, it.code, l.bin_location].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
  });

  const counted   = lines.filter(l => l.counted_qty !== null).length;
  const variances = lines.filter(l => l.counted_qty !== null && Number(l.variance) !== 0);
  const varValue  = variances.reduce((s,l) => s + Number(l.variance) * (Number(l.unit_cost)||0), 0);
  const isPosted  = take?.status === 'posted';

  return (
    <div>
      <button onClick={onBack} style={{...ghostBtn(TH), display:"inline-flex", alignItems:"center", gap:6, marginBottom:14}}>
        <Icon name="arrowLeft" size={14} />{L.back || "Back"}
      </button>

      {take && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:"16px 18px", marginBottom:14, boxShadow:TH.cardGlow}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:14, flexWrap:"wrap"}}>
            <div>
              <div style={{fontFamily:"ui-monospace,monospace", fontSize:11, color:TH.accent, fontWeight:700, letterSpacing:".05em"}}>{take.stocktake_no}</div>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif", fontSize:21, fontWeight:500, color:TH.textHeading, marginTop:3}}>
                {whMap[take.warehouse_id]?.name || `Warehouse ${take.warehouse_id}`}
              </div>
              <div style={{fontSize:11, color:TH.textDim, marginTop:4}}>
                {new Date(take.started_at).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                {take.notes ? ` · ${take.notes}` : ''}
              </div>
            </div>
            <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
              <button onClick={exportSheet} style={{...ghostBtn(TH), display:"inline-flex", alignItems:"center", gap:6, padding:"9px 14px"}}>
                <Icon name="arrowDown" size={13} />CSV
              </button>
              {!isPosted && isAdmin && (
                <button onClick={post} disabled={posting || counted === 0} style={{...deepBtn(TH), opacity:(posting || counted === 0)?.5:1}}>
                  <Icon name="check" size={14} />{posting ? "Posting…" : (L.postCount || "Post count")}
                </button>
              )}
            </div>
          </div>

          <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)", gap:10, marginTop:16}}>
            <Stat TH={TH} label={L.progressLbl || "Counted"} value={`${counted} / ${lines.length}`} />
            <Stat TH={TH} label={L.varianceLines || "Variances"} value={variances.length} alert={variances.length > 0} />
            <Stat TH={TH} label={L.varianceValue || "Variance value"}
              value={`${varValue < 0 ? '−' : '+'}€${Math.abs(varValue).toFixed(2)}`} alert={Math.abs(varValue) > 0} />
            <Stat TH={TH} label={L.statusLbl || "Status"} value={(STATUS[take.status] || {}).label || take.status}
              gold={take.status === 'posted'} />
          </div>
        </div>
      )}

      {error && <ErrBox TH={TH}>{error}</ErrBox>}
      {isPosted && (
        <div style={{background:TH.okBg, border:`1px solid ${TH.ok}44`, borderRadius:9, padding:"11px 14px", color:TH.ok, fontSize:12.5, marginBottom:14}}>
          This count has been posted. Quantities are locked.
        </div>
      )}

      <div style={{display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center"}}>
        <div style={{...inp(TH), flex:1, minWidth:180, display:"flex", alignItems:"center", gap:8, padding:"0 12px"}}>
          <span style={{color:TH.textDim, display:"flex"}}><Icon name="search" size={14} /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L.searchItem || "Search item or bin…"}
            style={{flex:1, background:"transparent", border:"none", outline:"none", color:TH.text, fontSize:13, fontFamily:"inherit", padding:"9px 0"}} />
        </div>
        <div style={{display:"flex", gap:4}}>
          {[['all', `All (${lines.length})`], ['uncounted', `Uncounted (${lines.length - counted})`], ['variance', `Variance (${variances.length})`]].map(([k, lbl]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              background: filter === k ? TH.accentBg : "transparent",
              border:`1px solid ${filter === k ? TH.accentBorder : TH.border}`,
              borderRadius:20, color: filter === k ? TH.accentText : TH.textMuted,
              padding:"6px 13px", cursor:"pointer", fontSize:11.5,
              fontWeight: filter === k ? 700 : 500, fontFamily:"inherit", whiteSpace:"nowrap",
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {loading ? <Empty TH={TH}>{L.loading || "Loading…"}</Empty>
       : visible.length === 0 ? <Empty TH={TH}>{L.noMatch || "Nothing matches."}</Empty>
       : (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, overflow:"hidden", boxShadow:TH.cardGlow}}>
          {visible.map((l, idx) => {
            const it = items[l.item_id] || {};
            const isCounted = l.counted_qty !== null;
            const v = isCounted ? Number(l.counted_qty) - Number(l.system_qty) : null;
            const vColor = v === null ? TH.textDim : v === 0 ? TH.ok : v > 0 ? TH.info : TH.danger;
            return (
              <div key={l.id} style={{
                display:"flex", alignItems:"center", gap:11, padding:"11px 16px",
                borderBottom: idx === visible.length-1 ? "none" : `1px solid ${TH.divider}`,
                borderInlineStart: isCounted ? `3px solid ${vColor}` : `3px solid transparent`,
              }}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:600, color:TH.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{it.name || `Item ${l.item_id}`}</div>
                  <div style={{fontSize:10, color:TH.textDim, marginTop:2}}>
                    {[it.code, l.bin_location, it.category].filter(Boolean).join(' · ')}
                  </div>
                </div>

                <div style={{textAlign:"end", minWidth:64, flexShrink:0}}>
                  <div style={{fontSize:8.5, fontWeight:700, color:TH.textDim, textTransform:"uppercase", letterSpacing:".08em"}}>{L.systemLbl || "System"}</div>
                  <div style={{fontSize:13, color:TH.textMuted, marginTop:2}}>{l.system_qty} <span style={{fontSize:9.5}}>{it.unit}</span></div>
                </div>

                <div style={{flexShrink:0, width:96}}>
                  <div style={{fontSize:8.5, fontWeight:700, color:TH.textDim, textTransform:"uppercase", letterSpacing:".08em", marginBottom:3}}>{L.countedLbl || "Counted"}</div>
                  <input type="number" step="0.01" min="0" disabled={isPosted || saving[l.id]}
                    value={draft[l.id] ?? (l.counted_qty ?? '')}
                    onChange={e => setDraft(p => ({ ...p, [l.id]: e.target.value }))}
                    onBlur={e => { const val = e.target.value; if (val !== '' && Number(val) !== Number(l.counted_qty)) saveLine(l, val); }}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    placeholder="—"
                    style={{...inp(TH), padding:"6px 9px", fontSize:13, textAlign:"end", fontWeight:600,
                      borderColor: isCounted ? vColor + '66' : TH.border, opacity: saving[l.id] ? .5 : 1}} />
                </div>

                <div style={{textAlign:"end", minWidth:72, flexShrink:0}}>
                  <div style={{fontSize:8.5, fontWeight:700, color:TH.textDim, textTransform:"uppercase", letterSpacing:".08em"}}>{L.varianceLbl || "Variance"}</div>
                  <div style={{fontSize:13, fontWeight:700, color:vColor, marginTop:2}}>
                    {v === null ? '—' : v === 0 ? '0' : `${v > 0 ? '+' : ''}${v}`}
                  </div>
                  {v !== null && v !== 0 && l.unit_cost != null && (
                    <div style={{fontSize:9.5, color:TH.textDim}}>€{Math.abs(v * Number(l.unit_cost)).toFixed(2)}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Col({ TH, label, value, sub, alert }) {
  return (
    <div style={{textAlign:"end", minWidth:56}}>
      <div style={{fontSize:8.5, fontWeight:700, color:TH.textDim, textTransform:"uppercase", letterSpacing:".08em"}}>{label}</div>
      <div style={{fontSize:14, fontWeight:700, color: alert ? TH.danger : TH.text, marginTop:2, whiteSpace:"nowrap"}}>{value}</div>
      {sub && <div style={{fontSize:9.5, color:TH.textDim}}>{sub}</div>}
    </div>
  );
}
