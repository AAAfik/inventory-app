// ═══════════════════════════════════════════════════════════════════
// poolUtils.js — Pool Control constants, formatters, dosage math
// ═══════════════════════════════════════════════════════════════════

export const POOL_TYPES = {
 main:  { label: 'Main pool',  color: '#B8935A' },
 kids:  { label: 'Kids pool',  color: '#D4A853' },
 jacuzzi: { label: 'Jacuzzi',  color: '#8B7040' },
 spa:  { label: 'Spa',  color: '#A89566' },
 plunge:  { label: 'Plunge pool',  color: '#7BB3D4' },
 indoor:  { label: 'Indoor pool',  color: '#8f8f8f' },
};

export const CHEMICAL_PURPOSES = {
 sanitizer:  { label: 'Sanitizer',  color: '#B8935A' },
 ph_up:  { label: 'pH raiser',  color: '#D4A853' },
 ph_down:  { label: 'pH lowerer', color: '#8B7040' },
 algaecide:  { label: 'Algaecide',  color: '#7BB3D4' },
 clarifier:  { label: 'Clarifier',  color: '#A89566' },
 stabilizer: { label: 'Stabilizer', color: '#8f8f8f' },
 shock:  { label: 'Shock',  color: '#B8862C' },
};

export const CLARITY_OPTIONS = {
 clear:  { label: 'Clear',  color: '#B8935A' },
 cloudy: { label: 'Cloudy', color: '#D4A853' },
 green:  { label: 'Green',  color: '#8B7040' },
 turbid: { label: 'Turbid', color: '#8f8f8f' },
};

// Recommended dose for a chemical given pool volume (m³)
export function recommendedDose(chemical, volumeM3) {
 if (!chemical?.dosage_per_m3 || !volumeM3) return 0;
 return Math.round(Number(chemical.dosage_per_m3) * Number(volumeM3) * 100) / 100;
}

export function estimatedCost(chemical, qty) {
 if (!chemical?.unit_cost || !qty) return 0;
 return Math.round(Number(chemical.unit_cost) * Number(qty) * 100) / 100;
}

// pH status assessment (7.2-7.6 ideal)
export function phStatus(ph) {
 if (ph == null || ph === '') return null;
 const n = Number(ph);
 if (isNaN(n))  return null;
 if (n < 7.0)  return { label: 'Too low',  color: '#8f8f8f', urgent: true };
 if (n < 7.2)  return { label: 'Low',  color: '#8B7040', urgent: true };
 if (n <= 7.6)  return { label: 'Ideal',  color: '#B8935A', urgent: false };
 if (n <= 7.8)  return { label: 'High',  color: '#D4A853', urgent: false };
 return  { label: 'Too high', color: '#8f8f8f', urgent: true };
}

// Chlorine status (1-3 ppm ideal)
export function chlorineStatus(ppm) {
 if (ppm == null || ppm === '') return null;
 const n = Number(ppm);
 if (isNaN(n))  return null;
 if (n < 0.5)  return { label: 'Too low',  color: '#8f8f8f', urgent: true };
 if (n < 1.0)  return { label: 'Low',  color: '#8B7040', urgent: true };
 if (n <= 3.0)  return { label: 'Ideal',  color: '#B8935A', urgent: false };
 if (n <= 5.0)  return { label: 'High',  color: '#D4A853', urgent: false };
 return  { label: 'Too high', color: '#8f8f8f', urgent: true };
}

export function fmtQty(qty, unit) {
 if (qty == null) return '—';
 return `${Number(qty).toLocaleString('en-GB', { maximumFractionDigits: 2 })} ${unit || ''}`.trim();
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
export function fmtDate(s) {
 if (!s) return '—';
 return new Date(s).toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'2-digit' });
}

export async function nextTreatmentNo(supabase) {
 const year = new Date().getFullYear();
 const search = `PT-${year}-`;
 const { data } = await supabase.from('pool_treatments').select('treatment_no')
 .like('treatment_no', `${search}%`).order('treatment_no', { ascending: false }).limit(1);
 let next = 1;
 if (data?.length) {
 const n = parseInt(data[0].treatment_no.slice(search.length), 10);
 if (!isNaN(n)) next = n + 1;
 }
 return search + String(next).padStart(5, '0');
}
