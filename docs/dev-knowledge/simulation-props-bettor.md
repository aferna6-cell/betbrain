# Customer Simulation: Props Bettor

Date: 2026-03-22

## Persona
Sarah, 28, data analyst. Focuses exclusively on player props — points, rebounds, assists in NBA, passing yards in NFL. Follows 5-6 players closely and tracks their matchup stats. Uses PrizePicks and DraftKings for prop bets. Places 3-5 prop bets per day during NBA season. Has a spreadsheet tracking her prop hit rates. Wants tools that help her identify edges on player markets, not game outcomes. Budget: $25-50/day in props.

## Journey

### 1. Landing Page (/)
- Sees "AI-powered sports analytics" — sounds useful
- Feature grid mentions "Smart Signals" and "AI analysis" but nothing specifically about player props
- **Gap: No mention of prop analysis on landing page.** Sarah's primary use case isn't called out. She might bounce thinking this is a game-level tool.
- Pricing looks fine — free tier to try it out

### 2. Signup & Dashboard (/dashboard)
- Quick signup. Onboarding checklist appears.
- Dashboard shows games with moneyline/spread odds but no player prop odds
- **Observation:** Dashboard is game-level focused. Sarah wants player-level data.

### 3. Props Page (/dashboard/props)
- Found via nav sidebar "Props" link. Good discoverability.
- **Prop Analyzer Form** — requires manual input of 8 fields:
  - Player Name, Sport, Team, Opponent, Prop Market, Line, Over Odds, Under Odds
  - **Gap: All data must be entered manually.** Sarah has to look up the player's team, opponent, and current odds on another site, then type them into BetBrain. No integration with odds data.
  - **Strength:** Sport-specific prop markets dropdown (NBA: points/rebounds/assists/3PM/steals/blocks; NFL: passing/rushing/receiving yards, TDs)
  - **Gap: Market dropdown doesn't filter by sport.** All markets show regardless of selected sport (NBA shows NFL markets too). Should dynamically filter.

### 4. Prop Analysis Result
- After submitting, the AI analysis is detailed and useful:
  - **Projected Range** (floor/mid/ceiling) with visual bar chart — this is exactly what Sarah wants
  - **Estimated Edge** with percentage and reasoning
  - **Recommendation** (over/under/pass) — clear and actionable
  - **Key Factors** specific to the matchup — not generic
  - **Implied Probability** calculated from odds
  - **Risk Level + Confidence** badges
- **Strength:** The projected range visualization is the killer feature for props bettors
- **Strength:** The analysis considers matchup difficulty, pace, and minutes
- **Gap: Analysis is not cached.** If Sarah analyzes the same player prop twice, it counts against her daily limit and regenerates from scratch. No history of past analyses.

### 5. Tracking Prop Picks (/dashboard/picks)
- Sarah can log prop picks using the pick form
- Pick type "Prop" is available in the dropdown
- **Gap: No "Log Pick" integration from props page.** After getting a prop analysis, Sarah has to navigate to Picks page and re-enter the data manually. No "Log this pick" button on the result card.
- **Gap: Props require manual resolution.** Sarah has to mark each prop as win/loss/push herself. For someone placing 3-5 props/day, this is 15-25 manual resolutions per week.
- **Strength:** Pick type breakdown shows prop-specific stats (W-L, win rate, ROI for props)

### 6. Prop Stats & Tracking
- Profile page shows per-sport breakdown but not per-market breakdown
- **Gap: No prop market breakdown.** Sarah wants to know: "Am I better at Points props than Assists props?" No way to filter or see win rate by prop market.
- **Gap: No player-level tracking.** Sarah tracks specific players. No way to see "How have my LeBron props performed?"

### 7. Signals & EV Scanner
- Smart Signals are game-level, not player-prop-level
- EV Scanner finds +EV game bets, not prop bets
- **Gap: No prop-specific signals.** If a player prop line is +EV compared to projected performance, there's no automated detection of that edge.

### 8. Game Detail Page
- Injuries tab is useful — helps Sarah assess if a key defender is out (affecting her props)
- Odds tab shows game odds, not player props
- **Gap: No player props in game detail.** Game detail shows moneyline/spread/total but not individual player props. Sarah can't see "What are the LeBron points lines across books?"

## Gaps Found

1. **Prop market dropdown should filter by sport** — Show only relevant markets per sport
   - Added to backlog as: "Dynamic prop market filtering by sport"

2. **No "Log Pick" from prop analysis result** — Result card should have a button to log the prop pick directly
   - Added to backlog as: "Log Pick button on prop analysis result card"

3. **No prop analysis history/cache** — Past prop analyses are lost; re-analyzing counts against daily limit
   - Added to backlog as: "Cache prop analyses for re-viewing"

4. **No prop market breakdown in stats** — Can't see win rate per prop market (points vs rebounds vs assists)
   - Added to backlog as: "Prop market breakdown in pick stats"

5. **Landing page doesn't mention props** — Props bettor might bounce thinking it's game-level only
   - Added to backlog as: "Add prop analysis to landing page features"

## Strengths
- **Projected Range visualization** — The floor/mid/ceiling bar chart is exactly what props bettors want
- **Sport-specific markets** — Dropdown has relevant markets for each sport
- **Estimated Edge calculation** — Directly actionable: "This prop has a 3.2% edge on the over"
- **Key Factors are matchup-specific** — Not generic "player is good" but considers opponent, pace, minutes
- **Pick tracker integrates props** — Full stats tracking with prop-specific breakdowns
- **AI analysis quality** — Claude provides nuanced assessments rather than simple over/under predictions

## Verdict
**Would Sarah pay for BetBrain today?** She'd use the free tier for a few days, then likely leave. The prop analyzer itself is good quality, but the workflow friction is too high:
1. Manual data entry for every analysis (no odds integration)
2. Manual resolution for every pick (3-5/day)
3. No history of past analyses
4. No market-level stats breakdown

**What would make her a paying customer?** If BetBrain fetched player prop odds from The Odds API (they offer prop markets), pre-populated the form, and auto-tracked results. That would make Sarah say "I can't handicap without this." The projected range + edge calculation is already compelling — it just needs less friction.

**Retention risk:** HIGH. Manual data entry on every analysis will cause Sarah to return to her spreadsheet within a week. The value proposition is there but the workflow doesn't match a daily user who places 3-5 prop bets.
