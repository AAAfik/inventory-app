// ═══════════════════════════════════════════════════════════════════
// DashboardTab.jsx — Caesar dashboard
// Palette: navy · white · gold. No icons, no emoji.
// KPIs + live feeds + detail modal (click any row for full details)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { tr } from "./i18n";

const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";

// Status → theme role. Colours resolve from TH so both modes work.
const INS_STATUS = {
  ok:            { label: 'OK',       role: 'ok'     },
  minor_issue:   { label: 'Minor',    role: 'warn'   },
  major_issue:   { label: 'Major',    role: 'danger' },
  critical:      { label: 'Critical', role: 'danger' },
  needs_repair:  { label: 'Repair',   role: 'warn'   },
  fixed:         { label: 'Fixed',    role: 'ok'     },
};
const AST_STATUS = {
  available:   { label: 'Available',   role: 'ok'      },
  checked_out: { label: 'Checked out', role: 'warn'    },
  in_service:  { label: 'In service',  role: 'info'    },
  damaged:     { label: 'Damaged',     role: 'danger'  },
  lost:        { label: 'Lost',        role: 'danger'  },
  retired:     { label: 'Retired',     role: 'neutral' },
};
const KIND_LABEL = { equipment: 'Equipment', tool: 'Tool', vehicle: 'Vehicle' };
const KIND_ABBR  = { equipment: 'EQ', tool: 'TL', vehicle: 'VH' };

function roleColors(TH, role) {
  switch (role) {
    case 'ok':     return { fg: TH.ok,        bg: TH.okBg };
    case 'warn':   return { fg: TH.warn,      bg: TH.warnBg };
    case 'danger': return { fg: TH.danger,    bg: TH.dangerBg };
    case 'info':   return { fg: TH.info,      bg: TH.infoBg };
    default:       return { fg: TH.textMuted, bg: TH.bgInput };
  }
}

