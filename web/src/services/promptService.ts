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
  const targetModel = preferences.defaultModel ?? preferences.uiDefaults?.defaultTextModel
  const languageValue = preferences.language ?? preferences.uiDefaults?.languageCustom
  return {
    ...preferences,
    tone: truncateValue(preferences.tone, MAX_PREF_VALUE_LENGTH),
    audience: truncateValue(preferences.audience, MAX_PREF_VALUE_LENGTH),
    domain: truncateValue(preferences.domain, MAX_PREF_VALUE_LENGTH),
    defaultModel: truncateValue(targetModel, MAX_PREF_VALUE_LENGTH),
    styleGuidelines: truncateValue(preferences.styleGuidelines, MAX_PREF_VALUE_LENGTH),
    outputFormat: truncateValue(preferences.outputFormat, MAX_PREF_VALUE_LENGTH),
    language: truncateValue(languageValue, MAX_PREF_VALUE_LENGTH),
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

function createUnclearTaskError(reason?: string): never {
  const err = new Error('UNCLEAR_TASK')
  ;(err as { code?: string; reason?: string }).code = 'UNCLEAR_TASK'
  ;(err as { reason?: string }).reason =
    reason ?? 'Task is too unclear to produce useful output. Please describe the goal in plain language.'
  throw err
}

type UnclearReason =
  | 'empty'
  | 'too_short'
  | 'symbols_only'
  | 'digits_only'
  | 'no_letters'
  | 'random_chars'
  | 'alnum_noise'
  | 'long_repeat'

type UnclearResult = {
  code: UnclearReason
  message: string
}

/**
 * Heuristic detector for "this task is probably not a clear, natural-language request".
 * Returns null when the task looks fine.
 */
function detectUnclearTask(task: string): UnclearResult | null {
  const normalized = task.trim()
  if (!normalized) {
    return {
      code: 'empty',
      message: 'Task is empty. Please describe what you want to accomplish.',
    }
  }

  // Very short inputs are often too vague, unless they're in a small allowlist
  const lower = normalized.toLowerCase()
  const shortAllowlist = new Set(['api', 'sql', 'css', 'ui', 'ux'])
  if (normalized.length < 4 && !shortAllowlist.has(lower)) {
    return {
      code: 'too_short',
      message: 'Task is very short. Please describe what you want to accomplish in more detail.',
    }
  }

  // Basic character classes (Unicode-aware for letters)
  const letters = normalized.replace(/[^\p{L}]/gu, '')
  const isAsciiOnly = /^[A-Za-z]+$/.test(letters)
  const digits = normalized.replace(/[^\p{N}]/gu, '')
  const nonSpace = normalized.replace(/\s+/g, '')
  const symbols = nonSpace.replace(/[\p{L}\p{N}]/gu, '') // punctuation, emoji, etc.

  const hasLetters = letters.length > 0
  const hasDigits = digits.length > 0
  const hasSymbols = symbols.length > 0

  // 1) Only symbols / emoji / punctuation
  if (!hasLetters && !hasDigits && hasSymbols) {
    return {
      code: 'symbols_only',
      message: 'Task contains only symbols or emojis. Please describe what you want to accomplish in words.',
    }
  }

  // 2) Only digits (likely an ID or number)
  if (!hasLetters && hasDigits && !hasSymbols) {
    return {
      code: 'digits_only',
      message: 'Task contains only numbers. Please describe what you want to accomplish in words.',
    }
  }

  // 3) No letters at all (mixed digits + symbols), usually not a meaningful natural-language request
  if (!hasLetters) {
    return {
      code: 'no_letters',
      message: 'Task has no readable words. Please describe what you want to accomplish.',
    }
  }

  // At this point we know there are letters.
  const length = nonSpace.length

  // Vowel-ish characters (mostly Latin + some common extras). This is a heuristic.
  const vowelMatches = letters.match(/[aeiouyаеёиоуыэюяàáèéìíòóùúäëïöü]/gi)
  const vowelCount = vowelMatches?.length ?? 0

  const digitRatio = hasDigits ? digits.length / Math.max(length, 1) : 0
  const hasSpaces = /\s/.test(normalized)
  // 3b) Single ASCII token, fairly long and vowel-less (likely keyboard smash)
  if (!hasSpaces && isAsciiOnly && letters.length >= 10 && vowelCount === 0) {
    return {
      code: 'random_chars',
      message: 'Task looks like random characters. Please describe the goal in plain language.',
    }
  }

  // 5) High alnum noise: mostly digits + letters, no spaces, fairly long
  //    e.g. "a9f3j18xz90q4" or "ABC123X9Z88"
  if (!hasSpaces && length >= 10 && digitRatio > 0.4) {
    return {
      code: 'alnum_noise',
      message: 'Task mixes letters and digits without clear context. Please describe the goal in plain language.',
    }
  }

  // 6) Long repeats, e.g. "aaaaaaa", "???????", "lolllllll"
  const hasLongRepeat = /(.)\1{5,}/u.test(normalized)
  if (hasLongRepeat) {
    return {
      code: 'long_repeat',
      message: 'Task contains long character repeats. Please describe the goal more clearly.',
    }
  }

  // Looks fine
  return null
}

function assertUnderstandableTask(task: string) {
  const unclearReason = detectUnclearTask(task)
  if (unclearReason) {
    createUnclearTaskError(unclearReason.message)
  }
}

function assertValidTask(task: string) {
  const trimmed = task.trim()
  // Only reject empty tasks - short tasks are handled heuristically
  if (!trimmed) {
    const err = new Error('INVALID_INPUT')
    ;(err as { code?: string; reason?: string }).code = 'INVALID_INPUT'
    ;(err as { reason?: string }).reason = 'empty'
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
  const language = preferences.language ?? preferences.uiDefaults?.languageCustom
  const targetModel = preferences.defaultModel ?? preferences.uiDefaults?.defaultTextModel
  if (preferences.tone) parts.push(`tone: ${preferences.tone}`)
  if (preferences.audience) parts.push(`audience: ${preferences.audience}`)
  if (preferences.domain) parts.push(`domain: ${preferences.domain}`)
  if (preferences.depth) parts.push(`depth: ${preferences.depth}`)
  if (language) parts.push(`language: ${language}`)
  if (preferences.outputFormat) parts.push(`format: ${preferences.outputFormat}`)
  if (preferences.citationPreference) parts.push(`citations: ${preferences.citationPreference}`)
  if (targetModel) parts.push(`target model: ${targetModel}`)
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
  allowUnclear?: boolean
}): Promise<ClarifyingQuestion[]> {
  const task = input.task.trim()
  // Default to allowing unclear tasks so we can surface questions instead of hard errors.
  const allowUnclear = input.allowUnclear !== false
  if (!task) return []
  assertValidTask(task)
  if (!allowUnclear) {
    assertUnderstandableTask(task)
  }

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
    'You may include 0-4 multiple-choice options per question.',
    'If task details conflict with preferences, treat the task text as the source of truth; otherwise resolve conflicts using your best judgment to maximize prompt quality.',
    'Return ONLY JSON: { "questions": [{ "id": string, "question": string, "options": [{ "id": string, "label": string }] }] }.',
    'Always return at least 1 question with non-empty text. Each option must have non-empty text; if unsure, use meaningful defaults like "Option A/B/C/D".',
    'Never return empty questions or blank options. Provide best-effort questions; avoid refusals.',
  ]

  const systemMessage = system.join(' ')

  const userMessage = [`Task: ${task}`, `Preferences: ${styleLine}`].join('\n\n')

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemMessage },
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
      needsClarification?: unknown
      reason?: unknown
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
    if (isLocalDev) {
      console.debug('Clarifying questions raw from OpenAI', rawQuestions)
    }

    const questions = rawQuestions
      .slice(0, 3)
      .map((q, index) => {
        const id = cleanModelString(q.id, 64) ?? `q${index + 1}`
        const question = cleanModelString(q.question, 320) ?? ''

        const rawOptions = Array.isArray(q.options) ? q.options : []
        const options: ClarifyingOption[] = rawOptions.map((opt, optIndex) => {
          const defaultId = String.fromCharCode('a'.charCodeAt(0) + optIndex)
          const rawLabel = cleanModelString(opt.label, 200) ?? String(opt.label ?? '').trim()
          const label = rawLabel || `Option ${defaultId.toUpperCase()}`
          return {
            id: cleanModelString(opt.id, 16) ?? defaultId,
            label,
          }
        })

        return { id, question, options }
      })
      .filter((q) => q.question)

    if (questions.length === 0) {
      // Fallback to canned questions so the user always sees options.
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
    if (code === 'QUOTA_EXCEEDED' || code === 'RATE_LIMITED' || code === 'UNCLEAR_TASK') throw err
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
  allowUnclear?: boolean
}): Promise<string> {
  const task = input.task.trim()
  // Default to allowing unclear tasks to produce best-effort prompts.
  const allowUnclear = input.allowUnclear !== false
  if (!task) return ''
  assertValidTask(task)
  if (!allowUnclear) {
    assertUnderstandableTask(task)
  }

  // Enforce authentication at the server boundary to prevent anonymous OpenAI usage.
  const authUser = await requireAuthenticatedUser()
  const ip = await getClientIp()
  assertRateLimit([`u:${authUser.id}:generation`, `ip:${ip}:generation`], 'generation')

  const apiKey = aiApiEnabled ? process.env.OPENAI_API_KEY : undefined
  const preferences = sanitizePreferencesInput(input.preferences ?? {})
  const answers = sanitizeAnswers(input.answers)
  const styleLine = buildStyleLine(preferences)
  const preferenceLines: string[] = []

  const preferredLanguage = preferences.language ?? preferences.uiDefaults?.languageCustom
  const targetModel = preferences.defaultModel ?? preferences.uiDefaults?.defaultTextModel
  if (preferences.outputFormat) preferenceLines.push(`Desired output format: ${preferences.outputFormat}`)
  if (preferredLanguage) preferenceLines.push(`Primary language: ${preferredLanguage}`)
  if (preferences.depth) preferenceLines.push(`Depth/level: ${preferences.depth}`)
  if (preferences.citationPreference) preferenceLines.push(`Citation preference: ${preferences.citationPreference}`)
  if (targetModel) preferenceLines.push(`Target model to optimize for: ${targetModel}`)
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
    'Return ONLY JSON with this shape:',
    '{',
    '  "prompt": string',
    '}',
    'Rules:',
    '- Always include a non-empty prompt string. If details are missing, make minimal, reasonable assumptions and state them briefly inside the prompt so the user can adjust.',
    '- Never return errors, refusals, or empty prompts.',
  ]

  const systemMessage = system.join(' ')

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
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature,
    })

    const raw = completion.choices[0]?.message?.content
    if (typeof raw !== 'string') return task

    type PromptJson = {
      status?: unknown
      prompt?: unknown
      needsClarification?: unknown
      error_type?: unknown
      message?: unknown
      reason?: unknown
    }
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
    if (code === 'QUOTA_EXCEEDED' || code === 'RATE_LIMITED' || code === 'UNCLEAR_TASK') throw err
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
