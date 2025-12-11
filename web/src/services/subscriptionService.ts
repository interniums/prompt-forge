'use server'

import { createServiceSupabaseClient } from '@/lib/supabase/server'
import type { SubscriptionRecord, SubscriptionTier } from '@/lib/types'

const BILLING_CYCLE_DAYS = 30
const FREE_TRIAL_DAYS = 3

const TIER_DEFAULTS: Record<
  SubscriptionTier,
  { quotaGenerations: number; quotaEdits: number; quotaClarifying: number; premiumFinals?: number }
> = {
  free_trial: { quotaGenerations: 50, quotaEdits: 15, quotaClarifying: 50, premiumFinals: 0 },
  basic: { quotaGenerations: 800, quotaEdits: 200, quotaClarifying: 800, premiumFinals: 0 },
  // Advanced: total 1,800 generations; up to 200 finals may use gpt-4.1.
  advanced: { quotaGenerations: 1800, quotaEdits: 400, quotaClarifying: 1800, premiumFinals: 200 },
  expired: { quotaGenerations: 0, quotaEdits: 0, quotaClarifying: 0, premiumFinals: 0 },
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function differenceInCalendarDays(a: Date, b: Date): number {
  const start = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const end = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.floor((start - end) / (1000 * 60 * 60 * 24))
}

function nowIso(): string {
  return new Date().toISOString()
}

type SubscriptionRow = {
  user_id: string
  subscription_tier: SubscriptionTier
  trial_expires_at?: string | null
  period_start: string
  quota_generations?: number | null
  quota_edits?: number | null
  quota_clarifying?: number | null
  premium_finals_remaining?: number | null
  usage_generations?: number | null
  usage_edits?: number | null
  usage_clarifying?: number | null
}

function toRecord(row: SubscriptionRow): SubscriptionRecord {
  return {
    userId: String(row.user_id),
    subscriptionTier: row.subscription_tier as SubscriptionTier,
    trialExpiresAt: row.trial_expires_at ? String(row.trial_expires_at) : null,
    periodStart: String(row.period_start),
    quotaGenerations: Number(row.quota_generations ?? 0),
    quotaEdits: Number(row.quota_edits ?? 0),
    quotaClarifying: Number(row.quota_clarifying ?? 0),
    premiumFinalsRemaining:
      row.premium_finals_remaining === null || row.premium_finals_remaining === undefined
        ? undefined
        : Number(row.premium_finals_remaining),
    usageGenerations: Number(row.usage_generations ?? 0),
    usageEdits: Number(row.usage_edits ?? 0),
    usageClarifying: Number(row.usage_clarifying ?? 0),
  }
}

function applyTierDefaults(record: SubscriptionRecord): SubscriptionRecord {
  const defaults = TIER_DEFAULTS[record.subscriptionTier] ?? TIER_DEFAULTS.free_trial
  return {
    ...record,
    quotaGenerations: record.quotaGenerations || defaults.quotaGenerations,
    quotaEdits: record.quotaEdits || defaults.quotaEdits,
    quotaClarifying: record.quotaClarifying || defaults.quotaClarifying,
    premiumFinalsRemaining:
      record.premiumFinalsRemaining ?? (defaults.premiumFinals !== undefined ? defaults.premiumFinals : undefined),
  }
}

function isTrialExpired(record: SubscriptionRecord): boolean {
  return (
    record.subscriptionTier === 'free_trial' &&
    !!record.trialExpiresAt &&
    new Date(record.trialExpiresAt).getTime() < Date.now()
  )
}

async function resetCycleIfNeeded(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  record: SubscriptionRecord
): Promise<SubscriptionRecord> {
  const days = differenceInCalendarDays(new Date(), new Date(record.periodStart))
  if (days < BILLING_CYCLE_DAYS) return record

  const { data, error } = await supabase
    .from('user_subscriptions')
    .update({
      usage_generations: 0,
      usage_edits: 0,
      usage_clarifying: 0,
      period_start: nowIso(),
      premium_finals_remaining:
        record.subscriptionTier === 'advanced'
          ? TIER_DEFAULTS.advanced.premiumFinals ?? 0
          : TIER_DEFAULTS[record.subscriptionTier]?.premiumFinals ?? 0,
      updated_at: nowIso(),
    })
    .eq('user_id', record.userId)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Failed to reset subscription cycle', error)
    return record
  }

  return applyTierDefaults(toRecord(data))
}