function fdt(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}
function fd(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'2-digit' });
}
function money(n, cur='EUR') {
  if (n == null || n === '') return '—';
  const sym = cur === 'EUR' ? '€' : cur === 'USD' ? '$' : cur === 'TRY' ? '₺' : cur+' ';
  return sym + Number(n).toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

export default function DashboardTab({ TH, lang = "en", isMobile, isAdmin, onNav }) {
  const L = tr(lang);
  const [stats, setStats] = useState(null);
  const [recentInspections, setRecentInspections] = useState([]);
  const [recentAssets, setRecentAssets] = useState([]);
  const [properties, setProperties] = useState([]);
  const [areas, setAreas] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modal, setModal] = useState(null);
  const [photoZoom, setPhotoZoom] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rAssets, rWh, rIns, rReqs, rInsRecent, rAstRecent, rProps, rAreas] = await Promise.all([
        supabase.from('assets').select('id, kind', { count: 'exact' }).eq('is_active', true),
        supabase.from('warehouses').select('id, code, name').eq('is_active', true),
        supabase.from('inspections').select('id, status, severity').in('status', ['minor_issue','major_issue','critical','needs_repair']),
        supabase.schema('procure').from('requisitions').select('id', { count: 'exact' }).in('status', ['submitted','dept_approved','in_procurement','pending_approval']),
        supabase.from('inspections').select('*').order('created_at', { ascending: false }).limit(6),
        supabase.from('assets').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(6),
        supabase.from('wh_properties').select('id, code, name'),
        supabase.from('inspection_areas').select('id, name'),
      ]);

      const assetsByKind = { equipment: 0, tool: 0, vehicle: 0 };
      (rAssets.data || []).forEach(a => { if (assetsByKind[a.kind] !== undefined) assetsByKind[a.kind]++; });

      const openIssues = (rIns.data || []).length;
      const criticalCount = (rIns.data || []).filter(i => i.status === 'critical' || i.severity >= 3).length;

      setStats({
        totalAssets: rAssets.data?.length || 0,
        assetsByKind,
        warehouses: rWh.data?.length || 0,
        openIssues,
        criticalCount,
        pendingRequisitions: rReqs.data?.length || 0,
      });
      setRecentInspections(rInsRecent.data || []);
      setRecentAssets(rAstRecent.data || []);
      setProperties(rProps.data || []);
      setAreas(rAreas.data || []);
      setWarehouses(rWh.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{padding:48, textAlign:"center", color:TH.textMuted, fontSize:13}}>{L.loading || "Loading…"}</div>;

  const s = stats || { totalAssets: 0, assetsByKind: {equipment:0,tool:0,vehicle:0}, warehouses: 0, openIssues: 0, criticalCount: 0, pendingRequisitions: 0 };
  const propMap = Object.fromEntries(properties.map(p => [p.id, p]));
  const areaMap = Object.fromEntries(areas.map(a => [a.id, a]));
  const whMap = Object.fromEntries(warehouses.map(w => [w.id, w]));

  return (
    <div>
      {/* ═══ Photo zoom ═══ */}
      {photoZoom && (
        <div onClick={() => setPhotoZoom(null)} style={{position:"fixed", inset:0, background:"rgba(8,12,22,0.96)", zIndex:10001, display:"flex", alignItems:"center", justifyContent:"center", padding:16, cursor:"pointer"}}>
          <img src={photoZoom} alt="" style={{maxWidth:"100%", maxHeight:"100%", objectFit:"contain", borderRadius:8}} />
        </div>
      )}

      {/* ═══ Detail modal ═══ */}
      {modal && (
        <div onClick={() => setModal(null)} style={{position:"fixed", inset:0, background:"rgba(8,12,22,0.62)", backdropFilter:"blur(3px)", zIndex:10000, display:"flex", alignItems:isMobile?"flex-end":"center", justifyContent:"center", padding:isMobile?0:24}}>
          <div onClick={e => e.stopPropagation()} style={{
            background:TH.bgCard, border:`1px solid ${TH.border}`,
            borderRadius:isMobile?"16px 16px 0 0":14,
            width:"100%", maxWidth:660, maxHeight:isMobile?"92vh":"88vh", overflowY:"auto",
            padding:24, boxSizing:"border-box", boxShadow:TH.shadowLg,
          }}>
            {modal.type === 'inspection' ? (
              <InspectionModal TH={TH} L={L} isMobile={isMobile} ins={modal.data} propMap={propMap} areaMap={areaMap}
                onZoom={setPhotoZoom} onClose={() => setModal(null)} onOpenModule={() => { setModal(null); onNav?.('inspection'); }} />
            ) : (
              <AssetModal TH={TH} L={L} isMobile={isMobile} asset={modal.data} whMap={whMap}
                onZoom={setPhotoZoom} onClose={() => setModal(null)} onOpenModule={() => { setModal(null); onNav?.('warehouse'); }} />
            )}
          </div>
        </div>
      )}

      {/* ═══ Page header ═══ */}
      <div style={{marginBottom:22}}>
        <div style={{fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", color:TH.accent, fontWeight:600, marginBottom:6}}>
          Caesar Projects
        </div>
        <div style={{fontSize:isMobile?22:28, fontWeight:500, color:TH.textHeading, letterSpacing:"-0.01em", fontFamily:SERIF, lineHeight:1.1}}>
          {L.dashboard}
        </div>
        <div style={{fontSize:13, color:TH.textMuted, marginTop:5, maxWidth:560}}>{L.dashSub}</div>
      </div>

      {error && (
        <div style={{background:TH.dangerBg, border:`1px solid ${TH.danger}44`, borderRadius:10, padding:"11px 14px", color:TH.danger, fontSize:13, marginBottom:16}}>{error}</div>
      )}

      {/* ═══ KPI grid ═══ */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, 1fr)", gap:12, marginBottom:20}}>
        <KPI TH={TH} deep onClick={() => onNav?.("warehouse")}
          label={L.totalAssets} value={s.totalAssets}
          sub={`${s.assetsByKind.equipment} ${L.equip} · ${s.assetsByKind.tool} ${L.tools} · ${s.assetsByKind.vehicle} ${L.vehicles}`} />
        <KPI TH={TH} onClick={() => onNav?.("warehouse")}
          label={L.warehousesK} value={s.warehouses} sub={L.acrossProps} />
        <KPI TH={TH} onClick={() => onNav?.("inspection")}
          label={L.openIssues} value={s.openIssues}
          sub={s.criticalCount > 0 ? `${s.criticalCount} ${L.critical}` : L.underReview}
          alert={s.criticalCount > 0} />
        <KPI TH={TH} onClick={() => onNav?.("procure")}
          label={L.pendingReqs} value={s.pendingRequisitions}
          sub={s.pendingRequisitions > 0 ? L.awaitingApproval : L.queueClear} />
      </div>

      {/* ═══ Feeds ═══ */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12}}>

        <FeedCard TH={TH} title={L.recentInspections} viewAllLabel={L.viewAll} onNavAll={() => onNav?.("inspection")}>
          {recentInspections.length === 0 ? (
            <Empty TH={TH}>{L.noInspYet}</Empty>
          ) : recentInspections.map((i, idx) => {
            const meta = INS_STATUS[i.status] || { label: i.status, role: 'neutral' };
            const c = roleColors(TH, meta.role);
            const cover = i.photos?.[0];
            return (
              <FeedRow key={i.id} TH={TH} last={idx === recentInspections.length - 1}
                onClick={() => setModal({ type: 'inspection', data: i })}>
                {cover ? (
                  <img src={cover} alt="" style={{width:38, height:38, objectFit:"cover", borderRadius:7, flexShrink:0, background:TH.bgInput}} loading="lazy" />
                ) : (
                  <Swatch TH={TH} accent>{(i.inspection_no || '').slice(-2) || '—'}</Swatch>
                )}
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, color:TH.text, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{i.title}</div>
                  <div style={{fontSize:11, color:TH.textDim, marginTop:2}}>{fdt(i.created_at)}</div>
                </div>
                <Pill fg={c.fg} bg={c.bg}>{meta.label}</Pill>
              </FeedRow>
            );
          })}
        </FeedCard>

        <FeedCard TH={TH} title={L.recentAssets} viewAllLabel={L.viewAll} onNavAll={() => onNav?.("warehouse")}>
          {recentAssets.length === 0 ? (
            <Empty TH={TH}>{L.noAssetsYet}</Empty>
          ) : recentAssets.map((a, idx) => {
            const meta = AST_STATUS[a.status] || { label: a.status, role: 'neutral' };
            const c = roleColors(TH, meta.role);
            return (
              <FeedRow key={a.id} TH={TH} last={idx === recentAssets.length - 1}
                onClick={() => setModal({ type: 'asset', data: a })}>
                {a.photo_url ? (
                  <img src={a.photo_url} alt="" style={{width:38, height:38, objectFit:"cover", borderRadius:7, flexShrink:0, background:TH.bgInput}} loading="lazy" />
                ) : (
                  <Swatch TH={TH}>{KIND_ABBR[a.kind] || '—'}</Swatch>
                )}
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, color:TH.text, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{a.name}</div>
                  <div style={{fontSize:10, color:TH.textDim, marginTop:2, fontFamily:"ui-monospace, monospace", letterSpacing:"0.02em"}}>{a.asset_no}</div>
                </div>
                <Pill fg={c.fg} bg={c.bg}>{meta.label}</Pill>
              </FeedRow>
            );
          })}
        </FeedCard>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// KPI + feed shells
// ═══════════════════════════════════════════════════════════════════
function KPI({ TH, label, value, sub, deep, alert, onClick }) {
  const isDeep = !!deep;
  return (
    <div onClick={onClick} style={{
      position:"relative", overflow:"hidden",
      background: isDeep ? TH.deep : TH.bgCard,
      border: `1px solid ${isDeep ? TH.deepBorder : (alert ? TH.danger + "44" : TH.border)}`,
      borderRadius: 12, padding: "16px 18px",
      cursor: onClick ? "pointer" : "default",
      transition: "transform .15s ease, box-shadow .15s ease",
      boxShadow: isDeep ? TH.shadow : TH.cardGlow,
    }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = TH.shadowLg; } }}
    onMouseLeave={e => { if (onClick) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = isDeep ? TH.shadow : TH.cardGlow; } }}>

      {isDeep && <div style={{position:"absolute", top:0, left:0, right:0, height:2, background:TH.accent}} />}
      {alert && <div style={{position:"absolute", top:15, right:16, width:6, height:6, borderRadius:"50%", background:TH.danger}} />}

      <div style={{
        fontSize:10, fontWeight:600, letterSpacing:"0.11em", textTransform:"uppercase",
        color: isDeep ? TH.onDeepMuted : TH.textMuted, marginBottom:9,
      }}>{label}</div>

      <div style={{
        fontSize:34, fontWeight:500, lineHeight:1, fontFamily:SERIF,
        color: isDeep ? TH.onDeep : TH.textHeading,
      }}>{value}</div>

      <div style={{
        fontSize:11, marginTop:7,
        color: isDeep ? TH.onDeepMuted : (alert ? TH.danger : TH.textMuted),
        fontWeight: alert ? 600 : 400,
      }}>{sub}</div>
    </div>
  );
}

