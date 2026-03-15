import type { Metadata } from 'next'
import { generateDigest } from '@/lib/digest'
import { DigestPreview } from '@/components/digest-preview'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Daily Digest — BetBrain',
  description: 'Your morning briefing: best value plays, line moves, and Smart Signals.',
}

export default async function DigestPage() {
  const digest = await generateDigest()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Daily Digest</h1>
        <p className="mt-1 text-muted-foreground">
          Your morning briefing — best value plays, significant line moves, and Smart Signals.
          Email delivery coming soon.
        </p>
      </div>

      <DigestPreview digest={digest} />
    </div>
  )
}
