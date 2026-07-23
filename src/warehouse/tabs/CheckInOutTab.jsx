// ═══════════════════════════════════════════════════════════════════
// CheckInOutTab.jsx — who has what: checked-out list + QR scan lookup
// Uses native BarcodeDetector (Chrome/Android). Fallback: type asset no.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { fmtDate, daysUntil } from "../lib/warehouseUtils";
import { tr } from "../../i18n";
import AssetDetail from "./AssetDetail";

export default function CheckInOutTab({ TH, lang = "en", isMobile, onChanged }) {
  const L = tr(lang);
  const [out, setOut] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manualNo, setManualNo] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimer = useRef(null);

  useEffect(() => { load(); return stopScan; }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rA, rW] = await Promise.all([
        supabase.from('assets').select('*').eq('is_active', true).eq('status', 'checked_out').order('expected_return_at', { ascending: true, nullsFirst: false }),
        supabase.from('warehouses').select('id, code, name').eq('is_active', true),
      ]);
      if (rA.error) throw rA.error;
      setOut(rA.data || []);
      setWarehouses(rW.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function openByNo(assetNo) {
    const no = assetNo.trim().toUpperCase();
    if (!no) return;
    const { data, error: e } = await supabase.from('assets').select('id').eq('asset_no', no).maybeSingle();
    if (e || !data) { setError(`Asset "${no}" not found`); return; }
    stopScan();
    setSelected(data.id);
  }

  async function startScan() {
    setError(null);
    if (!('BarcodeDetector' in window)) {
      setError("QR scanning isn't supported in this browser. Type the asset number below instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setScanning(true);
      // Wait for video element to mount
      setTimeout(async () => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        scanTimer.current = setInterval(async () => {
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              const value = codes[0].rawValue;
              openByNo(value);
            }
          } catch { /* frame not ready */ }
        }, 400);
      }, 100);
    } catch (e) {
      setError("Camera access denied or unavailable: " + e.message);
      setScanning(false);
    }
  }

  function stopScan() {
    if (scanTimer.current) { clearInterval(scanTimer.current); scanTimer.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setScanning(false);
  }

  if (selected) {
    return <AssetDetail
      TH={TH} lang={lang} isMobile={isMobile}
      assetId={selected}
      warehouses={warehouses}
      onClose={() => { setSelected(null); load(); onChanged?.(); }}
    />;
  }

  return (
    <div>
      {/* Scan bar */}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:16, marginBottom:16}}>
        <div style={{fontSize:14, fontWeight:700, color:TH.text, marginBottom:10}}>{L.scanTitle}</div>
        {!scanning ? (
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            <button onClick={startScan} style={{
              background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:10,
              color:"#000", padding:"12px 22px", cursor:"pointer", fontSize:14, fontWeight:800, fontFamily:"inherit",
            }}>{L.scanQR}</button>
            <input
              value={manualNo}
              onChange={e => setManualNo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && openByNo(manualNo)}
              placeholder={L.typeAssetNo}
              style={{flex:1, minWidth:180, background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:10, padding:"11px 12px", color:TH.text, fontSize:14, outline:"none", fontFamily:"monospace", boxSizing:"border-box"}}
            />
            <button onClick={() => openByNo(manualNo)} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:10, color:TH.text, padding:"11px 18px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>{L.open}</button>
          </div>
        ) : (
          <div>
            <video ref={videoRef} muted playsInline style={{width:"100%", maxHeight:320, borderRadius:10, background:"#000", objectFit:"cover"}} />
            <button onClick={stopScan} style={{marginTop:10, width:"100%", background:"transparent", border:`1px solid ${TH.border}`, borderRadius:10, color:TH.textMuted, padding:"11px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>{L.stopScan}</button>
          </div>
        )}
      </div>

      {error && <div style={{background:"rgba(143,143,143,.08)", border:"1px solid rgba(143,143,143,.3)", borderRadius:10, padding:"12px 14px", color:"#8f8f8f", fontSize:13, marginBottom:14}}>{error}</div>}

      {/* Checked-out list */}
      <div style={{fontSize:14, fontWeight:700, color:TH.text, marginBottom:12}}>{L.currentlyOut} ({out.length})</div>

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>{L.loading}</div>
      ) : out.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          {L.allInWarehouse}
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {out.map(a => {
            const d = a.expected_return_at ? daysUntil(a.expected_return_at) : null;
            const overdue = d !== null && d < 0;
            return (
              <div key={a.id} onClick={() => setSelected(a.id)} style={{
                background:TH.bgCard, border:`1px solid ${overdue ? "rgba(139,112,64,0.5)" : TH.border}`,
                borderLeft:`3px solid ${overdue ? "#B8935A" : "#8B7040"}`,
                borderRadius:12, padding:14, cursor:"pointer",
                display:"flex", gap:12, alignItems:"center",
              }}>
                {a.photo_url ? (
                  <img src={a.photo_url} alt="" style={{width:52, height:52, objectFit:"cover", borderRadius:9, flexShrink:0, background:"#000"}} loading="lazy" />
                ) : (
                  <div style={{width:52, height:52, borderRadius:9, flexShrink:0, background:TH.bgInput, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22}}>📦</div>
                )}
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:14, fontWeight:700, color:TH.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{a.name}</div>
                  <div style={{fontSize:12, color:TH.textMuted}}>👤 {a.holder_name || 'unknown'}{a.holder_phone ? ` · ${a.holder_phone}` : ''}</div>
                  <div style={{fontSize:10, color:TH.textDim, fontFamily:"monospace"}}>{a.asset_no}</div>
                </div>
                <div style={{textAlign:"right", flexShrink:0}}>
                  {a.expected_return_at ? (
                    <>
                      <div style={{fontSize:11, color: overdue ? "#B8935A" : TH.textMuted, fontWeight: overdue ? 800 : 500}}>
                        {overdue ? `${L.overdue} ${-d}d` : d === 0 ? L.dueToday : `${d}${L.daysLeft}`}
                      </div>
                      <div style={{fontSize:10, color:TH.textDim}}>{fmtDate(a.expected_return_at)}</div>
                    </>
                  ) : (
                    <div style={{fontSize:11, color:TH.textDim}}>{L.noReturnDate}</div>
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
