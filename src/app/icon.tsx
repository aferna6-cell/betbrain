import { ImageResponse } from 'next/og'

export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: '32px',
        }}
      >
        <span
          style={{
            fontSize: '96px',
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
