import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

/**
 * Create a Supabase client that carries the current user's Clerk JWT.
 * RLS policies will see the Clerk `sub` claim via public.clerk_user_id().
 *
 * Requires a Clerk JWT template named "supabase" configured in the Clerk
 * dashboard (signs with the Supabase JWT secret).
 */
export async function getSupabaseServerClient() {
  const { getToken } = await auth();
  const token = await getToken({ template: "supabase" });

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : undefined,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

/** Service role client — bypasses RLS. Use sparingly, server-only. */
export function getSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
