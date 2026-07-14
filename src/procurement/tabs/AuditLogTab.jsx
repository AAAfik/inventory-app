// ═══════════════════════════════════════════════════════════════════
// AuditLogTab.jsx — admin / auditor view of immutable audit trail
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { formatDate } from "../lib/procureUtils";

export default function AuditLogTab({ TH, isMobile }) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase
        .schema('procure')
        .from('audit_log')
        .select('id, occurred_at, user_email, action, entity_type, entity_id, before_data, after_data')
        .order('occurred_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const filt = logs.filter(l => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (l.action || '').toLowerCase().includes(q)
      || (l.entity_type || '').toLowerCase().includes(q)
      || (l.user_email || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{display:"flex", gap:10, marginBottom:16, alignItems:"center", flexWrap:"wrap"}}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by action, entity, or user email..."
          style={{flex:1, minWidth:200, background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box"}}
        />
        <button onClick={load} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:8, color:TH.textMuted, padding:"7px 14px", cursor:"pointer", fontSize:12, fontFamily:"inherit"}}>↻ Refresh</button>
        <div style={{color:TH.textMuted, fontSize:12}}>{filt.length} / {logs.length} entries</div>
      </div>

      {error && (
        <div style={{background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.3)", borderRadius:9, padding:"10px 14px", color:"#ef4444", fontSize:13, marginBottom:16}}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{padding:30, textAlign:"center", color:TH.textMuted}}>Loading...</div>
      ) : filt.length === 0 ? (
        <div style={{padding:40, background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, color:TH.textMuted, textAlign:"center"}}>
          No audit entries{filter ? ` matching "${filter}"` : ""}.
        </div>
      ) : (
        <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:12, overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%", borderCollapse:"collapse", fontSize:12}}>
              <thead>
                <tr style={{background:TH.bgElev}}>
                  <Th TH={TH}>When</Th>
                  <Th TH={TH}>User</Th>
                  <Th TH={TH}>Action</Th>
                  <Th TH={TH}>Entity</Th>
                  <Th TH={TH}>Details</Th>
                </tr>
              </thead>
              <tbody>
                {filt.map(l => (
                  <tr key={l.id} style={{borderTop:`1px solid ${TH.border}`}}>
                    <Td TH={TH} style={{whiteSpace:"nowrap"}}>{formatDate(l.occurred_at)}</Td>
                    <Td TH={TH} style={{color:TH.textMuted}}>{l.user_email || "—"}</Td>
                    <Td TH={TH}><code style={{color:TH.accent, fontSize:11}}>{l.action}</code></Td>
                    <Td TH={TH} style={{color:TH.textMuted, fontSize:11}}>{l.entity_type}: {(l.entity_id || '').slice(0,8)}…</Td>
                    <Td TH={TH} style={{color:TH.textMuted, fontSize:11, maxWidth:300, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                      {JSON.stringify(l.after_data || {})}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ TH, children }) {
  return <th style={{textAlign:"left", padding:"10px 14px", color:TH.textMuted, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px"}}>{children}</th>;
}
function Td({ TH, children, style }) {
  return <td style={{padding:"8px 14px", color:TH.text, ...style}}>{children}</td>;
}
