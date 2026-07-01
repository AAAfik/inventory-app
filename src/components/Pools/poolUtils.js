// ═══════════════════════════════════════════════════════════════════
// poolUtils.js — ثابت‌ها و توابع مشترک ماژول Pools
// ═══════════════════════════════════════════════════════════════════
// مصرف‌کنندگان: PoolsOverview, PoolsMap, PoolsLogChemical, PoolsHistory
// هیچ وابستگی به React/Supabase نداره — pure functions.

// ───────────────────────────────────────────────────────────────────
// 7 chemical (قیمت €/kg یا €/L، طبق بریف Caesar Resort)
// key باید با ستون‌های qty_* در pool_chemical_logs دقیقاً match باشه
// ───────────────────────────────────────────────────────────────────
export const POOL_CHEMICALS = [
  { key: "qty_klor56",    label: "Toz Klor 56%",   price: 3.60, unit: "kg" },
  { key: "qty_klor90",    label: "Toz Klor 90%",   price: 3.80, unit: "kg" },
  { key: "qty_floc",      label: "Çöktürücü",      price: 1.35, unit: "kg" },
  { key: "qty_algae",     label: "Yosun Öldürücü", price: 1.50, unit: "L"  },
  { key: "qty_clarify",   label: "Parlatıcı",      price: 1.40, unit: "L"  },
  { key: "qty_klor_sivi", label: "Sıvı Klor",      price: 1.00, unit: "L"  },
  { key: "qty_asit",      label: "Sıvı Asit",      price: 0.85, unit: "L"  },
];

// ───────────────────────────────────────────────────────────────────
// helper: اول ماه جاری به فرمت ISO 'YYYY-MM-DD' (string-safe برای مقایسه با date)
// ───────────────────────────────────────────────────────────────────
export function monthStartISO(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  // toISOString روی UTC ست؛ از yyyy/mm/dd محلی استفاده می‌کنیم تا timezone قاطی نشه
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = "01";
  return `${yyyy}-${mm}-${dd}`;
}

// ───────────────────────────────────────────────────────────────────
// baseline ماهیانه‌ی یه استخر (€/ماه) از روی ستون‌های b_*
// ───────────────────────────────────────────────────────────────────
export function baselineMonthly(pool) {
  if (!pool) return 0;
  return POOL_CHEMICALS.reduce((sum, c) => {
    const baselineKey = "b_" + c.key.replace("qty_", "");
    return sum + (Number(pool[baselineKey]) || 0) * c.price;
  }, 0);
}

// ───────────────────────────────────────────────────────────────────
// هزینه‌ی واقعی یه مجموعه از logها (€)
// ───────────────────────────────────────────────────────────────────
export function actualCost(logs) {
  if (!logs?.length) return 0;
  return POOL_CHEMICALS.reduce((sum, c) => {
    const qty = logs.reduce((t, l) => t + (Number(l[c.key]) || 0), 0);
    return sum + qty * c.price;
  }, 0);
}

// ───────────────────────────────────────────────────────────────────
// محاسبه‌ی status یه استخر برای ماه جاری
// pool: ردیف از جدول pools
// allLogs: همه‌ی logها (تابع خودش فیلتر می‌کنه بر اساس pool.id و monthStart)
// monthStart: ISO 'YYYY-MM-DD' (اختیاری، پیش‌فرض اول ماه جاری)
// ───────────────────────────────────────────────────────────────────
export function getPoolStatus(pool, allLogs, monthStart) {
  const start = monthStart || monthStartISO();

  const monthLogs = (allLogs || []).filter(
    (l) => l.pool_id === pool.id && String(l.log_date) >= start
  );

  const actual   = actualCost(monthLogs);
  const baseline = baselineMonthly(pool);

  // Pro-rate: انتظار تا امروز
  const now = new Date();
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const expectedNow = baseline * (daysElapsed / daysInMonth);

  const pct = expectedNow > 0 ? Math.round((actual / expectedNow) * 100) : 0;

  let color, label;
  if (pct === 0) {
    color = "#94a3b8"; label = "No logs";    // خاکستری
  } else if (pct <= 110) {
    color = "#10b981"; label = "OK";          // سبز
  } else if (pct <= 150) {
    color = "#f59e0b"; label = "Watch";       // کهربایی
  } else {
    color = "#ef4444"; label = "HIGH";        // قرمز
  }

  return {
    pct,
    actualCost: actual,
    baselineMonthly: baseline,
    expectedNow,
    logCount: monthLogs.length,
    color,
    label,
  };
}

// ───────────────────────────────────────────────────────────────────
// فرمت کردن یورو برای نمایش UI
// ───────────────────────────────────────────────────────────────────
export function formatEUR(n) {
  const v = Number(n) || 0;
  return "€" + v.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// ───────────────────────────────────────────────────────────────────
// رنگ status برای استفاده در نقشه (pinها) — همون منطق getPoolStatus
// خروجی فقط رنگ، برای جاهایی که فقط رنگ pin می‌خوایم
// ───────────────────────────────────────────────────────────────────
export function statusColor(pool, allLogs, monthStart) {
  return getPoolStatus(pool, allLogs, monthStart).color;
}
