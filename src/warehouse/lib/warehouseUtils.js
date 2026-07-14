// ═══════════════════════════════════════════════════════════════════
// warehouseUtils.js — constants & helpers for warehouse module
// ═══════════════════════════════════════════════════════════════════

export const ASSET_KINDS = {
  equipment: { label: 'Equipment',  icon: '🏭', color: '#C9A960', description: 'Industrial machines, generators, HVAC, pumps' },
  tool:      { label: 'Tool',       icon: '🔧', color: '#0891B2', description: 'Drills, ladders, measuring tools, portable equipment' },
  vehicle:   { label: 'Vehicle',    icon: '🚗', color: '#8B7A44', description: 'Cars, trucks, golf carts, buggies' },
};

export const ASSET_STATUS = {
  available:    { label: 'Available',    color: '#10b981' },
  checked_out:  { label: 'Checked out',  color: '#f59e0b' },
  in_service:   { label: 'In service',   color: '#3b82f6' },
  retired:      { label: 'Retired',      color: '#6b7280' },
  lost:         { label: 'Lost',         color: '#ef4444' },
};

export const MOVEMENT_TYPES = {
  checkout:      { label: 'Checked out',    icon: '↗', color: '#f59e0b' },
  checkin:       { label: 'Returned',       icon: '↩', color: '#10b981' },
  transfer:      { label: 'Transferred',    icon: '⇄', color: '#3b82f6' },
  service_start: { label: 'Sent for service', icon: '🔧', color: '#3b82f6' },
  service_end:   { label: 'Back from service', icon: '✓', color: '#10b981' },
  retire:        { label: 'Retired',        icon: '⊗', color: '#6b7280' },
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

// Generate next asset_no: AST-YYYY-NNNNN
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
