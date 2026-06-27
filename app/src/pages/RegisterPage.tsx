import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import ToastContainer, { toast } from '../components/Toast'
import gemeindenRaw from '../data/gemeinden.json'

const GEMEINDEN: string[] = gemeindenRaw as string[]

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '', display_name: '', email: '', password: '', password2: '',
    gemeinde: '',
  })
  const [gemeindeInput, setGemeindeInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const filtered = gemeindeInput.length >= 1
    ? GEMEINDEN.filter((g) => g.toLowerCase().includes(gemeindeInput.toLowerCase())).slice(0, 80)
    : []

  useEffect(() => { setHighlighted(0) }, [gemeindeInput])

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function selectGemeinde(g: string) {
    setForm((f) => ({ ...f, gemeinde: g }))
    setGemeindeInput(g)
    setShowDropdown(false)
    inputRef.current?.blur()
  }

  function handleGemeindeKey(e: React.KeyboardEvent) {
    if (!showDropdown || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selectGemeinde(filtered[highlighted])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  // scroll highlighted item into view
  useEffect(() => {
    const el = listRef.current?.children[highlighted] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // auto-accept if the typed text exactly matches a known Gemeinde
    let gemeinde = form.gemeinde
    if (!gemeinde) {
      const match = GEMEINDEN.find((g) => g.toLowerCase() === gemeindeInput.toLowerCase())
      if (match) {
        gemeinde = match
        setForm((f) => ({ ...f, gemeinde: match }))
      }
    }
    if (!gemeinde) {
      toast('Bitte wähle eine Gemeinde aus der Liste aus.', 'error')
      return
    }
    if (form.password !== form.password2) {
      toast('Passwörter stimmen nicht überein.', 'error')
      return
    }
    setLoading(true)
    try {
      await api.auth.register({
        username: form.username,
        display_name: form.display_name,
        email: form.email,
        password: form.password,
        gemeinde,
      })
      const data = await api.auth.login(form.username, form.password)
      setAuth(data.access_token, data.user)
      toast('Willkommen bei CityVoice!')
      navigate('/')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ToastContainer />
      <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--bg)' }}>
        <div style={{ width: '100%', maxWidth: 460 }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--brand)' }}>CityVoice</h1>
            <p style={{ color: 'var(--muted)', marginTop: '.25rem' }}>Erstelle ein Konto und gestalte deine Stadt mit.</p>
          </div>

          <div className="card">
            <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Registrieren</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <div className="form-group">
                  <label>Benutzername *</label>
                  <input
                    required
                    autoFocus
                    value={form.username}
                    onChange={(e) => setField('username', e.target.value)}
                    placeholder="max_m"
                    pattern="[a-zA-Z0-9_]+"
                    title="Nur Buchstaben, Zahlen und Unterstriche"
                    autoComplete="username"
                  />
                  <span className="form-hint">Nur a-z, 0-9, _</span>
                </div>
                <div className="form-group">
                  <label>Anzeigename *</label>
                  <input
                    required
                    value={form.display_name}
                    onChange={(e) => setField('display_name', e.target.value)}
                    placeholder="Max Mustermann"
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>E-Mail-Adresse *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="max@beispiel.de"
                  autoComplete="email"
                />
              </div>

              {/* Searchable Gemeinde dropdown */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Gemeinde *</label>
                <input
                  ref={inputRef}
                  required
                  value={gemeindeInput}
                  onChange={(e) => {
                    setGemeindeInput(e.target.value)
                    setForm((f) => ({ ...f, gemeinde: '' }))
                    setShowDropdown(true)
                  }}
                  onFocus={() => { if (gemeindeInput) setShowDropdown(true) }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  onKeyDown={handleGemeindeKey}
                  placeholder="Gemeinde suchen…"
                  autoComplete="off"
                />
                <span className="form-hint">Tippe mindestens 1 Buchstaben zum Suchen.</span>
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
                          padding: '.5rem .85rem',
                          cursor: 'pointer',
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <div className="form-group">
                  <label>Passwort *</label>
                  <input
                    required
                    type="password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label>Passwort bestätigen *</label>
                  <input
                    required
                    type="password"
                    value={form.password2}
                    onChange={(e) => setField('password2', e.target.value)}
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
                {loading ? 'Wird registriert…' : 'Konto erstellen'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '.88rem', color: 'var(--muted)' }}>
              Bereits registriert?{' '}
              <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 600 }}>Jetzt anmelden</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
