import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client -  bypasses RLS entirely. Only for trusted, server-initiated writes with no
 * user session to scope to (e.g. the Graphy webhook receiver, the CSV backfill script).
 * Never import this from a Client Component and never expose SUPABASE_SERVICE_ROLE_KEY as NEXT_PUBLIC_*.
 */
export function createAdminClient() {
  return createSupabaseClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
