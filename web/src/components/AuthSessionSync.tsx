'use client'

import { useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

// Get auth cookie name based on Supabase URL
function getAuthCookieName(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return 'sb-auth-token'
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  return `sb-${projectRef}-auth-token`
}

/**
 * Component that syncs Supabase auth session to cookies
 * so that server-side code and middleware can access the session.
 */
export function AuthSessionSync() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const cookieName = getAuthCookieName()

    // Sync current session to cookies
    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        // Store session in a cookie that the server can read
        document.cookie = `${cookieName}=${JSON.stringify(session)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      } else {
        // Clear the cookie if no session
        document.cookie = `${cookieName}=; path=/; max-age=0`
      }
    }

    // Sync on mount
    syncSession()

    // Listen for auth changes and sync
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        document.cookie = `${cookieName}=${JSON.stringify(session)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      } else {
        document.cookie = `${cookieName}=; path=/; max-age=0`
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return null
}
