import { ImageResponse } from 'next/og'
import { getGameById } from '@/lib/sports/odds'

export const runtime = 'edge'
export const alt = 'Game Analysis — BetBrain'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params
  const game = await getGameById(gameId)

  const awayTeam = game?.awayTeam ?? 'Away Team'
  const homeTeam = game?.homeTeam ?? 'Home Team'
  const sport = game?.sport?.toUpperCase() ?? 'GAME'

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
          {/* Sport badge */}
          <div
            style={{
              display: 'flex',
              padding: '8px 20px',
              backgroundColor: '#1e1e3a',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: 700,
              color: '#a5b4fc',
              border: '1px solid #2d2d5e',
              width: 'fit-content',
            }}
          >
            {sport}
          </div>

          {/* Matchup */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '52px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-2px',
              }}
            >
              {awayTeam}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '24px',
                fontWeight: 500,
                color: '#64748b',
                paddingLeft: '4px',
              }}
            >
              @
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '52px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-2px',
              }}
            >
              {homeTeam}
            </div>
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
          <div
            style={{
              display: 'flex',
              fontSize: '20px',
              fontWeight: 600,
              color: '#475569',
            }}
          >
            BetBrain
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
