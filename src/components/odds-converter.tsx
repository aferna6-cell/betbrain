'use client'

import { useState } from 'react'
import {
  americanToDecimal,
  americanToFractional,
  americanToImplied,
  decimalToAmerican,
  formatAmerican,
  calculateVig,
  noVigOdds,
} from '@/lib/odds'

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

type OddsFormat = 'american' | 'decimal' | 'fractional'

function parseAmerican(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n === 0) return null
  if (Number.isInteger(n) && Math.abs(n) >= 100) return n
  return null
}

function parseDecimal(raw: string): number | null {
  const n = parseFloat(raw.trim())
  if (!Number.isFinite(n) || n <= 1) return null
  return n
}

function parseFractional(raw: string): number | null {
  const parts = raw.trim().split('/')
  if (parts.length !== 2) return null
  const num = parseFloat(parts[0])
  const den = parseFloat(parts[1])
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null
  // decimal = (num / den) + 1
  const decimal = num / den + 1
  if (decimal <= 1) return null
  return decimalToAmerican(decimal)
}

/** Returns American odds integer or null if input is invalid */
function parseInput(raw: string, format: OddsFormat): number | null {
  if (!raw.trim()) return null
  switch (format) {
    case 'american':
      return parseAmerican(raw)
    case 'decimal': {
      const d = parseDecimal(raw)
      return d === null ? null : decimalToAmerican(d)
    }
    case 'fractional':
      return parseFractional(raw)
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-800 last:border-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-white tabular-nums font-mono">
        {value}
      </span>
    </div>
  )
}

