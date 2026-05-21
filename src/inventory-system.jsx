import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const ADMIN_EMAILS = ["admin@inventory.com", "hezicaesar@gmail.com", "alireza.ariyannekoo@afikgroup.com"];

const THEMES = {
  dark: {
    bg:"#0e1220", bgElev:"#161b2c", bgCard:"#161b2c", bgInput:"#0e1220", bgHover:"#1a2035",
    text:"#f0f4ff", textMuted:"#8892b0", textDim:"#4a5568", textHeading:"#f0f4ff",
    border:"#1e2942", borderStrong:"#252f4a", divider:"#1a2035",
    sidebar:"#090d18", sidebarBorder:"#1a2035",
    header:"#161b2c", headerBorder:"#1e2942",
    accent:"#6366f1", accentText:"#a5b4fc", accentBg:"rgba(99,102,241,.12)", accentBorder:"rgba(99,102,241,.3)",
  },
  light: {
    bg:"#f6f7fb", bgElev:"#ffffff", bgCard:"#ffffff", bgInput:"#f6f7fb", bgHover:"#f0f2f8",
    text:"#1a2240", textMuted:"#6b7592", textDim:"#9aa3b8", textHeading:"#0d1530",
    border:"#e6e9f2", borderStrong:"#d0d6e3", divider:"#eef0f6",
    sidebar:"#ffffff", sidebarBorder:"#e6e9f2",
    header:"#ffffff", headerBorder:"#e6e9f2",
    accent:"#6366f1", accentText:"#6366f1", accentBg:"rgba(99,102,241,.08)", accentBorder:"rgba(99,102,241,.25)",
  },
};

const KPI_COLORS = {
  blue:   { solid:"#4f7df0", grad:"linear-gradient(135deg,#4f7df0,#6c95f5)" },
  orange: { solid:"#f59e0b", grad:"linear-gradient(135deg,#f59e0b,#fbbf24)" },
  purple: { solid:"#8b5cf6", grad:"linear-gradient(135deg,#8b5cf6,#a78bfa)" },
  red:    { solid:"#f87171", grad:"linear-gradient(135deg,#ef4444,#f87171)" },
  green:  { solid:"#10b981", grad:"linear-gradient(135deg,#059669,#34d399)" },
  cyan:   { solid:"#06b6d4", grad:"linear-gradient(135deg,#0891b2,#22d3ee)" },
};

const T = {
  en:{dashboard:"Dashboard",itemsMgmt:"Items",inventory:"Inventory",purchases:"Purchases",consumption:"Consumption",returns:"Returns",orders:"Orders",suppliers:"Suppliers",activityLog:"Activity Log",totalValue:"Total Stock Value",totalPurchases:"Total Spend",lowAlerts:"Low Stock Alerts",pendingApprovals:"Pending Approvals",spendDept:"Spend by Department",spendSupplier:"Spend by Supplier",recentPurchases:"Recent Purchases",recentConsumption:"Recent Consumption",newPurchase:"+ New Purchase",logConsumption:"+ Log Consumption",newOrder:"+ New Order",addItem:"+ Add Item",addReturn:"+ Add Return",exportExcel:"↑ Export Excel",approve:"Approve",reject:"Reject",receive:"Receive",edit:"Edit",del:"Delete",save:"Save",search:"Search...",allDepts:"All Departments",date:"Date",product:"Product",qty:"Qty",unitPrice:"Unit Price",total:"Total",supplier:"Supplier",department:"Department",invoice:"Invoice",orderNo:"Order No",received:"Received",note:"Note",location:"Location",operator:"Operator",status:"Status",actions:"Actions",code:"Code",unit:"Unit",purchased:"Purchased",consumed:"Consumed",returned:"Returned",stock:"Stock",avgPrice:"Avg Price",stockValue:"Value",lowStock:"Low Stock",ok:"OK",noAccess:"No access to this section.",approvalNote:"New purchases require admin approval before stock updates.",loading:"Loading...",logout:"Logout",discrepancy:"Unusual Consumption Detected",staffWelcome:"Log your consumption here",selectProduct:"Select product...",selectDept:"Select department...",selectLocation:"Select location...",minStock:"Min Stock",itemCode:"Item Code",itemName:"Item Name",itemNameFa:"Name (Persian)",itemNameHe:"Name (Hebrew)",reason:"Reason",fromLocation:"From Location",receivedBy:"Received By",deliveredTo:"Delivered To",deliveryPerson:"Delivered By",image:"Image",returnQty:"Return Qty",editItem:"Edit Item",newItem:"New Item",overview:"OVERVIEW",catalog:"CATALOG",transactions:"TRANSACTIONS",insights:"INSIGHTS",products:"products",approved:"approved",needsAttention:"Needs attention",allItemsOk:"All items OK",awaitingApproval:"Awaiting approval",queueClear:"Queue clear",stockHealth:"Stock Health",topItems:"Top Items by Value",inStock:"in stock",reports:"Reports",pools:"Pools",poolOverview:"Pool Overview",poolLog:"Log Chemical",poolHistory:"History",poolDashboard:"Pool Dashboard",poolStatus:"Status",poolBaseline:"Baseline (kg/mo)",poolActual:"Actual (kg/mo)",poolLogEntry:"Log Chemical Usage",noLogs:"No logs this month",loggedBy:"Logged By",waterQuality:"Water Quality",phLevel:"pH Level",clPpm:"Chlorine (ppm)",poolReport:"Pool Report",budgetUsed:"Budget Used",allPools:"All Pools",poolType:"Type",volume:"Volume",logChemical:"Log Chemical",resortMap:"Resort Map",database:"Database",addLocation:"Add Location",editLocation:"Edit Location",locationName:"Location Name",locationCategory:"Category",locationDesc:"Description",locationArea:"Area (M²)",locationFloor:"Floor / Zone",locationCap:"Capacity",locationNotes:"Notes",placed:"Placed on map",unplacedLoc:"Unplaced",catFilter:"Filter by category",addMode:"Click on map to place",cancelAdd:"Cancel",reportsDesc:"Generate custom reports — select sections, then download as Excel",selectReports:"Select reports to include",selectAll:"Select All",clearAll:"Clear",generateReport:"↓ Generate Report (Excel)",reportInventory:"INVENTORY",reportTransactions:"TRANSACTIONS",reportAnalytics:"ANALYTICS",reportAudit:"AUDIT",inventorySummary:"Inventory Summary",inventorySummaryDesc:"All items with stock, value, and status",lowStockReport:"Low Stock Items",lowStockDesc:"Items below minimum threshold",topItemsByValue:"Top Items by Value",topItemsByValueDesc:"Most valuable inventory items",allPurchasesReport:"All Purchases",allPurchasesDesc:"Complete list with full details",approvedPurchases:"Approved Purchases",approvedPurchasesDesc:"Confirmed spending, financial focus",pendingPurchases:"Pending Approvals",pendingPurchasesDesc:"Awaiting admin decision",consumptionDetail:"Consumption Detail",consumptionDetailDesc:"Who took what, where, when",returnsReport:"Returns",returnsDesc:"Stock returned to warehouse",ordersReport:"Orders",ordersReportDesc:"Pending and confirmed orders",consumptionByDept:"Consumption by Department",consumptionByDeptDesc:"Aggregated usage per location",consumptionByOperator:"Consumption by Operator",consumptionByOperatorDesc:"Who used how much",deliveryReport:"Delivery Report",deliveryReportDesc:"Who delivered what to whom",suppliersReport:"Suppliers Summary",suppliersReportDesc:"Vendor spending analytics",financialSummary:"Financial Summary",financialSummaryDesc:"Totals, KPIs, key metrics",anomaliesReport:"Anomaly Detection",anomaliesDesc:"Unusual consumption patterns",activityLogReport:"Activity Log",activityLogDesc:"Complete audit trail with users and timestamps",reportGenerated:"Report generated successfully",noReportsSelected:"Please select at least one report"},
  he:{dashboard:"לוח בקרה",itemsMgmt:"פריטים",inventory:"מלאי",purchases:"רכישות",consumption:"צריכה",returns:"החזרות",orders:"הזמנות",suppliers:"ספקים",activityLog:"יומן פעילות",totalValue:"ערך מלאי כולל",totalPurchases:"סך הוצאות",lowAlerts:"התראות מלאי נמוך",pendingApprovals:"ממתין לאישור",spendDept:"הוצאות לפי מחלקה",spendSupplier:"הוצאות לפי ספק",recentPurchases:"רכישות אחרונות",recentConsumption:"צריכה אחרונה",newPurchase:"+ רכישה חדשה",logConsumption:"+ רישום צריכה",newOrder:"+ הזמנה חדשה",addItem:"+ הוסף פריט",addReturn:"+ הוסף החזרה",exportExcel:"↑ ייצוא Excel",approve:"אשר",reject:"דחה",receive:"קבל",edit:"ערוך",del:"מחק",save:"שמור",search:"חפש...",allDepts:"כל המחלקות",date:"תאריך",product:"מוצר",qty:"כמות",unitPrice:"מחיר יחידה",total:"סך הכל",supplier:"ספק",department:"מחלקה",invoice:"חשבונית",orderNo:"מספר הזמנה",received:"התקבל",note:"הערה",location:"מיקום",operator:"מפעיל",status:"סטטוס",actions:"פעולות",code:"קוד",unit:"יחידה",purchased:"נרכש",consumed:"נצרך",returned:"הוחזר",stock:"מלאי",avgPrice:"מחיר ממוצע",stockValue:"ערך",lowStock:"מלאי נמוך",ok:"תקין",noAccess:"אין גישה לחלק זה.",approvalNote:"רכישות חדשות דורשות אישור מנהל לפני עדכון המלאי.",loading:"טוען...",logout:"התנתק",discrepancy:"זוהתה צריכה חריגה",staffWelcome:"רשום את הצריכה שלך כאן",selectProduct:"בחר מוצר...",selectDept:"בחר מחלקה...",selectLocation:"בחר מיקום...",minStock:"מלאי מינימלי",itemCode:"קוד פריט",itemName:"שם פריט",itemNameFa:"שם (פרסית)",itemNameHe:"שם (עברית)",reason:"סיבה",fromLocation:"ממיקום",receivedBy:"התקבל על ידי",deliveredTo:"נמסר ל",deliveryPerson:"נמסר על ידי",image:"תמונה",returnQty:"כמות החזרה",editItem:"ערוך פריט",newItem:"פריט חדש",overview:"סקירה",catalog:"קטלוג",transactions:"תנועות",insights:"תובנות",products:"מוצרים",approved:"אושרו",needsAttention:"דורש תשומת לב",allItemsOk:"הכל תקין",awaitingApproval:"ממתין לאישור",queueClear:"התור ריק",stockHealth:"מצב המלאי",topItems:"פריטים מובילים",inStock:"במלאי",reports:"דוחות",pools:"בריכות",poolOverview:"סקירת בריכות",poolLog:"רישום כימיקלים",poolHistory:"היסטוריה",poolDashboard:"לוח בקרה",poolStatus:"סטטוס",poolBaseline:"בסיס (ק\"ג/חודש)",poolActual:"בפועל (ק\"ג)",poolLogEntry:"רשום שימוש בכימיקל",noLogs:"אין רישומים החודש",loggedBy:"נרשם על ידי",waterQuality:"איכות מים",phLevel:"רמת pH",clPpm:"כלור (ppm)",poolReport:"דוח בריכות",budgetUsed:"שימוש בתקציב",allPools:"כל הבריכות",poolType:"סוג",volume:"נפח",logChemical:"כימיקל",resortMap:"מפת ריזורט",database:"מסד נתונים",addLocation:"הוסף מיקום",editLocation:"ערוך מיקום",locationName:"שם המיקום",locationCategory:"קטגוריה",locationDesc:"תיאור",locationArea:"שטח (מ\"ר)",locationFloor:"קומה / אזור",locationCap:"קיבולת",locationNotes:"הערות",placed:"ממוקם",unplacedLoc:"לא ממוקם",catFilter:"סנן לפי קטגוריה",addMode:"לחץ על המפה למיקום",cancelAdd:"ביטול",reportsDesc:"צור דוחות מותאמים — בחר חלקים והורד כ-Excel",selectReports:"בחר דוחות לכלול",selectAll:"בחר הכל",clearAll:"נקה",generateReport:"↓ צור דוח (Excel)",reportInventory:"מלאי",reportTransactions:"תנועות",reportAnalytics:"ניתוח",reportAudit:"ביקורת",inventorySummary:"סיכום מלאי",inventorySummaryDesc:"כל הפריטים עם מלאי וערך",lowStockReport:"מלאי נמוך",lowStockDesc:"פריטים מתחת לסף",topItemsByValue:"פריטים מובילים",topItemsByValueDesc:"הפריטים היקרים ביותר",allPurchasesReport:"כל הרכישות",allPurchasesDesc:"רשימה מלאה עם פרטים",approvedPurchases:"רכישות מאושרות",approvedPurchasesDesc:"הוצאות שאושרו",pendingPurchases:"ממתינות לאישור",pendingPurchasesDesc:"ממתין להחלטת מנהל",consumptionDetail:"פירוט צריכה",consumptionDetailDesc:"מי לקח, מה, מאיפה, מתי",returnsReport:"החזרות",returnsDesc:"מלאי שהוחזר למחסן",ordersReport:"הזמנות",ordersReportDesc:"הזמנות ממתינות ומאושרות",consumptionByDept:"צריכה לפי מחלקה",consumptionByDeptDesc:"שימוש מצטבר לפי מיקום",consumptionByOperator:"צריכה לפי מפעיל",consumptionByOperatorDesc:"מי השתמש בכמה",deliveryReport:"דוח אספקה",deliveryReportDesc:"מי מסר מה למי",suppliersReport:"סיכום ספקים",suppliersReportDesc:"ניתוח הוצאות לפי ספק",financialSummary:"סיכום פיננסי",financialSummaryDesc:"סך הכל, מדדים ראשיים",anomaliesReport:"זיהוי חריגות",anomaliesDesc:"דפוסי צריכה חריגים",activityLogReport:"יומן פעילות",activityLogDesc:"דרך ביקורת מלאה",reportGenerated:"הדוח נוצר בהצלחה",noReportsSelected:"בחר לפחות דוח אחד"},
  fa:{dashboard:"داشبورد",itemsMgmt:"کالاها",inventory:"موجودی انبار",purchases:"خریدها",consumption:"مصرف",returns:"برگشت به انبار",orders:"سفارش‌ها",suppliers:"تأمین‌کنندگان",activityLog:"گزارش فعالیت",totalValue:"ارزش کل انبار",totalPurchases:"جمع خریدها",lowAlerts:"هشدار کم‌موجودی",pendingApprovals:"در انتظار تأیید",spendDept:"هزینه بر اساس دپارتمان",spendSupplier:"هزینه بر اساس تأمین‌کننده",recentPurchases:"آخرین خریدها",recentConsumption:"آخرین مصرف‌ها",newPurchase:"+ ثبت خرید",logConsumption:"+ ثبت مصرف",newOrder:"+ سفارش جدید",addItem:"+ افزودن کالا",addReturn:"+ ثبت برگشتی",exportExcel:"↑ خروجی اکسل",approve:"تأیید",reject:"رد",receive:"تحویل",edit:"ویرایش",del:"حذف",save:"ذخیره",search:"جستجو...",allDepts:"همه دپارتمان‌ها",date:"تاریخ",product:"کالا",qty:"تعداد",unitPrice:"قیمت واحد",total:"جمع کل",supplier:"تأمین‌کننده",department:"دپارتمان",invoice:"فاکتور",orderNo:"شماره سفارش",received:"تاریخ دریافت",note:"توضیحات",location:"محل مصرف",operator:"اپراتور",status:"وضعیت",actions:"عملیات",code:"کد",unit:"واحد",purchased:"خریداری شده",consumed:"مصرف شده",returned:"برگشتی",stock:"موجودی",avgPrice:"میانگین قیمت",stockValue:"ارزش",lowStock:"کم‌موجودی",ok:"مطلوب",noAccess:"شما دسترسی به این بخش را ندارید.",approvalNote:"خریدهای جدید نیاز به تأیید مدیر دارند.",loading:"در حال بارگذاری...",logout:"خروج",discrepancy:"مصرف غیرعادی شناسایی شد",staffWelcome:"مصرف خود را اینجا ثبت کنید",selectProduct:"انتخاب کالا...",selectDept:"انتخاب دپارتمان...",selectLocation:"انتخاب محل...",minStock:"حداقل موجودی",itemCode:"کد کالا",itemName:"نام کالا",itemNameFa:"نام (فارسی)",itemNameHe:"نام (عبری)",reason:"دلیل",fromLocation:"از محل",receivedBy:"دریافت‌کننده",deliveredTo:"تحویل به",deliveryPerson:"تحویل‌دهنده",image:"تصویر",returnQty:"مقدار برگشتی",editItem:"ویرایش کالا",newItem:"کالای جدید",overview:"نمای کلی",catalog:"کاتالوگ",transactions:"تراکنش‌ها",insights:"تحلیل",products:"کالا",approved:"تأیید شده",needsAttention:"نیاز به توجه",allItemsOk:"همه‌چیز خوبه",awaitingApproval:"در انتظار تأیید",queueClear:"صف خالیه",stockHealth:"وضعیت موجودی",topItems:"کالاهای پرارزش",inStock:"در انبار",reports:"گزارش‌ها",pools:"استخرها",poolOverview:"نمای کلی استخرها",poolLog:"ثبت مواد شیمیایی",poolHistory:"تاریخچه",poolDashboard:"داشبورد استخر",poolStatus:"وضعیت",poolBaseline:"پایه (kg/ماه)",poolActual:"واقعی (kg)",poolLogEntry:"ثبت مصرف مواد",noLogs:"ثبتی این ماه نیست",loggedBy:"ثبت‌کننده",waterQuality:"کیفیت آب",phLevel:"pH",clPpm:"کلر (ppm)",poolReport:"گزارش استخر",budgetUsed:"بودجه مصرفی",allPools:"همه استخرها",poolType:"نوع",volume:"حجم",logChemical:"ماده شیمیایی",resortMap:"نقشه ریزورت",database:"دیتابیس",addLocation:"افزودن موقعیت",editLocation:"ویرایش موقعیت",locationName:"نام موقعیت",locationCategory:"دسته‌بندی",locationDesc:"توضیحات",locationArea:"مساحت (M²)",locationFloor:"طبقه / زون",locationCap:"ظرفیت",locationNotes:"یادداشت",placed:"روی نقشه",unplacedLoc:"بدون موقعیت",catFilter:"فیلتر دسته",addMode:"روی نقشه کلیک کنید",cancelAdd:"لغو",reportsDesc:"گزارش‌های دلخواه بساز — بخش‌ها رو انتخاب کن، Excel دانلود کن",selectReports:"گزارش‌های مورد نظر رو انتخاب کن",selectAll:"انتخاب همه",clearAll:"حذف انتخاب",generateReport:"↓ ساخت گزارش (Excel)",reportInventory:"موجودی انبار",reportTransactions:"تراکنش‌ها",reportAnalytics:"تحلیل",reportAudit:"حسابرسی",inventorySummary:"خلاصه موجودی",inventorySummaryDesc:"همه کالاها با موجودی، ارزش و وضعیت",lowStockReport:"کالاهای کم‌موجود",lowStockDesc:"کالاهای زیر حداقل تعریف شده",topItemsByValue:"کالاهای پرارزش",topItemsByValueDesc:"باارزش‌ترین اقلام انبار",allPurchasesReport:"کل خریدها",allPurchasesDesc:"لیست کامل با همه جزئیات",approvedPurchases:"خریدهای تأیید شده",approvedPurchasesDesc:"هزینه‌های تأیید شده، تمرکز مالی",pendingPurchases:"در انتظار تأیید",pendingPurchasesDesc:"در انتظار تصمیم مدیر",consumptionDetail:"جزئیات مصرف",consumptionDetailDesc:"کی چی برداشت، از کجا، کی",returnsReport:"برگشتی‌ها",returnsDesc:"کالاهای برگشتی به انبار",ordersReport:"سفارش‌ها",ordersReportDesc:"سفارش‌های در انتظار و تأیید شده",consumptionByDept:"مصرف بر اساس دپارتمان",consumptionByDeptDesc:"مصرف تجمیعی بر اساس محل",consumptionByOperator:"مصرف بر اساس اپراتور",consumptionByOperatorDesc:"کی چقدر مصرف کرده",deliveryReport:"گزارش تحویل",deliveryReportDesc:"کی چی به کی تحویل داده",suppliersReport:"خلاصه تأمین‌کنندگان",suppliersReportDesc:"تحلیل هزینه بر اساس تأمین‌کننده",financialSummary:"خلاصه مالی",financialSummaryDesc:"جمع‌ها، شاخص‌ها، اعداد کلیدی",anomaliesReport:"تشخیص غیرعادی",anomaliesDesc:"الگوهای مصرف غیرعادی",activityLogReport:"گزارش فعالیت",activityLogDesc:"مسیر کامل حسابرسی با کاربر و زمان",reportGenerated:"گزارش با موفقیت ساخته شد",noReportsSelected:"حداقل یک گزارش انتخاب کن"}
};

