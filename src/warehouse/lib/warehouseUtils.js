// ═══════════════════════════════════════════════════════════════════
// warehouseUtils.js — Warehouse 2.0 shared constants + helpers
// ═══════════════════════════════════════════════════════════════════

const GOLD       = '#B8935A';
const GOLD_LIGHT = '#D4A853';
const GOLD_DARK  = '#8B7040';
const GRAY       = '#8f8f8f';

export const ASSET_KINDS = {
  equipment: { label: 'Equipment', icon: '🏭', prefix: 'EQP' },
  tool:      { label: 'Tool',      icon: '🔧', prefix: 'TOL' },
  vehicle:   { label: 'Vehicle',   icon: '🚗', prefix: 'VHC' },
};

export const ASSET_STATUS = {
  available:   { label: 'Available',    color: GOLD },
  checked_out: { label: 'Checked out',  color: GOLD_DARK },
  in_service:  { label: 'In service',   color: GRAY },
  damaged:     { label: 'Damaged',      color: GRAY },
  lost:        { label: 'Lost',         color: GRAY },
  retired:     { label: 'Retired',      color: '#5c5c5c' },
};

export const MOVEMENT_TYPES = {
  register:  { label: 'Registered',  icon: '➕' },
  checkout:  { label: 'Checked out', icon: '↗' },
  checkin:   { label: 'Checked in',  icon: '↩' },
  transfer:  { label: 'Transferred', icon: '⇄' },
  service:   { label: 'Service',     icon: '🔧' },
  damage:    { label: 'Damage',      icon: '⚠' },
  found:     { label: 'Found',       icon: '✓' },
  retire:    { label: 'Retired',     icon: '⏹' },
};

export function fmtDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
}
export function fmtDateTime(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
export function fmtMoney(n, cur = 'EUR') {
  if (n == null || n === '') return '—';
  const sym = cur === 'EUR' ? '€' : cur === 'USD' ? '$' : cur === 'TRY' ? '₺' : cur + ' ';
  return sym + Number(n).toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

// Days until date (negative = overdue)
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((d - now) / 86400000);
}

export function isOverdue(dateStr) {
  const d = daysUntil(dateStr);
  return d !== null && d < 0;
}

export function serviceStatus(asset) {
  if (!asset.next_service_date) return null;
  const d = daysUntil(asset.next_service_date);
  if (d < 0)  return { label: `Service overdue ${-d}d`, color: GRAY, urgent: true };
  if (d <= 7) return { label: `Service in ${d}d`, color: GOLD_DARK, urgent: true };
  if (d <= 30) return { label: `Service in ${d}d`, color: GOLD_LIGHT, urgent: false };
  return null;
}

export async function nextAssetNo(supabase, kind) {
  const prefix = (ASSET_KINDS[kind]?.prefix || 'AST');
  const year = new Date().getFullYear();
  const search = `${prefix}-${year}-`;
  const { data } = await supabase.from('assets').select('asset_no').like('asset_no', `${search}%`).order('asset_no', { ascending: false }).limit(1);
  let next = 1;
  if (data?.length) {
    const n = parseInt(data[0].asset_no.slice(search.length), 10);
    if (!isNaN(n)) next = n + 1;
  }
  return search + String(next).padStart(5, '0');
}

// Compress an image File before upload (max 1600px, JPEG q0.82)
export function compressImage(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })) : reject(new Error('compress failed')),
        'image/jpeg', quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
    img.src = url;
  });
}
