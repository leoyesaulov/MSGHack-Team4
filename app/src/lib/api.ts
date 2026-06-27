import type { Comment, Proposal, ProposalCreatePayload, Vote } from './types'

const BASE = '/api'

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('cityvoice-auth')
    return raw ? JSON.parse(raw)?.state?.token ?? null : null
  } catch {
    return null
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// For OAuth2 login form (application/x-www-form-urlencoded)
async function loginRequest(username: string, password: string) {
  const body = new URLSearchParams({ username, password })
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? 'Login fehlgeschlagen')
  }
  return res.json()
}

export const api = {
  auth: {
    register: (payload: { username: string; display_name: string; email: string; password: string; district?: string; gemeinde?: string }) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    login: loginRequest,
    me: () => request('/auth/me'),
    updateMe: (payload: {
      display_name?: string
      username?: string
      gemeinde?: string
      current_password?: string
      new_password?: string
    }) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  },

  proposals: {
    list: (params?: { status?: string; category?: string }) => {
      const q = new URLSearchParams()
      if (params?.status) q.set('status', params.status)
      if (params?.category) q.set('category', params.category)
      return request<Proposal[]>(`/proposals/?${q}`)
    },
    behoerdeInbox: () => request<Proposal[]>('/proposals/behoerde/inbox'),
    get: (id: number) => request<Proposal>(`/proposals/${id}`),
    create: (payload: ProposalCreatePayload) =>
      request<Proposal>('/proposals/', { method: 'POST', body: JSON.stringify(payload) }),
    patch: (id: number, payload: Partial<{ status: string; department: string; formal_text: string }>) =>
      request<Proposal>(`/proposals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    delete: (id: number) =>
      request<void>(`/proposals/${id}`, { method: 'DELETE' }),
    uploadImage: async (proposalId: number, file: File): Promise<Proposal> => {
      const token = getToken()
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${BASE}/proposals/${proposalId}/image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Upload fehlgeschlagen')
      }
      return res.json()
    },
  },

  votes: {
    list: (proposalId: number) => request<Vote[]>(`/proposals/${proposalId}/votes`),
    add: (proposalId: number) =>
      request<Vote>(`/proposals/${proposalId}/votes`, { method: 'POST' }),
    remove: (proposalId: number) =>
      request<void>(`/proposals/${proposalId}/votes`, { method: 'DELETE' }),
  },

  comments: {
    list: (proposalId: number) => request<Comment[]>(`/proposals/${proposalId}/comments`),
    add: (proposalId: number, text: string) =>
      request<Comment>(`/proposals/${proposalId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ proposal_id: proposalId, text }),
      }),
  },
}
