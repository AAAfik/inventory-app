// ═══════════════════════════════════════════════════════════════════
// DashboardTab.jsx — Caesar dashboard: KPIs + live feeds + detail modal
// Click any feed item → full details with photos
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { tr } from "./i18n";

const INS_STATUS = {
  ok:            { label: 'OK',       color: '#B8935A' },
  minor_issue:   { label: 'Minor',    color: '#D4A853' },
  major_issue:   { label: 'Major',    color: '#8B7040' },
  critical:      { label: 'Critical', color: '#8f8f8f' },
  needs_repair:  { label: 'Repair',   color: '#8B7040' },
  fixed:         { label: 'Fixed',    color: '#B8935A' },
};
const AST_STATUS = {
  available:   { label: 'Available',   color: '#B8935A' },
  checked_out: { label: 'Checked out', color: '#8B7040' },
  in_service:  { label: 'In service',  color: '#8f8f8f' },
  damaged:     { label: 'Damaged',     color: '#8f8f8f' },
  lost:        { label: 'Lost',        color: '#8f8f8f' },
  retired:     { label: 'Retired',     color: '#5c5c5c' },
};
const KIND_ICON = { equipment: '🏭', tool: '🔧', vehicle: '🚗' };

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

  // Detail modal state
  const [modal, setModal] = useState(null); // { type: 'inspection'|'asset', data }
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

  if (loading) return <div style={{padding:40, textAlign:"center", color:TH.textMuted}}>Loading dashboard...</div>;

  const s = stats || { totalAssets: 0, assetsByKind: {equipment:0,tool:0,vehicle:0}, warehouses: 0, openIssues: 0, criticalCount: 0, pendingRequisitions: 0 };
  const propMap = Object.fromEntries(properties.map(p => [p.id, p]));
  const areaMap = Object.fromEntries(areas.map(a => [a.id, a]));
  const whMap = Object.fromEntries(warehouses.map(w => [w.id, w]));

  return (
    <div>
      {/* ═══ Photo zoom (top layer) ═══ */}
      {photoZoom && (
        <div onClick={() => setPhotoZoom(null)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.96)", zIndex:10001, display:"flex", alignItems:"center", justifyContent:"center", padding:16, cursor:"pointer"}}>
          <img src={photoZoom} alt="" style={{maxWidth:"100%", maxHeight:"100%", objectFit:"contain"}} />
        </div>
      )}

      {/* ═══ Detail modal ═══ */}
      {modal && (
        <div onClick={() => setModal(null)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:10000, display:"flex", alignItems:isMobile?"flex-end":"center", justifyContent:"center", padding:isMobile?0:20}}>
          <div onClick={e => e.stopPropagation()} style={{
            background:TH.bgCard, border:`1px solid ${TH.border}`,
            borderRadius:isMobile?"16px 16px 0 0":16,
            width:"100%", maxWidth:640, maxHeight:isMobile?"92vh":"88vh", overflowY:"auto",
            padding:20, boxSizing:"border-box",
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

      <div style={{marginBottom:20}}>
        <div style={{fontSize:isMobile?20:26, fontWeight:700, color:TH.text, letterSpacing:"-0.3px", fontFamily:"'Playfair Display', Georgia, serif"}}>{L.dashboard}</div>
        <div style={{fontSize:13, color:TH.textMuted, marginTop:2}}>
          {L.dashSub}
        </div>
      </div>

      {error && <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{error}</div>}

      {/* KPI grid */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, 1fr)", gap:14, marginBottom:24}}>
        <KPI TH={TH} onClick={() => onNav?.("warehouse")}
          label={L.totalAssets} value={s.totalAssets}
          sub={`${s.assetsByKind.equipment} ${L.equip} · ${s.assetsByKind.tool} ${L.tools} · ${s.assetsByKind.vehicle} ${L.vehicles}`} gradient />
        <KPI TH={TH} onClick={() => onNav?.("warehouse")}
          label={L.warehousesK} value={s.warehouses} sub={L.acrossProps} />
        <KPI TH={TH} onClick={() => onNav?.("inspection")}
          label={L.openIssues} value={s.openIssues}
          sub={s.criticalCount > 0 ? `${s.criticalCount} ${L.critical}` : L.underReview} highlight={s.criticalCount > 0} />
        <KPI TH={TH} onClick={() => onNav?.("procure")}
          label={L.pendingReqs} value={s.pendingRequisitions}
          sub={s.pendingRequisitions > 0 ? L.awaitingApproval : L.queueClear} />
      </div>

      {/* Feeds */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:14}}>
        <FeedCard TH={TH} title={L.recentInspections} viewAllLabel={L.viewAll} onNavAll={() => onNav?.("inspection")}>
          {recentInspections.length === 0 ? (
            <div style={{padding:20, color:TH.textDim, fontSize:13, textAlign:"center"}}>{L.noInspYet}</div>
          ) : recentInspections.map(i => {
            const meta = INS_STATUS[i.status] || { label: i.status, color: TH.textMuted };
            const cover = i.photos?.[0];
            return (
              <div key={i.id} onClick={() => setModal({ type: 'inspection', data: i })} style={feedRow(TH)}
                onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {cover ? (
                  <img src={cover} alt="" style={{width:44, height:44, objectFit:"cover", borderRadius:8, flexShrink:0, background:"#000"}} loading="lazy" />
                ) : (
                  <div style={{width:44, height:44, borderRadius:8, flexShrink:0, background:TH.bgInput, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18}}>🔍</div>
                )}
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, color:TH.text, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{i.title}</div>
                  <div style={{fontSize:11, color:TH.textDim, marginTop:2}}>{fdt(i.created_at)}</div>
                </div>
                <span style={{padding:"3px 8px", borderRadius:5, background:meta.color+"22", color:meta.color, fontSize:10, fontWeight:700, whiteSpace:"nowrap", flexShrink:0}}>{meta.label}</span>
              </div>
            );
          })}
        </FeedCard>

        <FeedCard TH={TH} title={L.recentAssets} viewAllLabel={L.viewAll} onNavAll={() => onNav?.("warehouse")}>
          {recentAssets.length === 0 ? (
            <div style={{padding:20, color:TH.textDim, fontSize:13, textAlign:"center"}}>{L.noAssetsYet}</div>
          ) : recentAssets.map(a => {
            const meta = AST_STATUS[a.status] || { label: a.status, color: TH.textMuted };
            return (
              <div key={a.id} onClick={() => setModal({ type: 'asset', data: a })} style={feedRow(TH)}
                onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {a.photo_url ? (
                  <img src={a.photo_url} alt="" style={{width:44, height:44, objectFit:"cover", borderRadius:8, flexShrink:0, background:"#000"}} loading="lazy" />
                ) : (
                  <div style={{width:44, height:44, borderRadius:8, flexShrink:0, background:TH.bgInput, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18}}>{KIND_ICON[a.kind] || '📦'}</div>
                )}
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, color:TH.text, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{a.name}</div>
                  <div style={{fontSize:10, color:TH.textDim, marginTop:2, fontFamily:"monospace"}}>{a.asset_no}</div>
                </div>
                <span style={{padding:"3px 8px", borderRadius:5, background:meta.color+"22", color:meta.color, fontSize:10, fontWeight:700, whiteSpace:"nowrap", flexShrink:0}}>{meta.label}</span>
              </div>
            );
          })}
        </FeedCard>
      </div>
    </div>
  );
}

// ═══ Inspection detail modal ═══
function InspectionModal({ TH, L, isMobile, ins, propMap, areaMap, onZoom, onClose, onOpenModule }) {
  const meta = INS_STATUS[ins.status] || { label: ins.status, color: '#8f8f8f' };
  const wh = propMap[ins.property_id];
  const area = ins.area_id ? areaMap[ins.area_id] : null;
  return (
    <div>
      <ModalHeader TH={TH} onClose={onClose}
        eyebrow={<span style={{color:meta.color}}>● {meta.label}</span>}
        title={ins.title} mono={ins.inspection_no} />

      {/* Photos gallery */}
      {ins.photos?.length > 0 && (
        <div style={{display:"grid", gridTemplateColumns: ins.photos.length === 1 ? "1fr" : "repeat(2, 1fr)", gap:8, marginBottom:14}}>
          {ins.photos.map((url, i) => (
            <img key={i} src={url} alt="" onClick={() => onZoom(url)}
              style={{width:"100%", height: ins.photos.length === 1 ? 260 : 150, objectFit:"cover", borderRadius:10, cursor:"pointer", background:"#000"}} />
          ))}
        </div>
      )}

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14}}>
        <MInfo TH={TH} label={L.property.replace(" *","")}>{wh?.name || '—'}</MInfo>
        <MInfo TH={TH} label={L.area}>{area?.name || '—'}</MInfo>
        <MInfo TH={TH} label={L.severity}>{['None','Low','Medium','High','Critical'][ins.severity] || '—'}</MInfo>
        <MInfo TH={TH} label={L.inspector}>{ins.inspector_email || '—'}</MInfo>
        <MInfo TH={TH} label={L.reported}>{fdt(ins.created_at)}</MInfo>
        {ins.resolved_at && <MInfo TH={TH} label={L.resolved}>{fdt(ins.resolved_at)}</MInfo>}
      </div>

      {ins.location_note && <MBlock TH={TH} label={L.location}>{ins.location_note}</MBlock>}
      {ins.report && <MBlock TH={TH} label={L.reportBlock} accent>{ins.report}</MBlock>}
      {ins.action_required && <MBlock TH={TH} label={"⚡ "+L.actionRequired} gold>{ins.action_required}</MBlock>}
      {ins.resolution_note && <MBlock TH={TH} label={L.resolution} gold>{ins.resolution_note}</MBlock>}

      <ModalFooter TH={TH} onClose={onClose} onOpenModule={onOpenModule} moduleLabel={L.openInspections} closeLabel={L.close} />
    </div>
  );
}

