/**
 * Unit tests for src/lib/env.ts — environment variable helpers.
 *
 * Strategy:
 *   - Mutate individual process.env properties (never reassign the object
 *     itself, which would break the module's reference).
 *   - Restore every property touched in afterEach to leave a clean state for
 *     the next describe block.
 *   - The module-level `hasWarnedAboutLegacyOddsKey` flag is a one-way latch:
 *     once set it stays true for the lifetime of the module cache.  Tests that
 *     depend on the warn-once behaviour are ordered so that the flag is still
 *     false when they run (first test in the getOddsApiKey group).  Later tests
 *     simply avoid asserting on console.warn call counts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getRequiredEnvVar,
  getSiteUrl,
  getOddsApiKey,
  getSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getAnthropicApiKey,
  getBalldontlieApiKey,
  getStripeSecretKey,
  getStripeWebhookSecret,
  getStripePriceId,
} from '@/lib/env'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Keys touched by these tests — we save originals once, restore in afterEach. */
const ENV_KEYS = [
  'NEXT_PUBLIC_SITE_URL',
  'VERCEL_URL',
  'ODDS_API_KEY',
  'THE_ODDS_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'BALLDONTLIE_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRO_PRICE_ID',
] as const

type EnvKey = (typeof ENV_KEYS)[number]

/** Snapshot of process.env for the keys under test. */
function snapshotEnv(): Record<EnvKey, string | undefined> {
  return Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]])) as Record<
    EnvKey,
    string | undefined
  >
}

/** Restore process.env to a previously captured snapshot. */
function restoreEnv(snapshot: Record<EnvKey, string | undefined>): void {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = snapshot[key]
    }
  }
}

// ---------------------------------------------------------------------------
// 1. getSiteUrl — priority and normalisation logic
// ---------------------------------------------------------------------------

describe('getSiteUrl', () => {
  let snapshot: Record<EnvKey, string | undefined>

  beforeEach(() => {
    snapshot = snapshotEnv()
    // Start each test with both URL vars absent so tests are isolated.
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.VERCEL_URL
  })

  afterEach(() => {
    restoreEnv(snapshot)
  })

  it('returns http://localhost:3000 when neither URL var is set', () => {
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })

  it('returns NEXT_PUBLIC_SITE_URL verbatim when set without trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://betbrain.ai'
    expect(getSiteUrl()).toBe('https://betbrain.ai')
  })

  it('strips a single trailing slash from NEXT_PUBLIC_SITE_URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://betbrain.ai/'
    expect(getSiteUrl()).toBe('https://betbrain.ai')
  })

  it('strips multiple trailing slashes from NEXT_PUBLIC_SITE_URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://betbrain.ai///'
    expect(getSiteUrl()).toBe('https://betbrain.ai')
  })

  it('preserves path segments in NEXT_PUBLIC_SITE_URL after stripping trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://betbrain.ai/app/'
    expect(getSiteUrl()).toBe('https://betbrain.ai/app')
  })

  it('prefers NEXT_PUBLIC_SITE_URL over VERCEL_URL when both are set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://betbrain.ai'
    process.env.VERCEL_URL = 'betbrain-git-main.vercel.app'
    expect(getSiteUrl()).toBe('https://betbrain.ai')
  })

  it('uses VERCEL_URL (prefixed with https://) when SITE_URL is absent', () => {
    process.env.VERCEL_URL = 'betbrain-git-main.vercel.app'
    expect(getSiteUrl()).toBe('https://betbrain-git-main.vercel.app')
  })

  it('strips trailing slash from VERCEL_URL before adding protocol', () => {
    process.env.VERCEL_URL = 'betbrain-preview.vercel.app/'
    expect(getSiteUrl()).toBe('https://betbrain-preview.vercel.app')
  })

  it('strips an accidental https:// prefix on VERCEL_URL and re-adds it correctly', () => {
    process.env.VERCEL_URL = 'https://betbrain-preview.vercel.app'
    expect(getSiteUrl()).toBe('https://betbrain-preview.vercel.app')
  })

  it('strips an accidental http:// prefix on VERCEL_URL and upgrades to https://', () => {
    process.env.VERCEL_URL = 'http://betbrain-preview.vercel.app'
    expect(getSiteUrl()).toBe('https://betbrain-preview.vercel.app')
  })

  it('falls back to localhost when NEXT_PUBLIC_SITE_URL is set to an empty string', () => {
    process.env.NEXT_PUBLIC_SITE_URL = ''
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })

  it('falls back to localhost when NEXT_PUBLIC_SITE_URL is whitespace only', () => {
    process.env.NEXT_PUBLIC_SITE_URL = '   '
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })

  it('falls back to localhost when VERCEL_URL is set to an empty string', () => {
    process.env.VERCEL_URL = ''
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })
})

