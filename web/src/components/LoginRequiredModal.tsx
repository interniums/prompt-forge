'use client'

import React, { useState } from 'react'

type LoginRequiredModalProps = {
  open: boolean
  onClose: () => void
  onSignIn: () => Promise<void>
}

export function LoginRequiredModal({ open, onClose, onSignIn }: LoginRequiredModalProps) {
  const [isSigningIn, setIsSigningIn] = useState(false)

  if (!open) return null

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await onSignIn()
    } catch (err) {
      console.error('Sign-in failed', err)
      setIsSigningIn(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-[#050608] p-6 shadow-[0_0_80px_rgba(15,23,42,0.95)]">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-100">Sign in to generate prompts</h2>
          <p className="mt-2 text-sm text-slate-400">
            You can explore the app freely, but you need to sign in to generate your first prompt.
          </p>
        </div>

        {/* Google sign-in button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg bg-slate-100 px-4 py-2.5 font-medium text-slate-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSigningIn ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
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

        {/* Cancel button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSigningIn}
          className="mt-3 w-full cursor-pointer rounded-lg px-4 py-2.5 text-sm text-slate-400 transition-colors hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Maybe later
        </button>

        {/* Footer note */}
        <p className="mt-4 text-center text-xs text-slate-500">
          By continuing, you agree to our Terms and Privacy Policy
        </p>
      </div>
    </div>
  )
}
