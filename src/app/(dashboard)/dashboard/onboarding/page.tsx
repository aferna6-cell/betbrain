import type { Metadata } from 'next'
import { OnboardingPreview } from '@/components/onboarding-preview'

export const metadata: Metadata = {
  title: 'Onboarding Emails — BetBrain',
  description: 'Preview and manage onboarding email sequence.',
}

export default function OnboardingEmailsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Onboarding Emails</h1>
        <p className="mt-1 text-muted-foreground">
          Preview the 3-email onboarding sequence sent to new users. Customize the preview name to
          see personalization. Email delivery via Resend is a future phase.
        </p>
      </div>

      <OnboardingPreview />
    </div>
  )
}