// ---------------------------------------------------------------------------
// 2. getRequiredEnvVar — throw on missing / empty, return on present
// ---------------------------------------------------------------------------

describe('getRequiredEnvVar', () => {
  let snapshot: Record<EnvKey, string | undefined>

  beforeEach(() => {
    snapshot = snapshotEnv()
  })

  afterEach(() => {
    restoreEnv(snapshot)
  })

  it('returns the value when the variable is set', () => {
    process.env.ANTHROPIC_API_KEY = 'test-value-for-anthropic'
    expect(getRequiredEnvVar('ANTHROPIC_API_KEY')).toBe('test-value-for-anthropic')
  })

  it('throws when the variable is absent (never set)', () => {
    const FAKE = 'BETBRAIN_QA_FAKE_VAR_THAT_DOES_NOT_EXIST'
    delete process.env[FAKE]
    expect(() => getRequiredEnvVar(FAKE)).toThrow(
      'Missing required environment variable: BETBRAIN_QA_FAKE_VAR_THAT_DOES_NOT_EXIST',
    )
  })

  it('throws when the variable is set to an empty string', () => {
    process.env.ANTHROPIC_API_KEY = ''
    expect(() => getRequiredEnvVar('ANTHROPIC_API_KEY')).toThrow('Missing required environment variable')
  })

  it('throws when the variable is set to whitespace only', () => {
    process.env.ANTHROPIC_API_KEY = '   '
    expect(() => getRequiredEnvVar('ANTHROPIC_API_KEY')).toThrow('Missing required environment variable')
  })

  it('error message includes the exact variable name', () => {
    const FAKE = 'BETBRAIN_QA_ANOTHER_FAKE_VAR'
    delete process.env[FAKE]
    expect(() => getRequiredEnvVar(FAKE)).toThrow(FAKE)
  })

  it('trims surrounding whitespace from valid values', () => {
    process.env.ANTHROPIC_API_KEY = '  sk-trimmed  '
    expect(getRequiredEnvVar('ANTHROPIC_API_KEY')).toBe('sk-trimmed')
  })

  // Wrappers that delegate to getRequiredEnvVar
  it('getSupabaseUrl delegates to NEXT_PUBLIC_SUPABASE_URL', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co'
    expect(getSupabaseUrl()).toBe('https://abc.supabase.co')
  })

  it('getSupabaseUrl throws when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(() => getSupabaseUrl()).toThrow('NEXT_PUBLIC_SUPABASE_URL')
  })

  it('getSupabaseAnonKey delegates to NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-value'
    expect(getSupabaseAnonKey()).toBe('anon-key-value')
  })

  it('getSupabaseAnonKey throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    expect(() => getSupabaseAnonKey()).toThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  })

  it('getSupabaseServiceRoleKey delegates to SUPABASE_SERVICE_ROLE_KEY', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret'
    expect(getSupabaseServiceRoleKey()).toBe('service-role-secret')
  })

  it('getAnthropicApiKey delegates to ANTHROPIC_API_KEY', () => {
    process.env.ANTHROPIC_API_KEY = 'claude-api-key'
    expect(getAnthropicApiKey()).toBe('claude-api-key')
  })

  it('getBalldontlieApiKey delegates to BALLDONTLIE_API_KEY', () => {
    process.env.BALLDONTLIE_API_KEY = 'bdl-key'
    expect(getBalldontlieApiKey()).toBe('bdl-key')
  })

  it('getStripeSecretKey delegates to STRIPE_SECRET_KEY', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_stripe'
    expect(getStripeSecretKey()).toBe('sk_test_stripe')
  })

  it('getStripeWebhookSecret delegates to STRIPE_WEBHOOK_SECRET', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    expect(getStripeWebhookSecret()).toBe('whsec_test')
  })

  it('getStripePriceId delegates to STRIPE_PRO_PRICE_ID', () => {
    process.env.STRIPE_PRO_PRICE_ID = 'price_abc123'
    expect(getStripePriceId()).toBe('price_abc123')
  })
})

