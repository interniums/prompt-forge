'use server'

import OpenAI from 'openai'
import { cookies } from 'next/headers'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase/server'
import { GENERIC_QUESTION_TEMPLATES } from './terminalFallbacks'
import { SESSION_COOKIE, DEFAULT_TEMPERATURE } from '@/lib/constants'
import type {
  Preferences,
  GeneratedPrompt,
  HistoryItem,
  ClarifyingQuestion,
  ClarifyingAnswer,
  ClarifyingOption,
  UserIdentity,
  PreferenceSource,
} from '@/lib/types'

// Re-export types for consumers that import from this module
export type { Preferences, GeneratedPrompt, HistoryItem, ClarifyingQuestion, ClarifyingAnswer, ClarifyingOption }

// Alias for backward compatibility
export type PreferencesInput = Preferences

/**
 * Ensure a session row exists in the database.
 * Uses upsert with ON CONFLICT DO NOTHING to handle race conditions safely.
 */
async function ensureSessionExists(supabase: ReturnType<typeof createServiceSupabaseClient>, sessionId: string) {
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
    const supabase = createServiceSupabaseClient()
    await ensureSessionExists(supabase, id)
  } catch {
    // Non-fatal; cookie is still set.
  }

  return id
}

type EventPayload = Record<string, unknown>

type PreferenceRow = {
  tone?: unknown
  audience?: unknown
  domain?: unknown
  default_model?: unknown
  temperature?: unknown
  style_guidelines?: unknown
  output_format?: unknown
  language?: unknown
  depth?: unknown
  citation_preference?: unknown
  persona_hints?: unknown
  ui_defaults?: unknown
  sharing_links?: unknown
}

export type SavePreferencesResult = {
  success: boolean
  scope: PreferenceSource
  message?: string
}

function coerceString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return undefined
}

function coerceObject<T extends Record<string, unknown>>(value: unknown): T | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as T
  }
  return undefined
}

function mapPreferences(row?: PreferenceRow | null): Preferences {
  if (!row) return {}
  return {
    tone: coerceString(row.tone),
    audience: coerceString(row.audience),
    domain: coerceString(row.domain),
    defaultModel: coerceString(row.default_model),
    temperature: typeof row.temperature === 'number' && !Number.isNaN(row.temperature) ? row.temperature : null,
    styleGuidelines: coerceString(row.style_guidelines),
    outputFormat: coerceString(row.output_format),
    language: coerceString(row.language),
    depth: coerceString(row.depth),
    citationPreference: coerceString(row.citation_preference),
    personaHints: coerceString(row.persona_hints),
    uiDefaults: coerceObject(row.ui_defaults),
    sharingLinks: coerceObject(row.sharing_links),
  }
}

function clampTemperature(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  const clamped = Math.min(1, Math.max(0, value))
  return Number.isFinite(clamped) ? clamped : null
}

