import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SESSION_COOKIE } from '@/lib/constants'
import type { Preferences, HistoryItem, SessionState } from '@/lib/types'

// Re-export types for backward compatibility
export type { SessionState }
export type SessionPreferences = Preferences
export type SessionGeneration = HistoryItem

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
  const supabase = createServerSupabaseClient()

  if (!sessionIdFromCookie) {
    // No real session yet; return empty state without hitting the database.
    // Note: Session will be created on first server action (e.g., submitting a task)
    return {
      sessionId: 'pending', // Indicates session will be created on first action
      preferences: {},
      generations: [],
    }
  }

  const sessionId = sessionIdFromCookie

  const { data: prefsRow, error: prefsError } = await supabase
    .from('pf_preferences')
    .select('tone, audience, domain')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (prefsError) {
    console.error('Failed to load preferences', prefsError)
  }

  const preferences: SessionPreferences = {
    tone: prefsRow?.tone ?? undefined,
    audience: prefsRow?.audience ?? undefined,
    domain: prefsRow?.domain ?? undefined,
  }

  const { data: generationsRows, error: generationsError } = await supabase
    .from('pf_generations')
    .select('id, task, label, body, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (generationsError) {
    console.error('Failed to load generations history', generationsError)
  }

  const generations: SessionGeneration[] = (generationsRows ?? []).map((g) => ({
    id: g.id as string,
    task: g.task as string,
    label: g.label as string,
    body: g.body as string,
    created_at: g.created_at as string,
  }))

  return { sessionId, preferences, generations }
}
