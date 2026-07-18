# Pool Control — Integration Steps

## 1. Extract zip roo project

Package-e Pool Control shamele:
- `sql/pool_control_schema.sql` — schema + seed
- `src/pools/PoolControlHub.jsx`
- `src/pools/lib/poolUtils.js`
- `src/pools/tabs/PoolsListTab.jsx`
- `src/pools/tabs/LogTreatmentTab.jsx`
- `src/pools/tabs/TreatmentHistoryTab.jsx`
- `src/pools/tabs/ChemicalStockTab.jsx`

Extract kon roo `C:\Users\MSI\inventory-app\` (folder-e `src/pools/` va `sql/pool_control_schema.sql` ezafe mishe).

## 2. SQL migration bezan

Supabase → SQL Editor → paste `sql/pool_control_schema.sql` → Run.

In migration:
- `pools` table + 22 pool-e Caesar Resort seed mikone
- `pool_chemicals` + 7 madde-e standard seed mikone
- `pool_treatments` + `pool_treatment_lines`
- Trigger `pool_line_deducts_stock` — vaghti mavad tooye treatment sabt mishe, khodkar `consumable_movements` mizane (masraf az anbar kam mishe)
- Trigger `pool_treatment_recalc_total` — hazine kol khodkar rollup mishe

**Volume-haye pool-a:** Fe'lan random seed shode (800/350/180/45 m³). Rasti bego, be jaye seed real Excel bedam baraye 22 pool-e Caesar Resort.

## 3. Chemical-a be item-e anbar link kon

Baraye inke auto-deduct kar kone, har madde bayad be ye `items` row link beshe.

Do rah:
- **A) Tooye UI:** Ba `Chemical Stock` tab → click "✏️ Edit" har chemical → "Linked warehouse item" entekhab kon → Save
- **B) Tooye SQL:** 
```sql
-- Fe'lan item ha ro bebin
SELECT id, code, name FROM public.items WHERE name ILIKE '%chlorine%' OR name ILIKE '%chemical%';

