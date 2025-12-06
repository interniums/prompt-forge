'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import Cookies from 'js-cookie'

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set')
  }

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key: string) => {
          const value = Cookies.get(key)
          return value ?? null
        },
        setItem: (key: string, value: string) => {
          Cookies.set(key, value, {
            expires: 7, // 7 days
            path: '/',
            sameSite: 'lax',
            secure: false, // Allow non-HTTPS for local development
          })
        },
        removeItem: (key: string) => {
          Cookies.remove(key, { path: '/' })
        },
      },
      flowType: 'pkce',
    },
  })

  return browserClient
}
