import type { ProposalStatus } from '../lib/types'

const STEPS: { key: ProposalStatus | '_collect'; label: string }[] = [
  { key: 'open', label: 'Eingabe & Veröffentlichung' },
  { key: '_collect', label: 'Unterschriften sammeln' },
  { key: 'threshold_reached', label: 'Schwellenwert erreicht' },
  { key: 'submitted', label: 'Antrag generiert & versandt' },
  { key: 'in_review', label: 'In Bearbeitung' },
  { key: 'accepted', label: 'Angenommen' },
]

const ORDER: (ProposalStatus | '_collect')[] = ['open', '_collect', 'threshold_reached', 'submitted', 'in_review', 'accepted']

function effectiveKey(status: ProposalStatus): ProposalStatus | '_collect' {
  if (status === 'open') return '_collect'
  return status
}

interface Props { status: ProposalStatus }

export default function Pipeline({ status }: Props) {
  const current = effectiveKey(status)
  const currentIdx = ORDER.indexOf(current)

  return (
    <div className="pipeline">
      {STEPS.map((step, i) => {
        const idx = ORDER.indexOf(step.key)
        const done = idx < currentIdx
        const active = idx === currentIdx
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div className={`pipeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
              <div className="pipeline-step-dot">{done ? '✓' : i + 1}</div>
              <div className="pipeline-step-label">{step.label}</div>
            </div>
            {i < STEPS.length - 1 && <div className={`pipeline-connector ${done ? 'done' : ''}`} />}
          </div>
        )
      })}
    </div>
  )
}
