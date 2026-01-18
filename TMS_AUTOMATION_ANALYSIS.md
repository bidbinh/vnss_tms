# Phân Tích Quy Trình TMS & Đề Xuất Tự Động Hóa AI

## 📋 Mục Lục
1. [Quy Trình Hoạt Động Hiện Tại](#quy-trình-hoạt-động-hiện-tại)
2. [Điểm Cần Tối Ưu](#điểm-cần-tối-ưu)
3. [Tự Động Hóa Bằng AI](#tự-động-hóa-bằng-ai)
4. [Roadmap Triển Khai](#roadmap-triển-khai)

---

## 🔄 Quy Trình Hoạt Động Hiện Tại

### 1. Order Creation (Tạo Đơn Hàng)

**Quy trình hiện tại:**
```
Customer/User → Nhập thông tin đơn → Tạo Order (status: NEW)
                ↓
         [AI Assistant] Parse text/image (optional)
                ↓
         Backend: Auto-calculate distance_km, freight_charge từ Rates
                ↓
         Order được tạo với status = NEW
```

**Các bước thủ công:**
- ✅ **Đã tự động**: Parse text/image bằng AI
- ✅ **Đã tự động**: Tính distance từ Rates table
- ✅ **Đã tự động**: Tính freight_charge từ Rates table
- ❌ **Thủ công**: Customer phải chọn customer_id, site_id
- ❌ **Thủ công**: Dispatcher phải review và accept/reject

**Điểm nghẽn:**
- Dispatcher phải review từng đơn NEW → chậm
- Không có auto-validation về capacity, driver availability
- Không có auto-suggestion về pricing

---

### 2. Order Acceptance & Assignment (Chấp Nhận & Phân Công)

**Quy trình hiện tại:**
```
Order (NEW) → Dispatcher review → Accept/Reject
                ↓ (Accept)
         Assign driver_id + vehicle_id + ETAs
                ↓
         Status: ASSIGNED
                ↓
         [Manual] Driver nhận thông báo (nếu có mobile app)
```

**Các bước thủ công:**
- ❌ **Thủ công**: Dispatcher phải chọn driver
- ❌ **Thủ công**: Dispatcher phải chọn vehicle
- ❌ **Thủ công**: Dispatcher phải tính ETAs
- ❌ **Thủ công**: Dispatcher phải check driver availability
- ✅ **Có sẵn**: AI suggest driver (nhưng chưa tự động assign)

**Điểm nghẽn:**
- Dispatcher phải làm việc thủ công cho mỗi đơn
- Không có auto-optimization về route, capacity
- Không có real-time driver availability check

---

### 3. Trip Planning (Lập Kế Hoạch Chuyến)

**Quy trình hiện tại:**
```
Orders (ASSIGNED) → Dispatcher tạo Trip manually
                ↓
         Assign stops (pickup/delivery locations)
                ↓
         Assign vehicle + driver + trailer
                ↓
         Status: DISPATCHED
```

**Các bước thủ công:**
- ❌ **Thủ công**: Tạo Trip từ Orders
- ❌ **Thủ công**: Sắp xếp stops theo thứ tự tối ưu
- ❌ **Thủ công**: Assign vehicle/driver/trailer
- ❌ **Thủ công**: Tính distance, route

**Điểm nghẽn:**
- Không có auto-trip creation từ multiple orders
- Không có route optimization
- Không có capacity matching (vehicle size vs cargo)

---

### 4. Execution (Thực Thi)

**Quy trình hiện tại:**
```
Trip (DISPATCHED) → Driver pickup → Status: IN_TRANSIT
                ↓
         Driver delivering → Status: DELIVERED
                ↓
         Empty return → Status: COMPLETED
```

**Các bước thủ công:**
- ✅ **Có GPS**: Track vehicle location (nếu có GPS provider)
- ❌ **Thủ công**: Driver phải update status manually
- ❌ **Thủ công**: Dispatcher phải theo dõi và nhắc nhở
- ❌ **Thủ công**: Không có auto-alert khi delay

**Điểm nghẽn:**
- Phụ thuộc vào driver update status
- Không có real-time ETA recalculation
- Không có auto-alert khi có vấn đề

---

### 5. Financial & Reporting (Tài Chính & Báo Cáo)

**Quy trình hiện tại:**
```
Order (COMPLETED) → Manual calculation
                ↓
         Driver salary calculation
                ↓
         Trip revenue calculation
                ↓
         Fuel logs entry (manual)
```

**Các bước thủ công:**
- ✅ **Đã tự động**: Driver salary calculation (có service)
- ✅ **Đã tự động**: Trip revenue calculation
- ❌ **Thủ công**: Fuel logs phải nhập thủ công
- ❌ **Thủ công**: Maintenance scheduling phải check thủ công

---

## 🎯 Điểm Cần Tối Ưu

### 1. Order Processing Speed
**Vấn đề:**
- Dispatcher phải review từng đơn → bottleneck
- Không có auto-acceptance cho đơn hợp lệ

**Giải pháp:**
- Auto-acceptance cho đơn có đủ thông tin và hợp lệ
- Auto-rejection với reason cho đơn không hợp lệ
- Priority queue cho đơn urgent

### 2. Driver/Vehicle Assignment
**Vấn đề:**
- Dispatcher phải chọn driver/vehicle thủ công
- Không có optimization về location, capacity, availability

**Giải pháp:**
- Auto-assignment dựa trên:
  - Driver location (GPS)
  - Driver availability (schedule, rest time)
  - Vehicle capacity match
  - Route optimization
  - Historical performance

### 3. Route Optimization
**Vấn đề:**
- Không có auto-route planning
- Không có multi-stop optimization
- Không có real-time traffic consideration

**Giải pháp:**
- AI route optimization:
  - TSP (Traveling Salesman Problem) solver
  - Real-time traffic data integration
  - Multi-stop trip planning
  - Dynamic re-routing khi có delay

### 4. Real-time Monitoring
**Vấn đề:**
- Phụ thuộc vào driver update status
- Không có proactive alerting
- Không có ETA recalculation

**Giải pháp:**
- GPS-based status detection:
  - Auto-detect pickup (arrived at pickup location)
  - Auto-detect delivery (arrived at delivery location)
  - Auto-calculate ETA dựa trên current location + traffic
  - Auto-alert khi delay > threshold

### 5. Data Entry Automation
**Vấn đề:**
- Fuel logs phải nhập thủ công
- Maintenance records phải check thủ công
- Documents phải upload thủ công

**Giải pháp:**
- OCR/Image parsing cho fuel receipts
- Auto-maintenance scheduling dựa trên mileage/time
- Auto-document extraction từ images

---

## 🤖 Tự Động Hóa Bằng AI

### Level 1: AI-Assisted (Có sẵn, cần cải thiện)

#### 1.1 Order Parsing (✅ Đã có)
**Hiện tại:**
- Parse text/image → extract order info
- Suggest customer, site matching

**Cần cải thiện:**
- ✅ **Tự động tạo Site** nếu không tìm thấy (đã có trong frontend)
- ✅ **Tự động match Customer** dựa trên location pattern
- ⚠️ **Cần**: Auto-create order nếu confidence > 90%
- ⚠️ **Cần**: Auto-validate order data (equipment, dates, locations)

#### 1.2 Driver Suggestion (✅ Đã có)
**Hiện tại:**
- AI suggest driver dựa trên route

**Cần cải thiện:**
- ⚠️ **Cần**: Tự động assign nếu confidence > 85%
- ⚠️ **Cần**: Consider real-time GPS location
- ⚠️ **Cần**: Consider driver schedule/availability
- ⚠️ **Cần**: Consider vehicle capacity match

---

### Level 2: AI-Automated (Cần triển khai)

#### 2.1 Auto-Order Acceptance
**Mục tiêu:** Tự động accept/reject orders không cần dispatcher review

**Logic:**
```python
def auto_accept_order(order):
    # Check 1: Required fields
    if not order.has_required_fields():
        return {"action": "REJECT", "reason": "Missing required fields"}
    
    # Check 2: Customer validation
    if not order.customer.is_active():
        return {"action": "REJECT", "reason": "Customer inactive"}
    
    # Check 3: Location validation
    if not order.has_valid_locations():
        return {"action": "REJECT", "reason": "Invalid locations"}
    
    # Check 4: Capacity check
    if not has_available_capacity(order):
        return {"action": "HOLD", "reason": "No capacity available"}
    
    # Check 5: Pricing validation
    if order.freight_charge < min_price_threshold:
        return {"action": "PENDING_APPROVAL", "reason": "Price too low"}
    
    # All checks passed → AUTO ACCEPT
    return {"action": "ACCEPT", "confidence": 0.95}
```

**Implementation:**
- Background job chạy mỗi 1 phút
- Check orders với status = NEW
- Auto-accept nếu confidence > 90%
- Auto-reject nếu confidence < 50%
- Pending approval nếu 50% < confidence < 90%

#### 2.2 Auto-Driver/Vehicle Assignment
**Mục tiêu:** Tự động assign driver + vehicle cho orders đã accept

**Logic:**
```python
def auto_assign_order(order):
    # Step 1: Find available drivers
    available_drivers = get_available_drivers(
        location=order.pickup_location,
        time_window=order.eta_pickup_at,
        capacity=order.equipment
    )
    
    # Step 2: Score each driver
    scores = []
    for driver in available_drivers:
        score = calculate_driver_score(
            driver=driver,
            order=order,
            factors=[
                "distance_to_pickup",      # GPS-based
                "historical_performance",   # On-time rate
                "route_optimization",       # Fits into existing trip
                "driver_preference",        # Preferred routes
                "capacity_match",           # Vehicle size
                "availability_window"       # Schedule match
            ]
        )
        scores.append((driver, score))
    
    # Step 3: Select best driver
    best_driver = max(scores, key=lambda x: x[1])
    
    if best_driver[1] > 0.8:  # High confidence
        return {
            "action": "AUTO_ASSIGN",
            "driver_id": best_driver[0].id,
            "vehicle_id": best_driver[0].vehicle_id,
            "confidence": best_driver[1]
        }
    else:
        return {
            "action": "SUGGEST",
            "suggestions": scores[:3]  # Top 3
        }
```

**Implementation:**
- Background job chạy mỗi 2 phút
- Check orders với status = ACCEPTED (chưa có driver)
- Auto-assign nếu confidence > 80%
- Create AIDecision record nếu cần approval

#### 2.3 Auto-Trip Creation & Optimization
**Mục tiêu:** Tự động tạo trips từ multiple orders và optimize route

**Logic:**
```python
def auto_create_optimized_trips():
    # Step 1: Get unassigned orders
    orders = get_orders(status="ASSIGNED", has_driver=True, no_trip=True)
    
    # Step 2: Group by driver
    orders_by_driver = group_by(orders, key="driver_id")
    
    # Step 3: For each driver, create optimized trip
    for driver_id, driver_orders in orders_by_driver.items():
        # Use TSP solver to optimize route
        optimized_route = solve_tsp(
            start_location=driver.current_location,  # GPS
            orders=driver_orders,
            constraints=[
                "time_windows",      # ETA constraints
                "capacity",          # Vehicle capacity
                "driver_hours"       # Max working hours
            ]
        )
        
        # Create trip with optimized stops
        trip = create_trip(
            driver_id=driver_id,
            vehicle_id=driver.vehicle_id,
            stops=optimized_route.stops,
            estimated_distance=optimized_route.total_distance,
            estimated_duration=optimized_route.total_duration
        )
        
        # Link orders to trip
        for order in driver_orders:
            order.trip_id = trip.id
```

**Implementation:**
- Background job chạy mỗi 5 phút
- Group orders by driver
- Use OR-Tools hoặc custom TSP solver
- Create trips với optimized stops
- Update orders với trip_id

#### 2.4 GPS-Based Status Detection
**Mục tiêu:** Tự động detect order status dựa trên GPS location

**Logic:**
```python
def auto_detect_order_status():
    # Get active orders with GPS tracking
    active_orders = get_orders(
        status=["ASSIGNED", "IN_TRANSIT"],
        has_gps=True
    )
    
    for order in active_orders:
        vehicle_gps = get_vehicle_gps(order.vehicle_id)
        
        # Check if arrived at pickup
        if order.status == "ASSIGNED":
            distance_to_pickup = calculate_distance(
                vehicle_gps.location,
                order.pickup_location
            )
            
            if distance_to_pickup < 100:  # Within 100m
                # Auto-update to IN_TRANSIT
                order.status = "IN_TRANSIT"
                order.actual_pickup_at = datetime.utcnow()
                log_status_change(order, "ASSIGNED", "IN_TRANSIT", "GPS_AUTO")
        
        # Check if arrived at delivery
        elif order.status == "IN_TRANSIT":
            distance_to_delivery = calculate_distance(
                vehicle_gps.location,
                order.delivery_location
            )
            
            if distance_to_delivery < 100:  # Within 100m
                # Wait 5 minutes to confirm (driver might be unloading)
                if time_at_location > 5_minutes:
                    order.status = "DELIVERED"
                    order.actual_delivery_at = datetime.utcnow()
                    log_status_change(order, "IN_TRANSIT", "DELIVERED", "GPS_AUTO")
```

**Implementation:**
- Background job chạy mỗi 30 giây
- Check GPS location vs order locations
- Auto-update status khi detect arrival
- Send notification cho dispatcher/driver

#### 2.5 Auto-ETA Recalculation
**Mục tiêu:** Tự động tính lại ETA dựa trên current location + traffic

**Logic:**
```python
def auto_recalculate_eta(order):
    vehicle_gps = get_vehicle_gps(order.vehicle_id)
    
    # Get current location
    current_location = vehicle_gps.location
    
    # Get destination
    if order.status == "ASSIGNED":
        destination = order.pickup_location
    elif order.status == "IN_TRANSIT":
        destination = order.delivery_location
    
    # Calculate ETA with traffic
    eta = calculate_eta_with_traffic(
        from_location=current_location,
        to_location=destination,
        current_speed=vehicle_gps.speed,
        traffic_data=get_traffic_data(current_location, destination)
    )
    
    # Update order ETA
    if order.status == "ASSIGNED":
        order.eta_pickup_at = eta
    else:
        order.eta_delivery_at = eta
    
    # Alert if delay > 15 minutes
    if eta > original_eta + 15_minutes:
        create_alert(
            type="DELAY",
            order_id=order.id,
            message=f"Estimated delay: {eta - original_eta}"
        )
```

**Implementation:**
- Background job chạy mỗi 2 phút
- Recalculate ETA cho active orders
- Update order.eta_* fields
- Create alerts nếu có delay

#### 2.6 Auto-Fuel Log Entry
**Mục tiêu:** Tự động extract fuel data từ receipt images

**Logic:**
```python
def auto_extract_fuel_log(image_base64):
    # Use AI vision to extract fuel data
    result = ai_assistant.extract_from_image(
        image=image_base64,
        prompt="Extract fuel purchase data: date, time, station, amount, liters, price_per_liter"
    )
    
    # Parse extracted data
    fuel_data = {
        "date": parse_date(result["date"]),
        "station": result["station_name"],
        "liters": float(result["liters"]),
        "amount": float(result["total_amount"]),
        "price_per_liter": float(result["price_per_liter"])
    }
    
    # Match to vehicle (from image or driver input)
    vehicle = match_vehicle(fuel_data["station"], driver.current_location)
    
    # Create fuel log
    fuel_log = FuelLog(
        vehicle_id=vehicle.id,
        driver_id=driver.id,
        **fuel_data
    )
    
    return fuel_log
```

**Implementation:**
- API endpoint: `/api/v1/fuel-logs/upload-receipt`
- Use AI vision (Claude/Gemini) để extract data
- Auto-match vehicle dựa trên location/pattern
- Create fuel log record

#### 2.7 Auto-Maintenance Scheduling
**Mục tiêu:** Tự động schedule maintenance dựa trên mileage/time

**Logic:**
```python
def auto_schedule_maintenance():
    # Get all active vehicles
    vehicles = get_vehicles(status="ACTIVE")
    
    for vehicle in vehicles:
        # Check mileage-based maintenance
        last_maintenance = get_last_maintenance(vehicle.id)
        mileage_since = vehicle.current_mileage - last_maintenance.mileage
        
        if mileage_since > vehicle.maintenance_interval_km:
            create_maintenance_schedule(
                vehicle_id=vehicle.id,
                type="PERIODIC",
                due_date=datetime.utcnow(),
                reason=f"Mileage reached: {mileage_since} km"
            )
        
        # Check time-based maintenance
        days_since = (datetime.utcnow() - last_maintenance.date).days
        
        if days_since > vehicle.maintenance_interval_days:
            create_maintenance_schedule(
                vehicle_id=vehicle.id,
                type="PERIODIC",
                due_date=datetime.utcnow(),
                reason=f"Time reached: {days_since} days"
            )
```

**Implementation:**
- Background job chạy mỗi ngày
- Check mileage và time intervals
- Auto-create maintenance schedules
- Send alerts cho fleet manager

---

### Level 3: Full Automation (Mục tiêu cuối cùng)

#### 3.1 End-to-End Automation
**Mục tiêu:** Từ order creation → delivery → payment, tất cả tự động

**Flow:**
```
1. Customer tạo order (text/image) 
   → AI parse → Auto-create order
   
2. Order (NEW) 
   → AI validate → Auto-accept (nếu hợp lệ)
   
3. Order (ACCEPTED) 
   → AI assign driver/vehicle → Auto-assign
   
4. Multiple orders 
   → AI optimize route → Auto-create trip
   
5. Trip execution 
   → GPS track → Auto-update status
   
6. Delivery complete 
   → AI extract POD → Auto-complete order
   
7. Order completed 
   → Auto-calculate salary → Auto-generate invoice
```

#### 3.2 Predictive Analytics
**Mục tiêu:** Dự đoán và prevent issues trước khi xảy ra

**Use cases:**
- **Predict delay**: Dự đoán delay dựa trên traffic, weather, historical data
- **Predict maintenance**: Dự đoán khi nào cần maintenance dựa trên usage pattern
- **Predict demand**: Dự đoán order volume để optimize fleet
- **Predict driver availability**: Dự đoán khi nào driver sẽ available

#### 3.3 Self-Learning System
**Mục tiêu:** Hệ thống tự học từ decisions và improve accuracy

**Mechanism:**
- Track AI decisions vs actual outcomes
- Learn từ dispatcher overrides
- Improve scoring algorithms dựa trên feedback
- Auto-adjust confidence thresholds

---

## 🗺️ Roadmap Triển Khai

### Phase 1: Foundation (2-3 tuần)
**Mục tiêu:** Setup infrastructure cho AI automation

1. ✅ **Background Jobs System**
   - Setup Celery hoặc FastAPI BackgroundTasks
   - Create job scheduler
   - Setup monitoring & logging

2. ✅ **AI Decision System**
   - Extend AIDecision model
   - Create decision execution engine
   - Setup approval workflow

3. ✅ **GPS Integration**
   - Improve GPS sync service
   - Add location-based triggers
   - Setup geofencing

### Phase 2: Auto-Acceptance (1-2 tuần)
**Mục tiêu:** Tự động accept/reject orders

1. **Order Validation Service**
   - Implement validation rules
   - Create confidence scoring
   - Setup auto-acceptance logic

2. **Background Job**
   - Check NEW orders mỗi 1 phút
   - Auto-accept/reject based on confidence
   - Create AIDecision records

3. **Testing & Tuning**
   - Test với real orders
   - Tune confidence thresholds
   - Monitor accuracy

### Phase 3: Auto-Assignment (2-3 tuần)
**Mục tiêu:** Tự động assign driver/vehicle

1. **Driver Scoring Service**
   - Implement scoring algorithm
   - Consider GPS location, availability, performance
   - Create optimization engine

2. **Background Job**
   - Check ACCEPTED orders mỗi 2 phút
   - Auto-assign best driver/vehicle
   - Create AIDecision nếu cần approval

3. **Testing & Tuning**
   - Test với real scenarios
   - Compare AI vs manual assignments
   - Improve scoring weights

### Phase 4: Auto-Trip Creation (2-3 tuần)
**Mục tiêu:** Tự động tạo và optimize trips

1. **Route Optimization Service**
   - Integrate TSP solver (OR-Tools)
   - Implement multi-stop optimization
   - Consider time windows, capacity

2. **Background Job**
   - Group orders by driver mỗi 5 phút
   - Create optimized trips
   - Link orders to trips

3. **Testing & Tuning**
   - Test route optimization
   - Compare với manual trips
   - Improve optimization parameters

### Phase 5: GPS-Based Automation (2-3 tuần)
**Mục tiêu:** Tự động detect status từ GPS

1. **GPS Status Detection**
   - Implement geofencing
   - Auto-detect arrival at locations
   - Auto-update order status

2. **ETA Recalculation**
   - Integrate traffic API
   - Recalculate ETA mỗi 2 phút
   - Create delay alerts

3. **Testing & Tuning**
   - Test với real GPS data
   - Tune geofencing radius
   - Improve accuracy

### Phase 6: Document Automation (1-2 tuần)
**Mục tiêu:** Tự động extract data từ documents

1. **Fuel Log OCR**
   - Improve AI vision extraction
   - Auto-match vehicle
   - Auto-create fuel logs

2. **POD Extraction**
   - Extract delivery proof từ images
   - Auto-complete orders
   - Store documents

3. **Testing & Tuning**
   - Test với various receipt formats
   - Improve extraction accuracy
   - Handle edge cases

### Phase 7: Predictive & Learning (3-4 tuần)
**Mục tiêu:** Predictive analytics và self-learning

1. **Predictive Models**
   - Delay prediction
   - Maintenance prediction
   - Demand forecasting

2. **Learning System**
   - Track decisions vs outcomes
   - Learn từ overrides
   - Auto-adjust thresholds

3. **Testing & Tuning**
   - Validate predictions
   - Measure improvement
   - Continuous learning

---

## 📊 Metrics & KPIs

### Automation Metrics
- **Auto-acceptance rate**: % orders auto-accepted
- **Auto-assignment rate**: % orders auto-assigned
- **AI decision accuracy**: % AI decisions không bị override
- **Time saved**: Giờ tiết kiệm mỗi ngày

### Performance Metrics
- **Order processing time**: Từ creation → assignment
- **Trip optimization**: % improvement về distance/time
- **On-time delivery rate**: % orders delivered on time
- **Driver utilization**: % thời gian driver được sử dụng

### Quality Metrics
- **Error rate**: % AI decisions sai
- **Customer satisfaction**: Rating từ customers
- **Dispatcher satisfaction**: Rating từ dispatchers
- **Cost savings**: Chi phí tiết kiệm từ optimization

---

## 🎯 Kết Luận

### Tình Trạng Hiện Tại
- ✅ **Có sẵn**: AI parsing, driver suggestion, GPS tracking
- ⚠️ **Cần cải thiện**: Auto-acceptance, auto-assignment, route optimization
- ❌ **Chưa có**: GPS-based status detection, predictive analytics, self-learning

### Mục Tiêu
- **Ngắn hạn (3 tháng)**: 70% orders được auto-process (accept + assign)
- **Trung hạn (6 tháng)**: 90% orders được auto-process, có route optimization
- **Dài hạn (12 tháng)**: 95%+ automation, có predictive analytics, self-learning

### Lợi Ích
- **Tăng tốc độ**: Order processing time giảm 80%
- **Giảm chi phí**: Tối ưu route → giảm fuel cost 15-20%
- **Tăng chất lượng**: Ít lỗi hơn, on-time delivery rate tăng
- **Giải phóng nhân lực**: Dispatcher tập trung vào exceptions, không phải routine tasks

---

*Document created: 2025-01-05*
*Last updated: 2025-01-05*
