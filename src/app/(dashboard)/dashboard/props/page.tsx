import type { Metadata } from 'next'
import { PropAnalyzerForm } from '@/components/prop-analyzer'

export const metadata: Metadata = {
  title: 'Prop Analyzer — BetBrain',
  description: 'AI-powered player prop bet analysis. Get structured assessments of any prop bet.',
}

export default function PropsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Prop Bet Analyzer</h1>
        <p className="mt-1 text-muted-foreground">
          Enter a player prop bet and get AI-powered analysis with projected ranges,
          edge estimates, and key matchup factors.
        </p>
      </div>

      <PropAnalyzerForm />
    </div>
  )
}
