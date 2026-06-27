import type { ProposalStatus } from '../lib/types'

const STEPS: { key: ProposalStatus | '_collect'; label: string }[] = [
  { key: 'open', label: 'Eingabe & Veröffentlichung' },
  { key: '_collect', label: 'Unterschriften sammeln' },
  { key: 'submitted', label: 'Antrag eingereicht' },
  { key: 'accepted', label: 'Angenommen' },
]

const ORDER: (ProposalStatus | '_collect')[] = ['open', '_collect', 'submitted', 'accepted']

function effectiveKey(status: ProposalStatus): ProposalStatus | '_collect' {
  if (status === 'open') return '_collect'
  return status
}

interface Props { status: ProposalStatus }

export default function Pipeline({ status }: Props) {
  const rejected = status === 'rejected'
  const current = effectiveKey(status)
  const currentIdx = rejected ? ORDER.length : ORDER.indexOf(current)

  return (
    <div className="pipeline">
      {STEPS.map((step, i) => {
        const idx = ORDER.indexOf(step.key)
        const isLastStep = i === STEPS.length - 1
        const fullyDone = status === 'accepted' || status === 'rejected'
        const done = rejected ? !isLastStep : fullyDone ? true : idx < currentIdx
        const active = !rejected && !fullyDone && idx === currentIdx
        const isRejected = rejected && isLastStep

        const dotStyle: React.CSSProperties = isRejected
          ? { background: '#dc2626', borderColor: '#dc2626', color: 'white' }
          : done
          ? { background: 'var(--success)', borderColor: 'var(--success)', color: 'white' }
          : active
          ? { background: 'var(--brand)', borderColor: 'var(--brand)', color: 'white' }
          : {}

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div className={`pipeline-step ${done ? 'done' : ''} ${active ? 'active' : ''} ${isRejected ? 'rejected' : ''}`}>
              <div className="pipeline-step-dot" style={dotStyle}>
                {isRejected ? '✕' : done ? '✓' : i + 1}
              </div>
              <div className="pipeline-step-label" style={isRejected ? { color: '#dc2626', fontWeight: 600 } : {}}>
                {isRejected ? 'Abgelehnt' : step.label}
              </div>
            </div>
            {i < STEPS.length - 1 && <div className={`pipeline-connector ${done ? 'done' : ''}`} />}
          </div>
        )
      })}
    </div>
  )
}
