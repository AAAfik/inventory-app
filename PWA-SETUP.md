# Caesar Projects PWA Setup

## Step 1 — Install PWA plugin
```cmd
cd C:\Users\MSI\inventory-app
npm install vite-plugin-pwa --save-dev
```

## Step 2 — Replace files
Extract the zip over `C:\Users\MSI\inventory-app\`. These files will be updated/added:

- `vite.config.js` (replace)
- `index.html` (replace)
- `src/inventory-system.jsx` (replace — adds PWA install button in header)
- `src/PWAInstall.jsx` (new)

## Step 3 — Copy icons to public/
Copy these into `C:\Users\MSI\inventory-app\public\`:
- `pwa-192x192.png`
- `pwa-512x512.png`
- `pwa-maskable-512.png`
- `apple-touch-icon.png`
- `favicon-32.png`

## Step 4 — Test locally
```cmd
npm run build
npm run preview
```
Open the URL that appears. In Chrome DevTools → Application → Manifest — should be no errors.

## Step 5 — Push
```cmd
git add package.json package-lock.json vite.config.js index.html src/ public/
git commit -m "feat: PWA installable + mobile-first"
git push
```

## How to install
- **Android / Chrome desktop**: A "📥 Install app" button appears in the header. Tap it.
- **iPhone Safari**: Tap "📥 Install" — a guide appears showing how to Add to Home Screen.
- After install, the app opens fullscreen without browser chrome.

## PWA features enabled
- ✅ Installable (Add to Home Screen)
- ✅ Fullscreen standalone mode
- ✅ Offline caching for Supabase API + Storage (5 min for API, 30 days for photos)
- ✅ Auto-update when new version deploys
- ✅ Caesar black + gold theme in system UI (status bar, splash screen)
- ✅ Safe-area handling for iPhone notch
- ✅ Prevent pull-to-refresh + double-tap zoom on mobile
