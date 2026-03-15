import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Betting Glossary — BetBrain',
  description: 'Definitions of common sports betting terms: odds, CLV, implied probability, EV, units, and more.',
}

const terms = [
  {
    term: 'American Odds',
    definition: 'The most common odds format in the US. Negative numbers (e.g. -110) show how much you need to bet to win $100. Positive numbers (e.g. +150) show how much you win on a $100 bet.',
  },
  {
    term: 'Moneyline',
    definition: 'A bet on which team will win the game outright, with no point spread. The favorite has negative odds, the underdog has positive odds.',
  },
  {
    term: 'Spread',
    definition: 'A bet on the margin of victory. The favorite must win by more than the spread (e.g. -5.5 means they must win by 6+). The underdog can lose by less than the spread and still cover.',
  },
  {
    term: 'Total (Over/Under)',
    definition: 'A bet on whether the combined score of both teams will be over or under a set number (e.g. O/U 220.5).',
  },
  {
    term: 'Implied Probability',
    definition: 'The win probability implied by the odds. For -110 odds, the implied probability is 52.4%. This is what the bookmaker thinks is the true chance of winning (including their margin).',
  },
  {
    term: 'CLV (Closing Line Value)',
    definition: 'The difference between the odds you bet at and the closing line (final odds before game start). Positive CLV means you got a better price than the market close — the #1 predictor of long-term profitability.',
  },
  {
    term: 'Expected Value (EV)',
    definition: 'The average profit or loss per bet over time. Positive EV (+EV) means the bet is profitable long-term. Calculated as: (win probability * profit) - (loss probability * stake).',
  },
  {
    term: 'Units',
    definition: 'A standardized bet size. Instead of betting random dollar amounts, sharps use units (e.g. 1 unit = $10). This makes it easy to compare performance across different bankroll sizes.',
  },
  {
    term: 'ROI (Return on Investment)',
    definition: 'Your profit as a percentage of total amount wagered. A 10% ROI means you profit $10 for every $100 wagered. Anything consistently above 5% is considered strong.',
  },
  {
    term: 'Vig (Vigorish/Juice)',
    definition: 'The bookmaker\'s commission built into the odds. In a -110/-110 market, the vig is about 4.5%. The vig is why you need to win more than 50% to be profitable.',
  },
  {
    term: 'Kelly Criterion',
    definition: 'A formula for optimal bet sizing based on your edge. It tells you what percentage of your bankroll to wager. Most sharps use "half-Kelly" (half the recommended amount) for safety.',
  },
  {
    term: 'Drawdown',
    definition: 'The peak-to-trough decline in your bankroll. Max drawdown is the largest drop from a peak. A 20% drawdown means your bankroll dropped 20% from its highest point before recovering.',
  },
  {
    term: 'Smart Signal',
    definition: 'A BetBrain indicator that fires when multiple data points align on a game: AI confidence, bookmaker odds variance, and line movement all suggest value on one side.',
  },
  {
    term: 'Line Movement',
    definition: 'How odds change over time before a game. Sharp money (professional bettors) often moves lines early, while public money moves lines closer to game time.',
  },
  {
    term: 'Book Spread',
    definition: 'The range of odds offered by different bookmakers for the same game. A wide book spread (e.g. 15+ points) means bookmakers disagree — potential value opportunity.',
  },
]

export default function GlossaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Betting Glossary</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Definitions of common sports betting terms used throughout BetBrain.
        </p>
      </div>

      <div className="space-y-1">
        {terms.map((item) => (
          <div
            key={item.term}
            className="rounded-lg border border-border bg-card p-4"
          >
            <h2 className="text-sm font-semibold text-white">{item.term}</h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {item.definition}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
