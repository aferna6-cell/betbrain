'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SearchPalette } from '@/components/search'
import { ThemeToggle } from '@/components/theme-toggle'
import type { User } from '@supabase/supabase-js'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/saved', label: 'Saved' },
  { href: '/dashboard/signals', label: 'Signals' },
  { href: '/dashboard/alerts', label: 'Alerts' },
  { href: '/dashboard/picks', label: 'Picks' },
  { href: '/dashboard/digest', label: 'Digest' },
  { href: '/dashboard/props', label: 'Props' },
  { href: '/dashboard/parlay', label: 'Parlay' },
  { href: '/dashboard/backtesting', label: 'Backtest' },
  { href: '/dashboard/leaderboard', label: 'Leaders' },
  { href: '/dashboard/api', label: 'API' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/profile', label: 'Profile' },
]

export function DashboardNav({ user }: { user: User }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="text-xl font-bold"
            onClick={() => setMobileOpen(false)}
          >
            BetBrain
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <SearchPalette />
          <ThemeToggle />
          <span className="hidden text-sm text-muted-foreground sm:block">
            {user.email}
          </span>
          <form action="/auth/logout" method="POST" className="hidden sm:block">
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
          {/* Hamburger / close button — mobile only */}
          <button
            type="button"
            className="sm:hidden rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? (
              /* X icon */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              /* Hamburger icon */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-card">
          <nav className="flex flex-col px-4 py-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground truncate">
              {user.email}
            </span>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <form action="/auth/logout" method="POST">
                <Button variant="outline" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
