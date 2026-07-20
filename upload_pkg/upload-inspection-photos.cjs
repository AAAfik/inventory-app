// upload-inspection-photos.js
// Bulk-uploads photos to Supabase Storage and updates inspections.photos array.
//
// Usage:
//   1. cd C:\Users\MSI\inventory-app  (or wherever)
//   2. Copy this file + the `photos/` folder into that directory
//   3. Make sure @supabase/supabase-js is installed:  npm i @supabase/supabase-js
//   4. Set env vars (in the same PowerShell session):
//        $env:SUPABASE_URL = "https://zttmbcaeqvgaflvzbnqp.supabase.co"
//        $env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOi..."   (from Supabase dashboard → Settings → API)
//   5. Run:  node upload-inspection-photos.js
//
// The photos/ folder must have subfolders named after inspection_no:
//   photos/HSE-POOLS-01/photo-01.jpg
//   photos/HSE-POOLS-02A/photo-01.jpg
//   ...

const { createClient } = require("@supabase/supabase-js");
const fs   = require("fs");
const path = require("path");

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("❌ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.");
  process.exit(1);
}

const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PHOTOS_DIR = path.join(__dirname, "photos");
const BUCKET     = "inspection-photos";

function contentType(ext) {
  const e = ext.toLowerCase();
  return e === ".png" ? "image/png"
       : e === ".webp" ? "image/webp"
       : e === ".gif" ? "image/gif"
       : "image/jpeg";
}

async function processFolder(inspectionNo) {
  const dir = path.join(PHOTOS_DIR, inspectionNo);
  const files = fs.readdirSync(dir)
    .filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f))
    .sort();

  if (!files.length) { console.log(`  ⊘ ${inspectionNo}: no files`); return; }

  // Verify inspection exists
  const { data: row, error: fErr } = await supabase
    .from("inspections")
    .select("id, inspection_no, photos")
    .eq("inspection_no", inspectionNo)
    .maybeSingle();

  if (fErr) { console.log(`  ✗ ${inspectionNo}: DB lookup error — ${fErr.message}`); return; }
  if (!row) { console.log(`  ✗ ${inspectionNo}: inspection_no not found in DB`); return; }

  console.log(`\n📁 ${inspectionNo} (${files.length} photos)`);
  const urls = [];
  for (const filename of files) {
    const filepath   = path.join(dir, filename);
    const buffer     = fs.readFileSync(filepath);
    const ext        = path.extname(filename);
    const storagePath = `${inspectionNo}/${filename}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        upsert: true,
        contentType: contentType(ext),
      });

    if (upErr) { console.log(`   ✗ ${filename}: ${upErr.message}`); continue; }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    if (urlData?.publicUrl) {
      urls.push(urlData.publicUrl);
      console.log(`   ✓ ${filename}`);
    }
  }

  if (!urls.length) { console.log(`   ⚠ No uploads succeeded, DB not updated`); return; }

  // Update DB — append to existing photos array (dedupe)
  const existing = row.photos || [];
  const merged   = [...new Set([...existing, ...urls])];

  const { error: uErr } = await supabase
    .from("inspections")
    .update({ photos: merged, updated_at: new Date().toISOString() })
    .eq("id", row.id);

  if (uErr) console.log(`   ✗ DB update: ${uErr.message}`);
  else      console.log(`   💾 photos array updated (${merged.length} total)`);
}

async function main() {
  if (!fs.existsSync(PHOTOS_DIR)) {
    console.error(`❌ photos/ directory not found at ${PHOTOS_DIR}`);
    process.exit(1);
  }
  const folders = fs.readdirSync(PHOTOS_DIR)
    .filter(f => fs.statSync(path.join(PHOTOS_DIR, f)).isDirectory())
    .sort();

  console.log(`\n🚀 Uploading photos for ${folders.length} inspections to bucket "${BUCKET}"\n`);

  for (const insp of folders) {
    try { await processFolder(insp); }
    catch (e) { console.log(`  ✗ ${insp}: ${e.message}`); }
  }

  console.log("\n✅ Done.");
}

main().catch(e => { console.error(e); process.exit(1); });
