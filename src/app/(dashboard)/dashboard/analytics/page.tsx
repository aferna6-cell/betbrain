import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getUserAnalytics } from '@/lib/analytics'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'
import { TimeAnalysisPanel } from '@/components/time-analysis'
import { ConfidenceCalibrationPanel } from '@/components/confidence-calibration'
import { CLVTrendSection } from '@/components/clv-trend-section'
import { HomeAwaySplits } from '@/components/home-away-splits'
import { ModelAccuracyPanel } from '@/components/model-accuracy'
import { SeasonSummaryPanel } from '@/components/season-summary'
import { CorrelationMatrixPanel } from '@/components/correlation-matrix'
import { PerformanceInsights } from '@/components/performance-insights'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Analytics — BetBrain',
  description: 'Your performance metrics, pick breakdowns, and activity summary.',
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const analytics = await getUserAnalytics(user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Your pick performance, activity metrics, and API usage at a glance.
        </p>
      </div>

      <div className="border-b border-border pb-6">
        <PerformanceInsights />
      </div>

      <div className="border-b border-border pb-6">
        <h2 className="text-xl font-bold mb-2">Season Summary</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your overall season performance at a glance, with a letter grade and key highlights.
        </p>
        <SeasonSummaryPanel />
      </div>

      <AnalyticsDashboard data={analytics} />

      <div className="border-t border-border pt-6">
        <h2 className="text-xl font-bold mb-2">CLV Trend</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Track your closing line value over time. Consistently beating the closing line
          is the single best predictor of long-term profitability.
        </p>
        <CLVTrendSection />
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-xl font-bold mb-2">Performance by Time of Day</h2>
        <p className="text-sm text-muted-foreground mb-4">
          When are you making your best (and worst) picks?
        </p>
        <TimeAnalysisPanel />
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-xl font-bold mb-2">Home / Away Splits</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Compare your performance on home picks vs away picks.
        </p>
        <HomeAwaySplits />
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-xl font-bold mb-2">Confidence Calibration</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Are your confidence ratings accurate? Track how well your stated confidence matches actual win rates.
        </p>
        <ConfidenceCalibrationPanel />
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-xl font-bold mb-2">AI Model Accuracy</h2>
        <p className="text-sm text-muted-foreground mb-4">
          How well does the AI&apos;s confidence predict actual outcomes? Track prediction calibration,
          Brier score, and accuracy by confidence level.
        </p>
        <ModelAccuracyPanel />
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-xl font-bold mb-2">Correlation Matrix</h2>
        <p className="text-sm text-muted-foreground mb-4">
          See how your performance in different sports or bet types correlates.
          Low or negative correlation means better diversification.
        </p>
        <CorrelationMatrixPanel />
      </div>
    </div>
  )
}
