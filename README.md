# Pool Management — Phase 2

## SQL migration
Run `migration_pool_management.sql` first (already done in previous step).

## Files in this zip

**Updated:**
- `src/pools/PoolControlHub.jsx` — title "Pool Management", 6 tabs, New Operation button, 6 stats including filter-due-in-30-days

**New:**
- `src/pools/components/NewOperationModal.jsx` — operation form (4 types) with atomic auto-dispense
- `src/pools/components/PoolDetailModal.jsx` — 4 sub-tabs: Overview / Equipment / Operations / History
- `src/pools/tabs/OperationsTab.jsx` — all operations feed with filters
- `src/pools/tabs/OperatorsTab.jsx` — per-pool operator assignment

## ⚠ IMPORTANT: Wire up PoolsListTab

The existing `PoolsListTab` needs to open `PoolDetailModal` when a pool is clicked. The new `PoolControlHub` passes an `onOpenPool` prop.

In your existing `src/pools/tabs/PoolsListTab.jsx`, wherever a pool card is clicked, add:

```jsx
// In component signature:
export default function PoolsListTab({ TH, isMobile, isAdmin, onChanged, onOpenPool }) {
  // ...
}

// In the pool card click handler:
<div onClick={() => onOpenPool?.(pool.id)}>
  {/* card content */}
</div>
```

If you don't do this, the "Pool Detail" modal will only open via the New Operation button; users can still access all functionality via the Operations tab and Operators tab.

## Workflow

**Pool Operator (via mobile):**
1. Opens Pool Management
2. Clicks "⚙️ New Operation"
3. Selects pool → operation type (Cleaning / Dosing / Maintenance / Filter Change)
4. If Chemical Dosing: enters pH before/after, chlorine before/after
5. If Filter Change: enters new filter type/model, updates pool's filter_last_changed
6. Adds any chemicals used → picks warehouse (sorted by stock) → qty
7. Uploads photos
8. Saves → RPC does atomic transaction:
   - Creates `pool_operations` row
   - For each chemical: deducts from `consumable_stock` + `items.current_qty` + inserts `consumable_movements` (linked to pool + operation)
   - If filter_change: updates pool's `filter_type`, `filter_model`, `filter_last_changed`

**Admin:**
- Assigns operators via Operators tab
- Views operations feed with filters
- Opens pool detail → Equipment tab → uploads pump photos, sets filter type/dates

**Alerts:**
- Filter due ≤30 days: red stat on dashboard
- Historic usage: per-pool summary of chemicals used

## Deploy

```powershell
cd C:\Users\MSI\inventory-app
Expand-Archive "$env:USERPROFILE\Downloads\pool-management.zip" -DestinationPath . -Force
git add .
git commit -m "Pool Management: operations log, equipment, operators, per-pool history"
git push
```
