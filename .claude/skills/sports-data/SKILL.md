---
name: sports-data
description: "Use when working with sports data APIs, caching, rate limiting, or data normalization. Covers The Odds API and balldontlie integration patterns."
---

# Sports Data Integration

## APIs
- **The Odds API:** odds, lines, scores. Free: 500 req/month. Docs: https://the-odds-api.com/
- **balldontlie:** NBA/NFL/MLB stats, players, teams. Docs: https://www.balldontlie.io/

## Rate Limit Strategy
- Cache ALL responses in Supabase (game_cache, odds_cache tables)
- TTLs: odds = 5 min, stats = 1 hour, historical = 24 hours
- Check cache BEFORE every API call
- Track usage in api_usage table
- At 80% limit: switch to cache-only mode with staleness warnings
- Never make duplicate calls for the same data within TTL window

## Data Normalization
All API responses must be normalized into consistent TypeScript interfaces before caching:
- Game: { id, sport, homeTeam, awayTeam, startTime, status }
- Odds: { gameId, bookmaker, market, homeOdds, awayOdds, overUnder, timestamp }
- TeamStats: { teamId, sport, season, wins, losses, pointsFor, pointsAgainst, ... }

## Error Handling
- API down → return cached data + "Data may be outdated" banner
- Rate limited → return cached data + "Using cached data" banner
- Invalid response → log error, don't cache, return last valid cache
