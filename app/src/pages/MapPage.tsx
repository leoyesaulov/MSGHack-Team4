import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { api } from '../lib/api'
import type { Proposal } from '../lib/types'
import StatusBadge from '../components/StatusBadge'
import ProgressBar from '../components/ProgressBar'
import { STATUS_COLOR } from '../lib/statusLabels'
import { useAuthStore } from '../lib/authStore'

// Fix default icon paths broken by bundler
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function makeIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  })
}

function FlyToUser({ coords }: { coords: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (coords) map.flyTo(coords, 14, { duration: 1.5 })
  }, [coords, map])
  return null
}

export default function MapPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    api.proposals.list().then(setProposals)
  }, [])

  useEffect(() => {
    if (user?.gemeinde) {
      // Geocode the user's Gemeinde via Nominatim
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(user.gemeinde + ', Germany')}&format=json&limit=1`)
        .then((r) => r.json())
        .then((results) => {
          if (results[0]) {
            setUserCoords([parseFloat(results[0].lat), parseFloat(results[0].lon)])
          }
        })
        .catch(() => { /* stay on default */ })
    } else if (!user && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords([pos.coords.latitude, pos.coords.longitude]),
        () => { /* permission denied or unavailable — stay on default center */ },
        { timeout: 6000 }
      )
    }
  }, [user])

  const selectedProposal = proposals.find((p) => p.id === selected)

  return (
    <div className="map-layout">
      {/* Sidebar */}
      <div className="map-sidebar">
        <div className="map-sidebar-header">
          <h2>Vorschläge ({proposals.length})</h2>
          <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '.2rem' }}>Klicke auf einen Vorschlag, um Details zu sehen.</p>
        </div>
        <div className="map-sidebar-list">
          {proposals.map((p) => (
            <div
              key={p.id}
              className={`map-sidebar-card ${selected === p.id ? 'selected' : ''}`}
              onClick={() => setSelected(p.id)}
            >
              <div className="map-sidebar-card-title">{p.title}</div>
              <div className="map-sidebar-card-meta">
                <StatusBadge status={p.status} />
                <span>👍 {p.vote_count}</span>
              </div>
              <div style={{ marginTop: '.4rem', fontSize: '.78rem', color: 'var(--muted)' }}>📍 {p.location_name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="map-main">
        <MapContainer
          center={[48.2242, 11.6715]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyToUser coords={userCoords} />
          {proposals.map((p) => (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={makeIcon(STATUS_COLOR[p.status])}
              eventHandlers={{ click: () => setSelected(p.id) }}
            >
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <strong style={{ fontSize: '.95rem' }}>{p.title}</strong>
                  <div style={{ marginTop: '.5rem' }}>
                    <StatusBadge status={p.status} />
                  </div>
                  <div style={{ marginTop: '.5rem', fontSize: '.82rem', color: '#555' }}>
                    {p.description_refined ?? p.description_raw}
                  </div>
                  <div style={{ marginTop: '.75rem' }}>
                    <ProgressBar value={p.vote_count} max={p.threshold} />
                  </div>
                  <button
                    onClick={() => navigate(`/proposals/${p.id}`)}
                    style={{ marginTop: '.75rem', padding: '.4rem .9rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '.82rem', fontWeight: 600 }}
                  >
                    Details ansehen →
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Detail panel (bottom bar on mobile, hidden on desktop — already accessible via sidebar click & nav) */}
      {selectedProposal && (
        <div
          style={{
            position: 'fixed', bottom: 0, left: 360, right: 0,
            background: 'white', borderTop: '1px solid var(--border)',
            padding: '1rem 1.5rem', zIndex: 500,
            display: 'flex', alignItems: 'center', gap: '1.5rem',
            boxShadow: '0 -4px 16px rgba(0,0,0,.08)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedProposal.title}</div>
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.25rem', alignItems: 'center' }}>
              <StatusBadge status={selectedProposal.status} />
              <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>👍 {selectedProposal.vote_count} / {selectedProposal.threshold}</span>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/proposals/${selectedProposal.id}`)}>
            Details →
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
        </div>
      )}
    </div>
  )
}
