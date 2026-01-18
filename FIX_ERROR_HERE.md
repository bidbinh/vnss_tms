# 🔴 FIX LỖI NGAY - Column orders.priority does not exist

## ⚡ Giải Pháp Nhanh Nhất

### Chạy Script Python:

```powershell
cd d:\vnss_tms\backend
python fix_all_columns.py
```

**Script này sẽ:**
- ✅ Add `priority` column (fix lỗi hiện tại)
- ✅ Add tất cả columns khác cho automation
- ✅ Verify sau khi fix
- ✅ Hiển thị hướng dẫn tiếp theo

---

## ⚠️ QUAN TRỌNG: Sau Khi Chạy Script

**BẮT BUỘC phải RESTART backend server!**

1. **Dừng backend** (Ctrl+C trong terminal đang chạy backend)
2. **Start lại backend**
3. **Refresh Orders page** trong browser
4. **Kiểm tra** - Lỗi sẽ biến mất

---

## 🚀 Nếu Script Không Chạy Được

### Chạy SQL Trực Tiếp:

Mở **PostgreSQL client** (pgAdmin, DBeaver, hoặc psql) và chạy:

```sql
-- Fix lỗi hiện tại (Priority)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
CREATE INDEX IF NOT EXISTS ix_orders_priority ON orders(priority);

-- Fix tất cả columns khác (nếu cần)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_pickup_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_delivery_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS arrived_at_pickup_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS arrived_at_delivery_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_eta_pickup_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_eta_delivery_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS weight_kg FLOAT;

-- Locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS longitude FLOAT;

-- Sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS longitude FLOAT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER NOT NULL DEFAULT 100;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS service_time_minutes INTEGER NOT NULL DEFAULT 30;

-- Vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_mileage INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS maintenance_interval_km INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS maintenance_interval_days INTEGER;

-- Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_accept_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_accept_confidence_threshold FLOAT NOT NULL DEFAULT 90.0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS delay_alert_threshold_minutes INTEGER NOT NULL DEFAULT 15;
```

---

## ✅ Kiểm Tra Sau Khi Fix

```sql
-- Check priority column
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'priority';
```

Kết quả mong đợi:
```
column_name | data_type              | column_default
priority    | character varying(20)  | 'NORMAL'::character varying
```

---

## 📝 Lưu Ý

- **Bắt buộc restart backend** sau khi add columns
- Script sử dụng `IF NOT EXISTS` nên chạy nhiều lần cũng an toàn
- Tất cả columns có default values nên không ảnh hưởng existing data

---

*Quick Fix - 2026-01-18*
