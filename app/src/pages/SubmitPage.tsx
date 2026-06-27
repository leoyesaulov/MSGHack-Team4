import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { toast } from '../components/Toast'
import ToastContainer from '../components/Toast'
import { useAuthStore } from '../lib/authStore'
import LocationPicker from '../components/LocationPicker'

interface FormData {
  description_raw: string
  latitude: number
  longitude: number
}

const EMPTY: FormData = {
  description_raw: '',
  latitude: 48.2242,
  longitude: 11.6715,
}

export default function SubmitPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialCenter, setInitialCenter] = useState<[number, number] | null>(null)

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
          setForm((f) => ({ ...f, latitude: coords[0], longitude: coords[1] }))
        })
        .catch(() => setInitialCenter([48.2242, 11.6715]))
    } else {
      setInitialCenter([48.2242, 11.6715])
    }
  }, [user, navigate])

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function setLocation(lat: number, lng: number) {
    setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setImagePreview(url)
    } else {
      setImagePreview(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // Auto-derive title from the first sentence of the description (max 80 chars)
      const firstSentence = form.description_raw.split(/[.!?\n]/)[0].trim()
      const autoTitle = firstSentence.length > 80 ? firstSentence.slice(0, 77) + '…' : firstSentence

      // Reverse-geocode coordinates to get a human-readable location name
      let locationName = `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${form.latitude}&lon=${form.longitude}&format=json&accept-language=de`
        ).then((r) => r.json())
        const a = geo.address ?? {}
        locationName = [a.road, a.house_number, a.suburb ?? a.village ?? a.town ?? a.city]
          .filter(Boolean).join(' ') || geo.display_name?.split(',')[0] || locationName
      } catch { /* keep coordinate fallback */ }

      const proposal = await api.proposals.create({
        title: autoTitle,
        description_raw: form.description_raw,
        location_name: locationName,
        latitude: form.latitude,
        longitude: form.longitude,
        category: 'Sonstiges',
      })
      if (imageFile) {
        try {
          await api.proposals.uploadImage(proposal.id, imageFile)
        } catch {
          toast('Vorschlag gespeichert, aber Foto-Upload fehlgeschlagen.', 'error')
        }
      }
      toast('Dein Vorschlag wurde veröffentlicht! 🎉')
      navigate(`/proposals/${proposal.id}`)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Fehler beim Einreichen.', 'error')
    } finally {
      setLoading(false)
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
              Schreib einfach, was dir auf dem Herzen liegt. Kein Behördendeutsch, keine Formulare.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Dein Vorschlag</h2>

            <div className="form-group">
              <label>Deine Idee in deinen Worten *</label>
              <textarea
                required
                value={form.description_raw}
                onChange={(e) => set('description_raw', e.target.value)}
                placeholder="Beschreib das Problem und was du dir wünschst – so wie du es einem Nachbarn erzählen würdest."
                rows={5}
              />
            </div>

            <div className="form-group">
              <label>Ort auf der Karte markieren *</label>
              <LocationPicker
                lat={form.latitude}
                lng={form.longitude}
                onChange={setLocation}
                initialCenter={initialCenter}
              />
            </div>

            <div className="form-group">
              <label>Foto hochladen <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
              <div
                style={{
                  border: '2px dashed var(--border)', borderRadius: 10, padding: '1.5rem',
                  textAlign: 'center', background: 'var(--bg)', cursor: 'pointer',
                  transition: 'border-color .15s',
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (file) {
                    setImageFile(file)
                    setImagePreview(URL.createObjectURL(file))
                  }
                }}
              >
                {imagePreview ? (
                  <div>
                    <img src={imagePreview} alt="Vorschau" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, marginBottom: '.75rem', objectFit: 'cover' }} />
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
              <span className="form-hint">Ohne Foto wird automatisch Google Street View des Standorts angezeigt.</span>
            </div>

            {user && (
              <div style={{ padding: '.75rem', background: 'var(--brand-light)', borderRadius: 8, fontSize: '.85rem', color: 'var(--brand)', marginBottom: '1rem' }}>
                Eingereicht als: <strong>{user.display_name}</strong> (@{user.username})
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ fontSize: '1rem', padding: '.75rem 2rem' }} disabled={loading}>
                {loading ? 'Wird eingereicht…' : 'Vorschlag veröffentlichen →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
