'use client'

import { useEffect } from 'react'

// ---------------------------------------------------------------------------
// PerformanceEntry extensions
// The standard lib.dom.d.ts only covers the base PerformanceEntry interface.
// These extended types match the actual runtime shapes for the three metrics.
// ---------------------------------------------------------------------------

interface LargestContentfulPaintEntry extends PerformanceEntry {
  readonly entryType: 'largest-contentful-paint'
}

interface FirstInputEntry extends PerformanceEntry {
  readonly entryType: 'first-input'
  readonly processingStart: DOMHighResTimeStamp
}

interface LayoutShiftEntry extends PerformanceEntry {
  readonly entryType: 'layout-shift'
  readonly value: number
  readonly hadRecentInput: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WebVitalsReporter() {
  useEffect(() => {
    // Production only — don't clutter the console in development
    if (process.env.NODE_ENV !== 'production') return
    if (typeof window === 'undefined') return

    // LCP — Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries() as LargestContentfulPaintEntry[]
      const lastEntry = entries[entries.length - 1]
      if (lastEntry) {
        console.log('[vitals] LCP:', Math.round(lastEntry.startTime), 'ms')
      }
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

    // FID — First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as FirstInputEntry[]) {
        console.log(
          '[vitals] FID:',
          Math.round(entry.processingStart - entry.startTime),
          'ms',
        )
      }
    })
    fidObserver.observe({ type: 'first-input', buffered: true })

    // CLS — Cumulative Layout Shift
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      }
      console.log('[vitals] CLS:', clsValue.toFixed(4))
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })

    return () => {
      lcpObserver.disconnect()
      fidObserver.disconnect()
      clsObserver.disconnect()
    }
  }, [])

  return null // No UI — metrics are reported to the console only
}
