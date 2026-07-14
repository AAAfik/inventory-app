// ═══════════════════════════════════════════════════════════════════
// warehouseUtils.js — constants & helpers (Caesar palette: gold/white/black)
// ═══════════════════════════════════════════════════════════════════

// Caesar palette — only gold shades + neutrals
const GOLD       = '#C9A960';
const GOLD_DARK  = '#8B7A44';
const GOLD_LIGHT = '#D4B876';
const CREAM      = '#F4EFE4';
const GRAY       = '#8f8f8f';
const GRAY_DIM   = '#5c5c5c';

export const ASSET_KINDS = {
  equipment: { label: 'Equipment', icon: '🏭', color: GOLD,      description: 'Industrial machines, generators, HVAC, pumps' },
  tool:      { label: 'Tool',      icon: '🔧', color: GOLD_LIGHT, description: 'Drills, ladders, measuring tools, portable equipment' },
  vehicle:   { label: 'Vehicle',   icon: '🚗', color: GOLD_DARK,  description: 'Cars, trucks, golf carts, buggies' },
};

export const ASSET_STATUS = {
  available:    { label: 'Available',    color: GOLD },
  checked_out:  { label: 'Checked out',  color: GOLD_LIGHT },
  in_service:   { label: 'In service',   color: GOLD_DARK },
  retired:      { label: 'Retired',      color: GRAY_DIM },
  lost:         { label: 'Lost',         color: GRAY },
};

export const MOVEMENT_TYPES = {
  checkout:      { label: 'Checked out',       icon: '↗', color: GOLD_LIGHT },
  checkin:       { label: 'Returned',          icon: '↩', color: GOLD },
  transfer:      { label: 'Transferred',       icon: '⇄', color: GOLD_DARK },
  service_start: { label: 'Sent for service',  icon: '🔧', color: GOLD_DARK },
  service_end:   { label: 'Back from service', icon: '✓',  color: GOLD },
  retire:        { label: 'Retired',           icon: '⊗',  color: GRAY_DIM },
};

export function formatDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function formatDateShort(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
}

export function formatMoney(amt, currency = 'EUR') {
  const symbols = { EUR: '€', USD: '$', TRY: '₺', GBP: '£' };
  const sym = symbols[currency] || currency + ' ';
  return sym + (Number(amt) || 0).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export async function nextAssetNo(supabase, kind) {
  const prefix = kind === 'vehicle' ? 'VHC' : kind === 'tool' ? 'TOL' : 'EQP';
  const year = new Date().getFullYear();
  const search = `${prefix}-${year}-`;
  const { data } = await supabase.from('assets').select('asset_no').like('asset_no', `${search}%`).order('asset_no', { ascending: false }).limit(1);
  let next = 1;
  if (data && data.length > 0) {
    const n = parseInt(data[0].asset_no.slice(search.length), 10);
    if (!isNaN(n)) next = n + 1;
  }
  return search + String(next).padStart(5, '0');
}
