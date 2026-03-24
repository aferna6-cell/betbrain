'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getAllReviews,
  getReviewForDate,
  saveReview,
  calculateReviewStats,
  type DailyReview,
  type ReviewStats,
} from '@/lib/daily-review'

// ---------------------------------------------------------------------------
// Daily Review Prompt — appears on dashboard when picks exist but no review
// ---------------------------------------------------------------------------

export function DailyReviewPrompt() {
  const [show, setShow] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    // Check if it's evening (after 6 PM) and there's no review for today
    const hour = new Date().getHours()
    if (hour >= 18) {
      const today = new Date().toISOString().split('T')[0]
      const existing = getReviewForDate(today)
      if (!existing) setShow(true)
    }
  }, [])

  if (!show) return null

  if (formOpen) {
    return (
      <DailyReviewForm
        onSave={() => {
          setFormOpen(false)
          setShow(false)
        }}
        onCancel={() => setFormOpen(false)}
      />
    )
  }

  return (
    <div className="rounded-lg border border-blue-900/50 bg-blue-950/30 p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">Time for your daily review</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Grade your decision-making process and capture today&apos;s lessons.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShow(false)}>
          Later
        </Button>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          Review Now
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Review Form
// ---------------------------------------------------------------------------

function DailyReviewForm({
  onSave,
  onCancel,
}: {
  onSave: () => void
  onCancel: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [grade, setGrade] = useState<DailyReview['processGrade']>('B')
  const [discipline, setDiscipline] = useState(3)
  const [bankrollDiscipline, setBankrollDiscipline] = useState(3)
  const [research, setResearch] = useState(3)
  const [chased, setChased] = useState(false)
  const [lesson, setLesson] = useState('')
  const [notes, setNotes] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const review: DailyReview = {
      date: today,
      processGrade: grade,
      discipline,
      bankrollDiscipline,
      researchQuality: research,
      chased,
      pickCount: 0, // Will be updated when we have pick data
      lesson,
      notes,
      tags: [],
      createdAt: new Date().toISOString(),
    }
    saveReview(review)
    onSave()
  }

  const inputClass = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm'
  const grades: DailyReview['processGrade'][] = ['A', 'B', 'C', 'D', 'F']

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Daily Review — {today}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Process grade */}
      <div>
        <label className="mb-2 block text-sm text-muted-foreground">
          Overall process grade (how well did you execute your strategy?)
        </label>
        <div className="flex gap-2">
          {grades.map((g) => (
            <Button
              key={g}
              type="button"
              variant={grade === g ? 'default' : 'outline'}
              size="sm"
              className={`w-10 ${
                grade === g
                  ? g === 'A' ? 'bg-green-600' :
                    g === 'B' ? 'bg-blue-600' :
                    g === 'C' ? 'bg-yellow-600' :
                    g === 'D' ? 'bg-orange-600' : 'bg-red-600'
                  : ''
              }`}
              onClick={() => setGrade(g)}
            >
              {g}
            </Button>
          ))}
        </div>
      </div>

      {/* Ratings */}
      <div className="grid gap-4 sm:grid-cols-3">
        <RatingInput
          label="Discipline"
          value={discipline}
          onChange={setDiscipline}
          description="Did you stick to your rules?"
        />
        <RatingInput
          label="Bankroll"
          value={bankrollDiscipline}
          onChange={setBankrollDiscipline}
          description="Proper unit sizing?"
        />
        <RatingInput
          label="Research"
          value={research}
          onChange={setResearch}
          description="Were picks well-researched?"
        />
      </div>

      {/* Chase indicator */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={chased}
          onChange={(e) => setChased(e.target.checked)}
          className="rounded border-border"
        />
        <span className="text-sm">I chased losses or tilted today</span>
      </label>

      {/* Lesson */}
      <div>
        <label className="mb-1 block text-sm text-muted-foreground">
          Top lesson learned today
        </label>
        <input
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          placeholder="e.g. Should have waited for better line on the Celtics game"
          className={inputClass}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1 block text-sm text-muted-foreground">
          Additional notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Free-form thoughts about today's betting..."
          rows={3}
          className={inputClass}
        />
      </div>

      <Button type="submit" className="w-full sm:w-auto">
        Save Review
      </Button>
    </form>
  )
}

function RatingInput({
  label,
  value,
  onChange,
  description,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  description: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-muted-foreground">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
              n <= value
                ? 'bg-blue-600 text-white'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Review History — shows past reviews with stats
// ---------------------------------------------------------------------------

export function ReviewHistory() {
  const [reviews, setReviews] = useState<DailyReview[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)

  useEffect(() => {
    const allReviews = getAllReviews()
    setReviews(allReviews)
    setStats(calculateReviewStats(allReviews))
  }, [])

  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No daily reviews yet. Complete your first review from the dashboard after 6 PM.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && stats.totalReviews > 0 && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground">Reviews</p>
            <p className="text-xl font-bold">{stats.totalReviews}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground">Avg Grade</p>
            <p className={`text-xl font-bold ${
              stats.avgProcessGrade === 'A' ? 'text-green-400' :
              stats.avgProcessGrade === 'B' ? 'text-blue-400' :
              stats.avgProcessGrade === 'C' ? 'text-yellow-400' : 'text-red-400'
            }`}>{stats.avgProcessGrade}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground">Discipline</p>
            <p className="text-xl font-bold">{stats.avgDiscipline}/5</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground">Research</p>
            <p className="text-xl font-bold">{stats.avgResearch}/5</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground">Chase Rate</p>
            <p className={`text-xl font-bold ${
              stats.chaseRate > 30 ? 'text-red-400' : stats.chaseRate > 15 ? 'text-yellow-400' : 'text-green-400'
            }`}>{stats.chaseRate}%</p>
          </div>
        </div>
      )}

      {/* Trend */}
      {stats && stats.recentTrend !== 'stable' && (
        <div className={`rounded border p-3 text-sm ${
          stats.recentTrend === 'improving'
            ? 'border-green-900/50 bg-green-950/30 text-green-400'
            : 'border-red-900/50 bg-red-950/30 text-red-400'
        }`}>
          {stats.recentTrend === 'improving'
            ? 'Your process is improving compared to earlier reviews.'
            : 'Your process grades are declining. Review your approach.'}
        </div>
      )}

      {/* Recent reviews */}
      <div className="space-y-2">
        {reviews.slice(0, 10).map((review) => (
          <div key={review.date} className="rounded-lg border border-border/50 bg-card p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{review.date}</span>
              <div className="flex items-center gap-2">
                {review.chased && (
                  <Badge className="text-[10px] bg-red-500/20 text-red-400">Chased</Badge>
                )}
                <Badge className={`text-xs ${
                  review.processGrade === 'A' ? 'bg-green-500/20 text-green-400' :
                  review.processGrade === 'B' ? 'bg-blue-500/20 text-blue-400' :
                  review.processGrade === 'C' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {review.processGrade}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
              <span>Discipline: {review.discipline}/5</span>
              <span>Bankroll: {review.bankrollDiscipline}/5</span>
              <span>Research: {review.researchQuality}/5</span>
            </div>
            {review.lesson && (
              <p className="text-xs text-muted-foreground italic">&ldquo;{review.lesson}&rdquo;</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
