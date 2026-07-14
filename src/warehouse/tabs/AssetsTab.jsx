// ═══════════════════════════════════════════════════════════════════
// AssetsTab.jsx — browse, create, and manage assets
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { ASSET_KINDS, ASSET_STATUS, nextAssetNo, formatDateShort, formatMoney } from "../lib/warehouseUtils";
import AssetDetail from "./AssetDetail";

export default function AssetsTab({ TH, isMobile, isAdmin }) {
  const [assets, setAssets]         = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected]     = useState(null); // asset being viewed in detail

  // Filters
  const [kindFilter, setKindFilter]     = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [search, setSearch]             = useState("");

  // New asset form
  const [form, setForm] = useState({
    kind: "equipment", name: "", brand: "", model: "", serial_number: "",
    plate_number: "", warehouse_id: "", purchased_at: "", purchase_price: "",
    supplier_name: "", warranty_expires_at: "", category: "", notes: "",
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      const [rA, rW] = await Promise.all([
        supabase.from('assets').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(500),
        supabase.from('warehouses').select('id, code, name, property_id').eq('is_active', true),
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

  async function submitAsset() {
    setSubmitting(true); setError(null);
    try {
      if (!form.name.trim() || !form.warehouse_id) throw new Error("Name and warehouse are required.");
      const { data: { user } } = await supabase.auth.getUser();
      const asset_no = await nextAssetNo(supabase, form.kind);

      const { error } = await supabase.from('assets').insert([{
        asset_no,
        kind:              form.kind,
        name:              form.name.trim(),
        brand:             form.brand.trim() || null,
        model:             form.model.trim() || null,
        serial_number:     form.serial_number.trim() || null,
        plate_number:      form.plate_number.trim() || null,
        warehouse_id:      Number(form.warehouse_id),
        purchased_at:      form.purchased_at || null,
        purchase_price:    form.purchase_price ? Number(form.purchase_price) : null,
        supplier_name:     form.supplier_name.trim() || null,
        warranty_expires_at: form.warranty_expires_at || null,
        category:          form.category.trim() || null,
        notes:             form.notes.trim() || null,
        qr_code_data:      asset_no,
        created_by:        user?.id,
      }]);
      if (error) throw error;
      setShowForm(false);
      setForm({ kind: "equipment", name: "", brand: "", model: "", serial_number: "", plate_number: "", warehouse_id: "", purchased_at: "", purchase_price: "", supplier_name: "", warranty_expires_at: "", category: "", notes: "" });
      await loadAll();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  // If detail view is open, render it full-width
  if (selected) {
    return <AssetDetail TH={TH} isMobile={isMobile} assetId={selected} onClose={() => { setSelected(null); loadAll(); }} warehouses={warehouses} />;
  }

  const whMap = Object.fromEntries(warehouses.map(w => [w.id, w]));

  const filt = assets.filter(a => {
    if (kindFilter !== "all" && a.kind !== kindFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (warehouseFilter !== "all" && String(a.warehouse_id) !== warehouseFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(a.name || '').toLowerCase().includes(q)
        && !(a.asset_no || '').toLowerCase().includes(q)
        && !(a.serial_number || '').toLowerCase().includes(q)
        && !(a.plate_number || '').toLowerCase().includes(q)
        && !(a.brand || '').toLowerCase().includes(q)
        && !(a.model || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Category counts for header pills
  const kindCounts = {
    all: assets.length,
    equipment: assets.filter(a => a.kind === 'equipment').length,
    tool: assets.filter(a => a.kind === 'tool').length,
    vehicle: assets.filter(a => a.kind === 'vehicle').length,
  };

  return (
    <div>
      {/* Kind filter pills */}
      <div style={{display:"flex", gap:8, marginBottom:16, overflowX:"auto", paddingBottom:4}}>
        {[
          { key: 'all', label: 'All', icon: '📦' },
          { key: 'equipment', ...ASSET_KINDS.equipment },
          { key: 'tool', ...ASSET_KINDS.tool },
          { key: 'vehicle', ...ASSET_KINDS.vehicle },
        ].map(k => {
          const on = kindFilter === k.key;
          return (
            <button key={k.key} onClick={() => setKindFilter(k.key)} style={{
              background: on ? (k.color ? k.color + "22" : TH.accentBg) : "transparent",
              border: `1px solid ${on ? (k.color || TH.accentBorder) : TH.border}`,
              borderRadius: 10, color: on ? (k.color || TH.accentText) : TH.textMuted,
              padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600,
              fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{fontSize:16}}>{k.icon}</span>
              <span>{k.label}</span>
              <span style={{background: on ? (k.color || TH.accent) : TH.bgInput, color: on ? "#000" : TH.textMuted, padding: "1px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700}}>{kindCounts[k.key]}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary filters */}
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr auto", gap:8, marginBottom:16}}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search name, serial, plate, brand..." style={inputStyle(TH)} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle(TH)}>
          <option value="all">All statuses</option>
          {Object.entries(ASSET_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} style={inputStyle(TH)}>
          <option value="all">All warehouses</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <button onClick={() => setShowForm(s => !s)} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:8, color:"#000", padding:"9px 16px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", whiteSpace:"nowrap"}}>
          {showForm ? "Cancel" : "+ New asset"}
        </button>
      </div>

      {error && <ErrorBox TH={TH}>{error}</ErrorBox>}

      {/* New asset form */}
      {showForm && (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:20, marginBottom:20}}>
          <div style={{fontSize:15, fontWeight:700, color:TH.text, marginBottom:14}}>New asset</div>

          {/* Kind selector */}
          <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8, marginBottom:16}}>
            {Object.entries(ASSET_KINDS).map(([k, meta]) => {
              const on = form.kind === k;
              return (
                <button key={k} onClick={() => setForm(f => ({ ...f, kind: k }))} style={{
                  background: on ? meta.color + "22" : "transparent",
                  border: `2px solid ${on ? meta.color : TH.border}`,
                  borderRadius: 10, color: on ? meta.color : TH.textMuted,
                  padding: "12px 8px", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}>
                  <div style={{fontSize:22}}>{meta.icon}</div>
                  <div>{meta.label}</div>
                </button>
              );
            })}
          </div>

          <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12}}>
            <Field TH={TH} label="Name *"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder='e.g. "Pool filter pump #3"' style={inputStyle(TH)} /></Field>
            <Field TH={TH} label="Warehouse *">
              <select value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))} style={inputStyle(TH)}>
                <option value="">Select warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </Field>
            <Field TH={TH} label="Brand"><input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} style={inputStyle(TH)} /></Field>
            <Field TH={TH} label="Model"><input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} style={inputStyle(TH)} /></Field>
            <Field TH={TH} label={form.kind === 'vehicle' ? 'VIN / chassis' : 'Serial number'}>
              <input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} style={inputStyle(TH)} />
            </Field>
            {form.kind === 'vehicle' && (
              <Field TH={TH} label="License plate">
                <input value={form.plate_number} onChange={e => setForm(f => ({ ...f, plate_number: e.target.value }))} style={inputStyle(TH)} />
              </Field>
            )}
            <Field TH={TH} label="Purchased on"><input type="date" value={form.purchased_at} onChange={e => setForm(f => ({ ...f, purchased_at: e.target.value }))} style={inputStyle(TH)} /></Field>
            <Field TH={TH} label="Purchase price (€)"><input type="number" step="0.01" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} style={inputStyle(TH)} /></Field>
            <Field TH={TH} label="Supplier"><input value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} style={inputStyle(TH)} /></Field>
            <Field TH={TH} label="Warranty ends"><input type="date" value={form.warranty_expires_at} onChange={e => setForm(f => ({ ...f, warranty_expires_at: e.target.value }))} style={inputStyle(TH)} /></Field>
            <Field TH={TH} label="Category tag"><input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder='e.g. "Pool", "Kitchen"' style={inputStyle(TH)} /></Field>
          </div>
          <Field TH={TH} label="Notes" style={{marginTop:12}}>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{...inputStyle(TH), minHeight:50, resize:"vertical"}} />
          </Field>
          <div style={{display:"flex", justifyContent:"flex-end", marginTop:18, paddingTop:14, borderTop:`1px solid ${TH.border}`}}>
            <button onClick={submitAsset} disabled={submitting} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)", border:"none", borderRadius:10, color:"#000", padding:"10px 20px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", opacity:submitting?0.6:1}}>
              {submitting ? "Creating..." : "Register asset"}
            </button>
          </div>
        </div>
      )}

      {/* Asset grid */}
      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading...</div>
      ) : filt.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          No assets match your filters.
        </div>
      ) : (
        <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(280px, 1fr))", gap:12}}>
          {filt.map(a => {
            const kindMeta = ASSET_KINDS[a.kind] || {};
            const statusMeta = ASSET_STATUS[a.status] || { label: a.status, color: '#8892b0' };
            const wh = whMap[a.warehouse_id];
            return (
              <div key={a.id} onClick={() => setSelected(a.id)} style={{
                background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, padding:14, cursor:"pointer",
                borderLeft:`3px solid ${kindMeta.color || TH.accent}`, transition:"all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = TH.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = TH.bgCard}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8}}>
                  <div style={{fontSize:20}}>{kindMeta.icon}</div>
                  <span style={{display:"inline-block", padding:"2px 8px", borderRadius:5, background:statusMeta.color+"22", color:statusMeta.color, fontSize:10, fontWeight:700}}>{statusMeta.label}</span>
                </div>
                <div style={{fontSize:14, fontWeight:700, color:TH.text, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{a.name}</div>
                <div style={{fontSize:11, color:TH.accent, fontFamily:"monospace", marginBottom:8}}>{a.asset_no}</div>
                {(a.brand || a.model) && <div style={{fontSize:12, color:TH.textMuted, marginBottom:4}}>{[a.brand, a.model].filter(Boolean).join(" · ")}</div>}
                {a.serial_number && <div style={{fontSize:11, color:TH.textDim}}>SN: {a.serial_number}</div>}
                {a.plate_number && <div style={{fontSize:11, color:TH.textDim}}>Plate: {a.plate_number}</div>}
                {wh && <div style={{fontSize:11, color:TH.textMuted, marginTop:8, padding:"4px 8px", background:TH.bgInput, borderRadius:5, display:"inline-block"}}>📍 {wh.code}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ TH, label, children, style }) {
  return (
    <div style={style}>
      <label style={{display:"block", color:TH.textMuted, fontSize:12, marginBottom:6, fontWeight:600}}>{label}</label>
      {children}
    </div>
  );
}
function inputStyle(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
function ErrorBox({ TH, children }) {
  return <div style={{background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.3)", borderRadius:9, padding:"10px 14px", color:"#ef4444", fontSize:13, marginBottom:16}}>{children}</div>;
}
