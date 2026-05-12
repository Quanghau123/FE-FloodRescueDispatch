import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import { Panel } from '../components/Panel'
import { Toast, type ToastState } from '../components/Toast'
import { api, ApiError } from '../lib/api'
import {
  FLOOD_SEVERITY_OPTIONS,
  FLOOD_ZONE_STATUS_OPTIONS,
  RESCUE_TEAM_STATUS_OPTIONS,
  SHELTER_STATUS_OPTIONS,
  SOS_STATUS_OPTIONS,
  FloodSeverity,
  FloodZoneStatus,
  RescueTeamStatus,
  ShelterStatus,
  SosStatus
} from '../lib/enums'
import type {
  AlertResponse,
  CreateFloodZoneRequest,
  CreateShelterRequest,
  FloodZoneMapResponse,
  NearestRescueTeamResponse,
  NearestShelterResponse,
  SosDetailResponse,
  SosMapItemResponse,
  UpdateFloodZoneRequest,
  UpdateShelterRequest
} from '../lib/types'
import { rectangleWktFromBounds, wktToLeafletPolygon } from '../lib/wkt'

const LS_LAST_POINT = 'frd.lastPoint'
const LS_LAST_RESCUE_TEAM_ID = 'frd.lastRescueTeamId'
const LS_LAST_SOS_ID = 'frd.lastSosId'
const LS_ALERT_USER_ID = 'frd.alertUserId'

type Bbox = { minLng: number; minLat: number; maxLng: number; maxLat: number; zoom?: number | null }

function saveLastPoint(lng: number, lat: number) {
  localStorage.setItem(LS_LAST_POINT, JSON.stringify({ lng, lat }))
}

function getOrCreateUserId() {
  const existing = localStorage.getItem(LS_ALERT_USER_ID)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(LS_ALERT_USER_ID, id)
  return id
}

function statusColor(status: number) {
  if (status === SosStatus.Pending) return '#ff5c7a'
  if (status === SosStatus.Assigned) return '#4f8cff'
  if (status === SosStatus.InProgress) return '#ffb020'
  if (status === SosStatus.Resolved) return '#41d392'
  if (status === SosStatus.Cancelled) return '#8b95ad'
  return '#4f8cff'
}

function severityColor(sev: number) {
  if (sev === FloodSeverity.Low) return '#4f8cff'
  if (sev === FloodSeverity.Medium) return '#ffb020'
  if (sev === FloodSeverity.High) return '#ff7a45'
  if (sev === FloodSeverity.Critical) return '#ff2d55'
  return '#4f8cff'
}

function MapEvents(props: {
  onBounds: (bbox: Bbox) => void
  onMapClick: (lng: number, lat: number) => void
  rectMode: boolean
  onRectPoint: (lng: number, lat: number) => void
}) {
  const map = useMapEvents({
    moveend() {
      const b = map.getBounds()
      props.onBounds({
        minLng: b.getWest(),
        minLat: b.getSouth(),
        maxLng: b.getEast(),
        maxLat: b.getNorth(),
        zoom: map.getZoom()
      })
    },
    click(e) {
      const lng = e.latlng.lng
      const lat = e.latlng.lat
      saveLastPoint(lng, lat)
      props.onMapClick(lng, lat)
      if (props.rectMode) props.onRectPoint(lng, lat)
    }
  })
  return null
}

