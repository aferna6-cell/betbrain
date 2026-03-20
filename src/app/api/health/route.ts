import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/health
 *
 * Public health check endpoint for monitoring and post-deploy verification.
 * Returns the status of each required service connection without exposing secrets.
 */
export async function GET() {
  const checks: Record<string, 'ok' | 'missing' | 'error'> = {}

  // Check env vars (existence only — never expose values)
  checks.supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'ok' : 'missing'
  checks.supabase_anon_key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'ok' : 'missing'
  checks.supabase_service_key = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'missing'
  checks.anthropic_key = process.env.ANTHROPIC_API_KEY ? 'ok' : 'missing'
  checks.odds_api_key = (process.env.ODDS_API_KEY || process.env.THE_ODDS_API_KEY) ? 'ok' : 'missing'
  checks.balldontlie_key = process.env.BALLDONTLIE_API_KEY ? 'ok' : 'missing'
  checks.stripe_secret = process.env.STRIPE_SECRET_KEY ? 'ok' : 'missing'
  checks.stripe_webhook = process.env.STRIPE_WEBHOOK_SECRET ? 'ok' : 'missing'
  checks.stripe_price = process.env.STRIPE_PRO_PRICE_ID ? 'ok' : 'missing'
  checks.cron_secret = process.env.CRON_SECRET ? 'ok' : 'missing'

  // Check Supabase connectivity + schema (if env vars are present)
  let dbStatus: 'ok' | 'no_tables' | 'error' | 'not_configured' = 'not_configured'
  if (checks.supabase_service_key === 'ok') {
    try {
      const supabase = await createServiceClient()
      const { error } = await supabase.from('profiles').select('id').limit(1)
      dbStatus = error ? 'no_tables' : 'ok'
    } catch {
      dbStatus = 'error'
    }
  }

  const configured = Object.values(checks).filter((v) => v === 'ok').length
  const total = Object.keys(checks).length
  const allOk = configured === total && dbStatus === 'ok'

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    configured: `${configured}/${total}`,
    checks,
    database: dbStatus,
    timestamp: new Date().toISOString(),
  })
}
