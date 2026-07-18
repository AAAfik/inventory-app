# Edge Function Setup — Auto User Creation

## Step 1 — Install Supabase CLI (age nadari)
```powershell
npm install -g supabase
```

## Step 2 — Login be Supabase CLI
```powershell
cd C:\Users\MSI\inventory-app
supabase login
```
(browser baaz mishe, login kon)

## Step 3 — Link project
```powershell
supabase link --project-ref zttmbcaeqvgaflvzbnqp
```
Password-e database mikhad (hamoon-i ke moghe sakht-e project set kardi).

## Step 4 — File-e Edge Function bezar
File `admin-create-user.ts` az zip ro copy kon toosh `C:\Users\MSI\inventory-app\supabase\functions\admin-create-user\index.ts`

(Age folder-e `supabase/functions/` nadari, ye seri command mikhay:)
```powershell
mkdir supabase\functions\admin-create-user
```
Bad file-o unja bezar ba esm `index.ts`.

## Step 5 — Deploy Edge Function
```powershell
supabase functions deploy admin-create-user --no-verify-jwt
```

## Step 6 — Update UsersTab.jsx (jadid)
Zip-ro extract kon roo `C:\Users\MSI\inventory-app\`, `src/UsersTab.jsx` overwrite mishe.

## Step 7 — Push
```powershell
cd C:\Users\MSI\inventory-app
git add supabase/ src/UsersTab.jsx
git commit -m "feat: real user creation via Edge Function"
git push
```

## Chegoone kar mikone
1. Boro Team & Roles tab
2. Click **+ New User**
3. Email, esm, password (khodesh generate kone), naghsh haro entekhab kon
4. Click **Create user** → tak-e click user sakhte mishe + naghsh assign mishe
5. Password ro copy kon va be user bede
