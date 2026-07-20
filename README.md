# Phase 3 — Packages + English Title

## Aval SQL bezan
File: `migration_packages_phase3.sql`
- Table `packages` (photos array, name, property, unit, status, timestamps)
- Auto number: `PKG-2026-00001`
- Trigger khodkar log too `package_history`
- Storage bucket `package-photos` (public read, authenticated write)

## File-haye jadid/update

**Jadid:**
- `src/warehouse/tabs/PackagesTab.jsx`
- `src/warehouse/tabs/PackageDetail.jsx`
- `src/warehouse/components/NewPackageModal.jsx`

**Update:**
- `src/warehouse/WarehouseHub.jsx` — title "Asset Management" (English) + Packages tab + Packages stat

## i18n keys (add)

```js
// English
assetMgmtTitle: "Asset Management",
assetMgmtSub: "Vehicles, machinery, tools, consumables and packages — all in one system",
packagesTab: "Packages",
packagesTitle: "Packages",
packagesDesc: "Receive and track postal packages for guests / staff.",
newPackage: "New package",
packagesSearchPh: "Search name / package no / unit…",
packagesEmpty: "No packages match.",
allProperties: "All properties",
recipientName: "Recipient name",
department: "Department",
unit: "Unit",
receivedOn: "Received",
collectedOn: "Collected",
collectedBy: "Picked up by",
markCollected: "Mark as collected",
markReturned: "Return",
markLost: "Lost",
whoPickedUp: "Who picked up the package?",
confirmReturn: "Mark this package as returned to sender?",
confirmLost: "Mark this package as lost?",
confirmDelete: "Delete this package permanently?",
pendingPackages: "Pending pkgs",
pkgPhotos: "Photos",
pkgPhotoHint: "On mobile: opens rear camera directly. Max 15MB per photo.",
pkgNotesPh: "Optional — courier, size, fragile, etc.",
pkgNeedName: "Recipient name is required",
pkgNeedPhoto: "At least one photo is required",
pkgNeedSignature: "Enter name of person collecting",
savePackage: "Save package",
```

## Deploy

```powershell
cd C:\Users\MSI\inventory-app
Expand-Archive "$env:USERPROFILE\Downloads\phase3-packages.zip" -DestinationPath . -Force
git add .
git commit -m "Phase 3: postal packages system + English title"
git push
```

Bad az SQL migration, boro **Asset Management → Packages** tab, click 📦 **New package**:
1. Aks migire (mobile → back camera)
2. Name-e sahebe baste
3. Property + unit
4. Save
