'use server'

import { createServiceSupabaseClient } from '@/lib/supabase/server'
import { ensureSessionExists, getOrCreateActionSessionId } from '@/services/sessionService'
import { recordEvent } from '@/services/eventsService'
import type { GeneratedPrompt, HistoryItem } from '@/lib/types'

/**
 * Record a generation event for the current session.
 * Stores in both pf_generations (for history) and pf_prompt_versions (for detailed tracking).
 *
 * Returns the generation ID if successful, null otherwise.
 */
export async function recordGeneration(input: { task: string; prompt: GeneratedPrompt }): Promise<string | null> {
  const sessionId = await getOrCreateActionSessionId()
  const supabase = createServiceSupabaseClient()

  await ensureSessionExists(supabase, sessionId)

  // Helper to attempt the insert with FK retry
  const attemptInsert = async () =>
    supabase
      .from('pf_generations')
      .insert({
        session_id: sessionId,
        task: input.task,
        label: input.prompt.label,
        body: input.prompt.body,
      })
      .select('id')
      .single()

  let { data, error } = await attemptInsert()

  // Retry once if FK constraint fails (session might not exist yet)
  if (error && (error as { code?: string }).code === '23503') {
    await ensureSessionExists(supabase, sessionId)
    ;({ data, error } = await attemptInsert())
  }

  if (error) {
    console.error('Failed to record generation', error)
    return null
  }

  const generationId = data?.id as string | undefined

  // Record the event (non-blocking)
  void recordEvent('prompt_saved', {
    task: input.task,
    prompt: input.prompt,
    generationId,
  })

  // Also store in prompt versions for detailed restore (non-blocking, but log errors)
  const promptVersion = {
    session_id: sessionId,
    task: input.task,
    label: input.prompt.label,
    body: input.prompt.body,
    revision: null,
    source_event_id: null,
  }

  supabase
    .from('pf_prompt_versions')
    .insert(promptVersion)
    .then(({ error: pvError }) => {
      if (pvError) {
        console.error('Failed to record prompt version', pvError)
      }
    })

  return generationId ?? null
}

/**
 * List recent prompt generations for the current session.
 * Returns empty array if session doesn't exist yet (first-time user).
 */
export async function listHistory(limit = 10): Promise<HistoryItem[]> {
  const sessionId = await getOrCreateActionSessionId()
  const supabase = createServiceSupabaseClient()

  // Note: We don't need to ensure session exists for read operations
  // If session doesn't exist, the query will simply return empty results

  const { data, error } = await supabase
    .from('pf_generations')
    .select('id, task, label, body, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    // Don't log as error if it's just an empty result for new session
    if ((error as { code?: string }).code !== 'PGRST116') {
      console.error('Failed to load history', error)
    }
    return []
  }

  return (data ?? []).map((g) => ({
    id: String(g.id),
    task: String(g.task),
    label: String(g.label),
    body: String(g.body),
    created_at: String(g.created_at),
  }))
}
