'use client'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GENERIC_QUESTION_TEMPLATES } from '@/app/terminalFallbacks'
import { generateClarifyingQuestions, generateFinalPrompt } from '@/services/promptService'
import { requireAuthenticatedUser } from '@/services/sessionService'

vi.mock('@/services/sessionService', () => ({
  requireAuthenticatedUser: vi.fn(),
}))

vi.mock('@/services/eventsService', () => ({
  recordEvent: vi.fn(),
}))

vi.mock('@/services/subscriptionService', () => ({
  assertAndConsumeQuota: vi.fn(),
}))

// OpenAI is mocked to prevent any network calls during tests.
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  }
})

const requireAuthenticatedUserMock = vi.mocked(requireAuthenticatedUser)

describe('promptService auth guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-key'
  })

  it('returns fallback clarifying questions when user is unauthenticated', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new Error('UNAUTHENTICATED'))

    const result = await generateClarifyingQuestions({
      task: 'Write a blog post about prompt engineering',
      preferences: {},
    })

    expect(requireAuthenticatedUserMock).toHaveBeenCalled()
    expect(result).toHaveLength(GENERIC_QUESTION_TEMPLATES.length)
    expect(result[0]).toMatchObject({
      id: GENERIC_QUESTION_TEMPLATES[0].id,
      question: GENERIC_QUESTION_TEMPLATES[0].question,
    })
  })

  it('rejects final prompt generation when user is unauthenticated', async () => {
    const error = new Error('UNAUTHENTICATED') as Error & { code?: string }
    error.code = 'UNAUTHENTICATED'
    requireAuthenticatedUserMock.mockRejectedValue(error)

    await expect(
      generateFinalPrompt({
        task: 'Generate a concise product brief',
        preferences: {},
        answers: [],
      })
    ).rejects.toThrow(/UNAUTHENTICATED/)
  })

  // Short tasks are now handled heuristically, not rejected

  it('rejects overly long tasks with INVALID_INPUT', async () => {
    requireAuthenticatedUserMock.mockResolvedValue({ id: 'user-1', email: 'a@b.com' })
    const longTask = 'a'.repeat(5000)
    await expect(
      generateFinalPrompt({
        task: longTask,
        preferences: {},
        answers: [],
      })
    ).rejects.toThrow(/INVALID_INPUT/)
  })
})