const DEPTS = ["General Maintenance","Gardening","Cleaning","Pools","Security","Equipment Repairs"];
const POOL_PRICES = {pwd56:3.60, pwd90:3.80, flo:1.35, alg:1.50, cla:1.40, lcl:1.00, lac:0.85};
const POOL_CHEMICALS = [
  {key:"qty_pwd56", label:"Pwd Chlorine 56%", unit:"kg", price:3.60},
  {key:"qty_pwd90", label:"Pwd Chlorine 90%", unit:"kg", price:3.80},
  {key:"qty_flo",   label:"Flocculant",        unit:"kg", price:1.35},
  {key:"qty_alg",   label:"Algaecide",          unit:"kg", price:1.50},
  {key:"qty_cla",   label:"Clarifier",           unit:"kg", price:1.40},
  {key:"qty_lcl",   label:"Liquid Chlorine",     unit:"kg", price:1.00},
  {key:"qty_lac",   label:"Liquid Acid",         unit:"kg", price:0.85},
];

const RESORT_CATEGORIES = [
  {key:"pool",       label:"Pool",         icon:"🏊", color:"#0891b2"},
  {key:"building",   label:"Building",     icon:"🏢", color:"#3b82f6"},
  {key:"restaurant", label:"Restaurant",   icon:"🍽", color:"#f59e0b"},
  {key:"spa",        label:"SPA/Wellness", icon:"💆", color:"#8b5cf6"},
  {key:"garden",     label:"Garden",       icon:"🌿", color:"#10b981"},
  {key:"sport",      label:"Sport/Beach",  icon:"🏅", color:"#f97316"},
  {key:"maintenance",label:"Maintenance",  icon:"🔧", color:"#64748b"},
  {key:"other",      label:"Other",        icon:"📍", color:"#94a3b8"},
];

const MAP_W=1000, MAP_H=706;
const RESORT_MAP="data:image/jpeg;base64,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";

const REPORT_CATEGORIES = [
  {key:"inventory",    icon:"📦"},
  {key:"transactions", icon:"💳"},
  {key:"analytics",    icon:"📊"},
  {key:"audit",        icon:"🔒"},
];

const REPORT_TYPES = [
  {key:"inventorySummary",      cat:"inventory"},
  {key:"lowStockReport",        cat:"inventory"},
  {key:"topItemsByValue",       cat:"inventory"},
  {key:"allPurchasesReport",    cat:"transactions"},
  {key:"approvedPurchases",     cat:"transactions"},
  {key:"pendingPurchases",      cat:"transactions"},
  {key:"consumptionDetail",     cat:"transactions"},
  {key:"returnsReport",         cat:"transactions"},
  {key:"ordersReport",          cat:"transactions"},
  {key:"consumptionByDept",     cat:"analytics"},
  {key:"consumptionByOperator", cat:"analytics"},
  {key:"deliveryReport",        cat:"analytics"},
  {key:"suppliersReport",       cat:"analytics"},
  {key:"financialSummary",      cat:"analytics"},
  {key:"anomaliesReport",       cat:"analytics"},
  {key:"activityLogReport",     cat:"audit"},
];

const SUPPLIERS_LIST = ["Kalbo Materials","Garden Eden","Clean Supply","Pool Tech","Security Plus"];
const CHART_COLORS = ["#6366f1","#22d3ee","#f59e0b","#f87171","#34d399","#a78bfa","#fb923c","#38bdf8"];
const STATUS_META = {pending:{en:"Pending",fa:"در انتظار",color:"#f59e0b"},approved:{en:"Approved",fa:"تأیید شده",color:"#10b981"},rejected:{en:"Rejected",fa:"رد شده",color:"#ef4444"},delivered:{en:"Delivered",fa:"تحویل شده",color:"#3b82f6"},confirmed:{en:"Confirmed",fa:"تأیید",color:"#6366f1"},cancelled:{en:"Cancelled",fa:"لغو شده",color:"#8892b0"}};
const NAV_GROUPS = [
  {key:"overview",     items:["dashboard"]},
  {key:"catalog",      items:["itemsMgmt","inventory"]},
  {key:"transactions", items:["purchases","consumption","returns","orders"]},
  {key:"pools",        items:["pools"]},
  {key:"database",     items:["resortMap"]},
  {key:"insights",     items:["reports","suppliers","activityLog"]},
];
const TAB_ICONS = {reports:"📋",pools:"🏊",resortMap:"🗺",dashboard:"◈",itemsMgmt:"⊞",inventory:"▦",purchases:"↓",consumption:"↗",returns:"↩",orders:"◎",suppliers:"⊡",activityLog:"📋"};

const fmt = n => Number(n||0).toLocaleString("en-US");
const curr = n => `₺${fmt(n)}`;

