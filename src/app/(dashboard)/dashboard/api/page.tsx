import type { Metadata } from 'next'
import { ApiDocs } from '@/components/api-docs'

export const metadata: Metadata = {
  title: 'API Access — BetBrain',
  description: 'Access BetBrain analysis via REST API for programmatic integration.',
}

export default function ApiPage() {
  return <ApiDocs />
}
