import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { toast } from '../components/Toast'
import ToastContainer from '../components/Toast'
import { useAuthStore } from '../lib/authStore'
import LocationPicker from '../components/LocationPicker'

interface GenerateResult {
  title: string
  summary: string
  formal_text: string
  pdf_base64: string
}

export default function SubmitPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [descriptionRaw, setDescriptionRaw] = useState('')
  const [latitude, setLatitude] = useState(48.2242)
  const [longitude, setLongitude] = useState(11.6715)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [initialCenter, setInitialCenter] = useState<[number, number] | null>(null)

  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.gemeinde) {
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(user.gemeinde + ', Germany')}&format=json&limit=1`)
        .then((r) => r.json())
        .then((results) => {
          const coords: [number, number] = results[0]
            ? [parseFloat(results[0].lat), parseFloat(results[0].lon)]
            : [48.2242, 11.6715]
          setInitialCenter(coords)
          setLatitude(coords[0])
          setLongitude(coords[1])
        })
        .catch(() => setInitialCenter([48.2242, 11.6715]))
    } else {
      setInitialCenter([48.2242, 11.6715])
    }
  }, [user, navigate])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!descriptionRaw.trim()) { toast('Bitte gib deine Idee ein.', 'error'); return }
    setGenerating(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('text', descriptionRaw)
      fd.append('latitude', String(latitude))
      fd.append('longitude', String(longitude))
      if (imageFile) fd.append('image', imageFile)

      const token = (() => {
        try { return JSON.parse(localStorage.getItem('cityvoice-auth') || '{}')?.state?.token ?? null } catch { return null }
      })()

      const res = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Fehler bei der KI-Generierung.')
      }
      setResult(await res.json())
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Fehler bei der KI-Generierung.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  function downloadPdf() {
    if (!result) return
    const bytes = Uint8Array.from(atob(result.pdf_base64), (c) => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Buergerantrag_${result.title.slice(0, 40).replace(/\s+/g, '_')}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSubmit() {
    if (!result) return
    setSubmitting(true)
    try {
      let locationName = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=de`
        ).then((r) => r.json())
        const a = geo.address ?? {}
        locationName = [a.road, a.house_number, a.suburb ?? a.village ?? a.town ?? a.city]
          .filter(Boolean).join(' ') || geo.display_name?.split(',')[0] || locationName
      } catch { /* keep fallback */ }

      const proposal = await api.proposals.create({
        title: result.title,
        description_raw: descriptionRaw,
        description_refined: result.summary,
        formal_text: result.formal_text,
        location_name: locationName,
        latitude,
        longitude,
        category: 'Sonstiges',
      })
      if (imageFile) {
        try { await api.proposals.uploadImage(proposal.id, imageFile) } catch { /* non-fatal */ }
      }
      toast('Dein Antrag wurde veröffentlicht!')
      navigate(`/proposals/${proposal.id}`)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Fehler beim Einreichen.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <ToastContainer />
      <div className="page">
        <div className="wizard">
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '.5rem' }}>Idee einreichen</h1>
            <p style={{ color: 'var(--muted)' }}>
              Schreib einfach, was dir auf dem Herzen liegt. Die KI erstellt daraus einen formellen Antrag.
            </p>
          </div>

          {/* ── Step 1: Input ── */}
          {!result && (
            <form onSubmit={handleGenerate} className="card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Deine Idee</h2>

              <div className="form-group">
                <label>Was liegt dir am Herzen? *</label>
                <textarea
                  required
                  value={descriptionRaw}
                  onChange={(e) => setDescriptionRaw(e.target.value)}
                  placeholder="Beschreib das Problem und was du dir wünschst – so wie du es einem Nachbarn erzählen würdest."
                  rows={6}
                />
              </div>

              <div className="form-group">
                <label>Ort auf der Karte markieren *</label>
                <LocationPicker
                  lat={latitude}
                  lng={longitude}
                  onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng) }}
                  initialCenter={initialCenter}
                />
                <span className="form-hint">Die KI liest automatisch Straßen- und Infrastrukturdaten des Standorts.</span>
              </div>

              <div className="form-group">
                <label>Foto hochladen <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
                <div
                  style={{
                    border: '2px dashed var(--border)', borderRadius: 10, padding: '1.5rem',
                    textAlign: 'center', background: 'var(--bg)', cursor: 'pointer',
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)) }
                  }}
                >
                  {imagePreview ? (
                    <div>
                      <img src={imagePreview} alt="Vorschau" style={{ maxHeight: 180, maxWidth: '100%', borderRadius: 8, marginBottom: '.75rem', objectFit: 'cover' }} />
                      <div>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setImageFile(null); setImagePreview(null) }}>
                          ✕ Foto entfernen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>📷</div>
                      <div style={{ fontWeight: 600, marginBottom: '.25rem' }}>Foto hierher ziehen oder klicken</div>
                      <div style={{ fontSize: '.8rem', color: 'var(--muted)' }}>JPEG, PNG oder WebP · max. 10 MB</div>
                      <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleImageChange} />
                    </label>
                  )}
                </div>
                <span className="form-hint">Das Foto wird der KI als Kontext übergeben und auch im Antrag veröffentlicht.</span>
              </div>

              {user && (
                <div style={{ padding: '.75rem', background: 'var(--brand-light)', borderRadius: 8, fontSize: '.85rem', color: 'var(--brand)', marginBottom: '1rem' }}>
                  Eingereicht als: <strong>{user.display_name}</strong> (@{user.username})
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '1rem', padding: '.75rem 2rem' }} disabled={generating}>
                  {generating ? '✨ KI erstellt Antrag…' : '✨ Antrag von KI erstellen lassen →'}
                </button>
              </div>

              {generating && (
                <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.85rem', marginTop: '1rem' }}>
                  Die KI liest Standortdaten, ähnliche Anträge und dein Foto – das dauert ca. 15–20 Sekunden…
                </p>
              )}
            </form>
          )}

          {/* ── Step 2: Result ── */}
          {result && (
            <div>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>✨ Dein Bürgerantrag</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => setResult(null)}>← Bearbeiten</button>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>Titel</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{result.title}</div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>Kurzbeschreibung</div>
                  <div style={{ lineHeight: 1.7, color: 'var(--text)' }}>{result.summary}</div>
                </div>

                <div>
                  <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>Formeller Antragstext</div>
                  <div style={{
                    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
                    padding: '1rem', maxHeight: 340, overflowY: 'auto',
                    whiteSpace: 'pre-wrap', fontSize: '.9rem', lineHeight: 1.7,
                  }}>
                    {result.formal_text}
                  </div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }} onClick={downloadPdf}>
                  📄 PDF herunterladen
                </button>
                <div style={{ flex: 1 }} />
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '1rem', padding: '.75rem 2rem' }}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Wird eingereicht…' : 'Antrag veröffentlichen →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
