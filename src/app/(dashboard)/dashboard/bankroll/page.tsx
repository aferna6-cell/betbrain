import type { Metadata } from 'next'
import { BankrollDashboard } from '@/components/bankroll-dashboard'

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
    </div>
  )
}
