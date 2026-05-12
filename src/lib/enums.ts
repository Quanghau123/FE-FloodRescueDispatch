export const SosStatus = {
  Pending: 1,
  Assigned: 2,
  InProgress: 3,
  Resolved: 4,
  Cancelled: 5
} as const
export type SosStatus = (typeof SosStatus)[keyof typeof SosStatus]

export const FloodSeverity = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4
} as const
export type FloodSeverity = (typeof FloodSeverity)[keyof typeof FloodSeverity]

export const FloodZoneStatus = {
  Draft: 1,
  Active: 2,
  Resolved: 3,
  Archived: 4
} as const
export type FloodZoneStatus = (typeof FloodZoneStatus)[keyof typeof FloodZoneStatus]

export const RescueTeamStatus = {
  Available: 1,
  Busy: 2,
  Offline: 3
} as const
export type RescueTeamStatus = (typeof RescueTeamStatus)[keyof typeof RescueTeamStatus]

export const ShelterStatus = {
  Open: 1,
  Full: 2,
  Closed: 3
} as const
export type ShelterStatus = (typeof ShelterStatus)[keyof typeof ShelterStatus]

export const AssignmentStatus = {
  Assigned: 1,
  Accepted: 2,
  Arrived: 3,
  Completed: 4,
  Cancelled: 5
} as const
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus]

export type Option<TValue extends number = number> = { label: string; value: TValue }

export const SOS_STATUS_OPTIONS: Option<SosStatus>[] = [
  { value: SosStatus.Pending, label: 'Chờ xử lý' },
  { value: SosStatus.Assigned, label: 'Đã phân công' },
  { value: SosStatus.InProgress, label: 'Đang xử lý' },
  { value: SosStatus.Resolved, label: 'Đã giải quyết' },
  { value: SosStatus.Cancelled, label: 'Đã hủy' }
]

export const FLOOD_SEVERITY_OPTIONS: Option<FloodSeverity>[] = [
  { value: FloodSeverity.Low, label: 'Thấp' },
  { value: FloodSeverity.Medium, label: 'Trung bình' },
  { value: FloodSeverity.High, label: 'Cao' },
  { value: FloodSeverity.Critical, label: 'Nghiêm trọng' }
]

export const FLOOD_ZONE_STATUS_OPTIONS: Option<FloodZoneStatus>[] = [
  { value: FloodZoneStatus.Draft, label: 'Nháp' },
  { value: FloodZoneStatus.Active, label: 'Đang hoạt động' },
  { value: FloodZoneStatus.Resolved, label: 'Đã giải quyết' },
  { value: FloodZoneStatus.Archived, label: 'Lưu trữ' }
]

export const RESCUE_TEAM_STATUS_OPTIONS: Option<RescueTeamStatus>[] = [
  { value: RescueTeamStatus.Available, label: 'Sẵn sàng' },
  { value: RescueTeamStatus.Busy, label: 'Bận' },
  { value: RescueTeamStatus.Offline, label: 'Ngoại tuyến' }
]

export const SHELTER_STATUS_OPTIONS: Option<ShelterStatus>[] = [
  { value: ShelterStatus.Open, label: 'Mở' },
  { value: ShelterStatus.Full, label: 'Đầy' },
  { value: ShelterStatus.Closed, label: 'Đóng' }
]

export function labelFromOptions(options: Option[], value: number | null | undefined) {
  const hit = options.find((o) => o.value === value)
  return hit?.label ?? String(value ?? '')
}
