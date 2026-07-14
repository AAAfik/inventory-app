import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import PoolsHub from "./components/Pools/PoolsHub";
import ProcureHub from "./procurement/ProcureHub";

// ─── Feature flags ──────────────────────────────────────────────────
// Set POOLS_ENABLED = true to bring the Pools module back.
const POOLS_ENABLED = false;
const PROCURE_ENABLED = true;

const ADMIN_EMAILS = ["admin@inventory.com", "hezicaesar@gmail.com", "alireza.ariyannekoo@afikgroup.com", "anzhelaklavdieva2@gmail.com"];

const THEMES = {
  dark: {
    bg:"#000000", bgElev:"#0a0a0a", bgCard:"#0a0a0a", bgInput:"#111111", bgHover:"#1a1a1a",
    text:"#f4efe4", textMuted:"#8f8f8f", textDim:"#5c5c5c", textHeading:"#ffffff",
    border:"#1f1f1f", borderStrong:"#2a2a2a", divider:"#161616",
    sidebar:"#000000", sidebarBorder:"#1f1f1f",
    header:"#000000", headerBorder:"#1f1f1f",
    accent:"#C9A960", accentText:"#D4B876", accentBg:"rgba(201,169,96,.10)", accentBorder:"rgba(201,169,96,.30)",
  },
  light: {
    bg:"#F4EFE4", bgElev:"#ffffff", bgCard:"#ffffff", bgInput:"#F4EFE4", bgHover:"#EDE6D5",
    text:"#0a1f35", textMuted:"#6b7280", textDim:"#9ca3af", textHeading:"#0a1f35",
    border:"#E5DFCE", borderStrong:"#D0C7B0", divider:"#EDE6D5",
    sidebar:"#ffffff", sidebarBorder:"#E5DFCE",
    header:"#ffffff", headerBorder:"#E5DFCE",
    accent:"#8B7A44", accentText:"#8B7A44", accentBg:"rgba(139,122,68,.08)", accentBorder:"rgba(139,122,68,.30)",
  },
};

const KPI_COLORS = {
  blue:   { solid:"#C9A960", grad:"linear-gradient(135deg,#C9A960,#D4B876)" },
  orange: { solid:"#D97706", grad:"linear-gradient(135deg,#B45309,#D97706)" },
  purple: { solid:"#8B7A44", grad:"linear-gradient(135deg,#8B7A44,#C9A960)" },
  red:    { solid:"#DC2626", grad:"linear-gradient(135deg,#B91C1C,#DC2626)" },
  green:  { solid:"#059669", grad:"linear-gradient(135deg,#047857,#059669)" },
  cyan:   { solid:"#0891B2", grad:"linear-gradient(135deg,#0E7490,#0891B2)" },
};

