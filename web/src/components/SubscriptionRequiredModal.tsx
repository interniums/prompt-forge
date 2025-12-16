'use client'

import { useEffect, useState, type ReactNode } from 'react'

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
      description: 'Generous limits for regular usage.',
      quota: '800 generations / 200 edits monthly',
      price: '$7.99 / month',
      badge: 'Most picked',
      features: ['800 generations', '200 edits', '800 clarifying calls', 'Preferences + history saved'],
      trialSupported: false,
      disabled: false,
    },
    {
      id: 'advanced',
      label: 'Advanced',
      description: 'Higher limits plus premium finals.',
      quota: '1,800 generations (incl. 200 premium finals) / 400 edits monthly',
      price: '$12.99 / month',
      badge: 'Power',
      features: [
        '1,800 generations (includes 200 premium with improved quality)',
        '400 edits',
        '1,800 clarifying calls',
        'Best for teams and power users',
      ],
      trialSupported: false,
      disabled: false,
    },
  ],
  error,
}: SubscriptionRequiredModalProps) {
  const [isProcessing, setIsProcessing] = useState<'trial' | 'subscribe' | null>(null)
  const firstEnabledPlan = plans.find((plan) => !plan.disabled)?.id ?? 'basic'
  const [selectedOption, setSelectedOption] = useState<'trial' | PlanOption['id']>('basic')

  useEffect(() => {
    setSelectedOption(firstEnabledPlan ?? 'basic')
  }, [firstEnabledPlan, plans])

  if (!open) return null

  const subscriptionBackdropClass =
    'fixed inset-0 z-100 flex items-center justify-center bg-black/55 backdrop-blur-md transition'
  const subscriptionShellClass = 'w-full max-w-6xl'

  const handleContinue = async () => {
    if (isProcessing) return
    const isTrial = selectedOption === 'trial'
    setIsProcessing(isTrial ? 'trial' : 'subscribe')
    try {
      if (isTrial) {
        await onStartTrial()
      } else {
        await onSubscribe(selectedOption)
      }
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <div className={subscriptionBackdropClass}>
      <div className={subscriptionShellClass}>
        <div className="grid gap-5 rounded-2xl border border-slate-800/80 bg-[rgba(7,11,23,0.92)] shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div className="relative grid gap-5 rounded-2xl bg-[radial-gradient(120%_140%_at_0%_0%,rgba(79,70,229,0.08),rgba(15,23,42,0.92)),radial-gradient(110%_120%_at_100%_10%,rgba(59,130,246,0.1),rgba(15,23,42,0.95))] p-5 sm:p-6">
            <div className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 ring-1 ring-slate-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" aria-hidden />
              Transparent tiers
            </div>
            <div className="space-y-2 text-slate-200">
              <h2 className="text-2xl font-semibold text-white">Plans</h2>
              <p className="text-sm text-slate-400">
                You’ve used your free prompts. Start a trial or pick a plan that keeps your generations flowing.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => setSelectedOption('trial')}
                aria-pressed={selectedOption === 'trial'}
                className={`flex h-full cursor-pointer flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 text-left shadow-[0_16px_55px_rgba(0,0,0,0.4)] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${
                  selectedOption === 'trial' ? 'ring-2 ring-emerald-300/60 shadow-lg shadow-emerald-900/30' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold text-white">Free trial</div>
                  <span className="rounded-full border border-emerald-200/50 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 ring-1 ring-emerald-300/50">
                    Start fast
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">Start fast</p>
                <div className="mt-3 text-3xl font-semibold text-white">Free · 3 days</div>
                <p className="mt-2 text-sm text-slate-300">Try the full terminal experience before subscribing.</p>
                <div className="mt-4 space-y-2 text-sm text-slate-200">
                  <PlanBullet>50 generations</PlanBullet>
                  <PlanBullet>15 edits</PlanBullet>
                  <PlanBullet>50 clarifying calls</PlanBullet>
                  <PlanBullet>Guest or signed-in usage</PlanBullet>
                </div>
              </button>

              {plans.map((plan) => {
                const isSelected = selectedOption === plan.id
                const isDisabled = !!plan.disabled
                const badgeTone =
                  plan.id === 'basic'
                    ? 'border border-sky-300/60 bg-sky-500/15 text-sky-50 ring-1 ring-sky-300/50'
                    : 'border border-violet-300/60 bg-violet-600/15 text-violet-50 ring-1 ring-violet-300/50'
                const badgeAccent = plan.id === 'basic' ? 'text-sky-200' : 'text-violet-200'
                const badgeLabel =
                  plan.badge ??
                  (plan.id === 'basic' ? 'Best choice' : plan.id === 'advanced' ? 'Power users' : 'Popular')

                const planDescription =
                  plan.id === 'basic'
                    ? 'Base subscription with generous limits to generate high quality prompts.'
                    : 'Advanced subscription with higher limits and premium finals.'

                const planFeatureList =
                  plan.id === 'basic'
                    ? [
                        '800 generations',
                        '200 edits',
                        '800 high quality clarifying questions',
                        'Guest or signed-in usage',
                      ]
                    : [
                        '1,800 generations',
                        '400 edits',
                        '1,800 high quality clarifying questions',
                        'Guest or signed-in usage',
                      ]

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      if (isDisabled) return
                      setSelectedOption(plan.id)
                    }}
                    aria-pressed={isSelected}
                    disabled={isDisabled}
                    className={`flex h-full cursor-pointer flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 text-left shadow-[0_16px_55px_rgba(0,0,0,0.4)] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${
                      isSelected ? 'ring-2 ring-emerald-300/60 shadow-lg shadow-emerald-900/30' : ''
                    } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-lg font-semibold text-white">{plan.label}</div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${badgeTone}`}>
                        {plan.badge ?? badgeLabel}
                      </span>
                    </div>
                    <p className={`mt-1 text-[11px] font-semibold uppercase tracking-wide ${badgeAccent}`}>
                      {badgeLabel}
                    </p>
                    <div className="mt-2 text-2xl font-semibold text-white">{plan.price ?? plan.quota}</div>
                    <p className="mt-2 text-sm text-slate-300">{planDescription}</p>
                    <div className="mt-4 space-y-2 text-sm text-slate-200">
                      {planFeatureList.map((feature) => (
                        <PlanBullet key={feature}>{feature}</PlanBullet>
                      ))}
                    </div>
                    {isDisabled ? <p className="mt-2 text-xs text-amber-300">Not configured</p> : null}
                  </button>
                )
              })}
            </div>

            {error ? (
              <p className="text-sm text-rose-300" role="alert" aria-live="assertive">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-4">
              <button
                type="button"
                onClick={handleContinue}
                disabled={isProcessing !== null}
                className="w-full cursor-pointer rounded-lg bg-slate-100 px-5 py-4 text-base font-semibold text-slate-900 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200 disabled:cursor-not-allowed disabled:opacity-70 animate-pulse"
              >
                {isProcessing ? 'Working...' : 'Continue with selected option'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full cursor-pointer rounded-lg px-4 py-2.5 text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700/60"
              >
                Maybe later
              </button>
            </div>

            <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3 text-xs text-slate-400">
              <p className="font-semibold text-slate-300">Paddle checkout</p>
              <p className="mt-1">
                Paddle is the merchant of record. Taxes are calculated at checkout. You can cancel anytime via your
                Paddle receipt or by contacting support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlanBullet({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[13px] leading-6 text-slate-200">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden />
      <span>{children}</span>
    </div>
  )
}
