// create-supervisors.cjs
// Creates auth users + assigns supervisor roles + department.
//
// Usage:
//   cd C:\Users\MSI\inventory-app
//   $env:SUPABASE_URL = "https://zttmbcaeqvgaflvzbnqp.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_..."
//   node create-supervisors.cjs

const { createClient } = require("@supabase/supabase-js");

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("❌ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.");
  process.exit(1);
}

const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Supervisors to create
const SUPERVISORS = [
  { email: "murat@caesar.com",    password: 'x-7tYME:AMHjRACsya%!',  display: "Murat (Maintenance)",   dept: "maintenance" },
  { email: "cleaning@caesar.com", password: "D:01R9FYJk=E7'4q",       display: "Cleaning",               dept: "housekeeping" },
  { email: "spool@caesar.com",    password: '0Kw#"6]m32Sz~|!6',       display: "Pool Supervisor",        dept: "pool" },
  { email: "aritma@caesar.com",   password: 'R7[!h0?1#o{]Mu)S',       display: "Aritma (Water Treatment)", dept: "maintenance" },
  { email: "garden@caesar.com",   password: 'bHG98+F.t6Cx@JL>',       display: "Garden",                 dept: "gardening" },
];

async function main() {
  // 1. Get department IDs
  const { data: depts, error: dErr } = await supabase
    .from('procurement_departments')
    .select('id, code');
  if (dErr) { console.error("Failed to load departments:", dErr.message); process.exit(1); }
  const deptMap = Object.fromEntries(depts.map(d => [d.code, d.id]));

  for (const s of SUPERVISORS) {
    console.log(`\n👤 ${s.email}`);

    // Check if user already exists
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find(u => u.email === s.email);

    let userId;
    if (found) {
      userId = found.id;
      console.log(`   ⊙ Already exists (id: ${userId.slice(0, 8)}…), updating password…`);
      // Optionally update password
      const { error: pErr } = await supabase.auth.admin.updateUserById(userId, {
        password: s.password,
        email_confirm: true,
      });
      if (pErr) console.log(`   ⚠ Password update failed: ${pErr.message}`);
    } else {
      // Create new user
      const { data: created, error: cErr } = await supabase.auth.admin.createUser({
        email: s.email,
        password: s.password,
        email_confirm: true,   // auto-confirm so they can log in immediately
      });
      if (cErr) { console.log(`   ✗ Create failed: ${cErr.message}`); continue; }
      userId = created.user.id;
      console.log(`   ✓ Created (id: ${userId.slice(0, 8)}…)`);
    }

    // Assign role
    const deptId = deptMap[s.dept];
    if (!deptId) { console.log(`   ⚠ Department '${s.dept}' not found`); continue; }

    const { error: rErr } = await supabase.from('user_procurement_roles').upsert({
      user_id: userId,
      role: 'supervisor',
      display_name: s.display,
      department_id: deptId,
      is_active: true,
    }, { onConflict: 'user_id' });

    if (rErr) console.log(`   ✗ Role assign failed: ${rErr.message}`);
    else      console.log(`   ✓ Role assigned: supervisor / ${s.dept}`);
  }

  // Final summary
  console.log("\n📊 Current supervisors:");
  const { data: roles } = await supabase
    .from('user_procurement_roles')
    .select('role, display_name, department_id, procurement_departments(name)')
    .eq('role', 'supervisor');
  (roles || []).forEach(r => console.log(`   • ${r.display_name} → ${r.procurement_departments?.name || '—'}`));

  console.log("\n✅ Done.");
}

main().catch(e => { console.error(e); process.exit(1); });
