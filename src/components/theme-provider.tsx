'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type Theme = 'dark' | 'light' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') return getSystemTheme()
  return theme
}

function applyTheme(resolved: 'dark' | 'light') {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')

  // On mount, read the stored preference and apply it
  useEffect(() => {
    let stored: Theme = 'dark'
    try {
      const raw = localStorage.getItem('betbrain-theme')
      if (raw === 'dark' || raw === 'light' || raw === 'system') {
        stored = raw
      }
    } catch {
      // localStorage may be unavailable in some environments
    }

    const resolved = resolveTheme(stored)
    // Hydration: sync state with localStorage on mount — not a cascading render
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(stored)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [])

  // Listen for system preference changes when theme === 'system'
  useEffect(() => {
    if (theme !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const resolved: 'dark' | 'light' = e.matches ? 'dark' : 'light'
      setResolvedTheme(resolved)
      applyTheme(resolved)
    }

    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    const resolved = resolveTheme(next)
    setThemeState(next)
    setResolvedTheme(resolved)
    applyTheme(resolved)
    try {
      localStorage.setItem('betbrain-theme', next)
    } catch {
      // localStorage may be unavailable
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
