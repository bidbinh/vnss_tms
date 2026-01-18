# TMS Automation - Prerequisites Checklist

## ✅ Đã Có (Available)

### 1. Order Model
- ✅ `Order.customer_id`, `Order.status`, `Order.equipment`, `Order.qty`
- ✅ `Order.pickup_site_id`, `Order.delivery_site_id`, `Order.pickup_location_id`, `Order.delivery_location_id`
- ✅ `Order.distance_km`, `Order.freight_charge` (auto-calculated)
- ✅ `Order.driver_id`, `Order.vehicle_id`
- ✅ `Order.eta_pickup_at`, `Order.eta_delivery_at`

### 2. Driver Model
- ✅ `Driver.status`, `Driver.tractor_id`, `Driver.source`
- ✅ `DriverAvailability` model (cho external drivers)

### 3. Vehicle Model
- ✅ `Vehicle.status`, `Vehicle.type`, `Vehicle.payload_capacity`
- ✅ `VehicleGPS` model với `latitude`, `longitude`, `speed`, `work_status`

### 4. Location/Site Models
- ✅ `Location` model (ward/district/province)
- ✅ `Site` model (link to Location via `location_id`)

### 5. GPS Tracking
- ✅ `VehicleGPS` model với real-time tracking
- ✅ GPS sync service

---

## ❌ Chưa Có - Cần Bổ Sung (Missing)

### 1. Location Coordinates ⚠️ CRITICAL

**Vấn đề:**
- `Location` model KHÔNG có `latitude` / `longitude`
- `Site` model KHÔNG có `latitude` / `longitude`
- Cần coordinates để:
  - Tính distance giữa các điểm
  - GPS-based status detection
  - Route optimization

**Solution:**
```python
# Add to Location model
latitude: Optional[float] = Field(default=None)
longitude: Optional[float] = Field(default=None)

# Add to Site model (hoặc lấy từ Location)
latitude: Optional[float] = Field(default=None)  # Optional, có thể lấy từ Location
longitude: Optional[float] = Field(default=None)  # Optional, có thể lấy từ Location
```

**Migration:**
- Geocoding service để populate existing data từ address
- Use Google Maps Geocoding API hoặc OpenStreetMap Nominatim

---

### 2. Vehicle Maintenance Fields ⚠️ IMPORTANT

**Vấn đề:**
- `Vehicle` model KHÔNG có:
  - `current_mileage` - Số km hiện tại
  - `maintenance_interval_km` - Định kỳ bảo dưỡng (km)
  - `maintenance_interval_days` - Định kỳ bảo dưỡng (ngày)

**Solution:**
```python
# Add to Vehicle model
current_mileage: Optional[int] = Field(default=None)  # km
maintenance_interval_km: Optional[int] = Field(default=None)  # km (e.g., 10000)
maintenance_interval_days: Optional[int] = Field(default=None)  # days (e.g., 90)
```

**Migration:**
- Default values: 10000 km, 90 days
- Update `current_mileage` từ GPS hoặc manual entry

---

### 3. Order Priority & Weight

**Vấn đề:**
- `Order` model KHÔNG có:
  - `priority` - Độ ưu tiên (URGENT, HIGH, NORMAL, LOW)
  - `weight_kg` - Trọng lượng hàng (để check vehicle capacity)

**Solution:**
```python
# Add to Order model
priority: str = Field(default="NORMAL", index=True)  # URGENT, HIGH, NORMAL, LOW
weight_kg: Optional[float] = Field(default=None)  # kg (optional)
```

**Migration:**
- Default: `priority = "NORMAL"`

---

### 4. Site Geofence Radius

**Vấn đề:**
- `Site` model KHÔNG có `geofence_radius_meters`
- Cần để GPS-based status detection (khi nào xe "arrived" tại site)

**Solution:**
```python
# Add to Site model
geofence_radius_meters: int = Field(default=100)  # meters (default: 100m)
```

**Migration:**
- Default: 100 meters

---

### 5. Customer Auto-Accept Config

**Vấn đề:**
- `Customer` model KHÔNG có:
  - `auto_accept_enabled` - Cho phép auto-accept cho KH này
  - `auto_accept_confidence_threshold` - Ngưỡng confidence để auto-accept

**Solution:**
```python
# Add to Customer model
auto_accept_enabled: bool = Field(default=False, index=True)
auto_accept_confidence_threshold: float = Field(default=90.0)  # 0-100 (default: 90%)
```

