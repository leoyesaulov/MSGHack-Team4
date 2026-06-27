export type ProposalStatus =
  | 'draft'
  | 'open'
  | 'submitted'
  | 'accepted'
  | 'rejected'

export type Department =
  | 'Tiefbauamt'
  | 'Ordnungsamt'
  | 'Grünflächenamt'
  | 'Stadtplanungsamt'
  | 'Schulamt'
  | 'Umweltamt'
  | 'Sonstige'

export interface Proposal {
  id: number
  title: string
  description_raw: string
  description_refined: string | null
  location_name: string
  latitude: number
  longitude: number
  category: string
  department: Department | null
  status: ProposalStatus
  threshold: number
  formal_text: string | null
  image_path: string | null
  image_url: string | null
  gemeinde: string | null
  author_id: number
  author_username: string
  author_display_name: string
  vote_count: number
  created_at: string
  updated_at: string
}

export interface Vote {
  id: number
  proposal_id: number
  user_id: number
  created_at: string
}

export interface Comment {
  id: number
  proposal_id: number
  author_id: number
  author_username: string
  author_display_name: string
  text: string
  created_at: string
}

export interface ProposalCreatePayload {
  title: string
  description_raw: string
  description_refined?: string
  location_name: string
  latitude: number
  longitude: number
  category: string
  department?: Department
  threshold?: number
}
