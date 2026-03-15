import { NextResponse } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/api/route-handler'
import { generateDigest, formatDigestText, sendDigestEmail } from '@/lib/digest'

export async function GET(request: Request) {
  return withAuthenticatedRoute(request, 'digest-preview', async () => {
    const digest = await generateDigest()

    return NextResponse.json({
      ...digest,
      textPreview: formatDigestText(digest),
    })
  })
}

export async function POST(request: Request) {
  return withAuthenticatedRoute(request, 'send-digest', async ({ user }) => {
    const digest = await generateDigest()
    const result = await sendDigestEmail(user.email ?? '', digest)

    return NextResponse.json({
      ...result,
      message: result.sent
        ? 'Digest email sent'
        : 'Digest generated (email sending not yet configured — see preview)',
      digest,
    })
  })
}
