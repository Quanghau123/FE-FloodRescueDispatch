# Hướng dẫn sử dụng UI + dữ liệu mẫu (theo từng API)

## Chuẩn bị

1) Mở tab **Cài đặt** và set `API Base URL` trỏ đến backend, ví dụ:

- `https://localhost:5001`

2) Nếu backend chạy HTTPS self-signed: mở trực tiếp `https://localhost:5001/swagger` trong trình duyệt để “trust” cert trước, rồi quay lại FE.

---

## Bảng enum (giá trị số BE dùng)

- `SosStatus`: `Pending=1`, `Assigned=2`, `InProgress=3`, `Resolved=4`, `Cancelled=5`
- `FloodSeverity`: `Low=1`, `Medium=2`, `High=3`, `Critical=4`
- `FloodZoneStatus`: `Draft=1`, `Active=2`, `Resolved=3`, `Archived=4`
- `RescueTeamStatus`: `Available=1`, `Busy=2`, `Offline=3`
- `ShelterStatus`: `Open=1`, `Full=2`, `Closed=3`

---

## 1) `GET /api/dashboard/summary`

**UI thao tác**
- Tab **Bảng điều khiển** → bấm **Tải lại**

**Kết quả**
- Hiển thị các số liệu: SOS theo trạng thái, số đội cứu hộ sẵn sàng, số vùng ngập đang hoạt động.

---

## 2) `GET /api/map/sos`

**UI thao tác**
- Tab **Bản đồ**
  - Pan/zoom bản đồ để đổi bbox (UI sẽ tự gọi lại)
  - Hoặc bấm **Tải lại**
  - Dùng bộ lọc **Trạng thái SOS**

**Dữ liệu mẫu (query)**
- `minLng=106.63&minLat=10.70&maxLng=106.79&maxLat=10.82&zoom=12&status=1`

**Kết quả**
- Vẽ các SOS dưới dạng marker tròn; click marker để load chi tiết (xem mục 16).

---

## 3) `GET /api/flood-zones/map`

**UI thao tác**
- Tab **Bản đồ**
  - Pan/zoom hoặc bấm **Tải lại**
  - Dùng bộ lọc **Mức độ vùng ngập**, **Trạng thái vùng ngập**

**Dữ liệu mẫu (query)**
- `minLng=106.63&minLat=10.70&maxLng=106.79&maxLat=10.82&zoom=12&severity=3&status=2`

**Kết quả**
- Vẽ polygon vùng ngập (màu theo severity). Click polygon để tự điền form cập nhật (mục 5).

---

## 4) `GET /api/alerts/check`

**UI thao tác**
- Tab **Bản đồ** → click 1 điểm trên bản đồ
- Panel **Thao tác khi click** sẽ tự gọi `alerts/check`
  - Trường `userId` (ô bên phải tiêu đề) sẽ tự tạo; bạn có thể sửa nếu muốn

**Dữ liệu mẫu (query)**
- `userId=11111111-1111-1111-1111-111111111111&longitude=106.70098&latitude=10.77653`

**Kết quả**
- Danh sách cảnh báo theo vùng ngập (tên vùng + message).

---

## 5) `POST /api/flood-zones`

**UI thao tác**
- Tab **Bản đồ** → Panel **Vùng ngập (tạo / cập nhật)**
  - Có thể bật **Vẽ vùng: BẬT** → click 2 điểm để tạo hình chữ nhật (WKT)
  - Bấm **POST /api/flood-zones**

**Dữ liệu mẫu (body JSON)**
```json
{
  "name": "Ngập khu A",
  "severity": 3,
  "wktPolygon": "POLYGON((106.69 10.77, 106.71 10.77, 106.71 10.78, 106.69 10.78, 106.69 10.77))",
  "description": "Nước dâng nhanh"
}
```

**Kết quả**
- Toast hiển thị `id` vùng mới. Bản đồ refresh sẽ thấy polygon.

---

## 6) `PUT /api/flood-zones/{id}`

**UI thao tác**
- Tab **Bản đồ** → click polygon để tự điền
- Nhập/kiểm tra **Mã vùng (guid)** rồi bấm **PUT /api/flood-zones/{id}**

**Dữ liệu mẫu (path + body JSON)**
- Path: `/api/flood-zones/22222222-2222-2222-2222-222222222222`
```json
{
  "name": "Ngập khu A (cập nhật)",
  "severity": 4,
  "status": 2,
  "wktPolygon": null,
  "description": "Mức độ nghiêm trọng"
}
```

**Kết quả**
- `204 NoContent`, polygon trên map sẽ đổi màu theo severity khi refresh.

---

## 7) `GET /api/rescue-teams/nearest`

**UI thao tác**
- Tab **Bản đồ** → click 1 điểm
- Panel **Thao tác khi click** hiển thị **Đội cứu hộ gần nhất**
  - Bấm **Lưu mã đội** để lưu `lastRescueTeamId` (dùng nhanh ở tab SOS)

**Dữ liệu mẫu (query)**
- `longitude=106.70098&latitude=10.77653&radiusMeters=20000`

**Kết quả**
- Trả về đội gần nhất + `distanceMeters`. Nếu không có có thể `404`.

---

## 8) `PATCH /api/rescue-teams/{id}/status`

**UI thao tác**
- Tab **Bản đồ** → click điểm để lấy **Đội cứu hộ gần nhất**
- Bấm **Đặt Busy + Di chuyển tới đây** (UI sẽ gọi status trước)

