// ═══════════════════════════════════════════════════════════════════
// CheckoutModal.jsx — check out an asset on loan
// Records holder, destination, expected return date. Optionally scans
// the asset barcode.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import BarcodeScanner from "./BarcodeScanner";

export default function CheckoutModal({ TH, lang = "en", presetAssetId = null, onClose, onDone }) {
  const L = tr(lang);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);

  const [assetSearch, setAssetSearch] = useState("");
  const [assetResults, setAssetResults] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const [holderName, setHolderName] = useState("");
  const [holderPhone, setHolderPhone] = useState("");
  const [holderUserId, setHolderUserId] = useState("");
  const [pools, setPools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [destPoolId, setDestPoolId] = useState("");
  const [destDeptId, setDestDeptId] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [purpose, setPurpose] = useState("");
  const [expectedReturn, setExpectedReturn] = useState(() => {
    // Default: 7 days from now
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from('pools').select('id, code, name').eq('is_active', true).order('code'),
      supabase.from('procurement_departments').select('*').eq('is_active', true).order('name'),
      supabase.from('user_procurement_roles').select('user_id, display_name').eq('is_active', true),
    ]).then(([rP, rD, rU]) => {
      setPools(rP.data || []);
      setDepartments(rD.data || []);
      setUsers(rU.data || []);
    });

    if (presetAssetId) {
      supabase.from('assets').select('*').eq('id', presetAssetId).single().then(({ data }) => {
        if (data) selectAsset(data);
      });
    }
  }, [presetAssetId]);

  useEffect(() => {
    if (selectedAsset) return;
    if (!assetSearch.trim()) { setAssetResults([]); return; }
    const t = setTimeout(async () => {
      const q = assetSearch.trim();
      const { data } = await supabase.from('assets')
        .select('id, asset_no, barcode, kind, name, brand, status, condition')
        .eq('is_active', true)
        .or(`name.ilike.%${q}%,asset_no.ilike.%${q}%,barcode.ilike.%${q}%,brand.ilike.%${q}%`)
        .neq('status', 'checked_out')
        .limit(10);
      setAssetResults(data || []);
    }, 200);
    return () => clearTimeout(t);
  }, [assetSearch, selectedAsset]);

  function selectAsset(asset) {
    if (asset.status === 'checked_out') {
      setError(L.alreadyOut || "This asset is already checked out.");
      return;
    }
    setSelectedAsset(asset);
    setAssetSearch(asset.name);
    setAssetResults([]);
  }

  async function handleScan(code) {
    setScanning(false);
    setError(null);
    try {
      const { data, error: e } = await supabase.rpc('scan_asset_barcode', { p_barcode: code });
      if (e) throw e;
      if (data && data.length > 0) {
        selectAsset(data[0]);
      } else {
        setError(`Not found: ${code}`);
      }
    } catch (e) { setError(e.message || String(e)); }
  }

  async function submit() {
    if (!selectedAsset) { setError(L.pickAsset || "Pick an asset to check out"); return; }
    if (!holderName.trim() && !holderUserId) { setError(L.needHolder || "Enter holder name or select user"); return; }
    if (!expectedReturn) { setError(L.needReturn || "Enter expected return date"); return; }

    setBusy(true); setError(null);
    try {
      // Determine destination type
      let destType = 'user';
      if (destPoolId) destType = 'pool';
      else if (destDeptId) destType = 'department';

      const holderDisplay = holderName.trim() ||
        (holderUserId ? (users.find(u => u.user_id === holderUserId)?.display_name || 'User') : '—');

      const { error: e } = await supabase.rpc('checkout_asset', {
        p_asset_id: selectedAsset.id,
        p_holder_name: holderDisplay,
        p_holder_phone: holderPhone.trim() || null,
        p_holder_user_id: holderUserId || null,
        p_destination_type: destType,
        p_destination_pool_id: destPoolId ? Number(destPoolId) : null,
        p_destination_department_id: destDeptId ? Number(destDeptId) : null,
        p_to_location: toLocation.trim() || null,
        p_expected_return_at: new Date(expectedReturn).toISOString(),
        p_purpose: purpose.trim() || null,
        p_notes: notes.trim() || null,
        p_procurement_request_id: null,
      });
      if (e) throw e;
      onDone?.();
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  }

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
      {scanning && <BarcodeScanner TH={TH} lang={lang} onDetected={handleScan} onClose={() => setScanning(false)} />}
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:20, width:"100%", maxWidth:560, maxHeight:"92vh", overflowY:"auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
          <div style={{fontSize:16, fontWeight:800, color:TH.text, fontFamily:"'Playfair Display', Georgia, serif"}}>
            📤 {L.checkoutTitle || "Check out asset"}
          </div>
          <button onClick={onClose} disabled={busy} style={{background:"transparent", border:"none", color:TH.textMuted, fontSize:22, cursor:"pointer", padding:4, lineHeight:1}}>✕</button>
        </div>

        {/* Asset picker */}
        <div style={{marginBottom:12}}>
          <label style={lbl(TH)}>{L.asset || "Asset"} *</label>
          {!selectedAsset ? (
            <>
              <div style={{display:"flex", gap:6}}>
                <div style={{flex:1, position:"relative"}}>
                  <input value={assetSearch} onChange={e => setAssetSearch(e.target.value)} placeholder={L.searchAsset || "Name / asset no / barcode / brand…"} autoFocus style={inp(TH)} />
                  {assetResults.length > 0 && (
                    <div style={{position:"absolute", top:"100%", left:0, right:0, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:8, marginTop:4, maxHeight:220, overflowY:"auto", zIndex:10}}>
                      {assetResults.map(a => (
                        <div key={a.id} onClick={() => selectAsset(a)} style={{padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${TH.border}`}}
                          onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <div style={{fontSize:13, fontWeight:700, color:TH.text}}>{a.name}</div>
                          <div style={{fontSize:10, color:TH.textMuted, fontFamily:"monospace"}}>{a.asset_no}{a.barcode ? ` · ${a.barcode}` : ''} · {a.status}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setScanning(true)} style={{background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:8, color:"#000", padding:"0 14px", cursor:"pointer", fontSize:14, fontWeight:700}}>📷</button>
              </div>
            </>
          ) : (
            <div style={{background:TH.bgInput, borderRadius:8, padding:"10px 12px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div>
                <div style={{fontSize:13, fontWeight:700, color:TH.text}}>{selectedAsset.name}</div>
                <div style={{fontSize:10, color:TH.textMuted, fontFamily:"monospace"}}>{selectedAsset.asset_no}{selectedAsset.barcode ? ` · ${selectedAsset.barcode}` : ''}</div>
              </div>
              <button onClick={() => { setSelectedAsset(null); setAssetSearch(""); }} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:6, color:TH.textMuted, padding:"4px 10px", cursor:"pointer", fontSize:11}}>{L.change || "Change"}</button>
            </div>
          )}
        </div>

        {selectedAsset && (
          <>
            {/* Holder */}
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10}}>
              <div>
                <label style={miniLbl(TH)}>{L.selectUser || "System user"}</label>
                <select value={holderUserId} onChange={e => setHolderUserId(e.target.value)} disabled={busy} style={inp(TH)}>
                  <option value="">— Or enter name →</option>
                  {users.map(u => <option key={u.user_id} value={u.user_id}>{u.display_name}</option>)}
                </select>
              </div>
              <div>
                <label style={miniLbl(TH)}>{L.holderName || "Or free-text name"}</label>
                <input value={holderName} onChange={e => setHolderName(e.target.value)} disabled={busy} placeholder="Holder name" style={inp(TH)} />
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={lbl(TH)}>{L.phone || "Phone"}</label>
              <input value={holderPhone} onChange={e => setHolderPhone(e.target.value)} disabled={busy} style={inp(TH)} placeholder="Optional" />
            </div>

            {/* Destination */}
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10}}>
              <div>
                <label style={miniLbl(TH)}>{L.pool || "Pool"}</label>
                <select value={destPoolId} onChange={e => { setDestPoolId(e.target.value); if (e.target.value) setDestDeptId(""); }} disabled={busy} style={inp(TH)}>
                  <option value="">—</option>
                  {pools.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
                </select>
              </div>
              <div>
                <label style={miniLbl(TH)}>{L.department || "Department"}</label>
                <select value={destDeptId} onChange={e => { setDestDeptId(e.target.value); if (e.target.value) setDestPoolId(""); }} disabled={busy} style={inp(TH)}>
                  <option value="">—</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <label style={lbl(TH)}>{L.toLocation || "Where"}</label>
              <input value={toLocation} onChange={e => setToLocation(e.target.value)} disabled={busy} style={inp(TH)} placeholder={L.toLocationPh || "e.g. Caesar Cliff main garden"} />
            </div>

            {/* Return date */}
            <div style={{marginBottom:10}}>
              <label style={lbl(TH)}>{L.expectedReturn || "Expected return"} *</label>
              <input type="date" value={expectedReturn} onChange={e => setExpectedReturn(e.target.value)} disabled={busy} style={inp(TH)} />
            </div>

            <div style={{marginBottom:10}}>
              <label style={lbl(TH)}>{L.purpose || "Purpose"}</label>
              <input value={purpose} onChange={e => setPurpose(e.target.value)} disabled={busy} style={inp(TH)} placeholder={L.purposePh || "Optional"} />
            </div>
            <div style={{marginBottom:14}}>
              <label style={lbl(TH)}>{L.notes || "Notes"}</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={busy} rows={2} style={{...inp(TH), resize:"vertical"}} placeholder="Optional" />
            </div>
          </>
        )}

        {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:8, padding:"10px 12px", color:"#C43D3D", fontSize:12, marginBottom:10}}>{error}</div>}

        <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
          <button onClick={onClose} disabled={busy} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit"}}>{L.cancel || "Cancel"}</button>
          <button onClick={submit} disabled={busy || !selectedAsset} style={{background:"linear-gradient(135deg,#B8935A,#8B7040)", border:"none", borderRadius:9, color:"#000", padding:"10px 24px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"inherit", opacity: (busy || !selectedAsset) ? 0.6 : 1}}>
            {busy ? (L.savingCheckout || "Checking out…") : (L.confirmCheckout || "Confirm checkout")}
          </button>
        </div>
      </div>
    </div>
  );
}

function lbl(TH)  { return { display:"block", color:TH.textMuted, fontSize:11, marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }; }
function miniLbl(TH) { return { display:"block", color:TH.textMuted, fontSize:10, marginBottom:3, fontWeight:600, textTransform:"uppercase" }; }
function inp(TH) { return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"10px 12px", color:TH.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }; }