function FeedCard({ TH, title, children, onNavAll, viewAllLabel = "View all" }) {
  return (
    <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, overflow:"hidden", boxShadow:TH.cardGlow}}>
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"14px 18px", borderBottom:`1px solid ${TH.divider}`,
      }}>
        <div style={{fontSize:13, fontWeight:600, color:TH.textHeading, letterSpacing:"-0.005em"}}>{title}</div>
        {onNavAll && (
          <button onClick={onNavAll} style={{
            background:"transparent", border:"none", color:TH.accentText,
            cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:"inherit", padding:0,
          }}>{viewAllLabel}</button>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function FeedRow({ TH, children, onClick, last }) {
  return (
    <div onClick={onClick} style={{
      padding:"11px 18px",
      borderBottom: last ? "none" : `1px solid ${TH.divider}`,
      display:"flex", alignItems:"center", gap:11, cursor:"pointer",
      transition:"background .12s ease",
    }}
    onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      {children}
    </div>
  );
}

function Swatch({ TH, children, accent }) {
  return (
    <div style={{
      width:38, height:38, borderRadius:7, flexShrink:0,
      background: accent ? TH.accentBg : TH.bgInput,
      border:`1px solid ${accent ? TH.accentBorder : TH.border}`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:11, fontWeight:600, letterSpacing:"0.03em",
      color: accent ? TH.accentText : TH.textMuted,
      fontFamily:"ui-monospace, monospace",
    }}>{children}</div>
  );
}

function Pill({ fg, bg, children }) {
  return (
    <span style={{
      padding:"3px 9px", borderRadius:4, background:bg, color:fg,
      fontSize:10, fontWeight:600, whiteSpace:"nowrap", flexShrink:0,
      letterSpacing:"0.01em",
    }}>{children}</span>
  );
}

function Empty({ TH, children }) {
  return <div style={{padding:"28px 18px", color:TH.textDim, fontSize:12, textAlign:"center"}}>{children}</div>;
}

// ═══════════════════════════════════════════════════════════════════
// Inspection detail modal
// ═══════════════════════════════════════════════════════════════════
function InspectionModal({ TH, L, isMobile, ins, propMap, areaMap, onZoom, onClose, onOpenModule }) {
  const meta = INS_STATUS[ins.status] || { label: ins.status, role: 'neutral' };
  const c = roleColors(TH, meta.role);
  const wh = propMap[ins.property_id];
  const area = ins.area_id ? areaMap[ins.area_id] : null;
  return (
    <div>
      <ModalHeader TH={TH} onClose={onClose}
        eyebrow={<span style={{color:c.fg}}>{meta.label}</span>}
        title={ins.title} mono={ins.inspection_no} />

      {ins.photos?.length > 0 && (
        <div style={{display:"grid", gridTemplateColumns: ins.photos.length === 1 ? "1fr" : "repeat(2, 1fr)", gap:8, marginBottom:16}}>
          {ins.photos.map((url, i) => (
            <img key={i} src={url} alt="" onClick={() => onZoom(url)}
              style={{width:"100%", height: ins.photos.length === 1 ? 260 : 150, objectFit:"cover", borderRadius:10, cursor:"pointer", background:TH.bgInput}} />
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

// ═══════════════════════════════════════════════════════════════════
// Asset detail modal
// ═══════════════════════════════════════════════════════════════════
function AssetModal({ TH, L, isMobile, asset, whMap, onZoom, onClose, onOpenModule }) {
  const meta = AST_STATUS[asset.status] || { label: asset.status, role: 'neutral' };
  const c = roleColors(TH, meta.role);
  const wh = whMap[asset.warehouse_id];
  return (
    <div>
      <ModalHeader TH={TH} onClose={onClose}
        eyebrow={<span><span style={{color:c.fg}}>{meta.label}</span><span style={{color:TH.textDim, margin:"0 6px"}}>·</span><span style={{color:TH.textMuted}}>{KIND_LABEL[asset.kind] || asset.kind}</span></span>}
        title={asset.name} mono={asset.asset_no} />

      {asset.photo_url && (
        <img src={asset.photo_url} alt="" onClick={() => onZoom(asset.photo_url)}
          style={{width:"100%", height:240, objectFit:"cover", borderRadius:10, cursor:"pointer", background:TH.bgInput, marginBottom:16}} />
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

// ═══════════════════════════════════════════════════════════════════
// Shared modal pieces
// ═══════════════════════════════════════════════════════════════════
function ModalHeader({ TH, eyebrow, title, mono, onClose }) {
  return (
    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:14, marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${TH.divider}`}}>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.11em", marginBottom:6}}>{eyebrow}</div>
        <div style={{fontSize:20, fontWeight:500, color:TH.textHeading, lineHeight:1.25, fontFamily:SERIF}}>{title}</div>
        {mono && <div style={{fontSize:10, color:TH.textDim, fontFamily:"ui-monospace, monospace", marginTop:5, letterSpacing:"0.03em"}}>{mono}</div>}
      </div>
      <button onClick={onClose} aria-label={TH.close || "Close"} style={{
        background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8,
        width:30, height:30, color:TH.textMuted, cursor:"pointer", fontSize:16,
        flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
        padding:0, lineHeight:1, fontFamily:"inherit",
      }}>×</button>
    </div>
  );
}

function ModalFooter({ TH, onClose, onOpenModule, moduleLabel, closeLabel = "Close" }) {
  return (
    <div style={{display:"flex", gap:8, marginTop:18, paddingTop:16, borderTop:`1px solid ${TH.divider}`}}>
      <button onClick={onClose} style={{
        flex:1, background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9,
        color:TH.textMuted, padding:"11px", cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"inherit",
      }}>{closeLabel}</button>
      <button onClick={onOpenModule} style={{
        flex:1, background:TH.deep, border:`1px solid ${TH.deepBorder}`, borderRadius:9,
        color:TH.onDeep, padding:"11px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit",
      }}>{moduleLabel}</button>
    </div>
  );
}

function MInfo({ TH, label, children }) {
  return (
    <div>
      <div style={{fontSize:9, fontWeight:600, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.11em", marginBottom:4}}>{label}</div>
      <div style={{fontSize:13, color:TH.text}}>{children}</div>
    </div>
  );
}

function MBlock({ TH, label, children, accent, gold }) {
  return (
    <div style={{
      padding:"12px 14px", borderRadius: (accent || gold) ? 0 : 10, marginBottom:10,
      background: gold ? TH.accentBg : TH.bgInput,
      border: gold ? `1px solid ${TH.accentBorder}` : "none",
      borderLeft: accent ? `2px solid ${TH.accent}` : (gold ? `2px solid ${TH.accent}` : undefined),
    }}>
      <div style={{fontSize:9, fontWeight:600, color: gold ? TH.accentText : TH.textMuted, textTransform:"uppercase", letterSpacing:"0.11em", marginBottom:6}}>{label}</div>
      <div style={{fontSize:13, color:TH.text, whiteSpace:"pre-wrap", lineHeight:1.55}}>{children}</div>
    </div>
  );
}
