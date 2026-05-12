import { getApiBaseUrl } from './config'

export class ApiError extends Error {
  status: number
  payloadText?: string
  constructor(message: string, status: number, payloadText?: string) {
    super(message)
    this.status = status
    this.payloadText = payloadText
  }
}

function buildQuery(params: Record<string, unknown> | undefined) {
  if (!params) return ''
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    if (v instanceof Date) sp.set(k, v.toISOString())
    else sp.set(k, String(v))
  }
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

async function request<T>(method: string, path: string, options?: { query?: Record<string, unknown>; body?: unknown }): Promise<T> {
  const base = getApiBaseUrl()
  const url = `${base}${path}${buildQuery(options?.query)}`
  const res = await fetch(url, {
    method,
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError(`HTTP ${res.status} (${method} ${path})`, res.status, text)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  dashboardSummary: () => request('GET', '/api/dashboard/summary'),

  alertsCheck: (query: { userId: string; longitude: number; latitude: number }) =>
    request('GET', '/api/alerts/check', { query }),

  sosMap: (query: {
    minLng: number
    minLat: number
    maxLng: number
    maxLat: number
    zoom?: number | null
    status?: number | null
  }) => request('GET', '/api/map/sos', { query }),

  floodZonesMap: (query: {
    minLng: number
    minLat: number
    maxLng: number
    maxLat: number
    zoom?: number | null
    severity?: number | null
    status?: number | null
  }) => request('GET', '/api/flood-zones/map', { query }),

  createFloodZone: (body: unknown) => request('POST', '/api/flood-zones', { body }),
  updateFloodZone: (id: string, body: unknown) => request('PUT', `/api/flood-zones/${id}`, { body }),

  createShelter: (body: unknown) => request('POST', '/api/shelters', { body }),
  updateShelter: (id: string, body: unknown) => request('PUT', `/api/shelters/${id}`, { body }),
  nearestShelter: (query: { longitude: number; latitude: number; radiusMeters?: number }) =>
    request('GET', '/api/shelters/nearest', { query }),

  updateRescueTeamLocation: (id: string, body: unknown) => request('PUT', `/api/rescue-teams/${id}/location`, { body }),
  updateRescueTeamStatus: (id: string, body: unknown) => request('PATCH', `/api/rescue-teams/${id}/status`, { body }),
  nearestRescueTeam: (query: { longitude: number; latitude: number; radiusMeters?: number }) =>
    request('GET', '/api/rescue-teams/nearest', { query }),

  createSos: (body: unknown) => request('POST', '/api/sos', { body }),
  searchSos: (query: {
    status?: number | null
    createdFrom?: string | null
    createdTo?: string | null
    sortBy?: string | null
    sortDirection?: string | null
    page?: number
    pageSize?: number
  }) => request('GET', '/api/sos', { query }),
  getSosById: (id: string) => request('GET', `/api/sos/${id}`),
  cancelSos: (id: string, citizenId: string) => request('POST', `/api/sos/${id}/cancel`, { query: { citizenId } }),
  updateSosStatus: (id: string, status: number) => request('PATCH', `/api/sos/${id}/status`, { query: { status } }),

  assignRescueTeam: (sosRequestId: string, body: unknown) =>
    request('POST', `/api/dispatch/sos/${sosRequestId}/assign`, { body })
} as const

