// ═══════════════════════════════════════════════════════════════════
// ReportsTab.jsx — inventory reporting: stock on hand, valuation,
// consumption, purchases, expiry, movements ledger. CSV + print.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import { Icon } from "../lib/icons";
import { Empty, ErrBox, inp, deepBtn, ghostBtn, Stat } from "./SuppliersTab";

const REPORTS = [
  { key:'stock',       icon:'boxes',     en:'Stock on hand',   fa:'موجودی انبار',     he:'מלאי במחסן' },
  { key:'valuation',   icon:'euro',      en:'Valuation',       fa:'ارزش‌گذاری',       he:'שווי מלאי' },
  { key:'consumption', icon:'arrowUp',   en:'Consumption',     fa:'مصرف',            he:'צריכה' },
  { key:'purchases',   icon:'arrowDown', en:'Purchases',       fa:'خریدها',          he:'רכישות' },
  { key:'expiry',      icon:'clock',     en:'Expiry',          fa:'انقضاء',          he:'תפוגה' },
  { key:'ledger',      icon:'ledger',    en:'Movements',       fa:'گردش کالا',        he:'תנועות' },
];
const PERIODS = [7, 30, 90, 365];

export default function ReportsTab({ TH, lang = "en", isMobile }) {
  const L = tr(lang);
  const [report, setReport] = useState('stock');
  const [period, setPeriod] = useState(30);
  const [whFilter, setWh] = useState('all');
  const [catFilter, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const rLabel = r => lang === 'fa' ? r.fa : lang === 'he' ? r.he : r.en;

  useEffect(() => {
    supabase.from('warehouses').select('id, code, name').eq('is_active', true).order('id')
      .then(({ data }) => setWarehouses(data || []));
  }, []);

  useEffect(() => { load(); }, [report, period]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const since = new Date(Date.now() - period * 86400000).toISOString().slice(0,10);
      let q;
      if (report === 'stock' || report === 'valuation') {
        q = supabase.from('v_stock_on_hand').select('*');
      } else if (report === 'consumption') {
        q = supabase.from('v_consumption').select('*').gte('day', since);
      } else if (report === 'purchases') {
        q = supabase.from('v_purchases').select('*').gte('day', since);
      } else if (report === 'expiry') {
        q = supabase.from('v_expiring_batches').select('*');
      } else {
        q = supabase.from('consumable_movements')
          .select('id, item_id, warehouse_id, movement_type, qty, unit, reason, reference_no, supplier_name, unit_cost, total_cost, batch_number, expires_at, destination_type, destination_person_name, notes, performed_at')
          .gte('performed_at', since)
          .order('performed_at', { ascending: false })
          .limit(1000);
      }
      const { data, error } = await q;
      if (error) throw error;
      let out = data || [];

      if (report === 'ledger' && out.length) {
        const [{ data: its }, { data: whs }] = await Promise.all([
          supabase.from('items').select('id, code, name, unit, category').in('id', [...new Set(out.map(r => r.item_id))]),
          supabase.from('warehouses').select('id, code'),
        ]);
        const im = Object.fromEntries((its || []).map(i => [i.id, i]));
        const wm = Object.fromEntries((whs || []).map(w => [w.id, w.code]));
        out = out.map(r => ({ ...r,
          code: im[r.item_id]?.code, name: im[r.item_id]?.name,
          category: im[r.item_id]?.category, warehouse_code: wm[r.warehouse_id] }));
      }
      setRows(out);
    } catch (e) { setError(e.message || String(e)); }
    finally { setLoading(false); }
  }

  const cats = useMemo(() => [...new Set(rows.map(r => r.category).filter(Boolean))].sort(), [rows]);

  const filtered = rows.filter(r => {
    if (whFilter !== 'all' && String(r.warehouse_code || '') !== whFilter && String(r.warehouse_id || '') !== whFilter) return false;
    if (catFilter !== 'all' && r.category !== catFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [r.name, r.code, r.supplier_name, r.pool_name, r.department_name, r.reference_no, r.batch_number]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(q));
  });

  const COLS = {
    stock: [
      ['name','Item'], ['code','Code'], ['warehouse_code','Warehouse'], ['bin_location','Bin'],
      ['qty','Qty','num'], ['unit','Unit'], ['min_qty','Min','num'], ['stock_status','Status','tag'],
    ],
    valuation: [
      ['name','Item'], ['category','Category'], ['warehouse_code','Warehouse'],
      ['qty','Qty','num'], ['last_unit_cost','Unit €','money'], ['stock_value','Value €','money'],
    ],
    consumption: [
      ['day','Date','date'], ['name','Item'], ['warehouse_code','Warehouse'],
      ['pool_name','Pool'], ['department_name','Department'], ['destination_person_name','Person'],
      ['qty_out','Qty','num'], ['cost_out','Cost €','money'],
    ],
    purchases: [
      ['day','Date','date'], ['name','Item'], ['supplier_name','Supplier'],
      ['reference_no','Reference'], ['warehouse_code','Warehouse'],
      ['qty','Qty','num'], ['unit_cost','Unit €','money'], ['total_cost','Total €','money'],
    ],
    expiry: [
      ['name','Item'], ['batch_number','Batch'], ['warehouse_code','Warehouse'],
      ['qty','Qty','num'], ['expires_at','Expires','date'], ['days_left','Days','num'],
      ['expiry_status','Status','tag'],
    ],
    ledger: [
      ['performed_at','When','datetime'], ['name','Item'], ['warehouse_code','Warehouse'],
      ['movement_type','Type','tag'], ['qty','Qty','num'], ['reason','Reason'],
      ['reference_no','Reference'], ['total_cost','Cost €','money'],
    ],
  }[report];

  const totals = useMemo(() => {
    const t = {};
    COLS.forEach(([k,, kind]) => {
      if (kind === 'num' || kind === 'money') {
        t[k] = filtered.reduce((s,r) => s + (Number(r[k]) || 0), 0);
      }
    });
    return t;
  }, [filtered, COLS]);

  const headline = {
    stock:       { label: L.linesLbl || 'Lines',        value: filtered.filter(r => Number(r.qty) !== 0).length },
    valuation:   { label: L.totalValue || 'Total value', value: `€${Math.round(totals.stock_value || 0).toLocaleString('en-GB')}`, gold: true },
    consumption: { label: L.totalCost || 'Total cost',  value: `€${Math.round(totals.cost_out || 0).toLocaleString('en-GB')}`, gold: true },
    purchases:   { label: L.totalSpend || 'Total spend', value: `€${Math.round(totals.total_cost || 0).toLocaleString('en-GB')}`, gold: true },
    expiry:      { label: L.expiredLbl || 'Expired',    value: filtered.filter(r => r.expiry_status === 'expired').length, alert: true },
    ledger:      { label: L.movements || 'Movements',   value: filtered.length },
  }[report];

  function fmt(v, kind, row) {
    if (v === null || v === undefined || v === '') return '—';
    if (kind === 'date')     return new Date(v).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    if (kind === 'datetime') return new Date(v).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
    if (kind === 'money')    return `€${Number(v).toFixed(2)}`;
    if (kind === 'num')      return Number(v).toLocaleString('en-GB',{maximumFractionDigits:2});
    return String(v);
  }
  function tagColor(v) {
    const s = String(v);
    if (['out','expired','damaged','lost'].includes(s))            return { fg:TH.danger, bg:TH.dangerBg };
    if (['low','critical','soon','transfer_out','out'].includes(s)) return { fg:TH.warn,   bg:TH.warnBg };
    if (['ok','in','transfer_in','found'].includes(s))              return { fg:TH.ok,     bg:TH.okBg };
    if (['adjust','service'].includes(s))                           return { fg:TH.info,   bg:TH.infoBg };
    return { fg:TH.textMuted, bg:TH.bgInput };
  }

  function exportCSV() {
    const head = COLS.map(c => c[1]);
    const lines = [head.join(',')];
    filtered.forEach(r => {
      lines.push(COLS.map(([k,, kind]) => {
        const v = r[k];
        if (v === null || v === undefined) return '""';
        const s = (kind === 'date' || kind === 'datetime') ? new Date(v).toISOString() : String(v);
        return `"${s.replace(/"/g,'""')}"`;
      }).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type:'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${report}_report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  function printReport() {
    const meta = REPORTS.find(r => r.key === report);
    const esc = t => String(t ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(rLabel(meta))}</title>
<style>
@page{size:A4 landscape;margin:12mm}
body{font-family:Inter,Helvetica,Arial,sans-serif;color:#111;font-size:9.5pt;margin:0}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #C9A960;padding-bottom:9px;margin-bottom:14px}
.brand{font-family:'Playfair Display',Georgia,serif;font-size:17pt;color:#16233D;font-weight:700}
.sub{font-size:8pt;color:#8B7A44;letter-spacing:.3em;font-weight:600}
h1{font-family:'Playfair Display',Georgia,serif;font-size:16pt;margin:0;color:#16233D;font-weight:600}
.mi{font-size:8.5pt;color:#666;margin-top:3px}
table{width:100%;border-collapse:collapse}
th{background:#FAF9F5;color:#8B7A44;font-size:7.5pt;text-transform:uppercase;letter-spacing:.05em;padding:6px 7px;text-align:left;border-bottom:2px solid #E2E0D8}
td{padding:5px 7px;border-bottom:1px solid #EDEBE4}
.num{text-align:right}
tfoot td{font-weight:700;border-top:2px solid #16233D;border-bottom:none;padding-top:8px}
tr:nth-child(even) td{background:#FCFCFA}
.ft{margin-top:14px;font-size:7.5pt;color:#999;text-align:center;border-top:1px solid #eee;padding-top:7px}
.tb{position:fixed;top:10px;right:10px;background:#C9A960;padding:8px 14px;border-radius:6px;font-weight:700;font-size:10pt}
.tb button{background:#16233D;color:#fff;border:none;padding:5px 13px;border-radius:4px;cursor:pointer;font-weight:700;margin-left:8px}
@media print{.tb{display:none}}
</style></head><body>
<div class="tb">Save as PDF<button onclick="window.print()">Print</button></div>
<div class="hd">
  <div><div class="sub">CAESAR</div><div class="brand">Caesar Projects</div></div>
  <div style="text-align:right"><h1>${esc(rLabel(meta))}</h1>
  <div class="mi">${filtered.length} rows · ${['stock','valuation','expiry'].includes(report) ? 'as at' : 'last ' + period + ' days ·'} ${new Date().toLocaleString('en-GB')}</div></div>
</div>
<table><thead><tr>${COLS.map(([,lbl,kind]) => `<th class="${kind==='num'||kind==='money'?'num':''}">${esc(lbl)}</th>`).join('')}</tr></thead>
<tbody>${filtered.map(r => `<tr>${COLS.map(([k,,kind]) => {
  const v = r[k];
  const txt = v === null || v === undefined || v === '' ? '—'
    : kind === 'date' ? new Date(v).toLocaleDateString('en-GB')
    : kind === 'datetime' ? new Date(v).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
    : kind === 'money' ? '€' + Number(v).toFixed(2)
    : kind === 'num' ? Number(v).toLocaleString('en-GB',{maximumFractionDigits:2})
    : String(v);
  return `<td class="${kind==='num'||kind==='money'?'num':''}">${esc(txt)}</td>`;
}).join('')}</tr>`).join('')}</tbody>
${Object.keys(totals).length ? `<tfoot><tr>${COLS.map(([k,,kind],i) => {
  if (i === 0) return '<td>Total</td>';
  if (kind === 'money') return `<td class="num">€${(totals[k]||0).toFixed(2)}</td>`;
  if (kind === 'num')   return `<td class="num">${(totals[k]||0).toLocaleString('en-GB',{maximumFractionDigits:2})}</td>`;
  return '<td></td>';
}).join('')}</tr></tfoot>` : ''}
</table>
<div class="ft">Generated by the Caesar Projects inventory system</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=1200,height=900');
    if (!w) { alert('Popup blocked. Please allow popups.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  const showPeriod = !['stock','valuation','expiry'].includes(report);

  return (
    <div>
      {/* Report picker */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(6,1fr)", gap:8, marginBottom:16}}>
        {REPORTS.map(r => {
          const on = r.key === report;
          return (
            <button key={r.key} onClick={() => setReport(r.key)} style={{
              background: on ? TH.deep : TH.bgCard,
              border:`1px solid ${on ? TH.deepBorder : TH.border}`,
              borderRadius:11, padding:"13px 10px", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:7,
              color: on ? TH.onDeep : TH.textMuted, fontFamily:"inherit",
              boxShadow: on ? TH.shadow : "none",
            }}>
              <span style={{color: on ? TH.accent : TH.textMuted, display:"flex"}}><Icon name={r.icon} size={18} /></span>
              <span style={{fontSize:11, fontWeight: on ? 700 : 500, textAlign:"center", lineHeight:1.3}}>{rLabel(r)}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center"}}>
        {showPeriod && (
          <div style={{display:"flex", gap:3, background:TH.bgInput, borderRadius:9, padding:3}}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                background: p === period ? TH.bgCard : "transparent", border:"none", borderRadius:7,
                color: p === period ? TH.text : TH.textMuted, padding:"6px 12px", cursor:"pointer",
                fontSize:11.5, fontWeight: p === period ? 700 : 500, fontFamily:"inherit",
              }}>{p === 365 ? '1y' : `${p}d`}</button>
            ))}
          </div>
        )}
        <div style={{...inp(TH), flex:1, minWidth:160, display:"flex", alignItems:"center", gap:8, padding:"0 12px"}}>
          <span style={{color:TH.textDim, display:"flex"}}><Icon name="search" size={14} /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L.searchLbl || "Search…"}
            style={{flex:1, background:"transparent", border:"none", outline:"none", color:TH.text, fontSize:13, fontFamily:"inherit", padding:"9px 0"}} />
        </div>
        <select value={whFilter} onChange={e => setWh(e.target.value)} style={{...inp(TH), width:"auto", minWidth:140}}>
          <option value="all">{L.allWarehouses || "All warehouses"}</option>
          {warehouses.map(w => <option key={w.id} value={w.code}>{w.code}</option>)}
        </select>
        {cats.length > 0 && (
          <select value={catFilter} onChange={e => setCat(e.target.value)} style={{...inp(TH), width:"auto", minWidth:130}}>
            <option value="all">{L.allCategories || "All categories"}</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <div style={{display:"flex", gap:6, marginInlineStart:"auto"}}>
          <button onClick={exportCSV} disabled={!filtered.length} style={{...ghostBtn(TH), display:"inline-flex", alignItems:"center", gap:6, padding:"9px 14px", opacity: filtered.length?1:.4}}>
            <Icon name="arrowDown" size={13} />CSV
          </button>
          <button onClick={printReport} disabled={!filtered.length} style={{...deepBtn(TH), padding:"9px 16px", fontSize:12.5, opacity: filtered.length?1:.4}}>
            <Icon name="print" size={14} />{L.printLbl || "Print"}
          </button>
        </div>
      </div>

      {/* Headline */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)", gap:10, marginBottom:16}}>
        <Stat TH={TH} label={headline.label} value={headline.value} gold={headline.gold} alert={headline.alert && headline.value > 0} />
        <Stat TH={TH} label={L.rowsLbl || "Rows"} value={filtered.length} />
        {Object.entries(totals).slice(0,2).map(([k, v]) => {
          const col = COLS.find(c => c[0] === k);
          return <Stat key={k} TH={TH} label={col?.[1] || k}
            value={col?.[2] === 'money' ? `€${Math.round(v).toLocaleString('en-GB')}` : Math.round(v).toLocaleString('en-GB')}
            gold={col?.[2] === 'money'} />;
        })}
      </div>

      {error && <ErrBox TH={TH}>{error}</ErrBox>}

      {loading ? <Empty TH={TH}>{L.loading || "Loading…"}</Empty>
       : filtered.length === 0 ? <Empty TH={TH}>{L.noData || "No data for this selection."}</Empty>
       : (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, overflow:"auto", boxShadow:TH.cardGlow, maxHeight:"62vh"}}>
          <table style={{width:"100%", borderCollapse:"collapse", fontSize:12.5}}>
            <thead style={{position:"sticky", top:0, zIndex:1}}>
              <tr>
                {COLS.map(([k, lbl, kind]) => (
                  <th key={k} style={{
                    background:TH.bgInput, color:TH.textMuted, fontSize:9.5, fontWeight:700,
                    textTransform:"uppercase", letterSpacing:".07em", padding:"10px 12px",
                    textAlign: (kind === 'num' || kind === 'money') ? "end" : "start",
                    borderBottom:`1px solid ${TH.border}`, whiteSpace:"nowrap",
                  }}>{lbl}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 400).map((r, i) => (
                <tr key={r.id || r.item_id + '-' + i} style={{borderBottom:`1px solid ${TH.divider}`}}>
                  {COLS.map(([k,, kind]) => {
                    const v = r[k];
                    if (kind === 'tag') {
                      const c = tagColor(v);
                      return (
                        <td key={k} style={{padding:"9px 12px"}}>
                          {v ? <span style={{background:c.bg, color:c.fg, fontSize:9.5, fontWeight:700, padding:"2px 8px", borderRadius:4, textTransform:"uppercase", letterSpacing:".05em", whiteSpace:"nowrap"}}>{String(v).replace(/_/g,' ')}</span> : '—'}
                        </td>
                      );
                    }
                    const isNum = kind === 'num' || kind === 'money';
                    const neg = isNum && Number(v) < 0;
                    return (
                      <td key={k} style={{
                        padding:"9px 12px", textAlign: isNum ? "end" : "start",
                        color: neg ? TH.danger : (k === 'name' ? TH.text : TH.textMuted),
                        fontWeight: k === 'name' ? 600 : 400,
                        fontFamily: (k === 'code' || k === 'reference_no' || k === 'batch_number') ? "ui-monospace, monospace" : "inherit",
                        whiteSpace: k === 'name' ? "normal" : "nowrap",
                        maxWidth: k === 'name' ? 240 : undefined,
                      }}>{fmt(v, kind, r)}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            {Object.keys(totals).length > 0 && (
              <tfoot style={{position:"sticky", bottom:0}}>
                <tr>
                  {COLS.map(([k,, kind], i) => (
                    <td key={k} style={{
                      background:TH.bgInput, padding:"11px 12px", fontWeight:700,
                      borderTop:`2px solid ${TH.deep}`, color: kind === 'money' ? TH.accent : TH.text,
                      textAlign: (kind === 'num' || kind === 'money') ? "end" : "start",
                      fontSize:12.5, whiteSpace:"nowrap",
                    }}>
                      {i === 0 ? (L.totalLbl || 'Total')
                        : kind === 'money' ? `€${(totals[k] || 0).toFixed(2)}`
                        : kind === 'num' ? (totals[k] || 0).toLocaleString('en-GB',{maximumFractionDigits:2})
                        : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
          {filtered.length > 400 && (
            <div style={{padding:"11px 14px", fontSize:11.5, color:TH.textDim, textAlign:"center", borderTop:`1px solid ${TH.divider}`}}>
              Showing first 400 of {filtered.length} rows. Export CSV for the full set.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
