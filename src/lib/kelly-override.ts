/**
 * Kelly Fraction Override — Global and per-bet Kelly multiplier preferences.
 *
 * Allows the user to set their default Kelly fraction (quarter/half/three-quarter/full)
 * and override it on a per-bet basis.
 *
 * Stores preferences in localStorage for persistence.
 */

export type KellyPreset = 'quarter' | 'half' | 'three-quarter' | 'full' | 'custom'

export interface KellyConfig {
  /** The preset label */
  preset: KellyPreset
  /** Actual multiplier (0.25, 0.5, 0.75, 1.0, or custom) */
  multiplier: number
}

export const KELLY_PRESETS: Record<KellyPreset, { label: string; multiplier: number; description: string }> = {
  quarter: {
    label: 'Quarter Kelly',
    multiplier: 0.25,
    description: 'Most conservative — recommended for beginners or high-variance bets',
  },
  half: {
    label: 'Half Kelly',
    multiplier: 0.5,
    description: 'Standard conservative — good balance of growth and risk',
  },
  'three-quarter': {
    label: 'Three-Quarter Kelly',
    multiplier: 0.75,
    description: 'Moderate aggression — for experienced bettors with edge confidence',
  },
  full: {
    label: 'Full Kelly',
    multiplier: 1.0,
    description: 'Maximum growth rate — high variance, not recommended for most',
  },
  custom: {
    label: 'Custom',
    multiplier: 0.5,
    description: 'Set your own Kelly multiplier',
  },
}

const STORAGE_KEY = 'betbrain-kelly-config'
const BET_OVERRIDES_KEY = 'betbrain-kelly-overrides'

/**
 * Get the global Kelly config from localStorage.
 */
export function getKellyConfig(): KellyConfig {
  if (typeof window === 'undefined') return { preset: 'quarter', multiplier: 0.25 }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as KellyConfig
      if (parsed.multiplier > 0 && parsed.multiplier <= 2) return parsed
    }
  } catch {
    // ignore
  }
  return { preset: 'quarter', multiplier: 0.25 }
}

/**
 * Set the global Kelly config.
 */
export function setKellyConfig(config: KellyConfig): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // ignore
  }
}

/**
 * Set a Kelly preset (convenience wrapper).
 */
export function setKellyPreset(preset: KellyPreset, customMultiplier?: number): KellyConfig {
  const multiplier = preset === 'custom'
    ? Math.max(0.1, Math.min(customMultiplier ?? 0.5, 2.0))
    : KELLY_PRESETS[preset].multiplier

  const config: KellyConfig = { preset, multiplier }
  setKellyConfig(config)
  return config
}

/**
 * Get a per-bet Kelly override.
 */
export function getBetKellyOverride(betId: string): KellyConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(BET_OVERRIDES_KEY)
    if (stored) {
      const overrides = JSON.parse(stored) as Record<string, KellyConfig>
      return overrides[betId] || null
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * Set a per-bet Kelly override.
 */
export function setBetKellyOverride(betId: string, config: KellyConfig): void {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(BET_OVERRIDES_KEY)
    const overrides = stored ? JSON.parse(stored) as Record<string, KellyConfig> : {}
    overrides[betId] = config
    localStorage.setItem(BET_OVERRIDES_KEY, JSON.stringify(overrides))
  } catch {
    // ignore
  }
}

/**
 * Clear a per-bet Kelly override (revert to global).
 */
export function clearBetKellyOverride(betId: string): void {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(BET_OVERRIDES_KEY)
    if (stored) {
      const overrides = JSON.parse(stored) as Record<string, KellyConfig>
      delete overrides[betId]
      localStorage.setItem(BET_OVERRIDES_KEY, JSON.stringify(overrides))
    }
  } catch {
    // ignore
  }
}

/**
 * Get the effective Kelly multiplier for a bet.
 * Returns per-bet override if set, otherwise global config.
 */
export function getEffectiveKellyMultiplier(betId?: string): number {
  if (betId) {
    const override = getBetKellyOverride(betId)
    if (override) return override.multiplier
  }
  return getKellyConfig().multiplier
}

/**
 * Calculate risk-adjusted Kelly based on edge quality.
 * Reduces Kelly fraction when edge confidence is low.
 */
export function adjustedKelly(
  baseMultiplier: number,
  edgeConfidence: number // 0 to 100
): number {
  // Scale multiplier by edge confidence
  // At 100% confidence, use full multiplier
  // At 50% confidence, use half of the multiplier
  const confidenceScale = Math.max(0.25, edgeConfidence / 100)
  return Math.round(baseMultiplier * confidenceScale * 100) / 100
}
