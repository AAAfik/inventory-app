# Smart Procurement System

## Files

**New module: `src/procurement/`**
- `ProcurementHub.jsx` — role-aware container
- `tabs/RequestsListTab.jsx` — filtered list (my / for-review / final / all)
- `tabs/RequestDetail.jsx` — full view + role-based actions
- `components/NewRequestModal.jsx` — supervisor creates request with items

## Sidebar integration

Az inja bayad `App.jsx` ya `inventory-system.jsx` ro modify koni ta modul-e Requests too sidebar zahar shavad. Ye chizi shabihe:

```jsx
import ProcurementHub from "./procurement/ProcurementHub";

// too render:
{ activeModule === "procurement" && <ProcurementHub TH={TH} lang={lang} isMobile={isMobile} isAdmin={isAdmin} /> }

// too sidebar:
<SidebarItem
  icon="📝"
  label="Requests"
  active={activeModule === "procurement"}
  onClick={() => setActiveModule("procurement")}
/>
```

Age file-e sidebar ro befresti, direct modify mikonam.

## Role seeding (bad az SQL migration)

### 1. UUIDs ro peyda kon:
```sql
SELECT id, email FROM auth.users ORDER BY email;
```

### 2. Role-a ro seed kon:
```sql
INSERT INTO user_procurement_roles (user_id, role, display_name) VALUES
  ('<edem-uuid>',        'approver_level_1', 'Mr. Edem'),
  ('<hezi-uuid>',        'approver_level_2', 'Mr. Hezi')
ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name, is_active = true;
```

### 3. Supervisor-a (masalan supervisor gardening):
```sql
INSERT INTO user_procurement_roles (user_id, role, display_name, department_id) VALUES
  ('<ahmad-uuid>', 'supervisor', 'Ahmad', (SELECT id FROM procurement_departments WHERE code='gardening'))
ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name, department_id = EXCLUDED.department_id, is_active = true;
```

## Workflow

```
┌─────────────┐
│ Supervisor  │  makes request (multi-item)
└──────┬──────┘
       │  submitted
       ▼
┌─────────────┐
│    Edem     │  reviews each item:
│  (Level 1)  │  → 📦 From stock (auto-deduct + log movement)
│             │  → 🛒 To purchase
│             │  → ✕ Reject item
└──────┬──────┘
       │
       ├─ all from_stock → status: fulfilled_from_stock (DONE)
       ├─ rejected       → status: edem_rejected (CANCELLED)
       └─ approved       │
                         ▼
                 ┌─────────────┐
                 │    Hezi     │  final review
                 │  (Level 2)  │
                 └──────┬──────┘
                        │
                        ├─ approved → status: hezi_approved → purchase list
                        └─ rejected → status: hezi_rejected (CANCELLED)

Admin: marks hezi_approved as 'purchased' when item is bought.
```

## Smart features

- **Stock check** — vaghti Edem "Check stock" mizane, RPC `lookup_item_stock` matching items ro az `items` table peyda mikone + qty per warehouse.
- **Fulfill from stock** — atomic RPC: deduct az `consumable_stock` + insert `consumable_movements` (movement_type='out', reason='Procurement fulfilled', reference_no=REQ-...) + mark item `decision='from_stock'`.
- **Warning na block** — age moujoodi kafi bashe, dokme sabz ba "Take from Main Warehouse: 12" mibinam. Age bekhaam khodam bekharam, dokme "To purchase" hanooz kar mikone.
- **Confirm dialog** — ghabl az fulfill "Deduct 4 unit? Cannot be undone" mishe.
- **Notif visual** — dashboard-e Edem badge sorkh mibine ta request rasidegi bekone.

## Deploy

```powershell
cd C:\Users\MSI\inventory-app
Expand-Archive "$env:USERPROFILE\Downloads\procurement-v2.zip" -DestinationPath . -Force
git add .
git commit -m "Smart procurement system v2 (requests → Edem → Hezi)"
git push
```
