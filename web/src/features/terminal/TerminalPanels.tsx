'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import type { Preferences, PreferenceSource, UserIdentity } from '@/lib/types'

type PreferencesPanelProps = {
  open: boolean
  values: Preferences
  source: PreferenceSource
  user: UserIdentity | null
  saving: boolean
  canSave: boolean
  onClose: () => void
  onChange: (next: Preferences) => void
  onSave: () => void
  onSignIn?: () => void
  onSignOut?: () => void
}

type UserManagementProps = {
  open: boolean
  user: UserIdentity | null
  onClose: () => void
  onOpenPreferences: () => void
  onSignIn: () => void
  onSignOut: () => void
}

type LoginRequiredProps = {
  open: boolean
  onClose: () => void
  onSignIn: () => Promise<void>
  onEmailSignIn: () => void
}

type TerminalPanelsProps = {
  preferences: PreferencesPanelProps
  userManagement: UserManagementProps
  loginRequired: LoginRequiredProps
}

const PreferencesPanel = dynamic(() => import('@/components/PreferencesPanel').then((m) => m.PreferencesPanel), {
  ssr: false,
  loading: () => null,
})

const UserManagementModal = dynamic(
  () => import('@/components/UserManagementModal').then((m) => m.UserManagementModal),
  { ssr: false, loading: () => null }
)

const LoginRequiredModal = dynamic(() => import('@/components/LoginRequiredModal').then((m) => m.LoginRequiredModal), {
  ssr: false,
  loading: () => null,
})

export function TerminalPanels({ preferences, userManagement, loginRequired }: TerminalPanelsProps) {
  return (
    <>
      <PreferencesPanel {...preferences} />
      <UserManagementModal {...userManagement} />
      <LoginRequiredModal {...loginRequired} />
    </>
  )
}
