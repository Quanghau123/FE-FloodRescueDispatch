import { useEffect, useState } from 'react'
import { Panel } from '../components/Panel'
import { Toast, type ToastState } from '../components/Toast'
import { api, ApiError } from '../lib/api'
import type { DashboardSummaryResponse } from '../lib/types'

function StatCard(props: { label: string; value: number; tone?: 'accent' | 'ok' | 'danger' }) {
  const border =
    props.tone === 'ok'
      ? 'rgba(65,211,146,.35)'
      : props.tone === 'danger'
        ? 'rgba(255,92,122,.35)'
        : 'rgba(79,140,255,.35)'
  const bg =
    props.tone === 'ok'
      ? 'rgba(65,211,146,.12)'
      : props.tone === 'danger'
        ? 'rgba(255,92,122,.12)'
        : 'rgba(79,140,255,.12)'

  return (
    <div className="panel" style={{ padding: 12, borderColor: border, background: bg }}>
      <div style={{ color: 'var(--muted)', fontSize: 12 }}>{props.label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{props.value}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null)

  async function load() {
    setLoading(true)
    try {
      setSummary(await api.dashboardSummary())
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Tải bảng điều khiển thất bại', message: msg })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <>
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Bảng điều khiển</div>
          <div className="pageHint">Gọi API: `GET /api/dashboard/summary`</div>
        </div>
        <div className="btnRow">
          <button className="btn primary" onClick={load} disabled={loading}>
            {loading ? 'Đang tải…' : 'Tải lại'}
          </button>
        </div>
      </div>

      <Panel
        title="Tổng quan"
        right={
          <span className="pill">
            {summary ? `Đã cập nhật` : `Chưa có dữ liệu`}
          </span>
        }
      >
        {!summary ? (
          <div style={{ color: 'var(--muted)' }}>Chưa có dữ liệu. Bấm “Tải lại”.</div>
        ) : (
          <div className="grid cols3">
            <StatCard label="SOS chờ xử lý" value={summary.pendingSosCount} tone="danger" />
            <StatCard label="SOS đã phân công" value={summary.assignedSosCount} />
            <StatCard label="SOS đang xử lý" value={summary.inProgressSosCount} />
            <StatCard label="SOS đã giải quyết" value={summary.resolvedSosCount} tone="ok" />
            <StatCard label="Đội cứu hộ sẵn sàng" value={summary.availableTeamCount} tone="ok" />
            <StatCard label="Vùng ngập đang hoạt động" value={summary.activeFloodZoneCount} />
          </div>
        )}
      </Panel>

      <Toast value={toast} onClear={() => setToast(null)} />
    </>
  )
}
