'use server'

import OpenAI from 'openai'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { GENERIC_QUESTION_TEMPLATES } from './terminalFallbacks'
import { SESSION_COOKIE } from '@/lib/constants'
import type {
  Preferences,
  GeneratedPrompt,
  HistoryItem,
  ClarifyingQuestion,
  ClarifyingAnswer,
  ClarifyingOption,
} from '@/lib/types'

// Re-export types for consumers that import from this module
export type { Preferences, GeneratedPrompt, HistoryItem, ClarifyingQuestion, ClarifyingAnswer, ClarifyingOption }

// Alias for backward compatibility
export type PreferencesInput = Preferences

/**
 * Ensure a session row exists in the database.
 * Uses upsert with ON CONFLICT DO NOTHING to handle race conditions safely.
 */
async function ensureSessionExists(supabase: ReturnType<typeof createServerSupabaseClient>, sessionId: string) {
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

async function getOrCreateActionSessionId(): Promise<string> {
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
    const supabase = createServerSupabaseClient()
    await ensureSessionExists(supabase, id)
  } catch {
    // Non-fatal; cookie is still set.
  }

  return id
}

type EventPayload = Record<string, unknown>

/**
 * Append an event to the session event log. Returns the inserted event id or null on failure.
 */
export async function recordEvent(eventType: string, payload: EventPayload): Promise<string | null> {
  const sessionId = await getOrCreateActionSessionId()
  const supabase = createServerSupabaseClient()

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

function buildStyleLine(preferences: PreferencesInput): string {
  const parts: string[] = []
  if (preferences.tone) parts.push(`tone: ${preferences.tone}`)
  if (preferences.audience) parts.push(`audience: ${preferences.audience}`)
  if (preferences.domain) parts.push(`domain: ${preferences.domain}`)

  if (parts.length === 0) {
    return 'Keep the style clear, concrete, and concise.'
  }

  return `Keep the style aligned with: ${parts.join(', ')}.`
}

/**
 * Step 1: Generate up to 3 clarifying questions (with optional choices)
 * tailored to the user's task. This is only called if the user agrees
 * to answer questions.
 */
export async function generateClarifyingQuestions(input: {
  task: string
  preferences?: PreferencesInput
}): Promise<ClarifyingQuestion[]> {
  const task = input.task.trim()
  if (!task) return []

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    // Fallback: use generic, deterministic clarifying questions so the full flow
    // can be tested without an OpenAI connection.
    const questions = GENERIC_QUESTION_TEMPLATES.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options.map((o) => ({ id: o.id, label: o.label })),
    }))

    void recordEvent('clarifying_questions_generated', {
      task,
      preferences: input.preferences ?? {},
      count: questions.length,
      source: 'fallback',
    })

    return questions
  }

  const client = new OpenAI({ apiKey })

  const styleLine = buildStyleLine(input.preferences ?? {})

  const system = [
    'You are PromptForge, an AI that designs short clarifying questions to improve prompts.',
    "Given a user's task, generate up to 3 short questions that will make the final prompt much more accurate.",
    'Each question should be tailored to the domain (coding, education, marketing, etc.).',
    'You may include 0-5 multiple-choice options per question.',
    'Return ONLY JSON with a `questions` array where each item has `id`, `question`, and `options`.',
  ].join(' ')

  const user = [`Task: ${task}`, `Preferences: ${styleLine}`].join('\n\n')

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      const fallback = GENERIC_QUESTION_TEMPLATES.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
      }))
      void recordEvent('clarifying_questions_generated', {
        task,
        preferences: input.preferences ?? {},
        count: fallback.length,
        source: 'fallback',
        reason: 'empty_openai_response',
      })
      return fallback
    }

    type QuestionsJson = {
      questions?: Array<{
        id?: unknown
        question?: unknown
        options?: Array<{ id?: unknown; label?: unknown }>
      }>
    }

    let parsed: QuestionsJson
    try {
      parsed = JSON.parse(raw) as QuestionsJson
    } catch {
      const fallback = GENERIC_QUESTION_TEMPLATES.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
      }))
      void recordEvent('clarifying_questions_generated', {
        task,
        preferences: input.preferences ?? {},
        count: fallback.length,
        source: 'fallback',
        parse_error: true,
      })
      return fallback
    }

    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : []

    const questions = rawQuestions
      .slice(0, 3)
      .map((q, index) => {
        const id = typeof q.id === 'string' && q.id.trim() ? q.id.trim() : `q${index + 1}`
        const question = typeof q.question === 'string' ? q.question.trim() : ''

        const rawOptions = Array.isArray(q.options) ? q.options : []
        const options: ClarifyingOption[] = rawOptions.map((opt, optIndex) => {
          const defaultId = String.fromCharCode('a'.charCodeAt(0) + optIndex)
          return {
            id: typeof opt.id === 'string' && opt.id.trim() ? opt.id.trim() : defaultId,
            label: typeof opt.label === 'string' ? opt.label.trim() : String(opt.label ?? '').trim(),
          }
        })

        return { id, question, options }
      })
      .filter((q) => q.question)

    if (questions.length === 0) {
      const fallback = GENERIC_QUESTION_TEMPLATES.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
      }))
      void recordEvent('clarifying_questions_generated', {
        task,
        preferences: input.preferences ?? {},
        count: fallback.length,
        source: 'fallback',
        reason: 'no_questions_after_parse',
      })
      return fallback
    }

    void recordEvent('clarifying_questions_generated', {
      task,
      preferences: input.preferences ?? {},
      count: questions.length,
      source: 'openai',
    })

    return questions
  } catch (err) {
    console.error('OpenAI clarifying question generation failed', err)
    const fallback = GENERIC_QUESTION_TEMPLATES.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options.map((o) => ({ id: o.id, label: o.label })),
    }))
    void recordEvent('clarifying_questions_generated', {
      task,
      preferences: input.preferences ?? {},
      count: fallback.length,
      source: 'fallback',
      error: String(err),
    })
    return fallback
  }
}

