'use client'

import React from 'react'
import type { UserIdentity } from '@/lib/types'
import { modalBackdropClass, modalCardClass } from '@/features/preferences/styles'

type UserManagementModalProps = {
  open: boolean
  user: UserIdentity | null
  onClose: () => void
  onOpenPreferences: () => void
  onSignIn: () => void
  onSignOut: () => void
}

export function UserManagementModal({
  open,
  user,
  onClose,
  onOpenPreferences,
  onSignIn,
  onSignOut,
}: UserManagementModalProps) {
  if (!open) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={modalBackdropClass} onClick={handleBackdropClick}>
      <div className={`${modalCardClass} max-w-md`}>
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-mono text-lg font-semibold text-slate-100">Account</h2>
            <p className="mt-1 font-mono text-sm text-slate-400 truncate">Manage your profile and settings</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer bg-transparent p-1 text-slate-400 hover:text-slate-100 hover:underline hover:underline-offset-4"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User info */}
        {user ? (
          <div className="mb-6 flex items-center gap-3 py-[15px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 font-mono text-sm font-medium text-slate-200">
              {user.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm font-medium text-slate-100 truncate">{user.email}</div>
              <div className="font-mono text-xs text-slate-500 truncate">User ID: {user.id.slice(0, 8)}...</div>
            </div>
          </div>
        ) : (
          <div className="mb-6 py-[15px]">
            <p className="font-mono text-sm text-slate-400 mb-4">
              Sign in to save preferences and sync across devices.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenPreferences()
            }}
            className="cursor-pointer bg-transparent px-0 py-0 text-left text-sm text-slate-300 font-mono underline-offset-4 hover:text-slate-100 hover:underline"
          >
            Manage Preferences
          </button>
          {user ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                onSignOut()
              }}
              className="cursor-pointer bg-transparent px-0 py-0 text-sm text-red-400 font-mono underline-offset-4 hover:text-red-300 hover:underline"
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose()
                onSignIn()
              }}
              className="cursor-pointer bg-transparent px-0 py-0 text-sm text-slate-100 font-mono underline-offset-4 hover:text-slate-50 hover:underline"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
