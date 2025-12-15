import type { Metadata } from 'next'
import { ContentPageLayout, ContentSection } from '@/components/ContentPageLayout'

export const metadata: Metadata = {
  title: 'Terms of Service | PromptForge',
  description: 'The rules for using PromptForge and how billing is handled.',
}

const supportEmail = 'support@promptforge.app'
const effectiveDate = 'December 15, 2025'

export default function TermsPage() {
  return (
    <ContentPageLayout
      title="Terms of Service"
      intro="These terms explain how you can use PromptForge, how billing works, and what to expect from us."
      tag={`Effective ${effectiveDate}`}
    >
      <ContentSection title="Quick summary" kicker="Read this first">
        <ul className="space-y-2">
          <li>PromptForge lets you draft prompts with clarifying questions, edits, and history.</li>
          <li>Paddle is our merchant of record. Subscriptions renew monthly until you cancel.</li>
          <li>You must use the product lawfully and avoid sensitive or harmful content.</li>
          <li>We provide the service as-is; liability is capped to the fees you paid in the last 3 months.</li>
          <li>Contact us anytime at {supportEmail} for billing or account help.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Accounts and access">
        <ul className="space-y-2">
          <li>You need a valid email account to sign in. Keep your login secure and let us know about any breach.</li>
          <li>You are responsible for all activity under your account, including guests using your device.</li>
          <li>Do not share access or try to bypass authentication, quotas, or rate limits.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Subscriptions and payment">
        <ul className="space-y-2">
          <li>Paddle bills you in USD as the merchant of record. Taxes are calculated at checkout.</li>
          <li>
            Plans renew monthly until you cancel. Cancellation stops future renewals; current-period access continues.
          </li>
          <li>Upgrades start immediately with a prorated charge. Downgrades take effect on the next cycle.</li>
          <li>We may suspend or downgrade the service for non-payment, fraud, or abuse.</li>
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
          <li>
            You own the prompts and content you input. You grant us the rights needed to operate and improve the
            service.
          </li>
          <li>
            We own PromptForge’s code, design, and branding. You cannot copy, resell, or host a competing service using
            our assets.
          </li>
          <li>Feedback is optional; if provided, we may use it without obligation or attribution.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Availability and changes">
        <ul className="space-y-2">
          <li>We aim for reliable uptime but do not guarantee uninterrupted service.</li>
          <li>We may update features, interfaces, or limits to improve stability and security.</li>
          <li>Material changes to these terms will be notified in-app or by email where practical.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Disclaimers and liability">
        <ul className="space-y-2">
          <li>The service is provided “as is” and “as available” without warranties of fitness or non-infringement.</li>
          <li>
            To the maximum extent allowed by law, our total liability is limited to the fees you paid in the 3 months
            before a claim (or $50, whichever is higher).
          </li>
          <li>
            We are not liable for indirect, incidental, special, or consequential damages, or for loss of data or
            profits.
          </li>
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
          <li>
            These terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law rules.
          </li>
          <li>
            Disputes will be resolved in the state or federal courts located in Delaware, unless otherwise required by
            applicable law.
          </li>
        </ul>
      </ContentSection>

      <ContentSection title="Contact">
        <p>
          Questions or issues? Email{' '}
          <a href={`mailto:${supportEmail}`} className="underline">
            {supportEmail}
          </a>
          . We usually respond within 2 business days.
        </p>
      </ContentSection>
    </ContentPageLayout>
  )
}
