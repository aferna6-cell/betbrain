/**
 * Alert rules — create, list, delete, and check user-defined line alerts.
 *
 * An alert rule fires when a bookmaker's line for the specified team/market
 * crosses the user's threshold in the specified direction.
 * Supports moneyline (odds), spreads (point line), and totals (point line).
 */

import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

/**
 * Extracts the relevant numeric value from a bookmaker's odds for alert comparison.
 * - moneyline: American odds (e.g. -110)
 * - spreads: point line (e.g. -5.5)
 * - totals: total line (e.g. 220.5) — ignores side, uses the line value
 */
function getAlertValue(
  bk: NormalizedBookmakerOdds,
  market: string,
  side: 'home' | 'away'
): number | null {
  switch (market) {
    case 'moneyline':
      return side === 'home' ? bk.moneyline?.home ?? null : bk.moneyline?.away ?? null
    case 'spreads':
      return side === 'home' ? bk.spread?.homeLine ?? null : bk.spread?.awayLine ?? null
    case 'totals':
      return bk.total?.line ?? null
    default:
      return null
  }
}

type AlertRow = Database['public']['Tables']['alerts']['Row']
type AlertInsert = Database['public']['Tables']['alerts']['Insert']

export type { AlertRow }

export type AlertMarket = 'moneyline' | 'spreads' | 'totals'

export interface CreateAlertInput {
  userId: string
  externalGameId: string
  sport: string
  team: string
  side: 'home' | 'away'
  market?: AlertMarket
  condition: 'above' | 'below'
  threshold: number
}

export async function createAlert(input: CreateAlertInput): Promise<AlertRow | null> {
  const supabase = await createServiceClient()

  const row: AlertInsert = {
    user_id: input.userId,
    external_game_id: input.externalGameId,
    sport: input.sport,
    team: input.team,
    side: input.side,
    market: input.market ?? 'moneyline',
    condition: input.condition,
    threshold: input.threshold,
  }

  const { data, error } = await supabase
    .from('alerts')
    .insert(row)
    .select('*')
    .single()

  if (error) {
    console.error('[alerts] Failed to create alert:', error.message)
    return null
  }

  return data as AlertRow
}

export async function getUserAlerts(userId: string): Promise<AlertRow[]> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[alerts] Failed to fetch alerts:', error.message)
    return []
  }

  return (data ?? []) as AlertRow[]
}

export async function deleteAlert(alertId: string, userId: string): Promise<boolean> {
  const supabase = await createServiceClient()

  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', alertId)
    .eq('user_id', userId)

  if (error) {
    console.error('[alerts] Failed to delete alert:', error.message)
    return false
  }

  return true
}

/**
 * Checks all active (untriggered) alerts against current game odds.
 * Triggers alerts that match and marks them in the database.
 *
 * Called after each odds fetch to evaluate new data.
 */
export async function checkAlerts(games: NormalizedGame[]): Promise<number> {
  const supabase = await createServiceClient()
  const gameIds = games.map((g) => g.id)

  // Fetch all active alerts for these games
  const { data: activeAlerts, error } = await supabase
    .from('alerts')
    .select('*')
    .in('external_game_id', gameIds)
    .eq('triggered', false)

  if (error || !activeAlerts || activeAlerts.length === 0) {
    return 0
  }

  const alerts = activeAlerts as AlertRow[]
  const gameMap = new Map(games.map((g) => [g.id, g]))
  let triggeredCount = 0

  for (const alert of alerts) {
    const game = gameMap.get(alert.external_game_id)
    if (!game) continue

    // Check each bookmaker for the alert condition
    for (const bk of game.bookmakers) {
      const value = getAlertValue(bk, alert.market, alert.side)
      if (value === null) continue

      const triggered =
        alert.condition === 'above'
          ? value > alert.threshold
          : value < alert.threshold

      if (triggered) {
        const { error: updateError } = await supabase
          .from('alerts')
          .update({
            triggered: true,
            triggered_at: new Date().toISOString(),
            triggered_value: value,
          })
          .eq('id', alert.id)

        if (!updateError) {
          triggeredCount++
        }
        break // One bookmaker matching is enough
      }
    }
  }

  return triggeredCount
}
