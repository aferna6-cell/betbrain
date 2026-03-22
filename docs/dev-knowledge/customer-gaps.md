# Customer Gaps — BetBrain

_Gaps discovered through customer simulations. Each gap has status (built/deferred) and priority._

## Simulations Completed (7/7)
1. Sharp NBA bettor (Cycle 67)
2. Parlay builder (Cycle 128)
3. New bettor (Cycle 125)
4. Data-driven bettor (Cycle 235)
5. Multi-sport bettor (Cycle 235)
6. Casual NFL bettor (Cycle 236)
7. Props bettor (Cycle 240)

## Gaps Resolved

| Gap | Persona | Resolution | Cycle |
|-----|---------|------------|-------|
| Sport filter on Smart Signals | NFL bettor | Built filter buttons | 237 |
| Sport filter on EV Scanner | NFL bettor | Built filter buttons | 237 |
| Log Pick from game detail | NFL bettor | Built with URL pre-fill | 238 |
| NFL Sunday Slate view | NFL bettor | Time-slot grouping | 239 |
| Dynamic prop market filtering | Props bettor | Sport-keyed dropdown | 241 |
| Log Pick from prop result | Props bettor | Built link on result card | 241 |
| Prop analysis on landing page | Props bettor | Updated feature card | 242 |

## Gaps Deferred (require schema or API changes)

| Gap | Persona | Reason Deferred |
|-----|---------|-----------------|
| Preferred bookmaker setting | NFL bettor | Needs `preferred_bookmakers` column on profiles |
| Cache prop analyses | Props bettor | Needs DB table for prop analysis results |
| Prop market breakdown in pick stats | Props bettor | Needs `prop_market` column on user_picks |
| NFL auto-resolve | NFL bettor | Needs external NFL game results API source |
| No prop odds integration | Props bettor | Needs player prop markets from The Odds API |

## Cross-Persona Themes

1. **Manual resolution friction** — All non-NBA sport bettors (NFL, MLB, NHL) must manually resolve picks. High churn risk.
2. **Sport filtering missing** — Fixed for Signals/EV (Cycle 237). Dashboard already had it.
3. **Workflow friction** — Log Pick buttons added (Cycles 238, 241) to reduce multi-page navigation.
4. **Landing page discovery** — Props now highlighted (Cycle 242). Other niche features may need similar.
5. **Statistical transparency** — Sharps want N= on signals. Addressed in Cycle 243 backlog item.