// ═══ Asset detail modal ═══
function AssetModal({ TH, L, isMobile, asset, whMap, onZoom, onClose, onOpenModule }) {
  const meta = AST_STATUS[asset.status] || { label: asset.status, color: '#8f8f8f' };
  const wh = whMap[asset.warehouse_id];
  return (
    <div>
      <ModalHeader TH={TH} onClose={onClose}
        eyebrow={<span style={{color:meta.color}}>● {meta.label} · {KIND_ICON[asset.kind] || '📦'} {asset.kind}</span>}
        title={asset.name} mono={asset.asset_no} />

      {asset.photo_url && (
        <img src={asset.photo_url} alt="" onClick={() => onZoom(asset.photo_url)}
          style={{width:"100%", height:240, objectFit:"cover", borderRadius:10, cursor:"pointer", background:"#000", marginBottom:14}} />
      )}

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14}}>
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
        <MBlock TH={TH} label="👤 Currently with" gold>
          {asset.holder_name}{asset.holder_phone ? ` · 📞 ${asset.holder_phone}` : ''}
          {asset.expected_return_at ? ` · Return: ${fd(asset.expected_return_at)}` : ''}
        </MBlock>
      )}
      {asset.current_location && <MBlock TH={TH} label={L.location}>{asset.current_location}</MBlock>}
      {asset.notes && <MBlock TH={TH} label={L.notes}>{asset.notes}</MBlock>}

      <ModalFooter TH={TH} onClose={onClose} onOpenModule={onOpenModule} moduleLabel={L.openWarehouse} closeLabel={L.close} />
    </div>
  );
}

