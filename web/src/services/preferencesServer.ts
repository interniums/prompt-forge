'use server'

import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase/server'
import {
  mapPreferences,
  buildUserPreferencesPayload,
  buildSessionPreferencesPayload,
} from '@/services/preferencesService'
import { ensureSessionExists, getOrCreateActionSessionId } from '@/services/sessionService'
import { recordEvent } from '@/services/eventsService'
import type { Preferences, PreferenceSource, UserIdentity } from '@/lib/types'

export type SavePreferencesResult = {
  success: boolean
  scope: PreferenceSource
  message?: string
}

async function getAuthClientWithUser(): Promise<{
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
  user: UserIdentity | null
}> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error && error.message !== 'Auth session missing!') {
    console.error('Failed to read auth user', error)
  }

  return {
    supabase,
    user: user ? { id: user.id, email: user.email } : null,
  }
}

export async function getCurrentUser(): Promise<UserIdentity | null> {
  const { user } = await getAuthClientWithUser()
  return user
}

export async function loadUserPreferences(): Promise<{ preferences: Preferences; source: PreferenceSource }> {
  const { supabase, user } = await getAuthClientWithUser()
  if (!user) return { preferences: {}, source: 'none' }

  const { data, error } = await supabase
    .from('user_preferences')
    .select(
      'tone, audience, domain, default_model, temperature, style_guidelines, output_format, language, depth, citation_preference, persona_hints, ui_defaults, sharing_links, do_not_ask_again'
    )
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to load user preferences', error)
  }

  return {
    preferences: mapPreferences(data ?? undefined),
    source: data ? 'user' : 'none',
  }
}

/**
 * Persist preferences for the authenticated user when available; otherwise
 * fall back to session-scoped storage (tone/audience/domain only).
 */
export async function savePreferences(preferences: Preferences): Promise<SavePreferencesResult> {
  const { supabase, user } = await getAuthClientWithUser()

  if (user) {
    const payload = buildUserPreferencesPayload(preferences, user.id, new Date().toISOString())

    const { error } = await supabase.from('user_preferences').upsert(payload, { onConflict: 'user_id' })

    if (error) {
      console.error('Failed to save user preferences', error)
      return { success: false, scope: 'user', message: error.message }
    }

    void recordEvent('preferences_updated', { scope: 'user', ...preferences })
    return { success: true, scope: 'user' }
  }

  // Guest/anonymous fallback: persist the subset of preferences tied to the session.
  const sessionId = await getOrCreateActionSessionId()
  const serviceSupabase = createServiceSupabaseClient()

  await ensureSessionExists(serviceSupabase, sessionId)

  const payload = buildSessionPreferencesPayload(preferences, sessionId)

  const attemptUpsert = async () => serviceSupabase.from('pf_preferences').upsert(payload, { onConflict: 'session_id' })

  let { error } = await attemptUpsert()

  // Retry once if FK constraint fails
  if (error && (error as { code?: string }).code === '23503') {
    await ensureSessionExists(serviceSupabase, sessionId)
    ;({ error } = await attemptUpsert())
  }

  if (error) {
    console.error('Failed to save session preferences', error)
    return { success: false, scope: 'session', message: error.message }
  }

  void recordEvent('preferences_updated', { scope: 'session', ...preferences })
  return { success: true, scope: 'session' }
}
