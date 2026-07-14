// ═══════════════════════════════════════════════════════════════════
// AssetsTab.jsx — Warehouse 2.0 asset grid: photos, badges, filters
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { ASSET_KINDS, ASSET_STATUS, fmtMoney, serviceStatus } from "../lib/warehouseUtils";
import { tr } from "../../i18n";
import AssetDetail from "./AssetDetail";

export default function AssetsTab({ TH, lang = "en", isMobile, isAdmin, onChanged }) {
  const L = tr(lang);
  const [assets, setAssets] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const [kindFilter, setKindFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [whFilter, setWhFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      const [rA, rW] = await Promise.all([
        supabase.from('assets').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('warehouses').select('id, code, name').eq('is_active', true),
      ]);
      if (rA.error) throw rA.error;
      setAssets(rA.data || []);
      setWarehouses(rW.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  if (selected) {
    return <AssetDetail
      TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin}
      assetId={selected}
      warehouses={warehouses}
      onClose={() => { setSelected(null); loadAll(); onChanged?.(); }}
    />;
  }

  const whMap = Object.fromEntries(warehouses.map(w => [w.id, w]));

  const filt = assets.filter(a => {
    if (kindFilter !== "all" && a.kind !== kindFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (whFilter !== "all" && String(a.warehouse_id) !== whFilter) return false;
    if (serviceFilter && !serviceStatus(a)) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [a.name, a.asset_no, a.brand, a.model, a.serial_number, a.plate_number, a.holder_name].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const kindCounts = { all: assets.length };
  Object.keys(ASSET_KINDS).forEach(k => { kindCounts[k] = assets.filter(a => a.kind === k).length; });

  return (
    <div>
      {/* Kind pills */}
      <div style={{display:"flex", gap:8, marginBottom:12, overflowX:"auto"}}>
        {[["all", { label: L.all, icon: "📦" }], ...Object.entries(ASSET_KINDS).map(([k,v]) => [k, {...v, label: L[k] || v.label}])].map(([k, meta]) => {
          const on = kindFilter === k;
          return (
            <button key={k} onClick={() => setKindFilter(k)} style={{
              background: on ? TH.accentBg : "transparent",
              border: `1px solid ${on ? TH.accentBorder : TH.border}`,
              borderRadius: 20, color: on ? TH.accentText : TH.textMuted,
              padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: on ? 700 : 500,
              fontFamily: "inherit", whiteSpace: "nowrap", display:"flex", alignItems:"center", gap:6,
            }}>
              {meta.icon} {meta.label}
              <span style={{background: on ? "#C9A960" : TH.bgInput, color: on ? "#000" : TH.textMuted, borderRadius:10, padding:"1px 8px", fontSize:11, fontWeight:700}}>{kindCounts[k] || 0}</span>
            </button>
          );
        })}
        <button onClick={() => setServiceFilter(v => !v)} style={{
          background: serviceFilter ? "rgba(139,122,68,0.2)" : "transparent",
          border: `1px solid ${serviceFilter ? "#8B7A44" : TH.border}`,
          borderRadius: 20, color: serviceFilter ? "#C9A960" : TH.textMuted,
          padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: serviceFilter ? 700 : 500,
          fontFamily: "inherit", whiteSpace: "nowrap",
        }}>{L.serviceDueBtn}</button>
      </div>

      {/* Search + filters */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr", gap:8, marginBottom:16}}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L.searchAssets} style={inputStyle(TH)} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle(TH)}>
          <option value="all">{L.allStatuses}</option>
          {Object.entries(ASSET_STATUS).map(([k, v]) => <option key={k} value={k}>{({available:L.available,checked_out:L.checkedOut,in_service:L.inService,damaged:L.damaged,lost:L.lost,retired:L.retired})[k] || v.label}</option>)}
        </select>
        <select value={whFilter} onChange={e => setWhFilter(e.target.value)} style={inputStyle(TH)}>
          <option value="all">{L.allWarehouses}</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {error && <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{error}</div>}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>{L.loading}</div>
      ) : filt.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          {L.noAssetsMatch}
        </div>
      ) : (
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(300px, 1fr))", gap:14}}>
          {filt.map(a => {
            const kindMeta = ASSET_KINDS[a.kind] || {};
            const statusMeta = ASSET_STATUS[a.status] || { label: a.status, color: '#8f8f8f' };
            const wh = whMap[a.warehouse_id];
            const svc = serviceStatus(a);
            return (
              <div key={a.id} onClick={() => setSelected(a.id)} style={{
                background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, cursor:"pointer",
                borderLeft:`3px solid ${statusMeta.color}`, overflow:"hidden",
              }}
              onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = TH.bgCard}>
                <div style={{display:"flex", gap:12, padding:14}}>
                  {a.photo_url ? (
                    <img src={a.photo_url} alt="" style={{width:76, height:76, objectFit:"cover", borderRadius:10, flexShrink:0, background:"#000"}} loading="lazy" />
                  ) : (
                    <div style={{width:76, height:76, borderRadius:10, flexShrink:0, background:TH.bgInput, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30}}>{kindMeta.icon || '📦'}</div>
                  )}
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:"flex", justifyContent:"space-between", gap:8, marginBottom:4}}>
                      <div style={{fontSize:14, fontWeight:700, color:TH.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{a.name}</div>
                      <span style={{fontSize:9, color:statusMeta.color, fontWeight:700, textTransform:"uppercase", whiteSpace:"nowrap", flexShrink:0}}>● {statusMeta.label}</span>
                    </div>
                    <div style={{fontSize:10, color:TH.textDim, fontFamily:"monospace", marginBottom:6}}>{a.asset_no}</div>
                    <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
                      {a.brand && <Chip TH={TH}>{a.brand}{a.model ? ` ${a.model}` : ''}</Chip>}
                      {a.plate_number && <Chip TH={TH}>🚗 {a.plate_number}</Chip>}
                      {wh && <Chip TH={TH}>📍 {wh.code}</Chip>}
                      {a.holder_name && a.status === 'checked_out' && <Chip TH={TH} gold>👤 {a.holder_name}</Chip>}
                      {a.purchase_price != null && <Chip TH={TH}>{fmtMoney(a.purchase_price, a.currency)}</Chip>}
                    </div>
                    {svc && (
                      <div style={{marginTop:6, fontSize:10, fontWeight:700, color:svc.color}}>
                        🔧 {svc.label}
                      </div>
                    )}
                  </div>
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
  return <span style={{fontSize:10, color: gold ? "#C9A960" : TH.textMuted, background: gold ? "rgba(201,169,96,0.12)" : TH.bgInput, padding:"3px 8px", borderRadius:5, whiteSpace:"nowrap"}}>{children}</span>;
}

function inputStyle(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
