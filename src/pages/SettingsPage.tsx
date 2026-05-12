import { useMemo, useState } from 'react'
import { Panel } from '../components/Panel'
import { Toast, type ToastState } from '../components/Toast'
import { api, ApiError } from '../lib/api'
import { clearApiBaseUrl, getApiBaseUrl, setApiBaseUrl } from '../lib/config'

export default function SettingsPage() {
  const [toast, setToast] = useState<ToastState>(null)
  const initial = useMemo(() => getApiBaseUrl(), [])
  const [baseUrl, setBaseUrl] = useState(initial)
  const [testing, setTesting] = useState(false)

  async function testConnection() {
    setTesting(true)
    try {
      await api.dashboardSummary()
      setToast({ title: 'OK', message: 'Kết nối API thành công (dashboard summary).' })
    } catch (e) {
      const msg = e instanceof ApiError ? e.payloadText : String(e)
      setToast({ title: 'Kiểm tra thất bại', message: msg })
    } finally {
      setTesting(false)
    }
  }

  function save() {
    setApiBaseUrl(baseUrl)
    setToast({ title: 'Đã lưu', message: `API base URL: ${getApiBaseUrl()}` })
  }

  function reset() {
    clearApiBaseUrl()
    setBaseUrl(getApiBaseUrl())
    setToast({ title: 'Đã đặt lại', message: 'Đã xoá override trong localStorage.' })
  }

  return (
    <>
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Cài đặt</div>
          <div className="pageHint">
            FE gọi API qua `VITE_API_BASE_URL` (env) hoặc override trong localStorage.
          </div>
        </div>
      </div>

      <div className="grid cols2">
        <Panel title="API Base URL">
          <div className="fieldRow">
            <div className="label">Base URL</div>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://localhost:5001"
            />
          </div>
          <div className="btnRow">
            <button className="btn primary" onClick={save}>
              Lưu
            </button>
            <button className="btn" onClick={reset}>
              Xoá override
            </button>
            <button className="btn" onClick={testConnection} disabled={testing}>
              {testing ? 'Đang kiểm tra…' : 'Kiểm tra'}
            </button>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 10 }}>
            Gợi ý: BE đã cấu hình CORS cho `http://localhost:5173` trong `src/Web/appsettings.json`.
          </div>
        </Panel>

        <Panel title="Ghi chú">
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)', fontSize: 13 }}>
            <li>Nếu BE chạy HTTPS self-signed, trình duyệt có thể chặn trước khi bạn “trust” cert.</li>
            <li>Đảm bảo BE chạy đúng port, ví dụ `https://localhost:5001`.</li>
            <li>Trang Map/SOS có lưu “selected point / ids” qua localStorage để thao tác nhanh.</li>
          </ul>
        </Panel>
      </div>

      <Toast value={toast} onClear={() => setToast(null)} />
    </>
  )
}
