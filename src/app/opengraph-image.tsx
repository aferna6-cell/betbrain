import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'BetBrain — AI-Powered Sports Analytics'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
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

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            gap: '24px',
          }}
        >
          {/* Brand name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            {/* Logo mark */}
            <div
              style={{
                display: 'flex',
                width: '64px',
                height: '64px',
                backgroundColor: '#6366f1',
                borderRadius: '14px',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: '36px',
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-1px',
                }}
              >
                B
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '72px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-3px',
              }}
            >
              BetBrain
            </div>
          </div>

          {/* Subtitle */}
          <div
            style={{
              display: 'flex',
              fontSize: '36px',
              fontWeight: 600,
              color: '#818cf8',
              letterSpacing: '-0.5px',
            }}
          >
            AI-Powered Sports Analytics
          </div>

          {/* Tagline */}
          <div
            style={{
              display: 'flex',
              fontSize: '24px',
              fontWeight: 400,
              color: '#94a3b8',
            }}
          >
            Find value in every line
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
          {/* Sport tags */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
            }}
          >
            {['NBA', 'NFL', 'MLB', 'NHL'].map((sport) => (
              <div
                key={sport}
                style={{
                  display: 'flex',
                  padding: '6px 16px',
                  backgroundColor: '#1e1e3a',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#a5b4fc',
                  border: '1px solid #2d2d5e',
                }}
              >
                {sport}
              </div>
            ))}
          </div>

          {/* betbrain.ai label */}
          <div
            style={{
              display: 'flex',
              fontSize: '16px',
              fontWeight: 500,
              color: '#475569',
            }}
          >
            betbrain.ai
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
