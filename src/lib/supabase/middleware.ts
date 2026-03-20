import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // If Supabase env vars are not configured, skip auth entirely.
  // This allows public pages (landing, betting-101, blog) to load
  // even before the deployment is fully configured.
  let supabaseUrl: string
  let supabaseAnonKey: string
  try {
    supabaseUrl = getSupabaseUrl()
    supabaseAnonKey = getSupabaseAnonKey()
  } catch {
    // Env vars missing — let the request through without auth checks.
    // Dashboard pages will show an error boundary; public pages work fine.
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — important for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/reset-password'
  const isDashboardPage = pathname.startsWith('/dashboard')

  // Redirect unauthenticated users away from protected routes
  if (!user && isDashboardPage) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (user && isAuthPage) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  return supabaseResponse
}