/**
 * Step 2: Generate the final, single prompt given the task and any clarifying answers.
 */
export async function generateFinalPrompt(input: {
  task: string
  preferences?: PreferencesInput
  answers?: ClarifyingAnswer[]
}): Promise<string> {
  const task = input.task.trim()
  if (!task) return ''

  const apiKey = process.env.OPENAI_API_KEY
  const styleLine = buildStyleLine(input.preferences ?? {})

  // Fallback: no API key, synthesize a simple direct-instruction prompt.
  if (!apiKey) {
    const prompt = ['You are an AI assistant.', styleLine, 'Task:', task].join('\n\n')

    void recordEvent('prompt_generated', {
      task,
      preferences: input.preferences ?? {},
      answers: input.answers ?? [],
      prompt,
      source: 'fallback',
    })

    return prompt
  }

  const client = new OpenAI({ apiKey })

  const system = [
    'You are PromptForge, an expert at writing single, high-quality prompts for another AI model.',
    "Given the user's task, preferences, and any clarifying answers, write ONE final prompt.",
    'The result should be ready to paste into another AI chat or API directly.',
    'Return ONLY JSON as { "prompt": "..." }.',
  ].join(' ')

  const parts: string[] = [`Task: ${task}`, `Preferences: ${styleLine}`]

  if (input.answers && input.answers.length > 0) {
    parts.push(
      'Clarifying answers:',
      ...input.answers.map((a, index) => `Q${index + 1} (${a.questionId}): ${a.question}\nAnswer: ${a.answer}`)
    )
  }

  const user = parts.join('\n\n')

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return task

    type PromptJson = { prompt?: unknown }
    let parsed: PromptJson
    try {
      parsed = JSON.parse(raw) as PromptJson
    } catch {
      return task
    }

    const prompt = typeof parsed.prompt === 'string' && parsed.prompt.trim() ? parsed.prompt.trim() : task

    void recordEvent('prompt_generated', {
      task,
      preferences: input.preferences ?? {},
      answers: input.answers ?? [],
      prompt,
      source: 'openai',
    })

    return prompt
  } catch (err) {
    console.error('OpenAI final prompt generation failed', err)
    return task
  }
}

