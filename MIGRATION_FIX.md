# Fix: Column orders.priority does not exist

## 🔴 Vấn Đề

Lỗi: `column orders.priority does not exist`

**Nguyên nhân:** Migration chưa được chạy. Model đã có field `priority` nhưng database chưa có column.

---

## ✅ Giải Pháp

### Cách 1: Chạy Migration Script (Windows PowerShell)

```powershell
cd backend
.\run_migration.ps1
```

### Cách 2: Chạy Thủ Công

**Nếu dùng Python:**
```bash
cd backend
python -m alembic upgrade head
```

**Nếu dùng py:**
```bash
cd backend
py -m alembic upgrade head
```

**Nếu có virtual environment:**
```bash
cd backend
# Activate venv
.\venv\Scripts\activate  # Windows
# hoặc
source venv/bin/activate  # Linux/Mac

# Run migration
alembic upgrade head
```

### Cách 3: Chạy Trực Tiếp SQL (Nếu migration không chạy được)

```sql
-- Priority 1 fields
ALTER TABLE locations ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS longitude FLOAT;
CREATE INDEX IF NOT EXISTS ix_locations_latitude ON locations(latitude);
CREATE INDEX IF NOT EXISTS ix_locations_longitude ON locations(longitude);

ALTER TABLE sites ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS longitude FLOAT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 100;
CREATE INDEX IF NOT EXISTS ix_sites_latitude ON sites(latitude);
CREATE INDEX IF NOT EXISTS ix_sites_longitude ON sites(longitude);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL';
CREATE INDEX IF NOT EXISTS ix_orders_priority ON orders(priority);

-- Priority 2 fields
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_mileage INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS maintenance_interval_km INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS maintenance_interval_days INTEGER;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_pickup_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_delivery_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS arrived_at_pickup_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS arrived_at_delivery_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_eta_pickup_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_eta_delivery_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS weight_kg FLOAT;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_accept_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_accept_confidence_threshold FLOAT DEFAULT 90.0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS delay_alert_threshold_minutes INTEGER DEFAULT 15;
CREATE INDEX IF NOT EXISTS ix_customers_auto_accept_enabled ON customers(auto_accept_enabled);

ALTER TABLE sites ADD COLUMN IF NOT EXISTS service_time_minutes INTEGER DEFAULT 30;

-- Set default values for existing records
UPDATE vehicles
SET maintenance_interval_km = 10000,
    maintenance_interval_days = 90
WHERE maintenance_interval_km IS NULL
AND maintenance_interval_days IS NULL;
```

---

## 🔍 Kiểm Tra

Sau khi chạy migration, kiểm tra:

```sql
-- Check if priority column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'priority';

-- Check all new columns
SELECT column_name
FROM information_schema.columns
WHERE table_name IN ('orders', 'locations', 'sites', 'vehicles', 'customers')
AND column_name IN (
    'priority', 'latitude', 'longitude', 'geofence_radius_meters',
    'current_mileage', 'maintenance_interval_km', 'maintenance_interval_days',
    'actual_pickup_at', 'actual_delivery_at', 'arrived_at_pickup_at',
    'arrived_at_delivery_at', 'original_eta_pickup_at', 'original_eta_delivery_at',
    'weight_kg', 'auto_accept_enabled', 'auto_accept_confidence_threshold',
    'delay_alert_threshold_minutes', 'service_time_minutes'
)
ORDER BY table_name, column_name;
```

---

## 🚀 Sau Khi Fix

1. **Restart backend server**
2. **Refresh Orders page** - Lỗi sẽ biến mất
3. **Test automation** (optional):
   ```bash
   curl -X POST http://localhost:8001/api/v1/automation/run-all \
     -H "Authorization: Bearer TOKEN"
   ```

---

*Fix guide - 2026-01-18*
