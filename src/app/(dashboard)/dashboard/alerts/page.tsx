import type { Metadata } from 'next'
import { AlertsView } from '@/components/alerts-view'

export const metadata: Metadata = {
  title: 'Alerts — BetBrain',
  description: 'Custom line movement alerts for your favorite games.',
}

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Alerts</h1>
        <p className="mt-1 text-muted-foreground">
          Set line movement alerts and get notified when odds cross your
          threshold.
        </p>
      </div>

      <AlertsView />
    </div>
  )
}
