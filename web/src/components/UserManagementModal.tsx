'use client'

import React from 'react'
import type { UserIdentity, Preferences, PreferenceSource } from '@/lib/types'

type UserManagementModalProps = {
  open: boolean
  user: UserIdentity | null
  preferences: Preferences
  preferenceSource: PreferenceSource
  onClose: () => void
  onOpenPreferences: () => void
  onSignOut: () => void
}

export function UserManagementModal({
  open,
  user,
  preferences,
  preferenceSource,
  onClose,
  onOpenPreferences,
  onSignOut,
}: UserManagementModalProps) {
  if (!open) return null

  const formatPreferencesSummary = () => {
    const parts: string[] = []
    if (preferences.tone) parts.push(`tone=${preferences.tone}`)
    if (preferences.audience) parts.push(`audience=${preferences.audience}`)
    if (preferences.domain) parts.push(`domain=${preferences.domain}`)
    if (preferences.defaultModel) parts.push(`model=${preferences.defaultModel}`)
    if (preferences.outputFormat) parts.push(`format=${preferences.outputFormat}`)
    if (preferences.language) parts.push(`lang=${preferences.language}`)
    if (preferences.depth) parts.push(`depth=${preferences.depth}`)
    if (typeof preferences.temperature === 'number') parts.push(`temp=${preferences.temperature}`)
    if (parts.length === 0) return 'No preferences set yet'
    return parts.join(', ')
  }

  const preferenceSourceLabel =
    preferenceSource === 'user'
      ? 'synced to your account'
      : preferenceSource === 'session'
      ? 'saved for this browser session'
      : preferenceSource === 'local'
      ? 'local draft'
      : 'not set'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/95 p-6 shadow-[0_0_80px_rgba(15,23,42,0.95)]">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Account</h2>
            <p className="mt-1 text-sm text-slate-400">{user?.email || 'Manage your profile and settings'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User info */}
        <div className="mb-4 space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-blue-500 text-sm font-semibold text-white">
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-100">{user?.email || 'Not signed in'}</div>
              <div className="text-xs text-slate-500">User ID: {user?.id.slice(0, 8)}...</div>
            </div>
          </div>
        </div>

        {/* Preferences summary */}
        <div className="mb-4 space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-200">Preferences</div>
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenPreferences()
              }}
              className="cursor-pointer text-xs text-indigo-400 hover:text-indigo-300"
            >
              Edit
            </button>
          </div>
          <div className="text-xs text-slate-400">Status: {preferenceSourceLabel}</div>
          <div className="text-xs text-slate-500">{formatPreferencesSummary()}</div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenPreferences()
            }}
            className="w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-800"
          >
            Manage Preferences
          </button>
          <button
            type="button"
            onClick={() => {
              onClose()
              onSignOut()
            }}
            className="w-full cursor-pointer rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm font-medium text-red-200 hover:bg-red-950/50"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
