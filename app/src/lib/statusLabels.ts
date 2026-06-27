import type { ProposalStatus } from './types'

export const STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: 'Entwurf',
  open: 'Offen – Unterschriften sammeln',
  threshold_reached: 'Schwellenwert erreicht',
  submitted: 'Eingereicht',
  in_review: 'In Bearbeitung',
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
}

export const STATUS_COLOR: Record<ProposalStatus, string> = {
  draft: '#94a3b8',
  open: '#3b82f6',
  threshold_reached: '#f59e0b',
  submitted: '#8b5cf6',
  in_review: '#06b6d4',
  accepted: '#22c55e',
  rejected: '#ef4444',
}