function resolveTemperature(preferences?: PreferencesInput): number {
  const candidate = clampTemperature(preferences?.temperature)
  if (candidate === null) return DEFAULT_TEMPERATURE
  return candidate
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
      'tone, audience, domain, default_model, temperature, style_guidelines, output_format, language, depth, citation_preference, persona_hints, ui_defaults, sharing_links'
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

function buildStyleLine(preferences: PreferencesInput): string {
  const parts: string[] = []
  if (preferences.tone) parts.push(`tone: ${preferences.tone}`)
  if (preferences.audience) parts.push(`audience: ${preferences.audience}`)
  if (preferences.domain) parts.push(`domain: ${preferences.domain}`)
  if (preferences.depth) parts.push(`depth: ${preferences.depth}`)
  if (preferences.language) parts.push(`language: ${preferences.language}`)
  if (preferences.outputFormat) parts.push(`format: ${preferences.outputFormat}`)
  if (preferences.citationPreference) parts.push(`citations: ${preferences.citationPreference}`)
  if (preferences.defaultModel) parts.push(`target model: ${preferences.defaultModel}`)
  const temp = clampTemperature(preferences.temperature)
  if (temp !== null) parts.push(`temperature bias: ${temp}`)
  if (preferences.styleGuidelines) parts.push(`style: ${preferences.styleGuidelines}`)
  if (preferences.personaHints) parts.push(`persona: ${preferences.personaHints}`)

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
  const temperature = Math.min(0.8, resolveTemperature(input.preferences))
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
      temperature,
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
  const preferences = input.preferences ?? {}
  const styleLine = buildStyleLine(preferences)
  const preferenceLines: string[] = []

  if (preferences.outputFormat) preferenceLines.push(`Desired output format: ${preferences.outputFormat}`)
  if (preferences.language) preferenceLines.push(`Primary language: ${preferences.language}`)
  if (preferences.depth) preferenceLines.push(`Depth/level: ${preferences.depth}`)
  if (preferences.citationPreference) preferenceLines.push(`Citation preference: ${preferences.citationPreference}`)
  if (preferences.defaultModel) preferenceLines.push(`Target model to optimize for: ${preferences.defaultModel}`)
  if (preferences.personaHints) preferenceLines.push(`Persona hints: ${preferences.personaHints}`)
  if (preferences.styleGuidelines) preferenceLines.push(`Style guidelines: ${preferences.styleGuidelines}`)

  const temperature = resolveTemperature(preferences)

  // Fallback: no API key, synthesize a simple direct-instruction prompt.
  if (!apiKey) {
    const prompt = ['You are an AI assistant.', styleLine, ...preferenceLines, 'Task:', task].join('\n\n')

    void recordEvent('prompt_generated', {
      task,
      preferences,
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
    'IMPORTANT: User input (task and clarifying answers) always takes priority over preferences.',
    'If the user input conflicts with preferences (e.g., user says "short" but preferences say "detailed"), follow the user input.',
    'The result should be ready to paste into another AI chat or API directly.',
    'Return ONLY JSON as { "prompt": "..." }.',
  ].join(' ')

  const parts: string[] = [`Task: ${task}`, `Preferences: ${styleLine}`, ...preferenceLines]

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
      temperature,
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
      preferences,
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
  const preferences = input.preferences ?? {}
  const styleLine = buildStyleLine(preferences)
  const temperature = resolveTemperature(preferences)

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
      preferences,
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
      temperature,
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
      preferences,
      source: 'openai',
    })

    return prompt
  } catch (err) {
    console.error('OpenAI prompt edit failed', err)
    return current
  }
}

/**
 * Persist preferences for the authenticated user when available; otherwise
 * fall back to session-scoped storage (tone/audience/domain only).
 */
export async function savePreferences(preferences: PreferencesInput): Promise<SavePreferencesResult> {
  const { supabase, user } = await getAuthClientWithUser()

  if (user) {
    const payload = {
      user_id: user.id,
      tone: preferences.tone ?? null,
      audience: preferences.audience ?? null,
      domain: preferences.domain ?? null,
      default_model: preferences.defaultModel ?? null,
      temperature: clampTemperature(preferences.temperature),
      style_guidelines: preferences.styleGuidelines ?? null,
      output_format: preferences.outputFormat ?? null,
      language: preferences.language ?? null,
      depth: preferences.depth ?? null,
      citation_preference: preferences.citationPreference ?? null,
      persona_hints: preferences.personaHints ?? null,
      ui_defaults: preferences.uiDefaults ?? null,
      sharing_links: preferences.sharingLinks ?? null,
      do_not_ask_again: preferences.doNotAskAgain ?? null,
      updated_at: new Date().toISOString(),
    }

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

  const payload = {
    session_id: sessionId,
    tone: preferences.tone ?? null,
    audience: preferences.audience ?? null,
    domain: preferences.domain ?? null,
  }

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
