import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type TableName = keyof Database['public']['Tables']

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

  // Check Supabase connectivity + per-table schema status
  const tables: Record<string, 'ok' | 'missing' | 'error'> = {}
  let dbStatus: 'ok' | 'partial' | 'no_tables' | 'error' | 'not_configured' = 'not_configured'

  if (checks.supabase_service_key === 'ok') {
    try {
      const supabase = await createServiceClient()

      // Check each table created by migrations 001-008
      const requiredTables: TableName[] = [
        'profiles',        // migration 001
        'game_cache',      // migration 001
        'odds_cache',      // migration 001
        'ai_insights',     // migration 001
        'saved_analyses',  // migration 001
        'user_picks',      // migration 001
        'api_usage',       // migration 001
        'odds_history',    // migration 003
        'alerts',          // migration 004
        'signal_history',  // migration 008
      ]

      let okCount = 0
      for (const table of requiredTables) {
        const { error } = await supabase.from(table).select('id').limit(1)
        tables[table] = error ? 'missing' : 'ok'
        if (!error) okCount++
      }

      if (okCount === requiredTables.length) dbStatus = 'ok'
      else if (okCount === 0) dbStatus = 'no_tables'
      else dbStatus = 'partial'
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
    ...(Object.keys(tables).length > 0 && { tables }),
    timestamp: new Date().toISOString(),
  })
}
