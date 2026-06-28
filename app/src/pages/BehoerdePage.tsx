import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../lib/authStore'
import { api } from '../lib/api'
import type { Proposal } from '../lib/types'
import StatusBadge from '../components/StatusBadge'
import ToastContainer, { toast } from '../components/Toast'

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  submitted: [
    { label: 'Annehmen', next: 'accepted' },
    { label: 'Ablehnen', next: 'rejected' },
  ],
  accepted: [],
  rejected: [],
}

const DEPT_OPTIONS = [
  'Tiefbauamt',
  'Ordnungsamt',
  'Grünflächenamt',
  'Stadtplanungsamt',
  'Schulamt',
  'Umweltamt',
  'Sonstige',
]



function downloadPdf(p: Proposal) {
  window.open(`/api/proposals/${p.id}/pdf`, '_blank')
}

export default function BehoerdePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selected, setSelected] = useState<Proposal | null>(null)
  const [formalText, setFormalText] = useState('')
  const [department, setDepartment] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (!user.is_behoerde) { navigate('/'); return }
    load()
  }, [user])

  async function load() {
    try {
      const data = await api.proposals.behoerdeInbox()
      setProposals(data)
    } catch {
      toast('Fehler beim Laden der Anträge.', 'error')
    }
  }

  function openDetail(p: Proposal) {
    setSelected(p)
    setFormalText(p.formal_text ?? '')
    setDepartment(p.department ?? '')
  }

  async function handleStatusChange(proposal: Proposal, nextStatus: string) {
    setSaving(true)
    try {
      const updated = await api.proposals.patch(proposal.id, { status: nextStatus })
      await load()
      if (selected?.id === proposal.id) setSelected(updated)
    } catch {
      toast('Fehler beim Aktualisieren.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDetails() {
    if (!selected) return
    setSaving(true)
    try {
      const updated = await api.proposals.patch(selected.id, {
        ...(formalText ? { formal_text: formalText } : {}),
        ...(department ? { department } : {}),
      })
      setSelected(updated)
      setProposals((prev) => prev.map((p) => p.id === updated.id ? updated : p))
      toast('Gespeichert.')
    } catch {
      toast('Fehler beim Speichern.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const filtered = proposals.filter((p) => p.status === 'submitted')

  return (
    <>
      <ToastContainer />
      <div className="page">
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.5rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900 }}>Anträge</h1>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* List */}
          <div>
            {filtered.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '.75rem' }}>📭</div>
                <p style={{ color: 'var(--muted)' }}>Keine Anträge in dieser Kategorie.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    className="card"
                    onClick={() => openDetail(p)}
                    style={{
                      cursor: 'pointer',
                      borderColor: selected?.id === p.id ? 'var(--brand)' : 'var(--border)',
                      borderWidth: selected?.id === p.id ? 2 : 1,
                      borderLeft: `4px solid ${p.status === 'accepted' ? 'var(--success)' : p.status === 'rejected' ? 'var(--danger)' : 'var(--brand)'}`,
                      transition: 'border-color .15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.35rem' }}>
                          <StatusBadge status={p.status} />
                          {p.department && (
                            <span style={{ fontSize: '.72rem', color: 'var(--muted)', fontWeight: 500 }}>
                              {p.department}
                            </span>
                          )}
                          <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>CV-{String(p.id).padStart(5, '0')}</span>
                        </div>
                        <h3 style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: '.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title}
                        </h3>
                        <p style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
                          📍 {p.location_name} · 👤 {p.author_display_name} · {new Date(p.created_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--brand)' }}>{p.vote_count}</div>
                        <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>Stimmen</div>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div
                      style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem', paddingTop: '.75rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button className="btn btn-ghost btn-sm" onClick={() => downloadPdf(p)}>⬇ PDF</button>
                      {STATUS_TRANSITIONS[p.status]?.map((t) => (
                        <button
                          key={t.next}
                          className="btn btn-sm"
                          style={t.next === 'rejected'
                            ? { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', fontWeight: 700 }
                            : { background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontWeight: 700 }}
                          disabled={saving}
                          onClick={() => handleStatusChange(p, t.next)}
                        >
                          {t.next === 'accepted' ? '✓ ' : '✕ '}{t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ position: 'sticky', top: 80 }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <StatusBadge status={selected.status} />
                    <h2 style={{ fontWeight: 800, fontSize: '1.05rem', marginTop: '.4rem' }}>{selected.title}</h2>
                  </div>
                  <div style={{ display: 'flex', gap: '.4rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => downloadPdf(selected)} title="PDF herunterladen">⬇ PDF</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
                  </div>
                </div>

                <table style={{ width: '100%', fontSize: '.82rem', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                  <tbody>
                    {[
                      ['Antrag-Nr.', `CV-${String(selected.id).padStart(5, '0')}`],
                      ['Bürger', `${selected.author_display_name} (@${selected.author_username})`],
                      ['Ort', selected.location_name],
                      ['Stimmen', selected.vote_count],
                      ['Eingereicht', new Date(selected.created_at).toLocaleDateString('de-DE')],
                    ].map(([label, value]) => (
                      <tr key={String(label)} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '.4rem .25rem', color: 'var(--muted)', fontWeight: 500, paddingRight: '1rem', whiteSpace: 'nowrap' }}>{label}</td>
                        <td style={{ padding: '.4rem .25rem' }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '1rem', marginBottom: '1rem', fontStyle: 'italic', fontSize: '.88rem', color: 'var(--muted)', lineHeight: 1.65, borderLeft: '3px solid var(--brand)' }}>
                  „{selected.description_raw}"
                </div>

                <div className="form-group">
                  <label>Zuständiges Amt</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                    <option value="">— bitte wählen —</option>
                    {DEPT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Formaler Behördenantrag <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(KI-Generierung folgt)</span></label>
                  <textarea
                    value={formalText}
                    onChange={(e) => setFormalText(e.target.value)}
                    rows={6}
                    placeholder="Amtlichen Antragstext hier verfassen…"
                  />
                </div>

                <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                  <button className="btn btn-primary btn-sm" disabled={saving} onClick={handleSaveDetails}>
                    {saving ? 'Speichern…' : 'Speichern'}
                  </button>
                </div>

                {STATUS_TRANSITIONS[selected.status]?.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '.5rem', fontWeight: 600 }}>ENTSCHEIDUNG</p>
                    <div style={{ display: 'flex', gap: '.5rem' }}>
                      {STATUS_TRANSITIONS[selected.status].map((t) => (
                        <button
                          key={t.next}
                          className="btn btn-sm"
                          style={t.next === 'rejected'
                            ? { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', fontWeight: 700 }
                            : { background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontWeight: 700 }}
                          disabled={saving}
                          onClick={() => handleStatusChange(selected, t.next)}
                        >
                          {t.next === 'accepted' ? '✓ ' : '✕ '}{t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
