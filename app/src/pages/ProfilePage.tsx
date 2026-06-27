import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import ToastContainer, { toast } from '../components/Toast'
import gemeindenRaw from '../data/gemeinden.json'

const GEMEINDEN: string[] = gemeindenRaw as string[]

export default function ProfilePage() {
  const { user, setAuth } = useAuthStore()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [gemeindeInput, setGemeindeInput] = useState(user?.gemeinde ?? '')
  const [selectedGemeinde, setSelectedGemeinde] = useState(user?.gemeinde ?? '')
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = gemeindeInput.length >= 1
    ? GEMEINDEN.filter((g) => g.toLowerCase().includes(gemeindeInput.toLowerCase())).slice(0, 80)
    : []

  useEffect(() => { setHighlighted(0) }, [gemeindeInput])

  useEffect(() => {
    const el = listRef.current?.children[highlighted] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  function selectGemeinde(g: string) {
    setSelectedGemeinde(g)
    setGemeindeInput(g)
    setShowDropdown(false)
  }

  function handleGemeindeKey(e: React.KeyboardEvent) {
    if (!showDropdown || filtered.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); selectGemeinde(filtered[highlighted]) }
    else if (e.key === 'Escape') { setShowDropdown(false) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (newPw && newPw !== newPw2) {
      toast('Neue Passwörter stimmen nicht überein.', 'error')
      return
    }
    if (newPw && newPw.length < 6) {
      toast('Neues Passwort muss mindestens 6 Zeichen haben.', 'error')
      return
    }
    setLoading(true)
    try {
      const payload: Record<string, string> = {}
      if (displayName !== user?.display_name) payload.display_name = displayName
      if (username !== user?.username) payload.username = username
      if (selectedGemeinde !== user?.gemeinde) payload.gemeinde = selectedGemeinde
      if (newPw) {
        payload.current_password = currentPw
        payload.new_password = newPw
      }
      if (Object.keys(payload).length === 0) {
        toast('Keine Änderungen.')

        return
      }

      const updated = await api.auth.updateMe(payload) as { id: number; username: string; display_name: string; email: string; district: string | null; gemeinde: string | null; is_behoerde: boolean; created_at: string }
      // re-login to get fresh token if username changed
      let token = useAuthStore.getState().token!
      if (username !== user?.username) {
        const loginData = await api.auth.login(username, newPw || currentPw)
        token = loginData.access_token
      }
      setAuth(token, {
        id: updated.id,
        username: updated.username,
        display_name: updated.display_name,
        email: updated.email,
        district: updated.district,
        gemeinde: updated.gemeinde,
        is_behoerde: updated.is_behoerde,
      })
      setCurrentPw(''); setNewPw(''); setNewPw2('')
      toast('Profil erfolgreich aktualisiert.')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Fehler beim Speichern', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <>
      <ToastContainer />
      <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--bg)' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--brand)' }}>Mein Profil</h1>
            <p style={{ color: 'var(--muted)', marginTop: '.25rem' }}>{user.email}</p>
          </div>

          <div className="card">
            <form onSubmit={handleSave}>
              {/* --- Account info --- */}
              <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>Kontoinformationen</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <div className="form-group">
                  <label>Benutzername</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    pattern="[a-zA-Z0-9_]+"
                    title="Nur Buchstaben, Zahlen und Unterstriche"
                  />
                </div>
                <div className="form-group">
                  <label>Anzeigename</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>

              {/* --- Gemeinde --- */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Gemeinde</label>
                <input
                  ref={inputRef}
                  value={gemeindeInput}
                  onChange={(e) => {
                    setGemeindeInput(e.target.value)
                    setSelectedGemeinde('')
                    setShowDropdown(true)
                  }}
                  onFocus={() => { if (gemeindeInput) setShowDropdown(true) }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  onKeyDown={handleGemeindeKey}
                  placeholder="Gemeinde suchen…"
                  autoComplete="off"
                />
                {showDropdown && filtered.length > 0 && (
                  <ul
                    ref={listRef}
                    style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
                      background: 'var(--card, #fff)', border: '1px solid var(--border, #ddd)',
                      borderTop: 'none', borderRadius: '0 0 8px 8px',
                      maxHeight: 220, overflowY: 'auto', margin: 0, padding: 0,
                      listStyle: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.12)',
                    }}
                  >
                    {filtered.map((g, i) => (
                      <li
                        key={g}
                        onMouseDown={() => selectGemeinde(g)}
                        style={{
                          padding: '.5rem .85rem', cursor: 'pointer',
                          background: i === highlighted ? 'var(--brand)' : 'transparent',
                          color: i === highlighted ? '#fff' : 'inherit',
                          fontSize: '.92rem',
                        }}
                        onMouseEnter={() => setHighlighted(i)}
                      >
                        {g}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* --- Password change --- */}
              <h3 style={{ fontWeight: 700, margin: '1.5rem 0 1rem', fontSize: '1rem' }}>Passwort ändern</h3>
              <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '.75rem' }}>
                Nur ausfüllen, wenn du das Passwort ändern möchtest.
              </p>

              <div className="form-group">
                <label>Aktuelles Passwort</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <div className="form-group">
                  <label>Neues Passwort</label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label>Bestätigen</label>
                  <input
                    type="password"
                    value={newPw2}
                    onChange={(e) => setNewPw2(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '.75rem', fontSize: '1rem', marginTop: '.5rem' }}
                disabled={loading}
              >
                {loading ? 'Wird gespeichert…' : 'Änderungen speichern'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