**Migration:**
- Default: `auto_accept_enabled = False`, `auto_accept_confidence_threshold = 90.0`

---

### 6. Order Actual Times

**Vấn đề:**
- `Order` model KHÔNG có:
  - `actual_pickup_at` - Thời gian thực tế lấy hàng
  - `actual_delivery_at` - Thời gian thực tế giao hàng
  - `arrived_at_pickup_at` - Thời gian đến điểm lấy hàng (từ GPS)
  - `arrived_at_delivery_at` - Thời gian đến điểm giao hàng (từ GPS)

**Solution:**
```python
# Add to Order model
actual_pickup_at: Optional[datetime] = Field(default=None)
actual_delivery_at: Optional[datetime] = Field(default=None)
arrived_at_pickup_at: Optional[datetime] = Field(default=None)
arrived_at_delivery_at: Optional[datetime] = Field(default=None)
```

**Migration:**
- Optional fields, populate từ GPS detection

---

### 7. Order Original ETA (để so sánh delay)

**Vấn đề:**
- `Order` model KHÔNG có `original_eta_pickup_at` / `original_eta_delivery_at`
- Cần để so sánh với ETA hiện tại và detect delay

**Solution:**
```python
# Add to Order model
original_eta_pickup_at: Optional[datetime] = Field(default=None)
original_eta_delivery_at: Optional[datetime] = Field(default=None)
```

**Migration:**
- Populate khi accept order (copy từ `eta_pickup_at` / `eta_delivery_at`)

---

### 8. Order Delay Threshold Config

**Vấn đề:**
- Không có config cho delay threshold (bao nhiêu phút delay thì tạo alert)
- Cần per-customer hoặc global config

**Solution:**
```python
# Add to Customer model (hoặc global config)
delay_alert_threshold_minutes: int = Field(default=15)  # minutes (default: 15 phút)
```

**Migration:**
- Default: 15 minutes

---

### 9. Site Service Time (thời gian loading/unloading)

**Vấn đề:**
- Không có config cho service time (thời gian phục vụ tại site)
- Cần để tính ETA cho multi-stop trips

**Solution:**
```python
# Add to Site model
service_time_minutes: int = Field(default=30)  # minutes (default: 30 phút)
```

**Migration:**
- Default: 30 minutes

---

### 10. Driver Performance Metrics (có thể tính từ historical data)

**Vấn đề:**
- Không có table cache driver performance metrics
- Cần để scoring driver assignment

**Solution:**
- **Option 1**: Calculate on-the-fly từ historical orders
- **Option 2**: Create `DriverPerformance` table và cache metrics

**Recommendation:**
- Start with Option 1 (calculate on-the-fly)
- Cache kết quả trong Redis
- Tạo table sau nếu cần optimize

---

## 📋 Migration Priority

### Priority 1: Critical (Cần ngay cho automation)

1. **Location/Site Coordinates** ⚠️
   - Add `latitude` / `longitude` to `Location` model
   - Add `latitude` / `longitude` to `Site` model (hoặc lấy từ Location)
   - Geocoding service để populate existing data

2. **Order Priority**
   - Add `priority` field to `Order` model
   - Default: "NORMAL"

3. **Site Geofence**
   - Add `geofence_radius_meters` to `Site` model
   - Default: 100 meters

### Priority 2: Important (Cần cho advanced features)

4. **Vehicle Maintenance Fields**
   - Add `current_mileage`, `maintenance_interval_km`, `maintenance_interval_days`
   - Default values và populate existing data

5. **Order Actual Times**
   - Add `actual_pickup_at`, `actual_delivery_at`
   - Add `arrived_at_pickup_at`, `arrived_at_delivery_at`

6. **Customer Auto-Accept Config**
   - Add `auto_accept_enabled`, `auto_accept_confidence_threshold`

### Priority 3: Nice-to-Have (Có thể bổ sung sau)

7. **Order Weight**
   - Add `weight_kg` field (optional)

8. **Order Original ETA**
   - Add `original_eta_pickup_at`, `original_eta_delivery_at`

9. **Delay Threshold Config**
   - Add `delay_alert_threshold_minutes` to Customer hoặc global config

10. **Site Service Time**
    - Add `service_time_minutes` to Site model

---

## 🛠️ Implementation Plan

### Step 1: Create Migration Scripts (Week 1)

