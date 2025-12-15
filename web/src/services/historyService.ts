'use server'

import { createServiceSupabaseClient } from '@/lib/supabase/server'
import { ensureSessionExists, getOrCreateActionSessionId } from '@/services/sessionService'
import type { GeneratedPrompt, HistoryItem } from '@/lib/types'

const REDACTION_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bsk-[A-Za-z0-9]{16,}\b/gi, replacement: '[redacted-key]' },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: '[email]' },
  { pattern: /(https?:\/\/[^\s]+)/gi, replacement: '[url]' },
  { pattern: /\bpk_live_[A-Za-z0-9]{16,}\b/gi, replacement: '[redacted-key]' },
]

function redactForStorage(value: string): string {
  const trimmed = value.trim()
  const limited = trimmed.slice(0, 4000)
  return REDACTION_PATTERNS.reduce((acc, { pattern, replacement }) => acc.replace(pattern, replacement), limited)
}

/**
 * Record a generation event for the current session.
 * Stored in pf_generations (session-scoped history, pruned server-side).
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
        task: redactForStorage(input.task),
        label: redactForStorage(input.prompt.label),
        body: redactForStorage(input.prompt.body),
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

  return generationId ?? null
}

/**
 * List recent prompt generations for the current session.
 * Returns empty array if session doesn't exist yet (first-time user).
 */
type ListHistoryParams = {
  limit?: number
  offset?: number
}

/**
 * List recent prompt generations for the current session within the last 30 days.
 * Returns empty array if session doesn't exist yet (first-time user).
 */
export async function listHistory({ limit = 20, offset = 0 }: ListHistoryParams = {}): Promise<HistoryItem[]> {
  const sessionId = await getOrCreateActionSessionId()
  const supabase = createServiceSupabaseClient()

  // Note: We don't need to ensure session exists for read operations
  // If session doesn't exist, the query will simply return empty results

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const createdAfter = thirtyDaysAgo.toISOString()

  const { data, error } = await supabase
    .from('pf_generations')
    .select('id, task, label, body, created_at')
    .eq('session_id', sessionId)
    .gte('created_at', createdAfter)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

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
