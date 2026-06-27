import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from './lib/authStore'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import SubmitPage from './pages/SubmitPage'
import ProposalDetailPage from './pages/ProposalDetailPage'
import MyProposalsPage from './pages/MyProposalsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AboutPage from './pages/AboutPage'
import BehoerdePage from './pages/BehoerdePage'
import ProfilePage from './pages/ProfilePage'

function Nav() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  function logout() {
    clearAuth()
    navigate('/login')
  }

  return (
    <nav className="nav">
      {/* Left: logo */}
      <div className="nav-left">
        <NavLink to={user ? '/' : '/login'} style={{ textDecoration: 'none', borderBottom: 'none' }} className={() => ''}>
          <span className="nav-logo">City<span>Voice</span></span>
        </NavLink>
      </div>

      {/* Center: main links */}
      <div className="nav-center">
        {user && <NavLink to="/" end>Übersicht</NavLink>}
        <NavLink to="/map">Karte</NavLink>
        {user && !user.is_behoerde && <NavLink to="/submit">Idee einreichen</NavLink>}
        {user?.is_behoerde && <NavLink to="/behoerde">Anträge</NavLink>}
        {user && !user.is_behoerde && <NavLink to="/meine-antraege">Meine Anträge</NavLink>}
      </div>

      {/* Right: about + user */}
      <div className="nav-right">
        <NavLink to="/about">Über CityVoice</NavLink>
        {user ? (
          <>
            <NavLink
              to="/profil"
              style={{ fontSize: '.85rem', color: 'var(--muted)', fontWeight: 500, textDecoration: 'none' }}
            >
              👤 {user.display_name}
            </NavLink>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Abmelden</button>
          </>
        ) : (
          <>
            <NavLink to="/login" style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--muted)' }}>Anmelden</NavLink>
            <NavLink to="/register">
              <button className="btn btn-primary btn-sm">Registrieren</button>
            </NavLink>
          </>
        )}
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/proposals/:id" element={<ProposalDetailPage />} />
        <Route path="/meine-antraege" element={<MyProposalsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/behoerde" element={<BehoerdePage />} />
        <Route path="/profil" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  )
}
