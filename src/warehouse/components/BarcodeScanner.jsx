// ═══════════════════════════════════════════════════════════════════
// BarcodeScanner.jsx — reusable barcode / QR scanner
// Supports:
//   • BarcodeDetector API (Chromium desktop + Android Chrome)
//   • USB scanner (types into focused input + Enter)
//   • Manual entry (paste + Enter)
// Usage:
//   <BarcodeScanner TH={TH} lang={lang} onDetected={(code) => ...} onClose={...} />
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { tr } from "../../i18n";

export default function BarcodeScanner({ TH, lang = "en", onDetected, onClose, title }) {
  const L = tr(lang);
  const [mode, setMode] = useState("manual");   // 'manual' | 'camera'
  const [manualValue, setManualValue] = useState("");
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [detectorSupported, setDetectorSupported] = useState(true);
  const videoRef  = useRef(null);
  const inputRef  = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const runningRef  = useRef(false);

  // Focus manual input immediately (USB scanners will type here)
  useEffect(() => {
    if (mode === "manual") setTimeout(() => inputRef.current?.focus(), 50);
  }, [mode]);

  // Cleanup camera on unmount / mode change
  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera() {
    setError(null);
    if (!('BarcodeDetector' in window)) {
      setDetectorSupported(false);
      setError(L.scannerNoDetectorMsg || 'This browser does not support live camera barcode detection. Use a USB scanner or paste the code manually.');
      return;
    }
    try {
      const detector = new window.BarcodeDetector({
        formats: ['code_128','code_39','ean_13','ean_8','upc_a','upc_e','qr_code','itf','codabar','data_matrix'],
      });
      detectorRef.current = detector;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setMode("camera");
        runningRef.current = true;
        scanLoop();
      }
    } catch (e) {
      setError((L.scannerCameraErr || 'Camera error') + ': ' + (e.message || String(e)));
    }
  }

  function stopCamera() {
    runningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }

  async function scanLoop() {
    if (!runningRef.current || !detectorRef.current || !videoRef.current) return;
    try {
      const codes = await detectorRef.current.detect(videoRef.current);
      if (codes && codes.length > 0) {
        const raw = codes[0].rawValue;
        if (raw) {
          stopCamera();
          onDetected?.(raw.trim());
          return;
        }
      }
    } catch { /* ignore transient detect errors */ }
    if (runningRef.current) requestAnimationFrame(scanLoop);
  }

  function submitManual(e) {
    e?.preventDefault?.();
    const v = manualValue.trim();
    if (!v) return;
    onDetected?.(v);
  }

  function handleClose() {
    stopCamera();
    onClose?.();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: TH.bgCard, border: `1px solid ${TH.border}`, borderRadius: 14,
        padding: 20, width: "100%", maxWidth: 460,
      }}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 14}}>
          <div style={{fontSize:16, fontWeight:800, color:TH.text, fontFamily:"'Playfair Display', Georgia, serif"}}>
            📷 {title || L.scannerTitle || 'Scan barcode / QR'}
          </div>
          <button onClick={handleClose} style={{background:"transparent", border:"none", color:TH.textMuted, fontSize:22, cursor:"pointer", lineHeight:1, padding:4}}>✕</button>
        </div>

        {/* Mode switcher */}
        <div style={{display:"flex", gap:6, marginBottom:12}}>
          <button
            onClick={() => { stopCamera(); setMode("manual"); }}
            style={modeBtn(TH, mode === "manual")}
          >⌨️ {L.scannerManual || 'Manual / USB'}</button>
          <button
            onClick={() => startCamera()}
            style={modeBtn(TH, mode === "camera")}
          >📷 {L.scannerCamera || 'Camera'}</button>
        </div>

        {error && (
          <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:8, padding:"10px 12px", color:"#C43D3D", fontSize:12, marginBottom:12}}>
            {error}
          </div>
        )}

        {mode === "manual" && (
          <form onSubmit={submitManual}>
            <div style={{fontSize:11, color:TH.textMuted, marginBottom:6}}>
              {L.scannerManualHint || 'Type or scan with USB scanner. Press Enter to submit.'}
            </div>
            <input
              ref={inputRef}
              value={manualValue}
              onChange={e => setManualValue(e.target.value)}
              placeholder="CP-VH-00001 …"
              autoFocus
              style={{
                width:"100%", background:TH.bgInput, border:`2px solid ${TH.accent || '#B8935A'}`,
                borderRadius:10, padding:"14px 16px", color:TH.text, fontSize:18,
                fontFamily:"monospace", letterSpacing:"0.08em", outline:"none", boxSizing:"border-box",
              }}
            />
            <button
              type="submit"
              disabled={!manualValue.trim()}
              style={{
                width:"100%", marginTop:10,
                background: manualValue.trim() ? "linear-gradient(135deg,#B8935A,#8B7040)" : TH.bgInput,
                border:"none", borderRadius:10, color: manualValue.trim() ? "#000" : TH.textMuted,
                padding:"12px 16px", fontSize:14, fontWeight:800, cursor: manualValue.trim() ? "pointer" : "not-allowed",
                fontFamily:"inherit",
              }}
            >{L.scannerSubmit || 'Search'}</button>
          </form>
        )}

        {mode === "camera" && (
          <div>
            <div style={{position:"relative", background:"#000", borderRadius:10, overflow:"hidden", aspectRatio:"4/3"}}>
              <video ref={videoRef} playsInline muted style={{width:"100%", height:"100%", objectFit:"cover", display:"block"}} />
              {!cameraReady && (
                <div style={{position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13}}>
                  {L.scannerStarting || 'Starting camera…'}
                </div>
              )}
              {/* Scanning overlay */}
              {cameraReady && (
                <div style={{position:"absolute", inset:20, border:"3px solid #B8935A", borderRadius:10, pointerEvents:"none", boxShadow:"0 0 0 4000px rgba(0,0,0,0.4)"}} />
              )}
            </div>
            <div style={{fontSize:11, color:TH.textMuted, textAlign:"center", marginTop:8}}>
              {L.scannerAlignHint || 'Point the camera at the barcode. It will detect automatically.'}
            </div>
            {!detectorSupported && (
              <div style={{fontSize:11, color:"#C43D3D", marginTop:6}}>
                {L.scannerNoDetectorMsg || 'Your browser does not support live detection.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function modeBtn(TH, active) {
  return {
    flex:1, background: active ? TH.accentBg : TH.bgInput,
    border:`1px solid ${active ? TH.accentBorder : TH.border}`,
    borderRadius:8, color: active ? TH.accentText : TH.textMuted,
    padding:"9px 10px", cursor:"pointer", fontSize:12, fontWeight:active?700:500,
    fontFamily:"inherit",
  };
}
