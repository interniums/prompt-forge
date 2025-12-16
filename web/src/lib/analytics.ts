'use client'

import posthog from 'posthog-js'

type EventPayload = Record<string, unknown>

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

let initialized = false
let warnedMissingKey = false
let lastIdentifiedUserId: string | null = null

function logDisabledOnce(reason: string) {
  if (warnedMissingKey) return
  warnedMissingKey = true
  if (typeof console !== 'undefined') {
    console.info(`[analytics] disabled: ${reason}`)
  }
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(POSTHOG_KEY)
}

export function initAnalytics() {
  if (initialized) return posthog
  if (typeof window === 'undefined') return null
  if (!POSTHOG_KEY) {
    logDisabledOnce('NEXT_PUBLIC_POSTHOG_KEY is not set')
    return null
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: false,
    capture_pageview: false,
    persistence: 'localStorage+cookie',
    person_profiles: 'identified_only',
  })
  initialized = true
  return posthog
}

export function captureEvent(event: string, properties?: EventPayload) {
  const client = initAnalytics()
  if (!client) return
  client.capture(event, properties)
}

export function identifyUser(userId: string | null) {
  const client = initAnalytics()
  if (!client || !userId) return

  if (lastIdentifiedUserId === userId) return

  const currentDistinctId = client.get_distinct_id?.()
  if (currentDistinctId && currentDistinctId !== userId) {
    client.alias(userId)
  }
  client.identify(userId)
  lastIdentifiedUserId = userId
}

export function resetAnalytics() {
  if (!initialized) return
  lastIdentifiedUserId = null
  posthog.reset()
}
