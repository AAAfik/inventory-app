// ═══════════════════════════════════════════════════════════════════════
// poolUtils.js — Pool Control constants + dosage math + formatters
// ═══════════════════════════════════════════════════════════════════════

const GOLD       = '#C9A960';
const GOLD_LIGHT = '#D4B876';
const GOLD_DARK  = '#8B7A44';
const BLUE       = '#7BB3D4';
const GRAY       = '#8f8f8f';

export const POOL_TYPES = {
  main:    { label: 'Main pool',   icon: '🏊', color: GOLD },
  kids:    { label: 'Kids pool',   icon: '🩱', color: GOLD_LIGHT },
  jacuzzi: { label: 'Jacuzzi',     icon: '🛁', color: GOLD_DARK },
  spa:     { label: 'Spa',         icon: '💆', color: GOLD_DARK },
  plunge:  { label: 'Plunge pool', icon: '💧', color: BLUE },
  indoor:  { label: 'Indoor pool', icon: '🏛️', color: GRAY },
};

export const CHEMICAL_PURPOSES = {
  sanitizer:  { label: 'Sanitizer',   icon: '🧪', color: '#C9A960' },
  ph_up:      { label: 'pH raiser',   icon: '⬆️', color: '#D4B876' },
  ph_down:    { label: 'pH lowerer',  icon: '⬇️', color: '#8B7A44' },
  algaecide:  { label: 'Algaecide',   icon: '🌿', color: '#7BB3D4' },
  clarifier:  { label: 'Clarifier',   icon: '💎', color: '#A89566' },
  stabilizer: { label: 'Stabilizer',  icon: '⚖️', color: '#8f8f8f' },
  shock:      { label: 'Shock',       icon: '⚡', color: '#B8862C' },
};

export const CLARITY_OPTIONS = {
  clear:   { label: 'Clear',   color: GOLD },
  cloudy:  { label: 'Cloudy',  color: GOLD_LIGHT },
  green:   { label: 'Green',   color: GOLD_DARK },
  turbid:  { label: 'Turbid',  color: GRAY },
};

// Recommended dose for a chemical given pool volume
export function recommendedDose(chemical, volumeM3) {
  if (!chemical?.dosage_per_m3 || !volumeM3) return null;
  return +(Number(chemical.dosage_per_m3) * Number(volumeM3)).toFixed(2);
}

// Estimated cost for a chemical dose
export function estimatedCost(chemical, qty) {
  if (!chemical?.unit_cost || !qty) return null;
  return +(Number(chemical.unit_cost) * Number(qty)).toFixed(2);
}

// pH range assessment
export function phStatus(ph) {
  if (ph == null) return null;
  const n = Number(ph);
  if (n < 7.0)         return { label: 'Too low',  color: GRAY,       urgent: true };
  if (n < 7.2)         return { label: 'Low',      color: GOLD_DARK,  urgent: true };
  if (n <= 7.6)        return { label: 'Ideal',    color: GOLD,       urgent: false };
  if (n <= 7.8)        return { label: 'High',     color: GOLD_LIGHT, urgent: false };
  return                      { label: 'Too high', color: GRAY,       urgent: true };
}

export function chlorineStatus(ppm) {
  if (ppm == null) return null;
  const n = Number(ppm);
  if (n < 0.5)  return { label: 'Too low',  color: GRAY,      urgent: true };
  if (n < 1.0)  return { label: 'Low',      color: GOLD_DARK, urgent: true };
  if (n <= 3.0) return { label: 'Ideal',    color: GOLD,      urgent: false };
  if (n <= 5.0) return { label: 'High',     color: GOLD_LIGHT, urgent: false };
  return               { label: 'Too high', color: GRAY,      urgent: true };
}

export function fmtQty(qty, unit) {
  if (qty == null) return '—';
  return `${Number(qty).toLocaleString('en-GB', { maximumFractionDigits: 2 })} ${unit || ''}`;
}

export function fmtMoney(n, cur = 'EUR') {
  if (n == null || n === '') return '—';
  const sym = cur === 'EUR' ? '€' : cur === 'USD' ? '$' : cur === 'TRY' ? '₺' : cur + ' ';
  return sym + Number(n).toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

export function fmtDateTime(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}

export async function nextTreatmentNo(supabase) {
  const year = new Date().getFullYear();
  const search = `PT-${year}-`;
  const { data } = await supabase.from('pool_treatments').select('treatment_no').like('treatment_no', `${search}%`).order('treatment_no', { ascending: false }).limit(1);
  let next = 1;
  if (data?.length) {
    const n = parseInt(data[0].treatment_no.slice(search.length), 10);
    if (!isNaN(n)) next = n + 1;
  }
  return search + String(next).padStart(5, '0');
}
