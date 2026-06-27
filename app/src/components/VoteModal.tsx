import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { toast } from './Toast'

interface Props {
  proposalId: number
  onClose: () => void
  onVoted: () => void
}

export default function VoteModal({ proposalId, onClose, onVoted }: Props) {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  if (!user) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <span className="modal-title">Anmeldung erforderlich</span>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
            Du musst eingeloggt sein, um einen Vorschlag zu unterstützen.
          </p>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
            <button className="btn btn-primary" onClick={() => { onClose(); navigate('/login') }}>Jetzt anmelden</button>
          </div>
        </div>
      </div>
    )
  }

  async function handleVote() {
    setLoading(true)
    try {
      await api.votes.add(proposalId)
      toast('Danke für deine Unterstützung! 🎉')
      onVoted()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler'
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Vorschlag unterstützen</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p style={{ marginBottom: '1rem', color: 'var(--muted)', fontSize: '.9rem' }}>
          Du unterstützt diesen Vorschlag als <strong>{user.display_name}</strong> (@{user.username}).
          Deine Stimme hilft dabei, den Schwellenwert zu erreichen.
        </p>
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={handleVote} disabled={loading}>
            {loading ? 'Wird gespeichert…' : '👍 Jetzt unterstützen'}
          </button>
        </div>
      </div>
    </div>
  )
}
