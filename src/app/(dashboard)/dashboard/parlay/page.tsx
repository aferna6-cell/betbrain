import type { Metadata } from 'next'
import { ParlayBuilderForm } from '@/components/parlay-builder'

export const metadata: Metadata = {
  title: 'Parlay Builder — BetBrain',
  description: 'Build a parlay and get AI analysis of combined probability vs payout odds.',
}

export default function ParlayPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Parlay Builder</h1>
        <p className="mt-1 text-muted-foreground">
          Build a multi-leg parlay and get AI analysis of combined probability,
          expected value, and correlation warnings.
        </p>
      </div>

      <ParlayBuilderForm />
    </div>
  )
}
