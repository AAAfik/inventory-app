# Upload inspection photos

## Chi mikone
- 68 aks az `photos/` folder ro upload mikone be Supabase Storage bucket `inspection-photos`
- Har inspection ro update mikone ba URL-haye publicash
- Photos array ro append + dedupe mikone (idempotent — chand bar run beshe safe-e)

## Rah-andazi

```powershell
# 1. Copy hame in folder be jaii ke node_modules dari
cd C:\Users\MSI\inventory-app
Expand-Archive "$env:USERPROFILE\Downloads\upload_pkg.zip" -DestinationPath . -Force

# 2. Install client (age nadari)
npm i @supabase/supabase-js

# 3. Service role key az Supabase Dashboard → Project Settings → API → service_role (secret)
$env:SUPABASE_URL = "https://zttmbcaeqvgaflvzbnqp.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "PASTE_YOUR_SERVICE_ROLE_KEY_HERE"

# 4. Run
node upload-inspection-photos.js
```

## Chi baed
- Boro Inspections tab, aks-ha bayad zire har HSE-POOLS-*, PROP-SOC-DOOR, REF-STD-FULL-V2 bashan
- Age chizi kharab shod, baz ham run kon — idempotent-e

## Structure

```
upload_pkg/
├── upload-inspection-photos.js
├── README.md
└── photos/
    ├── HSE-POOLS-01/       (2 aks)
    ├── HSE-POOLS-02A/      (5 aks)
    ├── HSE-POOLS-02B/      (8 aks)
    ├── HSE-POOLS-02C/      (6 aks)
    ├── HSE-POOLS-02D/      (3 aks)
    ├── HSE-POOLS-03/       (3 aks)
    ├── HSE-POOLS-04/       (5 aks)
    ├── HSE-POOLS-05/       (3 aks)
    ├── HSE-POOLS-07/       (3 aks)
    ├── HSE-POOLS-08/       (3 aks)
    ├── HSE-POOLS-11/       (2 aks)
    ├── HSE-POOLS-12/       (3 aks)
    ├── PROP-SOC-DOOR/      (4 aks)
    └── REF-STD-FULL-V2/    (18 aks)
```

**Total: 68 photos across 14 inspections**

## Note
Az 33 inspection kolli, faghat 14 ta az PDF aks daran. Baghi 19 ta (POOL-*, Cliff/Breeze big reports, Standards koochik) az PDFe khali estekhraj shodan — dasti bayad aks bezari age hasti.
