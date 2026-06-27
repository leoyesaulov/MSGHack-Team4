import { STATUS_COLOR, STATUS_LABEL } from '../lib/statusLabels'
import type { ProposalStatus } from '../lib/types'

interface Props { status: ProposalStatus }

export default function StatusBadge({ status }: Props) {
  const color = STATUS_COLOR[status]
  return (
    <span
      className="badge"
      style={{ background: color + '22', color, border: `1px solid ${color}55` }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
