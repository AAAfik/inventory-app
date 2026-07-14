// ═══════════════════════════════════════════════════════════════════
// Supabase Edge Function: admin-create-user
// Creates a new auth user + assigns roles in one call.
// Only callable by users who have the 'owner' role.
// ═══════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get caller's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    // Verify caller has 'owner' role
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const { data: ownerCheck } = await callerClient.rpc("i_am_owner", {}, { schema: "procure" });
    if (!ownerCheck) throw new Error("Only owners can create users. Contact an admin.");

    // Parse body
    const { email, password, roles = [], full_name } = await req.json();
    if (!email || !password) throw new Error("Email and password required");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");

    // Admin client (bypasses RLS)
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create user
    const { data: newUser, error: e1 } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: full_name ? { full_name } : {},
    });
    if (e1) throw new Error("Auth create failed: " + e1.message);
    if (!newUser?.user?.id) throw new Error("User created but no id returned");

    // Assign roles
    if (Array.isArray(roles) && roles.length) {
      const rows = roles.map((role: string) => ({ user_id: newUser.user.id, role, granted_by: caller.id }));
      const { error: e2 } = await admin.schema("procure").from("user_roles").insert(rows);
      if (e2) {
        // Rollback user creation
        await admin.auth.admin.deleteUser(newUser.user.id);
        throw new Error("Role assignment failed, user rolled back: " + e2.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: newUser.user.id,
      email: newUser.user.email,
      roles,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