function FormatRadio({
  id,
  value,
  label,
  checked,
  onChange,
}: {
  id: string
  value: OddsFormat
  label: string
  checked: boolean
  onChange: (v: OddsFormat) => void
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-md border text-sm cursor-pointer transition-colors select-none ${
        checked
          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
          : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
      }`}
    >
      <input
        type="radio"
        id={id}
        name="odds-format"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      {label}
    </label>
  )
}

// ---------------------------------------------------------------------------
// Main converter component
// ---------------------------------------------------------------------------

export function OddsConverter() {
  const [input, setInput] = useState('')
  const [format, setFormat] = useState<OddsFormat>('american')

  // Vig calculator state
  const [vigInput1, setVigInput1] = useState('')
  const [vigInput2, setVigInput2] = useState('')

  const american = parseInput(input, format)
  const isValid = american !== null

  // Derived conversions
  let displayDecimal = ''
  let displayFractional = ''
  let displayImplied = ''
  let displayPayout = ''

  if (isValid && american !== null) {
    const dec = americanToDecimal(american)
    displayDecimal = dec.toFixed(3).replace(/\.?0+$/, '') || dec.toFixed(2)
    // ensure at least 2 decimal places for clarity
    displayDecimal = parseFloat(dec.toFixed(4)).toString()
    displayFractional = americanToFractional(american)
    const implied = americanToImplied(american)
    displayImplied = `${(implied * 100).toFixed(2)}%`
    // Payout on $100 bet: profit + stake
    const payout = american > 0 ? american + 100 : 100 / (Math.abs(american) / 100) + 100
    displayPayout = `$${payout.toFixed(2)}`
  }

  // Vig calculator
  const vigAmerican1 = parseAmerican(vigInput1)
  const vigAmerican2 = parseAmerican(vigInput2)
  const vigIsValid = vigAmerican1 !== null && vigAmerican2 !== null

  let vigPercent = ''
  let fairOdds1 = ''
  let fairOdds2 = ''

  if (vigIsValid && vigAmerican1 !== null && vigAmerican2 !== null) {
    try {
      const vig = calculateVig(vigAmerican1, vigAmerican2)
      vigPercent = `${(vig * 100).toFixed(2)}%`
      const { fair1, fair2 } = noVigOdds(vigAmerican1, vigAmerican2)
      fairOdds1 = formatAmerican(fair1)
      fairOdds2 = formatAmerican(fair2)
    } catch {
      vigPercent = 'Invalid'
    }
  }

  const placeholders: Record<OddsFormat, string> = {
    american: '-110 or +150',
    decimal: '1.909 or 2.50',
    fractional: '10/11 or 3/2',
  }

  return (
    <div className="space-y-6">

      {/* Converter card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-base font-semibold text-white mb-5">Odds Converter</h2>

        {/* Format selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2.5">
            Input Format
          </p>
          <div className="flex flex-wrap gap-2">
            <FormatRadio
              id="fmt-american"
              value="american"
              label="American"
              checked={format === 'american'}
              onChange={(v) => { setFormat(v); setInput('') }}
            />
            <FormatRadio
              id="fmt-decimal"
              value="decimal"
              label="Decimal"
              checked={format === 'decimal'}
              onChange={(v) => { setFormat(v); setInput('') }}
            />
            <FormatRadio
              id="fmt-fractional"
              value="fractional"
              label="Fractional"
              checked={format === 'fractional'}
              onChange={(v) => { setFormat(v); setInput('') }}
            />
          </div>
        </div>

        {/* Input */}
        <div className="mb-6">
          <label
            htmlFor="odds-input"
            className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5"
          >
            Enter Odds
          </label>
          <input
            id="odds-input"
            type="text"
            inputMode="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholders[format]}
            className="w-full max-w-xs bg-zinc-800 border border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-md px-3.5 py-2.5 text-white placeholder:text-zinc-600 text-sm font-mono outline-none transition-colors"
          />
          {input && !isValid && (
            <p className="mt-1.5 text-xs text-red-400">Enter valid odds</p>
          )}
        </div>

        {/* Results */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-md px-4 py-1">
          {isValid ? (
            <>
              <ResultRow label="American" value={formatAmerican(american!)} />
              <ResultRow label="Decimal" value={displayDecimal} />
              <ResultRow label="Fractional" value={displayFractional} />
              <ResultRow label="Implied Probability" value={displayImplied} />
              <ResultRow label="Payout on $100 bet" value={displayPayout} />
            </>
          ) : (
            <div className="py-5 text-center text-sm text-zinc-600">
              {input ? 'Enter valid odds to see conversions' : 'Enter odds above to convert'}
            </div>
          )}
        </div>
      </div>

      {/* Vig calculator card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-base font-semibold text-white mb-1">Vig Calculator</h2>
        <p className="text-sm text-zinc-500 mb-5">
          Enter American odds for both sides of a market to calculate the bookmaker margin.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label
              htmlFor="vig-side1"
              className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5"
            >
              Side 1 (American)
            </label>
            <input
              id="vig-side1"
              type="text"
              inputMode="text"
              value={vigInput1}
              onChange={(e) => setVigInput1(e.target.value)}
              placeholder="-110"
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-md px-3.5 py-2.5 text-white placeholder:text-zinc-600 text-sm font-mono outline-none transition-colors"
            />
          </div>
          <div>
            <label
              htmlFor="vig-side2"
              className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5"
            >
              Side 2 (American)
            </label>
            <input
              id="vig-side2"
              type="text"
              inputMode="text"
              value={vigInput2}
              onChange={(e) => setVigInput2(e.target.value)}
              placeholder="-110"
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-md px-3.5 py-2.5 text-white placeholder:text-zinc-600 text-sm font-mono outline-none transition-colors"
            />
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-md px-4 py-1">
          {vigIsValid ? (
            <>
              <ResultRow label="Total Vig" value={vigPercent} />
              <ResultRow
                label={`No-Vig Fair Odds — Side 1 (${vigInput1.trim()})`}
                value={fairOdds1}
              />
              <ResultRow
                label={`No-Vig Fair Odds — Side 2 (${vigInput2.trim()})`}
                value={fairOdds2}
              />
            </>
          ) : (
            <div className="py-5 text-center text-sm text-zinc-600">
              {(vigInput1 || vigInput2) ? 'Enter valid American odds for both sides' : 'Enter both sides to calculate vig'}
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-zinc-600">
          Vig is the bookmaker&apos;s margin — the excess implied probability above 100%. A standard -110/-110 line has ~4.76% vig.
        </p>
      </div>

    </div>
  )
}
