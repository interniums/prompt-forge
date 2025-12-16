'use client'

import { useEffect, useState } from 'react'
import { modalBackdropClass, modalCardClass } from '@/features/preferences/styles'

type PlanOption = {
  id: 'basic' | 'advanced'
  label: string
  description: string
  quota: string
  price?: string
  badge?: string
  features?: string[]
  trialSupported?: boolean
  disabled?: boolean
}

type SubscriptionRequiredModalProps = {
  open: boolean
  onClose: () => void
  onStartTrial: () => Promise<void>
  onSubscribe: (plan: PlanOption['id']) => Promise<void>
  plans?: PlanOption[]
  error?: string | null
}

export function SubscriptionRequiredModal({
  open,
  onClose,
  onStartTrial,
  onSubscribe,
  plans = [
    {
      id: 'basic',
      label: 'Base',
      description: 'For solo builders who want steady throughput.',
      quota: '800 generations / 200 edits monthly',
      price: '$7.99 / month',
      badge: 'Most picked',
      features: ['800 generations', '200 edits', '800 clarifying calls', 'Preferences + history saved'],
      trialSupported: true,
      disabled: false,
    },
    {
      id: 'advanced',
      label: 'Advanced',
      description: 'For heavy daily use and premium final prompts.',
      quota: '1,800 generations (incl. 200 premium finals) / 400 edits monthly',
      price: '$12.99 / month',
      badge: 'Power',
      features: [
        '1,800 generations (includes 200 premium with improved quality)',
        '400 edits',
        '1,800 clarifying calls',
        'Best for teams and power users',
      ],
      trialSupported: true,
      disabled: false,
    },
  ],
  error,
}: SubscriptionRequiredModalProps) {
  const [isProcessing, setIsProcessing] = useState<'trial' | 'subscribe' | null>(null)
  const firstEnabledPlan = plans.find((plan) => !plan.disabled)?.id ?? 'basic'
  const [selectedPlan, setSelectedPlan] = useState<PlanOption['id']>(firstEnabledPlan)

  useEffect(() => {
    setSelectedPlan(firstEnabledPlan)
  }, [firstEnabledPlan, plans])

  if (!open) return null

  const handleStartTrial = async () => {
    if (isProcessing) return
    setIsProcessing('trial')
    try {
      await onStartTrial()
    } finally {
      setIsProcessing(null)
    }
  }

  const handleSubscribe = async () => {
    if (isProcessing) return
    setIsProcessing('subscribe')
    try {
      await onSubscribe(selectedPlan)
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <div className={modalBackdropClass}>
      <div className={`${modalCardClass} max-w-xl`}>
        <div className="mb-5 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-(--pf-foreground-muted) ring-1 ring-(--pf-border-strong)">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-300" aria-hidden />
            Upgrade required
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold text-foreground">You need a subscription to continue</h2>
            <p className="text-sm leading-relaxed text-(--pf-foreground-muted)">
              You’ve used your free prompts. Start a trial or pick a plan that keeps your generations flowing.
            </p>
          </div>
        </div>

        {error ? (
          <p className="mb-3 text-sm text-rose-300" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id
            const isDisabled = !!plan.disabled
            const trialLabel = plan.trialSupported
              ? plan.id === 'advanced'
                ? '3-day trial'
                : 'Trial available'
              : 'No trial'

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => {
                  if (isDisabled) return
                  setSelectedPlan(plan.id)
                }}
                aria-pressed={isSelected}
                disabled={isDisabled || isProcessing === 'subscribe'}
                className={`group flex h-full cursor-pointer flex-col gap-3 rounded-xl border px-4 py-4 text-left transition-all duration-150 ${
                  isSelected
                    ? 'border-white/60 bg-white text-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.2)]'
                    : 'border-(--pf-border) bg-(--pf-surface-strong) text-foreground'
                } ${isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5 hover:border-white/60'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold leading-none">{plan.label}</p>
                    <p className="text-[13px] text-(--pf-foreground-muted)">{plan.price ?? plan.quota}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {plan.badge ? (
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-(--pf-foreground-muted) ring-1 ring-(--pf-border-strong)">
                        {plan.badge}
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                        plan.trialSupported
                          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/40'
                          : 'bg-slate-800 text-slate-200 ring-1 ring-slate-700'
                      }`}
                    >
                      {trialLabel}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-foreground">{plan.description}</p>
                <div className="space-y-1.5 text-sm text-foreground">
                  {(plan.features ?? [plan.quota]).map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden />
                      <span className="text-[13px] text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
                {isDisabled ? <p className="text-xs text-amber-300">Not configured</p> : null}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleStartTrial}
            disabled={isProcessing === 'trial'}
            className="w-full cursor-pointer rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing === 'trial' ? 'Starting trial...' : 'Start free trial'}
          </button>
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isProcessing === 'subscribe'}
            className="w-full cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold surface-button transition hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing === 'subscribe' ? 'Opening checkout...' : 'Subscribe with Paddle'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-lg px-4 py-2.5 text-sm text-(--pf-foreground-muted) transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-800/30"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
