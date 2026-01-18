# 📍 Populate Latitude/Longitude cho Locations và Sites

## 🎯 Mục đích

Script này sẽ tự động điền tọa độ (latitude, longitude) cho các **Location** và **Site** records hiện có trong database bằng cách geocode địa chỉ.

---

## 🚀 Cách Chạy

### Chạy Script:

```powershell
cd d:\vnss_tms\backend
.venv\Scripts\python.exe -m scripts.populate_coordinates
```

Hoặc:

```powershell
cd d:\vnss_tms\backend
.venv\Scripts\python.exe scripts\populate_coordinates.py
```

---

## 📋 Script Làm Gì?

1. **Tìm tất cả Location** không có coordinates (`latitude` hoặc `longitude` = NULL)
2. **Tìm tất cả Site** không có coordinates
3. **Geocode** từ địa chỉ:
   - Location: dùng `name`, `ward`, `district`, `province`
   - Site: dùng `detailed_address` hoặc lấy từ Location nếu có link
4. **Update database** với coordinates tìm được

---

## 🔧 Geocoding Providers

Script sử dụng **GeocodingService** với 2 providers:

1. **Google Maps Geocoding API** (nếu có API key)
   - Chính xác hơn
   - Cần set `GOOGLE_MAPS_API_KEY` trong `.env`

2. **OpenStreetMap Nominatim** (fallback, miễn phí)
   - Không cần API key
   - Có rate limit (1 request/giây)
   - Script tự động delay 1 giây giữa các requests

---

## ⚙️ Cấu Hình

### Nếu muốn dùng Google Maps API:

Thêm vào `backend/.env` hoặc `backend/.env.local`:

```env
GOOGLE_MAPS_API_KEY=your_api_key_here
```

Lấy API key tại: https://console.cloud.google.com/

---

## 📊 Output

Script sẽ hiển thị:
- Số lượng Location/Site cần geocode
- Kết quả từng record: ✓ thành công, ✗ thất bại
- Tổng kết: bao nhiêu updated, bao nhiêu failed

Ví dụ:
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

---

## ⚠️ Lưu ý

1. **Rate Limits**: 
   - Nominatim: 1 request/giây (script tự động delay)
   - Google Maps: tùy theo plan (thường 50 requests/giây)

2. **Commit Batch**: Script commit mỗi 10 records để tránh mất dữ liệu

3. **Site Priority**: 
   - Nếu Site có link đến Location đã có coordinates → dùng luôn
   - Nếu không → geocode từ `detailed_address`

4. **Chạy lại an toàn**: Script chỉ update records chưa có coordinates, không ghi đè dữ liệu hiện có

---

## 🔍 Kiểm Tra Sau Khi Chạy

```sql
-- Check Locations có coordinates
SELECT COUNT(*) FROM locations WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Check Sites có coordinates  
SELECT COUNT(*) FROM sites WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Xem sample data
SELECT code, name, latitude, longitude FROM locations WHERE latitude IS NOT NULL LIMIT 10;
SELECT code, company_name, latitude, longitude FROM sites WHERE latitude IS NOT NULL LIMIT 10;
```

---

*Guide - 2026-01-18*