/**
 * Step 3: Edit an existing prompt according to a user edit request.
 */
export async function editPrompt(input: {
  currentPrompt: string
  editRequest: string
  preferences?: PreferencesInput
}): Promise<string> {
  const current = input.currentPrompt.trim()
  const editRequest = input.editRequest.trim()
  if (!current || !editRequest) return current

  const apiKey = process.env.OPENAI_API_KEY
  const styleLine = buildStyleLine(input.preferences ?? {})

  if (!apiKey) {
    // Fallback: keep the existing prompt and surface the edit request as a comment
    // so the user can manually adjust it.
    const prompt = [
      current,
      '',
      '# OpenAI is not configured. Edit this prompt manually based on the request below:',
      `# Edit request: ${editRequest}`,
    ].join('\n')

    void recordEvent('prompt_edited', {
      editRequest,
      prompt,
      source: 'fallback',
    })

    return prompt
  }

  const client = new OpenAI({ apiKey })

  const system = [
    'You are PromptForge, an expert prompt editor.',
    'You receive an existing prompt and an edit request.',
    'You must return the edited prompt only.',
    'Do not add explanations or comments.',
    'Return ONLY JSON as { "prompt": "..." }.',
  ].join(' ')

  const user = [`Existing prompt:\n${current}`, `Edit request: ${editRequest}`, `Preferences: ${styleLine}`].join(
    '\n\n'
  )

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return current

    type PromptJson = { prompt?: unknown }
    let parsed: PromptJson
    try {
      parsed = JSON.parse(raw) as PromptJson
    } catch {
      return current
    }

    const prompt = typeof parsed.prompt === 'string' && parsed.prompt.trim() ? parsed.prompt.trim() : current

    void recordEvent('prompt_edited', {
      editRequest,
      prompt,
      source: 'openai',
    })

    return prompt
  } catch (err) {
    console.error('OpenAI prompt edit failed', err)
    return current
  }
}

/**
 * Persist the latest preferences for the current session.
 * Returns true if successful, false otherwise.
 */
export async function savePreferences(preferences: PreferencesInput): Promise<boolean> {
  const sessionId = await getOrCreateActionSessionId()
  const supabase = createServerSupabaseClient()

  // Ensure session exists first (preferences has FK to sessions)
  await ensureSessionExists(supabase, sessionId)

  const payload = {
    session_id: sessionId,
    tone: preferences.tone ?? null,
    audience: preferences.audience ?? null,
    domain: preferences.domain ?? null,
  }

  const attemptUpsert = async () => supabase.from('pf_preferences').upsert(payload, { onConflict: 'session_id' })

  let { error } = await attemptUpsert()

  // Retry once if FK constraint fails
  if (error && (error as { code?: string }).code === '23503') {
    await ensureSessionExists(supabase, sessionId)
    ;({ error } = await attemptUpsert())
  }

  if (error) {
    console.error('Failed to save preferences', error)
    return false
  }

  void recordEvent('preferences_updated', preferences)
  return true
}

/**
 * Record a generation event for the current session.
 * Stores in both pf_generations (for history) and pf_prompt_versions (for detailed tracking).
 *
 * Returns the generation ID if successful, null otherwise.
 */
export async function recordGeneration(input: { task: string; prompt: GeneratedPrompt }): Promise<string | null> {
  const sessionId = await getOrCreateActionSessionId()
  const supabase = createServerSupabaseClient()

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
  const supabase = createServerSupabaseClient()

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
