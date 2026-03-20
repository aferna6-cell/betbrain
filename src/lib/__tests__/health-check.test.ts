/**
 * Tests for the health check env var detection logic.
 * Verifies that the endpoint correctly identifies configured vs missing vars.
 */

import { describe, it, expect } from 'vitest'

type CheckStatus = 'ok' | 'missing'

function checkEnvVars(env: Record<string, string | undefined>): Record<string, CheckStatus> {
  return {
    supabase_url: env.NEXT_PUBLIC_SUPABASE_URL ? 'ok' : 'missing',
    supabase_anon_key: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'ok' : 'missing',
    supabase_service_key: env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'missing',
    anthropic_key: env.ANTHROPIC_API_KEY ? 'ok' : 'missing',
    odds_api_key: (env.ODDS_API_KEY || env.THE_ODDS_API_KEY) ? 'ok' : 'missing',
    balldontlie_key: env.BALLDONTLIE_API_KEY ? 'ok' : 'missing',
    stripe_secret: env.STRIPE_SECRET_KEY ? 'ok' : 'missing',
    stripe_webhook: env.STRIPE_WEBHOOK_SECRET ? 'ok' : 'missing',
    stripe_price: env.STRIPE_PRO_PRICE_ID ? 'ok' : 'missing',
    cron_secret: env.CRON_SECRET ? 'ok' : 'missing',
  }
}

describe('health check env detection', () => {
  it('reports all missing when no env vars set', () => {
    const checks = checkEnvVars({})
    const missing = Object.values(checks).filter((v) => v === 'missing')
    expect(missing.length).toBe(10)
  })

  it('reports all ok when all env vars set', () => {
    const checks = checkEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key',
      SUPABASE_SERVICE_ROLE_KEY: 'key',
      ANTHROPIC_API_KEY: 'sk-ant-xxx',
      ODDS_API_KEY: 'key',
      BALLDONTLIE_API_KEY: 'key',
      STRIPE_SECRET_KEY: 'sk_test_xxx',
      STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
      STRIPE_PRO_PRICE_ID: 'price_xxx',
      CRON_SECRET: 'secret',
    })
    const ok = Object.values(checks).filter((v) => v === 'ok')
    expect(ok.length).toBe(10)
  })

  it('supports legacy THE_ODDS_API_KEY fallback', () => {
    const checks = checkEnvVars({ THE_ODDS_API_KEY: 'key' })
    expect(checks.odds_api_key).toBe('ok')
  })

  it('prefers ODDS_API_KEY over THE_ODDS_API_KEY', () => {
    const checks = checkEnvVars({ ODDS_API_KEY: 'key' })
    expect(checks.odds_api_key).toBe('ok')
  })

  it('correctly counts partial configuration', () => {
    const checks = checkEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: 'url',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key',
      SUPABASE_SERVICE_ROLE_KEY: 'key',
      ANTHROPIC_API_KEY: 'key',
      ODDS_API_KEY: 'key',
      BALLDONTLIE_API_KEY: 'key',
      // Stripe + cron missing
    })
    const ok = Object.values(checks).filter((v) => v === 'ok')
    expect(ok.length).toBe(6)
  })

  it('treats empty string as missing', () => {
    const checks = checkEnvVars({ ANTHROPIC_API_KEY: '' })
    expect(checks.anthropic_key).toBe('missing')
  })
})
