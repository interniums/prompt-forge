import type { Metadata } from 'next'
import { ContentPageLayout, ContentSection } from '@/components/ContentPageLayout'

export const metadata: Metadata = {
  title: 'Refund Policy | PromptForge',
  description: 'How refunds and cancellations work for PromptForge subscriptions.',
}

const supportEmail = 'support@promptforge.app'
const effectiveDate = 'December 15, 2025'

export default function RefundPage() {
  return (
    <ContentPageLayout
      title="Refund Policy"
      intro="We aim to be fair and fast with billing issues. Here is how we handle refunds and cancellations."
      tag={`Effective ${effectiveDate}`}
    >
      <ContentSection title="Quick summary" kicker="What to expect">
        <ul className="space-y-2">
          <li>Subscriptions renew monthly through Paddle until you cancel.</li>
          <li>Request a refund within 14 days of a charge if something went wrong.</li>
          <li>We may decline refunds when the product has been heavily used in the current cycle.</li>
          <li>For accidental renewals or billing errors, we prioritize quick resolution.</li>
        </ul>
      </ContentSection>

      <ContentSection title="How to request a refund">
        <ul className="space-y-2">
          <li>Email {supportEmail} with your order ID, the email used to purchase, and what happened.</li>
          <li>If you bought via Paddle, you can also reply to your receipt; Paddle will route it to us.</li>
          <li>We usually respond within 2 business days with a decision or next steps.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Eligibility">
        <ul className="space-y-2">
          <li>Timing: requests should be made within 14 days of the latest charge.</li>
          <li>Usage: we may deny a refund if most of the monthly quota was consumed before the request.</li>
          <li>Billing errors: double charges or unintended renewals are refunded promptly.</li>
          <li>Upgrades: prorations are handled automatically by Paddle; contact us if something looks off.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Cancellations">
        <ul className="space-y-2">
          <li>Cancel anytime from the Paddle customer portal link in your receipt, or email us to cancel for you.</li>
          <li>Cancelling stops future renewals; you keep access through the already-paid period.</li>
          <li>If you cancel during a trial, billing stops at the end of the trial.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Contact">
        <p>
          Need help? Email{' '}
          <a href={`mailto:${supportEmail}`} className="underline">
            {supportEmail}
          </a>
          . Please include your order ID so we can resolve it quickly.
        </p>
      </ContentSection>
    </ContentPageLayout>
  )
}
