'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/generate'
  const authError = searchParams.get('error')

  // Derive error message from URL param (no state needed)
  const authErrorMessage =
    authError === 'auth_failed'
      ? 'Authentication failed. Please try again.'
      : authError === 'session_error'
      ? 'Session error occurred. Please sign in again.'
      : null

  // Combine URL error with user-triggered errors
  const displayError = error || authErrorMessage

  // If there's an auth error, skip auth check (derived state, no effect needed)
  const [isCheckingAuth, setIsCheckingAuth] = useState(!authError)

  useEffect(() => {
    // Skip auth check if there's an error from URL
    if (authError) {
      return
    }

    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          router.replace(redirectTo)
        } else {
          setIsCheckingAuth(false)
        }
      } catch (err) {
        console.error('Auth check failed', err)
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [authError, router, redirectTo])

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(148,163,184,0.18),transparent_55%)] opacity-80" />
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError('Please enter your email address')
      return
    }

    setIsLoadingEmail(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (error) {
        console.error('Email sign-in failed', error)
        setError('Failed to send magic link. Please try again.')
        setIsLoadingEmail(false)
      } else {
        setSuccess('Check your email for a magic link to sign in!')
        setIsLoadingEmail(false)
        setEmail('')
      }
    } catch (err) {
      console.error('Sign-in error', err)
      setError('An unexpected error occurred. Please try again.')
      setIsLoadingEmail(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          scopes: 'email',
        },
      })

      if (error) {
        console.error('Google sign-in failed', error)
        setError('Failed to sign in with Google. Please try again.')
        setIsLoadingGoogle(false)
      }
    } catch (err) {
      console.error('Sign-in error', err)
      setError('An unexpected error occurred. Please try again.')
      setIsLoadingGoogle(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(148,163,184,0.18),transparent_55%)] opacity-80" />

      {/* Login container */}
      <div className="mx-auto w-full max-w-sm rounded-2xl bg-[#050608] p-8 shadow-[0_0_120px_rgba(15,23,42,0.95)]">
        {/* Success message */}
        {success && (
          <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-200">
            {success}
          </div>
        )}

        {/* Error message */}
        {displayError && (
          <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
            {displayError}
          </div>
        )}

        {/* Email sign-in form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoadingEmail}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-slate-100 placeholder-slate-500 transition-colors focus:border-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isLoadingEmail}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-100 px-4 py-2.5 font-medium text-slate-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingEmail ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                <span>Sending magic link...</span>
              </>
            ) : (
              'Continue with Email'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#050608] px-2 text-slate-500">or</span>
          </div>
        </div>

        {/* Google sign-in */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoadingGoogle}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2.5 font-medium text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoadingGoogle ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-500">
          By continuing, you agree to our Terms and Privacy Policy
        </p>
      </div>
    </main>
  )
}
