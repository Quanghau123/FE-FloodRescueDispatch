import type {
  AssignmentStatus,
  FloodSeverity,
  FloodZoneStatus,
  RescueTeamStatus,
  ShelterStatus,
  SosStatus
} from './enums'

export type Guid = string

export type DashboardSummaryResponse = {
  pendingSosCount: number
  assignedSosCount: number
  inProgressSosCount: number
  resolvedSosCount: number
  availableTeamCount: number
  activeFloodZoneCount: number
}

export type AlertResponse = {
  floodZoneId: Guid
  floodZoneName: string
  severity: FloodSeverity
  message: string
}

export type FloodZoneMapResponse = {
  id: Guid
  name: string
  severity: FloodSeverity
  status: FloodZoneStatus
  wktBoundary: string
}

export type SosMapItemResponse = {
  id: Guid
  longitude: number
  latitude: number
  status: SosStatus
  priorityScore: number
  peopleCount: number
  createdAt: string
}

export type SosSummaryResponse = {
  id: Guid
  citizenId: Guid
  longitude: number
  latitude: number
  status: SosStatus
  priorityScore: number
  peopleCount: number
  createdAt: string
}

export type RescueAssignmentResponse = {
  id: Guid
  rescueTeamId: Guid
  rescueTeamName?: string | null
  status: AssignmentStatus
  assignedAt: string
  note?: string | null
}

export type SosDetailResponse = {
  id: Guid
  citizenId: Guid
  citizenName?: string | null
  citizenPhone?: string | null
  longitude: number
  latitude: number
  addressText?: string | null
  description?: string | null
  peopleCount: number
  hasInjuredPeople: boolean
  hasChildren: boolean
  hasElderly: boolean
  status: SosStatus
  priorityScore: number
  createdAt: string
  assignments: RescueAssignmentResponse[]
}

export type PagedResponse<T> = {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type NearestRescueTeamResponse = {
  id: Guid
  name: string
  status: RescueTeamStatus
  longitude: number
  latitude: number
  distanceMeters: number
}

export type NearestShelterResponse = {
  id: Guid
  name: string
  address: string
  longitude: number
  latitude: number
  availableSlots: number
  distanceMeters: number
}

export type CreateSosRequest = {
  citizenId: Guid
  longitude: number
  latitude: number
  addressText?: string | null
  description?: string | null
  peopleCount: number
  hasInjuredPeople: boolean
  hasChildren: boolean
  hasElderly: boolean
}

export type AssignRescueTeamRequest = {
  rescueTeamId: Guid
  note?: string | null
}

export type CreateFloodZoneRequest = {
  name: string
  severity: FloodSeverity
  wktPolygon: string
  description?: string | null
}

export type UpdateFloodZoneRequest = {
  name: string
  severity: FloodSeverity
  status: FloodZoneStatus
  wktPolygon?: string | null
  description?: string | null
}

export type CreateShelterRequest = {
  name: string
  address: string
  longitude: number
  latitude: number
  capacity: number
  contactPhone?: string | null
  hasMedicalSupport: boolean
}

export type UpdateShelterRequest = {
  name: string
  address: string
  capacity: number
  currentOccupancy: number
  status: ShelterStatus
  contactPhone?: string | null
  hasMedicalSupport: boolean
}

export type UpdateRescueTeamLocationRequest = {
  longitude: number
  latitude: number
}

export type UpdateRescueTeamStatusRequest = {
  status: RescueTeamStatus
}

