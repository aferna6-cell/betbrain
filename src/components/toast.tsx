'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, duration?: number) => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Default durations
// ---------------------------------------------------------------------------

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3000,
  info: 3000,
  error: 5000,
}

// ---------------------------------------------------------------------------
// Single toast item
// ---------------------------------------------------------------------------

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) {
  // Track whether the toast has been "entering" (for slide-in) or is dismissing
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Trigger enter animation on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Auto-dismiss after duration
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      handleDismiss()
    }, toast.duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id, toast.duration])

  function handleDismiss() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setLeaving(true)
    setTimeout(() => onDismiss(toast.id), 300)
  }

  const borderColor = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    info: 'border-l-blue-500',
  }[toast.type]

  const bgColor = {
    success: 'bg-green-500/10',
    error: 'bg-red-500/10',
    info: 'bg-blue-500/10',
  }[toast.type]

  const iconColor = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-400',
  }[toast.type]

  // Inline transition style — translate + opacity
  const style: React.CSSProperties = {
    transition: 'opacity 300ms ease, transform 300ms ease',
    opacity: visible && !leaving ? 1 : 0,
    transform: visible && !leaving ? 'translateX(0)' : 'translateX(1.5rem)',
  }

  return (
    <div
      role="alert"
      style={style}
      className={`
        flex items-start gap-3 rounded-lg border border-border border-l-4
        ${borderColor} ${bgColor}
        px-4 py-3 shadow-lg backdrop-blur-sm
        min-w-[280px] max-w-[360px] pointer-events-auto
      `}
    >
      {/* Icon */}
      <span className={`mt-0.5 shrink-0 ${iconColor}`} aria-hidden="true">
        {toast.type === 'success' && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {toast.type === 'error' && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
        {toast.type === 'info' && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )}
      </span>

      {/* Message */}
      <p className="flex-1 text-sm leading-snug text-foreground">
        {toast.message}
      </p>

      {/* Close button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="ml-1 shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Provider + Container
// ---------------------------------------------------------------------------

const MAX_VISIBLE = 5

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const resolvedDuration = duration ?? DEFAULT_DURATION[type]

      setToasts((prev) => {
        const next = [
          ...prev,
          { id, message, type, duration: resolvedDuration },
        ]
        // If over the max, drop the oldest entries
        return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next
      })
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast container — fixed bottom-right, pointer-events-none so it doesn't block clicks */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
