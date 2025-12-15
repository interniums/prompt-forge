import type { Metadata } from 'next'
import { ContentPageLayout, ContentSection } from '@/components/ContentPageLayout'

export const metadata: Metadata = {
  title: 'Pricing | PromptForge',
  description: 'Simple, transparent tiers for PromptForge billing via Paddle.',
}

type Plan = {
  name: string
  price: string
  summary: string
  bullets: string[]
  badge?: string
}

const supportEmail = 'support@promptforge.app'

const plans: Plan[] = [
  {
    name: 'Free trial',
    price: 'Free · 3 days',
    summary: 'Try the full terminal experience before subscribing.',
    bullets: ['50 generations', '15 edits', '50 clarifying calls', 'Guest or signed-in usage'],
    badge: 'Start fast',
  },
  {
    name: 'Basic',
    price: '$7.99 / month',
    summary: 'For solo builders who want steady throughput.',
    bullets: ['800 generations', '200 edits', '800 clarifying calls', 'Preferences + history saved to your account'],
    badge: 'Most picked',
  },
  {
    name: 'Advanced',
    price: '$12.99 / month',
    summary: 'For heavy daily use and premium final prompts.',
    bullets: [
      '1,800 generations (includes premium finals on gpt-4.1)',
      '400 edits',
      '1,800 clarifying calls',
      'Best for teams and power users',
    ],
    badge: 'Power',
  },
]

export default function PricingPage() {
  return (
    <ContentPageLayout
      title="Pricing"
      intro="Predictable monthly plans billed by Paddle, our merchant of record. Quotas reset every 30 days."
      tag="Simple, production-ready"
    >
      <ContentSection title="Plans" kicker="Transparent tiers">
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className="flex h-full flex-col justify-between rounded-xl border px-4 py-5 shadow-[0_0_50px_rgba(0,0,0,0.25)]"
              style={{
                backgroundColor: 'var(--pf-background)',
                color: 'var(--pf-foreground)',
                borderColor: 'rgba(148, 163, 184, 0.25)',
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.badge ? (
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-semibold"
                      style={{ backgroundColor: 'rgba(148,163,184,0.12)' }}
                    >
                      {plan.badge}
                    </span>
                  ) : null}
                </div>
                <p className="text-2xl font-bold">{plan.price}</p>
                <p className="text-sm" style={{ color: 'var(--pf-foreground-muted)' }}>
                  {plan.summary}
                </p>
                <ul className="mt-4 space-y-2 text-sm" style={{ color: 'var(--pf-foreground-muted)' }}>
                  {plan.bullets.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className="mt-1 inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: 'var(--pf-foreground)' }}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </ContentSection>

      <ContentSection title="What you get" kicker="Included in every plan">
        <ul className="space-y-2">
          <li>Terminal-style prompt builder with clarifying questions and edits.</li>
          <li>Saved preferences (tone, audience, domain, model, language, depth) per user.</li>
          <li>Session-scoped history for reusing recent prompts.</li>
          <li>Local draft recovery if you close the tab mid-task.</li>
          <li>Security defaults: CSP, referrer policy, secure cookies, and Supabase-backed auth.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Billing notes" kicker="Paddle managed">
        <ul className="space-y-2">
          <li>Paddle is our merchant of record; taxes are calculated at checkout.</li>
          <li>Charges recur monthly until you cancel. You keep access through the paid period.</li>
          <li>Cancel anytime via the Paddle customer portal link in your receipt or by emailing {supportEmail}.</li>
          <li>Usage counters reset every 30 days starting from your billing date.</li>
          <li>Advanced plan routes premium finals through gpt-4.1 and consumes the premium quota noted above.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Need a hand?" kicker="Support">
        <p>
          Email us at{' '}
          <a href={`mailto:${supportEmail}`} className="underline">
            {supportEmail}
          </a>{' '}
          if you have billing questions or need a receipt update. We respond within 2 business days.
        </p>
      </ContentSection>
    </ContentPageLayout>
  )
}
