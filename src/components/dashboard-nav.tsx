'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/profile', label: 'Profile' },
]

export function DashboardNav({ user }: { user: User }) {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold">
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
          <span className="hidden text-sm text-muted-foreground sm:block">
            {user.email}
          </span>
          <form action="/auth/logout" method="POST">
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
