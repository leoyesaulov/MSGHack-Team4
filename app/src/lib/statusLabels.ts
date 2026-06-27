import type { ProposalStatus } from './types'

export const STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: 'Entwurf',
  open: 'Offen – Unterschriften sammeln',
  submitted: 'Eingereicht',
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
}

export const STATUS_COLOR: Record<ProposalStatus, string> = {
  draft: '#94a3b8',
  open: '#3b82f6',
  submitted: '#8b5cf6',
  accepted: '#22c55e',
  rejected: '#ef4444',
}
