# TMS Automation - Quick Start Guide

## 🚀 Bắt Đầu Nhanh

### 1. Run Migrations
```bash
cd backend
alembic upgrade head
```

### 2. Populate Coordinates (Optional)
```bash
# Set GOOGLE_MAPS_API_KEY in .env (optional)
# If not set, will use free Nominatim service
python -m scripts.populate_coordinates
```

### 3. Enable Auto-Accept for Customer (Optional)
```sql
UPDATE customers
SET auto_accept_enabled = true,
    auto_accept_confidence_threshold = 90.0
WHERE code = 'ADG';  -- Example customer
```

### 4. Test Automation

**Via API:**
```bash
# 1. Auto-accept orders
curl -X POST http://localhost:8001/api/v1/automation/auto-accept-orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# 2. Auto-assign drivers
curl -X POST http://localhost:8001/api/v1/automation/auto-assign-drivers \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Run all automation jobs
curl -X POST http://localhost:8001/api/v1/automation/run-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Via Python:**
```python
from app.services.automation_jobs import get_automation_jobs
from app.db.session import SessionLocal

automation = get_automation_jobs()
with SessionLocal() as session:
    # Auto-accept orders
    result = automation.auto_accept_orders(session, tenant_id="...", limit=50)
    print(result)
```

---

## 📋 API Endpoints

### POST `/api/v1/automation/auto-accept-orders`
Auto-accept/reject NEW orders based on validation

**Query params:**
- `limit` (int, default: 50): Max orders to process

**Response:**
```json
{
  "message": "Auto-acceptance job started",
  "limit": 50
}
```

### POST `/api/v1/automation/auto-assign-drivers`
Auto-assign drivers to ACCEPTED orders

**Query params:**
- `limit` (int, default: 50): Max orders to process

### POST `/api/v1/automation/detect-gps-status`
Detect order status changes from GPS data

**Query params:**
- `limit` (int, default: 100): Max orders to check

### POST `/api/v1/automation/recalculate-etas`
Recalculate ETAs for active orders

**Query params:**
- `limit` (int, default: 100): Max orders to process

### POST `/api/v1/automation/run-all`
Run all automation jobs in sequence

---

## ⚙️ Configuration

### Environment Variables
```env
# Optional: Google Maps API for better accuracy
GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Customer Settings
```sql
-- Enable auto-accept
UPDATE customers SET auto_accept_enabled = true WHERE id = '...';

-- Set confidence threshold (0-100)
UPDATE customers SET auto_accept_confidence_threshold = 90.0 WHERE id = '...';

-- Set delay alert threshold (minutes)
UPDATE customers SET delay_alert_threshold_minutes = 15 WHERE id = '...';
```

### Site Settings
```sql
-- Adjust geofence radius (meters, default: 100)
UPDATE sites SET geofence_radius_meters = 150 WHERE id = '...';

-- Set service time (minutes, default: 30)
UPDATE sites SET service_time_minutes = 45 WHERE id = '...';
```

### Vehicle Settings
```sql
-- Set maintenance intervals
UPDATE vehicles
SET current_mileage = 50000,
    maintenance_interval_km = 10000,
    maintenance_interval_days = 90
WHERE id = '...';
```

---

## 📊 Monitoring

### Check Automation Logs
```sql
SELECT * FROM dispatch_logs
WHERE is_ai = true
ORDER BY created_at DESC
LIMIT 50;
```

### Check AI Decisions
```sql
-- Pending decisions
SELECT * FROM ai_decisions
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Approved decisions
SELECT * FROM ai_decisions
WHERE status = 'approved'
ORDER BY created_at DESC;
```

### Check Alerts
```sql
SELECT * FROM dispatch_alerts
WHERE is_resolved = false
ORDER BY created_at DESC;
```

---

## 🔄 Scheduled Jobs

### Option 1: FastAPI BackgroundTasks (Simple)
Đã implement trong API endpoints, có thể gọi từ:
- Frontend button
- External scheduler (cron, etc.)
- Webhook

### Option 2: Celery (Recommended for Production)
```python
# backend/app/celery_app.py
from celery import Celery
from app.services.automation_jobs import get_automation_jobs
from app.db.session import SessionLocal

celery_app = Celery('tms_automation')

@celery_app.task
def auto_accept_orders_task(tenant_id: str):
    automation = get_automation_jobs()
    with SessionLocal() as session:
        return automation.auto_accept_orders(session, tenant_id, limit=50)

# Schedule: Every 1 minute
celery_app.conf.beat_schedule = {
    'auto-accept-orders': {
        'task': 'app.celery_app.auto_accept_orders_task',
        'schedule': 60.0,
    },
    'auto-assign-drivers': {
        'task': 'app.celery_app.auto_assign_drivers_task',
        'schedule': 120.0,  # Every 2 minutes
    },
    'detect-gps-status': {
        'task': 'app.celery_app.detect_gps_status_task',
        'schedule': 30.0,  # Every 30 seconds
    },
    'recalculate-etas': {
        'task': 'app.celery_app.recalculate_etas_task',
        'schedule': 120.0,  # Every 2 minutes
    },
}
```

### Option 3: Cron Job
```bash
# Run every 1 minute
* * * * * curl -X POST http://localhost:8001/api/v1/automation/run-all \
  -H "Authorization: Bearer TOKEN"
```

---

## 🧪 Testing

### Test Order Validation
```python
from app.services.order_validator import get_order_validator
from app.db.session import SessionLocal

validator = get_order_validator()
with SessionLocal() as session:
    order = session.get(Order, "order_id")
    result = validator.validate_order(order, session)
    print(f"Valid: {result.is_valid}, Confidence: {result.confidence}%")
    print(f"Action: {result.action}")
    print(f"Errors: {result.errors}")
```

### Test Driver Scoring
```python
from app.services.driver_scorer import get_driver_scorer
from app.db.session import SessionLocal

scorer = get_driver_scorer()
with SessionLocal() as session:
    order = session.get(Order, "order_id")
    scores = scorer.find_best_driver(order, session, limit=5)
    for score in scores:
        print(f"{score.driver_name}: {score.total_score:.1f}")
```

### Test Geofencing
```python
from app.services.geofencing import get_geofencing_service

geofencing = get_geofencing_service()
is_within = geofencing.is_within_geofence(
    gps_location=(10.7769, 106.7009),  # GPS position
    target_location=(10.7769, 106.7009),  # Site location
    radius_meters=100
)
print(f"Within geofence: {is_within}")
```

---

## 📝 Notes

- **Coordinates**: Cần populate coordinates cho Location/Site để automation hoạt động
- **GPS Data**: Cần GPS tracking active để GPS-based features hoạt động
- **Performance**: Services có caching để optimize performance
- **Error Handling**: Tất cả services có error handling, không block batch processing

---

*Quick Start Guide - 2026-01-18*
