const DEFAULT_SITE_URL = 'http://localhost:3000'

let hasWarnedAboutLegacyOddsKey = false

function readEnvVar(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

export function getRequiredEnvVar(name: string): string {
  const value = readEnvVar(name)
  if (value) {
    return value
  }

  throw new Error(`Missing required environment variable: ${name}`)
}

export function getSupabaseUrl(): string {
  return getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL')
}

export function getSupabaseAnonKey(): string {
  return getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export function getSupabaseServiceRoleKey(): string {
  return getRequiredEnvVar('SUPABASE_SERVICE_ROLE_KEY')
}

export function getOddsApiKey(): string {
  const canonicalKey = readEnvVar('ODDS_API_KEY')
  if (canonicalKey) {
    return canonicalKey
  }

  const legacyKey = readEnvVar('THE_ODDS_API_KEY')
  if (legacyKey) {
    if (!hasWarnedAboutLegacyOddsKey) {
      console.warn('[env] THE_ODDS_API_KEY is deprecated. Rename it to ODDS_API_KEY.')
      hasWarnedAboutLegacyOddsKey = true
    }

    return legacyKey
  }

  throw new Error('Missing required environment variable: ODDS_API_KEY')
}

export function getBalldontlieApiKey(): string {
  return getRequiredEnvVar('BALLDONTLIE_API_KEY')
}

export function getSiteUrl(): string {
  const configuredSiteUrl = readEnvVar('NEXT_PUBLIC_SITE_URL')
  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/+$/, '')
  }

  const vercelUrl = readEnvVar('VERCEL_URL')
  if (vercelUrl) {
    const normalizedVercelUrl = vercelUrl
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
    return `https://${normalizedVercelUrl}`
  }

  return DEFAULT_SITE_URL
}
