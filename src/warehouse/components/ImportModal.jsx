// ═══════════════════════════════════════════════════════════════════
// ImportModal.jsx — bulk import items from CSV, with preview + result
// Uses RPC: bulk_upsert_items(jsonb)
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { supabase } from "../../supabase";
import { tr } from "../../i18n";
import { Icon } from "../lib/icons";

const FIELDS = [
  { key:'code',     label:'Code',      hint:'Optional, used to match existing items' },
  { key:'name',     label:'Name',      hint:'Required' },
  { key:'category', label:'Category',  hint:'e.g. Chemicals, Tools' },
  { key:'unit',     label:'Unit',      hint:'pcs, kg, L … defaults to pcs' },
  { key:'min_qty',  label:'Min qty',   hint:'Reorder threshold' },
  { key:'cost',     label:'Unit cost', hint:'Number, no currency symbol' },
  { key:'location', label:'Location',  hint:'Store / shelf' },
  { key:'notes',    label:'Notes',     hint:'Free text' },
];

const ALIASES = {
  code:['code','item code','sku','item_code','kod'],
  name:['name','item name','item','description','item_name','isim','ad'],
  category:['category','type','group','kategori','dasteh'],
  unit:['unit','uom','birim','vahed'],
  min_qty:['min_qty','min stock','minimum','min','reorder','min_stock'],
  cost:['cost','unit price','price','unit_cost','unit price','fiyat','last_unit_cost'],
  location:['location','store','shelf','bin','warehouse location','yer'],
  notes:['notes','note','comment','remarks','aciklama'],
};

