# Modiriate Darayi — Phase 2 UI

## Chi ezafe shod

**File-haye jadid (create):**
- `src/warehouse/components/BarcodeScanner.jsx` — camera + USB scanner + manual
- `src/warehouse/components/AssetHistoryPanel.jsx` — timeline yek asset
- `src/warehouse/tabs/ScanTab.jsx` — tab jodagane baraye scan
- `src/warehouse/tabs/ActivityTab.jsx` — feed hameye asset events

**File-haye update (replace):**
- `src/warehouse/WarehouseHub.jsx` — Scan + Activity tab ezafe shod, title be "Modiriate Darayi"
- `src/warehouse/tabs/AssetsTab.jsx` — barcode in search + dokme 📷 Scan

## i18n keys (add be i18n.js baraye har 3 language)

```js
// English
assetMgmtTitle: "Asset Management",
assetMgmtSub: "Vehicles, machinery, tools, consumables — all in one system",
scanTab: "Scan",
scanBtn: "Scan",
scanTabTitle: "Scan asset barcode",
scanTabDesc: "Scan a barcode, type it, or use a USB scanner to look up an asset.",
scanFound: "Asset found",
scanNotFound: "Not found",
scanNotFoundMsg: "no asset with this barcode or asset number.",
scanOpenDetail: "Open details →",
scanRecent: "Recent scans",
scannerTitle: "Scan barcode / QR",
scannerManual: "Manual / USB",
scannerCamera: "Camera",
scannerManualHint: "Type or scan with USB scanner. Press Enter to submit.",
scannerSubmit: "Search",
scannerStarting: "Starting camera…",
scannerAlignHint: "Point the camera at the barcode. It will detect automatically.",
scannerCameraErr: "Camera error",
scannerNoDetectorMsg: "This browser does not support live camera barcode detection. Use a USB scanner or paste the code manually.",
activityTab: "Activity",
activityTitle: "Activity Feed",
activityDesc: "All asset events across the system.",
activitySearchPh: "Search by asset name / no / barcode…",
activityEmpty: "No activity to display.",
allEvents: "All",
assetDeleted: "Asset deleted",
historyTitle: "History",
historyEmpty: "No history yet.",
historyNotePh: "Add a note about this asset…",
searchAssetsPh: "Search name / barcode / serial…",
loadMore: "Load more",
add: "Add",
```

(Persian va Hebrew ham hamin key-ha ba tarjome khodesh.)

## Integrate be AssetDetail (dasti)

Baraye tab History too AssetDetail:

```jsx
import AssetHistoryPanel from "../components/AssetHistoryPanel";
```

Va toye render, ye tab ya section:
```jsx
<AssetHistoryPanel TH={TH} lang={lang} assetId={asset.id} />
```

Ham baraye fields barcode va condition too edit form:
```jsx
<label>Barcode</label>
<div style={{display:"flex", gap:6}}>
  <input value={edit.barcode || ''} onChange={e => setEdit({...edit, barcode: e.target.value})} />
  <button onClick={async () => {
    const bc = await supabase.rpc('generate_asset_barcode', { p_kind: edit.kind });
    if (bc.data) setEdit({...edit, barcode: bc.data});
  }}>Auto</button>
</div>

<label>Condition</label>
<select value={edit.condition || ''} onChange={e => setEdit({...edit, condition: e.target.value || null})}>
  <option value="">—</option>
  <option value="new">New</option>
  <option value="good">Good</option>
  <option value="fair">Fair</option>
  <option value="poor">Poor</option>
  <option value="broken">Broken</option>
</select>
```

## Deploy

```powershell
cd C:\Users\MSI\inventory-app
Expand-Archive "$env:USERPROFILE\Downloads\phase2.zip" -DestinationPath . -Force
git add .
git commit -m "Asset Management Phase 2: barcode scanner, history, activity feed"
git push
```
