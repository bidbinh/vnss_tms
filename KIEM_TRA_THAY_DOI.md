# ✅ Hướng Dẫn Kiểm Tra Các Thay Đổi

## 🎯 Các Thay Đổi Đã Thực Hiện

1. **Fix missing columns** trong database:
   - Orders: `priority`, `actual_pickup_at`, `actual_delivery_at`, etc.
   - Customers: `auto_accept_enabled`, `auto_accept_confidence_threshold`, `delay_alert_threshold_minutes`
   - Vehicles: `current_mileage`, `maintenance_interval_km`, `maintenance_interval_days`
   - Locations: `latitude`, `longitude`
   - Sites: `latitude`, `longitude`, `geofence_radius_meters`, `service_time_minutes`

2. **TMS Automation features** (đã implement services)

---

## 📍 Các Trang Frontend Cần Kiểm Tra

### 1. **Đơn Hàng (Orders)** - `/tms/orders`
**URL:** `http://localhost:3000/tms/orders`

**Kiểm tra:**
- ✅ Trang load được không (không còn lỗi 500)
- ✅ Danh sách đơn hàng hiển thị bình thường
- ✅ Có thể tạo đơn mới
- ✅ Có thể xem chi tiết đơn hàng
- ✅ Có thể edit đơn hàng

**Fields mới (có thể chưa hiển thị trong UI):**
- `priority` - Độ ưu tiên (URGENT, HIGH, NORMAL, LOW)
- `actual_pickup_at` - Thời gian lấy hàng thực tế
- `actual_delivery_at` - Thời gian giao hàng thực tế
- `weight_kg` - Trọng lượng hàng

---

### 2. **Khách Hàng (Customers)** - `/tms/customers`
**URL:** `http://localhost:3000/tms/customers`

**Kiểm tra:**
- ✅ Trang load được không (không còn lỗi 500)
- ✅ Danh sách khách hàng hiển thị
- ✅ Có thể xem chi tiết khách hàng
- ✅ Có thể edit khách hàng

**Fields mới (có thể chưa hiển thị trong UI):**
- `auto_accept_enabled` - Bật tự động chấp nhận đơn
- `auto_accept_confidence_threshold` - Ngưỡng độ tin cậy (0-100)
- `delay_alert_threshold_minutes` - Ngưỡng cảnh báo trễ (phút)

---

### 3. **Tài Xế (Drivers)** - `/tms/drivers`
**URL:** `http://localhost:3000/tms/drivers`

**Kiểm tra:**
- ✅ Trang load được không (không còn lỗi 500)
- ✅ Danh sách tài xế hiển thị
- ✅ Có thể xem chi tiết tài xế
- ✅ Thông tin xe gắn với tài xế hiển thị đúng

**Lưu ý:** Trang này query vehicles, nên cần kiểm tra vehicles columns đã fix chưa.

---

### 4. **Xe (Vehicles)** - `/tms/vehicles`
**URL:** `http://localhost:3000/tms/vehicles`

**Kiểm tra:**
- ✅ Trang load được không (không còn lỗi 500)
- ✅ Danh sách xe hiển thị
- ✅ Có thể xem chi tiết xe
- ✅ Có thể edit thông tin xe

**Fields mới (có thể chưa hiển thị trong UI):**
- `current_mileage` - Số km hiện tại
- `maintenance_interval_km` - Chu kỳ bảo dưỡng (km)
- `maintenance_interval_days` - Chu kỳ bảo dưỡng (ngày)

---

### 5. **Địa Điểm (Locations)** - `/tms/locations`
**URL:** `http://localhost:3000/tms/locations`

**Kiểm tra:**
- ✅ Trang load được
- ✅ Danh sách địa điểm hiển thị

**Fields mới:**
- `latitude` - Vĩ độ
- `longitude` - Kinh độ

**Lưu ý:** Cần chạy script `populate_coordinates.py` để điền dữ liệu lat/long.

---

### 6. **Điểm Giao Nhận (Sites)** - `/tms/sites`
**URL:** `http://localhost:3000/tms/sites`

**Kiểm tra:**
- ✅ Trang load được
- ✅ Danh sách điểm giao nhận hiển thị
- ✅ Có thể xem chi tiết site

**Fields mới:**
- `latitude` - Vĩ độ
- `longitude` - Kinh độ
- `geofence_radius_meters` - Bán kính geofence (mét)
- `service_time_minutes` - Thời gian phục vụ (phút)

**Lưu ý:** Cần chạy script `populate_coordinates.py` để điền dữ liệu lat/long.

---

### 7. **Điều Phối (Dispatch)** - `/tms/dispatch`
**URL:** `http://localhost:3000/tms/dispatch`

**Kiểm tra:**
- ✅ Trang load được
- ✅ Dashboard điều phối hiển thị
- ✅ GPS tracking hoạt động (nếu có)

---

## 🔍 Checklist Kiểm Tra

### Bước 1: Kiểm Tra Lỗi
- [ ] Mở từng trang và kiểm tra không còn lỗi 500
- [ ] Kiểm tra Console (F12) không còn lỗi
- [ ] Kiểm tra Network tab - các API calls thành công

### Bước 2: Kiểm Tra Chức Năng Cơ Bản
- [ ] Orders page: Load danh sách, tạo mới, xem chi tiết
- [ ] Customers page: Load danh sách, xem chi tiết
- [ ] Drivers page: Load danh sách, xem chi tiết
- [ ] Vehicles page: Load danh sách, xem chi tiết
- [ ] Sites page: Load danh sách, xem chi tiết
- [ ] Locations page: Load danh sách

### Bước 3: Kiểm Tra Fields Mới (Optional)
- [ ] Kiểm tra trong database xem fields đã có dữ liệu chưa
- [ ] Nếu cần, thêm fields vào UI form để test

---

## 🚀 Cách Kiểm Tra Nhanh

1. **Mở browser** → `http://localhost:3000`
2. **Login** vào hệ thống
3. **Vào TMS module** từ sidebar
4. **Click từng menu item** và kiểm tra:
   - Đơn hàng (`/tms/orders`)
   - Khách hàng (`/tms/customers`)
   - Tài xế (`/tms/drivers`)
   - Xe (`/tms/vehicles`)
   - Địa điểm (`/tms/locations`)
   - Điểm giao nhận (`/tms/sites`)

5. **Kiểm tra Console** (F12) xem có lỗi không

---

## ⚠️ Nếu Vẫn Còn Lỗi

1. **Kiểm tra backend đã restart chưa:**
   ```powershell
   # Dừng backend (Ctrl+C)
   # Start lại:
   cd d:\vnss_tms\backend
   .venv\Scripts\python.exe -m uvicorn app.main:app --reload
   ```

2. **Kiểm tra database columns:**
   ```powershell
   cd d:\vnss_tms\backend
   .venv\Scripts\python.exe verify_fix.py
   ```

3. **Nếu thiếu columns, chạy fix:**
   ```powershell
   cd d:\vnss_tms\backend
   .venv\Scripts\python.exe fix_all_missing_columns.py
   ```

---

## 📝 Ghi Chú

- Các fields mới đã được thêm vào database nhưng **có thể chưa hiển thị trong UI**
- Để hiển thị fields mới trong form, cần update các component tương ứng
- Lat/Long cần chạy script `populate_coordinates.py` để điền dữ liệu

---

*Testing Guide - 2026-01-18*
