// ═══════════════════════════════════════════════════════════════════
// inspectionUtils.js — categories, subcategories, priorities, PDF export
// AFIK-style corporate report layout (Element/Detail tables, dashboard,
// per-finding sections with photos, risk matrix)
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
  critical: { label: 'Critical', color: '#C43D3D', dot: '⚠' },
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
    color: '#9B8A5C',
    subcategories: {
      equipment: 'Mechanical equipment',
      supports:  'Supports / mounting',
    },
  },
  // The following categories were introduced by the HSE seed import; they
  // do not have sub-taxonomies but must display in the PDF/list without
  // falling back to the raw slug.
  HSE:            { label: 'HSE',            icon: '🛡',  color: '#B8862C', subcategories: {} },
  Electrical:     { label: 'Electrical',     icon: '⚡',  color: '#D4B876', subcategories: {} },
  Mechanical:     { label: 'Mechanical',     icon: '⚙️', color: '#9B8A5C', subcategories: {} },
  Infrastructure: { label: 'Infrastructure', icon: '🏗️', color: '#C9A960', subcategories: {} },
  Operational:    { label: 'Operational',    icon: '📋', color: '#8B7A44', subcategories: {} },
  'Pool Assessment': { label: 'Pool Assessment', icon: '🏊', color: '#7BB3D4', subcategories: {} },
  Proposal:       { label: 'Proposal',       icon: '📐', color: '#8B7A44', subcategories: {} },
  Reference:      { label: 'Reference',      icon: '📚', color: '#666666', subcategories: {} },
};

export function severityColor(sev) {
  if (sev >= 4) return '#C43D3D';
  if (sev >= 3) return '#E67A2C';
  if (sev >= 2) return '#D4B876';
  if (sev >= 1) return '#A89566';
  return GOLD;
}
export function priorityColor(p) {
  return PRIORITY[p]?.color || GRAY;
}

