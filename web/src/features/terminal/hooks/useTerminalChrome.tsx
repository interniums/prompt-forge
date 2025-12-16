'use client'

import { TerminalHeader } from '@/components/terminal/TerminalHeader'
import { TerminalPanels } from '@/features/terminal/TerminalPanels'
import type { Preferences, UserIdentity, ThemeName, PreferenceSource } from '@/lib/types'

type UseTerminalChromeDeps = {
  preferences: Preferences
  preferenceSource: PreferenceSource | null
  isPreferencesOpen: boolean
  isSavingPreferences: boolean
  isUserManagementOpen: boolean
  isLoginRequiredOpen: boolean
  setPreferencesOpen: (v: boolean) => void
  setUserManagementOpen: (v: boolean) => void
  setLoginRequiredOpen: (v: boolean) => void
  handlePreferencesChange: (next: Preferences) => void
  handleSavePreferences: () => void
  handleSignIn: () => Promise<void>
  handleEmailSignIn: () => void
  handleSignOut: () => Promise<void>
  updatePreferencesLocally: (prefs: Preferences) => void
  user: UserIdentity | null
  theme: ThemeName
  onHistoryClick?: () => void
  historyOpen?: boolean
}

export function useTerminalChrome(deps: UseTerminalChromeDeps) {
  const headerNode = (
    <TerminalHeader
      onProfileClick={() => deps.setUserManagementOpen(true)}
      onSettingsClick={() => deps.setPreferencesOpen(true)}
      onHistoryClick={deps.onHistoryClick}
      historyOpen={deps.historyOpen}
      theme={deps.theme}
      onThemeChange={(nextTheme) => {
        const updated = {
          ...deps.preferences,
          uiDefaults: { ...(deps.preferences.uiDefaults ?? {}), theme: nextTheme },
        }
        deps.updatePreferencesLocally(updated)
      }}
    />
  )

  const panelsNode = (
    <TerminalPanels
      preferences={{
        open: deps.isPreferencesOpen,
        values: deps.preferences,
        source: deps.preferenceSource ?? 'none',
        user: deps.user,
        saving: deps.isSavingPreferences,
        canSave: Boolean(deps.user),
        onClose: () => deps.setPreferencesOpen(false),
        onChange: deps.handlePreferencesChange,
        onSave: deps.handleSavePreferences,
        onSignIn: deps.handleSignIn,
        onSignOut: deps.handleSignOut,
      }}
      userManagement={{
        open: deps.isUserManagementOpen,
        user: deps.user,
        onClose: () => {
          deps.setUserManagementOpen(false)
          deps.setPreferencesOpen(false)
        },
        onOpenPreferences: () => deps.setPreferencesOpen(true),
        onSignIn: deps.handleSignIn,
        onSignOut: deps.handleSignOut,
      }}
      loginRequired={{
        open: deps.isLoginRequiredOpen,
        onClose: () => deps.setLoginRequiredOpen(false),
        onSignIn: deps.handleSignIn,
        onEmailSignIn: deps.handleEmailSignIn,
      }}
    />
  )

  return { headerNode, panelsNode }
}
