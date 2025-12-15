import type { Metadata } from 'next'
import { ContentPageLayout, ContentSection } from '@/components/ContentPageLayout'

export const metadata: Metadata = {
  title: 'Contact | PromptForge',
  description: 'How to reach PromptForge support and what response times to expect.',
}

const supportEmail = 'support@promptforge.app'

export default function ContactPage() {
  return (
    <ContentPageLayout
      title="Contact & Support"
      intro="Need help with billing, account access, or product guidance? Reach us and we’ll respond quickly."
      tag="Fast, clear responses"
    >
      <ContentSection title="Primary contact" kicker="Best way to reach us">
        <ul className="space-y-2">
          <li>
            Email{' '}
            <a
              href={`mailto:${supportEmail}`}
              className="underline underline-offset-2 transition hover:text-[color-mix(in_srgb,var(--pf-foreground)_90%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--pf-foreground)_70%,transparent)] cursor-pointer"
            >
              {supportEmail}
            </a>{' '}
            for support or legal questions.
          </li>
          <li>Response time: typically within 1–2 business days.</li>
          <li>Include your account email and Paddle order ID for billing requests.</li>
        </ul>
      </ContentSection>

      <ContentSection title="What we can help with" kicker="Common requests">
        <ul className="space-y-2">
          <li>Billing: receipts, VAT details, cancellations, and refunds.</li>
          <li>Access: sign-in issues, session resets, and preference recovery.</li>
          <li>Product: feature feedback, roadmap questions, or bug reports.</li>
        </ul>
      </ContentSection>

      <ContentSection title="If something is urgent" kicker="Escalations">
        <ul className="space-y-2">
          <li>Mark your subject as “Urgent” and describe the impact (blocked, degraded, question).</li>
          <li>We prioritize billing errors, access issues, and data requests.</li>
        </ul>
      </ContentSection>
    </ContentPageLayout>
  )
}

