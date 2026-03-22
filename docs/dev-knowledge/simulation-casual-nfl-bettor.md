# Customer Simulation: Casual NFL Bettor

Date: 2026-03-22

## Persona
Mike, 34, office worker. Bets recreationally on NFL games — mostly Sunday afternoon slates. Places 2-3 moneyline or spread bets per week during football season via DraftKings. Has basic understanding of odds (knows -110 means "bet $110 to win $100") but doesn't track CLV, ROI, or any advanced metrics. Uses ESPN and Twitter for "research." Budget: $50-100/week. Wants to feel smarter about his bets, not just follow gut feelings.

## Journey

### 1. Landing Page (/)
- Sees "Find edges the market hasn't corrected" — good hook for someone tired of going 50/50
- Features grid mentions "4 major sports" including NFL — good
- Pricing: Free tier with 3 AI analyses/day seems perfect for casual use
- "No credit card required" removes friction
- **Gap:** No NFL-specific imagery or examples. Hero mentions "NBA, NFL, MLB, NHL" generically. A casual NFL bettor might not realize there's NFL-specific value here

### 2. Signup (/signup)
- Simple email/password form. Quick. No friction. Good.
- Creates account and lands on dashboard

### 3. Dashboard (/dashboard)
- OnboardingChecklist appears — helpful for first-time users
- **Gap: Default view shows ALL sports** — Mike sees NBA, NHL, MLB games mixed in. He has to find the "NFL" filter button. On a Sunday in-season, there could be 50+ games across sports. Finding NFL games requires scrolling or clicking the filter.
- Stat cards show "Analyses Today: 0/3" — clear limit indication
- **Gap: No "game day" experience.** NFL is unique — all games are on Sunday (with MNF/TNF exceptions). A "Sunday Slate" view showing NFL games grouped by time slot (1pm ET, 4:25pm ET, SNF) would be powerful for this persona.

### 4. NFL Filter / League Page (/dashboard/league/nfl)
- Clicking "NFL" filter shows only NFL games. Clean.
- Game cards show teams, time, moneyline odds, top bookmakers
- Implied probability shown next to best moneyline — Mike finds this useful ("so the Chiefs have a 68% chance to win")
- Green highlighting on best odds — subtle but Mike doesn't initially understand it
- **Strength: Game card tooltips** explain "Book Spread" and "Bookmakers" on hover. Added in Cycle 125.

### 5. Game Detail Page (/dashboard/games/[gameId])
- Full odds comparison table across 20+ bookmakers — Mike is impressed but overwhelmed
- **Gap: Too many bookmakers.** Mike uses DraftKings. He wants to see DraftKings odds prominently, not scroll through a table of 20 books. No way to set a "preferred bookmaker" or filter the table.
- Line Movement tab — Mike doesn't understand what this means initially. TermTooltip would help.
- Injuries tab — useful. Mike checks if any star players are out before betting
- AI Analysis tab — this is the killer feature for Mike. He clicks "Generate Analysis" and gets a structured breakdown: summary, key factors, value assessment, risk level
  - **Strength:** The analysis is specific to the matchup, not generic
  - **Strength:** Confidence percentage and risk level give Mike a quick read
  - **Strength:** Disclaimer present — good legal coverage
- H2H tab — useful context for divisional rivalry games

### 6. Logging a Pick (/dashboard/picks)
- Mike wants to log his bet: Chiefs ML -150
- **Gap: No link from game detail page to "Log Pick."** Mike has to navigate to /dashboard/picks separately and manually fill in the form. Ideally, a "Log Pick" button on the game detail page would pre-populate team, sport, and odds.
- Pick form requires: sport (must select "NFL"), pick type, team, odds, units
- **Gap: No auto-fill from game data.** Mike has to manually type the team name and odds he saw on the previous page.
- After logging, sees stats: W-L record, ROI, profit

### 7. Resolving Picks
- **Critical gap: No auto-resolve for NFL.** Auto-resolve only works for NBA (uses balldontlie API which is NBA-only). Mike must manually mark each pick as win/loss/push.
- The "Set Outcome" button works fine, but it's manual labor that will cause most casual bettors to stop tracking after a few weeks.

### 8. Smart Signals (/dashboard/signals)
- Shows signals across all sports including NFL
- Mike finds a "Strong" signal on an NFL game — compelling
- **Gap: No sport filter on signals page.** Mike has to scan through NBA/MLB/NHL signals to find NFL ones.

### 9. EV Scanner (/dashboard/ev)
- Scans all sports for +EV opportunities
- **Gap: No sport filter.** Same issue — Mike only cares about NFL.
- When Mike does find an NFL +EV bet, the card is clear: shows the edge percentage, which book has it, and the fair odds

### 10. Billing (/dashboard/billing)
- Clear free/pro comparison
- Pro at $29/mo — Mike considers it. 3 free analyses/day is plenty for Sunday betting, so he stays on Free.
- **Observation:** For casual NFL bettors, Free tier is likely sufficient. Pro upsell needs to emphasize features beyond analysis count — like alerts and auto-resolve.

## Gaps Found

1. **No sport filter on Signals page** — Casual NFL bettor must scan all sports to find NFL signals
   - Added to backlog as: "Sport filter on Smart Signals page"

2. **No sport filter on EV Scanner page** — Same issue, +EV bets across 4 sports with no filter
   - Added to backlog as: "Sport filter on EV Scanner page"

3. **No "Log Pick" shortcut from game detail** — Game detail page has no way to quickly log a pick with pre-filled data
   - Added to backlog as: "Log Pick button on game detail page with pre-populated data"

4. **No preferred bookmaker setting** — Odds table shows 20+ books equally; no way to highlight the user's book
   - Added to backlog as: "Preferred bookmaker setting in user profile"

5. **NFL auto-resolve not available** — Only NBA picks auto-resolve; NFL requires manual outcome entry
   - Already noted in Phase 2 backlog: "Additional sports data sources"

6. **No time-slot grouping for NFL** — Sunday Slate view (1pm/4:25pm/SNF) would be natural for NFL bettor
   - Added to backlog as: "NFL Sunday Slate time-slot grouping view"

## Strengths
- **AI analysis is the hero feature** — For a casual bettor, getting a structured breakdown of a game is exactly what they need. It replaces hours of "research" on ESPN/Twitter.
- **Implied probability display** — Converting odds to "68% win probability" speaks Mike's language
- **Free tier is generous enough** — 3 analyses/day covers a Sunday slate of 2-3 bets
- **Odds comparison is comprehensive** — Even if overwhelming, having 20+ bookmakers side-by-side is powerful
- **Game card tooltips** — Beginner-friendly explanations built into the UI
- **Betting 101 page** — If Mike doesn't understand something, the educational content is there
- **Pick tracker with ROI** — Even manual, it's better than what Mike had (nothing)

## Verdict
**Would Mike pay for BetBrain today?** Probably not for Pro ($29/mo), but he'd use the Free tier every Sunday. The AI analysis alone makes him feel more informed. He'd likely upgrade if:
1. NFL auto-resolve existed (so he doesn't have to manually track outcomes)
2. The signals/EV pages had sport filters (so he could quickly find NFL-only edges)
3. A "Log Pick" button on game detail reduced the friction to track bets

**What would make him a paying customer?** If the Free tier was limited to 1 analysis/day instead of 3, he'd need Pro for a typical 3-game Sunday. But at 3/day, the Free tier covers his use case.

**Retention risk:** The manual pick resolution will cause Mike to stop tracking after 3-4 weeks. Without auto-resolve, the pick tracker becomes stale, and he loses the ROI/record features that keep him engaged.
