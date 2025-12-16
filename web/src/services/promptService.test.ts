'use client'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GENERIC_QUESTION_TEMPLATES } from '@/app/terminalFallbacks'
import { generateClarifyingQuestions, generateFinalPrompt } from '@/services/promptService'
import { requireAuthenticatedUser } from '@/services/sessionService'
import { consumeFreePromptAllowance } from '@/services/freeUsageService'

vi.mock('@/services/sessionService', () => ({
  requireAuthenticatedUser: vi.fn(),
}))

vi.mock('@/services/eventsService', () => ({
  recordEvent: vi.fn(),
}))

vi.mock('@/services/subscriptionService', () => ({
  assertAndConsumeQuota: vi.fn(),
  consumePremiumFinalSlot: vi.fn(),
  loadSubscription: vi.fn().mockResolvedValue({ subscriptionTier: 'expired' }),
}))

vi.mock('@/services/subscriptionHelpers', () => ({
  hasActiveSubscription: vi.fn().mockReturnValue(false),
}))

vi.mock('@/services/freeUsageService', () => ({
  consumeFreePromptAllowance: vi.fn(async () => ({ allowed: true, remaining: 0, used: 0, scope: 'guest' })),
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
const consumeFreePromptAllowanceMock = vi.mocked(consumeFreePromptAllowance)

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

  it('allows one guest final prompt when free allowance is available', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const prompt = await generateFinalPrompt({
      task: 'Generate a concise product brief',
      preferences: {},
      answers: [],
    })

    expect(prompt).toBeTruthy()
  })

  it('requires login when guest allowance is exhausted', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new Error('UNAUTHENTICATED'))
    consumeFreePromptAllowanceMock.mockResolvedValueOnce({ allowed: false, remaining: 0, used: 1, scope: 'guest' })

    await expect(
      generateFinalPrompt({
        task: 'Generate a concise product brief',
        preferences: {},
        answers: [],
      })
    ).rejects.toThrow(/LOGIN_REQUIRED/)
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
