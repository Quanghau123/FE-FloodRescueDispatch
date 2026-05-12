import { useEffect, useMemo, useState } from 'react'
import JsonView from '../components/JsonView'
import { Panel } from '../components/Panel'
import { Toast, type ToastState } from '../components/Toast'
import { api, ApiError } from '../lib/api'
import { RESCUE_TEAM_STATUS_OPTIONS, SOS_STATUS_OPTIONS, labelFromOptions, RescueTeamStatus, SosStatus } from '../lib/enums'
import type {
  AssignRescueTeamRequest,
  CreateSosRequest,
  PagedResponse,
  SosDetailResponse,
  SosSummaryResponse
} from '../lib/types'

const LS_LAST_POINT = 'frd.lastPoint'
const LS_LAST_RESCUE_TEAM_ID = 'frd.lastRescueTeamId'
const LS_LAST_SOS_ID = 'frd.lastSosId'

function getLastPoint(): { lng: number; lat: number } | null {
  try {
    const raw = localStorage.getItem(LS_LAST_POINT)
    if (!raw) return null
    const obj = JSON.parse(raw) as { lng: number; lat: number }
    if (typeof obj.lng !== 'number' || typeof obj.lat !== 'number') return null
    return obj
  } catch {
    return null
  }
}

export default function SosPage() {
  const [toast, setToast] = useState<ToastState>(null)
  const [busy, setBusy] = useState(false)

  const sosStatusOptions = useMemo(() => SOS_STATUS_OPTIONS, [])

  const [createForm, setCreateForm] = useState<CreateSosRequest>(() => {
    const p = getLastPoint()
    return {
      citizenId: crypto.randomUUID(),
      longitude: p?.lng ?? 106.70098,
      latitude: p?.lat ?? 10.77653,
      addressText: '',
      description: '',
      peopleCount: 1,
      hasInjuredPeople: false,
      hasChildren: false,
      hasElderly: false
    }
  })

  const [search, setSearch] = useState(() => ({
    status: '' as '' | number,
    createdFrom: '' as string,
    createdTo: '' as string,
    page: 1,
    pageSize: 20
  }))
  const [searchResult, setSearchResult] = useState<PagedResponse<SosSummaryResponse> | null>(null)

  const [selectedId, setSelectedId] = useState<string>(() => localStorage.getItem(LS_LAST_SOS_ID) ?? '')
  const [detail, setDetail] = useState<SosDetailResponse | null>(null)

  const [cancelCitizenId, setCancelCitizenId] = useState('')
  const [nextStatus, setNextStatus] = useState<number>(SosStatus.InProgress)

  const [assign, setAssign] = useState<AssignRescueTeamRequest>(() => ({
    rescueTeamId: localStorage.getItem(LS_LAST_RESCUE_TEAM_ID) ?? '',
    note: ''
  }))
  const [teamQuickStatus, setTeamQuickStatus] = useState<number>(RescueTeamStatus.Busy)

  useEffect(() => {
    if (detail?.citizenId) setCancelCitizenId(detail.citizenId)
  }, [detail?.citizenId])

  async function doCreate() {
    setBusy(true)
    try {
      const created = await api.createSos(createForm)
      setToast({ title: 'Đã tạo SOS', message: 'Đã tạo SOS (201 Created).' })
      const id = (created as any)?.id as string | undefined
      if (id) {
        localStorage.setItem(LS_LAST_SOS_ID, id)
        setSelectedId(id)
        setDetail(created as SosDetailResponse)
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Tạo SOS thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  async function doSearch() {
    setBusy(true)
    try {
      const createdFromIso = search.createdFrom ? new Date(search.createdFrom).toISOString() : null
      const createdToIso = search.createdTo ? new Date(search.createdTo).toISOString() : null
      const res = await api.searchSos({
        status: search.status === '' ? null : search.status,
        createdFrom: createdFromIso,
        createdTo: createdToIso,
        page: search.page,
        pageSize: search.pageSize
      })
      setSearchResult(res as PagedResponse<SosSummaryResponse>)
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Tìm kiếm thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  async function loadDetail(id: string) {
    if (!id) return
    setBusy(true)
    try {
      const res = await api.getSosById(id)
      setDetail(res as SosDetailResponse)
      localStorage.setItem(LS_LAST_SOS_ID, id)
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Tải chi tiết thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  async function doCancel() {
    if (!selectedId || !cancelCitizenId) return
    setBusy(true)
    try {
      await api.cancelSos(selectedId, cancelCitizenId)
      setToast({ title: 'Đã hủy SOS', message: 'Đã gọi `POST /api/sos/{id}/cancel` (204).' })
      await loadDetail(selectedId)
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Hủy thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  async function doUpdateStatus() {
    if (!selectedId) return
    setBusy(true)
    try {
      await api.updateSosStatus(selectedId, nextStatus)
      setToast({ title: 'Đã cập nhật trạng thái', message: 'Đã gọi `PATCH /api/sos/{id}/status` (204).' })
      await loadDetail(selectedId)
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Cập nhật trạng thái thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  async function doAssignRescueTeam() {
    if (!selectedId || !assign.rescueTeamId) return
    setBusy(true)
    try {
      await api.assignRescueTeam(selectedId, assign)
      localStorage.setItem(LS_LAST_RESCUE_TEAM_ID, assign.rescueTeamId)
      setToast({ title: 'Đã phân công đội cứu hộ', message: 'Đã gọi `POST /api/dispatch/sos/{id}/assign` (204).' })
      await loadDetail(selectedId)
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Phân công thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  async function quickSetTeamBusyAndLocationFromMap() {
    const teamId = assign.rescueTeamId
    const p = getLastPoint()
    if (!teamId || !p) return
    setBusy(true)
    try {
      await api.updateRescueTeamStatus(teamId, { status: teamQuickStatus })
      await api.updateRescueTeamLocation(teamId, { longitude: p.lng, latitude: p.lat })
      setToast({ title: 'Đã cập nhật đội cứu hộ', message: 'Đã gọi cập nhật trạng thái + vị trí cho đội cứu hộ.' })
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Cập nhật đội cứu hộ thất bại', message: msg })
    } finally {
      setBusy(false)
    }
  }

  function usePointFromMap() {
    const p = getLastPoint()
    if (!p) {
      setToast({ title: 'Chưa có điểm từ bản đồ', message: 'Mở tab “Bản đồ” và click vào bản đồ 1 lần để lưu điểm.' })
      return
    }
    setCreateForm((s) => ({ ...s, longitude: p.lng, latitude: p.lat }))
  }

  return (
    <>
      <div className="pageHeader">
        <div>
          <div className="pageTitle">SOS</div>
          <div className="pageHint">Tạo / Tìm kiếm / Chi tiết / Hủy / Cập nhật trạng thái / Phân công đội cứu hộ</div>
        </div>
      </div>

      <div className="grid cols2">
        <Panel
          title="Tạo SOS"
          right={
            <button className="btn" onClick={usePointFromMap}>
              Lấy điểm từ bản đồ
            </button>
          }
        >
          <div className="fieldRow">
            <div className="label">CitizenId (guid)</div>
            <input value={createForm.citizenId} onChange={(e) => setCreateForm({ ...createForm, citizenId: e.target.value })} />
          </div>
          <div className="fieldRow">
            <div className="label">Kinh độ (lng)</div>
            <input
              type="number"
              value={createForm.longitude}
              onChange={(e) => setCreateForm({ ...createForm, longitude: Number(e.target.value) })}
            />
          </div>
          <div className="fieldRow">
            <div className="label">Vĩ độ (lat)</div>
            <input
              type="number"
              value={createForm.latitude}
              onChange={(e) => setCreateForm({ ...createForm, latitude: Number(e.target.value) })}
            />
          </div>
          <div className="fieldRow">
            <div className="label">Số người</div>
            <input
              type="number"
              value={createForm.peopleCount}
              onChange={(e) => setCreateForm({ ...createForm, peopleCount: Number(e.target.value) })}
            />
          </div>
          <div className="fieldRow">
            <div className="label">Địa chỉ</div>
            <input
              value={createForm.addressText ?? ''}
              onChange={(e) => setCreateForm({ ...createForm, addressText: e.target.value })}
            />
          </div>
          <div className="fieldRow">
            <div className="label">Mô tả</div>
            <textarea
              value={createForm.description ?? ''}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            />
          </div>
          <div className="btnRow">
            <label className="pill">
              <input
                type="checkbox"
                checked={createForm.hasInjuredPeople}
                onChange={(e) => setCreateForm({ ...createForm, hasInjuredPeople: e.target.checked })}
              />{' '}
              Có người bị thương
            </label>
            <label className="pill">
              <input
                type="checkbox"
                checked={createForm.hasChildren}
                onChange={(e) => setCreateForm({ ...createForm, hasChildren: e.target.checked })}
              />{' '}
              Có trẻ em
            </label>
            <label className="pill">
              <input
                type="checkbox"
                checked={createForm.hasElderly}
                onChange={(e) => setCreateForm({ ...createForm, hasElderly: e.target.checked })}
              />{' '}
              Có người cao tuổi
            </label>
          </div>
          <div className="btnRow" style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={doCreate} disabled={busy}>
              {busy ? 'Đang xử lý…' : 'POST /api/sos'}
            </button>
          </div>
        </Panel>

        <Panel title="Tìm kiếm SOS (GET /api/sos)">
          <div className="fieldRow">
            <div className="label">Trạng thái</div>
            <select
              value={search.status === '' ? '' : String(search.status)}
              onChange={(e) => setSearch((s) => ({ ...s, status: e.target.value === '' ? '' : Number(e.target.value) }))}
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
            <div className="label">Từ thời điểm</div>
            <input
              type="datetime-local"
              value={search.createdFrom}
              onChange={(e) => setSearch((s) => ({ ...s, createdFrom: e.target.value }))}
            />
          </div>
          <div className="fieldRow">
            <div className="label">Đến thời điểm</div>
            <input
              type="datetime-local"
              value={search.createdTo}
              onChange={(e) => setSearch((s) => ({ ...s, createdTo: e.target.value }))}
            />
          </div>
          <div className="fieldRow">
            <div className="label">Trang / Kích thước</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                type="number"
                value={search.page}
                min={1}
                onChange={(e) => setSearch((s) => ({ ...s, page: Number(e.target.value) }))}
              />
              <input
                type="number"
                value={search.pageSize}
                min={1}
                max={200}
                onChange={(e) => setSearch((s) => ({ ...s, pageSize: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="btnRow">
            <button className="btn primary" onClick={doSearch} disabled={busy}>
              {busy ? 'Đang xử lý…' : 'Tìm kiếm'}
            </button>
          </div>

          {searchResult ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}>
                Tổng: {searchResult.totalItems} (số trang: {searchResult.totalPages})
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Trạng thái</th>
                    <th>Ưu tiên</th>
                    <th>Số người</th>
                    <th>Thời gian tạo</th>
                  </tr>
                </thead>
                <tbody>
              {searchResult.items.map((x) => (
                <tr key={x.id} style={{ cursor: 'pointer' }} onClick={() => (setSelectedId(x.id), loadDetail(x.id))}>
                  <td className="mono">{x.id.slice(0, 8)}…</td>
                  <td>
                        <span className="pill">{labelFromOptions(SOS_STATUS_OPTIONS, x.status)}</span>
                  </td>
                  <td>{x.priorityScore}</td>
                  <td>{x.peopleCount}</td>
                  <td className="mono">{new Date(x.createdAt).toLocaleString()}</td>
                </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>Chưa tìm kiếm.</div>
          )}
        </Panel>
      </div>

      <div style={{ height: 12 }} />

      <div className="grid cols2">
        <Panel
          title="Chi tiết (GET /api/sos/{id})"
          right={
            <div className="btnRow">
              <input
                style={{ width: 340 }}
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                placeholder="Mã SOS (guid)"
              />
              <button className="btn" onClick={() => loadDetail(selectedId)} disabled={busy || !selectedId}>
                Tải
              </button>
            </div>
          }
        >
          {!detail ? <div style={{ color: 'var(--muted)' }}>Chưa có detail.</div> : <JsonView value={detail} />}
        </Panel>

        <Panel title="Thao tác">
          <div className="fieldRow">
            <div className="label">CitizenId để hủy (guid)</div>
            <input value={cancelCitizenId} onChange={(e) => setCancelCitizenId(e.target.value)} placeholder="guid" />
          </div>
          <div className="btnRow">
            <button className="btn danger" onClick={doCancel} disabled={busy || !selectedId || !cancelCitizenId}>
              POST /api/sos/{'{id}'}/cancel
            </button>
          </div>

          <div style={{ height: 10 }} />

          <div className="fieldRow">
            <div className="label">Cập nhật trạng thái SOS</div>
            <select value={nextStatus} onChange={(e) => setNextStatus(Number(e.target.value))}>
              {sosStatusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="btnRow">
            <button className="btn" onClick={doUpdateStatus} disabled={busy || !selectedId}>
              PATCH /api/sos/{'{id}'}/status
            </button>
          </div>

          <div style={{ height: 12 }} />
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Phân công điều phối</div>
          <div className="fieldRow">
            <div className="label">RescueTeamId</div>
            <input
              value={assign.rescueTeamId}
              onChange={(e) => setAssign((s) => ({ ...s, rescueTeamId: e.target.value }))}
              placeholder="guid"
            />
          </div>
          <div className="fieldRow">
            <div className="label">Ghi chú</div>
            <input value={assign.note ?? ''} onChange={(e) => setAssign((s) => ({ ...s, note: e.target.value }))} />
          </div>
          <div className="btnRow">
            <button className="btn primary" onClick={doAssignRescueTeam} disabled={busy || !selectedId || !assign.rescueTeamId}>
              POST /api/dispatch/sos/{'{id}'}/assign
            </button>
          </div>

          <div style={{ height: 12 }} />
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Thao tác nhanh đội cứu hộ</div>
          <div className="fieldRow">
            <div className="label">Trạng thái đội</div>
            <select value={teamQuickStatus} onChange={(e) => setTeamQuickStatus(Number(e.target.value))}>
              {RESCUE_TEAM_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="btnRow">
            <button className="btn" onClick={quickSetTeamBusyAndLocationFromMap} disabled={busy || !assign.rescueTeamId}>
              PATCH/PUT rescue-teams (dùng điểm từ Bản đồ)
            </button>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
            Mẹo: vào Map → click để lưu `lastPoint`, và nearest rescue team để lấy `lastRescueTeamId`.
          </div>
        </Panel>
      </div>

      <Toast value={toast} onClear={() => setToast(null)} />
    </>
  )
}
