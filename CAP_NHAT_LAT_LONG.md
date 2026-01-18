# 📍 Cập Nhật Latitude/Longitude

## 🎯 2 Cách Cập Nhật Lat/Long

### ✅ Cách 1: Tự Động Populate (Khuyến nghị)

**Script tự động geocode và điền lat/long cho tất cả records:**

```powershell
cd d:\vnss_tms\backend
.venv\Scripts\python.exe -m scripts.populate_coordinates
```

**Script này sẽ:**
- ✅ Tự động tìm tất cả Location và Site chưa có coordinates
- ✅ Geocode từ địa chỉ → lấy lat/long
- ✅ Update vào database
- ✅ Hiển thị kết quả: bao nhiêu thành công, bao nhiêu thất bại

**Ưu điểm:**
- Nhanh, tự động
- Không cần nhập thủ công
- Có thể chạy lại nhiều lần (chỉ update records chưa có coordinates)

---

### ✅ Cách 2: Cập Nhật Thủ Công qua Database

**Nếu muốn sửa thủ công hoặc sửa từng record:**

#### Option A: Dùng SQL trực tiếp

Mở PostgreSQL (pgAdmin/DBeaver) và chạy:

```sql
-- Update Location
UPDATE locations 
SET latitude = 10.7769, longitude = 106.7009
WHERE code = 'LOC001';

-- Update Site
UPDATE sites 
SET latitude = 10.7769, longitude = 106.7009
WHERE code = 'SITE001';
```

#### Option B: Dùng API (sau khi thêm support)

Hiện tại API chưa hỗ trợ update lat/long qua form. Cần thêm vào:
- Backend: `PUT /api/v1/locations/{id}` - thêm `latitude`, `longitude` vào payload
- Frontend: Thêm input fields vào form edit

---

## 🚀 Hướng Dẫn Chạy Script Populate

### Bước 1: Chạy Script

```powershell
cd d:\vnss_tms\backend
.venv\Scripts\python.exe -m scripts.populate_coordinates
```

### Bước 2: Xem Kết Quả

Script sẽ hiển thị:
```
============================================================
Populate Coordinates for Locations and Sites
============================================================
Found 50 locations without coordinates
✓ Geocoded Location LOC001: Phường 1, Quận 1, TP.HCM → (10.7769, 106.7009)
✓ Geocoded Location LOC002: Phường 2, Quận 2, TP.HCM → (10.7872, 106.7493)
...

Location coordinates: 48 updated, 2 failed

Found 30 sites without coordinates
✓ Site SITE001: Using Location coordinates (10.7769, 106.7009)
✓ Geocoded Site SITE002: 123 Đường ABC → (10.8000, 106.7500)
...

Site coordinates: 28 updated, 2 failed

============================================================
Done!
============================================================
```

### Bước 3: Kiểm Tra

```sql
-- Check Locations có coordinates
SELECT code, name, latitude, longitude 
FROM locations 
WHERE latitude IS NOT NULL 
LIMIT 10;

-- Check Sites có coordinates
SELECT code, company_name, latitude, longitude 
FROM sites 
WHERE latitude IS NOT NULL 
LIMIT 10;
```

---

## ⚙️ Cấu Hình Geocoding

### Sử dụng Google Maps API (chính xác hơn):

Thêm vào `backend/.env` hoặc `backend/.env.local`:

```env
GOOGLE_MAPS_API_KEY=your_api_key_here
```

Lấy API key tại: https://console.cloud.google.com/

### Nếu không có API key:

Script sẽ tự động dùng **OpenStreetMap Nominatim** (miễn phí):
- Không cần cấu hình
- Có rate limit (1 request/giây)
- Script tự động delay 1 giây giữa các requests

---

## 📝 Nếu Muốn Thêm Fields Vào UI

**Hiện tại form chưa có fields lat/long. Để thêm:**

### 1. Backend: Update API endpoint

Sửa `backend/app/api/v1/routes/locations.py`:

```python
@router.put("/{location_id}")
def update_location(...):
    # ... existing code ...
    
    # Thêm dòng này:
    if "latitude" in payload:
        location.latitude = payload["latitude"]
    if "longitude" in payload:
        location.longitude = payload["longitude"]
    
    session.add(location)
    session.commit()
    return location
```

Tương tự cho `backend/app/api/v1/routes/sites.py`.

### 2. Frontend: Thêm input fields

Sửa `frontend/app/(protected)/tms/locations/page.tsx`:

```tsx
// Thêm vào LocationForm type:
type LocationForm = {
  // ... existing fields ...
  latitude?: number;
  longitude?: number;
};

// Thêm vào form JSX:
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>Latitude</label>
    <input
      type="number"
      step="0.0001"
      value={form.latitude || ''}
      onChange={(e) => setForm({...form, latitude: parseFloat(e.target.value) || undefined})}
    />
  </div>
  <div>
    <label>Longitude</label>
    <input
      type="number"
      step="0.0001"
      value={form.longitude || ''}
      onChange={(e) => setForm({...form, longitude: parseFloat(e.target.value) || undefined})}
    />
  </div>
</div>
```

---

## 🔍 Kiểm Tra Dữ Liệu

### Xem tất cả records có coordinates:

```sql
-- Locations
SELECT 
    code, 
    name, 
    latitude, 
    longitude,
    CASE 
        WHEN latitude IS NULL OR longitude IS NULL THEN 'Missing'
        ELSE 'OK'
    END as status
FROM locations
ORDER BY code;

-- Sites
SELECT 
    code, 
    company_name, 
    latitude, 
    longitude,
    CASE 
        WHEN latitude IS NULL OR longitude IS NULL THEN 'Missing'
        ELSE 'OK'
    END as status
FROM sites
ORDER BY code;
```

### Thống kê:

```sql
-- Tổng số và số lượng có coordinates
SELECT 
    'locations' as table_name,
    COUNT(*) as total,
    COUNT(latitude) as with_coordinates,
    COUNT(*) - COUNT(latitude) as missing
FROM locations
UNION ALL
SELECT 
    'sites',
    COUNT(*),
    COUNT(latitude),
    COUNT(*) - COUNT(latitude)
FROM sites;
```

---

## ⚠️ Lưu Ý

1. **Chạy script an toàn**: Script chỉ update records chưa có coordinates, không ghi đè dữ liệu hiện có

2. **Rate Limits**: 
   - Nominatim: 1 request/giây
   - Google Maps: tùy plan (thường 50 requests/giây)

3. **Site Priority**: 
   - Nếu Site có link đến Location đã có coordinates → dùng luôn
   - Nếu không → geocode từ `detailed_address`

4. **Sau khi populate**: Có thể sử dụng coordinates cho:
   - Distance calculation
   - Route optimization
   - GPS tracking
   - Geofencing

---

*Guide - 2026-01-18*
