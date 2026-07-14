// ═══════════════════════════════════════════════════════════════════
// Supabase Edge Function: admin-create-user
// ═══════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL  = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
      throw new Error("Missing env vars: SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    // Caller client (uses caller's JWT — RLS-scoped)
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get caller
    const { data: userRes, error: uErr } = await callerClient.auth.getUser();
    if (uErr || !userRes?.user) throw new Error("Not authenticated: " + (uErr?.message || "no user"));
    const caller = userRes.user;

    // Admin client (bypasses RLS) — used for owner check + creation
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is owner (query directly, avoid RPC issues)
    const { data: ownerRows, error: ownerErr } = await admin
      .schema("procure")
      .from("user_roles")
      .select("id")
      .eq("user_id", caller.id)
      .eq("role", "owner")
      .eq("is_active", true)
      .limit(1);

    if (ownerErr) throw new Error("Owner check failed: " + ownerErr.message);
    if (!ownerRows?.length) throw new Error("Access denied: only owners can create users. Your user id: " + caller.id);

    // Parse body
    const body = await req.json();
    const { email, password, roles = [], full_name } = body;
    if (!email || !password) throw new Error("Email and password required");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");

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
      const rows = roles.map((role) => ({ user_id: newUser.user.id, role }));
      const { error: e2 } = await admin.schema("procure").from("user_roles").insert(rows);
      if (e2) {
        await admin.auth.admin.deleteUser(newUser.user.id);
        throw new Error("Role assignment failed, user rolled back: " + e2.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: newUser.user.id,
      email:   newUser.user.email,
      roles,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("admin-create-user error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
