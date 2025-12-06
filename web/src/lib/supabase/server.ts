import { cookies } from 'next/headers'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client for privileged server-side work (bypasses RLS).
 * Use this only for system-owned data like anonymous session state.
 */
export function createServiceSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase environment variables are not set. Please define SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  })
}

/**
 * Supabase client that respects the user's auth session (uses anon key + cookies).
 * Safe for user-owned data with RLS policies.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Supabase environment variables are not set. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  // Extract project ref from Supabase URL for cookie naming
  const projectRef = new URL(url).hostname.split('.')[0]
  const authCookieName = `sb-${projectRef}-auth-token`

  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  // Restore session from cookie
  const sessionCookie = cookieStore.get(authCookieName)
  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(sessionCookie.value)
      if (session.access_token && session.refresh_token) {
        await client.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        })
      }
    } catch (error) {
      console.error('Failed to restore session from cookie:', error)
    }
  }

  return client
}
