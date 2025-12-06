import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client for use in server components and server actions.
 *
 * Uses the service role key so server-side writes are not blocked by RLS.
 * Env vars required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */
export function createServerSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase environment variables are not set. Please define SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}
