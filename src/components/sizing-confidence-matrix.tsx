'use client'

import { useState, useMemo } from 'react'
import { generateSizingMatrix, lookupUnits, type SizingMatrix, type ConfidenceLevel, type MatrixCell } from '@/lib/sizing-confidence-matrix'

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Medium',
  4: 'High',
  5: 'Very High',
}

function CellColor({ cell }: { cell: MatrixCell }) {
  const riskColors: Record<string, string> = {
    low: 'bg-blue-900/40 text-blue-300 border-blue-800/50',
    medium: 'bg-amber-900/40 text-amber-300 border-amber-800/50',
    high: 'bg-red-900/40 text-red-300 border-red-800/50',
  }
  return (
    <td className={`text-center py-2 px-2 border ${riskColors[cell.risk]}`}>
      <div className="text-sm font-bold">{cell.units}</div>
      <div className="text-[9px] opacity-60">{cell.kellyFraction}%</div>
    </td>
  )
}

export function SizingConfidenceMatrixPanel() {
  const [bankroll, setBankroll] = useState(1000)
  const [baseUnit, setBaseUnit] = useState(10)
  const [kellyMult, setKellyMult] = useState(0.25)
  const [maxUnits, setMaxUnits] = useState(5)

  const matrix = useMemo(() =>
    generateSizingMatrix({ bankroll, baseUnit, kellyMultiplier: kellyMult, maxUnits }),
    [bankroll, baseUnit, kellyMult, maxUnits]
  )

  const [selectedConf, setSelectedConf] = useState<ConfidenceLevel | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<number | null>(null)

  const lookupResult = selectedConf && selectedEdge
    ? lookupUnits(matrix, selectedConf, selectedEdge)
    : null

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Sizing Confidence Matrix</h3>
        <p className="text-sm text-gray-400">
          Optimal unit count at each combination of confidence and edge
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <label className="text-gray-400">Bankroll:</label>
          <input
            type="number"
            value={bankroll}
            onChange={e => setBankroll(Math.max(1, Number(e.target.value)))}
            className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-400">Base Unit:</label>
          <input
            type="number"
            value={baseUnit}
            onChange={e => setBaseUnit(Math.max(1, Number(e.target.value)))}
            className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-400">Kelly:</label>
          <select
            value={kellyMult}
            onChange={e => setKellyMult(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
          >
            <option value={0.125}>1/8 Kelly</option>
            <option value={0.25}>1/4 Kelly</option>
            <option value={0.5}>1/2 Kelly</option>
            <option value={0.75}>3/4 Kelly</option>
            <option value={1}>Full Kelly</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-400">Max Units:</label>
          <input
            type="number"
            value={maxUnits}
            onChange={e => setMaxUnits(Math.max(1, Math.min(20, Number(e.target.value))))}
            className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 text-gray-500 border border-gray-800">Confidence / Edge</th>
              {matrix.edgeBuckets.map(e => (
                <th key={e} className="text-center py-2 px-2 text-gray-400 border border-gray-800">
                  {e}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.cells.map((row, ri) => (
              <tr key={ri}>
                <td className="py-2 px-2 text-gray-300 font-medium border border-gray-800 whitespace-nowrap">
                  {matrix.confidenceLevels[ri]} — {CONFIDENCE_LABELS[matrix.confidenceLevels[ri]]}
                </td>
                {row.map((cell, ci) => (
                  <CellColor key={ci} cell={cell} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-900/40 border border-blue-800/50" /> Low risk
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-900/40 border border-amber-800/50" /> Medium risk
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-900/40 border border-red-800/50" /> High risk
        </span>
        <span className="text-gray-600 ml-2">Small numbers = Kelly fraction of bankroll</span>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-3 text-xs">
        <div className="text-gray-400 mb-2">Quick Lookup</div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-gray-500">Confidence:</label>
            <select
              value={selectedConf ?? ''}
              onChange={e => setSelectedConf(e.target.value ? Number(e.target.value) as ConfidenceLevel : null)}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
            >
              <option value="">--</option>
              {[1, 2, 3, 4, 5].map(c => (
                <option key={c} value={c}>{c} — {CONFIDENCE_LABELS[c as ConfidenceLevel]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-500">Edge %:</label>
            <input
              type="number"
              value={selectedEdge ?? ''}
              onChange={e => setSelectedEdge(e.target.value ? Number(e.target.value) : null)}
              className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
              placeholder="e.g. 5"
            />
          </div>
          {lookupResult && (
            <div className="flex items-center gap-2 bg-gray-700/50 rounded px-3 py-1">
              <span className="text-white font-bold">{lookupResult.units} units</span>
              <span className={`px-1.5 rounded text-[10px] ${
                lookupResult.risk === 'low' ? 'bg-blue-900/60 text-blue-300' :
                lookupResult.risk === 'medium' ? 'bg-amber-900/60 text-amber-300' :
                'bg-red-900/60 text-red-300'
              }`}>
                {lookupResult.risk}
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-gray-600 italic">
        For informational purposes only. Not financial advice. Kelly-derived sizes assume accurate edge estimates.
      </p>
    </div>
  )
}