// ═══ Shared modal pieces ═══
function ModalHeader({ TH, eyebrow, title, mono, onClose }) {
  return (
    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:14}}>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4}}>{eyebrow}</div>
        <div style={{fontSize:19, fontWeight:800, color:TH.text, lineHeight:1.25}}>{title}</div>
        {mono && <div style={{fontSize:10, color:TH.textDim, fontFamily:"monospace", marginTop:3}}>{mono}</div>}
      </div>
      <button onClick={onClose} style={{background:TH.bgInput, border:"none", borderRadius:16, width:32, height:32, color:TH.textMuted, cursor:"pointer", fontSize:15, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", padding:0}}>✕</button>
    </div>
  );
}
function ModalFooter({ TH, onClose, onOpenModule, moduleLabel, closeLabel = "Close" }) {
  return (
    <div style={{display:"flex", gap:8, marginTop:16}}>
      <button onClick={onClose} style={{flex:1, background:"transparent", border:`1px solid ${TH.border}`, borderRadius:10, color:TH.textMuted, padding:"12px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>{closeLabel}</button>
      <button onClick={onOpenModule} style={{flex:1, background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:10, color:"#000", padding:"12px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit"}}>{moduleLabel}</button>
    </div>
  );
}
function MInfo({ TH, label, children }) {
  return (
    <div>
      <div style={{fontSize:9, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:2}}>{label}</div>
      <div style={{fontSize:13, color:TH.text}}>{children}</div>
    </div>
  );
}
function MBlock({ TH, label, children, accent, gold }) {
  return (
    <div style={{
      padding:12, borderRadius:10, marginBottom:10,
      background: gold ? "rgba(184,147,90,0.08)" : TH.bgInput,
      border: gold ? "1px solid rgba(184,147,90,0.3)" : "none",
      borderLeft: accent ? `3px solid #B8935A` : undefined,
    }}>
      <div style={{fontSize:10, fontWeight:700, color: gold ? "#B8935A" : TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:5}}>{label}</div>
      <div style={{fontSize:13, color:TH.text, whiteSpace:"pre-wrap", lineHeight:1.5}}>{children}</div>
    </div>
  );
}

// ═══ KPI + feed shells ═══
function KPI({ TH, label, value, sub, gradient, highlight, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: gradient ? "linear-gradient(135deg, rgba(184,147,90,0.15), rgba(139,112,64,0.08))"
                            : highlight ? "linear-gradient(135deg, rgba(143,143,143,0.10), rgba(92,92,92,0.05))"
                                        : TH.bgCard,
      border:`1px solid ${highlight ? "rgba(143,143,143,0.3)" : gradient ? "rgba(184,147,90,0.3)" : TH.border}`,
      borderRadius:14, padding:18, cursor: onClick ? "pointer" : "default", transition:"transform 0.15s, box-shadow 0.15s", boxShadow: TH.cardGlow || "0 4px 20px rgba(0,0,0,0.08)",
    }}
    onMouseEnter={e => onClick && (e.currentTarget.style.transform = "translateY(-2px)")}
    onMouseLeave={e => onClick && (e.currentTarget.style.transform = "translateY(0)")}>
      <div style={{fontSize:10, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8}}>{label}</div>
      <div style={{fontSize:32, fontWeight:800, color:TH.text, lineHeight:1, marginBottom:6}}>{value}</div>
      <div style={{fontSize:11, color:TH.textMuted}}>{sub}</div>
    </div>
  );
}
function FeedCard({ TH, title, children, onNavAll, viewAllLabel = "View all →" }) {
  return (
    <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:18, boxShadow: TH.cardGlow || "0 4px 20px rgba(0,0,0,0.06)"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
        <div style={{fontSize:14, fontWeight:700, color:TH.text}}>{title}</div>
        {onNavAll && <button onClick={onNavAll} style={{background:"transparent", border:"none", color:TH.accent, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit"}}>{viewAllLabel}</button>}
      </div>
      <div>{children}</div>
    </div>
  );
}
function feedRow(TH) {
  return {
    padding:"9px 8px", margin:"0 -8px", borderRadius:10,
    display:"flex", alignItems:"center", gap:10, cursor:"pointer",
    borderBottom:`1px solid ${TH.border}`,
  };
}
