import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Game Analysis — BetBrain'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image({ params }: { params: { gameId: string } }) {
  const gameId = params.gameId

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a1a',
          padding: '80px',
          justifyContent: 'space-between',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '4px',
            background: 'linear-gradient(90deg, #6366f1 0%, #818cf8 50%, #a5b4fc 100%)',
            borderRadius: '2px',
          }}
        />

        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '44px',
              height: '44px',
              backgroundColor: '#6366f1',
              borderRadius: '10px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '26px',
                fontWeight: 900,
                color: '#ffffff',
              }}
            >
              B
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '28px',
              fontWeight: 700,
              color: '#a5b4fc',
              letterSpacing: '-0.5px',
            }}
          >
            BetBrain
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            gap: '20px',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'flex',
            }}
          >
            <div
              style={{
                display: 'flex',
                padding: '6px 18px',
                backgroundColor: '#1e1e3a',
                borderRadius: '999px',
                border: '1px solid #6366f1',
                fontSize: '14px',
                fontWeight: 600,
                color: '#818cf8',
                letterSpacing: '0.05em',
              }}
            >
              GAME ANALYSIS
            </div>
          </div>

          {/* Heading */}
          <div
            style={{
              display: 'flex',
              fontSize: '60px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-2px',
              lineHeight: 1.1,
            }}
          >
            AI-Powered Game Breakdown
          </div>

          {/* Description */}
          <div
            style={{
              display: 'flex',
              fontSize: '26px',
              fontWeight: 400,
              color: '#94a3b8',
              lineHeight: 1.4,
            }}
          >
            Odds comparison, AI analysis, and line movement tracking
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Feature pills */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
            }}
          >
            {['Odds Comparison', 'AI Analysis', 'Line Movement'].map((label) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  padding: '6px 16px',
                  backgroundColor: '#1e1e3a',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#64748b',
                  border: '1px solid #1e293b',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Game ID */}
          <div
            style={{
              display: 'flex',
              fontSize: '13px',
              fontWeight: 400,
              color: '#334155',
              fontFamily: 'monospace',
            }}
          >
            {gameId}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