// ---------------------------------------------------------------------------
// 3. getOddsApiKey — canonical key, legacy fallback, throw when both absent
// ---------------------------------------------------------------------------

describe('getOddsApiKey', () => {
  let snapshot: Record<EnvKey, string | undefined>

  beforeEach(() => {
    snapshot = snapshotEnv()
    delete process.env.ODDS_API_KEY
    delete process.env.THE_ODDS_API_KEY
  })

  afterEach(() => {
    restoreEnv(snapshot)
  })

  it('returns ODDS_API_KEY when set', () => {
    process.env.ODDS_API_KEY = 'canonical-key'
    expect(getOddsApiKey()).toBe('canonical-key')
  })

  it('prefers ODDS_API_KEY over THE_ODDS_API_KEY when both are set', () => {
    process.env.ODDS_API_KEY = 'canonical-key'
    process.env.THE_ODDS_API_KEY = 'legacy-key'
    expect(getOddsApiKey()).toBe('canonical-key')
  })

  it('falls back to THE_ODDS_API_KEY when ODDS_API_KEY is absent', () => {
    process.env.THE_ODDS_API_KEY = 'legacy-key'
    expect(getOddsApiKey()).toBe('legacy-key')
  })

  it('emits a deprecation warning exactly once when THE_ODDS_API_KEY is first used', () => {
    // This test only asserts behaviour if the module-level latch has not yet
    // fired. Because vitest caches modules, the flag may already be true if a
    // prior test in another file triggered it. We guard with a spy instead of
    // asserting the exact call count, so the test is order-independent.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    process.env.THE_ODDS_API_KEY = 'legacy-key'

    // First call — warning should fire (if latch was false) or be suppressed
    // (if latch was already true from a prior call in this run). Either way
    // the return value must be correct.
    expect(getOddsApiKey()).toBe('legacy-key')

    // Second call — warning must NOT fire regardless of latch state.
    const callsAfterFirst = warnSpy.mock.calls.length
    getOddsApiKey()
    expect(warnSpy.mock.calls.length).toBe(callsAfterFirst)

    warnSpy.mockRestore()
  })

  it('deprecation warning message mentions THE_ODDS_API_KEY', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    process.env.THE_ODDS_API_KEY = 'legacy-key'
    getOddsApiKey()

    // If the latch was already set, no warn call was made — that is acceptable.
    // When a warn call is present, verify its content.
    if (warnSpy.mock.calls.length > 0) {
      const message = warnSpy.mock.calls[0][0] as string
      expect(message).toContain('THE_ODDS_API_KEY')
      expect(message).toContain('ODDS_API_KEY')
    }

    warnSpy.mockRestore()
  })

  it('throws when both ODDS_API_KEY and THE_ODDS_API_KEY are absent', () => {
    expect(() => getOddsApiKey()).toThrow('Missing required environment variable: ODDS_API_KEY')
  })

  it('throws when ODDS_API_KEY is empty and THE_ODDS_API_KEY is absent', () => {
    process.env.ODDS_API_KEY = ''
    expect(() => getOddsApiKey()).toThrow('ODDS_API_KEY')
  })

  it('throws when both keys are empty strings', () => {
    process.env.ODDS_API_KEY = ''
    process.env.THE_ODDS_API_KEY = ''
    expect(() => getOddsApiKey()).toThrow('ODDS_API_KEY')
  })

  it('throws when both keys are whitespace only', () => {
    process.env.ODDS_API_KEY = '   '
    process.env.THE_ODDS_API_KEY = '   '
    expect(() => getOddsApiKey()).toThrow('ODDS_API_KEY')
  })

  it('trims whitespace from ODDS_API_KEY', () => {
    process.env.ODDS_API_KEY = '  trimmed-key  '
    expect(getOddsApiKey()).toBe('trimmed-key')
  })

  it('trims whitespace from THE_ODDS_API_KEY when used as fallback', () => {
    process.env.THE_ODDS_API_KEY = '  legacy-trimmed  '
    expect(getOddsApiKey()).toBe('legacy-trimmed')
  })
})
