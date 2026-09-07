// ═══════════════════════════════════════════════════════════════════
// warehouseUtils.js — Warehouse shared constants + helpers
// ═══════════════════════════════════════════════════════════════════

const GOLD       = '#C9A960';
const GOLD_LIGHT = '#D4B876';
const GOLD_DARK  = '#8B7A44';
const GRAY       = '#8f8f8f';

export const ASSET_KINDS = {
  equipment: { label: 'Equipment', icon: 'factory', prefix: 'EQP' },
  tool:      { label: 'Tool',      icon: 'wrench',  prefix: 'TOL' },
  vehicle:   { label: 'Vehicle',   icon: 'car',     prefix: 'VHC' },
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
  register:  { label: 'Registered',   icon: 'plus', dir: 'in',  color: GOLD_LIGHT },
  restock:   { label: 'Stock IN',     icon: 'arrowDown',  dir: 'in',  color: '#5DCAA5' },
  issue:     { label: 'Issued OUT',   icon: 'arrowUp',  dir: 'out', color: '#EF9F27' },
  checkout:  { label: 'Checked OUT',  icon: 'arrowUp',  dir: 'out', color: '#EF9F27' },
  checkin:   { label: 'Checked IN',   icon: 'returnIn',  dir: 'in',  color: '#5DCAA5' },
  transfer:  { label: 'Transferred',  icon: 'transfer',  dir: 'move', color: GOLD },
  service:   { label: 'Service',      icon: 'wrench', dir: 'move', color: GRAY },
  damage:    { label: 'Damaged',      icon: 'warning',  dir: 'out', color: '#d67373' },
  loss:      { label: 'Loss',         icon: 'close',  dir: 'out', color: '#d67373' },
  found:     { label: 'Found',        icon: 'check',  dir: 'in',  color: GOLD },
  retire:    { label: 'Retired',      icon: 'box',  dir: 'out', color: '#5c5c5c' },
  adjustment:{ label: 'Adjustment',   icon: 'transfer',  dir: 'move', color: GRAY },
};

// ─── Destination taxonomy: where the stock is GOING or COMING FROM ─
// destination_type on the movement row picks which sub-selector applies
export const DESTINATION_TYPES = {
  pool:        { label_en: 'For a pool',              label_fa: 'برای استخر',           label_he: 'לבריכה',           icon: '🏊' },
  department:  { label_en: 'For a department',         label_fa: 'برای یک بخش',          label_he: 'למחלקה',            icon: '👥' },
  inspection:  { label_en: 'For an inspection issue',  label_fa: 'برای یک بازرسی',       label_he: 'לביקורת',           icon: '🔍' },
  supplier:    { label_en: 'From a supplier',          label_fa: 'از تأمین‌کننده',        label_he: 'מספק',              icon: '🏢' },
  transfer:    { label_en: 'Warehouse transfer',       label_fa: 'انتقال بین انبار',      label_he: 'העברה בין מחסנים',   icon: 'transfer' },
  adjustment:  { label_en: 'Stock count correction',   label_fa: 'اصلاح موجودی',         label_he: 'תיקון מלאי',        icon: 'transfer' },
  waste:       { label_en: 'Damaged / Lost / Expired', label_fa: 'خسارت / گم شدن / انقضاء', label_he: 'נזק / אובדן / פג', icon: '🗑' },
  other:       { label_en: 'Other',                    label_fa: 'موارد دیگر',           label_he: 'אחר',               icon: '•' },
};

// ─── Departments taxonomy ────────────────────────────────────────
export const DEPARTMENTS = [
  { key: 'maintenance',  label_en: 'Maintenance',       label_fa: 'تعمیرات',          label_he: 'תחזוקה',      icon: 'wrench' },
  { key: 'housekeeping', label_en: 'Housekeeping',      label_fa: 'خانه‌داری',         label_he: 'משק בית',     icon: '🧹' },
  { key: 'pool_ops',     label_en: 'Pool operations',   label_fa: 'عملیات استخر',      label_he: 'תפעול בריכה', icon: '🏊' },
  { key: 'beach',        label_en: 'Beach',             label_fa: 'ساحل',             label_he: 'חוף',        icon: '🏖' },
  { key: 'fnb',          label_en: 'F&B',               label_fa: 'غذا و نوشیدنی',      label_he: 'מזון ומשקאות', icon: '🍽' },
  { key: 'landscaping',  label_en: 'Landscaping',       label_fa: 'محوطه‌سازی',        label_he: 'גינון',       icon: '🌿' },
  { key: 'front_desk',   label_en: 'Front desk',        label_fa: 'پذیرش',            label_he: 'קבלה',       icon: '🛎' },
  { key: 'security',     label_en: 'Security',          label_fa: 'حراست',            label_he: 'אבטחה',      icon: '🛡' },
  { key: 'kids_club',    label_en: 'Kids club',         label_fa: 'کلاب کودکان',       label_he: 'מועדון ילדים', icon: '🎈' },
  { key: 'spa_wellness', label_en: 'Spa / Wellness',    label_fa: 'اسپا / سلامت',      label_he: 'ספא',        icon: '💆' },
  { key: 'admin',        label_en: 'Administration',    label_fa: 'اداری',            label_he: 'הנהלה',      icon: '📋' },
  { key: 'other',        label_en: 'Other',             label_fa: 'سایر',             label_he: 'אחר',        icon: '•' },
];

export function deptLabel(key, lang) {
  const d = DEPARTMENTS.find(x => x.key === key);
  if (!d) return key;
  return lang === 'fa' ? d.label_fa : lang === 'he' ? d.label_he : d.label_en;
}
export function destTypeLabel(key, lang) {
  const d = DESTINATION_TYPES[key];
  if (!d) return key;
  return lang === 'fa' ? d.label_fa : lang === 'he' ? d.label_he : d.label_en;
}

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

// Compose a human-readable "destination" string from a movement row
export function describeDestination(m, lang = 'en') {
  if (!m) return '—';
  if (m.destination_pool_code)      return `🏊 ${m.destination_pool_code}`;
  if (m.destination_department)     return `${DEPARTMENTS.find(d=>d.key===m.destination_department)?.icon || '👥'} ${deptLabel(m.destination_department, lang)}`;
  if (m.destination_inspection_no)  return `🔍 ${m.destination_inspection_no}`;
  if (m.supplier_name)              return `🏢 ${m.supplier_name}`;
  if (m.destination_other)          return `• ${m.destination_other}`;
  if (m.destination_type)           return destTypeLabel(m.destination_type, lang);
  return '—';
}

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
