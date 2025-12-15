import type { Metadata } from 'next'
import { ContentPageLayout, ContentSection } from '@/components/ContentPageLayout'

export const metadata: Metadata = {
  title: 'Features | PromptForge',
  description: 'Key features, deliverables, and how PromptForge helps you ship great prompts.',
}

const supportEmail = 'support@promptforge.app'

export default function FeaturesPage() {
  return (
    <ContentPageLayout
      title="Features"
      intro="PromptForge is a calm, production-ready prompt builder with a terminal-style flow, guided clarifying questions, and saved preferences."
      tag="Built for shipping, not demos"
    >
      <ContentSection title="Core experience" kicker="What you get every day">
        <ul className="space-y-2">
          <li>Terminal UI for fast drafting with keyboard-friendly interactions.</li>
          <li>Clarifying questions that adapt to your goal, audience, and tone.</li>
          <li>Inline edits and regenerations without losing context.</li>
          <li>Session history so you can reuse recent prompts.</li>
          <li>Light/dim/dark themes to stay readable in any environment.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Deliverables" kicker="Outputs you can rely on">
        <ul className="space-y-2">
          <li>Ready-to-use prompt blocks tailored for chat, coding, or writing tools.</li>
          <li>Preference-aware prompts (tone, depth, format, audience, domain, language).</li>
          <li>Premium finals on supported plans that emphasize structure and clarity.</li>
          <li>Download-friendly text you can copy into any downstream tool.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Built-in safeguards" kicker="Stable by default">
        <ul className="space-y-2">
          <li>Supabase auth with secure cookies; no third-party ad trackers.</li>
          <li>Content Security Policy, referrer policy, and enforced HTTPS.</li>
          <li>Draft recovery stored locally so browser crashes do not lose work.</li>
          <li>Rate limits and quotas to keep the service reliable for everyone.</li>
        </ul>
      </ContentSection>

      <ContentSection title="For teams and individuals" kicker="Flexible usage">
        <ul className="space-y-2">
          <li>Guest exploration without an account; sign in when ready to save progress.</li>
          <li>Saved preferences per user so your style follows you across sessions.</li>
          <li>Predictable quotas and Paddle billing with receipts and portal access.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Support" kicker="We’re here to help">
        <p>
          Have a request or need help adopting PromptForge? Email{' '}
          <a
            href={`mailto:${supportEmail}`}
            className="underline underline-offset-2 transition hover:text-[color-mix(in_srgb,var(--pf-foreground)_90%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--pf-foreground)_70%,transparent)] cursor-pointer"
          >
            {supportEmail}
          </a>{' '}
          and we’ll respond within 1–2 business days.
        </p>
      </ContentSection>
    </ContentPageLayout>
  )
}

