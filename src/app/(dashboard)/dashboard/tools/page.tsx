import type { Metadata } from 'next'
import { OddsConverter } from '@/components/odds-converter'

export const metadata: Metadata = {
  title: 'Odds Tools — BetBrain',
  description:
    'Convert between American, decimal, and fractional odds formats. Calculate vig and fair odds.',
}

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Odds Tools</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Convert between odds formats and calculate bookmaker vig in real time.
        </p>
      </div>

      <OddsConverter />
    </div>
  )
}
