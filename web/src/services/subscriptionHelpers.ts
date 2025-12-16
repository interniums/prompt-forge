import type { SubscriptionRecord } from '@/lib/types'

/**
 * Shared helper that does not require server-only modules.
 * Determines whether a subscription is currently active.
 */
export function hasActiveSubscription(record: SubscriptionRecord | null): boolean {
  if (!record) return false
  if (record.subscriptionTier === 'expired') return false
  if (record.subscriptionTier === 'free_trial') {
    return !!record.trialExpiresAt && new Date(record.trialExpiresAt).getTime() >= Date.now()
  }
  return true
}

