import type { Metadata } from 'next'
import { SavedAnalyses } from '@/components/saved-analyses'

export const metadata: Metadata = {
  title: 'Saved Analyses — BetBrain',
  description: 'Your bookmarked AI game analyses.',
}

export default function SavedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Saved Analyses</h1>
        <p className="mt-1 text-muted-foreground">
          Your bookmarked AI game analyses for quick reference.
        </p>
      </div>

      <SavedAnalyses />
    </div>
  )
}
