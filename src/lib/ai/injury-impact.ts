/**
 * Injury impact analysis — uses Claude to assess how a player injury
 * changes the value picture for a game relative to current odds.
 */

import Anthropic from '@anthropic-ai/sdk'
import { getAnthropicApiKey } from '@/lib/env'
import { AI_DISCLAIMER } from '@/lib/ai/analysis'
import type { NormalizedGame } from '@/lib/sports/config'

const MODEL = 'claude-sonnet-4-5-20250514'

export interface InjuryImpactAnalysis {
  playerName: string
  injuryStatus: string
  impactSummary: string
  winProbabilityShift: {
    direction: 'favors_home' | 'favors_away' | 'negligible'
    magnitude: 'large' | 'moderate' | 'small'
    explanation: string
  }
  lineImpact: {
    alreadyPricedIn: boolean
    explanation: string
  }
  valueShift: {
    side: 'home' | 'away' | 'neither'
    reasoning: string
  }
  disclaimer: string
}

function buildInjuryPrompt(
  game: NormalizedGame,
  playerName: string,
  injuryStatus: string
): string {
  const oddsSection = game.bookmakers
    .slice(0, 3)
    .map((bk) => {
      const parts: string[] = [`  ${bk.bookmaker}:`]
      if (bk.moneyline) {
        parts.push(
          `    ML: Home ${bk.moneyline.home ?? 'N/A'} / Away ${bk.moneyline.away ?? 'N/A'}`
        )
      }
      if (bk.spread) {
        parts.push(
          `    Spread: Home ${bk.spread.homeLine ?? 'N/A'} (${bk.spread.homeOdds ?? 'N/A'}) / Away ${bk.spread.awayLine ?? 'N/A'} (${bk.spread.awayOdds ?? 'N/A'})`
        )
      }
      return parts.join('\n')
    })
    .join('\n')

  return `Analyze how this player injury impacts the following ${game.sport.toUpperCase()} game.

MATCHUP:
  Away: ${game.awayTeam}
  Home: ${game.homeTeam}
  Start: ${game.commenceTime}

INJURY:
  Player: ${playerName}
  Status: ${injuryStatus}

CURRENT ODDS (${game.bookmakers.length} bookmakers):
${oddsSection}

Provide your analysis as a JSON object with exactly these fields:
{
  "impactSummary": "2-3 sentence summary of how this injury changes the game",
  "winProbabilityShift": {
    "direction": "favors_home" | "favors_away" | "negligible",
    "magnitude": "large" | "moderate" | "small",
    "explanation": "1-2 sentences on the probability shift"
  },
  "lineImpact": {
    "alreadyPricedIn": true/false,
    "explanation": "1-2 sentences on whether current odds reflect this injury"
  },
  "valueShift": {
    "side": "home" | "away" | "neither",
    "reasoning": "1-2 sentences on which side now has better value"
  }
}

Guidelines:
- Consider the player's importance to their team (star vs. role player)
- Compare current odds to what they should be given the injury
- If the player is minor, say the impact is negligible — don't overstate
- If the injury was announced days ago, odds likely already reflect it
- Be specific about WHY the injury matters (scoring, defense, matchup, etc.)

Return ONLY the JSON object, no other text.`
}

export async function analyzeInjuryImpact(
  game: NormalizedGame,
  playerName: string,
  injuryStatus: string
): Promise<InjuryImpactAnalysis> {
  const client = new Anthropic({ apiKey: getAnthropicApiKey() })

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: buildInjuryPrompt(game, playerName, injuryStatus),
      },
    ],
  })

  const textContent = message.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  let parsed: {
    impactSummary: string
    winProbabilityShift: {
      direction: string
      magnitude: string
      explanation: string
    }
    lineImpact: {
      alreadyPricedIn: boolean
      explanation: string
    }
    valueShift: {
      side: string
      reasoning: string
    }
  }

  try {
    const jsonStr = textContent.text
      .replace(/^```json?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[ai] Failed to parse injury analysis:', textContent.text)
    throw new Error('Failed to parse injury impact analysis')
  }

  const validDirections = ['favors_home', 'favors_away', 'negligible'] as const
  const validMagnitudes = ['large', 'moderate', 'small'] as const
  const validSides = ['home', 'away', 'neither'] as const

  return {
    playerName,
    injuryStatus,
    impactSummary: parsed.impactSummary ?? 'Unable to assess impact.',
    winProbabilityShift: {
      direction: validDirections.includes(
        parsed.winProbabilityShift?.direction as typeof validDirections[number]
      )
        ? (parsed.winProbabilityShift.direction as typeof validDirections[number])
        : 'negligible',
      magnitude: validMagnitudes.includes(
        parsed.winProbabilityShift?.magnitude as typeof validMagnitudes[number]
      )
        ? (parsed.winProbabilityShift.magnitude as typeof validMagnitudes[number])
        : 'small',
      explanation:
        parsed.winProbabilityShift?.explanation ?? 'Unable to determine.',
    },
    lineImpact: {
      alreadyPricedIn: parsed.lineImpact?.alreadyPricedIn ?? false,
      explanation: parsed.lineImpact?.explanation ?? 'Unable to determine.',
    },
    valueShift: {
      side: validSides.includes(
        parsed.valueShift?.side as typeof validSides[number]
      )
        ? (parsed.valueShift.side as typeof validSides[number])
        : 'neither',
      reasoning: parsed.valueShift?.reasoning ?? 'Unable to determine.',
    },
    disclaimer: AI_DISCLAIMER,
  }
}
