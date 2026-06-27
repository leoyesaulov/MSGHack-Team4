interface Props {
  imageUrl: string | null
  latitude: number
  longitude: number
  title: string
}

export default function ProposalImage({ imageUrl, latitude, longitude, title }: Props) {
  const fallbackUrl =
    `https://www.google.com/maps?q=${latitude},${longitude}&layer=c&cbll=${latitude},${longitude}&cbp=11,0,0,0,0&output=svembed`

  if (imageUrl) {
    return (
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <img
          src={imageUrl}
          alt={title}
          style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }}
        />
        <div style={{ padding: '.4rem .75rem', background: 'var(--bg)', fontSize: '.75rem', color: 'var(--muted)' }}>
          📸 Foto vom Einreicher
        </div>
      </div>
    )
  }

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <iframe
        title="Street View"
        src={fallbackUrl}
        width="100%"
        height="300"
        style={{ display: 'block', border: 'none' }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div style={{ padding: '.4rem .75rem', background: 'var(--bg)', fontSize: '.75rem', color: 'var(--muted)' }}>
        🗺 Google Street View – {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </div>
    </div>
  )
}
