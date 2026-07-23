// ═══════════════════════════════════════════════════════════════════
// PWAInstall.jsx — install button for the app (mobile-first)
// Shows when browser fires 'beforeinstallprompt' or on iOS Safari
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";

export default function PWAInstall({ TH, isMobile }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa-install-dismissed') === '1');

  useEffect(() => {
    // Standard PWA install prompt (Chrome, Edge, Android)
    function onBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-install-dismissed', '1');
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // Check if already installed (standalone mode)
    if (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    // iOS Safari has no beforeinstallprompt — show hint
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && !deferredPrompt) {
      setShowIosHint(true);
      return;
    }
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  }

  function dismiss() {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', '1');
  }

  if (installed || dismissed) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // Only show if we have a prompt OR user is on iOS Safari (both installable)
  if (!deferredPrompt && !isIOS) return null;

  // iOS hint modal
  if (showIosHint) {
    return (
      <div
        onClick={() => setShowIosHint(false)}
        style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center", padding:20, cursor:"pointer",
        }}
      >
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:16, padding:24, maxWidth:340}}>
          <div style={{fontSize:20, fontWeight:800, color:TH.text, marginBottom:12}}>📱 Install on iPhone</div>
          <ol style={{color:TH.text, fontSize:14, lineHeight:1.7, paddingLeft:20, margin:0}}>
            <li>Tap the <strong>Share</strong> button <span style={{fontSize:18}}>􀈂</span> below</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
            <li>Tap <strong>Add</strong> in the top right</li>
          </ol>
          <button
            onClick={() => setShowIosHint(false)}
            style={{marginTop:16, width:"100%", background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:10, color:"#000", padding:"11px", cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit"}}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={install}
      title="Install Caesar app"
      style={{
        background: "linear-gradient(135deg,#B8935A,#8B7040)",
        border: "none",
        borderRadius: 9,
        color: "#000",
        padding: isMobile ? "7px 10px" : "7px 14px",
        cursor: "pointer",
        fontSize: 12,
        fontFamily: "inherit",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      📥 {!isMobile && "Install app"}
      {isMobile && "Install"}
    </button>
  );
}
