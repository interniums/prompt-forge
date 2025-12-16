import Link from 'next/link'
import type { Metadata } from 'next'
import { ContentPageLayout, ContentSection } from '@/components/ContentPageLayout'

export const metadata: Metadata = {
  title: 'Subscription successful | PromptForge',
  description: 'Your subscription is active. Start generating with higher limits.',
}

export default function SubscriptionSuccessPage() {
  return (
    <ContentPageLayout
      title="Subscription confirmed"
      intro="Your plan is active. Higher limits and priority access are now available."
      actionHref="/generate"
      actionLabel="Back to the app"
      tag="Billing"
    >
      <ContentSection title="What to expect" kicker="Next steps">
        <ul className="space-y-2">
          <li>Quotas update within a few seconds. Refresh if you don’t see changes.</li>
          <li>You will receive a Paddle receipt via email.</li>
          <li>You can manage your plan or cancel anytime from the account menu.</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/subscription"
            className="cursor-pointer rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
          >
            Manage subscription
          </Link>
          <Link
            href="/generate"
            className="cursor-pointer rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
          >
            Continue generating
          </Link>
        </div>
      </ContentSection>
    </ContentPageLayout>
  )
}
