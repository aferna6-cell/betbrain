import { ImageResponse } from 'next/og'
import { getShareableStats } from '@/lib/share-stats'

export const runtime = 'edge'
export const alt = 'BetBrain — Pick Record'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const stats = await getShareableStats(userId)

  if (!stats) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            backgroundColor: '#0a0a1a',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: '36px',
          }}
        >
          User not found
        </div>
      ),
      { ...size }
    )
  }

  const record = `${stats.record.wins}W-${stats.record.losses}L${stats.record.pushes > 0 ? `-${stats.record.pushes}P` : ''}`
  const roiColor = stats.roi > 0 ? '#22c55e' : stats.roi < 0 ? '#ef4444' : '#94a3b8'
  const profitColor = stats.totalProfit > 0 ? '#22c55e' : stats.totalProfit < 0 ? '#ef4444' : '#94a3b8'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a1a',
          padding: '60px 80px',
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

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: '48px',
                fontWeight: 800,
                color: '#ffffff',
              }}
            >
              {stats.displayName}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '20px',
                color: '#94a3b8',
                marginTop: '4px',
              }}
            >
              Member since {stats.memberSince}
            </div>
          </div>

          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '48px',
                height: '48px',
                backgroundColor: '#6366f1',
                borderRadius: '12px',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 900,
                color: '#ffffff',
              }}
            >
              B
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '32px',
                fontWeight: 700,
                color: '#818cf8',
              }}
            >
              BetBrain
            </div>
          </div>
        </div>

        {/* Record (large) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '96px',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-2px',
            }}
          >
            {record}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '24px',
              color: '#94a3b8',
              marginLeft: '16px',
            }}
          >
            {stats.total} picks
          </div>
        </div>

        {/* Key Metrics Row */}
        <div
          style={{
            display: 'flex',
            gap: '32px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: '16px', color: '#94a3b8' }}>Win Rate</div>
            <div style={{ display: 'flex', fontSize: '36px', fontWeight: 700, color: '#ffffff' }}>
              {stats.winRate !== null ? `${stats.winRate}%` : '--'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: '16px', color: '#94a3b8' }}>ROI</div>
            <div style={{ display: 'flex', fontSize: '36px', fontWeight: 700, color: roiColor }}>
              {stats.roi > 0 ? '+' : ''}{stats.roi}%
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: '16px', color: '#94a3b8' }}>Profit</div>
            <div style={{ display: 'flex', fontSize: '36px', fontWeight: 700, color: profitColor }}>
              {stats.totalProfit > 0 ? '+' : ''}{stats.totalProfit}u
            </div>
          </div>
          {stats.clv && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: '16px', color: '#60a5fa' }}>Avg CLV</div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '36px',
                  fontWeight: 700,
                  color: stats.clv.averageCLV > 0 ? '#22c55e' : '#ef4444',
                }}
              >
                {stats.clv.averageCLV > 0 ? '+' : ''}{stats.clv.averageCLV}%
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {stats.favoriteSport && (
            <div
              style={{
                display: 'flex',
                padding: '8px 20px',
                backgroundColor: '#1e1e3a',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#a5b4fc',
                border: '1px solid #2d2d5e',
              }}
            >
              {stats.favoriteSport.toUpperCase()}
            </div>
          )}
          <div style={{ display: 'flex', fontSize: '16px', color: '#475569' }}>
            betbrain.ai
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
