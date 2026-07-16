// ═══════════════════════════════════════════════════════════════════
// inspectionUtils.js — categories, subcategories, priorities, PDF export
// ═══════════════════════════════════════════════════════════════════

const GOLD       = '#C9A960';
const GOLD_LIGHT = '#D4B876';
const GOLD_DARK  = '#8B7A44';
const CREAM      = '#F4EFE4';
const GRAY       = '#8f8f8f';
const GRAY_DIM   = '#5c5c5c';

export const INSPECTION_STATUS = {
  ok:            { label: 'OK',                icon: '✓',  color: GOLD,       severity: 0 },
  minor_issue:   { label: 'Minor issue',       icon: '•',  color: GOLD_LIGHT, severity: 1 },
  major_issue:   { label: 'Major issue',       icon: '!',  color: GOLD_DARK,  severity: 2 },
  critical:      { label: 'Critical',          icon: '!!', color: GRAY,       severity: 3 },
  needs_repair:  { label: 'Needs repair',      icon: '⚙',  color: GOLD_DARK,  severity: 2 },
  fixed:         { label: 'Fixed / Resolved',  icon: '✓',  color: GOLD,       severity: 0 },
};

export const PRIORITY = {
  low:      { label: 'Low',      color: '#A89566', dot: '●' },
  medium:   { label: 'Medium',   color: '#D4B876', dot: '●●' },
  high:     { label: 'High',     color: '#B8862C', dot: '●●●' },
  critical: { label: 'Critical', color: '#8f8f8f', dot: '⚠' },
};

// Category taxonomy — fixed structure
export const CATEGORIES = {
  electrical: {
    label: 'Electrical',
    icon: '⚡',
    color: '#D4B876',
    subcategories: {
      wiring_method:   'Wiring method / installation',
      wiring_material: 'Wiring material / cables',
      equipment:       'Electrical equipment',
    },
    // Two authoritative safety references we surface for this category
    warnings: [
      {
        text: 'De-energize circuits and verify absence of voltage before any inspection or work.',
        source: 'IEC 60364-4-41 · Low-voltage electrical installations — Protection for safety',
        url: 'https://webstore.iec.ch/publication/61894',
      },
      {
        text: 'Only qualified persons may perform work on or near exposed energized parts. Follow lockout/tagout and wear rated PPE.',
        source: 'NFPA 70E · Standard for Electrical Safety in the Workplace',
        url: 'https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70E',
      },
    ],
  },
  water: {
    label: 'Water',
    icon: '💧',
    color: '#7BB3D4',
    subcategories: {
      piping:    'Plumbing / piping',
      material:  'Pipe material',
      equipment: 'Water equipment',
    },
  },
  sewage: {
    label: 'Sewage',
    icon: '🚱',
    color: '#8B7A44',
    subcategories: {
      equipment: 'Sewage equipment (overall)',
    },
  },
  structure: {
    label: 'Structure',
    icon: '🏗️',
    color: '#C9A960',
    subcategories: {
      standards: 'Building standards',
      material:  'Construction material',
    },
  },
  mechanical: {
    label: 'Mechanical',
    icon: '⚙️',
    color: '#A89566',
    subcategories: {
      general: 'General mechanical',
    },
  },
  hse: {
    label: 'HSE',
    icon: '🛡️',
    color: '#D4B876',
    subcategories: {
      general: 'Health, Safety & Environment',
    },
  },
};

export function severityColor(sev) {
  const n = Number(sev) || 0;
  if (n >= 3) return GRAY;
  if (n >= 2) return GOLD_DARK;
  if (n >= 1) return GOLD_LIGHT;
  return GOLD;
}

export function priorityColor(p) {
  return PRIORITY[p]?.color || GRAY;
}

export function formatDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}
export function formatDateShort(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'2-digit' });
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

// ═══════════════════════════════════════════════════════════════════
// PDF EXPORT — opens a printable HTML window; user uses Ctrl+P → Save as PDF
// Supports English + Hebrew (RTL)
// ═══════════════════════════════════════════════════════════════════

