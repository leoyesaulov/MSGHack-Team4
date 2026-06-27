import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Proposal, ProposalStatus } from '../lib/types'
import StatusBadge from '../components/StatusBadge'
import ProgressBar from '../components/ProgressBar'
import { STATUS_LABEL } from '../lib/statusLabels'

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'Alle', value: '' },
  { label: STATUS_LABEL.open, value: 'open' },
  { label: STATUS_LABEL.submitted, value: 'submitted' },
  { label: STATUS_LABEL.accepted, value: 'accepted' },
]

export default function HomePage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    api.proposals.list(statusFilter ? { status: statusFilter } : undefined)
      .then(setProposals)
      .finally(() => setLoading(false))
  }, [statusFilter])

  const stats = {
    total: proposals.length,
    open: proposals.filter((p) => p.status === 'open').length,
    submitted: proposals.filter((p) => ['submitted', 'accepted'].includes(p.status)).length,
  }

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <h1>Deine Idee. Deine Stadt.</h1>
        <p>Reiche Vorschläge für dein Viertel ein, sammle Unterstützung und bring Veränderungen in Gang ohne bürokratische Hürden.</p>
        <button className="btn" style={{ background: 'white', color: 'var(--brand)', fontWeight: 700, fontSize: '1rem', padding: '.75rem 2rem' }} onClick={() => navigate('/submit')}>
          Jetzt Idee einreichen →
        </button>
      </div>

      <div className="page">
        {/* Stats */}
        <div className="stats">
          <div className="stat"><div className="stat-value">{stats.total}</div><div className="stat-label">Vorschläge gesamt</div></div>
          <div className="stat"><div className="stat-value">{stats.open}</div><div className="stat-label">Offen & aktiv</div></div>
          <div className="stat"><div className="stat-value">{stats.submitted}</div><div className="stat-label">Eingereicht / Angenommen</div></div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`btn btn-sm ${statusFilter === f.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="empty"><div className="empty-icon">⏳</div><p>Wird geladen…</p></div>
        ) : proposals.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📭</div>
            <p>Keine Vorschläge gefunden.</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/submit')}>Erste Idee einreichen</button>
          </div>
        ) : (
          <div className="proposal-grid">
            {proposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} onClick={() => navigate(`/proposals/${p.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProposalCard({ proposal: p, onClick }: { proposal: Proposal; onClick: () => void }) {
  return (
    <div className="proposal-card" onClick={onClick}>
      <div className="proposal-card-meta">
        <StatusBadge status={p.status as ProposalStatus} />
        <span>🗂 {p.category}</span>
      </div>
      <div className="proposal-card-title">{p.title}</div>
      <div style={{ fontSize: '.85rem', color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {p.description_refined ?? p.description_raw}
      </div>
      <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>📍 {p.location_name}</div>
      <ProgressBar value={p.vote_count} max={p.threshold} />
      <div className="proposal-card-meta">
        <span>👤 {p.author_display_name}</span>
        <span>📅 {new Date(p.created_at).toLocaleDateString('de-DE')}</span>
      </div>
    </div>
  )
}
