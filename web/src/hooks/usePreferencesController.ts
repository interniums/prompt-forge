'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { savePreferences, loadUserPreferences, type SavePreferencesResult } from '@/services/preferencesServer'
import { parseTheme, resolveStoredTheme, setStoredTheme, applyThemeToDocument } from '@/lib/theme'
import type { Preferences, PreferenceSource, UserIdentity } from '@/lib/types'
import { DEFAULT_THEME } from '@/lib/constants'

type UsePreferencesControllerOptions = {
  initialPreferences?: Preferences
  initialUser?: UserIdentity | null
  initialPreferenceSource?: PreferenceSource
  onToast?: (message: string) => void
}

export function usePreferencesController({
  initialPreferences,
  initialUser,
  initialPreferenceSource = 'none',
  onToast,
}: UsePreferencesControllerOptions) {
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences ?? {})
  const [preferenceSource, setPreferenceSource] = useState<PreferenceSource>(initialPreferenceSource)
  const [user, setUser] = useState<UserIdentity | null>(initialUser ?? null)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)

  const themePreference = parseTheme(preferences.uiDefaults?.theme) ?? resolveStoredTheme() ?? DEFAULT_THEME

  useEffect(() => {
    applyThemeToDocument(themePreference, DEFAULT_THEME)
  }, [themePreference])

  const updatePreferencesLocally = useCallback((next: Preferences) => {
    setPreferences(next)
    setPreferenceSource((prev) => {
      if (prev === 'user' || prev === 'session') return 'local'
      return prev ?? 'local'
    })
    if (typeof window !== 'undefined') {
      localStorage.setItem('pf_local_preferences', JSON.stringify(next))
      setStoredTheme(parseTheme(next.uiDefaults?.theme))
    }
  }, [])

  const applyPreferencesFromServer = useCallback((next: Preferences, source: PreferenceSource) => {
    const storedTheme = resolveStoredTheme()
    setPreferences((prev) => {
      const mergedUiDefaults = {
        ...(prev.uiDefaults ?? {}),
        ...(next.uiDefaults ?? {}),
      }
      const finalTheme = storedTheme ?? parseTheme(next.uiDefaults?.theme) ?? parseTheme(prev.uiDefaults?.theme)
      if (finalTheme) {
        mergedUiDefaults.theme = finalTheme
      } else {
        delete mergedUiDefaults.theme
      }
      return {
        ...prev,
        ...next,
        uiDefaults: mergedUiDefaults,
      }
    })
    setPreferenceSource(source)
  }, [])

  const refreshUserPreferences = useCallback(async () => {
    try {
      const result = await loadUserPreferences()
      applyPreferencesFromServer(result.preferences, result.source)
    } catch (err) {
      console.error('Failed to load user preferences', err)
    }
  }, [applyPreferencesFromServer])

  // Auth listener: keep user and preferences in sync
  useEffect(() => {
    let isMounted = true
    try {
      const supabase = getSupabaseBrowserClient()
      supabase.auth.getSession().then(({ data }) => {
        if (!isMounted) return
        const sessionUser = data.session?.user
        if (sessionUser) {
          setUser({ id: sessionUser.id, email: sessionUser.email })
          void refreshUserPreferences()
        }
      })

      const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const sessionUser = session?.user
          if (sessionUser) {
            setUser({ id: sessionUser.id, email: sessionUser.email })
            void refreshUserPreferences()
          }
        }
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setPreferenceSource('local')
        }
      })

      return () => {
        isMounted = false
        subscription?.subscription.unsubscribe()
      }
    } catch (err) {
      console.error('Supabase auth setup failed', err)
    }
  }, [refreshUserPreferences])

  // Load preferences from localStorage on mount to retain unsaved UI choices (e.g., theme).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedTheme = resolveStoredTheme()
    const stored = localStorage.getItem('pf_local_preferences')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Preferences
        setPreferences((prev) => ({
          ...prev,
          ...parsed,
          uiDefaults: {
            ...(prev.uiDefaults ?? {}),
            ...(parsed.uiDefaults ?? {}),
            ...(storedTheme ? { theme: storedTheme } : {}),
          },
        }))
        setPreferenceSource((prev) => prev ?? 'local')
      } catch (e) {
        console.error('Failed to parse stored preferences', e)
      }
    }
  }, [])

  const handleSavePreferences = useCallback(
    async (override?: Preferences) => {
      const toSave = override ?? preferences
      setIsSavingPreferences(true)
      try {
        const result: SavePreferencesResult = await savePreferences(toSave)
        if (result.success) {
          setPreferenceSource(result.scope)
          setStoredTheme(parseTheme(toSave.uiDefaults?.theme))
          onToast?.(
            result.scope === 'user' ? 'Preferences saved to your account' : 'Preferences saved for this session'
          )
          if (result.scope === 'user') {
            void refreshUserPreferences()
          }
        }
      } catch (err) {
        console.error('Failed to save preferences', err)
      } finally {
        setIsSavingPreferences(false)
      }
    },
    [onToast, preferences, refreshUserPreferences]
  )

  const handleSignIn = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const next = typeof window !== 'undefined' ? window.location.href : '/'
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: origin ? `${origin}/auth/callback?next=${encodeURIComponent(next)}` : undefined,
          scopes: 'email',
        },
      })
      if (error) {
        console.error('Supabase OAuth sign-in failed', error)
      }
    } catch (err) {
      console.error('Supabase OAuth sign-in failed', err)
    }
  }, [])

  const handleEmailSignIn = useCallback(() => {
    const next = typeof window !== 'undefined' ? window.location.href : '/'
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = origin ? `${origin}/login?redirect=${encodeURIComponent(next)}` : '/login'
    if (typeof window !== 'undefined') {
      window.location.href = url
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
      setUser(null)
      setPreferenceSource('local')
    } catch (err) {
      console.error('Failed to sign out', err)
    }
  }, [])

  return {
    preferences,
    preferenceSource,
    user,
    isSavingPreferences,
    themePreference,
    updatePreferencesLocally,
    refreshUserPreferences,
    handleSavePreferences,
    handleSignIn,
    handleEmailSignIn,
    handleSignOut,
    setPreferenceSource,
    setPreferences,
  }
}
