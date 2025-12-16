import Link from 'next/link'
import type { Metadata } from 'next'
import { ContentPageLayout, ContentSection } from '@/components/ContentPageLayout'

export const metadata: Metadata = {
  title: 'Subscription canceled | PromptForge',
  description: 'Your checkout was canceled. You can retry or keep using the free tier.',
}

export default function SubscriptionCancelPage() {
  return (
    <ContentPageLayout
      title="Checkout canceled"
      intro="No charges were made. You can retry checkout or continue on your current plan."
      actionHref="/subscription"
      actionLabel="Back to plans"
      tag="Billing"
    >
      <ContentSection title="What now?" kicker="Options">
        <ul className="space-y-2">
          <li>You can reopen checkout anytime from the subscription page.</li>
          <li>Your current plan and quotas remain unchanged.</li>
          <li>Need help? Contact support and we’ll get you set up.</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/subscription"
            className="cursor-pointer rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
          >
            Retry checkout
          </Link>
          <Link
            href="/generate"
            className="cursor-pointer rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
          >
            Keep using the app
          </Link>
        </div>
      </ContentSection>
    </ContentPageLayout>
  )
}
