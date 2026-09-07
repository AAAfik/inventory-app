// ═══════════════════════════════════════════════════════════════════
// DashboardTab.jsx — Caesar Command Center
// Hero banner · KPI cards with sparklines · Needs attention · Daily chart
// Inline SVG line icons only (no emoji, no icon dependency)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { tr } from "./i18n";

const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";

// ─── Inline SVG line icons ────────────────────────────────────────
function Ico({ d, size = 18, sw = 1.75 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}} aria-hidden="true">
      {d}
    </svg>
  );
}
const I = {
  package:  <Ico d={<><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></>} />,
  alert:    <Ico d={<><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></>} />,
  triangle: <Ico d={<><path d="M10.3 4.3L2.6 17.4A2 2 0 004.3 20.4h15.4a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></>} />,
  arrows:   <Ico d={<><path d="M7 7h13l-3-3M17 17H4l3 3"/></>} />,
  trendUp:  <Ico d={<><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></>} size={13} sw={2.2} />,
  chevron:  <Ico d={<path d="M9 6l6 6-6 6"/>} size={15} />,
  refresh:  <Ico d={<><path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 5v6h-6"/></>} size={14} />,
  spark:    <Ico d={<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3z"/>} size={14} />,
  euro:     <Ico d={<><path d="M17 5a8 8 0 100 14"/><path d="M4 10h9M4 14h9"/></>} />,
};

// ─── Status maps ──────────────────────────────────────────────────
const INS_STATUS = {
  ok:{label:'OK',role:'ok'}, minor_issue:{label:'Minor',role:'warn'},
  major_issue:{label:'Major',role:'danger'}, critical:{label:'Critical',role:'danger'},
  needs_repair:{label:'Repair',role:'warn'}, fixed:{label:'Fixed',role:'ok'},
};
const AST_STATUS = {
  available:{label:'Available',role:'ok'}, checked_out:{label:'Checked out',role:'warn'},
  in_service:{label:'In service',role:'info'}, damaged:{label:'Damaged',role:'danger'},
  lost:{label:'Lost',role:'danger'}, retired:{label:'Retired',role:'neutral'},
};
const KIND_LABEL = { equipment:'Equipment', tool:'Tool', vehicle:'Vehicle' };
const KIND_ABBR  = { equipment:'EQ', tool:'TL', vehicle:'VH' };

function rc(TH, role) {
  switch (role) {
    case 'ok':     return { fg:TH.ok,        bg:TH.okBg };
    case 'warn':   return { fg:TH.warn,      bg:TH.warnBg };
    case 'danger': return { fg:TH.danger,    bg:TH.dangerBg };
    case 'info':   return { fg:TH.info,      bg:TH.infoBg };
    default:       return { fg:TH.textMuted, bg:TH.bgInput };
  }
}
function fdt(s){ return s ? new Date(s).toLocaleString('en-GB',{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'; }
function fd(s){ return s ? new Date(s).toLocaleDateString('en-GB',{year:'numeric',month:'short',day:'2-digit'}) : '—'; }
function money(n, cur='EUR'){
  if (n == null || n === '') return '—';
  const sym = cur==='EUR'?'€':cur==='USD'?'$':cur==='TRY'?'₺':cur+' ';
  return sym + Number(n).toLocaleString('en-GB',{maximumFractionDigits:0});
}
function greet(lang) {
  const h = new Date().getHours();
  if (lang === 'fa') return h < 12 ? 'صبح بخیر' : h < 18 ? 'عصر بخیر' : 'شب بخیر';
  if (lang === 'he') return h < 12 ? 'בוקר טוב' : h < 18 ? 'צהריים טובים' : 'ערב טוב';
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const PERIODS = [
  { key:7,  en:'Last 7 days',  fa:'۷ روز',  he:'7 ימים'  },
  { key:14, en:'Last 14 days', fa:'۱۴ روز', he:'14 ימים' },
  { key:30, en:'Last 30 days', fa:'۳۰ روز', he:'30 ימים' },
];

export default function DashboardTab({ TH, lang = "en", isMobile, isAdmin, onNav, userName }) {
  const L = tr(lang);
  const isRTL = lang === 'he' || lang === 'fa';

  const [period, setPeriod] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(new Date());

  const [modal, setModal] = useState(null);
  const [photoZoom, setPhotoZoom] = useState(null);

  useEffect(() => { load(); }, [period]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  async function load(isRefresh) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - period * 86400000).toISOString();
      const prevSince = new Date(Date.now() - period * 2 * 86400000).toISOString();

      const [rAssets, rWh, rIns, rReqs, rInsRecent, rAstRecent, rProps, rAreas,
             rMov, rMovPrev, rItems, rOverdue] = await Promise.all([
        supabase.from('assets').select('id, kind, status, purchase_price, next_service_date, name').eq('is_active', true),
        supabase.from('warehouses').select('id, code, name').eq('is_active', true),
        supabase.from('inspections').select('id, status, severity, title, created_at, inspection_no').in('status',['minor_issue','major_issue','critical','needs_repair']),
        supabase.schema('procure').from('requisitions').select('id',{count:'exact'}).in('status',['submitted','dept_approved','in_procurement','pending_approval']),
        supabase.from('inspections').select('*').order('created_at',{ascending:false}).limit(6),
        supabase.from('assets').select('*').eq('is_active',true).order('created_at',{ascending:false}).limit(6),
        supabase.from('wh_properties').select('id, code, name'),
        supabase.from('inspection_areas').select('id, name'),
        supabase.from('consumable_movements').select('id, qty, performed_at, total_cost').gte('performed_at', since),
        supabase.from('consumable_movements').select('id').gte('performed_at', prevSince).lt('performed_at', since),
        supabase.from('items').select('id, name, unit, min_qty, current_qty, last_unit_cost').eq('is_active', true),
        supabase.from('overdue_asset_loans').select('*'),
      ]);

      const assets = rAssets.data || [];
      const byKind = { equipment:0, tool:0, vehicle:0 };
      assets.forEach(a => { if (byKind[a.kind] !== undefined) byKind[a.kind]++; });

      const items = rItems.data || [];
      const stockValue = items.reduce((s,it) => s + (Number(it.current_qty)||0) * (Number(it.last_unit_cost)||0), 0);
      const lowItems = items.filter(it => it.min_qty != null && Number(it.current_qty||0) < Number(it.min_qty));

      const serviceDue = assets.filter(a => {
        if (!a.next_service_date) return false;
        return Math.round((new Date(a.next_service_date) - new Date()) / 86400000) <= 7;
      });

      const movs = rMov.data || [];
      const movPrev = (rMovPrev.data || []).length;
      const inCount  = movs.filter(m => Number(m.qty) > 0).length;
      const outCount = movs.filter(m => Number(m.qty) < 0).length;
      const spent = movs.filter(m => Number(m.qty) > 0).reduce((s,m) => s + (Number(m.total_cost)||0), 0);

      const days = [];
      for (let i = period - 1; i >= 0; i--) {
        const dt = new Date(); dt.setHours(0,0,0,0); dt.setDate(dt.getDate() - i);
        days.push({ date:dt, label:dt.toLocaleDateString('en-GB',{weekday:'short'}), dayNum:dt.getDate(), inQ:0, outQ:0, count:0 });
      }
      movs.forEach(m => {
        const t = new Date(m.performed_at); t.setHours(0,0,0,0);
        const slot = days.find(x => x.date.getTime() === t.getTime());
        if (!slot) return;
        slot.count++;
        if (Number(m.qty) > 0) slot.inQ += Number(m.qty); else slot.outQ += Math.abs(Number(m.qty));
      });

      const critical = (rIns.data || []).filter(i => i.status === 'critical' || i.severity >= 3);

      setData({
        totalAssets: assets.length, byKind,
        warehouses: (rWh.data||[]).length,
        itemCount: items.length, stockValue,
        lowItems, serviceDue,
        overdue: rOverdue.data || [],
        openIssues: (rIns.data||[]).length, critical,
        pendingReqs: (rReqs.data||[]).length,
        movCount: movs.length, movPrev, inCount, outCount, spent,
        days,
        recentInspections: rInsRecent.data || [],
        recentAssets: rAstRecent.data || [],
        propMap: Object.fromEntries((rProps.data||[]).map(p=>[p.id,p])),
        areaMap: Object.fromEntries((rAreas.data||[]).map(a=>[a.id,a])),
        whMap:   Object.fromEntries((rWh.data||[]).map(w=>[w.id,w])),
      });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  if (loading) return <div style={{padding:56, textAlign:"center", color:TH.textMuted, fontSize:13}}>{L.loading || "Loading…"}</div>;
  const d = data;
  if (!d) return <div style={{padding:40, color:TH.danger, fontSize:13}}>{error}</div>;

  const attention = [];
  d.critical.forEach(i => attention.push({ id:'ins-'+i.id, role:'danger', tag:L.critical||'critical', title:i.title, sub:`${i.inspection_no||''} · ${fd(i.created_at)}`, nav:'inspection' }));
  d.overdue.forEach(o => attention.push({ id:'od-'+(o.asset_id||o.id), role:'danger', tag:L.overdue||'overdue', title:o.asset_name||o.name||(L.overdueReturns||'Overdue return'), sub:`${o.holder_name||'—'}${o.expected_return_at?' · '+fd(o.expected_return_at):''}`, nav:'warehouse' }));
  d.serviceDue.forEach(a => attention.push({ id:'sv-'+a.id, role:'warn', tag:L.serviceDue7||'service due', title:a.name, sub:fd(a.next_service_date), nav:'warehouse' }));
  d.lowItems.forEach(it => attention.push({ id:'lw-'+it.id, role:'warn', tag:L.low||'low stock', title:it.name, sub:`${it.current_qty} ${it.unit||''} · ${L.min||'min'} ${it.min_qty}`, nav:'warehouse' }));

  const movDelta = d.movPrev > 0 ? Math.round(((d.movCount - d.movPrev) / d.movPrev) * 100) : (d.movCount > 0 ? 100 : 0);
  const maxCount = Math.max(1, ...d.days.map(x => x.count));
  const periodLbl = period + (lang==='fa'?' روز':lang==='he'?' ימים':'D');

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      {photoZoom && (
        <div onClick={() => setPhotoZoom(null)} style={{position:"fixed", inset:0, background:"rgba(8,12,22,.96)", zIndex:10001, display:"flex", alignItems:"center", justifyContent:"center", padding:16, cursor:"pointer"}}>
          <img src={photoZoom} alt="" style={{maxWidth:"100%", maxHeight:"100%", objectFit:"contain", borderRadius:8}} />
        </div>
      )}
      {modal && (
        <div onClick={() => setModal(null)} style={{position:"fixed", inset:0, background:"rgba(8,12,22,.62)", backdropFilter:"blur(3px)", zIndex:10000, display:"flex", alignItems:isMobile?"flex-end":"center", justifyContent:"center", padding:isMobile?0:24}}>
          <div onClick={e=>e.stopPropagation()} style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:isMobile?"18px 18px 0 0":16, width:"100%", maxWidth:660, maxHeight:isMobile?"92vh":"88vh", overflowY:"auto", padding:24, boxSizing:"border-box", boxShadow:TH.shadowLg}}>
            {modal.type === 'inspection'
              ? <InspectionModal TH={TH} L={L} ins={modal.data} propMap={d.propMap} areaMap={d.areaMap} onZoom={setPhotoZoom} onClose={()=>setModal(null)} onOpenModule={()=>{setModal(null); onNav?.('inspection');}} />
              : <AssetModal TH={TH} L={L} asset={modal.data} whMap={d.whMap} onZoom={setPhotoZoom} onClose={()=>setModal(null)} onOpenModule={()=>{setModal(null); onNav?.('warehouse');}} />}
          </div>
        </div>
      )}

      {/* ═══ HERO ═══ */}
      <div style={{
        background:`linear-gradient(135deg, ${TH.deep} 0%, ${TH.deepAlt || TH.deep} 100%)`,
        border:`1px solid ${TH.deepBorder}`, borderRadius:18,
        padding: isMobile?"20px 18px":"24px 28px", marginBottom:16,
        position:"relative", overflow:"hidden", boxShadow:TH.shadowLg,
      }}>
        <div style={{position:"absolute", top:-70, right:-40, width:240, height:240, borderRadius:"50%", background:`radial-gradient(circle, ${TH.accent}18, transparent 68%)`, pointerEvents:"none"}} />

        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:20, flexWrap:"wrap", position:"relative"}}>
          <div style={{minWidth:0}}>
            <div style={{display:"flex", alignItems:"center", gap:7, marginBottom:9, color:TH.accent}}>
              {I.spark}
              <span style={{fontSize:10, fontWeight:700, letterSpacing:".16em", textTransform:"uppercase"}}>{L.commandCenter || "Command center"}</span>
            </div>
            <div style={{fontFamily:SERIF, fontSize:isMobile?24:32, fontWeight:500, color:TH.onDeep, lineHeight:1.1, letterSpacing:"-.015em"}}>
              {greet(lang)}{userName ? `, ${userName}` : ''}
            </div>
            <div style={{display:"flex", alignItems:"center", gap:8, marginTop:8, fontSize:12, color:TH.onDeepMuted}}>
              <span>{L.asOf || "As of"}</span>
              <span style={{fontFamily:"ui-monospace, monospace", color:TH.onDeep, fontWeight:600}}>{now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>
              <span style={{opacity:.5}}>·</span>
              <span>İskele</span>
              <button onClick={() => load(true)} aria-label="Refresh" style={{background:"transparent", border:"none", color:TH.onDeepMuted, cursor:"pointer", padding:2, display:"flex", alignItems:"center", marginInlineStart:2, opacity: refreshing?.4:1, fontFamily:"inherit"}}>{I.refresh}</button>
            </div>
          </div>

          <div style={{display:"flex", gap:isMobile?14:22, background:"rgba(255,255,255,.05)", border:`1px solid ${TH.deepBorder}`, borderRadius:12, padding:isMobile?"12px 14px":"14px 20px"}}>
            <HeroStat TH={TH} value={d.itemCount}  label={L.itemsTracked || "Items tracked"} />
            <HeroStat TH={TH} value={d.warehouses} label={L.warehousesK} />
            <HeroStat TH={TH} value={money(d.stockValue)} label={L.stockValue || "Stock value"} gold />
          </div>
        </div>

        <div style={{display:"inline-flex", gap:2, marginTop:18, background:"rgba(255,255,255,.06)", border:`1px solid ${TH.deepBorder}`, borderRadius:11, padding:3}}>
          {PERIODS.map(p => {
            const on = p.key === period;
            return (
              <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                background: on ? TH.onDeep : "transparent", border:"none", borderRadius:8,
                color: on ? TH.deep : TH.onDeepMuted, padding:"7px 15px", cursor:"pointer",
                fontSize:12, fontWeight: on?700:500, fontFamily:"inherit", whiteSpace:"nowrap",
              }}>{lang==='fa'?p.fa:lang==='he'?p.he:p.en}</button>
            );
          })}
        </div>
      </div>

      {error && <div style={{background:TH.dangerBg, border:`1px solid ${TH.danger}44`, borderRadius:12, padding:"11px 14px", color:TH.danger, fontSize:13, marginBottom:16}}>{error}</div>}

      {/* ═══ KPI CARDS ═══ */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(4, minmax(0,1fr))", gap:12, marginBottom:16}}>
        <KpiCard TH={TH} icon={I.package} role="info" onClick={() => onNav?.("warehouse")}
          label={L.totalAssets} value={d.totalAssets}
          sub={`${d.byKind.equipment} ${L.equip} · ${d.byKind.tool} ${L.tools} · ${d.byKind.vehicle} ${L.vehicles}`}
          bars={d.days.map(x=>x.count)} barRole="info" />

        <KpiCard TH={TH} icon={I.arrows} role="ok" onClick={() => onNav?.("warehouse")}
          label={`${L.movements || "Movements"} · ${periodLbl}`} value={d.movCount}
          delta={movDelta} deltaLabel={L.vsPrevious || "vs previous"}
          sub={`${d.inCount} ${L.inLbl || "in"} · ${d.outCount} ${L.outLbl || "out"}`}
          bars={d.days.map(x=>x.count)} barRole="ok" />

        <KpiCard TH={TH} icon={I.euro} role="accent" onClick={() => onNav?.("warehouse")}
          label={`${L.spentLbl || "Purchased"} · ${periodLbl}`} value={money(d.spent)}
          sub={d.spent > 0 ? `${d.inCount} ${L.receipts || "receipts"}` : (L.noPurchases || "No purchases")}
          bars={d.days.map(x=>x.inQ)} barRole="accent" />

        <KpiCard TH={TH} icon={I.triangle} role={attention.length ? "danger" : "ok"} onClick={() => onNav?.("inspection")}
          label={L.needsAttention || "Needs attention"} value={attention.length}
          sub={attention.length ? `${d.critical.length} ${L.critical} · ${d.lowItems.length} ${L.low || "low"}` : (L.allClear || "All clear")}
          alert={attention.length > 0} />
      </div>

      {/* ═══ ATTENTION + CHART ═══ */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"minmax(0,1fr) minmax(0,1.35fr)", gap:12, marginBottom:16}}>
        <Panel TH={TH} title={L.needsAttention || "Needs attention"} accentBar count={attention.length}>
          {attention.length === 0 ? <Empty TH={TH}>{L.allClear || "All clear"}</Empty> : (
            <div style={{maxHeight:340, overflowY:"auto"}}>
              {attention.slice(0,30).map(a => {
                const c = rc(TH, a.role);
                return (
                  <div key={a.id} onClick={() => onNav?.(a.nav)} style={{
                    display:"flex", alignItems:"center", gap:11, padding:"11px 14px", margin:"0 12px 8px",
                    background:c.bg, borderInlineStart:`3px solid ${c.fg}`, borderRadius:9, cursor:"pointer",
                  }}>
                    <span style={{color:c.fg, display:"flex"}}>{a.role === 'danger' ? I.alert : I.triangle}</span>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:"flex", alignItems:"center", gap:7, flexWrap:"wrap"}}>
                        <span style={{fontSize:13, fontWeight:600, color:TH.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{a.title}</span>
                        <span style={{fontSize:9, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:c.fg, background:TH.bgCard, border:`1px solid ${c.fg}33`, padding:"2px 6px", borderRadius:4, whiteSpace:"nowrap"}}>{a.tag}</span>
                      </div>
                      <div style={{fontSize:11, color:TH.textMuted, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{a.sub}</div>
                    </div>
                    <span style={{color:TH.textDim, display:"flex", transform:isRTL?"scaleX(-1)":"none"}}>{I.chevron}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel TH={TH} title={`${L.movements || "Movements"} ${L.perDay || "per day"}`}>
          <BarChart TH={TH} days={d.days} max={maxCount} isMobile={isMobile} />
        </Panel>
      </div>

      {/* ═══ FEEDS ═══ */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12}}>
        <Panel TH={TH} title={L.recentInspections} action={L.viewAll} onAction={() => onNav?.("inspection")}>
          {d.recentInspections.length === 0 ? <Empty TH={TH}>{L.noInspYet}</Empty> :
            d.recentInspections.map((i, idx) => {
              const meta = INS_STATUS[i.status] || { label:i.status, role:'neutral' };
              const c = rc(TH, meta.role);
              const cover = i.photos?.[0];
              return (
                <Row key={i.id} TH={TH} last={idx === d.recentInspections.length-1} onClick={() => setModal({type:'inspection', data:i})}>
                  {cover
                    ? <img src={cover} alt="" style={{width:38, height:38, objectFit:"cover", borderRadius:8, flexShrink:0, background:TH.bgInput}} loading="lazy" />
                    : <Swatch TH={TH} accent>{(i.inspection_no||'').slice(-2) || '—'}</Swatch>}
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:13, color:TH.text, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{i.title}</div>
                    <div style={{fontSize:11, color:TH.textDim, marginTop:2}}>{fdt(i.created_at)}</div>
                  </div>
                  <Pill fg={c.fg} bg={c.bg}>{meta.label}</Pill>
                </Row>
              );
            })}
        </Panel>

        <Panel TH={TH} title={L.recentAssets} action={L.viewAll} onAction={() => onNav?.("warehouse")}>
          {d.recentAssets.length === 0 ? <Empty TH={TH}>{L.noAssetsYet}</Empty> :
            d.recentAssets.map((a, idx) => {
              const meta = AST_STATUS[a.status] || { label:a.status, role:'neutral' };
              const c = rc(TH, meta.role);
              return (
                <Row key={a.id} TH={TH} last={idx === d.recentAssets.length-1} onClick={() => setModal({type:'asset', data:a})}>
                  {a.photo_url
                    ? <img src={a.photo_url} alt="" style={{width:38, height:38, objectFit:"cover", borderRadius:8, flexShrink:0, background:TH.bgInput}} loading="lazy" />
                    : <Swatch TH={TH}>{KIND_ABBR[a.kind] || '—'}</Swatch>}
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:13, color:TH.text, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{a.name}</div>
                    <div style={{fontSize:10, color:TH.textDim, marginTop:2, fontFamily:"ui-monospace, monospace", letterSpacing:".02em"}}>{a.asset_no}</div>
                  </div>
                  <Pill fg={c.fg} bg={c.bg}>{meta.label}</Pill>
                </Row>
              );
            })}
        </Panel>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
function HeroStat({ TH, value, label, gold }) {
  return (
    <div style={{textAlign:"center", minWidth:60}}>
      <div style={{fontFamily:SERIF, fontSize:20, fontWeight:500, lineHeight:1.1, color: gold?TH.accent:TH.onDeep, whiteSpace:"nowrap"}}>{value}</div>
      <div style={{fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:TH.onDeepMuted, marginTop:5, whiteSpace:"nowrap"}}>{label}</div>
    </div>
  );
}

function KpiCard({ TH, label, value, sub, delta, deltaLabel, bars, barRole, icon, role, alert, onClick }) {
  const c = role === 'accent' ? { fg:TH.accentText, bg:TH.accentBg } : rc(TH, role);
  const barColor = barRole === 'accent' ? TH.accent : rc(TH, barRole).fg;
  const shown = bars ? bars.slice(-7) : null;
  const max = shown ? Math.max(1, ...shown) : 1;

  return (
    <div onClick={onClick} style={{
      background:TH.bgCard, border:`1px solid ${alert ? TH.danger+'44' : TH.border}`,
      borderRadius:14, padding:"16px 18px 14px", cursor: onClick?"pointer":"default",
      transition:"transform .15s ease, box-shadow .15s ease", boxShadow:TH.cardGlow,
      display:"flex", flexDirection:"column", minHeight:152,
    }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=TH.shadowLg; } }}
    onMouseLeave={e => { if (onClick) { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=TH.cardGlow; } }}>

      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:12}}>
        <div style={{fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:TH.textMuted, lineHeight:1.4, paddingTop:4}}>{label}</div>
        <div style={{width:34, height:34, borderRadius:9, background:c.bg, color:c.fg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>{icon}</div>
      </div>

      <div style={{display:"flex", alignItems:"baseline", gap:9, flexWrap:"wrap", marginBottom:6}}>
        <span style={{fontFamily:SERIF, fontSize:34, fontWeight:500, lineHeight:1, color:TH.textHeading}}>{value}</span>
        {delta != null && delta !== 0 && (
          <span style={{display:"inline-flex", alignItems:"center", gap:3, background: delta>0?TH.okBg:TH.dangerBg, color: delta>0?TH.ok:TH.danger, padding:"3px 7px", borderRadius:5, fontSize:10, fontWeight:700}}>
            <span style={{display:"flex", transform: delta>0?"none":"scaleY(-1)"}}>{I.trendUp}</span>
            {delta>0?'+':''}{delta}%
          </span>
        )}
        {delta != null && delta !== 0 && deltaLabel && <span style={{fontSize:10, color:TH.textDim}}>{deltaLabel}</span>}
      </div>

      <div style={{fontSize:11, color: alert?TH.danger:TH.textMuted, fontWeight: alert?600:400, marginBottom:"auto"}}>{sub}</div>

      {shown && (
        <div style={{display:"flex", alignItems:"flex-end", gap:4, height:26, marginTop:12}}>
          {shown.map((v,i) => {
            const isLast = i === shown.length-1;
            return <div key={i} style={{flex:1, height: Math.max(3, Math.round((v/max)*26)), borderRadius:3, background: isLast ? barColor : barColor+'2E'}} />;
          })}
        </div>
      )}
    </div>
  );
}

function BarChart({ TH, days, max, isMobile }) {
  const step = days.length > 14 ? Math.ceil(days.length/14) : 1;
  const shown = step === 1 ? days : days.filter((_,i) => i % step === 0 || i === days.length-1);
  const peak = Math.max(...shown.map(x => x.count));
  return (
    <div style={{padding:"8px 18px 14px"}}>
      <div style={{position:"relative", height:196, display:"flex", alignItems:"flex-end", gap: isMobile?3:5}}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{position:"absolute", left:0, right:0, bottom: 26 + i*42, borderTop:`1px dashed ${TH.divider}`, pointerEvents:"none"}} />
        ))}
        {shown.map((x,i) => {
          const isLast = i === shown.length-1;
          const isPeak = x.count === peak && peak > 0;
          return (
            <div key={i} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5, position:"relative", zIndex:1}}>
              {(isPeak || isLast) && x.count > 0 && (
                <div style={{fontFamily:SERIF, fontSize:14, fontWeight:500, color:TH.textHeading, lineHeight:1}}>{x.count}</div>
              )}
              <div style={{width:"100%", maxWidth:isMobile?22:38, height: Math.max(2, Math.round((x.count/max)*148)), borderRadius:"5px 5px 2px 2px", background: isLast ? TH.accent : TH.accent+'4D', transition:"height .3s ease"}} />
              <div style={{fontSize:10, color: isLast?TH.text:TH.textDim, fontWeight: isLast?700:400, whiteSpace:"nowrap"}}>{x.dayNum} {x.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Panel({ TH, title, children, action, onAction, accentBar, count }) {
  return (
    <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, overflow:"hidden", boxShadow:TH.cardGlow, display:"flex", flexDirection:"column"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, padding:"14px 18px", borderBottom:`1px solid ${TH.divider}`}}>
        <div style={{display:"flex", alignItems:"center", gap:9, minWidth:0}}>
          {accentBar && <div style={{width:3, height:15, borderRadius:2, background:TH.accent, flexShrink:0}} />}
          <span style={{fontSize:11, fontWeight:700, letterSpacing:".09em", textTransform:"uppercase", color:TH.textHeading, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{title}</span>
        </div>
        {count != null && count > 0 && (
          <span style={{background:TH.bgInput, border:`1px solid ${TH.border}`, color:TH.textMuted, fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:11, flexShrink:0}}>{count}</span>
        )}
        {action && onAction && (
          <button onClick={onAction} style={{background:"transparent", border:"none", color:TH.accentText, cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit", padding:0, whiteSpace:"nowrap", flexShrink:0}}>{action}</button>
        )}
      </div>
      <div style={{flex:1, paddingTop: accentBar?12:0}}>{children}</div>
    </div>
  );
}

function Row({ TH, children, onClick, last }) {
  return (
    <div onClick={onClick} style={{padding:"11px 18px", borderBottom: last?"none":`1px solid ${TH.divider}`, display:"flex", alignItems:"center", gap:11, cursor:"pointer", transition:"background .12s ease"}}
      onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      {children}
    </div>
  );
}
function Swatch({ TH, children, accent }) {
  return (
    <div style={{width:38, height:38, borderRadius:8, flexShrink:0, background: accent?TH.accentBg:TH.bgInput, border:`1px solid ${accent?TH.accentBorder:TH.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, letterSpacing:".03em", color: accent?TH.accentText:TH.textMuted, fontFamily:"ui-monospace, monospace"}}>{children}</div>
  );
}
function Pill({ fg, bg, children }) {
  return <span style={{padding:"3px 9px", borderRadius:5, background:bg, color:fg, fontSize:10, fontWeight:700, whiteSpace:"nowrap", flexShrink:0}}>{children}</span>;
}
function Empty({ TH, children }) {
  return <div style={{padding:"32px 18px", color:TH.textDim, fontSize:12, textAlign:"center"}}>{children}</div>;
}

// ═══════════════════════════════════════════════════════════════════
function InspectionModal({ TH, L, ins, propMap, areaMap, onZoom, onClose, onOpenModule }) {
  const meta = INS_STATUS[ins.status] || { label:ins.status, role:'neutral' };
  const c = rc(TH, meta.role);
  const wh = propMap[ins.property_id];
  const area = ins.area_id ? areaMap[ins.area_id] : null;
  return (
    <div>
      <ModalHeader TH={TH} onClose={onClose} eyebrow={<span style={{color:c.fg}}>{meta.label}</span>} title={ins.title} mono={ins.inspection_no} />
      {ins.photos?.length > 0 && (
        <div style={{display:"grid", gridTemplateColumns: ins.photos.length===1?"1fr":"repeat(2,1fr)", gap:8, marginBottom:16}}>
          {ins.photos.map((url,i) => (
            <img key={i} src={url} alt="" onClick={()=>onZoom(url)} style={{width:"100%", height: ins.photos.length===1?260:150, objectFit:"cover", borderRadius:10, cursor:"pointer", background:TH.bgInput}} />
          ))}
        </div>
      )}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16}}>
        <MInfo TH={TH} label={L.property.replace(" *","")}>{wh?.name || '—'}</MInfo>
        <MInfo TH={TH} label={L.area}>{area?.name || '—'}</MInfo>
        <MInfo TH={TH} label={L.severity}>{['None','Low','Medium','High','Critical'][ins.severity] || '—'}</MInfo>
        <MInfo TH={TH} label={L.inspector}>{ins.inspector_email || '—'}</MInfo>
        <MInfo TH={TH} label={L.reported}>{fdt(ins.created_at)}</MInfo>
        {ins.resolved_at && <MInfo TH={TH} label={L.resolved}>{fdt(ins.resolved_at)}</MInfo>}
      </div>
      {ins.location_note && <MBlock TH={TH} label={L.location}>{ins.location_note}</MBlock>}
      {ins.report && <MBlock TH={TH} label={L.reportBlock} accent>{ins.report}</MBlock>}
      {ins.action_required && <MBlock TH={TH} label={L.actionRequired} gold>{ins.action_required}</MBlock>}
      {ins.resolution_note && <MBlock TH={TH} label={L.resolution} gold>{ins.resolution_note}</MBlock>}
      <ModalFooter TH={TH} onClose={onClose} onOpenModule={onOpenModule} moduleLabel={L.openInspections} closeLabel={L.close} />
    </div>
  );
}

function AssetModal({ TH, L, asset, whMap, onZoom, onClose, onOpenModule }) {
  const meta = AST_STATUS[asset.status] || { label:asset.status, role:'neutral' };
  const c = rc(TH, meta.role);
  const wh = whMap[asset.warehouse_id];
  return (
    <div>
      <ModalHeader TH={TH} onClose={onClose}
        eyebrow={<span><span style={{color:c.fg}}>{meta.label}</span><span style={{color:TH.textDim, margin:"0 6px"}}>·</span><span style={{color:TH.textMuted}}>{KIND_LABEL[asset.kind] || asset.kind}</span></span>}
        title={asset.name} mono={asset.asset_no} />
      {asset.photo_url && (
        <img src={asset.photo_url} alt="" onClick={()=>onZoom(asset.photo_url)} style={{width:"100%", height:240, objectFit:"cover", borderRadius:10, cursor:"pointer", background:TH.bgInput, marginBottom:16}} />
      )}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16}}>
        {asset.brand && <MInfo TH={TH} label={L.brandModel}>{asset.brand} {asset.model || ''}</MInfo>}
        {asset.serial_number && <MInfo TH={TH} label={L.serial}>{asset.serial_number}</MInfo>}
        {asset.plate_number && <MInfo TH={TH} label={L.plate}>{asset.plate_number}</MInfo>}
        <MInfo TH={TH} label={L.warehouse}>{wh?.name || '—'}</MInfo>
        {asset.purchase_price != null && <MInfo TH={TH} label={L.value}>{money(asset.purchase_price, asset.currency)}</MInfo>}
        {asset.purchased_at && <MInfo TH={TH} label={L.purchased}>{fd(asset.purchased_at)}</MInfo>}
        {asset.supplier_name && <MInfo TH={TH} label={L.supplier}>{asset.supplier_name}</MInfo>}
        {asset.warranty_expires_at && <MInfo TH={TH} label={L.warrantyUntil}>{fd(asset.warranty_expires_at)}</MInfo>}
        {asset.last_service_date && <MInfo TH={TH} label={L.lastService}>{fd(asset.last_service_date)}</MInfo>}
        {asset.next_service_date && <MInfo TH={TH} label={L.nextService}>{fd(asset.next_service_date)}</MInfo>}
        <MInfo TH={TH} label={L.reported}>{fdt(asset.created_at)}</MInfo>
      </div>
      {asset.status === 'checked_out' && asset.holder_name && (
        <MBlock TH={TH} label={L.currentlyWith || "Currently with"} gold>
          {asset.holder_name}{asset.holder_phone ? ` · ${asset.holder_phone}` : ''}
          {asset.expected_return_at ? ` · ${L.returnLbl || "Return:"} ${fd(asset.expected_return_at)}` : ''}
        </MBlock>
      )}
      {asset.current_location && <MBlock TH={TH} label={L.location}>{asset.current_location}</MBlock>}
      {asset.notes && <MBlock TH={TH} label={L.notes}>{asset.notes}</MBlock>}
      <ModalFooter TH={TH} onClose={onClose} onOpenModule={onOpenModule} moduleLabel={L.openWarehouse} closeLabel={L.close} />
    </div>
  );
}

function ModalHeader({ TH, eyebrow, title, mono, onClose }) {
  return (
    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:14, marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${TH.divider}`}}>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".11em", marginBottom:6}}>{eyebrow}</div>
        <div style={{fontSize:20, fontWeight:500, color:TH.textHeading, lineHeight:1.25, fontFamily:SERIF}}>{title}</div>
        {mono && <div style={{fontSize:10, color:TH.textDim, fontFamily:"ui-monospace, monospace", marginTop:5, letterSpacing:".03em"}}>{mono}</div>}
      </div>
      <button onClick={onClose} aria-label="Close" style={{background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:9, width:30, height:30, color:TH.textMuted, cursor:"pointer", fontSize:16, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", padding:0, lineHeight:1, fontFamily:"inherit"}}>×</button>
    </div>
  );
}
function ModalFooter({ TH, onClose, onOpenModule, moduleLabel, closeLabel = "Close" }) {
  return (
    <div style={{display:"flex", gap:8, marginTop:18, paddingTop:16, borderTop:`1px solid ${TH.divider}`}}>
      <button onClick={onClose} style={{flex:1, background:"transparent", border:`1px solid ${TH.border}`, borderRadius:10, color:TH.textMuted, padding:"11px", cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"inherit"}}>{closeLabel}</button>
      <button onClick={onOpenModule} style={{flex:1, background:TH.deep, border:`1px solid ${TH.deepBorder}`, borderRadius:10, color:TH.onDeep, padding:"11px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit"}}>{moduleLabel}</button>
    </div>
  );
}
function MInfo({ TH, label, children }) {
  return (
    <div>
      <div style={{fontSize:9, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:".11em", marginBottom:4}}>{label}</div>
      <div style={{fontSize:13, color:TH.text}}>{children}</div>
    </div>
  );
}
function MBlock({ TH, label, children, accent, gold }) {
  return (
    <div style={{padding:"12px 14px", borderRadius:(accent||gold)?0:10, marginBottom:10, background: gold?TH.accentBg:TH.bgInput, border: gold?`1px solid ${TH.accentBorder}`:"none", borderInlineStart:(accent||gold)?`2px solid ${TH.accent}`:undefined}}>
      <div style={{fontSize:9, fontWeight:700, color: gold?TH.accentText:TH.textMuted, textTransform:"uppercase", letterSpacing:".11em", marginBottom:6}}>{label}</div>
      <div style={{fontSize:13, color:TH.text, whiteSpace:"pre-wrap", lineHeight:1.55}}>{children}</div>
    </div>
  );
}
