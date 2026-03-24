'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  loadPickTemplates,
  savePickTemplate,
  deletePickTemplate,
  usePickTemplate,
  type PickTemplate,
} from '@/lib/pick-templates'

interface PickTemplatesProps {
  /** Called when a template is selected, passing the template values */
  onApply: (template: { sport: string; pickType: string; units: number; defaultLine: number | null }) => void
}

const SPORTS = ['nba', 'nfl', 'mlb', 'nhl']
const PICK_TYPES = ['moneyline', 'spread', 'over', 'under', 'prop']

/**
 * Pick templates panel — shown on the picks page.
 * Lets users save/load common pick configurations.
 */
export function PickTemplatesPanel({ onApply }: PickTemplatesProps) {
  const [templates, setTemplates] = useState<PickTemplate[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [sport, setSport] = useState('nba')
  const [pickType, setPickType] = useState('moneyline')
  const [units, setUnits] = useState(1)
  const [defaultLine, setDefaultLine] = useState<string>('')

  useEffect(() => {
    setTemplates(loadPickTemplates())
  }, [])

  function handleSave() {
    if (!name.trim()) return
    const saved = savePickTemplate({
      name: name.trim(),
      sport,
      pickType,
      units,
      defaultLine: defaultLine ? parseFloat(defaultLine) : null,
    })
    setTemplates(loadPickTemplates())
    setShowForm(false)
    setName('')
    setDefaultLine('')
  }

  function handleApply(template: PickTemplate) {
    usePickTemplate(template.id)
    setTemplates(loadPickTemplates())
    onApply({
      sport: template.sport,
      pickType: template.pickType,
      units: template.units,
      defaultLine: template.defaultLine,
    })
  }

  function handleDelete(id: string) {
    deletePickTemplate(id)
    setTemplates(loadPickTemplates())
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick Templates
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New'}
        </Button>
      </div>

      {/* Template creation form */}
      {showForm && (
        <div className="space-y-2 border-t border-border pt-3">
          <input
            type="text"
            placeholder="Template name (e.g., NBA ML 1u)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              {SPORTS.map((s) => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
            <select
              value={pickType}
              onChange={(e) => setPickType(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              {PICK_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={units}
              onChange={(e) => setUnits(parseFloat(e.target.value) || 1)}
              className="w-16 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-right"
              placeholder="Units"
            />
          </div>
          {(pickType === 'spread' || pickType === 'over' || pickType === 'under') && (
            <input
              type="number"
              step={0.5}
              value={defaultLine}
              onChange={(e) => setDefaultLine(e.target.value)}
              placeholder="Default line (optional)"
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          )}
          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Save Template
          </Button>
        </div>
      )}

      {/* Template list */}
      {templates.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground">
          No templates yet. Create one to quickly log common picks.
        </p>
      )}

      {templates.length > 0 && (
        <div className="space-y-1">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 hover:bg-accent/50 transition-colors group"
            >
              <button
                className="flex items-center gap-2 text-left flex-1"
                onClick={() => handleApply(t)}
              >
                <Badge variant="secondary" className="text-[10px]">
                  {t.sport.toUpperCase()}
                </Badge>
                <span className="text-sm font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">
                  {t.pickType} &middot; {t.units}u
                  {t.defaultLine != null ? ` &middot; ${t.defaultLine}` : ''}
                </span>
              </button>
              <div className="flex items-center gap-2">
                {t.useCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {t.useCount}x
                  </span>
                )}
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  title="Delete template"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