const T = {
  en:{dashboard:"Dashboard",itemsMgmt:"Items",inventory:"Inventory",purchases:"Purchases",consumption:"Consumption",returns:"Returns",orders:"Orders",suppliers:"Suppliers",activityLog:"Activity Log",database:"DATABASE",caesarMap:"Caesar Resort Map",syncMaps:"Sync Maps",pools:"Pools",procurement:"PROCUREMENT",procure:"Caesar Procure",mapDesc:"Interactive map of Caesar Resort \u2014 click on any pin to see details",mapNoLocations:"No locations found. Add some to the resort_locations table in Supabase.",mapTotalLocations:"Total Locations",mapCategories:"Categories",mapShowAll:"Show All",totalValue:"Total Stock Value",totalPurchases:"Total Spend",lowAlerts:"Low Stock Alerts",pendingApprovals:"Pending Approvals",spendDept:"Spend by Department",spendSupplier:"Spend by Supplier",recentPurchases:"Recent Purchases",recentConsumption:"Recent Consumption",newPurchase:"+ New Purchase",logConsumption:"+ Log Consumption",newOrder:"+ New Order",addItem:"+ Add Item",addReturn:"+ Add Return",exportExcel:"\u2191 Export Excel",approve:"Approve",reject:"Reject",receive:"Receive",edit:"Edit",del:"Delete",save:"Save",search:"Search...",allDepts:"All Departments",date:"Date",product:"Product",qty:"Qty",unitPrice:"Unit Price",total:"Total",supplier:"Supplier",department:"Department",invoice:"Invoice",orderNo:"Order No",received:"Received",note:"Note",location:"Location",operator:"Operator",status:"Status",actions:"Actions",code:"Code",unit:"Unit",purchased:"Purchased",consumed:"Consumed",returned:"Returned",stock:"Stock",avgPrice:"Avg Price",stockValue:"Value",lowStock:"Low Stock",ok:"OK",noAccess:"No access to this section.",approvalNote:"New purchases require admin approval before stock updates.",loading:"Loading...",logout:"Logout",discrepancy:"Unusual Consumption Detected",staffWelcome:"Log your consumption here",selectProduct:"Select product...",selectDept:"Select department...",selectLocation:"Select location...",minStock:"Min Stock",itemCode:"Item Code",itemName:"Item Name",itemNameFa:"Name (Persian)",itemNameHe:"Name (Hebrew)",reason:"Reason",fromLocation:"From Location",receivedBy:"Received By",deliveredTo:"Delivered To",deliveryPerson:"Delivered By",image:"Image",returnQty:"Return Qty",editItem:"Edit Item",newItem:"New Item",overview:"OVERVIEW",catalog:"CATALOG",transactions:"TRANSACTIONS",insights:"INSIGHTS",products:"products",approved:"approved",needsAttention:"Needs attention",allItemsOk:"All items OK",awaitingApproval:"Awaiting approval",queueClear:"Queue clear",stockHealth:"Stock Health",topItems:"Top Items by Value",inStock:"in stock",reports:"Reports",reportsDesc:"Generate custom reports \u2014 select sections, then download as Excel",selectReports:"Select reports to include",selectAll:"Select All",clearAll:"Clear",generateReport:"\u2193 Generate Report (Excel)",reportInventory:"INVENTORY",reportTransactions:"TRANSACTIONS",reportAnalytics:"ANALYTICS",reportAudit:"AUDIT",inventorySummary:"Inventory Summary",inventorySummaryDesc:"All items with stock, value, and status",lowStockReport:"Low Stock Items",lowStockDesc:"Items below minimum threshold",topItemsByValue:"Top Items by Value",topItemsByValueDesc:"Most valuable inventory items",allPurchasesReport:"All Purchases",allPurchasesDesc:"Complete list with full details",approvedPurchases:"Approved Purchases",approvedPurchasesDesc:"Confirmed spending, financial focus",pendingPurchases:"Pending Approvals",pendingPurchasesDesc:"Awaiting admin decision",consumptionDetail:"Consumption Detail",consumptionDetailDesc:"Who took what, where, when",returnsReport:"Returns",returnsDesc:"Stock returned to warehouse",ordersReport:"Orders",ordersReportDesc:"Pending and confirmed orders",consumptionByDept:"Consumption by Department",consumptionByDeptDesc:"Aggregated usage per location",consumptionByOperator:"Consumption by Operator",consumptionByOperatorDesc:"Who used how much",deliveryReport:"Delivery Report",deliveryReportDesc:"Who delivered what to whom",suppliersReport:"Suppliers Summary",suppliersReportDesc:"Vendor spending analytics",financialSummary:"Financial Summary",financialSummaryDesc:"Totals, KPIs, key metrics",anomaliesReport:"Anomaly Detection",anomaliesDesc:"Unusual consumption patterns",activityLogReport:"Activity Log",activityLogDesc:"Complete audit trail with users and timestamps",reportGenerated:"Report generated successfully",noReportsSelected:"Please select at least one report"},
  he:{dashboard:"\u05dc\u05d5\u05d7 \u05d1\u05e7\u05e8\u05d4",itemsMgmt:"\u05e4\u05e8\u05d9\u05d8\u05d9\u05dd",inventory:"\u05de\u05dc\u05d0\u05d9",purchases:"\u05e8\u05db\u05d9\u05e9\u05d5\u05ea",consumption:"\u05e6\u05e8\u05d9\u05db\u05d4",returns:"\u05d4\u05d7\u05d6\u05e8\u05d5\u05ea",orders:"\u05d4\u05d6\u05de\u05e0\u05d5\u05ea",suppliers:"\u05e1\u05e4\u05e7\u05d9\u05dd",activityLog:"\u05d9\u05d5\u05de\u05df \u05e4\u05e2\u05d9\u05dc\u05d5\u05ea",database:"\u05de\u05d0\u05d2\u05e8 \u05de\u05d9\u05d3\u05e2",caesarMap:"\u05de\u05e4\u05ea \u05e7\u05d9\u05e1\u05e8 \u05e8\u05d9\u05d6\u05d5\u05e8\u05d8",pools:"\u05d1\u05e8\u05d9\u05db\u05d5\u05ea",mapDesc:"\u05de\u05e4\u05d4 \u05d0\u05d9\u05e0\u05d8\u05e8\u05d0\u05e7\u05d8\u05d9\u05d1\u05d9\u05ea \u05e9\u05dc \u05e7\u05d9\u05e1\u05e8 \u05e8\u05d9\u05d6\u05d5\u05e8\u05d8",mapNoLocations:"\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0\u05d5 \u05de\u05d9\u05e7\u05d5\u05de\u05d9\u05dd",mapTotalLocations:"\u05e1\u05da \u05d4\u05db\u05dc \u05de\u05d9\u05e7\u05d5\u05de\u05d9\u05dd",mapCategories:"\u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d5\u05ea",mapShowAll:"\u05d4\u05e6\u05d2 \u05d4\u05db\u05dc",totalValue:"\u05e2\u05e8\u05da \u05de\u05dc\u05d0\u05d9 \u05db\u05d5\u05dc\u05dc",totalPurchases:"\u05e1\u05da \u05d4\u05d5\u05e6\u05d0\u05d5\u05ea",lowAlerts:"\u05d4\u05ea\u05e8\u05d0\u05d5\u05ea \u05de\u05dc\u05d0\u05d9 \u05e0\u05de\u05d5\u05da",pendingApprovals:"\u05de\u05de\u05ea\u05d9\u05df \u05dc\u05d0\u05d9\u05e9\u05d5\u05e8",spendDept:"\u05d4\u05d5\u05e6\u05d0\u05d5\u05ea \u05dc\u05e4\u05d9 \u05de\u05d7\u05dc\u05e7\u05d4",spendSupplier:"\u05d4\u05d5\u05e6\u05d0\u05d5\u05ea \u05dc\u05e4\u05d9 \u05e1\u05e4\u05e7",recentPurchases:"\u05e8\u05db\u05d9\u05e9\u05d5\u05ea \u05d0\u05d7\u05e8\u05d5\u05e0\u05d5\u05ea",recentConsumption:"\u05e6\u05e8\u05d9\u05db\u05d4 \u05d0\u05d7\u05e8\u05d5\u05e0\u05d4",newPurchase:"+ \u05e8\u05db\u05d9\u05e9\u05d4 \u05d7\u05d3\u05e9\u05d4",logConsumption:"+ \u05e8\u05d9\u05e9\u05d5\u05dd \u05e6\u05e8\u05d9\u05db\u05d4",newOrder:"+ \u05d4\u05d6\u05de\u05e0\u05d4 \u05d7\u05d3\u05e9\u05d4",addItem:"+ \u05d4\u05d5\u05e1\u05e3 \u05e4\u05e8\u05d9\u05d8",addReturn:"+ \u05d4\u05d5\u05e1\u05e3 \u05d4\u05d7\u05d6\u05e8\u05d4",exportExcel:"\u2191 \u05d9\u05d9\u05e6\u05d5\u05d0 Excel",approve:"\u05d0\u05e9\u05e8",reject:"\u05d3\u05d7\u05d4",receive:"\u05e7\u05d1\u05dc",edit:"\u05e2\u05e8\u05d5\u05da",del:"\u05de\u05d7\u05e7",save:"\u05e9\u05de\u05d5\u05e8",search:"\u05d7\u05e4\u05e9...",allDepts:"\u05db\u05dc \u05d4\u05de\u05d7\u05dc\u05e7\u05d5\u05ea",date:"\u05ea\u05d0\u05e8\u05d9\u05da",product:"\u05de\u05d5\u05e6\u05e8",qty:"\u05db\u05de\u05d5\u05ea",unitPrice:"\u05de\u05d7\u05d9\u05e8 \u05d9\u05d7\u05d9\u05d3\u05d4",total:"\u05e1\u05da \u05d4\u05db\u05dc",supplier:"\u05e1\u05e4\u05e7",department:"\u05de\u05d7\u05dc\u05e7\u05d4",invoice:"\u05d7\u05e9\u05d1\u05d5\u05e0\u05d9\u05ea",orderNo:"\u05de\u05e1\u05e4\u05e8 \u05d4\u05d6\u05de\u05e0\u05d4",received:"\u05d4\u05ea\u05e7\u05d1\u05dc",note:"\u05d4\u05e2\u05e8\u05d4",location:"\u05de\u05d9\u05e7\u05d5\u05dd",operator:"\u05de\u05e4\u05e2\u05d9\u05dc",status:"\u05e1\u05d8\u05d8\u05d5\u05e1",actions:"\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea",code:"\u05e7\u05d5\u05d3",unit:"\u05d9\u05d7\u05d9\u05d3\u05d4",purchased:"\u05e0\u05e8\u05db\u05e9",consumed:"\u05e0\u05e6\u05e8\u05da",returned:"\u05d4\u05d5\u05d7\u05d6\u05e8",stock:"\u05de\u05dc\u05d0\u05d9",avgPrice:"\u05de\u05d7\u05d9\u05e8 \u05de\u05de\u05d5\u05e6\u05e2",stockValue:"\u05e2\u05e8\u05da",lowStock:"\u05de\u05dc\u05d0\u05d9 \u05e0\u05de\u05d5\u05da",ok:"\u05ea\u05e7\u05d9\u05df",noAccess:"\u05d0\u05d9\u05df \u05d2\u05d9\u05e9\u05d4 \u05dc\u05d7\u05dc\u05e7 \u05d6\u05d4.",approvalNote:"\u05e8\u05db\u05d9\u05e9\u05d5\u05ea \u05d7\u05d3\u05e9\u05d5\u05ea \u05d3\u05d5\u05e8\u05e9\u05d5\u05ea \u05d0\u05d9\u05e9\u05d5\u05e8 \u05de\u05e0\u05d4\u05dc \u05dc\u05e4\u05e0\u05d9 \u05e2\u05d3\u05db\u05d5\u05df \u05d4\u05de\u05dc\u05d0\u05d9.",loading:"\u05d8\u05d5\u05e2\u05df...",logout:"\u05d4\u05ea\u05e0\u05ea\u05e7",discrepancy:"\u05d6\u05d5\u05d4\u05ea\u05d4 \u05e6\u05e8\u05d9\u05db\u05d4 \u05d7\u05e8\u05d9\u05d2\u05d4",staffWelcome:"\u05e8\u05e9\u05d5\u05dd \u05d0\u05ea \u05d4\u05e6\u05e8\u05d9\u05db\u05d4 \u05e9\u05dc\u05da \u05db\u05d0\u05df",selectProduct:"\u05d1\u05d7\u05e8 \u05de\u05d5\u05e6\u05e8...",selectDept:"\u05d1\u05d7\u05e8 \u05de\u05d7\u05dc\u05e7\u05d4...",selectLocation:"\u05d1\u05d7\u05e8 \u05de\u05d9\u05e7\u05d5\u05dd...",minStock:"\u05de\u05dc\u05d0\u05d9 \u05de\u05d9\u05e0\u05d9\u05de\u05dc\u05d9",itemCode:"\u05e7\u05d5\u05d3 \u05e4\u05e8\u05d9\u05d8",itemName:"\u05e9\u05dd \u05e4\u05e8\u05d9\u05d8",itemNameFa:"\u05e9\u05dd (\u05e4\u05e8\u05e1\u05d9\u05ea)",itemNameHe:"\u05e9\u05dd (\u05e2\u05d1\u05e8\u05d9\u05ea)",reason:"\u05e1\u05d9\u05d1\u05d4",fromLocation:"\u05de\u05de\u05d9\u05e7\u05d5\u05dd",receivedBy:"\u05d4\u05ea\u05e7\u05d1\u05dc \u05e2\u05dc \u05d9\u05d3\u05d9",deliveredTo:"\u05e0\u05de\u05e1\u05e8 \u05dc",deliveryPerson:"\u05e0\u05de\u05e1\u05e8 \u05e2\u05dc \u05d9\u05d3\u05d9",image:"\u05ea\u05de\u05d5\u05e0\u05d4",returnQty:"\u05db\u05de\u05d5\u05ea \u05d4\u05d7\u05d6\u05e8\u05d4",editItem:"\u05e2\u05e8\u05d5\u05da \u05e4\u05e8\u05d9\u05d8",newItem:"\u05e4\u05e8\u05d9\u05d8 \u05d7\u05d3\u05e9",overview:"\u05e1\u05e7\u05d9\u05e8\u05d4",catalog:"\u05e7\u05d8\u05dc\u05d5\u05d2",transactions:"\u05ea\u05e0\u05d5\u05e2\u05d5\u05ea",insights:"\u05ea\u05d5\u05d1\u05e0\u05d5\u05ea",products:"\u05de\u05d5\u05e6\u05e8\u05d9\u05dd",approved:"\u05d0\u05d5\u05e9\u05e8\u05d5",needsAttention:"\u05d3\u05d5\u05e8\u05e9 \u05ea\u05e9\u05d5\u05de\u05ea \u05dc\u05d1",allItemsOk:"\u05d4\u05db\u05dc \u05ea\u05e7\u05d9\u05df",awaitingApproval:"\u05de\u05de\u05ea\u05d9\u05df \u05dc\u05d0\u05d9\u05e9\u05d5\u05e8",queueClear:"\u05d4\u05ea\u05d5\u05e8 \u05e8\u05d9\u05e7",stockHealth:"\u05de\u05e6\u05d1 \u05d4\u05de\u05dc\u05d0\u05d9",topItems:"\u05e4\u05e8\u05d9\u05d8\u05d9\u05dd \u05de\u05d5\u05d1\u05d9\u05dc\u05d9\u05dd",inStock:"\u05d1\u05de\u05dc\u05d0\u05d9",reports:"\u05d3\u05d5\u05d7\u05d5\u05ea",reportsDesc:"\u05e6\u05d5\u05e8 \u05d3\u05d5\u05d7\u05d5\u05ea \u05de\u05d5\u05ea\u05d0\u05de\u05d9\u05dd \u2014 \u05d1\u05d7\u05e8 \u05d7\u05dc\u05e7\u05d9\u05dd \u05d5\u05d4\u05d5\u05e8\u05d3 \u05db-Excel",selectReports:"\u05d1\u05d7\u05e8 \u05d3\u05d5\u05d7\u05d5\u05ea \u05dc\u05db\u05dc\u05d5\u05dc",selectAll:"\u05d1\u05d7\u05e8 \u05d4\u05db\u05dc",clearAll:"\u05e0\u05e7\u05d4",generateReport:"\u2193 \u05e6\u05d5\u05e8 \u05d3\u05d5\u05d7 (Excel)",reportInventory:"\u05de\u05dc\u05d0\u05d9",reportTransactions:"\u05ea\u05e0\u05d5\u05e2\u05d5\u05ea",reportAnalytics:"\u05e0\u05d9\u05ea\u05d5\u05d7",reportAudit:"\u05d1\u05d9\u05e7\u05d5\u05e8\u05ea",inventorySummary:"\u05e1\u05d9\u05db\u05d5\u05dd \u05de\u05dc\u05d0\u05d9",inventorySummaryDesc:"\u05db\u05dc \u05d4\u05e4\u05e8\u05d9\u05d8\u05d9\u05dd \u05e2\u05dd \u05de\u05dc\u05d0\u05d9 \u05d5\u05e2\u05e8\u05da",lowStockReport:"\u05de\u05dc\u05d0\u05d9 \u05e0\u05de\u05d5\u05da",lowStockDesc:"\u05e4\u05e8\u05d9\u05d8\u05d9\u05dd \u05de\u05ea\u05d7\u05ea \u05dc\u05e1\u05e3",topItemsByValue:"\u05e4\u05e8\u05d9\u05d8\u05d9\u05dd \u05de\u05d5\u05d1\u05d9\u05dc\u05d9\u05dd",topItemsByValueDesc:"\u05d4\u05e4\u05e8\u05d9\u05d8\u05d9\u05dd \u05d4\u05d9\u05e7\u05e8\u05d9\u05dd \u05d1\u05d9\u05d5\u05ea\u05e8",allPurchasesReport:"\u05db\u05dc \u05d4\u05e8\u05db\u05d9\u05e9\u05d5\u05ea",allPurchasesDesc:"\u05e8\u05e9\u05d9\u05de\u05d4 \u05de\u05dc\u05d0\u05d4 \u05e2\u05dd \u05e4\u05e8\u05d8\u05d9\u05dd",approvedPurchases:"\u05e8\u05db\u05d9\u05e9\u05d5\u05ea \u05de\u05d0\u05d5\u05e9\u05e8\u05d5\u05ea",approvedPurchasesDesc:"\u05d4\u05d5\u05e6\u05d0\u05d5\u05ea \u05e9\u05d0\u05d5\u05e9\u05e8\u05d5",pendingPurchases:"\u05de\u05de\u05ea\u05d9\u05e0\u05d5\u05ea \u05dc\u05d0\u05d9\u05e9\u05d5\u05e8",pendingPurchasesDesc:"\u05de\u05de\u05ea\u05d9\u05df \u05dc\u05d4\u05d7\u05dc\u05d8\u05ea \u05de\u05e0\u05d4\u05dc",consumptionDetail:"\u05e4\u05d9\u05e8\u05d5\u05d8 \u05e6\u05e8\u05d9\u05db\u05d4",consumptionDetailDesc:"\u05de\u05d9 \u05dc\u05e7\u05d7, \u05de\u05d4, \u05de\u05d0\u05d9\u05e4\u05d4, \u05de\u05ea\u05d9",returnsReport:"\u05d4\u05d7\u05d6\u05e8\u05d5\u05ea",returnsDesc:"\u05de\u05dc\u05d0\u05d9 \u05e9\u05d4\u05d5\u05d7\u05d6\u05e8 \u05dc\u05de\u05d7\u05e1\u05df",ordersReport:"\u05d4\u05d6\u05de\u05e0\u05d5\u05ea",ordersReportDesc:"\u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05de\u05de\u05ea\u05d9\u05e0\u05d5\u05ea \u05d5\u05de\u05d0\u05d5\u05e9\u05e8\u05d5\u05ea",consumptionByDept:"\u05e6\u05e8\u05d9\u05db\u05d4 \u05dc\u05e4\u05d9 \u05de\u05d7\u05dc\u05e7\u05d4",consumptionByDeptDesc:"\u05e9\u05d9\u05de\u05d5\u05e9 \u05de\u05e6\u05d8\u05d1\u05e8 \u05dc\u05e4\u05d9 \u05de\u05d9\u05e7\u05d5\u05dd",consumptionByOperator:"\u05e6\u05e8\u05d9\u05db\u05d4 \u05dc\u05e4\u05d9 \u05de\u05e4\u05e2\u05d9\u05dc",consumptionByOperatorDesc:"\u05de\u05d9 \u05d4\u05e9\u05ea\u05de\u05e9 \u05d1\u05db\u05de\u05d4",deliveryReport:"\u05d3\u05d5\u05d7 \u05d0\u05e1\u05e4\u05e7\u05d4",deliveryReportDesc:"\u05de\u05d9 \u05de\u05e1\u05e8 \u05de\u05d4 \u05dc\u05de\u05d9",suppliersReport:"\u05e1\u05d9\u05db\u05d5\u05dd \u05e1\u05e4\u05e7\u05d9\u05dd",suppliersReportDesc:"\u05e0\u05d9\u05ea\u05d5\u05d7 \u05d4\u05d5\u05e6\u05d0\u05d5\u05ea \u05dc\u05e4\u05d9 \u05e1\u05e4\u05e7",financialSummary:"\u05e1\u05d9\u05db\u05d5\u05dd \u05e4\u05d9\u05e0\u05e0\u05e1\u05d9",financialSummaryDesc:"\u05e1\u05da \u05d4\u05db\u05dc, \u05de\u05d3\u05d3\u05d9\u05dd \u05e8\u05d0\u05e9\u05d9\u05d9\u05dd",anomaliesReport:"\u05d6\u05d9\u05d4\u05d5\u05d9 \u05d7\u05e8\u05d9\u05d2\u05d5\u05ea",anomaliesDesc:"\u05d3\u05e4\u05d5\u05e1\u05d9 \u05e6\u05e8\u05d9\u05db\u05d4 \u05d7\u05e8\u05d9\u05d2\u05d9\u05dd",activityLogReport:"\u05d9\u05d5\u05de\u05df \u05e4\u05e2\u05d9\u05dc\u05d5\u05ea",activityLogDesc:"\u05d3\u05e8\u05da \u05d1\u05d9\u05e7\u05d5\u05e8\u05ea \u05de\u05dc\u05d0\u05d4",reportGenerated:"\u05d4\u05d3\u05d5\u05d7 \u05e0\u05d5\u05e6\u05e8 \u05d1\u05d4\u05e6\u05dc\u05d7\u05d4",noReportsSelected:"\u05d1\u05d7\u05e8 \u05dc\u05e4\u05d7\u05d5\u05ea \u05d3\u05d5\u05d7 \u05d0\u05d7\u05d3"},
  fa:{dashboard:"\u062f\u0627\u0634\u0628\u0648\u0631\u062f",itemsMgmt:"\u06a9\u0627\u0644\u0627\u0647\u0627",inventory:"\u0645\u0648\u062c\u0648\u062f\u06cc \u0627\u0646\u0628\u0627\u0631",purchases:"\u062e\u0631\u06cc\u062f\u0647\u0627",consumption:"\u0645\u0635\u0631\u0641",returns:"\u0628\u0631\u06af\u0634\u062a \u0628\u0647 \u0627\u0646\u0628\u0627\u0631",orders:"\u0633\u0641\u0627\u0631\u0634\u200c\u0647\u0627",suppliers:"\u062a\u0623\u0645\u06cc\u0646\u200c\u06a9\u0646\u0646\u062f\u06af\u0627\u0646",activityLog:"\u06af\u0632\u0627\u0631\u0634 \u0641\u0639\u0627\u0644\u06cc\u062a",database:"\u062f\u06cc\u062a\u0627\u0628\u06cc\u0633",caesarMap:"\u0646\u0642\u0634\u0647 \u0631\u0632\u0648\u0631\u062a \u0633\u0632\u0627\u0631",pools:"\u0627\u0633\u062a\u062e\u0631\u0647\u0627",mapDesc:"\u0646\u0642\u0634\u0647 \u062a\u0639\u0627\u0645\u0644\u06cc \u0631\u0632\u0648\u0631\u062a \u0633\u0632\u0627\u0631 \u2014 \u0628\u0631\u0627\u06cc \u062f\u06cc\u062f\u0646 \u062c\u0632\u0626\u06cc\u0627\u062a \u0631\u0648\u06cc \u067e\u06cc\u0646 \u06a9\u0644\u06cc\u06a9 \u06a9\u0646",mapNoLocations:"\u0645\u06a9\u0627\u0646\u06cc \u067e\u06cc\u062f\u0627 \u0646\u0634\u062f. \u062f\u0631 Supabase \u0627\u0636\u0627\u0641\u0647 \u06a9\u0646.",mapTotalLocations:"\u062a\u0639\u062f\u0627\u062f \u06a9\u0644 \u0645\u06a9\u0627\u0646\u200c\u0647\u0627",mapCategories:"\u062f\u0633\u062a\u0647\u200c\u0628\u0646\u062f\u06cc",mapShowAll:"\u0646\u0645\u0627\u06cc\u0634 \u0647\u0645\u0647",totalValue:"\u0627\u0631\u0632\u0634 \u06a9\u0644 \u0627\u0646\u0628\u0627\u0631",totalPurchases:"\u062c\u0645\u0639 \u062e\u0631\u06cc\u062f\u0647\u0627",lowAlerts:"\u0647\u0634\u062f\u0627\u0631 \u06a9\u0645\u200c\u0645\u0648\u062c\u0648\u062f\u06cc",pendingApprovals:"\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631 \u062a\u0623\u06cc\u06cc\u062f",spendDept:"\u0647\u0632\u06cc\u0646\u0647 \u0628\u0631 \u0627\u0633\u0627\u0633 \u062f\u067e\u0627\u0631\u062a\u0645\u0627\u0646",spendSupplier:"\u0647\u0632\u06cc\u0646\u0647 \u0628\u0631 \u0627\u0633\u0627\u0633 \u062a\u0623\u0645\u06cc\u0646\u200c\u06a9\u0646\u0646\u062f\u0647",recentPurchases:"\u0622\u062e\u0631\u06cc\u0646 \u062e\u0631\u06cc\u062f\u0647\u0627",recentConsumption:"\u0622\u062e\u0631\u06cc\u0646 \u0645\u0635\u0631\u0641\u200c\u0647\u0627",newPurchase:"+ \u062b\u0628\u062a \u062e\u0631\u06cc\u062f",logConsumption:"+ \u062b\u0628\u062a \u0645\u0635\u0631\u0641",newOrder:"+ \u0633\u0641\u0627\u0631\u0634 \u062c\u062f\u06cc\u062f",addItem:"+ \u0627\u0641\u0632\u0648\u062f\u0646 \u06a9\u0627\u0644\u0627",addReturn:"+ \u062b\u0628\u062a \u0628\u0631\u06af\u0634\u062a\u06cc",exportExcel:"\u2191 \u062e\u0631\u0648\u062c\u06cc \u0627\u06a9\u0633\u0644",approve:"\u062a\u0623\u06cc\u06cc\u062f",reject:"\u0631\u062f",receive:"\u062a\u062d\u0648\u06cc\u0644",edit:"\u0648\u06cc\u0631\u0627\u06cc\u0634",del:"\u062d\u0630\u0641",save:"\u0630\u062e\u06cc\u0631\u0647",search:"\u062c\u0633\u062a\u062c\u0648...",allDepts:"\u0647\u0645\u0647 \u062f\u067e\u0627\u0631\u062a\u0645\u0627\u0646\u200c\u0647\u0627",date:"\u062a\u0627\u0631\u06cc\u062e",product:"\u06a9\u0627\u0644\u0627",qty:"\u062a\u0639\u062f\u0627\u062f",unitPrice:"\u0642\u06cc\u0645\u062a \u0648\u0627\u062d\u062f",total:"\u062c\u0645\u0639 \u06a9\u0644",supplier:"\u062a\u0623\u0645\u06cc\u0646\u200c\u06a9\u0646\u0646\u062f\u0647",department:"\u062f\u067e\u0627\u0631\u062a\u0645\u0627\u0646",invoice:"\u0641\u0627\u06a9\u062a\u0648\u0631",orderNo:"\u0634\u0645\u0627\u0631\u0647 \u0633\u0641\u0627\u0631\u0634",received:"\u062a\u0627\u0631\u06cc\u062e \u062f\u0631\u06cc\u0627\u0641\u062a",note:"\u062a\u0648\u0636\u06cc\u062d\u0627\u062a",location:"\u0645\u062d\u0644 \u0645\u0635\u0631\u0641",operator:"\u0627\u067e\u0631\u0627\u062a\u0648\u0631",status:"\u0648\u0636\u0639\u06cc\u062a",actions:"\u0639\u0645\u0644\u06cc\u0627\u062a",code:"\u06a9\u062f",unit:"\u0648\u0627\u062d\u062f",purchased:"\u062e\u0631\u06cc\u062f\u0627\u0631\u06cc \u0634\u062f\u0647",consumed:"\u0645\u0635\u0631\u0641 \u0634\u062f\u0647",returned:"\u0628\u0631\u06af\u0634\u062a\u06cc",stock:"\u0645\u0648\u062c\u0648\u062f\u06cc",avgPrice:"\u0645\u06cc\u0627\u0646\u06af\u06cc\u0646 \u0642\u06cc\u0645\u062a",stockValue:"\u0627\u0631\u0632\u0634",lowStock:"\u06a9\u0645\u200c\u0645\u0648\u062c\u0648\u062f\u06cc",ok:"\u0645\u0637\u0644\u0648\u0628",noAccess:"\u0634\u0645\u0627 \u062f\u0633\u062a\u0631\u0633\u06cc \u0628\u0647 \u0627\u06cc\u0646 \u0628\u062e\u0634 \u0631\u0627 \u0646\u062f\u0627\u0631\u06cc\u062f.",approvalNote:"\u062e\u0631\u06cc\u062f\u0647\u0627\u06cc \u062c\u062f\u06cc\u062f \u0646\u06cc\u0627\u0632 \u0628\u0647 \u062a\u0623\u06cc\u06cc\u062f \u0645\u062f\u06cc\u0631 \u062f\u0627\u0631\u0646\u062f.",loading:"\u062f\u0631 \u062d\u0627\u0644 \u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc...",logout:"\u062e\u0631\u0648\u062c",discrepancy:"\u0645\u0635\u0631\u0641 \u063a\u06cc\u0631\u0639\u0627\u062f\u06cc \u0634\u0646\u0627\u0633\u0627\u06cc\u06cc \u0634\u062f",staffWelcome:"\u0645\u0635\u0631\u0641 \u062e\u0648\u062f \u0631\u0627 \u0627\u06cc\u0646\u062c\u0627 \u062b\u0628\u062a \u06a9\u0646\u06cc\u062f",selectProduct:"\u0627\u0646\u062a\u062e\u0627\u0628 \u06a9\u0627\u0644\u0627...",selectDept:"\u0627\u0646\u062a\u062e\u0627\u0628 \u062f\u067e\u0627\u0631\u062a\u0645\u0627\u0646...",selectLocation:"\u0627\u0646\u062a\u062e\u0627\u0628 \u0645\u062d\u0644...",minStock:"\u062d\u062f\u0627\u0642\u0644 \u0645\u0648\u062c\u0648\u062f\u06cc",itemCode:"\u06a9\u062f \u06a9\u0627\u0644\u0627",itemName:"\u0646\u0627\u0645 \u06a9\u0627\u0644\u0627",itemNameFa:"\u0646\u0627\u0645 (\u0641\u0627\u0631\u0633\u06cc)",itemNameHe:"\u0646\u0627\u0645 (\u0639\u0628\u0631\u06cc)",reason:"\u062f\u0644\u06cc\u0644",fromLocation:"\u0627\u0632 \u0645\u062d\u0644",receivedBy:"\u062f\u0631\u06cc\u0627\u0641\u062a\u200c\u06a9\u0646\u0646\u062f\u0647",deliveredTo:"\u062a\u062d\u0648\u06cc\u0644 \u0628\u0647",deliveryPerson:"\u062a\u062d\u0648\u06cc\u0644\u200c\u062f\u0647\u0646\u062f\u0647",image:"\u062a\u0635\u0648\u06cc\u0631",returnQty:"\u0645\u0642\u062f\u0627\u0631 \u0628\u0631\u06af\u0634\u062a\u06cc",editItem:"\u0648\u06cc\u0631\u0627\u06cc\u0634 \u06a9\u0627\u0644\u0627",newItem:"\u06a9\u0627\u0644\u0627\u06cc \u062c\u062f\u06cc\u062f",overview:"\u0646\u0645\u0627\u06cc \u06a9\u0644\u06cc",catalog:"\u06a9\u0627\u062a\u0627\u0644\u0648\u06af",transactions:"\u062a\u0631\u0627\u06a9\u0646\u0634\u200c\u0647\u0627",insights:"\u062a\u062d\u0644\u06cc\u0644",products:"\u06a9\u0627\u0644\u0627",approved:"\u062a\u0623\u06cc\u06cc\u062f \u0634\u062f\u0647",needsAttention:"\u0646\u06cc\u0627\u0632 \u0628\u0647 \u062a\u0648\u062c\u0647",allItemsOk:"\u0647\u0645\u0647\u200c\u0686\u06cc\u0632 \u062e\u0648\u0628\u0647",awaitingApproval:"\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631 \u062a\u0623\u06cc\u06cc\u062f",queueClear:"\u0635\u0641 \u062e\u0627\u0644\u06cc\u0647",stockHealth:"\u0648\u0636\u0639\u06cc\u062a \u0645\u0648\u062c\u0648\u062f\u06cc",topItems:"\u06a9\u0627\u0644\u0627\u0647\u0627\u06cc \u067e\u0631\u0627\u0631\u0632\u0634",inStock:"\u062f\u0631 \u0627\u0646\u0628\u0627\u0631",reports:"\u06af\u0632\u0627\u0631\u0634\u200c\u0647\u0627",reportsDesc:"\u06af\u0632\u0627\u0631\u0634\u200c\u0647\u0627\u06cc \u062f\u0644\u062e\u0648\u0627\u0647 \u0628\u0633\u0627\u0632 \u2014 \u0628\u062e\u0634\u200c\u0647\u0627 \u0631\u0648 \u0627\u0646\u062a\u062e\u0627\u0628 \u06a9\u0646\u060c Excel \u062f\u0627\u0646\u0644\u0648\u062f \u06a9\u0646",selectReports:"\u06af\u0632\u0627\u0631\u0634\u200c\u0647\u0627\u06cc \u0645\u0648\u0631\u062f \u0646\u0638\u0631 \u0631\u0648 \u0627\u0646\u062a\u062e\u0627\u0628 \u06a9\u0646",selectAll:"\u0627\u0646\u062a\u062e\u0627\u0628 \u0647\u0645\u0647",clearAll:"\u062d\u0630\u0641 \u0627\u0646\u062a\u062e\u0627\u0628",generateReport:"\u2193 \u0633\u0627\u062e\u062a \u06af\u0632\u0627\u0631\u0634 (Excel)",reportInventory:"\u0645\u0648\u062c\u0648\u062f\u06cc \u0627\u0646\u0628\u0627\u0631",reportTransactions:"\u062a\u0631\u0627\u06a9\u0646\u0634\u200c\u0647\u0627",reportAnalytics:"\u062a\u062d\u0644\u06cc\u0644",reportAudit:"\u062d\u0633\u0627\u0628\u0631\u0633\u06cc",inventorySummary:"\u062e\u0644\u0627\u0635\u0647 \u0645\u0648\u062c\u0648\u062f\u06cc",inventorySummaryDesc:"\u0647\u0645\u0647 \u06a9\u0627\u0644\u0627\u0647\u0627 \u0628\u0627 \u0645\u0648\u062c\u0648\u062f\u06cc\u060c \u0627\u0631\u0632\u0634 \u0648 \u0648\u0636\u0639\u06cc\u062a",lowStockReport:"\u06a9\u0627\u0644\u0627\u0647\u0627\u06cc \u06a9\u0645\u200c\u0645\u0648\u062c\u0648\u062f",lowStockDesc:"\u06a9\u0627\u0644\u0627\u0647\u0627\u06cc \u0632\u06cc\u0631 \u062d\u062f\u0627\u0642\u0644 \u062a\u0639\u0631\u06cc\u0641 \u0634\u062f\u0647",topItemsByValue:"\u06a9\u0627\u0644\u0627\u0647\u0627\u06cc \u067e\u0631\u0627\u0631\u0632\u0634",topItemsByValueDesc:"\u0628\u0627\u0627\u0631\u0632\u0634\u200c\u062a\u0631\u06cc\u0646 \u0627\u0642\u0644\u0627\u0645 \u0627\u0646\u0628\u0627\u0631",allPurchasesReport:"\u06a9\u0644 \u062e\u0631\u06cc\u062f\u0647\u0627",allPurchasesDesc:"\u0644\u06cc\u0633\u062a \u06a9\u0627\u0645\u0644 \u0628\u0627 \u0647\u0645\u0647 \u062c\u0632\u0626\u06cc\u0627\u062a",approvedPurchases:"\u062e\u0631\u06cc\u062f\u0647\u0627\u06cc \u062a\u0623\u06cc\u06cc\u062f \u0634\u062f\u0647",approvedPurchasesDesc:"\u0647\u0632\u06cc\u0646\u0647\u200c\u0647\u0627\u06cc \u062a\u0623\u06cc\u06cc\u062f \u0634\u062f\u0647\u060c \u062a\u0645\u0631\u06a9\u0632 \u0645\u0627\u0644\u06cc",pendingPurchases:"\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631 \u062a\u0623\u06cc\u06cc\u062f",pendingPurchasesDesc:"\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631 \u062a\u0635\u0645\u06cc\u0645 \u0645\u062f\u06cc\u0631",consumptionDetail:"\u062c\u0632\u0626\u06cc\u0627\u062a \u0645\u0635\u0631\u0641",consumptionDetailDesc:"\u06a9\u06cc \u0686\u06cc \u0628\u0631\u062f\u0627\u0634\u062a\u060c \u0627\u0632 \u06a9\u062c\u0627\u060c \u06a9\u06cc",returnsReport:"\u0628\u0631\u06af\u0634\u062a\u06cc\u200c\u0647\u0627",returnsDesc:"\u06a9\u0627\u0644\u0627\u0647\u0627\u06cc \u0628\u0631\u06af\u0634\u062a\u06cc \u0628\u0647 \u0627\u0646\u0628\u0627\u0631",ordersReport:"\u0633\u0641\u0627\u0631\u0634\u200c\u0647\u0627",ordersReportDesc:"\u0633\u0641\u0627\u0631\u0634\u200c\u0647\u0627\u06cc \u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631 \u0648 \u062a\u0623\u06cc\u06cc\u062f \u0634\u062f\u0647",consumptionByDept:"\u0645\u0635\u0631\u0641 \u0628\u0631 \u0627\u0633\u0627\u0633 \u062f\u067e\u0627\u0631\u062a\u0645\u0627\u0646",consumptionByDeptDesc:"\u0645\u0635\u0631\u0641 \u062a\u062c\u0645\u06cc\u0639\u06cc \u0628\u0631 \u0627\u0633\u0627\u0633 \u0645\u062d\u0644",consumptionByOperator:"\u0645\u0635\u0631\u0641 \u0628\u0631 \u0627\u0633\u0627\u0633 \u0627\u067e\u0631\u0627\u062a\u0648\u0631",consumptionByOperatorDesc:"\u06a9\u06cc \u0686\u0642\u062f\u0631 \u0645\u0635\u0631\u0641 \u06a9\u0631\u062f\u0647",deliveryReport:"\u06af\u0632\u0627\u0631\u0634 \u062a\u062d\u0648\u06cc\u0644",deliveryReportDesc:"\u06a9\u06cc \u0686\u06cc \u0628\u0647 \u06a9\u06cc \u062a\u062d\u0648\u06cc\u0644 \u062f\u0627\u062f\u0647",suppliersReport:"\u062e\u0644\u0627\u0635\u0647 \u062a\u0623\u0645\u06cc\u0646\u200c\u06a9\u0646\u0646\u062f\u06af\u0627\u0646",suppliersReportDesc:"\u062a\u062d\u0644\u06cc\u0644 \u0647\u0632\u06cc\u0646\u0647 \u0628\u0631 \u0627\u0633\u0627\u0633 \u062a\u0623\u0645\u06cc\u0646\u200c\u06a9\u0646\u0646\u062f\u0647",financialSummary:"\u062e\u0644\u0627\u0635\u0647 \u0645\u0627\u0644\u06cc",financialSummaryDesc:"\u062c\u0645\u0639\u200c\u0647\u0627\u060c \u0634\u0627\u062e\u0635\u200c\u0647\u0627\u060c \u0627\u0639\u062f\u0627\u062f \u06a9\u0644\u06cc\u062f\u06cc",anomaliesReport:"\u062a\u0634\u062e\u06cc\u0635 \u063a\u06cc\u0631\u0639\u0627\u062f\u06cc",anomaliesDesc:"\u0627\u0644\u06af\u0648\u0647\u0627\u06cc \u0645\u0635\u0631\u0641 \u063a\u06cc\u0631\u0639\u0627\u062f\u06cc",activityLogReport:"\u06af\u0632\u0627\u0631\u0634 \u0641\u0639\u0627\u0644\u06cc\u062a",activityLogDesc:"\u0645\u0633\u06cc\u0631 \u06a9\u0627\u0645\u0644 \u062d\u0633\u0627\u0628\u0631\u0633\u06cc \u0628\u0627 \u06a9\u0627\u0631\u0628\u0631 \u0648 \u0632\u0645\u0627\u0646",reportGenerated:"\u06af\u0632\u0627\u0631\u0634 \u0628\u0627 \u0645\u0648\u0641\u0642\u06cc\u062a \u0633\u0627\u062e\u062a\u0647 \u0634\u062f",noReportsSelected:"\u062d\u062f\u0627\u0642\u0644 \u06cc\u06a9 \u06af\u0632\u0627\u0631\u0634 \u0627\u0646\u062a\u062e\u0627\u0628 \u06a9\u0646"}
};

