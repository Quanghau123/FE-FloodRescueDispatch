# Flood Rescue Dispatch - Frontend (React)

Frontend này **tách riêng** backend, dùng để thao tác trực quan và gọi toàn bộ API trong `src/Web/Controllers` (18 endpoints).

## Chạy nhanh

1) Backend (ASP.NET Core) chạy trước (ví dụ `https://localhost:5001`).
2) Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Nếu `npm install` bị lỗi kiểu `ENOTCACHED` thì máy bạn đang bật npm offline mode. Tắt bằng:
`npm config set offline false`

Mặc định FE đọc base URL từ `VITE_API_BASE_URL` trong `.env` hoặc bạn có thể đổi trực tiếp trong trang **Settings** (lưu vào localStorage).

## Những trang chính

- **Dashboard**: `GET /api/dashboard/summary`
- **Map**:
  - Tự gọi theo bbox khi pan/zoom:
    - `GET /api/map/sos`
    - `GET /api/flood-zones/map`
  - Click map để gọi:
    - `GET /api/alerts/check`
    - `GET /api/rescue-teams/nearest`
    - `GET /api/shelters/nearest`
  - CRUD nhanh:
    - `POST /api/flood-zones`
    - `PUT /api/flood-zones/{id}`
    - `POST /api/shelters`
    - `PUT /api/shelters/{id}`
  - Quick action:
    - `PATCH /api/sos/{id}/status`
    - `PATCH /api/rescue-teams/{id}/status`
    - `PUT /api/rescue-teams/{id}/location`
- **SOS**:
  - `POST /api/sos`
  - `GET /api/sos`
  - `GET /api/sos/{id}`
  - `POST /api/sos/{id}/cancel`
  - `PATCH /api/sos/{id}/status`
  - `POST /api/dispatch/sos/{sosRequestId}/assign`

## Hướng dẫn chi tiết từng API

Xem `docs/HUONG_DAN_API.md`.

## Lưu ý

- CORS: backend đã có `Cors:AllowedOrigins` cho `http://localhost:5173` trong `src/Web/appsettings.json`.
- Map có lưu nhanh vào localStorage:
  - `frd.lastPoint` (lng/lat)
  - `frd.lastRescueTeamId`
  - `frd.lastSosId`
  - `frd.alertUserId`
