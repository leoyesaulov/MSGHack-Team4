import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import ToastContainer, { toast } from '../components/Toast'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await api.auth.login(username, password)
      setAuth(data.access_token, data.user)
      navigate('/')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Login fehlgeschlagen', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ToastContainer />
      <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--bg)' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--brand)' }}>CityVoice</h1>
            <p style={{ color: 'var(--muted)', marginTop: '.25rem' }}>Meld dich an, um Ideen einzureichen und abzustimmen.</p>
          </div>

          <div className="card">
            <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Anmelden</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Benutzername</label>
                <input
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="dein_benutzername"
                  autoComplete="username"
                />
              </div>
              <div className="form-group">
                <label>Passwort</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '.75rem', fontSize: '1rem', marginTop: '.5rem' }}
                disabled={loading}
              >
                {loading ? 'Wird angemeldet…' : 'Anmelden'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '.88rem', color: 'var(--muted)' }}>
              Noch kein Konto?{' '}
              <Link to="/register" style={{ color: 'var(--brand)', fontWeight: 600 }}>Jetzt registrieren</Link>
            </div>
          </div>

          <div className="card" style={{ marginTop: '1rem', background: 'var(--brand-light)', border: '1px solid #bfdbfe' }}>
            <p style={{ fontSize: '.82rem', color: 'var(--brand)', fontWeight: 600, marginBottom: '.35rem' }}>Demo-Zugangsdaten</p>
            <p style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
              Benutzername: <code style={{ background: 'white', padding: '.1rem .3rem', borderRadius: 4 }}>stefan_m</code>
              &nbsp;&nbsp;Passwort: <code style={{ background: 'white', padding: '.1rem .3rem', borderRadius: 4 }}>demo1234</code>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
