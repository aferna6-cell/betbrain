import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'BetBrain Blog — Sports Betting Analytics Insights'
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
              BLOG
            </div>
          </div>

          {/* Heading */}
          <div
            style={{
              display: 'flex',
              fontSize: '68px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-3px',
              lineHeight: 1.05,
            }}
          >
            BetBrain Blog
          </div>

          {/* Subtitle */}
          <div
            style={{
              display: 'flex',
              fontSize: '30px',
              fontWeight: 500,
              color: '#818cf8',
              letterSpacing: '-0.5px',
            }}
          >
            Sports Betting Analytics Insights
          </div>

          {/* Description */}
          <div
            style={{
              display: 'flex',
              fontSize: '22px',
              fontWeight: 400,
              color: '#64748b',
              lineHeight: 1.4,
            }}
          >
            Data-driven breakdowns, line movement patterns, and value analysis
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
          {/* Topic tags */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
            }}
          >
            {['Odds Analysis', 'Line Movement', 'AI Insights', 'Value Betting'].map((tag) => (
              <div
                key={tag}
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
                {tag}
              </div>
            ))}
          </div>

          {/* Domain */}
          <div
            style={{
              display: 'flex',
              fontSize: '16px',
              fontWeight: 500,
              color: '#334155',
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
