// ═══════════════════════════════════════════════════════════════════
// ItemHistoryModal.jsx — full movement ledger for one item
// Shows every IN / OUT / adjustment with destination, cost, batch, expiry, photo
// Uses RPC: get_item_movements
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from"react";
import { supabase } from"../../supabase";

export default function ItemHistoryModal({ TH, lang = "en", item, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all | in | out
  const [dateRange, setDateRange] = useState("all"); // all | 7d | 30d | 90d | 365d
  const [openPhoto, setOpenPhoto] = useState(null);

  useEffect(() => {
    if (!item) return;
    load();
  }, [item?.id]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.rpc('get_item_movements', {
        p_item_id: item.id, p_limit: 500,
      });
      if (e) throw e;
      setRows(data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // Filters
  const now = Date.now();
  const cutoffs = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
  const filtered = rows.filter(r => {
    if (filter === 'in' && Number(r.qty) <= 0) return false;
    if (filter === 'out' && Number(r.qty) >= 0) return false;
    if (dateRange !== 'all') {
      const days = cutoffs[dateRange];
      const t = new Date(r.performed_at).getTime();
      if (now - t > days * 86400000) return false;
    }
    return true;
  });

  // Aggregates over filtered
  const totalIn  = filtered.filter(r => Number(r.qty) > 0).reduce((s, r) => s + Number(r.qty), 0);
  const totalOut = Math.abs(filtered.filter(r => Number(r.qty) < 0).reduce((s, r) => s + Number(r.qty), 0));
  const totalCostIn = filtered
    .filter(r => Number(r.qty) > 0 && r.total_cost)
    .reduce((s, r) => s + Number(r.total_cost), 0);

  function exportCSV() {
    const headers = ['Date', 'Type', 'Qty', 'Warehouse', 'Source/Destination', 'Reference', 'Unit cost', 'Total cost', 'Batch', 'Expires', 'Person', 'Notes', 'By'];
    const csvRows = [headers.join(',')];
    filtered.forEach(r => {
      const dest = r.destination_pool_name ? `Pool: ${r.destination_pool_name}` :
                   r.destination_department_name ? `Dept: ${r.destination_department_name}` :
                   r.supplier_name ? `Supplier: ${r.supplier_name}` :
                   r.source_type ? r.source_type :
                   r.destination_type || '';
      const row = [
        new Date(r.performed_at).toISOString(),
        Number(r.qty) > 0 ? 'IN' : 'OUT',
        r.qty,
        r.warehouse_name || '',
        dest,
        r.reference_no || '',
        r.unit_cost || '',
        r.total_cost || '',
        r.batch_number || '',
        r.expires_at || '',
        r.destination_person_name || '',
        (r.notes || '').replace(/,/g, ';').replace(/\n/g, ' '),
        r.performed_by_email || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      csvRows.push(row);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name.replace(/[^\w]/g, '_')}_movements_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!item) return null;

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}><div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:20, width:"100%", maxWidth:960, maxHeight:"92vh", display:"flex", flexDirection:"column"}}>

        {/* Header */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, gap:12}}><div><div style={{fontSize:18, fontWeight:800, color:TH.text, fontFamily:"'Playfair Display', Georgia, serif"}}>{item.name}</div><div style={{fontSize:11, color:TH.textMuted, marginTop:2}}>
              {item.code ? `${item.code} · ` : ''}Current: <b style={{color:TH.accent}}>{item.current_qty ?? 0} {item.unit}</b>
              {item.last_unit_cost != null && ` · Last cost: €${item.last_unit_cost}`}
            </div></div><button onClick={onClose} style={{background:"transparent", border:"none", color:TH.textMuted, fontSize:22, cursor:"pointer", padding:4, lineHeight:1}}>×</button></div>

        {/* Summary cards */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8, marginBottom:12}}><div style={sumCard(TH, "#7A9A5B")}><div style={sumLbl(TH)}>Total IN</div><div style={sumVal(TH)}>+{totalIn.toFixed(2)} <span style={{fontSize:11, fontWeight:500, color:TH.textDim}}>{item.unit}</span></div></div><div style={sumCard(TH, "#C43D3D")}><div style={sumLbl(TH)}>Total OUT</div><div style={sumVal(TH)}>-{totalOut.toFixed(2)} <span style={{fontSize:11, fontWeight:500, color:TH.textDim}}>{item.unit}</span></div></div><div style={sumCard(TH, "#B8935A")}><div style={sumLbl(TH)}>Spent (IN)</div><div style={sumVal(TH)}>€{totalCostIn.toFixed(2)}</div></div></div>

        {/* Filters */}
        <div style={{display:"flex", gap:6, marginBottom:12, flexWrap:"wrap", alignItems:"center"}}><div style={{display:"flex", gap:4}}>
            {[
              { k:'all', l:'All' },
              { k:'in',  l:'IN' },
              { k:'out', l:'OUT' },
            ].map(t => (
              <button key={t.k} onClick={() => setFilter(t.k)} style={pill(TH, filter === t.k)}>{t.l}</button>
            ))}
          </div><div style={{width:1, height:20, background:TH.border, margin:"0 4px"}} /><div style={{display:"flex", gap:4}}>
            {[
              { k:'all',  l:'All time' },
              { k:'7d',   l:'7 days' },
              { k:'30d',  l:'30 days' },
              { k:'90d',  l:'90 days' },
              { k:'365d', l:'1 year' },
            ].map(t => (
              <button key={t.k} onClick={() => setDateRange(t.k)} style={pill(TH, dateRange === t.k)}>{t.l}</button>
            ))}
          </div><div style={{marginLeft:"auto"}}><button onClick={exportCSV} disabled={!filtered.length} style={{
              background:"transparent", border:`1px solid ${TH.border}`,
              borderRadius:8, color:TH.text, padding:"6px 14px",
              cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit",
              display:"inline-flex", alignItems:"center", gap:6,
              opacity:!filtered.length?0.4:1,
            }}><Icon name="arrowDown" size={13} />Export CSV</button></div></div>

        {error && <div style={{background:TH.dangerBg, border:`1px solid ${TH.danger}55`, borderRadius:8, padding:"10px 12px", color:TH.danger, fontSize:12, marginBottom:10}}>{error}</div>}

        {/* Rows */}
        <div style={{flex:1, overflowY:"auto", border:`1px solid ${TH.border}`, borderRadius:8}}>
          {loading ? (
            <div style={{padding:40, textAlign:"center", color:TH.textMuted}}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{padding:40, textAlign:"center", color:TH.textMuted}}>No movements match.</div>
          ) : (
            <div>
              {filtered.map(r => {
                const isIn = Number(r.qty) > 0;
                const stateColor = isIn ? "#7A9A5B" : "#C43D3D";
                const dest = describeDest(r);
                return (
                  <div key={r.id} style={{
                    padding:"10px 14px",
                    borderBottom:`1px solid ${TH.border}`,
                    borderLeft:`3px solid ${stateColor}`,
                    display:"flex", alignItems:"flex-start", gap:12,
                  }}><div style={{minWidth:64, textAlign:"center"}}><div style={{fontSize:20, fontWeight:800, color:stateColor, lineHeight:1}}>
                        {isIn ? '+' : ''}{r.qty}
                      </div><div style={{fontSize:9, color:TH.textDim, marginTop:2}}>{isIn ? 'IN' : 'OUT'}</div></div><div style={{flex:1, minWidth:0}}><div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:2}}><span style={{fontSize:13, fontWeight:700, color:TH.text}}>{dest}</span>
                        {r.warehouse_name && <span style={chip(TH)}>{r.warehouse_name}</span>}
                        {r.reference_no && <span style={chip(TH)}>Ref: {r.reference_no}</span>}
                        {r.batch_number && <span style={chip(TH)}>Batch: {r.batch_number}</span>}
                        {r.expires_at && <span style={{...chip(TH), color:'#E67A2C', borderColor:'rgba(230,122,44,0.3)'}}>Exp: {r.expires_at}</span>}
                        {r.total_cost && <span style={{...chip(TH), color:TH.accent}}>€{Number(r.total_cost).toFixed(2)}</span>}
                      </div><div style={{fontSize:10, color:TH.textDim}}>
                        {new Date(r.performed_at).toLocaleString('en-GB', { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' })}
                        {r.performed_by_email && ` · ${r.performed_by_email}`}
                      </div>
                      {r.notes && <div style={{fontSize:11, color:TH.textMuted, marginTop:4, fontStyle:"italic"}}>{r.notes}</div>}
                    </div>
                    {r.photo_url && (
                      <img src={r.photo_url} alt=""onClick={() => setOpenPhoto(r.photo_url)} style={{width:50, height:50, objectFit:"cover", borderRadius:6, cursor:"pointer", flexShrink:0}} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div></div>

      {/* Photo lightbox */}
      {openPhoto && (
        <div onClick={() => setOpenPhoto(null)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", padding:20, cursor:"pointer"}}><img src={openPhoto} alt=""style={{maxWidth:"100%", maxHeight:"100%", borderRadius:8}} /></div>
      )}
    </div>
  );
}

function describeDest(r) {
  if (r.destination_pool_name) return `Pool · ${r.destination_pool_name}`;
  if (r.destination_department_name) return `Dept · ${r.destination_department_name}`;
  if (r.destination_person_name) return `${r.destination_person_name}`;
  if (r.supplier_name) return `${r.supplier_name}`;
  if (r.reason) return r.reason;
  if (r.source_type) return { supplier:'From supplier', return:'Return', transfer:'Transfer', initial:'Initial stock', correction:'Count correction' }[r.source_type] || r.source_type;
  if (r.movement_type === 'restock') return 'Stock IN';
  if (r.movement_type === 'issue') return 'Stock OUT';
  return r.movement_type || '—';
}

function sumCard(TH, color) {
  return { background:TH.bgInput, border:`1px solid ${TH.border}`, borderLeft:`3px solid ${color}`, borderRadius:8, padding:"10px 12px" };
}
function sumLbl(TH) { return { fontSize:10, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }; }
function sumVal(TH) { return { fontSize:18, fontWeight:800, color:TH.text, lineHeight:1 }; }
function pill(TH, active) {
  return {
    background: active ? TH.accentBg : "transparent",
    border: `1px solid ${active ? TH.accentBorder : TH.border}`,
    borderRadius: 20, color: active ? TH.accentText : TH.textMuted,
    padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 500,
    fontFamily: "inherit",
  };
}
function chip(TH) {
  return { fontSize:10, color:TH.textMuted, background:TH.bgInput, border:`1px solid ${TH.border}`, padding:"2px 7px", borderRadius:4, whiteSpace:"nowrap" };
}
