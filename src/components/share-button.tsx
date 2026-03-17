'use client'

import { useState } from 'react'
import { useToast } from '@/components/toast'

export function ShareButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false)
  const { addToast } = useToast()

  const shareUrl = `${window.location.origin}/share/${userId}`

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      addToast('Share link copied to clipboard', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      addToast('Failed to copy link', 'error')
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My BetBrain Record',
          text: 'Check out my pick tracking record on BetBrain',
          url: shareUrl,
        })
      } catch {
        // User cancelled share — not an error
      }
    } else {
      handleCopyLink()
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleShare}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-transparent px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Share Profile
      </button>
      <button
        onClick={handleCopyLink}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-transparent px-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        title="Copy share link"
      >
        {copied ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
      </button>
    </div>
  )
}
