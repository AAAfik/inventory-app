// ═══════════════════════════════════════════════════════════════════
// inspectionUtils.js — constants for inspection module (gold theme)
// ═══════════════════════════════════════════════════════════════════

const GOLD       = '#C9A960';
const GOLD_DARK  = '#8B7A44';
const GOLD_LIGHT = '#D4B876';
const CREAM      = '#F4EFE4';
const GRAY       = '#8f8f8f';
const GRAY_DIM   = '#5c5c5c';

export const INSPECTION_STATUS = {
  ok:            { label: 'OK',                icon: '✓', color: GOLD,       severity: 0 },
  minor_issue:   { label: 'Minor issue',       icon: '•', color: GOLD_LIGHT, severity: 1 },
  major_issue:   { label: 'Major issue',       icon: '!', color: GOLD_DARK,  severity: 2 },
  critical:      { label: 'Critical',          icon: '!!', color: GRAY,      severity: 3 },
  needs_repair:  { label: 'Needs repair',      icon: '⚙', color: GOLD_DARK,  severity: 2 },
  fixed:         { label: 'Fixed / Resolved',  icon: '✓', color: GOLD,       severity: 0 },
};

export const INSPECTION_CATEGORIES = {
  pool:       { label: 'Pool',        icon: '🏊' },
  kitchen:    { label: 'Kitchen',     icon: '🍳' },
  hvac:       { label: 'HVAC / AC',   icon: '❄️' },
  electrical: { label: 'Electrical',  icon: '⚡' },
  laundry:    { label: 'Laundry',     icon: '🧺' },
  wellness:   { label: 'Wellness',    icon: '💪' },
  exterior:   { label: 'Exterior',    icon: '🌴' },
  security:   { label: 'Security',    icon: '🎥' },
  lobby:      { label: 'Lobby',       icon: '🛎️' },
  other:      { label: 'Other',       icon: '📋' },
};

export function severityColor(sev) {
  const n = Number(sev) || 0;
  if (n >= 3) return GRAY;         // critical / high
  if (n >= 2) return GOLD_DARK;    // medium
  if (n >= 1) return GOLD_LIGHT;   // low
  return GOLD;                     // OK
}

export function formatDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
export function formatDateShort(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
}

export async function nextInspectionNo(supabase) {
  const year = new Date().getFullYear();
  const search = `INS-${year}-`;
  const { data } = await supabase.from('inspections').select('inspection_no').like('inspection_no', `${search}%`).order('inspection_no', { ascending: false }).limit(1);
  let next = 1;
  if (data?.length) {
    const n = parseInt(data[0].inspection_no.slice(search.length), 10);
    if (!isNaN(n)) next = n + 1;
  }
  return search + String(next).padStart(5, '0');
}
