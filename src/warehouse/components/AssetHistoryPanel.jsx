// ═══════════════════════════════════════════════════════════════════
// AssetHistoryPanel.jsx — embeddable timeline for a single asset
// Use inside AssetDetail:
//   <AssetHistoryPanel TH={TH} lang={lang} assetId={asset.id} />
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import { formatDate } from "../../inspection/lib/inspectionUtils";

const EVENT_META = {
  created:          { icon: "✨", color: "#7A9A5B", label: "Created" },
  updated:          { icon: "✏️", color: "#8B7040", label: "Updated" },
  moved:            { icon: "📍", color: "#7BB3D4", label: "Moved" },
  assigned:         { icon: "👤", color: "#B8935A", label: "Assigned" },
  unassigned:       { icon: "🔓", color: "#8f8f8f", label: "Unassigned" },
  serviced:         { icon: "🔧", color: "#B8862C", label: "Serviced" },
  condition_changed:{ icon: "🩹", color: "#E67A2C", label: "Condition changed" },
  cost_updated:     { icon: "💰", color: "#8B7040", label: "Cost updated" },
  status_changed:   { icon: "🔄", color: "#7BB3D4", label: "Status changed" },
  deleted:          { icon: "🗑",  color: "#C43D3D", label: "Deleted" },
  barcode_scanned:  { icon: "📷", color: "#B8935A", label: "Barcode scanned" },
  note:             { icon: "📝", color: "#8f8f8f", label: "Note" },
};

export default function AssetHistoryPanel({ TH, lang = "en", assetId }) {
  const L = tr(lang);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [assetId]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase
        .from('asset_history')
        .select('*')
        .eq('asset_id', assetId)
        .order('performed_at', { ascending: false });
      if (e) throw e;
      setRows(data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function addNote() {
    const note = newNote.trim();
    if (!note) return;
    setSaving(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: e } = await supabase.from('asset_history').insert([{
        asset_id: assetId, event_type: 'note',
        notes: note, performed_by: user?.id,
      }]);
      if (e) throw e;
      setNewNote("");
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{fontSize:13, fontWeight:700, color:TH.text, marginBottom:10}}>
        📜 {L.historyTitle || 'History'} ({rows.length})
      </div>

      {/* Add note */}
      <div style={{display:"flex", gap:6, marginBottom:14}}>
        <input
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addNote(); }}
          placeholder={L.historyNotePh || 'Add a note about this asset…'}
          style={{flex:1, background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit"}}
        />
        <button
          onClick={addNote}
          disabled={!newNote.trim() || saving}
          style={{
            background: newNote.trim() ? "linear-gradient(135deg,#B8935A,#8B7040)" : TH.bgInput,
            border:"none", borderRadius:8, color: newNote.trim() ? "#000" : TH.textMuted,
            padding:"9px 16px", fontSize:13, fontWeight:700, cursor: newNote.trim() ? "pointer" : "not-allowed",
            fontFamily:"inherit",
          }}
        >{saving ? '…' : (L.add || 'Add')}</button>
      </div>

      {error && <div style={{background:"rgba(196,61,61,0.1)", border:"1px solid rgba(196,61,61,0.3)", borderRadius:8, padding:"10px 12px", color:"#C43D3D", fontSize:12, marginBottom:10}}>{error}</div>}

      {loading ? (
        <div style={{padding:20, textAlign:"center", color:TH.textMuted, fontSize:12}}>{L.loading || 'Loading…'}</div>
      ) : rows.length === 0 ? (
        <div style={{padding:20, textAlign:"center", color:TH.textMuted, fontSize:12, background:TH.bgInput, borderRadius:8}}>
          {L.historyEmpty || 'No history yet.'}
        </div>
      ) : (
        <div style={{position:"relative", paddingLeft:20}}>
          {/* Vertical timeline line */}
          <div style={{position:"absolute", left:8, top:12, bottom:12, width:2, background:TH.border}} />

          {rows.map((r) => {
            const em = EVENT_META[r.event_type] || { icon: "•", color: "#8f8f8f", label: r.event_type };
            return (
              <div key={r.id} style={{position:"relative", marginBottom:12, paddingLeft:20}}>
                {/* Dot */}
                <div style={{position:"absolute", left:-16, top:6, width:16, height:16, background:em.color, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9}}>
                  {em.icon}
                </div>
                <div style={{background:TH.bgInput, borderRadius:8, padding:"10px 12px", borderLeft:`2px solid ${em.color}`}}>
                  <div style={{display:"flex", justifyContent:"space-between", gap:8, flexWrap:"wrap", marginBottom:4}}>
                    <div style={{fontSize:12, fontWeight:700, color:TH.text}}>
                      {em.label}{r.field_name && <span style={{fontSize:10, color:TH.textMuted, fontWeight:400}}> · {r.field_name}</span>}
                    </div>
                    <div style={{fontSize:10, color:TH.textDim, whiteSpace:"nowrap"}}>{formatDate(r.performed_at)}</div>
                  </div>
                  {(r.old_value || r.new_value) && (
                    <div style={{fontSize:11, color:TH.textMuted, marginTop:4}}>
                      {r.old_value && <div><span style={{color:"#C43D3D"}}>−</span> {jsonPreview(r.old_value)}</div>}
                      {r.new_value && <div><span style={{color:"#7A9A5B"}}>+</span> {jsonPreview(r.new_value)}</div>}
                    </div>
                  )}
                  {r.notes && <div style={{fontSize:11, color:TH.text, marginTop:4, fontStyle:"italic"}}>💬 {r.notes}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function jsonPreview(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v !== 'object') return String(v);
  return Object.entries(v).map(([k, val]) => `${k}: ${val === null ? '—' : val}`).join(' · ');
}
