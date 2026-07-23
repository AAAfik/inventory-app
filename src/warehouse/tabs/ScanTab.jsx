// ═══════════════════════════════════════════════════════════════════
// ScanTab.jsx — dedicated tab for barcode scanning
// Opens scanner immediately (auto-focused input) → looks up asset via
// scan_asset_barcode RPC → shows asset card with actions.
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import { ASSET_KINDS, ASSET_STATUS, fmtMoney } from "../lib/warehouseUtils";
import BarcodeScanner from "../components/BarcodeScanner";
import AssetDetail from "./AssetDetail";

export default function ScanTab({ TH, lang = "en", isMobile, isAdmin, onChanged }) {
  const L = tr(lang);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [found, setFound] = useState(null);
  const [notFoundValue, setNotFoundValue] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [recentScans, setRecentScans] = useState([]); // last few scans this session

  async function handleDetected(code) {
    setScanning(false);
    setBusy(true);
    setError(null);
    setFound(null);
    setNotFoundValue(null);
    try {
      const { data, error: e } = await supabase.rpc('scan_asset_barcode', { p_barcode: code });
      if (e) throw e;
      if (data && data.length > 0) {
        setFound(data[0]);
        setRecentScans(prev => [{ code, name: data[0].name, at: new Date() }, ...prev].slice(0, 5));
        // Also preload warehouses for detail if needed
        if (warehouses.length === 0) {
          const { data: whs } = await supabase.from('warehouses').select('id, code, name').eq('is_active', true);
          setWarehouses(whs || []);
        }
      } else {
        setNotFoundValue(code);
        setRecentScans(prev => [{ code, name: null, at: new Date() }, ...prev].slice(0, 5));
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  if (openId) {
    return <AssetDetail
      TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin}
      assetId={openId}
      warehouses={warehouses}
      onClose={() => { setOpenId(null); onChanged?.(); }}
    />;
  }

  return (
    <div>
      {scanning && (
        <BarcodeScanner
          TH={TH} lang={lang}
          onDetected={handleDetected}
          onClose={() => setScanning(false)}
        />
      )}

      {/* Big scan button */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:24, textAlign:"center", marginBottom:16}}>
        <div style={{fontSize:60, marginBottom:12}}>📷</div>
        <div style={{fontSize:16, fontWeight:800, color:TH.text, marginBottom:6, fontFamily:"'Playfair Display', Georgia, serif"}}>
          {L.scanTabTitle || 'Scan asset barcode'}
        </div>
        <div style={{fontSize:12, color:TH.textMuted, marginBottom:16}}>
          {L.scanTabDesc || 'Scan a barcode, type it, or use a USB scanner to look up an asset.'}
        </div>
        <button
          onClick={() => setScanning(true)}
          style={{
            background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:10,
            color:"#000", padding:"14px 28px", fontSize:15, fontWeight:800, cursor:"pointer",
            fontFamily:"inherit", boxShadow:"0 2px 10px rgba(184,147,90,0.3)",
          }}
        >📷 {L.scanBtn || 'Open scanner'}</button>
      </div>

      {busy && <div style={{padding:16, textAlign:"center", color:TH.textMuted}}>{L.loading || 'Loading…'}</div>}

      {error && (
        <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:10, padding:"12px 14px", color:"#C43D3D", fontSize:13, marginBottom:14}}>
          {error}
        </div>
      )}

      {/* Not found */}
      {notFoundValue && !busy && (
        <div style={{background:"rgba(232,122,44,0.1)", border:"1px solid rgba(232,122,44,0.4)", borderRadius:12, padding:16, marginBottom:14}}>
          <div style={{fontSize:14, fontWeight:800, color:"#E67A2C", marginBottom:6}}>
            ⚠ {L.scanNotFound || 'Not found'}
          </div>
          <div style={{fontSize:12, color:TH.text}}>
            <span style={{fontFamily:"monospace", background:TH.bgInput, padding:"2px 8px", borderRadius:4}}>{notFoundValue}</span>
            {' — '}{L.scanNotFoundMsg || 'no asset with this barcode or asset number.'}
          </div>
        </div>
      )}

      {/* Found asset card */}
      {found && !busy && (
        <div style={{background:TH.bgCard, border:`2px solid ${TH.accent || '#B8935A'}`, borderRadius:14, padding:16, marginBottom:14}}>
          <div style={{fontSize:11, fontWeight:700, color:"#B8935A", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8}}>
            ✓ {L.scanFound || 'Asset found'}
          </div>
          <div style={{display:"flex", gap:12}}>
            {found.photo_url ? (
              <img src={found.photo_url} alt="" style={{width:80, height:80, objectFit:"cover", borderRadius:10, flexShrink:0, background:"#000"}} />
            ) : (
              <div style={{width:80, height:80, borderRadius:10, flexShrink:0, background:TH.bgInput, display:"flex", alignItems:"center", justifyContent:"center", fontSize:34}}>
                {ASSET_KINDS[found.kind]?.icon || '📦'}
              </div>
            )}
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:15, fontWeight:800, color:TH.text}}>{found.name}</div>
              <div style={{fontSize:11, color:TH.textDim, fontFamily:"monospace", marginTop:2}}>{found.asset_no}{found.barcode ? ` · ${found.barcode}` : ''}</div>
              <div style={{marginTop:6, display:"flex", gap:6, flexWrap:"wrap"}}>
                {found.brand && <Tag TH={TH}>{found.brand}{found.model ? ` ${found.model}` : ''}</Tag>}
                {found.plate_number && <Tag TH={TH}>🚗 {found.plate_number}</Tag>}
                <Tag TH={TH} color={ASSET_STATUS[found.status]?.color || '#8f8f8f'}>● {ASSET_STATUS[found.status]?.label || found.status}</Tag>
                {found.condition && <Tag TH={TH}>🔧 {found.condition}</Tag>}
                {found.holder_name && <Tag TH={TH} gold>👤 {found.holder_name}</Tag>}
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpenId(found.id)}
            style={{
              width:"100%", marginTop:12, background:TH.bgInput, border:`1px solid ${TH.border}`,
              borderRadius:9, color:TH.text, padding:"10px 14px", cursor:"pointer",
              fontSize:13, fontWeight:700, fontFamily:"inherit",
            }}
          >{L.scanOpenDetail || 'Open details →'}</button>
        </div>
      )}

      {/* Recent scans this session */}
      {recentScans.length > 0 && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:14}}>
          <div style={{fontSize:11, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8}}>
            {L.scanRecent || 'Recent scans'}
          </div>
          {recentScans.map((s, i) => (
            <div key={i} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: i < recentScans.length - 1 ? `1px solid ${TH.border}` : "none"}}>
              <div>
                <div style={{fontSize:12, fontFamily:"monospace", color:TH.text}}>{s.code}</div>
                <div style={{fontSize:11, color:s.name ? TH.textMuted : "#E67A2C"}}>{s.name || (L.scanNotFound || 'Not found')}</div>
              </div>
              <div style={{fontSize:10, color:TH.textDim}}>{s.at.toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({ TH, children, gold, color }) {
  const c = color || (gold ? "#B8935A" : TH.textMuted);
  const bg = gold ? "rgba(184,147,90,0.12)" : (color ? `${color}22` : TH.bgInput);
  return <span style={{fontSize:10, color:c, background:bg, padding:"3px 8px", borderRadius:5, whiteSpace:"nowrap", fontWeight:700}}>{children}</span>;
}
