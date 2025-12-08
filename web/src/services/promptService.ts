'use server'

import OpenAI from 'openai'
import { GENERIC_QUESTION_TEMPLATES } from '@/app/terminalFallbacks'
import { clampTemperature, resolveTemperature } from '@/services/preferencesService'
import { recordEvent } from '@/services/eventsService'
import type { Preferences, ClarifyingQuestion, ClarifyingAnswer, ClarifyingOption } from '@/lib/types'

export type PreferencesInput = Preferences

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
