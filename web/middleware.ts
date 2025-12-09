import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  // Find the Supabase auth cookie (pattern: sb-*-auth-token)
  let authCookie: string | undefined
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')) {
      authCookie = cookie.value
      break
    }
  }

  // Parse session from cookie
  let session = null
  if (authCookie) {
    try {
      session = JSON.parse(authCookie)
    } catch {
      // Invalid session cookie
    }
  }

  const hasValidSession = session && session.access_token

  // If on login page and user is authenticated, redirect to home
  if (hasValidSession && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/generate', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth callback routes
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