function Modal({ open, title, onClose, children, theme }) {
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)"}}>
      <div style={{background:theme.bgElev,border:`1px solid ${theme.border}`,borderRadius:18,width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"auto",padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{color:theme.textHeading,fontSize:17,fontWeight:700,margin:0}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:theme.textMuted,cursor:"pointer",fontSize:22}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Inp({ label, value, onChange, type="text", required, placeholder, theme }) {
  return (
    <div style={{marginBottom:12}}>
      {label && <label style={{display:"block",color:theme.textMuted,fontSize:11,marginBottom:5,fontWeight:600}}>{label}{required&&<span style={{color:"#f87171"}}> *</span>}</label>}
      <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""}
        style={{width:"100%",background:theme.bgInput,border:`1px solid ${theme.borderStrong}`,borderRadius:8,padding:"9px 12px",color:theme.text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
    </div>
  );
}

function Sel({ label, value, onChange, options, theme }) {
  return (
    <div style={{marginBottom:12}}>
      {label && <label style={{display:"block",color:theme.textMuted,fontSize:11,marginBottom:5,fontWeight:600}}>{label}</label>}
      <select value={value||""} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",background:theme.bgInput,border:`1px solid ${theme.borderStrong}`,borderRadius:8,padding:"9px 12px",color:theme.text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

const Badge = ({ label, color }) => (
  <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:color+"22",color,border:`1px solid ${color}44`}}>{label}</span>
);

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("stocktrack-theme") || "dark");
  const [lang, setLang] = useState(() => localStorage.getItem("stocktrack-lang") || "en");
  const [tab, setTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [now, setNow] = useState(new Date());
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [consumptions, setConsumptions] = useState([]);
  const [returns, setReturns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [imgPreview, setImgPreview] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 900);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportSelections, setReportSelections] = useState({});
  const [pools, setPools] = useState([]);
  const [poolLogs, setPoolLogs] = useState([]);
  const [poolSubTab, setPoolSubTab] = useState("overview");
  const [resortLocations, setResortLocations] = useState([]);
  const [selLocation, setSelLocation] = useState(null);
  const [dbAddMode, setDbAddMode] = useState(false);
  const [dbCatFilter, setDbCatFilter] = useState("all");
  const [dbForm, setDbForm] = useState({name:"",category:"pool",subcategory:"",description:"",area_m2:"",floor_level:"",capacity:"",notes:"",map_x:null,map_y:null});
  const [dbFormOpen, setDbFormOpen] = useState(false);
  const [dbEditId, setDbEditId] = useState(null);
  const [dbMapScale, setDbMapScale] = useState(0.55);
  const [dbMapTx, setDbMapTx] = useState(0);
  const [dbMapTy, setDbMapTy] = useState(20);
  const dbMapRef = useRef(null);
  const dbPanRef = useRef({active:false,lx:0,ly:0});

  const [mapScale, setMapScale] = useState(1);
  const [mapTx, setMapTx] = useState(0);
  const [mapTy, setMapTy] = useState(0);
  const [mapDraggingPin, setMapDraggingPin] = useState(null);
  const [mapEditMode, setMapEditMode] = useState(false);
  const mapRef = useRef(null);
  const mapPanRef = useRef({active:false,lx:0,ly:0});
  const [selPoolId, setSelPoolId] = useState(null);
  const [poolForm, setPoolForm] = useState({pool_id:"",log_date:new Date().toISOString().slice(0,10),qty_pwd56:0,qty_pwd90:0,qty_flo:0,qty_alg:0,qty_cla:0,qty_lcl:0,qty_lac:0,ph_level:"",cl_ppm:"",notes:""});
  const imgRef = useRef();
  const t = T[lang];
  const TH = THEMES[theme];
  const sf = k => v => setForm(f=>({...f,[k]:v}));

  useEffect(() => { localStorage.setItem("stocktrack-theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("stocktrack-lang", lang); }, [lang]);
  useEffect(() => { const i = setInterval(()=>setNow(new Date()), 1000); return ()=>clearInterval(i); }, []);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ─── SECURITY: Auto-logout after 30 min of inactivity ───
  useEffect(() => {
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try { await logAction("Auto Logout (Idle)", `Session expired after 30min idle by:${user?.email}`); } catch(e){}
        supabase.auth.signOut();
      }, 30*60*1000); // 30 minutes
    };
    const events = ["mousedown","keydown","scroll","touchstart"];
    events.forEach(e => window.addEventListener(e, reset, {passive:true}));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [user]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        const admin = user.app_metadata?.role === "admin" || ADMIN_EMAILS.includes(user.email) || user.user_metadata?.role === "admin";
        setIsAdmin(admin);
        setTab(admin ? "dashboard" : "consumption");
      }
    });
  }, []);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [i,p,c,r,o,l] = await Promise.all([
        supabase.from("items").select("*").order("id"),
        supabase.from("purchases").select("*").order("created_at",{ascending:false}),
        supabase.from("consumptions").select("*").order("created_at",{ascending:false}),
        supabase.from("returns").select("*").order("created_at",{ascending:false}),
        supabase.from("orders").select("*").order("created_at",{ascending:false}),
        supabase.from("activity_log").select("*").order("created_at",{ascending:false}).limit(200),
      ]);
      if(i.data) setItems(i.data);
      if(p.data) setPurchases(p.data.map(x=>({...x,itemId:x.item_id,unitPrice:x.unit_price,orderNo:x.order_no,receivedDate:x.received_date})));
      if(c.data) setConsumptions(c.data.map(x=>({...x,itemId:x.item_id,deliveredTo:x.delivered_to,deliveryPerson:x.delivery_person})));
      if(r.data) setReturns(r.data.map(x=>({...x,itemId:x.item_id,fromLocation:x.from_location,receivedBy:x.received_by})));
      if(o.data) setOrders(o.data.map(x=>({...x,itemId:x.item_id})));
      if(l.data) setLogs(l.data);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function logAction(action, details) {
    await supabase.from("activity_log").insert([{
      action,
      details,
      user_email: user?.email,
      user_agent: typeof navigator!=="undefined" ? navigator.userAgent.slice(0,255) : null,
      created_at: new Date().toISOString()
    }]);
  }

  const inventory = useMemo(() => items.map(item => {
    const bought   = purchases.filter(p=>p.itemId===item.id&&p.status==="approved").reduce((s,p)=>s+Number(p.qty),0);
    const used     = consumptions.filter(c=>c.itemId===item.id).reduce((s,c)=>s+Number(c.qty),0);
    const returned = returns.filter(r=>r.itemId===item.id).reduce((s,r)=>s+Number(r.qty),0);
    const stock    = bought - used + returned;
    const cost     = purchases.filter(p=>p.itemId===item.id&&p.status==="approved").reduce((s,p)=>s+Number(p.qty)*Number(p.unitPrice),0);
    const avg      = bought>0 ? cost/bought : 0;
    return {...item, bought, used, returned, stock, avg, totalValue:Math.max(0,stock)*avg, low:stock<item.min_stock};
  }),[items,purchases,consumptions,returns]);

  const totalValue   = useMemo(()=>inventory.reduce((s,i)=>s+i.totalValue,0),[inventory]);
  const totalSpend   = useMemo(()=>purchases.filter(p=>p.status==="approved").reduce((s,p)=>s+p.qty*p.unitPrice,0),[purchases]);
  const lowStock     = useMemo(()=>inventory.filter(i=>i.low),[inventory]);
  const pendingCount = useMemo(()=>purchases.filter(p=>p.status==="pending").length,[purchases]);

  const deptData = useMemo(()=>{
    const m={};
    purchases.filter(p=>p.status==="approved").forEach(p=>{const d=p.department||"?";m[d]=(m[d]||0)+p.qty*p.unitPrice;});
    return Object.entries(m).map(([dept,total])=>({dept,total})).sort((a,b)=>b.total-a.total);
  },[purchases]);

  const supplierData = useMemo(()=>{
    const m={};
    purchases.filter(p=>p.status==="approved").forEach(p=>{m[p.supplier]=(m[p.supplier]||0)+p.qty*p.unitPrice;});
    return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  },[purchases]);

  const discrepancies = useMemo(()=>items.map(item=>{
    const cons=consumptions.filter(c=>c.itemId===item.id);
    if(cons.length<2)return null;
    const avg=cons.reduce((s,c)=>s+Number(c.qty),0)/cons.length;
    const last=Number(cons[0]?.qty||0);
    if(last>avg*3&&last>10)return{item,last,avg:Math.round(avg)};
    return null;
  }).filter(Boolean),[items,consumptions]);

  function openM(type,data={}) { setForm({...data}); setModal(type); setImgPreview(data.image_url||null); }
  function closeM() { setModal(null); setForm({}); setImgPreview(null); }

  function handleImageFile(e) {
    const file = e.target.files[0];
    if(!file) return;
    if(file.size > 2*1024*1024) { alert("Image too large. Max 2MB."); return; }
    const reader = new FileReader();
    reader.onload = ev => { setImgPreview(ev.target.result); setForm(f=>({...f,image_url:ev.target.result})); };
    reader.readAsDataURL(file);
  }

  async function saveItem() {
    if(!form.code||!form.name) return alert("Code and Name are required");
    if(form.image_url && !/^(data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,|https?:\/\/)/.test(form.image_url)){
      return alert("Invalid image — must be an uploaded image or HTTPS URL");
    }
    if((form.code||"").length>50||(form.name||"").length>200||(form.supplier||"").length>200){
      return alert("Field too long");
    }
    setSaving(true);
    const rec = {code:String(form.code).slice(0,50),name:String(form.name).slice(0,200),unit:String(form.unit||"unit").slice(0,30),min_stock:Math.max(0,Number(form.min_stock||0)),supplier:String(form.supplier||"").slice(0,200),image_url:form.image_url||null};
    let result;
    if(form.id) {
      const old = items.find(i=>i.id===form.id);
      result = await supabase.from("items").update(rec).eq("id",form.id);
      if(result.error){setSaving(false);return alert("Update failed: "+result.error.message);}
      await logAction("Edit Item", `ID:${form.id} | new: name=${rec.name} | old: name=${old?.name} | by:${user?.email}`);
    } else {
      result = await supabase.from("items").insert([rec]);
      if(result.error){setSaving(false);return alert("Insert failed: "+result.error.message+"\n\nLikely you don't have admin permission. Make sure your user has app_metadata.role=\"admin\" set in Supabase.");}
      await logAction("Add Item", `code:${form.code} name:${form.name} unit:${form.unit} min:${form.min_stock} by:${user?.email}`);
    }
    await loadAll(); closeM(); setSaving(false);
  }

  async function deleteItem(id) {
    const it = items.find(i=>i.id===id);
    if(!window.confirm(`Delete "${it?.name}"? This cannot be undone.`)) return;
    await supabase.from("items").delete().eq("id",id);
    await logAction("Delete Item", `ID:${id} name:${it?.name} by:${user?.email}`);
    await loadAll();
  }

  async function savePurchase() {
    if(!form.date||!form.itemId||!form.qty||!form.unitPrice) return alert("Fill required fields");
    const qty = Number(form.qty), price = Number(form.unitPrice);
    if(qty<0||price<0) return alert("Quantity and price must be non-negative");
    if(qty>1000000||price>10000000) return alert("Value too large");
    setSaving(true);
    const it = items.find(i=>i.id===Number(form.itemId));
    const rec = {date:String(form.date).slice(0,30),item_id:Number(form.itemId),qty,unit_price:price,supplier:String(form.supplier||"").slice(0,200),invoice:String(form.invoice||"").slice(0,100),order_no:String(form.orderNo||"").slice(0,100),received_date:String(form.receivedDate||"").slice(0,30),department:String(form.department||"").slice(0,100),note:String(form.note||"").slice(0,500),status:isAdmin?"approved":"pending",created_by:user?.email};
    let result;
    if(form.id) { result = await supabase.from("purchases").update(rec).eq("id",form.id); if(result.error){setSaving(false);return alert("Update failed: "+result.error.message);} await logAction("Edit Purchase", `ID:${form.id} item:${it?.name} qty:${form.qty} price:${form.unitPrice} by:${user?.email}`); }
    else { result = await supabase.from("purchases").insert([rec]); if(result.error){setSaving(false);return alert("Insert failed: "+result.error.message);} await logAction("New Purchase", `item:${it?.name} qty:${form.qty} price:${form.unitPrice} supplier:${form.supplier} status:${rec.status} by:${user?.email}`); }
    await loadAll(); closeM(); setSaving(false);
  }

  async function approvePurchase(p) { const it=items.find(i=>i.id===p.itemId); await supabase.from("purchases").update({status:"approved"}).eq("id",p.id); await logAction("Approved Purchase", `ID:${p.id} item:${it?.name} qty:${p.qty} supplier:${p.supplier} by:${user?.email}`); await loadAll(); }
  async function rejectPurchase(p) { const it=items.find(i=>i.id===p.itemId); await supabase.from("purchases").update({status:"rejected"}).eq("id",p.id); await logAction("Rejected Purchase", `ID:${p.id} item:${it?.name} qty:${p.qty} by:${user?.email}`); await loadAll(); }
  async function deletePurchase(id) { if(!window.confirm("Delete this purchase?"))return; const p=purchases.find(x=>x.id===id); const it=items.find(i=>i.id===p?.itemId); await supabase.from("purchases").delete().eq("id",id); await logAction("Delete Purchase", `ID:${id} item:${it?.name} qty:${p?.qty} by:${user?.email}`); await loadAll(); }

  async function saveConsumption() {
    if(!form.date||!form.itemId||!form.qty||!form.location) return alert("Fill required fields");
    const inv=inventory.find(i=>i.id===Number(form.itemId));
    if(inv&&!form.id&&Number(form.qty)>inv.stock) return alert(`Not enough stock. Available: ${inv.stock} ${inv.unit}`);
    setSaving(true);
    const it=items.find(i=>i.id===Number(form.itemId));
    const rec = {date:form.date,item_id:Number(form.itemId),qty:Number(form.qty),location:form.location||"",operator:form.operator||user?.email||"",delivered_to:form.deliveredTo||"",delivery_person:form.deliveryPerson||"",note:form.note||"",created_by:user?.email};
    if(form.id) { await supabase.from("consumptions").update(rec).eq("id",form.id); await logAction("Edit Consumption", `ID:${form.id} item:${it?.name} qty:${form.qty} loc:${form.location} by:${user?.email}`); }
    else { await supabase.from("consumptions").insert([rec]); await logAction("Log Consumption", `item:${it?.name} qty:${form.qty} loc:${form.location} to:${form.deliveredTo||"-"} by:${user?.email}`); }
    await loadAll(); closeM(); setSaving(false);
  }
  async function deleteConsumption(id) { if(!window.confirm("Delete?"))return; const c=consumptions.find(x=>x.id===id); const it=items.find(i=>i.id===c?.itemId); await supabase.from("consumptions").delete().eq("id",id); await logAction("Delete Consumption", `ID:${id} item:${it?.name} qty:${c?.qty} by:${user?.email}`); await loadAll(); }

  async function saveReturn() {
    if(!form.date||!form.itemId||!form.qty) return alert("Fill required fields");
    setSaving(true);
    const it=items.find(i=>i.id===Number(form.itemId));
    const rec = {date:form.date,item_id:Number(form.itemId),qty:Number(form.qty),reason:form.reason||"",from_location:form.fromLocation||"",received_by:form.receivedBy||user?.email||"",note:form.note||"",created_by:user?.email};
    if(form.id) { await supabase.from("returns").update(rec).eq("id",form.id); await logAction("Edit Return", `ID:${form.id} item:${it?.name} qty:${form.qty} by:${user?.email}`); }
    else { await supabase.from("returns").insert([rec]); await logAction("Return to Warehouse", `item:${it?.name} qty:${form.qty} from:${form.fromLocation} reason:${form.reason} by:${user?.email}`); }
    await loadAll(); closeM(); setSaving(false);
  }
  async function deleteReturn(id) { if(!window.confirm("Delete?"))return; const r=returns.find(x=>x.id===id); const it=items.find(i=>i.id===r?.itemId); await supabase.from("returns").delete().eq("id",id); await logAction("Delete Return", `ID:${id} item:${it?.name} qty:${r?.qty} by:${user?.email}`); await loadAll(); }

  async function saveOrder() {
    if(!form.date||!form.itemId||!form.qty) return alert("Fill required fields");
    setSaving(true);
    const it=items.find(i=>i.id===Number(form.itemId));
    const rec = {date:form.date,item_id:Number(form.itemId),qty:Number(form.qty),supplier:form.supplier||"",status:form.status||"pending",note:form.note||"",created_by:user?.email};
    if(form.id) { await supabase.from("orders").update(rec).eq("id",form.id); } else { await supabase.from("orders").insert([rec]); }
    await logAction("Order", `item:${it?.name} qty:${form.qty} supplier:${form.supplier} by:${user?.email}`);
    await loadAll(); closeM(); setSaving(false);
  }
  async function receiveOrder(o) { await supabase.from("orders").update({status:"delivered"}).eq("id",o.id); openM("purchase",{date:new Date().toISOString().slice(0,10),itemId:o.itemId,qty:o.qty,unitPrice:"",supplier:o.supplier||"",invoice:"",orderNo:"",receivedDate:"",department:"",note:o.note||""}); }
  async function deleteOrder(id) { if(!window.confirm("Delete?"))return; await supabase.from("orders").delete().eq("id",id); await loadAll(); }

  // ─── QUICK EXPORT (used by sidebar button) ───
  function exportExcel() {
    const ts = new Date().toLocaleString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventory.map(i=>({Code:i.code,Name:i.name,Stock:i.stock,Min:i.min_stock,Value:Math.round(i.totalValue),Status:i.stock<=0?"OUT":i.low?"LOW":"OK",Supplier:i.supplier,ReportTime:ts}))), "Inventory");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchases.map(p=>{const it=items.find(i=>i.id===p.itemId);return{Date:p.date,Product:it?.name,Qty:p.qty,UnitPrice:p.unitPrice,Total:Math.round(p.qty*p.unitPrice),Supplier:p.supplier,Status:p.status,CreatedAt:p.created_at?new Date(p.created_at).toLocaleString("en-GB"):"",ReportTime:ts};})), "Purchases");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consumptions.map(c=>{const it=items.find(i=>i.id===c.itemId);return{Date:c.date,Product:it?.name,Qty:c.qty,Location:c.location,DeliveredTo:c.deliveredTo,DeliveredBy:c.deliveryPerson,Operator:c.operator,CreatedAt:c.created_at?new Date(c.created_at).toLocaleString("en-GB"):"",ReportTime:ts};})), "Consumption");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(returns.map(r=>{const it=items.find(i=>i.id===r.itemId);return{Date:r.date,Product:it?.name,Qty:r.qty,Reason:r.reason,From:r.fromLocation,ReceivedBy:r.receivedBy,CreatedAt:r.created_at?new Date(r.created_at).toLocaleString("en-GB"):"",ReportTime:ts};})), "Returns");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logs.map(l=>({DateTime:l.created_at?new Date(l.created_at).toLocaleString("en-GB"):"",Action:l.action,Details:l.details,User:l.user_email}))), "Activity Log");
    const fname = `StockTrack_QuickExport_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.xlsx`;
    XLSX.writeFile(wb, fname);
  }

  // ─── RESORT DATABASE CRUD ──────────────────────────────────────────
  async function saveResortLocation(){
    if(!dbForm.name.trim()||!dbForm.category)return alert("Name and category required");
    setSaving(true);
    const rec={name:dbForm.name.trim(),category:dbForm.category,subcategory:dbForm.subcategory||null,
      description:dbForm.description||null,area_m2:dbForm.area_m2?Number(dbForm.area_m2):null,
      floor_level:dbForm.floor_level||null,capacity:dbForm.capacity?Number(dbForm.capacity):null,
      notes:dbForm.notes||null,map_x:dbForm.map_x||null,map_y:dbForm.map_y||null,
      on_map:!!(dbForm.map_x&&dbForm.map_y),created_by:user?.email||""};
    if(dbEditId){
      delete rec.created_by;
      rec.updated_at=new Date().toISOString();
      await supabase.from("resort_locations").update(rec).eq("id",dbEditId);
      await logAction("Resort DB Update",`Updated: ${rec.name} [${rec.category}] by ${user?.email}`);
    } else {
      await supabase.from("resort_locations").insert([rec]);
      await logAction("Resort DB Add",`Added: ${rec.name} [${rec.category}] by ${user?.email}`);
    }
    await loadAll();
    setDbFormOpen(false);setDbEditId(null);setDbAddMode(false);
    setDbForm({name:"",category:"pool",subcategory:"",description:"",area_m2:"",floor_level:"",capacity:"",notes:"",map_x:null,map_y:null});
    setSaving(false);
  }
  async function deleteResortLocation(id){
    if(!window.confirm("Delete this location?"))return;
    await supabase.from("resort_locations").update({is_active:false}).eq("id",id);
    await logAction("Resort DB Delete",`Deleted ID:${id} by ${user?.email}`);
    await loadAll();setSelLocation(null);
  }

  // ─── POOL MAP POSITION ──────────────────────────────────────────
  async function savePoolPosition(poolId, mx, my, onMap) {
    await supabase.from("pools").update({map_x:Math.round(mx*10)/10, map_y:Math.round(my*10)/10, on_map:onMap!==false}).eq("id",poolId);
    await loadAll();
  }

  // ─── POOL CHEMICAL LOG ────────────────────────────────────────
  async function savePoolLog() {
    if (!poolForm.pool_id || !poolForm.log_date) return alert("Select pool and date");
    setSaving(true);
    const rec = {
      pool_id: Number(poolForm.pool_id),
      log_date: poolForm.log_date,
      qty_pwd56: Number(poolForm.qty_pwd56||0),
      qty_pwd90: Number(poolForm.qty_pwd90||0),
      qty_flo:   Number(poolForm.qty_flo||0),
      qty_alg:   Number(poolForm.qty_alg||0),
      qty_cla:   Number(poolForm.qty_cla||0),
      qty_lcl:   Number(poolForm.qty_lcl||0),
      qty_lac:   Number(poolForm.qty_lac||0),
      ph_level:  poolForm.ph_level||null,
      cl_ppm:    poolForm.cl_ppm||null,
      notes:     poolForm.notes||"",
      logged_by: user?.email||"",
    };
    const pool = pools.find(p=>p.id===rec.pool_id);
    const totalCost = POOL_CHEMICALS.reduce((s,c)=>s+(rec[c.key]||0)*c.price, 0);
    const res = await supabase.from("pool_chemical_logs").insert([rec]);
    if (res.error) { setSaving(false); return alert("Error: "+res.error.message); }
    await logAction("Pool Chemical Log", `pool:${pool?.name} date:${rec.log_date} cost:€${totalCost.toFixed(2)} by:${user?.email}`);
    await loadAll();
    setPoolForm({pool_id:poolForm.pool_id,log_date:poolForm.log_date,qty_pwd56:0,qty_pwd90:0,qty_flo:0,qty_alg:0,qty_cla:0,qty_lcl:0,qty_lac:0,ph_level:"",cl_ppm:"",notes:""});
    setSaving(false);
    alert("✓ Chemical log saved!");
  }

  // ─── QUICK EXPORT (sidebar button) ────────────────────────────
  function exportExcel() {
    const ts = new Date().toLocaleString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventory.map(i=>({Code:i.code,Product:i.name,Unit:i.unit,Purchased:i.purchased,Consumed:i.consumed,Returned:i.returned,Stock:i.stock,"Min Stock":i.min_stock,"Avg Price":Math.round(i.avgPrice||0),"Stock Value":Math.round(i.totalValue||0)}))), "Inventory");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchases.map(p=>{const it=items.find(i=>i.id===p.itemId);return{Date:p.date,"Order No":p.orderNo,Invoice:p.invoice,Supplier:p.supplier,Product:it?.name||"",Qty:p.qty,"Unit Price":p.unitPrice,Total:Math.round(p.qty*p.unitPrice),Dept:p.department,Status:p.status,By:p.created_by};})), "Purchases");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consumptions.map(c=>{const it=items.find(i=>i.id===c.itemId);return{Date:c.date,Product:it?.name||"",Qty:c.qty,Location:c.location,"Delivered To":c.deliveredTo||"","Delivered By":c.deliveryPerson||"",Operator:c.operator||"",Note:c.note||"",By:c.created_by};})), "Consumption");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(returns.map(r=>{const it=items.find(i=>i.id===r.itemId);return{Date:r.date,Product:it?.name||"",Qty:r.qty,Reason:r.reason||"","From Location":r.fromLocation||"","Received By":r.receivedBy||"",Note:r.note||"",By:r.created_by};})), "Returns");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logs.map(l=>({Action:l.action,Details:l.details,By:l.user_email,Time:l.created_at?new Date(l.created_at).toLocaleString("en-GB"):""}))), "Activity Log");
    XLSX.writeFile(wb, `StockTrack_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  // ─── CUSTOM REPORT GENERATION ───────────────────────────────────
  async function generateCustomReport() {
    const selected = Object.keys(reportSelections).filter(k => reportSelections[k]);
    if (selected.length === 0) return alert(t.noReportsSelected);

    const d = (iso) => iso ? new Date(iso).toLocaleString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "";
    const now = d(new Date().toISOString());
    const wb = XLSX.utils.book_new();

    // ── Report Info ──
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      {Field:"Generated At",    Value: now},
      {Field:"Generated By",   Value: user?.email||""},
      {Field:"Sections",        Value: selected.join(", ")},
      {Field:"Total Items",     Value: items.length},
      {Field:"Total Purchases", Value: purchases.length},
      {Field:"Total Consumption",Value:consumptions.length},
      {Field:"Total Returns",   Value: returns.length},
    ]), "Report Info");

    const addSheet = (name, data) => {
      if (data.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), name.slice(0,31));
    };

    // ── 1. Inventory Summary ──
    if (selected.includes("inventorySummary")) {
      addSheet("Inventory", inventory.map(i => ({
        Code:           i.code,
        Product:        i.name,
        Unit:           i.unit,
        Purchased:      i.purchased,
        Consumed:       i.consumed,
        Returned:       i.returned,
        Stock:          i.stock,
        "Min Stock":    i.min_stock,
        "Avg Price":    Math.round(i.avgPrice||0),
        "Stock Value":  Math.round(i.totalValue||0),
        Status:         i.stock<=0?"OUT":i.low?"LOW":"OK",
        Supplier:       i.supplier||"",
      })));
    }

    // ── 2. Low Stock ──
    if (selected.includes("lowStockReport")) {
      addSheet("Low Stock", inventory.filter(i=>i.low||i.stock<=0).map(i => ({
        Code:           i.code,
        Product:        i.name,
        Unit:           i.unit,
        Stock:          i.stock,
        "Min Stock":    i.min_stock,
        "Shortage Qty": Math.max(0, i.min_stock - i.stock),
        "Avg Price":    Math.round(i.avgPrice||0),
        "Restock Cost": Math.round(Math.max(0,i.min_stock-i.stock)*(i.avgPrice||0)),
        Status:         i.stock<=0?"OUT":"LOW",
        Supplier:       i.supplier||"",
      })));
    }

    // ── 3. All Purchases ──
    if (selected.includes("allPurchasesReport")) {
      addSheet("Purchases", purchases.map(p => {
        const it = items.find(i=>i.id===p.itemId);
        return {
          Date:         p.date||"",
          "Order No":   p.orderNo||"",
          Invoice:      p.invoice||"",
          Supplier:     p.supplier||"",
          Product:      it?.name||"",
          Unit:         it?.unit||"",
          Qty:          p.qty,
          "Unit Price": p.unitPrice,
          Total:        Math.round(p.qty*p.unitPrice),
          Dept:         p.department||"",
          "Received":   p.receivedDate||"",
          Status:       p.status,
          Note:         p.note||"",
          By:           p.created_by||"",
          "Logged At":  d(p.created_at),
        };
      }));
    }

    // ── 4. Approved Purchases ──
    if (selected.includes("approvedPurchases")) {
      addSheet("Approved Purchases", purchases.filter(p=>p.status==="approved").map(p => {
        const it = items.find(i=>i.id===p.itemId);
        return {
          Date:         p.date||"",
          "Order No":   p.orderNo||"",
          Invoice:      p.invoice||"",
          Supplier:     p.supplier||"",
          Product:      it?.name||"",
          Unit:         it?.unit||"",
          Qty:          p.qty,
          "Unit Price": p.unitPrice,
          Total:        Math.round(p.qty*p.unitPrice),
          Dept:         p.department||"",
          By:           p.created_by||"",
          "Logged At":  d(p.created_at),
        };
      }));
    }

    // ── 5. Pending Purchases ──
    if (selected.includes("pendingPurchases")) {
      addSheet("Pending Approvals", purchases.filter(p=>p.status==="pending").map(p => {
        const it = items.find(i=>i.id===p.itemId);
        return {
          Date:         p.date||"",
          Supplier:     p.supplier||"",
          Product:      it?.name||"",
          Unit:         it?.unit||"",
          Qty:          p.qty,
          "Unit Price": p.unitPrice,
          Total:        Math.round(p.qty*p.unitPrice),
          Dept:         p.department||"",
          Note:         p.note||"",
          "Requested By": p.created_by||"",
          "Submitted At": d(p.created_at),
        };
      }));
    }

    // ── 6. Consumption ──
    if (selected.includes("consumptionDetail")) {
      addSheet("Consumption", consumptions.map(c => {
        const it = items.find(i=>i.id===c.itemId);
        const inv = inventory.find(i=>i.id===c.itemId);
        return {
          Date:           c.date||"",
          Product:        it?.name||"",
          Unit:           it?.unit||"",
          Qty:            c.qty,
          "Est. Value":   Math.round(Number(c.qty)*(inv?.avgPrice||0)),
          Location:       c.location||"",
          "Delivered To": c.deliveredTo||"",
          "Delivered By": c.deliveryPerson||"",
          Operator:       c.operator||"",
          Note:           c.note||"",
          By:             c.created_by||"",
          "Logged At":    d(c.created_at),
        };
      }));
    }

    // ── 7. Returns ──
    if (selected.includes("returnsReport")) {
      addSheet("Returns", returns.map(r => {
        const it = items.find(i=>i.id===r.itemId);
        const inv = inventory.find(i=>i.id===r.itemId);
        return {
          Date:            r.date||"",
          Product:         it?.name||"",
          Unit:            it?.unit||"",
          Qty:             r.qty,
          "Est. Value":    Math.round(Number(r.qty)*(inv?.avgPrice||0)),
          Reason:          r.reason||"",
          "From Location": r.fromLocation||"",
          "Received By":   r.receivedBy||"",
          Note:            r.note||"",
          By:              r.created_by||"",
          "Logged At":     d(r.created_at),
        };
      }));
    }

    // ── 8. Orders ──
    if (selected.includes("ordersReport")) {
      addSheet("Orders", orders.map(o => {
        const it = items.find(i=>i.id===o.itemId);
        return {
          Date:     o.date||"",
          Product:  it?.name||"",
          Unit:     it?.unit||"",
          Qty:      o.qty,
          Supplier: o.supplier||"",
          Status:   o.status,
          Note:     o.note||"",
          By:       o.created_by||"",
          "Logged At": d(o.created_at),
        };
      }));
    }

    // ── 9. Consumption by Department ──
    if (selected.includes("consumptionByDept")) {
      const agg = {};
      consumptions.forEach(c => {
        const inv = inventory.find(i=>i.id===c.itemId);
        const it = items.find(i=>i.id===c.itemId);
        const dept = c.location||"—";
        if (!agg[dept]) agg[dept] = {Location:dept,Records:0,Items:new Set(),Operators:new Set(),TotalQty:0,"Est. Value":0,"First Date":"","Last Date":""};
        agg[dept].Records++;
        agg[dept].Items.add(it?.name||"");
        agg[dept].Operators.add(c.operator||"—");
        agg[dept].TotalQty += Number(c.qty);
        agg[dept]["Est. Value"] += Number(c.qty)*(inv?.avgPrice||0);
        if(!agg[dept]["First Date"]||c.date<agg[dept]["First Date"]) agg[dept]["First Date"]=c.date||"";
        if(!agg[dept]["Last Date"]||c.date>agg[dept]["Last Date"]) agg[dept]["Last Date"]=c.date||"";
      });
      addSheet("By Location", Object.values(agg).map(d=>({
        Location:d.Location, Records:d.Records,"Unique Items":d.Items.size,
        "Unique Operators":d.Operators.size,"Total Qty":d.TotalQty,
        "Est. Value":Math.round(d["Est. Value"]),"First Date":d["First Date"],"Last Date":d["Last Date"],
        "Report Generated At": now
      })));
    }

    // ── 10. Consumption by Operator ──
    if (selected.includes("consumptionByOperator")) {
      const agg = {};
      consumptions.forEach(c => {
        const inv = inventory.find(i=>i.id===c.itemId);
        const op = c.operator||"—";
        if (!agg[op]) agg[op] = {Operator:op,Records:0,Items:new Set(),Locations:new Set(),TotalQty:0,"Est. Value":0,"First Date":"","Last Date":""};
        agg[op].Records++;
        agg[op].Items.add(c.itemId);
        agg[op].Locations.add(c.location||"—");
        agg[op].TotalQty += Number(c.qty);
        agg[op]["Est. Value"] += Number(c.qty)*(inv?.avgPrice||0);
        if(!agg[op]["First Date"]||c.date<agg[op]["First Date"]) agg[op]["First Date"]=c.date||"";
        if(!agg[op]["Last Date"]||c.date>agg[op]["Last Date"]) agg[op]["Last Date"]=c.date||"";
      });
      addSheet("By Operator", Object.values(agg).map(d=>({
        Operator:d.Operator, Records:d.Records,"Unique Items":d.Items.size,
        "Unique Locations":d.Locations.size,"Total Qty":d.TotalQty,
        "Est. Value":Math.round(d["Est. Value"]),"First Date":d["First Date"],"Last Date":d["Last Date"],
        "Report Generated At": now
      })));
    }

    // ── 11. Deliveries ──
    if (selected.includes("deliveryReport")) {
      addSheet("Deliveries", consumptions.filter(c=>c.deliveredTo||c.deliveryPerson).map(c => {
        const it = items.find(i=>i.id===c.itemId);
        const inv = inventory.find(i=>i.id===c.itemId);
        return {
          Date:            c.date||"",
          Product:         it?.name||"",
          Qty:             c.qty,
          Unit:            it?.unit||"",
          "Est. Value":    Math.round(Number(c.qty)*(inv?.avgPrice||0)),
          "Delivered To":  c.deliveredTo||"",
          "Delivered By":  c.deliveryPerson||"",
          Location:        c.location||"",
          Operator:        c.operator||"",
          Note:            c.note||"",
          By:              c.created_by||"",
          "Logged At":     d(c.created_at),
        };
      }));
    }

    // ── 12. Suppliers ──
    if (selected.includes("suppliersReport")) {
      addSheet("Suppliers", SUPPLIERS_LIST.map(s => {
        const sp = purchases.filter(p=>p.supplier===s&&p.status==="approved");
        const all = purchases.filter(p=>p.supplier===s);
        const dates = sp.map(p=>p.date).filter(Boolean).sort();
        return {
          Supplier:           s,
          "Total Purchases":  all.length,
          "Approved":         sp.length,
          "Pending":          all.filter(p=>p.status==="pending").length,
          "Total Qty":        sp.reduce((s,p)=>s+Number(p.qty),0),
          "Total Spend":      Math.round(sp.reduce((s,p)=>s+p.qty*p.unitPrice,0)),
          "Avg Order Value":  sp.length ? Math.round(sp.reduce((s,p)=>s+p.qty*p.unitPrice,0)/sp.length) : 0,
          "First Purchase":   dates[0]||"",
          "Last Purchase":    dates[dates.length-1]||"",
        };
      }));
    }

    // ── 13. Financial Summary ──
    if (selected.includes("financialSummary")) {
      const totalVal = inventory.reduce((s,i)=>s+(i.totalValue||0),0);
      const apprSpend = purchases.filter(p=>p.status==="approved").reduce((s,p)=>s+p.qty*p.unitPrice,0);
      const pendSpend = purchases.filter(p=>p.status==="pending").reduce((s,p)=>s+p.qty*p.unitPrice,0);
      const consVal = consumptions.reduce((s,c)=>{const inv=inventory.find(i=>i.id===c.itemId);return s+Number(c.qty)*(inv?.avgPrice||0);},0);
      addSheet("Financial Summary", [
        {Metric:"Report Generated At",    Value: now},
        {Metric:"Generated By",           Value: user?.email||""},
        {Metric:"",Value:""},
        {Metric:"Total Stock Value (₺)",  Value: Math.round(totalVal)},
        {Metric:"Approved Spend (₺)",     Value: Math.round(apprSpend)},
        {Metric:"Pending Spend (₺)",      Value: Math.round(pendSpend)},
        {Metric:"Consumption Value (₺)",  Value: Math.round(consVal)},
        {Metric:"",Value:""},
        {Metric:"Items Total",            Value: items.length},
        {Metric:"Items OK",               Value: inventory.filter(i=>!i.low&&i.stock>0).length},
        {Metric:"Items Low Stock",        Value: inventory.filter(i=>i.low).length},
        {Metric:"Items Out of Stock",     Value: inventory.filter(i=>i.stock<=0).length},
        {Metric:"",Value:""},
        {Metric:"Purchases Total",        Value: purchases.length},
        {Metric:"Purchases Approved",     Value: purchases.filter(p=>p.status==="approved").length},
        {Metric:"Purchases Pending",      Value: purchases.filter(p=>p.status==="pending").length},
        {Metric:"Purchases Rejected",     Value: purchases.filter(p=>p.status==="rejected").length},
        {Metric:"",Value:""},
        {Metric:"Consumption Records",    Value: consumptions.length},
        {Metric:"Return Records",         Value: returns.length},
        {Metric:"Order Records",          Value: orders.length},
      ]);
    }

    // ── 14. Stock Discrepancy (for theft prevention) ──
    if (selected.includes("anomaliesReport")) {
      addSheet("Discrepancies", inventory.map(i => {
        const diff = i.stock - i.min_stock;
        return {
          Code:              i.code,
          Product:           i.name,
          Unit:              i.unit,
          Purchased:         i.purchased,
          Consumed:          i.consumed,
          Returned:          i.returned,
          "Current Stock":   i.stock,
          "Min Stock":       i.min_stock,
          "Surplus / Deficit": diff,
          "Stock Value":     Math.round(i.totalValue||0),
          Status:            i.stock<=0?"⚠ OUT":i.low?"⚠ LOW":"✓ OK",
          Supplier:          i.supplier||"",
          "Report At":       now,
        };
      }));
    }

    // ── 15. Anomalies (unusual consumption) ──
    if (selected.includes("topItemsByValue")) {
      addSheet("High Value Items", [...inventory].sort((a,b)=>b.totalValue-a.totalValue).map((i,idx) => ({
        Rank:              idx+1,
        Code:              i.code,
        Product:           i.name,
        Unit:              i.unit,
        "Current Stock":   i.stock,
        "Avg Price":       Math.round(i.avgPrice||0),
        "Total Value":     Math.round(i.totalValue||0),
        Supplier:          i.supplier||"",
      })));
    }

    // ── 16. Activity Log ──
    if (selected.includes("activityLogReport")) {
      addSheet("Activity Log", logs.map(l => ({
        Action:    l.action,
        Details:   l.details,
        By:        l.user_email,
        Time:      d(l.created_at),
      })));
    }

    if (wb.SheetNames.length <= 1) return alert("No data for selected reports");

    const fname = `StockTrack_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fname);
    await logAction("Generated Report", `sections:${selected.join(",")} sheets:${wb.SheetNames.length} by:${user?.email}`);
    alert(`✓ ${t.reportGenerated}\n${wb.SheetNames.length-1} sheet${wb.SheetNames.length>2?"s":""} generated.`);
  }

  const filtInv  = inventory.filter(i=>{const s=search.toLowerCase();return i.name.toLowerCase().includes(s)||i.code.toLowerCase().includes(s);});
  const filtPur  = purchases.filter(p=>deptFilter==="All"||p.department===deptFilter);
  const filtCons = consumptions.filter(c=>search===""||items.find(i=>i.id===c.itemId)?.name.toLowerCase().includes(search.toLowerCase()));
  const filtRet  = returns.filter(r=>search===""||items.find(i=>i.id===r.itemId)?.name.toLowerCase().includes(search.toLowerCase()));
  const allTabs = isAdmin ? ["dashboard","itemsMgmt","inventory","purchases","consumption","returns","orders","pools","resortMap","reports","suppliers","activityLog"] : ["consumption"];

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:TH.bg}}><div style={{color:TH.accent,fontSize:16}}>{t.loading}</div></div>;

  // Common style helpers using current theme
  const card = {background:TH.bgCard,border:`1px solid ${TH.border}`,borderRadius:14,padding:18};
  const cardTitle = {color:TH.textHeading,fontWeight:700,fontSize:13,marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${TH.divider}`,display:"flex",justifyContent:"space-between",alignItems:"center"};
  const h1Style = {color:TH.textHeading,fontSize:isMobile?18:22,fontWeight:800,margin:"0 0 4px",letterSpacing:"-0.5px"};
  const subStyle = {color:TH.textMuted,fontSize:isMobile?12:13,marginBottom:isMobile?16:24};
  const tableStyle = {width:"100%",borderCollapse:"collapse",fontSize:13,background:TH.bgCard,borderRadius:12,overflow:"hidden",border:`1px solid ${TH.border}`};
  const thStyle = {background:TH.bgInput,color:TH.textMuted,fontWeight:600,padding:"11px 12px",textAlign:"left",borderBottom:`1px solid ${TH.divider}`,fontSize:11,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:"0.04em"};
  const tdStyle = {padding:"11px 12px",color:TH.text,verticalAlign:"middle",borderBottom:`1px solid ${TH.divider}`};
  const codeStyle = {background:TH.bgInput,border:`1px solid ${TH.borderStrong}`,borderRadius:5,padding:"2px 7px",fontSize:11,color:TH.textMuted,fontFamily:"ui-monospace,monospace"};
  const addBtn = {background:TH.accent,border:"none",borderRadius:9,color:"#fff",padding:"9px 16px",cursor:"pointer",fontSize:12.5,fontWeight:600,fontFamily:"inherit",boxShadow:`0 1px 3px ${TH.accent}40`};
  const eBtn = {background:"transparent",border:`1px solid ${TH.borderStrong}`,borderRadius:6,color:TH.textMuted,padding:"4px 9px",cursor:"pointer",fontSize:11,marginRight:4,fontFamily:"inherit"};
  const dBtn = {background:"transparent",border:"1px solid rgba(248,113,113,.4)",borderRadius:6,color:"#ef4444",padding:"4px 9px",cursor:"pointer",fontSize:11,fontFamily:"inherit"};
  const saveBtn = {width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:10,color:"#fff",padding:"12px",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit",marginTop:8,boxShadow:"0 4px 12px rgba(99,102,241,.3)"};
  const srchInput = {background:TH.bgInput,border:`1px solid ${TH.borderStrong}`,borderRadius:9,padding:"9px 14px",color:TH.text,fontSize:13,outline:"none",width:240,fontFamily:"inherit"};

  const dateStr = now.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});
  const timeStr = now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"});

  return (
    <div dir={lang==="fa"||lang==="he"?"rtl":"ltr"} style={{display:"flex",flexDirection:"column",minHeight:"100vh",background:TH.bg,color:TH.text,fontFamily:lang==="fa"?"'Vazirmatn','Tahoma',sans-serif":lang==="he"?"'Heebo','Arial',sans-serif":"'Inter','Segoe UI',system-ui,sans-serif"}}>

      {/* ═══ TOP HEADER ═══ */}
      <header style={{position:"sticky",top:0,zIndex:100,background:TH.header,borderBottom:`1px solid ${TH.headerBorder}`,height:isMobile?54:60,display:"flex",alignItems:"center",padding:isMobile?"0 12px":"0 24px",gap:isMobile?8:16,flexShrink:0}}>
        {isMobile&&<button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:8,color:TH.text,padding:"7px 10px",cursor:"pointer",fontSize:16,fontFamily:"inherit",lineHeight:1}}>☰</button>}
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:isMobile?0:200}}>
          <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#fff",fontWeight:800,flexShrink:0}}>▦</div>
          {!isMobile&&<div>
            <div style={{color:TH.textHeading,fontWeight:800,fontSize:15,letterSpacing:"-0.3px"}}>StockTrack</div>
            <div style={{color:TH.accent,fontSize:10,fontWeight:600,letterSpacing:"0.06em"}}>● LIVE</div>
          </div>}
        </div>

        <div style={{flex:1}}/>

        {!isMobile&&<div style={{display:"flex",alignItems:"center",gap:12,color:TH.textMuted,fontSize:13,fontFamily:"ui-monospace,monospace"}}>
          <span>{dateStr}</span>
          <span style={{color:TH.accent,fontWeight:600}}>{timeStr}</span>
        </div>}

        {/* Theme toggle */}
        <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:9,color:TH.text,padding:isMobile?"7px 9px":"7px 12px",cursor:"pointer",fontSize:14,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
          {theme==="dark"?"☀":"🌙"}
          {!isMobile&&<span style={{fontSize:11,color:TH.textMuted}}>{theme==="dark"?"Light":"Dark"}</span>}
        </button>

        {/* Lang toggle */}
        <div style={{display:"flex",background:TH.bgInput,borderRadius:9,padding:3,gap:2,border:`1px solid ${TH.border}`}}>
          {[{c:"en",l:"EN"},{c:"he",l:"HE"},{c:"fa",l:"FA"}].map(({c,l})=>(
            <button key={c} onClick={()=>setLang(c)} style={{padding:isMobile?"5px 7px":"5px 10px",border:"none",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700,background:lang===c?TH.accent:"transparent",color:lang===c?"#fff":TH.textMuted,fontFamily:"inherit"}}>{l}</button>
          ))}
        </div>

        {/* User badge */}
        <div style={{display:"flex",alignItems:"center",gap:isMobile?0:9,padding:isMobile?"3px":"5px 11px 5px 5px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:30}}>
          <div style={{width:isMobile?26:28,height:isMobile?26:28,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:12}}>{user?.email?.charAt(0).toUpperCase()||"A"}</div>
          {!isMobile&&<div style={{fontSize:11,lineHeight:1.2}}>
            <div style={{color:TH.text,fontWeight:600}}>{isAdmin?"Admin":"Staff"}</div>
            <div style={{color:TH.textMuted,fontSize:10}}>{user?.email?.split("@")[0]}</div>
          </div>}
        </div>

        {/* Logout */}
        <button onClick={()=>supabase.auth.signOut()} style={{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:9,color:"#ef4444",padding:isMobile?"7px 9px":"7px 14px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600}}>↪{!isMobile&&" "+t.logout}</button>
      </header>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div style={{display:"flex",flex:1,minHeight:0,position:"relative"}}>

        {/* Mobile overlay backdrop */}
        {isMobile&&sidebarOpen&&<div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,top:54,background:"rgba(0,0,0,.5)",zIndex:90,backdropFilter:"blur(2px)"}}/>}

        {/* ═══ SIDEBAR ═══ */}
        <aside style={{
          width:isMobile?260:230,
          background:TH.sidebar,
          borderRight:`1px solid ${TH.sidebarBorder}`,
          display:"flex",
          flexDirection:"column",
          padding:"18px 0 16px",
          flexShrink:0,
          overflow:"auto",
          position:isMobile?"fixed":"relative",
          top:isMobile?54:0,
          bottom:isMobile?0:"auto",
          left: isMobile && lang!=="fa" && lang!=="he" ? (sidebarOpen?0:-280) : "auto",
          right: isMobile && (lang==="fa" || lang==="he") ? (sidebarOpen?0:-280) : "auto",
          zIndex:95,
          transition:"left .3s, right .3s",
          boxShadow: isMobile&&sidebarOpen?"0 10px 30px rgba(0,0,0,.4)":"none",
        }}>
          {NAV_GROUPS.filter(g=>g.items.some(k=>allTabs.includes(k))).map(group=>(
            <div key={group.key} style={{marginBottom:14}}>
              <div style={{padding:"0 22px 8px",color:TH.textDim,fontSize:10,fontWeight:700,letterSpacing:"0.12em"}}>{t[group.key]?.toUpperCase()||group.key.toUpperCase()}</div>
              {group.items.filter(k=>allTabs.includes(k)).map(k=>{
                const isActive = tab===k;
                return(
                  <button key={k} onClick={()=>{setTab(k);setSearch("");setDeptFilter("All");if(isMobile)setSidebarOpen(false);}} style={{display:"flex",alignItems:"center",gap:11,width:"100%",padding:"9px 22px",background:isActive?TH.accentBg:"transparent",border:"none",borderLeft:`3px solid ${isActive?TH.accent:"transparent"}`,color:isActive?TH.accent:TH.textMuted,cursor:"pointer",fontSize:13,textAlign:"left",fontFamily:"inherit",fontWeight:isActive?600:500}}>
                    <span style={{fontSize:14,width:18,textAlign:"center",flexShrink:0}}>{TAB_ICONS[k]}</span>
                    <span style={{flex:1}}>{t[k]||k}</span>
                    {k==="purchases"&&pendingCount>0&&isAdmin&&<span style={{background:"#f59e0b",color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{pendingCount}</span>}
                    {k==="inventory"&&lowStock.length>0&&isAdmin&&<span style={{background:"#ef4444",color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{lowStock.length}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          {isAdmin&&<div style={{padding:"0 18px",marginTop:"auto"}}><button onClick={exportExcel} style={{width:"100%",background:TH.accentBg,border:`1px solid ${TH.accentBorder}`,borderRadius:10,color:TH.accent,padding:"10px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600}}>{t.exportExcel}</button></div>}
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <main style={{flex:1,padding:isMobile?"16px 14px":"24px 28px",overflowY:"auto",overflowX:"hidden",minWidth:0,width:"100%"}}>

          {/* ═══ DASHBOARD ═══ */}
          {tab==="dashboard"&&isAdmin&&<>
            <div style={{marginBottom:24}}>
              <h1 style={h1Style}>{t.dashboard}</h1>
              <div style={subStyle}>{lang==="fa"?"نمای کلی موجودی، خرید و مصرف کالا":"Real-time overview of stock, purchases, and consumption."}</div>
            </div>

            {/* QUICK ACTIONS */}
            <div style={{display:"flex",gap:10,marginBottom:22,flexWrap:"wrap"}}>
              <button onClick={()=>openM("purchase",{date:"",itemId:"",qty:"",unitPrice:"",supplier:"",invoice:"",orderNo:"",receivedDate:"",department:"",note:""})} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:10,color:"#fff",padding:"10px 18px",cursor:"pointer",fontSize:12.5,fontWeight:700,fontFamily:"inherit",boxShadow:"0 4px 12px rgba(99,102,241,.25)"}}>{t.newPurchase}</button>
              <button onClick={()=>openM("consumption",{date:new Date().toISOString().slice(0,10),itemId:"",qty:"",location:"",operator:"",deliveredTo:"",deliveryPerson:"",note:""})} style={{background:"rgba(245,158,11,.12)",border:"1px solid rgba(245,158,11,.4)",borderRadius:10,color:"#f59e0b",padding:"10px 18px",cursor:"pointer",fontSize:12.5,fontWeight:700,fontFamily:"inherit"}}>{t.logConsumption}</button>
              <button onClick={()=>openM("return",{date:new Date().toISOString().slice(0,10),itemId:"",qty:"",reason:"",fromLocation:"",receivedBy:"",note:""})} style={{background:"rgba(16,185,129,.1)",border:"1px solid rgba(16,185,129,.35)",borderRadius:10,color:"#10b981",padding:"10px 18px",cursor:"pointer",fontSize:12.5,fontWeight:700,fontFamily:"inherit"}}>{t.addReturn}</button>
              <button onClick={()=>openM("item",{code:"",name:"",unit:"unit",min_stock:0,supplier:"",image_url:""})} style={{background:TH.bgInput,border:`1px solid ${TH.borderStrong}`,borderRadius:10,color:TH.text,padding:"10px 18px",cursor:"pointer",fontSize:12.5,fontWeight:700,fontFamily:"inherit"}}>{t.addItem}</button>
            </div>

            {/* BIG KPI CARDS — Caesar style */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(auto-fit,minmax(190px,1fr))",gap:isMobile?10:14,marginBottom:isMobile?16:24}}>
              {[
                {label:t.totalValue,    val:curr(Math.round(totalValue)), sub:`${inventory.length} ${t.products}`,  c:KPI_COLORS.blue,    ico:"◈"},
                {label:t.totalPurchases,val:curr(Math.round(totalSpend)),  sub:`${purchases.filter(p=>p.status==="approved").length} ${t.approved}`, c:KPI_COLORS.cyan,    ico:"↓"},
                {label:t.pendingApprovals,val:String(pendingCount),         sub:pendingCount>0?t.awaitingApproval:t.queueClear, c:pendingCount>0?KPI_COLORS.orange:KPI_COLORS.green, ico:"⏳"},
                {label:t.lowAlerts,     val:String(lowStock.length),        sub:lowStock.length>0?t.needsAttention:t.allItemsOk, c:lowStock.length>0?KPI_COLORS.red:KPI_COLORS.green, ico:"⚠"},
                {label:t.returned,      val:fmt(returns.reduce((s,r)=>s+Number(r.qty),0)), sub:`${returns.length} records`, c:KPI_COLORS.purple, ico:"↩"},
              ].map(k=>(
                <div key={k.label} style={{background:k.c.grad,borderRadius:16,padding:"18px 20px",position:"relative",overflow:"hidden",boxShadow:`0 6px 16px ${k.c.solid}30`,color:"#fff"}}>
                  <div style={{position:"absolute",top:-6,right:-4,fontSize:80,opacity:0.13,fontWeight:900,lineHeight:1,pointerEvents:"none",color:"#fff"}}>{k.ico}</div>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.06em",opacity:0.85,marginBottom:10,textTransform:"uppercase"}}>{k.label}</div>
                  <div style={{fontSize:30,fontWeight:800,lineHeight:1,marginBottom:6,letterSpacing:"-0.5px"}}>{k.val}</div>
                  <div style={{fontSize:11,opacity:0.85}}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* SECONDARY STATS (small boxes like Caesar) */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(4,1fr)":"repeat(auto-fit,minmax(100px,1fr))",gap:isMobile?6:10,marginBottom:isMobile?16:24}}>
              {[
                {l:"Items",       v:items.length,                           c:TH.accent},
                {l:"Purchases",   v:purchases.length,                       c:"#22d3ee"},
                {l:"Consumption", v:consumptions.length,                    c:"#f59e0b"},
                {l:"Returns",     v:returns.length,                         c:"#10b981"},
                {l:"Orders",      v:orders.length,                          c:"#8b5cf6"},
                {l:"Suppliers",   v:supplierData.length,                    c:"#ef4444"},
                {l:"Depts",       v:deptData.length,                        c:"#06b6d4"},
                {l:"Logs",        v:logs.length,                            c:"#a78bfa"},
              ].map(s=>(
                <div key={s.l} style={{background:TH.bgCard,border:`1px solid ${TH.border}`,borderRadius:11,padding:"12px 14px",textAlign:"center"}}>
                  <div style={{color:s.c,fontSize:22,fontWeight:800,lineHeight:1}}>{s.v}</div>
                  <div style={{color:TH.textMuted,fontSize:10,marginTop:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* ALERTS */}
            {(discrepancies.length>0||pendingCount>0)&&(
              <div style={{display:"grid",gridTemplateColumns:discrepancies.length>0&&pendingCount>0?"1fr 1fr":"1fr",gap:14,marginBottom:24}}>
                {discrepancies.length>0&&(
                  <div style={{background:theme==="dark"?"rgba(239,68,68,.06)":"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.25)",borderRadius:14,padding:"16px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span style={{fontSize:16}}>🔍</span><span style={{color:"#ef4444",fontWeight:700,fontSize:13}}>⚠ {t.discrepancy}</span></div>
                    {discrepancies.map((d,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"6px 0",borderBottom:"1px solid rgba(239,68,68,.1)"}}><span style={{fontWeight:600,color:TH.text}}>{d.item.name}</span><span style={{color:"#ef4444"}}>Last: <b>{d.last}</b> · avg: {d.avg}</span></div>))}
                  </div>
                )}
                {pendingCount>0&&(
                  <div style={{background:theme==="dark"?"rgba(245,158,11,.06)":"rgba(245,158,11,.05)",border:"1px solid rgba(245,158,11,.25)",borderRadius:14,padding:"16px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span style={{fontSize:16}}>⏳</span><span style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>{t.pendingApprovals}: {pendingCount}</span></div>
                    {purchases.filter(p=>p.status==="pending").map(p=>{const it=items.find(i=>i.id===p.itemId);return(
                      <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(245,158,11,.1)",fontSize:12,gap:8}}>
                        <div style={{flex:1,minWidth:0}}><span style={{color:TH.text,fontWeight:600}}>{it?.name}</span><span style={{color:TH.textMuted,marginLeft:8}}>{p.qty} · {p.supplier}</span></div>
                        <div style={{display:"flex",gap:6,flexShrink:0}}>
                          <button onClick={()=>approvePurchase(p)} style={{background:"rgba(16,185,129,.18)",border:"1px solid rgba(16,185,129,.5)",borderRadius:6,color:"#10b981",padding:"3px 10px",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:600}}>{t.approve}</button>
                          <button onClick={()=>rejectPurchase(p)}  style={{background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.4)",borderRadius:6,color:"#ef4444",padding:"3px 10px",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:600}}>{t.reject}</button>
                        </div>
                      </div>
                    );})}
                  </div>
                )}
              </div>
            )}

            {/* CHARTS */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.4fr 1fr",gap:16,marginBottom:24}}>
              <div style={card}>
                <div style={cardTitle}><span>{t.spendDept}</span><span style={{color:TH.textMuted,fontSize:11,fontWeight:500}}>{deptData.length}</span></div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deptData} layout="vertical" margin={{left:0,right:12}}>
                    <XAxis type="number" tick={{fill:TH.textDim,fontSize:10}} tickFormatter={v=>`₺${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="dept" tick={{fill:TH.textMuted,fontSize:10}} width={140} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v=>[`₺${fmt(v)}`,"Spend"]} contentStyle={{background:TH.bgElev,border:`1px solid ${TH.borderStrong}`,borderRadius:10,color:TH.text,fontSize:12}}/>
                    <Bar dataKey="total" radius={[0,8,8,0]} maxBarSize={22}>{deptData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={card}>
                <div style={cardTitle}><span>{t.spendSupplier}</span><span style={{color:TH.textMuted,fontSize:11,fontWeight:500}}>{supplierData.length}</span></div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={supplierData} dataKey="value" nameKey="name" cx="50%" cy="46%" outerRadius={78} innerRadius={42} paddingAngle={3}>
                      {supplierData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={v=>[`₺${fmt(v)}`,"Spend"]} contentStyle={{background:TH.bgElev,border:`1px solid ${TH.borderStrong}`,borderRadius:10,color:TH.text,fontSize:12}}/>
                    <Legend formatter={v=><span style={{color:TH.textMuted,fontSize:10}}>{v}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* STOCK HEALTH */}
            <div style={{...card,marginBottom:20}}>
              <div style={cardTitle}>
                <span>{t.stockHealth}</span>
                <div style={{display:"flex",gap:14,fontSize:11,fontWeight:500}}>
                  <span style={{color:"#10b981"}}>● OK</span>
                  <span style={{color:"#f59e0b"}}>● Low</span>
                  <span style={{color:"#ef4444"}}>● Critical</span>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:"10px 24px"}}>
                {inventory.map(item=>{
                  const pct=item.min_stock>0?Math.min(100,Math.round((item.stock/item.min_stock)*100)):100;
                  const color=item.stock<=0?"#ef4444":item.stock<item.min_stock?"#f59e0b":"#10b981";
                  return(
                    <div key={item.id}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <span style={{color:TH.text,fontSize:12,fontWeight:600}}>{item.name}</span>
                        <span style={{color,fontSize:11,fontWeight:700}}>{item.stock} / {item.min_stock} {item.unit}</span>
                      </div>
                      <div style={{height:7,background:TH.bgInput,borderRadius:4,overflow:"hidden",border:`1px solid ${TH.border}`}}>
                        <div style={{height:"100%",width:`${Math.max(2,pct)}%`,background:color,borderRadius:4}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BOTTOM ROW */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:16}}>
              <div style={card}>
                <div style={cardTitle}>{t.topItems}</div>
                {[...inventory].sort((a,b)=>b.totalValue-a.totalValue).slice(0,5).map((item,i)=>(
                  <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${TH.divider}`}}>
                    <div style={{width:24,height:24,borderRadius:7,background:CHART_COLORS[i%CHART_COLORS.length]+"22",color:CHART_COLORS[i%CHART_COLORS.length],fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${CHART_COLORS[i%CHART_COLORS.length]}55`,flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:TH.text,fontSize:12,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
                      <div style={{color:TH.textMuted,fontSize:10}}>{item.stock} {item.unit} {t.inStock}</div>
                    </div>
                    <div style={{color:CHART_COLORS[i%CHART_COLORS.length],fontSize:12,fontWeight:700,flexShrink:0}}>{curr(Math.round(item.totalValue))}</div>
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={cardTitle}>{t.recentPurchases}</div>
                {purchases.slice(0,5).map(p=>{const it=items.find(i=>i.id===p.itemId);const sm=STATUS_META[p.status];return(
                  <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"8px 0",borderBottom:`1px solid ${TH.divider}`,gap:8}}>
                    <div style={{flex:1,minWidth:0}}><div style={{color:TH.text,fontSize:12,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it?.name}</div><div style={{color:TH.textMuted,fontSize:10,marginTop:2}}>{p.date} · {p.supplier}</div></div>
                    <div style={{textAlign:"right",flexShrink:0}}><div style={{color:"#22d3ee",fontSize:11,marginBottom:3,fontWeight:600}}>{p.qty} {it?.unit}</div><Badge label={sm?.[lang==="fa"?"fa":"en"]||p.status} color={sm?.color||"#8892b0"}/></div>
                  </div>
                );})}
              </div>
              <div style={card}>
                <div style={cardTitle}>{t.recentConsumption}</div>
                {consumptions.slice(0,5).map(c=>{const it=items.find(i=>i.id===c.itemId);return(
                  <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"8px 0",borderBottom:`1px solid ${TH.divider}`,gap:8}}>
                    <div style={{flex:1,minWidth:0}}><div style={{color:TH.text,fontSize:12,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it?.name}</div><div style={{color:TH.textMuted,fontSize:10,marginTop:2}}>{c.date} · {c.location}</div></div>
                    <div style={{flexShrink:0}}><span style={{background:"rgba(245,158,11,.15)",color:"#f59e0b",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700}}>↗ {c.qty} {it?.unit}</span></div>
                  </div>
                );})}
              </div>
            </div>
          </>}

          {/* ═══ ITEMS MANAGEMENT ═══ */}
          {tab==="itemsMgmt"&&isAdmin&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div><h1 style={h1Style}>{t.itemsMgmt}</h1><div style={subStyle}>{lang==="fa"?"مدیریت کالاهای انبار با تصویر و تنظیمات":"Manage items with images and settings."}</div></div>
              <div style={{display:"flex",gap:8}}>
                <input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)} style={srchInput}/>
                <button onClick={()=>openM("item",{code:"",name:"",unit:"unit",min_stock:0,supplier:"",image_url:""})} style={addBtn}>{t.addItem}</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(290px,1fr))",gap:16}}>
              {items.filter(i=>{const s=search.toLowerCase();return i.name.toLowerCase().includes(s)||i.code.toLowerCase().includes(s);}).map((item,idx)=>{
                const inv=inventory.find(i=>i.id===item.id);
                const color=inv?.stock<=0?"#ef4444":inv?.low?"#f59e0b":"#10b981";
                return(
                  <div key={item.id} style={{...card,borderTop:`3px solid ${CHART_COLORS[idx%CHART_COLORS.length]}`,padding:16}}>
                    {item.image_url&&(<div style={{width:"100%",height:140,borderRadius:9,overflow:"hidden",marginBottom:12,background:TH.bgInput}}><img src={item.image_url} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>)}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div style={{minWidth:0,flex:1}}>
                        <span style={codeStyle}>{item.code}</span>
                        <div style={{color:TH.textHeading,fontWeight:700,fontSize:15,marginTop:6}}>{item.name}</div>

                      </div>
                      <Badge label={inv?.low?t.lowStock:t.ok} color={color}/>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12,background:TH.bgInput,borderRadius:9,padding:"10px",border:`1px solid ${TH.border}`}}>
                      {[{l:t.purchased,v:fmt(inv?.bought||0),c:"#22d3ee"},{l:t.consumed,v:fmt(inv?.used||0),c:"#f59e0b"},{l:t.returned,v:fmt(inv?.returned||0),c:"#10b981"},{l:t.stock,v:fmt(inv?.stock||0),c:color},{l:"Min",v:item.min_stock,c:TH.textMuted},{l:"Value",v:curr(Math.round(inv?.totalValue||0)),c:"#a78bfa"}].map(x=>(<div key={x.l} style={{textAlign:"center"}}><div style={{color:x.c,fontWeight:700,fontSize:13}}>{x.v}</div><div style={{color:TH.textDim,fontSize:9,marginTop:2,textTransform:"uppercase",letterSpacing:"0.04em"}}>{x.l}</div></div>))}
                    </div>
                    {item.supplier&&<div style={{color:TH.textMuted,fontSize:11,marginBottom:10}}>🏭 {item.supplier}</div>}
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>openM("item",{...item})} style={{...eBtn,flex:1,textAlign:"center"}}>{t.edit}</button>
                      <button onClick={()=>deleteItem(item.id)} style={dBtn}>{t.del}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>}

          {/* ═══ INVENTORY (read-only) ═══ */}
          {tab==="inventory"&&isAdmin&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div><h1 style={h1Style}>{t.inventory}</h1><div style={subStyle}>{lang==="fa"?"موجودی محاسبه شده = خرید − مصرف + برگشتی":"Computed: stock = purchased − consumed + returned."}</div></div>
              <input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)} style={srchInput}/>
            </div>
            <div style={{overflowX:"auto",borderRadius:12}}>
              <table style={tableStyle}>
                <thead><tr>{[t.code,t.product,t.unit,t.purchased,t.consumed,t.returned,t.stock,t.avgPrice,t.stockValue,t.status].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>{filtInv.map(i=>(
                  <tr key={i.id} style={{background:i.low?(theme==="dark"?"rgba(245,158,11,.04)":"rgba(245,158,11,.06)"):"transparent"}}>
                    <td style={tdStyle}><span style={codeStyle}>{i.code}</span></td>
                    <td style={{...tdStyle,color:TH.text,fontWeight:600}}>{i.image_url&&<img src={i.image_url} alt="" style={{width:28,height:28,borderRadius:6,objectFit:"cover",marginRight:8,verticalAlign:"middle"}}/>}{i.name}</td>
                    <td style={tdStyle}>{i.unit}</td>
                    <td style={{...tdStyle,color:"#22d3ee",fontWeight:600}}>{fmt(i.bought)}</td>
                    <td style={{...tdStyle,color:"#f59e0b",fontWeight:600}}>{fmt(i.used)}</td>
                    <td style={{...tdStyle,color:"#10b981",fontWeight:600}}>{fmt(i.returned)}</td>
                    <td style={{...tdStyle,color:i.low?"#ef4444":"#10b981",fontWeight:800}}>{fmt(i.stock)}</td>
                    <td style={tdStyle}>{curr(Math.round(i.avg))}</td>
                    <td style={{...tdStyle,color:"#a78bfa",fontWeight:600}}>{curr(Math.round(i.totalValue))}</td>
                    <td style={tdStyle}><Badge label={i.low?t.lowStock:t.ok} color={i.low?"#ef4444":"#10b981"}/></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>}

          {/* ═══ PURCHASES ═══ */}
          {tab==="purchases"&&isAdmin&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div><h1 style={h1Style}>{t.purchases}</h1><div style={subStyle}>{lang==="fa"?"ثبت و مدیریت خریدها":"Track and approve purchases."}</div></div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} style={{background:TH.bgInput,border:`1px solid ${TH.borderStrong}`,borderRadius:9,padding:"9px 14px",color:TH.text,fontSize:13,outline:"none",fontFamily:"inherit"}}>
                  <option value="All">{t.allDepts}</option>{DEPTS.map(d=><option key={d}>{d}</option>)}
                </select>
                <button onClick={()=>openM("purchase",{date:"",itemId:"",qty:"",unitPrice:"",supplier:"",invoice:"",orderNo:"",receivedDate:"",department:"",note:""})} style={addBtn}>{t.newPurchase}</button>
              </div>
            </div>
            <div style={{background:TH.accentBg,border:`1px solid ${TH.accentBorder}`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:TH.accentText}}>ℹ {t.approvalNote}</div>
            <div style={{overflowX:"auto"}}>
              <table style={tableStyle}>
                <thead><tr>{[t.date,t.orderNo,t.invoice,t.supplier,t.product,t.qty,t.unitPrice,t.total,t.department,t.received,t.status,t.actions].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>{filtPur.map(p=>{const it=items.find(i=>i.id===p.itemId);const sm=STATUS_META[p.status];return(
                  <tr key={p.id} style={{background:p.status==="pending"?(theme==="dark"?"rgba(245,158,11,.03)":"rgba(245,158,11,.05)"):p.status==="rejected"?(theme==="dark"?"rgba(239,68,68,.03)":"rgba(239,68,68,.04)"):"transparent"}}>
                    <td style={tdStyle}>{p.date}</td>
                    <td style={tdStyle}><span style={codeStyle}>{p.orderNo}</span></td>
                    <td style={tdStyle}><span style={codeStyle}>{p.invoice}</span></td>
                    <td style={{...tdStyle,color:TH.text}}>{p.supplier}</td>
                    <td style={{...tdStyle,color:TH.text,fontWeight:600}}>{it?.name}</td>
                    <td style={{...tdStyle,color:"#22d3ee",fontWeight:600}}>{fmt(p.qty)}</td>
                    <td style={tdStyle}>{curr(p.unitPrice)}</td>
                    <td style={{...tdStyle,color:"#a78bfa",fontWeight:700}}>{curr(p.qty*p.unitPrice)}</td>
                    <td style={tdStyle}>{p.department&&<Badge label={p.department} color="#6366f1"/>}</td>
                    <td style={{...tdStyle,color:p.receivedDate?"#10b981":"#f59e0b",fontSize:11}}>{p.receivedDate||"—"}</td>
                    <td style={tdStyle}><Badge label={sm?.[lang==="fa"?"fa":"en"]||p.status} color={sm?.color||"#8892b0"}/></td>
                    <td style={tdStyle}>{p.status==="pending"&&<><button onClick={()=>approvePurchase(p)} style={{...eBtn,color:"#10b981",borderColor:"#10b98166"}}>{t.approve}</button><button onClick={()=>rejectPurchase(p)} style={{...eBtn,color:"#ef4444",borderColor:"#ef444466"}}>{t.reject}</button></>}<button onClick={()=>openM("purchase",{...p})} style={eBtn}>{t.edit}</button><button onClick={()=>deletePurchase(p.id)} style={dBtn}>{t.del}</button></td>
                  </tr>
                );})}</tbody>
              </table>
            </div>
          </>}

          {/* ═══ CONSUMPTION ═══ */}
          {tab==="consumption"&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div><h1 style={h1Style}>{t.consumption}</h1><div style={subStyle}>{lang==="fa"?"ثبت مصرف کالاها با محل تحویل":"Track item consumption with delivery details."}</div></div>
              <div style={{display:"flex",gap:8}}>
                {isAdmin&&<input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)} style={srchInput}/>}
                <button onClick={()=>openM("consumption",{date:"",itemId:"",qty:"",location:"",operator:user?.email||"",deliveredTo:"",deliveryPerson:"",note:""})} style={addBtn}>{t.logConsumption}</button>
              </div>
            </div>
            {!isAdmin&&<div style={{background:TH.accentBg,border:`1px solid ${TH.accentBorder}`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:TH.accentText}}>ℹ {t.staffWelcome} — {user?.email}</div>}
            {isAdmin&&<div style={{...card,marginBottom:14,padding:14}}><div style={{...cardTitle,marginBottom:10,paddingBottom:8}}><span>Consumption by Location</span></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{DEPTS.map(d=>{const total=consumptions.filter(c=>c.location===d).reduce((s,c)=>s+Number(c.qty),0);if(!total)return null;return(<div key={d} style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:9,padding:"7px 14px",fontSize:12}}><div style={{color:TH.textMuted}}>{d}</div><div style={{color:"#22d3ee",fontWeight:700}}>{fmt(total)}</div></div>);})}</div></div>}
            <div style={{overflowX:"auto"}}>
              <table style={tableStyle}>
                <thead><tr>{[t.date,t.product,t.qty,t.location,t.deliveredTo,t.deliveryPerson,t.operator,t.note,t.actions].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>{filtCons.map(c=>{const it=items.find(i=>i.id===c.itemId);return(
                  <tr key={c.id}>
                    <td style={tdStyle}>{c.date}</td>
                    <td style={{...tdStyle,color:TH.text,fontWeight:600}}>{it?.name}</td>
                    <td style={{...tdStyle,color:"#f59e0b",fontWeight:600}}>{fmt(c.qty)} {it?.unit}</td>
                    <td style={tdStyle}><Badge label={c.location} color="#22d3ee"/></td>
                    <td style={{...tdStyle,color:TH.text}}>{c.deliveredTo||"—"}</td>
                    <td style={{...tdStyle,color:TH.textMuted,fontSize:11}}>{c.deliveryPerson||"—"}</td>
                    <td style={tdStyle}>{c.operator}</td>
                    <td style={{...tdStyle,color:TH.textMuted,fontSize:11}}>{c.note}</td>
                    <td style={tdStyle}>{isAdmin&&<><button onClick={()=>openM("consumption",{...c})} style={eBtn}>{t.edit}</button><button onClick={()=>deleteConsumption(c.id)} style={dBtn}>{t.del}</button></>}</td>
                  </tr>
                );})}</tbody>
              </table>
            </div>
          </>}

          {/* ═══ RETURNS ═══ */}
          {tab==="returns"&&isAdmin&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div><h1 style={h1Style}>{t.returns}</h1><div style={subStyle}>{lang==="fa"?"برگشت کالا به انبار، موجودی را افزایش می‌دهد":"Returns increase warehouse stock."}</div></div>
              <div style={{display:"flex",gap:8}}>
                <input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)} style={srchInput}/>
                <button onClick={()=>openM("return",{date:"",itemId:"",qty:"",reason:"",fromLocation:"",receivedBy:"",note:""})} style={{...addBtn,background:"linear-gradient(135deg,#059669,#10b981)",boxShadow:"0 1px 3px rgba(16,185,129,.3)"}}>{t.addReturn}</button>
              </div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={tableStyle}>
                <thead><tr>{[t.date,t.product,t.returnQty,t.reason,t.fromLocation,t.receivedBy,t.note,t.actions].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>{filtRet.map(r=>{const it=items.find(i=>i.id===r.itemId);return(
                  <tr key={r.id}>
                    <td style={tdStyle}>{r.date}</td>
                    <td style={{...tdStyle,color:TH.text,fontWeight:600}}>{it?.name}</td>
                    <td style={{...tdStyle,color:"#10b981",fontWeight:700}}>+{fmt(r.qty)} {it?.unit}</td>
                    <td style={tdStyle}>{r.reason||"—"}</td>
                    <td style={tdStyle}><Badge label={r.fromLocation||"—"} color="#22d3ee"/></td>
                    <td style={tdStyle}>{r.receivedBy||"—"}</td>
                    <td style={{...tdStyle,color:TH.textMuted,fontSize:11}}>{r.note}</td>
                    <td style={tdStyle}><button onClick={()=>openM("return",{...r})} style={eBtn}>{t.edit}</button><button onClick={()=>deleteReturn(r.id)} style={dBtn}>{t.del}</button></td>
                  </tr>
                );})}</tbody>
              </table>
            </div>
          </>}

          {/* ═══ ORDERS ═══ */}
          {tab==="orders"&&isAdmin&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div><h1 style={h1Style}>{t.orders}</h1><div style={subStyle}>{lang==="fa"?"سفارش‌های در انتظار":"Pending and confirmed orders."}</div></div>
              <button onClick={()=>openM("order",{date:"",itemId:"",qty:"",supplier:"",status:"pending",note:""})} style={addBtn}>{t.newOrder}</button>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={tableStyle}>
                <thead><tr>{[t.date,t.product,t.qty,t.supplier,t.status,t.note,t.actions].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>{orders.map(o=>{const it=items.find(i=>i.id===o.itemId);const sm=STATUS_META[o.status];return(
                  <tr key={o.id}>
                    <td style={tdStyle}>{o.date}</td>
                    <td style={{...tdStyle,color:TH.text,fontWeight:600}}>{it?.name}</td>
                    <td style={{...tdStyle,color:"#22d3ee"}}>{fmt(o.qty)} {it?.unit}</td>
                    <td style={tdStyle}>{o.supplier}</td>
                    <td style={tdStyle}><Badge label={sm?.[lang==="fa"?"fa":"en"]||o.status} color={sm?.color||"#8892b0"}/></td>
                    <td style={{...tdStyle,color:TH.textMuted,fontSize:11}}>{o.note}</td>
                    <td style={tdStyle}><button onClick={()=>openM("order",{...o})} style={eBtn}>{t.edit}</button>{o.status!=="delivered"&&<button onClick={()=>receiveOrder(o)} style={{...eBtn,color:"#10b981",borderColor:"#10b98166"}}>{t.receive}</button>}<button onClick={()=>deleteOrder(o.id)} style={dBtn}>{t.del}</button></td>
                  </tr>
                );})}</tbody>
              </table>
            </div>
          </>}


          {/* ═══ RESORT DATABASE MAP ═══ */}
          {tab==="resortMap"&&<>
            <div style={{marginBottom:14}}>
              <h1 style={h1Style}>🗺 Caesar Resort — Database</h1>
              <div style={subStyle}>Complete map of all resort locations. Add, label, and define every area in the resort.</div>
            </div>

            {/* Category filter + Add button */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
              <button onClick={()=>setDbCatFilter("all")}
                style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${dbCatFilter==="all"?TH.accent:TH.border}`,background:dbCatFilter==="all"?TH.accent:"transparent",color:dbCatFilter==="all"?"#fff":TH.text,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600}}>
                All ({resortLocations.length})
              </button>
              {RESORT_CATEGORIES.map(cat=>{
                const cnt=resortLocations.filter(l=>l.category===cat.key).length;
                return(
                  <button key={cat.key} onClick={()=>setDbCatFilter(cat.key)}
                    style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${dbCatFilter===cat.key?cat.color:TH.border}`,background:dbCatFilter===cat.key?cat.color+"22":"transparent",color:dbCatFilter===cat.key?cat.color:TH.textMuted,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:dbCatFilter===cat.key?700:400}}>
                    {cat.icon} {cat.label} {cnt>0?`(${cnt})`:""}
                  </button>
                );
              })}
              <div style={{flex:1}}/>
              {isAdmin&&(
                <button onClick={()=>{setDbAddMode(m=>!m);setSelLocation(null);setDbFormOpen(false);}}
                  style={{padding:"7px 16px",borderRadius:9,background:dbAddMode?"#ef4444":TH.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:700}}>
                  {dbAddMode?"✕ Cancel Adding":"＋ Add Location"}
                </button>
              )}
            </div>

            {dbAddMode&&<div style={{background:"rgba(202,162,76,.1)",border:"1px solid rgba(202,162,76,.4)",borderRadius:8,padding:"8px 14px",fontSize:12,color:"#caa24c",fontWeight:600,marginBottom:10}}>
              📍 Click anywhere on the map to place a new location marker
            </div>}

            {/* Main layout: map + panel */}
            <div style={{display:"flex",gap:12,height:isMobile?"auto":"560px",flexDirection:isMobile?"column":"row"}}>

              {/* ── MAP ── */}
              <div ref={dbMapRef}
                style={{flex:1,position:"relative",overflow:"hidden",height:isMobile?"320px":"100%",background:"#0b1730",borderRadius:12,border:`1px solid ${TH.border}`,cursor:dbAddMode?"crosshair":dbPanRef.current?.active?"grabbing":"grab",userSelect:"none"}}
                onWheel={e=>{
                  e.preventDefault();
                  const r=dbMapRef.current.getBoundingClientRect();
                  const mx=e.clientX-r.left,my=e.clientY-r.top;
                  const f=e.deltaY<0?1.15:1/1.15;
                  const ns=Math.max(0.25,Math.min(5,dbMapScale*f));
                  setDbMapTx(mx-(mx-dbMapTx)*ns/dbMapScale);
                  setDbMapTy(my-(my-dbMapTy)*ns/dbMapScale);
                  setDbMapScale(ns);
                }}
                onPointerDown={e=>{
                  if(e.target.closest('.db-pin'))return;
                  if(dbAddMode){
                    const r=dbMapRef.current.getBoundingClientRect();
                    const mx=(e.clientX-r.left-dbMapTx)/dbMapScale;
                    const my=(e.clientY-r.top-dbMapTy)/dbMapScale;
                    setDbForm(f=>({...f,map_x:Math.round(mx*10)/10,map_y:Math.round(my*10)/10}));
                    setDbFormOpen(true);setDbEditId(null);
                    return;
                  }
                  dbPanRef.current={active:true,lx:e.clientX,ly:e.clientY};
                }}
                onPointerMove={e=>{
                  if(!dbPanRef.current?.active)return;
                  setDbMapTx(x=>x+(e.clientX-dbPanRef.current.lx));
                  setDbMapTy(y=>y+(e.clientY-dbPanRef.current.ly));
                  dbPanRef.current={active:true,lx:e.clientX,ly:e.clientY};
                }}
                onPointerUp={()=>{if(dbPanRef.current)dbPanRef.current.active=false;}}
                onPointerLeave={()=>{if(dbPanRef.current)dbPanRef.current.active=false;}}
              >
                {/* Map image + markers */}
                <div style={{position:"absolute",transformOrigin:"0 0",transform:`translate(${dbMapTx}px,${dbMapTy}px) scale(${dbMapScale})`,width:MAP_W,height:MAP_H,pointerEvents:"none"}}>
                  <img src={RESORT_MAP} style={{width:"100%",height:"100%",display:"block"}} draggable={false}/>
                  {/* Markers */}
                  {resortLocations
                    .filter(l=>l.on_map&&l.map_x!=null&&l.map_y!=null)
                    .filter(l=>dbCatFilter==="all"||l.category===dbCatFilter)
                    .map(loc=>{
                      const cat=RESORT_CATEGORIES.find(c=>c.key===loc.category)||RESORT_CATEGORIES[7];
                      const isSel=selLocation?.id===loc.id;
                      return(
                        <div key={loc.id} className="db-pin"
                          style={{position:"absolute",left:loc.map_x,top:loc.map_y,transform:"translate(-8px,-8px)",pointerEvents:"auto",cursor:"pointer",zIndex:isSel?20:10}}
                          onClick={e=>{e.stopPropagation();setSelLocation(isSel?null:loc);setDbFormOpen(false);}}>
                          <div style={{width:16,height:16,borderRadius:"50%",background:cat.color,border:`2.5px solid ${isSel?"#fff":"rgba(255,255,255,.7)"}`,boxShadow:`0 1px 6px rgba(0,0,0,.7)${isSel?`,0 0 0 4px ${cat.color}55`:""}`,transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8}}>
                            {cat.icon}
                          </div>
                          {(dbMapScale>0.65||isSel)&&(
                            <span style={{position:"absolute",left:14,top:-5,background:"rgba(0,0,0,.85)",color:"#fff",fontSize:9,padding:"2px 6px",borderRadius:4,whiteSpace:"nowrap",border:"1px solid rgba(255,255,255,.25)",pointerEvents:"none",fontWeight:600}}>
                              {loc.name}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Map controls */}
                <div style={{position:"absolute",top:8,right:8,display:"flex",gap:5,zIndex:20}}>
                  {[["＋",1.3],["－",1/1.3],["⊡",null]].map(([lb,f])=>(
                    <button key={lb} onClick={()=>{
                      if(!f){setDbMapScale(0.55);setDbMapTx(5);setDbMapTy(20);}
                      else{const r=dbMapRef.current?.getBoundingClientRect()||{width:600,height:400};const ns=Math.max(0.25,Math.min(5,dbMapScale*f));setDbMapTx(r.width/2-(r.width/2-dbMapTx)*ns/dbMapScale);setDbMapTy(r.height/2-(r.height/2-dbMapTy)*ns/dbMapScale);setDbMapScale(ns);}
                    }} style={{width:30,height:30,borderRadius:6,background:"rgba(0,0,0,.65)",border:"1px solid rgba(255,255,255,.2)",color:"#fff",cursor:"pointer",fontSize:lb==="⊡"?12:16,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>
                      {lb}
                    </button>
                  ))}
                </div>

                {/* Stats overlay */}
                <div style={{position:"absolute",bottom:8,left:8,display:"flex",gap:6,flexWrap:"wrap",zIndex:20}}>
                  {RESORT_CATEGORIES.filter(c=>resortLocations.some(l=>l.category===c.key)).map(cat=>{
                    const cnt=resortLocations.filter(l=>l.category===cat.key&&l.on_map).length;
                    return cnt>0?(
                      <span key={cat.key} style={{display:"flex",alignItems:"center",gap:3,background:"rgba(0,0,0,.7)",padding:"3px 7px",borderRadius:6,fontSize:10,color:"#fff"}}>
                        <span style={{width:7,height:7,borderRadius:"50%",background:cat.color}}/>
                        {cat.label} ({cnt})
                      </span>
                    ):null;
                  })}
                </div>

                <div style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,.65)",color:"#9fb0cf",fontSize:10,padding:"4px 9px",borderRadius:6,zIndex:20}}>
                  {Math.round(dbMapScale*100)}% · {resortLocations.filter(l=>l.on_map).length} placed · {resortLocations.filter(l=>!l.on_map).length} unplaced
                </div>
              </div>

              {/* ── SIDE PANEL ── */}
              <div style={{width:isMobile?"100%":"260px",display:"flex",flexDirection:"column",gap:10,flexShrink:0,overflow:"auto"}}>

                {/* Add / Edit Form */}
                {dbFormOpen&&(
                  <div style={{...card,padding:"14px"}}>
                    <div style={{fontSize:13,fontWeight:700,color:TH.textHeading,marginBottom:12}}>
                      {dbEditId?"✏️ Edit Location":"➕ New Location"}
                    </div>

                    <div style={{marginBottom:9}}>
                      <label style={{fontSize:11,color:TH.textMuted,display:"block",marginBottom:4,fontWeight:600}}>NAME *</label>
                      <input value={dbForm.name} onChange={e=>setDbForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Lucca Pool"
                        style={{width:"100%",padding:"8px 10px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:7,color:TH.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                    </div>

                    <div style={{marginBottom:9}}>
                      <label style={{fontSize:11,color:TH.textMuted,display:"block",marginBottom:4,fontWeight:600}}>CATEGORY *</label>
                      <select value={dbForm.category} onChange={e=>setDbForm(f=>({...f,category:e.target.value}))}
                        style={{width:"100%",padding:"8px 10px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:7,color:TH.text,fontSize:13,fontFamily:"inherit"}}>
                        {RESORT_CATEGORIES.map(c=><option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                      </select>
                    </div>

                    <div style={{marginBottom:9}}>
                      <label style={{fontSize:11,color:TH.textMuted,display:"block",marginBottom:4,fontWeight:600}}>SUBCATEGORY</label>
                      <input value={dbForm.subcategory} onChange={e=>setDbForm(f=>({...f,subcategory:e.target.value}))} placeholder="e.g. Indoor, Outdoor, Kids..."
                        style={{width:"100%",padding:"8px 10px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:7,color:TH.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                    </div>

                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:9}}>
                      <div>
                        <label style={{fontSize:11,color:TH.textMuted,display:"block",marginBottom:4,fontWeight:600}}>AREA (M²)</label>
                        <input type="number" value={dbForm.area_m2} onChange={e=>setDbForm(f=>({...f,area_m2:e.target.value}))} placeholder="e.g. 250"
                          style={{width:"100%",padding:"8px 10px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:7,color:TH.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                      </div>
                      <div>
                        <label style={{fontSize:11,color:TH.textMuted,display:"block",marginBottom:4,fontWeight:600}}>CAPACITY</label>
                        <input type="number" value={dbForm.capacity} onChange={e=>setDbForm(f=>({...f,capacity:e.target.value}))} placeholder="people"
                          style={{width:"100%",padding:"8px 10px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:7,color:TH.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                      </div>
                    </div>

                    <div style={{marginBottom:9}}>
                      <label style={{fontSize:11,color:TH.textMuted,display:"block",marginBottom:4,fontWeight:600}}>FLOOR / ZONE</label>
                      <input value={dbForm.floor_level} onChange={e=>setDbForm(f=>({...f,floor_level:e.target.value}))} placeholder="e.g. Ground Floor, Zone A..."
                        style={{width:"100%",padding:"8px 10px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:7,color:TH.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                    </div>

                    <div style={{marginBottom:9}}>
                      <label style={{fontSize:11,color:TH.textMuted,display:"block",marginBottom:4,fontWeight:600}}>DESCRIPTION</label>
                      <textarea value={dbForm.description} onChange={e=>setDbForm(f=>({...f,description:e.target.value}))} rows={2} placeholder="Brief description..."
                        style={{width:"100%",padding:"8px 10px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:7,color:TH.text,fontSize:13,fontFamily:"inherit",resize:"none",boxSizing:"border-box"}}/>
                    </div>

                    <div style={{marginBottom:12}}>
                      <label style={{fontSize:11,color:TH.textMuted,display:"block",marginBottom:4,fontWeight:600}}>NOTES</label>
                      <textarea value={dbForm.notes} onChange={e=>setDbForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder="Additional notes..."
                        style={{width:"100%",padding:"8px 10px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:7,color:TH.text,fontSize:13,fontFamily:"inherit",resize:"none",boxSizing:"border-box"}}/>
                    </div>

                    {dbForm.map_x!=null&&(
                      <div style={{fontSize:10,color:TH.textMuted,marginBottom:10}}>
                        📍 Position: ({Math.round(dbForm.map_x)}, {Math.round(dbForm.map_y)}) on map
                      </div>
                    )}

                    <div style={{display:"flex",gap:7}}>
                      <button onClick={saveResortLocation} disabled={saving}
                        style={{flex:1,padding:"10px",borderRadius:8,background:TH.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:700}}>
                        {saving?"Saving...":"✓ Save"}
                      </button>
                      <button onClick={()=>{setDbFormOpen(false);setDbEditId(null);setDbAddMode(false);}}
                        style={{padding:"10px 14px",borderRadius:8,background:"transparent",border:`1px solid ${TH.border}`,color:TH.text,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Selected location detail */}
                {selLocation&&!dbFormOpen&&(
                  <div style={{...card,padding:"14px"}}>
                    {(()=>{
                      const cat=RESORT_CATEGORIES.find(c=>c.key===selLocation.category)||RESORT_CATEGORIES[7];
                      return(<>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                          <div>
                            <div style={{fontSize:14,fontWeight:700,color:TH.textHeading}}>{cat.icon} {selLocation.name}</div>
                            <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:cat.color+"22",color:cat.color,fontWeight:700}}>
                              {cat.label}{selLocation.subcategory?` · ${selLocation.subcategory}`:""}
                            </span>
                          </div>
                          <button onClick={()=>setSelLocation(null)} style={{background:"none",border:"none",cursor:"pointer",color:TH.textMuted,fontSize:18}}>×</button>
                        </div>

                        {selLocation.description&&(
                          <div style={{fontSize:12,color:TH.textMuted,marginBottom:8,lineHeight:1.5}}>{selLocation.description}</div>
                        )}

                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
                          {selLocation.area_m2&&(
                            <div style={{background:TH.bgInput,borderRadius:7,padding:"8px 10px"}}>
                              <div style={{fontSize:10,color:TH.textMuted,marginBottom:2}}>Area</div>
                              <div style={{fontSize:13,fontWeight:600,color:TH.text}}>{selLocation.area_m2} M²</div>
                            </div>
                          )}
                          {selLocation.capacity&&(
                            <div style={{background:TH.bgInput,borderRadius:7,padding:"8px 10px"}}>
                              <div style={{fontSize:10,color:TH.textMuted,marginBottom:2}}>Capacity</div>
                              <div style={{fontSize:13,fontWeight:600,color:TH.text}}>{selLocation.capacity} pax</div>
                            </div>
                          )}
                          {selLocation.floor_level&&(
                            <div style={{background:TH.bgInput,borderRadius:7,padding:"8px 10px",gridColumn:"1/-1"}}>
                              <div style={{fontSize:10,color:TH.textMuted,marginBottom:2}}>Zone / Floor</div>
                              <div style={{fontSize:13,fontWeight:600,color:TH.text}}>{selLocation.floor_level}</div>
                            </div>
                          )}
                        </div>

                        {selLocation.notes&&(
                          <div style={{fontSize:11,color:TH.textMuted,background:TH.bgInput,borderRadius:7,padding:"8px 10px",marginBottom:10}}>{selLocation.notes}</div>
                        )}

                        <div style={{fontSize:10,color:TH.textDim,marginBottom:10}}>
                          {selLocation.on_map?"📍 On map":"📋 Not on map yet"} · Added by {(selLocation.created_by||"").split("@")[0]}
                        </div>

                        {isAdmin&&(
                          <div style={{display:"flex",gap:7}}>
                            <button onClick={()=>{
                              setDbForm({name:selLocation.name,category:selLocation.category,subcategory:selLocation.subcategory||"",description:selLocation.description||"",area_m2:selLocation.area_m2||"",floor_level:selLocation.floor_level||"",capacity:selLocation.capacity||"",notes:selLocation.notes||"",map_x:selLocation.map_x,map_y:selLocation.map_y});
                              setDbEditId(selLocation.id);setDbFormOpen(true);
                            }} style={{flex:1,padding:"8px",borderRadius:7,background:TH.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600}}>
                              ✏️ Edit
                            </button>
                            <button onClick={()=>deleteResortLocation(selLocation.id)}
                              style={{padding:"8px 12px",borderRadius:7,background:"rgba(239,68,68,.1)",color:"#ef4444",border:"1px solid rgba(239,68,68,.3)",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
                              🗑
                            </button>
                          </div>
                        )}
                      </>);
                    })()}
                  </div>
                )}

                {/* Unplaced locations list */}
                {!dbFormOpen&&!selLocation&&(()=>{
                  const unplaced=resortLocations.filter(l=>!l.on_map||(l.map_x==null)).filter(l=>dbCatFilter==="all"||l.category===dbCatFilter);
                  const placed=resortLocations.filter(l=>l.on_map&&l.map_x!=null).filter(l=>dbCatFilter==="all"||l.category===dbCatFilter);
                  return(
                    <div style={{...card,padding:"12px",flex:1}}>
                      <div style={{fontSize:11,fontWeight:700,color:TH.textMuted,letterSpacing:".06em",marginBottom:8}}>
                        SUMMARY
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                        <span style={{color:TH.textMuted}}>Total locations</span>
                        <span style={{fontWeight:600,color:TH.text}}>{resortLocations.length}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:12}}>
                        <span style={{color:TH.textMuted}}>On map</span>
                        <span style={{fontWeight:600,color:"#10b981"}}>{resortLocations.filter(l=>l.on_map).length}</span>
                      </div>
                      {RESORT_CATEGORIES.filter(c=>resortLocations.some(l=>l.category===c.key)).map(cat=>(
                        <div key={cat.key} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:`0.5px solid ${TH.divider}`,cursor:"pointer"}} onClick={()=>setDbCatFilter(cat.key)}>
                          <span style={{width:8,height:8,borderRadius:"50%",background:cat.color,flexShrink:0}}/>
                          <span style={{fontSize:11,color:TH.textMuted,flex:1}}>{cat.icon} {cat.label}</span>
                          <span style={{fontSize:11,fontWeight:600,color:TH.text}}>{resortLocations.filter(l=>l.category===cat.key).length}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Locations table below map */}
            <div style={{marginTop:16}}>
              <div style={{fontSize:12,fontWeight:700,color:TH.textMuted,letterSpacing:".06em",marginBottom:8}}>
                ALL LOCATIONS ({resortLocations.filter(l=>dbCatFilter==="all"||l.category===dbCatFilter).length})
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{...tableStyle,minWidth:600}}>
                  <thead>
                    <tr>
                      {["Name","Category","Subcategory","Area M²","Capacity","Zone/Floor","On Map","Actions"].map(h=>(
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resortLocations
                      .filter(l=>dbCatFilter==="all"||l.category===dbCatFilter)
                      .map(loc=>{
                        const cat=RESORT_CATEGORIES.find(c=>c.key===loc.category)||RESORT_CATEGORIES[7];
                        return(
                          <tr key={loc.id} style={{borderBottom:`1px solid ${TH.divider}`,cursor:"pointer"}} onClick={()=>setSelLocation(loc)}>
                            <td style={{...tdStyle,fontWeight:600,color:TH.textHeading}}>{cat.icon} {loc.name}</td>
                            <td style={{...tdStyle}}><span style={{background:cat.color+"22",color:cat.color,fontSize:11,padding:"2px 7px",borderRadius:20,fontWeight:600}}>{cat.label}</span></td>
                            <td style={{...tdStyle,color:TH.textMuted}}>{loc.subcategory||"—"}</td>
                            <td style={{...tdStyle,textAlign:"center"}}>{loc.area_m2||"—"}</td>
                            <td style={{...tdStyle,textAlign:"center"}}>{loc.capacity||"—"}</td>
                            <td style={{...tdStyle,color:TH.textMuted}}>{loc.floor_level||"—"}</td>
                            <td style={{...tdStyle,textAlign:"center"}}>
                              <span style={{color:loc.on_map?"#10b981":"#94a3b8",fontSize:12}}>{loc.on_map?"✓":"—"}</span>
                            </td>
                            <td style={{...tdStyle}}>
                              {isAdmin&&(
                                <button onClick={e=>{e.stopPropagation();setDbForm({name:loc.name,category:loc.category,subcategory:loc.subcategory||"",description:loc.description||"",area_m2:loc.area_m2||"",floor_level:loc.floor_level||"",capacity:loc.capacity||"",notes:loc.notes||"",map_x:loc.map_x,map_y:loc.map_y});setDbEditId(loc.id);setDbFormOpen(true);setSelLocation(null);}}
                                  style={{fontSize:11,padding:"3px 8px",borderRadius:5,cursor:"pointer",background:TH.bgInput,border:`1px solid ${TH.border}`,color:TH.text,fontFamily:"inherit"}}>
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {resortLocations.length===0&&(
                      <tr><td colSpan={8} style={{...tdStyle,textAlign:"center",color:TH.textMuted,padding:32}}>
                        No locations added yet. Click "＋ Add Location" to start building the database.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>}

          {/* ═══ POOLS ═══ */}
          {tab==="pools"&&isAdmin&&<>
            <div style={{marginBottom:16}}>
              <h1 style={h1Style}>🏊 {t.pools}</h1>
              <div style={subStyle}>Chemical consumption monitoring for all 22 Caesar Resort pools.</div>
            </div>

            {/* Sub-tab nav */}
            <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
              {[["overview","📊 Overview"],["mapview","🗺 Map"],["log","➕ Log Chemical"],["history","📋 History"]].map(([k,label])=>(
                <button key={k} onClick={()=>setPoolSubTab(k)}
                  style={{padding:"8px 16px",borderRadius:9,border:`1px solid ${poolSubTab===k?TH.accent:TH.border}`,background:poolSubTab===k?TH.accent:TH.bgInput,color:poolSubTab===k?"#fff":TH.text,cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:600}}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW ── */}
            {poolSubTab==="overview"&&(()=>{
              const now = new Date();
              const y = now.getFullYear(), m = now.getMonth();
              const monthStart = `${y}-${String(m+1).padStart(2,"0")}-01`;
              const daysElapsed = now.getDate();
              const daysInMonth = new Date(y,m+1,0).getDate();
              const factor = daysElapsed / daysInMonth;

              return <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(310px,1fr))",gap:12}}>
                {pools.map(pool=>{
                  const monthLogs = poolLogs.filter(l=>l.pool_id===pool.id && l.log_date>=monthStart);
                  const actual = POOL_CHEMICALS.reduce((s,c)=>{
                    const qty = monthLogs.reduce((t,l)=>t+(Number(l[c.key])||0),0);
                    return s+qty*c.price;
                  },0);
                  const baseline = POOL_CHEMICALS.reduce((s,c)=>s+(Number(pool["b_"+c.key.replace("qty_","")])||0)*c.price,0);
                  const expectedSoFar = baseline * factor;
                  const pct = expectedSoFar > 0 ? Math.round((actual/expectedSoFar)*100) : 0;
                  const statusColor = pct===0?"#64748b":pct<=110?"#10b981":pct<=150?"#f59e0b":"#ef4444";
                  const statusLabel = pct===0?"No logs":pct<=110?"OK":pct<=150?"Watch":"High";
                  const lastLog = monthLogs.length ? monthLogs.slice().sort((a,b)=>b.log_date.localeCompare(a.log_date))[0] : null;
                  const typeColors = {outdoor:"#3b82f6",indoor:"#6366f1",kids:"#10b981",river:"#0891b2"};
                  return (
                    <div key={pool.id} onClick={()=>{setSelPoolId(pool.id);setPoolSubTab("history");}}
                      style={{background:TH.bgCard,border:`1px solid ${TH.border}`,borderRadius:12,padding:14,cursor:"pointer",transition:"border-color .15s",borderLeft:`3px solid ${statusColor}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                        <div>
                          <div style={{color:TH.textHeading,fontWeight:700,fontSize:13,marginBottom:2}}>{pool.name}</div>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <span style={{background:typeColors[pool.pool_type]||"#64748b",color:"#fff",fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,letterSpacing:"0.05em"}}>{pool.pool_type?.toUpperCase()}</span>
                            <span style={{color:TH.textMuted,fontSize:11}}>{pool.volume_m3} M³</span>
                          </div>
                        </div>
                        <span style={{background:statusColor+"20",color:statusColor,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{statusLabel}</span>
                      </div>
                      <div style={{marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:TH.textMuted,marginBottom:4}}>
                          <span>Spent this month</span>
                          <span style={{color:TH.text,fontWeight:600}}>€{actual.toFixed(0)} / €{expectedSoFar.toFixed(0)} exp.</span>
                        </div>
                        <div style={{background:TH.bgInput,borderRadius:6,height:6,overflow:"hidden"}}>
                          <div style={{background:statusColor,height:"100%",width:`${Math.min(100,pct)}%`,borderRadius:6,transition:"width .3s"}}/>
                        </div>
                        <div style={{fontSize:10,color:TH.textMuted,marginTop:3,textAlign:"right"}}>{pct}% of expected ({daysElapsed}d/{daysInMonth}d)</div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:TH.textMuted}}>
                        <span>Month baseline: €{baseline.toFixed(0)}</span>
                        <span>{lastLog ? `Last: ${lastLog.log_date}` : "No logs yet"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>;
            })()}

            {/* ── LOG CHEMICAL ── */}
            {poolSubTab==="log"&&(
              <div style={{maxWidth:620}}>
                <div style={{...card,marginBottom:16}}>
                  <div style={{...cardTitle}}>Log Chemical Usage — {new Date().toLocaleDateString()}</div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                    {/* Pool Selector */}
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={{fontSize:11,color:TH.textMuted,display:"block",marginBottom:6,fontWeight:600}}>POOL *</label>
                      <select value={poolForm.pool_id} onChange={e=>setPoolForm({...poolForm,pool_id:e.target.value})}
                        style={{width:"100%",padding:"9px 12px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:8,color:TH.text,fontSize:13,fontFamily:"inherit"}}>
                        <option value="">Select pool...</option>
                        {pools.map(p=><option key={p.id} value={p.id}>{p.name} ({p.volume_m3} M³)</option>)}
                      </select>
                    </div>

                    {/* Date */}
                    <div>
                      <label style={{fontSize:11,color:TH.textMuted,display:"block",marginBottom:6,fontWeight:600}}>DATE *</label>
                      <input type="date" value={poolForm.log_date} onChange={e=>setPoolForm({...poolForm,log_date:e.target.value})}
                        style={{width:"100%",padding:"9px 12px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:8,color:TH.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                    </div>

                    {/* pH & Cl */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div>
                        <label style={{fontSize:11,color:TH.textMuted,display:"block",marginBottom:6,fontWeight:600}}>pH</label>
                        <input type="text" placeholder="e.g. 7.2" value={poolForm.ph_level} onChange={e=>setPoolForm({...poolForm,ph_level:e.target.value})}
                          style={{width:"100%",padding:"9px 12px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:8,color:TH.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                      </div>
                      <div>
                        <label style={{fontSize:11,color:TH.textMuted,display:"block",marginBottom:6,fontWeight:600}}>Cl (ppm)</label>
                        <input type="text" placeholder="e.g. 1.5" value={poolForm.cl_ppm} onChange={e=>setPoolForm({...poolForm,cl_ppm:e.target.value})}
                          style={{width:"100%",padding:"9px 12px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:8,color:TH.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                      </div>
                    </div>
                  </div>

                  {/* Chemical quantities */}
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,color:TH.textMuted,fontWeight:700,marginBottom:10,letterSpacing:"0.08em"}}>CHEMICALS ADDED (kg)</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {POOL_CHEMICALS.map(c=>{
                        const pool = pools.find(p=>p.id===Number(poolForm.pool_id));
                        const baseKey = "b_"+c.key.replace("qty_","");
                        const baseline = pool ? (Number(pool[baseKey]||0)/30).toFixed(1) : "—";
                        return (
                          <div key={c.key}>
                            <label style={{fontSize:11,color:TH.textMuted,display:"block",marginBottom:4,fontWeight:500}}>
                              {c.label} <span style={{color:TH.textDim,fontWeight:400}}>(daily≈{baseline}kg)</span>
                            </label>
                            <input type="number" min="0" step="0.1"
                              value={poolForm[c.key]}
                              onChange={e=>setPoolForm({...poolForm,[c.key]:e.target.value})}
                              style={{width:"100%",padding:"8px 10px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:8,color:TH.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cost preview */}
                  {(()=>{
                    const total = POOL_CHEMICALS.reduce((s,c)=>s+(Number(poolForm[c.key]||0)*c.price),0);
                    return total > 0 ? (
                      <div style={{background:TH.accentBg,border:`1px solid ${TH.accent}`,borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13,color:TH.accent,fontWeight:600}}>
                        Total cost this entry: €{total.toFixed(2)}
                      </div>
                    ) : null;
                  })()}

                  {/* Notes */}
                  <div style={{marginBottom:16}}>
                    <label style={{fontSize:11,color:TH.textMuted,display:"block",marginBottom:6,fontWeight:600}}>NOTES</label>
                    <input type="text" placeholder="Any observations..." value={poolForm.notes} onChange={e=>setPoolForm({...poolForm,notes:e.target.value})}
                      style={{width:"100%",padding:"9px 12px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:8,color:TH.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                  </div>

                  <button onClick={savePoolLog} disabled={saving}
                    style={{...saveBtn,width:"100%",padding:"12px",fontSize:14}}>
                    {saving?"Saving...":"✓ Save Chemical Log"}
                  </button>
                </div>
              </div>
            )}


            {/* ── MAP VIEW ── */}
            {poolSubTab==="mapview"&&(()=>{
              const now=new Date();
              const y=now.getFullYear(), mo=now.getMonth();
              const monthStart=`${y}-${String(mo+1).padStart(2,"0")}-01`;
              const daysElapsed=now.getDate();
              const daysInMonth=new Date(y,mo+1,0).getDate();
              const factor=daysElapsed/daysInMonth;

              function getStatus(pool){
                const logs=poolLogs.filter(l=>l.pool_id===pool.id&&l.log_date>=monthStart);
                const actual=POOL_CHEMICALS.reduce((s,c)=>{const q=logs.reduce((t,l)=>t+(Number(l[c.key])||0),0);return s+q*c.price;},0);
                const bl=POOL_CHEMICALS.reduce((s,c)=>s+(Number(pool["b_"+c.key.replace("qty_","")])||0)*c.price,0);
                const exp=bl*factor;
                const pct=exp>0?Math.round(actual/exp*100):0;
                return{pct,col:pct===0?"#94a3b8":pct<=110?"#10b981":pct<=150?"#f59e0b":"#ef4444",
                       label:pct===0?"No logs":pct<=110?"OK":pct<=150?"Watch":"HIGH"};
              }

              const placed=pools.filter(p=>p.on_map&&p.map_x!=null&&p.map_y!=null);
              const unplaced=pools.filter(p=>!p.on_map||p.map_x==null);

              function onMapWheel(e){
                e.preventDefault();
                const rect=mapRef.current.getBoundingClientRect();
                const mx=e.clientX-rect.left, my=e.clientY-rect.top;
                const f=e.deltaY<0?1.15:1/1.15;
                const ns=Math.max(0.3,Math.min(4,mapScale*f));
                setMapTx(mx-(mx-mapTx)*ns/mapScale);
                setMapTy(my-(my-mapTy)*ns/mapScale);
                setMapScale(ns);
              }
              function onMapPanDown(e){
                if(e.target.closest('.map-pin'))return;
                mapPanRef.current={active:true,lx:e.clientX,ly:e.clientY};
              }
              function onMapPanMove(e){
                if(!mapPanRef.current.active)return;
                setMapTx(x=>x+(e.clientX-mapPanRef.current.lx));
                setMapTy(y=>y+(e.clientY-mapPanRef.current.ly));
                mapPanRef.current={...mapPanRef.current,lx:e.clientX,ly:e.clientY};
              }
              function onMapPanUp(){mapPanRef.current.active=false;}

              function onPinDragStart(e,pool){
                if(!mapEditMode||!isAdmin)return;
                e.stopPropagation();
                setMapDraggingPin({pool,startX:e.clientX,startY:e.clientY,origX:pool.map_x,origY:pool.map_y});
              }
              function onPinDragMove(e){
                if(!mapDraggingPin)return;
                const dx=(e.clientX-mapDraggingPin.startX)/mapScale;
                const dy=(e.clientY-mapDraggingPin.startY)/mapScale;
                const newX=Math.max(0,Math.min(MAP_W,mapDraggingPin.origX+dx));
                const newY=Math.max(0,Math.min(MAP_H,mapDraggingPin.origY+dy));
                setPools(prev=>prev.map(p=>p.id===mapDraggingPin.pool.id?{...p,map_x:newX,map_y:newY}:p));
              }
              async function onPinDragEnd(){
                if(!mapDraggingPin)return;
                const pool=pools.find(p=>p.id===mapDraggingPin.pool.id);
                if(pool)await savePoolPosition(pool.id,pool.map_x,pool.map_y,true);
                setMapDraggingPin(null);
              }
              async function placeOnMap(pool){
                const rect=mapRef.current.getBoundingClientRect();
                const cx=(rect.width/2-mapTx)/mapScale;
                const cy=(rect.height/2-mapTy)/mapScale;
                await savePoolPosition(pool.id,cx,cy,true);
              }
              async function removeFromMap(poolId){
                await supabase.from("pools").update({on_map:false}).eq("id",poolId);
                await loadAll();
              }

              return (
                <div style={{display:"flex",gap:12,height:isMobile?"auto":"500px",flexDirection:isMobile?"column":"row"}}>
                  {/* Map */}
                  <div ref={mapRef}
                    style={{flex:1,position:"relative",overflow:"hidden",height:isMobile?"300px":"100%",background:"#0b1730",borderRadius:12,border:`1px solid ${TH.border}`,cursor:mapDraggingPin?"grabbing":"grab",userSelect:"none"}}
                    onWheel={onMapWheel}
                    onPointerDown={onMapPanDown}
                    onPointerMove={e=>{onMapPanMove(e);onPinDragMove(e);}}
                    onPointerUp={e=>{onMapPanUp();onPinDragEnd();}}
                    onPointerLeave={e=>{onMapPanUp();onPinDragEnd();}}>
                    {/* Map image + pins container */}
                    <div style={{position:"absolute",transformOrigin:"0 0",transform:`translate(${mapTx}px,${mapTy}px) scale(${mapScale})`,width:MAP_W,height:MAP_H,pointerEvents:"none"}}>
                      <img src={RESORT_MAP} style={{width:"100%",height:"100%",display:"block",userSelect:"none"}} draggable={false}/>
                      {placed.map(pool=>{
                        const st=getStatus(pool);
                        return(
                          <div key={pool.id} className="map-pin"
                            style={{position:"absolute",left:pool.map_x,top:pool.map_y,transform:"translate(-7px,-7px)",pointerEvents:"auto",cursor:mapEditMode&&isAdmin?"grab":"pointer",zIndex:10}}
                            onPointerDown={e=>onPinDragStart(e,pool)}
                            onClick={e=>{if(!mapDraggingPin){e.stopPropagation();setSelPoolId(pool.id===selPoolId?null:pool.id);}}}
                          >
                            <div style={{width:14,height:14,borderRadius:"50%",background:st.col,border:`2px solid ${pool.id===selPoolId?"#fff":"rgba(255,255,255,.8)"}`,boxShadow:`0 1px 5px rgba(0,0,0,.6)${pool.id===selPoolId?`,0 0 0 3px ${st.col}44`:""}`,transition:"all .15s"}}/>
                            {(mapScale>0.7||pool.id===selPoolId)&&(
                              <span style={{position:"absolute",left:10,top:-5,background:"rgba(0,0,0,.82)",color:"#fff",fontSize:8.5,padding:"2px 5px",borderRadius:3,whiteSpace:"nowrap",border:"1px solid rgba(255,255,255,.3)",pointerEvents:"none"}}>
                                {pool.name}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Map controls */}
                    <div style={{position:"absolute",top:8,right:8,display:"flex",gap:5,zIndex:20}}>
                      {[["＋",1.3],["－",1/1.3],["⊡",null]].map(([lbl,f])=>(
                        <button key={lbl} onClick={()=>{
                          if(f===null){setMapScale(0.55);const r=mapRef.current?.getBoundingClientRect()||{width:600,height:400};setMapTx(r.width*0.02);setMapTy(r.height*0.02);}
                          else{const r=mapRef.current?.getBoundingClientRect()||{width:600,height:400};const ns=Math.max(0.3,Math.min(4,mapScale*f));setMapTx(r.width/2-(r.width/2-mapTx)*ns/mapScale);setMapTy(r.height/2-(r.height/2-mapTy)*ns/mapScale);setMapScale(ns);}
                        }} style={{width:30,height:30,borderRadius:6,background:"rgba(0,0,0,.6)",border:"1px solid rgba(255,255,255,.2)",color:"#fff",cursor:"pointer",fontSize:lbl==="⊡"?13:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                    {/* Status legend */}
                    <div style={{position:"absolute",bottom:8,left:8,display:"flex",gap:8,background:"rgba(0,0,0,.7)",padding:"5px 10px",borderRadius:8,zIndex:20}}>
                      {[["#10b981","OK"],["#f59e0b","Watch"],["#ef4444","HIGH"],["#94a3b8","No logs"]].map(([c,l])=>(
                        <span key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#fff"}}>
                          <span style={{width:8,height:8,borderRadius:"50%",background:c,border:"1px solid rgba(255,255,255,.5)"}}/>
                          {l}
                        </span>
                      ))}
                    </div>
                    <div style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,.6)",color:"#94a3b8",fontSize:10,padding:"4px 8px",borderRadius:6,zIndex:20}}>
                      {Math.round(mapScale*100)}% · {placed.length}/22 pools placed
                    </div>
                  </div>

                  {/* Side panel */}
                  <div style={{width:isMobile?"100%":"220px",display:"flex",flexDirection:"column",gap:10,flexShrink:0}}>
                    {/* Edit mode toggle (admin) */}
                    {isAdmin&&(
                      <button onClick={()=>setMapEditMode(m=>!m)}
                        style={{padding:"8px 12px",borderRadius:9,border:`1px solid ${mapEditMode?TH.accent:TH.border}`,background:mapEditMode?TH.accent:"transparent",color:mapEditMode?"#fff":TH.text,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600}}>
                        {mapEditMode?"✏️ Edit Mode ON — drag pins":"🔒 View Mode — click to edit"}
                      </button>
                    )}

                    {/* Selected pool detail */}
                    {selPoolId&&(()=>{
                      const pool=pools.find(p=>p.id===selPoolId);
                      if(!pool)return null;
                      const st=getStatus(pool);
                      return(
                        <div style={{...card,padding:"12px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                            <div style={{fontSize:13,fontWeight:700,color:TH.textHeading}}>{pool.name}</div>
                            <button onClick={()=>setSelPoolId(null)} style={{background:"none",border:"none",cursor:"pointer",color:TH.textMuted,fontSize:16}}>×</button>
                          </div>
                          <div style={{fontSize:11,color:TH.textMuted,marginBottom:8}}>{pool.pool_type} · {pool.volume_m3} M³</div>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:6}}>
                            <span style={{color:TH.textMuted}}>Status this month</span>
                            <span style={{color:st.col,fontWeight:700}}>{st.label}</span>
                          </div>
                          {st.pct>0&&(
                            <div style={{background:TH.bgInput,borderRadius:4,height:5,overflow:"hidden",marginBottom:6}}>
                              <div style={{background:st.col,height:"100%",width:`${Math.min(100,st.pct)}%`}}/>
                            </div>
                          )}
                          <div style={{fontSize:10,color:TH.textMuted,marginBottom:10}}>{st.pct}% of expected · Budget €{POOL_CHEMICALS.reduce((s,c)=>s+(Number(pool["b_"+c.key.replace("qty_","")])||0)*c.price,0).toFixed(0)}/mo</div>
                          {isAdmin&&mapEditMode&&(
                            <button onClick={()=>removeFromMap(pool.id)} style={{width:"100%",padding:"6px",fontSize:11,borderRadius:7,cursor:"pointer",background:"rgba(239,68,68,.12)",color:"#ef4444",border:"1px solid rgba(239,68,68,.3)",fontFamily:"inherit"}}>
                              Remove from map
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Unplaced pools */}
                    {isAdmin&&unplaced.length>0&&(
                      <div style={{...card,padding:"12px",flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
                        <div style={{fontSize:11,fontWeight:600,color:TH.textMuted,letterSpacing:".06em",marginBottom:8}}>UNPLACED POOLS ({unplaced.length})</div>
                        <div style={{overflow:"auto",flex:1}}>
                          {unplaced.map(pool=>(
                            <div key={pool.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`0.5px solid ${TH.divider}`}}>
                              <span style={{fontSize:12,color:TH.text}}>{pool.name}</span>
                              <button onClick={()=>placeOnMap(pool)} style={{fontSize:10,padding:"3px 8px",borderRadius:5,cursor:"pointer",background:TH.accentBg,color:TH.accent,border:`1px solid ${TH.accent}`,fontFamily:"inherit"}}>
                                Place
                              </button>
                            </div>
                          ))}
                        </div>
                        <div style={{fontSize:10,color:TH.textMuted,marginTop:8}}>Click "Place" → pin appears at center → drag to position</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── HISTORY ── */}
            {poolSubTab==="history"&&(
              <div>
                {/* Pool filter */}
                <div style={{marginBottom:16,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                  <select value={selPoolId||""} onChange={e=>setSelPoolId(e.target.value?Number(e.target.value):null)}
                    style={{padding:"8px 12px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:8,color:TH.text,fontSize:13,fontFamily:"inherit"}}>
                    <option value="">All Pools</option>
                    {pools.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <span style={{color:TH.textMuted,fontSize:12}}>
                    {(selPoolId ? poolLogs.filter(l=>l.pool_id===selPoolId) : poolLogs).length} entries
                  </span>
                </div>

                <div style={{overflowX:"auto"}}>
                  <table style={{...tableStyle,minWidth:700}}>
                    <thead>
                      <tr>
                        {["Date","Pool","Pwd56","Pwd90","Flocculant","Algaecide","Clarifier","Liq Cl","Liq Acid","Cost €","pH","ppm","Notes","By"].map(h=>(
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(selPoolId ? poolLogs.filter(l=>l.pool_id===selPoolId) : poolLogs).slice(0,200).map(l=>{
                        const pool = pools.find(p=>p.id===l.pool_id);
                        const cost = POOL_CHEMICALS.reduce((s,c)=>s+(Number(l[c.key]||0)*c.price),0);
                        return (
                          <tr key={l.id} style={{borderBottom:`1px solid ${TH.divider}`}}>
                            <td style={tdStyle}>{l.log_date}</td>
                            <td style={{...tdStyle,fontWeight:600,color:TH.textHeading}}>{pool?.name||"?"}</td>
                            {POOL_CHEMICALS.map(c=>(
                              <td key={c.key} style={{...tdStyle,textAlign:"center",color:Number(l[c.key]||0)>0?TH.accent:TH.textDim}}>
                                {Number(l[c.key]||0)>0 ? Number(l[c.key]).toFixed(1) : "—"}
                              </td>
                            ))}
                            <td style={{...tdStyle,fontWeight:600,color:"#10b981"}}>€{cost.toFixed(2)}</td>
                            <td style={{...tdStyle,textAlign:"center"}}>{l.ph_level||"—"}</td>
                            <td style={{...tdStyle,textAlign:"center"}}>{l.cl_ppm||"—"}</td>
                            <td style={{...tdStyle,color:TH.textMuted,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.notes||"—"}</td>
                            <td style={{...tdStyle,color:TH.textMuted,fontSize:11}}>{(l.logged_by||"").split("@")[0]}</td>
                          </tr>
                        );
                      })}
                      {poolLogs.length===0&&(
                        <tr><td colSpan={15} style={{...tdStyle,textAlign:"center",color:TH.textMuted,padding:32}}>No chemical logs yet. Use "Log Chemical" to add the first entry.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>}

          {/* ═══ REPORTS ═══ */}
          {tab==="reports"&&isAdmin&&<>
            <div style={{marginBottom:20}}>
              <h1 style={h1Style}>{t.reports}</h1>
              <div style={subStyle}>{t.reportsDesc}</div>
            </div>

            <div style={card}>
              <div style={{...cardTitle,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>{t.selectReports} ({Object.values(reportSelections).filter(Boolean).length}/{REPORT_TYPES.length})</span>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{const all={};REPORT_TYPES.forEach(r=>all[r.key]=true);setReportSelections(all);}} style={{background:TH.accentBg,border:`1px solid ${TH.accent}`,color:TH.accent,padding:"5px 12px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>{t.selectAll}</button>
                  <button onClick={()=>setReportSelections({})} style={{background:TH.bgInput,border:`1px solid ${TH.border}`,color:TH.textMuted,padding:"5px 12px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>{t.clearAll}</button>
                </div>
              </div>

              {REPORT_CATEGORIES.map(cat=>{
                const catReports = REPORT_TYPES.filter(r=>r.cat===cat.key);
                if(catReports.length===0) return null;
                return (
                  <div key={cat.key} style={{marginBottom:18}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 0 8px",borderBottom:`1px solid ${TH.divider}`,marginBottom:8}}>
                      <span style={{fontSize:14}}>{cat.icon}</span>
                      <span style={{color:TH.textHeading,fontSize:11,fontWeight:800,letterSpacing:"0.12em"}}>{t["report"+cat.key.charAt(0).toUpperCase()+cat.key.slice(1)]||cat.key.toUpperCase()}</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:8}}>
                      {catReports.map(rep=>{
                        const checked = !!reportSelections[rep.key];
                        return (
                          <label key={rep.key} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:9,cursor:"pointer",background:checked?TH.accentBg:TH.bgInput,border:`1px solid ${checked?TH.accent:TH.border}`,transition:"all .15s"}}>
                            <input type="checkbox" checked={checked} onChange={e=>setReportSelections({...reportSelections,[rep.key]:e.target.checked})} style={{marginTop:3,cursor:"pointer",accentColor:TH.accent}}/>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{color:TH.text,fontWeight:600,fontSize:13,marginBottom:2}}>{t[rep.key]||rep.key}</div>
                              <div style={{color:TH.textMuted,fontSize:11,lineHeight:1.4}}>{t[rep.key+"Desc"]||""}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <button onClick={generateCustomReport} disabled={Object.values(reportSelections).filter(Boolean).length===0} style={{...saveBtn,marginTop:8,opacity:Object.values(reportSelections).filter(Boolean).length===0?0.5:1}}>
                {t.generateReport}
              </button>
            </div>
          </>}

          {/* ═══ SUPPLIERS ═══ */}
          {tab==="suppliers"&&isAdmin&&<>
            <div style={{marginBottom:20}}><h1 style={h1Style}>{t.suppliers}</h1><div style={subStyle}>{lang==="fa"?"تأمین‌کنندگان و آمار خرید":"Vendor analytics."}</div></div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(290px,1fr))",gap:16}}>
              {SUPPLIERS_LIST.map((sup,si)=>{
                const sp=purchases.filter(p=>p.supplier===sup&&p.status==="approved");
                const total=sp.reduce((s,p)=>s+p.qty*p.unitPrice,0);
                const depts=[...new Set(sp.map(p=>p.department).filter(Boolean))];
                const prods=[...new Set(sp.map(p=>items.find(i=>i.id===p.itemId)?.name).filter(Boolean))];
                return(<div key={sup} style={{...card,borderTop:`3px solid ${CHART_COLORS[si%CHART_COLORS.length]}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{color:TH.textHeading,fontWeight:700,fontSize:14}}>{sup}</div>
                    <div style={{color:CHART_COLORS[si%CHART_COLORS.length],fontWeight:700}}>{curr(total)}</div>
                  </div>
                  <div style={{display:"flex",gap:16,marginBottom:12}}>{[{v:sp.length,l:"Orders",c:"#22d3ee"},{v:prods.length,l:"Products",c:"#a78bfa"},{v:depts.length,l:"Depts",c:"#f59e0b"}].map(x=>(<div key={x.l} style={{textAlign:"center"}}><div style={{color:x.c,fontWeight:700,fontSize:18}}>{x.v}</div><div style={{color:TH.textMuted,fontSize:10}}>{x.l}</div></div>))}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>{prods.map(p=><span key={p} style={{background:TH.accentBg,color:TH.accentText,borderRadius:5,padding:"2px 8px",fontSize:10}}>{p}</span>)}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{depts.map(d=><span key={d} style={{background:"rgba(34,211,238,.12)",color:"#22d3ee",borderRadius:5,padding:"2px 8px",fontSize:10}}>{d}</span>)}</div>
                </div>);
              })}
            </div>
          </>}

          {/* ═══ ACTIVITY LOG ═══ */}
          {tab==="activityLog"&&isAdmin&&<>
            <div style={{marginBottom:20}}><h1 style={h1Style}>{t.activityLog}</h1><div style={subStyle}>{lang==="fa"?"تاریخچه کامل عملیات با کاربر و زمان":"Complete audit trail."}</div></div>
            <div style={{overflowX:"auto"}}>
              <table style={tableStyle}>
                <thead><tr>{["Action","Details","By","Time"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>{logs.map(l=>{
                  const actionColor = l.action?.includes("Delete")?"#ef4444":l.action?.includes("Approved")?"#10b981":l.action?.includes("Edit")?"#f59e0b":l.action?.includes("Return")?"#10b981":l.action?.includes("Add")||l.action?.includes("New")?"#6366f1":"#a78bfa";
                  return(<tr key={l.id}><td style={{...tdStyle,fontWeight:600}}><Badge label={l.action} color={actionColor}/></td><td style={{...tdStyle,color:TH.textMuted,fontSize:11,maxWidth:380}}>{l.details}</td><td style={tdStyle}>{l.user_email}</td><td style={{...tdStyle,fontSize:11,color:TH.textMuted}}>{l.created_at?.replace("T"," ").slice(0,19)}</td></tr>);
                })}</tbody>
              </table>
            </div>
          </>}

          {!isAdmin&&tab!=="consumption"&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"50vh",flexDirection:"column",gap:12}}><div style={{fontSize:48,color:TH.textDim}}>🔒</div><div style={{color:TH.textMuted,fontSize:16}}>{t.noAccess}</div></div>}
        </main>
      </div>

      {/* ═══ MODALS ═══ */}

      <Modal open={modal==="item"} title={form.id?t.editItem:t.newItem} onClose={closeM} theme={TH}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label={`${t.itemCode} *`} value={form.code} onChange={sf("code")} required theme={TH}/>
          <Inp label={t.unit} value={form.unit} onChange={sf("unit")} placeholder="unit / kg / can..." theme={TH}/>
          <Inp label={`${t.itemName} *`} value={form.name} onChange={sf("name")} required theme={TH}/>
          <Inp label={t.minStock} value={form.min_stock} onChange={sf("min_stock")} type="number" theme={TH}/>
          <Inp label={t.supplier} value={form.supplier} onChange={sf("supplier")} theme={TH}/>
          <div/>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",color:TH.textMuted,fontSize:11,marginBottom:6,fontWeight:600}}>{t.image}</label>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <input type="file" accept="image/*" ref={imgRef} onChange={handleImageFile} style={{display:"none"}}/>
              <button onClick={()=>imgRef.current?.click()} style={{width:"100%",background:TH.bgInput,border:`1px dashed ${TH.borderStrong}`,borderRadius:9,color:TH.textMuted,padding:"11px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>📷 {imgPreview?"Change Image":"Upload Image (max 2MB)"}</button>
            </div>
            {imgPreview&&<img src={imgPreview} alt="" style={{width:76,height:76,borderRadius:9,objectFit:"cover",border:`1px solid ${TH.borderStrong}`,flexShrink:0}}/>}
          </div>
        </div>
        <button onClick={saveItem} disabled={saving} style={saveBtn}>{saving?"...":t.save}</button>
      </Modal>

      <Modal open={modal==="purchase"} title={form.id?"Edit Purchase":"New Purchase"} onClose={closeM} theme={TH}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label={`${t.date} *`} value={form.date} onChange={sf("date")} type="date" required theme={TH}/>
          <Sel label={`${t.product} *`} value={form.itemId} onChange={v=>sf("itemId")(Number(v))} options={[{value:"",label:t.selectProduct},...items.map(i=>({value:i.id,label:i.name}))]} theme={TH}/>
          <Inp label={`${t.qty} *`} value={form.qty} onChange={sf("qty")} type="number" required theme={TH}/>
          <Inp label={`${t.unitPrice} *`} value={form.unitPrice} onChange={sf("unitPrice")} type="number" required theme={TH}/>
          <Inp label={t.orderNo} value={form.orderNo} onChange={sf("orderNo")} theme={TH}/>
          <Inp label={t.invoice} value={form.invoice} onChange={sf("invoice")} theme={TH}/>
          <Inp label={t.supplier} value={form.supplier} onChange={sf("supplier")} theme={TH}/>
          <Inp label={t.received} value={form.receivedDate} onChange={sf("receivedDate")} type="date" theme={TH}/>
        </div>
        <Sel label={t.department} value={form.department} onChange={sf("department")} options={[{value:"",label:t.selectDept},...DEPTS.map(d=>({value:d,label:d}))]} theme={TH}/>
        <Inp label={t.note} value={form.note} onChange={sf("note")} theme={TH}/>
        {form.qty&&form.unitPrice&&<div style={{background:TH.bgInput,borderRadius:9,padding:"10px 14px",marginBottom:12,fontSize:13,border:`1px solid ${TH.border}`}}><span style={{color:TH.textMuted}}>Total: </span><span style={{color:"#a78bfa",fontWeight:800,fontSize:16}}>{curr(Number(form.qty)*Number(form.unitPrice))}</span></div>}
        {!isAdmin&&<div style={{color:"#f59e0b",fontSize:12,marginBottom:10,padding:"9px 12px",background:"rgba(245,158,11,.1)",borderRadius:8,border:"1px solid rgba(245,158,11,.3)"}}>⏳ {t.approvalNote}</div>}
        <button onClick={savePurchase} disabled={saving} style={saveBtn}>{saving?"...":t.save}</button>
      </Modal>

      <Modal open={modal==="consumption"} title="Log Consumption" onClose={closeM} theme={TH}>
        <Inp label={`${t.date} *`} value={form.date} onChange={sf("date")} type="date" required theme={TH}/>
        <Sel label={`${t.product} *`} value={form.itemId} onChange={v=>sf("itemId")(Number(v))} options={[{value:"",label:t.selectProduct},...items.map(i=>{const inv=inventory.find(x=>x.id===i.id);return{value:i.id,label:`${i.name}  (${t.stock}: ${inv?.stock||0} ${i.unit})`};})]} theme={TH}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label={`${t.qty} *`} value={form.qty} onChange={sf("qty")} type="number" required theme={TH}/>
          <Inp label={t.operator} value={form.operator} onChange={sf("operator")} theme={TH}/>
          <Inp label={t.deliveredTo} value={form.deliveredTo} onChange={sf("deliveredTo")} placeholder="Person/Room/Unit..." theme={TH}/>
          <Inp label={t.deliveryPerson} value={form.deliveryPerson} onChange={sf("deliveryPerson")} theme={TH}/>
        </div>
        <Sel label={`${t.location} *`} value={form.location} onChange={sf("location")} options={[{value:"",label:t.selectLocation},...DEPTS.map(d=>({value:d,label:d}))]} theme={TH}/>
        <Inp label={t.note} value={form.note} onChange={sf("note")} theme={TH}/>
        <button onClick={saveConsumption} disabled={saving} style={saveBtn}>{saving?"...":t.save}</button>
      </Modal>

      <Modal open={modal==="return"} title={t.addReturn} onClose={closeM} theme={TH}>
        <div style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.3)",borderRadius:9,padding:"9px 12px",marginBottom:14,fontSize:12,color:"#10b981"}}>↩ {lang==="fa"?"این کالا به موجودی انبار اضافه می‌شود":"This will add back to warehouse stock"}</div>
        <Inp label={`${t.date} *`} value={form.date} onChange={sf("date")} type="date" required theme={TH}/>
        <Sel label={`${t.product} *`} value={form.itemId} onChange={v=>sf("itemId")(Number(v))} options={[{value:"",label:t.selectProduct},...items.map(i=>({value:i.id,label:i.name}))]} theme={TH}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label={`${t.returnQty} *`} value={form.qty} onChange={sf("qty")} type="number" required theme={TH}/>
          <Inp label={t.receivedBy} value={form.receivedBy} onChange={sf("receivedBy")} placeholder="Who received it" theme={TH}/>
          <Inp label={t.fromLocation} value={form.fromLocation} onChange={sf("fromLocation")} placeholder="Where from" theme={TH}/>
          <Inp label={t.reason} value={form.reason} onChange={sf("reason")} placeholder="Unused / Damaged..." theme={TH}/>
        </div>
        <Inp label={t.note} value={form.note} onChange={sf("note")} theme={TH}/>
        <button onClick={saveReturn} disabled={saving} style={{...saveBtn,background:"linear-gradient(135deg,#059669,#10b981)",boxShadow:"0 4px 12px rgba(16,185,129,.3)"}}>{saving?"...":t.save}</button>
      </Modal>

      <Modal open={modal==="order"} title="New Order" onClose={closeM} theme={TH}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label={`${t.date} *`} value={form.date} onChange={sf("date")} type="date" required theme={TH}/>
          <Inp label={t.supplier} value={form.supplier} onChange={sf("supplier")} theme={TH}/>
          <Inp label={`${t.qty} *`} value={form.qty} onChange={sf("qty")} type="number" required theme={TH}/>
          <Sel label={t.status} value={form.status||"pending"} onChange={sf("status")} options={[{value:"pending",label:"Pending"},{value:"confirmed",label:"Confirmed"},{value:"cancelled",label:"Cancelled"}]} theme={TH}/>
        </div>
        <Sel label={`${t.product} *`} value={form.itemId} onChange={v=>sf("itemId")(Number(v))} options={[{value:"",label:t.selectProduct},...items.map(i=>({value:i.id,label:i.name}))]} theme={TH}/>
        <Inp label={t.note} value={form.note} onChange={sf("note")} theme={TH}/>
        <button onClick={saveOrder} disabled={saving} style={saveBtn}>{saving?"...":t.save}</button>
      </Modal>
    </div>
  );
}
