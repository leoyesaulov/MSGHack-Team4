import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import ToastContainer, { toast } from '../components/Toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', display_name: '', email: '', password: '', password2: '', district: '' })
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
        district: form.district || undefined,
      })
      // auto-login after register
      const data = await api.auth.login(form.username, form.password)
      setAuth(data.access_token, data.user)
      toast('Willkommen bei CityVoice! 🎉')
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
                    onChange={(e) => set('username', e.target.value)}
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
                    onChange={(e) => set('display_name', e.target.value)}
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
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="max@beispiel.de"
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label>Stadtviertel</label>
                <input
                  value={form.district}
                  onChange={(e) => set('district', e.target.value)}
                  placeholder="z. B. Schwabing"
                />
                <span className="form-hint">Hilft dabei, lokale Vorschläge in deiner Nähe zu finden.</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <div className="form-group">
                  <label>Passwort *</label>
                  <input
                    required
                    type="password"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
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
                    onChange={(e) => set('password2', e.target.value)}
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