-- Bad link kon
UPDATE public.pool_chemicals SET item_id = 42 WHERE code = 'CHL-GRAN';
-- ... barae har 7 chemical
```

Age item-e chemical tooye anbar nadari, aval besaz tooye Warehouse → Consumables → New item ba unit `g`/`ml`, bad link kon.

## 4. Wire kardan tooye `src/inventory-system.jsx`

### 4.1 Import add kon (bala-ye file, kenar-e import-haye digar):
```jsx
import PoolControlHub from "./pools/PoolControlHub";
```

### 4.2 Feature flag paain-tar:
```jsx
const POOLS_ENABLED = true;  // taghyir bede az false be true
```

### 4.3 NAV_GROUPS — pool entry ezafe kon (age nist):
```jsx
const NAV_GROUPS = [
  { key: "overview", items: ["dashboard"] },
  { key: "warehouse", items: ["warehouse"] },
  { key: "poolControl", items: ["pools"] },   // ← in ro ezafe kon
  { key: "inspections", items: ["inspection"] },
  { key: "procurement", items: ["procure"] },
  { key: "admin", items: ["users"] },
];
```

### 4.4 Tab icons + translations:
```jsx
const TAB_ICONS = {
  ...
  pools: "🏊",  // ← ezafe kon
};
```

Tooye `src/i18n.js`, be har 3 locale ezafe kon:
```jsx
// EN
poolControl: "Pool Control", pools: "Pool Control",
// HE
poolControl: "בקרת בריכות", pools: "בקרת בריכות",
// FA
poolControl: "کنترل استخر", pools: "کنترل استخر",
```

### 4.5 allTabs — 'pools' ezafe kon dar jayi ke ba `POOLS_ENABLED` shart-e mizanan:
```jsx
const allTabs = [
  "dashboard",
  ...(WAREHOUSE_ENABLED ? ["warehouse"] : []),
  ...(POOLS_ENABLED ? ["pools"] : []),
  ...(INSPECTION_ENABLED ? ["inspection"] : []),
  ...(PROCURE_ENABLED ? ["procure"] : []),
  ...(canSeeUsers ? ["users"] : []),
];
```

### 4.6 Render switch — Pool Control render kon:
```jsx
{tab === "pools" && canSeePools && (
  <PoolControlHub TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} />
)}
```

### 4.7 RBAC — canSeePools:
```jsx
const canSeePools = isOwner || roles.includes('pool_operator') || isAdmin;
```

Age hanooz `pool_operator` role nadari, faghat isAdmin bezar.

## 5. Push
```powershell
cd C:\Users\MSI\inventory-app
git add sql/pool_control_schema.sql src/pools/ src/inventory-system.jsx src/i18n.js
git commit -m "feat: Pool Control module - profiles, dosage calc, warehouse-integrated treatment logs"
git push
```

## Chegoone kar mikone

### 🏊 **Pools** tab
- Grid-e 22 estakhr — har karte ba icon, volume, property
- Click → **Pool Profile** ba jadval-e dosage-e tosie shode (7 chemical × volume-e estakhr):
  - Chlorine granules: 8000 g (baraye 800 m³)
  - pH minus: 12000 g
  - Algaecide: 2400 ml
  - ... va hazine-ye kol (€) khodkar hesab mishe

### 💧 **Log Treatment** tab (mobile-first)
Marahel:
1. Pool entekhab kon → volume + tosie khodkar
2. Operator name (khodkar az user)
3. Anbar entekhab kon ke mavado az kojaesh mikashi biroon
4. Water readings: pH before/after, chlorine ppm, temp, clarity (rangi bar asas-e ideal range)
5. Chemical-a: har chemical-o click koni entekhab mishe + dose-e tosie khodkar por mishe (ghabl edit)
6. Aks-e **majbouri** (evidence)
7. Save

**Vaghti Save mizani:**
- `pool_treatments` row sakhte mishe ba treatment_no (`PT-2026-00001`)
- Har chemical → `pool_treatment_lines` row
- **Trigger khodkar `consumable_movements` mizane ba qty manfi** → stock az anbar kam mishe
- `total_cost` khodkar rollup mishe

### 📋 **History** tab
- Filter be pool va bazye zamani (7d/30d/90d/all)
- Kart-e har treatment: pool, operator, tarikh, hazine, aks kover
- Click → detail: photos + jadval-e chemicals + emkane hazf (admin)
- Summary: total treatments, total cost, avg

### 🧪 **Chemicals** tab
- Har chemical ba icon-e purpose (sanitizer/pH+/pH-/algaecide/...)
- Facts: dose per m³, cost, usage this month, cost this month, total stock
- Jadval-e per-warehouse stock: kodoom anbar cheghadr dare + status (OK/LOW/OUT)
- Admin: click Edit → dose, cost, min stock, warehouse item link ro taghyir bede

## Nokte-ye mohem: Chemical → Item linking

Age chemical be item-e anbar link nabashe:
- Treatment sabt mishe VALI stock kam nemishe
- Tooye Chemicals tab warning "⚠ Not linked to any warehouse item"

Baraye linking:
1. Aval tooye Warehouse → Consumables item besaz (mesalan "Chlorine granules 65%", unit `g`)
2. Bad tooye Pool Control → Chemicals → Edit → item entekhab kon

Ya SQL:
```sql
INSERT INTO public.items (code, name, unit, category) VALUES
  ('POOL-CHL-GRAN', 'Chlorine granules 65%', 'g', 'chemical'),
  ('POOL-CHL-TAB',  'Chlorine tablets',      'tab', 'chemical'),
  ('POOL-PH-DOWN',  'pH minus',              'g', 'chemical'),
  ('POOL-PH-UP',    'pH plus',               'g', 'chemical'),
  ('POOL-ALG',      'Algaecide',             'ml', 'chemical'),
  ('POOL-FLOC',     'Flocculant',            'ml', 'chemical'),
  ('POOL-STAB',     'Stabilizer',            'g', 'chemical');

-- Bad link:
UPDATE public.pool_chemicals SET item_id = (SELECT id FROM public.items WHERE code = 'POOL-CHL-GRAN') WHERE code = 'CHL-GRAN';
UPDATE public.pool_chemicals SET item_id = (SELECT id FROM public.items WHERE code = 'POOL-CHL-TAB') WHERE code = 'CHL-TAB';
UPDATE public.pool_chemicals SET item_id = (SELECT id FROM public.items WHERE code = 'POOL-PH-DOWN') WHERE code = 'PH-DOWN';
UPDATE public.pool_chemicals SET item_id = (SELECT id FROM public.items WHERE code = 'POOL-PH-UP') WHERE code = 'PH-UP';
UPDATE public.pool_chemicals SET item_id = (SELECT id FROM public.items WHERE code = 'POOL-ALG') WHERE code = 'ALG';
UPDATE public.pool_chemicals SET item_id = (SELECT id FROM public.items WHERE code = 'POOL-FLOC') WHERE code = 'FLOC';
UPDATE public.pool_chemicals SET item_id = (SELECT id FROM public.items WHERE code = 'POOL-STAB') WHERE code = 'STAB';
```

Bad ye ta stock aval add kon:
```sql
INSERT INTO public.consumable_movements (item_id, warehouse_id, qty, movement_type, notes)
SELECT (SELECT id FROM public.items WHERE code = 'POOL-CHL-GRAN'),
       (SELECT id FROM public.warehouses WHERE code = 'CR-WH1' LIMIT 1),
       50000, 'restock', 'Initial pool chemicals stock';
-- ... barae har chemical
```