export function formatDate(s) {
  if (!s) return '';
  return new Date(s).toLocaleString('en-GB', { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}
export function formatDateShort(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-GB');
}

export async function nextInspectionNo(supabase) {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const search = `INS-${y}${m}${d}-`;
  const { data } = await supabase
    .from('inspections')
    .select('inspection_no')
    .ilike('inspection_no', `${search}%`)
    .order('inspection_no', { ascending: false })
    .limit(1);
  let next = 1;
  if (data && data[0]) {
    const n = parseInt(data[0].inspection_no.slice(search.length), 10);
    if (!isNaN(n)) next = n + 1;
  }
  return search + String(next).padStart(5, '0');
}

// ═══════════════════════════════════════════════════════════════════
// PDF EXPORT — AFIK-style corporate engineering report
// Opens a printable HTML window; user uses Ctrl+P → Save as PDF
// Supports English + Hebrew (RTL) + Farsi (RTL)
// ═══════════════════════════════════════════════════════════════════

const PDF_L = {
  en: {
    dir: 'ltr',
    caesar: 'CAESAR PROJECTS',
    afikGroup: 'AFIK GROUP',
    programTitle: 'Engineering Assessment & Risk Reduction Program',
    reportType: 'Engineering Assessment & Risk-Reduction Report',
    disciplines: 'Electrical · Mechanical · Infrastructure · HSE',
    // Cover
    coverProjectLbl: 'Project',
    coverPreparedForLbl: 'Prepared For',
    coverDocRefLbl: 'Document Reference',
    coverRevisionLbl: 'Revision',
    coverDateLbl: 'Date',
    coverClassificationLbl: 'Classification',
    coverClassificationVal: 'Internal Management Review',
    coverReportTypeLbl: 'Report Type',
    coverFieldLbl: 'Field',
    coverDetailLbl: 'Detail',
    // Dashboard
    dashTitle: 'Executive Dashboard',
    dashBySeverity: 'Findings by Severity',
    dashByDiscipline: 'Findings by Discipline',
    dashHeadline: 'Headline Message',
    dashDisciplineLbl: 'Discipline',
    dashFindingsLbl: 'Findings',
    dashHighestSevLbl: 'Highest Severity',
    total: 'Total',
    // Section titles
    sectionExecSummary: 'Executive Summary',
    sectionFindings: 'Findings',
    sectionRiskMatrix: 'Risk Assessment Matrix',
    sectionActionPlan: 'Priority Action Plan',
    sectionRecActions: 'Recommended Corrective Actions',
    sectionConclusion: 'Conclusion',
    sectionSummaryTable: 'Findings Summary',
    // Element/Detail table
    elemLbl: 'Element',
    detailLbl: 'Detail',
    elemObserved: 'Observed Evidence',
    elemImpact: 'Technical Impact',
    elemRisk: 'Risk Description',
    elemProbable: 'Probable Cause',
    elemConfirmed: 'Confirmed Cause',
    elemAction: 'Recommended Action',
    // Meta
    report: 'Inspection Report',
    inspectionNo: 'Inspection No.', date: 'Date', priority: 'Priority', status: 'Status',
    severity: 'Severity',
    category: 'Category', subcategory: 'Subcategory', property: 'Property', area: 'Area', location: 'Location',
    inspector: 'Inspector', companion: 'Accompanied by', reportedBy: 'Reported by',
    reportBlock: 'Report',
    actionRequired: 'Action Required',
    resolution: 'Resolution', resolvedOn: 'Resolved on',
    photos: 'Photographs', photo: 'Photo', of: 'of', evidence: 'Evidence',
    priorityLow: 'Low', priorityMedium: 'Medium', priorityHigh: 'High', priorityCritical: 'Critical',
    statusOk: 'OK', statusMinor: 'Minor issue', statusMajor: 'Major issue',
    statusCritical: 'Critical', statusRepair: 'Needs repair', statusFixed: 'Fixed / Resolved',
    finding: 'Finding',
    // Risk matrix headers
    riskRef: 'Ref', riskFinding: 'Finding', riskOverall: 'Overall',
    priority1: 'Priority 1 — Immediate Life-Safety',
    priority2: 'Priority 2 — Urgent Risk Reduction',
    priority3: 'Priority 3 — Infrastructure Protection',
    priority4: 'Priority 4 — Standardization & Optimization',
    // Footers
    footerBrand: 'AFIK Group · HSE · Engineering Assessment',
    footerClassification: 'Internal Management Review',
    page: 'Page',
    signature: 'Inspector signature', chief: 'Chief signature', dateSigned: 'Date',
    safety: 'Applicable Safety References',
  },
  he: {
    dir: 'rtl',
    caesar: 'קיסר פרויקטים',
    afikGroup: 'קבוצת אפיק',
    programTitle: 'תוכנית הערכה הנדסית והפחתת סיכונים',
    reportType: 'דוח הערכה הנדסית והפחתת סיכונים',
    disciplines: 'חשמל · מכניקה · תשתיות · בטיחות',
    coverProjectLbl: 'פרויקט',
    coverPreparedForLbl: 'הוכן עבור',
    coverDocRefLbl: 'מספר מסמך',
    coverRevisionLbl: 'גרסה',
    coverDateLbl: 'תאריך',
    coverClassificationLbl: 'סיווג',
    coverClassificationVal: 'סקירה ניהולית פנימית',
    coverReportTypeLbl: 'סוג דוח',
    coverFieldLbl: 'שדה',
    coverDetailLbl: 'פרט',
    dashTitle: 'לוח מחוונים ניהולי',
    dashBySeverity: 'ממצאים לפי חומרה',
    dashByDiscipline: 'ממצאים לפי תחום',
    dashHeadline: 'מסר מרכזי',
    dashDisciplineLbl: 'תחום',
    dashFindingsLbl: 'ממצאים',
    dashHighestSevLbl: 'חומרה מרבית',
    total: 'סה"כ',
    sectionExecSummary: 'תקציר מנהלים',
    sectionFindings: 'ממצאים',
    sectionRiskMatrix: 'מטריצת הערכת סיכונים',
    sectionActionPlan: 'תוכנית פעולה לפי עדיפות',
    sectionRecActions: 'פעולות מתקנות מומלצות',
    sectionConclusion: 'סיכום',
    sectionSummaryTable: 'סיכום ממצאים',
    elemLbl: 'רכיב',
    detailLbl: 'פרט',
    elemObserved: 'ראיות שנצפו',
    elemImpact: 'השפעה טכנית',
    elemRisk: 'תיאור סיכון',
    elemProbable: 'סיבה סבירה',
    elemConfirmed: 'סיבה מאושרת',
    elemAction: 'פעולה מומלצת',
    report: 'דוח ביקורת',
    inspectionNo: 'מספר ביקורת', date: 'תאריך', priority: 'עדיפות', status: 'סטטוס',
    severity: 'חומרה',
    category: 'קטגוריה', subcategory: 'תת-קטגוריה', property: 'מתחם', area: 'אזור', location: 'מיקום',
    inspector: 'מבקר', companion: 'ליווה אותו', reportedBy: 'דווח על ידי',
    reportBlock: 'דוח',
    actionRequired: 'נדרשת פעולה',
    resolution: 'פתרון', resolvedOn: 'טופל בתאריך',
    photos: 'תמונות', photo: 'תמונה', of: 'מתוך', evidence: 'ראיות',
    priorityLow: 'נמוכה', priorityMedium: 'בינונית', priorityHigh: 'גבוהה', priorityCritical: 'קריטית',
    statusOk: 'תקין', statusMinor: 'תקלה קלה', statusMajor: 'תקלה חמורה',
    statusCritical: 'קריטי', statusRepair: 'דורש תיקון', statusFixed: 'טופל',
    finding: 'ממצא',
    riskRef: 'מס\'', riskFinding: 'ממצא', riskOverall: 'כולל',
    priority1: 'עדיפות 1 — מיידי בטיחות חיים',
    priority2: 'עדיפות 2 — הפחתת סיכון דחופה',
    priority3: 'עדיפות 3 — הגנת תשתית',
    priority4: 'עדיפות 4 — סטנדרטיזציה ואופטימיזציה',
    footerBrand: 'קבוצת אפיק · HSE · הערכה הנדסית',
    footerClassification: 'סקירה ניהולית פנימית',
    page: 'עמוד',
    signature: 'חתימת המבקר', chief: 'חתימת האחראי', dateSigned: 'תאריך',
    safety: 'הפניות בטיחות רלוונטיות',
  },
  fa: {
    dir: 'rtl',
    caesar: 'مجموعه سزار',
    afikGroup: 'گروه آفیک',
    programTitle: 'برنامه ارزیابی مهندسی و کاهش ریسک',
    reportType: 'گزارش ارزیابی مهندسی و کاهش ریسک',
    disciplines: 'برق · مکانیک · زیرساخت · بهداشت و ایمنی',
    coverProjectLbl: 'پروژه',
    coverPreparedForLbl: 'تهیه شده برای',
    coverDocRefLbl: 'شماره سند',
    coverRevisionLbl: 'ویرایش',
    coverDateLbl: 'تاریخ',
    coverClassificationLbl: 'طبقه‌بندی',
    coverClassificationVal: 'مرور مدیریتی داخلی',
    coverReportTypeLbl: 'نوع گزارش',
    coverFieldLbl: 'مورد',
    coverDetailLbl: 'جزئیات',
    dashTitle: 'داشبورد مدیریتی',
    dashBySeverity: 'یافته‌ها بر اساس شدت',
    dashByDiscipline: 'یافته‌ها بر اساس دیسیپلین',
    dashHeadline: 'پیام کلیدی',
    dashDisciplineLbl: 'دیسیپلین',
    dashFindingsLbl: 'یافته‌ها',
    dashHighestSevLbl: 'بالاترین شدت',
    total: 'مجموع',
    sectionExecSummary: 'خلاصه اجرایی',
    sectionFindings: 'یافته‌ها',
    sectionRiskMatrix: 'ماتریس ارزیابی ریسک',
    sectionActionPlan: 'برنامه اقدام بر اساس اولویت',
    sectionRecActions: 'اقدامات اصلاحی توصیه‌شده',
    sectionConclusion: 'نتیجه‌گیری',
    sectionSummaryTable: 'خلاصه یافته‌ها',
    elemLbl: 'مورد',
    detailLbl: 'شرح',
    elemObserved: 'شواهد مشاهده‌شده',
    elemImpact: 'اثر فنی',
    elemRisk: 'شرح ریسک',
    elemProbable: 'علت محتمل',
    elemConfirmed: 'علت تأییدشده',
    elemAction: 'اقدام توصیه‌شده',
    report: 'گزارش بازرسی',
    inspectionNo: 'شماره بازرسی', date: 'تاریخ', priority: 'اولویت', status: 'وضعیت',
    severity: 'شدت',
    category: 'دسته', subcategory: 'زیردسته', property: 'مجتمع', area: 'محدوده', location: 'مکان',
    inspector: 'بازرس', companion: 'همراه بازرس', reportedBy: 'گزارش‌دهنده',
    reportBlock: 'گزارش',
    actionRequired: 'اقدام لازم',
    resolution: 'راه‌حل', resolvedOn: 'رفع در تاریخ',
    photos: 'عکس‌ها', photo: 'عکس', of: 'از', evidence: 'شواهد',
    priorityLow: 'کم', priorityMedium: 'متوسط', priorityHigh: 'زیاد', priorityCritical: 'بحرانی',
    statusOk: 'سالم', statusMinor: 'مشکل جزئی', statusMajor: 'مشکل جدی',
    statusCritical: 'بحرانی', statusRepair: 'نیاز به تعمیر', statusFixed: 'رفع شد',
    finding: 'یافته',
    riskRef: 'ش', riskFinding: 'یافته', riskOverall: 'کلی',
    priority1: 'اولویت ۱ — ایمنی جانی فوری',
    priority2: 'اولویت ۲ — کاهش ریسک فوری',
    priority3: 'اولویت ۳ — حفاظت زیرساخت',
    priority4: 'اولویت ۴ — استانداردسازی و بهینه‌سازی',
    footerBrand: 'گروه آفیک · HSE · ارزیابی مهندسی',
    footerClassification: 'مرور مدیریتی داخلی',
    page: 'صفحه',
    signature: 'امضای بازرس', chief: 'امضای مسئول', dateSigned: 'تاریخ',
    safety: 'الزامات ایمنی مرتبط',
  },
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ─── Structured report parser ──────────────────────────────────────
// Parses a report field seeded in the AFIK style, e.g.:
//   OBSERVED EVIDENCE
//   ...text...
//
//   TECHNICAL IMPACT
//   ...text...
// Returns { observed, impact, risk, probable, confirmed }.  Missing sections
// come back as ''.  For unstructured reports (no matching headers), returns
// { observed: <entire text>, ... } so we still show something.
function parseStructuredReport(reportText) {
  const empty = { observed: '', impact: '', risk: '', probable: '', confirmed: '' };
  if (!reportText) return empty;
  const src = String(reportText);
  const patterns = {
    observed:  /OBSERVED\s+EVIDENCE\s*\n([\s\S]*?)(?=\n\s*(?:TECHNICAL\s+IMPACT|RISK\s+DESCRIPTION|PROBABLE\s+CAUSE|CONFIRMED\s+CAUSE)|\s*$)/i,
    impact:    /TECHNICAL\s+IMPACT\s*\n([\s\S]*?)(?=\n\s*(?:RISK\s+DESCRIPTION|PROBABLE\s+CAUSE|CONFIRMED\s+CAUSE|OBSERVED\s+EVIDENCE)|\s*$)/i,
    risk:      /RISK\s+DESCRIPTION\s*\n([\s\S]*?)(?=\n\s*(?:PROBABLE\s+CAUSE|CONFIRMED\s+CAUSE|TECHNICAL\s+IMPACT|OBSERVED\s+EVIDENCE)|\s*$)/i,
    probable:  /PROBABLE\s+CAUSE\s*\n([\s\S]*?)(?=\n\s*(?:CONFIRMED\s+CAUSE|RISK\s+DESCRIPTION|TECHNICAL\s+IMPACT|OBSERVED\s+EVIDENCE)|\s*$)/i,
    confirmed: /CONFIRMED\s+CAUSE\s*\n([\s\S]*?)(?=\n\s*(?:PROBABLE\s+CAUSE|RISK\s+DESCRIPTION|TECHNICAL\s+IMPACT|OBSERVED\s+EVIDENCE)|\s*$)/i,
  };
  const out = { ...empty };
  let matched = 0;
  for (const [k, re] of Object.entries(patterns)) {
    const m = src.match(re);
    if (m) { out[k] = m[1].trim(); matched++; }
  }
  if (matched === 0) {
    out.observed = src.trim();
  }
  return out;
}

// Severity label + color from stored fields
function severityLabel(inspection, L) {
  const sev = Number(inspection.severity) || 0;
  const priority = inspection.priority;
  if (priority === 'critical' || sev >= 4) return { label: (L.priorityCritical || 'Critical').toUpperCase(), color: '#C43D3D', bg: '#FDECEC' };
  if (priority === 'high' || sev >= 3)     return { label: (L.priorityHigh     || 'High').toUpperCase(),     color: '#E67A2C', bg: '#FDF3E9' };
  if (priority === 'medium' || sev >= 2)   return { label: (L.priorityMedium   || 'Medium').toUpperCase(),   color: '#B8862C', bg: '#FDF8E7' };
  return { label: (L.priorityLow || 'Low').toUpperCase(), color: '#7A9A5B', bg: '#F0F5EA' };
}

// Shared CSS used by both single & multi PDF outputs
// Shared CSS: A4-sized "paper" pages that look right on-screen AND print perfect
function afikStyles(rtl) {
  return `
  @page { size: A4; margin: 0; }

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ${rtl ? "'Vazirmatn', 'Heebo', 'Arial Hebrew', Tahoma, sans-serif" : "'Inter', 'Helvetica Neue', Arial, sans-serif"};
    color: #1a1a1a; background: #d5d5d5; font-size: 10.5pt; line-height: 1.55;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1, h2, h3, h4 { font-family: 'Playfair Display', Georgia, serif; color: #0f2544; font-weight: 700; margin: 0; }

  /* A4 sheet — width 210mm, min-height 297mm. Padded inside so ribbon flows. */
  .sheet {
    width: 210mm; min-height: 297mm; background: #fff;
    margin: 20px auto; padding: 18mm 16mm 20mm;
    box-shadow: 0 4px 20px rgba(0,0,0,0.25); position: relative;
    page-break-after: always; break-after: page;
    display: flex; flex-direction: column;
  }
  .sheet:last-child { page-break-after: auto; }
  .sheet.cover { padding: 0; overflow: hidden; }

  /* Ribbon INSIDE the sheet — no negative margins */
  .ribbon {
    background: #0f2544; color: #fff; padding: 7px 14px;
    font-size: 8.5pt; letter-spacing: 0.03em;
    display: flex; justify-content: space-between; align-items: center;
    margin: -12mm -16mm 12mm; /* pull to sheet edges */
  }
  .ribbon .ribbon-left  { font-weight: 600; }
  .ribbon .ribbon-right { opacity: 0.85; text-transform: uppercase; font-size: 8pt; }

  .footer-bar {
    margin-top: auto; padding-top: 8px;
    border-top: 1px solid #ddd; display: flex; justify-content: space-between;
    font-size: 8pt; color: #666;
  }

  /* Cover — full sheet, no padding, own layout */
  .cover-inner { padding: 26mm 20mm 20mm; height: 297mm; display: flex; flex-direction: column; }
  .cover-topband { border-top: 4px solid #C9A960; border-bottom: 1px solid #C9A960; padding: 14px 0 18px; margin-bottom: 22mm; }
  .cover-hse   { font-family: 'Playfair Display', Georgia, serif; font-size: 44pt; font-weight: 800; letter-spacing: 0.35em; color: #0f2544; line-height: 1; }
  .cover-afik  { font-family: 'Inter', Arial, sans-serif; font-size: 13pt; color: #8B7A44; letter-spacing: 0.15em; font-weight: 700; margin-top: 6px; }
  .cover-program { font-family: 'Playfair Display', Georgia, serif; font-size: 14pt; color: #0f2544; font-style: italic; margin-top: 16px; }

  .cover-project-name { font-family: 'Playfair Display', Georgia, serif; font-size: 30pt; font-weight: 800; color: #0f2544; letter-spacing: 0.02em; line-height: 1.15; margin-bottom: 10px; }
  .cover-project-sub  { font-size: 12pt; color: #333; margin-bottom: 4px; }
  .cover-project-disc { font-size: 10pt; color: #8B7A44; letter-spacing: 0.05em; margin-bottom: 18mm; text-transform: uppercase; }

  .cover-report-title { font-family: 'Playfair Display', Georgia, serif; font-size: 15pt; color: #0f2544; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #C9A960; }

  .cover-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  .cover-table th { background: #0f2544; color: #fff; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 12px; text-align: ${rtl ? 'right' : 'left'}; font-weight: 700; }
  .cover-table td { padding: 7px 12px; border-bottom: 1px solid #E6DFCC; font-size: 10pt; vertical-align: top; }
  .cover-table td:first-child { background: #FAF6EC; color: #0f2544; font-weight: 700; width: 38%; }

  .cover-footer { margin-top: auto; padding-top: 10px; border-top: 1px solid #C9A960; font-size: 8.5pt; color: #666; display: flex; justify-content: space-between; }

  /* Section headings */
  h1.doc-h1 { font-size: 18pt; margin: 4px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #0f2544; }
  h2.doc-h2 { font-size: 14pt; margin: 20px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #C9A960; }
  h3.doc-h3 { font-size: 12.5pt; margin: 14px 0 8px; }

  /* Severity strip under finding title */
  .sev-strip { display: flex; gap: 16px; align-items: center; margin: 4px 0 12px; font-size: 10pt; flex-wrap: wrap; }
  .sev-label { font-weight: 700; letter-spacing: 0.04em; }
  .sev-pill  { display: inline-block; padding: 2px 9px; border-radius: 3px; font-size: 9.5pt; font-weight: 800; letter-spacing: 0.05em; }
  .cat-text  { color: #555; }
  .code-mono { font-family: 'Courier New', monospace; font-size: 9pt; color: #666; margin-${rtl ? 'right' : 'left'}: auto; }

  /* Element / Detail table */
  .ed-table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; font-size: 10pt; }
  .ed-table th { background: #E9EEF5; color: #0f2544; font-weight: 700; padding: 8px 12px; text-align: ${rtl ? 'right' : 'left'}; font-size: 9.5pt; border: 1px solid #D5DEE9; }
  .ed-table td { padding: 9px 12px; border: 1px solid #D5DEE9; vertical-align: top; }
  .ed-table td.ed-key { background: #E9EEF5; color: #0f2544; font-weight: 700; width: 30%; font-size: 9.5pt; }
  .ed-table td.ed-val { white-space: pre-wrap; word-wrap: break-word; }
  .ed-table tr { page-break-inside: avoid; }

  /* Executive dashboard */
  .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 10px 0 16px; }
  .dash-panel { border: 1px solid #E6DFCC; border-radius: 4px; overflow: hidden; }
  .dash-panel h4 { background: #FAF6EC; color: #0f2544; font-family: 'Playfair Display', Georgia, serif; font-size: 11pt; padding: 8px 12px; border-bottom: 1px solid #E6DFCC; }
  .sev-counts { display: grid; grid-template-columns: repeat(5, 1fr); text-align: center; }
  .sev-counts > div { padding: 12px 4px; border-${rtl ? 'left' : 'right'}: 1px solid #E6DFCC; }
  .sev-counts > div:last-child { border: none; background: #FAF6EC; }
  .sev-counts .count-num { font-family: 'Playfair Display', Georgia, serif; font-size: 22pt; font-weight: 700; line-height: 1; }
  .sev-counts .count-lbl { font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
  .disc-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .disc-table td { padding: 6px 12px; border-bottom: 1px solid #F3EFE3; }
  .disc-table td:last-child { text-align: ${rtl ? 'left' : 'right'}; font-weight: 700; }

  .headline-box { background: #FAF6EC; border-${rtl ? 'right' : 'left'}: 4px solid #0f2544; padding: 12px 16px; margin: 10px 0 16px; font-size: 10.5pt; line-height: 1.6; }

  /* Photos grid — 3 cols, uniform size */
  .photos-section { margin-top: 12px; page-break-inside: auto; }
  .photos-header { font-size: 9.5pt; font-weight: 700; color: #0f2544; margin-bottom: 6px; letter-spacing: 0.04em; text-transform: uppercase; }
  .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .photo-item  { page-break-inside: avoid; break-inside: avoid; text-align: center; }
  .photo-item img { width: 100%; height: 52mm; object-fit: cover; border: 1px solid #d5d5d5; border-radius: 2px; display: block; }
  .photo-caption { font-size: 8pt; color: #444; margin-top: 3px; font-style: italic; line-height: 1.3; }

  /* Risk matrix */
  .risk-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 10px 0; }
  .risk-table th { background: #0f2544; color: #fff; padding: 8px 10px; text-align: ${rtl ? 'right' : 'left'}; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.04em; }
  .risk-table td { padding: 7px 10px; border-bottom: 1px solid #E6DFCC; vertical-align: top; }
  .risk-table td.ref-cell { font-family: 'Courier New', monospace; color: #666; font-size: 8.5pt; font-weight: 700; }
  .risk-table td.overall-cell { text-align: center; font-weight: 800; letter-spacing: 0.05em; }

  /* Action plan */
  .plan-table { width: 100%; border-collapse: collapse; font-size: 10pt; margin: 10px 0; }
  .plan-table th { background: #FAF6EC; color: #0f2544; padding: 8px 12px; text-align: ${rtl ? 'right' : 'left'}; font-size: 9.5pt; border-bottom: 2px solid #C9A960; }
  .plan-table td { padding: 10px 12px; border-bottom: 1px solid #E6DFCC; vertical-align: top; }
  .plan-priority { font-weight: 800; color: #0f2544; letter-spacing: 0.03em; }

  /* Summary */
  .summary-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9.5pt; }
  .summary-table th { background: #0f2544; color: #fff; padding: 8px 10px; text-align: ${rtl ? 'right' : 'left'}; font-size: 9pt; }
  .summary-table td { padding: 7px 10px; border-bottom: 1px solid #E6DFCC; vertical-align: top; }
  .summary-table tr:last-child td { border-bottom: none; }

  .action-box { background: #FFF8E1; border-${rtl ? 'right' : 'left'}: 4px solid #C9A960; padding: 10px 14px; margin: 10px 0; font-size: 10pt; }
  .resolution-box { background: #F0FAF0; border-${rtl ? 'right' : 'left'}: 4px solid #6B9E3A; padding: 10px 14px; margin: 10px 0; font-size: 10pt; }
  .safety-box { background: #FFF4E6; border: 1px solid #E5B166; border-radius: 4px; padding: 10px 14px; margin: 10px 0; font-size: 9.5pt; }
  .safety-item { margin-bottom: 6px; }
  .safety-src  { font-size: 8.5pt; color: #666; }

  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; page-break-inside: avoid; }
  .sig-block { border-top: 1px solid #999; padding-top: 6px; }
  .sig-label { font-size: 9pt; color: #666; }
  .sig-name  { font-size: 11pt; font-weight: 600; margin-top: 2px; }

  .prose { white-space: pre-wrap; line-height: 1.65; color: #222; font-size: 10.5pt; }

  /* Toolbar — fixed, two buttons */
  .toolbar {
    position: fixed; top: 12px; ${rtl ? 'left' : 'right'}: 12px;
    display: flex; gap: 8px; z-index: 9999;
    background: rgba(255,255,255,0.95); padding: 8px; border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.25);
  }
  .toolbar button {
    border: none; padding: 10px 16px; border-radius: 6px;
    font-family: inherit; font-size: 12pt; font-weight: 700;
    cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
    transition: transform 0.1s;
  }
  .toolbar button:hover { transform: translateY(-1px); }
  .toolbar button:active { transform: translateY(0); }
  .toolbar .btn-download { background: #0f2544; color: #fff; }
  .toolbar .btn-print    { background: #C9A960; color: #000; }
  .toolbar .btn-close    { background: #eee; color: #333; padding: 10px 12px; }
  .toolbar .toolbar-status { font-size: 10pt; color: #666; padding: 8px 4px 0; }

  @media print {
    body { background: #fff; }
    .sheet { margin: 0; box-shadow: none; padding: 18mm 16mm 20mm; }
    .sheet.cover { padding: 0; }
    .toolbar { display: none !important; }
  }
  `;
}

// Photo grid with numbered captions
function renderPhotosBlock(photos, L, insCode) {
  if (!photos || !photos.length) return '';
  const codePrefix = insCode ? insCode.replace(/^HSE-POOLS-/, '').replace(/^POOL-/, '').replace(/^PROP-/, '').replace(/^REF-/, '') : '';
  return `
    <div class="photos-section">
      <div class="photos-header">${esc(L.evidence)} · ${esc(L.photos)} (${photos.length})</div>
      <div class="photos-grid">
        ${photos.map((url, i) => `
          <div class="photo-item">
            <img src="${esc(url)}" alt="${esc(L.photo)} ${i+1}" crossorigin="anonymous" />
            <div class="photo-caption"><b>${esc(L.photo)} ${codePrefix ? codePrefix + '-' : ''}${String(i+1).padStart(2,'0')}</b></div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

// Element/Detail table for a single finding
function renderFindingTable(inspection, L) {
  const parsed = parseStructuredReport(inspection.report);
  const rows = [
    { key: L.elemObserved,  val: parsed.observed },
    { key: L.elemImpact,    val: parsed.impact },
    { key: L.elemRisk,      val: parsed.risk },
    { key: L.elemProbable,  val: parsed.probable },
    { key: L.elemConfirmed, val: parsed.confirmed },
    { key: L.elemAction,    val: inspection.action_required || '' },
  ].filter(r => r.val && r.val.trim());
  if (!rows.length) return '';
  return `
    <table class="ed-table">
      <thead>
        <tr><th style="width:30%;">${esc(L.elemLbl)}</th><th>${esc(L.detailLbl)}</th></tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td class="ed-key">${esc(r.key)}</td>
            <td class="ed-val">${esc(r.val)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

// Finding section (used inside a sheet, or as its own sheet)
function renderFindingSection(inspection, L, opts = {}) {
  const { index = null, total = null } = opts;
  const categoryMeta = CATEGORIES[inspection.category] || null;
  const catLabel = categoryMeta?.label || inspection.category || '';
  const subLabel = categoryMeta?.subcategories?.[inspection.subcategory] || inspection.subcategory || '';
  const sev = severityLabel(inspection, L);
  const title = inspection.title || '—';
  const indexStr = (index != null) ? `${L.finding} ${index}${total ? ' / ' + total : ''} — ` : '';
  const catText = [catLabel, subLabel].filter(Boolean).join(' / ');

  return `
    <h3 class="doc-h3">${esc(indexStr)}${esc(title)}</h3>
    <div class="sev-strip">
      <span><span class="sev-label">${esc(L.severity)}:</span>
        <span class="sev-pill" style="background:${sev.bg};color:${sev.color};">${esc(sev.label)}</span>
      </span>
      ${catText ? `<span class="cat-text"><b>${esc(L.category)}:</b> ${esc(catText)}</span>` : ''}
      <span class="code-mono">${esc(inspection.inspection_no || '')}</span>
    </div>

    ${renderFindingTable(inspection, L)}

    ${inspection.resolution_note ? `
      <div class="resolution-box"><b>${esc(L.resolution)}${inspection.resolved_at ? ' — ' + esc(new Date(inspection.resolved_at).toLocaleDateString(L.dir==='rtl'?'he-IL':'en-GB')) : ''}:</b> ${esc(inspection.resolution_note)}</div>
    ` : ''}

    ${categoryMeta?.warnings?.length ? `
      <div class="safety-box">
        <div style="font-size:9pt;font-weight:800;color:#8B5A00;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${esc(L.safety)}</div>
        ${categoryMeta.warnings.map(w => `
          <div class="safety-item">⚠ ${esc(w.text)}<div class="safety-src">— ${esc(w.source)}</div></div>
        `).join('')}
      </div>
    ` : ''}

    ${renderPhotosBlock(inspection.photos, L, inspection.inspection_no)}
  `;
}

// Toolbar HTML — Download PDF + Print
function toolbarHtml(langCode, filename) {
  const dl = langCode === 'he' ? 'הורדת PDF' : langCode === 'fa' ? 'دانلود PDF' : 'Download PDF';
  const pr = langCode === 'he' ? 'הדפסה' : langCode === 'fa' ? 'چاپ' : 'Print';
  const cl = langCode === 'he' ? 'סגור' : langCode === 'fa' ? 'بستن' : 'Close';
  return `
    <div class="toolbar" id="pdf-toolbar">
      <button class="btn-download" onclick="downloadPDF()">📥 ${dl}</button>
      <button class="btn-print" onclick="window.print()">🖨️ ${pr}</button>
      <button class="btn-close" onclick="window.close()" title="${cl}">✕</button>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <script>
      async function downloadPDF() {
        const btn = document.querySelector('.btn-download');
        const originalText = btn.textContent;
        btn.textContent = '⏳ ${langCode === 'he' ? 'מכין...' : langCode === 'fa' ? 'در حال آماده‌سازی...' : 'Preparing...'}';
        btn.disabled = true;
        // Hide toolbar during capture
        document.getElementById('pdf-toolbar').style.display = 'none';
        try {
          const el = document.getElementById('doc-root');
          await html2pdf().set({
            margin: 0,
            filename: ${JSON.stringify(filename)},
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#fff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
          }).from(el).save();
        } catch (e) {
          alert('Download failed: ' + e.message);
        }
        document.getElementById('pdf-toolbar').style.display = '';
        btn.textContent = originalText;
        btn.disabled = false;
      }
      // Preload images before letting user act
      (function() {
        const imgs = document.images;
        if (imgs.length === 0) return;
        let loaded = 0;
        for (const img of imgs) {
          if (img.complete) loaded++;
          else img.addEventListener('load', () => loaded++);
          img.addEventListener('error', () => loaded++);
        }
      })();
    </script>
  `;
}

// ═══════════════════════════════════════════════════════════════════
// openInspectionPDF — single finding, AFIK-style
// ═══════════════════════════════════════════════════════════════════
export function openInspectionPDF(inspection, ctx = {}, langCode = 'en') {
  const L = PDF_L[langCode] || PDF_L.en;
  const rtl = L.dir === 'rtl';
  const locale = langCode === 'he' ? 'he-IL' : langCode === 'fa' ? 'fa-IR' : 'en-GB';
  const property = ctx.property?.name || '—';
  const area = ctx.area?.name || '—';
  const inspectorName = inspection.inspector_display_name || inspection.inspector_email || '—';
  const companion = inspection.companion_name || '';
  const visitDate = inspection.visit_at || inspection.visit_date || inspection.created_at;
  const dateStr = visitDate ? new Date(visitDate).toLocaleDateString(locale, { year:'numeric', month:'long', day:'2-digit' }) : '—';
  const docRef = inspection.inspection_no || '—';
  const reportTitle = inspection.title || '—';
  const filename = `${docRef}.pdf`.replace(/[^\w.-]/g, '_');

  const ribbonHtml = `<div class="ribbon">
    <span class="ribbon-left">HSE · ${esc(L.afikGroup)} — ${esc(reportTitle)}</span>
    <span class="ribbon-right">${esc(L.footerClassification)}</span>
  </div>`;

  const footerHtml = `<div class="footer-bar">
    <span>${esc(docRef)}</span>
    <span>${esc(L.footerBrand)}</span>
    <span>${esc(L.footerClassification)}</span>
  </div>`;

  const html = `<!doctype html>
<html lang="${langCode}" dir="${L.dir}">
<head>
<meta charset="utf-8" />
<title>${esc(docRef)} — ${esc(reportTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800&family=Heebo:wght@400;600;700&family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
<style>${afikStyles(rtl)}</style>
</head>
<body>
  ${toolbarHtml(langCode, filename)}

  <div id="doc-root">
    <!-- COVER SHEET -->
    <div class="sheet cover">
      <div class="cover-inner">
        <div class="cover-topband">
          <div class="cover-hse">H S E</div>
          <div class="cover-afik">${esc(L.afikGroup)}</div>
          <div class="cover-program">${esc(L.programTitle)}</div>
        </div>

        <div class="cover-project-name">${esc(property).toUpperCase()}</div>
        <div class="cover-project-sub">${esc(area)}${inspection.location_note ? ' — ' + esc(inspection.location_note) : ''}</div>
        <div class="cover-project-disc">${esc(L.disciplines)}</div>

        <div class="cover-report-title">${esc(L.reportType)}</div>
        <table class="cover-table">
          <thead><tr><th style="width:38%;">${esc(L.coverFieldLbl)}</th><th>${esc(L.coverDetailLbl)}</th></tr></thead>
          <tbody>
            <tr><td>${esc(L.coverProjectLbl)}</td><td>${esc(reportTitle)}</td></tr>
            <tr><td>${esc(L.coverPreparedForLbl)}</td><td>${esc(companion || L.afikGroup)}</td></tr>
            <tr><td>${esc(L.coverDocRefLbl)}</td><td style="font-family:'Courier New',monospace;">${esc(docRef)}</td></tr>
            <tr><td>${esc(L.coverDateLbl)}</td><td>${esc(dateStr)}</td></tr>
            <tr><td>${esc(L.coverClassificationLbl)}</td><td>${esc(L.coverClassificationVal)}</td></tr>
            <tr><td>${esc(L.coverReportTypeLbl)}</td><td>${esc(L.reportType)}</td></tr>
            <tr><td>${esc(L.inspector)}</td><td>${esc(inspectorName)}</td></tr>
          </tbody>
        </table>

        <div class="cover-footer">
          <span>${esc(docRef)}</span>
          <span>${esc(L.footerBrand)}</span>
          <span>${esc(L.footerClassification)}</span>
        </div>
      </div>
    </div>

    <!-- FINDING SHEET -->
    <div class="sheet">
      ${ribbonHtml}
      <h1 class="doc-h1">${esc(L.sectionFindings)}</h1>
      ${renderFindingSection(inspection, L)}

      <div class="signatures">
        <div class="sig-block">
          <div class="sig-label">${esc(L.signature)}</div>
          <div class="sig-name">${esc(inspectorName)}</div>
        </div>
        <div class="sig-block">
          <div class="sig-label">${esc(L.chief)}${companion ? ' / ' + esc(L.companion) : ''}</div>
          <div class="sig-name">${companion ? esc(companion) : '&nbsp;'}</div>
        </div>
      </div>

      ${footerHtml}
    </div>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=1100,height=1200');
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

// ═══════════════════════════════════════════════════════════════════
// openLocationPDF — full corporate report of ALL inspections
// ═══════════════════════════════════════════════════════════════════
export function openLocationPDF(inspections, ctx = {}, langCode = 'en') {
  if (!inspections || inspections.length === 0) return;
  if (inspections.length === 1) return openInspectionPDF(inspections[0], ctx, langCode);

  const L = PDF_L[langCode] || PDF_L.en;
  const rtl = L.dir === 'rtl';
  const locale = langCode === 'he' ? 'he-IL' : langCode === 'fa' ? 'fa-IR' : 'en-GB';

  const first = inspections[0];
  const property = ctx.property?.name || '—';
  const area = ctx.area?.name || '—';
  const locNote = first.location_note || '';

  const inspectorSet = new Set();
  const companionSet = new Set();
  inspections.forEach(i => {
    const n = i.inspector_display_name || i.inspector_email;
    if (n) inspectorSet.add(n);
    if (i.companion_name) companionSet.add(i.companion_name);
  });
  const inspectorsStr = [...inspectorSet].join(', ') || '—';
  const companionsStr = [...companionSet].join(', ');

  const dates = inspections.map(i => new Date(i.visit_at || i.visit_date || i.created_at));
  const minD = new Date(Math.min(...dates));
  const maxD = new Date(Math.max(...dates));
  const dateStr = minD.toDateString() === maxD.toDateString()
    ? minD.toLocaleDateString(locale, { year:'numeric', month:'long', day:'2-digit' })
    : `${minD.toLocaleDateString(locale)} — ${maxD.toLocaleDateString(locale)}`;

  const docRefBase = (first.inspection_no || 'INS').replace(/-?\d+[A-Z]?$/i, '') || 'INS';
  const docRef = `${docRefBase}-REPORT`;
  const reportTitle = `${property}${area && area !== '—' ? ' — ' + area : ''}${locNote ? ' — ' + locNote : ''}`;
  const filename = `${docRef}.pdf`.replace(/[^\w.-]/g, '_');

  const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  inspections.forEach(i => {
    const p = i.priority || 'medium';
    if (sevCounts[p] != null) sevCounts[p]++;
  });

  const discMap = new Map();
  inspections.forEach(i => {
    const cat = i.category || '—';
    if (!discMap.has(cat)) discMap.set(cat, { count: 0, worst: 0 });
    const rec = discMap.get(cat);
    rec.count++;
    const sev = { low: 1, medium: 2, high: 3, critical: 4 }[i.priority || 'medium'] || 2;
    if (sev > rec.worst) rec.worst = sev;
  });
  const worstToLabel = (n) => n >= 4 ? L.priorityCritical : n >= 3 ? L.priorityHigh : n >= 2 ? L.priorityMedium : L.priorityLow;

  const ribbonHtml = `<div class="ribbon">
    <span class="ribbon-left">HSE · ${esc(L.afikGroup)} — ${esc(property)} ${esc(L.sectionFindings)}</span>
    <span class="ribbon-right">${esc(L.footerClassification)}</span>
  </div>`;

  const priorityGroups = {
    p1: inspections.filter(i => i.priority === 'critical'),
    p2: inspections.filter(i => i.priority === 'high'),
    p3: inspections.filter(i => i.priority === 'medium'),
    p4: inspections.filter(i => i.priority === 'low' || !i.priority),
  };

  const conclusionText = sevCounts.critical > 0
    ? `The assessment identified ${inspections.length} findings across ${discMap.size} disciplines at ${property}${area && area !== '—' ? ' — ' + area : ''}. Of these, ${sevCounts.critical} are Critical, warranting immediate action ahead of the normal capital-planning cycle. Delivering the phased action plan — immediate make-safe measures, then standardization and preventive controls — will materially reduce the identified life-safety, operational, financial and asset risks, and provide management with a defensible basis for capital planning.`
    : `The assessment identified ${inspections.length} findings across ${discMap.size} disciplines at ${property}${area && area !== '—' ? ' — ' + area : ''}. Address items within the phased plan to reduce risk and support sound capital planning.`;

  const html = `<!doctype html>
<html lang="${langCode}" dir="${L.dir}">
<head>
<meta charset="utf-8" />
<title>${esc(property)} — ${esc(L.reportType)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800&family=Heebo:wght@400;600;700&family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
<style>${afikStyles(rtl)}</style>
</head>
<body>
  ${toolbarHtml(langCode, filename)}

  <div id="doc-root">
    <!-- COVER -->
    <div class="sheet cover">
      <div class="cover-inner">
        <div class="cover-topband">
          <div class="cover-hse">H S E</div>
          <div class="cover-afik">${esc(L.afikGroup)}</div>
          <div class="cover-program">${esc(L.programTitle)}</div>
        </div>
        <div class="cover-project-name">${esc(property).toUpperCase()}</div>
        <div class="cover-project-sub">${esc(area)}${locNote ? ' — ' + esc(locNote) : ''}</div>
        <div class="cover-project-disc">${esc(L.disciplines)}</div>

        <div class="cover-report-title">${esc(L.reportType)}</div>
        <table class="cover-table">
          <thead><tr><th style="width:38%;">${esc(L.coverFieldLbl)}</th><th>${esc(L.coverDetailLbl)}</th></tr></thead>
          <tbody>
            <tr><td>${esc(L.coverProjectLbl)}</td><td>${esc(reportTitle)}</td></tr>
            <tr><td>${esc(L.coverPreparedForLbl)}</td><td>${esc(companionsStr || L.afikGroup)}</td></tr>
            <tr><td>${esc(L.coverDocRefLbl)}</td><td style="font-family:'Courier New',monospace;">${esc(docRef)}</td></tr>
            <tr><td>${esc(L.coverDateLbl)}</td><td>${esc(dateStr)}</td></tr>
            <tr><td>${esc(L.coverClassificationLbl)}</td><td>${esc(L.coverClassificationVal)}</td></tr>
            <tr><td>${esc(L.coverReportTypeLbl)}</td><td>${esc(L.reportType)}</td></tr>
            <tr><td>${esc(L.inspector)}</td><td>${esc(inspectorsStr)}</td></tr>
          </tbody>
        </table>
        <div class="cover-footer">
          <span>${esc(docRef)}</span>
          <span>${esc(L.footerBrand)}</span>
          <span>${esc(L.footerClassification)}</span>
        </div>
      </div>
    </div>

    <!-- EXECUTIVE DASHBOARD SHEET -->
    <div class="sheet">
      ${ribbonHtml}
      <h1 class="doc-h1">${esc(L.dashTitle)}</h1>
      <div class="dash-grid">
        <div class="dash-panel">
          <h4>${esc(L.dashBySeverity)}</h4>
          <div class="sev-counts">
            <div><div class="count-num" style="color:#C43D3D;">${sevCounts.critical}</div><div class="count-lbl">${esc(L.priorityCritical)}</div></div>
            <div><div class="count-num" style="color:#E67A2C;">${sevCounts.high}</div><div class="count-lbl">${esc(L.priorityHigh)}</div></div>
            <div><div class="count-num" style="color:#B8862C;">${sevCounts.medium}</div><div class="count-lbl">${esc(L.priorityMedium)}</div></div>
            <div><div class="count-num" style="color:#7A9A5B;">${sevCounts.low}</div><div class="count-lbl">${esc(L.priorityLow)}</div></div>
            <div><div class="count-num" style="color:#0f2544;">${inspections.length}</div><div class="count-lbl">${esc(L.total)}</div></div>
          </div>
        </div>
        <div class="dash-panel">
          <h4>${esc(L.dashByDiscipline)}</h4>
          <table class="disc-table">
            <tbody>
              ${[...discMap.entries()].map(([cat, rec]) => {
                const cm = CATEGORIES[cat];
                const label = cm?.label || cat;
                const icon = cm?.icon || '•';
                return `<tr>
                  <td>${esc(icon)} ${esc(label)}</td>
                  <td>${rec.count}</td>
                  <td>${esc(worstToLabel(rec.worst))}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <h2 class="doc-h2">${esc(L.dashHeadline)}</h2>
      <div class="headline-box">
        ${sevCounts.critical > 0
          ? `${sevCounts.critical} ${sevCounts.critical > 1 ? 'critical findings' : 'critical finding'} require immediate action ahead of the normal planning cycle. Together with ${sevCounts.high} high-severity ${sevCounts.high === 1 ? 'finding' : 'findings'}, this indicates a credible and present risk warranting urgent, structured intervention.`
          : sevCounts.high > 0
            ? `${sevCounts.high} high-severity ${sevCounts.high === 1 ? 'finding' : 'findings'} identified. Prioritized action within the near-term programme is recommended.`
            : 'No critical or high-severity findings identified. Address items within the standardization and maintenance programme.'}
      </div>

      <h2 class="doc-h2">${esc(L.sectionSummaryTable)}</h2>
      <table class="summary-table">
        <thead>
          <tr>
            <th style="width:40px;">#</th>
            <th style="width:110px;">${esc(L.inspectionNo)}</th>
            <th>${esc(L.finding)}</th>
            <th style="width:110px;">${esc(L.category)}</th>
            <th style="width:80px;">${esc(L.priority)}</th>
          </tr>
        </thead>
        <tbody>
          ${inspections.map((ins, idx) => {
            const sev = severityLabel(ins, L);
            const cm = CATEGORIES[ins.category];
            return `<tr>
              <td style="font-weight:700;color:#0f2544;">${idx + 1}</td>
              <td style="font-family:'Courier New',monospace;font-size:9pt;color:#666;">${esc(ins.inspection_no || '')}</td>
              <td>${esc(ins.title || '—')}</td>
              <td>${cm ? esc(cm.icon + ' ' + cm.label) : esc(ins.category || '—')}</td>
              <td><span class="sev-pill" style="background:${sev.bg};color:${sev.color};font-size:8.5pt;">${esc(sev.label)}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      ${footerFor(L, docRef)}
    </div>

    <!-- ONE SHEET PER FINDING -->
    ${inspections.map((ins, i) => `
      <div class="sheet">
        ${ribbonHtml}
        ${i === 0 ? `<h1 class="doc-h1">${esc(L.sectionFindings)}</h1>` : ''}
        ${renderFindingSection(ins, L, { index: i + 1, total: inspections.length })}
        ${footerFor(L, docRef)}
      </div>
    `).join('')}

    <!-- RISK MATRIX SHEET -->
    <div class="sheet">
      ${ribbonHtml}
      <h1 class="doc-h1">${esc(L.sectionRiskMatrix)}</h1>
      <table class="risk-table">
        <thead>
          <tr>
            <th style="width:110px;">${esc(L.riskRef)}</th>
            <th>${esc(L.riskFinding)}</th>
            <th style="width:110px;">${esc(L.category)}</th>
            <th style="width:100px;">${esc(L.riskOverall)}</th>
          </tr>
        </thead>
        <tbody>
          ${inspections.slice().sort((a, b) => {
            const rank = { critical: 1, high: 2, medium: 3, low: 4 };
            return (rank[a.priority] || 3) - (rank[b.priority] || 3);
          }).map(ins => {
            const sev = severityLabel(ins, L);
            const cm = CATEGORIES[ins.category];
            return `<tr>
              <td class="ref-cell">${esc(ins.inspection_no || '—')}</td>
              <td>${esc(ins.title || '—')}</td>
              <td>${cm ? esc(cm.label) : esc(ins.category || '—')}</td>
              <td class="overall-cell" style="color:${sev.color};">${esc(sev.label)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      ${footerFor(L, docRef)}
    </div>

    <!-- ACTION PLAN SHEET -->
    <div class="sheet">
      ${ribbonHtml}
      <h1 class="doc-h1">${esc(L.sectionActionPlan)}</h1>
      <table class="plan-table">
        <thead>
          <tr>
            <th style="width:32%;">${esc(L.priority)}</th>
            <th>${esc(L.riskFinding)}s</th>
          </tr>
        </thead>
        <tbody>
          ${[
            { label: L.priority1, group: priorityGroups.p1 },
            { label: L.priority2, group: priorityGroups.p2 },
            { label: L.priority3, group: priorityGroups.p3 },
            { label: L.priority4, group: priorityGroups.p4 },
          ].filter(x => x.group.length).map(x => `
            <tr>
              <td class="plan-priority">${esc(x.label)}</td>
              <td>${x.group.map(i => `<div style="margin-bottom:4px;"><span style="font-family:'Courier New',monospace;color:#666;font-size:8.5pt;">${esc(i.inspection_no)}</span> · ${esc(i.title)}</div>`).join('')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${footerFor(L, docRef)}
    </div>

    <!-- CONCLUSION + SIGNATURES SHEET -->
    <div class="sheet">
      ${ribbonHtml}
      <h1 class="doc-h1">${esc(L.sectionConclusion)}</h1>
      <div class="prose">${esc(conclusionText)}</div>

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

      ${footerFor(L, docRef)}
    </div>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=1100,height=1200');
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

function footerFor(L, docRef) {
  return `<div class="footer-bar">
    <span>${esc(docRef)}</span>
    <span>${esc(L.footerBrand)}</span>
    <span>${esc(L.footerClassification)}</span>
  </div>`;
}
