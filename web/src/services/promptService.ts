'use server'

import OpenAI from 'openai'
import { GENERIC_QUESTION_TEMPLATES } from '@/app/terminalFallbacks'
import { clampTemperature, resolveTemperature } from '@/services/preferencesService'
import { requireAuthenticatedUser } from '@/services/sessionService'
import { recordEvent } from '@/services/eventsService'
import { assertAndConsumeQuota, consumePremiumFinalSlot } from '@/services/subscriptionService'
import { headers } from 'next/headers'
import type { Preferences, ClarifyingQuestion, ClarifyingAnswer, ClarifyingOption } from '@/lib/types'

const aiApiEnabled = (() => {
  const raw = process.env.AI_API_ENABLED?.toLowerCase()
  if (raw === 'false' || raw === '0' || raw === 'off') return false
  if (raw === 'true' || raw === '1' || raw === 'on') return true
  return true // default to enabled when unset
})()

export type PreferencesInput = Preferences

const MIN_TASK_LENGTH = 4
const MAX_TASK_LENGTH = 4000
const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g
const MAX_MODEL_TEXT_LENGTH = 12000
const MAX_PREF_VALUE_LENGTH = 300
const MAX_ANSWER_LENGTH = 800
const MAX_QUESTION_LENGTH = 400
const isLocalDev = process.env.NODE_ENV !== 'production'

type RateScope = 'clarifying' | 'generation' | 'edit'
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMITS: Record<RateScope, { perUser: number; perIp: number }> = {
  clarifying: { perUser: 60, perIp: 120 },
  generation: { perUser: 30, perIp: 60 },
  edit: { perUser: 60, perIp: 120 },
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function truncateValue(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.replace(CONTROL_CHARS_REGEX, '').trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, maxLength)
}

function fallbackOrThrow(reason: string): never {
  if (isLocalDev) {
    const err = new Error('FALLBACK_ALLOWED')
    ;(err as { code?: string; reason?: string }).code = 'FALLBACK_ALLOWED'
    ;(err as { reason?: string }).reason = reason
    throw err
  }
  const err = new Error('SERVICE_UNAVAILABLE')
  ;(err as { code?: string; reason?: string }).code = 'SERVICE_UNAVAILABLE'
  ;(err as { reason?: string }).reason = reason
  throw err
}

