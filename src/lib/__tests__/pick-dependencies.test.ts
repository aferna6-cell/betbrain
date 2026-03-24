import { describe, it, expect } from 'vitest'
import { buildDependencyGraph, type PickNode } from '../pick-dependencies'

function makeNode(id: string, overrides: Partial<PickNode> = {}): PickNode {
  return {
    id,
    label: `Pick ${id}`,
    sport: 'NBA',
    game_date: '2026-01-15',
    pick_team: 'Lakers',
    bet_type: 'moneyline',
    outcome: 'win',
    ...overrides,
  }
}

describe('buildDependencyGraph', () => {
  it('returns empty for < 2 picks', () => {
    const result = buildDependencyGraph([makeNode('1')])
    expect(result.edges).toEqual([])
    expect(result.clusters).toEqual([])
  })

  it('detects same-game correlation (same team + date)', () => {
    const picks = [
      makeNode('1', { pick_team: 'Lakers', game_date: '2026-01-15', bet_type: 'moneyline' }),
      makeNode('2', { pick_team: 'Lakers', game_date: '2026-01-15', bet_type: 'spread' }),
    ]
    const result = buildDependencyGraph(picks)
    expect(result.edges.length).toBeGreaterThan(0)
    expect(result.edges[0].type).toBe('same-game')
  })

  it('detects same-team across different dates', () => {
    const picks = [
      makeNode('1', { pick_team: 'Lakers', game_date: '2026-01-15' }),
      makeNode('2', { pick_team: 'Lakers', game_date: '2026-01-17' }),
    ]
    const result = buildDependencyGraph(picks)
    const teamEdges = result.edges.filter((e) => e.type === 'same-team')
    expect(teamEdges.length).toBe(1)
  })

  it('detects same-day-sport with 3+ picks', () => {
    const picks = [
      makeNode('1', { sport: 'NBA', game_date: '2026-01-15', pick_team: 'Lakers' }),
      makeNode('2', { sport: 'NBA', game_date: '2026-01-15', pick_team: 'Celtics' }),
      makeNode('3', { sport: 'NBA', game_date: '2026-01-15', pick_team: 'Warriors' }),
    ]
    const result = buildDependencyGraph(picks)
    const dayEdges = result.edges.filter((e) => e.type === 'same-day-sport')
    expect(dayEdges.length).toBeGreaterThan(0)
  })

  it('does not flag same-day-sport for only 2 picks', () => {
    const picks = [
      makeNode('1', { sport: 'NBA', game_date: '2026-01-15', pick_team: 'Lakers' }),
      makeNode('2', { sport: 'NBA', game_date: '2026-01-15', pick_team: 'Celtics' }),
    ]
    const result = buildDependencyGraph(picks)
    const dayEdges = result.edges.filter((e) => e.type === 'same-day-sport')
    expect(dayEdges.length).toBe(0)
  })

  it('no correlation between different sports different days', () => {
    const picks = [
      makeNode('1', { sport: 'NBA', game_date: '2026-01-15', pick_team: 'Lakers' }),
      makeNode('2', { sport: 'NFL', game_date: '2026-01-16', pick_team: 'Chiefs' }),
    ]
    const result = buildDependencyGraph(picks)
    expect(result.edges.length).toBe(0)
    expect(result.correlatedRate).toBe(0)
  })

  it('builds clusters from connected picks', () => {
    const picks = [
      makeNode('1', { pick_team: 'Lakers', game_date: '2026-01-15' }),
      makeNode('2', { pick_team: 'Lakers', game_date: '2026-01-15' }),
      makeNode('3', { sport: 'NFL', game_date: '2026-01-16', pick_team: 'Chiefs' }),
    ]
    const result = buildDependencyGraph(picks)
    expect(result.clusters.length).toBe(1)
    expect(result.clusters[0].pickIds).toContain('1')
    expect(result.clusters[0].pickIds).toContain('2')
    expect(result.clusters[0].pickIds).not.toContain('3')
  })

  it('high risk for same-game clusters', () => {
    const picks = [
      makeNode('1', { pick_team: 'Lakers', game_date: '2026-01-15' }),
      makeNode('2', { pick_team: 'Lakers', game_date: '2026-01-15' }),
    ]
    const result = buildDependencyGraph(picks)
    expect(result.clusters[0].riskLevel).toBe('high')
  })

  it('calculates correlatedRate correctly', () => {
    const picks = [
      makeNode('1', { pick_team: 'Lakers', game_date: '2026-01-15' }),
      makeNode('2', { pick_team: 'Lakers', game_date: '2026-01-15' }),
      makeNode('3', { sport: 'NFL', game_date: '2026-01-16', pick_team: 'Chiefs' }),
      makeNode('4', { sport: 'MLB', game_date: '2026-04-01', pick_team: 'Yankees' }),
    ]
    const result = buildDependencyGraph(picks)
    expect(result.correlatedRate).toBe(50) // 2 out of 4
  })

  it('deduplicates edges', () => {
    const picks = [
      makeNode('1', { pick_team: 'Lakers', game_date: '2026-01-15' }),
      makeNode('2', { pick_team: 'Lakers', game_date: '2026-01-15' }),
    ]
    const result = buildDependencyGraph(picks)
    // Same-game edge only (no duplicate)
    const edgeKeys = result.edges.map((e) => [e.source, e.target].sort().join('|'))
    const unique = new Set(edgeKeys)
    expect(edgeKeys.length).toBe(unique.size)
  })

  it('generates risk summary', () => {
    const picks = [
      makeNode('1', { pick_team: 'Lakers', game_date: '2026-01-15' }),
      makeNode('2', { pick_team: 'Lakers', game_date: '2026-01-15' }),
    ]
    const result = buildDependencyGraph(picks)
    expect(result.riskSummary).toBeTruthy()
    expect(result.riskSummary.length).toBeGreaterThan(10)
  })

  it('handles picks without team data gracefully', () => {
    const picks = [
      makeNode('1', { pick_team: null, game_date: '2026-01-15' }),
      makeNode('2', { pick_team: null, game_date: '2026-01-15' }),
    ]
    const result = buildDependencyGraph(picks)
    // No team means no same-game/same-team edges
    expect(result.edges.length).toBe(0)
  })

  it('handles picks without dates gracefully', () => {
    const picks = [
      makeNode('1', { game_date: undefined }),
      makeNode('2', { game_date: undefined }),
    ]
    const result = buildDependencyGraph(picks)
    expect(result.edges.length).toBe(0)
  })

  it('case-insensitive team matching', () => {
    const picks = [
      makeNode('1', { pick_team: 'Lakers', game_date: '2026-01-15' }),
      makeNode('2', { pick_team: 'lakers', game_date: '2026-01-15' }),
    ]
    const result = buildDependencyGraph(picks)
    expect(result.edges.length).toBe(1)
  })

  it('maxClusterSize reflects largest cluster', () => {
    const picks = [
      makeNode('1', { pick_team: 'Lakers', game_date: '2026-01-15' }),
      makeNode('2', { pick_team: 'Lakers', game_date: '2026-01-15' }),
      makeNode('3', { pick_team: 'Lakers', game_date: '2026-01-15' }),
    ]
    const result = buildDependencyGraph(picks)
    expect(result.maxClusterSize).toBe(3)
  })
})
