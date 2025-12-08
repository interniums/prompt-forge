'use server'

import { cookies } from 'next/headers'
import { SESSION_COOKIE } from '@/lib/constants'
import { createServiceSupabaseClient } from '@/lib/supabase/server'

/**
 * Ensure a session row exists in the database.
 * Uses upsert with ON CONFLICT DO NOTHING to handle race conditions safely.
 */
export async function ensureSessionExists(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  sessionId: string
): Promise<void> {
  // First try a quick read to avoid unnecessary writes
  const { data } = await supabase.from('pf_sessions').select('id').eq('id', sessionId).maybeSingle()
  if (data?.id) return

  // Use upsert with onConflict to handle race conditions
  // If another request already inserted this session, this will be a no-op
  const { error: insertError } = await supabase
    .from('pf_sessions')
    .upsert({ id: sessionId }, { onConflict: 'id', ignoreDuplicates: true })

  if (insertError && insertError.code !== '23505') {
    // 23505 = unique violation, which is fine (another request beat us)
    console.error('Failed to ensure session exists', insertError)
  }
}

/**
 * Read or create the session cookie and ensure the DB row exists.
 */
export async function getOrCreateActionSessionId(): Promise<string> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(SESSION_COOKIE)?.value
  if (existing) return existing

  const id = crypto.randomUUID()

  cookieStore.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    secure: process.env.NODE_ENV === 'production',
  })

  try {
    const supabase = createServiceSupabaseClient()
    await ensureSessionExists(supabase, id)
  } catch {
    // Non-fatal; cookie is still set.
  }

  return id
}
