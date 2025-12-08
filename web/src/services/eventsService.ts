'use server'

import { createServiceSupabaseClient } from '@/lib/supabase/server'
import { ensureSessionExists, getOrCreateActionSessionId } from '@/services/sessionService'

type EventPayload = Record<string, unknown>

/**
 * Append an event to the session event log. Returns the inserted event id or null on failure.
 */
export async function recordEvent(eventType: string, payload: EventPayload): Promise<string | null> {
  const sessionId = await getOrCreateActionSessionId()
  const supabase = createServiceSupabaseClient()

  await ensureSessionExists(supabase, sessionId)

  const attemptInsert = async () =>
    supabase
      .from('pf_events')
      .insert({
        session_id: sessionId,
        event_type: eventType,
        payload,
      })
      .select('id')
      .single()

  let { data, error } = await attemptInsert()

  // If session row is missing (e.g., old cookie), try to create and retry once.
  if (error && (error as { code?: string }).code === '23503') {
    await ensureSessionExists(supabase, sessionId)
    ;({ data, error } = await attemptInsert())
  }

  if (error) {
    console.error('Failed to record event', eventType, error)
    return null
  }

  return data?.id ?? null
}