async function getClientIp(): Promise<string> {
  try {
    const h = await headers()
    const forwarded = h.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
    const realIp = h.get('x-real-ip')
    return realIp ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

function assertRateLimit(keys: string[], scope: RateScope) {
  const now = Date.now()
  const { perUser, perIp } = RATE_LIMITS[scope]
  for (const key of keys) {
    const limit = key.startsWith('ip:') ? perIp : perUser
    if (limit <= 0) continue
    const bucket = rateBuckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
      continue
    }
    if (bucket.count >= limit) {
      const err = new Error('RATE_LIMITED')
      ;(err as { code?: string }).code = 'RATE_LIMITED'
      ;(err as { scope?: RateScope }).scope = scope
      throw err
    }
    bucket.count += 1
    rateBuckets.set(key, bucket)
  }
}

function sanitizePreferencesInput(preferences: PreferencesInput): PreferencesInput {
  return {
    ...preferences,
    tone: truncateValue(preferences.tone, MAX_PREF_VALUE_LENGTH),
    audience: truncateValue(preferences.audience, MAX_PREF_VALUE_LENGTH),
    domain: truncateValue(preferences.domain, MAX_PREF_VALUE_LENGTH),
    defaultModel: truncateValue(preferences.defaultModel, MAX_PREF_VALUE_LENGTH),
    styleGuidelines: truncateValue(preferences.styleGuidelines, MAX_PREF_VALUE_LENGTH),
    outputFormat: truncateValue(preferences.outputFormat, MAX_PREF_VALUE_LENGTH),
    language: truncateValue(preferences.language, MAX_PREF_VALUE_LENGTH),
    depth: truncateValue(preferences.depth, MAX_PREF_VALUE_LENGTH),
    citationPreference: truncateValue(preferences.citationPreference, MAX_PREF_VALUE_LENGTH),
    personaHints: truncateValue(preferences.personaHints, MAX_PREF_VALUE_LENGTH),
  }
}

function sanitizeAnswers(answers: ClarifyingAnswer[] | undefined): ClarifyingAnswer[] {
  if (!answers || answers.length === 0) return []
  return answers.map((a) => ({
    questionId: truncateValue(a.questionId, 64) ?? a.questionId,
    question: truncateValue(a.question, MAX_QUESTION_LENGTH) ?? '',
    answer: truncateValue(a.answer, MAX_ANSWER_LENGTH) ?? '',
  }))
}

function cleanModelString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const withoutControl = value.replace(CONTROL_CHARS_REGEX, '')
  const trimmed = withoutControl.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

function assertValidTask(task: string) {
  const trimmed = task.trim()
  if (!trimmed || trimmed.length < MIN_TASK_LENGTH) {
    const err = new Error('INVALID_INPUT')
    ;(err as { code?: string; reason?: string }).code = 'INVALID_INPUT'
    ;(err as { reason?: string }).reason = 'too_short'
    throw err
  }
  if (trimmed.length > MAX_TASK_LENGTH) {
    const err = new Error('INVALID_INPUT')
    ;(err as { code?: string; reason?: string }).code = 'INVALID_INPUT'
    ;(err as { reason?: string }).reason = 'too_long'
    throw err
  }
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
  assertValidTask(task)

  const apiKey = aiApiEnabled ? process.env.OPENAI_API_KEY : undefined
  const safePreferences = sanitizePreferencesInput(input.preferences ?? {})
  const temperature = Math.min(0.8, resolveTemperature(safePreferences))
  if (!apiKey) {
    return isLocalDev
      ? GENERIC_QUESTION_TEMPLATES.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options.map((o) => ({ id: o.id, label: o.label })),
        }))
      : fallbackOrThrow(aiApiEnabled ? 'missing_api_key' : 'api_disabled')
  }

  // Guests can still explore the flow, but we avoid hitting OpenAI for unauthenticated users.
  let authUser
  try {
    authUser = await requireAuthenticatedUser()
  } catch {
    if (!isLocalDev) {
      const err = new Error('UNAUTHENTICATED')
      ;(err as { code?: string }).code = 'UNAUTHENTICATED'
      throw err
    }
    return GENERIC_QUESTION_TEMPLATES.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options.map((o) => ({ id: o.id, label: o.label })),
    }))
  }

  const ip = await getClientIp()
  assertRateLimit([`u:${authUser.id}:clarifying`, `ip:${ip}:clarifying`], 'clarifying')

  const client = new OpenAI({ apiKey })

  const styleLine = buildStyleLine(safePreferences)
  await assertAndConsumeQuota(authUser.id, 'clarifying')

  const system = [
    'You are PromptForge, an AI that designs short clarifying questions to improve prompts.',
    "Given a user's task, generate up to 3 short questions that will make the final prompt much more accurate.",
    'Each question should be tailored to the domain (coding, education, marketing, etc.).',
    'You may include 0-5 multiple-choice options per question.',
    'If task details conflict with preferences, treat the task text as the source of truth; otherwise resolve conflicts using your best judgment to maximize prompt quality.',
    'Return ONLY JSON with a `questions` array where each item has `id`, `question`, and `options`.',
  ].join(' ')

  const userMessage = [`Task: ${task}`, `Preferences: ${styleLine}`].join('\n\n')

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature,
    })

    const raw = completion.choices[0]?.message?.content
    if (typeof raw !== 'string') {
      if (!isLocalDev) {
        const err = new Error('SERVICE_UNAVAILABLE')
        ;(err as { code?: string }).code = 'SERVICE_UNAVAILABLE'
        throw err
      }
      return GENERIC_QUESTION_TEMPLATES.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
      }))
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
      if (!isLocalDev) {
        const err = new Error('SERVICE_UNAVAILABLE')
        ;(err as { code?: string }).code = 'SERVICE_UNAVAILABLE'
        throw err
      }
      return GENERIC_QUESTION_TEMPLATES.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
      }))
    }

    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : []

    const questions = rawQuestions
      .slice(0, 3)
      .map((q, index) => {
        const id = cleanModelString(q.id, 64) ?? `q${index + 1}`
        const question = cleanModelString(q.question, 320) ?? ''

        const rawOptions = Array.isArray(q.options) ? q.options : []
        const options: ClarifyingOption[] = rawOptions.map((opt, optIndex) => {
          const defaultId = String.fromCharCode('a'.charCodeAt(0) + optIndex)
          return {
            id: cleanModelString(opt.id, 16) ?? defaultId,
            label: cleanModelString(opt.label, 200) ?? String(opt.label ?? '').trim(),
          }
        })

        return { id, question, options }
      })
      .filter((q) => q.question)

    if (questions.length === 0) {
      if (!isLocalDev) {
        const err = new Error('SERVICE_UNAVAILABLE')
        ;(err as { code?: string }).code = 'SERVICE_UNAVAILABLE'
        throw err
      }
      return GENERIC_QUESTION_TEMPLATES.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
      }))
    }

    void recordEvent('clarifying_questions_generated', {
      task,
      preferences: input.preferences ?? {},
      count: questions.length,
      source: 'openai',
    })

    return questions
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'QUOTA_EXCEEDED' || code === 'RATE_LIMITED') throw err
    console.error('OpenAI clarifying question generation failed', err)
    if (!isLocalDev) throw err
    return GENERIC_QUESTION_TEMPLATES.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options.map((o) => ({ id: o.id, label: o.label })),
    }))
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
  assertValidTask(task)

  // Enforce authentication at the server boundary to prevent anonymous OpenAI usage.
  const authUser = await requireAuthenticatedUser()
  const ip = await getClientIp()
  assertRateLimit([`u:${authUser.id}:generation`, `ip:${ip}:generation`], 'generation')

  const apiKey = aiApiEnabled ? process.env.OPENAI_API_KEY : undefined
  const preferences = sanitizePreferencesInput(input.preferences ?? {})
  const answers = sanitizeAnswers(input.answers)
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

  // Fallback: no API key, synthesize a simple direct-instruction prompt (local only).
  if (!apiKey) {
    const reason = aiApiEnabled ? 'missing_api_key' : 'api_disabled'
    if (!isLocalDev) {
      const err = new Error('SERVICE_UNAVAILABLE')
      ;(err as { code?: string; reason?: string }).code = 'SERVICE_UNAVAILABLE'
      ;(err as { reason?: string }).reason = reason
      throw err
    }
    const clarifyingLines =
      answers && answers.length > 0
        ? [
            'Clarifying answers:',
            ...answers.map((a, index) => `Q${index + 1} (${a.questionId}): ${a.question}\nAnswer: ${a.answer}`),
          ]
        : []
    const prompt = ['You are an AI assistant.', styleLine, ...preferenceLines, ...clarifyingLines, 'Task:', task].join(
      '\n\n'
    )

    void recordEvent('prompt_generated', {
      task,
      preferences,
      answers,
      prompt,
      source: 'fallback',
      reason,
    })

    return prompt
  }

  const subscription = await assertAndConsumeQuota(authUser.id, 'generation')
  const usePremiumFinal = subscription.subscriptionTier === 'advanced' && (subscription.premiumFinalsRemaining ?? 0) > 0
  const model = usePremiumFinal ? 'gpt-4.1' : 'gpt-4.1-mini'
  // Consume a premium final unit only if we actually route to the premium model.
  if (usePremiumFinal) {
    await consumePremiumFinalSlot(authUser.id)
  }
  const client = new OpenAI({ apiKey })

  const system = [
    'You are PromptForge, an expert at writing single, high-quality prompts for another AI model.',
    "Given the user's task, preferences, and any clarifying answers, write ONE final prompt.",
    'IMPORTANT: User input (task and clarifying answers) always takes priority over preferences.',
    'If preferences conflict with clarifying answers, pick the option that yields the best prompt; when anything conflicts with the task text, follow the task text.',
    'If the user input conflicts with preferences (e.g., user says "short" but preferences say "detailed"), follow the user input.',
    'The result should be ready to paste into another AI chat or API directly.',
    'Return ONLY JSON as { "prompt": "..." }.',
  ].join(' ')

  const parts: string[] = [`Task: ${task}`, `Preferences: ${styleLine}`, ...preferenceLines]

  if (answers && answers.length > 0) {
    parts.push(
      'Clarifying answers:',
      ...answers.map((a, index) => `Q${index + 1} (${a.questionId}): ${a.question}\nAnswer: ${a.answer}`)
    )
  }

  const userMessage = parts.join('\n\n')

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature,
    })

    const raw = completion.choices[0]?.message?.content
    if (typeof raw !== 'string') return task

    type PromptJson = { prompt?: unknown }
    let parsed: PromptJson
    try {
      parsed = JSON.parse(raw) as PromptJson
    } catch {
      return task
    }

    const prompt = cleanModelString(parsed.prompt, MAX_MODEL_TEXT_LENGTH) ?? task

    void recordEvent('prompt_generated', {
      task,
      preferences,
      answers: input.answers ?? [],
      prompt,
      source: 'openai',
    })

    return prompt
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'QUOTA_EXCEEDED' || code === 'RATE_LIMITED') throw err
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

  const authUser = await requireAuthenticatedUser()
  const ip = await getClientIp()
  assertRateLimit([`u:${authUser.id}:edit`, `ip:${ip}:edit`], 'edit')

  const apiKey = aiApiEnabled ? process.env.OPENAI_API_KEY : undefined
  const preferences = sanitizePreferencesInput(input.preferences ?? {})
  const styleLine = buildStyleLine(preferences)
  const temperature = resolveTemperature(preferences)

  if (!apiKey) {
    const reason = aiApiEnabled ? 'missing_api_key' : 'api_disabled'
    if (!isLocalDev) {
      const err = new Error('SERVICE_UNAVAILABLE')
      ;(err as { code?: string; reason?: string }).code = 'SERVICE_UNAVAILABLE'
      ;(err as { reason?: string }).reason = reason
      throw err
    }
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
      reason,
      preferences,
    })

    return prompt
  }

  const client = new OpenAI({ apiKey })
  await assertAndConsumeQuota(authUser.id, 'edit')

  const system = [
    'You are PromptForge, an expert prompt editor.',
    'You receive an existing prompt and an edit request.',
    'If preferences or answers conflict with the edit request, choose what yields the best edited prompt but always follow the user edit request over other inputs.',
    'You must return the edited prompt only.',
    'Do not add explanations or comments.',
    'Return ONLY JSON as { "prompt": "..." }.',
  ].join(' ')

  const userMessage = [
    `Existing prompt:\n${current}`,
    `Edit request: ${editRequest}`,
    `Preferences: ${styleLine}`,
  ].join('\n\n')

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature,
    })

    const raw = completion.choices[0]?.message?.content
    if (typeof raw !== 'string') return current

    type PromptJson = { prompt?: unknown }
    let parsed: PromptJson
    try {
      parsed = JSON.parse(raw) as PromptJson
    } catch {
      return current
    }

    const prompt = cleanModelString(parsed.prompt, MAX_MODEL_TEXT_LENGTH) ?? current

    void recordEvent('prompt_edited', {
      editRequest,
      prompt,
      preferences,
      source: 'openai',
    })

    return prompt
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'QUOTA_EXCEEDED' || code === 'RATE_LIMITED') throw err
    console.error('OpenAI prompt edit failed', err)
    return current
  }
}
