'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  getWelcomeEmail,
  getTutorialEmail,
  getProNudgeEmail,
  type EmailContent,
} from '@/lib/onboarding-emails'

const TABS = [
  { key: 'welcome', label: 'Welcome', day: 'Day 0' },
  { key: 'tutorial', label: 'Tutorial', day: 'Day 2' },
  { key: 'pro', label: 'Pro Nudge', day: 'Day 5' },
] as const

type TabKey = (typeof TABS)[number]['key']

function getEmail(tab: TabKey, userName: string): EmailContent {
  switch (tab) {
    case 'welcome':
      return getWelcomeEmail(userName)
    case 'tutorial':
      return getTutorialEmail(userName)
    case 'pro':
      return getProNudgeEmail(userName)
  }
}

export function OnboardingPreview() {
  const [activeTab, setActiveTab] = useState<TabKey>('welcome')
  const [userName, setUserName] = useState('Alex')
  const [testResult, setTestResult] = useState<string | null>(null)

  const email = getEmail(activeTab, userName)

  const handleSendTest = () => {
    setTestResult('Email sending via Resend coming soon.')
  }

  return (
    <div className="space-y-6">
      {/* Name input + tab controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label
            htmlFor="preview-name"
            className="shrink-0 text-sm text-muted-foreground"
          >
            Preview as:
          </label>
          <Input
            id="preview-name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter a name"
            className="w-40 h-8 text-sm"
          />
        </div>

        {/* Tab buttons */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex flex-col items-center rounded-md px-4 py-1.5 text-xs font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <span>{tab.label}</span>
              <span
                className={[
                  'text-[10px] font-normal',
                  activeTab === tab.key
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/60',
                ].join(' ')}
              >
                {tab.day}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Mock email client */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Email client chrome */}
        <div className="border-b border-border bg-muted/20 px-4 py-2">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/70" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <div className="h-3 w-3 rounded-full bg-green-500/70" />
          </div>
        </div>

        {/* Email metadata header */}
        <div className="border-b border-border px-6 py-4 space-y-1.5">
          <div className="flex items-start gap-3 text-sm">
            <span className="w-16 shrink-0 text-muted-foreground">From</span>
            <span className="font-medium">BetBrain &lt;hello@betbrain.ai&gt;</span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="w-16 shrink-0 text-muted-foreground">To</span>
            <span className="text-muted-foreground">{userName.toLowerCase().replace(/\s+/g, '.')}@example.com</span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="w-16 shrink-0 text-muted-foreground">Subject</span>
            <span className="font-semibold text-foreground">{email.subject}</span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="w-16 shrink-0 text-muted-foreground">Preview</span>
            <span className="italic text-muted-foreground">{email.previewText}</span>
          </div>
        </div>

        {/* Email body */}
        <div className="px-6 py-6 space-y-5">
          {/* Logo/brand strip */}
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">B</span>
            </div>
            <span className="text-sm font-semibold tracking-wide text-foreground">BetBrain</span>
          </div>

          <Separator className="bg-border" />

          {/* Heading */}
          <h2 className="text-xl font-bold leading-snug">{email.heading}</h2>

          {/* Body paragraphs */}
          <div className="space-y-3">
            {email.body.map((paragraph, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>

          {/* CTA button */}
          <div className="pt-2">
            <a
              href={email.ctaUrl}
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={(e) => e.preventDefault()}
            >
              {email.ctaText}
            </a>
          </div>

          <Separator className="bg-border" />

          {/* Footer */}
          <p className="text-xs leading-relaxed text-muted-foreground/70 italic">
            {email.footer}
          </p>
        </div>
      </div>

      {/* Send test email row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Sequence: Day 0 welcome &rarr; Day 2 tutorial &rarr; Day 5 pro nudge
        </p>
        <div className="flex items-center gap-3">
          {testResult && (
            <span className="text-xs text-muted-foreground">{testResult}</span>
          )}
          <Button size="sm" variant="outline" onClick={handleSendTest}>
            Send test email
          </Button>
        </div>
      </div>
    </div>
  )
}