**Dữ liệu mẫu (path + body JSON)**
- Path: `/api/rescue-teams/33333333-3333-3333-3333-333333333333/status`
```json
{ "status": 2 }
```

---

## 9) `PUT /api/rescue-teams/{id}/location`

**UI thao tác**
- Tab **Bản đồ** → bấm **Đặt Busy + Di chuyển tới đây** (UI sẽ gọi location sau)

**Dữ liệu mẫu (path + body JSON)**
- Path: `/api/rescue-teams/33333333-3333-3333-3333-333333333333/location`
```json
{ "longitude": 106.70098, "latitude": 10.77653 }
```

---

## 10) `GET /api/shelters/nearest`

**UI thao tác**
- Tab **Bản đồ** → click 1 điểm
- Panel **Thao tác khi click** hiển thị **Nơi trú ẩn gần nhất**

**Dữ liệu mẫu (query)**
- `longitude=106.70098&latitude=10.77653&radiusMeters=10000`

**Kết quả**
- Trả về nơi trú ẩn gần nhất + `availableSlots`. Nếu không có có thể `404`.

---

## 11) `POST /api/shelters`

**UI thao tác**
- Tab **Bản đồ** → click 1 điểm (UI tự điền lng/lat cho form tạo shelter)
- Panel **Nơi trú ẩn (tạo / cập nhật)** → bấm **POST /api/shelters**

**Dữ liệu mẫu (body JSON)**
```json
{
  "name": "Trường học B",
  "address": "123 Nguyễn Văn A, Q.1",
  "longitude": 106.70098,
  "latitude": 10.77653,
  "capacity": 200,
  "contactPhone": "0900000000",
  "hasMedicalSupport": true
}
```

---

## 12) `PUT /api/shelters/{id}`

**UI thao tác**
- Tab **Bản đồ** → Panel **Nơi trú ẩn (tạo / cập nhật)** (phần “Cập nhật”)
- Nhập **Mã nơi trú ẩn (guid)** → bấm **PUT /api/shelters/{id}**

**Dữ liệu mẫu (path + body JSON)**
- Path: `/api/shelters/44444444-4444-4444-4444-444444444444`
```json
{
  "name": "Trường học B (cập nhật)",
  "address": "123 Nguyễn Văn A, Q.1",
  "capacity": 200,
  "currentOccupancy": 120,
  "status": 1,
  "contactPhone": "0900000000",
  "hasMedicalSupport": true
}
```

---

## 13) `POST /api/sos`

**UI thao tác**
- Tab **SOS** → Panel **Tạo SOS**
  - Có thể bấm **Lấy điểm từ bản đồ** để dùng điểm đã click ở tab Bản đồ
  - Bấm **POST /api/sos**

**Dữ liệu mẫu (body JSON)**
```json
{
  "citizenId": "55555555-5555-5555-5555-555555555555",
  "longitude": 106.70098,
  "latitude": 10.77653,
  "addressText": "Gần công viên",
  "description": "Nhà bị ngập, cần hỗ trợ",
  "peopleCount": 3,
  "hasInjuredPeople": false,
  "hasChildren": true,
  "hasElderly": false
}
```

**Kết quả**
- `201 Created` + trả về chi tiết SOS. UI tự lưu `lastSosId`.

---

## 14) `GET /api/sos`

**UI thao tác**
- Tab **SOS** → Panel **Tìm kiếm SOS**
  - Chọn **Trạng thái**, khoảng thời gian (tùy chọn)
  - Bấm **Tìm kiếm**
  - Click 1 dòng để load chi tiết (mục 15)

**Dữ liệu mẫu (query)**
- `status=1&page=1&pageSize=20`

---

## 15) `GET /api/sos/{id}`

**UI thao tác**
- Tab **SOS** → Panel **Chi tiết**
  - Nhập **Mã SOS (guid)** → bấm **Tải**

**Dữ liệu mẫu (path)**
- `/api/sos/66666666-6666-6666-6666-666666666666`

---

## 16) `PATCH /api/sos/{id}/status`

**UI thao tác (cách 1)**
- Tab **SOS** → Panel **Thao tác**
  - Chọn trạng thái → bấm **PATCH /api/sos/{id}/status**

**UI thao tác (cách 2)**
- Tab **Bản đồ** → Panel **Thao tác nhanh SOS**

**Dữ liệu mẫu (query)**
- `status=3` (InProgress)

---

## 17) `POST /api/sos/{id}/cancel`

**UI thao tác**
- Tab **SOS** → Panel **Thao tác**
  - Nhập `CitizenId để hủy` (thường UI tự điền theo detail)
  - Bấm **POST /api/sos/{id}/cancel**

**Dữ liệu mẫu (query)**
- `citizenId=55555555-5555-5555-5555-555555555555`

---

## 18) `POST /api/dispatch/sos/{sosRequestId}/assign`

**UI thao tác**
- Tab **SOS** → Panel **Thao tác**
  - Nhập `RescueTeamId` (có thể lấy nhanh từ tab Bản đồ → “Lưu mã đội”)
  - Bấm **POST /api/dispatch/sos/{id}/assign**

**Dữ liệu mẫu (body JSON)**
```json
{
  "rescueTeamId": "33333333-3333-3333-3333-333333333333",
  "note": "Ưu tiên hỗ trợ trẻ em"
}
```

