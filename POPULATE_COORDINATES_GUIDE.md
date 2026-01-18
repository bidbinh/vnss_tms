# 📍 Populate Coordinates - Hướng Dẫn Tối Ưu

## ⚠️ Vấn Đề

Script phát hiện **2085 locations** cần geocode. Với rate limit:
- **Nominatim (free)**: 1 request/giây → mất **~35 phút** cho 2085 locations
- **Google Maps API**: 50 requests/giây → mất **~42 giây**

Nếu có cả sites, có thể mất **hàng giờ**.

---

## ✅ Giải Pháp

### Option 1: Chạy Batch Nhỏ Trước (Khuyến nghị)

Test với số lượng nhỏ trước:

```powershell
cd d:\vnss_tms\backend
.venv\Scripts\python.exe scripts\populate_coordinates_fast.py --limit-locations 100
```

**Ưu điểm:**
- Test nhanh (2-3 phút)
- Verify script hoạt động đúng
- Kiểm tra kết quả

---

### Option 2: Chạy Chỉ Locations Hoặc Sites

Nếu chỉ cần populate locations trước:

```powershell
# Chỉ locations
.venv\Scripts\python.exe scripts\populate_coordinates_fast.py --locations-only

# Chỉ sites
.venv\Scripts\python.exe scripts\populate_coordinates_fast.py --sites-only
```

---

### Option 3: Chạy Toàn Bộ (Mất Thời Gian)

```powershell
.venv\Scripts\python.exe scripts\populate_coordinates_fast.py
```

**Lưu ý:**
- Sẽ mất **30-60 phút** tùy theo số lượng records
- Script có progress indicator
- Có thể Ctrl+C để dừng (đã commit batch)

---

### Option 4: Sử Dụng Google Maps API (Nhanh Hơn)

Nếu có Google Maps API key:

1. **Thêm vào `.env`:**
```env
GOOGLE_MAPS_API_KEY=your_api_key_here
```

2. **Chạy script:**
```powershell
.venv\Scripts\python.exe scripts\populate_coordinates_fast.py
```

**Tốc độ:**
- ~50 requests/giây (thay vì 1 request/giây)
- 2085 locations → **~42 giây** thay vì 35 phút

**Lưu ý:** Có thể mất phí (tùy plan), nhưng thường có free tier.

---

## 🎯 Khuyến Nghị

**Bước 1: Test với 100 records**
```powershell
.venv\Scripts\python.exe scripts\populate_coordinates_fast.py --limit-locations 100
```

**Bước 2: Kiểm tra kết quả**
```sql
SELECT COUNT(*) FROM locations WHERE latitude IS NOT NULL;
SELECT code, name, latitude, longitude FROM locations WHERE latitude IS NOT NULL LIMIT 10;
```

**Bước 3: Nếu OK, chạy toàn bộ**
```powershell
.venv\Scripts\python.exe scripts\populate_coordinates_fast.py --locations-only
```

**Bước 4: Sau đó chạy sites**
```powershell
.venv\Scripts\python.exe scripts\populate_coordinates_fast.py --sites-only
```

---

## 📊 Progress Tracking

Script mới (`populate_coordinates_fast.py`) có:
- ✅ Progress indicator (mỗi 10 records)
- ✅ ETA (estimated time remaining)
- ✅ Batch commits (mỗi 50 records)
- ✅ Error handling tốt hơn
- ✅ Options để limit số lượng

---

## ⚙️ Options

```powershell
# Chỉ locations, limit 100
--locations-only --limit-locations 100

# Chỉ sites, limit 50
--sites-only --limit-sites 50

# Batch size 100 (commit mỗi 100 records)
--batch-size 100

# Combine
--limit-locations 500 --batch-size 100
```

---

## 🔍 Kiểm Tra Sau Khi Chạy

```sql
-- Thống kê
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

-- Sample data
SELECT code, name, latitude, longitude 
FROM locations 
WHERE latitude IS NOT NULL 
LIMIT 10;
```

---

*Guide - 2026-01-18*
