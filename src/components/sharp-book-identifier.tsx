'use client'

import { useState } from 'react'
import type { SharpBookResult, BookSharpnessScore } from '@/lib/sharp-book-identifier'

function ClassBadge({ classification }: { classification: BookSharpnessScore['classification'] }) {
  const styles: Record<string, string> = {
    sharp: 'bg-emerald-900/60 text-emerald-300',
    moderate: 'bg-amber-900/60 text-amber-300',
    soft: 'bg-red-900/60 text-red-300',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[classification]}`}>
      {classification.charAt(0).toUpperCase() + classification.slice(1)}
    </span>
  )
}

function SharpnessBar({ score }: { score: number }) {
  const color = score >= 60 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
    </div>
  )
}

function BookRow({ book, expanded, onToggle }: { book: BookSharpnessScore; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-800/50 last:border-0">
      <button onClick={onToggle} className="w-full text-left py-3 px-4 hover:bg-gray-800/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-sm">{book.bookmaker}</span>
              <ClassBadge classification={book.classification} />
            </div>
            <div className="mt-1">
              <SharpnessBar score={book.sharpnessScore} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{book.sharpnessScore}</div>
            <div className="text-xs text-gray-500">{book.gamesAnalyzed} games</div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-800/50 rounded p-2">
              <div className="text-gray-500 mb-1">Outlier Rate</div>
              <div className="text-white font-medium">{book.outlierRate.toFixed(1)}%</div>
              <div className="text-gray-600 text-[10px]">How often this book deviates from consensus</div>
            </div>
            <div className="bg-gray-800/50 rounded p-2">
              <div className="text-gray-500 mb-1">Best Line Rate</div>
              <div className="text-emerald-400 font-medium">{book.bestLineRate.toFixed(1)}%</div>
              <div className="text-gray-600 text-[10px]">How often this book has the best price</div>
            </div>
            <div className="bg-gray-800/50 rounded p-2">
              <div className="text-gray-500 mb-1">Worst Line Rate</div>
              <div className="text-red-400 font-medium">{book.worstLineRate.toFixed(1)}%</div>
              <div className="text-gray-600 text-[10px]">How often this book has the worst price</div>
            </div>
            <div className="bg-gray-800/50 rounded p-2">
              <div className="text-gray-500 mb-1">Avg Deviation</div>
              <div className="text-white font-medium">{book.avgDeviation.toFixed(2)}%</div>
              <div className="text-gray-600 text-[10px]">Average implied prob distance from consensus</div>
            </div>
          </div>

          <div className="text-xs">
            <div className="text-gray-500 mb-2">By Market Type</div>
            <table className="w-full">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-1">Market</th>
                  <th className="text-right py-1">Outlier %</th>
                  <th className="text-right py-1">Best Line %</th>
                  <th className="text-right py-1">Avg Dev %</th>
                </tr>
              </thead>
              <tbody>
                {(['moneyline', 'spread', 'total'] as const).map(mkt => {
                  const m = book.byMarket[mkt]
                  return (
                    <tr key={mkt} className="border-b border-gray-800/50">
                      <td className="py-1 text-gray-300 capitalize">{mkt}</td>
                      <td className="text-right py-1">{m.outlierRate.toFixed(1)}%</td>
                      <td className="text-right py-1 text-emerald-400">{m.bestLineRate.toFixed(1)}%</td>
                      <td className="text-right py-1">{m.avgDeviation.toFixed(2)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export function SharpBookPanel({ result }: { result: SharpBookResult }) {
  const [expandedBook, setExpandedBook] = useState<string | null>(null)

  if (result.scores.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-6 text-center">
        <p className="text-gray-500">Need at least 3 bookmakers per game to analyze sharpness.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Bookmaker Sharpness Rankings</h3>
        <p className="text-sm text-gray-400">
          {result.gamesAnalyzed} games analyzed — {result.sharpestBook && <span className="text-emerald-400">{result.sharpestBook}</span>} leads, {result.softestBook && <span className="text-red-400">{result.softestBook}</span>} trails
        </p>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900/60 overflow-hidden">
        {result.scores.map(book => (
          <BookRow
            key={book.bookmaker}
            book={book}
            expanded={expandedBook === book.bookmaker}
            onToggle={() => setExpandedBook(expandedBook === book.bookmaker ? null : book.bookmaker)}
          />
        ))}
      </div>

      <p className="text-[10px] text-gray-600 italic">
        For informational purposes only. Not financial advice. Sharpness scores are estimated from odds divergence and may not reflect actual bookmaker methodology.
      </p>
    </div>
  )
}