1. **Location/Site Coordinates Migration**
   ```sql
   ALTER TABLE locations ADD COLUMN latitude FLOAT;
   ALTER TABLE locations ADD COLUMN longitude FLOAT;
   ALTER TABLE sites ADD COLUMN latitude FLOAT;
   ALTER TABLE sites ADD COLUMN longitude FLOAT;
   ALTER TABLE sites ADD COLUMN geofence_radius_meters INT DEFAULT 100;
   ```

2. **Order Fields Migration**
   ```sql
   ALTER TABLE orders ADD COLUMN priority VARCHAR(20) DEFAULT 'NORMAL';
   ALTER TABLE orders ADD COLUMN weight_kg FLOAT;
   ALTER TABLE orders ADD COLUMN actual_pickup_at TIMESTAMP;
   ALTER TABLE orders ADD COLUMN actual_delivery_at TIMESTAMP;
   ALTER TABLE orders ADD COLUMN arrived_at_pickup_at TIMESTAMP;
   ALTER TABLE orders ADD COLUMN arrived_at_delivery_at TIMESTAMP;
   ALTER TABLE orders ADD COLUMN original_eta_pickup_at TIMESTAMP;
   ALTER TABLE orders ADD COLUMN original_eta_delivery_at TIMESTAMP;
   ```

3. **Vehicle Fields Migration**
   ```sql
   ALTER TABLE vehicles ADD COLUMN current_mileage INT;
   ALTER TABLE vehicles ADD COLUMN maintenance_interval_km INT;
   ALTER TABLE vehicles ADD COLUMN maintenance_interval_days INT;
   ```

4. **Customer Fields Migration**
   ```sql
   ALTER TABLE customers ADD COLUMN auto_accept_enabled BOOLEAN DEFAULT FALSE;
   ALTER TABLE customers ADD COLUMN auto_accept_confidence_threshold FLOAT DEFAULT 90.0;
   ALTER TABLE customers ADD COLUMN delay_alert_threshold_minutes INT DEFAULT 15;
   ```

5. **Site Fields Migration**
   ```sql
   ALTER TABLE sites ADD COLUMN service_time_minutes INT DEFAULT 30;
   ```

### Step 2: Geocoding Service (Week 1-2)

1. **Create Geocoding Service**
   - Integrate Google Maps Geocoding API hoặc OpenStreetMap Nominatim
   - Batch geocoding cho existing locations/sites
   - Error handling và retry logic

2. **Populate Existing Data**
   - Geocode all `Location` records
   - Geocode all `Site` records (hoặc lấy từ Location)

### Step 3: Data Validation (Week 2)

1. **Validate Required Fields**
   - Check coordinates có data chưa
   - Check vehicle maintenance fields có default values chưa
   - Check order priority có default values chưa

2. **Update Existing Records**
   - Set default values cho existing records
   - Populate `current_mileage` nếu có data

---

## ✅ Checklist Trước Khi Bắt Đầu Automation

### Data Prerequisites
- [ ] Location có `latitude` / `longitude` (ít nhất 80% records)
- [ ] Site có `latitude` / `longitude` hoặc link đến Location có coordinates
- [ ] Vehicle có `current_mileage` và `maintenance_interval_*` (ít nhất 80% vehicles)
- [ ] Order có `priority` field (default: NORMAL)
- [ ] Site có `geofence_radius_meters` (default: 100m)
- [ ] Customer có `auto_accept_enabled` config (optional)

### Service Prerequisites
- [ ] GPS sync service hoạt động ổn định (update mỗi 30s-1min)
- [ ] Distance calculation service working
- [ ] Geofencing service implemented
- [ ] Background job system setup (Celery hoặc FastAPI BackgroundTasks)

### Testing Prerequisites
- [ ] Test distance calculations với real coordinates
- [ ] Test GPS-based status detection với sample data
- [ ] Test geofencing với real GPS locations
- [ ] Test route optimization với multiple stops

---

## 📝 Next Actions

1. **Immediate:**
   - Create migration scripts cho Priority 1 fields
   - Setup geocoding service
   - Populate existing data

2. **Short-term (1-2 weeks):**
   - Complete all Priority 1 & 2 migrations
   - Validate data quality
   - Test services

3. **Before Automation:**
   - Complete checklist above
   - Run integration tests
   - Start with small scale (10% orders auto-process)

---

*Document created: 2025-01-05*
*Last updated: 2025-01-05*
