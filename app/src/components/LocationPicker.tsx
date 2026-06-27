import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

const PIN_ICON = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="48">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z" fill="#2563eb" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`,
  className: '',
  iconSize: [32, 48],
  iconAnchor: [16, 48],
})

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { duration: 1.2 })
  }, [lat, lng, map])
  return null
}

interface Props {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
  flyTo?: [number, number] | null
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function LocationPicker({ lat, lng, onChange, flyTo }: Props) {
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--border)', cursor: 'crosshair' }}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        style={{ height: 300, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {flyTo && <FlyTo lat={flyTo[0]} lng={flyTo[1]} />}
        <ClickHandler onChange={onChange} />
        <Marker position={[lat, lng]} icon={PIN_ICON} />
      </MapContainer>
      <div style={{ padding: '.5rem .75rem', background: 'var(--brand-light)', fontSize: '.78rem', color: 'var(--brand)', fontWeight: 500 }}>
        📍 Klicke auf die Karte, um den genauen Ort zu markieren — {lat.toFixed(5)}, {lng.toFixed(5)}
      </div>
    </div>
  )
}
