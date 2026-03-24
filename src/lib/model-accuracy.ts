/**
 * Model accuracy tracking.
 * Compares AI confidence predictions against actual pick outcomes
 * to measure how well the model's confidence calibrates.
 *
 * Stored in localStorage with analysis confidence and pick outcome pairs.
 */

export interface AccuracyRecord {
  id: string
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  aiConfidence: number // 0-100
  aiSide: 'home' | 'away' | 'neither'
  riskLevel: 'low' | 'medium' | 'high'
  pickOutcome: 'win' | 'loss' | 'push' | null
  createdAt: string
}

export interface AccuracyBucket {
  range: string
  min: number
  max: number
  total: number
  correct: number
  winRate: number | null
}

export interface ModelAccuracyStats {
  totalRecords: number
  overallAccuracy: number | null
  buckets: AccuracyBucket[]
  brierScore: number | null
  byRiskLevel: {
    level: string
    total: number
    correct: number
    winRate: number | null
  }[]
  recentTrend: { date: string; correct: boolean }[]
}

const STORAGE_KEY = 'betbrain_model_accuracy'

const BUCKETS: { range: string; min: number; max: number }[] = [
  { range: '50-59%', min: 50, max: 60 },
  { range: '60-69%', min: 60, max: 70 },
  { range: '70-79%', min: 70, max: 80 },
  { range: '80-89%', min: 80, max: 90 },
  { range: '90-100%', min: 90, max: 101 },
]

/**
 * Load all accuracy records from localStorage.
 */
export function loadAccuracyRecords(): AccuracyRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Save an accuracy record. Upserts by gameId (one record per game).
 */
export function saveAccuracyRecord(record: Omit<AccuracyRecord, 'id' | 'createdAt'>): AccuracyRecord {
  const records = loadAccuracyRecords()
  const existing = records.findIndex((r) => r.gameId === record.gameId)

  const full: AccuracyRecord = {
    ...record,
    id: existing >= 0 ? records[existing].id : crypto.randomUUID(),
    createdAt: existing >= 0 ? records[existing].createdAt : new Date().toISOString(),
  }

  if (existing >= 0) {
    records[existing] = full
  } else {
    records.push(full)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  return full
}

/**
 * Update the outcome for a record by gameId.
 */
export function updateAccuracyOutcome(gameId: string, outcome: 'win' | 'loss' | 'push'): void {
  const records = loadAccuracyRecords()
  const idx = records.findIndex((r) => r.gameId === gameId)
  if (idx < 0) return
  records[idx].pickOutcome = outcome
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

/**
 * Calculate model accuracy statistics from records.
 * Pure function — takes records as input for testability.
 */
export function calcModelAccuracy(records: AccuracyRecord[]): ModelAccuracyStats {
  const resolved = records.filter((r) => r.pickOutcome && r.pickOutcome !== 'push')
  const total = resolved.length

  // Overall accuracy
  const correct = resolved.filter((r) => r.pickOutcome === 'win').length
  const overallAccuracy = total > 0 ? Math.round((correct / total) * 1000) / 10 : null

  // Bucket breakdown
  const buckets: AccuracyBucket[] = BUCKETS.map(({ range, min, max }) => {
    const inBucket = resolved.filter((r) => r.aiConfidence >= min && r.aiConfidence < max)
    const bucketCorrect = inBucket.filter((r) => r.pickOutcome === 'win').length
    return {
      range,
      min,
      max,
      total: inBucket.length,
      correct: bucketCorrect,
      winRate: inBucket.length > 0 ? Math.round((bucketCorrect / inBucket.length) * 1000) / 10 : null,
    }
  })

  // Brier score: mean of (confidence - actual)^2
  // Lower is better. 0 = perfect, 0.25 = random
  let brierScore: number | null = null
  if (total > 0) {
    const sumSquaredError = resolved.reduce((sum, r) => {
      const predicted = r.aiConfidence / 100
      const actual = r.pickOutcome === 'win' ? 1 : 0
      return sum + (predicted - actual) ** 2
    }, 0)
    brierScore = Math.round((sumSquaredError / total) * 10000) / 10000
  }

  // By risk level
  const riskLevels = ['low', 'medium', 'high']
  const byRiskLevel = riskLevels.map((level) => {
    const inLevel = resolved.filter((r) => r.riskLevel === level)
    const levelCorrect = inLevel.filter((r) => r.pickOutcome === 'win').length
    return {
      level,
      total: inLevel.length,
      correct: levelCorrect,
      winRate: inLevel.length > 0 ? Math.round((levelCorrect / inLevel.length) * 1000) / 10 : null,
    }
  }).filter((l) => l.total > 0)

  // Recent trend (last 20 resolved)
  const recent = resolved
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)
    .map((r) => ({
      date: r.createdAt.split('T')[0],
      correct: r.pickOutcome === 'win',
    }))
    .reverse()

  return {
    totalRecords: records.length,
    overallAccuracy,
    buckets,
    brierScore,
    byRiskLevel,
    recentTrend: recent,
  }
}
