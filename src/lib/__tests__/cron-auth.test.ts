/**
 * Tests for cron route authentication pattern.
 *
 * The cron resolve route uses CRON_SECRET bearer token auth
 * instead of Supabase session auth. These tests verify the
 * auth validation logic works correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Test the auth check pattern directly (the route handler itself
// requires Next.js runtime, so we test the logic in isolation)

describe('cron auth validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function checkCronAuth(authHeader: string | null, cronSecret: string | undefined): boolean {
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return false
    }
    return true
  }

  it('allows request when CRON_SECRET matches', () => {
    expect(checkCronAuth('Bearer my-secret', 'my-secret')).toBe(true)
  })

  it('rejects request when CRON_SECRET does not match', () => {
    expect(checkCronAuth('Bearer wrong-secret', 'my-secret')).toBe(false)
  })

  it('rejects request with no auth header when secret is set', () => {
    expect(checkCronAuth(null, 'my-secret')).toBe(false)
  })

  it('allows request when CRON_SECRET is not configured (open access)', () => {
    expect(checkCronAuth(null, undefined)).toBe(true)
    expect(checkCronAuth('Bearer anything', undefined)).toBe(true)
  })

  it('rejects request with malformed auth header', () => {
    expect(checkCronAuth('my-secret', 'my-secret')).toBe(false) // no "Bearer " prefix
    expect(checkCronAuth('Basic my-secret', 'my-secret')).toBe(false) // wrong scheme
  })

  it('is case-sensitive on the secret', () => {
    expect(checkCronAuth('Bearer My-Secret', 'my-secret')).toBe(false)
  })
})
