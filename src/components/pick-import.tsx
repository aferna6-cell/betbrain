'use client'

import { useState, useCallback, useRef } from 'react'
import { parseCSV, generateCSVTemplate, type ImportResult } from '@/lib/pick-import'

export function PickImportPanel() {
  const [result, setResult] = useState<ImportResult | null>(null)
  const [imported, setImported] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (text) {
        const parsed = parseCSV(text)
        setResult(parsed)
        setImported(false)
      }
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handlePaste = useCallback((text: string) => {
    if (text.trim()) {
      const parsed = parseCSV(text)
      setResult(parsed)
      setImported(false)
    }
  }, [])

  const handleImport = useCallback(() => {
    if (!result || result.success.length === 0) return

    try {
      const existing = JSON.parse(localStorage.getItem('betbrain-picks') || '[]')
      const newPicks = result.success.map((pick) => ({
        id: crypto.randomUUID(),
        user_id: 'local',
        external_game_id: `import-${pick.game_date}-${pick.pick_team || pick.sport}`,
        ...pick,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resolved_at: pick.outcome && pick.outcome !== 'pending' ? new Date().toISOString() : null,
        closing_odds: null,
      }))
      localStorage.setItem('betbrain-picks', JSON.stringify([...existing, ...newPicks]))
      setImported(true)
    } catch { /* empty */ }
  }, [result])

  const downloadTemplate = useCallback(() => {
    const template = generateCSVTemplate()
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'betbrain-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Import Picks from CSV</h3>
        <p className="text-sm text-muted-foreground">
          Upload a CSV or paste data to bulk-import historical picks.
        </p>
      </div>

      {/* Download template */}
      <button
        onClick={downloadTemplate}
        className="text-sm text-primary hover:underline"
      >
        Download CSV template
      </button>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-sm text-muted-foreground">
          <div className="text-lg mb-1">Drop CSV file here</div>
          <div>or click to browse</div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>

      {/* Paste area */}
      <div>
        <label className="text-sm text-muted-foreground block mb-1">
          Or paste CSV data:
        </label>
        <textarea
          className="w-full h-24 rounded-md border border-border bg-background p-3 text-sm font-mono resize-y"
          placeholder="sport,odds,game_date&#10;nba,-150,2026-03-20"
          onBlur={(e) => handlePaste(e.target.value)}
        />
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-green-400">{result.success.length} valid</div>
            <div className="text-red-400">{result.errors.length} errors</div>
            <div className="text-muted-foreground">{result.totalRows} total rows</div>
            {result.skippedRows > 0 && (
              <div className="text-amber-400">{result.skippedRows} skipped</div>
            )}
          </div>

          {/* Preview */}
          {result.success.length > 0 && (
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-1 pr-2">Date</th>
                    <th className="text-left py-1 pr-2">Sport</th>
                    <th className="text-left py-1 pr-2">Type</th>
                    <th className="text-left py-1 pr-2">Team</th>
                    <th className="text-right py-1 pr-2">Odds</th>
                    <th className="text-right py-1 pr-2">Units</th>
                    <th className="text-left py-1 pr-2">Result</th>
                    <th className="text-right py-1">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {result.success.slice(0, 20).map((pick, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1 pr-2">{pick.game_date}</td>
                      <td className="py-1 pr-2 uppercase">{pick.sport}</td>
                      <td className="py-1 pr-2">{pick.pick_type}</td>
                      <td className="py-1 pr-2">{pick.pick_team || '-'}</td>
                      <td className="text-right py-1 pr-2 font-mono">
                        {pick.odds > 0 ? `+${pick.odds}` : pick.odds}
                      </td>
                      <td className="text-right py-1 pr-2">{pick.units}u</td>
                      <td className="py-1 pr-2">
                        <span
                          className={
                            pick.outcome === 'win'
                              ? 'text-green-400'
                              : pick.outcome === 'loss'
                                ? 'text-red-400'
                                : 'text-muted-foreground'
                          }
                        >
                          {pick.outcome || 'pending'}
                        </span>
                      </td>
                      <td className="text-right py-1 font-mono">
                        {pick.profit !== null ? (
                          <span className={pick.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {pick.profit >= 0 ? '+' : ''}{pick.profit.toFixed(2)}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.success.length > 20 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  +{result.success.length - 20} more rows
                </div>
              )}
            </div>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-red-400">Errors:</div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {result.errors.slice(0, 10).map((err, i) => (
                  <div key={i} className="text-xs text-red-400/80">
                    Row {err.row}: {err.message}
                  </div>
                ))}
                {result.errors.length > 10 && (
                  <div className="text-xs text-muted-foreground">
                    +{result.errors.length - 10} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import button */}
          {result.success.length > 0 && !imported && (
            <button
              onClick={handleImport}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Import {result.success.length} picks
            </button>
          )}

          {imported && (
            <div className="rounded-md bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-400">
              Successfully imported {result.success.length} picks! Refresh the page to see them.
            </div>
          )}
        </div>
      )}

      {/* Required columns info */}
      <div className="text-xs text-muted-foreground">
        <div className="font-medium mb-1">Required columns:</div>
        <div>sport, odds, game_date</div>
        <div className="mt-1 font-medium">Optional columns:</div>
        <div>pick_type (or: type, market), pick_team (or: team, selection), units (or: stake), outcome (or: result), profit (or: pnl), notes, pick_line (or: spread, line)</div>
      </div>
    </div>
  )
}
