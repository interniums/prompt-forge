'use client'

import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { ContentPageLayout } from '@/components/ContentPageLayout'
import { openPaddleCheckout } from '@/services/paddleClient'
import { getSubscriptionStatus, startFreeTrial } from '@/services/subscriptionService'
import type { SubscriptionRecord } from '@/lib/types'

const basePriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_BASE ?? process.env.NEXT_PUBLIC_PADDLE_PRICE_ID
const advancedPriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ADVANCED
const trialPriceId = process.env.NEXT_PUBLIC_PADDLE_TRIAL_PRICE_ID

export default function SubscriptionPage() {
  const [status, setStatus] = useState<SubscriptionRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const defaultPlan: 'basic' | 'advanced' = basePriceId ? 'basic' : advancedPriceId ? 'advanced' : 'basic'
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'advanced'>(defaultPlan)

  const plans = useMemo(
    () => [
      {
        id: 'basic' as const,
        label: 'Basic',
        price: '$7.99 / month',
        description: 'For solo builders who want steady throughput.',
        quota: '800 generations / 200 edits monthly',
        badge: 'Most picked',
        priceId: basePriceId,
        trialSupported: false,
      },
      {
        id: 'advanced' as const,
        label: 'Advanced',
        price: '$12.99 / month',
        description: 'For heavy daily use and premium final prompts.',
        quota: '1,800 generations (incl. 200 premium finals) / 400 edits monthly',
        badge: 'Power',
        priceId: advancedPriceId,
        trialSupported: false,
      },
    ],
    []
  )

  const refreshStatus = useCallback(async () => {
    setIsLoadingStatus(true)
    try {
      const result = await getSubscriptionStatus()
      setStatus(result)
    } catch (err) {
      console.error('Failed to load subscription status', err)
    } finally {
      setIsLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const handleStartTrial = useCallback(() => {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        await startFreeTrial()
        await refreshStatus()
        setMessage('Trial started. You can continue generating prompts.')
      } catch (err) {
        console.error('Trial start failed', err)
        setError('Could not start trial. Please try again.')
      }
    })
  }, [refreshStatus])

  const handleSubscribe = useCallback(() => {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const plan = plans.find((p) => p.id === selectedPlan)
      const priceId = plan?.priceId
      const trialForPlan = plan?.trialSupported ? trialPriceId : undefined

      if (!priceId) {
        setError('Selected plan is not configured.')
        return
      }

      try {
        await openPaddleCheckout({
          priceId,
          trialPriceId: trialForPlan,
          successUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          cancelUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        })
      } catch (err) {
        console.error('Checkout failed', err)
        setError('Checkout could not be opened. Please try again.')
      }
    })
  }, [plans, selectedPlan])

  return (
    <ContentPageLayout
      title="Upgrade your plan"
      intro="Start a free trial or subscribe via Paddle to keep generating prompts with higher limits and priority access."
      actionHref="/generate"
      actionLabel="Back to the app"
      tag="Billing"
    >
      <div className="grid gap-4 rounded-2xl border border-slate-800 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(79,70,229,0.08),rgba(15,23,42,0.9)),radial-gradient(110%_120%_at_100%_10%,rgba(59,130,246,0.1),rgba(15,23,42,0.95))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6">
        {isLoadingStatus ? (
          <SubscriptionCardSkeleton />
        ) : (
          <>
            <div className="space-y-2 text-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Transparent tiers</p>
              <h2 className="text-2xl font-semibold text-white">Plans</h2>
              <p className="text-sm text-slate-400">
                Choose what fits. Fast start, predictable limits, and easy cancellation through Paddle.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <TrialCard onStartTrial={handleStartTrial} isWorking={isPending || isLoadingStatus} status={status} />

              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id
                const isDisabled = !plan.priceId
                const featureList =
                  plan.id === 'basic'
                    ? [
                        '800 generations',
                        '200 edits',
                        '800 clarifying calls',
                        'Preferences + history saved to your account',
                      ]
                    : [
                        '1,800 generations (includes 200 premium with improved quality)',
                        '400 edits',
                        '1,800 clarifying calls',
                        'Best for teams and power users',
                      ]
                const badgeTone =
                  plan.id === 'basic'
                    ? 'bg-sky-500/20 text-sky-100 ring-1 ring-sky-300/60'
                    : 'bg-violet-500/20 text-violet-100 ring-1 ring-violet-300/60'

                return (
                  <div
                    key={plan.id}
                    className={`flex h-full flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-[0_16px_55px_rgba(0,0,0,0.4)] transition-all duration-150 ${
                      isSelected ? 'ring-2 ring-emerald-300/60 shadow-lg shadow-emerald-900/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-lg font-semibold text-white">{plan.label}</div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${badgeTone}`}>
                        {plan.badge}
                      </span>
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-white">{plan.price}</div>
                    <p className="mt-2 text-sm text-slate-300">{plan.description}</p>
                    <div className="mt-4 space-y-2 text-sm text-slate-200">
                      {featureList.map((feature) => (
                        <PlanBullet key={feature}>{feature}</PlanBullet>
                      ))}
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isDisabled) return
                          setSelectedPlan(plan.id)
                        }}
                        disabled={isDisabled || isPending || isLoadingStatus}
                        className={`w-full cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                          isSelected
                            ? 'bg-white text-slate-900 hover:bg-slate-100'
                            : 'bg-slate-800 text-white hover:bg-slate-700'
                        } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        {isSelected ? 'Selected' : 'Choose plan'}
                      </button>
                    </div>
                    {isDisabled ? <p className="mt-2 text-xs text-amber-300">Not configured</p> : null}
                  </div>
                )
              })}
            </div>

            {error ? (
              <p className="text-sm text-rose-300" role="alert" aria-live="assertive">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="text-sm text-emerald-300" role="status" aria-live="polite">
                {message}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleStartTrial}
                disabled={isPending || isLoadingStatus}
                className="w-full cursor-pointer rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-white  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {isPending ? 'Working...' : 'Start free trial'}
              </button>
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isPending || isLoadingStatus}
                className="w-full cursor-pointer rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:border-slate-500  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                Subscribe with Paddle
              </button>
            </div>

            <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3 text-xs text-slate-400">
              <p className="font-semibold text-slate-300">Paddle checkout</p>
              <p className="mt-1">
                Paddle is the merchant of record. Taxes are calculated at checkout. You can cancel anytime via your
                Paddle receipt or by contacting support.
              </p>
            </div>
          </>
        )}
      </div>
    </ContentPageLayout>
  )
}

function TrialCard({
  onStartTrial,
  isWorking,
  status,
}: {
  onStartTrial: () => void
  isWorking: boolean
  status: SubscriptionRecord | null
}) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-[0_16px_55px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-white">Free trial</p>
          <p className="mt-1 inline-flex rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 ring-1 ring-emerald-300/60">
            Start fast
          </p>
        </div>
      </div>
      <div className="mt-3 text-3xl font-semibold text-white">Free · 3 days</div>
      <p className="mt-2 text-sm text-slate-300">Try the full terminal experience before subscribing.</p>
      <div className="mt-4 space-y-2 text-sm text-slate-200">
        <PlanBullet>50 generations</PlanBullet>
        <PlanBullet>15 edits</PlanBullet>
        <PlanBullet>50 clarifying calls</PlanBullet>
        <PlanBullet>Guest or signed-in usage</PlanBullet>
      </div>
      <button
        type="button"
        onClick={onStartTrial}
        disabled={isWorking}
        className="mt-6 w-full cursor-pointer rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isWorking ? 'Working...' : 'Start free trial'}
      </button>
      {status?.trialExpiresAt ? (
        <p className="mt-2 text-xs text-slate-400">
          Trial ends on {new Date(status.trialExpiresAt).toLocaleDateString()}.
        </p>
      ) : null}
    </div>
  )
}

function PlanBullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden />
      <span>{children}</span>
    </div>
  )
}

function SubscriptionCardSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-slate-800/60" />
        <div className="h-5 w-40 rounded bg-slate-800/70" />
        <div className="h-4 w-56 rounded bg-slate-800/50" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-slate-800/50" />
        <div className="h-4 w-64 rounded bg-slate-800/40" />
        <div className="h-4 w-48 rounded bg-slate-800/40" />
        <div className="h-4 w-52 rounded bg-slate-800/40" />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="h-10 w-full rounded-lg bg-slate-800/70 sm:w-40" />
        <div className="h-10 w-full rounded-lg bg-slate-800/60 sm:w-44" />
      </div>
      <div className="space-y-2 rounded-lg border border-slate-800/80 bg-slate-900/60 p-3">
        <div className="h-4 w-32 rounded bg-slate-800/60" />
        <div className="h-3 w-full rounded bg-slate-800/40" />
        <div className="h-3 w-[80%] rounded bg-slate-800/40" />
      </div>
    </div>
  )
}
