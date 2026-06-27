interface Props { value: number; max: number }

export default function ProgressBar({ value, max }: Props) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: 'var(--muted)', marginBottom: '.3rem' }}>
        <span>{value} von {max} Unterstützern</span>
        <span>{pct}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
