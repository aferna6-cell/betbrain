import type { Metadata } from 'next'
import { BankrollDashboard } from '@/components/bankroll-dashboard'
import { BankrollRecoveryCalculator } from '@/components/bankroll-recovery'
import { KellyOverridePanel } from '@/components/kelly-override'
import { BetSizingOptimizer } from '@/components/bet-sizing-optimizer'
import { BankrollMilestonesPanel } from '@/components/bankroll-milestones'

export const metadata: Metadata = {
  title: 'Bankroll Management — BetBrain',
  description: 'Track your bankroll, monitor drawdown, and optimize bet sizing with Kelly Criterion.',
}

export default function BankrollPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Bankroll Management</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Track your balance, monitor drawdown, and see your bankroll history over time.
        </p>
      </div>

      <BankrollDashboard />

      <div className="border-t border-border pt-6">
        <KellyOverridePanel />
      </div>

      <div className="border-t border-border pt-6">
        <BetSizingOptimizer />
      </div>

      <BankrollRecoveryCalculator />

      <div className="border-t border-border pt-6">
        <h2 className="text-xl font-bold mb-2">Milestones</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Track your bankroll growth against key milestones. Get alerts when you hit new highs or drawdowns.
        </p>
        <BankrollMilestonesPanel />
      </div>
    </div>
  )
}
