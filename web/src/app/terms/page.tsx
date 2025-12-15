import type { Metadata } from 'next'
import { ContentPageLayout, ContentSection } from '@/components/ContentPageLayout'

export const metadata: Metadata = {
  title: 'Terms & Conditions | PromptForge',
  description: 'The rules for using PromptForge, billing, refunds, and acceptable use.',
}

const supportEmail = 'support@promptforge.app'
const legalName = '{LEGAL_NAME_OR_COMPANY_NAME}'
const country = '{COUNTRY}'
const businessAddress = '{BUSINESS_ADDRESS}'
const effectiveDate = 'December 15, 2025'

export default function TermsPage() {
  return (
    <ContentPageLayout
      title="Terms & Conditions"
      intro="These terms explain how you may use PromptForge, how billing and refunds work, and how to reach us."
      tag={`Effective ${effectiveDate}`}
      actionHref="/docs"
      actionLabel="Back to docs"
    >
      <ContentSection title="Quick summary" kicker="Read this first">
        <ul className="space-y-2">
          <li>PromptForge lets you create prompts with clarifying questions, edits, and history.</li>
          <li>Paddle is our merchant of record; subscriptions renew monthly until you cancel.</li>
          <li>Use the product lawfully and avoid harmful, abusive, or sensitive content.</li>
          <li>Liability is limited to the fees paid in the last 3 months, to the extent allowed by law.</li>
          <li>Contact {supportEmail} for billing, account, or legal questions.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Who we are" kicker="Provider details">
        <ul className="space-y-2">
          <li>Service: PromptForge (prompt builder web app).</li>
          <li>Provider legal name: {legalName}.</li>
          <li>Registered country: {country}.</li>
          <li>Business address: {businessAddress}.</li>
          <li>Primary contact: {supportEmail}.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Accounts and access">
        <ul className="space-y-2">
          <li>You need a valid email account to sign in. Keep your login secure and tell us about any breach.</li>
          <li>You are responsible for all activity under your account, including guests using your device.</li>
          <li>Do not share access or try to bypass authentication, quotas, or rate limits.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Subscriptions and payment">
        <ul className="space-y-2">
          <li>Paddle bills you in USD as the merchant of record. Taxes are calculated at checkout.</li>
          <li>Plans renew monthly until you cancel. Cancelling stops future renewals; current-period access continues.</li>
          <li>
            Usage resets every 30 days. Free trial: 50 generations / 15 edits / 50 clarifying calls for 3 days. Basic:
            800 / 200 / 800. Advanced: 1,800 / 400 / 1,800 plus 200 premium finals on supported models.
          </li>
          <li>Upgrades start immediately with a prorated charge. Downgrades take effect on the next cycle.</li>
          <li>We may suspend or downgrade the service for non-payment, fraud, or abuse.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Refunds and cancellations">
        <ul className="space-y-2">
          <li>Refunds follow our Refund Policy at /refund-policy.</li>
          <li>You can cancel anytime via the Paddle portal link in your receipt or by emailing us.</li>
          <li>After cancellation you keep access until the end of the paid period.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Acceptable use">
        <ul className="space-y-2">
          <li>No illegal, harmful, hateful, or violent content; no harassment or doxxing.</li>
          <li>No high-risk uses (medical, emergency response, life support, or safety-critical decisions).</li>
          <li>Do not upload secrets, credentials, or highly sensitive personal data.</li>
          <li>No automated scraping, brute force, or attempts to reverse engineer the service.</li>
          <li>Respect third-party model and platform terms (including OpenAI and Supabase policies).</li>
        </ul>
      </ContentSection>

      <ContentSection title="Content and intellectual property">
        <ul className="space-y-2">
          <li>You own the prompts and content you input. You grant us the rights needed to operate the service.</li>
          <li>We own PromptForge’s code, design, and branding. Do not copy, resell, or host a competing service.</li>
          <li>Feedback is optional; if provided, we may use it without obligation or attribution.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Availability and changes">
        <ul className="space-y-2">
          <li>We aim for reliable uptime but do not guarantee uninterrupted service.</li>
          <li>We may update features, interfaces, or limits to improve stability and security.</li>
          <li>Material changes to these terms will be notified in-app and, when possible, by email.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Disclaimers and liability">
        <ul className="space-y-2">
          <li>The service is provided “as is” and “as available” without warranties of fitness or non-infringement.</li>
          <li>
            To the maximum extent allowed by law, our total liability is limited to the fees you paid in the 3 months
            before a claim (or $50, whichever is higher).
          </li>
          <li>We are not liable for indirect, incidental, special, or consequential damages, or for loss of data or profits.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Termination">
        <ul className="space-y-2">
          <li>You may stop using the service or cancel your subscription at any time.</li>
          <li>We may suspend or terminate access for misuse, security risks, or non-payment.</li>
          <li>Upon termination, your right to use the service ends, but payment obligations already due remain.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Governing law and disputes">
        <ul className="space-y-2">
          <li>These terms are governed by the laws of {country}, unless a different mandatory law applies to you.</li>
          <li>Disputes will be handled in the courts of {country}, unless applicable law requires otherwise.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Contact">
        <p>
          Questions or issues? Email{' '}
          <a
            href={`mailto:${supportEmail}`}
            className="underline underline-offset-2 transition hover:text-[color-mix(in_srgb,var(--pf-foreground)_90%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--pf-foreground)_70%,transparent)] cursor-pointer"
          >
            {supportEmail}
          </a>
          . We usually respond within 1–2 business days.
        </p>
      </ContentSection>
    </ContentPageLayout>
  )
}