const DEPTS = ["General Maintenance","Gardening","Cleaning","Pools","Security","Equipment Repairs"];
const REPORT_CATEGORIES = [
  {key:"inventory",    icon:"\ud83d\udce6"},
  {key:"transactions", icon:"\ud83d\udcb3"},
  {key:"analytics",    icon:"\ud83d\udcca"},
  {key:"audit",        icon:"\ud83d\udd12"},
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
const STATUS_META = {pending:{en:"Pending",fa:"\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631",color:"#f59e0b"},approved:{en:"Approved",fa:"\u062a\u0623\u06cc\u06cc\u062f \u0634\u062f\u0647",color:"#10b981"},rejected:{en:"Rejected",fa:"\u0631\u062f \u0634\u062f\u0647",color:"#ef4444"},delivered:{en:"Delivered",fa:"\u062a\u062d\u0648\u06cc\u0644 \u0634\u062f\u0647",color:"#3b82f6"},confirmed:{en:"Confirmed",fa:"\u062a\u0623\u06cc\u06cc\u062f",color:"#6366f1"},cancelled:{en:"Cancelled",fa:"\u0644\u063a\u0648 \u0634\u062f\u0647",color:"#8892b0"}};
const NAV_GROUPS = [
  {key:"overview",     items:["dashboard"]},
  {key:"catalog",      items:["itemsMgmt","inventory"]},
  {key:"transactions", items:["purchases","consumption","returns","orders"]},
  {key:"database",     items:["caesarMap","syncMaps"]},
  ...(POOLS_ENABLED ? [{key:"pools",        items:["pools"]}] : []),
  ...(PROCURE_ENABLED ? [{key:"procurement", items:["procure"]}] : []),
  {key:"insights",     items:["reports","suppliers","activityLog"]},
];
const TAB_ICONS = {reports:"\ud83d\udccb",dashboard:"\u25c8",itemsMgmt:"\u229e",inventory:"\u25a6",purchases:"\u2193",consumption:"\u2197",returns:"\u21a9",orders:"\u25ce",suppliers:"\u22a1",activityLog:"\ud83d\udccb",caesarMap:"\ud83d\uddfa",pools:"\ud83c\udfca",procure:"\ud83d\udcb3"};

const CATEGORY_COLORS = {"building":"#6366f1","pool":"#22d3ee","office":"#f59e0b","f&b":"#ef4444","facility":"#10b981","garden":"#34d399","security":"#a78bfa","spa":"#ec4899","default":"#8b5cf6"};
const getCategoryColor = (cat) => CATEGORY_COLORS[(cat||"").toLowerCase()] || CATEGORY_COLORS.default;

const fmt = n => Number(n||0).toLocaleString("en-US");
const curr = n => `\u20ba${fmt(n)}`;

function Modal({ open, title, onClose, children, theme }) {
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)"}}>
      <div style={{background:theme.bgElev,border:`1px solid ${theme.border}`,borderRadius:18,width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"auto",padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{color:theme.textHeading,fontSize:17,fontWeight:700,margin:0}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:theme.textMuted,cursor:"pointer",fontSize:22}}>\u2715</button>
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
  const [resortLocations, setResortLocations] = useState([]);
  const [selectedPin, setSelectedPin] = useState(null);
  const [mapCategoryFilter, setMapCategoryFilter] = useState("All");
  const imgRef = useRef();
  const t = T[lang];
  const TH = THEMES[theme];
  const sf = k => v => setForm(f=>({...f,[k]:v}));

  useEffect(() => { localStorage.setItem("stocktrack-theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("stocktrack-lang", lang); }, [lang]);
  useEffect(() => {
  }, []);
  useEffect(() => { const i = setInterval(()=>setNow(new Date()), 1000); return ()=>clearInterval(i); }, []);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try { await logAction("Auto Logout (Idle)", `Session expired after 30min idle by:${user?.email}`); } catch(e){}
        supabase.auth.signOut();
      }, 30*60*1000);
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
      const [i,p,c,r,o,l,rl] = await Promise.all([
        supabase.from("items").select("*").order("id"),
        supabase.from("purchases").select("*").order("created_at",{ascending:false}),
        supabase.from("consumptions").select("*").order("created_at",{ascending:false}),
        supabase.from("returns").select("*").order("created_at",{ascending:false}),
        supabase.from("orders").select("*").order("created_at",{ascending:false}),
        supabase.from("activity_log").select("*").order("created_at",{ascending:false}).limit(200),
        supabase.from("resort_locations").select("*").order("id"),
      ]);
      if(i.data) setItems(i.data);
      if(p.data) setPurchases(p.data.map(x=>({...x,itemId:x.item_id,unitPrice:x.unit_price,orderNo:x.order_no,receivedDate:x.received_date})));
      if(c.data) setConsumptions(c.data.map(x=>({...x,itemId:x.item_id,deliveredTo:x.delivered_to,deliveryPerson:x.delivery_person})));
      if(r.data) setReturns(r.data.map(x=>({...x,itemId:x.item_id,fromLocation:x.from_location,receivedBy:x.received_by})));
      if(o.data) setOrders(o.data.map(x=>({...x,itemId:x.item_id})));
      if(l.data) setLogs(l.data);
      if(rl.data) setResortLocations(rl.data);
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
      return alert("Invalid image \u2014 must be an uploaded image or HTTPS URL");
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

  function exportExcel() {
    const ts = new Date().toLocaleString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventory.map(i=>({Code:i.code,Product:i.name,Unit:i.unit,Purchased:i.bought,Consumed:i.used,Returned:i.returned,Stock:i.stock,"Min Stock":i.min_stock,"Avg Price":Math.round(i.avg||0),"Stock Value":Math.round(i.totalValue||0)}))), "Inventory");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchases.map(p=>{const it=items.find(i=>i.id===p.itemId);return{Date:p.date,"Order No":p.orderNo,Invoice:p.invoice,Supplier:p.supplier,Product:it?.name||"",Qty:p.qty,"Unit Price":p.unitPrice,Total:Math.round(p.qty*p.unitPrice),Dept:p.department,Status:p.status,By:p.created_by};})), "Purchases");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consumptions.map(c=>{const it=items.find(i=>i.id===c.itemId);return{Date:c.date,Product:it?.name||"",Qty:c.qty,Location:c.location,"Delivered To":c.deliveredTo||"","Delivered By":c.deliveryPerson||"",Operator:c.operator||"",Note:c.note||"",By:c.created_by};})), "Consumption");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(returns.map(r=>{const it=items.find(i=>i.id===r.itemId);return{Date:r.date,Product:it?.name||"",Qty:r.qty,Reason:r.reason||"","From Location":r.fromLocation||"","Received By":r.receivedBy||"",Note:r.note||"",By:r.created_by};})), "Returns");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logs.map(l=>({Action:l.action,Details:l.details,By:l.user_email,Time:l.created_at?new Date(l.created_at).toLocaleString("en-GB"):""}))), "Activity Log");
    XLSX.writeFile(wb, `StockTrack_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  async function generateCustomReport() {
    const selected = Object.keys(reportSelections).filter(k => reportSelections[k]);
    if (selected.length === 0) return alert(t.noReportsSelected);

    const d = (iso) => iso ? new Date(iso).toLocaleString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "";
    const now = d(new Date().toISOString());
    const wb = XLSX.utils.book_new();

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

    if (selected.includes("inventorySummary")) {
      addSheet("Inventory", inventory.map(i => ({Code:i.code,Product:i.name,Unit:i.unit,Purchased:i.bought,Consumed:i.used,Returned:i.returned,Stock:i.stock,"Min Stock":i.min_stock,"Avg Price":Math.round(i.avg||0),"Stock Value":Math.round(i.totalValue||0),Status:i.stock<=0?"OUT":i.low?"LOW":"OK",Supplier:i.supplier||""})));
    }
    if (selected.includes("lowStockReport")) {
      addSheet("Low Stock", inventory.filter(i=>i.low||i.stock<=0).map(i => ({Code:i.code,Product:i.name,Unit:i.unit,Stock:i.stock,"Min Stock":i.min_stock,"Shortage Qty":Math.max(0,i.min_stock-i.stock),"Avg Price":Math.round(i.avg||0),"Restock Cost":Math.round(Math.max(0,i.min_stock-i.stock)*(i.avg||0)),Status:i.stock<=0?"OUT":"LOW",Supplier:i.supplier||""})));
    }
    if (selected.includes("allPurchasesReport")) {
      addSheet("Purchases", purchases.map(p => {const it=items.find(i=>i.id===p.itemId);return{Date:p.date||"","Order No":p.orderNo||"",Invoice:p.invoice||"",Supplier:p.supplier||"",Product:it?.name||"",Unit:it?.unit||"",Qty:p.qty,"Unit Price":p.unitPrice,Total:Math.round(p.qty*p.unitPrice),Dept:p.department||"","Received":p.receivedDate||"",Status:p.status,Note:p.note||"",By:p.created_by||"","Logged At":d(p.created_at)};}));
    }
    if (selected.includes("approvedPurchases")) {
      addSheet("Approved Purchases", purchases.filter(p=>p.status==="approved").map(p => {const it=items.find(i=>i.id===p.itemId);return{Date:p.date||"","Order No":p.orderNo||"",Invoice:p.invoice||"",Supplier:p.supplier||"",Product:it?.name||"",Unit:it?.unit||"",Qty:p.qty,"Unit Price":p.unitPrice,Total:Math.round(p.qty*p.unitPrice),Dept:p.department||"",By:p.created_by||"","Logged At":d(p.created_at)};}));
    }
    if (selected.includes("pendingPurchases")) {
      addSheet("Pending Approvals", purchases.filter(p=>p.status==="pending").map(p => {const it=items.find(i=>i.id===p.itemId);return{Date:p.date||"",Supplier:p.supplier||"",Product:it?.name||"",Unit:it?.unit||"",Qty:p.qty,"Unit Price":p.unitPrice,Total:Math.round(p.qty*p.unitPrice),Dept:p.department||"",Note:p.note||"","Requested By":p.created_by||"","Submitted At":d(p.created_at)};}));
    }
    if (selected.includes("consumptionDetail")) {
      addSheet("Consumption", consumptions.map(c => {const it=items.find(i=>i.id===c.itemId);const inv=inventory.find(i=>i.id===c.itemId);return{Date:c.date||"",Product:it?.name||"",Unit:it?.unit||"",Qty:c.qty,"Est. Value":Math.round(Number(c.qty)*(inv?.avg||0)),Location:c.location||"","Delivered To":c.deliveredTo||"","Delivered By":c.deliveryPerson||"",Operator:c.operator||"",Note:c.note||"",By:c.created_by||"","Logged At":d(c.created_at)};}));
    }
    if (selected.includes("returnsReport")) {
      addSheet("Returns", returns.map(r => {const it=items.find(i=>i.id===r.itemId);const inv=inventory.find(i=>i.id===r.itemId);return{Date:r.date||"",Product:it?.name||"",Unit:it?.unit||"",Qty:r.qty,"Est. Value":Math.round(Number(r.qty)*(inv?.avg||0)),Reason:r.reason||"","From Location":r.fromLocation||"","Received By":r.receivedBy||"",Note:r.note||"",By:r.created_by||"","Logged At":d(r.created_at)};}));
    }
    if (selected.includes("ordersReport")) {
      addSheet("Orders", orders.map(o => {const it=items.find(i=>i.id===o.itemId);return{Date:o.date||"",Product:it?.name||"",Unit:it?.unit||"",Qty:o.qty,Supplier:o.supplier||"",Status:o.status,Note:o.note||"",By:o.created_by||"","Logged At":d(o.created_at)};}));
    }
    if (selected.includes("consumptionByDept")) {
      const agg = {};
      consumptions.forEach(c => {
        const inv=inventory.find(i=>i.id===c.itemId);const it=items.find(i=>i.id===c.itemId);const dept=c.location||"\u2014";
        if(!agg[dept]) agg[dept]={Location:dept,Records:0,Items:new Set(),Operators:new Set(),TotalQty:0,"Est. Value":0,"First Date":"","Last Date":""};
        agg[dept].Records++;agg[dept].Items.add(it?.name||"");agg[dept].Operators.add(c.operator||"\u2014");agg[dept].TotalQty+=Number(c.qty);agg[dept]["Est. Value"]+=Number(c.qty)*(inv?.avg||0);
        if(!agg[dept]["First Date"]||c.date<agg[dept]["First Date"]) agg[dept]["First Date"]=c.date||"";
        if(!agg[dept]["Last Date"]||c.date>agg[dept]["Last Date"]) agg[dept]["Last Date"]=c.date||"";
      });
      addSheet("By Location", Object.values(agg).map(d=>({Location:d.Location,Records:d.Records,"Unique Items":d.Items.size,"Unique Operators":d.Operators.size,"Total Qty":d.TotalQty,"Est. Value":Math.round(d["Est. Value"]),"First Date":d["First Date"],"Last Date":d["Last Date"],"Report Generated At":now})));
    }
    if (selected.includes("consumptionByOperator")) {
      const agg = {};
      consumptions.forEach(c => {
        const inv=inventory.find(i=>i.id===c.itemId);const op=c.operator||"\u2014";
        if(!agg[op]) agg[op]={Operator:op,Records:0,Items:new Set(),Locations:new Set(),TotalQty:0,"Est. Value":0,"First Date":"","Last Date":""};
        agg[op].Records++;agg[op].Items.add(c.itemId);agg[op].Locations.add(c.location||"\u2014");agg[op].TotalQty+=Number(c.qty);agg[op]["Est. Value"]+=Number(c.qty)*(inv?.avg||0);
        if(!agg[op]["First Date"]||c.date<agg[op]["First Date"]) agg[op]["First Date"]=c.date||"";
        if(!agg[op]["Last Date"]||c.date>agg[op]["Last Date"]) agg[op]["Last Date"]=c.date||"";
      });
      addSheet("By Operator", Object.values(agg).map(d=>({Operator:d.Operator,Records:d.Records,"Unique Items":d.Items.size,"Unique Locations":d.Locations.size,"Total Qty":d.TotalQty,"Est. Value":Math.round(d["Est. Value"]),"First Date":d["First Date"],"Last Date":d["Last Date"],"Report Generated At":now})));
    }
    if (selected.includes("deliveryReport")) {
      addSheet("Deliveries", consumptions.filter(c=>c.deliveredTo||c.deliveryPerson).map(c => {const it=items.find(i=>i.id===c.itemId);const inv=inventory.find(i=>i.id===c.itemId);return{Date:c.date||"",Product:it?.name||"",Qty:c.qty,Unit:it?.unit||"","Est. Value":Math.round(Number(c.qty)*(inv?.avg||0)),"Delivered To":c.deliveredTo||"","Delivered By":c.deliveryPerson||"",Location:c.location||"",Operator:c.operator||"",Note:c.note||"",By:c.created_by||"","Logged At":d(c.created_at)};}));
    }
    if (selected.includes("suppliersReport")) {
      addSheet("Suppliers", SUPPLIERS_LIST.map(s => {
        const sp=purchases.filter(p=>p.supplier===s&&p.status==="approved");const all=purchases.filter(p=>p.supplier===s);const dates=sp.map(p=>p.date).filter(Boolean).sort();
        return{Supplier:s,"Total Purchases":all.length,"Approved":sp.length,"Pending":all.filter(p=>p.status==="pending").length,"Total Qty":sp.reduce((s,p)=>s+Number(p.qty),0),"Total Spend":Math.round(sp.reduce((s,p)=>s+p.qty*p.unitPrice,0)),"Avg Order Value":sp.length?Math.round(sp.reduce((s,p)=>s+p.qty*p.unitPrice,0)/sp.length):0,"First Purchase":dates[0]||"","Last Purchase":dates[dates.length-1]||""};
      }));
    }
    if (selected.includes("financialSummary")) {
      const totalVal=inventory.reduce((s,i)=>s+(i.totalValue||0),0);
      const apprSpend=purchases.filter(p=>p.status==="approved").reduce((s,p)=>s+p.qty*p.unitPrice,0);
      const pendSpend=purchases.filter(p=>p.status==="pending").reduce((s,p)=>s+p.qty*p.unitPrice,0);
      const consVal=consumptions.reduce((s,c)=>{const inv=inventory.find(i=>i.id===c.itemId);return s+Number(c.qty)*(inv?.avg||0);},0);
      addSheet("Financial Summary", [
        {Metric:"Report Generated At",Value:now},{Metric:"Generated By",Value:user?.email||""},{Metric:"",Value:""},
        {Metric:"Total Stock Value (\u20ba)",Value:Math.round(totalVal)},{Metric:"Approved Spend (\u20ba)",Value:Math.round(apprSpend)},
        {Metric:"Pending Spend (\u20ba)",Value:Math.round(pendSpend)},{Metric:"Consumption Value (\u20ba)",Value:Math.round(consVal)},{Metric:"",Value:""},
        {Metric:"Items Total",Value:items.length},{Metric:"Items OK",Value:inventory.filter(i=>!i.low&&i.stock>0).length},
        {Metric:"Items Low Stock",Value:inventory.filter(i=>i.low).length},{Metric:"Items Out of Stock",Value:inventory.filter(i=>i.stock<=0).length},{Metric:"",Value:""},
        {Metric:"Purchases Total",Value:purchases.length},{Metric:"Purchases Approved",Value:purchases.filter(p=>p.status==="approved").length},
        {Metric:"Purchases Pending",Value:purchases.filter(p=>p.status==="pending").length},{Metric:"Purchases Rejected",Value:purchases.filter(p=>p.status==="rejected").length},{Metric:"",Value:""},
        {Metric:"Consumption Records",Value:consumptions.length},{Metric:"Return Records",Value:returns.length},{Metric:"Order Records",Value:orders.length},
      ]);
    }
    if (selected.includes("anomaliesReport")) {
      addSheet("Discrepancies", inventory.map(i => {const diff=i.stock-i.min_stock;return{Code:i.code,Product:i.name,Unit:i.unit,Purchased:i.bought,Consumed:i.used,Returned:i.returned,"Current Stock":i.stock,"Min Stock":i.min_stock,"Surplus / Deficit":diff,"Stock Value":Math.round(i.totalValue||0),Status:i.stock<=0?"\u26a0 OUT":i.low?"\u26a0 LOW":"\u2713 OK",Supplier:i.supplier||"","Report At":now};}));
    }
    if (selected.includes("topItemsByValue")) {
      addSheet("High Value Items", [...inventory].sort((a,b)=>b.totalValue-a.totalValue).map((i,idx) => ({Rank:idx+1,Code:i.code,Product:i.name,Unit:i.unit,"Current Stock":i.stock,"Avg Price":Math.round(i.avg||0),"Total Value":Math.round(i.totalValue||0),Supplier:i.supplier||""})));
    }
    if (selected.includes("activityLogReport")) {
      addSheet("Activity Log", logs.map(l => ({Action:l.action,Details:l.details,By:l.user_email,Time:d(l.created_at)})));
    }

    if (wb.SheetNames.length <= 1) return alert("No data for selected reports");
    const fname = `StockTrack_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fname);
    await logAction("Generated Report", `sections:${selected.join(",")} sheets:${wb.SheetNames.length} by:${user?.email}`);
    alert(`\u2713 ${t.reportGenerated}\n${wb.SheetNames.length-1} sheet${wb.SheetNames.length>2?"s":""} generated.`);
  }

  const filtInv  = inventory.filter(i=>{const s=search.toLowerCase();return i.name.toLowerCase().includes(s)||i.code.toLowerCase().includes(s);});
  // ── live map counts from Supabase ──
  const [mapCounts, setMapCounts] = useState({iskele:0, blue:0, cliff:0, beach:0, breeze:0, bay:0});
  useEffect(() => {
    if(!isAdmin) return;
    (async () => {
      const {data, error} = await supabase
        .from("resort_locations")
        .select("property_slug")
        .eq("is_active", true);
      if(!error && data) {
        const counts = {};
        data.forEach(r => { counts[r.property_slug] = (counts[r.property_slug]||0) + 1; });
        setMapCounts(c => ({...c, ...counts}));
      }
    })();
  }, [isAdmin, tab]);

  const filtPur  = purchases.filter(p=>deptFilter==="All"||p.department===deptFilter);
  const filtCons = consumptions.filter(c=>search===""||items.find(i=>i.id===c.itemId)?.name.toLowerCase().includes(search.toLowerCase()));
  const filtRet  = returns.filter(r=>search===""||items.find(i=>i.id===r.itemId)?.name.toLowerCase().includes(search.toLowerCase()));
  const allTabs = isAdmin ? ["dashboard","itemsMgmt","inventory","purchases","consumption","returns","orders","caesarMap","syncMaps",...(POOLS_ENABLED?["pools"]:[]),...(PROCURE_ENABLED?["procure"]:[]),"reports","suppliers","activityLog"] : ["consumption",...(PROCURE_ENABLED?["procure"]:[])];

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:TH.bg}}><div style={{color:TH.accent,fontSize:16}}>{t.loading}</div></div>;

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
  const saveBtn = {width:"100%",background:"linear-gradient(135deg,#C9A960,#8B7A44)",border:"none",borderRadius:10,color:"#fff",padding:"12px",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit",marginTop:8,boxShadow:"0 4px 12px rgba(201,169,96,.3)"};
  const srchInput = {background:TH.bgInput,border:`1px solid ${TH.borderStrong}`,borderRadius:9,padding:"9px 14px",color:TH.text,fontSize:13,outline:"none",width:240,fontFamily:"inherit"};

  const dateStr = now.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});
  const timeStr = now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"});

  return (
    <div dir={lang==="fa"||lang==="he"?"rtl":"ltr"} style={{display:"flex",flexDirection:"column",minHeight:"100vh",background:TH.bg,color:TH.text,fontFamily:lang==="fa"?"'Vazirmatn','Tahoma',sans-serif":lang==="he"?"'Heebo','Arial',sans-serif":"'Inter','Segoe UI',system-ui,sans-serif"}}>

      <header style={{position:"sticky",top:0,zIndex:100,background:TH.header,borderBottom:`1px solid ${TH.headerBorder}`,height:isMobile?54:60,display:"flex",alignItems:"center",padding:isMobile?"0 12px":"0 24px",gap:isMobile?8:16,flexShrink:0}}>
        {isMobile&&<button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:8,color:TH.text,padding:"7px 10px",cursor:"pointer",fontSize:16,fontFamily:"inherit",lineHeight:1}}>\u2630</button>}
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:isMobile?0:200}}>
          <img src="/caesar-logo.png" alt="Caesar Projects" style={{height:isMobile?32:38,width:"auto",display:"block",flexShrink:0}}/>
          {!isMobile&&<div style={{borderLeft:`1px solid ${TH.border}`,paddingLeft:12,marginLeft:4}}>
            <div style={{color:TH.accent,fontSize:9,fontWeight:600,letterSpacing:"0.2em",textTransform:"uppercase"}}>\u25cf LIVE</div>
          </div>}
        </div>

        <div style={{flex:1}}/>

        {!isMobile&&<div style={{display:"flex",alignItems:"center",gap:12,color:TH.textMuted,fontSize:13,fontFamily:"ui-monospace,monospace"}}>
          <span>{dateStr}</span>
          <span style={{color:TH.accent,fontWeight:600}}>{timeStr}</span>
        </div>}

        <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:9,color:TH.text,padding:isMobile?"7px 9px":"7px 12px",cursor:"pointer",fontSize:14,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
          {theme==="dark"?"\u2600":"\ud83c\udf19"}
          {!isMobile&&<span style={{fontSize:11,color:TH.textMuted}}>{theme==="dark"?"Light":"Dark"}</span>}
        </button>

        <div style={{display:"flex",background:TH.bgInput,borderRadius:9,padding:3,gap:2,border:`1px solid ${TH.border}`}}>
          {[{c:"en",l:"EN"},{c:"he",l:"HE"},{c:"fa",l:"FA"}].map(({c,l})=>(
            <button key={c} onClick={()=>setLang(c)} style={{padding:isMobile?"5px 7px":"5px 10px",border:"none",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700,background:lang===c?TH.accent:"transparent",color:lang===c?"#fff":TH.textMuted,fontFamily:"inherit"}}>{l}</button>
          ))}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:isMobile?0:9,padding:isMobile?"3px":"5px 11px 5px 5px",background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:30}}>
          <div style={{width:isMobile?26:28,height:isMobile?26:28,borderRadius:"50%",background:"linear-gradient(135deg,#C9A960,#8B7A44)",display:"flex",alignItems:"center",justifyContent:"center",color:"#000",fontWeight:800,fontSize:12}}>{user?.email?.charAt(0).toUpperCase()||"A"}</div>
          {!isMobile&&<div style={{fontSize:11,lineHeight:1.2}}>
            <div style={{color:TH.text,fontWeight:600}}>{isAdmin?"Admin":"Staff"}</div>
            <div style={{color:TH.textMuted,fontSize:10}}>{user?.email?.split("@")[0]}</div>
          </div>}
        </div>

        <button onClick={()=>supabase.auth.signOut()} style={{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:9,color:"#ef4444",padding:isMobile?"7px 9px":"7px 14px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600}}>\u21aa{!isMobile&&" "+t.logout}</button>
      </header>

      <div style={{display:"flex",flex:1,minHeight:0,position:"relative"}}>

        {isMobile&&sidebarOpen&&<div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,top:54,background:"rgba(0,0,0,.5)",zIndex:90,backdropFilter:"blur(2px)"}}/>}

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

        <main style={{flex:1,padding:isMobile?"16px 14px":"24px 28px",overflowY:"auto",overflowX:"hidden",minWidth:0,width:"100%"}}>

          {tab==="dashboard"&&isAdmin&&<>
            <div style={{marginBottom:24}}>
              <h1 style={h1Style}>{t.dashboard}</h1>
              <div style={subStyle}>{lang==="fa"?"\u0646\u0645\u0627\u06cc \u06a9\u0644\u06cc \u0645\u0648\u062c\u0648\u062f\u06cc\u060c \u062e\u0631\u06cc\u062f \u0648 \u0645\u0635\u0631\u0641 \u06a9\u0627\u0644\u0627":"Real-time overview of stock, purchases, and consumption."}</div>
            </div>

            <div style={{display:"flex",gap:10,marginBottom:22,flexWrap:"wrap"}}>
              <button onClick={()=>openM("purchase",{date:"",itemId:"",qty:"",unitPrice:"",supplier:"",invoice:"",orderNo:"",receivedDate:"",department:"",note:""})} style={{background:"linear-gradient(135deg,#C9A960,#8B7A44)",border:"none",borderRadius:10,color:"#fff",padding:"10px 18px",cursor:"pointer",fontSize:12.5,fontWeight:700,fontFamily:"inherit",boxShadow:"0 4px 12px rgba(201,169,96,.25)"}}>{t.newPurchase}</button>
              <button onClick={()=>openM("consumption",{date:new Date().toISOString().slice(0,10),itemId:"",qty:"",location:"",operator:"",deliveredTo:"",deliveryPerson:"",note:""})} style={{background:"rgba(245,158,11,.12)",border:"1px solid rgba(245,158,11,.4)",borderRadius:10,color:"#f59e0b",padding:"10px 18px",cursor:"pointer",fontSize:12.5,fontWeight:700,fontFamily:"inherit"}}>{t.logConsumption}</button>
              <button onClick={()=>openM("return",{date:new Date().toISOString().slice(0,10),itemId:"",qty:"",reason:"",fromLocation:"",receivedBy:"",note:""})} style={{background:"rgba(16,185,129,.1)",border:"1px solid rgba(16,185,129,.35)",borderRadius:10,color:"#10b981",padding:"10px 18px",cursor:"pointer",fontSize:12.5,fontWeight:700,fontFamily:"inherit"}}>{t.addReturn}</button>
              <button onClick={()=>openM("item",{code:"",name:"",unit:"unit",min_stock:0,supplier:"",image_url:""})} style={{background:TH.bgInput,border:`1px solid ${TH.borderStrong}`,borderRadius:10,color:TH.text,padding:"10px 18px",cursor:"pointer",fontSize:12.5,fontWeight:700,fontFamily:"inherit"}}>{t.addItem}</button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(auto-fit,minmax(190px,1fr))",gap:isMobile?10:14,marginBottom:isMobile?16:24}}>
              {[
                {label:t.totalValue,    val:curr(Math.round(totalValue)), sub:`${inventory.length} ${t.products}`,  c:KPI_COLORS.blue,    ico:"\u25c8"},
                {label:t.totalPurchases,val:curr(Math.round(totalSpend)),  sub:`${purchases.filter(p=>p.status==="approved").length} ${t.approved}`, c:KPI_COLORS.cyan,    ico:"\u2193"},
                {label:t.pendingApprovals,val:String(pendingCount),         sub:pendingCount>0?t.awaitingApproval:t.queueClear, c:pendingCount>0?KPI_COLORS.orange:KPI_COLORS.green, ico:"\u23f3"},
                {label:t.lowAlerts,     val:String(lowStock.length),        sub:lowStock.length>0?t.needsAttention:t.allItemsOk, c:lowStock.length>0?KPI_COLORS.red:KPI_COLORS.green, ico:"\u26a0"},
                {label:t.returned,      val:fmt(returns.reduce((s,r)=>s+Number(r.qty),0)), sub:`${returns.length} records`, c:KPI_COLORS.purple, ico:"\u21a9"},
              ].map(k=>(
                <div key={k.label} style={{background:k.c.grad,borderRadius:16,padding:"18px 20px",position:"relative",overflow:"hidden",boxShadow:`0 6px 16px ${k.c.solid}30`,color:"#fff"}}>
                  <div style={{position:"absolute",top:-6,right:-4,fontSize:80,opacity:0.13,fontWeight:900,lineHeight:1,pointerEvents:"none",color:"#fff"}}>{k.ico}</div>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.06em",opacity:0.85,marginBottom:10,textTransform:"uppercase"}}>{k.label}</div>
                  <div style={{fontSize:30,fontWeight:800,lineHeight:1,marginBottom:6,letterSpacing:"-0.5px"}}>{k.val}</div>
                  <div style={{fontSize:11,opacity:0.85}}>{k.sub}</div>
                </div>
              ))}
            </div>

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

            {(discrepancies.length>0||pendingCount>0)&&(
              <div style={{display:"grid",gridTemplateColumns:discrepancies.length>0&&pendingCount>0?"1fr 1fr":"1fr",gap:14,marginBottom:24}}>
                {discrepancies.length>0&&(
                  <div style={{background:theme==="dark"?"rgba(239,68,68,.06)":"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.25)",borderRadius:14,padding:"16px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span style={{fontSize:16}}>\ud83d\udd0d</span><span style={{color:"#ef4444",fontWeight:700,fontSize:13}}>\u26a0 {t.discrepancy}</span></div>
                    {discrepancies.map((d,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"6px 0",borderBottom:"1px solid rgba(239,68,68,.1)"}}><span style={{fontWeight:600,color:TH.text}}>{d.item.name}</span><span style={{color:"#ef4444"}}>Last: <b>{d.last}</b> \u00b7 avg: {d.avg}</span></div>))}
                  </div>
                )}
                {pendingCount>0&&(
                  <div style={{background:theme==="dark"?"rgba(245,158,11,.06)":"rgba(245,158,11,.05)",border:"1px solid rgba(245,158,11,.25)",borderRadius:14,padding:"16px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span style={{fontSize:16}}>\u23f3</span><span style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>{t.pendingApprovals}: {pendingCount}</span></div>
                    {purchases.filter(p=>p.status==="pending").map(p=>{const it=items.find(i=>i.id===p.itemId);return(
                      <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(245,158,11,.1)",fontSize:12,gap:8}}>
                        <div style={{flex:1,minWidth:0}}><span style={{color:TH.text,fontWeight:600}}>{it?.name}</span><span style={{color:TH.textMuted,marginLeft:8}}>{p.qty} \u00b7 {p.supplier}</span></div>
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

            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.4fr 1fr",gap:16,marginBottom:24}}>
              <div style={card}>
                <div style={cardTitle}><span>{t.spendDept}</span><span style={{color:TH.textMuted,fontSize:11,fontWeight:500}}>{deptData.length}</span></div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deptData} layout="vertical" margin={{left:0,right:12}}>
                    <XAxis type="number" tick={{fill:TH.textDim,fontSize:10}} tickFormatter={v=>`\u20ba${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="dept" tick={{fill:TH.textMuted,fontSize:10}} width={140} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v=>[`\u20ba${fmt(v)}`,"Spend"]} contentStyle={{background:TH.bgElev,border:`1px solid ${TH.borderStrong}`,borderRadius:10,color:TH.text,fontSize:12}}/>
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
                    <Tooltip formatter={v=>[`\u20ba${fmt(v)}`,"Spend"]} contentStyle={{background:TH.bgElev,border:`1px solid ${TH.borderStrong}`,borderRadius:10,color:TH.text,fontSize:12}}/>
                    <Legend formatter={v=><span style={{color:TH.textMuted,fontSize:10}}>{v}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{...card,marginBottom:20}}>
              <div style={cardTitle}>
                <span>{t.stockHealth}</span>
                <div style={{display:"flex",gap:14,fontSize:11,fontWeight:500}}>
                  <span style={{color:"#10b981"}}>\u25cf OK</span>
                  <span style={{color:"#f59e0b"}}>\u25cf Low</span>
                  <span style={{color:"#ef4444"}}>\u25cf Critical</span>
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
                    <div style={{flex:1,minWidth:0}}><div style={{color:TH.text,fontSize:12,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it?.name}</div><div style={{color:TH.textMuted,fontSize:10,marginTop:2}}>{p.date} \u00b7 {p.supplier}</div></div>
                    <div style={{textAlign:"right",flexShrink:0}}><div style={{color:"#22d3ee",fontSize:11,marginBottom:3,fontWeight:600}}>{p.qty} {it?.unit}</div><Badge label={sm?.[lang==="fa"?"fa":"en"]||p.status} color={sm?.color||"#8892b0"}/></div>
                  </div>
                );})}
              </div>
              <div style={card}>
                <div style={cardTitle}>{t.recentConsumption}</div>
                {consumptions.slice(0,5).map(c=>{const it=items.find(i=>i.id===c.itemId);return(
                  <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"8px 0",borderBottom:`1px solid ${TH.divider}`,gap:8}}>
                    <div style={{flex:1,minWidth:0}}><div style={{color:TH.text,fontSize:12,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it?.name}</div><div style={{color:TH.textMuted,fontSize:10,marginTop:2}}>{c.date} \u00b7 {c.location}</div></div>
                    <div style={{flexShrink:0}}><span style={{background:"rgba(245,158,11,.15)",color:"#f59e0b",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700}}>\u2197 {c.qty} {it?.unit}</span></div>
                  </div>
                );})}
              </div>
            </div>
          </>}

          {tab==="itemsMgmt"&&isAdmin&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div><h1 style={h1Style}>{t.itemsMgmt}</h1><div style={subStyle}>{lang==="fa"?"\u0645\u062f\u06cc\u0631\u06cc\u062a \u06a9\u0627\u0644\u0627\u0647\u0627\u06cc \u0627\u0646\u0628\u0627\u0631 \u0628\u0627 \u062a\u0635\u0648\u06cc\u0631 \u0648 \u062a\u0646\u0638\u06cc\u0645\u0627\u062a":"Manage items with images and settings."}</div></div>
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
                    {item.supplier&&<div style={{color:TH.textMuted,fontSize:11,marginBottom:10}}>\ud83c\udfed {item.supplier}</div>}
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>openM("item",{...item})} style={{...eBtn,flex:1,textAlign:"center"}}>{t.edit}</button>
                      <button onClick={()=>deleteItem(item.id)} style={dBtn}>{t.del}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>}

          {tab==="inventory"&&isAdmin&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div><h1 style={h1Style}>{t.inventory}</h1><div style={subStyle}>{lang==="fa"?"\u0645\u0648\u062c\u0648\u062f\u06cc \u0645\u062d\u0627\u0633\u0628\u0647 \u0634\u062f\u0647 = \u062e\u0631\u06cc\u062f \u2212 \u0645\u0635\u0631\u0641 + \u0628\u0631\u06af\u0634\u062a\u06cc":"Computed: stock = purchased \u2212 consumed + returned."}</div></div>
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

          {tab==="purchases"&&isAdmin&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div><h1 style={h1Style}>{t.purchases}</h1><div style={subStyle}>{lang==="fa"?"\u062b\u0628\u062a \u0648 \u0645\u062f\u06cc\u0631\u06cc\u062a \u062e\u0631\u06cc\u062f\u0647\u0627":"Track and approve purchases."}</div></div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} style={{background:TH.bgInput,border:`1px solid ${TH.borderStrong}`,borderRadius:9,padding:"9px 14px",color:TH.text,fontSize:13,outline:"none",fontFamily:"inherit"}}>
                  <option value="All">{t.allDepts}</option>{DEPTS.map(d=><option key={d}>{d}</option>)}
                </select>
                <button onClick={()=>openM("purchase",{date:"",itemId:"",qty:"",unitPrice:"",supplier:"",invoice:"",orderNo:"",receivedDate:"",department:"",note:""})} style={addBtn}>{t.newPurchase}</button>
              </div>
            </div>
            <div style={{background:TH.accentBg,border:`1px solid ${TH.accentBorder}`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:TH.accentText}}>\u2139 {t.approvalNote}</div>
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
                    <td style={{...tdStyle,color:p.receivedDate?"#10b981":"#f59e0b",fontSize:11}}>{p.receivedDate||"\u2014"}</td>
                    <td style={tdStyle}><Badge label={sm?.[lang==="fa"?"fa":"en"]||p.status} color={sm?.color||"#8892b0"}/></td>
                    <td style={tdStyle}>{p.status==="pending"&&<><button onClick={()=>approvePurchase(p)} style={{...eBtn,color:"#10b981",borderColor:"#10b98166"}}>{t.approve}</button><button onClick={()=>rejectPurchase(p)} style={{...eBtn,color:"#ef4444",borderColor:"#ef444466"}}>{t.reject}</button></>}<button onClick={()=>openM("purchase",{...p})} style={eBtn}>{t.edit}</button><button onClick={()=>deletePurchase(p.id)} style={dBtn}>{t.del}</button></td>
                  </tr>
                );})}</tbody>
              </table>
            </div>
          </>}

          {tab==="consumption"&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div><h1 style={h1Style}>{t.consumption}</h1><div style={subStyle}>{lang==="fa"?"\u062b\u0628\u062a \u0645\u0635\u0631\u0641 \u06a9\u0627\u0644\u0627\u0647\u0627 \u0628\u0627 \u0645\u062d\u0644 \u062a\u062d\u0648\u06cc\u0644":"Track item consumption with delivery details."}</div></div>
              <div style={{display:"flex",gap:8}}>
                {isAdmin&&<input placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)} style={srchInput}/>}
                <button onClick={()=>openM("consumption",{date:"",itemId:"",qty:"",location:"",operator:user?.email||"",deliveredTo:"",deliveryPerson:"",note:""})} style={addBtn}>{t.logConsumption}</button>
              </div>
            </div>
            {!isAdmin&&<div style={{background:TH.accentBg,border:`1px solid ${TH.accentBorder}`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:TH.accentText}}>\u2139 {t.staffWelcome} \u2014 {user?.email}</div>}
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
                    <td style={{...tdStyle,color:TH.text}}>{c.deliveredTo||"\u2014"}</td>
                    <td style={{...tdStyle,color:TH.textMuted,fontSize:11}}>{c.deliveryPerson||"\u2014"}</td>
                    <td style={tdStyle}>{c.operator}</td>
                    <td style={{...tdStyle,color:TH.textMuted,fontSize:11}}>{c.note}</td>
                    <td style={tdStyle}>{isAdmin&&<><button onClick={()=>openM("consumption",{...c})} style={eBtn}>{t.edit}</button><button onClick={()=>deleteConsumption(c.id)} style={dBtn}>{t.del}</button></>}</td>
                  </tr>
                );})}</tbody>
              </table>
            </div>
          </>}

          {tab==="returns"&&isAdmin&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div><h1 style={h1Style}>{t.returns}</h1><div style={subStyle}>{lang==="fa"?"\u0628\u0631\u06af\u0634\u062a \u06a9\u0627\u0644\u0627 \u0628\u0647 \u0627\u0646\u0628\u0627\u0631\u060c \u0645\u0648\u062c\u0648\u062f\u06cc \u0631\u0627 \u0627\u0641\u0632\u0627\u06cc\u0634 \u0645\u06cc\u200c\u062f\u0647\u062f":"Returns increase warehouse stock."}</div></div>
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
                    <td style={tdStyle}>{r.reason||"\u2014"}</td>
                    <td style={tdStyle}><Badge label={r.fromLocation||"\u2014"} color="#22d3ee"/></td>
                    <td style={tdStyle}>{r.receivedBy||"\u2014"}</td>
                    <td style={{...tdStyle,color:TH.textMuted,fontSize:11}}>{r.note}</td>
                    <td style={tdStyle}><button onClick={()=>openM("return",{...r})} style={eBtn}>{t.edit}</button><button onClick={()=>deleteReturn(r.id)} style={dBtn}>{t.del}</button></td>
                  </tr>
                );})}</tbody>
              </table>
            </div>
          </>}

          {tab==="orders"&&isAdmin&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div><h1 style={h1Style}>{t.orders}</h1><div style={subStyle}>{lang==="fa"?"\u0633\u0641\u0627\u0631\u0634\u200c\u0647\u0627\u06cc \u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631":"Pending and confirmed orders."}</div></div>
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

          {tab==="caesarMap"&&isAdmin&&<>
            <div style={{marginBottom:16}}>
              <h1 style={h1Style}>{"\ud83d\uddfa "}{t.caesarMap}</h1>
              <div style={subStyle}>Interactive satellite maps with GPS coordinates for Caesar Projects resorts</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14,marginBottom:18}}>
              <a href="/caesar-resort-map.html" style={{...card,padding:0,overflow:"hidden",textDecoration:"none",cursor:"pointer",border:`1px solid ${TH.border}`,display:"block",transition:"transform .2s, border-color .2s"}}>
                <div style={{height:110,background:"linear-gradient(135deg,#7c5cff,#3ad0e7)",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:48,filter:"drop-shadow(0 4px 12px rgba(0,0,0,.3))"}}>{"\ud83c\udfd6\ufe0f"}</div>
                  <div style={{position:"absolute",top:9,right:11,background:"rgba(0,0,0,.4)",color:"#fff",padding:"2px 9px",borderRadius:99,fontSize:9.5,fontWeight:600,letterSpacing:0.05+"em"}}>SATELLITE</div>
                </div>
                <div style={{padding:15}}>
                  <div style={{color:TH.textHeading,fontSize:15.5,fontWeight:700,marginBottom:3}}>Caesar Resort</div>
                  <div style={{color:TH.textMuted,fontSize:11.5,marginBottom:11,display:"flex",alignItems:"center",gap:4}}>{"\ud83d\udccd"} İskele</div>
                  <div style={{display:"flex",gap:5,marginBottom:11}}>
                    <div style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:6,padding:"4px 8px",fontSize:10.5}}><b style={{color:TH.text}}>{mapCounts.iskele}</b> <span style={{color:TH.textMuted}}>items</span></div>
                  </div>
                  <div style={{background:"linear-gradient(135deg,#7c5cff,#5b3ee0)",borderRadius:8,padding:"8px 12px",color:"#fff",fontSize:12,fontWeight:700,textAlign:"center"}}>{"Open Map \u2192"}</div>
                </div>
              </a>
              <a href="/caesar-blue-map.html" style={{...card,padding:0,overflow:"hidden",textDecoration:"none",cursor:"pointer",border:`1px solid ${TH.border}`,display:"block",transition:"transform .2s, border-color .2s"}}>
                <div style={{height:110,background:"linear-gradient(135deg,#06b6d4,#0284c7)",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:48,filter:"drop-shadow(0 4px 12px rgba(0,0,0,.3))"}}>{"\ud83c\udf0a"}</div>
                  <div style={{position:"absolute",top:9,right:11,background:"rgba(0,0,0,.4)",color:"#fff",padding:"2px 9px",borderRadius:99,fontSize:9.5,fontWeight:600,letterSpacing:0.05+"em"}}>SATELLITE</div>
                </div>
                <div style={{padding:15}}>
                  <div style={{color:TH.textHeading,fontSize:15.5,fontWeight:700,marginBottom:3}}>Caesar Blue</div>
                  <div style={{color:TH.textMuted,fontSize:11.5,marginBottom:11,display:"flex",alignItems:"center",gap:4}}>{"\ud83d\udccd"} Boğaz</div>
                  <div style={{display:"flex",gap:5,marginBottom:11}}>
                    <div style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:6,padding:"4px 8px",fontSize:10.5}}><b style={{color:TH.text}}>{mapCounts.blue}</b> <span style={{color:TH.textMuted}}>items</span></div>
                  </div>
                  <div style={{background:"linear-gradient(135deg,#06b6d4,#0284c7)",borderRadius:8,padding:"8px 12px",color:"#fff",fontSize:12,fontWeight:700,textAlign:"center"}}>{"Open Map \u2192"}</div>
                </div>
              </a>
              <a href="/caesar-cliff-map.html" style={{...card,padding:0,overflow:"hidden",textDecoration:"none",cursor:"pointer",border:`1px solid ${TH.border}`,display:"block",transition:"transform .2s, border-color .2s"}}>
                <div style={{height:110,background:"linear-gradient(135deg,#16a34a,#15803d)",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:48,filter:"drop-shadow(0 4px 12px rgba(0,0,0,.3))"}}>{"\u26f0\ufe0f"}</div>
                  <div style={{position:"absolute",top:9,right:11,background:"rgba(0,0,0,.4)",color:"#fff",padding:"2px 9px",borderRadius:99,fontSize:9.5,fontWeight:600,letterSpacing:0.05+"em"}}>SATELLITE</div>
                </div>
                <div style={{padding:15}}>
                  <div style={{color:TH.textHeading,fontSize:15.5,fontWeight:700,marginBottom:3}}>Caesar Cliff</div>
                  <div style={{color:TH.textMuted,fontSize:11.5,marginBottom:11,display:"flex",alignItems:"center",gap:4}}>{"\ud83d\udccd"} Esentepe</div>
                  <div style={{display:"flex",gap:5,marginBottom:11}}>
                    <div style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:6,padding:"4px 8px",fontSize:10.5}}><b style={{color:TH.text}}>{mapCounts.cliff}</b> <span style={{color:TH.textMuted}}>items</span></div>
                  </div>
                  <div style={{background:"linear-gradient(135deg,#16a34a,#15803d)",borderRadius:8,padding:"8px 12px",color:"#fff",fontSize:12,fontWeight:700,textAlign:"center"}}>{"Open Map \u2192"}</div>
                </div>
              </a>
              <a href="/caesar-breeze-map.html" style={{...card,padding:0,overflow:"hidden",textDecoration:"none",cursor:"pointer",border:`1px solid ${TH.border}`,display:"block",transition:"transform .2s, border-color .2s"}}>
                <div style={{height:110,background:"linear-gradient(135deg,#f59e0b,#d97706)",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:48,filter:"drop-shadow(0 4px 12px rgba(0,0,0,.3))"}}>{"\ud83c\udf05"}</div>
                  <div style={{position:"absolute",top:9,right:11,background:"rgba(0,0,0,.4)",color:"#fff",padding:"2px 9px",borderRadius:99,fontSize:9.5,fontWeight:600,letterSpacing:0.05+"em"}}>SATELLITE</div>
                </div>
                <div style={{padding:15}}>
                  <div style={{color:TH.textHeading,fontSize:15.5,fontWeight:700,marginBottom:3}}>Caesar Breeze</div>
                  <div style={{color:TH.textMuted,fontSize:11.5,marginBottom:11,display:"flex",alignItems:"center",gap:4}}>{"\ud83d\udccd"} Northern Cyprus</div>
                  <div style={{display:"flex",gap:5,marginBottom:11}}>
                    <div style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:6,padding:"4px 8px",fontSize:10.5}}><b style={{color:TH.text}}>{mapCounts.breeze}</b> <span style={{color:TH.textMuted}}>items</span></div>
                  </div>
                  <div style={{background:"linear-gradient(135deg,#f59e0b,#d97706)",borderRadius:8,padding:"8px 12px",color:"#fff",fontSize:12,fontWeight:700,textAlign:"center"}}>{"Open Map \u2192"}</div>
                </div>
              </a>
              <a href="/caesar-bay-map.html" style={{...card,padding:0,overflow:"hidden",textDecoration:"none",cursor:"pointer",border:`1px solid ${TH.border}`,display:"block",transition:"transform .2s, border-color .2s"}}>
                <div style={{height:110,background:"linear-gradient(135deg,#ec4899,#db2777)",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:48,filter:"drop-shadow(0 4px 12px rgba(0,0,0,.3))"}}>{"\ud83c\udfdd\ufe0f"}</div>
                  <div style={{position:"absolute",top:9,right:11,background:"rgba(0,0,0,.4)",color:"#fff",padding:"2px 9px",borderRadius:99,fontSize:9.5,fontWeight:600,letterSpacing:0.05+"em"}}>SATELLITE</div>
                </div>
                <div style={{padding:15}}>
                  <div style={{color:TH.textHeading,fontSize:15.5,fontWeight:700,marginBottom:3}}>Caesar Bay Apartments</div>
                  <div style={{color:TH.textMuted,fontSize:11.5,marginBottom:11,display:"flex",alignItems:"center",gap:4}}>{"\ud83d\udccd"} Northern Cyprus</div>
                  <div style={{display:"flex",gap:5,marginBottom:11}}>
                    <div style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:6,padding:"4px 8px",fontSize:10.5}}><b style={{color:TH.text}}>{mapCounts.bay}</b> <span style={{color:TH.textMuted}}>items</span></div>
                  </div>
                  <div style={{background:"linear-gradient(135deg,#ec4899,#db2777)",borderRadius:8,padding:"8px 12px",color:"#fff",fontSize:12,fontWeight:700,textAlign:"center"}}>{"Open Map \u2192"}</div>
                </div>
              </a>
              <a href="/caesar-beach-map.html" style={{...card,padding:0,overflow:"hidden",textDecoration:"none",cursor:"pointer",border:`1px solid ${TH.border}`,display:"block",transition:"transform .2s, border-color .2s"}}>
                <div style={{height:110,background:"linear-gradient(135deg,#fbbf24,#f59e0b)",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:48,filter:"drop-shadow(0 4px 12px rgba(0,0,0,.3))"}}>{"\ud83c\udfd6\ufe0f"}</div>
                  <div style={{position:"absolute",top:9,right:11,background:"rgba(0,0,0,.4)",color:"#fff",padding:"2px 9px",borderRadius:99,fontSize:9.5,fontWeight:600,letterSpacing:0.05+"em"}}>SATELLITE</div>
                </div>
                <div style={{padding:15}}>
                  <div style={{color:TH.textHeading,fontSize:15.5,fontWeight:700,marginBottom:3}}>Caesar Beach</div>
                  <div style={{color:TH.textMuted,fontSize:11.5,marginBottom:11,display:"flex",alignItems:"center",gap:4}}>{"\ud83d\udccd"} Boğaz</div>
                  <div style={{display:"flex",gap:5,marginBottom:11}}>
                    <div style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:6,padding:"4px 8px",fontSize:10.5}}><b style={{color:TH.text}}>{mapCounts.beach}</b> <span style={{color:TH.textMuted}}>items</span></div>
                  </div>
                  <div style={{background:"linear-gradient(135deg,#fbbf24,#f59e0b)",borderRadius:8,padding:"8px 12px",color:"#fff",fontSize:12,fontWeight:700,textAlign:"center"}}>{"Open Map \u2192"}</div>
                </div>
              </a>
            </div>
            <div style={{...card,padding:18}}>
              <div style={{color:TH.textMuted,fontSize:12,marginBottom:12,fontWeight:600,textTransform:"uppercase",letterSpacing:0.06+"em"}}>Map categories</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:8}}>
                {[
                  {l:"Pool",c:"#0891b2"},
                  {l:"Building",c:"#7c5cff"},
                  {l:"F&B",c:"#dc2626"},
                  {l:"Office",c:"#374151"},
                  {l:"Facility",c:"#16a34a"},
                  {l:"Gate",c:"#ea580c"},
                  {l:"Bridge",c:"#92400e"},
                  {l:"Parking",c:"#1e3a8a"},
                ].map(x=>(
                  <div key={x.l} style={{display:"flex",alignItems:"center",gap:7,background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:8,padding:"7px 11px",fontSize:11.5}}>
                    <div style={{width:9,height:9,borderRadius:"50%",background:x.c}}/>
                    <span style={{color:TH.text,fontWeight:600}}>{x.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </>}

          {tab==="syncMaps"&&isAdmin&&<SyncMapsPanel TH={TH} isMobile={isMobile} />}

          {POOLS_ENABLED&&tab==="pools"&&<PoolsHub TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}

          {PROCURE_ENABLED&&tab==="procure"&&<ProcureHub TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />}

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

          {tab==="suppliers"&&isAdmin&&<>
            <div style={{marginBottom:20}}><h1 style={h1Style}>{t.suppliers}</h1><div style={subStyle}>{lang==="fa"?"\u062a\u0623\u0645\u06cc\u0646\u200c\u06a9\u0646\u0646\u062f\u06af\u0627\u0646 \u0648 \u0622\u0645\u0627\u0631 \u062e\u0631\u06cc\u062f":"Vendor analytics."}</div></div>
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

          {tab==="activityLog"&&isAdmin&&<>
            <div style={{marginBottom:20}}><h1 style={h1Style}>{t.activityLog}</h1><div style={subStyle}>{lang==="fa"?"\u062a\u0627\u0631\u06cc\u062e\u0686\u0647 \u06a9\u0627\u0645\u0644 \u0639\u0645\u0644\u06cc\u0627\u062a \u0628\u0627 \u06a9\u0627\u0631\u0628\u0631 \u0648 \u0632\u0645\u0627\u0646":"Complete audit trail."}</div></div>
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

          {!isAdmin&&tab!=="consumption"&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"50vh",flexDirection:"column",gap:12}}><div style={{fontSize:48,color:TH.textDim}}>\ud83d\udd12</div><div style={{color:TH.textMuted,fontSize:16}}>{t.noAccess}</div></div>}
        </main>
      </div>

      <Modal open={!!selectedPin} title={selectedPin?.name||""} onClose={()=>setSelectedPin(null)} theme={TH}>
        {selectedPin && (
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{width:40,height:40,borderRadius:10,background:getCategoryColor(selectedPin.category)+"22",color:getCategoryColor(selectedPin.category),fontSize:14,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${getCategoryColor(selectedPin.category)}55`}}>{selectedPin.id}</div>
              <div>
                <div style={{color:TH.text,fontSize:15,fontWeight:700}}>{selectedPin.name}</div>
                <div style={{color:TH.textMuted,fontSize:11}}>{selectedPin.category}{selectedPin.subcategory?" \u00b7 "+selectedPin.subcategory:""}</div>
              </div>
            </div>
            {selectedPin.description && (
              <div style={{background:TH.bgInput,border:`1px solid ${TH.border}`,borderRadius:10,padding:"12px 14px",marginBottom:12,fontSize:13,color:TH.text,lineHeight:1.5}}>
                {selectedPin.description}
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {selectedPin.area && (<div style={{background:TH.bgInput,borderRadius:9,padding:"10px 12px",border:`1px solid ${TH.border}`}}><div style={{color:TH.textMuted,fontSize:10,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.05em"}}>Area</div><div style={{color:TH.text,fontSize:13,fontWeight:600}}>{selectedPin.area}</div></div>)}
              {selectedPin.subcategory && (<div style={{background:TH.bgInput,borderRadius:9,padding:"10px 12px",border:`1px solid ${TH.border}`}}><div style={{color:TH.textMuted,fontSize:10,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.05em"}}>Subcategory</div><div style={{color:TH.text,fontSize:13,fontWeight:600}}>{selectedPin.subcategory}</div></div>)}
              {(selectedPin.map_x !== null && selectedPin.map_x !== undefined) && (<div style={{background:TH.bgInput,borderRadius:9,padding:"10px 12px",border:`1px solid ${TH.border}`}}><div style={{color:TH.textMuted,fontSize:10,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.05em"}}>Map Position</div><div style={{color:TH.text,fontSize:12,fontWeight:600,fontFamily:"ui-monospace,monospace"}}>{selectedPin.map_x}%, {selectedPin.map_y}%</div></div>)}
              {(selectedPin.lat !== null && selectedPin.lat !== undefined) && (<div style={{background:TH.bgInput,borderRadius:9,padding:"10px 12px",border:`1px solid ${TH.border}`}}><div style={{color:TH.textMuted,fontSize:10,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.05em"}}>GPS</div><div style={{color:TH.text,fontSize:12,fontWeight:600,fontFamily:"ui-monospace,monospace"}}>{selectedPin.lat}, {selectedPin.lng}</div></div>)}
            </div>
          </div>
        )}
      </Modal>

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
              <button onClick={()=>imgRef.current?.click()} style={{width:"100%",background:TH.bgInput,border:`1px dashed ${TH.borderStrong}`,borderRadius:9,color:TH.textMuted,padding:"11px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>\ud83d\udcf7 {imgPreview?"Change Image":"Upload Image (max 2MB)"}</button>
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
        {!isAdmin&&<div style={{color:"#f59e0b",fontSize:12,marginBottom:10,padding:"9px 12px",background:"rgba(245,158,11,.1)",borderRadius:8,border:"1px solid rgba(245,158,11,.3)"}}>\u23f3 {t.approvalNote}</div>}
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
        <div style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.3)",borderRadius:9,padding:"9px 12px",marginBottom:14,fontSize:12,color:"#10b981"}}>\u21a9 {lang==="fa"?"\u0627\u06cc\u0646 \u06a9\u0627\u0644\u0627 \u0628\u0647 \u0645\u0648\u062c\u0648\u062f\u06cc \u0627\u0646\u0628\u0627\u0631 \u0627\u0636\u0627\u0641\u0647 \u0645\u06cc\u200c\u0634\u0648\u062f":"This will add back to warehouse stock"}</div>
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

// ═══════════════════════════════════════════
// SyncMapsPanel — admin only
// ═══════════════════════════════════════════
const SYNC_PROPERTIES = [
  {lsKey:"caesar_resort_map", slug:"iskele", name:"Caesar Resort", icon:"🏖️", color:"#7c5cff"},
  {lsKey:"caesar_blue_map",   slug:"blue",   name:"Caesar Blue",   icon:"🌊", color:"#06b6d4"},
  {lsKey:"caesar_cliff_map",  slug:"cliff",  name:"Caesar Cliff",  icon:"⛰️", color:"#16a34a"},
  {lsKey:"caesar_beach_map",  slug:"beach",  name:"Caesar Beach",  icon:"🏖️", color:"#f59e0b"},
];

function SyncMapsPanel({TH, isMobile}) {
  const [logs,     setLogs]     = useState([{type:"info", msg:"آماده. منبع داده را انتخاب کن و Sync بزن."}]);
  const [statuses, setStatuses] = useState({});
  const [counts,   setCounts]   = useState({});
  const [syncing,  setSyncing]  = useState(false);
  const [mode,     setMode]     = useState("upsert");
  const [source,   setSource]   = useState("file");
  const [fileData, setFileData] = useState(null);
  const [progress, setProgress] = useState({done:0, total:0});
  const logRef = useRef(null);

  function addLog(msg, type="info") {
    setLogs(l => [...l, {type, msg, time: new Date().toLocaleTimeString("en-GB")}]);
    setTimeout(() => { if(logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 50);
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const raw = JSON.parse(ev.target.result);
        const maps = raw.maps || raw;
        const parsed = {};
        let total = 0;
        for(const p of SYNC_PROPERTIES) {
          const d = maps[p.lsKey];
          if(d?.items?.length) {
            parsed[p.lsKey] = d.items;
            total += d.items.length;
            addLog(`${p.icon} ${p.name}: ${d.items.length} آیتم`, "ok");
          }
        }
        setFileData(parsed);
        addLog(`✅ فایل بارگذاری شد — ${total} آیتم`, "ok");
      } catch(err) {
        addLog("خطا در parse: " + err.message, "err");
      }
    };
    reader.readAsText(file);
  }

  function readBrowser() {
    const data = {};
    let total = 0;
    for(const p of SYNC_PROPERTIES) {
      try {
        const raw = localStorage.getItem(p.lsKey);
        if(raw) {
          const parsed = JSON.parse(raw);
          if(parsed?.items?.length) {
            data[p.lsKey] = parsed.items;
            total += parsed.items.length;
            addLog(`${p.icon} ${p.name}: ${parsed.items.length} آیتم از localStorage`, "ok");
          } else {
            addLog(`${p.name}: localStorage خالی`, "warn");
          }
        } else {
          addLog(`${p.name}: پیدا نشد (key: ${p.lsKey})`, "warn");
        }
      } catch(err) {
        addLog(`${p.name} خطا: ${err.message}`, "err");
      }
    }
    addLog(`مجموع: ${total} آیتم`, "info");
    return data;
  }

  function toRow(item, slug) {
    return {
      name:          item.name || "Unnamed",
      category:      item.category || "facility",
      property_slug: slug,
      on_map:        item.placed === true,
      lat:           item.lat ?? null,
      lng:           item.lng ?? null,
      map_x:         item.x   ?? null,
      map_y:         item.y   ?? null,
      notes:         item.id  ?? null,
      is_active:     true,
      updated_at:    new Date().toISOString(),
    };
  }

  async function startSync() {
    setSyncing(true);
    setLogs([]);
    setStatuses({});
    setProgress({done:0, total:0});

    const data = source === "browser" ? readBrowser() : (fileData || {});
    const allItems = Object.values(data).reduce((a,v) => a + v.length, 0);

    if(allItems === 0) {
      addLog("❌ هیچ داده‌ای پیدا نشد.", "err");
      setSyncing(false);
      return;
    }

    addLog(`━━━ شروع sync (${mode.toUpperCase()}) — ${allItems} آیتم ━━━`, "info");
    let done = 0, succTotal = 0, errTotal = 0;

    for(const p of SYNC_PROPERTIES) {
      const items = data[p.lsKey];
      if(!items?.length) continue;

      setStatuses(s => ({...s, [p.slug]: "syncing"}));
      addLog(`▸ ${p.icon} ${p.name} — ${items.length} items`, "info");

      if(mode === "replace") {
        addLog(`  حذف رکوردهای قدیمی ${p.slug}…`, "warn");
        const {error: delErr} = await supabase.from("resort_locations").delete().eq("property_slug", p.slug);
        if(delErr) {
          addLog(`  ❌ خطا در حذف: ${delErr.message}`, "err");
          setStatuses(s => ({...s, [p.slug]: "error"}));
          continue;
        }
        addLog(`  ✓ حذف شد`, "ok");
      }

      const CHUNK = 50;
      let propOk = 0, propErr = 0;

      for(let i = 0; i < items.length; i += CHUNK) {
        const chunk = items.slice(i, i + CHUNK);
        const rows  = chunk.map(it => toRow(it, p.slug));

        const {error} = await supabase
          .from("resort_locations")
          .upsert(rows, {onConflict: "name,property_slug", ignoreDuplicates: false});

        if(!error) {
          propOk    += chunk.length;
          succTotal += chunk.length;
        } else {
          addLog(`  ⚠️ batch خطا: ${error.message.slice(0,80)}`, "warn");
          for(const row of rows) {
            const {error: e2} = await supabase.from("resort_locations").upsert([row], {onConflict:"name,property_slug"});
            if(!e2) { propOk++; succTotal++; }
            else    { propErr++; errTotal++; addLog(`  ✗ ${row.name}: ${e2.message.slice(0,60)}`, "err"); }
            done++;
            setProgress({done, total: allItems});
          }
          continue;
        }

        done += chunk.length;
        setProgress({done, total: allItems});
        setCounts(c => ({...c, [p.slug]: propOk}));
      }

      setCounts(c => ({...c, [p.slug]: propOk}));
      if(propErr === 0) {
        setStatuses(s => ({...s, [p.slug]: "ok"}));
        addLog(`  ✅ ${p.name}: ${propOk} آیتم sync شد`, "ok");
      } else {
        setStatuses(s => ({...s, [p.slug]: "error"}));
        addLog(`  ⚠️ ${p.name}: ${propOk} موفق، ${propErr} خطا`, "warn");
      }
    }

    addLog(`━━━ پایان — ✅ ${succTotal} موفق  ❌ ${errTotal} خطا ━━━`, errTotal > 0 ? "warn" : "ok");
    setSyncing(false);
  }

  const pct = progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0;

  const ST = {
    idle:    {bg:"rgba(100,116,139,.1)", border:"rgba(100,116,139,.2)", color:"#64748b", label:"Waiting"},
    syncing: {bg:"rgba(59,130,246,.1)",  border:"rgba(59,130,246,.3)",  color:"#60a5fa", label:"Syncing…"},
    ok:      {bg:"rgba(34,197,94,.1)",   border:"rgba(34,197,94,.3)",   color:"#22c55e", label:"Synced ✓"},
    error:   {bg:"rgba(239,68,68,.1)",   border:"rgba(239,68,68,.3)",   color:"#f87171", label:"Error ✗"},
  };

  const card = {background:TH.bgCard, border:`1px solid ${TH.border}`, borderRadius:14, padding:18, marginBottom:16};
  const label = {color:TH.textMuted, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12, display:"block"};
  const btnBase = {border:"none", borderRadius:9, padding:"10px 16px", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer"};

  return (
    <>
      <div style={{marginBottom:20}}>
        <h1 style={{color:TH.textHeading, fontSize:22, fontWeight:800, letterSpacing:"-0.03em", margin:0}}>⇅ Sync Maps → Supabase</h1>
        <div style={{color:TH.textMuted, fontSize:13, marginTop:4}}>داده‌های نقشه را از backup JSON به Supabase منتقل کن. هر بار safe برای re-run.</div>
      </div>

      {/* Properties */}
      <div style={card}>
        <span style={label}>⬡ Properties</span>
        {SYNC_PROPERTIES.map(p => {
          const st = ST[statuses[p.slug] || "idle"];
          const cnt = counts[p.slug];
          return (
            <div key={p.slug} style={{display:"flex", alignItems:"center", gap:12, padding:"11px 14px", background:TH.bgInput, border:`1px solid ${TH.border}`, borderRadius:10, marginBottom:8}}>
              <div style={{width:34, height:34, borderRadius:9, background:p.color+"22", border:`1px solid ${p.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0}}>{p.icon}</div>
              <div style={{flex:1}}>
                <div style={{color:TH.textHeading, fontSize:13, fontWeight:700}}>{p.name}</div>
                <div style={{color:TH.textMuted, fontSize:11, fontFamily:"monospace", marginTop:1}}>{p.lsKey} → <b style={{color:"#3dd6f5"}}>{p.slug}</b></div>
              </div>
              <div style={{padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700, background:st.bg, border:`1px solid ${st.border}`, color:st.color, whiteSpace:"nowrap"}}>
                {cnt != null && statuses[p.slug] === "ok" ? `✓ ${cnt} items` : st.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Source */}
      <div style={card}>
        <span style={label}>⬡ منبع داده</span>
        <div style={{display:"flex", gap:8, marginBottom:14}}>
          {[{v:"file",l:"📄 فایل Backup JSON"},{v:"browser",l:"🌐 این Browser"}].map(({v,l}) => (
            <button key={v} onClick={() => setSource(v)} style={{...btnBase, flex:1, background:source===v?"rgba(61,214,245,.1)":TH.bgInput, border:`1px solid ${source===v?"#3dd6f5":TH.border}`, color:source===v?"#3dd6f5":TH.textMuted}}>
              {l}
            </button>
          ))}
        </div>
        {source === "file" && (
          <label style={{display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"22px", border:`2px dashed ${TH.border}`, borderRadius:12, cursor:"pointer"}}>
            <input type="file" accept=".json" onChange={handleFile} style={{display:"none"}} />
            <div style={{fontSize:28}}>📦</div>
            <div style={{color:TH.textMuted, fontSize:13, textAlign:"center"}}>
              {fileData
                ? <span style={{color:"#22c55e", fontWeight:700}}>✓ {Object.values(fileData).reduce((a,v)=>a+v.length,0)} آیتم بارگذاری شد</span>
                : <span>فایل <b style={{color:"#3dd6f5"}}>caesar_maps_backup_*.json</b> را اینجا بگذار</span>
              }
            </div>
          </label>
        )}
        {source === "browser" && (
          <div style={{background:"rgba(245,200,66,.06)", border:"1px solid rgba(245,200,66,.2)", borderRadius:9, padding:"12px 14px", color:"#d4a91e", fontSize:12, lineHeight:1.7}}>
            ⚠️ فقط در همان browser که داده‌ها داری کار می‌کنه.
          </div>
        )}
      </div>

      {/* Mode + Sync */}
      <div style={card}>
        <span style={label}>⬡ حالت sync</span>
        <div style={{display:"flex", gap:8, marginBottom:16}}>
          {[
            {v:"upsert",  l:"Upsert (توصیه شده)", d:"آیتم‌های موجود آپدیت، جدید اضافه — بی‌خطر برای re-run"},
            {v:"replace", l:"Replace (پاک + بازنویسی)", d:"ابتدا DELETE، سپس INSERT — clean slate"},
          ].map(({v,l,d}) => (
            <label key={v} style={{flex:1, display:"flex", gap:10, padding:"12px", background:mode===v?"rgba(61,214,245,.06)":TH.bgInput, border:`1px solid ${mode===v?"#3dd6f5":TH.border}`, borderRadius:10, cursor:"pointer"}}>
              <input type="radio" name="syncmode" checked={mode===v} onChange={() => setMode(v)} style={{accentColor:"#3dd6f5", marginTop:2}} />
              <div>
                <div style={{color:TH.text, fontWeight:700, fontSize:13}}>{l}</div>
                <div style={{color:TH.textMuted, fontSize:11, marginTop:2, lineHeight:1.5}}>{d}</div>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={startSync}
          disabled={syncing || (source==="file" && !fileData)}
          style={{...btnBase, width:"100%", fontSize:14, padding:"13px", background:syncing?"rgba(100,116,139,.2)":"linear-gradient(135deg,#7c5cff,#3dd6f5)", color:"#fff", opacity:(syncing||(source==="file"&&!fileData))?0.5:1, boxShadow:syncing?"none":"0 4px 18px rgba(124,92,255,.3)"}}>
          {syncing ? `⏳ در حال sync… (${pct}%)` : "🚀 شروع Sync به Supabase"}
        </button>

        {syncing && (
          <div style={{marginTop:14}}>
            <div style={{display:"flex", justifyContent:"space-between", color:TH.textMuted, fontSize:11, marginBottom:5}}>
              <span>{progress.done} / {progress.total}</span><span>{pct}%</span>
            </div>
            <div style={{height:5, background:TH.bgInput, borderRadius:99, overflow:"hidden"}}>
              <div style={{height:"100%", background:"linear-gradient(90deg,#7c5cff,#3dd6f5)", width:pct+"%", transition:"width .3s", borderRadius:99}} />
            </div>
          </div>
        )}
      </div>

      {/* Log */}
      <div style={{...card, padding:0, overflow:"hidden"}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px", borderBottom:`1px solid ${TH.border}`}}>
          <span style={{color:TH.textMuted, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em"}}>⬡ Log</span>
          <button onClick={() => setLogs([])} style={{...btnBase, padding:"4px 10px", fontSize:11, background:TH.bgInput, border:`1px solid ${TH.border}`, color:TH.textMuted}}>پاک</button>
        </div>
        <div ref={logRef} style={{fontFamily:"monospace", fontSize:11.5, lineHeight:1.9, maxHeight:260, overflowY:"auto", padding:"14px 18px", background:"#060a10"}}>
          {logs.map((l,i) => (
            <div key={i} style={{display:"flex", gap:10}}>
              <span style={{color:"#475569", flexShrink:0}}>{l.time||"--"}</span>
              <span style={{color:l.type==="ok"?"#22c55e":l.type==="err"?"#f87171":l.type==="warn"?"#f97316":"#3dd6f5"}}>{l.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