async function expireTrialIfNeeded(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  record: SubscriptionRecord
): Promise<SubscriptionRecord> {
  if (!isTrialExpired(record)) return record

  const { data, error } = await supabase
    .from('user_subscriptions')
    .update({
      subscription_tier: 'expired',
      quota_generations: TIER_DEFAULTS.expired.quotaGenerations,
      quota_edits: TIER_DEFAULTS.expired.quotaEdits,
      quota_clarifying: TIER_DEFAULTS.expired.quotaClarifying,
      premium_finals_remaining: TIER_DEFAULTS.expired.premiumFinals ?? 0,
      usage_generations: 0,
      usage_edits: 0,
      usage_clarifying: 0,
      updated_at: nowIso(),
    })
    .eq('user_id', record.userId)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Failed to expire trial', error)
    return record
  }

  return applyTierDefaults(toRecord(data))
}

async function ensureSubscriptionRow(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  userId: string
): Promise<SubscriptionRecord> {
  const { data, error } = await supabase.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle()

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to read subscription', error)
  }

  if (!data) {
    const base = TIER_DEFAULTS.free_trial
    const trialEnds = addDays(new Date(), FREE_TRIAL_DAYS).toISOString()
    const { data: inserted, error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        subscription_tier: 'free_trial',
        trial_expires_at: trialEnds,
        quota_generations: base.quotaGenerations,
        quota_edits: base.quotaEdits,
        quota_clarifying: base.quotaClarifying,
        premium_finals_remaining: base.premiumFinals ?? 0,
      })
      .select('*')
      .maybeSingle()

    if (insertError || !inserted) {
      console.error('Failed to create subscription', insertError)
      throw insertError ?? new Error('SUBSCRIPTION_CREATE_FAILED')
    }
    return applyTierDefaults(toRecord(inserted))
  }

  return applyTierDefaults(toRecord(data))
}

/**
 * Load, normalize, and refresh a user's subscription.
 */
export async function loadSubscription(
  userId: string,
  supabase: ReturnType<typeof createServiceSupabaseClient> = createServiceSupabaseClient()
): Promise<SubscriptionRecord> {
  let record = await ensureSubscriptionRow(supabase, userId)
  record = await expireTrialIfNeeded(supabase, record)
  record = await resetCycleIfNeeded(supabase, record)
  return record
}

type QuotaKind = 'clarifying' | 'generation' | 'edit'

function getFieldsForKind(kind: QuotaKind): {
  usageField: keyof SubscriptionRecord
  quotaField: keyof SubscriptionRecord
} {
  if (kind === 'clarifying') return { usageField: 'usageClarifying', quotaField: 'quotaClarifying' }
  if (kind === 'edit') return { usageField: 'usageEdits', quotaField: 'quotaEdits' }
  return { usageField: 'usageGenerations', quotaField: 'quotaGenerations' }
}

function quotaError(kind: QuotaKind): Error {
  const err = new Error('QUOTA_EXCEEDED')
  ;(err as { code?: string; kind?: QuotaKind }).code = 'QUOTA_EXCEEDED'
  ;(err as { kind?: QuotaKind }).kind = kind
  return err
}

/**
 * Ensure quota is available and consume one unit.
 * Throws QUOTA_EXCEEDED when the quota is exhausted.
 */
export async function assertAndConsumeQuota(userId: string, kind: QuotaKind): Promise<SubscriptionRecord> {
  const supabase = createServiceSupabaseClient()
  const record = await loadSubscription(userId, supabase)
  const { usageField, quotaField } = getFieldsForKind(kind)

  const usage = record[usageField] as number
  const quota = record[quotaField] as number
  if (quota <= 0 || usage + 1 > quota) {
    throw quotaError(kind)
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: nowIso(),
  }

  if (kind === 'clarifying') {
    updatePayload.usage_clarifying = usage + 1
  } else if (kind === 'edit') {
    updatePayload.usage_edits = usage + 1
  } else {
    updatePayload.usage_generations = usage + 1
  }

  const { error } = await supabase.from('user_subscriptions').update(updatePayload).eq('user_id', userId)
  if (error) {
    console.error('Failed to consume quota', error)
    throw error
  }

  return {
    ...record,
    [usageField]: usage + 1,
  }
}

/**
 * Consume one premium final slot (for advanced tier). Throws QUOTA_EXCEEDED if none remain.
 */
export async function consumePremiumFinalSlot(userId: string): Promise<SubscriptionRecord> {
  const supabase = createServiceSupabaseClient()
  const record = await loadSubscription(userId, supabase)
  const remaining = record.premiumFinalsRemaining ?? 0
  if (remaining <= 0) {
    throw quotaError('generation')
  }

  const { data, error } = await supabase
    .from('user_subscriptions')
    .update({
      premium_finals_remaining: remaining - 1,
      updated_at: nowIso(),
    })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle()

  if (error || !data) {
    console.error('Failed to consume premium final slot', error)
    throw error ?? new Error('PREMIUM_FINAL_CONSUME_FAILED')
  }

  return applyTierDefaults(toRecord(data))
}
