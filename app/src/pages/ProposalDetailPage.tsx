import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Comment, Proposal } from '../lib/types'
import StatusBadge from '../components/StatusBadge'
import ProgressBar from '../components/ProgressBar'
import Pipeline from '../components/Pipeline'
import VoteModal from '../components/VoteModal'
import ToastContainer, { toast } from '../components/Toast'
import { useAuthStore } from '../lib/authStore'
import ProposalImage from '../components/ProposalImage'

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [tab, setTab] = useState<'info' | 'comments' | 'formal'>('info')
  const [showVote, setShowVote] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  async function load() {
    if (!id) return
    const [p, c] = await Promise.all([api.proposals.get(Number(id)), api.comments.list(Number(id))])
    setProposal(p)
    setComments(c)
  }

  useEffect(() => { load() }, [id])

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !user) return
    setSubmittingComment(true)
    try {
      await api.comments.add(Number(id), commentText)
      toast('Kommentar hinzugefügt!')
      setCommentText('')
      load()
    } catch {
      toast('Fehler beim Kommentieren.', 'error')
    } finally {
      setSubmittingComment(false)
    }
  }

  if (!proposal) return <div className="page"><p style={{ color: 'var(--muted)' }}>Wird geladen…</p></div>

  const pct = Math.min(100, Math.round((proposal.vote_count / proposal.threshold) * 100))

  return (
    <>
      <ToastContainer />
      {showVote && (
        <VoteModal
          proposalId={proposal.id}
          onClose={() => setShowVote(false)}
          onVoted={load}
        />
      )}

      <div className="page">
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem' }} onClick={() => navigate(-1)}>
          ← Zurück
        </button>

        {/* Pipeline */}
        <Pipeline status={proposal.status} />

        {/* Header */}
        <div className="detail-header">
          <StatusBadge status={proposal.status} />
          <h1>{proposal.title}</h1>
          <div className="detail-meta">
            <span>📍 {proposal.location_name}</span>
            <span>👤 {proposal.author_display_name} (@{proposal.author_username})</span>
            <span>📅 {new Date(proposal.created_at).toLocaleDateString('de-DE')}</span>
          </div>
        </div>

        <div className="detail-grid">
          {/* LEFT: main content */}
          <div>
            {/* IMAGE */}
            <div style={{ marginBottom: '1.5rem' }}>
              <ProposalImage
                imageUrl={proposal.image_url}
                latitude={proposal.latitude}
                longitude={proposal.longitude}
                title={proposal.title}
              />
            </div>

            {/* TABS */}
            <div className="tabs">
              <div className={`tab ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>Beschreibung</div>
              <div className={`tab ${tab === 'comments' ? 'active' : ''}`} onClick={() => setTab('comments')}>
                Kommentare ({comments.length})
              </div>
              {proposal.formal_text && (
                <div className={`tab ${tab === 'formal' ? 'active' : ''}`} onClick={() => setTab('formal')}>Formaler Antrag</div>
              )}
            </div>

            {tab === 'info' && (
              <div className="card">
                <div className="detail-section">
                  <h2>Zusammenfassung</h2>
                  <p style={{ lineHeight: 1.7 }}>{proposal.description_refined || proposal.description_raw}</p>
                </div>
              </div>
            )}

            {tab === 'comments' && (
              <div>
                <div className="card" style={{ marginBottom: '1rem' }}>
                  {comments.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon">💬</div>
                      <p>Noch keine Kommentare. Sei der Erste!</p>
                    </div>
                  ) : (
                    <div>
                      {comments.map((c) => (
                        <div key={c.id} className="comment" style={{ marginBottom: '1rem' }}>
                          <div className="comment-avatar">{c.author_display_name.charAt(0).toUpperCase()}</div>
                          <div className="comment-body">
                            <div className="comment-author">{c.author_display_name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>@{c.author_username}</span></div>
                            <div className="comment-time">{new Date(c.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="comment-text">{c.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Kommentar hinzufügen</h3>
                  {user ? (
                    <form onSubmit={handleComment}>
                      <div style={{ fontSize: '.83rem', color: 'var(--muted)', marginBottom: '.75rem' }}>
                        Als <strong>{user.display_name}</strong> (@{user.username}) kommentieren
                      </div>
                      <div className="form-group">
                        <textarea required value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Dein Beitrag zur Diskussion…" rows={3} />
                      </div>
                      <button type="submit" className="btn btn-outline" disabled={submittingComment}>
                        {submittingComment ? 'Wird gespeichert…' : 'Kommentar absenden'}
                      </button>
                    </form>
                  ) : (
                    <div style={{ color: 'var(--muted)', fontSize: '.9rem' }}>
                      <a href="/login" style={{ color: 'var(--brand)', fontWeight: 600 }}>Anmelden</a>, um einen Kommentar zu schreiben.
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'formal' && proposal.formal_text && (
              <div className="card">
                <div className="detail-section">
                  <h2>Formaler Behördenantrag</h2>
                  <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', lineHeight: 1.8, fontSize: '.95rem', background: 'var(--bg)', padding: '1.5rem', borderRadius: 8 }}>
                    {proposal.formal_text}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: vote + info */}
          <div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div className="vote-count-display">{proposal.vote_count}</div>
                <div className="vote-label">von {proposal.threshold} benötigten Unterstützern</div>
              </div>
              <ProgressBar value={proposal.vote_count} max={proposal.threshold} />
              {pct >= 100 ? (
                <div style={{ marginTop: '1rem', padding: '.75rem', background: '#dcfce7', borderRadius: 8, fontSize: '.85rem', color: '#166534', textAlign: 'center', fontWeight: 600 }}>
                  ✅ Antrag wurde eingereicht und wird von der Behörde bearbeitet.
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '1rem', padding: '.75rem', fontSize: '1rem' }}
                  onClick={() => setShowVote(true)}
                >
                  👍 Jetzt unterstützen
                </button>
              )}
            </div>

            <div className="card">
              <div className="detail-section">
                <h2>Details</h2>
                <table style={{ width: '100%', fontSize: '.85rem', borderCollapse: 'collapse' }}>
                  <tbody>
                    {[
                      ['Status', <StatusBadge key="s" status={proposal.status} />],
                      ['Eingereicht am', new Date(proposal.created_at).toLocaleDateString('de-DE')],
                      ['Kommentare', comments.length],
                    ].map(([label, value]) => (
                      <tr key={String(label)} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '.5rem .25rem', color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap', paddingRight: '1rem' }}>{label}</td>
                        <td style={{ padding: '.5rem .25rem' }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {proposal.pdf_url && (
                  <a
                    href={proposal.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '1rem', justifyContent: 'center' }}
                  >
                    📄 Bürgerantrag als PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