const PDF_L = {
  en: {
    caesar: 'CAESAR PROJECTS', report: 'Inspection Report',
    inspectionNo: 'Inspection No.', date: 'Date', priority: 'Priority', status: 'Status',
    category: 'Category', subcategory: 'Subcategory', property: 'Property', area: 'Area', location: 'Location',
    inspector: 'Inspector', companion: 'Accompanied by', reportedBy: 'Reported by',
    reportBlock: 'Report', findings: 'Findings & observations',
    actionRequired: 'Action required', resolution: 'Resolution', resolvedOn: 'Resolved on',
    photos: 'Photographs', photo: 'Photo', of: 'of',
    priorityLow: 'Low', priorityMedium: 'Medium', priorityHigh: 'High', priorityCritical: 'Critical',
    statusOk: 'OK', statusMinor: 'Minor issue', statusMajor: 'Major issue',
    statusCritical: 'Critical', statusRepair: 'Needs repair', statusFixed: 'Fixed / Resolved',
    footer: 'This document was generated by the Caesar Projects Inspection System.',
    page: 'Page',
    signature: 'Inspector signature', chief: 'Chief signature', dateSigned: 'Date',
    safety: 'Applicable safety references',
    dir: 'ltr',
  },
  he: {
    caesar: 'קיסר פרויקטים', report: 'דוח ביקורת',
    inspectionNo: 'מספר ביקורת', date: 'תאריך', priority: 'עדיפות', status: 'סטטוס',
    category: 'קטגוריה', subcategory: 'תת-קטגוריה', property: 'מתחם', area: 'אזור', location: 'מיקום',
    inspector: 'מבקר', companion: 'ליווה אותו', reportedBy: 'דווח על ידי',
    reportBlock: 'דוח', findings: 'ממצאים ותצפיות',
    actionRequired: 'נדרשת פעולה', resolution: 'פתרון', resolvedOn: 'טופל בתאריך',
    photos: 'תמונות', photo: 'תמונה', of: 'מתוך',
    priorityLow: 'נמוכה', priorityMedium: 'בינונית', priorityHigh: 'גבוהה', priorityCritical: 'קריטית',
    statusOk: 'תקין', statusMinor: 'תקלה קלה', statusMajor: 'תקלה חמורה',
    statusCritical: 'קריטי', statusRepair: 'דורש תיקון', statusFixed: 'טופל',
    footer: 'מסמך זה הופק על ידי מערכת הביקורות של קיסר פרויקטים.',
    page: 'עמוד',
    signature: 'חתימת המבקר', chief: 'חתימת האחראי', dateSigned: 'תאריך',
    safety: 'הפניות בטיחות רלוונטיות',
    dir: 'rtl',
  },
  fa: {
    caesar: 'مجموعه سزار', report: 'گزارش بازرسی',
    inspectionNo: 'شماره بازرسی', date: 'تاریخ', priority: 'اولویت', status: 'وضعیت',
    category: 'دسته', subcategory: 'زیردسته', property: 'مجتمع', area: 'محدوده', location: 'مکان',
    inspector: 'بازرس', companion: 'همراه بازرس', reportedBy: 'گزارش‌دهنده',
    reportBlock: 'گزارش', findings: 'یافته‌ها و مشاهدات',
    actionRequired: 'اقدام لازم', resolution: 'راه‌حل', resolvedOn: 'رفع در تاریخ',
    photos: 'عکس‌ها', photo: 'عکس', of: 'از',
    priorityLow: 'کم', priorityMedium: 'متوسط', priorityHigh: 'زیاد', priorityCritical: 'بحرانی',
    statusOk: 'سالم', statusMinor: 'مشکل جزئی', statusMajor: 'مشکل جدی',
    statusCritical: 'بحرانی', statusRepair: 'نیاز به تعمیر', statusFixed: 'رفع شد',
    footer: 'این مدرک توسط سیستم بازرسی مجموعه سزار تولید شده است.',
    page: 'صفحه',
    signature: 'امضای بازرس', chief: 'امضای مسئول', dateSigned: 'تاریخ',
    safety: 'الزامات ایمنی مرتبط',
    dir: 'rtl',
  },
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function openInspectionPDF(inspection, ctx = {}, langCode = 'en') {
  const L = PDF_L[langCode] || PDF_L.en;
  const lang = langCode;
  const rtl = L.dir === 'rtl';
  const property = ctx.property?.name || inspection.property_id || '—';
  const area = ctx.area?.name || '—';
  const categoryMeta = CATEGORIES[inspection.category] || null;
  const subcategoryLabel = categoryMeta?.subcategories?.[inspection.subcategory] || inspection.subcategory || '—';
  const statusMap = {
    ok: L.statusOk, minor_issue: L.statusMinor, major_issue: L.statusMajor,
    critical: L.statusCritical, needs_repair: L.statusRepair, fixed: L.statusFixed,
  };
  const priorityMap = {
    low: L.priorityLow, medium: L.priorityMedium, high: L.priorityHigh, critical: L.priorityCritical,
  };
  const priorityColorMap = { low:'#A89566', medium:'#D4B876', high:'#B8862C', critical:'#8f8f8f' };

  const photos = inspection.photos || [];
  const inspectorName = inspection.inspector_display_name || inspection.inspector_email || '—';
  const companion = inspection.companion_name || null;
  const _visitDate = inspection.visit_at || inspection.visit_date || inspection.created_at;
  const _locale = lang === 'he' ? 'he-IL' : 'en-GB';
  const dateStr = new Date(_visitDate).toLocaleString(_locale, { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });

  const html = `<!doctype html>
<html lang="${lang}" dir="${L.dir}">
<head>
<meta charset="utf-8" />
<title>${esc(inspection.inspection_no)} — ${esc(inspection.title)}</title>
<style>
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ${rtl ? "'Heebo', 'Arial Hebrew', Arial, sans-serif" : "'Inter', 'Helvetica Neue', Arial, sans-serif"};
    color: #111;
    background: #fff;
    font-size: 11pt;
    line-height: 1.5;
  }
  .header {
    display: flex; align-items: flex-start; justify-content: space-between;
    border-bottom: 3px solid #C9A960; padding-bottom: 10px; margin-bottom: 18px;
  }
  .brand { font-family: 'Playfair Display', Georgia, serif; font-size: 20pt; color: #8B7A44; font-weight: 700; letter-spacing: 0.02em; }
  .brand-sub { font-size: 9pt; color: #8B7A44; letter-spacing: 0.3em; font-weight: 600; }
  .report-title { font-family: 'Playfair Display', Georgia, serif; font-size: 22pt; color: #111; margin: 4px 0; font-weight: 700; }
  .report-no { font-family: monospace; font-size: 10pt; color: #666; }

  .meta {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 20px;
    background: #FAF6EC; border: 1px solid #E6DFCC; border-radius: 6px;
    padding: 12px 14px; margin-bottom: 16px;
  }
  .meta > div { font-size: 10pt; }
  .meta-label { font-size: 8pt; color: #8B7A44; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 2px; }
  .meta-value { color: #111; font-weight: 500; }

  .badges { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .badge { padding: 4px 10px; border-radius: 4px; font-size: 9pt; font-weight: 700; color: #fff; }

  .section-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 14pt; color: #8B7A44; margin: 18px 0 8px;
    border-bottom: 1px solid #E6DFCC; padding-bottom: 4px;
  }
  .prose { white-space: pre-wrap; line-height: 1.6; color: #222; font-size: 10.5pt; }

  .action-box { background: #FFF8E1; border-left: 4px solid #C9A960; padding: 10px 14px; border-radius: 3px; margin: 10px 0; }
  .resolution-box { background: #F0FAF0; border-left: 4px solid #6B9E3A; padding: 10px 14px; border-radius: 3px; margin: 10px 0; }
  .safety-box { background: #FFF4E6; border: 1px solid #E5B166; border-radius: 6px; padding: 12px 14px; margin: 10px 0; }
  .safety-title { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; color: #8B5A00; margin-bottom: 6px; }
  .safety-item { font-size: 10pt; margin-bottom: 8px; }
  .safety-src { font-size: 9pt; color: #666; }

  .photos-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
    page-break-inside: auto;
  }
  .photo-item { page-break-inside: avoid; break-inside: avoid; text-align: center; }
  .photo-item img { width: 100%; height: 130mm; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
  .photo-caption { font-size: 9pt; color: #666; margin-top: 4px; }

  .signatures {
    display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px;
    page-break-inside: avoid;
  }
  .sig-block { border-top: 1px solid #999; padding-top: 6px; }
  .sig-label { font-size: 9pt; color: #666; }
  .sig-name { font-size: 11pt; font-weight: 600; margin-top: 2px; }

  .footer { position: running(footer); font-size: 8pt; color: #999; text-align: center; padding-top: 8px; border-top: 1px solid #eee; }
  @page { @bottom-center { content: element(footer); } }

  .print-toolbar { position: fixed; top: 10px; ${rtl ? 'left' : 'right'}: 10px; background: #C9A960; color: #000; padding: 8px 14px; border-radius: 6px; font-family: sans-serif; font-size: 11pt; font-weight: 700; z-index: 999; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
  .print-toolbar button { background: #000; color: #fff; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-weight: 700; margin-${rtl ? 'right' : 'left'}: 8px; }
  @media print {
    .print-toolbar { display: none; }
  }
</style>
</head>
<body>
  <div class="print-toolbar">
    ${lang === 'he' ? 'שמור כ־PDF' : 'Save as PDF'}
    <button onclick="window.print()">${lang === 'he' ? 'הדפס' : 'Print / PDF'}</button>
  </div>

  <div class="header">
    <div>
      <div class="brand-sub">CAESAR</div>
      <div class="brand">${esc(L.caesar)}</div>
    </div>
    <div style="text-align: ${rtl ? 'left' : 'right'};">
      <div class="report-no">${esc(inspection.inspection_no)}</div>
      <div style="font-size: 10pt; color: #666;">${esc(dateStr)}</div>
    </div>
  </div>

  <div class="brand-sub" style="margin-bottom: 4px;">${esc(L.report)}</div>
  <div class="report-title">${esc(inspection.title || '—')}</div>

  <div class="badges">
    ${inspection.priority ? `<span class="badge" style="background:${priorityColorMap[inspection.priority] || '#666'};">${esc(L.priority)}: ${esc(priorityMap[inspection.priority] || inspection.priority)}</span>` : ''}
    ${inspection.status ? `<span class="badge" style="background:#8B7A44;">${esc(L.status)}: ${esc(statusMap[inspection.status] || inspection.status)}</span>` : ''}
    ${categoryMeta ? `<span class="badge" style="background:${categoryMeta.color};color:#111;">${categoryMeta.icon} ${esc(categoryMeta.label)}</span>` : ''}
  </div>

  <div class="meta">
    <div><div class="meta-label">${esc(L.date)}</div><div class="meta-value">${esc(dateStr)}</div></div>
    <div><div class="meta-label">${esc(L.property)}</div><div class="meta-value">${esc(property)}</div></div>
    <div><div class="meta-label">${esc(L.area)}</div><div class="meta-value">${esc(area)}</div></div>
    <div><div class="meta-label">${esc(L.category)}</div><div class="meta-value">${categoryMeta ? categoryMeta.icon + ' ' + esc(categoryMeta.label) : '—'}</div></div>
    <div><div class="meta-label">${esc(L.subcategory)}</div><div class="meta-value">${esc(subcategoryLabel)}</div></div>
    ${inspection.location_note ? `<div><div class="meta-label">${esc(L.location)}</div><div class="meta-value">${esc(inspection.location_note)}</div></div>` : ''}
    <div><div class="meta-label">${esc(L.inspector)}</div><div class="meta-value">${esc(inspectorName)}</div></div>
    ${companion ? `<div><div class="meta-label">${esc(L.companion)}</div><div class="meta-value">${esc(companion)}</div></div>` : ''}
  </div>

  ${inspection.report ? `
    <div class="section-title">${esc(L.findings)}</div>
    <div class="prose">${esc(inspection.report)}</div>
  ` : ''}

  ${inspection.action_required ? `
    <div class="section-title">${esc(L.actionRequired)}</div>
    <div class="action-box">${esc(inspection.action_required)}</div>
  ` : ''}

  ${inspection.resolution_note ? `
    <div class="section-title">${esc(L.resolution)}${inspection.resolved_at ? ` — <span style="font-size:10pt;font-weight:400;">${esc(L.resolvedOn)}: ${esc(new Date(inspection.resolved_at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB'))}</span>` : ''}</div>
    <div class="resolution-box">${esc(inspection.resolution_note)}</div>
  ` : ''}

  ${categoryMeta?.warnings?.length ? `
    <div class="section-title">${esc(L.safety)}</div>
    <div class="safety-box">
      ${categoryMeta.warnings.map(w => `
        <div class="safety-item">
          ⚠️ ${esc(w.text)}
          <div class="safety-src">— ${esc(w.source)}</div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${photos.length ? `
    <div class="section-title">${esc(L.photos)} (${photos.length})</div>
    <div class="photos-grid">
      ${photos.map((url, i) => `
        <div class="photo-item">
          <img src="${esc(url)}" alt="${esc(L.photo)} ${i+1}" />
          <div class="photo-caption">${esc(L.photo)} ${i+1} ${esc(L.of)} ${photos.length}</div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-label">${esc(L.signature)}</div>
      <div class="sig-name">${esc(inspectorName)}</div>
    </div>
    ${companion ? `
      <div class="sig-block">
        <div class="sig-label">${esc(L.chief)} / ${esc(L.companion)}</div>
        <div class="sig-name">${esc(companion)}</div>
      </div>
    ` : `
      <div class="sig-block">
        <div class="sig-label">${esc(L.chief)}</div>
        <div class="sig-name">&nbsp;</div>
      </div>
    `}
  </div>

  <div style="margin-top: 40px; text-align: center; font-size: 8pt; color: #999; border-top: 1px solid #eee; padding-top: 8px;">
    ${esc(L.footer)}
  </div>

  <script>
    // Wait for images to load before enabling print
    let imgs = document.images, count = imgs.length, loaded = 0;
    if (count === 0) return;
    for (let i = 0; i < count; i++) {
      if (imgs[i].complete) { loaded++; }
      else {
        imgs[i].onload = imgs[i].onerror = () => { loaded++; };
      }
    }
  </script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) {
    alert(langCode === 'he' ? 'הדפדפן חסם את החלון. אנא אפשר חלונות קופצים.' : 'Popup was blocked. Please allow popups.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// ═══════════════════════════════════════════════════════════════════
// openLocationPDF — combined report of ALL inspections in one visit/location
// Cover page + one section per inspection, page-breaks between them
// ═══════════════════════════════════════════════════════════════════
export function openLocationPDF(inspections, ctx = {}, langCode = 'en') {
  if (!inspections || inspections.length === 0) return;
  if (inspections.length === 1) {
    return openInspectionPDF(inspections[0], ctx, langCode);
  }

  const L    = PDF_L[langCode] || PDF_L.en;
  const lang = langCode;
  const rtl  = L.dir === 'rtl';
  const locale = lang === 'he' ? 'he-IL' : 'en-GB';

  const first = inspections[0];
  const property = ctx.property?.name || first.property_id || '—';
  const area     = ctx.area?.name || '—';
  const locNote  = first.location_note || '';

  // Collect unique inspectors + companions
  const inspectorSet = new Set();
  const companionSet = new Set();
  inspections.forEach(i => {
    const n = i.inspector_display_name || i.inspector_email;
    if (n) inspectorSet.add(n);
    if (i.companion_name) companionSet.add(i.companion_name);
  });
  const inspectorsStr = [...inspectorSet].join(', ') || '—';
  const companionsStr = [...companionSet].join(', ');

  // Date range
  const dates = inspections.map(i => new Date(i.visit_at || i.visit_date || i.created_at));
  const minD = new Date(Math.min(...dates));
  const maxD = new Date(Math.max(...dates));
  const dateStr = minD.toDateString() === maxD.toDateString()
    ? minD.toLocaleString(locale, { year:'numeric', month:'short', day:'2-digit' })
    : `${minD.toLocaleDateString(locale)} — ${maxD.toLocaleDateString(locale)}`;

  const statusMap = {
    ok: L.statusOk, minor_issue: L.statusMinor, major_issue: L.statusMajor,
    critical: L.statusCritical, needs_repair: L.statusRepair, fixed: L.statusFixed,
  };
  const priorityMap = {
    low: L.priorityLow, medium: L.priorityMedium, high: L.priorityHigh, critical: L.priorityCritical,
  };
  const priorityColorMap = { low:'#A89566', medium:'#D4B876', high:'#B8862C', critical:'#8f8f8f' };

  // Priority summary counts
  const pCounts = { critical:0, high:0, medium:0, low:0, none:0 };
  inspections.forEach(i => { pCounts[i.priority || 'none'] = (pCounts[i.priority || 'none']||0) + 1; });

  // ─── Per-inspection section HTML ──────────────────────────────
  function renderSection(inspection, idx) {
    const categoryMeta = CATEGORIES[inspection.category] || null;
    const subcategoryLabel = categoryMeta?.subcategories?.[inspection.subcategory] || inspection.subcategory || '—';
    const photos = inspection.photos || [];
    const inspectorName = inspection.inspector_display_name || inspection.inspector_email || '—';
    const companion     = inspection.companion_name || null;
    const _visitDate    = inspection.visit_at || inspection.visit_date || inspection.created_at;
    const _dateStr      = new Date(_visitDate).toLocaleString(locale, { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });

    return `
      <div class="inspection-section ${idx === 0 ? '' : 'page-break-before'}">
        <div class="section-header">
          <div class="section-index">${lang === 'he' ? 'ממצא' : lang === 'fa' ? 'مورد' : 'Finding'} ${idx + 1} / ${inspections.length}</div>
          <div class="report-no">${esc(inspection.inspection_no || '')}</div>
        </div>

        <div class="report-title-sub">${esc(inspection.title || '—')}</div>

        <div class="badges">
          ${inspection.priority ? `<span class="badge" style="background:${priorityColorMap[inspection.priority] || '#666'};">${esc(L.priority)}: ${esc(priorityMap[inspection.priority] || inspection.priority)}</span>` : ''}
          ${inspection.status ? `<span class="badge" style="background:#8B7A44;">${esc(L.status)}: ${esc(statusMap[inspection.status] || inspection.status)}</span>` : ''}
          ${categoryMeta ? `<span class="badge" style="background:${categoryMeta.color};color:#111;">${categoryMeta.icon} ${esc(categoryMeta.label)}</span>` : ''}
        </div>

        <div class="meta">
          <div><div class="meta-label">${esc(L.date)}</div><div class="meta-value">${esc(_dateStr)}</div></div>
          <div><div class="meta-label">${esc(L.category)}</div><div class="meta-value">${categoryMeta ? categoryMeta.icon + ' ' + esc(categoryMeta.label) : '—'}</div></div>
          <div><div class="meta-label">${esc(L.subcategory)}</div><div class="meta-value">${esc(subcategoryLabel)}</div></div>
          <div><div class="meta-label">${esc(L.inspector)}</div><div class="meta-value">${esc(inspectorName)}</div></div>
          ${companion ? `<div><div class="meta-label">${esc(L.companion)}</div><div class="meta-value">${esc(companion)}</div></div>` : ''}
          ${inspection.location_note ? `<div><div class="meta-label">${esc(L.location)}</div><div class="meta-value">${esc(inspection.location_note)}</div></div>` : ''}
        </div>

        ${inspection.report ? `
          <div class="section-title">${esc(L.findings)}</div>
          <div class="prose">${esc(inspection.report)}</div>
        ` : ''}

        ${inspection.action_required ? `
          <div class="section-title">${esc(L.actionRequired)}</div>
          <div class="action-box">${esc(inspection.action_required)}</div>
        ` : ''}

        ${inspection.resolution_note ? `
          <div class="section-title">${esc(L.resolution)}${inspection.resolved_at ? ` — <span style="font-size:10pt;font-weight:400;">${esc(L.resolvedOn)}: ${esc(new Date(inspection.resolved_at).toLocaleDateString(locale))}</span>` : ''}</div>
          <div class="resolution-box">${esc(inspection.resolution_note)}</div>
        ` : ''}

        ${categoryMeta?.warnings?.length ? `
          <div class="section-title">${esc(L.safety)}</div>
          <div class="safety-box">
            ${categoryMeta.warnings.map(w => `
              <div class="safety-item">
                ⚠️ ${esc(w.text)}
                <div class="safety-src">— ${esc(w.source)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${photos.length ? `
          <div class="section-title">${esc(L.photos)} (${photos.length})</div>
          <div class="photos-grid">
            ${photos.map((url, i) => `
              <div class="photo-item">
                <img src="${esc(url)}" alt="${esc(L.photo)} ${i+1}" />
                <div class="photo-caption">${esc(L.photo)} ${i+1} ${esc(L.of)} ${photos.length}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  // ─── Cover summary table row ─────────────────────────────────
  const summaryLbl = lang === 'he' ? 'סיכום ממצאים' : lang === 'fa' ? 'خلاصه ممیزی' : 'Findings summary';
  const noLbl      = lang === 'he' ? 'מס\'' : lang === 'fa' ? 'ش' : '#';
  const titleLbl   = lang === 'he' ? 'כותרת' : lang === 'fa' ? 'عنوان' : 'Title';
  const catLbl     = L.category;
  const priLbl     = L.priority;
  const statLbl    = L.status;
  const combinedRptLbl = lang === 'he' ? 'דוח משולב' : lang === 'fa' ? 'گزارش تجمیعی' : 'Combined report';
  const totalLbl   = lang === 'he' ? 'סך תקלות' : lang === 'fa' ? 'کل موارد' : 'Total findings';

  const html = `<!doctype html>
<html lang="${lang}" dir="${L.dir}">
<head>
<meta charset="utf-8" />
<title>${esc(property)} — ${combinedRptLbl}</title>
<style>
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ${rtl ? "'Heebo', 'Arial Hebrew', Arial, sans-serif" : "'Inter', 'Helvetica Neue', Arial, sans-serif"};
    color: #111; background: #fff; font-size: 11pt; line-height: 1.5;
  }
  .header {
    display: flex; align-items: flex-start; justify-content: space-between;
    border-bottom: 3px solid #C9A960; padding-bottom: 10px; margin-bottom: 18px;
  }
  .brand { font-family: 'Playfair Display', Georgia, serif; font-size: 20pt; color: #8B7A44; font-weight: 700; letter-spacing: 0.02em; }
  .brand-sub { font-size: 9pt; color: #8B7A44; letter-spacing: 0.3em; font-weight: 600; }
  .report-title { font-family: 'Playfair Display', Georgia, serif; font-size: 24pt; color: #111; margin: 6px 0; font-weight: 700; }
  .report-title-sub { font-family: 'Playfair Display', Georgia, serif; font-size: 16pt; color: #111; margin: 6px 0 10px; font-weight: 600; }
  .report-no { font-family: monospace; font-size: 10pt; color: #666; }
  .cover-caption { color: #8B7A44; font-size: 11pt; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 4px; }

  .meta {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 20px;
    background: #FAF6EC; border: 1px solid #E6DFCC; border-radius: 6px;
    padding: 12px 14px; margin-bottom: 16px;
  }
  .meta > div { font-size: 10pt; }
  .meta-label { font-size: 8pt; color: #8B7A44; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 2px; }
  .meta-value { color: #111; font-weight: 500; }

  .badges { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .badge { padding: 4px 10px; border-radius: 4px; font-size: 9pt; font-weight: 700; color: #fff; }

  .section-title { font-family: 'Playfair Display', Georgia, serif; font-size: 14pt; color: #8B7A44; margin: 18px 0 8px; border-bottom: 1px solid #E6DFCC; padding-bottom: 4px; }
  .prose { white-space: pre-wrap; line-height: 1.6; color: #222; font-size: 10.5pt; }
  .action-box { background: #FFF8E1; border-left: 4px solid #C9A960; padding: 10px 14px; border-radius: 3px; margin: 10px 0; }
  .resolution-box { background: #F0FAF0; border-left: 4px solid #6B9E3A; padding: 10px 14px; border-radius: 3px; margin: 10px 0; }
  .safety-box { background: #FFF4E6; border: 1px solid #E5B166; border-radius: 6px; padding: 12px 14px; margin: 10px 0; }
  .safety-item { font-size: 10pt; margin-bottom: 8px; }
  .safety-src { font-size: 9pt; color: #666; }

  .summary-table { width: 100%; border-collapse: collapse; margin: 12px 0 4px; font-size: 10pt; }
  .summary-table th { background: #FAF6EC; color: #8B7A44; font-size: 9pt; text-transform: uppercase; letter-spacing: .06em; padding: 8px 10px; text-align: ${rtl ? 'right' : 'left'}; border-bottom: 2px solid #E6DFCC; }
  .summary-table td { padding: 8px 10px; border-bottom: 1px solid #EEE7D6; vertical-align: top; }
  .summary-table tr:last-child td { border-bottom: none; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 9pt; font-weight: 700; color: #fff; }

  .priority-summary { display: flex; gap: 10px; margin: 10px 0 16px; flex-wrap: wrap; }
  .p-chip { padding: 6px 12px; border-radius: 6px; font-size: 10pt; font-weight: 700; color: #fff; }

  .photos-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; page-break-inside: auto; }
  .photo-item { page-break-inside: avoid; break-inside: avoid; text-align: center; }
  .photo-item img { width: 100%; height: 130mm; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
  .photo-caption { font-size: 9pt; color: #666; margin-top: 4px; }

  .section-header { display: flex; justify-content: space-between; align-items: baseline; margin-top: 10px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #C9A960; }
  .section-index { font-family: 'Playfair Display', Georgia, serif; font-size: 13pt; color: #8B7A44; font-weight: 700; letter-spacing: 0.04em; }

  .inspection-section { padding-top: 6px; }
  .page-break-before { page-break-before: always; break-before: page; }

  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; page-break-inside: avoid; }
  .sig-block { border-top: 1px solid #999; padding-top: 6px; }
  .sig-label { font-size: 9pt; color: #666; }
  .sig-name { font-size: 11pt; font-weight: 600; margin-top: 2px; }

  .print-toolbar { position: fixed; top: 10px; ${rtl ? 'left' : 'right'}: 10px; background: #C9A960; color: #000; padding: 8px 14px; border-radius: 6px; font-family: sans-serif; font-size: 11pt; font-weight: 700; z-index: 999; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
  .print-toolbar button { background: #000; color: #fff; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-weight: 700; margin-${rtl ? 'right' : 'left'}: 8px; }
  @media print { .print-toolbar { display: none; } }
</style>
</head>
<body>
  <div class="print-toolbar">
    ${lang === 'he' ? 'שמור כ־PDF' : lang === 'fa' ? 'ذخیره PDF' : 'Save as PDF'}
    <button onclick="window.print()">${lang === 'he' ? 'הדפס' : lang === 'fa' ? 'چاپ' : 'Print / PDF'}</button>
  </div>

  <!-- ═════════ COVER PAGE ═════════ -->
  <div class="header">
    <div>
      <div class="brand-sub">CAESAR</div>
      <div class="brand">${esc(L.caesar)}</div>
    </div>
    <div style="text-align: ${rtl ? 'left' : 'right'};">
      <div style="font-size: 10pt; color: #666;">${esc(dateStr)}</div>
    </div>
  </div>

  <div class="cover-caption">${esc(combinedRptLbl)}</div>
  <div class="report-title">📍 ${esc(property)}${area && area !== '—' ? ` <span style="color:#8B7A44;font-weight:500;">· ${esc(area)}</span>` : ''}</div>
  ${locNote ? `<div style="font-size:11pt;color:#666;font-style:italic;margin-bottom:12px;">${esc(locNote)}</div>` : ''}

  <div class="meta">
    <div><div class="meta-label">${esc(L.date)}</div><div class="meta-value">${esc(dateStr)}</div></div>
    <div><div class="meta-label">${esc(L.inspector)}</div><div class="meta-value">${esc(inspectorsStr)}</div></div>
    ${companionsStr ? `<div><div class="meta-label">${esc(L.companion)}</div><div class="meta-value">${esc(companionsStr)}</div></div>` : ''}
    <div><div class="meta-label">${esc(totalLbl)}</div><div class="meta-value" style="font-size:14pt;font-weight:700;color:#8B7A44;">${inspections.length}</div></div>
  </div>

  <!-- Priority chips -->
  <div class="priority-summary">
    ${pCounts.critical ? `<span class="p-chip" style="background:${priorityColorMap.critical};">${esc(priorityMap.critical)}: ${pCounts.critical}</span>` : ''}
    ${pCounts.high     ? `<span class="p-chip" style="background:${priorityColorMap.high};">${esc(priorityMap.high)}: ${pCounts.high}</span>` : ''}
    ${pCounts.medium   ? `<span class="p-chip" style="background:${priorityColorMap.medium};color:#111;">${esc(priorityMap.medium)}: ${pCounts.medium}</span>` : ''}
    ${pCounts.low      ? `<span class="p-chip" style="background:${priorityColorMap.low};">${esc(priorityMap.low)}: ${pCounts.low}</span>` : ''}
  </div>

  <div class="section-title">${esc(summaryLbl)}</div>
  <table class="summary-table">
    <thead>
      <tr>
        <th style="width:40px;">${esc(noLbl)}</th>
        <th>${esc(titleLbl)}</th>
        <th style="width:120px;">${esc(catLbl)}</th>
        <th style="width:80px;">${esc(priLbl)}</th>
        <th style="width:110px;">${esc(statLbl)}</th>
      </tr>
    </thead>
    <tbody>
      ${inspections.map((ins, idx) => {
        const cm = CATEGORIES[ins.category] || null;
        return `
          <tr>
            <td style="font-weight:700;color:#8B7A44;">${idx + 1}</td>
            <td>
              <div style="font-weight:600;">${esc(ins.title || '—')}</div>
              <div style="font-family:monospace;font-size:8pt;color:#999;margin-top:2px;">${esc(ins.inspection_no || '')}</div>
            </td>
            <td>${cm ? `${cm.icon} ${esc(cm.label)}` : '—'}</td>
            <td>${ins.priority ? `<span class="pill" style="background:${priorityColorMap[ins.priority]};${ins.priority==='medium'?'color:#111;':''}">${esc(priorityMap[ins.priority])}</span>` : '—'}</td>
            <td>${ins.status ? esc(statusMap[ins.status] || ins.status) : '—'}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <!-- ═════════ ONE SECTION PER INSPECTION ═════════ -->
  ${inspections.map((ins, idx) => renderSection(ins, idx)).join('')}

  <!-- ═════════ SIGNATURES ═════════ -->
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-label">${esc(L.signature)}</div>
      <div class="sig-name">${esc(inspectorsStr)}</div>
    </div>
    <div class="sig-block">
      <div class="sig-label">${esc(L.chief)}${companionsStr ? ' / ' + esc(L.companion) : ''}</div>
      <div class="sig-name">${companionsStr ? esc(companionsStr) : '&nbsp;'}</div>
    </div>
  </div>

  <div style="margin-top: 40px; text-align: center; font-size: 8pt; color: #999; border-top: 1px solid #eee; padding-top: 8px;">
    ${esc(L.footer)}
  </div>

  <script>
    let imgs = document.images, count = imgs.length, loaded = 0;
    if (count === 0) return;
    for (let i = 0; i < count; i++) {
      if (imgs[i].complete) { loaded++; }
      else { imgs[i].onload = imgs[i].onerror = () => { loaded++; }; }
    }
  </script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) {
    alert(langCode === 'he' ? 'הדפדפן חסם את החלון. אנא אפשר חלונות קופצים.' :
          langCode === 'fa' ? 'مرورگر پنجره را مسدود کرد. لطفاً پاپ‌آپ‌ها را مجاز کنید.' :
          'Popup was blocked. Please allow popups.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
