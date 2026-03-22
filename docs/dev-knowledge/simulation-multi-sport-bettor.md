# Customer Simulation: Multi-Sport Bettor

Date: 2026-03-22

## Persona
30-year-old sports fan who bets on NBA, NFL, MLB, and NHL. Places 2-3 bets per week across multiple sports. Wants one dashboard instead of toggling between 5 apps. Moderate experience — understands odds, spreads, totals but doesn't track CLV.

## Journey

1. **Landing page** — Sees "Multi-Sport Dashboard" and "NBA · NFL · MLB · NHL" prominently. Feels confident this covers their needs. Notices "Auto-resolve NBA picks" in Pro features — wonders if other sports auto-resolve too. → Minor confusion
2. **Signup + Dashboard** — Four sport tabs with game counts. Filters work perfectly. Can see all upcoming games across leagues. → Excellent
3. **Game detail (NFL game)** — Odds comparison table works. H2H history tab shows data but it's synthetic (RNG-seeded). Injury Impact tab works (AI-generated). → Partial value
4. **AI Analysis (MLB game)** — Generates structured analysis with summary, factors, risk level. Works well. → Good
5. **Pick tracker** — Logs NFL spread pick, MLB moneyline. Sport filter works. Stats broken down by sport. → Excellent
6. **Auto-resolve (NFL pick)** — Nothing happens. Pick stays pending indefinitely. No indication it won't auto-resolve. → Confusion + manual work
7. **Signals page** — Smart Signals appear for all sports. → Good
8. **+EV Scanner** — Scans across all sports. → Excellent
9. **Analytics dashboard** — Shows "balldontlie API" usage counter. Irrelevant for NFL/MLB/NHL. → Minor confusion
10. **Billing page** — Pro features list auto-resolve as "NBA picks". Clear enough. → OK

## Gaps Found

1. **No auto-resolve indicator on pending picks** — Multi-sport bettor doesn't know which picks will auto-resolve and which won't. No badge, tooltip, or message. → Added to backlog: "Auto-resolve eligibility badge on pending picks"
2. **balldontlie counter in analytics** — Shows NBA-only API usage to all users. Confusing for non-NBA bettors. → Added to backlog: "Hide or label balldontlie counter as NBA-only"
3. **H2H history is synthetic for all sports** — Seeded RNG data, not real matchup history. Looks real but isn't. Multi-sport bettor may make decisions based on fake data. → Known limitation (Phase 2: additional data sources)
4. **No player stats for non-NBA** — Stats tab returns "not supported" message for NFL/MLB/NHL. → Known limitation (Phase 2)

## Strengths
- **Odds comparison**: Works identically across all 4 sports — the core value prop holds
- **Pick tracker**: Excellent multi-sport support with filtering and per-sport breakdowns
- **+EV Scanner**: Fully sport-agnostic, finds value across all leagues
- **AI analysis**: Generates useful analysis for any sport
- **Dashboard filtering**: Clean UX for browsing games by league
- **Parlay builder**: Supports mixed-sport parlays

## Verdict
**Would this bettor pay for Pro today?** Probably yes for the +EV scanner, AI analysis, and pick tracking. Auto-resolve being NBA-only is a known tradeoff. The product delivers its core promise (multi-sport odds comparison + analytics) well. The gaps are in supplementary features (auto-resolve, player stats, H2H) that are NBA-biased due to data source limitations.

**Key improvement**: Make NBA-only limitations visible in the UI (badge on pending picks, label on API counters) rather than silently failing.
