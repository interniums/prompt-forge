import type { Metadata } from 'next'
import { ContentPageLayout, ContentSection } from '@/components/ContentPageLayout'

export const metadata: Metadata = {
  title: 'Refund Policy | PromptForge',
  description: 'How refunds, cancellations, and renewals work for PromptForge subscriptions.',
  alternates: {
    canonical: '/refund-policy',
  },
}

const supportEmail = 'support@promptforge.app'
const effectiveDate = 'December 15, 2025'

export function RefundPolicyContent() {
  return (
    <ContentPageLayout
      title="Refund Policy"
      intro="We keep billing simple: transparent renewals, clear eligibility, and fast responses. Paddle is our merchant of record."
      tag={`Effective ${effectiveDate}`}
      actionHref="/docs"
      actionLabel="Back to docs"
    >
      <ContentSection title="Quick summary" kicker="What to expect">
        <ul className="space-y-2">
          <li>Subscriptions renew monthly through Paddle until you cancel.</li>
          <li>Request a refund within 14 days of a charge if something went wrong.</li>
          <li>Heavy use during the billing period may limit eligibility.</li>
          <li>Accidental renewals or billing errors are handled with priority.</li>
          <li>All refunds are processed via Paddle; timelines depend on your payment method.</li>
        </ul>
      </ContentSection>

      <ContentSection title="How to request a refund">
        <ul className="space-y-2">
          <li>Email {supportEmail} with your Paddle order ID, purchase email, and what happened.</li>
          <li>You can also reply directly to your Paddle receipt; Paddle will route it to us.</li>
          <li>We reply within 1–2 business days with a decision or next steps.</li>
          <li>If approved, Paddle issues the refund to the original payment method.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Eligibility">
        <ul className="space-y-2">
          <li>Timing: requests should be made within 14 days of the latest charge.</li>
          <li>Usage: heavy use of the month’s quota before requesting may limit eligibility.</li>
          <li>Billing errors: double charges or unintended renewals are refunded promptly.</li>
          <li>Upgrades: prorations are handled automatically by Paddle; contact us if anything looks off.</li>
          <li>Chargebacks: if a chargeback is filed, access may be paused until it is resolved.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Cancellations">
        <ul className="space-y-2">
          <li>Cancel anytime from the Paddle customer portal link in your receipt, or email us to cancel for you.</li>
          <li>Cancelling stops future renewals; you keep access through the already-paid period.</li>
          <li>If you cancel during a trial, billing stops at the end of the trial.</li>
        </ul>
      </ContentSection>

      <ContentSection title="When refunds are not available">
        <ul className="space-y-2">
          <li>Requests made after 14 days from the charge date without a billing error.</li>
          <li>High usage of quotas followed by a refund request for that same period.</li>
          <li>Issues caused by violating our Terms (e.g., abuse, prohibited content).</li>
        </ul>
      </ContentSection>

      <ContentSection title="Contact">
        <p>
          Need help? Email{' '}
          <a
            href={`mailto:${supportEmail}`}
            className="underline underline-offset-2 transition hover:text-[color-mix(in_srgb,var(--pf-foreground)_90%,transparent)]  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--pf-foreground)_70%,transparent)] cursor-pointer"
          >
            {supportEmail}
          </a>
          . Please include your order ID so we can resolve it quickly.
        </p>
      </ContentSection>
    </ContentPageLayout>
  )
}

export default function RefundPage() {
  return <RefundPolicyContent />
}
