# Phân Tích Yêu Cầu Dữ Liệu Cho TMS Automation

## 📋 Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Data Requirements Theo Từng Feature](#data-requirements-theo-từng-feature)
3. [Data Gaps & Missing Fields](#data-gaps--missing-fields)
4. [Checklist Prerequisites](#checklist-prerequisites)

---

## 🎯 Tổng Quan

Document này phân tích **những thông tin cần thiết** để automation hoạt động, và **kiểm tra xem hệ thống hiện tại đã có đủ data chưa**.

---

## 📊 Data Requirements Theo Từng Feature

### 1. Auto-Order Acceptance (Tự động chấp nhận/reject đơn)

#### 1.1 Thông Tin Cần Thiết

**✅ Đã có:**
- `Order.customer_id` - ID khách hàng
- `Order.pickup_site_id` / `Order.pickup_location_id` - Địa điểm lấy hàng
- `Order.delivery_site_id` / `Order.delivery_location_id` - Địa điểm giao hàng
- `Order.equipment` - Loại container (20/40/45)
- `Order.qty` - Số lượng
- `Order.freight_charge` - Cước vận chuyển (đã auto-calculate từ Rates)
- `Order.distance_km` - Khoảng cách (đã auto-calculate)
- `Order.customer_requested_date` - Ngày KH yêu cầu
- `Customer.is_active` - Trạng thái khách hàng
- `Customer.credit_limit` / `Customer.credit_days` - Hạn mức công nợ
- `Site.status` - Trạng thái site

**❌ Chưa có / Cần bổ sung:**
- `Order.min_price_threshold` - Giá tối thiểu (cần config per customer hoặc global)
- `Order.max_distance_km` - Khoảng cách tối đa (cần config)
- `Order.priority` - Độ ưu tiên (URGENT, NORMAL, LOW)
- `Customer.auto_accept_enabled` - Cho phép auto-accept cho KH này
- `Customer.auto_accept_confidence_threshold` - Ngưỡng confidence để auto-accept (default: 90%)
- Capacity check: Cần biết số xe/container available

**🔧 Cần validate:**
- Customer có active không?
- Site có active không?
- Customer có đủ credit limit không?
- Equipment type có hợp lệ không?
- Distance có hợp lệ không?
- Freight charge có đạt minimum price không?

---

### 2. Auto-Driver/Vehicle Assignment (Tự động phân công tài xế/xe)

#### 2.1 Thông Tin Cần Thiết

**✅ Đã có:**
- `Order.driver_id` - Tài xế được giao (NULL = chưa có)
- `Order.vehicle_id` - Xe được giao (từ driver's tractor_id)
- `Order.pickup_site_id` / `Order.pickup_location_id` - Địa điểm lấy hàng
- `Order.eta_pickup_at` - Thời gian dự kiến lấy hàng
- `Order.equipment` - Loại container (20/40/45)
- `Driver.status` - Trạng thái tài xế (ACTIVE/INACTIVE)
- `Driver.tractor_id` - Xe được gán cho tài xế
- `Vehicle.status` - Trạng thái xe (ACTIVE/INACTIVE)
- `Vehicle.type` - Loại xe (TRACTOR/TRAILER)
- `Vehicle.payload_capacity` - Tải trọng (kg)
- `VehicleGPS.vehicle_id` - GPS tracking cho xe
- `VehicleGPS.latitude` / `VehicleGPS.longitude` - Vị trí hiện tại
- `VehicleGPS.work_status` - Trạng thái làm việc (AVAILABLE/ON_TRIP/LOADING/etc)
- `DriverAvailability` - Lịch availability của driver (cho external drivers)

**❌ Chưa có / Cần bổ sung:**
- `Driver.current_location` - Vị trí hiện tại (từ GPS, cần query từ VehicleGPS)
- `Driver.current_order_ids` - Đơn đang làm (cần query từ Order WHERE driver_id AND status IN (ASSIGNED, IN_TRANSIT))
- `Driver.historical_performance` - Hiệu suất (on-time rate, rating, etc.)
- `Driver.preferred_routes` - Tuyến đường ưa thích
- `Driver.max_working_hours_per_day` - Số giờ làm việc tối đa/ngày
- `Driver.rest_hours_required` - Số giờ nghỉ bắt buộc giữa các chuyến
- `Vehicle.current_mileage` - Số km hiện tại
- `Vehicle.maintenance_interval_km` - Định kỳ bảo dưỡng (km)
- `Vehicle.maintenance_interval_days` - Định kỳ bảo dưỡng (ngày)
- `Vehicle.is_available` - Xe có available không (từ GPS work_status + maintenance check)
- `VehicleGPS.remaining_km` - Khoảng cách còn lại đến điểm đến
- `VehicleGPS.eta_destination` - Thời gian dự kiến đến điểm đến
- `Order.trip_id` - Link đến trip (nếu có)

**🔧 Cần tính toán:**
- Distance từ driver's current location đến order pickup location
- Driver's availability window (từ DriverAvailability hoặc work schedule)
- Driver's current workload (số đơn đang làm, số giờ làm việc hôm nay)
- Vehicle capacity match (vehicle.payload_capacity vs order.weight nếu có)
- Route optimization score (nếu driver có nhiều đơn, có thể tạo trip)
- Driver's historical performance (on-time rate từ completed orders)

---

### 3. Auto-Trip Creation & Route Optimization (Tự động tạo trip và tối ưu route)

#### 3.1 Thông Tin Cần Thiết

**✅ Đã có:**
- `Order.id` - ID đơn hàng
- `Order.driver_id` - Tài xế
- `Order.vehicle_id` - Xe (từ driver)
- `Order.pickup_site_id` - Địa điểm lấy hàng
- `Order.delivery_site_id` - Địa điểm giao hàng
- `Order.eta_pickup_at` - Thời gian dự kiến lấy hàng
- `Order.eta_delivery_at` - Thời gian dự kiến giao hàng
- `Order.status` - Trạng thái (ASSIGNED = ready for trip)
- `Trip.id` - ID trip
- `Trip.driver_id` / `Trip.vehicle_id` - Tài xế/xe
- `TripStop.trip_id` - Stops trong trip
- `TripStop.location_id` - Địa điểm stop
- `TripStop.stop_type` - Loại stop (PICKUP/DELIVERY)
- `TripStop.seq` - Thứ tự stop
- `Site.location_id` - Link đến Location (có lat/lng)

**❌ Chưa có / Cần bổ sung:**
- `Location.latitude` / `Location.longitude` - Tọa độ địa điểm (CẦN KIỂM TRA)
- `Site.latitude` / `Site.longitude` - Tọa độ site (CẦN KIỂM TRA - có thể lấy từ Location)
- `Order.weight` / `Order.weight_kg` - Trọng lượng hàng (để check capacity)
- `Order.time_window_start` / `Order.time_window_end` - Cửa sổ thời gian (từ eta_pickup_at/eta_delivery_at)
- `Order.service_time_minutes` - Thời gian phục vụ (loading/unloading)
- `Vehicle.max_capacity_kg` - Tải trọng tối đa (có payload_capacity)
- `Vehicle.max_stops_per_trip` - Số stop tối đa/chuyến (config)
- `Trip.max_distance_km` - Khoảng cách tối đa/chuyến (config)
- `Trip.max_duration_hours` - Thời gian tối đa/chuyến (config)
- `Driver.max_working_hours` - Số giờ làm việc tối đa (config)

**🔧 Cần tính toán:**
- Distance matrix giữa tất cả stops (pickup + delivery locations)
- Travel time giữa các stops (dựa trên distance + average speed)
- Optimized route (TSP solver - OR-Tools)
- Total trip distance và duration
- Capacity check (total weight của tất cả orders trong trip)

---

### 4. GPS-Based Status Detection (Tự động detect status từ GPS)

#### 4.1 Thông Tin Cần Thiết

**✅ Đã có:**
- `VehicleGPS.vehicle_id` - Xe
- `VehicleGPS.latitude` / `VehicleGPS.longitude` - Vị trí GPS hiện tại
- `VehicleGPS.gps_timestamp` - Thời gian GPS
- `VehicleGPS.current_order_id` - Đơn hàng hiện tại
- `VehicleGPS.current_trip_id` - Trip hiện tại
- `Order.pickup_site_id` / `Order.pickup_location_id` - Địa điểm lấy hàng
- `Order.delivery_site_id` / `Order.delivery_location_id` - Địa điểm giao hàng
- `Order.status` - Trạng thái hiện tại
- `Site.location_id` - Link đến Location
- `Location.latitude` / `Location.longitude` - Tọa độ (CẦN KIỂM TRA)

**❌ Chưa có / Cần bổ sung:**
- `Site.latitude` / `Site.longitude` - Tọa độ site (CẦN KIỂM TRA)
- `Site.geofence_radius_meters` - Bán kính geofence (default: 100m)
- `Order.actual_pickup_at` - Thời gian thực tế lấy hàng
- `Order.actual_delivery_at` - Thời gian thực tế giao hàng
- `Order.arrived_at_pickup_at` - Thời gian đến điểm lấy hàng
- `Order.arrived_at_delivery_at` - Thời gian đến điểm giao hàng
- `Order.status_changed_at` - Thời gian đổi trạng thái (có trong TimestampMixin.updated_at)
- GPS update frequency (cần biết GPS được update bao lâu 1 lần)

**🔧 Cần tính toán:**
- Distance từ GPS location đến pickup/delivery location (Haversine formula)
- Time at location (nếu GPS ở gần location > X phút → consider arrived)
- Geofence check (GPS trong bán kính X meters của location)

---

### 5. Auto-ETA Recalculation (Tự động tính lại ETA)

#### 5.1 Thông Tin Cần Thiết

**✅ Đã có:**
- `VehicleGPS.vehicle_id` - Xe
- `VehicleGPS.latitude` / `VehicleGPS.longitude` - Vị trí hiện tại
- `VehicleGPS.speed` - Tốc độ hiện tại (km/h)
- `VehicleGPS.remaining_km` - Khoảng cách còn lại
- `VehicleGPS.eta_destination` - ETA hiện tại
- `Order.eta_pickup_at` / `Order.eta_delivery_at` - ETA ban đầu
- `Order.pickup_site_id` / `Order.delivery_site_id` - Địa điểm đích

**❌ Chưa có / Cần bổ sung:**
- `Site.latitude` / `Site.longitude` - Tọa độ đích (CẦN KIỂM TRA)
- `Location.latitude` / `Location.longitude` - Tọa độ (CẦN KIỂM TRA)
- Traffic data API integration (Google Maps, Here, etc.)
- Historical average speed per route segment
- `Order.original_eta_pickup_at` / `Order.original_eta_delivery_at` - ETA ban đầu (để so sánh)
- `Order.delay_threshold_minutes` - Ngưỡng delay để tạo alert (default: 15 phút)

**🔧 Cần tính toán:**
- Remaining distance từ GPS location đến destination
- Estimated travel time (distance / current_speed hoặc distance / average_speed)
- Traffic adjustment (nếu có traffic API)
- New ETA = current_time + estimated_travel_time + traffic_adjustment
- Delay = new_eta - original_eta

---

### 6. Auto-Fuel Log Entry (Tự động extract từ receipt)

#### 6.1 Thông Tin Cần Thiết

**✅ Đã có:**
- `FuelLog` model (cần check fields)
- AI vision service (đã có trong AIAssistant)

**❌ Chưa có / Cần kiểm tra:**
- `FuelLog` model structure (cần xem fields)
- `FuelLog.vehicle_id` - Xe (auto-match từ receipt)
- `FuelLog.driver_id` - Tài xế (auto-match từ GPS hoặc manual)
- `FuelLog.date` / `FuelLog.time` - Ngày giờ
- `FuelLog.station_name` - Tên trạm xăng
- `FuelLog.liters` - Số lít
- `FuelLog.amount` - Số tiền
- `FuelLog.price_per_liter` - Giá/lít
- `FuelLog.receipt_image_url` - Ảnh receipt (storage)

**🔧 Cần làm:**
- OCR/Image parsing từ receipt image
- Auto-extract: date, time, station, liters, amount, price_per_liter
- Auto-match vehicle từ GPS location (xe nào ở gần trạm xăng nhất)
- Auto-match driver từ vehicle (driver đang đi xe đó)

---

### 7. Auto-Maintenance Scheduling (Tự động schedule bảo dưỡng)

#### 7.1 Thông Tin Cần Thiết

**✅ Đã có:**
- `Vehicle.id` - Xe
- `MaintenanceSchedule` model (cần check fields)
- `MaintenanceRecord` model (cần check fields)

**❌ Chưa có / Cần kiểm tra:**
- `Vehicle.current_mileage` - Số km hiện tại (CẦN KIỂM TRA)
- `Vehicle.maintenance_interval_km` - Định kỳ bảo dưỡng (km) (CẦN KIỂM TRA)
- `Vehicle.maintenance_interval_days` - Định kỳ bảo dưỡng (ngày) (CẦN KIỂM TRA)
- `MaintenanceRecord.last_maintenance_date` - Ngày bảo dưỡng cuối
- `MaintenanceRecord.last_maintenance_mileage` - Số km bảo dưỡng cuối
- `MaintenanceSchedule.scheduled_date` - Ngày dự kiến bảo dưỡng
- `MaintenanceSchedule.type` - Loại bảo dưỡng (PERIODIC, EMERGENCY, etc.)
- `MaintenanceSchedule.status` - Trạng thái (PENDING, COMPLETED, CANCELLED)

**🔧 Cần tính toán:**
- Mileage since last maintenance = current_mileage - last_maintenance_mileage
- Days since last maintenance = today - last_maintenance_date
- Check if mileage_since > maintenance_interval_km
- Check if days_since > maintenance_interval_days
- Create MaintenanceSchedule nếu cần

---

## ⚠️ Data Gaps & Missing Fields

### Critical Missing Fields (Cần bổ sung ngay)

#### 1. Location Coordinates (Latitude/Longitude)
**Vấn đề:** Cần tọa độ để:
- Tính distance giữa các điểm
- GPS-based status detection
- Route optimization

**Kiểm tra:**
- `Location` model có `latitude` / `longitude` không?
- `Site` model có `latitude` / `longitude` không?
- Nếu không có → cần geocoding từ address

**Solution:**
- Thêm fields vào `Location` và `Site` models
- Geocoding service (Google Maps Geocoding API)
- Migration để populate existing data

#### 2. Vehicle Current Mileage
**Vấn đề:** Cần để auto-maintenance scheduling

**Kiểm tra:**
- `Vehicle` model có `current_mileage` không?

**Solution:**
- Thêm field `current_mileage` vào `Vehicle` model
- Update từ GPS hoặc manual entry

#### 3. Vehicle Maintenance Intervals
**Vấn đề:** Cần để auto-schedule maintenance

**Kiểm tra:**
- `Vehicle` model có `maintenance_interval_km` / `maintenance_interval_days` không?

**Solution:**
- Thêm fields vào `Vehicle` model
- Default values per vehicle type

#### 4. Order Priority
**Vấn đề:** Cần để auto-acceptance và assignment priority

**Kiểm tra:**
- `Order` model có `priority` field không?

**Solution:**
- Thêm `priority` field (URGENT, HIGH, NORMAL, LOW)
- Default: NORMAL

#### 5. Order Weight
**Vấn đề:** Cần để check vehicle capacity

**Kiểm tra:**
- `Order` model có `weight` / `weight_kg` field không?

**Solution:**
- Thêm field `weight_kg` vào `Order` model
- Optional (nếu không có thì skip capacity check)

#### 6. Driver Performance Metrics
**Vấn đề:** Cần để scoring driver assignment

**Kiểm tra:**
- Có table `DriverPerformance` không?
- Có cache metrics không?

**Solution:**
- Create service để calculate performance từ historical orders
- Cache results (on-time rate, rating, etc.)

#### 7. Customer Auto-Accept Config
**Vấn đề:** Cần để enable/disable auto-acceptance per customer

**Kiểm tra:**
- `Customer` model có config fields không?

**Solution:**
- Thêm fields: `auto_accept_enabled`, `auto_accept_confidence_threshold`
- Default: disabled

#### 8. Site Geofence Radius
**Vấn đề:** Cần để GPS-based status detection

**Kiểm tra:**
- `Site` model có `geofence_radius_meters` không?

**Solution:**
- Thêm field `geofence_radius_meters` (default: 100m)

---

### Nice-to-Have Fields (Có thể bổ sung sau)

1. **Order Time Windows**: `time_window_start`, `time_window_end` (từ ETA, có thể tính được)
2. **Order Service Time**: `service_time_minutes` (default: 30 phút)
3. **Vehicle Max Capacity**: `max_capacity_kg` (có `payload_capacity`, OK)
4. **Driver Preferences**: `preferred_routes`, `max_hours_per_day` (có thể lấy từ config)
5. **Route Segments**: Historical average speed per segment (có thể tính từ completed trips)

---

## ✅ Checklist Prerequisites

### Phase 1: Foundation (2-3 tuần)

#### Week 1: Data Schema Updates
- [ ] **Location Coordinates**
  - [ ] Check `Location` model có `latitude` / `longitude`
  - [ ] Check `Site` model có `latitude` / `longitude`
  - [ ] Nếu không có → add fields
  - [ ] Create migration
  - [ ] Geocoding service để populate existing data

- [ ] **Vehicle Maintenance Fields**
  - [ ] Add `current_mileage` to `Vehicle`
  - [ ] Add `maintenance_interval_km` to `Vehicle`
  - [ ] Add `maintenance_interval_days` to `Vehicle`
  - [ ] Create migration

- [ ] **Order Priority & Weight**
  - [ ] Add `priority` field to `Order` (default: NORMAL)
  - [ ] Add `weight_kg` field to `Order` (optional)
  - [ ] Create migration

- [ ] **Site Geofence**
  - [ ] Add `geofence_radius_meters` to `Site` (default: 100m)
  - [ ] Create migration

- [ ] **Customer Auto-Accept Config**
  - [ ] Add `auto_accept_enabled` to `Customer` (default: False)
  - [ ] Add `auto_accept_confidence_threshold` to `Customer` (default: 90)
  - [ ] Create migration

#### Week 2: Background Jobs & Services
- [ ] **Background Job System**
  - [ ] Setup Celery hoặc FastAPI BackgroundTasks
  - [ ] Create job scheduler
  - [ ] Setup monitoring & logging

- [ ] **GPS Service Improvements**
  - [ ] Improve GPS sync frequency
  - [ ] Cache vehicle current location
  - [ ] Add geofencing helpers

- [ ] **Distance Calculation Service**
  - [ ] Haversine formula implementation
  - [ ] Cache distance matrix
  - [ ] Integrate with Google Maps Distance Matrix API (optional)

#### Week 3: Validation & Testing
- [ ] **Data Validation**
  - [ ] Validate all required fields có data
  - [ ] Populate missing data (geocoding, mileage, etc.)
  - [ ] Test distance calculations

- [ ] **Integration Testing**
  - [ ] Test GPS sync
  - [ ] Test distance calculations
  - [ ] Test geofencing

---

### Phase 2: Auto-Acceptance (1-2 tuần)

#### Prerequisites Check:
- [x] Order model có đủ fields
- [x] Customer model có config fields
- [ ] Location/Site có coordinates (CẦN KIỂM TRA)
- [ ] Rates table có data để validate price

#### Implementation:
- [ ] Order validation service
- [ ] Auto-acceptance logic
- [ ] Background job (check NEW orders mỗi 1 phút)
- [ ] AIDecision creation nếu cần approval
- [ ] Testing với real orders

---

### Phase 3: Auto-Assignment (2-3 tuần)

#### Prerequisites Check:
- [ ] DriverAvailability có data (cho external drivers)
- [ ] VehicleGPS có real-time data
- [ ] Location/Site có coordinates
- [ ] Driver performance metrics có thể calculate được

#### Implementation:
- [ ] Driver scoring service
- [ ] GPS-based location calculation
- [ ] Availability check service
- [ ] Auto-assignment logic
- [ ] Background job (check ACCEPTED orders mỗi 2 phút)
- [ ] Testing với real scenarios

---

### Phase 4: Auto-Trip Creation (2-3 tuần)

#### Prerequisites Check:
- [ ] Location/Site có coordinates
- [ ] Distance calculation working
- [ ] OR-Tools hoặc TSP solver installed
- [ ] Order có weight data (nếu cần capacity check)

#### Implementation:
- [ ] Route optimization service (TSP solver)
- [ ] Trip creation logic
- [ ] Multi-stop optimization
- [ ] Background job (check ASSIGNED orders mỗi 5 phút)
- [ ] Testing với multiple orders

---

### Phase 5: GPS-Based Automation (2-3 tuần)

#### Prerequisites Check:
- [ ] VehicleGPS có real-time data (update mỗi 30s-1min)
- [ ] Location/Site có coordinates
- [ ] Site có geofence_radius_meters
- [ ] Order có actual_pickup_at / actual_delivery_at fields

#### Implementation:
- [ ] Geofencing service
- [ ] GPS-based status detection
- [ ] Background job (check active orders mỗi 30s)
- [ ] Auto-status update logic
- [ ] Testing với real GPS data

---

### Phase 6: ETA Recalculation (1-2 tuần)

#### Prerequisites Check:
- [ ] VehicleGPS có speed data
- [ ] Location/Site có coordinates
- [ ] Traffic API key (optional, có thể dùng average speed)

#### Implementation:
- [ ] ETA recalculation service
- [ ] Traffic integration (optional)
- [ ] Background job (recalculate mỗi 2 phút)
- [ ] Delay alert creation
- [ ] Testing với real scenarios

---

## 🔍 Data Validation Queries

### Check Location Coordinates
```sql
-- Check Location có coordinates không
SELECT COUNT(*) as total,
       COUNT(latitude) as has_lat,
       COUNT(longitude) as has_lng
FROM locations;

-- Check Site có coordinates không (qua Location)
SELECT s.id, s.company_name, l.latitude, l.longitude
FROM sites s
LEFT JOIN locations l ON s.location_id = l.id
WHERE l.latitude IS NULL OR l.longitude IS NULL;
```

### Check Vehicle Maintenance Data
```sql
-- Check Vehicle có mileage và intervals không
SELECT COUNT(*) as total,
       COUNT(current_mileage) as has_mileage,
       COUNT(maintenance_interval_km) as has_interval_km,
       COUNT(maintenance_interval_days) as has_interval_days
FROM vehicles
WHERE status = 'ACTIVE';
```

### Check GPS Data Quality
```sql
-- Check GPS update frequency (last 24h)
SELECT vehicle_id, COUNT(*) as updates_count
FROM vehicle_gps
WHERE gps_timestamp > NOW() - INTERVAL '24 hours'
GROUP BY vehicle_id
ORDER BY updates_count DESC;

-- Check GPS có location data không
SELECT COUNT(*) as total,
       COUNT(latitude) as has_lat,
       COUNT(longitude) as has_lng,
       COUNT(speed) as has_speed
FROM vehicle_gps
WHERE gps_timestamp > NOW() - INTERVAL '1 hour';
```

### Check Driver Availability
```sql
-- Check external drivers có availability data không
SELECT d.id, d.name, d.source, COUNT(da.id) as availability_count
FROM drivers d
LEFT JOIN driver_availability da ON d.external_worker_id = da.worker_id
WHERE d.source = 'EXTERNAL' AND d.status = 'ACTIVE'
GROUP BY d.id, d.name, d.source;
```

---

## 📝 Next Steps

1. **Immediate Actions:**
   - Check các models có đủ fields chưa (Location, Site, Vehicle, Order)
   - Identify missing fields
   - Create migration scripts

2. **Data Population:**
   - Geocoding để populate Location/Site coordinates
   - Update Vehicle current_mileage và maintenance intervals
   - Configure Customer auto-accept settings

3. **Service Implementation:**
   - Distance calculation service
   - GPS geofencing service
   - Driver performance calculation service

4. **Testing:**
   - Test với sample data
   - Validate calculations
   - Performance testing

---

*Document created: 2025-01-05*
*Last updated: 2025-01-05*