export default function MapPage() {
  const [toast, setToast] = useState<ToastState>(null)
  const [busy, setBusy] = useState(false)

  const sosStatusOptions = useMemo(() => SOS_STATUS_OPTIONS, [])
  const sevOptions = useMemo(() => FLOOD_SEVERITY_OPTIONS, [])
  const zoneStatusOptions = useMemo(() => FLOOD_ZONE_STATUS_OPTIONS, [])
  const shelterStatusOptions = useMemo(() => SHELTER_STATUS_OPTIONS, [])
  const teamStatusOptions = useMemo(() => RESCUE_TEAM_STATUS_OPTIONS, [])

  const [bbox, setBbox] = useState<Bbox>({ minLng: 106.63, minLat: 10.70, maxLng: 106.79, maxLat: 10.82, zoom: 12 })
  const [filters, setFilters] = useState(() => ({
    sosStatus: '' as '' | number,
    zoneSeverity: '' as '' | number,
    zoneStatus: '' as '' | number
  }))

  const [sosItems, setSosItems] = useState<SosMapItemResponse[]>([])
  const [zones, setZones] = useState<FloodZoneMapResponse[]>([])

  const [selectedPoint, setSelectedPoint] = useState<{ lng: number; lat: number } | null>(null)
  const [userId, setUserId] = useState(() => getOrCreateUserId())
  const [alerts, setAlerts] = useState<AlertResponse[] | null>(null)
  const [nearestShelter, setNearestShelter] = useState<NearestShelterResponse | null>(null)
  const [nearestTeam, setNearestTeam] = useState<NearestRescueTeamResponse | null>(null)

  const refreshTimer = useRef<number | null>(null)

  const [selectedSosId, setSelectedSosId] = useState<string>(() => localStorage.getItem(LS_LAST_SOS_ID) ?? '')
  const [selectedSosDetail, setSelectedSosDetail] = useState<SosDetailResponse | null>(null)
  const [sosStatusUpdate, setSosStatusUpdate] = useState<number>(SosStatus.InProgress)

  const [rectMode, setRectMode] = useState(false)
  const [rectStart, setRectStart] = useState<{ lng: number; lat: number } | null>(null)
  const [zoneCreate, setZoneCreate] = useState<CreateFloodZoneRequest>(() => ({
    name: 'Vùng ngập',
    severity: FloodSeverity.Medium,
    wktPolygon: rectangleWktFromBounds(bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat),
    description: ''
  }))
  const [zoneUpdateId, setZoneUpdateId] = useState('')
  const [zoneUpdate, setZoneUpdate] = useState<UpdateFloodZoneRequest>(() => ({
    name: '',
    severity: FloodSeverity.Medium,
    status: FloodZoneStatus.Active,
    wktPolygon: null,
    description: ''
  }))

  const [shelterCreate, setShelterCreate] = useState<CreateShelterRequest>(() => ({
    name: 'Nơi trú ẩn',
    address: '',
    longitude: 106.70098,
    latitude: 10.77653,
    capacity: 100,
    contactPhone: '',
    hasMedicalSupport: false
  }))
  const [shelterUpdateId, setShelterUpdateId] = useState('')
  const [shelterUpdate, setShelterUpdate] = useState<UpdateShelterRequest>(() => ({
    name: '',
    address: '',
    capacity: 100,
    currentOccupancy: 0,
    status: ShelterStatus.Open,
    contactPhone: '',
    hasMedicalSupport: false
  }))

  async function refreshMapData(nextBbox: Bbox) {
    setBusy(true)
    try {
      const [sos, z] = await Promise.all([
        api.sosMap({
          ...nextBbox,
          status: filters.sosStatus === '' ? null : filters.sosStatus
        }) as Promise<SosMapItemResponse[]>,
        api.floodZonesMap({
          ...nextBbox,
          severity: filters.zoneSeverity === '' ? null : filters.zoneSeverity,
          status: filters.zoneStatus === '' ? null : filters.zoneStatus
        }) as Promise<FloodZoneMapResponse[]>
      ])
      setSosItems(sos)
      setZones(z)
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Tải dữ liệu bản đồ thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  function scheduleRefresh(nextBbox: Bbox) {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current)
    refreshTimer.current = window.setTimeout(() => refreshMapData(nextBbox), 250)
  }

  async function onMapClick(lng: number, lat: number) {
    setSelectedPoint({ lng, lat })
    setShelterCreate((s) => ({ ...s, longitude: lng, latitude: lat }))

    try {
      const settled = await Promise.allSettled([
        api.nearestRescueTeam({ longitude: lng, latitude: lat, radiusMeters: 20_000 }) as Promise<NearestRescueTeamResponse>,
        api.nearestShelter({ longitude: lng, latitude: lat, radiusMeters: 10_000 }) as Promise<NearestShelterResponse>,
        api.alertsCheck({ userId, longitude: lng, latitude: lat }) as Promise<AlertResponse[]>
      ])

      const team = settled[0].status === 'fulfilled' ? settled[0].value : null
      const shelter = settled[1].status === 'fulfilled' ? settled[1].value : null
      const a = settled[2].status === 'fulfilled' ? settled[2].value : null

      setNearestTeam(team ?? null)
      setNearestShelter(shelter ?? null)
      setAlerts(a ?? null)
      if (team?.id) localStorage.setItem(LS_LAST_RESCUE_TEAM_ID, team.id)
    } catch (e) {
      // nearest endpoints can 404; keep it quiet-ish
      if (e instanceof ApiError && e.status === 404) return
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Thao tác khi click thất bại', message: msg })
    }
  }

  function onRectPoint(lng: number, lat: number) {
    if (!rectStart) {
      setRectStart({ lng, lat })
      return
    }
    const minLng = Math.min(rectStart.lng, lng)
    const maxLng = Math.max(rectStart.lng, lng)
    const minLat = Math.min(rectStart.lat, lat)
    const maxLat = Math.max(rectStart.lat, lat)
    const wkt = rectangleWktFromBounds(minLng, minLat, maxLng, maxLat)
    setZoneCreate((s) => ({ ...s, wktPolygon: wkt }))
    setRectStart(null)
    setRectMode(false)
  }

  useEffect(() => {
    // initial load
    refreshMapData(bbox)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadSosDetail(id: string) {
    if (!id) return
    setBusy(true)
    try {
      const res = await api.getSosById(id)
      setSelectedSosDetail(res as SosDetailResponse)
      localStorage.setItem(LS_LAST_SOS_ID, id)
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Tải chi tiết SOS thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  async function updateSelectedSosStatus() {
    if (!selectedSosId) return
    setBusy(true)
    try {
      await api.updateSosStatus(selectedSosId, sosStatusUpdate)
      setToast({ title: 'Đã cập nhật SOS', message: 'Đã gọi `PATCH /api/sos/{id}/status` (204).' })
      await loadSosDetail(selectedSosId)
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Cập nhật SOS thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  async function createFloodZone() {
    setBusy(true)
    try {
      const created = (await api.createFloodZone(zoneCreate)) as FloodZoneMapResponse
      setToast({ title: 'Đã tạo vùng ngập', message: created.id })
      setZoneUpdateId(created.id)
      setZoneUpdate((s) => ({ ...s, name: created.name, severity: created.severity, status: created.status }))
      await refreshMapData(bbox)
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Tạo vùng ngập thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  async function updateFloodZone() {
    if (!zoneUpdateId) return
    setBusy(true)
    try {
      await api.updateFloodZone(zoneUpdateId, zoneUpdate)
      setToast({ title: 'Đã cập nhật vùng ngập', message: 'NoContent (204)' })
      await refreshMapData(bbox)
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Cập nhật vùng ngập thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  async function createShelter() {
    setBusy(true)
    try {
      const created = await api.createShelter(shelterCreate)
      const id = (created as any)?.id as string | undefined
      if (id) setShelterUpdateId(id)
      setToast({ title: 'Đã tạo nơi trú ẩn', message: id ?? 'OK' })
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Tạo nơi trú ẩn thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  async function updateShelter() {
    if (!shelterUpdateId) return
    setBusy(true)
    try {
      await api.updateShelter(shelterUpdateId, shelterUpdate)
      setToast({ title: 'Đã cập nhật nơi trú ẩn', message: 'NoContent (204)' })
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Cập nhật nơi trú ẩn thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  async function updateNearestTeamStatusAndLocation() {
    if (!nearestTeam) return
    if (!selectedPoint) return
    setBusy(true)
    try {
      await api.updateRescueTeamStatus(nearestTeam.id, { status: RescueTeamStatus.Busy })
      await api.updateRescueTeamLocation(nearestTeam.id, { longitude: selectedPoint.lng, latitude: selectedPoint.lat })
      setToast({ title: 'Đã cập nhật đội cứu hộ', message: 'Đã đặt trạng thái “Bận” + di chuyển đến điểm vừa click' })
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Cập nhật đội cứu hộ thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  const rectPreviewPolygon = useMemo(() => {
    if (!rectStart) return null
    const minLng = Math.min(rectStart.lng, selectedPoint?.lng ?? rectStart.lng)
    const maxLng = Math.max(rectStart.lng, selectedPoint?.lng ?? rectStart.lng)
    const minLat = Math.min(rectStart.lat, selectedPoint?.lat ?? rectStart.lat)
    const maxLat = Math.max(rectStart.lat, selectedPoint?.lat ?? rectStart.lat)
    const wkt = rectangleWktFromBounds(minLng, minLat, maxLng, maxLat)
    return wktToLeafletPolygon(wkt)
  }, [rectStart, selectedPoint?.lng, selectedPoint?.lat])

  return (
    <>
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Bản đồ</div>
          <div className="pageHint">
            Gọi API: SOS + vùng ngập theo bbox; click bản đồ để tìm gần nhất (nơi trú ẩn/đội cứu hộ) và kiểm tra cảnh báo.
          </div>
        </div>
      </div>

      <div className="split">
        <Panel
          title="Hiển thị bản đồ"
          className="mapWrap"
          right={
            <div className="btnRow">
              <button className="btn" onClick={() => refreshMapData(bbox)} disabled={busy}>
                {busy ? 'Đang tải…' : 'Tải lại'}
              </button>
              <button
                className={rectMode ? 'btn primary' : 'btn'}
                onClick={() => {
                  setRectMode((v) => !v)
                  setRectStart(null)
                }}
              >
                {rectMode ? 'Vẽ vùng: BẬT' : 'Vẽ vùng: TẮT'}
              </button>
            </div>
          }
        >
          <div className="mapCanvas">
            <MapContainer center={[10.77653, 106.70098]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapEvents
                rectMode={rectMode}
                onRectPoint={onRectPoint}
                onMapClick={onMapClick}
                onBounds={(b) => {
                  setBbox(b)
                  scheduleRefresh(b)
                }}
              />

              {zones.map((z) => {
                const poly = wktToLeafletPolygon(z.wktBoundary)
                if (!poly) return null
                return (
                  <Polygon
                    key={z.id}
                    positions={poly as any}
                    pathOptions={{ color: severityColor(z.severity), weight: 2, fillOpacity: 0.20 }}
                    eventHandlers={{
                      click: () => {
                        setZoneUpdateId(z.id)
                        setZoneUpdate((s) => ({ ...s, name: z.name, severity: z.severity, status: z.status }))
                      }
                    }}
                  >
                    <Popup>
                      <div style={{ fontWeight: 800 }}>{z.name}</div>
                      <div className="mono" style={{ fontSize: 12 }}>
                        {z.id}
                      </div>
                    </Popup>
                  </Polygon>
                )
              })}

              {rectPreviewPolygon ? (
                <Polygon positions={rectPreviewPolygon as any} pathOptions={{ color: '#ffffff', weight: 2, dashArray: '6 6' }} />
              ) : null}

              {sosItems.map((s) => (
                <CircleMarker
                  key={s.id}
                  center={[s.latitude, s.longitude]}
                  radius={8}
                  pathOptions={{ color: statusColor(s.status), fillColor: statusColor(s.status), fillOpacity: 0.85 }}
                  eventHandlers={{
                    click: () => {
                      setSelectedSosId(s.id)
                      localStorage.setItem(LS_LAST_SOS_ID, s.id)
                      loadSosDetail(s.id)
                    }
                  }}
                >
                  <Popup>
                    <div style={{ fontWeight: 800 }}>SOS</div>
                    <div className="mono" style={{ fontSize: 12 }}>
                      {s.id}
                    </div>
                    <div>Ưu tiên: {s.priorityScore}</div>
                    <div>Số người: {s.peopleCount}</div>
                  </Popup>
                </CircleMarker>
              ))}

              {selectedPoint ? (
                <CircleMarker
                  center={[selectedPoint.lat, selectedPoint.lng]}
                  radius={6}
                  pathOptions={{ color: '#ffffff', fillColor: '#ffffff', fillOpacity: 0.9 }}
                />
              ) : null}
            </MapContainer>
          </div>
        </Panel>

        <div className="grid" style={{ alignContent: 'start' }}>
          <Panel title="Bộ lọc / BBox">
            <div className="fieldRow">
              <div className="label">Trạng thái SOS</div>
              <select
                value={filters.sosStatus === '' ? '' : String(filters.sosStatus)}
                onChange={(e) => setFilters((s) => ({ ...s, sosStatus: e.target.value === '' ? '' : Number(e.target.value) }))}
              >
                <option value="">(Tất cả)</option>
                {sosStatusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fieldRow">
              <div className="label">Mức độ vùng ngập</div>
              <select
                value={filters.zoneSeverity === '' ? '' : String(filters.zoneSeverity)}
                onChange={(e) => setFilters((s) => ({ ...s, zoneSeverity: e.target.value === '' ? '' : Number(e.target.value) }))}
              >
                <option value="">(Tất cả)</option>
                {sevOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fieldRow">
              <div className="label">Trạng thái vùng ngập</div>
              <select
                value={filters.zoneStatus === '' ? '' : String(filters.zoneStatus)}
                onChange={(e) => setFilters((s) => ({ ...s, zoneStatus: e.target.value === '' ? '' : Number(e.target.value) }))}
              >
                <option value="">(Tất cả)</option>
                {zoneStatusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="btnRow">
              <button className="btn primary" onClick={() => refreshMapData(bbox)} disabled={busy}>
                Áp dụng & tải lại
              </button>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 10 }}>
              bbox: [{bbox.minLng.toFixed(4)}, {bbox.minLat.toFixed(4)}] → [{bbox.maxLng.toFixed(4)},{' '}
              {bbox.maxLat.toFixed(4)}], zoom={bbox.zoom ?? ''}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Số lượng: SOS={sosItems.length}, Vùng ngập={zones.length}</div>
          </Panel>

          <Panel
            title="Thao tác khi click (cảnh báo + gần nhất)"
            right={
              <input
                style={{ width: 220 }}
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value)
                  localStorage.setItem(LS_ALERT_USER_ID, e.target.value)
                }}
                title="userId dùng để kiểm tra cảnh báo"
              />
            }
          >
            {!selectedPoint ? (
              <div style={{ color: 'var(--muted)' }}>Click vào bản đồ để gọi API kiểm tra cảnh báo & tìm gần nhất.</div>
            ) : (
              <>
                <div className="pill mono">
                  lng={selectedPoint.lng.toFixed(6)}, lat={selectedPoint.lat.toFixed(6)}
                </div>

                <div style={{ height: 10 }} />

                <div className="grid">
                  <div className="panel" style={{ padding: 10 }}>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>Đội cứu hộ gần nhất</div>
                    {nearestTeam ? (
                      <>
                        <div style={{ fontWeight: 800 }}>{nearestTeam.name}</div>
                        <div className="mono" style={{ fontSize: 12 }}>
                          {nearestTeam.id} ({nearestTeam.distanceMeters.toFixed(0)} m)
                        </div>
                        <div className="btnRow" style={{ marginTop: 8 }}>
                          <button
                            className="btn"
                            onClick={() => {
                              localStorage.setItem(LS_LAST_RESCUE_TEAM_ID, nearestTeam.id)
                              setToast({ title: 'Đã lưu', message: 'Đã lưu lastRescueTeamId (dùng ở trang SOS).' })
                            }}
                          >
                            Lưu mã đội
                          </button>
                          <button className="btn" onClick={updateNearestTeamStatusAndLocation} disabled={busy}>
                            Đặt “Bận” + Di chuyển tới đây
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--muted)' }}>Không tìm thấy (có thể 404).</div>
                    )}
                  </div>

                  <div className="panel" style={{ padding: 10 }}>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>Nơi trú ẩn gần nhất</div>
                    {nearestShelter ? (
                      <>
                        <div style={{ fontWeight: 800 }}>{nearestShelter.name}</div>
                        <div className="mono" style={{ fontSize: 12 }}>
                          {nearestShelter.id} ({nearestShelter.distanceMeters.toFixed(0)} m)
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 12 }}>{nearestShelter.address}</div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--muted)' }}>Không tìm thấy (có thể 404).</div>
                    )}
                  </div>

                  <div className="panel" style={{ padding: 10 }}>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>Alerts (GET /api/alerts/check)</div>
                    {!alerts ? (
                      <div style={{ color: 'var(--muted)' }}>Chưa có.</div>
                    ) : alerts.length === 0 ? (
                      <div style={{ color: 'var(--muted)' }}>Không có cảnh báo.</div>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {alerts.map((a) => (
                          <li key={a.floodZoneId}>
                            <span style={{ color: severityColor(a.severity), fontWeight: 900 }}>{a.floodZoneName}</span> —{' '}
                            <span style={{ color: 'var(--muted)' }}>{a.message}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}
          </Panel>

          <Panel title="Vùng ngập (tạo / cập nhật)">
            <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>
              Tạo mới: dùng WKT polygon. Bật “Vẽ vùng” → click 2 điểm để tạo hình chữ nhật.
            </div>
            <div className="fieldRow">
              <div className="label">Tên</div>
              <input value={zoneCreate.name} onChange={(e) => setZoneCreate((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="fieldRow">
              <div className="label">Mức độ</div>
              <select value={zoneCreate.severity} onChange={(e) => setZoneCreate((s) => ({ ...s, severity: Number(e.target.value) }))}>
                {sevOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fieldRow">
              <div className="label">WKT Polygon</div>
              <textarea
                value={zoneCreate.wktPolygon}
                onChange={(e) => setZoneCreate((s) => ({ ...s, wktPolygon: e.target.value }))}
              />
            </div>
            <div className="btnRow">
              <button
                className="btn"
                onClick={() =>
                  setZoneCreate((s) => ({
                    ...s,
                    wktPolygon: rectangleWktFromBounds(bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat)
                  }))
                }
              >
                Lấy bbox đang xem
              </button>
              <button className="btn primary" onClick={createFloodZone} disabled={busy || !zoneCreate.wktPolygon}>
                POST /api/flood-zones
              </button>
            </div>

            <div style={{ height: 12 }} />
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Cập nhật (click polygon để tự điền)</div>
            <div className="fieldRow">
              <div className="label">Mã vùng (guid)</div>
              <input value={zoneUpdateId} onChange={(e) => setZoneUpdateId(e.target.value)} placeholder="guid" />
            </div>
            <div className="fieldRow">
              <div className="label">Tên</div>
              <input value={zoneUpdate.name} onChange={(e) => setZoneUpdate((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="fieldRow">
              <div className="label">Mức độ</div>
              <select value={zoneUpdate.severity} onChange={(e) => setZoneUpdate((s) => ({ ...s, severity: Number(e.target.value) }))}>
                {sevOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fieldRow">
              <div className="label">Trạng thái</div>
              <select value={zoneUpdate.status} onChange={(e) => setZoneUpdate((s) => ({ ...s, status: Number(e.target.value) }))}>
                {zoneStatusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="btnRow">
              <button className="btn" onClick={updateFloodZone} disabled={busy || !zoneUpdateId}>
                PUT /api/flood-zones/{'{id}'}
              </button>
            </div>
          </Panel>

          <Panel title="Nơi trú ẩn (tạo / cập nhật)">
            <div className="fieldRow">
              <div className="label">Tên</div>
              <input value={shelterCreate.name} onChange={(e) => setShelterCreate((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="fieldRow">
              <div className="label">Địa chỉ</div>
              <input value={shelterCreate.address} onChange={(e) => setShelterCreate((s) => ({ ...s, address: e.target.value }))} />
            </div>
            <div className="fieldRow">
              <div className="label">Kinh độ / Vĩ độ</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  type="number"
                  value={shelterCreate.longitude}
                  onChange={(e) => setShelterCreate((s) => ({ ...s, longitude: Number(e.target.value) }))}
                />
                <input
                  type="number"
                  value={shelterCreate.latitude}
                  onChange={(e) => setShelterCreate((s) => ({ ...s, latitude: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="fieldRow">
              <div className="label">Sức chứa</div>
              <input
                type="number"
                value={shelterCreate.capacity}
                onChange={(e) => setShelterCreate((s) => ({ ...s, capacity: Number(e.target.value) }))}
              />
            </div>
            <div className="btnRow">
              <label className="pill">
                <input
                  type="checkbox"
                  checked={shelterCreate.hasMedicalSupport}
                  onChange={(e) => setShelterCreate((s) => ({ ...s, hasMedicalSupport: e.target.checked }))}
                />{' '}
                Hỗ trợ y tế
              </label>
              <button className="btn primary" onClick={createShelter} disabled={busy}>
                POST /api/shelters
              </button>
            </div>

            <div style={{ height: 12 }} />
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Cập nhật</div>
            <div className="fieldRow">
              <div className="label">Mã nơi trú ẩn (guid)</div>
              <input value={shelterUpdateId} onChange={(e) => setShelterUpdateId(e.target.value)} placeholder="guid" />
            </div>
            <div className="fieldRow">
              <div className="label">Tên</div>
              <input value={shelterUpdate.name} onChange={(e) => setShelterUpdate((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="fieldRow">
              <div className="label">Địa chỉ</div>
              <input value={shelterUpdate.address} onChange={(e) => setShelterUpdate((s) => ({ ...s, address: e.target.value }))} />
            </div>
            <div className="fieldRow">
              <div className="label">Sức chứa / Đang ở</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  type="number"
                  value={shelterUpdate.capacity}
                  onChange={(e) => setShelterUpdate((s) => ({ ...s, capacity: Number(e.target.value) }))}
                />
                <input
                  type="number"
                  value={shelterUpdate.currentOccupancy}
                  onChange={(e) => setShelterUpdate((s) => ({ ...s, currentOccupancy: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="fieldRow">
              <div className="label">Trạng thái</div>
              <select value={shelterUpdate.status} onChange={(e) => setShelterUpdate((s) => ({ ...s, status: Number(e.target.value) }))}>
                {shelterStatusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="btnRow">
              <button className="btn" onClick={updateShelter} disabled={busy || !shelterUpdateId}>
                PUT /api/shelters/{'{id}'}
              </button>
            </div>
          </Panel>

          <Panel title="Thao tác nhanh SOS">
            <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>
              Click marker SOS để tải chi tiết. Mã SOS được lưu localStorage để dùng ở trang SOS.
            </div>
            <div className="fieldRow">
              <div className="label">Mã SOS đang chọn (guid)</div>
              <input value={selectedSosId} onChange={(e) => setSelectedSosId(e.target.value)} placeholder="guid" />
            </div>
            <div className="fieldRow">
              <div className="label">Trạng thái</div>
              <select value={sosStatusUpdate} onChange={(e) => setSosStatusUpdate(Number(e.target.value))}>
                {sosStatusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="btnRow">
              <button className="btn" onClick={() => loadSosDetail(selectedSosId)} disabled={busy || !selectedSosId}>
                GET /api/sos/{'{id}'}
              </button>
              <button className="btn primary" onClick={updateSelectedSosStatus} disabled={busy || !selectedSosId}>
                PATCH /api/sos/{'{id}'}/status
              </button>
            </div>
            {selectedSosDetail ? (
              <div className="panel" style={{ padding: 10, marginTop: 10 }}>
                <div style={{ fontWeight: 900 }}>{selectedSosDetail.addressText || '(không có địa chỉ)'}</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
                  citizenId={selectedSosDetail.citizenId} • ưu tiên={selectedSosDetail.priorityScore} • số người={selectedSosDetail.peopleCount}
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel title="Trạng thái đội cứu hộ (tham khảo)">
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>
              (Để test PATCH/PUT rescue-teams nhanh) {teamStatusOptions.map((x) => `${x.label}=${x.value}`).join(' • ')}
            </div>
          </Panel>
        </div>
      </div>

      <Toast value={toast} onClear={() => setToast(null)} />
    </>
  )
}
