'use client'

import React, { useEffect, useMemo, useState } from 'react'
import type { UserIdentity } from '@/lib/types'
import { modalBackdropClass, modalCardClass } from '@/features/preferences/styles'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type UserManagementModalProps = {
  open: boolean
  user: UserIdentity | null
  onClose: () => void
  onOpenPreferences: () => void
  onSignIn: () => void
  onSignOut: () => void
}

const actionButtonClass =
  'cursor-pointer flex w-full items-center justify-between rounded-lg border border-slate-800/70 bg-slate-900/50 px-3 py-3 text-left text-sm font-mono text-slate-100 transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-600/60'

export function UserManagementModal({
  open,
  user,
  onClose,
  onOpenPreferences,
  onSignIn,
  onSignOut,
}: UserManagementModalProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [copied, setCopied] = useState(false)
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const subtitle = useMemo(
    () => (user ? 'Signed in. Manage prompt preferences.' : 'Guest session. Sign in to sync.'),
    [user]
  )

  if (!open) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleCopyUserId = async () => {
    if (!user?.id) return
    try {
      await navigator.clipboard?.writeText(user.id)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy user id', err)
    }
  }

  const handleSignOutConfirm = () => {
    onClose()
    onSignOut()
    setSignOutDialogOpen(false)
  }

  return (
    <div className={modalBackdropClass} onClick={handleBackdropClick}>
      <div className={`${modalCardClass} max-w-sm space-y-6`}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="font-mono text-lg font-semibold text-slate-100">Account</h2>
            <p className="font-mono text-sm text-slate-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md bg-transparent p-1 text-slate-400 transition hover:text-slate-100 hover:underline hover:underline-offset-4 focus:outline-none focus:ring-2 focus:ring-slate-600/60"
            aria-label="Close account panel"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User info */}
        {user ? (
          <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Signed in as</p>
                <div className="truncate font-mono text-sm text-slate-100">{user.email}</div>
              </div>
              <span className="rounded-full border border-emerald-800/40 bg-emerald-900/30 px-2.5 py-1 text-xs font-mono text-emerald-100">
                Signed in
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-500">
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="cursor-pointer rounded-md px-2 py-1 text-slate-400 transition hover:text-slate-100 hover:underline hover:underline-offset-4 focus:outline-none focus:ring-1 focus:ring-slate-600/60"
              >
                {showAdvanced ? 'Hide user id' : 'Show user id'}
              </button>
              {copied && <span className="text-emerald-300">Copied ✓</span>}
            </div>
            {showAdvanced && (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-md bg-slate-950/70 px-3 py-2">
                <p className="truncate text-[11px] font-mono text-slate-400">User ID: {user.id}</p>
                <button
                  type="button"
                  onClick={handleCopyUserId}
                  className="cursor-pointer rounded-md px-2 py-1 text-[11px] font-mono text-slate-200 transition hover:bg-slate-900 hover:text-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-600/60"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Guest session</p>
            <p className="mt-1 font-mono text-sm text-slate-100">Sign in to sync preferences across devices.</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Actions</p>
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenPreferences()
            }}
            className={actionButtonClass}
          >
            <div>
              <div className="text-sm text-slate-100">Prompt preferences</div>
              <div className="text-xs text-slate-500">Set defaults for future prompts</div>
            </div>
            <svg
              className="h-4 w-4 text-slate-500"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 5l5 5-5 5" />
            </svg>
          </button>

          {user ? (
            <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
              <AlertDialogTrigger asChild>
                <button className={`${actionButtonClass} border-slate-800/60 text-slate-200 hover:bg-slate-900/80`}>
                  <span>Sign out</span>
                  <svg
                    className="h-4 w-4 text-slate-500"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 5l5 5-5 5" />
                  </svg>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out?</AlertDialogTitle>
                  <AlertDialogDescription>You can sign back in anytime.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSignOutConfirm}>Sign out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose()
                onSignIn()
              }}
              className={`${actionButtonClass} border-slate-800/60 text-slate-50`}
            >
              <div>
                <div className="text-sm">Sign in</div>
                <div className="text-xs text-slate-500">Sync your preferences</div>
              </div>
              <svg
                className="h-4 w-4 text-slate-500"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 5l5 5-5 5" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-mono text-slate-200 transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-600/60"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
