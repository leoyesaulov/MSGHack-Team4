export default function AboutPage() {
  return (
    <div className="page">
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '3rem 1rem 2.5rem', maxWidth: 700, margin: '0 auto' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛</div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '.75rem' }}>
          Was ist <span style={{ color: 'var(--brand)' }}>CityVoice</span>?
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--muted)', lineHeight: 1.7 }}>
          CityVoice ist eine digitale Bürgerpartizipationsplattform, die es jedem Bürger ermöglicht,
          Ideen und Anliegen für die Gemeinde unkompliziert einzureichen, zu unterstützen und zu verfolgen —
          direkt aus dem Browser, ohne Behördendeutsch.
        </p>
      </div>

      {/* How it works – full pipeline */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.75rem' }}>
          Wie funktioniert es?
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            {
              icon: '✍️',
              title: 'Idee einreichen',
              desc: 'Ein angemeldeter Bürger beschreibt sein Anliegen in eigenen Worten — so wie man es einem Nachbarn erzählen würde. Er markiert den Ort auf der Karte und kann optional ein Foto hochladen. Titel, Adresse und Kategorie werden automatisch abgeleitet.',
              tag: 'Schritt 1',
            },
            {
              icon: '🗺',
              title: 'Sichtbar auf der Karte',
              desc: 'Der Vorschlag erscheint sofort auf der interaktiven Karte und im Feed. Andere Bürger können ihn lesen, kommentieren und den Standort sehen.',
              tag: 'Schritt 2',
            },
            {
              icon: '👍',
              title: 'Nachbarschaft stimmt ab',
              desc: 'Jeder angemeldete Bürger kann einen Vorschlag mit einer Stimme unterstützen. Eigene Vorschläge können nicht selbst unterstützt werden. Ein Fortschrittsbalken zeigt, wie nah ein Anliegen dem Ziel von 50 Stimmen ist.',
              tag: 'Schritt 3',
            },
            {
              icon: '🚀',
              title: 'Antrag automatisch eingereicht',
              desc: 'Sobald ein Vorschlag mehr als 50 Unterstützerstimmen erhält, wird er automatisch als formaler Antrag an die Behörde eingereicht.',
              tag: 'Schritt 4',
            },
            {
              icon: '📄',
              title: 'Formaler Antrag (KI)',
              desc: 'Aus der Bürgeridee wird ein formaler Behördenantrag in Amtsdeutsch generiert, der automatisch an die zuständige Stelle (z. B. Tiefbauamt, Grünflächenamt) weitergeleitet wird.',
              tag: 'Schritt 5 · geplant',
              planned: true,
            },
            {
              icon: '📬',
              title: 'Behörde entscheidet',
              desc: 'Die Gemeinde nimmt den Antrag an oder lehnt ihn ab. Bürger können den Status live verfolgen.',
              tag: 'Schritt 6',
            },
          ].map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '1.25rem',
                paddingBottom: i < 5 ? '1.75rem' : 0,
                marginBottom: i < 5 ? '1.75rem' : 0,
                borderBottom: i < 5 ? '1px solid var(--border)' : 'none',
                opacity: step.planned ? 0.65 : 1,
              }}
            >
              <div style={{
                flexShrink: 0, width: 48, height: 48, borderRadius: '50%',
                background: step.planned ? 'var(--bg)' : 'var(--brand-light)',
                border: `2px solid ${step.planned ? 'var(--border)' : '#bfdbfe'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem',
              }}>
                {step.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.3rem' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{step.title}</h3>
                  <span style={{
                    fontSize: '.7rem', fontWeight: 600, padding: '.15rem .5rem',
                    borderRadius: 999, background: step.planned ? 'var(--bg)' : 'var(--brand-light)',
                    color: step.planned ? 'var(--muted)' : 'var(--brand)',
                    border: `1px solid ${step.planned ? 'var(--border)' : '#bfdbfe'}`,
                  }}>
                    {step.tag}
                  </span>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column: for citizens + for government */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '1.6rem', marginBottom: '.75rem' }}>👤</div>
          <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '.75rem' }}>Für Bürgerinnen & Bürger</h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {[
              'Kein Formular-Chaos — einfach in eigenen Worten schreiben',
              'Ort direkt auf der Karte markieren',
              'Optional ein Foto zum Anliegen hochladen',
              'Andere Ideen unterstützen und kommentieren',
              'Status-Tracking vom ersten Klick bis zur Behördenentscheidung',
            ].map((t, i) => (
              <li key={i} style={{ display: 'flex', gap: '.6rem', fontSize: '.88rem', color: 'var(--muted)' }}>
                <span style={{ color: 'var(--brand)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div style={{ fontSize: '1.6rem', marginBottom: '.75rem' }}>🏛</div>
          <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '.75rem' }}>Für die Gemeinde</h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {[
              'Nur Anliegen mit echter Rückendeckung (> 50 Stimmen) werden weitergeleitet',
              'Formaler Antrag wird automatisch generiert — kein manueller Aufwand',
              'Automatische Zuweisung ans zuständige Amt',
              'Öffentliche Transparenz stärkt das Vertrauen der Bürger',
              'Digitaler Eingang für die gesamte Partizipation an einem Ort',
            ].map((t, i) => (
              <li key={i} style={{ display: 'flex', gap: '.6rem', fontSize: '.88rem', color: 'var(--muted)' }}>
                <span style={{ color: 'var(--brand)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Status legend */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1.25rem' }}>Statusübersicht</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {[
            { status: 'Offen', color: '#3b82f6', bg: '#eff6ff', desc: 'Sammelt noch Stimmen. Jeder kann abstimmen und kommentieren.' },
            { status: 'Eingereicht', color: '#8b5cf6', bg: '#f5f3ff', desc: 'Mehr als 50 Stimmen — Antrag automatisch an die Behörde weitergeleitet.' },
            { status: 'Angenommen', color: '#22c55e', bg: '#f0fdf4', desc: 'Das Anliegen wurde von der Gemeinde offiziell akzeptiert.' },
            { status: 'Abgelehnt', color: '#ef4444', bg: '#fef2f2', desc: 'Das Anliegen wurde nach Prüfung abgelehnt.' },
          ].map((s) => (
            <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{
                flexShrink: 0, padding: '.2rem .75rem', borderRadius: 999,
                background: s.bg, color: s.color,
                fontSize: '.78rem', fontWeight: 700, minWidth: 160, textAlign: 'center',
              }}>
                {s.status}
              </span>
              <span style={{ fontSize: '.88rem', color: 'var(--muted)' }}>{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hackathon note */}
      <div className="card" style={{ background: 'var(--brand-light)', border: '1px solid #bfdbfe', textAlign: 'center' }}>
        <p style={{ fontSize: '.88rem', color: 'var(--brand)', fontWeight: 600, marginBottom: '.35rem' }}>
          Entwickelt beim MSGHack Hackathon — Team 4
        </p>
        <p style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
          Dieses Projekt ist ein funktionsfähiger Prototyp. KI-gestützte Antragsgenerierung und
          Behördenanbindung sind als nächste Schritte geplant.
        </p>
      </div>
    </div>
  )
}
