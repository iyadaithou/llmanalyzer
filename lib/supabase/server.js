import { createClient } from "@supabase/supabase-js";

let _client = null;

/**
 * Server-side Supabase client using the service-role key.
 * RLS is disabled on this schema (single-user app), so the service role is
 * the only client we need. The key never leaves the server — it is loaded
 * from SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL.
 */
export function getSupabaseServerClient() {
  if (_client) return _client;
  _client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return _client;
}
