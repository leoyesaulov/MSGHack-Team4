import { useState } from 'react'

interface Props {
  imageUrl: string | null
  latitude: number
  longitude: number
  title: string
}

export default function ProposalImage({ imageUrl, latitude, longitude, title }: Props) {
  const [view, setView] = useState<'image' | 'streetview'>(imageUrl ? 'image' : 'streetview')

  const streetViewUrl =
    `https://www.google.com/maps?q=${latitude},${longitude}&layer=c&cbll=${latitude},${longitude}&cbp=11,0,0,0,0&output=svembed`

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* Toggle tabs — only shown when there's an uploaded image */}
      {imageUrl && (
        <div style={{ display: 'flex', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setView('image')}
            style={{
              flex: 1, padding: '.5rem', fontSize: '.82rem', fontWeight: 600, border: 'none', cursor: 'pointer',
              background: view === 'image' ? 'white' : 'transparent',
              color: view === 'image' ? 'var(--brand)' : 'var(--muted)',
              borderBottom: view === 'image' ? '2px solid var(--brand)' : '2px solid transparent',
            }}
          >
            📸 Foto
          </button>
          <button
            onClick={() => setView('streetview')}
            style={{
              flex: 1, padding: '.5rem', fontSize: '.82rem', fontWeight: 600, border: 'none', cursor: 'pointer',
              background: view === 'streetview' ? 'white' : 'transparent',
              color: view === 'streetview' ? 'var(--brand)' : 'var(--muted)',
              borderBottom: view === 'streetview' ? '2px solid var(--brand)' : '2px solid transparent',
            }}
          >
            🗺 Street View
          </button>
        </div>
      )}

      {/* Content */}
      {view === 'image' && imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <iframe
          title="Street View"
          src={streetViewUrl}
          width="100%"
          height="300"
          style={{ display: 'block', border: 'none' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}

      {/* Caption */}
      <div style={{ padding: '.4rem .75rem', background: 'var(--bg)', fontSize: '.75rem', color: 'var(--muted)' }}>
        {view === 'image'
          ? '📸 Foto vom Einreicher'
          : `🗺 Google Street View – ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
      </div>
    </div>
  )
}
