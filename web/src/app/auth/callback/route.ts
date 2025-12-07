import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/generate'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', url.origin))
  }

  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Extract project ref from Supabase URL for cookie naming
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const authCookieName = `sb-${projectRef}-auth-token`

  // Create a Supabase client with cookie storage
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key: string) => {
          return cookieStore.get(key)?.value ?? null
        },
        setItem: () => {
          // We'll handle cookie setting manually after exchange
        },
        removeItem: (key: string) => {
          cookieStore.delete(key)
        },
      },
    },
  })

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    console.error('Failed to exchange auth code for session', error)
    return NextResponse.redirect(new URL('/login?error=auth_failed', url.origin))
  }

  // Validate redirect URL to prevent open redirect vulnerability
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/generate'
  const redirectUrl = new URL(safeNext, url.origin)

  // Create redirect response and manually set the auth cookie
  const response = NextResponse.redirect(redirectUrl)

  // Set the session cookie on the response
  const sessionData = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.session.user,
  }

  response.cookies.set(authCookieName, JSON.stringify(sessionData), {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  return response
}
