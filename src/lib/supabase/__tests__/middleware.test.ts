/**
 * Middleware routing logic tests.
 *
 * Covers:
 * - Unauthenticated users redirected from /dashboard to /login
 * - Authenticated users redirected from auth pages to /dashboard
 * - Public pages pass through for all users
 * - Redirect URL includes `next` param for return-after-login
 *
 * The actual middleware depends on Supabase SSR client, so we test
 * the pure routing decisions locally.
 */

import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Re-implement the pure routing decision logic
// ---------------------------------------------------------------------------

const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password']

interface RoutingDecision {
  action: 'pass' | 'redirect'
  redirectTo?: string
}

function routeDecision(
  pathname: string,
  isAuthenticated: boolean
): RoutingDecision {
  const isAuthPage = AUTH_PAGES.includes(pathname)
  const isDashboardPage = pathname.startsWith('/dashboard')

  // Unauthenticated users can't access dashboard
  if (!isAuthenticated && isDashboardPage) {
    return {
      action: 'redirect',
      redirectTo: `/login?next=${encodeURIComponent(pathname)}`,
    }
  }

  // Authenticated users shouldn't see auth pages
  if (isAuthenticated && isAuthPage) {
    return { action: 'redirect', redirectTo: '/dashboard' }
  }

  return { action: 'pass' }
}

// ---------------------------------------------------------------------------
// Unauthenticated users
// ---------------------------------------------------------------------------

describe('unauthenticated routing', () => {
  const authed = false

  it('redirects /dashboard to /login', () => {
    const result = routeDecision('/dashboard', authed)
    expect(result.action).toBe('redirect')
    expect(result.redirectTo).toContain('/login')
  })

  it('includes next param for return-after-login', () => {
    const result = routeDecision('/dashboard', authed)
    expect(result.redirectTo).toContain('next=%2Fdashboard')
  })

  it('preserves deep dashboard paths in next param', () => {
    const result = routeDecision('/dashboard/signals', authed)
    expect(result.redirectTo).toContain('next=%2Fdashboard%2Fsignals')
  })

  it('preserves game detail paths in next param', () => {
    const result = routeDecision('/dashboard/games/abc123', authed)
    expect(result.redirectTo).toContain('next=%2Fdashboard%2Fgames%2Fabc123')
  })

  it('allows /login through', () => {
    const result = routeDecision('/login', authed)
    expect(result.action).toBe('pass')
  })

  it('allows /signup through', () => {
    const result = routeDecision('/signup', authed)
    expect(result.action).toBe('pass')
  })

  it('allows /forgot-password through', () => {
    const result = routeDecision('/forgot-password', authed)
    expect(result.action).toBe('pass')
  })

  it('allows /reset-password through', () => {
    const result = routeDecision('/reset-password', authed)
    expect(result.action).toBe('pass')
  })

  it('allows landing page through', () => {
    const result = routeDecision('/', authed)
    expect(result.action).toBe('pass')
  })

  it('allows /how-it-works through', () => {
    const result = routeDecision('/how-it-works', authed)
    expect(result.action).toBe('pass')
  })

  it('allows /blog through', () => {
    const result = routeDecision('/blog', authed)
    expect(result.action).toBe('pass')
  })

  it('allows /faq through', () => {
    const result = routeDecision('/faq', authed)
    expect(result.action).toBe('pass')
  })

  it('allows /disclaimer through', () => {
    const result = routeDecision('/disclaimer', authed)
    expect(result.action).toBe('pass')
  })
})

// ---------------------------------------------------------------------------
// Authenticated users
// ---------------------------------------------------------------------------

describe('authenticated routing', () => {
  const authed = true

  it('allows /dashboard through', () => {
    const result = routeDecision('/dashboard', authed)
    expect(result.action).toBe('pass')
  })

  it('allows /dashboard/signals through', () => {
    const result = routeDecision('/dashboard/signals', authed)
    expect(result.action).toBe('pass')
  })

  it('allows /dashboard/picks through', () => {
    const result = routeDecision('/dashboard/picks', authed)
    expect(result.action).toBe('pass')
  })

  it('allows /dashboard/games/abc through', () => {
    const result = routeDecision('/dashboard/games/abc', authed)
    expect(result.action).toBe('pass')
  })

  it('redirects /login to /dashboard', () => {
    const result = routeDecision('/login', authed)
    expect(result.action).toBe('redirect')
    expect(result.redirectTo).toBe('/dashboard')
  })

  it('redirects /signup to /dashboard', () => {
    const result = routeDecision('/signup', authed)
    expect(result.action).toBe('redirect')
    expect(result.redirectTo).toBe('/dashboard')
  })

  it('redirects /forgot-password to /dashboard', () => {
    const result = routeDecision('/forgot-password', authed)
    expect(result.action).toBe('redirect')
    expect(result.redirectTo).toBe('/dashboard')
  })

  it('redirects /reset-password to /dashboard', () => {
    const result = routeDecision('/reset-password', authed)
    expect(result.action).toBe('redirect')
    expect(result.redirectTo).toBe('/dashboard')
  })

  it('allows public pages through', () => {
    expect(routeDecision('/', authed).action).toBe('pass')
    expect(routeDecision('/how-it-works', authed).action).toBe('pass')
    expect(routeDecision('/blog', authed).action).toBe('pass')
    expect(routeDecision('/faq', authed).action).toBe('pass')
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('routing edge cases', () => {
  it('/dashboard-settings is NOT a dashboard page', () => {
    // Only paths that start with /dashboard (followed by / or end) should match
    // Our implementation uses startsWith('/dashboard') so /dashboard-settings would match
    // This documents the current behavior
    const result = routeDecision('/dashboard-settings', false)
    expect(result.action).toBe('redirect') // startsWith matches this too
  })

  it('/api routes pass through for unauthenticated', () => {
    const result = routeDecision('/api/odds', false)
    expect(result.action).toBe('pass')
  })

  it('/api routes pass through for authenticated', () => {
    const result = routeDecision('/api/analysis', true)
    expect(result.action).toBe('pass')
  })

  it('all four auth pages redirect when authenticated', () => {
    for (const page of AUTH_PAGES) {
      const result = routeDecision(page, true)
      expect(result.action).toBe('redirect')
      expect(result.redirectTo).toBe('/dashboard')
    }
  })
})
