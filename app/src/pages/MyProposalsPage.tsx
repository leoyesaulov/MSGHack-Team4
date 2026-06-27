import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import type { Proposal } from '../lib/types'
import StatusBadge from '../components/StatusBadge'
import ProgressBar from '../components/ProgressBar'
import Pipeline from '../components/Pipeline'
import { STATUS_LABEL } from '../lib/statusLabels'
import type { ProposalStatus } from '../lib/types'

const STATUS_STEPS: ProposalStatus[] = ['open', 'submitted', 'accepted', 'rejected']

export default function MyProposalsPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Proposal | null>(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    api.proposals.list()
      .then((all) => setProposals(all.filter((p) => p.author_id === user.id)))
      .finally(() => setLoading(false))
  }, [user, navigate])

  if (!user) return null

  return (
    <div className="page">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '.25rem' }}>Meine Anträge</h1>
        <p style={{ color: 'var(--muted)' }}>Angemeldet als <strong>{user.display_name}</strong> (@{user.username})</p>
      </div>

      {loading ? (
        <div className="empty"><div className="empty-icon">⏳</div><p>Wird geladen…</p></div>
      ) : proposals.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          <p>Du hast noch keine Vorschläge eingereicht.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/submit')}>Erste Idee einreichen</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* List */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {proposals.map((p) => (
              <div
                key={p.id}
                className="card"
                style={{ cursor: 'pointer', borderColor: selected?.id === p.id ? 'var(--brand)' : 'var(--border)', borderWidth: 2 }}
                onClick={() => setSelected(p)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div>
                    <StatusBadge status={p.status} />
                    <div style={{ fontWeight: 700, marginTop: '.35rem' }}>{p.title}</div>
                    <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: '.2rem' }}>📍 {p.location_name}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--brand)' }}>{p.vote_count}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>/{p.threshold}</div>
                  </div>
                </div>
                <div style={{ marginTop: '.75rem' }}>
                  <ProgressBar value={p.vote_count} max={p.threshold} />
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ flex: '1 1 380px' }}>
              <div className="card">
                <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '.5rem' }}>{selected.title}</h2>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  <StatusBadge status={selected.status} />
                  <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>🗂 {selected.category}</span>
                  {selected.department && <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>🏛 {selected.department}</span>}
                </div>

                <Pipeline status={selected.status} />

                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '.75rem' }}>Bearbeitungsstatus</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {STATUS_STEPS.map((s) => {
                      const currentIdx = STATUS_STEPS.indexOf(selected.status as ProposalStatus)
                      const stepIdx = STATUS_STEPS.indexOf(s)
                      const done = stepIdx < currentIdx
                      const active = s === selected.status
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', opacity: done || active ? 1 : .4 }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: done ? 'var(--success)' : active ? 'var(--brand)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '.7rem', color: 'white', fontWeight: 700 }}>
                            {done ? '✓' : active ? '●' : '○'}
                          </div>
                          <span style={{ fontSize: '.85rem', fontWeight: active ? 700 : 400 }}>{STATUS_LABEL[s]}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => navigate(`/proposals/${selected.id}`)}>
                  Vollständige Detailseite →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