function parseCSV(text) {
  const rows = [];
  let cur = [], val = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i+1] === '"') { val += '"'; i++; }
      else if (c === '"') q = false;
      else val += c;
    } else if (c === '"') q = true;
    else if (c === ',' || c === ';' || c === '\t') { cur.push(val); val = ''; }
    else if (c === '\n') { cur.push(val); rows.push(cur); cur = []; val = ''; }
    else if (c !== '\r') val += c;
  }
  if (val !== '' || cur.length) { cur.push(val); rows.push(cur); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

function autoMap(headers) {
  const m = {};
  headers.forEach((h, i) => {
    const norm = String(h).toLowerCase().trim();
    for (const [field, alts] of Object.entries(ALIASES)) {
      if (m[field] !== undefined) continue;
      if (alts.includes(norm)) { m[field] = i; break; }
    }
  });
  return m;
}

export default function ImportModal({ TH, lang = "en", onClose, onDone }) {
  const L = tr(lang);
  const [step, setStep] = useState(1);   // 1 pick · 2 map · 3 result
  const [raw, setRaw] = useState([]);
  const [mapping, setMapping] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const rows = parseCSV(String(rd.result));
        if (rows.length < 2) { setError("The file needs a header row and at least one data row."); return; }
        setRaw(rows);
        setMapping(autoMap(rows[0]));
        setError(null);
        setStep(2);
      } catch (err) { setError("Could not read that file: " + err.message); }
    };
    rd.onerror = () => setError("Could not read that file.");
    rd.readAsText(file, 'utf-8');
  }

  const headers = raw[0] || [];
  const dataRows = raw.slice(1);

  const mapped = dataRows.map(r => {
    const o = {};
    FIELDS.forEach(f => {
      const idx = mapping[f.key];
      if (idx !== undefined && idx !== '' && idx !== null) {
        const v = String(r[idx] ?? '').trim();
        if (v !== '') o[f.key] = v;
      }
    });
    return o;
  });
  const valid   = mapped.filter(r => r.name);
  const invalid = mapped.length - valid.length;

  async function run() {
    setBusy(true); setError(null);
    try {
      const { data, error: e } = await supabase.rpc('bulk_upsert_items', { p_rows: valid });
      if (e) throw e;
      setResult(data);
      setStep(3);
    } catch (e) { setError(e.message || String(e)); }
    finally { setBusy(false); }
  }

  function downloadTemplate() {
    const head = FIELDS.map(f => f.key).join(',');
    const sample = 'CHL-90,Chlorine tablets 90%,Chemicals,kg,20,3.80,Pool Store A,Sanitiser';
    const blob = new Blob([head + '\n' + sample + '\n'], { type:'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'items_import_template.csv';
    a.click(); URL.revokeObjectURL(a.href);
  }

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(8,12,22,.72)", backdropFilter:"blur(3px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
      <div style={{background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:24, width:"100%", maxWidth:720, maxHeight:"92vh", overflowY:"auto", boxShadow:TH.shadowLg}}>

        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, paddingBottom:14, borderBottom:`1px solid ${TH.divider}`}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, fontWeight:500, color:TH.textHeading}}>
              {L.importItems || "Import items"}
            </div>
            <div style={{fontSize:11, color:TH.textDim, marginTop:3}}>
              {step === 1 ? (L.step1 || "Step 1 of 3 · choose a file")
               : step === 2 ? (L.step2 || "Step 2 of 3 · match the columns")
               : (L.step3 || "Step 3 of 3 · result")}
            </div>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Close" style={{background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:9, width:30, height:30, color:TH.textMuted, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0}}>
            <Icon name="close" size={14} />
          </button>
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div>
            <label style={{
              display:"flex", flexDirection:"column", alignItems:"center", gap:11,
              border:`1px dashed ${TH.borderStrong}`, borderRadius:12,
              padding:"40px 20px", cursor:"pointer", background:TH.bgInput, marginBottom:16,
            }}>
              <span style={{color:TH.accent, display:"flex"}}><Icon name="arrowUp" size={26} /></span>
              <span style={{fontSize:14, fontWeight:600, color:TH.text}}>{L.chooseCsv || "Choose a CSV file"}</span>
              <span style={{fontSize:11.5, color:TH.textMuted, textAlign:"center", maxWidth:340, lineHeight:1.5}}>
                {L.csvHint || "Comma, semicolon or tab separated. The first row must be a header. Existing items are matched by code or name and updated."}
              </span>
              <input type="file" accept=".csv,.tsv,.txt,text/csv" onChange={onFile} style={{display:"none"}} />
            </label>

            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap"}}>
              <button onClick={downloadTemplate} style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.accentText, padding:"9px 15px", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6}}>
                <Icon name="arrowDown" size={13} />{L.downloadTemplate || "Download template"}
              </button>
              <div style={{fontSize:11, color:TH.textDim}}>
                {L.recognisedCols || "Recognised columns"}: {FIELDS.map(f => f.key).join(', ')}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div>
            <div style={{display:"flex", gap:10, marginBottom:16, flexWrap:"wrap"}}>
              <Chip TH={TH} label={L.fileLbl || "File"} value={fileName} />
              <Chip TH={TH} label={L.rowsLbl || "Rows"} value={dataRows.length} />
              <Chip TH={TH} label={L.validLbl || "Valid"} value={valid.length} ok />
              {invalid > 0 && <Chip TH={TH} label={L.skippedLbl || "Skipped"} value={invalid} warn />}
            </div>

            <div style={{fontSize:10, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:".1em", marginBottom:9}}>
              {L.columnMapping || "Column mapping"}
            </div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:10, marginBottom:18}}>
              {FIELDS.map(f => (
                <div key={f.key}>
                  <div style={{fontSize:11, fontWeight:600, color: f.key === 'name' ? TH.accent : TH.text, marginBottom:4}}>
                    {f.label}{f.key === 'name' ? ' *' : ''}
                  </div>
                  <select value={mapping[f.key] ?? ''} onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                    style={{...inp(TH), padding:"7px 10px", fontSize:12}}>
                    <option value="">— {L.notMapped || "not mapped"} —</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i+1}`}</option>)}
                  </select>
                  <div style={{fontSize:9.5, color:TH.textDim, marginTop:3}}>{f.hint}</div>
                </div>
              ))}
            </div>

            <div style={{fontSize:10, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:".1em", marginBottom:9}}>
              {L.preview || "Preview"} · {L.firstRows || "first 5 rows"}
            </div>
            <div style={{border:`1px solid ${TH.border}`, borderRadius:9, overflow:"auto", marginBottom:16, maxHeight:220}}>
              <table style={{width:"100%", borderCollapse:"collapse", fontSize:11.5}}>
                <thead>
                  <tr>{FIELDS.filter(f => mapping[f.key] !== undefined).map(f => (
                    <th key={f.key} style={{background:TH.bgInput, color:TH.textMuted, fontSize:9.5, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", padding:"8px 10px", textAlign:"start", whiteSpace:"nowrap", borderBottom:`1px solid ${TH.border}`}}>{f.label}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {mapped.slice(0,5).map((r, i) => (
                    <tr key={i} style={{borderBottom:`1px solid ${TH.divider}`, opacity: r.name ? 1 : .45}}>
                      {FIELDS.filter(f => mapping[f.key] !== undefined).map(f => (
                        <td key={f.key} style={{padding:"7px 10px", color: f.key === 'name' ? TH.text : TH.textMuted, whiteSpace:"nowrap"}}>
                          {r[f.key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalid > 0 && (
              <div style={{background:TH.warnBg, border:`1px solid ${TH.warn}44`, borderRadius:9, padding:"11px 13px", color:TH.warn, fontSize:12, marginBottom:14}}>
                {invalid} {L.rowsNoName || "row(s) have no name and will be skipped."}
              </div>
            )}
            {error && <div style={{background:TH.dangerBg, border:`1px solid ${TH.danger}55`, borderRadius:9, padding:"11px 13px", color:TH.danger, fontSize:12.5, marginBottom:14}}>{error}</div>}

            <div style={{display:"flex", justifyContent:"space-between", gap:8, paddingTop:14, borderTop:`1px solid ${TH.divider}`}}>
              <button onClick={() => { setStep(1); setRaw([]); setError(null); }} disabled={busy}
                style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6}}>
                <Icon name="arrowLeft" size={13} />{L.back || "Back"}
              </button>
              <button onClick={run} disabled={busy || valid.length === 0} style={{
                background:TH.deep, border:`1px solid ${TH.deepBorder}`, borderRadius:9,
                color:TH.onDeep, padding:"10px 22px", cursor:"pointer", fontSize:13, fontWeight:700,
                fontFamily:"inherit", opacity:(busy || !valid.length) ? .5 : 1,
              }}>{busy ? (L.importing || "Importing…") : `${L.importLbl || "Import"} ${valid.length} ${L.itemsLbl || "items"}`}</button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && result && (
          <div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18}}>
              <Res TH={TH} label={L.createdLbl || "Created"} value={result.inserted} color={TH.ok} />
              <Res TH={TH} label={L.updatedLbl || "Updated"} value={result.updated} color={TH.info} />
              <Res TH={TH} label={L.errorsLbl || "Errors"} value={(result.errors || []).length}
                color={(result.errors || []).length ? TH.danger : TH.textMuted} />
            </div>

            {(result.errors || []).length > 0 && (
              <div style={{border:`1px solid ${TH.danger}44`, borderRadius:9, overflow:"auto", maxHeight:220, marginBottom:16}}>
                {result.errors.map((e, i) => (
                  <div key={i} style={{padding:"9px 12px", borderBottom:`1px solid ${TH.divider}`, fontSize:11.5}}>
                    <div style={{color:TH.danger, fontWeight:600}}>{e.error}</div>
                    <div style={{color:TH.textDim, fontFamily:"ui-monospace,monospace", fontSize:10, marginTop:3}}>
                      {JSON.stringify(e.row)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{background:TH.okBg, border:`1px solid ${TH.ok}44`, borderRadius:9, padding:"12px 14px", color:TH.ok, fontSize:12.5, marginBottom:16}}>
              {L.importDone || "Import finished. New items start at zero stock — use Receive to bring quantities in."}
            </div>

            <div style={{display:"flex", justifyContent:"flex-end", gap:8, paddingTop:14, borderTop:`1px solid ${TH.divider}`}}>
              <button onClick={() => { setStep(1); setRaw([]); setResult(null); setFileName(""); }}
                style={{background:"transparent", border:`1px solid ${TH.border}`, borderRadius:9, color:TH.textMuted, padding:"10px 18px", cursor:"pointer", fontSize:13, fontFamily:"inherit"}}>
                {L.importAnother || "Import another file"}
              </button>
              <button onClick={() => onDone?.()} style={{
                background:TH.deep, border:`1px solid ${TH.deepBorder}`, borderRadius:9,
                color:TH.onDeep, padding:"10px 22px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit",
              }}>{L.done || "Done"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ TH, label, value, ok, warn }) {
  const c = ok ? TH.ok : warn ? TH.warn : TH.textMuted;
  return (
    <div style={{background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"7px 12px"}}>
      <span style={{fontSize:9.5, fontWeight:700, color:TH.textDim, textTransform:"uppercase", letterSpacing:".08em"}}>{label} </span>
      <span style={{fontSize:12.5, fontWeight:700, color:c, marginInlineStart:4}}>{value}</span>
    </div>
  );
}
function Res({ TH, label, value, color }) {
  return (
    <div style={{background:TH.bgInput, borderInlineStart:`3px solid ${color}`, padding:"13px 15px"}}>
      <div style={{fontSize:9.5, fontWeight:700, color:TH.textMuted, textTransform:"uppercase", letterSpacing:".1em", marginBottom:5}}>{label}</div>
      <div style={{fontFamily:"'Playfair Display',Georgia,serif", fontSize:24, fontWeight:500, color, lineHeight:1}}>{value}</div>
    </div>
  );
}
function inp(TH) {
  return { width:"100%", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:8, padding:"9px 12px", color:TH.text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
}
