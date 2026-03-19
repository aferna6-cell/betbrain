import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
        }}
      >
        <span
          style={{
            fontSize: '88px',
            fontWeight: 900,
            color: '#3b82f6',
            letterSpacing: '-4px',
          }}
        >
          BB
        </span>
      </div>
    ),
    { ...size }
  )
}
