import { cookies } from 'next/headers'
import { createServiceSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { SESSION_COOKIE } from '@/lib/constants'
import type { Preferences, SessionState, PreferenceSource, UserIdentity } from '@/lib/types'
import { mapPreferences } from '@/services/preferencesService'

/**
 * Validate that a string is a valid UUID v4 format.
 * Prevents malformed session IDs from being used.
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Read the session id from cookies in a Server Component context.
 * Does not create or modify cookies (writes are only allowed in Server Actions
 * and Route Handlers in Next 16).
 *
 * Returns null if:
 * - No cookie exists
 * - Cookie value is not a valid UUID (security measure)
 */
export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(SESSION_COOKIE)?.value

  if (!existing) return null

  // Validate UUID format to prevent injection attacks
  if (!isValidUUID(existing)) {
    console.warn('Invalid session ID format in cookie, ignoring')
    return null
  }

  return existing
}

export async function loadSessionState(): Promise<SessionState> {
  const sessionIdFromCookie = await getSessionId()
  const serviceSupabase = createServiceSupabaseClient()
  const authSupabase = await createServerSupabaseClient()

  const {
    data: { user: authUser },
    error: userError,
  } = await authSupabase.auth.getUser()

  if (userError && userError.message !== 'Auth session missing!') {
    console.error('Failed to read auth user', userError)
  }

  const user: UserIdentity | null = authUser ? { id: authUser.id, email: authUser.email } : null
  let preferences: Preferences = {}
  let preferencesSource: PreferenceSource = 'none'
  let isFirstLogin = false

  if (!sessionIdFromCookie) {
    // No real session yet; return empty state without hitting the database.
    // Note: Session will be created on first server action (e.g., submitting a task)
    return {
      sessionId: 'pending', // Indicates session will be created on first action
      preferences,
      preferencesSource,
      user,
      generations: [],
      isFirstLogin: false,
    }
  }

  const sessionId = sessionIdFromCookie

  // Prefer user preferences when signed in; otherwise fall back to session-scoped prefs
  if (user) {
    const { data: userPrefs, error: userPrefsError } = await authSupabase
      .from('user_preferences')
      .select(
        'tone, audience, domain, default_model, temperature, style_guidelines, output_format, language, depth, citation_preference, persona_hints, ui_defaults, sharing_links, do_not_ask_again, created_at'
      )
      .maybeSingle()

    if (userPrefsError && userPrefsError.code !== 'PGRST116') {
      console.error('Failed to load user preferences', userPrefsError)
    }

    if (userPrefs) {
      preferences = mapPreferences(userPrefs)
      preferencesSource = 'user'
    } else {
      // No user preferences yet - this is a first login
      isFirstLogin = true
    }
  }

  if (preferencesSource === 'none') {
    const { data: prefsRow, error: prefsError } = await serviceSupabase
      .from('pf_preferences')
      .select('tone, audience, domain')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (prefsError && prefsError.code !== 'PGRST116') {
      console.error('Failed to load session preferences', prefsError)
    }

    preferences = {
      tone: prefsRow?.tone ?? undefined,
      audience: prefsRow?.audience ?? undefined,
      domain: prefsRow?.domain ?? undefined,
    }
    preferencesSource = prefsRow ? 'session' : 'none'
  }

  const { data: generationsRows, error: generationsError } = await serviceSupabase
    .from('pf_generations')
    .select('id, task, label, body, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (generationsError) {
    console.error('Failed to load generations history', generationsError)
  }

  const generations = (generationsRows ?? []).map((g) => ({
    id: g.id as string,
    task: g.task as string,
    label: g.label as string,
    body: g.body as string,
    created_at: g.created_at as string,
  }))

  return { sessionId, preferences, preferencesSource, user, generations, isFirstLogin }
}
