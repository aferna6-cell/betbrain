import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#09090b',
          borderRadius: '64px',
        }}
      >
        <span
          style={{
            fontSize: '256px',
            fontWeight: 900,
            color: '#3b82f6',
            letterSpacing: '-10px',
          }}
        >
          BB
        </span>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
